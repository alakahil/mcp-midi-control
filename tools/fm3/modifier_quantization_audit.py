#!/usr/bin/env python3
"""Read-only comparison of measured MOD points; hypotheses are never encoders.

Default: replay committed evidence and compare the report. --write regenerates
only the research report. --editor optionally rechecks bounded native evidence
against the original hash-pinned ARM64 executable, without executing it.
"""
import argparse
import base64
import json
import math
from pathlib import Path
import struct
import subprocess
import zipfile

from six_field_resolution import ROOT, ENGINE, CACHE_SHA, cache_records, require, sha

DOC = ROOT / 'docs/fm3/parameter-evidence'
REF = ENGINE / 'skills/instructions/references'
OUT = DOC / 'modifier-quantization-audit.json'
NATIVE = DOC / 'modifier-native-entry.json'
EDITOR_SHA = '62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a'


def f32(x):
    return struct.unpack('<f', struct.pack('<f', x))[0]


def normalized(value, bounds, kind, single=False):
    """Named hypotheses, not a claim about the firmware implementation."""
    cast = f32 if single else float
    lo, hi, mult, _ = map(cast, bounds)
    x = cast(cast(value) / (mult or 1))
    if kind == 'log':
        # This model rounds each log result to float32; it does NOT identify
        # the device's libm, instruction sequence, or approximation error.
        return cast(cast(cast(math.log(x)) - cast(math.log(lo))) /
                    cast(cast(math.log(hi)) - cast(math.log(lo))))
    return cast(cast(x-lo) / cast(hi-lo))


def model(value, bounds, kind, single=False):
    cast = f32 if single else float
    return cast(cast(normalized(value, bounds, kind, single)) * cast(65534))


def displayed(raw, bounds, kind):
    lo, hi, mult, _ = bounds
    n = raw / 65534
    v = math.exp(math.log(lo) + n*(math.log(hi)-math.log(lo))) if kind == 'log' else lo+n*(hi-lo)
    return v*(mult or 1)


def native_check(editor=None):
    d = json.loads(NATIVE.read_text())
    require(d['source']['arm64Sha256'] == EDITOR_SHA, 'Native source drift')
    # Span digests and the complete inventory digest are retained in the report.
    for name, s in d['spans'].items():
        raw = bytes.fromhex(s['hex'])
        require(len(raw) == s['bytes'] and sha(raw) == s['sha256'], 'Native span drift: '+name)
    def span(name): return bytes.fromhex(d['spans'][name]['hex'])
    table = span('eventJumpTable')
    require(len(table) == 9 and 0x100179a24 + 4*table[8] == 0x100179ae4,
            'Event 10 no longer reaches numeric handler call')
    require(struct.unpack('<QQ', span('vtableIdentity')) == (0, 0x100dab7f8), 'Vtable identity')
    require(struct.unpack('<Q', span('vtableDispatch'))[0] == 0x1001796d4, 'Dispatch target')
    require(struct.unpack('<qQ', span('rotaryVtableIdentity')) == (-0x108, 0x100dc00f0) and
            struct.unpack('<Q', span('rotaryGetterVtable'))[0] == 0x10025e9d0,
            'Rotary getter virtual binding')
    require(struct.unpack('<Q', span('rttiNamePointer'))[0] == 0x10054258e and
            span('rttiName') == b'14ModifierDialog\0', 'ModifierDialog RTTI')
    entry = span('numericEntry')
    # Actual AArch64 opcodes at their original offsets: op 9, FDIV S0,S8,S0,
    # STR S0 to value field, and BLR X8 to the dispatch slot.
    for address, opcode in [(0x10017afd8,0x52800128),(0x10017b020,0x1e201900),
                            (0x10017b024,0xbd000fe0),(0x10017b040,0xd63f0100)]:
        require(struct.unpack_from('<I',entry,address-0x10017afa8)[0] == opcode,
                'Numeric entry instruction drift: '+hex(address))
    archive = ENGINE / 'research/FM3_REA_NATIVE_AUDIT_20261012.zip'
    with zipfile.ZipFile(archive) as z:
        old = json.loads(z.read('FM3_REA_NATIVE_AUDIT_20261012/native-audit.json'))
    require(old['application']['sha256'] == EDITOR_SHA and old['payload']['fixed_bytes'] == 15,
            'Prior REA serializer evidence drift')
    if editor:
        b = Path(editor).read_bytes()
        require(sha(b) == EDITOR_SHA, 'Wrong original ARM64 editor')
        for name,s in d['spans'].items():
            require(b[s['fileOffset']:s['fileOffset']+s['bytes']] == span(name),
                    'Original native span mismatch: '+name)
    return {'sourceSha256': EDITOR_SHA, 'evidenceFile': str(NATIVE.relative_to(ROOT)),
            'evidenceSha256': sha(NATIVE.read_bytes()),
            'assemblySha256': sha((DOC/'modifier-native-entry.asm').read_bytes()),
            'boundedBytes': sum(s['bytes'] for s in d['spans'].values()),
            'mode': 'static-byte-and-branch-check; no executable or firmware execution',
            'numericOperation': 9, 'valueTransport': 'float32 bits',
            'getterAndRuntimeMetadataResolved': False, 'presetUint16ConversionResolved': False}


