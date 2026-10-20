#!/usr/bin/env python3
"""Replay the bounded FM3 FW13 Pitch display evidence. No MIDI or device I/O."""
import argparse
import functools
import json
import struct
from pathlib import Path
from six_field_resolution import ENGINE, cache_records, require, sha

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-pitch-display-evidence.json'
SYX_SHA = '239fd73a2a39eb02789632b9f2dc47a88c174f5dd7fd8946b4ce60097a11ee8d'
LDR_SHA = 'a12e2be85f0e7dbb29255e04d0ec86381d4a4ac6cd308d3c5650a187d6d905c3'
URL = 'https://www.fractalaudio.com/downloads/firmware-presets/fm3/13p0/fm3_dsp_rel_13p0.zip'
SPANS = {'dispatch': (0x3f80d6, 66), 'scale1': (0x3f8a82, 64),
         'scale2': (0x3f8ac2, 64), 'repeats': (0x3f8b10, 70),
         'table': (0x125828, 456), 'infinite': (0x125814, 9)}


def unpack(data):
    require(sha(data) == SYX_SHA, 'Wrong pinned FM3 FW13 firmware')
    frames = data.split(b'\xf7')
    require(frames.pop() == b'', 'Firmware terminator missing')
    out = bytearray()
    for frame in frames:
        require(frame[:5] == bytes.fromhex('f000017411'), 'Wrong FM3 frame')
        require(functools.reduce(int.__xor__, frame, 0) & 127 == 0, 'Firmware frame checksum')
        require(all(v < 128 for v in frame[1:]), 'Non-MIDI payload')
        if frame[5] != 0x7e: continue
        packed = frame[8:-1]
        require(len(packed) % 5 == 0, 'Firmware word boundary')
        require(frame[6] + (frame[7] << 7) == len(packed)//5, 'Firmware word count')
        for i in range(0, len(packed), 5):
            v = sum(x << (7*j) for j, x in enumerate(packed[i:i+5]))
            require(v <= 0xffffffff, 'Firmware word overflow')
            out.extend(struct.pack('<I', v))
    require(sha(out) == LDR_SHA, 'Firmware unpack drift')
    pos = 0; blocks = []
    while pos < len(out):
        header = out[pos:pos+16]
        require(len(header) == 16 and functools.reduce(int.__xor__, header, 0) == 0, 'Boot header checksum')
        code, address, length, argument = struct.unpack('<4I', header)
        require(code >> 24 in (0xad, 0xac, 0xab), 'Boot core signature')
        blocks.append((pos, address, length))
        pos += 16 + (0 if code & 0x100 else length)
    require(pos == len(out) and len(blocks) == 6405, 'Boot stream coverage')
    require((0x3c44f0, 0x80a00000, 0x70094) in blocks, 'VISA code section moved')
    return bytes(out)


def instruction(data, offset, parcels=3):
    """Little-endian 16-bit parcels, most significant parcel first."""
    v = 0
    for p in struct.unpack_from('<' + 'H'*parcels, data, offset): v = v << 16 | p
    return v


def check_spans(spans):
    """Inspect actual opcode fields, not just a self-generated display table.

    Boundaries were traced from the PID jump table. This is not a general
    SHARC emulator: only the displayed-value computation is certified here.
    """
    b = {k: bytes.fromhex(v) for k, v in spans.items()}
    for key, (_, size) in SPANS.items(): require(len(b[key]) == size, 'Span size: '+key)
    table = struct.unpack('<114I', b['table'])
    require([table[i] for i in (71,72,74)] == [0x81a2c1,0x81a2e1,0x81a308], 'Pitch PID dispatch changed')
    dispatch = b['dispatch']
    require(dispatch[:4].hex() == '820f7200', 'PID dispatch upper bound is not 114')
    require(bytes.fromhex('bf703f91140f2e00ac6b') in dispatch, 'PID index/table address drift')
    offsets = []
    for key in ('scale1','scale2'):
        data = b[key]; load = instruction(data, 0); add = instruction(data, 6)
        require(load >> 32 == 0xa602, 'Scale source is not R2=DM(offset,I3)')
        offsets.append(load & 0xffffffff)
        require(add >> 32 == 0x04bf and add & 0x7fffff == 0x029220, 'Scale formatter no longer computes R2=R2+1')
        require(data[24:30].hex() == '080f2e00546b', 'Scale suffix source drift')
    require(offsets == [0x4e4,0x4e5], 'Scale object field bindings drift')
    data = b['repeats']
    require(instruction(data, 0) == 0xa602000004f7, 'Repeat object field binding drift')
    require(instruction(data, 6, 2) == 0x0f81001e, 'Repeat threshold is not 30')
    require(instruction(data, 10, 1) == 0xc321, 'Repeat compare is not COMP(R2,R1)')
    branch = instruction(data, 12)
    require(branch >> 32 == 0x0724 and branch & (1 << 26), 'Expected IF GT relative jump with delay slots')
    relative = (branch & 0xffffff) - 0x1000000
    require(0x81a30e + relative == 0x819cd6, 'Repeat display exit changed')
    require(instruction(data, 18) == 0x0f08002e6b98, 'Repeat special label pointer drift')
    require(b['infinite'] == b'INFINITE\0', 'Repeat special label drift')
    # The two delayed instructions set the label and R4, before the GT branch.
    # Values <=30 fall through to the ordinary integer-format path.
    require(instruction(data,24,1) == 0xc247, 'Repeat branch delay slot drift')
    require(data[38:44].hex() == '080f2e00546b', 'Finite repeat path suffix drift')
    _, cache = cache_records()
    for pid, bounds, tail in [(71,(0,31),17),(72,(0,31),17),(74,(1,31),16)]:
        c = cache[23,pid]
        require(c['typecode'] == 16 and tuple(c['numeric_fields'][:2]) == bounds and c['tail_flags_raw'] == tail, 'FW13 Pitch metadata drift')
    return {'71': {'kind':'global-scale-label','storedMin':0,'storedMax':31,'displayOffset':1},
            '72': {'kind':'global-scale-label','storedMin':0,'storedMax':31,'displayOffset':1},
            '74': {'kind':'repeat-label','storedMin':1,'storedMax':31,'infiniteCode':31,'infiniteLabel':'INFINITE'}}


def build(firmware):
    data = unpack(Path(firmware).read_bytes())
    spans = {k:data[o:o+n].hex() for k,(o,n) in SPANS.items()}
    fields = check_spans(spans)
    return {'schemaVersion':1,'firmware':'13.0','status':'firmware-display-crosschecked',
            'source':{'url':URL,'syxSha256':SYX_SHA,'unpackedSha256':LDR_SHA,'bootBlocks':6405},
            'scope':'Offline static firmware analysis, cross-checked against FW13 cache and established FM3 Pitch PID bindings. No new device measurements or execution of the firmware.',
            'limits':'Does not validate global custom-scale contents, dynamic notes, generated preset import, audio or CPU. Firmware update/transport is not implemented.',
            'references':{'processor':'https://www.analog.com/media/en/dsp-documentation/processor-manuals/sc58x-2158x-prm.pdf',
                          'decoderCrossCheck':'https://github.com/js216/selache/tree/2b26d3b75c53063575bc5c820fa0d38879335187'},
            'spans':{k:{'unpackedOffset':o,'bytes':n,'hex':spans[k]} for k,(o,n) in SPANS.items()},
            'fields':fields,'numericInput':'Existing numbers retain stored-code semantics. Use SCALE 1..SCALE 32 or INFINITE for unambiguous labels.'}


def load():
    d = json.loads(OUT.read_text())
    require(d['source']['syxSha256'] == SYX_SHA and d['source']['unpackedSha256'] == LDR_SHA, 'Firmware provenance drift')
    require(set(d['spans']) == set(SPANS), 'Evidence span set drift')
    for key,(offset,size) in SPANS.items():
        require((d['spans'][key]['unpackedOffset'],d['spans'][key]['bytes']) == (offset,size), 'Evidence coordinate drift')
    require(d['fields'] == check_spans({k:v['hex'] for k,v in d['spans'].items()}), 'Display rules drift')
    return d


if __name__ == '__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--firmware',type=Path);ap.add_argument('--write',action='store_true');a=ap.parse_args()
    if a.firmware:
        d=build(a.firmware)
        if a.write:OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
        else:require(d==load(),'Firmware replay disagrees with committed receipt')
    else:
        require(not a.write,'--write requires the pinned firmware');d=load()
    print(json.dumps({'fields':list(d['fields']),'firmwareReplayed':bool(a.firmware),'deviceIO':False}))
