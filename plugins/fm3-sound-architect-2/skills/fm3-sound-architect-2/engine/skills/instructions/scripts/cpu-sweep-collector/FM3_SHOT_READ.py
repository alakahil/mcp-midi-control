#!/usr/bin/env python3
"""FM3 screenshot test: read-only re-read of the test blocks of a pack preset that is already in the edit buffer.
Sends the CPU port check followed by fn=0x1F bulk read requests (refuses anything else); nothing is loaded, stored or set.
Use after FM3-Edit has shown the preset, to see whether the device changed any word (close FM3-Edit first).
  python3 FM3_SHOT_READ.py --pack DIR --session DIR --label NAME [--preset ID] [--port /dev/cu.usbmodemXXXX]
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape
from FM3_SHOT_LOAD import read_block, compare, require_fm3, load_item, safe_label

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path, required=True); ap.add_argument('--session', type=Path, required=True)
    ap.add_argument('--label', required=True); ap.add_argument('--preset'); ap.add_argument('--port')
    a = ap.parse_args()
    safe_label(a.label)
    mb, it, _ = load_item(a.pack, a.preset)
    a.session.mkdir(parents=True, exist_ok=True)
    out = a.session / ('shot-read-%s-%s.json' % (it['id'], a.label))
    S.check_new_result(out)
    path = a.port or S.find_port()
    port = S.Port(path)
    res = {'kind': 'fm3-shot-read', 'packSha256': hashlib.sha256(mb).hexdigest(), 'preset': it['id'], 'label': a.label,
           'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'blocks': [], 'allMatch': False}
    try:
        require_fm3(port, path)
        for b in it['blocks']:
            vals = read_block(port, b); diff, tests = compare(b, vals)
            res['blocks'].append({'family': b['family'], 'effectId': b['effectId'], 'values': len(vals), 'matches': not diff,
                                  'mismatches': diff[:80], 'testWords': tests, 'device': vals})
    except (SystemExit, Exception) as e:
        res['error'] = str(e)
        S.write_json_new(out, res)
        raise
    finally:
        port.close()
    res['allMatch'] = all(x['matches'] for x in res['blocks'])
    S.write_json_new(out, res)
    for x in res['blocks']:
        print('  %-10s %s' % (x['family'], 'KLAPIB' if x['matches'] else 'ERINEB'))
        for d in x['mismatches']: print('    ', d)
    print('Tulemus:', out)
    if not res['allMatch']: sys.exit(2)

if __name__ == '__main__':
    main()
