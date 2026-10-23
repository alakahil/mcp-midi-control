#!/usr/bin/env python3
"""FM3 grid check (audit point 5). macOS/Linux, POSIX serial, no pyserial.

Uses the same device rules as FM3_CPU_SWEEP.py (imported from this folder): the only frames sent
are manifest-pinned edit-buffer dumps (0x77 header 7F 00 00 40 00, SHA-256 checked) and the
read-only request fn=0x01 sub=0x2E. No store (sub=0x26), no parameter SET, no preset change.
Nothing is saved: afterwards select any preset on the FM3 and the edit buffer is discarded.

For every preset the live grid is read back from the sub=0x2E reply and compared with the 48
cells the generator wrote. Grid region: the last ceil((46 + 12*4*32)/7) = 226 bytes before the
checksum; cell (row r, col c) = 32 bits from bit 45 + c*128 + r*32, MSB-first in each 7-bit byte:
u16 id (little-endian bytes) + u16 input mask, i.e. the preset-body cell word itself. This reading
reproduces the 2026-06-12 FM3 community capture (In 1 -> Amp 1 -> Out 1, masks 0/2/2) and the
fractal-midi decoder for ids < 128 (which reads the same bits one position later as 7-bit id and
mask << 1). The check decides it for ids > 127 and for shunts.

Usage:
  python3 FM3_GRID_CHECK.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_GRID_CHECK.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import FM3_CPU_SWEEP as S

ROWS, COLS = 4, 12
REGION = -(-(46 + COLS * ROWS * 32) // 7)

def grid_region(frame):
    S.check(frame[-1] == 0xf7, 'Grid frame must end in F7')
    mido = frame[1:]
    off = len(mido) - 2 - REGION
    S.check(off >= 350, 'Grid frame too short (%d bytes)' % len(frame))
    return mido[off:len(mido) - 2]

def bits(reg, at, n):
    v = 0
    for i in range(n):
        b = at + i; v = (v << 1) | ((reg[b // 7] >> (6 - b % 7)) & 1)
    return v

def decode_grid(frame):
    """All 48 cells as [row, col, id, mask] (zero-based), preset-body cell words."""
    reg = grid_region(frame); out = []
    for r in range(ROWS):
        for c in range(COLS):
            base = 45 + c * 128 + r * 32
            out.append([r, c, bits(reg, base, 8) | bits(reg, base + 8, 8) << 8, bits(reg, base + 16, 8) | bits(reg, base + 24, 8) << 8])
    return out

def decode_grid_ts(frame):
    """fractal-midi parseGen3GridLayout reading (7-bit id at bit 46, type byte, mask at bit 62)."""
    reg = grid_region(frame); out = []
    for r in range(ROWS):
        for c in range(COLS):
            base = 46 + c * 128 + r * 32
            idf, typ, cab = bits(reg, base, 8) >> 1, bits(reg, base + 8, 8), bits(reg, base + 16, 8)
            if idf or typ == 8: out.append([r, c, idf, typ == 8, cab])
    return out

def read_grid_frame(port, timeout=2.0):
    port.framer.frames.clear(); port.write(S.cpu_request()); end = time.monotonic() + timeout
    while time.monotonic() < end:
        port.drain(0.05)
        for f in port.framer.frames:
            if S.parse_raw(f) is not None: return f
    return None

def stable_grid(port, first_wait=1.5, max_wait=8.0):
    """Two consecutive identical grid decodes; returns (frame, grid, reads, stable)."""
    time.sleep(first_wait); last = None; reads = 0; end = time.monotonic() + max_wait
    while time.monotonic() < end:
        f = read_grid_frame(port); reads += 1
        if f is not None:
            g = decode_grid(f)
            if last is not None and g == last[1]: return f, g, reads, True
            last = (f, g)
        time.sleep(0.3)
    return (last[0], last[1], reads, False) if last else (None, None, reads, False)

def compare(expected, got):
    return [{'row': e[0] + 1, 'col': e[1] + 1, 'expected': e[2:], 'device': g[2:]} for e, g in zip(expected, got) if e != g]

def run(pack, session, port_path):
    manifest_bytes = (pack / 'manifest.json').read_bytes()
    pack_hash = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = json.loads(manifest_bytes)
    S.check(manifest.get('kind') == 'fm3-grid-check', 'Not a grid-check pack')
    items = manifest['items']
    session.mkdir(parents=True, exist_ok=True); log = session / 'results.jsonl'
    done = set()
    if log.exists():
        for line in log.read_text().splitlines():
            if line.strip():
                previous = json.loads(line)
                S.check(previous.get('status') == 'passed' and previous.get('packSha256') == pack_hash,
                        'Varasem katse ebaõnnestus või pakk ei klapi; kontrolli results.jsonl enne uut kirjutust.')
                done.add(previous['id'])
    frames = {}
    for it in items:
        data = (pack / it['file']).read_bytes()
        S.check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
        frames[it['id']] = S.dump_frames(data)
        S.check(len(it['expectedGrid']) == 48, 'expectedGrid must have 48 cells')
    print('Pakk kontrollitud: %d presetti, juba tehtud %d.' % (len(items), len(done)))
    port = S.Port(port_path); confirmed = bool(done)
    try:
        for n, it in enumerate(items, 1):
            if it['id'] in done: continue
            rec = {'id': it['id'], 'time': time.strftime('%Y-%m-%dT%H:%M:%S'),
                   'packSha256': pack_hash, 'presetSha256': it['sha256'], 'status': 'failed',
                   'sentFramesHex': [], 'requestHex': S.cpu_request().hex()}
            try:
                # Record every attempted send before issuing it; keep diagnostics on every failure.
                for data in frames[it['id']]:
                    rec['sentFramesHex'].append(bytes(data).hex())
                    port.write(data); time.sleep(0.03)
                port.drain(0.2)
                frame, grid, reads, stable = stable_grid(port)
                rec.update({'gridReads': reads, 'gridStable': stable,
                            'frameHex': None if frame is None else bytes(frame).hex(),
                            'frameBytes': 0 if frame is None else len(frame)})
                S.check(frame is not None, 'FM3 ei vastanud ruudustiku päringule; kirjutused peatatud.')
                rec.update({'deviceGrid': grid, 'tsDecode': decode_grid_ts(frame)})
                S.check(stable, 'Ruudustiku tagasilugemine ei stabiliseerunud; kirjutused peatatud.')
                if not confirmed:
                    ans = input('\nFM3 ekraanil peaks nüüd olema nimi "%s". Kas on? (j/e): ' % manifest['confirmName']).strip().lower()
                    rec['userConfirmedName'] = ans.startswith('j')
                    S.check(rec['userConfirmedName'], 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
                    confirmed = True
                diff = compare(it['expectedGrid'], grid)
                rec.update({'gridMatches': not diff, 'mismatches': diff})
                S.check(not diff, 'Ruudustik erineb (%d lahtrit); kirjutused peatatud.' % len(diff))
                raw, cpu_reads = S.settle(port, first_wait=0.2)
                rec.update({'cpuRaw': raw, 'cpuPercent': None if raw is None else S.cpu_from_raw(raw),
                            'cpuReads': cpu_reads, 'cpuEstimate': it.get('cpuEstimate'), 'cpuDecode': 'piecewise-20261023'})
                S.check(raw is not None and len(cpu_reads) >= 3 and cpu_reads[-3:] == [raw] * 3,
                        'CPU tagasilugemine puudub või ei stabiliseerunud; kirjutused peatatud.')
                if it.get('ask'):
                    rec['userAnswer'] = input('\n%s: %s ' % (it['id'], it['ask'])).strip()
                    S.check(rec['userAnswer'].lower().startswith('j'), 'Kasutaja kontroll ei kinnitanud tulemust; kirjutused peatatud.')
                rec['status'] = 'passed'
                print('[%d/%d] %s  ruudustik KLAPIB  CPU %s %% (hinnang %s %%)' %
                      (n, len(items), it['id'], rec['cpuPercent'], it.get('cpuEstimate')))
            except BaseException as exc:
                rec['error'] = str(exc)
                raise
            finally:
                with log.open('a') as f: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    finally:
        port.close()
    print('\nValmis. Tulemused: %s' % log)
    print('Kõik ruudustikud klapivad.')
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). Midagi ei salvestatud.')

# FM3 community capture 2026-06-12 (fractal-midi gridlayout.test.ts, FM3_FRAME_DRIVE_590), 590 bytes.
GOLDEN = (bytes.fromhex('f000017411012e00760000003a00000000000070035b0020000004') +
          bytes(8) +
          bytes.fromhex('483e4510283663056a6432502e57233d5a613a192c4513555c201008040201004020100804020100005331592d66294440201008040201004020100804020100402010080402010040201008') +
          bytes(262) +
          bytes.fromhex('1240') +
          bytes(16) +
          bytes.fromhex('07200008') +
          bytes(14) +
          bytes.fromhex('01280002') +
          bytes(175) +
          bytes.fromhex('4cf7'))

def encode_grid(template, cells):
    """Self-test only: write 48 cells into a copy of a reply frame (inverse of decode_grid)."""
    f = bytearray(template); off = 1 + len(f) - 1 - 2 - REGION
    def put(at, n, v):
        for i in range(n):
            b = at + i; bit = (v >> (n - 1 - i)) & 1; k = off + b // 7; m = 1 << (6 - b % 7)
            f[k] = (f[k] | m) if bit else (f[k] & ~m)
    for r, c, idv, mask in cells:
        base = 45 + c * 128 + r * 32
        put(base, 8, idv & 255); put(base + 8, 8, idv >> 8); put(base + 16, 8, mask & 255); put(base + 24, 8, mask >> 8)
    return bytes(f)

def self_test():
    g = [c for c in decode_grid(GOLDEN) if c[2] or c[3]]
    S.check(len(GOLDEN) == 590, 'golden length %d' % len(GOLDEN))
    S.check(g == [[1, 0, 37, 0], [1, 1, 58, 2], [1, 2, 42, 2]], 'golden grid %s' % g)
    S.check(decode_grid_ts(GOLDEN) == [[1, 0, 37, False, 0], [1, 1, 58, False, 4], [1, 2, 42, False, 4]], 'ts decode %s' % decode_grid_ts(GOLDEN))
    S.check(encode_grid(GOLDEN, decode_grid(GOLDEN)) == GOLDEN, 'encode inverse')
    here = Path(__file__).resolve().parent
    for m in [here / 'grid-check-pack' / 'manifest.json'] + sorted(here.parent.parent.glob('examples/FM3_GRID_CHECK*/manifest.json')):
        if m.exists():
            for it in json.loads(m.read_text())['items']:
                S.check(decode_grid(encode_grid(GOLDEN, it['expectedGrid'])) == it['expectedGrid'], 'roundtrip ' + it['id'])
    S.check(compare([[0, 0, 1, 0]], [[0, 0, 1, 0]]) == [] and len(compare([[0, 0, 1, 0]], [[0, 0, 2, 0]])) == 1, 'compare')
    print(json.dumps({'selfTest': 'passed', 'goldenCells': g}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        S.check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or S.find_port())
