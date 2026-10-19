"""Synthetic/offline and pseudoterminal checks. No FM3 is contacted."""
import contextlib, copy, fcntl, io, json, os, pty, select, subprocess, sys, tempfile, threading, time, tty, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_ENHANCER_FULL as app
import enhancer_transport as core
from enhancer_plan import build_plan,validate_setup,TYPES
HERE=Path(__file__).resolve().parent
SETUP=app.prepared_setup()
PLAN=build_plan(SETUP)
def frame(fn,payload):
    data=[240,0,1,116,17,fn]+payload
    return data+[core.checksum(data),247]
def reply(words,chunk=48):
    frames=[frame(116,[122,0,len(words)&127,len(words)>>7])]
    for at in range(0,len(words),chunk):
        selected=words[at:at+chunk];data=[len(selected)&127,len(selected)>>7]
        for value in selected:data += [value&127,(value>>7)&127,(value>>14)&3]
        frames.append(frame(117,data))
    frames.append(frame(118,[]))
    return dict(status='captured',txHex=core.GET.hex(),txCalls=1,txBytesWritten=10,inputFlushedBeforeGet=True,frames=frames,rawRxHex=bytes(v for f in frames for v in f).hex(),decoded=core.decode(frames))
def rejected(fn):
    try:fn()
    except (ValueError,AssertionError,TimeoutError):return
    raise RuntimeError('Invalid input accepted')
def no_device(*args):raise RuntimeError('Unexpected device I/O')
def init(root):
    root.mkdir();app.dump(root/'setup.json',SETUP);return app.resume(root)
def run(root,answers,collector,export=False):
    argv=['collector','--session',str(root)]+(['--export-only'] if export else ['--port','/dev/cu.mock'])
    with patch.object(sys,'argv',argv),patch('builtins.input',side_effect=answers),patch.object(core,'collect',side_effect=collector) as call:
        app.main();return call.call_count
def answers_for(tmp,start,end):
    answers=[]
    for i in range(start,end):
        s=PLAN[i];answers.append('' if s['kind']=='baseline' else str(tmp/f'{i}.syx'))
        if s['kind']=='control':answers.append('' if 'value' in s else {'minimum':'0','maximum':'100','lower':'25','middle':'50','upper':'75'}[s['point']])
        answers.append('jah')
    return answers
