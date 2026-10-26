#!/usr/bin/env python3
"""Replay FW13 XML visibility for thirteen point-6 families, without device I/O.

Uses the existing dictionary's symbol/PID bindings and pinned editor cache. This
is a bounded authoring rule, not native UI execution or a scale measurement.
"""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, CACHE_SHA, cache_records, require, sha
from insert_tempo_locks import layouts, LAYOUT_SHA
from type_applicability import active
from delay_reverb_applicability import integers
from modulation_dynamics_applicability import compile_variants, WRITABLE_UI
from point6_native_bindings import OUT as NATIVE_OUT, verify as verify_native

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-insert-applicability.json'
CONFIG = {
    'PLEX': ('PlexDelay', 15, 0, 'PLEX_BASETYPE'),
    'GATE': ('GateExpander', 35, 14, 'GATE_TYPE'),
    'TENTAP': ('TenTapDelay', 38, 0, 'TENTAP_TYPE'),
    'SYNTH': ('Synth', 31, None, None),
    'MULTICOMP': ('MultibandComp', 37, None, None),
    'MIXER': ('Mixer', 28, None, None),
    'MULTIPLEXER': ('Multiplexer', 54, None, None),
    'FORMANT': ('Formant', 21, None, None),
    'MEGATAP': ('MegaTap', 33, None, None),
    'RINGMOD': ('RingMod', 36, None, None),
    'RESONATOR': ('Resonator', 39, 0, 'RESONATOR_MODE'),
    'LOOPER': ('Looper', 50, None, None),
    'MULTITAP': ('MultiDelay', 14, 0, 'MULTITAP_BASETYPE'),
}
WRITABLE = WRITABLE_UI | {'dropdown1TightXtra', 'dropdown1LFO-Off', 'btnKillDry',
    'knobMiniReadout', 'knobMini', 'dropdownMiniReadout', 'dropdownNoLabel',
    'dropdownMini', 'knobSmall', 'dropdownCompact', 'knobMiniReadout2', 'dropdown1Tight1Line'}
EXCLUDED = {'meterGainVert': 'read-only meter', 'meterGainVertNoReadout': 'read-only meter',
            'btnRectangle': 'action-only; no scalar authoring',
            **{k: 'runtime Looper action; no scalar preset authoring' for k in
               ('toggle-looper-record', 'toggle-looper-overdub', 'toggle-looper-play',
                'toggle-looper-once', 'toggle-looper-reverse', 'toggle-looper-undo')}}
UNRESOLVED = {}
DYNAMIC = {'MULTITAP_FBKSEND', 'MULTITAP_FBKRET'}


def extract(xml, config):
    ui, _, _, selector = config
    matches = [n for n in ET.fromstring(xml).find('EffectLayouts') if n.get('name') == ui and active(n)]
    require(len(matches) == 1, 'Missing/ambiguous layout: '+ui)
    layout = matches[0]
    layout_selectors = {'PlexDelay': 'PLEX_BASETYPE,PLEX_PRESETS',
                        'MultiDelay': 'MULTITAP_BASETYPE,MULTITAP_PRESETS', 'Looper': 'LOOPER_DUB'}
    require(layout.get('parameters') in (None, selector, layout_selectors.get(ui)), 'Unknown layout selector')
    variants, excluded = [], []
    for group in layout:
        if not active(group):
            continue
        require(group.tag == 'EffectVariants', 'Unknown variants container')
        for v in group:
            if not active(v):
                continue
            require(v.tag == 'EffectVariant', 'Unknown variant')
            pages = []
            for index, page in enumerate(v):
                if not active(page):
                    continue
                page_selector = 'LOOPER_DUB' if ui == 'Looper' else selector
                require(page.tag == 'Page' and page.get('parameterName') in (None, page_selector), 'Unknown page selector')
                require('value' not in page.attrib or page.get('parameterName'), 'Value without selector')
                controls = []
                def walk(node):
                    if not active(node):
                        return
                    dynamic = node.tag == 'EditorControl' and node.get('parameterName') in DYNAMIC
                    if dynamic:
                        require(node.get('dynamicParamInfo') == 'true' and node.get('type') == 'dropdown1Tight', 'Dynamic control drift')
                        require(not any(k in node.attrib for k in ('parameterOffset', 'dynamicParamId',
                            'controllingParamName', 'controllingParamValue', 'secondaryParameterName')), 'Unknown dynamic selector')
                        row = {'name': node.get('parameterName'), 'uiType': node.get('type'), 'reason': 'dynamic parameter metadata unresolved; no scalar authoring'}
                        if row not in excluded:
                            excluded.append(row)
                        return
                    require(not any(k in node.attrib for k in ('parameterOffset', 'dynamicParamInfo',
                        'dynamicParamId', 'controllingParamName', 'controllingParamValue')), 'Unmodeled dynamic control')
                    if node.tag == 'EditorControl':
                        for key in ('parameterName', 'secondaryParameterName'):
                            name = node.get(key)
                            if not name:
                                continue
                            kind = node.get('type')
                            require(kind in WRITABLE or kind in EXCLUDED, 'Unknown control kind: '+str(kind))
                            require(not node.get('message') or kind in EXCLUDED, 'Runtime message on scalar control')
                            if kind in EXCLUDED or name in UNRESOLVED:
                                row = {'name': name, 'uiType': kind, 'reason': UNRESOLVED.get(name, EXCLUDED.get(kind))}
                                if row not in excluded:
                                    excluded.append(row)
                            else:
                                controls.append({'name': name, 'label': node.get('name', ''), 'conditions': [], 'uiType': kind})
                    for child in node:
                        walk(child)
                walk(page)
                pages.append({'page': int(page.get('pageNum', index)), 'name': page.get('name'),
                    'types': integers(page.get('value')) if page.get('value') else None, 'controls': controls})
            if ui == 'Looper':
                # DUB selects runtime action buttons, not a persistent type. Both
                # branches must expose exactly the same scalar controls before
                # their shared page can be treated as unconditional.
                branches = [p for p in pages if p['types'] is not None]
                require(len(branches) == 2 and [p['types'] for p in branches] == [[0], [1]], 'Looper DUB branches drift')
                require(branches[0]['controls'] == branches[1]['controls'], 'Looper scalar controls depend on runtime DUB')
                pages.remove(branches[1])
                branches[0]['types'] = None
            variants.append({'name': v.get('name'), 'types': integers(v.get('value')) if v.get('value') else None, 'pages': pages})
    return variants, excluded