def build(editor=None):
    _, cache = cache_records()
    input_method_path = DOC / 'modifier-input-method-evidence.json'
    input_method = json.loads(input_method_path.read_text())
    captures, points, excluded = [], [], []
    for batch, filename in [('A','modifier-batch-a-evidence.json'),
                            ('B','modifier-batch-b-evidence.json'),
                            ('Max','modifier-max-5-evidence.json')]:
        d = json.loads((DOC/filename).read_text())
        captures.append(d['capture'])
        for f in d['fields']:
            if f['beforeRaw'] == f['afterRaw']:
                if f['requestedDisplay'] is not None:
                    excluded.append({'batch': batch, 'field': f['name'],
                                     'reason': 'Requested change not observed; no new input point',
                                     'requested': f['requestedDisplay'], 'display': f['actualDisplay']})
                continue
            points.append({'batch': batch, 'field': f['name'], 'pid': f['word'],
                           'requestedTarget': f['requestedDisplay'], 'observedDisplay': f['actualDisplay'],
                           'raw': f['afterRaw'], 'captureSha256': d['capture']['sha256']})
    mi = json.loads((REF/'wah-min-evidence.json').read_text())
    m = mi['pair'][1]
    captures.append({**m, 'file': str((REF.parent/m['file']).relative_to(ROOT))})
    points.append({'batch': 'Min', 'field': 'MOD_MIN', 'pid': 1,
                   'requestedTarget': 2.5, 'observedDisplay': 2.5, 'raw': 16375,
                   'captureSha256': m['sha256']})
    payload = []
    for c in captures:
        b = (ROOT/c['file']).read_bytes()
        require(sha(b) == c['sha256'], 'Capture hash mismatch: '+c['file'])
        payload.append({'sha256': c['sha256'], 'base64': base64.b64encode(b).decode()})
    decoded = json.loads(subprocess.check_output(['node',str(ROOT/'tools/fm3/modifier_corpus.mjs')],
                                                input=json.dumps(payload).encode(), cwd=ROOT))
    records = {}
    for r in decoded['results']:
        require(r['status'] == 'inspected', 'Capture parse failure')
        record = decoded['profiles'][r['profile']][0]
        w = record['words']
        require((w[0],w[8],w[9],w[17]) == (14,94,5,0), 'Target context drift')
        records[r['sha256']] = record
    for p in points:
        require(records[p['captureSha256']]['words'][p['pid']] == p['raw'], 'Measured raw mismatch')
        c = cache[3,p['pid']]
        p['inputMethod'] = 'mouse-drag' if p['pid'] in (1,2) else 'typed-text'
        p['inputMethodStatus'] = 'user-confirmed-2026-10-22; exact event/float not recorded'
        bounds = c['numeric_fields']
        kind = 'log' if p['pid'] == 13 else 'linear'
        if p['pid'] in (1,2):
            require(bounds == [0,0,0,0], 'Target-dependent cache changed')
            bounds = [0,10,1,0]
        p['model'] = 'target-dependent 0..10 hypothesis' if p['pid'] in (1,2) else kind
        p['metadata'] = {'typecode': c['typecode'], 'cachedFields': c['numeric_fields'],
                         'hypothesisBounds': bounds}
        double, single = (model(p['requestedTarget'],bounds,kind,s) for s in (False,True))
        p['predictions'] = {'nearestFloat64': math.floor(double+.5),
                            'nearestFloat32Stages': math.floor(single+.5),
                            'floorFloat64': math.floor(double)}
        p['matches'] = {k:v == p['raw'] for k,v in p['predictions'].items()}
        p['nearestFloat64RawError'] = p['raw']-p['predictions']['nearestFloat64']
        p['modelDisplay'] = round(displayed(p['raw'],bounds,kind),12)
        step = .01 if p['pid'] in (1,2) else .001 if p['pid'] == 13 else .1
        # A display-bin count is conditional on this decoding/rounding model.
        compatible = [r for r in range(65535) if abs(displayed(r,bounds,kind)-p['observedDisplay']) < step/2]
        p['displayBinHypothesis'] = {'step': step, 'count': len(compatible),
                                    'firstRaw': min(compatible) if compatible else None,
                                    'lastRaw': max(compatible) if compatible else None,
                                    'includesMeasuredRaw': p['raw'] in compatible}
    ordinary = [p for p in points if p['pid'] not in (1,2)]
    special = [p for p in points if p['pid'] in (1,2)]
    return {'schemaVersion': 1, 'date': '2026-10-22', 'mode': 'offline-research-not-encoder',
            'productionVersion': '0.3.13', 'newPhysicalExports': 0, 'deviceIO': False,
            'cacheSha256': CACHE_SHA, 'native': native_check(editor),
            'captureFiles': [{'file':c['file'],'sha256':c['sha256']} for c in captures],
            'inputMethodEvidence': {'file': str(input_method_path.relative_to(ROOT)),
                                    'sha256': sha(input_method_path.read_bytes()),
                                    'statement': input_method['userStatement']},
            'inputEvidenceLimit': 'User confirms mouse dragging for Min/Max and typed entry for the other changed numeric points. Exact coordinates, keystrokes and wire floats were not recorded. Requested targets and screenshot displays remain separate observations; the Attack discrepancy is not resolved by knowing the input method.',
            'roundingHypothesis': 'Nearest is floor(scaled+0.5) for nonnegative raw values. This does not establish tie behavior or a particular device float/log implementation.',
            'attackDiscrepancy': {'userTextDisplayMs': 9.99, 'screenshotDisplayMs': 99.9,
                                 'requestedTargetMs': 100, 'raw': 655,
                                 'hypothesisRawIfInputWere9p99': math.floor(model(9.99,cache[3,7]['numeric_fields'],'linear')+.5),
                                 'resolved': False},
            'points': points, 'excludedNewPoints': excluded,
            'summary': {'changedPoints': len(points), 'ordinaryPoints': len(ordinary),
                        'ordinaryNearestMatches': sum(p['matches']['nearestFloat64'] for p in ordinary),
                        'ordinaryFloat32NearestMatches': sum(p['matches']['nearestFloat32Stages'] for p in ordinary),
                        'ordinaryFloorMatches': sum(p['matches']['floorFloat64'] for p in ordinary),
                        'minMaxPoints': len(special),
                        'minMaxNearestMatches': sum(p['matches']['nearestFloat64'] for p in special),
                        'allDisplayBinsIncludeMeasuredRaw': all(p['displayBinHypothesis']['includesMeasuredRaw'] for p in points)},
            'conclusion': 'Nearest rounding fits these 18 ordinary requested-target points but is not established over their full ranges. Min/Max were dragged, so their displayed targets are not exact typed inputs: the retained 0/3 direct-display comparison does not refute linear encoding of the actual normalized drag input. See modifier-drag-audit.json for the conditional forward model. A matching display bin alone does not prove an encoder.',
            'fullRangeWriterAuthorizedByEvidence': False}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--editor', type=Path)
    args = ap.parse_args()
    result = build(args.editor)
    require(result['summary']['changedPoints'] == 21, 'Unexpected measured point set')
    if args.write:
        OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    else:
        require(result == json.loads(OUT.read_text()), 'Research report differs: review before regeneration')
    print(json.dumps({**result['summary'], 'nativeOriginalRechecked': bool(args.editor),
                      'newPhysicalExports': 0, 'deviceIO': False}))
