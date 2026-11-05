#!/usr/bin/env python3
"""FM3 screenshot test: read-only re-read of the test blocks of a pack preset that is already in the edit buffer.
Sends only fn=0x1F bulk read requests (refuses anything else); nothing is loaded, stored or set.
Use after FM3-Edit has shown the preset, to see whether the device changed any word (close FM3-Edit first).
  python3 FM3_SHOT_READ.py --pack DIR --session DIR --label NAME [--preset ID] [--port /dev/cu.usbmodemXXXX]
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape
from FM3_SHOT_LOAD import read_block, compare, require_fm3

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path, required=True); ap.add_argument('--session', type=Path, required=True)
    ap.add_argument('--label', required=True); ap.add_argument('--preset'); ap.add_argument('--port')
    a = ap.parse_args()
    mb = (a.pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-shot-check', 'Not a screenshot test pack')
    it = {x['id']: x for x in manifest['items']}.get(a.preset) if a.preset else manifest['items'][0]
    S.check(it is not None, 'Unknown preset id')
    for b in it['blocks']: S.check(read_only_shape(bytes.fromhex(b['request'])) == 'bulk', 'bulk request only')
    a.session.mkdir(parents=True, exist_ok=True)
    out = a.session / ('shot-read-%s-%s.json' % (it['id'], a.label))
    S.check(not out.exists(), 'Sessioonis on juba %s; kasuta uut --label.' % out.name)
    path = a.port or S.find_port()
    port = S.Port(path)
    res = {'kind': 'fm3-shot-read', 'packSha256': hashlib.sha256(mb).hexdigest(), 'preset': it['id'], 'label': a.label,
           'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'blocks': []}
    try:
        require_fm3(port, path)
        for b in it['blocks']:
            vals = read_block(port, b); diff, tests = compare(b, vals)
            res['blocks'].append({'family': b['family'], 'effectId': b['effectId'], 'values': len(vals), 'matches': not diff,
                                  'mismatches': diff[:80], 'testWords': tests, 'device': vals})
    finally:
        port.close()
    out.write_text(json.dumps(res, indent=1) + '\n')
    for x in res['blocks']:
        print('  %-10s %s' % (x['family'], 'KLAPIB' if x['matches'] else 'ERINEB'))
        for d in x['mismatches']: print('    ', d)
    print('Tulemus:', out)

if __name__ == '__main__':
    main()
