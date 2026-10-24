#!/usr/bin/env python3
"""Regression for FM3_BIT4_CHECK.py against a simulated FM3 (no serial port, no device).
The fake answers the stored-dump request with three frames and the grid request with the item's
expected factory grid (optionally with bit 4 cleared). Checks: only read-only requests are sent,
the target cell and bit 4 are reported, and a grid without bit 4 is detected."""
import builtins, json, subprocess, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/cpu-sweep-collector'))
import FM3_CPU_SWEEP as S, FM3_GRID_CHECK as G, FM3_READ_PROBE as P, FM3_BIT4_CHECK as B

def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)

def run_case(manifest, strip_bit4):
    tmp = Path(tempfile.mkdtemp()); pack = tmp / 'pack'; pack.mkdir(); (pack / 'manifest.json').write_text(json.dumps(manifest))
    log = {'grid': 0, 'stored': 0, 'other': 0}; cur = {'item': None}
    class FakePort:
        def __init__(self, path): self.framer = S.Framer()
        def write(self, d):
            k = P.read_only_shape(bytes(d))
            if k == 'storedDump':
                log['stored'] += 1; cur['item'] = next(i for i in manifest['items'] if i['storedDumpRequest'] == bytes(d).hex())
                for fn in (0x77, 0x78, 0x79): self.framer.frames.append([0xf0, 0, 1, 0x74, S.MODEL, fn, 0, 0xf7])
            elif k == 'grid':
                log['grid'] += 1; cells = [list(c) for c in cur['item']['expectedGrid']]
                if strip_bit4: cells = [c[:3] + [c[3] & 15] for c in cells]
                f = bytearray(G.encode_grid(G.GOLDEN, cells)); f[-2] = S.checksum(list(f[:-2])); self.framer.frames.append(list(f))
            else: log['other'] += 1
        def drain(self, s): pass
        def close(self): pass
    S.Port = FakePort; B.S.Port = FakePort; B.time.sleep = lambda s: None
    clock = [0.0]
    def mono(): clock[0] += 0.05; return clock[0]
    B.time.monotonic = mono; builtins.input = lambda p: 'ok'
    B.run(pack, tmp / 's', '/dev/null')
    return json.loads((tmp / 's' / 'bit4-results.json').read_text()), log

out = Path(tempfile.mkdtemp())
factory = sys.argv[1] if len(sys.argv) > 1 else None
if factory is None: print(json.dumps({'skipped': 'factory banks not given'})); sys.exit(0)
subprocess.check_call(['node', str(ROOT / 'tools/fm3/bit4-check-build.mjs'), factory, str(out)], stdout=subprocess.DEVNULL)
m = json.loads((out / 'manifest.json').read_text())
r, log = run_case(m, False)
check(log['other'] == 0 and log['stored'] == len(m['items']) and log['grid'] >= 2 * len(m['items']), 'only read-only requests: %r' % log)
check(all(x['gridEqualsFactory'] and x['liveCell'][1] & 16 and len(x['storedDumpFrames']) == 3 for x in r['items']), 'bit 4 reported')
r2, _ = run_case(m, True)
check(all(not x['gridEqualsFactory'] and x['gridEqualsFactoryWithoutBit4'] and not x['liveCell'][1] & 16 for x in r2['items']), 'missing bit 4 detected')
print(json.dumps({'scenarios': 2, 'items': len(m['items']), 'deviceIO': False}))
