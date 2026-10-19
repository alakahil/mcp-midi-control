#!/usr/bin/env python3
"""Compile bounded tempo locks and read-only modifier bindings; no device I/O."""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from six_field_resolution import ENGINE, EDITOR_SHA, CACHE_SHA, cache_records, layout_xml, mine_editor, require, sha
from type_applicability import active

REF = ENGINE / 'skills/instructions/references'
OUT = REF / 'fm3-parameter-dependencies.json'
SECTIONS = {'CHORUS': 16, 'DELAY': 13, 'FILTER': 24, 'FLANGER': 17, 'ROTARY': 18,
            'PHASER': 19, 'TREMOLO': 22, 'PITCH': 23, 'REVERB': 12, 'MOD': 3}
MANUAL = 'https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf'
BLOCKS = 'https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf'


def extract(xml):
    pairs = set()
    def visit(node):
        if not active(node):
            return
        symbol, lock = node.get('parameterName', ''), node.get('lock', '')
        if node.tag == 'EditorControl' and 'TEMPO' in lock and symbol.split('_')[0] in SECTIONS:
            require(lock.split('_')[0] == symbol.split('_')[0], 'Cross-family lock')
            pairs.add((symbol, lock))
        for child in node:
            visit(child)
    visit(ET.fromstring(xml))
    require(len(pairs) == 20, 'Tempo XML coverage changed')
    return sorted(pairs)


def build(editor):
    data = Path(editor).read_bytes()
    require(sha(data) == EDITOR_SHA, 'Wrong pinned FM3 editor')
    xml = layout_xml(data)
    dictionary = json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']
    by_name = {p['name']: p for p in dictionary if p.get('name')}
    pairs = extract(xml)
    pairs.append(('REVERB_PREDELAY', 'REVERB_PREDLYTEMPO'))
    # FLANGER native symbols retain the dictionary's older OLD_FLANGER aliases.
    lookup = lambda name: by_name[('OLD_' if name.startswith('FLANGER_') else '') + name]
    seeds = {name.split('_')[0]: (lookup(name)['param'], name) for name, _ in pairs}
    seeds['MOD'] = (0, 'MOD_CTRLID')
    del seeds['FLANGER']  # adjacent legacy/native tables do not form one family table
    descriptors = dict(zip(sorted(seeds), mine_editor(data,
        [(f, SECTIONS[f], seeds[f][0], seeds[f][1]) for f in sorted(seeds)], include_rows=True)))
    flanger_names = sorted({n for pair in pairs for n in pair if n.startswith('FLANGER_')})
    rows = mine_editor(data, [('FLANGER', 17, lookup(n)['param'], n) for n in flanger_names], symbol_only=True)
    descriptors['FLANGER'] = {'rows': rows, 'bindings': [(r['pid'], r['name']) for r in rows], 'scope': 'Individual unique native descriptors; dictionary OLD_FLANGER aliases retained'}
    _, cache = cache_records()
    rules = []
    for target, tempo in pairs:
        p, t = lookup(target), lookup(tempo)
        f = p['family']
        bindings = descriptors[f]['bindings']
        require((p['param'], target) in bindings and (t['param'], tempo) in bindings, 'Native binding mismatch')
        labels = cache[SECTIONS[f], t['param']]['labels']
        require(labels == t['enum'] and labels[0].strip() == 'NONE', 'Tempo enum mismatch')
        rules.append({'family': f, 'effectId': p['block'], 'targetPid': p['param'], 'target': p['name'],
            'nativeTarget': target, 'tempoPid': t['param'], 'tempo': t['name'], 'nativeTempo': tempo,
            'labels': labels, 'noneRaw': 0, 'source': 'blocks-guide-pre-delay-and-existing-control' if f == 'REVERB' else 'active-FW13-XML-lock'})
    return {'schemaVersion': 1, 'firmware': '13.0', 'editor': '1.07.17',
        'sources': {'editorSha256': EDITOR_SHA, 'cacheSha256': CACHE_SHA, 'layoutSha256': sha(xml),
            'dictionarySha256': sha((REF / 'fm3-param-dictionary.json').read_bytes()),
            'manual': {'url': MANUAL, 'printedPages': [57, 92], 'revision': '7.x July 2023; behavior only, FW13 bindings independently verified'},
            'blocksGuide': {'url': BLOCKS, 'topic': 'Reverb Pre-Delay Tempo'}},
        'descriptors': descriptors, 'tempoLocks': rules,
        'modifiers': {'cacheSection': 3, 'sources': cache[3, 0]['labels'], 'channels': cache[3, 17]['labels'],
            'layout': {'header': 1538, 'records': 32, 'recordBytes': 96, 'headerBytes': 46, 'words': 25, 'firstId': 3, 'end': 4610},
            'scope': 'Read-only layout of seven SHA-pinned bundled bases; serialized record count is not a usable-modifier capacity claim. NewLook source 14->0 is independently documented in FM3_COMPOSER_NEWLOOK.md. Secondary-source operations remain unsupported.'},
        'policy': 'Explicit time/rate writes require final channel Tempo NONE. Active or unknown modifier targets reject explicit static writes. Channel scope ALL/A-D is honored. Preserve untouched stored words; no modifier writes or DSP evaluation.',
        'limits': '21 bounded tempo pairs in nine families, not all FM3 dependencies. Other-family type visibility, effective BPM-derived values and controller dynamics remain unverified.'}


def verify(result):
    require(result['sources']['editorSha256'] == EDITOR_SHA and result['sources']['cacheSha256'] == CACHE_SHA, 'Source drift')
    require(result['sources']['dictionarySha256'] == sha((REF / 'fm3-param-dictionary.json').read_bytes()), 'Dictionary drift')
    d = {(p['family'], p['param']): p for p in json.loads((REF / 'fm3-param-dictionary.json').read_text())['params']}
    _, cache = cache_records()
    require(len(result['tempoLocks']) == 21, 'Pair coverage drift')
    for r in result['tempoLocks']:
        f = r['family']
        for role in ('target', 'tempo'):
            p = d[f, r[role+'Pid']]
            require(p['name'] == r[role] and p['block'] == r['effectId'], 'Dictionary binding drift')
            require([p['param'], r['native'+role.title()]] in result['descriptors'][f]['bindings'], 'Descriptor drift')
        require(r['labels'] == cache[SECTIONS[f], r['tempoPid']]['labels'] == d[f, r['tempoPid']]['enum'], 'Tempo labels drift')
        require(r['noneRaw'] == 0 and r['labels'][0].strip() == 'NONE', 'NONE drift')
    require(result['descriptors']['MOD']['bindings'] == [[i, d['MOD', i]['name']] for i in range(25)], 'Modifier descriptor drift')
    require(result['modifiers']['sources'] == cache[3, 0]['labels'] and result['modifiers']['channels'] == cache[3, 17]['labels'], 'Modifier enum drift')
    return result


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--editor', type=Path)
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()
    require(not args.write or args.editor, '--write requires pinned editor')
    result = json.loads(json.dumps(build(args.editor))) if args.editor else json.loads(OUT.read_text())
    verify(result)
    content = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
    if args.write:
        OUT.write_text(content)
    else:
        require(content == OUT.read_text(), 'Dependency policy stale')
    print(json.dumps({'tempoPairs': len(result['tempoLocks']), 'serializedModifierRecords': result['modifiers']['layout']['records'], 'editorReplayed': bool(args.editor), 'deviceIO': False}))
