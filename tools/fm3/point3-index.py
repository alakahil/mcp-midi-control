#!/usr/bin/env python3
"""Package the reviewed parameter evidence index; no device or editor execution."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INS = ROOT/'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions'
OUT = ROOT/'docs/fm3/parameter-evidence'
TARGET = INS.parent.parent/'docs/FM3_PARAMETER_EVIDENCE.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def build():
    registry = json.loads((OUT/'registry.json').read_text())
    metadata = json.loads((OUT/'metadata-reconciliation.json').read_text())
    sources = {}

    def expand(value):
        if isinstance(value, list):
            return [expand(v) for v in value]
        if not isinstance(value, dict):
            return value
        if 'source' in value and value['source'] in registry['sources']:
            source = registry['sources'][value['source']]
            path = source['path']
            assert sha(ROOT/path) == source['sha256'], 'Evidence source changed: '+path
            sources[path] = source['sha256']
            return {'path': path, 'pointer': value['pointer']}
        return {k: expand(v) for k, v in value.items()}

    differences = {}
    for row in metadata['catalogRangeDifferences']:
        differences.setdefault(row['parameter'], []).append(row)
    parameters = []
    for row in registry['parameters']:
        observations = []
        for i in row['observations']:
            obs = registry['observations'][i]
            assert obs['parameter'] == row['id']
            obs = expand(obs)
            # The source stores every measured label. Retain exact queried words
            # and missing words here without duplicating the label dictionary.
            if obs['kind'] == 'device-enum-labels':
                labels = obs['scope'].pop('labels')
                obs['scope']['comparedWords'] = [v['word'] for v in labels]
                obs['scope']['exactLabels'] = sum(v['exact'] for v in labels)
                obs['scope']['trailingSpaceLabels'] = sum(not v['exact'] for v in labels)
            observations.append(obs)
        parameters.append({'id': row['id'], 'family': row['family'], 'pid': row['pid'],
                           'catalogNames': row['names'], 'observations': observations,
                           'catalogRangeDifferences': differences.get(row['id'], [])})
    return {'schemaVersion': 1, 'firmware': '13.0',
            'scope': 'Indexed historical evidence, not all hardware measurements; zero observations means not indexed. Labels never prove a numerical scale or write support.',
            'sources': {'registrySha256': sha(OUT/'registry.json'),
                        'metadataSha256': sha(OUT/'metadata-reconciliation.json'),
                        'dictionarySha256': sha(INS/'references/fm3-param-dictionary.json'),
                        'encoderSha256': sha(INS/'scripts/fm3-table-encoder.mjs')},
            'evidenceSources': dict(sorted(sources.items())),
            'parameters': parameters, 'deviceIO': False, 'newHardwareMeasurements': False}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    result = build()
    text = json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n'
    if args.write:
        TARGET.write_text(text)
    else:
        assert TARGET.read_text() == text, 'Point-3 parameter evidence index stale'
    print(json.dumps({'passed': True, 'parameterKeys': len(result['parameters']),
                      'observations': sum(len(p['observations']) for p in result['parameters']),
                      'bytes': len(text.encode()), 'deviceIO': False}))
