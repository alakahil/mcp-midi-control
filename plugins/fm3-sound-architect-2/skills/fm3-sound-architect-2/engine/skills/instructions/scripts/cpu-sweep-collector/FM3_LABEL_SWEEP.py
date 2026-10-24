#!/usr/bin/env python3
"""FM3 list-label sweep (audit point 3). macOS/Linux, POSIX serial, no pyserial. Automatic.

Asks the FM3 for the label of every value of every list parameter in the pack and saves the
texts, so the generator's dictionaries can be compared offline with the device's own names.
The request is the fn=0x01 sub=0x1F display read with the list index n as a plain 14-bit
integer in its value field. On FM3 fw 13 the reply carries the label of index n (label probe
2026-10-24: integers 1, 18 / 5, 2 gave the dictionary names; float32(n) gives no label; the reply
value field stays zero). Sub-action 1F 00 is not a SET sub-action (SET is 09 00 / 52 00), and the
probe re-read the whole preset unchanged after every request.

Device frames: one manifest-pinned edit-buffer dump (0x77 header 7F 00 00 40 00, SHA-256
checked) and the read-only shapes of FM3_READ_PROBE.read_only_shape (grid, bulk read, display
and label reads), checked byte by byte before sending. No store, no SET, no preset or scene
change. Safety: the grid and every block of the pack preset are read first; after the first
label request and after every block's sweep they are read again, and the script stops at the
first difference (then select another preset on the FM3 without saving).

Pacing: 20 ms between requests and a grid health check every 50 requests. Results are saved
after every parameter; running again with the same --session resumes where it stopped.

Usage:
  python3 FM3_LABEL_SWEEP.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_LABEL_SWEEP.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, struct, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
import FM3_GRID_CHECK as G
from FM3_READ_PROBE import read_only_shape, label_index
from FM3_VALUE_CHECK import bulk_values, load

def label_request(eid, pid, index):
    f = [0xf0, 0, 1, 0x74, S.MODEL, 0x01, 0x1f, 0x00, eid & 0x7f, eid >> 7, pid & 0x7f, pid >> 7] + [index & 0x7f, (index >> 7) & 0x7f, 0, 0, 0] + [0, 0, 0, 0]
    f = bytes(f + [S.checksum(f), 0xf7])
    S.check(read_only_shape(f) == ('display' if index == 0 else 'labelInt'), 'Refusing non-read request: %s' % f.hex())
    return f

def unpack(w, n):
    o = [0] * n
    for i, b in enumerate(w):
        k = i + 1; b &= 0x7f
        if 0 < i and i - 1 < n: o[i - 1] |= ((~(0x7f >> k) & b) >> (8 - k)) & 0xff
        if i < n: o[i] = (b << k) & 0xff
    return o

def parse_label(frame):
    """(effectId, paramId, value-index or None, text) of an fn=0x01 sub 1F reply, else None."""
    f = list(frame)
    if len(f) < 23 or f[:5] != [0xf0, 0, 1, 0x74, S.MODEL] or f[5] != 0x01 or f[-1] != 0xf7: return None
    p = f[6:-2]
    if p[0] != 0x1f or p[1] != 0: return None
    n = (p[13] & 0x7f) | ((p[14] & 0x7f) << 7); out = []; w = p[15:]; r = 0
    while r < n:
        c = min(7, n - r); cw = 8 if c == 7 else c + 1; out += unpack(w[:cw], c); w = w[cw:]; r += c
    while out and out[-1] in (0, 0x20): out.pop()
    idx = label_index(p[6:11]) if p[6:11] != [0] * 5 else 0
    return (p[2] | p[3] << 7, p[4] | p[5] << 7, idx, bytes(out).decode('latin-1'))

def ask_label(port, eid, pid, index, timeout=0.8):
    """Send one label request; return (parsed reply or None, reply hex or None)."""
    req = label_request(eid, pid, index)
    port.framer.frames.clear(); port.write(req); end = time.monotonic() + timeout
    while time.monotonic() < end:
        port.drain(0.01)
        for fr in port.framer.frames:
            r = parse_label(fr)
            if r and r[0] == eid and r[1] == pid: return r, bytes(fr).hex()
    return None, None

def gather(port, quiet, max_wait):
    """Frames received since the request (the buffer was cleared before writing it)."""
    end = time.monotonic() + max_wait; last_n = -1; last_t = time.monotonic()
    while time.monotonic() < end:
        port.drain(0.05); n = len(port.framer.frames)
        if n != last_n: last_n = n; last_t = time.monotonic()
        elif n and time.monotonic() - last_t >= quiet: break
    return [bytes(f).hex() for f in port.framer.frames]

def read_grid(port, req, tries=4):
    for _ in range(tries):
        port.framer.frames.clear(); port.write(req)
        for h in gather(port, quiet=0.2, max_wait=2.0):
            f = list(bytes.fromhex(h))
            if S.parse_raw(f) is not None: return G.decode_grid(f)
        time.sleep(0.3)
    S.check(False, 'FM3 ei vastanud ruudustiku päringule.')

def read_block(port, fam):
    req = bytes.fromhex(fam['bulkRequest']); S.check(read_only_shape(req) == 'bulk', 'bulk request shape')
    port.framer.frames.clear(); port.write(req)
    return bulk_values([bytes.fromhex(h) for h in gather(port, quiet=0.3, max_wait=4.0)], fam['effectId'])

def unchanged(port, manifest, base, fams, where):
    """Re-read the grid and the given present blocks; stop at the first difference."""
    g = read_grid(port, bytes.fromhex(manifest['gridRequest']))
    S.check(g == base['grid'], 'PEATUS: ruudustik muutus pärast %s. Vali FM3-l mõni muu preset, ÄRA salvesta.' % where)
    for f in fams:
        if not f['present']: continue
        S.check(read_block(port, f) == base['blocks'][str(f['effectId'])],
                'PEATUS: plokk %s muutus pärast %s. Vali FM3-l mõni muu preset, ÄRA salvesta.' % (f['slug'], where))

PACE = 0.02         # s between label requests
HEALTH_EVERY = 50   # label requests between grid health checks

def healthy(port, manifest, base, state, where):
    """Grid read with patient retries (the FM3 must still answer and the grid must be unchanged)."""
    state['sinceHealth'] = 0
    try: g = read_grid(port, bytes.fromhex(manifest['gridRequest']), tries=12)
    except SystemExit: S.check(False, 'PEATUS: FM3 lakkas vastamast (%s). Vali FM3-l mõni muu preset, ÄRA salvesta. Kui FM3 ei reageeri, lülita see välja ja uuesti sisse.' % where)
    S.check(g == base['grid'], 'PEATUS: ruudustik muutus (%s). Vali FM3-l mõni muu preset, ÄRA salvesta.' % where)

def sweep_param(port, f, p, extra, manifest=None, base=None, state=None):
    texts = []; missing = []
    for i in range(p['count'] + extra):
        if state is not None:
            state['last'] = {'block': f['slug'], 'param': p['name'], 'index': i}
            if state['sinceHealth'] >= HEALTH_EVERY: healthy(port, manifest, base, state, '%s %s indeks %d' % (f['slug'], p['name'], i))
            state['sinceHealth'] += 1
        time.sleep(PACE)
        r, _ = ask_label(port, f['effectId'], p['paramId'], i)
        if r is None: missing.append(i); texts.append(None)
        else: texts.append(r[3])
        if i == 2 and not any(texts):  # three silent or text-less replies: this parameter gives no labels
            return {'paramId': p['paramId'], 'name': p['name'], 'count': p['count'], 'texts': texts, 'noReply': missing, 'stopped': 'no text for indexes 0..2'}
    return {'paramId': p['paramId'], 'name': p['name'], 'count': p['count'], 'texts': texts, 'noReply': missing}

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-label-sweep', 'Not a label-sweep pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    S.check(read_only_shape(bytes.fromhex(manifest['gridRequest'])) == 'grid', 'grid request shape')
    fams = manifest['families']; extra = manifest['extra']; pilot = manifest['pilot']
    for f in fams:
        for p in f['params']: label_request(f['effectId'], p['paramId'], p['count'] + extra - 1)  # every frame passes the shape check
    session.mkdir(parents=True, exist_ok=True); out = session / 'label-results.json'
    pack_sha = hashlib.sha256(mb).hexdigest(); prior = {}
    if out.exists():  # resume: keep every parameter already swept in this session
        old = json.loads(out.read_text())
        S.check(old.get('kind') == 'fm3-label-sweep-results' and old.get('packSha256') == pack_sha, 'Sessioonis on teise paki tulemused; kasuta uut --session kausta.')
        S.check(not old.get('finalUnchanged'), 'See seanss on juba lõpetatud; kasuta uut --session kausta.')
        prior = {(r['effectId'], p['paramId']): p for r in old.get('families', []) for p in r['params']}
        print('Jätkan varasemat seanssi: %d parameetrit juba loetud.' % len(prior))
    res = {'kind': 'fm3-label-sweep-results', 'packSha256': pack_sha, 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'families': [], 'resumedParams': len(prior)}
    def save():
        tmp = out.with_suffix('.tmp'); tmp.write_text(json.dumps(res, ensure_ascii=False) + '\n'); tmp.replace(out)
    total = sum(p['count'] + extra for f in fams for p in f['params']); done = 0; t0 = time.monotonic()
    state = {'sinceHealth': 0, 'last': None}
    port = S.Port(port_path)
    try:
        load(port, dump); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        res['userConfirmedName'] = True
        time.sleep(1.0)
        base = {'grid': read_grid(port, bytes.fromhex(manifest['gridRequest'])), 'blocks': {}}
        for f in fams:
            if f['present']: base['blocks'][str(f['effectId'])] = read_block(port, f)
        res['baselineGrid'] = base['grid']
        res['baselineMatchesPack'] = {'grid': base['grid'] == manifest['expectedGrid'],
                                      'blocks': all(base['blocks'][str(f['effectId'])] == f['expectedWords'] for f in fams if f['present'])}
        print('Algseis loetud: ruudustik ja %d plokki.' % len(base['blocks']))
        # Pilot: one label request, then everything must read back unchanged.
        r, h = ask_label(port, pilot['effectId'], pilot['paramId'], pilot['index'])
        res['pilot'] = {'request': label_request(pilot['effectId'], pilot['paramId'], pilot['index']).hex(), 'reply': h, 'parsed': list(r) if r else None}
        unchanged(port, manifest, base, fams, 'esimest päringut')
        res['pilot']['unchanged'] = True
        S.check(r is not None and r[3] == pilot['label'], 'Esimene päring ei andnud oodatud silti; peatun. Seade loeti üle: midagi ei muutunud.')
        print('Ohutuskontroll läbitud: "%s" (indeks %d); seade ei muutunud.' % (r[3], pilot['index'])); save()
        for f in fams:
            rec = {'family': f['family'], 'slug': f['slug'], 'effectId': f['effectId'], 'present': f['present'], 'params': []}
            res['families'].append(rec)
            if not f['present']:
                p0 = f['params'][0]; probe = []
                for i in (0, 1): time.sleep(PACE); probe.append(ask_label(port, f['effectId'], p0['paramId'], i)[0])
                rec['absentProbe'] = [list(x) if x else None for x in probe]
                if not any(x and x[3] for x in probe):
                    rec['skipped'] = 'block not in the preset and no label reply'; save()
                    done += sum(p['count'] + extra for p in f['params']); continue
            for p in f['params']:
                key = (f['effectId'], p['paramId'])
                rec['params'].append(prior[key] if key in prior else sweep_param(port, f, p, extra, manifest, base, state))
                done += p['count'] + extra; save()
            unchanged(port, manifest, base, [f], 'ploki %s päringuid' % f['slug'])
            rec['unchanged'] = True; save(); state['sinceHealth'] = 0
            got = sum(1 for p in rec['params'] for t in p['texts'] if t)
            print('  %-12s %3d parameetrit, %4d silti  (%d%%, %.0f s)' % (f['slug'], len(rec['params']), got, 100 * done // total, time.monotonic() - t0))
        unchanged(port, manifest, base, fams, 'kõiki päringuid')
        res['finalUnchanged'] = True
    except SystemExit:
        res['stoppedAt'] = state['last']; raise
    finally:
        port.close(); save()
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    f = label_request(58, 6, 16)
    S.check(read_only_shape(f) == 'labelInt' and read_only_shape(label_request(58, 6, 0)) == 'display', 'request shapes')
    S.check(list(f[12:17]) == [16, 0, 0, 0, 0] and list(label_request(58, 6, 300)[12:17]) == [44, 2, 0, 0, 0], 'integer value field')
    # Replies pinned from the 2026-10-23 read probe: amp type (value 0) and amp drive (a knob: no text).
    t = parse_label(bytes.fromhex('f000017411011f003a0006000000000000000012001a4e240413056673335d2f1202096469335a0e400021f7'))
    S.check(t == (58, 6, 0, '59 Bassguy Bright'), 'type reply: %r' % (t,))
    k = parse_label(bytes.fromhex('f000017411011f003a0007000f6e1e670d0000000022f7'))
    S.check(k is not None and k[:2] == (58, 7) and k[3] == '', 'knob reply: %r' % (k,))
    S.check(parse_label(bytes.fromhex('f0000174111f3a0031f7')) is None, 'not a label reply')
    print(json.dumps({'selfTest': 'passed', 'replies': 2}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
