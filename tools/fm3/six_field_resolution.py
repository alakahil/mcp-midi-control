#!/usr/bin/env python3
"""Reproduce six FM3 metadata bindings; never execute the editor or access MIDI."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
import zlib
from fm3_cache import decode

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine'
OUT = ROOT / 'docs/fm3/parameter-evidence/six-field-resolution.json'
ARCHIVE = ENGINE / 'research/FM3_CACHE_AUDIT_20261012.zip'
MEMBER = 'FM3_CACHE_AUDIT_20261012/effectDefinitions_11_13p0.cache'
CACHE_SHA = '7b8463963d03c3ae9bae54ddd7ff5981ee461fb61f54bd7d248a9b2411123ec4'
EDITOR_SHA = 'c06f993530057214205a64330116a823e5b31507610d1792c1f3617725d6e927'
TARGETS = [('CABINET', 11, 93, 'CABINET_DYNACAB_R1'), ('CABINET', 11, 94, 'CABINET_DYNACAB_R2'),
           ('CHORUS', 16, 29, 'CHORUS_DELAYRANGE'), ('CHORUS', 16, 30, 'CHORUS_BASS'),
           ('CHORUS', 16, 31, 'CHORUS_TREBLE'), ('FUZZ', 25, 43, 'FUZZ_OVERSAMPLE')]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def cache_records():
    with zipfile.ZipFile(ARCHIVE) as z:
        data = z.read(MEMBER)
    require(sha(data) == CACHE_SHA, 'Wrong firmware-13 cache')
    parsed = decode(data)
    require(parsed['validation']['byte_roundtrip_equal'], 'Cache roundtrip failed')
    return parsed, {(s['section_tag'], r['param_id']): r for s in parsed['sections'] for r in s['records']}


def mine_editor(data):
    """Read the editor's own PE64 pointers, then contiguous 16-byte descriptors."""
    require(data[:2] == b'MZ', 'Not a PE file')
    pe = struct.unpack_from('<I', data, 60)[0]
    require(data[pe:pe+4] == b'PE\0\0', 'Invalid PE signature')
    count = struct.unpack_from('<H', data, pe+6)[0]
    size = struct.unpack_from('<H', data, pe+20)[0]
    optional = pe+24
    require(struct.unpack_from('<H', data, optional)[0] == 0x20b, 'PE64 required')
    base = struct.unpack_from('<Q', data, optional+24)[0]
    sections = []
    for i in range(count):
        q = optional+size+40*i
        _, rva, length, offset = struct.unpack_from('<IIII', data, q+8)
        require(offset+length <= len(data), 'Section exceeds file')
        sections.append((rva, offset, length))

    def pointer(va):
        matches = [off+va-base-rva for rva, off, length in sections if base+rva <= va < base+rva+length]
        require(len(matches) == 1, 'Pointer outside unique mapped section')
        return matches[0]

    def row_at(offset):
        pid, pad, ptr = struct.unpack_from('<IIQ', data, offset)
        require(pad == 0, 'Descriptor padding differs')
        if pid == 0xffffffff:
            return None
        require(pid < 65536, 'Invalid parameter ID')
        off = pointer(ptr)
        end = data.find(b'\0', off, off+128)
        require(end >= off, 'Unterminated symbol')
        name = data[off:end].decode('ascii')
        require(re.fullmatch(r'[A-Z][A-Z0-9_]+', name), 'Invalid symbol')
        return {'pid': pid, 'name': name, 'descriptorOffset': offset, 'nameOffset': off}

    result = []
    for family, _, pid, symbol in TARGETS:
        rows = []
        for match in re.finditer(re.escape(symbol.encode()+b'\0'), data):
            off = match.start()
            va = next(base+rva+off-start for rva, start, length in sections if start <= off < start+length)
            for ref in re.finditer(re.escape(struct.pack('<Q', va)), data):
                try:
                    row = row_at(ref.start()-8)
                    if row and row['name'] == symbol and row['pid'] == pid:
                        rows.append(row)
                except (ValueError, struct.error, UnicodeError):
                    pass
        require(len(rows) == 1, 'Missing/ambiguous FM3 descriptor: '+symbol)
        row = rows[0]
        start = row['descriptorOffset']
        for _ in range(512):
            try:
                previous = row_at(start-16)
                if previous is None or not previous['name'].startswith(family+'_'):
                    break
                start -= 16
            except (ValueError, struct.error, UnicodeError):
                break
        neighbors = []
        for index in range(512):
            item = row_at(start+16*index)
            if item is None:
                break
            require(item['name'].startswith(family+'_'), 'Mixed family table')
            neighbors.append((item['pid'], item['name']))
        else:
            raise ValueError('Missing descriptor terminator')
        require((pid, symbol) in neighbors and len(set(p for p, _ in neighbors)) == len(neighbors), 'Wrong/duplicate family binding')
        result.append({**row, 'tableOffset': start, 'tableRows': len(neighbors)})
    return result


def layout_xml(data):
    matches = []
    for hit in re.finditer(b'PK\x03\x04', data):
        p = hit.start()
        if p+30 > len(data):
            continue
        method = struct.unpack_from('<H', data, p+8)[0]
        crc, compressed, size = struct.unpack_from('<III', data, p+14)
        n, e = struct.unpack_from('<HH', data, p+26)
        if data[p+30:p+30+n] != b'__block_layout.xml':
            continue
        start = p+30+n+e
        require(method == 8 and compressed > 0 and start+compressed <= len(data), 'Unsupported XML member')
        xml = zlib.decompress(data[start:start+compressed], -15)
        require(len(xml) == size and zlib.crc32(xml) == crc, 'XML CRC/size mismatch')
        matches.append(xml)
    require(len(matches) == 1, 'Missing/ambiguous XML layout')
    return matches[0]


