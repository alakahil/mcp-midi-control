"""Explicit adapters for historical FM3 evidence; no device I/O or inferred scales."""
import base64
import hashlib
import struct


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# Fixed layouts from the original collectors, checked against every decoded body.
LAYOUTS = {58: ('DISTORT', 4656, 144, 6, 20),
           66: ('REVERB', 9564, 71, 0, 2),
           70: ('DELAY', 7392, 89, 6, 14),
           118: ('FUZZ', 8460, 44, 0, 26)}


def check_point(body, effect, scope):
    _, start, words, type_pid, default_model = LAYOUTS[effect]
    channel, pid = scope['channel'], scope['pid']
    require(channel in ('A', 'B', 'C', 'D') and type(pid) is int and 0 <= pid < words, 'Invalid legacy point scope')
    require(len(body) >= start + words * 8, 'Truncated legacy block')
    require(struct.unpack_from('<H', body, start - 46)[0] == effect, 'Wrong legacy block')
    require(struct.unpack_from('<HH', body, start - 4) == (words, 4), 'Wrong legacy channel layout')
    channel_start = start + 'ABCD'.index(channel) * words * 2
    require(struct.unpack_from('<H', body, channel_start + type_pid * 2)[0] == scope.get('modelId', default_model), 'Wrong legacy model')
    offset = channel_start + pid * 2
    require(struct.unpack_from('<H', body, offset)[0] == scope['raw'], 'Wrong legacy point word')
    return offset


def check_delta(before, after, expected=None, allowed=None):
    require(len(before) == len(after), 'Legacy body length changed')
    changes = [{'offset': i, 'before': a, 'after': b} for i, (a, b) in enumerate(zip(before, after)) if a != b]
    if expected is not None:
        require(changes == expected, 'Legacy full-body delta differs')
    if allowed is not None:
        require(bool(changes) and all(c['offset'] in allowed for c in changes), 'Unexpected legacy collateral change')
    return changes


def drive_point(step, result):
    require(result['status'] == 'passed' and result.get('displayConfirmed') is True, 'Unconfirmed legacy Drive point')
    require(result['step'] == step and result['comparison']['step'] == step, 'Legacy Drive plan differs')
    require(step['kind'] in ('type', 'control'), 'Drive baseline is not a measured point')
    point = {'channel': step['channel'], 'modelId': step['binaryId'], 'typePid': 0}
    if step['kind'] == 'type':
        point.update(pid=0, raw=step['binaryId'], value=step['name'], field='Type', acquisition='type-selection')
    else:
        reading = result['comparison']['observation']
        require(reading['userConfirmedDisplayValue'] == step['value'], 'Legacy Drive display differs')
        point.update(pid=step['pid'], raw=reading['rawAfter'], value=step['value'], field=step['field'], acquisition='isolated-change')
    return point


