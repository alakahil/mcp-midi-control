"""Bounded FM3 FW13 research transport. POSIX stdlib only; no preset STORE.

GET framing derives from the existing Wah/Rotary collectors. SET uses exact
uint32 payload bits, never a display string or an already quantized raw word.
"""
import json
import os
import select
import time


def require(ok, message):
    if not ok:
        raise ValueError(message)


def checksum(data):
    value = 0
    for byte in data:
        value ^= byte
    return value & 127


def frame(fn, payload):
    data = bytes([240, 0, 1, 116, 17, fn, *payload])
    return data + bytes([checksum(data), 247])


def get_frame(effect):
    require(effect in (3, 94), 'Only MOD0 and Wah1 GET are allowed')
    return frame(31, [effect, 0])


def set_frame(step):
    pid, op, word = step['pid'], step['operation'], int(step['inputBits'], 16)
    require(pid in (1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15), 'Forbidden PID')
    require(op in (9, 82), 'Forbidden operation')
    require(0 <= word <= 0xffffffff and (word >> 23 & 255) != 255, 'Nonfinite input')
    if op == 82:
        require(word <= 0x3f800000, 'Normalized input outside [0,1]')
    # Wire effect 3 is modifier record 0; 94 is its TARGET, never a SET address.
    return frame(1, [op, 0, 3, 0, pid, 0,
                     *((word >> n) & 127 for n in (0, 7, 14, 21, 28)), 0, 0, 0, 0])


class Framer:
    def __init__(self):
        self.partial = None
        self.frames = []

    def feed(self, data):
        for b in data:
            if b >= 248:  # MIDI realtime can be interleaved within SysEx.
                continue
            if b == 240:
                require(self.partial is None, 'Nested SysEx start')
                self.partial = [b]
            elif b == 247:
                require(self.partial is not None, 'Orphan SysEx end')
                f = bytes(self.partial + [b])
                require(len(f) >= 8 and f[:5] == bytes([240, 0, 1, 116, 17]), 'Wrong envelope/model')
                require(checksum(f[:-2]) == f[-2], 'Bad frame checksum')
                self.frames.append(f)
                self.partial = None
            else:
                require(self.partial is not None and b < 128, 'Unexpected MIDI byte')
                self.partial.append(b)
                require(len(self.partial) < 4096, 'Oversized frame')


def decode(frames, effect, count):
    selected = [f for f in frames if f[5] in (116, 117, 118)]
    require(len(selected) == 3, 'Expected exactly one head/body/end burst')
    h, b, t = selected
    require([h[5], b[5], t[5]] == [116, 117, 118], 'Wrong burst order')
    require(len(h) == 12 and len(t) == 8 and len(b) == 10 + 3*count, 'Wrong burst lengths')
    require(h[6] | h[7] << 7 == effect, 'Wrong effect in GET reply')
    require(h[8] | h[9] << 7 == count, 'Wrong advertised count')
    require(b[6] | b[7] << 7 == count, 'Wrong body count')
    values = []
    for i in range(8, len(b)-2, 3):
        require(b[i+2] <= 3, 'Not a uint16')
        values.append(b[i] | b[i+1] << 7 | b[i+2] << 14)
    return values


class Journal:
    def __init__(self, path):
        self.path = path
        self.start = time.monotonic()

    def log(self, kind, **data):
        row = dict(kind=kind, elapsedMs=round((time.monotonic()-self.start)*1000, 3), **data)
        with self.path.open('a', encoding='utf8') as f:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
            f.flush()
            os.fsync(f.fileno())


class Serial:
    def __init__(self, port, journal):
        self.port, self.journal, self.fd, self.old = port, journal, None, None

    def __enter__(self):
        import fcntl, termios, tty
        self.fd = os.open(self.port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        try:
            self.old = termios.tcgetattr(self.fd)
            fcntl.ioctl(self.fd, termios.TIOCEXCL)
            tty.setraw(self.fd, termios.TCSANOW)
            attrs = termios.tcgetattr(self.fd)
            attrs[4] = attrs[5] = termios.B115200
            attrs[2] |= termios.CLOCAL | termios.CREAD
            termios.tcsetattr(self.fd, termios.TCSANOW, attrs)
            self.receive('initial-idle', quiet=.3, timeout=3)
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *_):
        import termios
        if self.fd is not None:
            try:
                if self.old is not None:
                    termios.tcsetattr(self.fd, termios.TCSANOW, self.old)
            finally:
                os.close(self.fd)
                self.fd = None

    def send(self, data, label):
        # Persist intent before write: a partial/uncertain write is never retried.
        self.journal.log('tx-intent', label=label, hex=data.hex())
        written = os.write(self.fd, data)
        self.journal.log('tx-result', label=label, written=written, requested=len(data))
        require(written == len(data), 'Partial write; stopped without retry')

    def receive(self, label, quiet=.2, timeout=8, need_tail=False):
        parser = Framer()
        start = last = time.monotonic()
        size = 0
        while time.monotonic()-start < timeout:
            now = time.monotonic()
            complete = not need_tail or any(f[5] == 118 for f in parser.frames)
            if complete and now-last >= quiet:
                require(parser.partial is None, 'Truncated response')
                for f in parser.frames:
                    require(f[5] in (1, 116, 117, 118), 'Unexpected response function: '+hex(f[5]))
                return parser.frames
            ready, _, _ = select.select([self.fd], [], [], .05)
            if not ready:
                continue
            try:
                chunk = os.read(self.fd, 4096)
            except BlockingIOError:
                continue
            require(bool(chunk), 'Serial EOF')
            self.journal.log('rx', label=label, hex=chunk.hex())
            size += len(chunk)
            require(size <= 131072, 'Response limit exceeded')
            parser.feed(chunk)
            last = time.monotonic()
        raise TimeoutError('Response did not complete/become quiet: '+label)

    def get(self, effect, count, label):
        # An unsolicited burst cannot serve as the response to the next GET.
        self.receive(label+'-idle')
        self.send(get_frame(effect), label)
        return decode(self.receive(label, need_tail=True), effect, count)

    def set(self, step):
        self.receive(step['id']+'-idle')
        self.send(set_frame(step), step['id'])
        # SET echo is recorded, but is never treated as independent raw evidence.
        self.receive(step['id']+'-settle', quiet=.3)
