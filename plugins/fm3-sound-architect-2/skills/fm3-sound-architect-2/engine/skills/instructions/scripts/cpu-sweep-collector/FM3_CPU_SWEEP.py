#!/usr/bin/env python3
"""FM3 CPU sweep (audit point 7). macOS/Linux, POSIX serial, no pyserial.

Device writes are limited to ONE kind: a complete preset dump (0x77 + 8 x 0x78 + 0x79) whose
0x77 header is 7F 00 00 40 00, i.e. the edit buffer, exactly as FM3-Edit exports it. Every file
must match the manifest SHA-256. The only other frame sent is the read-only grid/meter request
fn=0x01 sub=0x2E (CPU % = 32 + frame[37] * 0.5). No store (sub=0x26), no parameter SET, no
preset change. Nothing is saved: after the run, select any preset on the FM3 and the edit
buffer is discarded.

Usage:
  python3 FM3_CPU_SWEEP.py --pack DIR --session DIR [--port /dev/cu.usbmodemXXXX]
  python3 FM3_CPU_SWEEP.py --self-test
Close FM3-Edit and Fractal-Bot first (the USB port is exclusive).
"""
import argparse, glob, hashlib, json, os, select, sys, time
from pathlib import Path

MODEL = 0x11
HEADER = [0x7f, 0x00, 0x00, 0x40, 0x00]

def check(ok, message):
    if not ok: raise SystemExit('PEATATUD: ' + message)

def checksum(data):
    n = 0
    for b in data: n ^= b
    return n & 0x7f

def cpu_request():
    body = [0xf0, 0x00, 0x01, 0x74, MODEL, 0x01, 0x2e, 0x00] + [0] * 13
    return bytes(body + [checksum(body), 0xf7])

def split_frames(data):
    frames, cur = [], None
    for b in data:
        if b == 0xf0: cur = [b]
        elif cur is not None:
            cur.append(b)
            if b == 0xf7: frames.append(cur); cur = None
    check(cur is None, 'Truncated frame in preset file')
    return frames

def dump_frames(data):
    """Validate a preset file and return its frames; refuses anything but an edit-buffer dump."""
    check(len(data) == 24680, 'Preset file must be 24680 bytes')
    frames = split_frames(data)
    check([f[5] for f in frames] == [0x77] + [0x78] * 8 + [0x79], 'Unexpected frame sequence')
    for f in frames:
        check(f[:5] == [0xf0, 0x00, 0x01, 0x74, MODEL], 'Not an FM3 frame')
        check(all(b < 0x80 for b in f[1:-1]), 'Non-7-bit data byte')
        check(checksum(f[:-2]) == f[-2], 'Bad frame checksum')
    check(frames[0][6:11] == HEADER, 'Header is not the edit buffer (7F 00 00 40 00); refusing')
    return [bytes(f) for f in frames]

def parse_cpu(frame):
    if len(frame) > 40 and frame[:5] == [0xf0, 0x00, 0x01, 0x74, MODEL] and frame[5] == 0x01 and frame[6] == 0x2e:
        return 32 + frame[37] * 0.5
    return None

class Framer:
    def __init__(self): self.partial = None; self.frames = []
    def feed(self, data):
        for b in data:
            if b >= 248: continue
            if b == 240: self.partial = [b]
            elif self.partial is not None:
                if b == 247: self.frames.append(self.partial + [b]); self.partial = None
                elif b < 128: self.partial.append(b)
                else: self.partial = None

class Port:
    def __init__(self, path):
        import termios, tty, fcntl
        self.termios = termios
        self.fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        self.old = termios.tcgetattr(self.fd)
        if hasattr(termios, 'TIOCEXCL'): fcntl.ioctl(self.fd, termios.TIOCEXCL)
        tty.setraw(self.fd, termios.TCSANOW)
        a = termios.tcgetattr(self.fd); a[4] = a[5] = termios.B115200; a[2] |= termios.CLOCAL | termios.CREAD
        termios.tcsetattr(self.fd, termios.TCSANOW, a); termios.tcflush(self.fd, termios.TCIFLUSH)
        self.framer = Framer()
    def write(self, data):
        view = memoryview(data); sent = 0; t0 = time.monotonic()
        while sent < len(data):
            check(time.monotonic() - t0 < 5, 'Write timeout')
            _, w, _ = select.select([], [self.fd], [], 0.5)
            if not w: continue
            try: sent += os.write(self.fd, view[sent:])
            except BlockingIOError: pass
    def drain(self, seconds):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            r, _, _ = select.select([self.fd], [], [], 0.05)
            if r:
                try: chunk = os.read(self.fd, 65536)
                except BlockingIOError: continue
                check(bool(chunk), 'Serial port closed'); self.framer.feed(chunk)
    def close(self):
        try: self.termios.tcsetattr(self.fd, self.termios.TCSANOW, self.old)
        finally: os.close(self.fd)

def read_cpu(port, timeout=2.0):
    port.framer.frames.clear(); port.write(cpu_request()); end = time.monotonic() + timeout
    while time.monotonic() < end:
        port.drain(0.05)
        for f in port.framer.frames:
            v = parse_cpu(f)
            if v is not None: return v
    return None

