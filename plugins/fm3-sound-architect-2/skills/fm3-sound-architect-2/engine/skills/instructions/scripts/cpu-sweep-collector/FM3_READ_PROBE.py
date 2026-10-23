#!/usr/bin/env python3
"""FM3 read probe. macOS/Linux, POSIX serial, no pyserial.

Finds out which READ paths an FM3 (fw 13) answers, so the value, scale and full-preset checks
can be built on them. Device writes are limited to the manifest-pinned edit-buffer dump
(0x77 header 7F 00 00 40 00, SHA-256 checked, via FM3_CPU_SWEEP.dump_frames). Every other frame
must be one of these read-only shapes, checked byte by byte before anything is sent:

  fn=0x01 sub=0x2E, zero target          grid + meters (as FM3_GRID_CHECK.py)
  fn=0x01 sub=0x1F eid pid, zero value   current display text of one parameter
  fn=0x1F eid                            block bulk read (all values, all channels)
  fn=0x43, no payload                    edit-buffer dump
  fn=0x03 hi lo 00                       stored-preset dump (read only)

No store, no parameter SET, no preset change, no scene change. Every reply frame is saved as
hex; interpretation happens offline. Afterwards select any preset on the FM3; nothing was saved.

Usage:
  python3 FM3_READ_PROBE.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_READ_PROBE.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S

PREFIX = [0xf0, 0x00, 0x01, 0x74, S.MODEL]

def read_only_shape(frame):
    """Return the request kind if `frame` is one of the allowed read-only shapes, else None."""
    f = list(frame)
    if len(f) < 8 or f[:5] != PREFIX or f[-1] != 0xf7 or S.checksum(f[:-2]) != f[-2]: return None
    if any(b > 0x7f for b in f[1:-1]): return None
    fn, payload = f[5], f[6:-2]
    if fn == 0x01 and len(payload) == 15 and payload[0] == 0x2e and payload[1:] == [0] * 14: return 'grid'
    if fn == 0x01 and len(payload) == 15 and payload[0] == 0x1f and payload[1] == 0 and payload[6:] == [0] * 9: return 'display'
    if fn == 0x1f and len(payload) == 2: return 'bulk'
    if fn == 0x43 and payload == []: return 'editBufferDump'
    if fn == 0x03 and len(payload) == 3 and payload[2] == 0: return 'storedDump'
    return None

def collect(port, quiet=0.4, max_wait=4.0):
    """All complete frames until `quiet` s without new data (max `max_wait` s)."""
    port.framer.frames.clear(); end = time.monotonic() + max_wait; last_n = 0; last_t = time.monotonic()
    while time.monotonic() < end:
        port.drain(0.05)
        n = len(port.framer.frames)
        if n != last_n: last_n = n; last_t = time.monotonic()
        elif n and time.monotonic() - last_t >= quiet: break
    return [bytes(f).hex() for f in port.framer.frames]

def run(pack, session, port_path):
    manifest_bytes = (pack / 'manifest.json').read_bytes(); manifest = json.loads(manifest_bytes)
    S.check(manifest.get('kind') == 'fm3-read-probe', 'Not a read-probe pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    reqs = []
    for r in manifest['requests']:
        b = bytes.fromhex(r['request']); kind = read_only_shape(b)
        S.check(kind == r['kind'], 'Not an allowed read-only request: %s (%s)' % (r['label'], r['request']))
        reqs.append((r, b))
    session.mkdir(parents=True, exist_ok=True); out = session / 'probe-results.json'
    S.check(not out.exists(), 'Session already has probe-results.json; use a new --session folder.')
    print('Pakk kontrollitud: 1 preset, %d lugemispäringut (kõik ainult lugemiseks).' % len(reqs))
    result = {'kind': 'fm3-read-probe-results', 'packSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'sentDumpHex': [f.hex() for f in dump], 'replies': []}
    port = S.Port(port_path)
    try:
        for f in dump: port.write(f); time.sleep(0.03)
        port.drain(0.3)
        time.sleep(1.5)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        result['userConfirmedName'] = ans.startswith('j')
        S.check(result['userConfirmedName'], 'Seade ei laadinud presetti redaktsioonipuhvrisse; lugemist ei tehtud, midagi ei salvestatud.')
        for n, (r, b) in enumerate(reqs, 1):
            port.framer.frames.clear(); port.write(b)
            frames = collect(port, max_wait=6.0 if r['kind'] in ('editBufferDump', 'storedDump') else 4.0)
            result['replies'].append({'label': r['label'], 'kind': r['kind'], 'request': r['request'], 'frames': frames})
            print('[%2d/%d] %-45s vastuseid: %d' % (n, len(reqs), r['label'][:45], len(frames)))
            time.sleep(0.1)
    finally:
        port.close()
        out.write_text(json.dumps(result, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). Midagi ei salvestatud.')

def self_test():
    ok = [bytes.fromhex(h) for h in ['f000017411012e00000000000000000000000000003bf7', 'f000017411011f003a00060000000000000000000036f7',
                                       'f0000174111f3a0031f7', 'f0000174114357f7', 'f0000174110303330027f7']]
    S.check([read_only_shape(f) for f in ok] == ['grid', 'display', 'bulk', 'editBufferDump', 'storedDump'], 'allowed shapes')
    def fix(h):
        f = bytearray(bytes.fromhex(h)); f[-2] = S.checksum(list(f[:-2])); return bytes(f)
    bad = [fix('f000017411010900' + '3a0006' + '00' * 9 + '00f7'),      # sub 09 00 = SET with zero value
           fix('f00001741101520' + '03a0006' + '00' * 9 + '00f7'),      # continuous SET
           fix('f000017411011f003a000600000000010000000000' + '00f7'),  # display read carrying a value
           fix('f00001741101260000000000f7'),                           # store (sub 0x26)
           fix('f0000174110303330100f7'),                               # stored dump with non-zero flag
           bytes.fromhex('f0000174111f3a0030f7')]                       # bad checksum
    S.check(all(read_only_shape(f) is None for f in bad), 'refused shapes')
    print(json.dumps({'selfTest': 'passed', 'allowed': 5, 'refused': len(bad)}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
