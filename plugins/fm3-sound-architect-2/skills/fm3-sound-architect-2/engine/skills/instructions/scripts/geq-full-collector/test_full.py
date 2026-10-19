"""Synthetic/offline and pseudoterminal checks; never contacts an FM3."""
import contextlib, copy, fcntl, io, json, os, pty, select, subprocess, sys, tempfile, threading, time, tty, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_GEQ_FULL as app
import geq_transport as core
from geq_plan import build_plan, validate_setup
HERE=Path(__file__).resolve().parent
SETUP={'bypassModes':['Thru','Mute'],'otherControls':''}
PLAN=build_plan(SETUP)

def frame(fn,payload):
    data=[240,0,1,116,17,fn]+payload
    return data+[core.checksum(data),247]
def reply(words,chunk=80):
    frames=[frame(116,[50,0,len(words)&127,len(words)>>7])]
    for at in range(0,len(words),chunk):
        selected=words[at:at+chunk];data=[len(selected)&127,len(selected)>>7]
        for value in selected:data += [value&127,(value>>7)&127,(value>>14)&3]
        frames.append(frame(117,data))
    frames.append(frame(118,[]))
    return dict(status='captured',txHex=core.GET.hex(),txCalls=1,txBytesWritten=10,
        inputFlushedBeforeGet=True,frames=frames,rawRxHex=bytes(v for f in frames for v in f).hex(),decoded=core.decode(frames))
def rejected(fn):
    try:fn()
    except (ValueError,AssertionError,TimeoutError):return
    raise RuntimeError('Invalid input accepted')
def run(root,answers,collector,export=False):
    argv=['collector','--session',str(root)]+(['--export-only'] if export else ['--port','/dev/cu.mock'])
    with patch.object(sys,'argv',argv),patch('builtins.input',side_effect=answers),patch.object(core,'collect',side_effect=collector) as call:
        app.main();return call.call_count
def no_device(*args):raise RuntimeError('Unexpected device I/O')
def answers_for(tmp,start,end,master=True):
    answers=[]
    for i in range(start,end):
        s=PLAN[i];answers.append('' if s['kind']=='baseline' else str(tmp/f'{i}.syx'))
        if s['kind'] in ['baseline','type']:
            answers += ['', ';'.join('label'+str(n) for n in range(s['bandCount'])), 'jah' if master else 'ei','']
        elif s['kind']=='bands':answers.append('-20' if s.get('endpoint')=='minimum' else '20' if s.get('endpoint')=='maximum' else '')
        elif s['kind']=='control':
            if 'endpoint' not in s:answers.append('')
            else:answers.append({'Master Q':('0.1','10'),'Level':('-80','20'),'Balance':('-100','100')}[s['parameter']][s['endpoint']=='maximum'])
        answers.append('jah')
    return answers
def init(root):
    root.mkdir();app.dump(root/'setup.json',SETUP);return app.resume(root)

