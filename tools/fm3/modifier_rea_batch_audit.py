#!/usr/bin/env python3
"""Replay the supplied Mac REA batch and pinned static checkpoints; no writes to a device.

The uploaded bundle is retained privately. Repository artifacts contain hashes,
coordinates and findings, not a new native-code redistribution. No encoder is
implemented. --write only updates this research JSON.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import struct

from modifier_quantization_audit import DOC, EDITOR_SHA, build as corpus
from modifier_value_path_audit import BASE, BootMemory, stub_symbol
from modifier_sharc_audit import physical_model
from pitch_display import unpack
from six_field_resolution import require, sha

MANIFEST = DOC / 'modifier-rea-batch-checkpoints.json'
OUT = DOC / 'modifier-rea-batch-audit.json'


def build(directory, editor, firmware):
    manifest = json.loads(MANIFEST.read_text())
    require(sha(editor) == EDITOR_SHA, 'Editor differs')
    for item in manifest['batchFiles']:
        data = (directory / item['path']).read_bytes()
        require(len(data) == item['bytes'] and sha(data) == item['sha256'],
                'Batch input differs: ' + item['path'])
    summary = json.loads((directory / 'summary.json').read_text())
    index = json.loads((directory / 'query-index.json').read_text())
    bundle = json.loads((directory / 'rea-evidence.json').read_text())
    require(summary['queries'] == index and summary['errors'] == [], 'Incomplete run')
    require(summary['analysis_performed'] and summary['status'] == 'collected', 'No analysis')
    require(summary['target']['sha256'] == summary['target']['sha256_after'] == EDITOR_SHA,
            'Target changed during analysis')
    require(summary['plan_sha256'] == sha((directory / 'plan.json').read_bytes()), 'Plan differs')
    require((directory / 'collector-used.mjs').read_bytes() ==
            (Path(__file__).parent / 'rea-minmax/fm3-rea-minmax.mjs').read_bytes(), 'Collector differs')
    records = {r['evidence_id']: r for r in bundle['records']}
    require(len(records) == len(bundle['records']) == 86, 'Record inventory differs')
    for record in records.values():
        require(record['subject']['digest']['sha256'] == EDITOR_SHA, 'Evidence subject differs')
        profile = record['analysis_profile']
        if record['operation'] == 'trace_native_values':
            require(record['provider'] == dict(id='rea-workflow',
                    name='REA composed investigation workflow', version='1'), 'Workflow provider differs')
            profile = profile['parameters']['upstream_analysis_profile']
        else:
            require(record['provider'] == dict(id='ghidra', name='Ghidra', version='12.1.4'),
                    'Evidence provider differs')
        require(profile['digest'] == manifest['profileDigest'], 'Profile differs')
    for query in index:
        q = json.loads((directory / query['file']).read_text())
        require(q['tool'] == query['tool'] and q['arguments'] == query['arguments'], 'Query differs')
        require(q['assessment']['status'] == query['status'], 'Assessment differs')
        if query['evidence_id']:
            require(query['evidence_id'] in records, 'Missing referenced record')
    mem = BootMemory(unpack(firmware))
    def visa(address, size):
        return mem.read(0x80a00000 + (address - 0x800000) * 2, size)
    for span in manifest['spans']:
        a, size = int(span['address'], 16), span['size']
        data = editor[a-BASE:a-BASE+size] if span['source'] == 'editor' else visa(a, size)
        require(sha(data) == span['sha256'], 'Native checkpoint differs: ' + span['name'])
    # The setter receives a float in S0 even where Ghidra's pseudocode omits it.
    require(struct.unpack_from('<I', editor, 0x25e094)[0] == 0xbd03c000, 'Angle setter differs')
    for pointer in (0xdbb998, 0xdb3c78):
        require(struct.unpack_from('<Q', editor, pointer)[0] == 0x10025e094, 'Setter binding differs')
    require(struct.unpack_from('<Q', editor, 0xdb3d58)[0] == 0x100042ad8, 'Event binding differs')
    require(stub_symbol(editor, 0x1005104a8) == '_atan2f', 'Circular drag import differs')
    functions = {r['normalized_result']['procedure']['address']: r
                 for r in records.values() if r['operation'] == 'analyze_function'}
    expected_lines = {
        '0x10025c5fc': ['0x10025c708: fmul s0, s1, s0',
                         '0x10025c714: fdiv s0, s0, s1',
                         '0x10025c71c: fadd s0, s1, s0',
                         '0x10025c828: mov w1, #0x4'],
        '0x10025e094': ['0x10025e094: str s0, [x0, #0x3c0]'],
    }
    for address, lines in expected_lines.items():
        require(all(line in functions[address]['normalized_result']['assembly'] for line in lines),
                'REA instruction observation differs')
    traces = []
    for query in index:
        if query['tool'] != 'trace_native_values':
            continue
        r = records[query['evidence_id']]
        n = r['normalized_result']
        traces.append(dict(id=query['id'], procedure=query['arguments']['procedure'],
                           evidenceId=r['evidence_id'], nodes=n['total_nodes'],
                           functions=n['decompilations'], unknowns=len(n['unknowns']),
                           truncated=n['truncated'], nextOffset=n['next_offset']))
    points = []
    for p in corpus()['points']:
        if p['pid'] not in (1, 2):
            continue
        display, raw = p['requestedTarget'], p['raw']
        # This is a fitted, counterfactual constant-word-step model, NOT a
        # replay of firmware ops 10..13. Starting words/event counts are assumptions.
        start, count = (0, 25) if p['pid'] == 1 else (65534, -25 if display == 7.5 else -50)
        candidate = start + count * 655
        points.append(dict(field=p['field'], display=display, measuredRaw=raw,
                           exactTextModelRaw=physical_model(display/10),
                           assumedStartingRaw=start, assumedEventCount=count,
                           hypotheticalStep655Raw=candidate, fitsStep655=(candidate == raw)))
    return dict(schemaVersion=1, date='2026-10-22', mode='new-Mac-REA-plus-bounded-static-review',
                productionVersion='0.3.13', newPhysicalExports=0, deviceIO=False,
                inputZipSha256=manifest['inputZipSha256'],
                editorSha256=EDITOR_SHA, profileDigest=manifest['profileDigest'],
                startedAt=summary['started_at'], finishedAt=summary['finished_at'],
                queryCounts=dict(sorted(Counter(q['tool'] for q in index).items())),
                queryStatuses=dict(sorted(Counter(q['status'] for q in index).items())),
                evidenceRecordCounts=dict(sorted(Counter(r['operation'] for r in records.values()).items())),
                internalFunctionGraphsTruncated=[a for a, r in sorted(functions.items())
                    if r['normalized_result']['native_value_flow'].get('truncated')],
                traces=traces, checkpointCount=len(manifest['spans']),
                sourceFilesVerified=len(manifest['batchFiles']),
                semanticCorrections={
                    '0x10025c44c': 'mouse-down / drag start; plan name rotary-init was a hint',
                    '0x10025c5fc': 'mouse drag / angle producer; plan name rotary-init-extension was a hint',
                    '0x10025c870': 'wheel-like delta handler -> events 5/6/7/8',
                    '0x10025d05c': 'keyboard handler -> events 5/6/7/8',
                    '0x10017ab3c': 'control teardown, not a dynamic multiplier producer',
                    '0x10004272c': 'accessibility description, not event producer'},
                drag=dict(producer='0x10025c5fc', start='0x10025c44c', angleOffset='0x3c0',
                          previousAngleOffset='0x3c4', limits=['0x3cc', '0x3d0'],
                          linearFormula='f32(oldAngle + f32(f32(sensitivity * f32(oldX-oldY-newX+newY)) / -180))',
                          sensitivity=[1.5, 0.10000000149011612],
                          circularFormula='atan2f(centeredX, -centeredY), unwrap, clamp',
                          emittedEvent=4, modifierOperation=82),
                editorEvents={'2':82, '4':82, '5':10, '6':12, '7':11, '8':13, '9':15, '10':9},
                firmwareStepBranches={
                    '10': {'address':'0x823bfe', 'candidate':'F12 + F8'},
                    '11': {'address':'0x823c03', 'candidate':'F12 - F8'},
                    '12': {'address':'0x823c08', 'candidate':'F12 + 10 * F8'},
                    '13': {'address':'0x823c12', 'candidate':'F12 - 10 * F8'}},
                minMaxComparisons=points,
                generatorWriteSupport=False, fullRangeEncodingProven=False,
                historicalInputMethodKnown=True, historicalOperationAndInputKnown=False,
                inputMethodEvidence='modifier-input-method-evidence.json',
                constantWordStepProven=False,
                step655Status='Historical arithmetic fit; wheel/arrow explanation retired after user confirmed dragging.',
                dynamicEditorMultiplierProducerResolved=False,
                nextStep='Follow modifier-drag-audit.json: verify op82 transport and arithmetic mode. Wheel/arrow F12/F8 is no longer the priority for these captures.',
                limitations=[
                    'Successful REA requests do not mean all indirect calls or native value flows were resolved.',
                    'Two whole traces and one internal function graph are truncated; unknowns remain in all five traces.',
                    'Native instructions were reviewed, but no original executable or firmware was executed here.',
                    'Firmware step branches add to a computed physical base, not a proven constant uint16 increment.',
                    'Step 655 is only a historical arithmetic fit; user confirmed mouse dragging, not wheel/arrow entry.',
                    'SHARC RECIPS/40-bit mode, full transport and runtime editor metadata producer remain unproven.',
                    'Existing 18/18 ordinary-point compatibility and unresolved Attack discrepancy are unchanged.'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', type=Path, required=True)
    parser.add_argument('--editor', type=Path, required=True)
    parser.add_argument('--firmware', type=Path, required=True)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    result = build(args.batch, args.editor.read_bytes(), args.firmware.read_bytes())
    if args.write:
        OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        require(json.loads(OUT.read_text()) == result, 'Research report is stale')
    print(json.dumps({key: result[key] for key in
                      ('queryStatuses', 'checkpointCount', 'sourceFilesVerified', 'generatorWriteSupport')}))


if __name__ == '__main__':
    main()
