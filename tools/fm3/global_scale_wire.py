#!/usr/bin/env python3
"""Extract/replay bounded ARM wire evidence from pinned FM3 FW13; no device I/O."""
import argparse
import importlib.util
import json
from pathlib import Path
import struct
import sys
sys.dont_write_bytecode = True
from pitch_display import unpack, URL
from six_field_resolution import ENGINE

SCRIPT = ENGINE / 'skills/instructions/scripts/fm3-global-scale-wire.py'
spec = importlib.util.spec_from_file_location('wire', SCRIPT)
wire = importlib.util.module_from_spec(spec); spec.loader.exec_module(wire)


def build(firmware):
    b = unpack(Path(firmware).read_bytes())
    blocks = []; pos = 0
    while pos < len(b):
        flags, address, length, _ = struct.unpack_from('<4I', b, pos)
        blocks.append((address, length, pos+16, bool(flags & 0x100)))
        pos += 16 + (0 if flags & 0x100 else length)
    spans = {}
    for name, (address, offset, size, digest) in wire.SPANS.items():
        matches = [(data+address-base, length-(address-base)) for base, length, data, fill in blocks
                   if not fill and base <= address < base+length]
        wire.require(len(matches) == 1 and matches[0][0] == offset and matches[0][1] >= size,
                     'Boot virtual-address mapping changed: '+name)
        raw = b[offset:offset+size]
        wire.require(wire.sha(raw) == digest, 'Pinned firmware span changed: '+name)
        spans[name] = {'address': address, 'unpackedOffset': offset, 'bytes': size,
                       'sha256': digest, 'hex': raw.hex()}
    return {'schemaVersion': 1, 'firmware': '13.0',
            'source': {'url': URL, 'syxSha256': wire.SYX_SHA, 'unpackedSha256': wire.LDR_SHA},
            'assessment': wire.ASSESSMENT.copy(), 'spans': spans}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--firmware', type=Path); ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    if args.firmware:
        result = build(args.firmware)
        if args.write: wire.REF.write_text(json.dumps(result, indent=2)+'\n')
        wire.require(result == wire.load(), 'Firmware replay differs from retained evidence')
    else:
        wire.require(not args.write, '--write requires pinned firmware'); wire.load()
    print(json.dumps({'firmwareReplayed': bool(args.firmware), 'boundedFirmwareBytes': sum(row[2] for row in wire.SPANS.values()),
                      'numericSerializerTraced': True, 'endToEndStaticVerified': False,
                      'nonzeroHardwareVerified': False, 'deviceIO': False}))
