#!/usr/bin/env python3
"""FW13 Rotary/Pitch visibility and fail-closed metadata conflicts. No device I/O."""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from six_field_resolution import EDITOR_SHA, CACHE_SHA, cache_records, layout_xml, mine_editor, require, sha
from modulation_dynamics_applicability import REF, extract, compile_variants, template_models, WRITABLE_UI
from type_applicability import active
from pitch_word_codecs import load as load_codecs, apply_override

OUT = REF / 'fm3-rotary-pitch-applicability.json'
CONFIG = {'ROTARY': {'ui': 'Rotary', 'section': 18, 'selector': None},
          'PITCH': {'ui': 'Pitch', 'library': 'pitch', 'section': 23, 'modelPid': 0, 'selectorPid': 0, 'selector': 'PITCH_TYPE'}}
UI = WRITABLE_UI | {'dropdown1TightXtra', 'dropdownCompact', 'dropdownMini', 'toggleCompact', 'btnKillDry'}
DYNAMIC = {f'PITCH_NOTE{i}' for i in range(2, 9)}


def prepare_xml(xml):
    """Keep exact records of known unsupported dynamic notes; reject any other dynamic shape."""
    root = ET.fromstring(xml)
    layouts = [n for n in root.find('EffectLayouts') if n.get('name') == 'Pitch' and active(n)]
    require(len(layouts) == 1, 'Missing/ambiguous Pitch layout')
    excluded = []
    def walk(n, variant=None):
        if not active(n):
            return
        if n.tag == 'EffectVariant':
            variant = n.get('value')
        for child in list(n):
            if not active(child):
                continue
            if 'dynamicParamInfo' in child.attrib:
                require(child.tag == 'EditorControl' and child.get('parameterName') in DYNAMIC and child.get('dynamicParamInfo') == 'true'
                        and child.get('type') == 'dropdownMini' and not any(k in child.attrib for k in ['dynamicParamId', 'parameterOffset', 'secondaryParameterName', 'controllingParamName']), 'Unknown dynamic Pitch control')
                excluded.append({'variant': variant, 'attributes': dict(child.attrib)})
                n.remove(child)
            else:
                walk(child, variant)
    walk(layouts[0])
    verify_dynamic(excluded)
    return ET.tostring(root), excluded


def verify_dynamic(excluded):
    pairs = [(x['variant'], x['attributes']['parameterName']) for x in excluded]
    require(len(pairs) == 28 and set(pairs) == {(v, n) for v in ['4', '5', '10', '13'] for n in DYNAMIC}, 'Dynamic note coverage drift')
    for x in excluded:
        a = x['attributes']
        require(a.get('dynamicParamInfo') == 'true' and a.get('type') == 'dropdownMini'
                and set(a) == {'name', 'parameterName', 'dynamicParamInfo', 'type', 'positionExact'}, 'Dynamic note shape drift')


def block_reason(p, cache):
    if p['family']=='PITCH' and p['param'] in {15,16,17,18,35,63,71,72,73,74,76,*range(77,93)}:
        effective=apply_override(p, load_codecs())
        require(effective['kind'] in ['integer','enum'] and cache['typecode']==16, 'Pitch codec class drift')
        return None
    if p['kind'] == 'unused':
        return 'unused or fixed editor-only slot; no scalar authoring'
    if p['name'] in DYNAMIC:
        require(p['kind'] == 'class-f' and cache['typecode'] == 240, 'Dynamic descriptor drift')
        return 'dynamic note selector; context-dependent wire mapping unverified'
    if cache['typecode'] == 16:
        if p['kind'] != 'enum':
            return 'FW13 discrete field conflicts with normalized scalar dictionary; wire mapping unresolved'
        if cache['numeric_fields'][0] != 0 or cache['labels'] != p['enum']:
            return 'FW13 enum base/labels conflict with zero-based dictionary; wire mapping unresolved'
    return None


def compile_family(family, variants, params, cache, rows):
    config = CONFIG[family]
    bindings = {r['name']: r['pid'] for r in rows}
    # Rotary's synthetic domain is only a compiler coordinate; no word is read as TYPE.
    domain = list(range(16)) if family == 'PITCH' else [0]
    cases = compile_variants(variants, list(bindings), config['selector'], domain, bindings, UI)
    out = {}
    for p in params:
        record = cache[config['section'], p['param']]
        blocked = block_reason(p, record)
        out[str(p['param'])] = {'name': p['name'], 'cache': record, 'xmlCases': cases[p['name']],
                              'cases': [] if blocked else cases[p['name']], 'blockedReason': blocked,
                              'metadataConflict': bool(record['typecode'] == 16 and blocked)}
    return out


