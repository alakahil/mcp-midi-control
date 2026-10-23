#!/usr/bin/env python3
"""Replay pinned Volume creation-path evidence; no executable or device execution."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/fm3/parameter-evidence'
sha = lambda b: hashlib.sha256(b).hexdigest()

def require(ok, message):
    if not ok:
        raise ValueError(message)

def build(editor, batch):
    native = json.loads((DOC / 'volume-pedal-native-checkpoints.json').read_text())
    prior = json.loads((DOC / 'modifier-rea-batch-checkpoints.json').read_text())
    plan = json.loads((ROOT / 'tools/fm3/rea-volume-pedal/plan.json').read_text())
    expected = plan['required_target_sha256']
    require(sha(editor) == expected == native['editor']['arm64Sha256'], 'Wrong target SHA-256')
    require(struct.unpack_from('<2I', editor) == (0xfeedfacf, 0x100000c), 'Wrong Mach-O architecture')
    require(native['editor']['shortVersion'] == native['editor']['bundleVersion'] == '1.07.17', 'Wrong version provenance')
    for item in prior['batchFiles']:
        data = (batch / item['path']).read_bytes()
        require(len(data) == item['bytes'] and sha(data) == item['sha256'], 'Prior REA input differs: ' + item['path'])
    summary = json.loads((batch / 'summary.json').read_text())
    require(summary['target']['sha256'] == summary['target']['sha256_after'] == expected, 'Prior target differs')
    bundle = json.loads((batch / 'rea-evidence.json').read_text())
    functions = set()
    for r in bundle['records']:
        require(r['subject']['digest']['sha256'] == expected, 'Prior evidence subject differs')
        if r['operation'] == 'analyze_function':
            functions.add(r['normalized_result']['procedure']['address'])
    require(sorted(functions) == plan['reuse_previous_functions'], 'Prior function reuse inventory differs')
    require(not functions.intersection(f['address'] for f in plan['functions']), 'A fixed function repeats the old plan')
    for span in native['spans']:
        at = int(span['address'], 16) - 0x100000000
        require(sha(editor[at:at+span['bytes']]) == span['sha256'], 'Native span differs: ' + span['name'])
    for entry in plan['functions']:
        at = int(entry['address'], 16) - 0x100000000
        require(sha(editor[at:at+entry['lc_function_starts_size']]) == entry['body_sha256'], 'Planned function differs')
    return dict(schemaVersion=1,sourceCommit=native['sourceCommit'],method=native['method'],
                editorSha256=expected,editorVersion='1.07.17',architecture='arm64',
                previousREAInputZipSha256=prior['inputZipSha256'],previousREAFilesVerified=len(prior['batchFiles']),
                previousREAFunctionsAvailable=len(functions),newREAAnalysis=False,newPhysicalExports=0,deviceIO=False,
                nativeSpansVerified=len(native['spans']),newPlannedFunctionsVerified=len(plan['functions']),
                fixedFunctionsRepeatingPrevious=0,planSha256=sha((ROOT/'tools/fm3/rea-volume-pedal/plan.json').read_bytes()),
                findings=native['spans'],generatorWriteSupportAdded=False,fullRangeEncodingProven=False,
                limits=native['limits'])

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--editor',type=Path,required=True)
    p.add_argument('--batch',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a = p.parse_args()
    require(not a.output.exists(), 'Output already exists')
    result = build(a.editor.read_bytes(), a.batch)
    a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ['previousREAFilesVerified','nativeSpansVerified','newPlannedFunctionsVerified','newREAAnalysis']}))
