"""Synthetic collector tests; these do not validate firmware parameter semantics."""
import contextlib, fcntl, io, json, subprocess, sys, tempfile, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_PEQ_FULL as app
import peq_transport as core
HERE=Path(__file__).resolve().parent

def frame(fn,payload):
    data=[240,0,1,116,17,fn]+payload
    return data+[core.checksum(data),247]
def reply(words,chunk=132):
    frames=[frame(116,[54,0,4,1])]
    for at in range(0,len(words),chunk):
        selected=words[at:at+chunk]; data=[len(selected)&127,len(selected)>>7]
        for value in selected: data += [value&127,(value>>7)&127,(value>>14)&3]
        frames.append(frame(117,data))
    frames.append(frame(118,[]))
    return dict(status='captured',txHex=core.GET.hex(),txCalls=1,txBytesWritten=10,
        inputFlushedBeforeGet=True,frames=frames,rawRxHex=bytes(v for f in frames for v in f).hex(),decoded=core.decode(frames))
def rejected(fn):
    try: fn()
    except (ValueError,TimeoutError): return
    raise AssertionError('Invalid input accepted')
def run(root,answers,collector,export=False):
    argv=['collector','--session',str(root)]+(['--export-only'] if export else ['--port','/dev/cu.mock'])
    with patch.object(sys,'argv',argv),patch('builtins.input',side_effect=answers),patch.object(core,'collect',side_effect=collector) as call:
        app.main(); return call.call_count
def no_device(*args): raise AssertionError('Unexpected device I/O')
def answers_for(tmp,start,end):
    answers=[]
    for i in range(start,end):
        answers.append(str(tmp/f'{i}.syx'))
        for c in app.PLAN[i]['changes']:
            answers.append(('0.1' if c['parameter'] in ['Q','Frequency'] else '-20') if c['endpoint']=='minimum' else '100' if c['endpoint']=='maximum' else '')
        answers.append('jah')
    return answers

