#!/usr/bin/env python3
"""FM3 screenshot test loader (T21+). macOS/Linux, POSIX serial, no pyserial. Non-interactive.

  --load   loads each pack preset into the edit buffer (0x77 header 7F 00 00 40 00, SHA-256 checked),
           then reads back every block that holds a test value with the read-only block bulk read
           (fn=0x1F, all words, all channels) and compares the words with the manifest. No question is
           asked, so Remote Control can run it. The FM3 name check of the older collectors is replaced
           by this word-for-word read-back. Results: SESSION/shot-load-<ID>.json.
           With several presets in the pack, --preset ID selects one (default: the first).
  --check-port  read-only: the FM3 must answer the CPU request.
  --self-test   offline decoder and comparison test.
  --preflight   offline validation of the selected pack preset; never opens a port.
The user then opens FM3-Edit (after this script has exited) and takes the screenshots that LOE_MIND.txt
names. This script never stores and never sets; preset switching discards the edit buffer.

Usage:
  python3 FM3_SHOT_LOAD.py --check-port [--port /dev/cu.usbmodemXXXX]
  python3 FM3_SHOT_LOAD.py --load --pack DIR --session DIR [--preset ID] [--port ...]
  python3 FM3_SHOT_LOAD.py --self-test
  python3 FM3_SHOT_LOAD.py --preflight --pack DIR [--preset ID]
Close FM3-Edit and Fractal-Bot before each run (the USB port is exclusive).
"""
import argparse, hashlib, json, re, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S
from FM3_READ_PROBE import read_only_shape, collect, send_read

def unpack16(b0, b1, b2):
    return (b0 & 0x7f) | ((b1 & 0x7f) << 7) | ((b2 & 0x03) << 14)

def bulk_values(frames, effect_id):
    """One fn=0x1F reply: 0x74 head (block id, item count), 0x75 bodies, 0x76 end (same as FM3_VALUE_CHECK)."""
    head = None; values = []; ended = False
    for f in frames:
        S.check(len(f) >= 8, 'fn=0x1F: short frame')
        if list(f[:5]) != [0xf0, 0, 1, 0x74, S.MODEL]: continue
        S.check(f[-1] == 0xf7 and all(b < 128 for b in f[1:-1]) and S.checksum(f[:-2]) == f[-2], 'fn=0x1F: corrupt frame')
        if f[5] not in (0x74, 0x75, 0x76): continue
        S.check(not ended, 'fn=0x1F: data after end')
        if f[5] == 0x74:
            S.check(head is None and len(f) == 12, 'fn=0x1F: invalid or duplicate head')
            head = ((f[6] & 0x7f) | (f[7] & 0x7f) << 7, (f[8] & 0x7f) | (f[9] & 0x7f) << 7)
        elif f[5] == 0x75:
            S.check(head is not None and len(f) >= 13 and (len(f) - 10) % 3 == 0, 'fn=0x1F: invalid body')
            for i in range(8, len(f) - 4, 3):
                S.check(f[i + 2] <= 3, 'fn=0x1F: invalid word septet')
                values.append(unpack16(f[i], f[i + 1], f[i + 2]))
        elif f[5] == 0x76:
            S.check(head is not None, 'fn=0x1F: end before head')
            ended = True
    S.check(head is not None, 'fn=0x1F: no reply head for effect %d' % effect_id)
    S.check(head[0] == effect_id, 'fn=0x1F: reply for effect %d, expected %d' % (head[0], effect_id))
    S.check(ended and len(values) == head[1], 'fn=0x1F: incomplete reply for effect %d (%d of %d values)' % (effect_id, len(values), head[1]))
    return values

def safe_label(value):
    S.check(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}', value), 'ID/label must use letters, digits, _ or - (1..80 characters)')
    return value


def validate_blocks(blocks):
    S.check(isinstance(blocks, list) and len(blocks) > 0, 'No blocks to verify')
    seen = set()
    for b in blocks:
        eid, words, expected = b['effectId'], b['words'], b['expected']
        S.check(type(eid) is int and 0 <= eid <= 16383 and eid not in seen, 'Invalid/duplicate effect id')
        seen.add(eid)
        req = bytes.fromhex(b['request'])
        S.check(read_only_shape(req) == 'bulk' and (req[6] | req[7] << 7) == eid, 'bulk request target mismatch')
        S.check(type(words) is int and words > 0 and isinstance(expected, list), 'Invalid block dimensions')
        S.check(len(expected) in (words, 2 * words, 4 * words), 'Expected words must cover all block channels')
        channels = len(expected) // words
        S.check(b.get('channels', channels) == channels, 'Channel count mismatch')
        S.check(all(type(v) is int and 0 <= v <= 65535 for v in expected), 'Invalid expected word')
        S.check(isinstance(b['writes'], list), 'Invalid test words')
        for w in b['writes']:
            S.check(w['channel'] in list('ABCD'[:channels]) and type(w['pid']) is int and 0 <= w['pid'] < words, 'Invalid test word address')
            i = 'ABCD'.index(w['channel']) * words + w['pid']
            S.check(w['raw'] == expected[i], 'Test word differs from expected block')


def load_item(pack, preset_id):
    mb = (pack / 'manifest.json').read_bytes(); manifest = json.loads(mb)
    S.check(manifest.get('kind') == 'fm3-shot-check', 'Not a screenshot test pack')
    entries = manifest['items']
    S.check(isinstance(entries, list) and len(entries) > 0, 'Empty preset list')
    items = {safe_label(it['id']): it for it in entries}
    S.check(len(items) == len(entries), 'Duplicate preset id')
    it = items.get(preset_id) if preset_id else entries[0]
    S.check(it is not None, 'Unknown preset id')
    data = (pack / it['file']).read_bytes()
    S.check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
    frames = S.dump_frames(data)
    validate_blocks(it['blocks'])
    return mb, it, frames


