"""Offline tests of the 13-step supplement, including an unchanged Pan Left minimum."""
import contextlib,io,json,subprocess,sys,tempfile,zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_ENHANCER_LISA as app
import enhancer_transport as core
from enhancer_plan import build_plan,instruction
HERE=Path(__file__).resolve().parent
PLAN=build_plan(app.prepared_setup())
assert len(PLAN)==13 and PLAN[0]['kind']=='type'
assert [p['parameter'] for p in PLAN[1:]]==['Pan L']*5+['Level']*5+['Scene Ignore']*2
assert all(p['typeName']=='Classic' and p['channel']=='A' for p in PLAN)
assert all('ära kasuta s' in instruction(p) for p in PLAN[1:])

def reply(words):
    def frame(fn,data):
        f=[240,0,1,116,17,fn]+data
        return f+[core.checksum(f),247]
    data=[48,0]
    for v in words:data.extend([v&127,(v>>7)&127,(v>>14)&3])
    frames=[frame(116,[122,0,48,0]),frame(117,data),frame(118,[])]
    return dict(status='captured',txCalls=1,txBytesWritten=10,inputFlushedBeforeGet=True,frames=frames,rawRxHex=bytes(v for f in frames for v in f).hex(),decoded=core.decode(frames))

def run(root,answers,collector,export=False):
    argv=['collector','--session',str(root)]+(['--export-only'] if export else ['--port','/dev/cu.mock'])
    with patch.object(sys,'argv',argv),patch('builtins.input',side_effect=answers),patch.object(core,'collect',side_effect=collector) as calls:
        app.main();return calls.call_count

def main():
    with tempfile.TemporaryDirectory() as td,contextlib.redirect_stdout(io.StringIO()):
        tmp=Path(td);(tmp/'plan.json').write_text(json.dumps(PLAN))
        js=r'''
        import fs from 'node:fs';import path from 'node:path';
        import {inspectStructure} from './fm3-prototype.mjs';
        import {reencodeDumpFromRawPatch,reencodeRawPatch} from './fm3-codec.mjs';
        import {compare} from './full-check.mjs';
        const out=process.argv[1],seed=fs.readFileSync('ALUSTA_SIIT.syx'),s=inspectStructure(seed),b=Buffer.from(s.raw.body),plan=JSON.parse(fs.readFileSync(path.join(out,'plan.json'))),words=[];
        let previous=seed;
        for(let i=0;i<plan.length;i++){
          const p=plan[i];
          if(p.kind==='type')b.writeUInt16LE(1,7518);
          else {
            const pid={'Pan L':8,'Level':4,'Scene Ignore':11}[p.parameter];
            const value=p.mode==='enum'?(p.value==='ON'?1:0):{minimum:0,maximum:65534,lower:6553,middle:32767,upper:58981}[p.point];
            b.writeUInt16LE(value,7506+pid*2);
          }
          const bytes=Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(s.raw.rawPatch,b)));
          const result=compare(previous,bytes,p);
          if(i===1 && result.changedWords.length!==0)throw Error('Pan Left minimum must be unchanged in this regression');
          fs.writeFileSync(path.join(out,i+'.syx'),bytes);previous=bytes;
          words.push(Array.from({length:48},(_,n)=>b.readUInt16LE(7506+n*2)));
        }
        fs.writeFileSync(path.join(out,'words.json'),JSON.stringify(words));
        '''
        subprocess.run(['node','--input-type=module','-e',js,str(tmp)],cwd=HERE,check=True,capture_output=True,text=True)
        words=json.loads((tmp/'words.json').read_text());cursor=[0]
        def simulated(port,report):
            report.update(reply(words[cursor[0]]));cursor[0]+=1;return report['decoded']
        def no_device(*args):raise AssertionError('Unexpected GET')
        def answers(start,end):
            values=[]
            for i in range(start,end):
                s=PLAN[i];values.append(str(tmp/(str(i)+'.syx')))
                if s['kind']=='control':
                    if s['mode']=='enum':values.append('')
                    else:values.append(str(({'minimum':-100,'maximum':100,'lower':-80,'middle':0,'upper':80} if s['parameter']=='Pan L' else {'minimum':-80,'maximum':20,'lower':-70,'middle':-30,'upper':10})[s['point']]))
                values.append('jah')
            return values
        root=tmp/'session'
        assert run(root,answers(0,6)+['q'],simulated)==6
        assert app.resume(root)[0]==6
        assert run(root,answers(6,13),simulated)==7
        assert app.resume(root)[0]==13 and cursor[0]==13
        assert run(root,[],no_device)==0 and run(root,[],no_device,True)==0
        assert run(tmp/'fresh',['q'],no_device)==0
        r=json.loads(next(root.glob('step-001-*/result.json')).read_text())
        assert r['status']=='passed' and r['observations']['displayValue']==-100 and r['comparison']['changedWords']==[]
        bad=tmp/'bad-source.zip';bad.write_bytes(b'wrong source')
        with patch.object(app,'SOURCE',bad):
            try:app.resume(root)
            except ValueError:pass
            else:raise AssertionError('Changed source accepted')
        with zipfile.ZipFile(sorted(tmp.glob('FM3_ENHANCER_LISA_*.zip'))[-1]) as z:
            assert z.read('source-session.zip')==app.SOURCE.read_bytes()
            assert z.read('ALUSTA_SIIT.syx')==app.START.read_bytes()
        summary=dict(date='2026-10-12',passed=True,syntheticOnly=True,deviceConnectionMade=False,steps=13,missingControls=12,classicOnly=True,panLeftMinimumUnchangedAccepted=True,pairedWordsEach=48,mockGets=13,resumeAfter6=True,completedAndExportNoGet=True,initialQuitNoGet=True,sourceHashChecked=True,originalSessionBundledUnchanged=True)
    (HERE/'TEST_RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
