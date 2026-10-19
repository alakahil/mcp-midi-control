#!/usr/bin/env python3
"""FW13 Flanger/Phaser/Compressor authoring rules; no editor execution or MIDI."""
import argparse
import copy
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, EDITOR_SHA, CACHE_SHA, cache_records, layout_xml, mine_editor, require, sha
from type_applicability import active
from delay_reverb_applicability import compile_pages, integers

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-modulation-dynamics-applicability.json'
CONFIG = {'FLANGER': {'ui': 'Flanger', 'library': 'flanger', 'section': 17, 'modelPid': 0, 'selectorPid': 0, 'selector': 'FLANGER_TYPE'},
          'PHASER': {'ui': 'Phaser', 'library': 'phaser', 'section': 19, 'modelPid': 0, 'selectorPid': 17, 'selector': 'PHASER_MODE'},
          'COMP': {'ui': 'Compressor', 'library': 'compressor', 'section': 7, 'modelPid': 12, 'selectorPid': 12, 'selector': 'COMP_TYPE'}}
FLANGER_RENAMES = {5: 'FLANGER_MANUAL', 6: 'FLANGER_DRYDELAY', 19: 'FLANGER_LPFREQ', 21: 'FLANGER_HPFREQ'}
WRITABLE_UI = {'knob', 'knobCompact', 'dropdown1', 'dropdown1p5', 'dropdown1LFO', 'dropdown1Tight', 'toggle', 'btnBypass', 'btnIgnoreScene'}
READ_ONLY_UI = {'meterGainVert'}


def native_name(p):
    return FLANGER_RENAMES.get(p['param'], p['name'].removeprefix('OLD_')) if p['family'] == 'FLANGER' else p['name']


def extract(xml, config):
    root = ET.fromstring(xml)  # comments are not controls
    layouts = [n for n in root.find('EffectLayouts') if n.get('name') == config['ui'] and active(n)]
    require(len(layouts) == 1, 'Missing/ambiguous layout')
    layout = layouts[0]
    require(layout.get('parameters') in (None, config['selector']), 'Unknown layout selector')
    variants = []
    for container in layout:
        if not active(container):
            continue
        require(container.tag == 'EffectVariants', 'Unknown variant container')
        for v in container:
            if not active(v):
                continue
            require(v.tag == 'EffectVariant', 'Unknown variant node')
            pages = []
            for index, p in enumerate(v):
                if not active(p):
                    continue
                require(p.tag == 'Page', 'Unknown page node')
                require(p.get('parameterName') in (None, config['selector']), 'Unknown page selector')
                require('value' not in p.attrib or p.get('parameterName'), 'Value without page selector')
                controls = []
                def walk(n, conditions):
                    if not active(n):
                        return
                    require(not any(k in n.attrib for k in ('parameterOffset', 'dynamicParamInfo', 'dynamicParamId')), 'Unsupported dynamic control')
                    require(('controllingParamName' in n.attrib) == ('controllingParamValue' in n.attrib), 'Incomplete control predicate')
                    if n.get('controllingParamName'):
                        conditions = conditions + [{'name': n.get('controllingParamName'), 'values': integers(n.get('controllingParamValue'))}]
                    if n.tag == 'EditorControl':
                        for key in ('parameterName', 'secondaryParameterName'):
                            if n.get(key):
                                require(n.get('type') in WRITABLE_UI | READ_ONLY_UI, 'Unknown parameter control kind')
                                controls.append({'name': n.get(key), 'label': n.get('name', ''), 'conditions': conditions, 'uiType': n.get('type')})
                    for child in n:
                        walk(child, conditions)
                walk(p, [])
                pages.append({'page': int(p.get('pageNum', index)), 'name': p.get('name'),
                    'firmware': {k: p.get(k) for k in ('version_lt', 'version_gtet') if p.get(k)},
                    'types': integers(p.get('value')) if p.get('value') else None,
                    'controls': controls})
            variants.append({'name': v.get('name'), 'types': integers(v.get('value')) if v.get('value') else None,
                'firmware': {k: v.get(k) for k in ('version_lt', 'version_gtet') if v.get(k)}, 'pages': pages})
    return variants


def compile_variants(variants, names, selector, domain, bindings):
    require(bool(variants), 'Missing variants')
    domain = set(domain)
    for v in variants:
        require(v['types'] is None or set(v['types']) <= domain, 'Variant outside selector domain')
    for t in domain:
        require(sum(v['types'] is None or t in v['types'] for v in variants) == 1, 'Missing/overlapping variant coverage')
    cases = {n: [] for n in names}
    for v in variants:
        allowed = domain if v['types'] is None else set(v['types'])
        pages = copy.deepcopy(v['pages'])
        for p in pages:
            require(p['types'] is None or set(p['types']) <= domain, 'Page outside selector domain')
            for c in p['controls']:
                require(c['name'] in names, 'XML symbol missing from native descriptors')
                require(c['uiType'] in WRITABLE_UI | READ_ONLY_UI, 'Unknown parameter control kind')
                for cond in c['conditions']:
                    require(cond['name'] == selector and set(cond['values']) <= domain, 'Unknown control selector domain')
            p['controls'] = [c for c in p['controls'] if c['uiType'] in WRITABLE_UI]
        compiled = compile_pages(pages, names, selector, {selector: sorted(domain)}, bindings)
        for name, rules in compiled.items():
            for r in rules:
                r['types'] = sorted(set(r['types']) & allowed)
                if r['types'] and r not in cases[name]:
                    cases[name].append(r)
    return cases


