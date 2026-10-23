#!/usr/bin/env python3
"""Pin FW13 Input/Volume metadata and editor visibility. No editor execution/MIDI."""
import argparse
import json
from pathlib import Path
from six_field_resolution import ENGINE, EDITOR_SHA, CACHE_SHA, cache_records, layout_xml, mine_editor, require, sha
from modulation_dynamics_applicability import extract, compile_variants, WRITABLE_UI

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-input-volume-evidence.json'
CONFIG = {'INPUT': {'ui': 'Input1/Instr', 'section': 41, 'selector': 'INPUT_MODE', 'selectorPid': 9},
          'VOLUME': {'ui': 'VolPan', 'section': 40, 'selector': 'VOLUME_TYPE', 'selectorPid': 9}}
UI = WRITABLE_UI | {'meterRelHorzNoReadout'}

def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong FM3-Edit 1.07.17 PE binary')
    xml = layout_xml(data)
    require(sha(xml) == '0fc5f3dac1e33aa2fee6d8e1efeda6fc0f6a8782f63519d54aa973cbe67595a2', 'Wrong XML')
    _, cache = cache_records()
    dictionary = json.loads((REF/'fm3-param-dictionary.json').read_text())['params']
    families = {}
    for family, config in CONFIG.items():
        params = sorted((p for p in dictionary if p['family'] == family), key=lambda p:p['param'])
        descriptor = mine_editor(data, [(family, config['section'], 0, params[0]['name'])], include_rows=True)[0]
        require(descriptor['bindings'] == [(p['param'],p['name']) for p in params], 'Descriptor mismatch')
        variants = extract(xml, config, UI)
        # A meter is preserved as evidence, never promoted to a writable control.
        for v in variants:
            for page in v['pages']:
                page['controls'] = [c for c in page['controls'] if c['uiType'] != 'meterRelHorzNoReadout']
        bindings = {p['name']:p['param'] for p in params}
        rules = compile_variants(variants, list(bindings), config['selector'], [0,1], bindings)
        rows = []
        for p in params:
            c = cache[config['section'],p['param']]
            require(c['numeric_fields'] == [p['min'],p['max'],p['displayMultiplier'],p['step']], 'Scale mismatch: '+p['name'])
            if c['labels']: require(c['labels'] == p['enum'], 'Enum mismatch')
            rows.append({'pid':p['param'],'name':p['name'],'kind':p['kind'],'status':p['status'],
                         'numericFields':c['numeric_fields'],'labels':c['labels'],'typecode':c['typecode'],
                         'cacheOffset':c['offset'],'cases':rules[p['name']]})
        families[family] = {'effectId':params[0]['block'],'section':config['section'],
            'selector':config['selector'],'selectorPid':9,'descriptor':descriptor,'variants':variants,'parameters':rows}
    return {'schemaVersion':1,'firmware':'13.0','editor':'1.07.17',
        'sources':{'editorSha256':EDITOR_SHA,'editorArchitecture':'PE x86-64','layoutSha256':sha(xml),
                   'cacheSha256':CACHE_SHA,'dictionarySha256':sha((REF/'fm3-param-dictionary.json').read_bytes())},
        'families':families,'newREAAnalysis':False,'newStaticMetadataAnalysis':True,
        'newHardwareMeasurements':0,'fullRangeEncodingProven':False,
        'limits':'Metadata/visibility is not a new hardware encoding test. Volume donor/current-FW13 import and modifier writes remain unverified. Input bypass is not gate-off. Mode/type are preserved by the bounded numeric writer.'}

def verify(r):
    require(r['sources']['editorSha256']==EDITOR_SHA and r['sources']['cacheSha256']==CACHE_SHA,'Evidence source drift')
    require(r['sources']['dictionarySha256']==sha((REF/'fm3-param-dictionary.json').read_bytes()),'Dictionary drift')
    _,cache=cache_records()
    for family,cfg in CONFIG.items():
        f=r['families'][family]; names={p['name']:p['pid'] for p in f['parameters']}
        rules=compile_variants(f['variants'],list(names),cfg['selector'],[0,1],names)
        require(f['descriptor']['bindings']==[[p['pid'],p['name']] for p in f['parameters']],'Descriptor binding drift')
        for p in f['parameters']:
            c=cache[cfg['section'],p['pid']]
            require(p['cases']==rules[p['name']] and p['numericFields']==c['numeric_fields'] and p['labels']==c['labels'],'Cache/rule mismatch')
    return r

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--editor',type=Path);p.add_argument('--write',action='store_true');a=p.parse_args()
    require(not a.write or a.editor,'--write requires pinned editor')
    r=json.loads(json.dumps(build(a.editor))) if a.editor else json.loads(OUT.read_text())
    verify(r)
    data=json.dumps(r,ensure_ascii=False,indent=2)+'\n'
    if a.write: OUT.write_text(data)
    else: require(data==OUT.read_text(),'Stale receipt')
    print(json.dumps({'verified':True,'families':{k:len(v['parameters']) for k,v in r['families'].items()},'editorReplayed':bool(a.editor),'newREAAnalysis':False,'deviceIO':False}))
