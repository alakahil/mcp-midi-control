#!/usr/bin/env python3
"""Test harness only: run FM3_LABEL_SWEEP.run against a simulated FM3 (no serial port, no device).

The fake device answers grid reads with the pack's expected grid, block bulk reads with the
pack's expected words, and label reads of blocks in the preset with "L<eid>.<pid>.<n>" (the
pilot index with the manifest's expected label; value field zero, as the FM3). Blocks not in the preset get no label reply unless --absent-text. Options make
it misbehave on purpose.

Runs FM3_LABEL_PROBE.run instead with --probe.
Usage: python3 -B fake_label_fm3.py PACK SESSION [--answer j|e] [--change-after N] [--absent-text]
       [--wrong-label] [--block-change-after N] [--silent-param PID] [--probe]
Used by tools/fm3/test-label-sweep-collector.mjs.
"""
import argparse, builtins, json, sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
import FM3_GRID_CHECK as G
import FM3_READ_PROBE as P
import FM3_LABEL_SWEEP as L
import FM3_LABEL_PROBE as LP

ap = argparse.ArgumentParser()
ap.add_argument('pack', type=Path); ap.add_argument('session', type=Path)
ap.add_argument('--answer', default='j'); ap.add_argument('--change-after', type=int); ap.add_argument('--block-change-after', type=int)
ap.add_argument('--absent-text', action='store_true'); ap.add_argument('--wrong-label', action='store_true'); ap.add_argument('--silent-param', type=int); ap.add_argument('--probe', action='store_true')
a = ap.parse_args()
manifest = json.loads((a.pack / 'manifest.json').read_text())
fams = {f['effectId']: f for f in manifest['families']}
log = {'dumpsReceived': 0, 'labelRequests': 0, 'gridReads': 0, 'bulkReads': 0, 'otherFrames': 0, 'refusedShapes': 0}

def frame(fn, body):
    f = [0xf0, 0, 1, 0x74, S.MODEL, fn] + body; return f + [S.checksum(f), 0xf7]

def pack7(raw):
    out = [0] * (len(raw) + 1); carry = 0
    for i, b in enumerate(raw):
        k = i + 1; out[i] = (((b >> k) & 0x7f) | carry) & 0x7f; carry = ((~(0x7f << k) & b) << (7 - k)) & 0x7f
    out[len(raw)] = carry; return out

def label_reply(eid, pid, sept, text):
    raw = list(text.encode('latin-1')); wire = []
    for o in range(0, len(raw), 7): wire += pack7(raw[o:o + 7])
    return frame(0x01, [0x1f, 0, eid & 0x7f, eid >> 7, pid & 0x7f, pid >> 7] + list(sept) + [0, 0, len(raw) & 0x7f, len(raw) >> 7] + wire)

class FakePort:
    def __init__(self, path): self.framer = S.Framer()
    def write(self, data):
        d = list(bytes(data))
        if d[5] in (0x77, 0x78, 0x79):
            if d[5] == 0x79: log['dumpsReceived'] += 1
            return
        kind = P.read_only_shape(bytes(d))
        if kind is None: log['refusedShapes'] += 1; return
        if kind == 'grid':
            log['gridReads'] += 1; cells = [list(c) for c in manifest['expectedGrid']]
            if a.change_after is not None and log['labelRequests'] > a.change_after:
                c = next(x for x in cells if x[2] and x[2] < 1024 and x[3]); c[3] ^= 1
            f = bytearray(G.encode_grid(G.GOLDEN, cells)); f[-2] = S.checksum(list(f[:-2])); self.framer.frames.append(list(f)); return
        if kind == 'bulk':
            log['bulkReads'] += 1; eid = d[6] | d[7] << 7; w = list(fams[eid]['expectedWords'])
            if a.block_change_after is not None and log['labelRequests'] > a.block_change_after and eid == manifest.get('pilot', {'effectId': 58})['effectId']: w[0] ^= 1
            self.framer.frames.append(frame(0x74, [eid & 0x7f, eid >> 7, len(w) & 0x7f, len(w) >> 7]))
            for o in range(0, len(w), 40):
                self.framer.frames.append(frame(0x75, [0, 0] + sum([[v & 0x7f, (v >> 7) & 0x7f, (v >> 14) & 3] for v in w[o:o + 40]], [])))
            self.framer.frames.append(frame(0x76, [])); return
        if kind in ('display', 'label', 'labelInt'):
            log['labelRequests'] += 1; eid, pid = d[8] | d[9] << 7, d[10] | d[11] << 7; sept = d[12:17]
            idx = 0 if sept == [0] * 5 else (sept[0] | sept[1] << 7) if kind == 'labelInt' else P.label_index(sept)
            if not fams[eid]['present'] and not a.absent_text: return
            if eid == manifest.get('pilot', {'effectId': 58})['effectId'] and pid == a.silent_param: return
            text = 'L%d.%d.%d' % (eid, pid, idx)
            if a.wrong_label: text = 'WRONG'
            elif eid == manifest.get('pilot', {}).get('effectId') and pid == manifest['pilot']['paramId'] and idx == manifest['pilot']['index']: text = manifest['pilot']['label']
            self.framer.frames.append(label_reply(eid, pid, [0] * 5, text)); return
        log['otherFrames'] += 1
    def drain(self, seconds): pass
    def close(self): pass

S.Port = FakePort
clock = [0.0]
def monotonic():
    clock[0] += 0.01; return clock[0]
for mod in (L, G, P): mod.time.monotonic = monotonic; mod.time.sleep = lambda s: None
builtins.input = lambda prompt: a.answer
try:
    (LP.run if a.probe else L.run)(a.pack, a.session, '/dev/null')
    log['exit'] = 'ok'
except SystemExit as e:
    log['exit'] = str(e)
print('FAKE ' + json.dumps(log))
