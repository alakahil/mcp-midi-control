#!/usr/bin/env python3
"""Independently replay the captured wire, then check the full exported SYX.

Does not import the collector's transport/parser. No device I/O. A report's
status/predictions are not accepted as evidence without matching TX/RX bytes.
"""
import argparse
from collections import Counter
from functools import reduce
import json
import math
import operator
from pathlib import Path
import struct
import subprocess
import tempfile
import zipfile

from modifier_transport_audit import compare_modes
from modifier_quantization_audit import f32
from six_field_resolution import ROOT, require, sha, cache_records

DOC = ROOT/'docs/fm3/parameter-evidence'
CAPTURE = DOC/'captures/FM3_MOD_HW_RESULTS_20261022T144240Z_583c0f.zip'
CAPTURE_SHA = 'f99bdfdcdb695b80e6059a772f6095e9f2a2a385628a1a7bd1804c53049ea44e'
PLAN = ROOT/'tools/fm3/modifier-hardware-batch/plan.json'
PLAN_SHA = '6ffbd745f9792665a2eab52997da5e80c46b9e9a1cd9145a610a8a47695f5cb2'
OUT = DOC/'modifier-hardware-measurement-audit.json'
CHECK = ROOT/'tools/fm3/modifier-hardware-batch/check.mjs'


def frames(data):
    """Independent strict stream parser, including in-frame realtime bytes."""
    result, current = [], None
    for byte in data:
        if byte >= 248:
            continue
        if byte == 240:
            require(current is None, 'Nested frame')
            current = bytearray([byte])
        elif byte == 247:
            require(current is not None, 'Orphan frame end')
            current.append(byte)
            require(len(current) >= 8 and current[:5] == bytes.fromhex('f000017411'), 'Bad envelope/model')
            require(reduce(operator.xor, current[:-2], 0) & 127 == current[-2], 'Bad checksum')
            result.append(bytes(current))
            current = None
        else:
            require(current is not None and byte < 128, 'Unexpected MIDI byte')
            current.append(byte)
    require(current is None, 'Truncated frame')
    return result


def u14(data):
    require(len(data) == 2 and max(data) < 128, 'Bad septet pair')
    return data[0] + 128*data[1]


def float_bits(data):
    require(len(data) == 5 and data[4] < 16 and max(data) < 128, 'Bad float32 payload')
    return sum(byte * (128**i) for i, byte in enumerate(data))


def raw_get(data, effect, count):
    packets = frames(data)
    require(len(packets) == 3 and [p[5] for p in packets] == [116,117,118], 'Wrong GET sequence')
    h, b, end = packets
    require(len(h) == 12 and len(b) == 10+count*3 and len(end) == 8, 'Bad GET lengths')
    require(u14(h[6:8]) == effect and u14(h[8:10]) == count and u14(b[6:8]) == count,
            'Wrong GET target/count')
    values = []
    for offset in range(8, len(b)-2, 3):
        low, mid, high = b[offset:offset+3]
        require(high <= 3, 'Not uint16')
        values.append(low + mid*128 + high*16384)
    return values


def transactions(lines):
    tx, current, last_time = [], None, -1
    for row in lines:
        now = row['elapsedMs']
        require(type(now) in (int,float) and math.isfinite(now) and now >= last_time, 'Nonmonotonic journal')
        last_time = now
        if row['kind'] == 'tx-intent':
            require(current is None or current['sent'], 'Unfinished TX')
            current = dict(label=row['label'], tx=bytes.fromhex(row['hex']), rx=bytearray(), sent=False)
            require(len(frames(current['tx'])) == 1, 'TX must be one frame')
            tx.append(current)
        elif row['kind'] == 'tx-result':
            require(current is not None and not current['sent'] and row['label'] == current['label'], 'Unmatched TX result')
            require(row['written'] == row['requested'] == len(current['tx']), 'Partial TX')
            current['sent'] = True
        elif row['kind'] == 'rx':
            require(current is not None and current['sent'], 'RX without completed TX')
            expected = current['label']+('-settle' if current['tx'][5] == 1 else '')
            require(row['label'] == expected, 'RX associated with wrong transaction')
            current['rx'].extend(bytes.fromhex(row['hex']))
        else:
            raise ValueError('Unknown journal event')
    require(current is not None and current['sent'], 'Unfinished last TX')
    require(len({t['label'] for t in tx}) == len(tx), 'Repeated transaction label')
    return tx