with contextlib.redirect_stdout(io.StringIO()),tempfile.TemporaryDirectory() as td:
    tmp=Path(td)
    code=r'''
    import fs from 'node:fs';import path from 'node:path';
    import {inspectStructure} from './fm3-prototype.mjs';
    import {reencodeDumpFromRawPatch,reencodeRawPatch,parsePresetDump,serializePresetDump} from './fm3-codec.mjs';
    import {compare} from './full-check.mjs';
    const out=process.argv[1],seed=fs.readFileSync('baseline.syx'),s=inspectStructure(seed),base=Buffer.from(s.raw.body),b=Buffer.from(base),plan=JSON.parse(fs.readFileSync('plan.json')),all=[];
    const encode=(body,raw=s.raw.rawPatch)=>Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(raw,body)));
    const write=(name,body,raw)=>fs.writeFileSync(path.join(out,name),encode(body,raw));
    let prev=seed;
    for(let i=0;i<plan.length;i++){
      const st=plan[i];
      if(st.kind==='copy-channel'){
        b.copy(b,8734+'ABCD'.indexOf(st.channel)*66,8734,8800);
        b.writeUInt16LE('ABCD'.indexOf(st.channel),8700);
      }else if(st.kind==='select-channel')b.writeUInt16LE('ABCD'.indexOf(st.channel),8700);
      else for(const c of st.changes)for(const ch of c.mirrored?'ABCD':[c.channel]){
        const off=8734+'ABCD'.indexOf(ch)*66+c.candidatePid*2;
        b.writeUInt16LE((b.readUInt16LE(off)+137+i*11)%65536,off);
      }
      write(i+'.syx',b);const bytes=fs.readFileSync(path.join(out,i+'.syx'));
      compare(prev,bytes,i);prev=bytes;
      all.push(Array.from({length:132},(_,n)=>b.readUInt16LE(8734+n*2)));
    }
    const first=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,'0.syx'))).raw.body);
    for(const [name,off] of Object.entries({amp:4946,grid:408,routing:410,scene:0,sceneName:40,modifier:1584,otherScene:8702,bypass:8716,otherBand:8736,otherChannel:8800,tail:13426,globalMix:8780,otherType:8766})){
      const x=Buffer.from(first);x[off]^=1;write(name+'.syx',x);
    }
    const name=Buffer.from(s.raw.rawPatch);name[11]=88;write('rename.syx',first,name);write('name-only.syx',base,name);
    for(const off of [6,7,40,71]){const h=Buffer.from(name);h[off]^=1;write('header-'+off+'.syx',first,h);}
    for(let ch=0;ch<8;ch++)for(let byte=0;byte<2;byte++){
      const p=parsePresetDump(fs.readFileSync(path.join(out,'0.syx')));p.chunkPayloads[ch][byte]^=1;
      fs.writeFileSync(path.join(out,'prefix-'+ch+'-'+byte+'.syx'),Buffer.from(serializePresetDump(p)));
    }
    const coupled=Buffer.from(first);coupled.writeUInt16LE(12345,8754);write('coupled.syx',coupled);
    const wrongOnly=Buffer.from(base);wrongOnly.writeUInt16LE(12345,8754);write('wrong-only.syx',wrongOnly);
    const cp=plan.findIndex(x=>x.kind==='copy-channel'),badcopy=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,cp+'.syx'))).raw.body);badcopy[8800]^=1;write('badcopy.syx',badcopy);
    const ch=plan.findIndex(x=>x.kind==='select-channel'),badselect=Buffer.from(inspectStructure(fs.readFileSync(path.join(out,ch+'.syx'))).raw.body);badselect[8734]^=1;write('badselect.syx',badselect);
    console.log(JSON.stringify(all));
    '''
    r=subprocess.run(['node','--input-type=module','-e',code,str(tmp)],cwd=HERE,capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    words=json.loads(r.stdout); assert len(words)==len(app.PLAN)==84
    badnames=['amp','grid','routing','scene','sceneName','modifier','otherScene','bypass','otherBand','otherChannel','tail','globalMix','otherType','name-only','wrong-only']
    badnames += ['header-'+str(i) for i in [6,7,40,71]]+[f'prefix-{c}-{b}' for c in range(8) for b in range(2)]
    for name in badnames: rejected(lambda: app.offline('compare',HERE/'baseline.syx',tmp/(name+'.syx'),0))
    renamed=app.offline('compare',HERE/'baseline.syx',tmp/'rename.syx',0)
    assert renamed['presetNameChange'] is not None
    assert app.offline('compare',HERE/'baseline.syx',tmp/'coupled.syx',0)['typeCoupledChanges'][0]['pid']==10
    cp=next(i for i,s in enumerate(app.PLAN) if s['kind']=='copy-channel')
    rejected(lambda:app.offline('compare',tmp/f'{cp-1}.syx',tmp/'badcopy.syx',cp))
    select=83
    rejected(lambda:app.offline('compare',tmp/f'{select-1}.syx',tmp/'badselect.syx',select))
    solo=next(i for i,s in enumerate(app.PLAN) if s['changes'] and s['changes'][0]['parameter']=='Solo')
    assert not app.offline('compare',tmp/f'{solo-1}.syx',tmp/f'{solo-1}.syx',solo)['persistentDelta']

    cursor=[0]
    def simulated(port,report):
        report.update(reply(words[cursor[0]]));cursor[0]+=1;return report['decoded']
    root=tmp/'session'
    assert run(root,answers_for(tmp,0,32)+['q'],simulated)==32
    assert app.resume(root)[0]==32
    assert run(root,answers_for(tmp,32,84),simulated)==52
    assert app.resume(root)[0]==84 and cursor[0]==84
    assert run(root,[],no_device)==0
    assert run(root,[],no_device,export=True)==0
    assert run(tmp/'quit',['q'],no_device)==0
    skip=tmp/'skip';assert run(skip,['s','Valik puudub; tegelik menüü ...','q'],no_device)==0
    assert app.resume(skip)[0]==1 and app.resume(skip)[1]==HERE/'baseline.syx'
    def first(port,report): report.update(reply(words[0]));return report['decoded']
    def wrong(port,report): report.update(reply(words[1]));return report['decoded']
    rejected(lambda:run(tmp/'bad',[''+str(tmp/'amp.syx')],no_device))
    rejected(lambda:run(tmp/'mismatch',answers_for(tmp,0,1),wrong))
    assert app.resume(tmp/'mismatch')[0]==0
    assert run(tmp/'mismatch',answers_for(tmp,0,1)+['q'],first)==1
    for stop in [['q'],['','q']]:
        assert run(tmp/('cancel'+str(len(stop))),[str(tmp/'0.syx')]+stop,no_device)==0
    def timeout(port,report):
        report.update(txCalls=1,txBytesWritten=10,rawRxHex='');raise TimeoutError('Synthetic timeout')
    rejected(lambda:run(tmp/'timeout',answers_for(tmp,0,1),timeout))
    assert app.resume(tmp/'timeout')[0]==0
    assert run(tmp/'timeout',answers_for(tmp,0,1)+['q'],first)==1
    partial=tmp/'partial';app.resume(partial)
    for i,content in enumerate([None,b'{truncated',b'{"status":"pending"}',b'[]']):
        f=partial/f'step-000-partial-{i}';f.mkdir();(f/'donor.syx').write_bytes((tmp/'0.syx').read_bytes())
        if content is not None:(f/'result.json').write_bytes(content)
    incomplete=[];assert app.resume(partial,incomplete)[0]==0 and len(incomplete)==4
    assert run(partial,[],no_device,export=True)==0

    lockroot=tmp/'locked';lockroot.mkdir()
    with (lockroot/'.collector.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        rejected(lambda:run(lockroot,[],no_device))
    pairdir=tmp/'pair';pairdir.mkdir();(pairdir/'donor.syx').write_bytes((tmp/'0.syx').read_bytes())
    for chunk in [132,66,33]:
        report=reply(words[0],chunk);report['syxSha256']=app.offline('preflight',tmp/'0.syx')['sha256']
        app.dump(pairdir/'capture.json',report);assert app.offline('pair',pairdir)['matchedWords']==132
    bads=[dict(report,txCalls=2),dict(report,txBytesWritten=9),dict(report,inputFlushedBeforeGet=False),dict(report,syxSha256='bad'),dict(report,rawRxHex=report['rawRxHex'][:-2]),dict(report,frames=[]),dict(report,decoded={}),dict(report,status='failed')]
    for bad in bads:app.dump(pairdir/'capture.json',bad);rejected(lambda:app.offline('pair',pairdir))
    number=next(c for s in app.PLAN for c in s['changes'] if c['value']==300)
    assert app.display_value('299,99',number)==299.99
    for value in ['nan','inf','-1','0','600']:rejected(lambda:app.display_value(value,number))
    endpoint=next(c for s in app.PLAN for c in s['changes'] if c['endpoint']=='minimum' and c['parameter']=='Level')
    assert app.display_value('-inf',endpoint)=='-inf'
    assert app.display_value('-80',endpoint)==-80
    rejected(lambda:app.display_value('',endpoint))
    for archive in tmp.glob('FM3_PEQ_FULL_*.zip'):
        with zipfile.ZipFile(archive) as z:assert z.testzip() is None and {'session.json','plan.json','baseline.syx'}<=set(z.namelist())
    passed=sorted(root.glob('step-*/result.json'))[0];record=json.loads(passed.read_text());record['observations'][0]['displayValue']='bad';app.dump(passed,record)
    rejected(lambda:app.resume(root))

summary=dict(date='2026-10-09',passed=True,syntheticOnly=True,deviceConnectionMade=False,
    sequentialSteps=84,mockGets=84,pairedWordsEach=132,resumeAfter32=True,
    scopeNegatives=len(badnames)+2,pairNegatives=len(bads),renameAtByte11Accepted=True,
    typeCouplingRecorded=True,copyMustMatchAll33Words=True,independentBcdMarkers=True,
    unchangedSoloNotPromoted=True,endpointValuesExplicit=True,levelMinusInfinityRecorded=True,
    quitSkipCancelTimeoutResume=True,noAutomaticRetry=True,simultaneousSessionRejected=True,
    incompleteEvidencePreserved=4,completedResumeAndExportNoGet=True,
    hardware='No new hardware evidence: all new bands/types/ranges/B-C-D remain pending actual captures.')
(HERE/'TEST_RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
