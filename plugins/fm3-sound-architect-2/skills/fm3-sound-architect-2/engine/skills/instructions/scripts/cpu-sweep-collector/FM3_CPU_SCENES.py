#!/usr/bin/env python3
"""FM3 CPU per scene (test T6 follow-up). macOS/Linux, POSIX serial, no pyserial.

Loads ONE preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked), asks which
scene the FM3 shows after the load and reads the CPU meter. Then the USER selects each listed scene
on the FM3; after each selection the script reads the CPU meter again (read-only fn=0x01 sub=0x2E,
same decode and settling as FM3_CPU_SWEEP.py).
Device frames: one edit-buffer dump and the read-only CPU/grid request. No store, no SET, no
scene change by the script.

Usage:
  python3 FM3_CPU_SCENES.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_CPU_SCENES.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S

def reading(port):
    raw, reads = S.settle(port, first_wait=1.0)
    return {'cpuPercent': None if raw is None else S.cpu_from_raw(raw), 'raw': raw, 'reads': reads}

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-cpu-scenes', 'Not a CPU scenes pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    frames = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'cpu-scenes-results.json'
    S.check(not out.exists(), 'Sessioonis on juba cpu-scenes-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-cpu-scenes-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    port = S.Port(port_path)
    try:
        S.send_preset(port, frames); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        res['userConfirmedName'] = True
        res['sceneAfterLoad'] = input('Mis stseen on FM3 ekraanil praegu valitud (number 1-8)? > ').strip()
        res['afterLoad'] = reading(port); print('  CPU: %s %%' % res['afterLoad']['cpuPercent'])
        for n, sc in enumerate(manifest['scenes'], 1):
            note = input('\n[%d/%d] Vali FM3-l stseen %d. Kui ekraan näitab stseeni %d, kirjuta "ok" ja Enter\n  (kui see ei õnnestunud, kirjuta, mis juhtus). > '
                         % (n, len(manifest['scenes']), sc, sc)).strip()
            r = reading(port); r.update({'step': n, 'scene': sc, 'userNote': note}); res['steps'].append(r)
            print('  CPU: %s %%' % r['cpuPercent'])
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    S.check(S.cpu_from_raw(76) == 76.0 and S.cpu_from_raw(40) == 52.0, 'decode')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
