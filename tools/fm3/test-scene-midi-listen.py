#!/usr/bin/env python3
"""Regression for FM3_SCENE_MIDI_LISTEN.py against a simulated FM3 (no serial port, no device).

The fake FM3 accepts the edit-buffer dump and, for each scene the (simulated) user selects, emits
the PC/CC bytes the generated preset's Scene MIDI block holds, with running status and a realtime
byte mixed in. Checks: only the dump is sent; every message is decoded per step; a refused name
stops; a tampered preset is refused before any write."""
import builtins, json, os, subprocess, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
COL = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/cpu-sweep-collector'
sys.path.insert(0, str(COL))
import FM3_CPU_SWEEP as S
import FM3_SCENE_MIDI_LISTEN as L

def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)

tmp = Path(tempfile.mkdtemp()); pack = tmp / 'pack'
subprocess.check_call(['node', str(ROOT / 'tools/fm3/scene-midi-listen-build.mjs'), str(pack)], stdout=subprocess.DEVNULL)
manifest = json.loads((pack / 'manifest.json').read_text())
log = {'dumpFrames': 0, 'other': 0}; pending = []

class FakePort:
    def __init__(self, path): self.framer = S.Framer()
    def write(self, d):
        d = bytes(d)
        if d[5] in (0x77, 0x78, 0x79): log['dumpFrames'] += 1
        else: log['other'] += 1
    def drain(self, s):
        if pending: self.framer.feed(bytes(pending)); pending.clear()
    def close(self): pass

def scene_bytes(sc):
    cmds = [c for c in manifest['sceneMidi'] if c['scene'] == sc]
    pc = next(c for c in cmds if c['type'] == 'PC'); cc = next(c for c in cmds if c['type'] == 'CC')
    return [0xc0 | (pc['channel'] - 1), pc['program'], 0xfe, 0xb0 | (cc['channel'] - 1), cc['number'], cc['value']]

answers = []
def fake_input(prompt):
    if 'Kas on?' in prompt: return answers.pop(0)
    sc = int(prompt.split('stseen ')[1].split('.')[0]); pending.extend(scene_bytes(sc)); return 'ok'
S.Port = FakePort; L.S.Port = FakePort; builtins.input = fake_input; L.time.sleep = lambda s: None

answers[:] = ['j']; L.run(pack, tmp / 's1', '/dev/null')
r = json.loads((tmp / 's1' / 'scene-midi-listen-results.json').read_text())
check(log['other'] == 0 and log['dumpFrames'] == len(S.split_frames((pack / manifest['preset']['file']).read_bytes())), 'only the dump is sent: %r' % log)
for st in r['steps']:
    pcs = [m for m in st['messages'] if m['type'] == 'PC']; ccs = [m for m in st['messages'] if m['type'] == 'CC']
    check(len(pcs) == 1 and pcs[0]['channel'] == 3 and pcs[0]['programByte'] == st['scene'], 'PC step %d' % st['step'])
    check(len(ccs) == 1 and ccs[0]['cc'] == 20 and ccs[0]['value'] == 10 * st['scene'], 'CC step %d' % st['step'])
check([s['scene'] for s in r['steps']] == manifest['scenes'], 'scene order')
answers[:] = ['e']
try: L.run(pack, tmp / 's2', '/dev/null'); check(False, 'name refusal')
except SystemExit as e: check('redaktsioonipuhvrisse' in str(e), 'name refusal message')
bad = tmp / 'bad'; bad.mkdir(); (bad / 'manifest.json').write_text((pack / 'manifest.json').read_text())
b = bytearray((pack / manifest['preset']['file']).read_bytes()); b[100] ^= 1; (bad / manifest['preset']['file']).write_bytes(bytes(b))
n = log['dumpFrames']
try: L.run(bad, tmp / 's3', '/dev/null'); check(False, 'tamper')
except SystemExit as e: check('SHA-256' in str(e) and log['dumpFrames'] == n, 'tampered preset refused before writing')
print(json.dumps({'scenarios': 3, 'steps': len(r['steps']), 'deviceIO': False}))
