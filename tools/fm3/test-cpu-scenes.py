#!/usr/bin/env python3
"""Regression for cpu-scenes-build.mjs + FM3_CPU_SCENES.py (no serial port, no device; repo example only).
Builds a pack from a repo example; a fake FM3 answers CPU requests with a per-scene raw value; checks that
only the dump and read-only CPU requests are sent, every scene is read, a refused name stops and a
tampered preset is refused before any write."""
import builtins, json, subprocess, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
INS = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions'
sys.path.insert(0, str(INS / 'scripts/cpu-sweep-collector'))
import FM3_CPU_SWEEP as S
import FM3_CPU_SCENES as C
def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)
tmp = Path(tempfile.mkdtemp()); pack = tmp / 'pack'
subprocess.check_call(['node', str(ROOT / 'tools/fm3/cpu-scenes-build.mjs'), str(pack), str(INS / 'examples/SATRIANI_SOAP_ON_A_ROPE_V3.syx')], stdout=subprocess.DEVNULL)
m = json.loads((pack / 'manifest.json').read_text())
check(len(m['estimate']['perScene']) == 8 and m['scenes'] == list(range(1, 9)), 'manifest')
log = {'dump': 0, 'cpu': 0, 'other': 0}; state = {'scene': m['storedSelectedScene']}
RAW = {s: 40 + 4 * s for s in range(1, 9)}
class FakePort:
    def __init__(self, path): self.framer = S.Framer(); self.pending = []
    def write(self, d):
        d = list(bytes(d))
        if d[5] in (0x77, 0x78, 0x79): log['dump'] += 1
        elif d == list(S.cpu_request()):
            log['cpu'] += 1; f = [0xf0, 0, 1, 0x74, 0x11, 0x01, 0x2e] + [0] * 30 + [RAW[state['scene']]] + [0] * 10 + [0xf7]; self.pending.append(bytes(f))
        else: log['other'] += 1
    def drain(self, s):
        for f in self.pending: self.framer.feed(f)
        self.pending.clear()
    def close(self): pass
answers = []
def fake_input(prompt):
    if 'Kas on?' in prompt: return answers.pop(0)
    if 'praegu valitud' in prompt: return str(state['scene'])
    state['scene'] = int(prompt.split('stseen ')[1].split('.')[0]); return 'ok'
S.Port = FakePort; C.S.Port = FakePort; builtins.input = fake_input; S.time.sleep = lambda s: None
answers[:] = ['j']; C.run(pack, tmp / 's1', '/dev/null')
r = json.loads((tmp / 's1' / 'cpu-scenes-results.json').read_text())
check(log['other'] == 0 and log['dump'] == 10 and log['cpu'] >= 27, 'frames sent: %r' % log)
check([s['cpuPercent'] for s in r['steps']] == [S.cpu_from_raw(RAW[s]) for s in range(1, 9)], 'per-scene readings')
check(r['sceneAfterLoad'] == str(m['storedSelectedScene']), 'scene after load')
answers[:] = ['e']
try: C.run(pack, tmp / 's2', '/dev/null'); check(False, 'name refusal')
except SystemExit as e: check('redaktsioonipuhvrisse' in str(e), 'name refusal message')
bad = tmp / 'bad'; bad.mkdir(); (bad / 'manifest.json').write_text((pack / 'manifest.json').read_text())
b = bytearray((pack / 'PRESET.syx').read_bytes()); b[100] ^= 1; (bad / 'PRESET.syx').write_bytes(bytes(b)); n = log['dump']
try: C.run(bad, tmp / 's3', '/dev/null'); check(False, 'tamper')
except SystemExit as e: check('SHA-256' in str(e) and log['dump'] == n, 'tampered preset refused before writing')
print(json.dumps({'scenarios': 3, 'scenes': 8, 'deviceIO': False}))
