#!/usr/bin/env python3
"""Read-only decoder for the observed FM3-Edit FW 13.0 cache layout.

The layout is inferred from this file and validated against the pinned FM3
catalog. Unknown header fields, tail flags and auxiliary tables stay raw.
This tool does not encode presets, open MIDI ports or authorize new writes.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct


class Reader:
    def __init__(self, data):
        self.data, self.pos = data, 0

    def take(self, n):
        if n < 0 or self.pos + n > len(self.data):
            raise ValueError('Truncated record at byte %d' % self.pos)
        result = self.data[self.pos:self.pos + n]
        self.pos += n
        return result

    def read(self, fmt):
        return struct.unpack(fmt, self.take(struct.calcsize(fmt)))

    def count(self, maximum):
        value, = self.read('<I')
        if value > maximum:
            raise ValueError('Unreasonable count %d at %d' % (value, self.pos - 4))
        return value


def decode(data):
    r = Reader(data)
    header = r.take(42)
    if struct.unpack_from('<II', header) != (13, 0):
        raise ValueError('Only the observed 13.0 header is supported')
    sections = []
    for _ in range(r.count(256)):
        offset = r.pos
        tag, = r.read('<I')
        records = []
        for _ in range(r.count(4096)):
            start = r.pos
            pid, typecode = r.read('<HI')
            fields_bytes = r.take(16)
            fields = struct.unpack('<4f', fields_bytes)
            if not all(math.isfinite(v) for v in fields):
                raise ValueError('Non-finite field at %d' % start)
            labels = []
            for _ in range(r.count(16384)):
                labels.append(r.take(r.count(1048576)).decode('utf-8'))
            tail_flags, = r.read('<H')
            auxiliary = [r.read('<I')[0] for _ in range(r.count(65536))]
            records.append(dict(offset=start, end_offset=r.pos, param_id=pid,
                                typecode=typecode, numeric_fields=list(fields),
                                numeric_fields_hex=fields_bytes.hex(), labels=labels,
                                tail_flags_raw=tail_flags, auxiliary_u32_raw=auxiliary))
        if len({p['param_id'] for p in records}) != len(records):
            raise ValueError('Duplicate parameter identifier in section %d' % tag)
        sections.append(dict(offset=offset, end_offset=r.pos, section_tag=tag,
                             records=records))
    if r.pos != len(data):
        raise ValueError('Unparsed trailing bytes: %d' % (len(data) - r.pos))
    if len({s['section_tag'] for s in sections}) != len(sections):
        raise ValueError('Duplicate section tag')
    result = dict(schema_version=1, source_sha256=hashlib.sha256(data).hexdigest(),
                  source_bytes=len(data), parsed_bytes=r.pos, header_raw_hex=header.hex(),
                  firmware_header=[13, 0], sections=sections)
    if encode_for_roundtrip(result) != data:
        raise ValueError('Lossless structural roundtrip failed')
    result['validation'] = dict(all_bytes_consumed=True, byte_roundtrip_equal=True,
                                section_count=len(sections),
                                record_count=sum(len(s['records']) for s in sections))
    return result


def encode_for_roundtrip(decoded):
    """Diagnostic reconstruction of the cache, never a device/preset writer."""
    out = bytearray.fromhex(decoded['header_raw_hex'])
    out += struct.pack('<I', len(decoded['sections']))
    for section in decoded['sections']:
        out += struct.pack('<II', section['section_tag'], len(section['records']))
        for p in section['records']:
            out += struct.pack('<HI', p['param_id'], p['typecode'])
            # Serialize parsed values, not the original raw bytes, for this check.
            out += struct.pack('<4f', *p['numeric_fields'])
            out += struct.pack('<I', len(p['labels']))
            for label in p['labels']:
                raw = label.encode('utf-8')
                out += struct.pack('<I', len(raw)) + raw
            out += struct.pack('<HI', p['tail_flags_raw'], len(p['auxiliary_u32_raw']))
            for value in p['auxiliary_u32_raw']:
                out += struct.pack('<I', value)
    return bytes(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('cache', type=Path)
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    result = decode(args.cache.read_bytes())
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result['validation']))


if __name__ == '__main__':
    main()
