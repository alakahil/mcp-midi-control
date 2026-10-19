#!/usr/bin/env python3
"""macOS/Linux single FM3 Flanger GET via nonblocking POSIX I/O; no pyserial.
No SET, SAVE, model/channel/preset changes, handshake commands, or retry.
"""
import argparse, datetime, json, os, select, sys, time
from pathlib import Path
GET = bytes.fromhex('f0000174111f520059f7')

def check(ok, message):
    if not ok: raise ValueError(message)

def checksum(data):
    n = 0
    for b in data: n ^= b
    return n & 127

class Framer:
    def __init__(self): self.partial = None; self.frames = []
    def feed(self, data):
        for b in data:
            if b >= 248: continue
            if b == 240: self.partial = [b]
            elif self.partial is not None:
                if b == 247:
                    self.frames.append(self.partial + [b]); self.partial = None
                elif b < 128: self.partial.append(b)
                else: self.partial = None

def decode(frames):
    started = ended = False
    count = None; values = []; sections = []
    for f in frames:
        if len(f) < 6 or f[4] != 17 or f[5] not in (116,117,118): continue
        check(not ended, 'Unexpected additional burst')
        check(len(f) >= 8 and f[:5] == [240,0,1,116,17] and f[-1] == 247, 'Bad envelope')
        check(checksum(f[:-2]) == f[-2], 'Bad checksum')
        if f[5] == 116:
            check(not started and len(f) == 12, 'Malformed/duplicate head')
            check((f[6] | f[7]<<7) == 82, 'Not Flanger1')
            count = f[8] | f[9]<<7; started = True
        elif f[5] == 117:
            check(started and len(f) >= 10 and (len(f)-10)%3 == 0, 'Malformed body')
            check((f[6] | f[7]<<7) == (len(f)-10)//3, 'Body word count mismatch')
            sections.append({'section':f[6], 'flag':f[7], 'values':(len(f)-10)//3})
            for i in range(8,len(f)-2,3):
                check(f[i+2] <= 3, 'Invalid uint16')
                values.append(f[i] | f[i+1]<<7 | f[i+2]<<14)
        else:
            check(started and len(f) == 8, 'Malformed end'); ended = True
    check(started and ended, 'Incomplete response')
    check(count == len(values), 'Value count mismatch')
    check(count == 132, 'Expected 132 Flanger words')
    return {'effectId':82,'itemCount':count,'sections':sections,'values':values}

def collect(port, report, timeout=8):
    check(report.get("txCalls", 0) == 0, "Repeated GET refused")
    import termios, tty, fcntl
    fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    old = None; framer = Framer(); raw = bytearray()
    try:
        old = termios.tcgetattr(fd)
        if hasattr(termios,'TIOCEXCL'): fcntl.ioctl(fd, termios.TIOCEXCL)
        tty.setraw(fd, termios.TCSANOW)
        attrs = termios.tcgetattr(fd)
        attrs[4] = attrs[5] = termios.B115200
        attrs[2] |= termios.CLOCAL | termios.CREAD
        termios.tcsetattr(fd,termios.TCSANOW,attrs)
        start = time.monotonic()
        report['txCalls'] = 1
        sent = os.write(fd,GET)  # only device write in this program
        report['txBytesWritten'] = sent
        check(sent == len(GET),'Partial GET write; no retry')
        while time.monotonic()-start < timeout:
            ready,_,_ = select.select([fd],[],[],0.1)
            if not ready: continue
            try: chunk = os.read(fd,4096)
            except BlockingIOError: continue
            check(bool(chunk),'Serial port reached EOF')
            report['rxChunks'].append({'afterMs':round((time.monotonic()-start)*1000,3),'bytes':len(chunk)})
            raw.extend(chunk); framer.feed(chunk)
            check(len(raw) < 131072,'Response too large')
            if any(len(f)>=6 and f[4:6]==[17,118] for f in framer.frames):
                report['responseCompleteBeforeClose'] = True
                return decode(framer.frames)
        raise TimeoutError('No complete Flanger reply within %s seconds'%timeout)
    finally:
        report['rawRxHex'] = raw.hex(); report['frames'] = framer.frames
        report['partialFrameHex'] = bytes(framer.partial or []).hex()
        try:
            if old is not None: termios.tcsetattr(fd,termios.TCSANOW,old)
        finally: os.close(fd)
