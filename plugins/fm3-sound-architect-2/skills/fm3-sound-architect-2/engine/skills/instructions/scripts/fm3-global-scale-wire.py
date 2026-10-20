#!/usr/bin/env python3
"""Bounded FW13 numeric serializer evidence. Offline; not a device emulator."""
import hashlib
import json
from pathlib import Path
import struct

REF = Path(__file__).resolve().parent.parent / 'references/fm3-global-scale-wire.json'
SYX_SHA = '239fd73a2a39eb02789632b9f2dc47a88c174f5dd7fd8946b4ce60097a11ee8d'
LDR_SHA = 'a12e2be85f0e7dbb29255e04d0ec86381d4a4ac6cd308d3c5650a187d6d905c3'
# name: (ARM Thumb virtual address, boot-stream offset, bytes, SHA-256)
SPANS = {
    'pack32': (0xc445164e, 0x4fb92, 76, '11ddfd4895cca40e15dd3b8d970774bbf3587b15fa2b1c94f190262517cff4ca'),
    'pack16': (0xc4451600, 0x4fb44, 78, '6acd3526c90c2d4f9f1815af5b919da4e9d32f215e0ed2507b8267d65b7e0075'),
    'serializerFields': (0xc4454b1c, 0x52fb8, 108, '948989212a677625c3b101560faed645c1dbed7ff4ffbfd3f4621dec704db862'),
    'numericCacheRead': (0xc441c886, 0x1b48a, 38, '1147c05b8e578fb47e09facdce601dee6937dc1a8375e0d33e17528046304423'),
    'replyHandoff': (0xc4454a6c, 0x52f08, 20, '2dd0b2770184793bca5985852a318ba3484c2a3f673555ecae90197bbdeaa133'),
    'getDispatch': (0xc441c684, 0x1b288, 4, '10783fcdaaa45274e8583419d0d3a9998a59f8a60fa0c239427f70feb262d608'),
}
ASSESSMENT = {
    'status': 'bounded-firmware-serializer-crosscheck',
    'numericPacking': 'five little-endian septets from an unchanged uint32 word',
    'numericFrameOffset': 12, 'numericFrameBytes': 5,
    'cacheToResponseCopyTraced': True, 'numericSerializerTraced': True,
    'scaleToNumericCacheProducerTraced': False,
    'endToEndStaticVerified': False, 'nonzeroHardwareVerified': False,
    'deviceIO': False, 'newHardwareRangeValidation': False,
    'limits': 'The cached word is copied without conversion. Its producer and freshness for global scale '
              'PIDs 902..1285 are not proved. Float32 inputs in the replay are synthetic assumptions. '
              'The signed-short-to-FLOAT display path does not prove the numeric cache uses that value.',
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def branch_link(raw, address):
    """Decode Thumb-2 BL T1, preserving the signed relative displacement."""
    a, b = struct.unpack('<HH', raw)
    require(a & 0xf800 == 0xf000 and b & 0xd000 == 0xd000, 'Expected Thumb BL')
    s = (a >> 10) & 1
    i1, i2 = 1 ^ ((b >> 13) & 1) ^ s, 1 ^ ((b >> 11) & 1) ^ s
    value = (s << 24) | (i1 << 23) | (i2 << 22) | ((a & 1023) << 12) | ((b & 2047) << 1)
    return (address + 4 + value - (0x2000000 if s else 0)) & 0xffffffff


def load(path=REF):
    d = json.loads(Path(path).read_text())
    require(d['schemaVersion'] == 1 and d['firmware'] == '13.0', 'Unknown wire evidence')
    require(d['source']['syxSha256'] == SYX_SHA and d['source']['unpackedSha256'] == LDR_SHA, 'Firmware provenance drift')
    require(d['assessment'] == ASSESSMENT, 'Wire confidence claim drift')
    require(set(d['spans']) == set(SPANS), 'Wire evidence span set drift')
    for name, (address, offset, size, digest) in SPANS.items():
        row = d['spans'][name]
        require((row['address'], row['unpackedOffset'], row['bytes'], row['sha256']) ==
                (address, offset, size, digest), 'Wire evidence coordinates: ' + name)
        raw = bytes.fromhex(row['hex'])
        require(len(raw) == size and sha(raw) == digest, 'Firmware bytes changed: ' + name)
    fields = bytes.fromhex(d['spans']['serializerFields']['hex'])
    for offset, target in [(14, 0xc4451600), (32, 0xc4451600), (50, 0xc4451600),
                           (68, 0xc445164e), (86, 0xc4451600), (104, 0xc4451600)]:
        require(branch_link(fields[offset:offset+4], 0xc4454b1c+offset) == target,
                'Serializer call target drift')
    require(struct.unpack('<I', bytes.fromhex(d['spans']['getDispatch']['hex']))[0] == 0xc441c84d,
            'GET 0x1a dispatch drift')
    return d


def replay_pack32(code, word):
    """Execute only the 76-byte serializer's small Thumb instruction subset.

    Actual retained instructions drive loads/stores, shifts and branches. No
    firmware scheduling, peripherals, cache producer, or entire device runs.
    Unknown opcodes, uninitialized reads and out-of-bounds writes fail closed.
    """
    require(type(word) is int and 0 <= word <= 0xffffffff, 'Expected uint32')
    require(len(code) == 76, 'Expected one bounded serializer function')
    r = [0] * 16
    r[0], r[1], r[7], r[13], r[14] = 0x2000, word, 0x12345678, 0x1000, 0xdeadbeef
    mem = {}; output_writes = []
    def put(address, value, size):
        require(0xfd0 <= address and address+size <= 0x1000 or
                0x2000 <= address and address+size <= 0x2004 or
                0x3000 <= address and address+size <= 0x3005, 'Replay write outside bounds')
        for i in range(size):
            mem[address+i] = (value >> (8*i)) & 255
        if address >= 0x3000:
            output_writes.append(address)
    def get(address, size):
        require(all(address+i in mem for i in range(size)), 'Replay uninitialized read')
        return sum(mem[address+i] << (8*i) for i in range(size))
    put(0x2000, 0x3000, 4)
    pc = 0; comparison = None
    for _ in range(256):
        require(0 <= pc <= len(code)-2 and pc % 2 == 0, 'Replay PC outside function')
        op = struct.unpack_from('<H', code, pc)[0]; pc += 2
        if op == 0xb480:  # PUSH {r7}
            r[13] -= 4; put(r[13], r[7], 4)
        elif op == 0xb085: r[13] -= 20
        elif op == 0xaf00: r[7] = r[13]
        elif op & 0xf800 in (0x6000, 0x6800, 0x7000):
            address = r[(op >> 3) & 7] + ((op >> 6) & 31) * (1 if op & 0xf800 == 0x7000 else 4)
            if op & 0xf800 == 0x6800: r[op & 7] = get(address, 4)
            else: put(address, r[op & 7], 1 if op & 0xf800 == 0x7000 else 4)
        elif op & 0xf800 == 0x2000: r[(op >> 8) & 7] = op & 255
        elif op & 0xffc0 == 0xb2c0: r[op & 7] = r[(op >> 3) & 7] & 255
        elif op & 0xfe00 == 0x1c00: r[op & 7] = (r[(op >> 3) & 7] + ((op >> 6) & 7)) & 0xffffffff
        elif op == 0xf002:
            require(code[pc:pc+2] == bytes.fromhex('7f02'), 'Unsupported AND immediate')
            r[2] &= 127; pc += 2
        elif op & 0xf800 == 0x0800:
            r[op & 7] = r[(op >> 3) & 7] >> (((op >> 6) & 31) or 32)
        elif op & 0xf800 == 0x3000:
            reg = (op >> 8) & 7; r[reg] = (r[reg] + (op & 255)) & 0xffffffff
        elif op & 0xf800 == 0x2800:
            value = r[(op >> 8) & 7]
            comparison = (value if value < 0x80000000 else value-0x100000000) - (op & 255)
        elif op & 0xff00 == 0xdd00:
            require(comparison is not None, 'BLE without comparison')
            if comparison <= 0:
                delta = op & 255; pc += 2 + 2*(delta if delta < 128 else delta-256)
        elif op & 0xf800 == 0xe000:
            delta = op & 2047; pc += 2 + 2*(delta if delta < 1024 else delta-2048)
        elif op == 0xbf00: pass
        elif op == 0x46bd: r[13] = r[7]
        elif op == 0xf85d:
            require(code[pc:pc+2] == bytes.fromhex('047b'), 'Unsupported stack restore')
            r[7] = get(r[13], 4); r[13] += 4; pc += 2
        elif op == 0x4770:
            require(r[13] == 0x1000 and r[7] == 0x12345678, 'Replay ABI restoration failed')
            require(get(0x2000, 4) == 0x3005 and output_writes == list(range(0x3000, 0x3005)),
                    'Serializer did not write exactly five bytes')
            return bytes(mem[i] for i in output_writes)
        else: raise ValueError(f'Unsupported replay opcode {op:04x}')
    raise ValueError('Replay instruction limit exceeded')


if __name__ == '__main__':
    proof = load()
    print(json.dumps(proof['assessment'], indent=2))
