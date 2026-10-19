#!/usr/bin/env python3
"""Deterministic offline evidence registry. Never author presets or contact MIDI.

File integrity, parameter semantics, and encoder availability are separate axes.
Run --write after reviewing changed inputs; default checks committed outputs.
"""
import argparse
import base64
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess
from legacy_evidence import LegacyEvidence, check_point

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine'
INS = ENGINE / 'skills/instructions'
REF = INS / 'references'
OUT = ROOT / 'docs/fm3/parameter-evidence'


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def key(family, pid):
    return f'{family if family is not None else "UNNAMED"}:{pid}'


def parse_get(raw, effect, count):
    """Re-decode the stored FM3 0x74/75/76 stream, not its reported values."""
    frames, current = [], None
    for b in raw:
        if b >= 248:  # MIDI realtime messages may interleave SysEx.
            continue
        if b == 240:
            require(current is None, 'Nested GET frame')
            current = [b]
        elif b == 247:
            require(current is not None, 'GET frame without start')
            frames.append(bytes(current + [b]))
            current = None
        else:
            require(current is not None and b < 128, 'Invalid GET stream')
            current.append(b)
    require(current is None and len(frames) >= 3, 'Incomplete GET stream')
    for f in frames:
        require(len(f) >= 8 and f[:5] == bytes([240, 0, 1, 116, 17]), 'Wrong GET model/envelope')
        checksum = 0
        for b in f[:-2]:
            checksum ^= b
        require(checksum & 127 == f[-2], 'GET checksum mismatch')
    first, last = frames[0], frames[-1]
    require(len(first) == 12 and first[5] == 116 and len(last) == 8 and last[5] == 118,
            'Wrong GET response order')
    require(first[6] | first[7] << 7 == effect, 'Wrong GET effect')
    require(first[8] | first[9] << 7 == count, 'Wrong GET word count')
    values = []
    for f in frames[1:-1]:
        require(f[5] == 117, 'Unexpected GET section')
        n = f[6] | f[7] << 7
        require(len(f) == 10 + n * 3 and n > 0, 'Wrong GET section size')
        for i in range(8, len(f) - 2, 3):
            require(f[i + 2] <= 3, 'GET value exceeds uint16')
            values.append(f[i] | f[i + 1] << 7 | f[i + 2] << 14)
    require(len(values) == count, 'GET payload incomplete')
    return values


def join_parameters(catalog, dictionary, runtime):
    """Keep every catalog alias; no lossy dict comprehension over duplicate IDs."""
    rows = {}
    for i, p in enumerate(catalog):
        k = key(p['family'], p['paramId'])
        row = rows.setdefault(k, {'id': k, 'family': p['family'], 'pid': p['paramId'], 'catalogRows': [], 'names': []})
        require(p['name'] not in row['names'], f'Duplicate catalog symbol: {p["name"]}')
        row['catalogRows'].append(i)
        row['names'].append(p['name'])
    seen = set()
    for i, p in enumerate(dictionary):
        k = key(p['family'], p['param'])
        require(k not in seen, f'Duplicate dictionary parameter: {k}')
        seen.add(k)
        row = rows.setdefault(k, {'id': k, 'family': p['family'], 'pid': p['param'], 'catalogRows': [], 'names': []})
        require(not row['names'] or not p['name'] or p['name'] in row['names'], f'Conflicting symbol: {k}')
        row.update(dictionaryRow=i, effectId=p['block'], dictionaryStatus=p['status'], kind=p['kind'])
        if not row['names'] and p['name']:
            row['names'].append(p['name'])
        # Eligible is a policy gate, not a claim that every value/model was measured.
        gate = ('default' if p['status'] in runtime['defaultStatuses'] else
                'opt-in' if p['status'] in runtime['optInStatuses'] else
                'experimental-only' if p['status'] == 'unverified-taper' else 'blocked')
        supported_kind = p['kind'] in ['linear', 'log', 'knob', 'enum']
        bases = []
        for b in runtime['composerBases']:
            for slug, layout in runtime['layouts'][b['layout']].items():
                if (runtime['familyBySlug'].get(slug) == p['family'] and layout['eid'] == p['block']
                        and p['param'] < layout['words']):
                    bases.append(b['id'])
        row['tableEncoder'] = {'policy': gate, 'bases': sorted(set(bases)),
                               'available': bool(bases) and supported_kind and gate in ['default', 'opt-in']}
    for row in rows.values():
        row['join'] = ('both' if row['catalogRows'] and 'dictionaryRow' in row else
                       'catalog-only' if row['catalogRows'] else 'dictionary-only')
        row['observations'] = []
    return [rows[k] for k in sorted(rows)]


