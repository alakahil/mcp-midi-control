#!/usr/bin/env python3
"""FM3 front-panel step-diff collector (tests 4 and 5). macOS/Linux, POSIX serial, no pyserial.

Loads the pack preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked). For each
step the USER changes ONE field on the FM3 front panel and types what the screen shows; the script
then reads every watched block with the read-only fn=0x1F bulk read and prints which words changed
since the previous step (channel A-D, parameter word, before -> after).
Device frames: one edit-buffer dump and read-only bulk reads (FM3_READ_PROBE.read_only_shape).
No parameter SET, no store, no preset or scene change by the script.

Usage:
  python3 FM3_STEP_DIFF.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_STEP_DIFF.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape
from FM3_VALUE_CHECK import bulk_values, load

def gather(port, quiet, max_wait):
    """Frames received since the request (the buffer was cleared before writing it)."""
    end = time.monotonic() + max_wait; last_n = -1; last_t = time.monotonic()
    while time.monotonic() < end:
        port.drain(0.05); n = len(port.framer.frames)
        if n != last_n: last_n = n; last_t = time.monotonic()
        elif n and time.monotonic() - last_t >= quiet: break
    return [bytes(f).hex() for f in port.framer.frames]

def read_block(port, b):
    req = bytes.fromhex(b['bulkRequest']); S.check(read_only_shape(req) == 'bulk', 'bulk request shape')
    port.framer.frames.clear(); port.write(req)
    frames = gather(port, quiet=0.3, max_wait=4.0)
    vals = bulk_values([bytes.fromhex(h) for h in frames], b['effectId'])
    S.check(len(vals) == b['words'] * b['channels'], 'Plokk %s vastas %d väärtusega, oodati %d' % (b['slug'], len(vals), b['words'] * b['channels']))
    return frames, vals

def diff(b, a, z):
    return [{'block': b['slug'], 'channel': 'ABCD'[i // b['words']], 'param': i % b['words'], 'before': x, 'after': y}
            for i, (x, y) in enumerate(zip(a, z)) if x != y]

def show(c):
    return '%s %s sõna %d: %d -> %d' % (c['block'], c['channel'], c['param'], c['before'], c['after'])

def run(pack, session, port_path):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-step-diff', 'Not a step-diff pack')
    data = (pack / manifest['preset']['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == manifest['preset']['sha256'], 'SHA-256 mismatch: preset')
    dump = S.dump_frames(data)
    for b in manifest['blocks']: S.check(read_only_shape(bytes.fromhex(b['bulkRequest'])) == 'bulk', 'bulk request shape')
    session.mkdir(parents=True, exist_ok=True); out = session / 'step-diff-results.json'
    S.check(not out.exists(), 'Sessioonis on juba step-diff-results.json; kasuta uut --session kausta.')
    res = {'kind': 'fm3-step-diff-results', 'packSha256': hashlib.sha256(mb).hexdigest(), 'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'steps': []}
    port = S.Port(port_path)
    try:
        load(port, dump); time.sleep(1.0)
        ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
        S.check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
        time.sleep(0.5)
        prev = {}; base = {}
        for b in manifest['blocks']:
            fr, vals = read_block(port, b); prev[b['slug']] = vals; base[b['slug']] = {'frames': fr, 'words': vals}
        res['baseline'] = base
        res['baselineMatchesPack'] = all(base[b['slug']]['words'] == b['expectedWords'] for b in manifest['blocks'])
        print('Algseis loetud: %s.' % ', '.join(b['slug'] for b in manifest['blocks']))
        where = None
        for n, st in enumerate(manifest['steps'], 1):
            if st['where'] != where:
                where = st['where']; input('\nAva FM3-l: %s. Kui leht on avatud, vajuta Enter. ' % where)
            note = input('\n[%d/%d] %s\n  Kirjuta, mida ekraan nüüd selle välja juures näitab (nt "-40.0 dB"), ja Enter.\n'
                         '  (Kui seda ei saa teha, kirjuta "vahele".) > ' % (n, len(manifest['steps']), st['text'])).strip()
            rec = {'step': n, 'id': st['id'], 'asked': st['text'], 'userReading': note, 'changed': [], 'words': {}}
            for b in manifest['blocks']:
                _, vals = read_block(port, b); rec['changed'] += diff(b, prev[b['slug']], vals); rec['words'][b['slug']] = vals; prev[b['slug']] = vals
            res['steps'].append(rec)
            print('  Muutunud: ' + ('; '.join(show(c) for c in rec['changed']) if rec['changed'] else 'mitte midagi'))
    finally:
        port.close()
        out.write_text(json.dumps(res, ensure_ascii=False) + '\n')
    print('\nValmis. Tulemused: %s' % out)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). ÄRA salvesta.')

def self_test():
    b = {'slug': 'in1', 'words': 3, 'channels': 2}
    S.check(diff(b, [0, 1, 2, 3, 4, 5], [0, 1, 9, 3, 4, 6]) == [{'block': 'in1', 'channel': 'A', 'param': 2, 'before': 2, 'after': 9},
            {'block': 'in1', 'channel': 'B', 'param': 2, 'before': 5, 'after': 6}], 'diff')
    S.check(read_only_shape(bytes.fromhex('f0000174111f25002ef7')) == 'bulk' and read_only_shape(bytes.fromhex('f0000174111f66006df7')) == 'bulk', 'bulk shapes (Input 1, Volume/Pan 1)')
    print(json.dumps({'selfTest': 'passed'}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
