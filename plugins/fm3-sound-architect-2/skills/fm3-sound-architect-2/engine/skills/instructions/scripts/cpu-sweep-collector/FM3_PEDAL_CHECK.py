#!/usr/bin/env python3
"""FM3 Volume pedal check (test 4a). macOS/Linux, POSIX serial, no pyserial.

For each pack preset (P1 = External 1 -> Volume/Pan 1 Gain binding, P0 = same preset without it):
load it into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked), then at four pedal
positions ask the user what Volume value the FM3 screen shows, and record:
  - the user's reading (ground truth: the front panel),
  - every frame the FM3 sent on its own while the pedal moved,
  - the Volume/Pan 1 block bulk read (fn=0x1F, read-only) and the grid/meter frame (fn=0x01 sub=0x2E).
Device frames: edit-buffer dumps and read-only shapes accepted by FM3_READ_PROBE.read_only_shape.
Finding 2026-10-24: the bulk read returns the STORED Volume word (10.00) at every pedal position and the
FM3 sends nothing on its own while the pedal moves, so the pedal effect is not machine-readable here;
the modulated value is visible in FM3-Edit (the knob follows the pedal).
No parameter SET, no store, no preset or scene change.

Usage:
  python3 FM3_PEDAL_CHECK.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_PEDAL_CHECK.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect
from FM3_VALUE_CHECK import bulk_values, load

def unsolicited(port):
    """Frames the FM3 sent on its own since the last read (drained now, not requested)."""
    port.drain(0.3); frames = [bytes(f).hex() for f in port.framer.frames]; port.framer.frames.clear(); return frames

def reads(port, item, grid_req):
    vol = bytes.fromhex(item['volumeRequest']); S.check(read_only_shape(vol) == 'bulk', 'volume request')
    port.framer.frames.clear(); port.write(vol)
    vframes = collect(port, quiet=0.3, max_wait=4.0)
    values = None
    try: values = bulk_values([bytes.fromhex(h) for h in vframes], 102)
    except SystemExit: pass
    port.framer.frames.clear(); port.write(grid_req)
    gframes = collect(port, quiet=0.2, max_wait=2.0)
    raw = next((S.parse_raw(list(bytes.fromhex(h))) for h in gframes if S.parse_raw(list(bytes.fromhex(h))) is not None), None)
    return {'volumeFrames': vframes, 'volumeWords': values, 'gridFrames': gframes, 'cpuRaw': raw}

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-pedal-check', 'Not a pedal-check pack')
    grid_req = bytes.fromhex(manifest['gridRequest']); S.check(read_only_shape(grid_req) == 'grid', 'grid request')
    dumps = {}
    for it in manifest['items']:
        data = (pack / it['file']).read_bytes()
        S.check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
        dumps[it['id']] = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'pedal-results.json'
    S.check(not out.exists(), 'Sessioonis on juba pedal-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-pedal-check-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'presets': []}
    port = S.Port(port_path)
    try:
        for n, it in enumerate(manifest['items'], 1):
            load(port, dumps[it['id']]); time.sleep(1.0)
            ans = input('\n[%d/%d] FM3 ekraanil peaks olema nimi "%s". Kas on? (j/e): ' % (n, len(manifest['items']), it['name'])).strip().lower()
            S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
            input('Ava FM3-l Volume/Pan ploki leht: LAYOUT, NAV-nuppudega plokile VOL, siis EDIT (mitte ENTER). Kui leht on avatud, vajuta Enter. ')
            rec = {'id': it['id'], 'name': it['name'], 'binding': it['binding'], 'positions': []}
            unsolicited(port)
            for pos in manifest['positions']:
                reading = input('  Vii pedaal: %s. Hoia paigal. Mis Volume väärtust FM3 näitab? Kirjuta number ja Enter: ' % pos['text']).strip()
                entry = {'position': pos['id'], 'userReading': reading, 'unsolicitedFrames': unsolicited(port)}
                entry.update(reads(port, it, grid_req))
                rec['positions'].append(entry)
                print('    salvestatud (FM3 saatis pedaali liigutamise ajal %d kaadrit)' % len(entry['unsolicitedFrames']))
            res['presets'].append(rec)
    finally:
        port.close()
        out.write_text(json.dumps(res, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset. Skript ei salvestanud midagi.')

def self_test():
    S.check(read_only_shape(bytes.fromhex('f0000174111f66006df7')) == 'bulk', 'volume bulk request shape')
    S.check(read_only_shape(bytes.fromhex('f000017411012e00000000000000000000000000003bf7')) == 'grid', 'grid request shape')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
