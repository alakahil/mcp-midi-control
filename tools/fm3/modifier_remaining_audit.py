#!/usr/bin/env python3
"""Pinned delta audit of already public captures; no device I/O or authoring."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'f0a99bc190fcbe3a63284335c68fad66e9f9a36c'
HISTORICAL = '194833788d15db09d5ab9a774940ae84fcdebaad'
ENGINE = 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/'
AUDIT = 'docs/fm3/parameter-evidence/modifier-fields-audit.json'
OUT = ROOT / 'docs/fm3/parameter-evidence/modifier-remaining-audit.json'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def containers(ref):
    entries = git('ls-tree', '-r', '-z', ref).split(b'\0')
    result = {}
    for entry in entries:
        if not entry:
            continue
        meta, name = entry.decode().split('\t', 1)
        if name.endswith(('.syx', '.zip', '/amp-history.json.gz')):
            result[name] = meta.split()[2]
    return result


def build():
    old_bytes = git('show', SOURCE + ':' + AUDIT)
    old = json.loads(old_bytes)
    assert old['sourceCommit'] == HISTORICAL
    before, after = containers(HISTORICAL), containers(SOURCE)
    # Reuse the historical hashed corpus only while every old container is identical.
    assert all(after.get(p) == oid for p, oid in before.items()), 'Changed/removed container: full audit required'
    added = sorted(set(after) - set(before))
    expected = [ENGINE + 'examples/FM3_MOD_AUTOENGAGE_OFF_export.syx',
                ENGINE + 'examples/FM3_MOD_DAMPING_LINEAR_export.syx']
    assert added == expected, 'New evidence needs explicit review'
    payload, inputs = [], []
    for p in added:
        data = git('show', SOURCE + ':' + p)
        inputs.append({'path': p, 'sha256': sha(data), 'bytes': len(data)})
        payload.append({'sha256': sha(data), 'base64': base64.b64encode(data).decode()})
    decoded = json.loads(subprocess.check_output(
        ['node', str(ROOT / 'tools/fm3/modifier_corpus.mjs')],
        input=json.dumps(payload).encode(), cwd=ROOT))
    assert all(r['status'] == 'inspected' for r in decoded['results'])
    profiles = {**old['corpus']['profiles'], **decoded['profiles']}
    specimens = {r['sha256']: r for r in old['corpus']['results']}
    specimens.update({r['sha256']: r for r in decoded['results']})
    evidence = {}
    for name, pid in [('wah-auto-engage-evidence.json', 10), ('wah-damping-evidence.json', 24)]:
        data = git('show', SOURCE + ':' + ENGINE + 'references/' + name)
        e = json.loads(data)
        assert e['target']['word'] == pid
        for item in e['pair']:
            assert sha(git('show', SOURCE + ':' + ENGINE + item['file'])) == item['sha256']
        evidence[pid] = {'file': ENGINE + 'references/' + name, 'sha256': sha(data), 'data': e}
    observed = evidence[24]['data']['screenshot']['observed']
    display_keys = {1:'min',2:'max',3:'startPercent',4:'midPercent',5:'endPercent',6:'slopePercent',
                    7:'attackMs',10:'autoEngage',12:'offValuePercent',13:'scale',14:'offsetPercent',
                    15:'releaseMs',24:'damping'}
    fields = []
    for f in old['fields']:
        pid = f['pid']
        words = sorted({r['words'][pid] for rows in profiles.values() for r in rows
                        if r['index'] == 0 and r['words'][8:10] == [94, 5]})
        confirmed = pid in evidence
        if not confirmed:
            assert len(words) == 1, 'Unexpected new field variation requires review'
        fields.append({'pid':pid,'name':f['name'],'bodyOffset':f['firstRecordBodyOffset'],
                       'observedWahWords':words,'retainedDisplayObservation':observed[display_keys[pid]],
                       'displayEvidence':evidence[24]['file'],
                       'independentChangedFieldPairs':1 if confirmed else 0,
                       'writeScope':'existing bounded Wah enum pair' if confirmed else 'blocked; unchanged observation only',
                       'locationChangedFieldConfirmed':confirmed,'deviceBehaviorVerified':False})
    return {'schemaVersion':1,'sourceCommit':SOURCE,'publishedVersion':'0.3.11',
            'historicalAudit':{'path':AUDIT,'sha256':sha(old_bytes),'sourceCommit':HISTORICAL},
            'method':'All original SYX/ZIP/amp-history Git objects unchanged; hash and decode the two additions; merge unique profiles.',
            'addedSources':inputs,'summary':{'inputFiles':len(after),
                'syxLocations':old['summary']['syxLocations']+len(added),'uniqueSyx':len(specimens),
                'inspectedUnique':sum(r['status']=='inspected' for r in specimens.values()),
                'excludedUnique':sum(r['status']=='excluded' for r in specimens.values()),
                'modifierProfiles':len(profiles),'auditedFields':len(fields),
                'boundedEnumFields':2,'remainingFieldsWithoutChangedFieldPair':len(fields)-2},
            'fields':fields,'nextExperiment':{'field':'MOD_MIN','record':0,'word':1,'bodyOffset':1586,
                'target':'External 1 -> Wah 1 Control ALL','beforeDisplay':0,'requestedDisplay':2.5,
                'displayUnit':'Wah Control scale 0..10; not a universal percentage',
                'candidateRawHypotheses':[16383,16384],
                'hypothesisBasis':'Unverified normalized linear uint16 class; truncation/rounding unresolved',
                'baseline':inputs[1],'required':['one changed-field whole-preset export','screenshot','only-Min-change confirmation'],
                'newBeforeExportRequired':False,'wouldProve':'Only the observed point and field location, not a full-range formula'},
            'scope':{'deviceIO':False,'newWriter':False,'newPluginRelease':False,'newHardwareMeasurements':False,
                     'globalScaleEncodingIncluded':False,'audioVerified':False}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    result = build()
    if args.write:
        OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        assert json.loads(OUT.read_text()) == result, 'Stale remaining-field audit'
    print(json.dumps({'passed':True,'summary':result['summary'],'deviceIO':False}))