def replay(plan, report, lines, baseline):
    tx = transactions(lines)
    index = 0
    def take(label, fn, effect, count=None):
        nonlocal index
        require(index < len(tx), 'Missing transaction')
        t = tx[index]; index += 1
        require(t['label'] == label and t['tx'][5] == fn, 'Transaction order/operation mismatch')
        if fn == 31:
            require(len(t['tx']) == 10 and u14(t['tx'][6:8]) == effect, 'Wrong GET request')
            return raw_get(t['rx'], effect, count)
        return t

    current = take('preflight-mod',31,3,25)
    require(current == baseline['modWords'] == report['preflightModWords'], 'Baseline MOD mismatch')
    wah = take('preflight-wah',31,94,100)
    require(wah == baseline['wahWords'] == report['preflightWahWords'], 'Baseline Wah mismatch')
    require(take('preflight-mod-repeat',31,3,25) == current, 'Unstable preflight')
    require(report['baseline'] == baseline, 'Reported baseline differs from pinned file')
    require(len(plan['steps']) == len(report['steps']) == 44, 'Incomplete plan/report')
    observations = []
    for expected, reported in zip(plan['steps'],report['steps']):
        require({k:reported[k] for k in expected} == expected, 'Reported step differs from plan')
        s = take(expected['id'],1,3)
        packet = s['tx']
        require(len(packet) == 23 and packet[17:21] == bytes(4), 'Bad SET length/tail')
        require(u14(packet[6:8]) == expected['operation'] and u14(packet[8:10]) == 3 and
                u14(packet[10:12]) == expected['pid'], 'SET addressed wrong operation/object/field')
        bits = float_bits(packet[12:17])
        require(bits == int(expected['inputBits'],16), 'SET input bits differ from plan')
        echoes = frames(s['rx'])
        require(len(echoes) == 1 and len(echoes[0]) == 60 and echoes[0][5:12] == packet[5:12], 'Wrong SET echo')
        after = take(expected['id']+'-read-1',31,3,25)
        again = take(expected['id']+'-read-2',31,3,25)
        require(after == again, 'Two GETs disagree')
        changed = [i for i,(a,b) in enumerate(zip(current,after)) if a != b]
        require(changed == [expected['pid']], 'No isolated state-changing observation')
        require(reported['beforeWords'] == current and reported['afterWords'] == after and
                reported['repeatWords'] == again and reported['observedRaw'] == after[expected['pid']] and
                reported['status'] == 'captured' and reported['changed'] is True and
                reported['conversionWitness'] is True, 'Report does not match actual wire')
        row = dict(id=expected['id'],pid=expected['pid'],operation=expected['operation'],
                   inputBits=f'0x{bits:08x}',inputFloat32=struct.unpack('<f',struct.pack('<I',bits))[0],
                   nominalDisplay=expected['nominalDisplay'],observedRaw=after[expected['pid']],
                   previousRaw=current[expected['pid']],twoRawReadsAgree=True,onlyRequestedFieldChanged=True,
                   echoBits=f'0x{float_bits(echoes[0][12:17]):08x}')
        if expected['operation'] == 82 or expected['pid'] in (1,2):
            row['modelPredictions'] = compare_modes(bits)
            row['matchingModels'] = [k for k,v in row['modelPredictions'].items() if v == row['observedRaw']]
            row['modelScope'] = 'op82 exact model' if expected['operation'] == 82 else 'Wah 0..1 op9 comparison; not general RECIPS proof'
        observations.append(row)
        current = after
    require(take('final-wah',31,94,100) == wah == report['finalWahWords'], 'Wah fields changed')
    require(index == len(tx), 'Unrequested transaction')
    require(current == report['lastVerifiedWords'], 'Wrong final MOD words')
    return dict(transactions=len(tx),setCalls=44,getCalls=len(tx)-44,
                txBytes=sum(len(t['tx']) for t in tx),rxBytes=sum(len(t['rx']) for t in tx),
                rxFrames=sum(len(frames(t['rx'])) for t in tx),
                durationSeconds=round(lines[-1]['elapsedMs']/1000,6),observations=observations)


def load_capture():
    data = CAPTURE.read_bytes()
    require(sha(data) == CAPTURE_SHA, 'Capture archive hash mismatch')
    with zipfile.ZipFile(CAPTURE) as z:
        prefix = 'FM3_MOD_HW_RESULTS_20261022T144240Z_583c0f/'
        names = ['plan.json','report.json','wire.jsonl','FM3_MOD_HW_FINAL_export.syx']
        require(sorted(z.namelist()) == sorted(prefix+n for n in names), 'Archive inventory changed')
        return {n:z.read(prefix+n) for n in names}


