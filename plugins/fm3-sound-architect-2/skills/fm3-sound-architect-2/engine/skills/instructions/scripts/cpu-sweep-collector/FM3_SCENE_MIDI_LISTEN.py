#!/usr/bin/env python3
"""FM3 Scene MIDI send check (test 6 / 1). macOS/Linux, POSIX serial, no pyserial.

Loads a generated preset whose Scene MIDI block sends one PC and one CC per scene into the edit
buffer (0x77 header 7F 00 00 40 00, SHA-256 checked). The USER then selects scenes on the FM3;
after each selection the script records EVERY byte the FM3 sent on the USB port (channel
messages, SysEx, realtime) and prints the decoded MIDI messages, so we see whether the Scene MIDI
commands go out over USB and which program number byte is sent for a shown value.

The script sends nothing after the dump: no store, no SET, no request, no scene change.
If a MIDI device is connected to the FM3 MIDI OUT, it may receive the PC/CC messages too.

Usage:
  python3 FM3_SCENE_MIDI_LISTEN.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_SCENE_MIDI_LISTEN.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S

def midi_messages(data):
    """Decode a raw MIDI byte stream: channel messages (running status), SysEx, realtime."""
    out = []; status = None; buf = []; sysex = None
    for b in data:
        if b >= 0xf8: out.append({'type': 'realtime', 'byte': b}); continue
        if sysex is not None:
            if b == 0xf7: out.append({'type': 'sysex', 'hex': bytes(sysex + [b]).hex()}); sysex = None
            elif b < 0x80: sysex.append(b)
            else: sysex = None
            if b < 0xf0 and b >= 0x80: status = b; buf = []
            continue
        if b == 0xf0: sysex = [b]; status = None; continue
        if b >= 0xf0: status = None; continue
        if b >= 0x80: status = b; buf = []; continue
        if status is None: out.append({'type': 'stray', 'byte': b}); continue
        buf.append(b); need = 1 if status & 0xf0 in (0xc0, 0xd0) else 2
        if len(buf) == need:
            kind = {0x80: 'noteOff', 0x90: 'noteOn', 0xa0: 'polyPressure', 0xb0: 'CC', 0xc0: 'PC', 0xd0: 'channelPressure', 0xe0: 'pitchBend'}[status & 0xf0]
            m = {'type': kind, 'channel': (status & 0x0f) + 1, 'data': list(buf)}
            if kind == 'PC': m['programByte'] = buf[0]
            if kind == 'CC': m['cc'] = buf[0]; m['value'] = buf[1]
            out.append(m); buf = []
    return out

def describe(m):
    if m['type'] == 'PC': return 'PC kanal %d, programmi bait %d' % (m['channel'], m['programByte'])
    if m['type'] == 'CC': return 'CC kanal %d, CC %d, väärtus %d' % (m['channel'], m['cc'], m['value'])
    if m['type'] == 'sysex': return 'SysEx %d baiti (fn %s)' % (len(m['hex']) // 2, m['hex'][10:12] if m['hex'].startswith('f0000174') else '?')
    return m['type']

class Tap:
    """Wraps the port's framer to keep every raw byte the FM3 sends."""
    def __init__(self, framer): self.framer = framer; self.raw = bytearray(); self.orig = framer.feed; framer.feed = self.feed
    def feed(self, data): self.raw += bytes(data); self.orig(data)
    def take(self): b = bytes(self.raw); self.raw = bytearray(); return b

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-scene-midi-listen', 'Not a Scene MIDI listen pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'scene-midi-listen-results.json'
    S.check(not out.exists(), 'Sessioonis on juba scene-midi-listen-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-scene-midi-listen-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    port = S.Port(port_path); tap = Tap(port.framer)
    def listen(seconds):
        port.drain(seconds); raw = tap.take(); port.framer.frames.clear()
        return {'rawHex': raw.hex(), 'messages': midi_messages(raw)}
    try:
        port.drain(0.5); res['beforeLoad'] = listen(1.0)
        for f in dump: port.write(f); time.sleep(0.03)
        res['afterLoad'] = listen(2.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        res['userConfirmedName'] = True; res['idle'] = listen(1.0)
        print('Kuulan. Pärast laadimist saatis FM3 %d MIDI-sõnumit.' % len([m for m in res['afterLoad']['messages'] if m['type'] in ('PC', 'CC')]))
        for n, sc in enumerate(manifest['scenes'], 1):
            note = input('\n[%d/%d] Vali FM3-l stseen %d. Kui ekraan näitab stseeni %d, kirjuta "ok" ja Enter\n  (kui see ei õnnestunud, kirjuta, mis juhtus). > ' % (n, len(manifest['scenes']), sc, sc)).strip()
            got = listen(1.0); got.update({'step': n, 'scene': sc, 'userNote': note}); res['steps'].append(got)
            shown = [describe(m) for m in got['messages'] if m['type'] != 'realtime']
            print('  FM3 saatis: ' + ('; '.join(shown) if shown else 'mitte midagi'))
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    m = midi_messages(bytes([0xc2, 0x05, 0xb2, 20, 50, 21, 60, 0xfe, 0xf0, 0, 1, 0x74, 0x11, 0x13, 0x7f, 0xf7, 0xc2, 0x06]))
    S.check([x['type'] for x in m] == ['PC', 'CC', 'CC', 'realtime', 'sysex', 'PC'], 'types %r' % m)
    S.check(m[0]['channel'] == 3 and m[0]['programByte'] == 5 and m[2]['cc'] == 21 and m[2]['value'] == 60 and m[5]['programByte'] == 6, 'fields (running status)')
    S.check(midi_messages(bytes([0x05]))[0]['type'] == 'stray', 'stray data byte')
    S.check(describe(m[0]) == 'PC kanal 3, programmi bait 5', 'describe')
    t = Tap(S.Framer()); t.framer.feed(bytes([0xc2, 1, 0xf0, 0x7f, 0xf7])); S.check(t.take() == bytes([0xc2, 1, 0xf0, 0x7f, 0xf7]) and len(t.framer.frames) == 1, 'tap keeps raw bytes and frames')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