def compile_family(family, variants, excluded):
    _, section, pid, selector = CONFIG[family]
    params = [p for p in json.loads((REF/'fm3-param-dictionary.json').read_text())['params'] if p['family'] == family]
    overrides = verify_native(json.loads(NATIVE_OUT.read_text()))['overrides'] if family == 'MIXER' else {}
    params = [{**p, **({'dictionaryName': p['name'], **overrides[str(p['param'])]} if str(p['param']) in overrides else {})} for p in params]
    _, cache = cache_records()
    require({p['param'] for p in params} == {p for s, p in cache if s == section}, 'Cache/PID coverage differs')
    bindings = {p['name']: p['param'] for p in params if p['name']}
    require(len(bindings) == sum(bool(p['name']) for p in params), 'Duplicate dictionary symbol')
    labels = None if pid is None else cache[section, pid]['labels']
    if pid is not None:
        p = next(p for p in params if p['param'] == pid)
        require(p['name'] == selector and p['enum'] == labels, 'Selector binding differs')
        require(cache[section, pid]['numeric_fields'][:2] == [0, len(labels)-1], 'Selector range differs')
    domain = [0] if pid is None else list(range(len(labels)))
    cases = compile_variants(variants, list(bindings), selector, domain, bindings, WRITABLE)
    if selector:
        cases[selector] = [{'types': domain, 'when': {}, 'label': 'Type'}]
    excluded_names = {e['name'] for e in excluded}
    require(all(not cases.get(n) for n in excluded_names), 'Excluded control also writable')
    return {'selectorPid': pid, 'selector': selector, 'typeLabels': labels,
        'cacheSection': section, 'variants': variants, 'excludedControls': excluded,
        'parameters': {str(p['param']): {'name': p['name'], **({'dictionaryName': p['dictionaryName'], 'label': p['label']} if 'dictionaryName' in p else {}), 'cases': cases.get(p['name'], []),
            'reason': next((e['reason'] for e in excluded if e['name'] == p['name']),
                           'no active FW13 XML write control' if not cases.get(p['name']) else 'active FW13 XML control')}
            for p in params}}


def build(editor):
    xml, _ = layouts(Path(editor).read_bytes())
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
        'sources': {'layoutSha256': LAYOUT_SHA, 'cacheSha256': CACHE_SHA, 'nativeBindingsSha256': sha(NATIVE_OUT.read_bytes()),
                    'dictionarySha256': sha((REF/'fm3-param-dictionary.json').read_bytes())},
        'policy': 'Check explicit writes against final channel type and firmware-active XML pages. Preserve stored hidden words. Reject meters, action-only controls and absent controls. Keep scalar codec and tempo-lock gates independent.',
        'limits': 'Reuses pinned dictionary bindings plus four Mixer names from pinned ARM64 native descriptors and matching FW13 cache. Scalar kinds, ranges and statuses are unchanged. No native/DSP execution. Plex/MultiDelay preset selection, Looper runtime commands and unresolved MultiDelay dynamic feedback controls are not scalar controls. Looper DUB branches have identical persistent scalar controls. Synth oscillator dependencies and Multiband automatic timing are not inferred. MultiDelay visibility does not enable block insertion or scalar writing. XML visibility is not proof of audibility or hardware range coverage.',
        'families': {f: compile_family(f, *extract(xml, c)) for f, c in CONFIG.items()}}


def verify(result):
    require(result['schemaVersion'] == 1 and result['firmware'] == '13.0' and result['editor'] == '1.07.17', 'Scope drift')
    require(result['sources'] == {'layoutSha256': LAYOUT_SHA, 'cacheSha256': CACHE_SHA, 'nativeBindingsSha256': sha(NATIVE_OUT.read_bytes()),
        'dictionarySha256': sha((REF/'fm3-param-dictionary.json').read_bytes())}, 'Source drift')
    require(set(result['families']) == set(CONFIG), 'Family coverage drift')
    for f, data in result['families'].items():
        require(data == compile_family(f, data['variants'], data['excludedControls']), 'Compiled policy drift: '+f)
    require(sum(len(f['parameters']) for f in result['families'].values()) == 515, 'Parameter coverage drift')
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    require(not args.write or args.editor, '--write requires the pinned editor layout')
    result = verify(build(args.editor) if args.editor else json.loads(OUT.read_text()))
    content = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
    if args.write:
        OUT.write_text(content)
    else:
        require(content == OUT.read_text(), 'Insert applicability policy stale')
    print(json.dumps({'families': list(result['families']), 'parameters': 515, 'editorReplayed': bool(args.editor), 'deviceIO': False}))