def settle(port, first_wait=1.2, max_wait=8.0):
    """Read until three consecutive equal values (0.5 % steps) or timeout; returns (value, reads)."""
    time.sleep(first_wait); reads = []; end = time.monotonic() + max_wait
    while time.monotonic() < end:
        v = read_cpu(port); reads.append(v)
        if len(reads) >= 3 and reads[-1] is not None and reads[-1] == reads[-2] == reads[-3]: return reads[-1], reads
        time.sleep(0.3)
    good = [r for r in reads if r is not None]
    return (max(good) if good else None), reads

def send_preset(port, frames):
    for f in frames: port.write(f); time.sleep(0.03)
    port.drain(0.2)

def find_port():
    c = sorted(glob.glob('/dev/cu.usbmodem*')) + sorted(glob.glob('/dev/ttyACM*'))
    check(len(c) == 1, 'Leidsin %d sobivat porti %s; anna --port' % (len(c), c))
    return c[0]

def run(pack, session, port_path):
    manifest = json.loads((pack / 'manifest.json').read_text())
    items = [i for i in manifest['items'] if i.get('file')]
    session.mkdir(parents=True, exist_ok=True); log = session / 'results.jsonl'
    done = set()
    if log.exists():
        for line in log.read_text().splitlines():
            if line.strip(): done.add(json.loads(line)['id'])
    # Validate every file before the first device write.
    frames = {}
    for it in items:
        data = (pack / it['file']).read_bytes()
        check(hashlib.sha256(data).hexdigest() == it['sha256'], 'SHA-256 mismatch: ' + it['file'])
        frames[it['id']] = dump_frames(data)
    print('Pakk kontrollitud: %d presetti, juba mõõdetud %d.' % (len(items), len(done)))
    port = Port(port_path)
    try:
        before, _ = settle(port, first_wait=0.2)
        print('CPU enne algust (praegune preset): %s %%' % before)
        for n, it in enumerate(items, 1):
            if it['id'] in done: continue
            send_preset(port, frames[it['id']])
            value, reads = settle(port)
            rec = {'id': it['id'], 'family': it['family'], 'cpuPercent': value, 'reads': reads,
                   'saturated': value is not None and value >= 95.5, 'time': time.strftime('%Y-%m-%dT%H:%M:%S')}
            if it['id'] == 'cal-newlook' and 'cal-newlook' not in done:
                ans = input('\nFM3 ekraanil peaks nüüd olema nimi "CPU CAL NEWLOOK". Kas on? (j/e): ').strip().lower()
                check(ans.startswith('j'), 'Seade ei laadinud presetti redaktsioonipuhvrisse; midagi ei salvestatud.')
                rec['userConfirmedName'] = True
            if 'expectPercent' in it:
                ok = value is not None and abs(value - it['expectPercent']) <= 2.0
                rec['calibrationOk'] = ok
                print('Kalibreerimine %s: seade %s %%, käsitsi mõõdetud %s %%' % (it['id'], value, it['expectPercent']))
                if not ok:
                    with log.open('a') as f: f.write(json.dumps(rec) + '\n')
                    check(False, 'CPU näit ei klapi käsitsi mõõtmisega; mõõtmine peatatud (dekodeering kontrollimata).')
            with log.open('a') as f: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            print('[%3d/%d] %-45s %s %%' % (n, len(items), it['id'][:45], value))
    finally:
        port.close()
    print('\nValmis. Tulemused: %s' % log)
    print('Vali FM3-l mõni preset (redaktsioonipuhver tühistub). Midagi ei salvestatud.')

def self_test():
    req = cpu_request(); check(req[:7] == bytes([0xf0, 0, 1, 0x74, 0x11, 0x01, 0x2e]) and len(req) == 23, 'request')
    fake = [0xf0, 0, 1, 0x74, 0x11, 0x01, 0x2e] + [0] * 30 + [41] + [0] * 10 + [0xf7]
    check(parse_cpu(fake) == 52.5, 'cpu parse')
    here = Path(__file__).resolve().parents[2]
    src = here / 'examples/FM3_P6_INSERT_A.syx'
    if not src.exists():
        print(json.dumps({'selfTest': 'passed (frame checks only; repo example not present)', 'request': req.hex()})); return
    good = src.read_bytes()
    check(len(dump_frames(good)) == 10, 'dump frames')
    bad = bytearray(good); bad[6] = 0x01; bad[7] = 0x1a  # a stored location header
    try:
        frames = split_frames(bytes(bad)); f = frames[0]; f[-2] = checksum(f[:-2])
        dump_frames(bytes(sum(frames, [])))
        raise AssertionError('stored-location header accepted')
    except SystemExit as e:
        check('edit buffer' in str(e), 'refusal reason')
    print(json.dumps({'selfTest': 'passed', 'request': req.hex()}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', type=Path); ap.add_argument('--session', type=Path); ap.add_argument('--port')
    ap.add_argument('--self-test', action='store_true'); a = ap.parse_args()
    if a.self_test: self_test()
    else:
        check(a.pack and a.session, 'Anna --pack ja --session')
        run(a.pack.expanduser(), a.session.expanduser(), a.port or find_port())