def build():
    files = load_capture()
    require(files['plan.json'] == PLAN.read_bytes() and sha(files['plan.json']) == PLAN_SHA, 'Wrong experiment plan')
    baseline = json.loads(subprocess.check_output(['node',str(CHECK),'baseline'],cwd=ROOT))
    plan, report = (json.loads(files[n]) for n in ('plan.json','report.json'))
    lines = [json.loads(row) for row in files['wire.jsonl'].splitlines()]
    r = replay(plan,report,lines,baseline)
    with tempfile.TemporaryDirectory() as tmp:
        for n in ('report.json','FM3_MOD_HW_FINAL_export.syx'):
            (Path(tmp)/n).write_bytes(files[n])
        syx = json.loads(subprocess.check_output(['node',str(CHECK),'final',tmp],cwd=ROOT))
    require(syx == report['exportCheck'], 'Export check is not reproducible')
    ordinary = []
    _, cache = cache_records()
    for row in r['observations']:
        if row['operation'] != 9 or row['pid'] in (1,2):
            continue
        lo,hi,mult,step = cache[3,row['pid']]['numeric_fields']
        x = row['inputFloat32']
        # Direct op9 floats are already in internal units; do not divide by mult again.
        if row['pid'] == 13:
            norm = (math.log(x)-math.log(lo))/(math.log(hi)-math.log(lo))
            single = f32(f32(f32(math.log(x))-f32(math.log(lo)))/f32(f32(math.log(hi))-f32(math.log(lo))))
        else:
            norm = (x-lo)/(hi-lo)
            single = f32(f32(x-f32(lo))/f32(f32(hi)-f32(lo)))
        hypotheses = dict(float64Nearest=math.floor(norm*65534+.5),
                          stagedFloat32Nearest=math.floor(f32(f32(single*65534)+.5)))
        ordinary.append(dict(pid=row['pid'],inputBits=row['inputBits'],nominalDisplay=row['nominalDisplay'],
                             observedRaw=row['observedRaw'],hypotheses=hypotheses,
                             matches={k:v==row['observedRaw'] for k,v in hypotheses.items()},
                             actualDisplayObserved=False))
    op82 = [x for x in r['observations'] if x['operation'] == 82]
    scores = {mode:sum(mode in x['matchingModels'] for x in op82)
              for mode in ('32-nearest','40-nearest','32-zero','40-zero')}
    return dict(schemaVersion=1,date='2026-10-22',productionPlugin='0.3.13',
                capture=dict(file=str(CAPTURE.relative_to(ROOT)),sha256=CAPTURE_SHA,
                             fileSha256={n:sha(v) for n,v in files.items()},
                             firmwareDeclared=report['firmwareDeclared'],firmwareDetected=None,
                             startUtc='2026-10-22T14:42:40Z',startEuropeTallinn='2026-10-22T17:42:40+03:00'),
                verification=dict(journalChronology=True,exactPlanAndTxBits=True,allGetChecksums=True,
                                  allReportsRecomputedFromWire=True,all44StepsChangedExactlyOneField=True,
                                  preflightModWords=25,preflightWahWords=100,allFinalWahWordsPreserved=True),
                wire=r,uniqueInputPoints=len({(x['pid'],x['operation'],x['inputBits']) for x in r['observations']}),
                op82=dict(observations=len(op82),modeScores=scores,
                          discriminants=[x for x in op82 if len(set(x['modelPredictions'].values()))>1]),
                ordinaryOp9=ordinary,finalExport=syx,newPhysicalExports=1,newReaDecompilation=False,
                runtimeModeGloballyProven=False,fullRangeEncodingProven=False,generatorWriteSupportAdded=False,
                limits=['Model discrimination applies to observed inputs in this device session, not every execution context.',
                        'Nine direct op9 inputs do not exercise editor keyboard parsing/multiplier division.',
                        'No new display screenshots; nominalDisplay is a plan, not an observed display.',
                        'Only Wah1 Control dynamic Min/Max target type; not other target families.',
                        'Final export confirms serialization, not STORE/reload/power-cycle persistence.',
                        'No generated candidate was imported in this session.'])


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--write',action='store_true');a=p.parse_args()
    result=build()
    if a.write:OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    else:require(json.loads(OUT.read_text())==result,'Stale measurement audit')
    print(json.dumps(dict(sets=result['wire']['setCalls'],gets=result['wire']['getCalls'],
                         uniquePoints=result['uniqueInputPoints'],modeScores=result['op82']['modeScores'],
                         export=result['finalExport']['status'],ordinaryOp9=result['ordinaryOp9']),ensure_ascii=False))