class Registry:
    def __init__(self):
        self.sources = {}
        self.documents = {}
        self.blobs = defaultdict(list)
        self.observations = []
        self.templates = []
        self.exclusions = []
        self.jobs = []
        self.syx_only = []
        self.legacy = LegacyEvidence(self, INS, ENGINE / 'docs')

    def source(self, path):
        path = Path(path)
        relative = path.relative_to(ROOT).as_posix()
        if relative not in self.sources:
            self.sources[relative] = {'sha256': sha(path.read_bytes()), 'bytes': path.stat().st_size}
        return relative

    def read(self, path):
        sid = self.source(path)
        if sid not in self.documents:
            self.documents[sid] = json.loads(Path(path).read_text())
        return self.documents[sid]

    def ref(self, path, pointer=''):
        return {'source': self.source(path), 'pointer': pointer}

    def inventory(self):
        index = self.read(REF / 'evidence-index.json')
        paths = 0
        for digest, blob in index['blobs'].items():
            for name in blob['paths']:
                p = INS / name
                require(p.is_file(), f'Missing evidence: {name}')
                require(sha(p.read_bytes()) == digest and p.stat().st_size == blob['bytes'], f'Corrupt evidence: {name}')
                self.blobs[digest].append(p.relative_to(ROOT).as_posix())
                paths += 1
        require(paths == index['filePaths'] and len(index['blobs']) == index['uniqueContents'], 'Inventory counts differ')
        # Compressed historical evidence remains addressable without unpacking 990 duplicates.
        archive_path = REF / 'amp-history.json.gz'
        archive = json.loads(gzip.decompress(archive_path.read_bytes()))
        self.source(archive_path)
        for digest, encoded in archive['blobs'].items():
            require(sha(base64.b64decode(encoded, validate=True)) == digest, 'Corrupt archived blob')
        for name, entry in archive['entries'].items():
            digest = entry['sha256']
            require(digest in archive['blobs'], 'Missing archived blob')
            require(len(base64.b64decode(archive['blobs'][digest])) == entry['bytes'], 'Archived size differs')
            self.blobs[digest].append(archive_path.relative_to(ROOT).as_posix() + '#' + name)
        return {'filePaths': paths, 'uniqueContents': index['uniqueContents'],
                'archivePaths': len(archive['entries']), 'archiveContents': len(archive['blobs'])}

    def queue_point(self, path, pointer, family, effect, words, start, point, folder, proof=None):
        require(point['channel'] in 'ABCD' and len(point['channel']) == 1, 'Invalid point channel')
        require(isinstance(point['pid'], int) and 0 <= point['pid'] < words, 'Invalid point PID')
        require(isinstance(point['raw'], int) and 0 <= point['raw'] <= 65535, 'Invalid point word')
        result_path = folder / 'result.json'
        result = self.read(result_path) if result_path.exists() else None
        if result is not None:
            require(result['status'] == 'passed', f'Excluded/failed result: {result_path}')
            require(result.get('displayConfirmed') is True, f'Unconfirmed display: {result_path}')
            proof = result['pair']
        require(proof and proof.get('paired') is True, f'Missing pair proof: {folder}')
        capture = self.read(folder / 'capture.json')
        syx = folder / 'donor.syx'
        require(syx.is_file(), f'Missing paired preset: {syx}')
        observation = {'id': f'{path.stem}{pointer}', 'parameter': key(family, point['pid']),
                       'kind': 'paired-point', 'scope': point, 'firmware': str(capture['firmwareDeclared']),
                       'evidence': self.ref(path, pointer), 'pair': self.ref(result_path, '/pair') if result else None,
                       'preset': self.ref(syx), 'capture': self.ref(folder / 'capture.json')}
        self.jobs.append((observation, effect, words, start, syx, capture, proof))
        self.observations.append(observation)

    def points(self):
        # These offsets are the recorded collectors' fixed layouts. Headers and full
        # GET channel arrays are checked below; never discover a block by byte scanning.
        for name, family, effect, words, start in [
            ('filter-controls', 'FILTER', 114, 37, 7614),
            ('filter-rea-controls', 'FILTER', 114, 37, 7614),
            ('peq-controls', 'PEQ', 54, 33, 8734),
            ('peq-full', 'PEQ', 54, 33, 8734),
            ('geq-full', 'GEQ', 50, 20, 8354),
            ('enhancer-full', 'ENHANCER', 122, 12, 7506)]:
            path = REF / (name + '.json')
            d = self.read(path)
            for category in ['skipped', 'excludedAttempts']:
                for i, item in enumerate(d.get(category, [])):
                    self.exclusions.append({'evidence': self.ref(path, f'/{category}/{i}'), 'detail': item})
            passed = {(p.get('source'), p['index']): p for p in d.get('passed', [])}
            require(len(passed) == len(d.get('passed', [])), f'Duplicate passed step in {name}')
            collection = 'anchors' if 'anchors' in d else 'points'
            for i, p in enumerate(d[collection]):
                step = passed[(p.get('source'), p['index'])] if collection == 'anchors' else p
                directory = d['evidenceDirectories'][p['source']] if 'evidenceDirectories' in d else d['evidenceDirectory']
                folder = REF / directory / step['folder']
                point = {k: v for k, v in p.items() if k in ['channel', 'type', 'binaryId', 'band', 'parameter', 'field', 'unit', 'point']}
                point.update(pid=p.get('pid', p.get('parameterId')), raw=p['raw'],
                             value=p.get('value', p.get('display', p.get('displayValue'))))
                if 'target' in p or 'targetValue' in p:
                    point['target'] = p.get('target', p.get('targetValue'))
                if 'band3Type' in p:
                    point['type'] = p['band3Type']
                self.queue_point(path, f'/{collection}/{i}', family, effect, words, start, point, folder)
        path = REF / 'amp-level-20261013/index.json'
        d = self.read(path)
        for i, p in enumerate(d['points']):
            capture = d['captures'][p['stepIndex']]
            folder = path.parent / capture['directory']
            attempt = self.read(folder / 'attempt.json')
            require(attempt['status'] == 'passed' and attempt['labelsConfirmed'] is True, 'Unconfirmed Amp observation')
            require(attempt['step']['levelDb'][p['channel']] == p['levelDb'], 'Amp target differs')
            proof = self.read(folder / 'pair.json')
            require(proof['models'][p['channel']] == p['modelId'], 'Amp model differs')
            point = {'pid': 1, 'raw': p['raw'], 'channel': p['channel'], 'modelId': p['modelId'], 'value': p['levelDb'], 'unit': 'dB'}
            self.queue_point(path, f'/points/{i}', 'DISTORT', 58, 144, 4656, point, folder, proof)
            self.observations[-1]['pair'] = self.ref(folder / 'pair.json')
        path = REF / 'rotary-controls.json'
        d = self.read(path)
        for i, step in enumerate(d['steps']):
            require(len(step['changes']) == 1, 'Ambiguous Rotary change')
            change = step['changes'][0]
            control = next(c for c in d['controls'] if c['parameterId'] == change['pid'])
            value = next(p['display'] for p in control['points'] if p['raw'] == change['after'])
            point = {'channel': step['label']['channel'], 'pid': change['pid'], 'raw': change['after'],
                     'value': value, 'field': control['key']}
            folder = REF / d['evidence'] / step['capture']
            self.queue_point(path, f'/steps/{i}', 'ROTARY', 86, 21, 9868, point, folder, step['proof'])
            self.observations[-1]['pair'] = self.ref(path, f'/steps/{i}/proof')
        path = REF / 'amp-level-cd-plan.json'
        d = self.read(path)
        preset = INS / d['packagedEvidence']
        require(sha(preset.read_bytes()) == d['exportSha256'], 'Amp C/D export hash differs')
        for i, p in enumerate(d['controls']):
            obs = {'id': f'amp-level-cd/controls/{i}', 'parameter': 'DISTORT:1', 'kind': 'syx-export-no-get',
                'scope': {'pid': 1, 'channel': p['channel'], 'modelId': p['modelId'], 'value': p['displayDb'], 'raw': p['observedRaw'], 'unit': 'dB'},
                'firmware': '13 (project declaration)', 'evidence': self.ref(path, f'/controls/{i}'), 'preset': self.ref(preset)}
            self.observations.append(obs)
            self.syx_only.append((obs, preset, p['bodyOffset']))
        # Screen-only observations cannot become paired-point evidence.
        path = REF / 'taper-batch-20261013.json'
        d = self.read(path)
        catalog = self.read(ROOT / 'packages/fractal-midi/catalog/fm3.json')['data']['FM3_PARAMS']
        by_name = {p['name']: key(p['family'], p['paramId']) for p in catalog}
        for i, p in enumerate(d['readings']):
            if p.get('display') is None:
                self.exclusions.append({'evidence': self.ref(path, f'/readings/{i}'), 'detail': p})
                continue
            require(p['name'] in by_name, f'Unmatched screen reading: {p["name"]}')
            self.observations.append({'id': f'taper/readings/{i}', 'parameter': by_name[p['name']],
                'kind': 'screen-reading-no-export', 'scope': p, 'firmware': str(d['firmware']),
                'evidence': self.ref(path, f'/readings/{i}')})

    def audit_pairs(self):
        files = sorted({str(job[4]) for job in self.jobs} | {str(job[1]) for job in self.syx_only} | self.legacy.files)
        runtime = json.loads(subprocess.check_output(['node', str(ROOT / 'tools/fm3/registry-runtime.mjs')],
                              input=json.dumps({'files': files, 'driveComparisons': self.legacy.comparisons}).encode(), cwd=ROOT))
        checked = set()
        for obs, effect, words, start, syx, capture, proof in self.jobs:
            syx_sha = self.sources[syx.relative_to(ROOT).as_posix()]['sha256']
            require(proof['syxSha256'] == syx_sha, f'Pair preset hash differs: {syx}')
            if 'syxSha256' in capture:
                require(capture['syxSha256'] == syx_sha, 'Capture preset hash differs')
            require(capture['status'] == 'captured' and not capture.get('partialFrameHex'), 'Incomplete capture')
            raw = bytes.fromhex(capture['rawRxHex'])
            require(sha(raw) == proof['rawRxSha256'], 'GET hash differs')
            values = parse_get(raw, effect, words * 4)
            body = base64.b64decode(runtime['bodies'][str(syx)]['base64'])
            if 'bodySha256' in proof:
                require(sha(body) == proof['bodySha256'], 'Body hash differs')
            require(struct.unpack_from('<H', body, start - 46)[0] == effect, 'Wrong block layout')
            require(struct.unpack_from('<HH', body, start - 4) == (words, 4), 'Wrong channel layout')
            syx_values = list(struct.unpack_from('<' + 'H' * (words * 4), body, start))
            require(values == syx_values, 'GET/SYX words differ')
            require(proof['matchedWords'] == len(values), 'Reported pair count differs')
            if obs is not None:
                p = obs['scope']
                require(values['ABCD'.index(p['channel']) * words + p['pid']] == p['raw'], 'Anchor raw word differs')
                if 'typePid' in p:
                    check_point(body, effect, p)
                obs['verification'] = 'raw-get-syx-replayed'
            checked.add((syx_sha, sha(raw), effect))
        for obs, syx, offset in self.syx_only:
            body = base64.b64decode(runtime['bodies'][str(syx)]['base64'])
            require(struct.unpack_from('<H', body, offset)[0] == obs['scope']['raw'], 'SYX-only point differs')
            require(struct.unpack_from('<H', body, offset + 10)[0] == obs['scope']['modelId'], 'SYX-only model differs')
            obs['verification'] = 'export-word-replayed-no-get'
        self.legacy.verify(runtime)
        runtime.pop('bodies')
        return runtime, len(checked)

    def model_templates(self, capabilities):
        for path in sorted(REF.glob('*-library.json')):
            d = self.read(path)
            if not isinstance(d.get('models'), list):
                continue
            for i, model in enumerate(d['models']):
                source = model.get('source', model)
                digest = source.get('syxSha256')
                require(digest in self.blobs, f'Missing template source: {path.name}/{i}')
                require(len(model['words']) == d['wordsPerChannel'], 'Template word count differs')
                self.templates.append({'id': f'{path.stem}/models/{i}', 'familySlug': path.stem.removesuffix('-library'),
                    'name': model['name'], 'binaryId': model['binaryId'],
                    'channel': source.get('channel', model.get('sourceChannel')),
                    'evidence': self.ref(path, f'/models/{i}'), 'syxSha256': digest,
                    'sourcePaths': sorted(self.blobs[digest]), 'verification': 'source-hash-present-not-parameter-proof'})
        # Amp/Cab libraries have distinct schemas. Count imported templates separately
        # from the 336 Amp templates advertised by the composer (five are elsewhere).
        for name in ['amp', 'cab']:
            path = INS / f'lookup/{name}-library.json'
            d = self.read(path)
            entries = list(d['templates'].items()) if isinstance(d['templates'], dict) else list(enumerate(d['templates']))
            for index, model in entries:
                source = model['source']
                digest = source.get('syxSha256', source.get('sha256'))
                require(digest in self.blobs, f'Missing {name} template source: {index}')
                pointer = '/templates/' + str(index).replace('~', '~0').replace('/', '~1')
                self.templates.append({'id': f'{name}-library{pointer}', 'familySlug': name, 'name': model['name'],
                    'channel': source['channel'], 'evidence': self.ref(path, pointer), 'syxSha256': digest,
                    'sourcePaths': sorted(self.blobs[digest]), 'verification': 'source-hash-present-not-parameter-proof'})
        for name in ['geq', 'enhancer']:
            path = REF / f'{name}-full.json'
            d = self.read(path)
            for i, model in enumerate(d['models']):
                digest = model['sourceSha256']
                require(digest in self.blobs, f'Missing {name} template source')
                self.templates.append({'id': f'{name}-full/models/{i}', 'familySlug': name, 'name': model['name'],
                    'binaryId': model['binaryId'], 'evidence': self.ref(path, f'/models/{i}'),
                    'syxSha256': digest, 'sourcePaths': sorted(self.blobs[digest]), 'verification': 'source-hash-present-not-parameter-proof'})
        return {k: {'declaredCount': v['count'], 'channels': v['channels'],
                    'source': self.ref(ENGINE / 'docs/FM3_COMPOSER_CAPABILITIES.json', '/templates/' + k)}
                for k, v in capabilities['templates'].items()}


