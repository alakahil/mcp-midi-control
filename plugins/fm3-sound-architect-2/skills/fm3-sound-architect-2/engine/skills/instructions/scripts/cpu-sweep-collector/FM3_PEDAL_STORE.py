#!/usr/bin/env python3
"""FM3 Volume pedal STORE/reload check (test T2). macOS/Linux, POSIX serial, no pyserial.

  --load    loads the pack preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked)
            and exits, so that FM3-Edit can connect.
  --verify  asks the user's FM3-Edit Volume readings (before STORE and after reload) and the location
            number the USER stored to, then reads that location with the read-only stored-dump request
            (fn=0x03 hi lo 00) and compares the frames with the pack preset.
The STORE is done by the user on the FM3 / in FM3-Edit. This script never stores and never sets.
Display Offset 1: shown location N is index N-1.

Usage:
  python3 FM3_PEDAL_STORE.py --load   --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_PEDAL_STORE.py --verify --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_PEDAL_STORE.py --self-test
Close FM3-Edit and Fractal-Bot before each run (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect

def stored_request(index):
    body = [0xf0, 0x00, 0x01, 0x74, S.MODEL, 0x03, (index >> 7) & 0x7f, index & 0x7f, 0x00]
    return bytes(body + [S.checksum(body), 0xf7])

def compare(pack_frames, got_hex):
    """Frame-by-frame comparison; the 0x77 header may differ (location vs edit buffer)."""
    got = [bytes.fromhex(h) for h in got_hex]
    dump = [f for f in got if len(f) > 6 and f[5] in (0x77, 0x78, 0x79)]
    kinds = [f[5] for f in dump]
    same = [i for i, (a, b) in enumerate(zip(pack_frames, dump)) if a == b]
    return {'frames': len(dump), 'sequenceOk': kinds == [0x77] + [0x78] * 8 + [0x79],
            'identicalFrames': same, 'bodyFramesIdentical': len(dump) == 10 and all(pack_frames[i] == dump[i] for i in range(1, 10))}

def ask_positions(manifest, when):
    out = {}
    for p in manifest['positions']:
        out[p['id']] = input('  %s, pedaal %s: Volume väärtus FM3-Edit-is > ' % (when, p['text'])).strip()
    return out

def run(mode, pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-pedal-store', 'Not a pedal store pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    frames = S.dump_frames(data)
    session.mkdir(parents=True, exist_ok=True)
    if mode == 'load':
        port = S.Port(port_path)
        try: S.send_preset(port, frames); time.sleep(1.0)
        finally: port.close()
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        (session / 'pedal-store-load.json').write_text(json.dumps({'kind': 'fm3-pedal-store-load', 'packSha256': hashlib.sha256(mb).hexdigest(),
            'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'userConfirmedName': ans.startswith('j')}, ensure_ascii=False) + '\n')
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        print('Laaditud redaktsioonipuhvrisse. Nüüd ava FM3-Edit ja jätka LOE_MIND.txt järgi.'); return
    out = session / 'pedal-store-results.json'
    S.check(not out.exists(), 'Sessioonis on juba pedal-store-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-pedal-store-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S')}
    print('\nKirjuta FM3-Edit-is nähtud Volume väärtused (nagu märkisid üles).')
    res['beforeStore'] = ask_positions(manifest, 'Enne salvestamist')
    res['afterReload'] = ask_positions(manifest, 'Pärast uuesti laadimist')
    res['modifierAfterReload'] = input('  Kas pärast uuesti laadimist oli Volume nupul modifier-märk (External 1)? (j/e) > ').strip()
    loc = input('\nMis asukohta (number FM3 ekraanil, 1-512) sa preseti salvestasid? > ').strip()
    S.check(loc.isdigit() and 1 <= int(loc) <= 512, 'Asukoht peab olema 1..512')
    index = int(loc) - 1; res['shownLocation'] = int(loc); res['index'] = index
    req = stored_request(index); S.check(read_only_shape(req) == 'storedDump', 'stored dump request shape')
    port = S.Port(port_path)
    try:
        port.framer.frames.clear(); port.write(req); res['storedDumpFrames'] = collect(port, quiet=0.4, max_wait=6.0)
    finally:
        port.close()
    res['compare'] = compare(frames, res['storedDumpFrames'])
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    c = res['compare']
    print('\nAsukoht %d loetud: %d kaadrit; keha kaadrid %s preseti failiga.' % (int(loc), c['frames'], 'KLAPIVAD' if c['bodyFramesIdentical'] else 'erinevad'))
    print('Valmis. Tulemused: %s' % out)

def self_test():
    r = stored_request(435); S.check(r.hex() == 'f0000174110303330027f7' and read_only_shape(r) == 'storedDump', 'request')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--load', action='store_true'); ap.add_argument('--verify', action='store_true'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session and (a.load != a.verify), 'Anna --load või --verify, --pack ja --session')
        run('load' if a.load else 'verify', a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
