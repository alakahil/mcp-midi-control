#!/usr/bin/env python3
"""FM3 Scene MIDI check on the MIDI OUT jack (test T1). macOS/Linux, POSIX serial, no pyserial.

Loads a generated preset whose Scene MIDI block sends PC / CC messages into the edit buffer
(0x77 header 7F 00 00 40 00, SHA-256 checked). A MIDI device (e.g. a Line 6 Helix / HX) is
connected to the FM3 MIDI OUT jack. The USER selects scenes on the FM3 and types what the
receiving device's screen shows (preset number, snapshot). Every byte the FM3 sends on its USB
port is recorded as well.

The script sends nothing after the dump: no store, no SET, no request, no scene change.
It never touches the receiving device; only the FM3's own Scene MIDI messages reach it.

Usage:
  python3 FM3_SCENE_MIDI_DIN.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_SCENE_MIDI_DIN.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_SCENE_MIDI_LISTEN import midi_messages, describe, Tap

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-scene-midi-din', 'Not a Scene MIDI DIN pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'scene-midi-din-results.json'
    S.check(not out.exists(), 'Sessioonis on juba scene-midi-din-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-scene-midi-din-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    res['receiverBefore'] = input('\nMida näitab Helix praegu (preseti number ja snapshot, nt "03A snapshot 1")? > ').strip()
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
        res['userConfirmedName'] = True
        res['receiverAfterLoad'] = input('Mida näitab Helix nüüd, pärast laadimist (preset ja snapshot)? > ').strip()
        for n, st in enumerate(manifest['steps'], 1):
            sc = st['scene']
            note = input('\n[%d/%d] Vali FM3-l stseen %d. Seejärel vaata Helixi ekraani.\n'
                         '  Kirjuta, mida Helix näitab (preseti number ja snapshot, nt "02B snapshot 1"; kui midagi ei muutunud, kirjuta "ei muutunud"). > '
                         % (n, len(manifest['steps']), sc)).strip()
            got = listen(1.0); got.update({'step': n, 'scene': sc, 'receiverShows': note}); res['steps'].append(got)
            shown = [describe(m) for m in got['messages'] if m['type'] != 'realtime']
            if shown: print('  FM3 USB-pordil: ' + '; '.join(shown))
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta. Helixil ei salvestatud midagi.')

def self_test():
    m = midi_messages(bytes([0xc0, 0x02, 0xb0, 69, 2]))
    S.check([x['type'] for x in m] == ['PC', 'CC'] and m[0]['programByte'] == 2 and m[1]['cc'] == 69, 'decode')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
