#!/usr/bin/env python3
"""Regression for scene-midi-din-build.mjs + FM3_SCENE_MIDI_DIN.py (no serial port, no device).

Pack: channel default 1 and --channel=16, decoded back from the generated preset (PC Value 2 /
slot 8 PC Value 5 / CC 69 value 2 / PC Value 0 + CC 69 value 1). Collector against a fake FM3:
only the dump is sent; the user's readings of the receiving device are recorded per step; a refused
name stops; a tampered preset is refused before any write."""
import builtins, json, subprocess, sys, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
COL = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/cpu-sweep-collector'
sys.path.insert(0, str(COL))
import FM3_CPU_SWEEP as S
import FM3_SCENE_MIDI_DIN as D

def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)

tmp = Path(tempfile.mkdtemp())
def build(d, *extra):
    subprocess.check_call(['node', str(ROOT / 'tools/fm3/scene-midi-din-build.mjs'), str(d), *extra], stdout=subprocess.DEVNULL)
    return json.loads((d / 'manifest.json').read_text())
m1 = build(tmp / 'p1'); m16 = build(tmp / 'p16', '--channel=16')
want = [(1, 1, 'PC', 2), (2, 8, 'PC', 5), (3, 1, 'CC', 2), (4, 1, 'PC', 0), (4, 2, 'CC', 1)]
for m, ch in ((m1, 1), (m16, 16)):
    got = [(c['scene'], c['command'], c['type'], c.get('program', c.get('value'))) for c in m['sceneMidi']]
    check(got == want and all(c['channel'] == ch for c in m['sceneMidi']), 'commands ch %d: %r' % (ch, got))
    check(all(c['number'] == 69 for c in m['sceneMidi'] if c['type'] == 'CC'), 'CC 69')
check([s['scene'] for s in m1['steps']] == [2, 3, 4, 1], 'step order')
check(m1['steps'][0]['expect'] == {'ifByteEqualsValue': '02B', 'ifByteIsValueMinus1': '02A'}, 'Helix numbering')
for bad in ('--channel=0', '--channel=17'):
    check(subprocess.run(['node', str(ROOT / 'tools/fm3/scene-midi-din-build.mjs'), str(tmp / 'x'), bad], capture_output=True).returncode != 0, 'refuses ' + bad)
# Generated preset decodes back to the same commands (independent decode path).
dec = subprocess.check_output(['node', '--input-type=module', '-e', '''
import fs from 'node:fs';
const E=process.argv[1];const {inspectStructure}=await import(E+'drive-collector/fm3-prototype.mjs');
const {scanRecords}=await import(E+'fm3-layout.mjs');const {describeSceneMidi}=await import(E+'fm3-scene-midi.mjs');
const b=Buffer.from(inspectStructure(fs.readFileSync(process.argv[2])).raw.body);
const r=scanRecords(b,{requireAmpCab:false}).records.find(x=>x.eid===190);console.log(JSON.stringify(describeSceneMidi(b,r)));
''', str(COL.parent) + '/', str(tmp / 'p16' / 'DIN.syx')])
check([(c['scene'], c['command'], c['type'], c['channel']) for c in json.loads(dec)] == [(s, k, t, 16) for s, k, t, _ in want], 'decoded preset')

pack = tmp / 'p1'; log = {'dumpFrames': 0, 'other': 0}
class FakePort:
    def __init__(self, path): self.framer = S.Framer()
    def write(self, d):
        d = bytes(d)
        if d[5] in (0x77, 0x78, 0x79): log['dumpFrames'] += 1
        else: log['other'] += 1
    def drain(self, s): pass
    def close(self): pass
answers = []
def fake_input(prompt):
    if 'Kas on?' in prompt: return answers.pop(0)
    if 'praegu' in prompt: return '03A snapshot 1'
    if 'pärast laadimist' in prompt: return '01C snapshot 1'
    return 'stseen ' + prompt.split('stseen ')[1].split('.')[0]
S.Port = FakePort; D.S.Port = FakePort; builtins.input = fake_input; D.time.sleep = lambda s: None
answers[:] = ['j']; D.run(pack, tmp / 's1', '/dev/null')
r = json.loads((tmp / 's1' / 'scene-midi-din-results.json').read_text())
check(log['other'] == 0 and log['dumpFrames'] == 10, 'only the dump is sent: %r' % log)
check(r['receiverBefore'] == '03A snapshot 1' and r['receiverAfterLoad'] == '01C snapshot 1', 'receiver readings')
check([(s['scene'], s['receiverShows']) for s in r['steps']] == [(sc, 'stseen %d' % sc) for sc in (2, 3, 4, 1)], 'steps')
answers[:] = ['e']
try: D.run(pack, tmp / 's2', '/dev/null'); check(False, 'name refusal')
except SystemExit as e: check('redaktsioonipuhvrisse' in str(e), 'name refusal message')
bad = tmp / 'bad'; bad.mkdir(); (bad / 'manifest.json').write_text((pack / 'manifest.json').read_text())
b = bytearray((pack / 'DIN.syx').read_bytes()); b[100] ^= 1; (bad / 'DIN.syx').write_bytes(bytes(b))
n = log['dumpFrames']
try: D.run(bad, tmp / 's3', '/dev/null'); check(False, 'tamper')
except SystemExit as e: check('SHA-256' in str(e) and log['dumpFrames'] == n, 'tampered preset refused before writing')
print(json.dumps({'scenarios': 3, 'channels': [1, 16], 'deviceIO': False}))
