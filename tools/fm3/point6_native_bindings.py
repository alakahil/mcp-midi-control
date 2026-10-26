#!/usr/bin/env python3
"""Replay Mixer names from pinned Mach-O descriptors; never execute the editor."""
import argparse
import json
from pathlib import Path
import re
import struct
from six_field_resolution import ENGINE, CACHE_SHA, cache_records, require, sha

EDITOR_SHA = '62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a'
OUT = ENGINE / 'skills/instructions/references/fm3-point6-native-bindings.json'
OVERRIDES = {17+i: 'MIXER_DELAY'+str(i+1) for i in range(4)}

def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong ARM64 FM3-Edit 1.07.17 binary')
    require(data[:4] == bytes.fromhex('cffaedfe'), 'Expected Mach-O 64')
    segments, at = [], 32
    for _ in range(struct.unpack_from('<I', data, 16)[0]):
        command, size = struct.unpack_from('<II', data, at)
        require(size >= 8 and at+size <= len(data), 'Bad load command')
        if command == 0x19:
            _, va, _, offset, length = struct.unpack_from('<16sQQQQ', data, at+8)
            if length:
                require(offset+length <= len(data), 'Segment outside binary')
                segments.append((va, offset, length))
        at += size
    rows = []
    for hit in re.finditer(rb'MIXER_[A-Z0-9_]+\x00', data):
        offset, name = hit.start(), hit[0][:-1].decode()
        mapped = [va+offset-start for va, start, length in segments if start <= offset < start+length]
        require(len(mapped) == 1, 'Ambiguous string mapping')
        for ref in re.finditer(re.escape(struct.pack('<Q', mapped[0])), data):
            if ref.start() < 8:
                continue
            pid, pad = struct.unpack_from('<II', data, ref.start()-8)
            if pad == 0 and pid < 128:
                rows.append(dict(pid=pid, name=name, descriptorOffset=ref.start()-8,
                                 nameOffset=offset, nameVirtualAddress=mapped[0],
                                 descriptorHex=data[ref.start()-8:ref.start()+8].hex()))
    rows.sort(key=lambda r:r['pid'])
    _, cache = cache_records()
    for row in rows:
        row['cacheRecord'] = cache.get((28, row['pid']))
    return dict(schemaVersion=1, editor='1.07.17', firmware=13, editorSha256=EDITOR_SHA,
                cacheSha256=CACHE_SHA, rows=rows,
                overrides={str(pid): {'name': name, 'label': 'Delay '+name[-1]} for pid, name in OVERRIDES.items()},
                limits='Descriptor/PID and cache agreement, not device measurement. Native Mixer Delay 5/6 have no FM3 FW13 cache words and remain unavailable.',
                nativeExecution=False, deviceIO=False)

def verify(result):
    require(result['editorSha256'] == EDITOR_SHA and result['cacheSha256'] == CACHE_SHA, 'Native source drift')
    rows=result['rows']; _, cache=cache_records()
    require([r['pid'] for r in rows] == list(range(23)), 'Mixer descriptor coverage drift')
    require(len({r['name'] for r in rows}) == 23, 'Duplicate Mixer name')
    require(all(rows[i]['descriptorOffset'] == rows[0]['descriptorOffset']+16*i for i in range(23)), 'Noncontiguous Mixer table')
    for r in rows:
        require(r['descriptorHex'] == struct.pack('<IIQ',r['pid'],0,r['nameVirtualAddress']).hex(), 'Descriptor bytes drift')
        require(r['nameVirtualAddress'] == 0x100000000+r['nameOffset'], 'Text address drift')
        require(r['cacheRecord'] == cache.get((28,r['pid'])), 'Cache binding drift')
    require(result['overrides'] == {str(p): {'name': n,'label': 'Delay '+n[-1]} for p,n in OVERRIDES.items()}, 'Override drift')
    dictionary=json.loads((ENGINE/'skills/instructions/references/fm3-param-dictionary.json').read_text())['params']
    for p in [p for p in dictionary if p['family']=='MIXER']:
        r=rows[p['param']]
        require(r['name'] == OVERRIDES.get(p['param'],p['name']), 'Existing Mixer symbol differs')
        if p['param'] in OVERRIDES:
            require(p['name'] is None and p['kind']=='linear', 'Override no longer fills an unnamed linear word')
            require(r['cacheRecord']['numeric_fields'] == [p['min'],p['max'],p['displayMultiplier'],p['step']], 'Scalar metadata disagreement')
    return result

if __name__ == '__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--editor',type=Path);ap.add_argument('--write',action='store_true');args=ap.parse_args()
    require(not args.write or args.editor,'--write requires pinned editor')
    result=verify(build(args.editor) if args.editor else json.loads(OUT.read_text()))
    content=json.dumps(result,indent=2)+'\n'
    if args.write:OUT.write_text(content)
    else:require(OUT.read_text()==content,'Native bindings stale')
    print(json.dumps(dict(passed=True,nativeReplay=bool(args.editor),boundParameters=4,excludedNativeOnly=2,deviceIO=False)))