def rotary_source():
    path = REF / 'rotary-controls.json'
    data = json.loads(path.read_text())
    require(data['hasTypeSelector'] is False and data['channelWords'] == 21 and data['effectId'] == 86, 'Rotary source drift')
    return {'path': path.name, 'sha256': sha(path.read_bytes()), 'hasTypeSelector': False, 'channelWords': 21}


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong pinned editor')
    xml = layout_xml(data)
    prepared, excluded = prepare_xml(xml)
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    families = {}
    for family, config in CONFIG.items():
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        rows = mine_editor(data, [(family, config['section'], p['param'], p['name']) for p in params], symbol_only=True)
        variants = extract(prepared, config, UI)
        f = {'hasTypeSelector': family == 'PITCH', 'nativeDescriptors': rows, 'variants': variants,
             'parameters': compile_family(family, variants, params, cache, rows)}
        if family == 'PITCH':
            source, models = template_models(config, cache)
            f.update({'modelPid': 0, 'selectorPid': 0, 'selector': 'PITCH_TYPE', 'templateOnlyPids': [0],
                      'models': models, 'modelSource': source, 'selectors': {'0': {'name': 'PITCH_TYPE', 'values': list(range(16)), 'cache': cache[23, 0]}},
                      'excludedDynamicControls': excluded})
        else:
            f.update({'modelPid': None, 'selectorPid': None, 'selector': None, 'templateOnlyPids': [], 'models': {}, 'selectors': {}, 'modelSource': rotary_source()})
        families[family] = f
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
            'sources': {'editorSha256': EDITOR_SHA, 'cacheSha256': CACHE_SHA, 'layoutSha256': sha(xml), 'dictionarySha256': sha((REF/'fm3-param-dictionary.json').read_bytes())},
            'policy': 'Pitch TYPE requires full templates; final-channel FW13 variants govern controls. Rotary has no model selector: PID 0 is Rate. Apply the pinned 27-field preset-word overlay; block dynamic/fixed slots including raw writes. Global scale indices do not include global scale contents.',
            'limits': 'Metadata-derived authoring gates, not native UI/DSP or hardware execution. Global scale contents, dynamic note meanings, arpeggiator playback semantics and Learn/controller dynamics remain unverified. Signed/count/enum storage uses the separately cross-checked 27-field overlay; no live MIDI SET claim. Existing tempo/modifier guards remain required.',
            'families': families}


def verify(result):
    require(result['schemaVersion'] == 1 and result['firmware'] == '13.0' and result['editor'] == '1.07.17', 'Scope drift')
    require(result['sources']['editorSha256'] == EDITOR_SHA and result['sources']['cacheSha256'] == CACHE_SHA, 'Source drift')
    require(result['sources']['dictionarySha256'] == sha((REF/'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    dictionary = json.loads((REF/'fm3-param-dictionary.json').read_text())['params']
    _, cache = cache_records()
    require(set(result['families']) == set(CONFIG), 'Family drift')
    for family, config in CONFIG.items():
        f = result['families'][family]
        require(f['hasTypeSelector'] == (family == 'PITCH'), 'Model selector presence drift')
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p: p['param'])
        require([(r['pid'], r['name']) for r in f['nativeDescriptors']] == [(p['param'], p['name']) for p in params], 'Native binding drift')
        require(f['parameters'] == compile_family(family, f['variants'], params, cache, f['nativeDescriptors']), 'Compiled parameter drift')
        if family == 'PITCH':
            source, models = template_models(config, cache)
            require(f['modelSource'] == source and f['models'] == models, 'Captured model drift')
            require((f['modelPid'], f['selectorPid'], f['selector'], f['templateOnlyPids']) == (0, 0, 'PITCH_TYPE', [0]), 'Pitch selector drift')
            require(f['selectors'] == {'0': {'name': 'PITCH_TYPE', 'values': list(range(16)), 'cache': cache[23, 0]}}, 'Pitch domain drift')
            require(all(m['selectorValue'] == int(i) for i, m in models.items()), 'Pitch model/type mismatch')
            verify_dynamic(f['excludedDynamicControls'])
        else:
            require(f['modelPid'] is None and f['selectorPid'] is None and f['selector'] is None and not f['templateOnlyPids'] and not f['models'] and not f['selectors'], 'Rotary must not have a model selector')
            require(f['modelSource'] == rotary_source(), 'Rotary source drift')
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
    if args.write: OUT.write_text(content)
    else: require(content == OUT.read_text(), 'Rotary/Pitch policy stale')
    print(json.dumps({'families': {n: {'models': len(f['models']), 'parameters': len(f['parameters']), 'metadataConflicts': sum(p['metadataConflict'] for p in f['parameters'].values())} for n, f in result['families'].items()}, 'editorReplayed': bool(args.editor), 'deviceIO': False}))