def preflight(pack, preset_id):
    mb, it, frames = load_item(pack, preset_id)
    result = {'passed': True, 'portOpened': False, 'preset': it['id'],
              'packSha256': hashlib.sha256(mb).hexdigest(), 'presetSha256': it['sha256'],
              'frames': len(frames), 'blocks': len(it['blocks']),
              'comparedWords': sum(len(b['expected']) for b in it['blocks']),
              'scope': 'selected manifest blocks only; no device or display evidence'}
    print(json.dumps(result))
    return result


def compare(block, values):
    """Every word of the block must equal the generated preset; the written test words are listed separately."""
    exp = block['expected']; words = block['words']
    diff = [{'channel': 'ABCD'[i // words], 'pid': i % words, 'expected': e, 'device': v}
            for i, (e, v) in enumerate(zip(exp, values)) if e != v]
    if len(values) != len(exp): diff.append({'lengthExpected': len(exp), 'lengthDevice': len(values)})
    tests = []
    for w in block['writes']:
        i = 'ABCD'.index(w['channel']) * words + w['pid']
        tests.append({'param': w['param'], 'channel': w['channel'], 'raw': w['raw'], 'device': values[i] if i < len(values) else None})
    return diff, tests

def read_block(port, block, tries=3):
    req = bytes.fromhex(block['request']); S.check(read_only_shape(req) == 'bulk', 'Refusing non-read request: %s' % req.hex())
    last = None
    for _ in range(tries):
        port.framer.frames.clear(); send_read(port, req, 'bulk')
        frames = [bytes.fromhex(h) for h in collect(port, quiet=0.3, max_wait=4.0)]
        try: return bulk_values(frames, block['effectId'])
        except SystemExit as e: last = e; time.sleep(0.4)
    raise last

def require_fm3(port, path):
    v = S.require_fm3(port, path)
    print('FM3 vastas pordis %s (CPU %s %%).' % (path, S.cpu_from_raw(v)))

def run(pack, session, preset_id, port_path, port=None):
    mb, it, frames = load_item(pack, preset_id)
    session.mkdir(parents=True, exist_ok=True); out = session / ('shot-load-%s.json' % it['id'])
    S.check_new_result(out)
    res = {'kind': 'fm3-shot-load', 'packSha256': hashlib.sha256(mb).hexdigest(), 'preset': it['id'], 'name': it['name'],
           'time': time.strftime('%Y-%m-%dT%H:%M:%S'), 'blocks': [], 'allMatch': False}
    own = port is None
    if own: port = S.Port(port_path)
    try:
        require_fm3(port, port_path); S.send_preset(port, frames); time.sleep(1.2)
        for b in it['blocks']:
            vals = read_block(port, b); diff, tests = compare(b, vals)
            res['blocks'].append({'family': b['family'], 'effectId': b['effectId'], 'values': len(vals), 'matches': not diff,
                                  'mismatches': diff[:40], 'testWords': tests})
    except (SystemExit, Exception) as e:
        res['error'] = str(e)
        S.write_json_new(out, res)
        raise
    finally:
        if own: port.close()
    res['allMatch'] = all(x['matches'] for x in res['blocks'])
    S.write_json_new(out, res)
    for x in res['blocks']:
        print('  %-10s %s (%d testväärtust)' % (x['family'], 'KLAPIB' if x['matches'] else 'ERINEB', len(x['testWords'])))
    if res['allMatch']:
        print('Laaditud: "%s". Kõik plokid klapivad. Sulge see aken, ava FM3-Edit ja tee ekraanipildid (LOE_MIND.txt).' % it['name'])
    else:
        print('HOIATUS: seade ei hoia kõiki genereeritud väärtusi. Ära tee ekraanipilte; saada vestlusesse %s.' % out)
        sys.exit(2)
    return res

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
    blk = {'words': 2, 'expected': [1, 2, 3, 4, 5, 6, 7, 8], 'writes': [{'param': 'X', 'channel': 'B', 'pid': 1, 'raw': 4}]}
    d, t = compare(blk, [1, 2, 3, 4, 5, 6, 7, 8]); S.check(d == [] and t[0]['device'] == 4, 'compare equal')
    d, t = compare(blk, [1, 2, 3, 9, 5, 6, 7, 8]); S.check(d == [{'channel': 'B', 'pid': 1, 'expected': 4, 'device': 9}] and t[0]['device'] == 9, 'compare diff')
    d, _ = compare(blk, [1, 2, 3, 4]); S.check(d == [{'lengthExpected': 8, 'lengthDevice': 4}], 'compare length')
    print(json.dumps({'selfTest': 'passed', 'bulkValues': len(vals)}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port'); ap.add_argument('--preset')
    ap.add_argument('--preflight', action='store_true'); ap.add_argument('--load', action='store_true'); ap.add_argument('--check-port', action='store_true'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: self_test()
    elif a.preflight:
        S.check(a.pack, 'Anna --pack')
        preflight(a.pack.expanduser(), a.preset)
    elif a.check_port:
        path = a.port or S.find_port(); port = S.Port(path)
        try: require_fm3(port, path)
        finally: port.close()
        print('Pordikontroll OK. Midagi ei saadetud peale CPU lugemispäringu.')
    else:
        S.check(a.load and a.pack and a.session, 'Anna --load, --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.preset, a.port or S.find_port())
