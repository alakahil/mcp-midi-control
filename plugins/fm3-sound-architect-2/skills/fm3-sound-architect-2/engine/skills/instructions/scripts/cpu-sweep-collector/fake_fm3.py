#!/usr/bin/env python3
"""Test harness only: run FM3_GRID_CHECK.run against a simulated FM3 (no serial port, no device).

The fake device keeps the last complete edit-buffer dump it received and answers every
fn=0x01 sub=0x2E request with a reply whose grid region holds that preset's expected cells
(from the manifest) and a fixed CPU byte. Options make it misbehave on purpose.

Usage: python3 -B fake_fm3.py PACK SESSION [--corrupt ID] [--answer j|e] [--cpu-raw N]
Used by scripts/test-grid-check-collector.mjs.
"""
import argparse, builtins, json, sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_GRID_CHECK as G
import FM3_CPU_SWEEP as S

ap = argparse.ArgumentParser()
ap.add_argument('pack', type=Path); ap.add_argument('session', type=Path)
ap.add_argument('--no-reply'); ap.add_argument('--unstable'); ap.add_argument('--corrupt'); ap.add_argument('--answer', default='j'); ap.add_argument('--cpu-raw', type=int, default=60)
a = ap.parse_args()
manifest = json.loads((a.pack / 'manifest.json').read_text())
# Raw frames only: the collector itself validates (and must refuse) bad files.
by_frames = {it['id']: [bytes(f) for f in S.split_frames((a.pack / it['file']).read_bytes())] for it in manifest['items']}
log = {'dumpsReceived': 0, 'requests': 0, 'otherFrames': 0}

class FakePort:
    def __init__(self, path): self.framer = S.Framer(); self.cur = None; self.buf = []
    def write(self, data):
        d = bytes(data)
        if d[5] == 0x77: self.buf = []
        if d[5] in (0x77, 0x78, 0x79):
            self.buf.append(d)
            if d[5] == 0x79:
                log['dumpsReceived'] += 1
                self.cur = next(it for it in manifest['items'] if by_frames[it['id']] == self.buf)
            return
        if d == S.cpu_request():
            log['requests'] += 1
            if self.cur['id'] == a.no_reply: return
            cells = self.cur['expectedGrid']
            if self.cur['id'] == a.corrupt or (self.cur['id'] == a.unstable and log['requests'] % 2):
                cells = [list(c) for c in cells]; c = next(x for x in cells if x[2] and x[2] < 1024 and x[3]); c[3] ^= 1
            f = bytearray(G.encode_grid(G.GOLDEN, cells)); f[37] = a.cpu_raw; f[-2] = S.checksum(list(f[:-2]))
            self.framer.frames.append(list(f)); return
        log['otherFrames'] += 1
    def drain(self, seconds): pass
    def close(self): pass

S.Port = FakePort
G.time.sleep = lambda s: None
# Deterministic clock: timeout paths run without wall-clock delays.
clock = [0.0]
def monotonic():
    clock[0] += 0.05
    return clock[0]
G.time.monotonic = monotonic
builtins.input = lambda prompt: a.answer
try:
    G.run(a.pack, a.session, '/dev/null')
    log['exit'] = 'ok'
except SystemExit as e:
    log['exit'] = str(e)
print('FAKE ' + json.dumps(log))
