#!/usr/bin/env python3
"""Tempo locks for the newly insertable families (audit point 6); no device I/O.

Source: the FM3-Edit 1.07.17 __block_layout.xml. Every copy in the given editor binary
(Windows .exe or the macOS universal binary, which carries one per slice) must be
byte-identical to the layout already pinned by six_field_resolution / parameter_dependencies
(SHA-256 0fc5f3dac1e3...). Labels are cross-checked against the FW13 editor cache and the
dictionary. The existing 21-pair policy is left untouched; this file only adds the
families the point-6 inserter can place.
"""
import argparse, hashlib, json, re, struct, zlib
from pathlib import Path
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, cache_records, require, sha
from type_applicability import active

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-insert-tempo-locks.json'
LAYOUT_SHA = '0fc5f3dac1e33aa2fee6d8e1efeda6fc0f6a8782f63519d54aa973cbe67595a2'
# family -> FW13 editor-cache section tag (record counts equal the dictionary word counts: 96, 48)
FAMILIES = {'PLEX': 15, 'TENTAP': 38}


def layouts(data):
    out = []
    for hit in re.finditer(b'PK\x03\x04', data):
        p = hit.start()
        if p + 30 > len(data):
            continue
        n, e = struct.unpack_from('<HH', data, p + 26)
        if data[p + 30:p + 30 + n] != b'__block_layout.xml':
            continue
        method = struct.unpack_from('<H', data, p + 8)[0]
        crc, comp, size = struct.unpack_from('<III', data, p + 14)
        start = p + 30 + n + e
        require(method == 8 and start + comp <= len(data), 'Unsupported XML member')
        xml = zlib.decompress(data[start:start + comp], -15)
        require(len(xml) == size and zlib.crc32(xml) == crc, 'XML CRC/size mismatch')
        out.append(xml)
    require(out and all(x == out[0] for x in out), 'Missing or differing XML layouts')
    require(sha(out[0]) == LAYOUT_SHA, 'Layout differs from the pinned FM3-Edit 1.07.17 layout')
    return out[0], len(out)


def pairs_from(xml):
    pairs = set()
    def visit(node):
        if not active(node):
            return
        symbol, lock = node.get('parameterName', ''), node.get('lock', '')
        if node.tag == 'EditorControl' and 'TEMPO' in lock and symbol.split('_')[0] in FAMILIES:
            require(lock.split('_')[0] == symbol.split('_')[0], 'Cross-family lock')
            pairs.add((symbol, lock))
        for child in node:
            visit(child)
    visit(ET.fromstring(xml))
    return sorted(pairs)


def rules_for(pairs):
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    by_name = {p['name']: p for p in dictionary if p.get('name')}
    _, cache = cache_records()
    rules = []
    for target, tempo in pairs:
        p, t = by_name[target], by_name[tempo]
        f = p['family']
        require(t['family'] == f and p['block'] == t['block'], 'Dictionary family mismatch')
        labels = cache[FAMILIES[f], t['param']]['labels']
        require(labels == t['enum'] and labels[0].strip() == 'NONE', 'Tempo enum mismatch')
        rules.append({'family': f, 'effectId': p['block'], 'targetPid': p['param'], 'target': target,
                      'tempoPid': t['param'], 'tempo': tempo, 'labels': labels, 'noneRaw': 0,
                      'targetStatus': p['status'], 'source': 'active-FW13-XML-lock'})
    return rules


def build(editor):
    xml, copies = layouts(Path(editor).read_bytes())
    pairs = pairs_from(xml)
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
            'sources': {'layoutSha256': LAYOUT_SHA, 'layoutCopiesInBinary': copies,
                        'dictionarySha256': sha((REF / 'fm3-param-dictionary.json').read_bytes()),
                        'cacheSections': FAMILIES},
            'pairs': pairs, 'tempoLocks': rules_for(pairs),
            'policy': 'Explicit writes to a locked target require final channel Tempo NONE (same rule as fm3-parameter-dependencies.json).',
            'limits': 'Only the point-6 insertable families with XML tempo locks (Plex, Ten-Tap). Megatap/Synth/others have none in the layout.'}


def verify(result):
    require(result['sources']['dictionarySha256'] == sha((REF / 'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    require(result['tempoLocks'] == rules_for([tuple(p) for p in result['pairs']]), 'Rule drift')
    require(len(result['pairs']) == 10, 'Pair coverage drift')
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    require(not args.write or args.editor, '--write requires an FM3-Edit 1.07.17 binary')
    result = json.loads(json.dumps(build(args.editor))) if args.editor else json.loads(OUT.read_text())
    verify(result)
    content = json.dumps(result, ensure_ascii=False, indent=1) + '\n'
    if args.write:
        OUT.write_text(content)
    else:
        require(content == OUT.read_text(), 'Insert tempo locks stale')
    print(json.dumps({'tempoPairs': len(result['tempoLocks']), 'editorReplayed': bool(args.editor), 'deviceIO': False}))
