#!/usr/bin/env python3
"""Regression for FM3_STEP_DIFF.py against a simulated FM3 (no serial port, no device).
The fake holds the pack's block words; each simulated user step changes one word of one block.
Checks: only the dump and bulk reads are sent; every step reports exactly the changed word with
its channel; a refused name stops before any read; a tampered preset is refused before writing."""
import builtins, json, subprocess, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/cpu-sweep-collector'))
import FM3_CPU_SWEEP as S, FM3_READ_PROBE as P, FM3_STEP_DIFF as D, FM3_VALUE_CHECK as V

def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)

tmp = Path(tempfile.mkdtemp()); pack = tmp / 'pack'
subprocess.check_call(['node', str(ROOT / 'tools/fm3/step-diff-build.mjs'), 'input-volume', str(pack)], stdout=subprocess.DEVNULL)
m = json.loads((pack / 'manifest.json').read_text())
state = {b['effectId']: list(b['expectedWords']) for b in m['blocks']}; log = {'dump': 0, 'bulk': 0, 'other': 0}
def frame(fn, body):
    f = [0xf0, 0, 1, 0x74, S.MODEL, fn] + body; return f + [S.checksum(f), 0xf7]
class FakePort:
    def __init__(self, path): self.framer = S.Framer()
    def write(self, d):
        d = list(bytes(d))
        if d[5] in (0x77, 0x78, 0x79): log['dump'] += 1; return
        if P.read_only_shape(bytes(d)) != 'bulk': log['other'] += 1; return
        log['bulk'] += 1; eid = d[6] | d[7] << 7; w = state[eid]
        self.framer.frames.append(frame(0x74, [eid & 0x7f, eid >> 7, len(w) & 0x7f, len(w) >> 7]))
        for o in range(0, len(w), 40): self.framer.frames.append(frame(0x75, [0, 0] + sum([[v & 0x7f, (v >> 7) & 0x7f, (v >> 14) & 3] for v in w[o:o + 40]], [])))
        self.framer.frames.append(frame(0x76, []))
    def drain(self, s): pass
    def close(self): pass
plan = {}
for n, st in enumerate(m['steps']):
    b = next(x for x in m['blocks'] if x['slug'] == st['block']); plan[st['text']] = (b['effectId'], (n % 2) * b['words'] + n % b['words'], 1000 + n)
answers = []
def fake_input(prompt):
    if 'Kas on?' in prompt: return answers.pop(0)
    for t, (eid, i, v) in plan.items():
        if t in prompt: state[eid][i] = v; return 'shown %d' % v
    return ''
S.Port = FakePort; D.S.Port = FakePort; builtins.input = fake_input; D.time.sleep = lambda s: None; V.time.sleep = lambda s: None
clock = [0.0]
def mono(): clock[0] += 0.05; return clock[0]
D.time.monotonic = mono
answers[:] = ['j']; D.run(pack, tmp / 's1', '/dev/null')
r = json.loads((tmp / 's1' / 'step-diff-results.json').read_text())
check(log['other'] == 0 and log['dump'] > 0 and r['baselineMatchesPack'], 'reads only: %r' % log)
for st, rec in zip(m['steps'], r['steps']):
    eid, i, v = plan[st['text']]; b = next(x for x in m['blocks'] if x['effectId'] == eid)
    check(rec['changed'] == [{'block': b['slug'], 'channel': 'ABCD'[i // b['words']], 'param': i % b['words'], 'before': rec['changed'][0]['before'], 'after': v}], 'step %s: %r' % (st['id'], rec['changed']))
answers[:] = ['e']; n = log['bulk']
try: D.run(pack, tmp / 's2', '/dev/null'); check(False, 'name refusal')
except SystemExit as e: check('redaktsioonipuhvrisse' in str(e) and log['bulk'] == n, 'name refusal stops before reads')
bad = tmp / 'bad'; bad.mkdir(); (bad / 'manifest.json').write_text((pack / 'manifest.json').read_text())
b = bytearray((pack / 'STEP4.syx').read_bytes()); b[100] ^= 1; (bad / 'STEP4.syx').write_bytes(bytes(b)); d0 = log['dump']
try: D.run(bad, tmp / 's3', '/dev/null'); check(False, 'tamper')
except SystemExit as e: check('SHA-256' in str(e) and log['dump'] == d0, 'tampered preset refused')
print(json.dumps({'scenarios': 3, 'steps': len(r['steps']), 'deviceIO': False}))