def template_models(config, cache):
    path = REF / (config['library']+'-library.json')
    lib = json.loads(path.read_text())
    labels = cache[config['section'], config['modelPid']]['labels']
    require(lib['typeParameterId'] == config['modelPid'], 'Template selector address differs')
    models = {}
    for m in lib['models']:
        model = m['words'][config['modelPid']]
        require(model == m['binaryId'] and str(model) not in models and 0 <= model < len(labels), 'Template model binding differs')
        require(m['name'].casefold() == labels[model].casefold(), 'Template/cache label differs')
        models[str(model)] = {'name': labels[model], 'selectorValue': m['words'][config['selectorPid']], 'sourceCapture': m['sourceCapture'], 'syxSha256': m['syxSha256']}
    require(set(map(int, models)) == set(range(len(labels))), 'Incomplete captured model coverage')
    return {'path': path.name, 'sha256': sha(path.read_bytes())}, dict(sorted(models.items(), key=lambda x: int(x[0])))


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong pinned editor')
    xml = layout_xml(data)
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    families = {}
    for family, config in CONFIG.items():
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        rows = mine_editor(data, [(family, config['section'], p['param'], native_name(p)) for p in params], symbol_only=True)
        bindings = {r['name']: r['pid'] for r in rows}
        record = cache[config['section'], config['selectorPid']]
        domain = list(range(int(record['numeric_fields'][0]), int(record['numeric_fields'][1])+1))
        variants = extract(xml, config)
        cases = compile_variants(variants, list(bindings), config['selector'], domain, bindings)
        source, models = template_models(config, cache)
        families[family] = {'modelPid': config['modelPid'], 'selectorPid': config['selectorPid'], 'selector': config['selector'],
            'templateOnlyPids': sorted({config['modelPid'], config['selectorPid']}), 'modelSource': source, 'models': models,
            'selectors': {str(config['selectorPid']): {'name': config['selector'], 'values': domain, 'cache': record}},
            'xmlOnlySelectorValues': [], 'nativeDescriptors': rows, 'variants': variants,
            'parameters': {str(p['param']): {'name': p['name'], 'nativeName': native_name(p), 'cases': cases[native_name(p)]} for p in params}}
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
        'sources': {'editorSha256': EDITOR_SHA, 'cacheSha256': CACHE_SHA, 'layoutSha256': sha(xml), 'dictionarySha256': sha((REF / 'fm3-param-dictionary.json').read_bytes())},
        'policy': 'Use final channel state and complete captured model/selector bindings. Model and Phaser Mode changes require full templates. Compile firmware-active variants, pages and control predicates. Native Flanger names resolve to verified PIDs; preserve exact legacy names and scalar definitions.',
        'limits': 'Bounded XML-derived authoring policy; no native UI or DSP execution. No new device measurements or scale promotion. Automatic compressor timing/makeup, envelope/LFO dynamics and other dependencies are not evaluated. Meters and unused words are not write controls.',
        'families': families}


def verify(result):
    require(result['schemaVersion'] == 1 and result['firmware'] == '13.0' and result['editor'] == '1.07.17', 'Scope drift')
    require(result['sources']['editorSha256'] == EDITOR_SHA and result['sources']['cacheSha256'] == CACHE_SHA, 'Source drift')
    require(result['sources']['dictionarySha256'] == sha((REF / 'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    require(set(result['families']) == set(CONFIG), 'Family drift')
    for family, config in CONFIG.items():
        f = result['families'][family]
        require(all(f[k] == config[k] for k in ('modelPid', 'selectorPid', 'selector')), 'Selector address drift')
        require(f['templateOnlyPids'] == sorted({config['modelPid'], config['selectorPid']}), 'Template gate drift')
        source, models = template_models(config, cache)
        require(f['modelSource'] == source and f['models'] == models, 'Template map drift')
        require(set(f['selectors']) == {str(config['selectorPid'])}, 'Selector coverage drift')
        s = f['selectors'][str(config['selectorPid'])]
        record = cache[config['section'], config['selectorPid']]
        require(s['name'] == config['selector'] and s['cache'] == record and record['typecode'] == 16, 'Selector cache drift')
        require(s['values'] == list(range(len(record['labels']))) and record['numeric_fields'][:2] == [0, len(record['labels'])-1], 'Selector domain drift')
        require(all(m['selectorValue'] in s['values'] for m in models.values()), 'Template selector outside domain')
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        require([(r['pid'], r['name']) for r in f['nativeDescriptors']] == [(p['param'], native_name(p)) for p in params], 'Native binding drift')
        bindings = {r['name']: r['pid'] for r in f['nativeDescriptors']}
        cases = compile_variants(f['variants'], list(bindings), config['selector'], s['values'], bindings)
        require(f['parameters'] == {str(p['param']): {'name': p['name'], 'nativeName': native_name(p), 'cases': cases[native_name(p)]} for p in params}, 'Compiled parameters drift')
        require(all(not f['parameters'][str(p['param'])]['cases'] for p in params if p['kind'] == 'unused'), 'Unused slot became writable')
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    require(not args.write or args.editor, '--write requires pinned editor')
    result = json.loads(json.dumps(build(args.editor))) if args.editor else json.loads(OUT.read_text())
    verify(result)
    content = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
    if args.write:
        OUT.write_text(content)
    else:
        require(content == OUT.read_text(), 'Modulation/dynamics policy stale')
    print(json.dumps({'families': {n: {'models': len(f['models']), 'parameters': len(f['parameters']), 'selectorPid': f['selectorPid']} for n, f in result['families'].items()}, 'editorReplayed': bool(args.editor), 'deviceIO': False}))
