#!/usr/bin/env python3
"""Regression for cpu-check-build.mjs (offline; repo example presets only, no user files).

Builds a fake "bank" from repo examples, one with a stored-location header (as in a purchased
bank), and checks: every item is an edit-buffer dump the CPU collector accepts; the calibration
item comes first; picks span the lowest and highest estimate; --scene=stored changes only the
13-byte header frame; --scene=worst sets the worst scene and keeps the rest of the body; bad sizes
and bad options are refused."""
import json, os, subprocess, sys, tempfile, hashlib
from pathlib import Path
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
INS = ROOT / 'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions'
sys.path.insert(0, str(INS / 'scripts/cpu-sweep-collector'))
import FM3_CPU_SWEEP as S

def check(v, m):
    if not v: raise SystemExit('FAIL: ' + m)

tmp = Path(tempfile.mkdtemp())
ex = [p for p in sorted((INS / 'examples').glob('*.syx')) if p.stat().st_size == 24680][:12]
check(len(ex) >= 6, 'enough examples')
first = bytearray(ex[0].read_bytes()); first[6] = 0x02; first[7] = 0x32
x = 0
for b in first[:11]: x ^= b
first[11] = x & 0x7f
bank = tmp / 'bank.syx'; bank.write_bytes(bytes(first) + b''.join(p.read_bytes() for p in ex[1:]))
def build(out, *extra, ok=True):
    r = subprocess.run(['node', str(ROOT / 'tools/fm3/cpu-check-build.mjs'), str(out), *extra, str(bank)], capture_output=True, text=True)
    check((r.returncode == 0) == ok, 'build %r: %s' % (extra, r.stderr[-300:]))
    return json.loads((out / 'manifest.json').read_text()) if ok else None
for scene in ('stored', 'worst'):
    out = tmp / scene; m = build(out, '--pick=4', '--scene=' + scene)
    check(m['items'][0]['id'] == 'cal-p6a' and m['items'][0]['expectPercent'] == 82.5 and m['confirmName'], 'calibration first')
    users = m['items'][1:]; check(len(users) == 4, 'four picks')
    est = [i['estimatePercent'] for i in users]; check(est == sorted(est), 'sorted by estimate')
    for it in m['items']:
        d = (out / it['file']).read_bytes(); check(hashlib.sha256(d).hexdigest() == it['sha256'], 'sha')
        fr = S.dump_frames(d); check(len(fr) == 10, 'collector accepts ' + it['file'])
    src = {p.name: p for p in ex}
    if scene == 'stored':
        check(all(i['selectedScene'] == i['storedScene'] for i in users), 'stored scene kept')
        for it in users:
            idx = int(it['source'].split('#')[1]) - 1
            orig = bank.read_bytes()[idx * 24680:(idx + 1) * 24680]; d = (out / it['file']).read_bytes()
            check(d[13:] == orig[13:] and d[6:11] == bytes([0x7f, 0, 0, 0x40, 0]), 'only the header frame changes')
    else:
        check(all(i['estimatePercent'] == i['estimateMaxPercent'] for i in users), 'worst scene estimate')
    # The FILE must hold the selected scene (body byte 0), decoded independently of the manifest.
    # (module path via env: fm3-prototype.mjs runs its own CLI when it is process.argv[1])
    got = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', '''
import fs from 'node:fs';const {inspectStructure}=await import(process.env.FM3_PROTO);
console.log(JSON.stringify(process.argv.slice(1).map(f=>{const s=inspectStructure(fs.readFileSync(f));return [Buffer.from(s.raw.body)[0]+1,s.raw.crcValid];})));
''', *[str(out / i['file']) for i in users]], env={**os.environ, 'FM3_PROTO': str(INS / 'scripts/drive-collector/fm3-prototype.mjs')}))
    check(all(ok for _, ok in got), 'CRC valid')
    check([s for s, _ in got] == [i['selectedScene'] for i in users], '%s: file scene %r vs manifest %r' % (scene, [s for s, _ in got], [i['selectedScene'] for i in users]))
    if scene == 'worst':
        check(any(i['selectedScene'] != i['storedScene'] for i in users), 'worst-scene case exercised (some stored scene differs)')
check(build(tmp / 'w2', '--pick=1', ok=False) is None and build(tmp / 'w3', '--scene=x', ok=False) is None, 'bad options refused')
odd = tmp / 'odd.syx'; odd.write_bytes(b'\0' * 100)
r = subprocess.run(['node', str(ROOT / 'tools/fm3/cpu-check-build.mjs'), str(tmp / 'w4'), str(odd)], capture_output=True)
check(r.returncode != 0, 'wrong size refused')
print(json.dumps({'scenarios': 4, 'examples': len(ex), 'deviceIO': False}))
