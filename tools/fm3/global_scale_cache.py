#!/usr/bin/env python3
"""Check bounded FW13 cache topology against an owner-supplied firmware file.

Research tool, outside the plugin runtime. No MIDI, network or firmware output.
Retains coordinates and hashes, not additional firmware byte excerpts. This is
not a SHARC emulator or proof that no other cache writer exists.
"""
import argparse
import json
from pathlib import Path
import struct
import sys

sys.dont_write_bytecode = True
from pitch_display import unpack, SYX_SHA, LDR_SHA, URL, instruction
from six_field_resolution import require, sha

# SHARC addresses are VISA parcel addresses; ARM addresses are byte addresses.
SPANS = {
    'constructorObject': ('sharc', 0x80f1dc, 0x3e28b8, 4, 'c14613cf230023c0e38ed2f6b7f98f51c429c841b49f3c4b7b11e45ea32d4a89'),
    'constructorBase': ('sharc', 0x80f224, 0x3e2948, 18, '3f8f88ff9f89c51490530df6c482e6298abe7eb4d1e1615f9d787eb82af118c0'),
    'parameterCount': ('sharc', 0x80f23f, 0x3e297e, 8, '3c3a0b2f7a30a95e382f4407ab035896eaaf42890a3cd81398e54a21d295acb6'),
    'numericPointer': ('sharc', 0x80f243, 0x3e2986, 10, 'e014c8a92f2cfb0144c2e0472972d26a4cbe762e0f25cc8d57a4a6149db74d2d'),
    'displayPointer': ('sharc', 0x80f248, 0x3e2990, 10, '172c7340f5e9fafe3a9fd04c7c3be3fa490ad7db9dfb7d338b2b7d21c1b93434'),
    'callbackPointer': ('sharc', 0x80f256, 0x3e29ac, 10, '55879673d7b1a198289217deb95043870f40177da4414f5d26d011b89fc85d90'),
    'sharedNumericPointer': ('arm', 0xc4405526, 0x427e, 28, 'ca8705b2549d74854cdf90cf91f99d3f7c0f7cda6581dbd56ac391dfc1daf33e'),
    'sharedDisplayPointer': ('arm', 0xc4405542, 0x429a, 28, 'cba7380e893824960f29a10c2a0d0f2187cc2827960d6ed38f16d19b7a4e4f9e'),
    'globalGenericGate': ('sharc', 0x80f7c2, 0x3e3484, 28, '3ad0f2553d83e369b838e46118f1279c131408f83f7a061d9d21e4d6bc86c510'),
    'genericCall': ('sharc', 0x810357, 0x3e4bae, 12, 'be086711f822557870bac89631e4fbdd81f73a183cc3bbf5bb3f6aafb9b83eb7'),
    'genericPidArgument': ('sharc', 0x82451c, 0x40cf38, 2, '6e46228fbb8c67c085b68078d06d36c3a6062e9d08fba8f600b281654c6cd772'),
    'genericObjectArgument': ('sharc', 0x824522, 0x40cf44, 4, '88fa0fd5e45a48579a5362474bb2a2aa6645f3b8fc901ae5e3cfa133f9e78d90'),
    'genericNumericStore': ('sharc', 0x8246df, 0x40d2be, 22, '825574730686efc768bbbf5831b493d6d85bb7f1610dc9cc949b9811e6434461'),
    'globalDisplayPointer': ('sharc', 0x80f7dc, 0x3e34b8, 6, 'd013dbe3b86c14fb0d6f55d4f807f58ab368ce40c4dd5ffc9c83ef9813eebced'),
    'globalDisplayOutput': ('sharc', 0x80f9cf, 0x3e389e, 16, 'c319e533f590790b1a76e599f60e25d8c4156fe3e05e847d16193658ced81680'),
    'globalCounter': ('sharc', 0x80f7d7, 0x3e34ae, 6, '19ca0d5d3b740e7c8b969a9f9e9f1052745d5f36af98bd8668160f08cbd48292'),
}


def signed(value, bits):
    return value - (1 << bits) if value & (1 << (bits-1)) else value


def boot_blocks(data):
    rows = []; pos = 0
    while pos < len(data):
        require(pos+16 <= len(data), 'Truncated boot header')
        flags, address, length, argument = struct.unpack_from('<4I', data, pos)
        fill = bool(flags & 0x100)
        rows.append((address, length, pos+16, fill, argument))
        pos += 16 + (0 if fill else length)
    require(pos == len(data), 'Truncated boot payload')
    return rows


