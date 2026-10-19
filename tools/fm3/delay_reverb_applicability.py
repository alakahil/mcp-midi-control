#!/usr/bin/env python3
"""Bounded Delay/Reverb authoring rules from FM3 metadata and captured templates."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, EDITOR_SHA, CACHE_SHA, cache_records, layout_xml, mine_editor, require, sha
from type_applicability import active

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-delay-reverb-applicability.json'
CONFIG = {'DELAY': {'ui': 'Delay', 'section': 13, 'modelPid': 6, 'selectorPid': 7, 'selector': 'DELAY_TYPE', 'domains': {'DELAY_TYPE': list(range(8))}},
          'REVERB': {'ui': 'Reverb', 'section': 12, 'modelPid': 0, 'selectorPid': 45, 'selector': 'REVERB_BASETYPE', 'domains': {'REVERB_BASETYPE': list(range(9)), 'REVERB_SPRINGTYPE': [0, 1]}}}


def integers(text):
    require(bool(re.fullmatch(r'\d+(,\d+)*', text)), 'Unsupported selector predicate')
    result = [int(x) for x in text.split(',')]
    require(len(result) == len(set(result)), 'Duplicate selector values')
    return sorted(result)


def compile_pages(pages, names, selector, domains, bindings):
    """Explicit alternatives take precedence over page-local fallbacks.

    An unqualified page sharing a pageNum is a fallback too (Delay Sweep/Stack).
    This is an XML-derived authoring policy, not execution of native UI logic.
    """
    grouped = defaultdict(list)
    for page in pages:
        grouped[page['page']].append(page)
    cases = {name: [] for name in names}
    domain = set(domains[selector])
    for group in grouped.values():
        claimed = set().union(*(set(p['types']) for p in group if p['types'] is not None))
        for page in group:
            page['effectiveTypes'] = sorted(domain - claimed if page['types'] is None else domain & set(page['types']))
        for t in domain:
            matches = [p for p in group if t in p['effectiveTypes']]
            require(len(matches) <= 1, 'Ambiguous page overlap')
        for page in group:
            for c in page['controls']:
                require(c['name'] in names, 'XML symbol missing from native descriptors')
                when = {}
                types = set(page['effectiveTypes'])
                for predicate in c['conditions']:
                    n, values = predicate['name'], predicate['values']
                    require(n in domains and set(values) <= set(domains[n]), 'Unknown control selector domain')
                    if n == selector:
                        types &= set(values)
                    else:
                        key = str(bindings[n])
                        when[key] = sorted(set(when.get(key, values)) & set(values))
                rule = {'types': sorted(types), 'when': when, 'label': c['label']}
                if types and all(when.values()) and rule not in cases[c['name']]:
                    cases[c['name']].append(rule)
    return cases


def extract(xml, config):
    root = ET.fromstring(xml)
    layouts = [n for n in root.find('EffectLayouts') if n.get('name') == config['ui'] and active(n)]
    require(len(layouts) == 1, 'Missing/ambiguous effect layout')
    variants = [v for v in layouts[0].iter('EffectVariant') if active(v)]
    require(len(variants) == 1 and not variants[0].get('value'), 'Unsupported effect variant')
    pages = []
    for p in variants[0].findall('Page'):
        if not active(p):
            continue
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
                        controls.append({'name': n.get(key), 'label': n.get('name', ''), 'conditions': conditions})
            for child in n:
                walk(child, conditions)
        walk(p, [])
        pages.append({'page': int(p.get('pageNum')), 'name': p.get('name'),
            'firmware': {k: p.get(k) for k in ('version_lt', 'version_gtet') if p.get(k)},
            'types': integers(p.get('value')) if p.get('value') else None,
            'fallbackSource': 'empty-value' if p.get('parameterName') and p.get('value') == '' else 'unqualified' if not p.get('parameterName') else None,
            'controls': controls})
    return pages


def template_models(family, config, cache):
    path = REF / (family.lower()+'-library.json')
    lib = json.loads(path.read_text())
    labels = cache[config['section'], config['modelPid']]['labels']
    result = {}
    for m in lib['models']:
        model, selector = m['words'][config['modelPid']], m['words'][config['selectorPid']]
        require(model == m['binaryId'] and str(model) not in result and 0 <= model < len(labels), 'Template model binding differs')
        require(m['name'].casefold() == labels[model].casefold(), 'Template/cache label differs')
        require(selector in config['domains'][config['selector']], 'Template selector outside FW13 domain')
        result[str(model)] = {'name': labels[model], 'selectorValue': selector, 'sourceCapture': m['sourceCapture'], 'syxSha256': m['syxSha256']}
    require(set(map(int, result)) == set(range(len(labels))), 'Incomplete model templates')
    return {'path': path.name, 'sha256': sha(path.read_bytes())}, dict(sorted(result.items(), key=lambda x: int(x[0])))


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong FM3 editor')
    xml = layout_xml(data)
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    descriptors = mine_editor(data, [(f, c['section'], c['modelPid'], f+('_MODEL' if f == 'DELAY' else '_TYPE')) for f, c in CONFIG.items()], include_rows=True)
    families = {}
    for (family, config), descriptor in zip(CONFIG.items(), descriptors):
        bindings = {n: pid for pid, n in descriptor['bindings']}
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        native = dict(descriptor['bindings'])
        require(set(native) == {p['param'] for p in params}, 'Native PID coverage differs')
        require(all(p['name'] == native[p['param']] or (family == 'DELAY' and p['param'] == 88 and p['name'] is None and p['kind'] == 'unused') for p in params), 'Native dictionary binding differs')
        pages = extract(xml, config)
        cases = compile_pages(pages, list(bindings), config['selector'], config['domains'], bindings)
        source, models = template_models(family, config, cache)
        selectors = {str(bindings[n]): {'name': n, 'values': values, 'cache': cache[config['section'], bindings[n]]} for n, values in config['domains'].items()}
        families[family] = {'modelPid': config['modelPid'], 'selectorPid': config['selectorPid'], 'selector': config['selector'],
            'templateOnlyPids': [config['modelPid'], config['selectorPid']], 'modelSource': source, 'models': models, 'selectors': selectors,
            'xmlOnlySelectorValues': sorted(set().union(*(set(p['types'] or []) for p in pages)) - set(config['domains'][config['selector']])),
            'descriptor': descriptor, 'pages': pages,
            'parameters': {str(p['param']): {'name': p['name'], 'nativeName': native[p['param']], 'cases': cases[native[p['param']]]} for p in params}}
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
        'sources': {'editorSha256': EDITOR_SHA, 'cacheSha256': CACHE_SHA, 'layoutSha256': sha(xml), 'dictionarySha256': sha((REF / 'fm3-param-dictionary.json').read_bytes())},
        'policy': 'Read final channel model and internal selector separately. Require their captured-template binding. Model/internal selector changes use full templates, never scalar writes. Explicit page alternatives override empty or unqualified fallbacks within the same pageNum. Control predicates intersect page visibility.',
        'limits': 'Bounded XML-derived authoring policy; native UI and DSP not executed. Internal enum without labels is read as a raw selector, never as a continuous scalar. Reverb XML IDs 9/10 are outside the FW13 cache and are not supported. Template defaults do not prove every value. Other families and additional dependencies remain separate.',
        'families': families}


def verify(result):
    require(result['schemaVersion'] == 1 and result['firmware'] == '13.0', 'Scope drift')
    require(result['sources']['editorSha256'] == EDITOR_SHA and result['sources']['cacheSha256'] == CACHE_SHA, 'Source drift')
    require(result['sources']['dictionarySha256'] == sha((REF / 'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    require(set(result['families']) == set(CONFIG), 'Family drift')
    for family, config in CONFIG.items():
        f = result['families'][family]
        require(f['modelPid'] == config['modelPid'] and f['selectorPid'] == config['selectorPid'] and f['templateOnlyPids'] == [config['modelPid'], config['selectorPid']], 'Selector drift')
        source, models = template_models(family, config, cache)
        require(f['modelSource'] == source and f['models'] == models, 'Template map drift')
        bindings = {n: pid for pid, n in f['descriptor']['bindings']}
        require(set(f['selectors']) == {str(bindings[n]) for n in config['domains']}, 'Missing selector domain')
        require(set(f['parameters']) == {str(p['param']) for p in dictionary if p['family'] == family}, 'Parameter coverage drift')
        for pid, selector in f['selectors'].items():
            require(selector['values'] == config['domains'][selector['name']] and bindings[selector['name']] == int(pid), 'Selector domain drift')
            record = cache[config['section'], int(pid)]
            require(record == selector['cache'] and record['typecode'] == 16, 'Selector cache drift')
            require(selector['values'] == list(range(int(record['numeric_fields'][0]), int(record['numeric_fields'][1])+1)), 'Selector cache range differs')
        cases = compile_pages(f['pages'], list(bindings), config['selector'], config['domains'], bindings)
        require(f['xmlOnlySelectorValues'] == sorted(set().union(*(set(p['types'] or []) for p in f['pages'])) - set(config['domains'][config['selector']])), 'XML-only selector drift')
        for p in (p for p in dictionary if p['family'] == family):
            r = f['parameters'][str(p['param'])]
            require(r['nativeName'] == (p['name'] or 'DELAY_DRYDIFFUSE'), 'Native symbol drift')
            require(r['name'] == p['name'] and bindings[r['nativeName']] == p['param'] and r['cases'] == cases[r['nativeName']], 'Compiled binding/cases drift')
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
        require(content == OUT.read_text(), 'Delay/Reverb policy stale')
    print(json.dumps({'families': {n: {'models': len(f['models']), 'parameters': len(f['parameters']), 'selectorValues': f['selectors'][str(f['selectorPid'])]['values'], 'xmlOnlySelectorValues': f['xmlOnlySelectorValues']} for n, f in result['families'].items()}, 'editorReplayed': bool(args.editor), 'deviceIO': False}))
