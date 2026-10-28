#!/usr/bin/env python3
"""FM3 CPU before/after manual steps (test T8: block cost). macOS/Linux, POSIX serial, no pyserial.

Loads ONE preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked) and reads the CPU
meter (read-only fn=0x01 sub=0x2E). For each pack step the USER makes one change on the FM3 front panel
(for example removes one block in LAYOUT) and presses Enter; the script reads the meter again.
Nothing is stored: the change lives only in the edit buffer and is discarded when another preset is
selected. Device frames: one edit-buffer dump and the read-only CPU request.

Usage:
  python3 FM3_CPU_STEPS.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_CPU_STEPS.py --self-test
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
    S.check(manifest.get('kind') == 'fm3-cpu-steps', 'Not a CPU steps pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    frames = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'cpu-steps-results.json'
    S.check(not out.exists(), 'Sessioonis on juba cpu-steps-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-cpu-steps-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    port = S.Port(port_path)
    try:
        S.send_preset(port, frames); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        res['userConfirmedName'] = True
        res['sceneAfterLoad'] = input('Mis stseen on FM3 ekraanil praegu valitud (number 1-8)? > ').strip()
        res['afterLoad'] = reading(port); print('  CPU: %s %%' % res['afterLoad']['cpuPercent'])
        for n, st in enumerate(manifest['steps'], 1):
            note = input('\n[%d/%d] %s\n  Kui tehtud, kirjuta "ok" ja Enter (kui ei õnnestunud, kirjuta, mis juhtus). > '
                         % (n, len(manifest['steps']), st['text'])).strip()
            r = reading(port); r.update({'step': n, 'id': st['id'], 'userNote': note}); res['steps'].append(r)
            print('  CPU: %s %%' % r['cpuPercent'])
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    S.check(S.cpu_from_raw(76) == 76.0, 'decode')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
