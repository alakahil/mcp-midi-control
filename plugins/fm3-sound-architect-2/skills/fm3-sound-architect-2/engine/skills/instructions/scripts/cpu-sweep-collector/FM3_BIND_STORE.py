#!/usr/bin/env python3
"""FM3 modifier bindings STORE/reload check (test T9). macOS/Linux, POSIX serial, no pyserial.

  --check-port  read-only: lists ports; the FM3 must answer the CPU request.
  --load        loads the pack preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked)
                and exits, so that the front panel / FM3-Edit can be used.
  --verify      asks what the USER saw before STORE and after reload, and the location number he stored to,
                then reads that location with the read-only stored-dump request (fn=0x03 hi lo 00) and saves
                the frames. Bodies are compared offline (the selected-scene word may differ).
The STORE is done by the user on the FM3 / in FM3-Edit. This script never stores and never sets.
Display Offset 1: shown location N is index N-1.

Usage:
  python3 FM3_BIND_STORE.py --check-port [--port /dev/cu.usbmodemXXXX]
  python3 FM3_BIND_STORE.py --load   --pack DIR --session DIR [--port ...]
  python3 FM3_BIND_STORE.py --verify --pack DIR --session DIR [--port ...]
  python3 FM3_BIND_STORE.py --self-test
Close FM3-Edit and Fractal-Bot before each run (the USB port is exclusive).
"""
import argparse, glob, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect

def stored_request(index):
    body = [0xf0, 0x00, 0x01, 0x74, S.MODEL, 0x03, (index >> 7) & 0x7f, index & 0x7f, 0x00]
    return bytes(body + [S.checksum(body), 0xf7])

def require_fm3(port, path):
    v = S.read_cpu(port, timeout=2.0)
    S.check(v is not None, 'Port %s ei vastanud FM3 päringule; midagi ei saadetud. Kontrolli USB-kaablit ja jagajat, sulge FM3-Edit/Fractal-Bot.' % path)
    print('FM3 vastas pordis %s (CPU %s %%).' % (path, S.cpu_from_raw(v)))

def check_port(port_path):
    c = sorted(glob.glob('/dev/cu.usbmodem*')) + sorted(glob.glob('/dev/ttyACM*'))
    print('Leitud pordid: %s' % (', '.join(c) or 'mitte ühtegi'))
    path = port_path or S.find_port(); port = S.Port(path)
    try: require_fm3(port, path)
    finally: port.close()
    print('Pordikontroll OK. Midagi ei saadetud peale CPU lugemispäringu.')

def ask_checks(manifest, when):
    print('\n%s:' % when)
    return {c['id']: input('  %s > ' % c['text']).strip() for c in manifest['checks']}

def run(mode, pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-bind-store', 'Not a binding store pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    frames = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True)
    if mode == 'load':
        port = S.Port(port_path)
        try: require_fm3(port, port_path); S.send_preset(port, frames); time.sleep(1.0)
        finally: port.close()
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        (session / 'bind-store-load.json').write_text(json.dumps({'kind': 'fm3-bind-store-load', 'packSha256': hashlib.sha256(mb).hexdigest(),
            'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'userConfirmedName': ans.startswith('j')}, ensure_ascii=False) + '\n')
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        print('Laaditud redaktsioonipuhvrisse. Jätka LOE_MIND.txt järgi.'); return
    out = session / 'bind-store-results.json'
    S.check(not out.exists(), 'Sessioonis on juba bind-store-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-bind-store-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S')}
    print('Kirjuta, mida nägid (nagu märkisid üles). Kui midagi ei saanud kontrollida, kirjuta "-".')
    res['beforeStore'] = ask_checks(manifest, 'ENNE salvestamist')
    res['afterReload'] = ask_checks(manifest, 'PÄRAST salvestamist ja uuesti laadimist')
    res['note'] = input('\nKas midagi muud oli teistmoodi või märkimisväärne? (Enter = ei) > ').strip()
    loc = input('\nMis asukohta (number FM3 ekraanil, 1-512) sa preseti salvestasid? > ').strip()
    S.check(loc.isdigit() and 1 <= int(loc) <= 512, 'Asukoht peab olema 1..512')
    index = int(loc) - 1; res['shownLocation'] = int(loc); res['index'] = index
    req = stored_request(index); S.check(read_only_shape(req) == 'storedDump', 'stored dump request shape')
    port = S.Port(port_path)
    try:
        require_fm3(port, port_path)
        port.framer.frames.clear(); port.write(req); res['storedDumpFrames'] = collect(port, quiet=0.4, max_wait=6.0)
    finally:
        port.close()
    dump = [bytes.fromhex(h) for h in res['storedDumpFrames']]
    dump = [f for f in dump if len(f) > 6 and f[5] in (0x77, 0x78, 0x79)]
    res['frameKinds'] = [f[5] for f in dump]
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    ok = res['frameKinds'] == [0x77] + [0x78] * 8 + [0x79]
    print('\nAsukoht %d loetud: %d kaadrit (%s).' % (int(loc), len(dump), 'täielik' if ok else 'MITTETÄIELIK'))
    print('Valmis. Tulemused: %s\nKirjuta vestlusesse "valmis".' % out)

def self_test():
    r = stored_request(422); S.check(read_only_shape(r) == 'storedDump' and r[6:8] == bytes([3, 38]), 'request')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--load', action='store_true'); ap.add_argument('--verify', action='store_true')
    ap.add_argument('--check-port', action='store_true'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: self_test()
    elif a.check_port: check_port(a.port)
    else:
        S.check(a.pack and a.session and (a.load != a.verify), 'Anna --load või --verify, --pack ja --session')
        run('load' if a.load else 'verify', a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
