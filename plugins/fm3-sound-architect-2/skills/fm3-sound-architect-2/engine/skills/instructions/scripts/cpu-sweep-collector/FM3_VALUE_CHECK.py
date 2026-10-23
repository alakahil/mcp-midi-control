#!/usr/bin/env python3
"""FM3 value check + STORE/reload check. macOS/Linux, POSIX serial, no pyserial.

Part 1 (automatic): every pack preset is sent to the edit buffer (0x77 header 7F 00 00 40 00,
SHA-256 checked) and read back: the grid with fn=0x01 sub=0x2E and every block with the fn=0x1F
bulk read (all words of all channels). Each value must equal the word the generator wrote.
Part 2 (with the user): the store preset is loaded once more; the USER stores it to location 436
on the FM3 front panel (this script never sends a store); the script reads location 436 back with
the read-only fn=0x03 dump request; the user then selects another preset and 436 again (reload),
and the script repeats the block and grid read.

Device frames: edit-buffer dumps and the read-only shapes accepted by FM3_READ_PROBE.read_only_shape
(grid, bulk read, stored-preset dump). No parameter SET, no store, no preset or scene change.

Usage:
  python3 FM3_VALUE_CHECK.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX] [--skip-store]
  python3 FM3_VALUE_CHECK.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
import FM3_GRID_CHECK as G
from FM3_READ_PROBE import read_only_shape, collect

def unpack16(b0, b1, b2):
    return (b0 & 0x7f) | ((b1 & 0x7f) << 7) | ((b2 & 0x03) << 14)

def bulk_values(frames, effect_id):
    """Assemble one fn=0x1F reply: 0x74 head (block id, item count), 0x75 bodies, 0x76 end."""
    head = None; values = []; ended = False
    for f in frames:
        if list(f[:5]) != [0xf0, 0, 1, 0x74, S.MODEL] or f[-1] != 0xf7: continue
        if f[5] == 0x74 and head is None and len(f) >= 11:
            head = ((f[6] & 0x7f) | (f[7] & 0x7f) << 7, (f[8] & 0x7f) | (f[9] & 0x7f) << 7)
        elif f[5] == 0x75 and head is not None:
            for i in range(8, len(f) - 4, 3): values.append(unpack16(f[i], f[i + 1], f[i + 2]))
        elif f[5] == 0x76 and head is not None: ended = True
    S.check(head is not None, 'fn=0x1F: no reply head for effect %d' % effect_id)
    S.check(head[0] == effect_id, 'fn=0x1F: reply for effect %d, expected %d' % (head[0], effect_id))
    S.check(ended and len(values) == head[1], 'fn=0x1F: incomplete reply for effect %d (%d of %d values)' % (effect_id, len(values), head[1]))
    return values

def send_checked(port, frame, kind):
    S.check(read_only_shape(frame) == kind, 'Refusing non-read request: %s' % frame.hex())
    port.framer.frames.clear(); port.write(frame)

def read_preset(port, it, grid_req):
    """Grid (2 identical reads) and every block; returns a result record."""
    rec = {'grid': None, 'gridMatches': False, 'blocks': []}
    time.sleep(1.2); last = None
    for _ in range(8):
        send_checked(port, grid_req, 'grid'); fr = [list(bytes.fromhex(h)) for h in collect(port, quiet=0.2, max_wait=2.0)]
        g = next((G.decode_grid(f) for f in fr if S.parse_raw(f) is not None), None)
        if g is not None and g == last: break
        last = g; time.sleep(0.3)
    S.check(last is not None, 'FM3 ei vastanud ruudustiku päringule.')
    rec['grid'] = last; rec['gridMismatches'] = G.compare(it['expectedGrid'], last); rec['gridMatches'] = not rec['gridMismatches']
    for b in it['blocks']:
        send_checked(port, bytes.fromhex(b['request']), 'bulk')
        frames = [bytes.fromhex(h) for h in collect(port, quiet=0.3, max_wait=4.0)]
        vals = bulk_values(frames, b['effectId'])
        diff = [{'channel': 'ABCD'[i // b['words']], 'pid': i % b['words'], 'expected': e, 'device': v}
                for i, (e, v) in enumerate(zip(b['expected'], vals)) if e != v]
        if len(vals) != len(b['expected']): diff.append({'lengthExpected': len(b['expected']), 'lengthDevice': len(vals)})
        rec['blocks'].append({'family': b['family'], 'effectId': b['effectId'], 'values': len(vals), 'matches': not diff, 'mismatches': diff[:40]})
    rec['allMatch'] = rec['gridMatches'] and all(x['matches'] for x in rec['blocks'])
    return rec

def load(port, frames):
    for f in frames: port.write(f); time.sleep(0.03)
    port.drain(0.3)

def run(pack, session, port_path, skip_store):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-value-check', 'Not a value-check pack')
    grid_req = bytes.fromhex(manifest['gridRequest']); S.check(read_only_shape(grid_req) == 'grid', 'grid request')
    dumps = {}
    for it in manifest['items']:
        data = (pack / it['file']).read_bytes()
        S.check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
        dumps[it['id']] = S.dump_frames(data)
        for b in it['blocks']: S.check(read_only_shape(bytes.fromhex(b['request'])) == 'bulk', 'bulk request ' + it['id'])
    st = manifest['store']; S.check(read_only_shape(bytes.fromhex(st['storedDumpRequest'])) == 'storedDump', 'stored dump request')
    session.mkdir(parents=True, exist_ok=True); out = session / 'value-results.json'
    S.check(not out.exists(), 'Sessioonis on juba value-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-value-check-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'presets': []}
    print('Pakk kontrollitud: %d presetti, %d plokki.' % (len(manifest['items']), sum(len(i['blocks']) for i in manifest['items'])))
    port = S.Port(port_path)
    try:
        for n, it in enumerate(manifest['items'], 1):
            load(port, dumps[it['id']])
            if n == 1:
                time.sleep(1.0)
                ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
                S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
                res['userConfirmedName'] = True
            r = read_preset(port, it, grid_req); r['id'] = it['id']; r['name'] = it['name']; res['presets'].append(r)
            bad = [b['family'] for b in r['blocks'] if not b['matches']]
            print('[%d/%d] %-26s ruudustik %s, plokid %d/%d klapivad%s' % (n, len(manifest['items']), it['name'][:26],
                  'KLAPIB' if r['gridMatches'] else 'ERINEB', len(r['blocks']) - len(bad), len(r['blocks']), (' (erinevad: ' + ', '.join(bad) + ')') if bad else ''))
        if not skip_store:
            it = next(i for i in manifest['items'] if i['id'] == st['presetId'])
            load(port, dumps[it['id']]); time.sleep(1.0)
            print('\nSALVESTUSE KATSE. FM3 redaktsioonipuhvris on nüüd "%s".' % it['name'])
            input('Salvesta see FM3 esipaneelilt kohta %d (STORE, vali %d, kinnita). Kui valmis, vajuta Enter. ' % (st['shownLocation'], st['shownLocation']))
            req = bytes.fromhex(st['storedDumpRequest']); send_checked(port, req, 'storedDump')
            frames = collect(port, quiet=0.4, max_wait=6.0)
            res['storedDump'] = {'location': st['shownLocation'], 'frames': frames}
            print('Koht %d loetud: %d kaadrit.' % (st['shownLocation'], len(frames)))
            input('Vali FM3-l mõni teine preset ja seejärel uuesti %d (uuesti laadimine). Kui ekraanil on taas "%s", vajuta Enter. ' % (st['shownLocation'], it['name']))
            r = read_preset(port, it, grid_req); r['id'] = it['id'] + '-reloaded'; res['reloaded'] = r
            print('Uuesti laaditud: ruudustik %s, plokid %d/%d klapivad' % ('KLAPIB' if r['gridMatches'] else 'ERINEB',
                  sum(b['matches'] for b in r['blocks']), len(r['blocks'])))
    finally:
        port.close()
        out.write_text(json.dumps(res, indent=1) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset. Skript ei salvestanud midagi.')

def self_test():
    vals = [0, 1, 0x7f, 0x80, 0x3fff, 0x4000, 0xffff, 65534]
    def frame(fn, body):
        f = [0xf0, 0, 1, 0x74, S.MODEL, fn] + body; return bytes(f + [S.checksum(f), 0xf7])
    head = frame(0x74, [58, 0, len(vals), 0])
    body = frame(0x75, [0, 0] + sum([[v & 0x7f, (v >> 7) & 0x7f, (v >> 14) & 3] for v in vals], []))
    end = frame(0x76, [])
    S.check(bulk_values([head, body, end], 58) == vals, 'bulk decode')
    for frames, why in [([body, end], 'no head'), ([head, body], 'no end'), ([frame(0x74, [59, 0, len(vals), 0]), body, end], 'wrong block')]:
        try: bulk_values(frames, 58); raise AssertionError('accepted ' + why)
        except SystemExit: pass
    print(json.dumps({'selfTest': 'passed', 'bulkValues': len(vals)}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--skip-store', action='store_true'); ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port(), a.skip_store)