assert len(PLAN)==86
extra=copy.deepcopy(SETUP);extra['types']['Modern']['enums']['Bypass Mode']=['Extra'];assert len(build_plan(extra))==87
extra=copy.deepcopy(SETUP);extra['types']['Stereoizer']['numeric'].append('Balance');extra['types']['Stereoizer']['units']['Balance']='%';assert len(build_plan(extra))==91
bad=copy.deepcopy(SETUP);bad['types']['Classic']['extraControls']='new control';rejected(lambda:validate_setup(bad))
assert core.GET.hex()=='f0000174111f7a0071f7' and core.checksum(core.GET[:-2])==core.GET[-2]
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
      const st=plan[i],ch='ABCD'.indexOf(st.channel),off=7506+ch*24;
      if(st.kind==='copy-channel'){b.copy(b,off,7506,7530);b.writeUInt16LE(ch,7472);}
      else if(st.kind==='select-channel')b.writeUInt16LE(ch,7472);
      else if(st.kind==='type'){b.writeUInt16LE(i,7518);b.writeUInt16LE(i*13,7508);}
      else if(st.kind==='control'){
        const pid={'Width':0,'Depth':1,'Low Cut':2,'High Cut':3,'Level':4,'Bypass Mode':5,'Invert':7,'Pan L':8,'Pan R':9,'Balance':10,'Scene Ignore':11}[st.parameter];
        for(const c of st.parameter==='Scene Ignore'?[0,1,2,3]:[ch])b.writeUInt16LE((i*137)%65535,7506+c*24+pid*2);
      }
      write(i+'.syx',b);const bytes=fs.readFileSync(path.join(out,i+'.syx'));compare(prev,bytes,st);prev=bytes;
      all.push(Array.from({length:48},(_,n)=>b.readUInt16LE(7506+n*2)));
    }
    const scalar=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'1.syx'))).raw.body);
    for(const [name,off] of Object.entries({amp:4946,grid:428,routing:430,scene:0,sceneName:40,modifier:1584,otherScene:7474,bypass:7488,otherChannel:7530,tail:13774,type:7518,depth:7508,peq:9082,geq:8496})){
      const x=Buffer.from(scalar);x[off]^=1;write(name+'.syx',x);
    }
    const h=Buffer.from(s.raw.rawPatch);h[11]=88;write('rename.syx',base,h);
    for(const off of [6,7,40,71]){const bad=Buffer.from(h);bad[off]^=1;write('header-'+off+'.syx',scalar,bad);}
    for(let c=0;c<8;c++)for(let byte=0;byte<2;byte++){
      const p=parsePresetDump(fs.readFileSync(path.join(out,'1.syx')));p.chunkPayloads[c][byte]^=1;
      fs.writeFileSync(path.join(out,'prefix-'+c+'-'+byte+'.syx'),Buffer.from(serializePresetDump(p)));
    }
    const ti=plan.findIndex(x=>x.kind==='type'),wrong=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,(ti-1)+'.syx'))).raw.body);wrong[7508]^=1;write('wrong-only.syx',wrong);
    const cp=plan.findIndex(x=>x.kind==='copy-channel'),bc=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,cp+'.syx'))).raw.body);bc[7530]^=1;write('badcopy.syx',bc);
    const bs=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,(plan.length-1)+'.syx'))).raw.body);bs[7506]^=1;write('badselect.syx',bs);
    console.log(JSON.stringify(all));
    '''
    r=subprocess.run(['node','--input-type=module','-e',code,str(tmp)],cwd=HERE,capture_output=True,text=True);assert r.returncode==0,r.stderr
    words=json.loads(r.stdout);assert len(words)==len(PLAN)
    badnames=['amp','grid','routing','scene','sceneName','modifier','otherScene','bypass','otherChannel','tail','type','depth','peq','geq']
    badnames += ['header-'+str(i) for i in [6,7,40,71]]+[f'prefix-{c}-{b}' for c in range(8) for b in range(2)]
    for name in badnames:rejected(lambda:app.offline('compare',tmp/'0.syx',tmp/(name+'.syx'),json.dumps(PLAN[1])))
    assert app.offline('compare',HERE/'baseline.syx',tmp/'rename.syx',json.dumps(PLAN[0]))['presetNameChange']
    ti=next(i for i,s in enumerate(PLAN) if s['kind']=='type');cp=next(i for i,s in enumerate(PLAN) if s['kind']=='copy-channel')
    assert app.offline('compare',tmp/f'{ti-1}.syx',tmp/f'{ti}.syx',json.dumps(PLAN[ti]))['typeCoupledChanges'][0]['pid']==1
    rejected(lambda:app.offline('compare',tmp/f'{ti-1}.syx',tmp/'wrong-only.syx',json.dumps(PLAN[ti])))
    rejected(lambda:app.offline('compare',tmp/f'{cp-1}.syx',tmp/'badcopy.syx',json.dumps(PLAN[cp])))
    rejected(lambda:app.offline('compare',tmp/'84.syx',tmp/'badselect.syx',json.dumps(PLAN[85])))
    cursor=[0]
    def simulated(port,report):report.update(reply(words[cursor[0]]));cursor[0]+=1;return report['decoded']
    root=tmp/'session';init(root)
    assert run(root,answers_for(tmp,0,46)+['q'],simulated)==46
    assert app.resume(root)[0]==46
    assert run(root,answers_for(tmp,46,86),simulated)==40
    assert app.resume(root)[0]==86 and cursor[0]==86
    assert run(root,[],no_device)==0 and run(root,[],no_device,True)==0
    # Fresh setup is generated entirely from pinned screenshot-derived data.
    assert run(tmp/'setup',['q'],no_device)==0
    assert app.resume(tmp/'setup')[0]==0
    fresh=tmp/'no-prompts';fresh.mkdir()
    with patch('builtins.input',side_effect=RuntimeError('Unexpected setup prompt')):
        assert app.ensure_setup(fresh)==SETUP
        assert app.ensure_setup(fresh)==SETUP
    saved=(fresh/'setup.json').read_bytes()
    bad=copy.deepcopy(SETUP);bad['types']['Modern']['enums']['Bypass Mode']=['Thru','Mute'];app.dump(fresh/'setup.json',bad)
    rejected(lambda:app.ensure_setup(fresh));assert json.loads((fresh/'setup.json').read_text())==bad
    (fresh/'setup.json').write_bytes(saved)
    broken=tmp/'bad-prefill.json';broken.write_text('{}')
    with patch.object(app,'PREPARED_SETUP',broken):rejected(app.prepared_setup)
    skipbase=tmp/'skipbase';init(skipbase);rejected(lambda:run(skipbase,['s'],no_device))
    def first(port,report):report.update(reply(words[0]));return report['decoded']
    def wrong(port,report):report.update(reply(words[1]));return report['decoded']
    mismatch=tmp/'mismatch';init(mismatch);rejected(lambda:run(mismatch,answers_for(tmp,0,1),wrong));assert app.resume(mismatch)[0]==0
    assert run(mismatch,answers_for(tmp,0,1)+['q'],first)==1
    for stop in range(2):
        target=tmp/('cancel'+str(stop));init(target)
        assert run(target,answers_for(tmp,0,1)[:stop]+['q'],no_device)==0
    def timeout(port,report):report.update(txCalls=1,txBytesWritten=10,rawRxHex='');raise TimeoutError('Synthetic timeout')
    timed=tmp/'timeout';init(timed);rejected(lambda:run(timed,answers_for(tmp,0,1),timeout));assert app.resume(timed)[0]==0
    assert run(timed,answers_for(tmp,0,1)+['q'],first)==1
    # A missing minimum skips its dependent samples without extra GETs.
    skipped=tmp/'skipped';init(skipped)
    assert run(skipped,answers_for(tmp,0,1)+['s','not available','q'],first)==1
    assert app.resume(skipped)[0]==6
    scope=tmp/'scope';init(scope)
    assert run(scope,answers_for(tmp,0,1)+['q'],first)==1
    rejected(lambda:run(scope,[str(tmp/'amp.syx')],no_device))
    assert app.resume(scope)[0]==1
    partial=tmp/'partial';init(partial)
    for i,content in enumerate([None,b'{truncated',b'{"status":"pending"}',b'[]']):
        f=partial/f'step-000-partial-{i}';f.mkdir()
        if content is not None:(f/'result.json').write_bytes(content)
    incomplete=[];assert app.resume(partial,incomplete)[0]==0 and len(incomplete)==4
    assert run(partial,[],no_device,True)==0
    lockroot=tmp/'locked';lockroot.mkdir()
    with (lockroot/'.collector.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);rejected(lambda:run(lockroot,[],no_device))
    pairdir=tmp/'pair';pairdir.mkdir();(pairdir/'donor.syx').write_bytes((tmp/'0.syx').read_bytes())
    for chunk in [48,24,12]:
        report=reply(words[0],chunk);report['syxSha256']=app.offline('preflight',tmp/'0.syx')['sha256']
        app.dump(pairdir/'capture.json',report);assert app.offline('pair',pairdir)['matchedWords']==48
    bads=[dict(report,txCalls=2),dict(report,txBytesWritten=9),dict(report,inputFlushedBeforeGet=False),dict(report,syxSha256='bad'),dict(report,rawRxHex=report['rawRxHex'][:-2]),dict(report,frames=[]),dict(report,decoded={}),dict(report,status='failed')]
    for bad in bads:app.dump(pairdir/'capture.json',bad);rejected(lambda:app.offline('pair',pairdir))
    for value,expected in [('L25',-25),('25R',25),('Center',0),('1 kHz',1000),('0,5 %',.5),('-6 dB',-6)]:assert app.number(value)==expected
    frequency=dict(parameter='High Cut',point='middle',mode='numeric',unit='kHz')
    for text in ['1','1 kHz','1000 Hz']:assert app.display_control(text,frequency)==1000
    for value in ['nan','inf','not number']:rejected(lambda:app.number(value))
    level=next(s for s in PLAN if s.get('parameter')=='Level' and s.get('point')=='minimum');assert app.display_control('-inf',level)=='-inf'
    rejected(lambda:app.display_control('',level))
    repeat=dict(observations=dict(displayText='25',displayValue=25))
    rejected(lambda:app.validate_observations(repeat,PLAN[4],{'points':{'Width':{'minimum':0,'maximum':100,'lower':25}}}))
    for archive in tmp.glob('FM3_ENHANCER_FULL_V2_*.zip'):
        with zipfile.ZipFile(archive) as z:assert z.testzip() is None and {'session.json','plan.json','baseline.syx','setup.json','prefilled_setup.json'}<=set(z.namelist())
    passed=sorted(root.glob('step-*/result.json'))[0];record=json.loads(passed.read_text());record['observations']['controlsConfirmed']=False;app.dump(passed,record);rejected(lambda:app.resume(root))

# Actual transport runs against POSIX pseudoterminals only.
ff=reply(words[0])['frames'];assert list(map(len,ff))==[12,154,8]
for chunk in [48,24,12]:
    expected=reply(words[0],chunk)['frames'];raw=bytes(v for f in expected for v in f);framer=core.Framer()
    for i in range(0,len(raw),11):framer.feed(raw[i:i+11])
    assert framer.frames==expected and core.decode(expected)['values']==words[0]
bad_crc=copy.deepcopy(ff);bad_crc[1][-2]^=1
bad_id=copy.deepcopy(ff);bad_id[0]=frame(116,[50,0,48,0])
for frames in [ff[:-1],ff+[ff[-1]],bad_crc,bad_id]:rejected(lambda:core.decode(frames))
rejected(lambda:core.collect('/must-not-open',{'txCalls':1}))
master,slave=pty.openpty();observed=[];errors=[]
def peer():
    try:
        tx=b'';deadline=time.monotonic()+2
        while len(tx)<10 and time.monotonic()<deadline:
            ready,_,_=select.select([master],[],[],.1)
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
        rejected(lambda:core.collect(os.ttyname(slave),r,timeout=.15));assert os.read(master,1024)==core.GET and r['txCalls']==1 and r['rawRxHex']=='' and r['inputFlushedBeforeGet']
    finally:os.close(master);os.close(slave)
summary=dict(date='2026-10-11',passed=True,syntheticOnly=True,deviceConnectionMade=False,sequentialSteps=86,mockGets=86,pairedWordsEach=48,resumeAfter46=True,scopeNegatives=len(badnames)+3,pairNegatives=len(bads),allThreeTypes=True,all12WordsCopied=True,typeCouplingRecorded=True,screenshotPrefillPinned=True,noSetupQuestions=True,existingMismatchedSetupRefusedUnchanged=True,uniqueInteriorValuesChecked=True,unitsAndPanNotationSupported=True,quitSkipCancelTimeoutResume=True,noAutomaticRetry=True,simultaneousSessionRejected=True,incompleteEvidencePreserved=4,completedResumeAndExportNoGet=True,pseudoterminalSingleGet=True,pseudoterminalTimeoutNoRetry=True,staleQueuedResponseFlushed=True,hardware='No actual Enhancer GET yet. Mappings, scales, generation, import, audio and CPU maximum still need hardware evidence.')
(HERE/'TEST_RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