def build():
    reg = Registry()
    inventory = reg.inventory()
    reg.points()
    reg.legacy.collect()
    runtime, pairs = reg.audit_pairs()
    cat = reg.read(ROOT / 'packages/fractal-midi/catalog/fm3.json')['data']['FM3_PARAMS']
    dictionary = reg.read(REF / 'fm3-param-dictionary.json')
    require(sha((REF / 'fm3-param-dictionary.json').read_bytes()) == runtime['dictionaryHash'], 'Encoder dictionary pin differs')
    cap = reg.read(ENGINE / 'docs/FM3_COMPOSER_CAPABILITIES.json')
    template_support = reg.model_templates(cap)
    rows = join_parameters(cat, dictionary['params'], runtime)
    by_id = {p['id']: p for p in rows}
    for i, obs in enumerate(reg.observations):
        require(obs['parameter'] in by_id, f'Unjoined observation: {obs["id"]}')
        by_id[obs['parameter']]['observations'].append(i)
    require(len({o['id'] for o in reg.observations}) == len(reg.observations), 'Duplicate observation ID')
    measured = {o['parameter'] for o in reg.observations if o['kind'] == 'paired-point'}
    exports = {o['parameter'] for o in reg.observations if o['kind'] == 'syx-export-no-get'}
    family_rows = []
    for family in sorted({p['family'] for p in rows}, key=lambda x: x or ''):
        ps = [p for p in rows if p['family'] == family]
        family_rows.append({'family': family, 'catalogKeys': sum(bool(p['catalogRows']) for p in ps),
            'dictionaryKeys': sum('dictionaryRow' in p for p in ps), 'pairedPointKeys': sum(p['id'] in measured for p in ps),
            'tableDefaultOnBundledBase': sum(p.get('tableEncoder', {}).get('available', False) and p['tableEncoder']['policy'] == 'default' for p in ps),
            'tableOptInOnBundledBase': sum(p.get('tableEncoder', {}).get('available', False) and p['tableEncoder']['policy'] == 'opt-in' for p in ps)})
    catalog_keys = sum(bool(p['catalogRows']) for p in rows)
    summary = {'schemaVersion': 1, 'scope': 'Bundled firmware-13 sources; coverage of indexed evidence, not all FM3 features or all hardware-valid values.',
        'inventory': inventory, 'catalogRows': len(cat), 'catalogKeys': catalog_keys, 'aliasRows': len(cat) - catalog_keys,
        'dictionaryRows': len(dictionary['params']), 'unionKeys': len(rows), 'joins': dict(sorted(Counter(p['join'] for p in rows).items())),
        'dictionaryStatusClaims': dict(sorted(Counter(p['status'] for p in dictionary['params']).items())),
        'observations': dict(sorted(Counter(o['kind'] for o in reg.observations).items())), 'pairedCapturesReplayed': pairs,
        'parametersWithPairedPoint': len(measured), 'catalogKeysWithPairedPoint': len(measured & {p['id'] for p in rows if p['catalogRows']}),
        'parametersWithSyxExportPoint': len(exports), 'parametersWithPairedOrExportPoint': len(measured | exports),
        'excludedOrSkippedRecords': len(reg.exclusions), 'templatesWithSourceHash': len(reg.templates),
        'composerTemplateDeclarations': {k: v['declaredCount'] for k, v in template_support.items()}, 'families': family_rows}
    # These are evidence-indexing gaps, not requests to repeat hardware measurements.
    tasks = [
        {'id': 'existing-evidence-adapters', 'priority': 1, 'userPhysicalActions': 0,
         'action': 'Selected legacy scalar adapters are complete. Mine remaining historical return reports and compressed Amp evidence for additional explicit display observations; do not infer knob measurements from template words.',
         'completed': ['Amp Gain/Bass eight isolated exports', 'G5/TONE/TIME historical returns', 'Drive six isolated exports and 18 paired captures', 'Rotary five baseline points and carried Rate 2 state'],
         'inputs': ['references/amp-history.json.gz', 'references/offline-suite.json', 'docs/*HARDWARE*'],
         'doneWhen': 'Every promoted point has a source pointer, model/channel scope and replayed raw evidence; skipped/ambiguous points stay separate.'},
        {'id': 'metadata-join-gaps', 'priority': 1, 'userPhysicalActions': 0,
         'parameterIds': [p['id'] for p in rows if p['join'] != 'both'],
         'action': 'Reconcile catalog-only and dictionary-only keys from existing FM3-specific source tables. Retain OLD_FLANGER aliases; verify device availability before adding catalog-only families.',
         'doneWhen': 'Each mismatch is classified as alias, unnamed/reserved slot, different scope, or proven FM3 omission; no other-device ID is substituted.'},
        {'id': 'offline-encoder-matrix', 'priority': 2, 'userPhysicalActions': 0,
         'parameterIds': [p['id'] for p in rows if p.get('tableEncoder', {}).get('available') and p['id'] not in measured],
         'action': 'Generate offline boundary/enum/round-trip and no-collateral-write cases for eligible table controls; compare with existing snapshots and independent reference formulas.',
         'doneWhen': 'Software checks have their own result axis and never promote a taper class or model template to an individual hardware measurement.'},
        {'id': 'layout-and-composer-gaps', 'priority': 2, 'userPhysicalActions': 0,
         'action': 'Compare table base availability with composer insertion, model-scoped controls and donor layouts; add explicit mappings and tests before expanding support. Five Amp templates outside amp-library need individual provenance.',
         'doneWhen': 'Every added write has an exact block layout, bounds, allowed byte diff and reference replay; unsupported routing/modifiers stay blocked.'},
        {'id': 'minimal-hardware-batch', 'priority': 3, 'userPhysicalActions': 'Only remaining ambiguities; count decided after offline tasks',
         'action': 'Cluster unresolved controls by taper, type and channel; prepare one labeled preset per compatible group. Prefer one screen review plus read-only GET for an existing state, and one export per batch when a SYX pair is indispensable.',
         'doneWhen': 'A concrete batch lists exact unknowns and expected benefit. SET/LOAD/save is not authorized by this registry and needs separate authorization.'},
        {'id': 'release-and-load-gate', 'priority': 3, 'userPhysicalActions': 'One fresh conversation loading check per release',
         'action': 'Bind a future release to its exact commit and manifest; run offline suite, packaged self-check, launcher version/commit/hash checks and fresh-chat generator test.',
         'doneWhen': 'Release = commit; package and launcher agree. Hardware import, audio and CPU are recorded separately.'}]
    for path in sorted((ROOT / 'tools/fm3').glob('*')):
        if path.suffix in ['.py', '.mjs']:
            reg.source(path)
    for path in [INS / 'scripts/fm3-table-encoder.mjs', INS / 'scripts/fm3-composer-bases.mjs',
                 INS / 'scripts/drive-collector/fm3-prototype.mjs', INS / 'scripts/drive-collector/fm3-codec.mjs']:
        reg.source(path)
    registry = {'schemaVersion': 1, 'policy': {
        'sourceCommitBaseline': '6c33895a46992381afe5aa0691cfe0f62540a7e0',
        'reproducibility': 'Input SHA-256s are authoritative; generated outputs have no timestamp or self-referential output commit.',
        'sourceReferences': 'source is a repository-relative path; pointer is RFC 6901. catalogRows/dictionaryRow index the named source arrays.',
        'measurement': 'A point only proves its recorded firmware/type/channel/value scope. No interpolation or cross-model/channel promotion.',
        'encoder': 'Table availability requires policy, supported kind and a bundled base layout; composer support is separately declared.',
        'limitations': 'Remaining historical evidence mining and non-parameter features remain in work-queue.json. Zero indexed points means not indexed, not unmeasured or unsupported.',
        'hardware': 'No device import, audio or CPU testing was performed by this audit.'},
        'sources': dict(sorted(reg.sources.items())), 'parameters': rows, 'observations': reg.observations,
        'replayOnlyPairs': reg.legacy.replay_only,
        'templates': reg.templates, 'composerTemplates': template_support,
        'composerDeclarations': {k: v for k, v in cap.items() if k != 'templates'},
        'excludedOrSkipped': reg.exclusions}
    # Intern repeated file references; the source map retains full paths and hashes.
    source_ids = {path: f'S{i:04d}' for i, path in enumerate(sorted(reg.sources))}
    def intern(value):
        if isinstance(value, list):
            return [intern(v) for v in value]
        if isinstance(value, dict):
            return {k: source_ids[v] if k == 'source' and isinstance(v, str) and v in source_ids else intern(v)
                    for k, v in value.items()}
        return value
    registry = intern(registry)
    registry['sources'] = {source_ids[path]: {'path': path, **value} for path, value in sorted(reg.sources.items())}
    registry['policy']['sourceReferences'] = 'source resolves through sources[id] to repository path and SHA-256; pointer is RFC 6901. catalogRows and dictionaryRow index the catalog FM3_PARAMS and dictionary params arrays.'
    template_blobs = {}
    for template in registry['templates']:
        template_blobs[template['syxSha256']] = template.pop('sourcePaths')
    registry['templateSourceBlobs'] = dict(sorted(template_blobs.items()))
    return registry, summary, {'schemaVersion': 1, 'tasks': tasks}


