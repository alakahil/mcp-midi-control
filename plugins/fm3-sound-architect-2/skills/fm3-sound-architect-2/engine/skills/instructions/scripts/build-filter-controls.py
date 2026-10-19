"""Rebuild measured points only after revalidating the complete user's evidence chain."""
import hashlib, json, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE / 'filter-control-collector'))
import FM3_FILTER_CONTROLS as collector

def sha(data): return hashlib.sha256(data).hexdigest()
def write(path, obj): path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

evidence_name = 'filter-controls-20261008-165150'
evidence = ROOT / 'references' / evidence_name
assert (evidence / 'plan.json').read_bytes() == (collector.HERE / 'plan.json').read_bytes()
assert (evidence / 'baseline.syx').read_bytes() == (collector.HERE / 'baseline.syx').read_bytes()
count, last, observations = collector.resume(evidence)
assert count == 18 and len(observations) == 17
fields = {'Frequency': 'frequencyHz', 'Q': 'q', 'Gain': 'gainDb', 'Level': 'levelDb'}
expected_pids = {'frequencyHz': 1, 'q': 2, 'gainDb': 3, 'levelDb': 4}
points, skipped, failed, previous = [], [], [], evidence / 'baseline.syx'
for folder in sorted(evidence.glob('step-*')):
    result_path = folder / 'result.json'
    result = json.loads(result_path.read_text())
    if result['status'] == 'failed':
        failed.append({'folder': folder.name, 'index': result['index'], 'error': result['error'], 'capturePresent': (folder / 'capture.json').exists()})
        continue
    if result['status'] == 'skipped':
        skipped.append({'folder': folder.name, 'index': result['index'], 'step': result['step'], 'reason': result['reason'], 'measured': False})
        continue
    assert result['status'] == 'passed' and result['displayConfirmed'] is True
    comp = result['comparison'];step = result['step'];field = fields[step['parameter']]
    assert len(comp['changedWords']) == 1
    word = comp['changedWords'][0]
    assert word['pid'] == expected_pids[field]
    assert comp['previousSha256'] == sha(previous.read_bytes())
    capture = json.loads((folder / 'capture.json').read_text())
    assert capture['txCalls'] == 1 and capture['txBytesWritten'] == 10
    points.append({'index': result['index'], 'channel': step['channel'], 'type': step['type'], 'binaryId': step['binaryId'],
                   'field': field, 'parameterId': word['pid'], 'targetValue': step['value'], 'displayValue': result['displayValue'],
                   'unit': step['unit'], 'raw': word['after'], 'rawBefore': word['before'], 'folder': folder.name,
                   'previousFile': str(previous.relative_to(evidence)), 'previousSha256': comp['previousSha256'],
                   'syxSha256': comp['syxSha256'], 'rawRxSha256': result['pair']['rawRxSha256'],
                   'resultSha256': sha(result_path.read_bytes()), 'captureSha256': sha((folder / 'capture.json').read_bytes())})
    previous = folder / 'donor.syx'
assert len(points) == 17 and len(skipped) == 1 and skipped[0]['index'] == 3 and len(failed) == 6
assert all(not f['capturePresent'] for f in failed)

# Independent whole-body fingerprints and final state; no name/header normalization.
js = """
import fs from 'node:fs';import {createHash} from 'node:crypto';import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const paths=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify(paths.map(file=>{const s=inspectStructure(fs.readFileSync(file)),b=Buffer.from(s.raw.body);return {bodySha256:createHash('sha256').update(b).digest('hex'),bodyBytes:b.length,presetName:s.decoded.preset_name,selectedScene:b[0]+1,scene2FilterChannel:'ABCD'[b.readUInt16LE(7580)]};})));
"""
r = subprocess.run(['node', '--input-type=module', '-e', js], cwd=HERE,
                   input=json.dumps([str(evidence / p['folder'] / 'donor.syx') for p in points]), capture_output=True, text=True)
assert r.returncode == 0, r.stderr
bodies = json.loads(r.stdout)
for point, body in zip(points, bodies):
    assert body['bodyBytes'] == 13146 and body['selectedScene'] == 2
    point.update(body)
library = {'schemaVersion': 1, 'firmware': 13, 'effectId': 114, 'wordsPerChannel': 37,
           'evidenceDirectory': evidence_name, 'count': 17, 'points': points,
           'skipped': skipped, 'scope': 'Only listed type/channel/field/target or measured display values; no interpolation or unmeasured Q=0.707.'}
write(ROOT / 'references/filter-controls.json', library)
report = {'date': '2026-10-08', 'archive': 'FM3_FILTER_CONTROLS_20261008T165150_a72c6f32.zip',
          'archiveSha256': '1b730717b38fa67a3dc5e3bd314a3e8917563fd240ac7d388e5b4574d651b8e7',
          'passed': True, 'planSteps': 18, 'acceptedPairs': 17, 'matchedWordsPerPair': 148, 'totalMatchedWords': 2516,
          'parameterIds': expected_pids, 'points': points, 'skipped': skipped, 'failedAttempts': failed,
          'checks': {'allPairsRevalidated': True, 'fullSequentialComparisonsRevalidated': True, 'singleControlWordEach': True,
                     'typeBypassOtherBlocksAndSystemPreserved': True, 'nameChangeExplicitlyRecorded': True, 'allFailedAttemptsBeforeGet': True},
          'controlLibrarySha256': sha((ROOT / 'references/filter-controls.json').read_bytes()),
          'hardware': 'Actual manual one-control edits and paired GET/SYX exports; generated combinations require exact-body match or separate evidence.',
          'audio': 'Filter remained bypassed; no active sound or CPU assessment.',
          'next': 'Integrate these measured points; do not recollect completed points or treat skipped Q=0.707 as measured.'}
write(ROOT.parent.parent / 'docs/FM3_FILTER_CONTROL_VALIDATION.json', report)
print(json.dumps({'passed': True, 'acceptedPairs': len(points), 'totalMatchedWords': 2516,
                  'skippedQ': .707, 'librarySha256': report['controlLibrarySha256']}, indent=2))
