#!/usr/bin/env python3
"""Resumable macOS Amp collector. One explicit GET per capture, no retries/SET/SAVE.
Status, pair and self-test never access hardware. Python standard library only.
"""
import argparse, datetime, hashlib, json, os, re, select, sys, time, uuid
from pathlib import Path

GET = bytes.fromhex('f0000174111f3a0031f7')
MARKER = {'schemaVersion': 1, 'kind': 'fm3-amp-session', 'firmware': 13}

def check(ok, message):
    if not ok: raise ValueError(message)

def checksum(data):
    n = 0
    for v in data: n ^= v
    return n & 127

def decode(raw):
    check(len(raw) == 1778, 'Incomplete/unsupported reply length')
    frames = []; at = 0
    while at < len(raw):
        check(raw[at] == 240, 'Invalid frame boundary')
        end = raw.find(b'\xf7', at + 1); check(end >= 0, 'Incomplete frame')
        f = raw[at:end+1]
        check(len(f) >= 8 and f[:5] == bytes([240,0,1,116,17]), 'Wrong FM3 envelope')
        check(all(v < 128 for v in f[1:-1]), 'Non-seven-bit data')
        check(checksum(f[:-2]) == f[-2], 'Checksum mismatch')
        frames.append(f); at = end+1
    check([f[5] for f in frames] == [116,117,117,117,118], 'Unexpected frame order')
    check([len(f) for f in frames] == [12,778,778,202,8], 'Unsupported frame layout')
    check(frames[0][6:10] == bytes([58,0,64,4]), 'Expected Amp1, 576 words')
    values = []
    for f in frames[1:-1]:
        check((f[6] | f[7]<<7) == (len(f)-10)//3, 'Body word count mismatch')
        for i in range(8,len(f)-2,3):
            check(f[i+2] <= 3, 'Invalid uint16')
            values.append(f[i] | f[i+1]<<7 | f[i+2]<<14)
    return {'effectId':58, 'itemCount':576, 'values':values}, [list(f) for f in frames]

def collect(port, report, timeout=8):
    import termios, tty, fcntl
    fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    old = None; raw = bytearray()
    try:
        old = termios.tcgetattr(fd)
        if hasattr(termios, 'TIOCEXCL'): fcntl.ioctl(fd, termios.TIOCEXCL)
        tty.setraw(fd, termios.TCSANOW)
        attrs = termios.tcgetattr(fd); attrs[4] = attrs[5] = termios.B115200
        attrs[2] |= termios.CLOCAL | termios.CREAD
        termios.tcsetattr(fd, termios.TCSANOW, attrs)
        # Do not attribute pre-existing queued bytes to the new request.
        check(not select.select([fd],[],[],0)[0], 'Port already receiving data; close other MIDI apps')
        start = time.monotonic(); report['txCalls'] = 1
        sent = os.write(fd, GET)  # the only hardware write; no retry on short write
        report['txBytesWritten'] = sent
        check(sent == len(GET), 'Partial GET write; no retry')
        while time.monotonic()-start < timeout:
            if not select.select([fd],[],[],min(.1, timeout))[0]: continue
            try: chunk = os.read(fd,4096)
            except BlockingIOError: continue
            check(bool(chunk), 'Serial EOF')
            raw.extend(chunk)
            report['rxChunks'].append({'afterMs':round((time.monotonic()-start)*1000,3), 'bytes':len(chunk)})
            check(len(raw) <= 1778, 'Unexpected extra RX bytes')
            if len(raw) == 1778:
                decoded, frames = decode(raw)
                report['decoded'] = decoded; report['frames'] = frames
                report['responseCompleteBeforeClose'] = True
                return
        raise TimeoutError('No complete Amp reply within %s seconds' % timeout)
    finally:
        report['rawRxHex'] = raw.hex()
        try:
            if old is not None: termios.tcsetattr(fd, termios.TCSANOW, old)
        finally: os.close(fd)

def put_new(path, data):
    """Publish a complete new file; never replace an existing capture/pair."""
    tmp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.pending')
    with tmp.open('xb') as out:
        out.write(data); out.flush(); os.fsync(out.fileno())
    os.link(tmp, path)  # atomic create-if-absent, same filesystem
    tmp.unlink()

def session(root, create=False):
    root = Path(root).expanduser()
    if not root.exists():
        check(create, 'Session does not exist')
        root.mkdir(parents=True)
        put_new(root/'session.json', (json.dumps(MARKER)+'\n').encode())
    check(not root.is_symlink(), 'Session cannot be a symlink')
    marker = root/'session.json'
    check(marker.is_file() and not marker.is_symlink(), 'Missing session.json; use a new session directory')
    check(json.loads(marker.read_text()) == MARKER, 'Incompatible session')
    return root

def pair(folder, syx):
    check(not folder.is_symlink() and folder.is_dir(), 'Unknown capture directory')
    data = Path(syx).expanduser().read_bytes()
    check(len(data) == 24680, 'Expected one 24680-byte SYX; full validation happens during build')
    put_new(folder/'donor.syx', data)

def status(root):
    rows=[]; variants={}
    for folder in sorted(root.glob('capture-*')):
        if not folder.is_dir() or folder.is_symlink(): continue
        row={'id':folder.name}
        try:
            p=folder/'capture.json'; check(not p.is_symlink(), 'Symlink not allowed')
            if not p.exists(): row['state']='interrupted'; rows.append(row); continue
            r=json.loads(p.read_text()); check(r['txHex']==GET.hex() and r['txCalls']==1 and r['firmwareDeclared']==13, 'Invalid capture metadata')
            check(r.get('status')!='failed', r.get('error','Failed attempt'))
            d,_=decode(bytes.fromhex(r['rawRxHex']))
            row['state']='paired-unverified' if (folder/'donor.syx').is_file() else 'awaiting-syx'
            row['modelIds']=[d['values'][k*144+6] for k in range(4)]
            for k,model in enumerate(row['modelIds']):
                raw=b''.join(v.to_bytes(2,'little') for v in d['values'][k*144:(k+1)*144])
                variants.setdefault(model,{}).setdefault(hashlib.sha256(raw).hexdigest(),[]).append(folder.name+':'+ 'ABCD'[k])
        except Exception as e: row.update(state='failed-or-invalid',error=str(e))
        rows.append(row)
    return {'captures':rows,'uniqueModelIds':len(variants),'variants':variants,
            'conflictingModelIds':[m for m,v in variants.items() if len(v)>1],
            'note':'Transport summary only; Node build performs paired-SYX validation.'}

def self_test():
    import pty, threading, tempfile
    def frame(fn,payload=()):
        b=bytes([240,0,1,116,17,fn,*payload]); return b+bytes([checksum(b),247])
    values=[(i*71)%65536 for i in range(576)]
    frames=[frame(116,[58,0,64,4])]
    for i in range(0,576,256):
        words=values[i:i+256]; payload=[len(words)&127,len(words)>>7]
        for v in words: payload += [v&127,(v>>7)&127,v>>14]
        frames.append(frame(117,payload))
    wire=b''.join(frames)+frame(118)
    assert decode(wire)[0]['values']==values
    for bad in [wire[:-1],wire+b'\0',bytes([0])+wire[1:]]:
        try: decode(bad)
        except ValueError: pass
        else: raise AssertionError('Invalid reply accepted')
    for response,success in [(wire,True),(wire[:100],False)]:
        master,slave=pty.openpty(); seen=[]
        def device():
            request=b''; end=time.monotonic()+2
            while len(request)<10 and time.monotonic()<end:
                if select.select([master],[],[],.05)[0]: request+=os.read(master,10-len(request))
            seen.append(request)
            for i in range(0,len(response),83): os.write(master,response[i:i+83]);time.sleep(.001)
        t=threading.Thread(target=device);t.start(); report={'rxChunks':[]}
        try:
            try: collect(os.ttyname(slave),report,.4)
            except TimeoutError: assert not success
            else: assert success and report['decoded']['values']==values
            t.join(2);assert seen==[GET] and report['txCalls']==1
            assert bytes.fromhex(report['rawRxHex']) == response
        finally: os.close(master);os.close(slave)
    with tempfile.TemporaryDirectory() as tmp:
        root=session(Path(tmp)/'session',True); assert session(root)==root
        folder=root/'capture-test';folder.mkdir();assert status(root)['captures'][0]['state']=='interrupted'
        p=folder/'test';put_new(p,b'original')
        try: put_new(p,b'replacement')
        except FileExistsError: pass
        else: raise AssertionError('Overwrite allowed')
        assert p.read_bytes()==b'original'
        # Ctrl-C during reception still commits the partial attempt and exits nonzero.
        from unittest.mock import patch
        from contextlib import redirect_stdout
        from io import StringIO
        def interrupted(port, report):
            report.update(txCalls=1, rawRxHex='f000', rxChunks=[])
            raise KeyboardInterrupt()
        with redirect_stdout(StringIO()), patch.object(sys,'argv',['collector','capture','--session',str(root),'--port','/dev/cu.TEST','--firmware','13']), patch(__name__+'.collect',interrupted):
            try: main()
            except SystemExit as e: assert e.code==1
            else: raise AssertionError('Interrupted attempt reported success')
        attempts=list(root.glob('capture-*/capture.json'));assert len(attempts)==1
        saved=json.loads(attempts[0].read_text());assert saved['status']=='failed' and saved['rawRxHex']=='f000'
    print('PASS: fragmented PTY capture; timeout retained raw bytes; one GET each; malformed replies rejected; session resume; overwrite refused. No hardware used.')

def main():
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    c=sub.add_parser('capture');c.add_argument('--session',required=True);c.add_argument('--port',required=True)
    c.add_argument('--firmware',type=int,choices=[13],required=True);c.add_argument('--syx')
    s=sub.add_parser('status');s.add_argument('--session',required=True)
    q=sub.add_parser('pair');q.add_argument('--session',required=True);q.add_argument('--id',required=True);q.add_argument('--syx',required=True)
    sub.add_parser('self-test');args=p.parse_args()
    if args.command=='self-test': self_test();return
    root=session(args.session,args.command=='capture')
    if args.command=='status': print(json.dumps(status(root),indent=2));return
    if args.command=='pair':
        check(re.fullmatch(r'capture-[A-Za-z0-9_-]+',args.id),'Invalid capture ID')
        pair(root/args.id,args.syx);print('SYX attached; full validation pending');return
    check(args.port.startswith('/dev/cu.'),'Use the confirmed macOS /dev/cu.* port')
    now=datetime.datetime.now(datetime.timezone.utc)
    folder=root/('capture-'+now.strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:12]);folder.mkdir()
    if args.syx: pair(folder,args.syx)
    report={'schemaVersion':1,'collectorVersion':4,'date':now.isoformat(),'firmwareDeclared':13,
            'transport':'Python POSIX nonblocking select/read','port':args.port,'txHex':GET.hex(),'txCalls':0,'rxChunks':[]}
    try:
        print('TX (one GET): '+GET.hex(),flush=True);collect(args.port,report);report['status']='captured'
    except (Exception,KeyboardInterrupt) as e: report.update(status='failed',error=str(e) or 'Interrupted')
    finally: put_new(folder/'capture.json',(json.dumps(report,indent=2)+'\n').encode())
    print('Status: '+report['status']);print('Saved: '+str(folder))
    if report['status']=='failed': print(report['error']);sys.exit(1)
    print('Model IDs A/B/C/D: '+str([report['decoded']['values'][k*144+6] for k in range(4)]))
    print('Captured only; paired SYX validation required before generator use.')

if __name__=='__main__':
    try: main()
    except Exception as e: print('Error: '+str(e),file=sys.stderr);sys.exit(1)
