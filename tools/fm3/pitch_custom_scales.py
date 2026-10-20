#!/usr/bin/env python3
"""Bounded FW13 custom-note and global-scale evidence; never opens a device."""
import argparse
import json
import struct
from pathlib import Path
from six_field_resolution import ENGINE, EDITOR_SHA, cache_records, mine_editor, require, sha
from pitch_display import unpack, instruction, SYX_SHA, LDR_SHA, URL

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-pitch-custom-scales.json'
# Code spans are bounded by traced function/branch entries, not guessed scans.
CODE = {'noteDispatch': (0x81a2a5, 0x1c), 'noteBounds': (0x81987b, 0x57),
        'laterBounds': (0x819933, 0x1f), 'integerWriter': (0x82379e, 0x23),
        'customSource': (0x8192da, 0x15), 'tonic': (0x81a3f7, 0x35),
        'globalAddress': (0x80f989, 0x35), 'globalRead': (0x80f9c7, 0x14)}
SPANS = {k:(0x3c4500+(a-0x800000)*2,n*2) for k,(a,n) in CODE.items()}
SPANS.update({'pidTable':(0x125828,456), 'noteDescriptors':(0x39fbf0,36*8)})


def check_spans(spans):
    b = {k:bytes.fromhex(v) for k,v in spans.items()}
    for k,(_,n) in SPANS.items(): require(len(b[k])==n,'Custom scale span size: '+k)
    table=struct.unpack('<114I',b['pidTable'])
    require(all(table[p]==0x81a2a5 for p in range(64,71)) and table[107]==0x81a3f7,'Custom note/tonic dispatch drift')
    def at(key,pc,expected):
        o=(pc-CODE[key][0])*2
        require(b[key][o:o+len(bytes.fromhex(expected))].hex()==expected,'Firmware operation drift: '+key+'/'+hex(pc))
    # R12=PID-63 is the zero-based degree index (Note 2 => 1).
    at('noteDispatch',0x81a2ab,'820fc1ff')
    at('noteDispatch',0x81a2ad,'fe5f8080b21c')
    at('noteDispatch',0x81a2b1,'041881006298')
    # Upper bound min(12 - noteCount + degreeIndex, 12), lower previous+1.
    for pc,h in [(0x81987b,'bf6c82bfc01f'),(0x819881,'bf6c02e9f0a2'),
                 (0x819899,'1b1600003401'),(0x81989e,'850f0c00'),
                 (0x8198a0,'01a000009204'),(0x8198a3,'3f6000a05121'),
                 (0x8198ab,'3e608054f112'),(0x8198ae,'3b160000ac14'),
                 (0x8198b1,'fe488606251a'),(0x8198b4,'8b0f3f00'),
                 (0x8198b6,'fe5f0085fb1b'),(0x8198b9,'bf0400210010'),
                 (0x8198bc,'be4d0207d09d'),(0x8198c2,'fe5f0087bb12'),
                 (0x8198cb,'041882008537')]: at('noteBounds',pc,h)
    for pc,h in [(0x819933,'7e550201d014'),(0x819936,'bf0400f85222'),
                 (0x819939,'be5b80002712'),(0x81993c,'7e7206862519'),
                 (0x81993f,'fe5f8284109f'),(0x81994b,'041882008537')]: at('laterBounds',pc,h)
    # Integer clamp followed by a short-word store to the preset pointer, then
    # a normal-word store to the runtime array. No 0..65534 normalization here.
    for pc,h in [(0x82379e,'7e49bd40'),(0x8237ac,'86014112'),
                 (0x8237b4,'8601f222'),(0x8237b6,'7e493cc1'),
                 (0x8237bf,'60493f81')]: at('integerWriter',pc,h)
    # Scale=17 selects the per-channel custom array; other scales use ROM data.
    at('customSource',0x8192da,'880f1100')
    at('customSource',0x8192dc,'28c3')
    at('customSource',0x8192dd,'200700000900')
    at('customSource',0x8192e0,'1a160000ac14')
    # Tonic is a shared display context, not a normal channel preset word.
    at('tonic',0x81a3fa,'820f0b00')
    at('tonic',0x81a401,'040f9280f021')
    at('tonic',0x81a40e,'24109280f021')
    # All 32*12 global shifts have distinct IDs; selector mutation is unnecessary.
    for pc,h in [(0x80f989,'820f8603'),(0x80f98b,'f2c3'),
                 (0x80f98c,'020700005200'),(0x80f98f,'820f0505'),
                 (0x80f991,'f2c3'),(0x80f992,'240700004c00'),
                 (0x80f995,'820f7afc'),(0x80f997,'880f0c00'),
                 (0x80f999,'8001f214'),(0x80f99c,'041883008632'),
                 (0x80f9a3,'8c0f1800'),(0x80f9a5,'bf0417f80c02'),
                 (0x80f9a8,'830fd817'),(0x80f9ad,'be7000861111'),
                 (0x80f9b0,'80018212'),(0x80f9b2,'80012118')]: at('globalAddress',pc,h)
    at('globalRead',0x80f9c7,'7e473d41')
    at('globalRead',0x80f9c9,'bf040cf820a2')
    _,cache=cache_records()
    require(cache[23,63]['numeric_fields'][:2]==[4,8],'Custom-note count drift')
    for i in range(8):
        row=struct.unpack_from('<9I',b['noteDescriptors'],36*i)
        if i==0: require(row[:2]==(0x137c,16),'Note-count descriptor drift')
        else:
            require(row[:2]==(0,240) and struct.unpack('<f',struct.pack('<I',row[4]))[0]==i,'Dynamic-note descriptor/default drift')
            c=cache[23,63+i]
            require(c['typecode']==240 and c['numeric_fields'][:2]==[i,i+5],'Captured dynamic bounds drift')
    return {'notes':{'pids':list(range(64,71)),'types':[4,5,10,13],'countPid':63,
                     'countMin':4,'countMax':8,'scalePid':9,'customScaleCode':17,
                     'encoding':'unsigned integer semitone offset from tonic, stored directly in uint16',
                     'tonicOffset':0,'min':'previous active offset + 1','max':'12 - count + degreeIndex',
                     'inactive':'Preserve stored slots; reject explicit writes to Note numbers greater than count.',
                     'policy':'Validate the complete final scale; reject rather than reproduce firmware clamping of later notes.'},
            'global':{'effectId':1,'firstPid':902,'lastPid':1285,'scales':32,'notesPerScale':12,
                      'pidFormula':'902 + 12 * (scaleNumber - 1) + noteIndex',
                      'noteOrder':['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab'],
                      'shiftMin':-24,'shiftMax':24,'storageStrideBytes':24,
                      'scope':'Firmware address mapping and editor binding only; live GET response encoding is not newly measured. Global contents are not in preset SYX.'}}


