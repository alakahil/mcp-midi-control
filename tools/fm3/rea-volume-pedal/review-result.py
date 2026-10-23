#!/usr/bin/env python3
"""Read-only verification of the pinned user-returned Volume REA session."""
import argparse
import collections
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGET = '62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a'
ARCHIVE = '872db78e6a487a97247e7acf9d94392696bd1099cbf481a8ed442507e1a41b7d'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def review(folder, archive):
    assert sha(archive.read_bytes()) == ARCHIVE, 'Different evidence archive'
    with zipfile.ZipFile(archive) as zipped:
        entries = [n for n in zipped.namelist() if not n.endswith('/')]
        assert len(entries) == 42 and zipped.testzip() is None
        for name in entries:
            relative = Path(name).relative_to(folder.name)
            assert '..' not in relative.parts
            assert zipped.read(name) == (folder / relative).read_bytes(), 'Extracted evidence changed'
    read = lambda name: json.loads((folder / name).read_text())
    summary, doctor, index, plan = map(read, ['summary.json', 'doctor.json', 'query-index.json', 'plan.json'])
    assert summary['status'] == 'collected' and not summary['errors']
    assert summary['queries'] == index and len(index) == 30
    assert summary['new_REA_analysis'] and summary['analysis_performed']
    assert summary['target']['sha256'] == summary['target']['sha256_after'] == TARGET
    assert summary['architecture'] == 'arm64' and summary['platform'] == 'darwin'
    assert (folder / 'plan.json').read_bytes() == (HERE / 'plan.json').read_bytes()
    assert (folder / 'collector-used.mjs').read_bytes() == (HERE / 'fm3-rea-volume-pedal.mjs').read_bytes()
    assert sha((folder / 'plan.json').read_bytes()) == summary['plan_sha256']
    assert doctor['healthy'] and doctor['scope']['providers'] == ['ghidra']
    assert len(doctor['scope_checks']) == 9 and all(c['ok'] for c in doctor['scope_checks'])
    assert len(summary['function_checkpoints']) == 8 and all(c['verified'] for c in summary['function_checkpoints'])
    evidence = read('rea-evidence.json')
    by_id = {r['evidence_id']: r for r in evidence['records']}
    assert len(by_id) == len(evidence['records']) == 35
    statuses, functions, traces = collections.Counter(), [], []
    for row in index:
        path = Path(row['file'])
        assert not path.is_absolute() and '..' not in path.parts
        query = read(row['file'])
        assert query['tool'] == row['tool'] and query['arguments'] == row['arguments']
        assert query['assessment']['status'] == row['status']
        statuses[row['status']] += 1
        result = query['response']['structuredContent']
        if row['evidence_id']:
            assert result == by_id[row['evidence_id']], 'Export and query evidence disagree'
        if row['tool'] in ['analyze_function', 'trace_native_values']:
            assert result['subject']['digest']['sha256'] == TARGET
        normalized = result.get('normalized_result', {})
        if row['tool'] == 'analyze_function':
            assert normalized['pseudocode'] and normalized['assembly']
            functions.append({'query': row['id'], 'evidenceId': row['evidence_id'],
                              'address': normalized['procedure']['address'],
                              'pseudocodeSha256': sha(normalized['pseudocode'].encode()),
                              'instructionRows': len(normalized['assembly']),
                              'nativeValueFlowTruncated': normalized['native_value_flow']['truncated']})
        if row['tool'] == 'trace_native_values':
            assert normalized['truncated'] and row['status'] == 'limited'
            traces.append({'query': row['id'], 'evidenceId': row['evidence_id'],
                           'nodes': normalized['total_nodes'], 'edges': normalized['total_edges'],
                           'decompilations': normalized['decompilations'], 'truncated': True,
                           'unknownReasons': dict(collections.Counter(u['reason'] for u in normalized['unknowns']))})
    assert dict(statuses) == {'ok': 27, 'limited': 3}
    assert len(functions) == 10 and len(traces) == 3
    inventory = [{'path': str(p.relative_to(folder)), 'bytes': p.stat().st_size,
                  'sha256': sha(p.read_bytes())} for p in sorted(folder.rglob('*')) if p.is_file()]
    assert len(inventory) == 42
    return {'schemaVersion': 1, 'archive': archive.name, 'archiveSha256': ARCHIVE,
            'archiveBytes': archive.stat().st_size, 'verified': True, 'newMacREAAnalysis': True,
            'directREAAvailableInChatGPT': False, 'targetSha256': TARGET,
            'editorVersion': '1.07.17', 'reaVersion': summary['rea']['version'],
            'nodeVersion': summary['node'], 'ghidraVersion': '12.1.4',
            'startedAt': summary['started_at'], 'finishedAt': summary['finished_at'],
            'doctorScopePassed': 9, 'doctorScopeTotal': 9,
            'environmentHealthy': doctor['environment_healthy'],
            'informationalFailures': [c['name'] for c in doctor['informational_checks'] if not c['ok']],
            'queryStatuses': dict(statuses), 'queryEvidenceMatchesExport': True,
            'evidenceRecords': len(by_id), 'functionCheckpoints': summary['function_checkpoints'],
            'functionAnalyses': functions, 'boundedTraces': traces,
            'physicalExports': 0, 'generatorWriteSupportAdded': False,
            'fullRangeEncodingProven': False, 'files': inventory}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = review(args.folder, args.archive)
    with args.output.open('x') as stream:
        json.dump(result, stream, indent=2, ensure_ascii=False)
        stream.write('\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ['files', 'functionCheckpoints', 'functionAnalyses', 'boundedTraces']}))
