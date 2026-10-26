"""Index existing October 23-24 evidence without promoting it to scale proof."""


def collect(reg, ref, runtime, parse_get, require, sha):
    params = runtime['effectiveParameters']
    by_name = {p['name']: p for p in params if p['name']}
    by_key = {(p['family'], p['param']): p for p in params}
    stats = {'labelParameters': 0, 'labelsCompared': 0, 'exactLabels': 0, 'trailingSpaceLabels': 0,
             'frontPanelReadbacks': 0, 'storedDefaultReadings': 0, 'disputedReadings': 0}
    for batch in ['input-volume', 'gate-pan', 'volume-type']:
        receipt = ref/f'fm3-step-diff-{batch}-20261024.json'
        result = ref/f'fm3-step-diff-{batch}-20261024-results.json'
        doc, raw = reg.read(receipt), reg.read(result)
        require(doc['resultsSha256'] == sha(result.read_bytes()), 'Step-diff result hash differs')
        require(raw['baselineMatchesPack'] and len(doc['steps']) == len(raw['steps']), 'Step-diff incomplete')
        previous = {}
        for slug, base in raw['baseline'].items():
            eid = {'in1': 37, 'volpan': 102}[slug]
            words = parse_get(bytes.fromhex(''.join(base['frames'])), eid, len(base['words']))
            require(words == base['words'], 'Baseline GET differs from words')
            previous[slug] = words
        for i, (point, step) in enumerate(zip(doc['steps'], raw['steps'])):
            require(point['id'] == step['id'] and point['userReading'] == step['userReading'], 'Step identity differs')
            actual = []
            for slug, words in step['words'].items():
                width = {'in1': 10, 'volpan': 15}[slug]
                require(len(words) == len(previous[slug]) == width*4, 'Snapshot layout differs')
                for j, (before, after) in enumerate(zip(previous[slug], words)):
                    require(isinstance(after, int) and 0 <= after <= 65535, 'Invalid stored word')
                    if before != after:
                        actual.append({'block': slug, 'channel': 'ABCD'[j//width], 'param': j%width, 'before': before, 'after': after})
            require(actual == step['changed'], 'Step diff differs from snapshots')
            p = by_name[point['param']]
            slug = {'INPUT': 'in1', 'VOLUME': 'volpan'}[p['family']]
            require(step['words'][slug][p['param']] == point['deviceWord'], 'Observation word differs')
            kind = ('front-panel-default-reading' if point.get('kind') == 'preset' else
                    'front-panel-disputed-reading' if point.get('kind') == 'near' else 'front-panel-readback')
            stats[{'front-panel-readback': 'frontPanelReadbacks', 'front-panel-default-reading': 'storedDefaultReadings',
                   'front-panel-disputed-reading': 'disputedReadings'}[kind]] += 1
            reg.observations.append({'id': f'recent/{receipt.stem}/steps/{i}', 'kind': kind,
                'parameter': f"{p['family']}:{p['param']}", 'scope': {'firmware': 13, 'channel': 'A',
                    'raw': point['deviceWord'], 'value': point.get('shown', point.get('fm3Shows')),
                    'finalType': step['words'][slug][9 if slug == 'volpan' else 7],
                    'mode': step['words'][slug][9] if slug == 'in1' else None,
                    'isolatedChange': len(actual) == 1, 'changes': actual,
                    'verification': 'stored snapshot/diff replay; user display reading; not an exported SYX pair',
                    'generatorWord': point.get('generatorWord'), 'generatorWordForAsked': point.get('generatorWordForAsked'),
                    'readingDisputed': kind == 'front-panel-disputed-reading', 'fullRangeProven': False},
                'evidence': reg.ref(receipt, f'/steps/{i}'), 'snapshot': reg.ref(result, f'/steps/{i}')})
            previous = step['words']
    receipt, result = ref/'fm3-label-sweep-20261024.json', ref/'fm3-label-sweep-20261024-results.json'
    doc, raw = reg.read(receipt), reg.read(result)
    require(doc['sweep']['resultsSha256'] == sha(result.read_bytes()), 'Label result hash differs')
    require(raw['finalUnchanged'] and raw['userConfirmedName'] and not raw.get('stoppedAt'), 'Incomplete label sweep')
    for fi, family in enumerate(raw['families']):
        require(family['unchanged'] and not family.get('skipped'), 'Label family incomplete')
        for pi, row in enumerate(family['params']):
            p = by_key[family['family'], row['paramId']]
            require(p['block'] == family['effectId'] and p['name'] == row['name'], 'Label binding differs')
            require(not row['noReply'] and not row.get('stopped') and len(row['texts']) == row['count'] == len(p['enum']), 'Label count differs')
            base = p.get('enumBase', 0)
            compared, extra = [], []
            for word, text in enumerate(row['texts']):
                if word < base:
                    extra.append({'word': word, 'label': text})
                    continue
                expected = p['enum'][word-base]
                require(text.rstrip() == expected.rstrip(), 'Label mismatch')
                exact = text == expected
                stats['exactLabels' if exact else 'trailingSpaceLabels'] += 1
                compared.append({'word': word, 'label': text, 'exact': exact})
            stats['labelParameters'] += 1
            stats['labelsCompared'] += len(compared)
            reg.observations.append({'id': f'recent/labels/{family["family"]}/{p["param"]}', 'kind': 'device-enum-labels',
                'parameter': f"{p['family']}:{p['param']}", 'scope': {'firmware': 13,
                    'labels': compared, 'deviceOnlyWords': extra,
                    'notRequestedWords': list(range(len(row['texts']), len(p['enum'])+base)),
                    'proof': 'label identity only; no scalar range, setter, DSP or stored-value proof'},
                'evidence': reg.ref(result, f'/families/{fi}/params/{pi}')})
    require(stats['labelParameters'] == doc['sweep']['listParams'] and stats['labelsCompared'] == doc['sweep']['entriesCompared'], 'Label totals differ')
    read_receipt, read_result = ref/'fm3-read-value-check-20261023.json', ref/'fm3-value-check-20261023-results.json'
    doc, raw = reg.read(read_receipt), reg.read(read_result)
    require(doc['valueResultsSha256'] == sha(read_result.read_bytes()), 'Value result hash differs')
    require(all(p['allMatch'] and p['gridMatches'] and all(b['matches'] and not b['mismatches'] for b in p['blocks']) for p in raw['presets']), 'Stored-value check failed')
    stats['storedValueReceipt'] = {'presets': len(raw['presets']), 'words': sum(b['values'] for p in raw['presets'] for b in p['blocks']),
        'evidence': reg.ref(read_receipt, '/valueCheck'), 'verification': 'existing collector receipt, not independent scalar scale measurements',
        'storeReloadScope': 'V04 only; does not extend to all seven presets'}
    binding = ref/'fm3-volume-binding-evidence.json'
    reg.read(binding)
    stats['volumeBinding'] = {'evidence': reg.ref(binding), 'scope': 'captured Ext1 default modifier record; no numeric Min/Max codec or pedal/DSP proof'}
    stats['featureEvidence'] = {}
    for name, scope in [
        ('fm3-auto-swell-verify-20261024.json', 'one generated AUTO-SWELL combination and readback'),
        ('fm3-pedal-check-20261024.json', 'reported pedal behavior; no numeric Min/Max codec'),
        ('fm3-grid-check-20261023.json', 'captured grid cases, not arbitrary DSP routing'),
        ('fm3-scene-midi-20261024.json', 'stored scene MIDI fields'),
        ('fm3-scene-midi-listen-20261024.json', 'no messages observed in this listening test; transmission not proven')]:
        path = ref/name
        reg.read(path)
        stats['featureEvidence'][name] = {'evidence': reg.ref(path), 'scope': scope}
    return stats