def markdown(s):
    lines = ['# FM3 parameetrite tõendite katvus', '',
        'Automaatselt korratav audit avaldatud firmware 13 andmetest. Arvud näitavad allikate seoseid ja indekseeritud tõendeid; need ei ole FM3 kõigi võimaluste valmimisprotsent.', '',
        '| Kontroll | Tulemus |', '| --- | ---: |',
        f'| Kataloogi read / erinevad pere–PID paarid | {s["catalogRows"]} / {s["catalogKeys"]} |',
        f'| Lisanimega read | {s["aliasRows"]} |',
        f'| Parameetrisõnastiku kirjed | {s["dictionaryRows"]} |',
        f'| Kataloogi ja sõnastiku ühised paarid | {s["joins"]["both"]} |',
        f'| Ainult kataloogis / ainult sõnastikus | {s["joins"]["catalog-only"]} / {s["joins"]["dictionary-only"]} |',
        f'| GET/SYX-ga uuesti võrreldud mõõtmispunktid | {s["observations"].get("paired-point", 0)} |',
        f'| Erinevad uuesti kontrollitud GET/SYX paarid | {s["pairedCapturesReplayed"]} |',
        f'| Vähemalt ühe sellise punktiga parameetrid | {s["parametersWithPairedPoint"]} |',
        f'| Eraldi arvestatud ekraaninäidud | {s["observations"].get("screen-reading-no-export", 0)} |',
        f'| Ekspordi abil kontrollitud punktid ilma GET-ita | {s["observations"].get("syx-export-no-get", 0)} |',
        f'| Vähemalt ühe paaristatud või ekspordipunktiga parameetrid | {s["parametersWithPairedOrExportPoint"]} |',
        f'| Vahele jäetud või välistatud lähtekirjed | {s["excludedOrSkippedRecords"]} |', '',
        'Üks GET/SYX paar võib tõendada mitut punkti. Terve kanali mall ei tõenda kõigi nuppude skaalasid. Sõnastiku `measured` ja `taper-class-verified` on lähteallika väited; need ei suurenda automaatselt mõõdetud punktide arvu.', '',
        'Tabelikirjutaja tugi on loetud töötavast mootorist: sobiv olek, kodeerimisliik ja parameetri asukoht tuntud alusfailis. See ei laiene suvalisele presetile. Composeri lisatavate plokkide tugi on eraldi `registry.json` failis; allolev null ei tähenda, et composer plokki ei toeta.', '',
        '| Pere | Kataloogi PID-d | Sõnastiku PID-d | Paaristatud punktiga PID-d | Tabelikirjutaja vaikimisi / eraldi lubamisel |',
        '| --- | ---: | ---: | ---: | ---: |']
    for f in s['families']:
        lines.append(f'| {f["family"] or "Nimetu"} | {f["catalogKeys"]} | {f["dictionaryKeys"]} | {f["pairedPointKeys"]} | {f["tableDefaultOnBundledBase"]} / {f["tableOptInOnBundledBase"]} |')
    lines += ['', '## Järgmised tööd kasutaja ajakulu vähendamiseks', '',
        '1. Valitud vanemad Amp/Drive/Delay/Reverb mõõtmised ja Rotary algseis on registris. Jätkata ülejäänud ajalooliste tagasieksportide ja Ampi arhiivi läbivaatust; mallis leiduvat väärtust ei loeta automaatselt mõõdetud nupuväärtuseks.',
        '2. Lahendada kataloogi ja sõnastiku erinevused olemasoleva FM3 metaandmestiku ning pöördprojekteerimise tulemuste põhjal. Teise seadme ID-d ei asenda FM3 tõendit.',
        '3. Koostada automaatne piirväärtuste, valikute ja kõrvalmuudatuste testimaatriks ning laiendada kontrollitud plokipaigutusi.',
        '4. Alles allesjäänud ebaselguste jaoks koostada ühine mõõtepakett: üks laadimine, võimalikult vähe ekraanikontrolle ja eksport ainult seal, kus seda tõesti vaja on.',
        '5. Järgmine väljalase seotakse täpse commit’iga; pakett, käivitajajuhend ja värske vestluse laadimiskontroll peavad ühtima.', '',
        'Masinloetavad ülesanded ja mõjutatud parameetri-ID-d: [work-queue.json](work-queue.json). Täielik register: [registry.json](registry.json). Koondarvud: [coverage.json](coverage.json).', '',
        'See audit ei muuda pluginat ega saada seadmesse käske. Seadmeimport, heli, CPU, suvaline routing, modifier’id ja kõik võimalikud mudeli/kanali kombinatsioonid ei ole selle tabeliga tõendatud.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    registry, summary, queue = build()
    # One record per line keeps large generated diffs reviewable and avoids pretty-print bloat.
    compact = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    registry_text = '{\n' + ',\n'.join(compact(k) + ':' + (
        '[\n' + ',\n'.join(compact(row) for row in v) + '\n]' if isinstance(v, list) else compact(v)
    ) for k, v in registry.items()) + '\n}\n'
    outputs = {'registry.json': registry_text, 'coverage.json': json.dumps(summary, ensure_ascii=False, indent=2) + '\n',
               'work-queue.json': json.dumps(queue, ensure_ascii=False, indent=2) + '\n', 'coverage.md': markdown(summary)}
    if args.write:
        OUT.mkdir(parents=True, exist_ok=True)
        for name, content in outputs.items():
            (OUT / name).write_text(content)
    else:
        for name, content in outputs.items():
            require((OUT / name).is_file() and (OUT / name).read_text() == content,
                    f'{name} is stale; review inputs and run tools/fm3/parameter-evidence.py --write')
    print(json.dumps({k: summary[k] for k in ['catalogRows', 'catalogKeys', 'dictionaryRows', 'observations', 'pairedCapturesReplayed', 'parametersWithPairedPoint']}))


if __name__ == '__main__':
    main()
