#!/usr/bin/env python3
"""Reproduce a narrow FW13 preset-word overlay; never use these words as MIDI SET values."""
import argparse
import json
from pathlib import Path
from six_field_resolution import ENGINE, EDITOR_SHA, CACHE_SHA, cache_records, mine_editor, require, sha

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-pitch-word-codecs.json'
SIGNED = [15,16,17,18,*range(77,93)]
COUNTS = [63,71,72,73,74]
PIDS = sorted(SIGNED + COUNTS + [35,76])
FACTORY_SHA = 'd7286b090cae82e66e053336b83c027ee66ed2818d526495d7511572da9ac1c6'
STATUS = 'preset-word-crosschecked'


def build(editor=None):
    dictionary = json.loads((REF/'fm3-param-dictionary.json').read_text())['params']
    params = {p['param']:p for p in dictionary if p['family']=='PITCH' and p['param'] in PIDS}
    require(sorted(params)==PIDS, 'Pitch codec binding drift')
    _, records = cache_records()
    policy = json.loads((REF/'fm3-rotary-pitch-applicability.json').read_text())
    native = [r for r in policy['families']['PITCH']['nativeDescriptors'] if r['pid'] in PIDS]
    if editor:
        b = Path(editor).read_bytes();require(sha(b)==EDITOR_SHA, 'Wrong pinned editor')
        require(native==mine_editor(b,[('PITCH',23,p,params[p]['name']) for p in PIDS],symbol_only=True), 'Native binding drift')
    fact_bytes = (REF/'fm3-pitch-factory-evidence.json').read_bytes()
    require(sha(fact_bytes)==FACTORY_SHA, 'Factory facts changed; replay pinned upstream files')
    factory = json.loads(fact_bytes)
    lib_path = REF/'pitch-library.json';lib = json.loads(lib_path.read_text())
    fields = []
    for pid in PIDS:
        p,c = params[pid],records[23,pid]
        lo,hi,m,step = c['numeric_fields']
        require(c['typecode']==16 and m==1 and lo==int(lo) and hi==int(hi), 'Unexpected integer metadata')
        require(next(r['name'] for r in native if r['pid']==pid)==p['name'] and p['block']==110, 'Wrong native name/effect')
        if pid in SIGNED:require((lo,hi,step,c['labels'])==(-24,24,1,[]),'Signed range drift')
        if pid in COUNTS:require(step==1 and not c['labels'],'Count descriptor drift')
        effective = {'kind':'enum' if c['labels'] else 'integer','status':STATUS,'min':int(lo),'max':int(hi),'displayMultiplier':1,'step':step,'enum':c['labels'] or None}
        if c['labels']:
            require(lo==1 and len(c['labels'])==hi, 'Nonzero enum range drift')
            effective['enumBase']=1
        else:effective['signedWord']=pid in SIGNED
        if pid in [71,72]:effective['storedDependency']='Zero-based global custom-scale index 0..31; global scale contents are not included or validated by this preset.'
        if pid==63:effective['storedDependency']='Custom note count only; context-dependent NOTE2..NOTE8 mappings remain unverified and preserved.'
        if pid==74:effective['storedDependency']='Stored repeat code 1..31, not a verified displayed repeat count. The Blocks Guide includes INFINITE; its exact code/display mapping is not established here. Do not interpret code 31 as 31 repeats.'
        if 77<=pid<=92:effective['storedDependency']='Stored arpeggiator scale-degree shift; playback also depends on Key, Scale, Num Steps, direction, tempo and controllers.'
        values = sorted({s['channels'][ch]['words'][str(pid)] for s in factory['specimens'] for ch in 'ABCD'} | {x['words'][pid] for x in lib['models']})
        for word in values:
            v=word-65536 if pid in SIGNED and word>=32768 else word
            require(lo<=v<=hi, 'Existing preset word outside FW13 domain')
        fields.append({'pid':pid,'name':p['name'],'effectId':110,'family':'PITCH','cache':c,
                       'native':next(r for r in native if r['pid']==pid),'original':p,'effective':effective,'observedStoredWords':values})
    return {'schemaVersion':1,'firmware':'13.0','scope':'Preset storage only. FW13 cache bounds and labels, FM3 native symbol bindings, existing FW13 templates and older FM3 factory words. Structural/file cross-check, not a new hardware sweep or MIDI SET codec.',
            'sources':{'editorSha256':EDITOR_SHA,'cacheSha256':CACHE_SHA,'dictionarySha256':sha((REF/'fm3-param-dictionary.json').read_bytes()),'factoryEvidenceSha256':FACTORY_SHA,'pitchLibrarySha256':sha(lib_path.read_bytes())},
            'numericEnumInput':'Stored option ID, not zero-based list position. TRACKMODE: NOTES=1, CHORDS=2. TEMPO: first label=1, last=78; NONE is unavailable.',
            'limits':'No dynamic note authoring, global scale contents, device import, audio/CPU or effective controller/tempo evaluation. Same descriptor class is transferred across the explicitly listed 20 signed fields; factory facts are not per-value measurements.',
            'fields':fields}


def load():
    d=json.loads(OUT.read_text());require(d==build(), 'Pitch word overlay stale');return d


def apply_override(p, receipt):
    if p['family']!='PITCH' or p['param'] not in PIDS:return p
    f=next(f for f in receipt['fields'] if f['pid']==p['param'])
    require(p==f['original'], 'Original dictionary definition drift')
    return {**p,**f['effective']}


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--editor',type=Path);ap.add_argument('--write',action='store_true');args=ap.parse_args()
    d=build(args.editor);content=json.dumps(d,ensure_ascii=False,indent=2)+'\n'
    if args.write:OUT.write_text(content)
    else:require(OUT.read_text()==content,'Pitch word overlay stale')
    print(json.dumps({'fields':len(d['fields']),'signed':20,'counts':5,'nonzeroEnums':2,'editorReplayed':bool(args.editor),'deviceIO':False}))
