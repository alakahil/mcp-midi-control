#!/usr/bin/env python3
"""Classify FM3 metadata differences without changing device addresses or scales."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/fm3/parameter-evidence'
INS = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions'
RANGES = ROOT / 'packages/fractal-midi/src/gen3/fm3/ranges.ts'


def require(ok, message):
    if not ok:
        raise ValueError(message)


def parse_ranges(text):
    """Read the restricted object literal as data, never execute TypeScript."""
    text = re.sub(r'/\*.*?\*/|//[^\n]*', '', text, flags=re.S)
    match = re.fullmatch(r'\s*export const FM3_RANGES\s*=\s*(\{.*\})\s*as const;\s*', text, re.S)
    require(match is not None, 'Unsupported FM3 ranges source shape')
    literal = re.sub(r'\b([A-Za-z_][A-Za-z_0-9]*|[0-9]+)\s*:', r'"\1":', match[1])
    literal = re.sub(r',\s*([}\]])', r'\1', literal.replace("'", '"'))
    result = json.loads(literal)
    for family, entries in result.items():
        require(isinstance(family, str) and isinstance(entries, dict), 'Invalid range family')
        for pid, value in entries.items():
            require(pid.isdecimal() and set(value) <= {'kind', 'displayMin', 'displayMax', 'enumCount'}, 'Unsupported range fields')
            require(value['displayMin'] <= value['displayMax'], 'Reversed source range')
    return result


def bounds(p):
    m = p['displayMultiplier'] or 1
    if p['kind'] == 'enum':
        return [0, len(p['enum']) - 1]
    if p['kind'] == 'knob':
        return [0, m]
    return [p['min'] * m, p['max'] * m]


def same_range(a, b):
    return all(math.isclose(x, y, rel_tol=1e-6, abs_tol=1e-3) for x, y in zip(a, b))


CATEGORIES = {
    'high-id-editor-control': 'High ID (>=0xFF00), outside ordinary block words; editor/action interpretation needs its own mapping.',
    'global-address-gap': 'GLOBAL address absent from the other source. No guessed offset or cross-device substitution.',
    'midi-row-action': 'MIDIBLOCK_TEST_ROW action outside the 0..256 scalar table; separate action semantics.',
    'family-absent-from-table': 'Family exists in the catalog but is absent from this dictionary; this does not establish device availability.',
    'catalog-address-gap': 'Remaining named address absent from the dictionary; requires source-specific investigation.',
    'global-slot-without-name': 'GLOBAL descriptor has no catalog symbol; descriptor shape does not identify its function.',
    'midi-slot-without-scalar-definition': 'Unnamed MIDI table slot marked unused/n/a; not an individual knob measurement.',
    'unnamed-family': 'Descriptor block has no family mapping; do not transfer an ID from another device.',
    'unnamed-unused-slot': 'Unnamed descriptor explicitly marked unused/n/a; retained as a slot, not a supported control.',
    'unnamed-active-descriptor': 'Unnamed descriptor has a curve or options, but its semantic identity remains unresolved.',
    'named-dictionary-gap': 'Named dictionary entry is absent from the catalog; requires a reviewed symbol join.',
}


def classify(row, dictionary, families):
    if row['join'] == 'catalog-only':
        if row['pid'] >= 0xFF00:
            return 'high-id-editor-control'
        if row['family'] == 'GLOBAL':
            return 'global-address-gap'
        if row['family'] == 'MIDIBLOCK' and all(re.fullmatch(r'MIDIBLOCK_TEST_ROW[1-8]', name) for name in row['names']):
            return 'midi-row-action'
        return 'family-absent-from-table' if row['family'] not in families else 'catalog-address-gap'
    require(row['join'] == 'dictionary-only', 'Not a metadata gap')
    p = dictionary[row['dictionaryRow']]
    if row['names']:
        return 'named-dictionary-gap'
    if row['family'] is None:
        return 'unnamed-family'
    if row['family'] == 'GLOBAL':
        return 'global-slot-without-name'
    if row['family'] == 'MIDIBLOCK' and p['kind'] == 'unused' and p['status'] == 'n/a':
        return 'midi-slot-without-scalar-definition'
    return 'unnamed-unused-slot' if p['kind'] == 'unused' and p['status'] == 'n/a' else 'unnamed-active-descriptor'


def build():
    catalog_path = ROOT / 'packages/fractal-midi/catalog/fm3.json'
    dictionary_path = INS / 'references/fm3-param-dictionary.json'
    registry_path = OUT / 'registry.json'
    catalog = json.loads(catalog_path.read_text())['data']['FM3_PARAMS']
    dictionary = json.loads(dictionary_path.read_text())['params']
    registry = json.loads(registry_path.read_text())
    ranges = parse_ranges(RANGES.read_text())
    families = {p['family'] for p in dictionary}
    gaps, aliases, catalog_ranges, unnamed_writable = [], [], [], []
    for row in registry['parameters']:
        if len(row['catalogRows']) > 1:
            aliases.append({'parameter': row['id'], 'catalogRows': row['catalogRows'], 'names': row['names']})
        if row['join'] != 'both':
            gaps.append({'parameter': row['id'], 'join': row['join'], 'category': classify(row, dictionary, families),
                         'catalogRows': row['catalogRows'], 'dictionaryRow': row.get('dictionaryRow'), 'names': row['names'],
                         'tableWriterAvailable': row.get('tableEncoder', {}).get('available', False)})
        if row.get('tableEncoder', {}).get('available') and not row['names']:
            unnamed_writable.append(row['id'])
        if row['join'] != 'both':
            continue
        p = dictionary[row['dictionaryRow']]
        if p['kind'] not in ('linear', 'log', 'knob'):
            continue
        for ci in row['catalogRows']:
            c = catalog[ci]
            if 'displayMin' in c and 'displayMax' in c and not same_range([c['displayMin'], c['displayMax']], bounds(p)):
                catalog_ranges.append({'parameter': row['id'], 'catalogRow': ci, 'dictionaryRow': row['dictionaryRow'],
                    'catalogRange': [c['displayMin'], c['displayMax']], 'dictionaryRange': bounds(p),
                    'resolution': 'Open source discrepancy; catalog overlays may be inherited. Do not rewrite either source automatically.'})
    by_key = {(p['family'], p['param']): (i, p) for i, p in enumerate(dictionary)}
    references, conflicts = [], []
    for family, entries in ranges.items():
        for pid, entry in entries.items():
            pair = by_key.get((family, int(pid)))
            require(pair is not None, 'FM3 calibration missing from dictionary')
            i, p = pair
            agrees = same_range([entry['displayMin'], entry['displayMax']], bounds(p))
            if 'enumCount' in entry:
                agrees &= p['kind'] == 'enum' and len(p['enum']) == entry['enumCount']
            item = {'parameter': f'{family}:{pid}', 'sourceSymbol': f'FM3_RANGES.{family}[{pid}]',
                    'dictionaryRow': i, 'reference': entry, 'dictionaryRange': bounds(p), 'agrees': agrees}
            references.append(item)
            if not agrees:
                conflicts.append({**item, 'resolution': 'Open scale conflict; inspect FM3-specific calibration/cache evidence before changing the writer.'})
    duplicates = []
    for i, p in enumerate(dictionary):
        if p['kind'] != 'enum':
            continue
        labels = {}
        for index, label in enumerate(p['enum']):
            labels.setdefault(label.strip().lower(), []).append(index)
        for label, indices in labels.items():
            if len(indices) > 1:
                duplicates.append({'parameter': f'{p["family"]}:{p["param"]}', 'dictionaryRow': i,
                    'normalizedLabel': label, 'indices': indices, 'resolution': 'Numeric indices remain distinct; a label resolves to its first match.'})
    sources = [catalog_path, dictionary_path, registry_path, RANGES, Path(__file__).resolve(),
               ROOT / 'packages/fractal-midi/src/gen3/fm3/params.ts',
               ROOT / 'packages/fractal-midi/docs/research/primitives/_negative/gen3-paramid-reuse-across-model-bytes.md']
    return {'schemaVersion': 1, 'policy': {
        'scope': 'Structural metadata reconciliation; no new hardware measurements or write support.',
        'classification': 'A category accounts for the difference; it does not resolve unknown semantics.',
        'referenceRanges': 'FM3_RANGES is an independent source claim; its historical raw captures are not replayed here.',
        'addressSafety': 'Never infer FM3 parameter IDs from another device or a guessed GLOBAL offset.'},
        'sources': {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
        'summary': {'gaps': len(gaps), 'categories': dict(sorted(Counter(p['category'] for p in gaps).items())),
                    'aliasKeys': len(aliases), 'aliasExtraRows': sum(len(p['catalogRows']) - 1 for p in aliases),
                    'catalogRangeDifferenceRows': len(catalog_ranges), 'catalogRangeDifferenceKeys': len({p['parameter'] for p in catalog_ranges}),
                    'fm3ReferenceRanges': len(references), 'fm3ReferenceRangeConflicts': len(conflicts),
                    'unnamedWritableKeys': unnamed_writable, 'duplicateEnumLabelGroups': len(duplicates), 'userPhysicalActions': 0},
        'categories': CATEGORIES, 'gaps': gaps, 'aliases': aliases, 'catalogRangeDifferences': catalog_ranges,
        'fm3ReferenceRanges': references, 'scaleConflicts': conflicts, 'duplicateEnumLabels': duplicates}


def markdown(d):
    s = d['summary']
    lines = ['# FM3 metaandmete erinevuste audit', '',
        'Erinevused on liigitatud olemasolevate allikate järgi. Liigitus ei kinnita tundmatu välja tähendust ega lisa kirjutustuge. Uusi seadmetoiminguid: **0**.', '',
        '| Rühm | Kirjeid |', '|---|---:|']
    lines += [f'| `{k}` | {v} |' for k, v in s['categories'].items()]
    lines += ['', f'Kokku {s["gaps"]} ühepoolset pere/PID kirjet. {s["aliasExtraRows"]} vana Flangeri lisanime jäävad alles ilma parameetrite arvu suurendamata.', '',
        '## Skaalad ja nimeta väljad', '',
        f'Kataloogi ja sõnastiku vahel on {s["catalogRangeDifferenceRows"]} erineva vahemikuga rida ({s["catalogRangeDifferenceKeys"]} parameetrit). Kataloogi kuvasemantika sisaldab ka teiste allikate ülekatteid; ükski erinevus ei anna automaatselt alust väärtuse muutmiseks.', '',
        f'Repo FM3-spetsiifilise `FM3_RANGES` allika {s["fm3ReferenceRanges"]} vahemikust erinevad sõnastikuga {s["fm3ReferenceRangeConflicts"]}:', '',
        '| Parameeter | FM3 kalibreering | Sõnastik |', '|---|---|---|']
    lines += [f'| `{p["parameter"]}` | {p["reference"]["displayMin"]} … {p["reference"]["displayMax"]} | {p["dictionaryRange"][0]} … {p["dictionaryRange"][1]} |' for p in d['scaleConflicts']]
    lines += ['', 'Need on lahendamata allikavastuolud. Enne generaatori skaala muutmist tuleb siduda vastava firmware’i juht, ühik ja algne kalibreering või redaktori cache. Selle auditi käigus ajaloolisi kalibreerimise toorvastuseid uuesti ei kontrollitud.', '',
        'Tabelikirjutaja lubab tehniliselt ka nimeta kirjeid: ' + ', '.join(f'`{k}`' for k in s['unnamedWritableKeys']) + '. Nende tähendus vajab eraldi kontrolli; arvutus- ja baiditest ei anna neile nime ega seadmekinnitust.', '',
        f'Valikuloendites on {s["duplicateEnumLabelGroups"]} korduva normaliseeritud nimega rühma. Numbrilised indeksid säilivad eraldi; nimega sisestus valib esimese vaste.', '',
        '## Automaatne testimaatriks', '',
        '[encoder-matrix.json](encoder-matrix.json) eristab arvutus-, baidi- ja olemasolevate mõõtepunktide kontrollid. Tarkvaratesti läbimine ei suurenda seadmel mõõdetud parameetrite arvu. Täpsed lähteräsid, iga erinevuse kategooria ja allikaindeksid: [metadata-reconciliation.json](metadata-reconciliation.json).', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    data = build()
    compact = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
    body = '{\n' + ',\n'.join(compact(k) + ':' + ('[\n' + ',\n'.join(compact(x) for x in v) + '\n]' if isinstance(v, list) else compact(v)) for k, v in data.items()) + '\n}\n'
    for name, content in {'metadata-reconciliation.json': body, 'metadata-reconciliation.md': markdown(data)}.items():
        if args.write:
            (OUT / name).write_text(content)
        else:
            require((OUT / name).read_text() == content, f'{name} is stale; review sources and regenerate')
    print(json.dumps(data['summary']))


if __name__ == '__main__':
    main()