def controls(xml, symbol):
    # XML comments are deliberately excluded from the active tree.
    root = ET.fromstring(xml)
    parents = {child: parent for parent in root.iter() for child in parent}
    active = []
    for node in root.iter('EditorControl'):
        if node.get('parameterName') != symbol:
            continue
        ancestors, p = [], parents.get(node)
        while p is not None:
            if p.tag in ('Page', 'EffectVariant'):
                ancestors.append({'tag': p.tag, **p.attrib})
            p = parents.get(p)
        active.append({'control': dict(node.attrib), 'conditions': ancestors})
    commented = sum(symbol.encode() in c for c in re.findall(b'<!--(.*?)-->', xml, re.S))
    return {'active': active, 'commentedOccurrences': commented}


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Only pinned FM3-Edit 1.07.17 supported')
    descriptors, xml = mine_editor(data), layout_xml(data)
    parsed, records = cache_records()
    fields = []
    for (family, section, pid, symbol), desc in zip(TARGETS, descriptors):
        record = records[section, pid]
        ui = controls(xml, symbol)
        require(bool(ui['active']) == (family != 'FUZZ'), 'Unexpected UI availability')
        fields.append({'parameter': f'{family}:{pid}', 'name': symbol, 'descriptor': desc,
                       'cacheSection': section, 'cacheRecord': record, 'editorUI': ui,
                       'decision': 'blocked-hidden-editor' if family == 'FUZZ' else 'resolved-editor-and-cache'})
    return {'schemaVersion': 1, 'scope': {'device': 'FM3', 'firmware': '13.0', 'editor': '1.07.17',
        'deviceIO': False, 'newHardwareMeasurements': False,
        'method': 'Direct FM3 PE64 descriptor pointers and contiguous family tables; active XML by symbol; pinned user cache with lossless replay. No cross-device ID transfer or positional XML join.'},
        'sources': {'editorUrl': 'https://www.fractalaudio.com/downloads/FM3-Edit/FM3-Edit-Win-v1p07p17.exe',
            'installerSha256': 'f51794035954426e30753677b5b796a7fc3bebb3302366521228d94aeaab9f8f',
            'editorSha256': EDITOR_SHA, 'editorBytes': len(data), 'layoutSha256': sha(xml),
            'cacheArchive': ARCHIVE.relative_to(ROOT).as_posix(), 'archiveSha256': sha(ARCHIVE.read_bytes()),
            'cacheMember': MEMBER, 'cacheSha256': CACHE_SHA},
        'cacheValidation': parsed['validation'], 'fields': fields,
        'cabPosition': {'canonicalDisplayRange': [0, 10], 'unit': 'unitless',
            'legacyRange': [0, 100], 'legacyInterpretation': 'normalized travel percent, not FM3-Edit display units',
            'conversion': 'display = percent / 10; wire = round(display / 10 * 65534)',
            'historicalClaimReplayed': False,
            'note': 'Cache numeric field 3 is the display multiplier, not a default. Preserve prior 0..100 source claims as historical; do not feed their percentages directly to the display-value writer.'}}


def verify(d):
    parsed, records = cache_records()
    require(d['cacheValidation'] == parsed['validation'], 'Cache validation drift')
    require(d['sources']['archiveSha256'] == sha(ARCHIVE.read_bytes()), 'Archive changed')
    require(d['sources']['editorSha256'] == EDITOR_SHA, 'Editor provenance changed')
    dictionary = json.loads((ENGINE / 'skills/instructions/references/fm3-param-dictionary.json').read_text())['params']
    by_key = {(p['family'], p['param']): p for p in dictionary}
    require(len(d['fields']) == 6, 'Wrong field count')
    for target, field in zip(TARGETS, d['fields']):
        family, section, pid, symbol = target
        require(field['name'] == symbol and field['parameter'] == f'{family}:{pid}', 'Binding drift')
        require(field['cacheSection'] == section and field['cacheRecord'] == records[section, pid], 'Cache record drift')
        p = by_key[family, pid]
        require(p['name'] == symbol, 'Dictionary symbol drift')
        require([p['min'], p['max'], p['displayMultiplier'], p['step']] == records[section, pid]['numeric_fields'], 'Dictionary scale drift')
        require((p['enum'] or []) == records[section, pid]['labels'], 'Enum drift')
        if family == 'FUZZ':
            require(p['status'] == 'blocked-hidden-editor' and not field['editorUI']['active'] and field['editorUI']['commentedOccurrences'] == 5, 'Hidden control became writable')
    require(d['cabPosition']['canonicalDisplayRange'] == [0, 10], 'Cab display range drift')
    return d


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    require(not args.write or args.editor, '--write requires the pinned editor')
    result = build(args.editor) if args.editor else json.loads(OUT.read_text())
    verify(result)
    content = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
    if args.write:
        OUT.write_text(content)
    else:
        require(OUT.read_text() == content, 'Resolution report stale')
    print(json.dumps({'fieldsResolved': 6, 'namedActiveChorusFields': 3, 'blockedHiddenDriveFields': 1,
        'cabDisplayRange': [0, 10], 'cacheRecordsReplayed': parsed_count(result),
        'editorReplayed': bool(args.editor), 'newHardwareMeasurements': False}))


def parsed_count(result):
    return result['cacheValidation']['record_count']


if __name__ == '__main__':
    main()
