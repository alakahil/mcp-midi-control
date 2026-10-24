#!/usr/bin/env python3
"""FM3 grid mask bit-4 check (test 7, audit point 5). macOS/Linux, POSIX serial, no pyserial.

A few factory grid cells carry input-mask bit 4 (value 16), whose meaning is unknown. For each
pack item the USER selects that factory location on the FM3 front panel; the script then reads
the location with the read-only fn=0x03 stored-preset dump request and the live grid with
fn=0x01 sub=0x2E, shows the target cell, and asks what the LAYOUT screen shows there.

The script sends no preset and no change: only the read-only shapes of
FM3_READ_PROBE.read_only_shape (grid, stored dump). No store, no SET, no preset or scene change.

Usage:
  python3 FM3_BIT4_CHECK.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_BIT4_CHECK.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
import FM3_GRID_CHECK as G
from FM3_READ_PROBE import read_only_shape

def gather(port, quiet, max_wait):
    end = time.monotonic() + max_wait; last_n = -1; last_t = time.monotonic()
    while time.monotonic() < end:
        port.drain(0.05); n = len(port.framer.frames)
        if n != last_n: last_n = n; last_t = time.monotonic()
        elif n and time.monotonic() - last_t >= quiet: break
    return [bytes(f).hex() for f in port.framer.frames]

def send(port, frame, kind):
    S.check(read_only_shape(frame) == kind, 'Refusing non-read request: %s' % frame.hex())
    port.framer.frames.clear(); port.write(frame)

def live_grid(port, req):
    """Two identical grid decodes in a row (or the last one); None if the FM3 does not answer."""
    last = None
    for _ in range(8):
        send(port, req, 'grid')
        for h in gather(port, 0.2, 2.0):
            f = list(bytes.fromhex(h))
            if S.parse_raw(f) is not None:
                g = G.decode_grid(f)
                if g == last: return g
                last = g; break
        time.sleep(0.3)
    return last

def cell(grid, row, col):
    return next(c for c in grid if c[0] == row - 1 and c[1] == col - 1)

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-bit4-check', 'Not a bit-4 check pack')
    greq = bytes.fromhex(manifest['gridRequest']); S.check(read_only_shape(greq) == 'grid', 'grid request')
    for it in manifest['items']: S.check(read_only_shape(bytes.fromhex(it['storedDumpRequest'])) == 'storedDump', 'stored dump request')
    session.mkdir(parents=True, exist_ok=True); out = session / 'bit4-results.json'
    S.check(not out.exists(), 'Sessioonis on juba bit4-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-bit4-check-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'items': []}
    port = S.Port(port_path)
    try:
        for n, it in enumerate(manifest['items'], 1):
            c = it['cell']
            note = input('\n[%d/%d] Vali FM3-l preset nr %d (tehasepank %s). ÄRA salvesta midagi.\n'
                         '  Kui ekraanil on preset %d, kirjuta "ok" ja Enter (kui seal on mõni muu/sinu enda preset, kirjuta see). > '
                         % (n, len(manifest['items']), it['shownLocation'], it['bank'], it['shownLocation'])).strip()
            rec = {'id': it['id'], 'shownLocation': it['shownLocation'], 'userSelected': note}
            send(port, bytes.fromhex(it['storedDumpRequest']), 'storedDump'); rec['storedDumpFrames'] = gather(port, 0.4, 6.0)
            time.sleep(0.5); g = live_grid(port, greq)
            S.check(g is not None, 'FM3 ei vastanud ruudustiku päringule.')
            rec['liveGrid'] = g; got = cell(g, c['row'], c['col'])
            rec['liveCell'] = got[2:]; rec['gridEqualsFactory'] = g == it['expectedGrid']
            rec['gridEqualsFactoryWithoutBit4'] = [x[:3] + [x[3] & 15] for x in g] == [x[:3] + [x[3] & 15] for x in it['expectedGrid']]
            print('  Ruudustik loetud. Rida %d veerg %d: id %d, mask %d (bitt 4 %s); tehasefailis id %d, mask %d. Kogu ruudustik %s tehasefailiga.'
                  % (c['row'], c['col'], got[2], got[3], 'sees' if got[3] & 16 else 'väljas', c['id'], c['mask'], 'klapib' if rec['gridEqualsFactory'] else 'EI klapi'))
            rec['userLayout'] = input('  Vajuta LAYOUT ja vaata rida %d, veerg %d (%s, sisend ridadest %s). Ära muuda midagi.\n'
                                      '  Kirjelda, mida seal näed: millised kaablid sinna tulevad ja kas midagi on teistmoodi kui tavaliselt. > '
                                      % (c['row'], c['col'], c['what'], ', '.join(map(str, c['inputsFromRows'])))).strip()
            res['items'].append(rec)
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Skript ei saatnud ühtegi presetti ega salvestanud midagi.')

def self_test():
    S.check(read_only_shape(bytes.fromhex('f0000174110303330027f7')) == 'storedDump', 'stored dump shape')
    g = G.decode_grid(G.GOLDEN); S.check(len(g) == 48 and cell(g, 1, 1)[:2] == [0, 0], 'grid decode')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
