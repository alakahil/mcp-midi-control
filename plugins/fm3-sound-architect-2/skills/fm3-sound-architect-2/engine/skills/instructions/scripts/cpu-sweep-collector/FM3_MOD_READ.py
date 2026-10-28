#!/usr/bin/env python3
"""FM3 modifier display reading (test T7). macOS/Linux, POSIX serial, no pyserial.

For each pack preset (edit-buffer dump, 0x77 header 7F 00 00 40 00, SHA-256 checked) the USER opens the
named parameter on the FM3 front panel, presses ENTER (Modifier menu), reads Source 1 and then the
Modify page (PAGE RIGHT) and types the values shown. The stored words of that binding are in the pack;
the readings pair them with the display. Results are saved after every preset, so a stopped run resumes.
Device frames: edit-buffer dumps only. No store, no SET, no scene change by the script.

Usage:
  python3 FM3_MOD_READ.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_MOD_READ.py --check-port [--port ...]   (read-only: lists ports, FM3 must answer)
  python3 FM3_MOD_READ.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S

def require_fm3(port, path):
    """Read-only identity check before the first dump: the FM3 (model 0x11) must answer the CPU request."""
    v = S.read_cpu(port, timeout=2.0)
    S.check(v is not None, 'Port %s ei vastanud FM3 päringule; ühtegi presetti ei saadetud. Kontrolli USB-kaablit ja jagajat, sulge FM3-Edit/Fractal-Bot.' % path)
    print('FM3 vastas pordis %s (CPU %s %%).' % (path, S.cpu_from_raw(v)))

def check_port(port_path):
    import glob
    c = sorted(glob.glob('/dev/cu.usbmodem*')) + sorted(glob.glob('/dev/ttyACM*'))
    print('Leitud pordid: %s' % (', '.join(c) or 'mitte ühtegi'))
    path = port_path or S.find_port()
    port = S.Port(path)
    try: require_fm3(port, path)
    finally: port.close()
    print('Pordikontroll OK. Midagi ei saadetud peale CPU lugemispäringu.')

def run(pack, session, port_path):
    manifest = json.loads((pack / 'manifest.json').read_text())
    S.check(manifest.get('kind') == 'fm3-modifier-display', 'Not a modifier display pack')
    frames = {}
    for it in manifest['items']:
        data = (pack / it['file']).read_bytes()
        S.check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
        frames[it['id']] = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True); out = session / 'mod-read-results.json'
    res = json.loads(out.read_text()) if out.exists() else {'kind': 'fm3-modifier-display-results', 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'items': []}
    done = {r['id'] for r in res['items']}
    if done: print('Jätkan: juba loetud %d presetti.' % len(done))
    port = S.Port(port_path)
    try:
        require_fm3(port, port_path)
        for n, it in enumerate(manifest['items'], 1):
            if it['id'] in done: continue
            S.send_preset(port, frames[it['id']]); time.sleep(1.0)
            ans = input('\n[%d/%d] FM3 ekraanil peaks olema "%s". Kas on? (j/e): ' % (n, len(manifest['items']), it['name'])).strip().lower()
            S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
            b = it['binding']
            print('  Ava LAYOUT-is plokk %s (rida %d, veerg %d), EDIT. Vali parameeter "%s" ja vajuta ENTER.'
                  % (b['block'], b['grid']['row'], b['grid']['column'], b['param']))
            if it.get('hint'): print('  NB: ' + it['hint'])
            if it.get('expectSource'): print('  Õige parameetri puhul on Source 1: "%s". Kui näed muud, oled vale parameetri juures.' % it['expectSource'])
            rec = {'id': it['id'], 'source1': input('  Source 1 lehel: mis on Source 1? > ').strip(), 'fields': {}}
            print('  Nüüd PAGE RIGHT (Modify leht). Kirjuta iga väli täpselt nagu ekraanil (kui välja pole, kirjuta "-").')
            for f in it['fields']:
                rec['fields'][f] = input('    %s > ' % f).strip()
            rec['note'] = input('  Kas midagi muud on teistmoodi või märkimisväärne? (Enter = ei) > ').strip()
            print('  Vajuta EXIT (ära salvesta).')
            res['items'].append(rec); out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    S.check(S.cpu_request()[:7] == bytes([0xf0, 0, 1, 0x74, 0x11, 0x01, 0x2e]), 'port helpers')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); ap.add_argument('--check-port', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    elif a.check_port: check_port(a.port)
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
