#!/usr/bin/env python3
"""FM3 label-request probe (audit point 3, ~1 min, automatic). macOS/Linux, POSIX serial.

The first label sweep (2026-10-24) showed that a display read (fn=0x01 sub=0x1F) carrying
float32(1) gets a short reply without text, while the zero value gets the label of list index 0.
This probe sends a few value-field encodings of the same request, ONE at a time, and after each
re-reads the grid and every block of the pack preset (stops at the first difference), so we
learn which encoding, if any, makes the FM3 label a chosen list value.

Device frames: one manifest-pinned edit-buffer dump (0x77 header 7F 00 00 40 00, SHA-256
checked) and the read-only shapes of FM3_READ_PROBE.read_only_shape. No store, no SET.

Usage:
  python3 FM3_LABEL_PROBE.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_LABEL_PROBE.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
import FM3_LABEL_SWEEP as L
from FM3_READ_PROBE import read_only_shape
from FM3_VALUE_CHECK import load

ALLOWED = ('display', 'label', 'labelInt')

def request(eid, pid, field):
    f = [0xf0, 0, 1, 0x74, S.MODEL, 0x01, 0x1f, 0x00, eid & 0x7f, eid >> 7, pid & 0x7f, pid >> 7] + list(field) + [0, 0, 0, 0]
    f = bytes(f + [S.checksum(f), 0xf7])
    S.check(read_only_shape(f) in ALLOWED, 'Refusing non-read request: %s' % f.hex())
    return f

def ask(port, req, eid, pid, timeout=1.0):
    port.framer.frames.clear(); port.write(req); end = time.monotonic() + timeout
    while time.monotonic() < end:
        port.drain(0.01)
        for fr in port.framer.frames:
            r = L.parse_label(fr)
            if r and r[0] == eid and r[1] == pid: return r, bytes(fr).hex(), [bytes(x).hex() for x in port.framer.frames]
    return None, None, [bytes(x).hex() for x in port.framer.frames]

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-label-probe', 'Not a label-probe pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data); fams = manifest['families']
    reqs = [(v, request(v['effectId'], v['paramId'], v['field'])) for v in manifest['variants']]
    session.mkdir(parents=True, exist_ok=True); out = session / 'label-probe-results.json'
    S.check(not out.exists(), 'Sessioonis on juba label-probe-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-label-probe-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'variants': []}
    port = S.Port(port_path)
    try:
        load(port, dump); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        time.sleep(1.0)
        base = {'grid': L.read_grid(port, bytes.fromhex(manifest['gridRequest'])), 'blocks': {}}
        for f in fams: base['blocks'][str(f['effectId'])] = L.read_block(port, f)
        res['baselineMatchesPack'] = {'grid': base['grid'] == manifest['expectedGrid'], 'blocks': all(base['blocks'][str(f['effectId'])] == f['expectedWords'] for f in fams)}
        print('Algseis loetud: ruudustik ja %d plokki.' % len(fams))
        for n, (v, req) in enumerate(reqs, 1):
            r, h, frames = ask(port, req, v['effectId'], v['paramId'])
            rec = {'id': v['id'], 'what': v['what'], 'request': req.hex(), 'reply': h, 'otherFrames': [x for x in frames if x != h],
                   'parsed': {'effectId': r[0], 'paramId': r[1], 'valueIndex': r[2], 'text': r[3], 'valueField': list(bytes.fromhex(h)[12:17])} if r else None}
            res['variants'].append(rec)
            L.unchanged(port, manifest, base, fams, 'päringut %s' % v['id'])
            rec['unchanged'] = True
            print('[%d/%d] %-34s -> %s' % (n, len(reqs), v['what'][:34], ('"%s"' % r[3]) if r and r[3] else ('vastus ilma tekstita' if r else 'vastust pole')))
        res['finalUnchanged'] = True
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n')
    print('\nValmis. Seade loeti pärast iga päringut üle: midagi ei muutunud. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    S.check(read_only_shape(request(58, 6, [18, 0, 0, 0, 0])) == 'labelInt', 'integer form')
    S.check(read_only_shape(request(58, 6, [0, 0, 0, 0x0c, 0x04])) == 'label', 'float form')
    S.check(read_only_shape(request(58, 6, [0] * 5)) == 'display', 'zero form')
    try: request(58, 6, [0, 0, 0, 120, 3]); raise AssertionError('accepted float 0.5')
    except SystemExit: pass
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
