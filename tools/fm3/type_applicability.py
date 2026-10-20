#!/usr/bin/env python3
"""Compile a bounded FW13 Chorus/Drive write policy from pinned FM3 metadata.

No editor execution, device I/O, or cross-device ID substitution. The receipt
retains only symbols, type sets, firmware predicates, labels and provenance.
"""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, EDITOR_SHA, cache_records, layout_xml, mine_editor, require, sha

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-type-applicability.json'
FAMILIES = [('Chorus', 'CHORUS', 16), ('Drive', 'FUZZ', 25)]
FW = (13, 0)


def version(text):
    require(bool(re.fullmatch(r'\d+(,\d+)?', text)), 'Unsupported firmware predicate')
    parts = [int(v) for v in text.split(',')]
    return tuple((parts + [0])[:2])


def active(node):
    require(not any(k.startswith('version_') and k not in ('version_lt', 'version_gtet') for k in node.attrib), 'Unknown firmware comparator')
    return ('version_lt' not in node.attrib or FW < version(node.get('version_lt'))) and ('version_gtet' not in node.attrib or FW >= version(node.get('version_gtet')))


def values(text, count):
    require(bool(re.fullmatch(r'\d+(,\d+)*', text)), 'Unsupported type predicate')
    result = [int(v) for v in text.split(',')]
    require(len(result) == len(set(result)) and all(0 <= v < count for v in result), 'Invalid/duplicate type IDs')
    return sorted(result)


def compile_pages(pages, names, count, selector):
    """Explicit pages override the empty fallback within one pageNum only.

    This is a conservative authoring policy inferred from the XML alternatives,
    not a claim that native UI selection code or DSP behavior was executed.
    Overlapping explicit pages must expose identical symbols (labels may vary).
    """
    grouped = defaultdict(list)
    for page in pages:
        grouped[page['page']].append(page)
    allowed = {name: set() for name in names}
    allowed[selector] = set(range(count))  # model selector is outside page widgets
    for group in grouped.values():
        claimed = set().union(*(set(p['types']) for p in group if p['types'] is not None))
        for p in group:
            p['effectiveTypes'] = sorted(set(range(count)) - claimed) if p['fallback'] else (p['types'] if p['types'] is not None else list(range(count)))
        for t in range(count):
            matches = [p for p in group if t in p['effectiveTypes']]
            require(len({tuple(sorted(p['controls'])) for p in matches}) <= 1, 'Ambiguous page overlap')
        for page in group:
            for name in page['controls']:
                require(name in names, 'XML symbol missing from native descriptor table: '+name)
                allowed[name].update(page['effectiveTypes'])
    return {name: sorted(types) for name, types in allowed.items()}


def extract(xml, family, ui_name, count, names):
    root = ET.fromstring(xml)  # comments are intentionally not active controls
    containers = [x for x in root.find('EffectLayouts') if x.get('name') == ui_name]
    require(len(containers) == 1, 'Missing/ambiguous family layout')
    variants = [v for v in containers[0].iter('EffectVariant') if active(v)]
    require(len(variants) == 1 and not variants[0].get('value'), 'Unsupported variant selector')
    variant = variants[0]
    pages = []
    for page in variant.findall('Page'):
        if not active(page):
            continue
        selector = page.get('parameterName')
        require(selector in (None, family+'_TYPE'), 'Unsupported page selector')
        require('pageNum' in page.attrib, 'Missing page number')
        controls = defaultdict(set)
        def visit(node):
            if not active(node):
                return
            require(not any(k in node.attrib for k in ('controllingParamName', 'controllingParamValue', 'parameterOffset', 'dynamicParamInfo', 'dynamicParamId')), 'Unsupported dynamic control')
            if node.tag == 'EditorControl':
                for key in ('parameterName', 'secondaryParameterName'):
                    if node.get(key):
                        controls[node.get(key)].add(node.get('name', ''))
            for child in node:
                visit(child)
        visit(page)
        pages.append({'page': int(page.get('pageNum')), 'name': page.get('name'),
            'firmware': {k: page.get(k) for k in ('version_lt', 'version_gtet') if page.get(k)},
            'types': values(page.get('value'), count) if selector and page.get('value') else None,
            'fallback': bool(selector and page.get('value') == ''),
            'controls': {k: sorted(v) for k, v in sorted(controls.items())}})
    rules = compile_pages(pages, names, count, family+'_TYPE')
    return pages, rules


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong FM3 editor')
    xml = layout_xml(data)
    _, cache = cache_records()
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    descriptors = mine_editor(data, [(f, s, 0, f+'_TYPE') for _, f, s in FAMILIES], include_rows=True)
    families = {}
    for (ui, family, section), descriptor in zip(FAMILIES, descriptors):
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        require(descriptor['bindings'] == [(p['param'], p['name']) for p in params], 'Native/dictionary binding differs')
        labels = cache[section, 0]['labels']
        require(params[0]['enum'] == labels, 'Type labels differ from FW13 cache')
        pages, rules = extract(xml, family, ui, len(labels), [p['name'] for p in params])
        families[family] = {'typePid': 0, 'types': labels, 'descriptor': descriptor, 'pages': pages,
            'parameters': {str(p['param']): {'name': p['name'], 'allowedTypes': rules[p['name']]} for p in params}}
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
        'sources': {'editorSha256': EDITOR_SHA, 'layoutSha256': sha(xml), 'dictionarySha256': sha((REF / 'fm3-param-dictionary.json').read_bytes())},
        'policy': 'Explicit page type sets; empty page fallback is the complement within the same pageNum. Firmware predicates filter ancestors and controls; comments excluded. Selector is a separate enum. Restrict explicit writes, preserve hidden stored words.',
        'limits': 'XML-derived conservative authoring policy, not executed native UI or DSP validation. Only Chorus/Drive; no tempo, modifier or other-family applicability checks.',
        'families': families}


def verify(result):
    require(result['schemaVersion'] == 1 and result['firmware'] == '13.0' and result['editor'] == '1.07.17', 'Policy scope drift')
    require(result['sources']['editorSha256'] == EDITOR_SHA, 'Editor drift')
    require(result['sources']['dictionarySha256'] == sha((REF / 'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    require(set(result['families']) == {'CHORUS', 'FUZZ'}, 'Family coverage drift')
    for _, family, section in FAMILIES:
        f = result['families'][family]
        require(f['typePid'] == 0 and f['types'] == cache[section, 0]['labels'], 'Type enum drift')
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        require(f['descriptor']['bindings'] == [[p['param'], p['name']] for p in params], 'Descriptor binding drift')
        rules = compile_pages(f['pages'], [p['name'] for p in params], len(f['types']), family+'_TYPE')
        require(f['parameters'] == {str(p['param']): {'name': p['name'], 'allowedTypes': rules[p['name']]} for p in params}, 'Compiled rules differ from pages')
    return result


def main():
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
        require(content == OUT.read_text(), 'Type policy stale')
    print(json.dumps({'families': {k: {'types': len(v['types']), 'parameters': len(v['parameters']), 'restricted': sum(len(p['allowedTypes']) < len(v['types']) for p in v['parameters'].values())} for k, v in result['families'].items()}, 'editorReplayed': bool(args.editor), 'deviceIO': False}))


if __name__ == '__main__':
    main()
