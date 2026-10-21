#!/usr/bin/env python3
"""Replay existing modifier evidence. Does not authorize or perform writes."""
import argparse
import base64
from collections import Counter
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile
from six_field_resolution import ROOT, ENGINE, cache_records, CACHE_SHA

BASELINE = '194833788d15db09d5ab9a774940ae84fcdebaad'
OUT = ROOT / 'docs/fm3/parameter-evidence/modifier-fields-audit.json'
REF = ENGINE / 'skills/instructions/references'
PIDS = [1, 2, 3, 4, 5, 6, 7, 10, 12, 13, 14, 15, 24]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def build():
    # Only the named, already published input tree is evidence for this audit.
    paths = git('ls-tree', '-r', '--name-only', '-z', BASELINE).decode().split('\0')
    inputs = sorted(p for p in paths if p.endswith(('.syx', '.zip', '/amp-history.json.gz')))
    blobs, aliases, sources = {}, {}, []

    def add(data, name):
        key = sha(data)
        blobs[key] = data
        aliases.setdefault(key, []).append(name)

    for name in inputs:
        data = git('show', BASELINE + ':' + name)
        sources.append({'path': name, 'sha256': sha(data), 'bytes': len(data)})
        if name.endswith('.syx'):
            add(data, name)
        elif name.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for member in sorted(archive.namelist()):
                    if member.lower().endswith('.syx'):
                        add(archive.read(member), name + '!' + member)
        else:
            store = json.loads(gzip.decompress(data))
            assert store['kind'] == 'FM3_AMP_HISTORY' and store['schemaVersion'] == 1
            for member, entry in sorted(store['entries'].items()):
                if member.endswith('.syx'):
                    content = base64.b64decode(store['blobs'][entry['sha256']], validate=True)
                    assert sha(content) == entry['sha256'] and len(content) == entry['bytes']
                    add(content, name + '!' + member)

    payload = [{'sha256': h, 'base64': base64.b64encode(b).decode()} for h, b in sorted(blobs.items())]
    decoded = json.loads(subprocess.check_output(
        ['node', str(ROOT / 'tools/fm3/modifier_corpus.mjs')],
        input=json.dumps(payload).encode(), cwd=ROOT))
    for entry in decoded['results']:
        entry['locations'] = sorted(aliases[entry['sha256']])
    counts = Counter(x['status'] for x in decoded['results'])
    profiles = decoded['profiles']
    # Distinguish retained/active targets from empty records (their zeroes are
    # not a measured OFF choice, nor zero damping on a working modifier).
    target_records = [r for records in profiles.values() for r in records if r['words'][8:10] == [94, 5]]
    assert target_records and all(r['index'] == 0 for r in target_records)

    dictionary_bytes = (REF / 'fm3-param-dictionary.json').read_bytes()
    policy_bytes = (REF / 'fm3-parameter-dependencies.json').read_bytes()
    dictionary = {p['param']:p for p in json.loads(dictionary_bytes)['params'] if p['family'] == 'MOD'}
    policy = json.loads(policy_bytes)
    parsed_cache, cache = cache_records()
    assert parsed_cache['validation']['byte_roundtrip_equal']
    assert policy['sources']['cacheSha256'] == CACHE_SHA
    assert policy['sources']['dictionarySha256'] == sha(dictionary_bytes)
    assert policy['descriptors']['MOD']['bindings'] == [[i, dictionary[i]['name']] for i in range(25)]
    for name in ['fm3-param-dictionary.json', 'fm3-parameter-dependencies.json']:
        relative = (REF / name).relative_to(ROOT).as_posix()
        assert (REF / name).read_bytes() == git('show', BASELINE + ':' + relative)

    fields = []
    for pid in PIDS:
        d, c = dictionary[pid], cache[3, pid]
        lo, hi, mult, step = c['numeric_fields']
        assert [d['min'], d['max'], d['displayMultiplier'], d['step']] == [lo, hi, mult, step]
        assert (d['enum'] or []) == c['labels']
        words = sorted({r['words'][pid] for r in target_records})
        # Store the source's actual float32 values. Ranges below describe metadata,
        # never measured display values or confirmed modifier-preset encodings.
        fields.append({'pid': pid, 'name': d['name'], 'firstRecordBodyOffset': 1584 + 2 * pid,
            'storage': 'uint16 little-endian; record r adds 96*r bytes',
            'locationEvidence': 'native MOD descriptor + bounded layout + existing serialized words',
            'observedWahWords': words, 'dictionary': d, 'cache': c,
            'displayMetadata': None if pid in [1, 2] else {
                'range': [lo * mult, hi * mult], 'labels': c['labels'],
                'scope': 'FW13 metadata; no paired editor observation for this field'},
            'encodingEvidence': ('target-dependent metadata placeholder; no general min/max codec'
                if pid in [1, 2] else 'enum metadata / transferable taper class; constant retained value only'),
            'independentChangedFieldPairs': 0,
            'writeDecision': 'blocked-pending-discriminating-preset-and-display-evidence',
            'deviceBehaviorVerified': False})

    registry = json.loads((ROOT / 'docs/fm3/parameter-evidence/registry.json').read_text())
    registered = [p for p in registry['parameters'] if p['family'] == 'MOD']
    assert len(registered) == 25 and all(not p['observations'] for p in registered)
    # This assertion detects new evidence, rather than silently retaining a stale
    # "nothing changed" conclusion when the audit is updated to a newer tree.
    assert all(len(f['observedWahWords']) == 1 for f in fields)
    return {'schemaVersion': 1, 'sourceCommit': BASELINE,
        'scope': {'deviceIO': False, 'presetWrites': False, 'newHardwareMeasurements': False,
                  'newAudioConfirmation': False, 'firmwareMetadata': '13.0',
                  'presetFirmwareDetected': None, 'productionPluginUnchanged': True},
        'summary': {'inputFiles': len(inputs), 'syxLocations': sum(map(len, aliases.values())),
                    'uniqueSyx': len(blobs), 'inspectedUnique': counts['inspected'],
                    'excludedUnique': counts['excluded'], 'modifierProfiles': len(profiles),
                    'fieldCount': len(fields), 'newWritableFields': 0,
                    'registeredModifierObservations': 0},
        'metadataSources': {'policySha256': sha(policy_bytes), 'dictionarySha256': sha(dictionary_bytes),
                            'cacheSha256': CACHE_SHA, 'nativeDescriptor': policy['descriptors']['MOD'],
                            'editorSha256': policy['sources']['editorSha256'],
                            'nativeBindingReplayedFromBinary': False},
        'sources': sources, 'fields': fields, 'corpus': decoded,
        'decision': 'No new writer. Repeated inherited settings, unbound zeroes, synthetic tests and '
                    'scalar-class labels are not independent changed-field/display evidence.',
        'smallestNextExperiment': {'target': 'record 0, External 1 -> Wah 1 Control, ALL',
            'base': 'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',
            'edit': 'Auto Engage: MED SPD -> OFF; change nothing else',
            'hypothesisOnly': {'pid': 10, 'bodyOffset': 1604, 'storedWordBefore': 2, 'storedWordAfter': 0},
            'required': 'Confirm pre-edit label, one post-edit screenshot and one complete exported preset; '
                        'obtain a baseline export only if unrelated normalization prevents comparison.',
            'wouldEstablish': 'At most the MED SPD/OFF pair on this retained Wah binding; not every enum or DSP behavior'}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    result = build()
    text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.write:
        OUT.write_text(text)
    elif not OUT.is_file() or OUT.read_text() != text:
        raise SystemExit('Audit differs; inspect new evidence before --write')
    print(json.dumps(result['summary']))