def region(rows, address, size):
    matches = [r for r in rows if r[0] <= address and address+size <= r[0]+r[1]]
    require(size > 0 and len(matches) == 1, 'Ambiguous/unmapped boot region')
    return matches[0]


def modify(data):
    require(len(data) == 6, 'Expected Type 19 size')
    v = instruction(data, 0); p = v >> 32
    require(p & 0xff80 == 0x1600, 'Expected unscaled MODIFY with w=0')
    base = 8 if p & 0x40 else 0
    src = p & 7; dest = src ^ ((p >> 3) & 7)
    return dest+base, src+base, signed(v & 0xffffffff, 32)


def immediate(data):
    require(len(data) in (4, 6), 'Expected immediate instruction size')
    v = instruction(data, 0, len(data)//2); p = v >> (8*len(data)-16)
    require(p & 0xff00 == 0x0f00 and bool(p & 0x80) == (len(data) == 4),
            'Expected Type 17 immediate')
    return p & 127, signed(v & 65535, 16) if len(data) == 4 else v & 0xffffffff


def dm7(data):
    require(len(data) == 4, 'Expected Type 15b size')
    p, q = struct.unpack('<HH', data)
    # Figure16-4: both bits15:14 are fixed zero, outside Ureg/data7.
    require(p & 0xf0ff == 0x9008 and not q & 0xc000, 'Expected normal DM Type 15b')
    return bool(p & 0x100), (p >> 9) & 7, (q >> 7) & 127, signed(q & 127, 7)*4


def register_move(data):
    require(len(data) == 4, 'Expected Type 5b size')
    p, q = struct.unpack('<HH', data)
    require(p >> 11 == 14 and (p >> 1) & 31 == 31 and q & 127 == 63,
            'Expected unconditional register move')
    src = ((p >> 8) & 7)*16 + ((p >> 7) & 1)*8 + ((p >> 6) & 1)*4 + (p & 1)*2 + (q >> 15)
    return (q >> 7) & 127, src


def relative_branch(data, address):
    require(len(data) == 6, 'Expected branch size')
    v = instruction(data, 0); p = v >> 32
    require(p & 0xffc1 == 0x0700 and v & 0xff000000 in (0, 1 << 26),
            'Expected direct relative JUMP without ELSE/LA')
    return (p >> 1) & 31, address + signed(v & 0xffffff, 24), bool(v & (1 << 26))


def gate(data):
    """Decode the two range checks; no claim about the whole caller CFG."""
    require(len(data) == 28, 'Expected global gate size')
    r, lower = immediate(data[:4]); r2, upper = immediate(data[16:20])
    require(r == r2 == 2 and instruction(data, 4, 1) == instruction(data, 20, 1) == 0xc3f2,
            'Gate must compare PID R15 against R2')
    lo = relative_branch(data[6:12], 0x80f7c5)
    hi = relative_branch(data[22:28], 0x80f7cd)
    # Delayed LT executes a float truncation to R11 and the upper-bound load.
    # Neither changes R15; the branch uses flags from the preceding COMP.
    cv = instruction(data, 12, 2)
    require(cv >> 16 == 0x018c and cv & 0xffff == 0xdba0, 'Delayed conversion drift')
    require(lo == (1, 0x810355, True) and hi == (18, 0x810355, False), 'Gate branch drift')
    require(lower <= upper, 'Inverted gate range')
    return lower, upper


def bridge(data, object_fields, effect):
    """Execute just the straight-line Thumb pointer-publication fragment."""
    regs = [None]*16; regs[7] = 0x1000
    mem = {0x1004: 0x2000, 0x1008: effect}
    mem.update({0x2000+k: v for k, v in object_fields.items()})
    stores = []; pc = 0
    def get(a):
        require(a in mem, 'Bridge uninitialized read'); return mem[a]
    while pc < len(data):
        require(pc+2 <= len(data), 'Truncated Thumb instruction')
        a = struct.unpack_from('<H', data, pc)[0]; pc += 2
        if a & 0xf800 == 0x6800:
            regs[a & 7] = get(regs[(a >> 3) & 7] + ((a >> 6) & 31)*4)
        elif a & 0xfff0 == 0xf8d0:
            require(pc+2 <= len(data), 'Truncated LDR.W'); b = struct.unpack_from('<H', data, pc)[0]; pc += 2
            regs[b >> 12] = get(regs[a & 15] + (b & 4095))
        elif a & 0xfbf0 in (0xf240, 0xf2c0):
            require(pc+2 <= len(data), 'Truncated MOVW/MOVT'); b = struct.unpack_from('<H', data, pc)[0]; pc += 2
            r = (b >> 8) & 15
            v = (a & 15)*4096 + ((a >> 10) & 1)*2048 + ((b >> 12) & 7)*256 + (b & 255)
            regs[r] = (regs[r] & 65535) | (v << 16) if a & 0xfbf0 == 0xf2c0 else v
        elif a & 0xf800 == 0x2000: regs[(a >> 8) & 7] = a & 255
        elif a & 0xfff0 == 0xfb00:
            require(pc+2 <= len(data), 'Truncated MUL'); b = struct.unpack_from('<H', data, pc)[0]; pc += 2
            require(b & 0xf0f0 == 0xf000, 'Unexpected multiply variant')
            regs[(b >> 8) & 15] = regs[a & 15]*regs[b & 15]
        elif a & 0xff00 == 0x4400:
            r = (a & 7) | ((a >> 4) & 8); regs[r] += regs[(a >> 3) & 15]
        elif a & 0xf800 == 0x3000: regs[(a >> 8) & 7] += a & 255
        elif a & 0xf800 == 0x6000:
            address = regs[(a >> 3) & 7] + ((a >> 6) & 31)*4
            value = regs[a & 7]; require(address >= 0xc1857ac0, 'Unexpected bridge write')
            stores.append((address, value)); mem[address] = value
        else: raise ValueError('Unsupported pointer bridge instruction')
    require(len(stores) == 1, 'Expected one pointer publication')
    return stores[0]


def check(spans):
    require(set(spans) == set(SPANS), 'Cache span set drift')
    for name, (_, _, _, size, digest) in SPANS.items():
        require(len(spans[name]) == size and sha(spans[name]) == digest, 'Cache span changed: '+name)
    require(register_move(spans['constructorObject']) == (0x13,4), 'Constructor object binding drift')
    # Symbolic object base I3=0; no actual firmware object execution implied.
    indexes = {3: 0}; base = spans['constructorBase']
    for pos in range(0, len(base), 6):
        dest, src, delta = modify(base[pos:pos+6]); indexes[dest] = indexes[src]+delta
    require(indexes[5] == 0x1d4, 'Constructor base offset drift')
    fields = {}
    for name in ('parameterCount', 'numericPointer', 'displayPointer', 'callbackPointer'):
        data = spans[name]; reg, value = immediate(data[:-4]); store, index, source, delta = dm7(data[-4:])
        require(store and reg == source == 0x1c and index == 5, 'Constructor store drift')
        fields[indexes[index]+delta] = value
    require(fields == {0x104:14880, 0x158:0xc2008550, 0x160:0xc2016dd0, 0x14c:0x80f751},
            'Global object layout drift')
    numeric = bridge(spans['sharedNumericPointer'], fields, 1)
    display = bridge(spans['sharedDisplayPointer'], fields, 1)
    require(numeric == (0xc1857b14, fields[0x158]) and display == (0xc1857b18, fields[0x160]),
            'Shared pointer mapping drift')
    counter = instruction(spans['globalCounter'], 0)
    require(counter >> 32 == 0x1102 and counter & 0xffffffff == 0xc1857b28,
            'Global counter is not in shared entry 1')
    lower, upper = gate(spans['globalGenericGate'])
    require((lower, upper) == (134,1653), 'Global special-handler range drift')
    require(immediate(spans['genericCall'][:6]) == (12,0x807d65b8), 'Generic descriptor argument drift')
    call = instruction(spans['genericCall'], 6)
    require(call >> 32 == 0x1804 and call & 0xffffffff == 0x8244fb, 'Generic handler call drift')
    require(instruction(spans['genericPidArgument'], 0, 1) == 0xc278, 'Generic PID binding drift')
    require(register_move(spans['genericObjectArgument']) == (0x15,4), 'Generic object binding drift')
    w = spans['genericNumericStore']; load = instruction(w, 0)
    require(load >> 32 == 0xaa14 and load & 0xffffffff == 0x56, 'Generic numeric pointer field drift')
    require(register_move(w[6:10]) == (0x24,7), 'Generic numeric index binding drift')
    require(all(instruction(w,i,1) == 1 for i in range(10,18,2)), 'Generic writer scheduling drift')
    p, q = struct.unpack('<HH', w[18:22])
    require(p >> 13 == 2 and (p >> 9) & 7 == 4 and (p >> 6) & 7 == 4 and
            (p >> 1) & 31 == 31 and not p & 0x1001 and q >> 15 == 1 and
            (q >> 7) & 127 == 5 and q & 127 == 63, 'Expected DM(M4,I4)=R5 normal-word write')
    d = instruction(spans['globalDisplayPointer'], 0)
    require(d >> 32 == 0xaa02 and d & 0xffffffff == 0x58, 'Display pointer is not object+0x160')
    d = spans['globalDisplayOutput']
    require(immediate(d[:6]) == (8,0x80861c08) and instruction(d,6,1) == 0xc24e and
            instruction(d,8,1) == 1 and instruction(d,10) == (0x1804 << 32 | 0x825ebd),
            'Display formatter call drift')
    return fields, (lower, upper)


def build(firmware):
    data = unpack(Path(firmware).read_bytes()); rows = boot_blocks(data); spans = {}
    for name, (arch, address, offset, size, _) in SPANS.items():
        virtual = 0x80a00000+(address-0x800000)*2 if arch == 'sharc' else address
        base, length, start, fill, argument = region(rows, virtual, size)
        require(not fill and start+virtual-base == offset, 'Boot mapping drift: '+name)
        spans[name] = data[offset:offset+size]
    fields, bounds = check(spans)
    count, numeric, display = fields[0x104], fields[0x158], fields[0x160]
    require(numeric+count*4 == display, 'Numeric and display array adjacency drift')
    for address, size in [(numeric,count*4), (display,count*32)]:
        _, _, _, fill, argument = region(rows,address,size)
        require(fill and argument == 0, 'Arrays not covered by zero-fill boot directive')
    scale_pids = range(902,1286)
    require(all(bounds[0] <= p <= bounds[1] for p in scale_pids), 'Scale PID outside bypass range')
    return {
        'schemaVersion':1, 'firmware':'13.0', 'status':'bounded-cache-topology-crosscheck',
        'source':{'url':URL, 'syxSha256':SYX_SHA, 'unpackedSha256':LDR_SHA},
        'spans':{k:{'architecture':a,'address':v,'unpackedOffset':o,'bytesInspected':n,'sha256':h}
                 for k,(a,v,o,n,h) in SPANS.items()},
        'layout':{'objectNumericOffset':0x158,'objectDisplayOffset':0x160,
                  'numericBase':numeric,'numericStride':4,'displayBase':display,'displayStride':32,
                  'parameterCount':count,'globalCallbackParcel':fields[0x14c],
                  'sharedEntry':1,'sharedNumericPointer':0xc1857b14,'sharedDisplayPointer':0xc1857b18},
        'assessment':{'constructorPointersChecked':True,'bootZeroFillDirectiveChecked':True,
                      'armPointerPublicationReplayed':True,'genericGateRange':list(bounds),
                      'scalePidsBypassingThisGenericCall':len(scale_pids),
                      'genericNumericWriterLocated':True,'displayFormatterCallChecked':True,
                      'scaleToNumericCacheProducerTraced':False,'endToEndStaticVerified':False,
                      'nonzeroHardwareVerified':False,'newHardwareRangeValidation':False,
                      'allRuntimeCacheWritersExcluded':False,'deviceIO':False},
        'limits': 'Selected code fragments and boot directives only. I3 is treated as the constructor object base. '
                  'The ARM sharing fragment is replayed with synthetic object/frame memory. '
                  'The bypass claim applies to the identified range gate, not all possible paths or callers. '
                  'Zero-filled initialization is not proof of a permanently zero runtime cache. '
                  'No numeric/text fallback, confidence promotion, device import, audio or CPU validation.',
        'additionalFirmwareBytesRetained':0,
    }


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware',required=True,type=Path)
    ap.add_argument('--output',type=Path,help='Optional hash-only JSON receipt')
    args = ap.parse_args(); result = build(args.firmware)
    if args.output: args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result['assessment'],indent=2))