assert len(PLAN)==184 and len(build_plan(dict(SETUP,bypassModes=['Thru','Mute','Test Mode'])))==185
for setup in [dict(SETUP,bypassModes=['Mute']),dict(SETUP,bypassModes=['Thru','Thru']),dict(SETUP,bypassModes=[]),{}]:rejected(lambda:validate_setup(setup))
assert core.GET.hex()=='f0000174111f320039f7' and core.checksum(core.GET[:-2])==core.GET[-2]
with contextlib.redirect_stdout(io.StringIO()),tempfile.TemporaryDirectory() as td:
    tmp=Path(td);(tmp/'plan.json').write_text(json.dumps(PLAN))
    code=r'''
    import fs from 'node:fs';import path from 'node:path';
    import {inspectStructure} from './fm3-prototype.mjs';
    import {reencodeDumpFromRawPatch,reencodeRawPatch,parsePresetDump,serializePresetDump} from './fm3-codec.mjs';
    import {compare} from './full-check.mjs';
    const out=process.argv[1],seed=fs.readFileSync('baseline.syx'),s=inspectStructure(seed),base=Buffer.from(s.raw.body),b=Buffer.from(base),plan=JSON.parse(fs.readFileSync(path.join(out,'plan.json'))),all=[];
    const encode=(body,raw=s.raw.rawPatch)=>Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(raw,body)));
    const write=(name,body,raw)=>fs.writeFileSync(path.join(out,name),encode(body,raw));
    let prev=seed;
    for(let i=0;i<plan.length;i++){
      const st=plan[i],ch='ABCD'.indexOf(st.channel),off=8354+ch*40;
      if(st.kind==='copy-channel'){b.copy(b,off,8354,8394);b.writeUInt16LE(ch,8320);}
      else if(st.kind==='select-channel')b.writeUInt16LE(ch,8320);
      else if(st.kind==='type'){
        b.writeUInt16LE(i,8384);b.writeUInt16LE(i*13,8386); // synthetic coupled Q
      }else if(st.kind==='bands'){
        // Sparse/reordered gain slots prove the collector does not guess PID from position.
        const slots=[0,4,9,2,8,1,7,3,6,5].slice(0,st.firstOnly?1:st.bandCount);
        slots.forEach((pid,n)=>b.writeUInt16LE(st.endpoint==='minimum'?0:st.endpoint==='maximum'?65534:Math.round(32767+(st.values[n])*100),off+2*pid));
      }else if(st.kind==='control'){
        const pid={'Level':11,'Balance':12,'Bypass Mode':13,'Master Q':16,'Scene Ignore':19}[st.parameter];
        for(const c of st.parameter==='Scene Ignore'?[0,1,2,3]:[ch])b.writeUInt16LE((i*137)%65535,8354+c*40+pid*2);
      }
      write(i+'.syx',b);const bytes=fs.readFileSync(path.join(out,i+'.syx'));
      compare(prev,bytes,st);prev=bytes;all.push(Array.from({length:80},(_,n)=>b.readUInt16LE(8354+n*2)));
    }
    const bands=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'2.syx'))).raw.body);
    for(const [name,off] of Object.entries({amp:4946,grid:424,routing:426,scene:0,sceneName:40,modifier:1584,otherScene:8322,bypass:8336,otherChannel:8394,tail:13632,mix:8374,globalMix:8382,spare:8388,type:8384,masterQ:8386,peq:8780})){
      const x=Buffer.from(bands);x[off]^=1;write(name+'.syx',x);
    }
    const name=Buffer.from(s.raw.rawPatch);name[11]=88;write('rename.syx',base,name);
    for(const off of [6,7,40,71]){const h=Buffer.from(name);h[off]^=1;write('header-'+off+'.syx',bands,h);}
    for(let ch=0;ch<8;ch++)for(let byte=0;byte<2;byte++){
      const p=parsePresetDump(fs.readFileSync(path.join(out,'2.syx')));p.chunkPayloads[ch][byte]^=1;
      fs.writeFileSync(path.join(out,'prefix-'+ch+'-'+byte+'.syx'),Buffer.from(serializePresetDump(p)));
    }
    const wrong=Buffer.from(base);wrong.writeUInt16LE(12345,8386);write('wrong-only.syx',wrong);
    const cp=plan.findIndex(x=>x.kind==='copy-channel'),badcopy=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,cp+'.syx'))).raw.body);badcopy[8394]^=1;write('badcopy.syx',badcopy);
    const badselect=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'183.syx'))).raw.body);badselect[8354]^=1;write('badselect.syx',badselect);
    console.log(JSON.stringify(all));
    '''
    r=subprocess.run(['node','--input-type=module','-e',code,str(tmp)],cwd=HERE,capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    words=json.loads(r.stdout);assert len(words)==184
    badnames=['amp','grid','routing','scene','sceneName','modifier','otherScene','bypass','otherChannel','tail','mix','globalMix','spare','type','masterQ','peq']
    badnames += ['header-'+str(i) for i in [6,7,40,71]]+[f'prefix-{c}-{b}' for c in range(8) for b in range(2)]
    for name in badnames:rejected(lambda:app.offline('compare',tmp/'1.syx',tmp/(name+'.syx'),json.dumps(PLAN[2])))
    assert app.offline('compare',HERE/'baseline.syx',tmp/'rename.syx',json.dumps(PLAN[0]))['presetNameChange']
    assert app.offline('compare',HERE/'baseline.syx',tmp/'1.syx',json.dumps(PLAN[1]))['typeCoupledChanges'][0]['pid']==16
    rejected(lambda:app.offline('compare',HERE/'baseline.syx',tmp/'wrong-only.syx',json.dumps(PLAN[1])))
    rejected(lambda:app.offline('compare',HERE/'baseline.syx',tmp/'1.syx',json.dumps(PLAN[0])))
    cp=next(i for i,s in enumerate(PLAN) if s['kind']=='copy-channel')
    rejected(lambda:app.offline('compare',tmp/f'{cp-1}.syx',tmp/'badcopy.syx',json.dumps(PLAN[cp])))
    rejected(lambda:app.offline('compare',tmp/'182.syx',tmp/'badselect.syx',json.dumps(PLAN[183])))

    cursor=[0]
    def simulated(port,report):report.update(reply(words[cursor[0]]));cursor[0]+=1;return report['decoded']
    root=tmp/'session'
    assert run(root,['','']+answers_for(tmp,0,91)+['q'],simulated)==91
    assert app.resume(root)[0]==91
    assert run(root,answers_for(tmp,91,184),simulated)==93
    assert app.resume(root)[0]==184 and cursor[0]==184
    assert run(root,[],no_device)==0 and run(root,[],no_device,True)==0
    assert run(tmp/'quitsetup',['q'],no_device)==0
    assert run(tmp/'quitbase',['','','q'],no_device)==0
    rejected(lambda:run(tmp/'skipbase',['','','s'],no_device))
    no_q=tmp/'noq';cursor[0]=0
    assert run(no_q,['','']+answers_for(tmp,0,6,False)+['q'],simulated)==6
    assert app.resume(no_q)[0]==10
    assert len([p for p in no_q.glob('step-*/result.json') if json.loads(p.read_text()).get('automatic')])==4
    skip=tmp/'skip';cursor[0]=0
    assert run(skip,['','']+answers_for(tmp,0,1)+['s','Valik puudub','q'],simulated)==1
    assert app.resume(skip)[0]==10
    def first(port,report):report.update(reply(words[0]));return report['decoded']
    def wrong(port,report):report.update(reply(words[1]));return report['decoded']
    rejected(lambda:run(tmp/'mismatch',['','']+answers_for(tmp,0,1),wrong))
    assert app.resume(tmp/'mismatch')[0]==0
    assert run(tmp/'mismatch',answers_for(tmp,0,1)+['q'],first)==1
    for stop in [0,1,2,3,4,5]:
        answers=answers_for(tmp,0,1)[:stop]+['q']
        assert run(tmp/('cancel'+str(stop)),['','']+answers,no_device)==0
    def timeout(port,report):report.update(txCalls=1,txBytesWritten=10,rawRxHex='');raise TimeoutError('Synthetic timeout')
    rejected(lambda:run(tmp/'timeout',['','']+answers_for(tmp,0,1),timeout))
    assert app.resume(tmp/'timeout')[0]==0
    assert run(tmp/'timeout',answers_for(tmp,0,1)+['q'],first)==1
    partial=tmp/'partial';init(partial)
    for i,content in enumerate([None,b'{truncated',b'{"status":"pending"}',b'[]']):
        f=partial/f'step-000-partial-{i}';f.mkdir();(f/'donor.syx').write_bytes((tmp/'0.syx').read_bytes())
        if content is not None:(f/'result.json').write_bytes(content)
    incomplete=[];assert app.resume(partial,incomplete)[0]==0 and len(incomplete)==4
    assert run(partial,[],no_device,True)==0
    lockroot=tmp/'locked';lockroot.mkdir()
    with (lockroot/'.collector.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);rejected(lambda:run(lockroot,[],no_device))
    pairdir=tmp/'pair';pairdir.mkdir();(pairdir/'donor.syx').write_bytes((tmp/'0.syx').read_bytes())
    for chunk in [80,40,20]:
        report=reply(words[0],chunk);report['syxSha256']=app.offline('preflight',tmp/'0.syx')['sha256']
        app.dump(pairdir/'capture.json',report);assert app.offline('pair',pairdir)['matchedWords']==80
    bads=[dict(report,txCalls=2),dict(report,txBytesWritten=9),dict(report,inputFlushedBeforeGet=False),dict(report,syxSha256='bad'),dict(report,rawRxHex=report['rawRxHex'][:-2]),dict(report,frames=[]),dict(report,decoded={}),dict(report,status='failed')]
    for bad in bads:app.dump(pairdir/'capture.json',bad);rejected(lambda:app.offline('pair',pairdir))
    ep=next(s for s in PLAN if s.get('parameter')=='Level' and s.get('endpoint')=='minimum')
    assert app.display_control('-inf',ep)=='-inf';rejected(lambda:app.display_control('',ep))
    for v in ['nan','inf','-1','0']:rejected(lambda:app.number(v,positive=True))
    rejected(lambda:app.display_bands('1',PLAN[2]))
    assert app.display_bands('0,5;1;1,5',PLAN[2])==[.5,1,1.5]
    for archive in tmp.glob('FM3_GEQ_FULL_*.zip'):
        with zipfile.ZipFile(archive) as z:assert z.testzip() is None and {'session.json','plan.json','baseline.syx'}<=set(z.namelist())
    passed=sorted(root.glob('step-*/result.json'))[0];record=json.loads(passed.read_text());record['observations']['ui']['bandLabels']=[];app.dump(passed,record)
    rejected(lambda:app.resume(root))

# Real transport loop exercised against POSIX pseudoterminals, not hardware.
ff=reply(words[0])['frames'];assert list(map(len,ff))==[12,250,8]
for chunk in [80,40,20]:
    expected=reply(words[0],chunk)['frames'];raw=bytes(v for f in expected for v in f);framer=core.Framer()
    for i in range(0,len(raw),11):framer.feed(raw[i:i+11])
    assert framer.frames==expected and core.decode(expected)['values']==words[0]
bad_crc=copy.deepcopy(ff);bad_crc[1][-2]^=1
bad_id=copy.deepcopy(ff);bad_id[0]=frame(116,[54,0,80,0])
for f in [ff[:-1],ff+[ff[-1]],bad_crc,bad_id]:rejected(lambda:core.decode(f))
rejected(lambda:core.collect('/must-not-open',{'txCalls':1}))
master,slave=pty.openpty();observed=[];errors=[]
def peer():
    try:
        tx=b'';deadline=time.monotonic()+2
        while len(tx)<10 and time.monotonic()<deadline:
            ready,_,_=select.select([master],[],[],0.1)
            if ready:tx+=os.read(master,1024)
        observed.append(tx);os.write(master,bytes(v for f in ff for v in f))
    except BaseException as e:errors.append(str(e))
thread=threading.Thread(target=peer);thread.start();r={'txCalls':0,'rxChunks':[]}
try:actual=core.collect(os.ttyname(slave),r,timeout=2)
finally:thread.join(3);os.close(master);os.close(slave)
assert not errors and observed==[core.GET] and r['txCalls']==1 and actual['values']==words[0]
for stale in [False,True]:
    master,slave=pty.openpty();r={'txCalls':0,'rxChunks':[]}
    try:
        if stale:
            tty.setraw(slave);os.write(master,bytes(v for f in ff for v in f));assert select.select([slave],[],[],.5)[0]
        rejected(lambda:core.collect(os.ttyname(slave),r,timeout=.15))
        assert os.read(master,1024)==core.GET and r['txCalls']==1 and r['rawRxHex']=='' and r['inputFlushedBeforeGet']
    finally:os.close(master);os.close(slave)
summary=dict(date='2026-10-09',passed=True,syntheticOnly=True,deviceConnectionMade=False,
    sequentialSteps=184,mockGets=184,pairedWordsEach=80,resumeAfter91=True,
    scopeNegatives=len(badnames)+4,pairNegatives=len(bads),renameAtByte11Accepted=True,
    typeCouplingRecorded=True,sparseGainSlotsSupported=True,copyMustMatchAll20Words=True,
    all18TypeGroups=True,actualBandLabelsRequired=True,absentMasterQAutoSkips=4,extraBypassModeExtendsPlan=True,
    quitSkipCancelTimeoutResume=True,noAutomaticRetry=True,simultaneousSessionRejected=True,
    incompleteEvidencePreserved=4,completedResumeAndExportNoGet=True,
    pseudoterminalSingleGet=True,pseudoterminalTimeoutNoRetry=True,staleQueuedResponseFlushed=True,
    hardware='No actual GEQ GET yet. Types, scales, A-D generation and audio still require hardware evidence.')
(HERE/'TEST_RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