def build(firmware,editor):
    b=unpack(Path(firmware).read_bytes());e=Path(editor).read_bytes()
    require(sha(e)==EDITOR_SHA,'Wrong pinned editor')
    native=mine_editor(e,[('GLOBAL',0,96,'GLOBAL_CUSTOM_SCALE'),('GLOBAL',0,902,'GLOBAL_CUSTOM_SHIFT_BEGIN')],symbol_only=True)
    spans={k:b[o:o+n].hex() for k,(o,n) in SPANS.items()}
    rules=check_spans(spans)
    library=REF/'pitch-library.json';lib=json.loads(library.read_text())
    observed=[m['words'][64:71] for m in lib['models']]
    require(len(observed)==16 and all(v==list(range(1,8)) for v in observed),'Captured note words changed')
    return {'schemaVersion':1,'firmware':'13.0','status':'firmware-context-crosschecked',
            'source':{'url':URL,'syxSha256':SYX_SHA,'unpackedSha256':LDR_SHA,'editorSha256':EDITOR_SHA,'pitchLibrarySha256':sha(library.read_bytes())},
            'scope':'Static FM3 FW13 opcode, descriptor and native-binding cross-check; 112 existing captured words corroborate default storage. No new hardware measurement or firmware execution.',
            'limits':'No global-scale authoring, MIDI SET/LOAD, new device import, audio/CPU, or learned/controller state. Tonic remains editor context. GET plans do not prove live responses.',
            'nativeGlobalBindings':native,'observedDefaultWords':112,
            'spans':{k:{'unpackedOffset':o,'bytes':n,'hex':spans[k]} for k,(o,n) in SPANS.items()},'rules':rules}


def load():
    d=json.loads(OUT.read_text())
    require(d['source']['syxSha256']==SYX_SHA and d['source']['unpackedSha256']==LDR_SHA and d['source']['editorSha256']==EDITOR_SHA,'Custom scale provenance drift')
    require(d['source']['pitchLibrarySha256']==sha((REF/'pitch-library.json').read_bytes()),'Pitch library drift')
    require(set(d['spans'])==set(SPANS),'Custom scale evidence span set drift')
    for k,coord in SPANS.items():require((d['spans'][k]['unpackedOffset'],d['spans'][k]['bytes'])==coord,'Custom scale coordinate drift')
    require(d['rules']==check_spans({k:v['hex'] for k,v in d['spans'].items()}),'Custom scale rules drift')
    require([(r['pid'],r['name']) for r in d['nativeGlobalBindings']]==[(96,'GLOBAL_CUSTOM_SCALE'),(902,'GLOBAL_CUSTOM_SHIFT_BEGIN')],'Global native binding drift')
    return d


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--firmware',type=Path);ap.add_argument('--editor',type=Path);ap.add_argument('--write',action='store_true');a=ap.parse_args()
    if a.firmware:
        require(bool(a.editor),'Pinned editor is required for full replay');d=build(a.firmware,a.editor)
        if a.write:OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
        else:require(d==load(),'Custom scale replay drift')
    else:require(not a.write,'--write requires pinned sources');d=load()
    print(json.dumps({'noteFields':7,'globalAddresses':384,'firmwareReplayed':bool(a.firmware),'deviceIO':False}))
