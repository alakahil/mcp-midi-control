"""Synthetic/offline + pseudoterminal tests. No FM3 device is contacted."""
import copy, json, os, pty, select, subprocess, sys, tempfile, threading, time, tty, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_PEQ_BASE_CHECK as app
import peq_transport as core
HERE=Path(__file__).resolve().parent

def node(code):
    r=subprocess.run(['node','--input-type=module','-e',code],cwd=HERE,capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    return json.loads(r.stdout)
words=node("import fs from 'node:fs';import {preflight} from './peq-check.mjs';console.log(JSON.stringify(preflight(fs.readFileSync('baseline.syx')).words));")
state=app.offline('preflight',HERE/'baseline.syx')

def frame(fn,data):
    f=[240,0,1,116,17,fn]+data
    return f+[core.checksum(f),247]
def frames(values,chunk=256):
    out=[frame(116,[54,0,len(values)&127,len(values)>>7])]
    for at in range(0,len(values),chunk):
        vv=values[at:at+chunk];payload=[len(vv)&127,len(vv)>>7]
        for v in vv:payload += [v&127,(v>>7)&127,(v>>14)&3]
        out.append(frame(117,payload))
    return out+[frame(118,[])]
def response(values=words):
    ff=frames(values)
    return {'status':'captured','syxSha256':state['sha256'],'txHex':core.GET.hex(),'txCalls':1,'txBytesWritten':10,'inputFlushedBeforeGet':True,'rawRxHex':bytes(v for f in ff for v in f).hex(),'frames':ff,'decoded':core.decode(ff)}
def rejected(fn):
    try:fn()
    except (ValueError,AssertionError,TimeoutError):return
    raise AssertionError('Expected rejection')

assert core.GET.hex()=='f0000174111f36003df7' and core.checksum(core.GET[:-2])==core.GET[-2]
ff=frames(words);assert list(map(len,ff))==[12,406,8]
for chunk in (256,66,33):
    expected=frames(words,chunk);raw=bytes(v for f in expected for v in f);framer=core.Framer()
    for i in range(0,len(raw),11):framer.feed(raw[i:i+11])
    assert framer.frames==expected and core.decode(expected)['values']==words
bad_crc=copy.deepcopy(ff);bad_crc[1][-2]^=1
bad_id=copy.deepcopy(ff);bad_id[0]=frame(116,[114,0,4,1])
for f in (ff[:-1],ff+[ff[-1]],bad_crc,bad_id,frames(words[:-1])):rejected(lambda:core.decode(f))
rejected(lambda:core.collect('/must-not-open',{'txCalls':1}))

# A POSIX pseudoterminal is not a device: exercise the actual one-write loop.
master,slave=pty.openpty();observed=[];errors=[]
def peer():
    try:
        tx=b'';deadline=time.monotonic()+2
        while len(tx)<10 and time.monotonic()<deadline:
            ready,_,_=select.select([master],[],[],0.1)
            if ready:tx+=os.read(master,1024)
        observed.append(tx)
        raw=bytes(v for f in ff for v in f)
        os.write(master,raw)
    except BaseException as e:errors.append(str(e))
thread=threading.Thread(target=peer);thread.start()
r={'txCalls':0,'rxChunks':[]}
try:actual=core.collect(os.ttyname(slave),r,timeout=2)
finally:thread.join(3);os.close(master);os.close(slave)
assert not errors and observed==[core.GET] and r['txCalls']==1 and actual['values']==words
master,slave=pty.openpty();r={'txCalls':0,'rxChunks':[]}
try:
    rejected(lambda:core.collect(os.ttyname(slave),r,timeout=0.15))
    assert os.read(master,1024)==core.GET and r['txCalls']==1
finally:os.close(master);os.close(slave)
master,slave=pty.openpty();r={'txCalls':0,'rxChunks':[]}
try:
    tty.setraw(slave);os.write(master,bytes(v for f in ff for v in f))
    assert select.select([slave],[],[],0.5)[0], 'Stale response must be queued before request'
    rejected(lambda:core.collect(os.ttyname(slave),r,timeout=0.15))
    assert r['inputFlushedBeforeGet'] and r['rawRxHex']=='' and os.read(master,1024)==core.GET
finally:os.close(master);os.close(slave)

pair_negative=0
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp);root=tmp/'session';args=['script','--session',str(root),'--port','/dev/cu.mock']
    def fake(port,r):r.update(response());return r['decoded']
    with patch.object(sys,'argv',args),patch('builtins.input',return_value='jah'),patch.object(core,'collect',side_effect=fake) as call:
        app.main();assert call.call_count==1
    assert len(app.session(root))==1
    with patch.object(sys,'argv',args),patch('builtins.input',side_effect=AssertionError('No prompt on completed resume')),patch.object(core,'collect',side_effect=AssertionError('No repeated GET')):app.main()
    with patch.object(sys,'argv',['script','--session',str(root),'--export-only']),patch.object(core,'collect',side_effect=AssertionError('No export-only GET')):app.main()
    quitroot=tmp/'quit'
    with patch.object(sys,'argv',['script','--session',str(quitroot),'--port','/dev/cu.mock']),patch('builtins.input',return_value='q'),patch.object(core,'collect',side_effect=AssertionError('No GET after q')):app.main()
    assert not list(quitroot.glob('capture-*'))
    failroot=tmp/'failed'
    def timeout(port,r):r.update(txCalls=1,txBytesWritten=10,rawRxHex='');raise TimeoutError('Synthetic timeout')
    with patch.object(sys,'argv',['script','--session',str(failroot),'--port','/dev/cu.mock']),patch('builtins.input',return_value='jah'),patch.object(core,'collect',side_effect=timeout) as call:
        rejected(app.main);assert call.call_count==1
    failed=list(failroot.glob('capture-*'));assert len(failed)==1 and json.loads((failed[0]/'capture.json').read_text())['status']=='failed'
    with patch.object(sys,'argv',['script','--session',str(failroot),'--port','/dev/cu.mock']),patch('builtins.input',return_value='jah'),patch.object(core,'collect',side_effect=fake) as call:
        app.main();assert call.call_count==1
    assert len(list(failroot.glob('capture-*')))==2 and len(app.session(failroot))==1
    folder=tmp/'pair';folder.mkdir();(folder/'donor.syx').write_bytes((HERE/'baseline.syx').read_bytes());report=response()
    (folder/'capture.json').write_text(json.dumps(report));assert app.offline('pair',folder)['matchedWords']==132
    changed=words.copy();changed[0]^=1
    for bad in [dict(report,txCalls=2),dict(report,txBytesWritten=9),dict(report,txHex='f0000174111f720079f7'),dict(report,syxSha256='bad'),dict(report,status='failed'),dict(report,inputFlushedBeforeGet=False),response(changed),dict(report,rawRxHex=report['rawRxHex'][:-2]),dict(report,frames=[])]:
        (folder/'capture.json').write_text(json.dumps(bad));rejected(lambda:app.offline('pair',folder));pair_negative+=1
    modified=tmp/'changed.syx';b=bytearray((HERE/'baseline.syx').read_bytes());b[100]^=1;modified.write_bytes(b);rejected(lambda:app.offline('preflight',modified))
    interrupted=tmp/'interrupted';app.session(interrupted)
    partials=[None,b'{truncated',b'{"status":"pending"}',b'[]']
    for i,data in enumerate(partials):
        f=interrupted/('capture-interrupted-'+str(i));f.mkdir();(f/'donor.syx').write_bytes((HERE/'baseline.syx').read_bytes())
        if data is not None:(f/'capture.json').write_bytes(data)
    incomplete=[];assert app.session(interrupted,incomplete)==[] and len(incomplete)==4
    with patch.object(sys,'argv',['script','--session',str(interrupted),'--export-only']),patch.object(core,'collect',side_effect=AssertionError('No incomplete export GET')):app.main()
    assert (interrupted/'capture-interrupted-1'/'capture.json').read_bytes()==b'{truncated'
    zips=list(tmp.glob('*.zip'));assert len(zips)==7
    for z in zips:
        with zipfile.ZipFile(z) as archive:assert archive.testzip() is None and 'baseline.syx' in archive.namelist() and 'session.json' in archive.namelist()
result={'date':'2026-10-09','passed':True,'syntheticOnly':True,'deviceConnectionMade':False,'parameterWords':132,'replyShapesTested':[132,66,33],'invalidPairCasesRejected':pair_negative,'pseudoterminalSingleGet':True,'pseudoterminalTimeoutNoRetry':True,'staleQueuedResponseFlushed':True,'incompleteEvidencePreservedCases':4,'explicitConfirmationRequired':True,'quitBeforeDeviceOpen':True,'completedResumeNoGet':True,'failedResumeRequiresNewConfirmation':True,'failureEvidenceAndZipPreserved':True,'hardware':'First actual PEQ GET/SYX pair still pending'}
(HERE/'TEST_RESULTS.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