class LegacyEvidence:
    def __init__(self, reg, ins, docs):
        self.reg, self.ins, self.ref, self.docs = reg, ins, ins / 'references', docs
        self.files, self.exports, self.comparisons, self.replay_only = set(), [], [], []

    def file(self, path):
        self.reg.source(path)
        self.files.add(str(path))
        return path

    def export(self, source, pointer, syx, effect, point, previous, expected=None, isolated=False, semantics=None):
        reg = self.reg
        obs = {'id': 'legacy/' + source.stem + pointer, 'parameter': f'{LAYOUTS[effect][0]}:{point["pid"]}',
               'kind': 'syx-export-no-get', 'scope': point, 'firmware': '13 (historical project declaration)',
               'evidence': reg.ref(source, pointer), 'preset': reg.ref(syx), 'comparisonPreset': reg.ref(previous)}
        if semantics:
            obs['displayEvidence'] = semantics
        reg.observations.append(obs)
        self.exports.append((obs, self.file(syx), effect, self.file(previous), expected, isolated))

    def collect(self):
        self.drive_session()
        self.rotary_baseline()
        self.scalar_exports()

    def drive_session(self):
        reg = self.reg
        folder = self.ref / 'drive-controls-20261006-123230'
        path = self.docs / 'FM3_DRIVE_CONTROL_SESSION_123230.json'
        report, plan = reg.read(path), reg.read(folder / 'plan.json')
        scripts = self.ins / 'scripts/drive-control-collector'
        require(plan == reg.read(scripts / 'plan.json'), 'Collector plan differs')
        require(digest(folder / 'plan.json') == reg.read(folder / 'session.json')['planSha256'], 'Session plan hash differs')
        for module in sorted(scripts.glob('*.mjs')):
            reg.source(module)
        previous = self.file(scripts / 'baseline.syx')
        records = {}
        failures = []
        for result_path in sorted(folder.glob('step-*/result.json')):
            result = reg.read(result_path)
            if result['status'] == 'failed':
                failures.append({'folder': result_path.parent.name, 'index': result['index'], 'error': result['error']})
                reg.exclusions.append({'evidence': reg.ref(result_path), 'detail': result})
                continue
            require(result['index'] not in records, 'Duplicate Drive step')
            records[result['index']] = (result_path, result)
        require(failures == report['historicalFailures'] and sorted(records) == list(range(len(plan))), 'Drive session records differ')
        require(len(report['results']) == len(plan), 'Drive report step count differs')
        for i, step in enumerate(plan):
            result_path, result = records[i]
            recorded = report['results'][i]
            require(result['step'] == step and recorded['index'] == i and recorded['status'] == result['status'], 'Drive step/report differs')
            if result['status'] == 'skipped':
                require(step['kind'] == 'control' and result.get('reason') == recorded['reason'] and result['reason'], 'Invalid Drive skip')
                reg.exclusions.append({'evidence': reg.ref(result_path), 'detail': result})
                continue
            require(result['status'] == 'passed' and result.get('displayConfirmed') is True, 'Unconfirmed Drive step')
            comparison = dict(result['comparison'])
            if step['kind'] == 'baseline' and 'onlyPlannedChanges' in comparison:
                comparison['onlyPlannedBodyChanges'] = comparison.pop('onlyPlannedChanges')
                comparison.setdefault('presetNameChange', None)
            require(comparison == recorded['comparison'] and result['pair'] == recorded['proof'], 'Drive report proof differs')
            syx = self.file(result_path.parent / 'donor.syx')
            self.comparisons.append({'previous': str(previous), 'current': str(syx), 'index': i, 'expected': comparison})
            if step['kind'] == 'baseline':
                capture = reg.read(result_path.parent / 'capture.json')
                reg.jobs.append((None, 118, 44, 8460, syx, capture, result['pair']))
                self.replay_only.append({'preset': reg.ref(syx), 'capture': reg.ref(result_path.parent / 'capture.json'),
                                         'proof': reg.ref(result_path, '/pair'), 'effectId': 118,
                                         'reason': 'Baseline pair integrity; no display point promoted'})
            else:
                point = drive_point(step, result)
                reg.queue_point(path, f'/results/{i}', 'FUZZ', 118, 44, 8460, point, result_path.parent)
                reg.observations[-1]['plan'] = reg.ref(folder / 'plan.json', f'/{i}')
            previous = syx

    def rotary_baseline(self):
        reg = self.reg
        path = self.ref / 'rotary-controls.json'
        data = reg.read(path)
        folder = self.ref / data['evidence']
        capture_path, syx = folder / 'baseline-get.json', folder / 'baseline.syx'
        for name in ('baseline-get.json', 'baseline.syx', 'session.json'):
            require(digest(folder / name) == data['fileHashes'][name], 'Rotary baseline source hash differs')
        capture, session = reg.read(capture_path), reg.read(folder / 'session.json')
        require(session['firmware'] == data['firmware'], 'Rotary firmware differs')
        require(capture['status'] == 'match' and capture['all84WordsMatch'] is True and capture['differences'] == [], 'Unmatched Rotary baseline')
        # Normalize only this documented historical format, keeping its original source.
        normalized = {**capture, 'status': 'captured'}
        proof = {'syxSha256': capture['syxSha256'], 'rawRxSha256': hashlib.sha256(bytes.fromhex(capture['rawRxHex'])).hexdigest(), 'matchedWords': 84}
        for i, control in enumerate(data['controls']):
            value = data['baselineScreen'][control['key']]
            matches = [p for p in control['points'] if p['display'] == value]
            require(len(matches) == 1, 'Ambiguous Rotary baseline reading')
            point = {'channel': 'A', 'pid': control['parameterId'], 'raw': matches[0]['raw'], 'value': value,
                     'field': control['key'], 'acquisition': 'baseline-screen-and-pair'}
            obs = {'id': f'legacy/rotary-baseline/{i}', 'parameter': f'ROTARY:{control["parameterId"]}',
                   'kind': 'paired-point', 'scope': point, 'firmware': str(session['firmware']),
                   'evidence': reg.ref(path, '/baselineScreen/' + control['key']), 'preset': reg.ref(syx),
                   'capture': reg.ref(capture_path), 'pair': reg.ref(capture_path), 'captureFormat': 'historical-match'}
            reg.observations.append(obs)
            reg.jobs.append((obs, 86, 21, 9868, syx, normalized, proof))
        control, step = data['controls'][0], data['steps'][0]
        point = {'channel': 'A', 'pid': 0, 'raw': control['points'][0]['raw'], 'value': control['points'][0]['display'],
                 'field': 'rateHz', 'acquisition': 'carried-state-not-isolated-change'}
        reg.queue_point(path, '/controls/0/points/0', 'ROTARY', 86, 21, 9868, point, folder / step['capture'], step['proof'])
        reg.observations[-1]['pair'] = reg.ref(path, '/steps/0/proof')

    def scalar_exports(self):
        reg = self.reg
        source = self.docs / 'FM3_SYX_FIXTURE_RESULTS.json'
        report = reg.read(source)
        semantics = reg.ref(self.docs / 'FM3_SYX_PROTOTYPE.md')
        for field, pid in [('Gain', 7), ('Bass', 8)]:
            for value, raw in [(4, 26214), (5, 32767), (6, 39320), (7, 45874)]:
                name = f'S2_Amp{field}_{value}.syx'
                require(report[name]['validation']['ok'] is True, 'Failed Amp fixture')
                self.export(source, '/' + name, self.ref / name, 58,
                    {'channel': 'B', 'pid': pid, 'raw': raw, 'value': value, 'modelId': 20, 'field': field},
                    self.ref / 'Baaspreset.syx', isolated=True, semantics=semantics)
        for label, report_name in [('G5', 'SYX'), ('TONE', 'TONE'), ('TIME', 'TIME')]:
            source = self.docs / f'FM3_{report_name}_HARDWARE_ROUNDTRIP.json'
            data = reg.read(source)
            require(str(data.get('firmware', data.get('firmwareUserReported'))) == '13', 'Historical firmware differs')
            generated = self.ins / f'examples/FM3_SA_TEST_{label}.syx'
            returned = generated.with_name(generated.stem + '_export.syx')
            require(digest(generated) == data['generatedSha256'] and digest(returned) == data['exportSha256'], 'Hardware return hash differs')
            changes = data.get('bodyDifferences', data.get('bodyDiff'))
            expected = [{'offset': c['offset'], 'before': c['generated'], 'after': c['exported']} for c in changes]
            if label == 'G5':
                require(data['userConfirmed'] == {'import': True, 'gain': 5}, 'Gain confirmation differs')
                self.export(source, '/userConfirmed/gain', returned, 58,
                    {'channel': 'B', 'pid': 7, 'raw': 32767, 'value': 5, 'modelId': 20}, generated, expected=expected)
                continue
            require(bool(data['userConfirmation']), 'Missing historical display confirmation')
            spec_path = self.ins / f'examples/FM3_SA_TEST_{label}.spec.json'
            spec = reg.read(spec_path)
            semantics = [reg.ref(spec_path), reg.ref(self.docs / f'FM3_{label}_PROTOTYPE.md')]
            targets = ({(58, 1): spec['levelB'], (58, 7): 5, (58, 9): spec['midB'], (58, 10): spec['trebleB'],
                        (58, 26): spec['presenceB'], (66, 13): spec['reverbMixA'], (70, 0): spec['delayMixA']} if label == 'TONE' else
                       {(66, 1): spec['reverbTimeS'], (66, 9): spec['reverbPredelayMs'], (66, 62): 'NONE',
                        (70, 8): spec['delayTimeMs'], (70, 10): spec['delayFeedback'], (70, 15): 'NONE'})
            for i, block in enumerate(data['values']):
                effect = block['effectId']
                channel = 'ABCD'[block['channel']] if isinstance(block['channel'], int) else block['channel']
                for j, p in enumerate(block['params']):
                    point = {'channel': channel, 'pid': p['paramId'], 'raw': p['raw'], 'value': targets[(effect, p['paramId'])],
                             'decodedValue': p['value'], 'unit': p['unit'], 'modelId': LAYOUTS[effect][4], 'field': p['label']}
                    self.export(source, f'/values/{i}/params/{j}', returned, effect, point, generated, expected=expected, semantics=semantics)
        previous = self.ref / 'drive-batch-20261006-112254/capture-20261006T112247-72000d0f64/donor.syx'
        for report_name, field, pid, value in [('CONTROL_2', 'DRIVE', 1, 2), ('CONTROL_8', 'DRIVE', 1, 8),
                ('TONE_7', 'TONE', 2, 7), ('TONE_3', 'TONE', 2, 3), ('LEVEL_2', 'LEVEL', 3, 2), ('MIX_25', 'MIX', 4, 25)]:
            source = self.docs / f'FM3_DRIVE_{report_name}.json'
            data = reg.read(source)
            syx = self.ref / f'drive-controls/FM3_DRIVE_C_{field}_{value}.syx'
            require(digest(previous) == data['baseSha256'] and digest(syx) == data['editedSha256'], 'Drive export hash differs')
            reading = data['points'][-1] if 'points' in data else {'raw': data['rawAfter'], 'display': data['userRequestedValue']}
            require(reading.get('display', reading.get('percent')) == value, 'Drive export display differs')
            self.export(source, '/points/1' if 'points' in data else '', syx, 118,
                {'channel': 'C', 'pid': pid, 'raw': reading['raw'], 'value': value, 'modelId': 26, 'field': field,
                 'unit': 'percent' if pid == 4 else 'no unit displayed'}, previous, expected=data['differences'], isolated=True)
            previous = syx

    def verify(self, runtime):
        require(len(runtime['driveComparisons']) == len(self.comparisons), 'Drive comparison count differs')
        for actual, job in zip(runtime.pop('driveComparisons'), self.comparisons):
            require(actual == job['expected'], 'Replayed Drive comparison differs')
        bodies = runtime['bodies']
        for obs, syx, effect, previous, expected, isolated in self.exports:
            body = base64.b64decode(bodies[str(syx)]['base64'])
            before = base64.b64decode(bodies[str(previous)]['base64'])
            offset = check_point(body, effect, obs['scope'])
            check_delta(before, body, expected, {offset, offset + 1} if isolated else None)
            obs['verification'] = 'export-word-model-and-full-body-delta-replayed-no-get'
