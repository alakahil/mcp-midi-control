#!/usr/bin/env python3
"""macOS/Linux single FM3 Amp GET via nonblocking POSIX I/O; no pyserial.
No SET, SAVE, model/channel/preset changes, handshake commands, or retry.
"""
import argparse, datetime, json, os, select, sys, time
from pathlib import Path
GET = bytes.fromhex('f0000174111f3a0031f7')
EXPECTED = [0,46529,32767,0,0,0,12,45874,32767,32767,32767,65534,0,62796,31268,0,0,61440,15151,55383,1,2,0,34903,10,11534,32767,13238,32767,29049,34678,45806,0,0,0,29700,1,32767,30146,3,24641,0,0,42631,37748,37619,49151,0,45419,32767,14417,0,1311,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,32767,32767,32767,31394,35643,65534,65534,2,1,42631,27833,32767,32767,32767,0,21845,32767,0,32767,43870,43711,0,65534,32767,0,0,28086,32767,45806,0,0,0,0,22903,6182,1,32767,32767,32767,31268,32767,1,64078,0,21845,32767,51467,44974,0,0,0,32767,53738,32767,6553,42631,0,0,0,0,0,32767,0,0,32767,1,32767,35,32767,0,32767,65534,0,1,0,1,8192,0,65534,1,1,0,43252,32767,0,0,0,13,19660,32767,32767,32767,65534,0,62796,31268,0,58371,61440,15151,55383,1,2,0,34903,10,11534,32767,13238,32767,29049,34678,45806,0,0,0,29700,1,32767,30146,3,24641,0,0,42631,37748,37619,49151,0,45419,32767,14417,0,1311,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,32767,32767,32767,31394,35643,65534,65534,2,1,42631,27833,32767,32767,32767,0,21845,32767,0,32767,43870,43711,0,65534,32767,0,0,28086,32767,45806,0,0,0,0,22903,6182,1,32767,32767,32767,31268,32767,1,64078,0,21845,32767,29622,23129,0,0,0,32767,53738,32767,6553,42631,1,0,0,0,0,32767,0,0,32767,1,32767,35,32767,0,32767,65534,0,1,0,1,8192,0,65534,1,1,0,47184,32767,0,0,0,14,43908,32767,32767,32767,32767,0,51433,31268,0,43689,65534,0,50995,1,2,0,7864,10,14942,26214,8323,32767,27737,33040,45806,0,0,12540,31620,1,32767,31784,2,20709,1,0,46364,41090,45806,45055,0,48207,32767,14417,0,1311,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,32767,32767,32767,31947,31518,65534,55599,2,1,42631,27833,32767,32767,43252,0,21845,32767,0,32767,46843,43711,0,65534,32767,0,0,28086,32767,45806,0,0,0,0,22903,6182,1,32767,32767,32767,35655,32767,1,64078,0,21845,32767,45859,44107,0,0,0,16384,53738,32767,6553,42631,1,0,0,0,0,19114,7,0,32767,1,32767,38,32767,0,32767,65534,0,1,0,1,8192,0,65534,1,1,0,47080,32767,0,0,0,15,32767,32767,32767,32767,26214,9864,47795,31268,0,43689,61440,0,45806,1,2,0,7864,10,14942,26214,8323,32767,27737,33040,45806,0,0,12540,31620,1,32767,31784,3,20709,1,0,46364,41090,45806,45055,0,45419,32767,14417,0,1311,32767,32767,32767,0,32767,32767,32767,32767,32767,32767,32767,32767,32767,31947,31518,65534,55599,2,1,42631,27833,32767,32767,35388,0,21845,32767,0,32767,46843,43711,0,65534,32767,0,0,28086,32767,45806,0,0,0,0,22903,6182,1,32767,32767,32767,35655,32767,1,64078,0,21845,32767,45859,44107,0,0,0,16384,53738,32767,19660,42631,1,0,0,0,0,32767,11,0,32767,1,32767,38,32767,0,32767,65534,0,1,0,1,8192,0,65534,1,1]
REF_SHA = '7bfadae01975d70b00c675d2ed07c68574061f0a49406178272015f29db39e86'

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
            check((f[6] | f[7]<<7) == 58, 'Not Amp1')
            count = f[8] | f[9]<<7; started = True
        elif f[5] == 117:
            check(started and len(f) >= 10 and (len(f)-10)%3 == 0, 'Malformed body')
            sections.append({'section':f[6], 'flag':f[7], 'values':(len(f)-10)//3})
            for i in range(8,len(f)-2,3):
                check(f[i+2] <= 3, 'Invalid uint16')
                values.append(f[i] | f[i+1]<<7 | f[i+2]<<14)
        else:
            check(started and len(f) == 8, 'Malformed end'); ended = True
    check(started and ended, 'Incomplete response')
    check(count == len(values), 'Value count mismatch')
    comparable = count == len(EXPECTED)
    diff = [{'channel':'ABCD'[i//144], 'parameterIndex':i%144, 'expected':y, 'actual':x}
            for i,(x,y) in enumerate(zip(values,EXPECTED)) if x != y] if comparable else []
    return {'effectId':58,'itemCount':count,'sections':sections,'values':values,
            'comparison':{'referenceSha256':REF_SHA,'comparable':comparable,
                          'exactMatch':comparable and not diff,'differences':diff}}

def collect(port, report, timeout=8):
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
        raise TimeoutError('No complete Amp reply within %s seconds'%timeout)
    finally:
        report['rawRxHex'] = raw.hex(); report['frames'] = framer.frames
        report['partialFrameHex'] = bytes(framer.partial or []).hex()
        try:
            if old is not None: termios.tcsetattr(fd,termios.TCSANOW,old)
        finally: os.close(fd)

def self_test():
    import pty, threading
    def frame(fn,payload=()):
        a=[240,0,1,116,17,fn,*payload]; return bytes(a+[checksum(a),247])
    frames=[frame(116,[58,0,64,4])]
    for i in range(0,576,256):
        words=EXPECTED[i:i+256]; payload=[0,2]
        for v in words: payload.extend([v&127,(v>>7)&127,v>>14])
        frames.append(frame(117,payload))
    frames.append(frame(118))
    assert frame(31,[58,0]) == GET
    assert decode([list(f) for f in frames])['comparison']['exactMatch']
    try: decode([list(f) for f in frames[:-1]])
    except ValueError: pass
    else: raise AssertionError('Incomplete accepted')
    master,slave=pty.openpty(); port=os.ttyname(slave); received=[]; errors=[]
    def device():
        try:
            end=time.monotonic()+2; req=b''
            while len(req)<10 and time.monotonic()<end:
                if select.select([master],[],[],0.1)[0]: req+=os.read(master,10-len(req))
            received.append(req)
            wire=b''.join(frames)
            for i in range(0,len(wire),97): os.write(master,wire[i:i+97]); time.sleep(.001)
        except Exception as e: errors.append(str(e))
    t=threading.Thread(target=device); t.start()
    report={'rxChunks':[]}
    try:
        result=collect(port,report,2);t.join(3)
        assert not errors and received==[GET] and report['txCalls']==1
        assert result['comparison']['exactMatch'] and report['responseCompleteBeforeClose']
    finally: os.close(master);os.close(slave)
    print('PASS: simulated serial response received before close; exact comparison; one GET; incomplete rejected. No physical device used.')

def main():
    parser=argparse.ArgumentParser(); group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--port');group.add_argument('--self-test',action='store_true');args=parser.parse_args()
    if args.self_test: self_test();return
    check(args.port.startswith('/dev/cu.'),'Use the confirmed macOS /dev/cu.* port')
    now=datetime.datetime.now(datetime.timezone.utc)
    dest=Path(__file__).resolve().parent/('FM3_AMP_GET_v3_'+now.strftime('%Y-%m-%dT%H-%M-%S-%fZ')+'.json')
    report={'schemaVersion':1,'collectorVersion':3,'transport':'Python POSIX nonblocking select/read',
            'date':now.isoformat(),'port':args.port,'firmwareDeclared':13,'referenceSha256':REF_SHA,
            'txHex':GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending'}
    with dest.open('x',encoding='utf-8') as out:
        try:
            print('TX (one GET): '+GET.hex(),flush=True)
            report['decoded']=collect(args.port,report)
            report['status']='exact-match' if report['decoded']['comparison']['exactMatch'] else 'comparison-needed'
        except (Exception,KeyboardInterrupt) as e:
            report['status']='failed';report['error']=str(e) or 'Interrupted'
        finally: json.dump(report,out,indent=2);out.write('\n')
    print('Status: '+report['status'])
    if 'error' in report: print(report['error'])
    print('Upload this file: '+str(dest))
    if report['status']=='failed': sys.exit(1)

if __name__=='__main__': main()
