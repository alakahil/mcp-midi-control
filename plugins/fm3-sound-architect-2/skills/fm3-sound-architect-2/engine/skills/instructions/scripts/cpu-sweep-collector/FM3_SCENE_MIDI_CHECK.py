#!/usr/bin/env python3
"""FM3 Scene MIDI decode (test 6b). macOS/Linux, POSIX serial, no pyserial.

Loads the pack preset (Scene MIDI block 190, all fields at their defaults) into the edit buffer
(0x77 header 7F 00 00 40 00, SHA-256 checked). For each step the USER changes ONE Scene MIDI field
on the FM3 front panel and describes it; the script then reads block 190 with the read-only fn=0x1F
bulk read and prints which of its 257 words changed since the previous step.
Device frames: one edit-buffer dump and read-only bulk reads (shape checked by FM3_READ_PROBE).
No parameter SET, no store, no preset or scene change by the script.

Usage:
  python3 FM3_SCENE_MIDI_CHECK.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_SCENE_MIDI_CHECK.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect
from FM3_VALUE_CHECK import bulk_values, load

def read_block(port, req):
    port.framer.frames.clear(); port.write(req)
    frames = collect(port, quiet=0.3, max_wait=4.0)
    return frames, bulk_values([bytes.fromhex(h) for h in frames], 190)

def diff(a, b):
    return [{'word': i, 'before': x, 'after': y} for i, (x, y) in enumerate(zip(a, b)) if x != y]

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-scene-midi-check', 'Not a Scene MIDI pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    req = bytes.fromhex(manifest['blockRequest']); S.check(read_only_shape(req) == 'bulk', 'block request shape')
    session.mkdir(parents=True, exist_ok=True); out = session / 'scene-midi-results.json'
    S.check(not out.exists(), 'Sessioonis on juba scene-midi-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-scene-midi-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    port = S.Port(port_path)
    try:
        load(port, dump); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        frames, base = read_block(port, req)
        S.check(len(base) == 257, 'Scene MIDI plokk ei vastanud ootuspäraselt (%d väärtust)' % len(base))
        res['baseline'] = {'frames': frames, 'words': base}
        print('Algseis loetud: 257 väärtust, nullist erinevaid %d.' % sum(1 for v in base if v))
        input('\nAva FM3-l Scene MIDI plokk: LAYOUT, NAV-nuppudega reas 1 esimene plokk (MIDI), siis EDIT. Kui leht on avatud, vajuta Enter. ')
        prev = base; steps = list(manifest['steps'])
        n = 0
        while True:
            n += 1
            if n <= len(steps):
                print('\n[%d/%d] Muuda AINULT seda: %s' % (n, len(steps), steps[n - 1]))
                note = input('  Kui tehtud, kirjuta lühidalt, mida täpselt muutsid (nt "S1 M1 Type PC"), ja Enter.\n  (Kui seda välja ei leia, kirjuta "vahele" ja Enter.) > ').strip()
            else:
                note = input('\nSoovi korral muuda veel ühte välja ja kirjelda seda; lõpetamiseks kirjuta "lõpp" ja Enter. > ').strip()
                if note.lower().startswith('lõpp') or note.lower().startswith('lopp') or note == '': break
            frames, words = read_block(port, req)
            d = diff(prev, words)
            res['steps'].append({'step': n, 'asked': steps[n - 1] if n <= len(steps) else None, 'userNote': note, 'frames': frames, 'words': words, 'changed': d})
            print('  Muutunud sõnad: ' + (', '.join('%d: %d -> %d' % (c['word'], c['before'], c['after']) for c in d) if d else 'mitte ühtegi'))
            prev = words
    finally:
        port.close()
        out.write_text(json.dumps(res, indent=1, ensure_ascii=False) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    S.check(read_only_shape(bytes.fromhex('f0000174111f3e0134f7')) == 'bulk', 'bulk request shape for effect 190')
    S.check(diff([0, 1, 2], [0, 5, 2]) == [{'word': 1, 'before': 1, 'after': 5}], 'diff')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
