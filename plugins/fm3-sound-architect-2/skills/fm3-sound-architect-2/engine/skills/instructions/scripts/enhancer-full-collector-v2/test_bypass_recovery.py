"""Replay the user's partial V2 session; no device access or evidence rewriting."""
import contextlib, hashlib, io, json, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path
from unittest.mock import patch
import FM3_ENHANCER_FULL as app
import enhancer_transport as core

HERE=Path(__file__).resolve().parent
FIXTURE=HERE.parents[1]/'references/enhancer-partial-20261012/collection.zip'

def expect_rejection(fn, text=None):
    try: fn()
    except ValueError as error:
        if text: assert text in str(error),str(error)
        return str(error)
    raise AssertionError('Invalid evidence was accepted')

def run(root, answers, export=False):
    argv=['collector','--session',str(root)]+(['--export-only'] if export else ['--port','/dev/cu.test'])
    with patch.object(sys,'argv',argv),patch('builtins.input',side_effect=answers),patch.object(core,'collect',side_effect=AssertionError('Unexpected device access')) as io_call:
        try: app.main()
        finally: assert io_call.call_count==0

def main():
    with tempfile.TemporaryDirectory() as td, contextlib.redirect_stdout(io.StringIO()):
        tmp=Path(td);root=tmp/'session';root.mkdir()
        with zipfile.ZipFile(FIXTURE) as z:
            for info in z.infolist():
                if info.filename in ['baseline.syx','prefilled_setup.json']:continue
                target=root/info.filename
                assert target.resolve().is_relative_to(root.resolve()) and not info.is_dir()
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(info))
        originals={p:p.read_bytes() for p in root.rglob('*') if p.is_file()}
        assert app.ensure_setup(root)==app.prepared_setup()
        index,previous,state,plan=app.resume(root)
        assert index==7 and plan[index]['label']=='Modern — Depth maximum'
        assert state['points']['Width']==dict(minimum=0.0,maximum=100.0,lower=20.0,middle=50.0,upper=90.0)
        assert state['points']['Depth']==dict(minimum=0.0)
        failures=sorted(root.glob('step-007-*/donor.syx'));assert len(failures)==2
        for f in failures:
            expect_rejection(lambda:app.offline('compare',previous,f,json.dumps(plan[index])), 'Bypass-olek muutus')
        run(root,['q']);run(root,[],True)
        expect_rejection(lambda:run(root,[str(failures[0])]),'GET-i ei saadetud')
        assert app.resume(root)[0]==7
        # Altered copies are negative/synthetic fixtures only; never replace user SYX evidence.
        js=r'''
        import fs from 'node:fs';import path from 'node:path';
        import {inspectStructure} from './fm3-prototype.mjs';
        import {reencodeDumpFromRawPatch,reencodeRawPatch} from './fm3-codec.mjs';
        const [previous,failed,out]=process.argv.slice(1),seed=fs.readFileSync(failed),s=inspectStructure(seed),body=Buffer.from(s.raw.body),prior=Buffer.from(inspectStructure(fs.readFileSync(previous)).raw.body);
        const differences=[];for(let i=0;i<body.length;i+=2)if(body.readUInt16LE(i)!==prior.readUInt16LE(i))differences.push({offset:i,before:prior.readUInt16LE(i),after:body.readUInt16LE(i)});
        fs.writeFileSync(path.join(out,'differences.json'),JSON.stringify(differences));
        body.writeUInt16LE(1,7488);
        const write=(name,b)=>fs.writeFileSync(path.join(out,name+'.syx'),Buffer.from(reencodeDumpFromRawPatch(seed,reencodeRawPatch(s.raw.rawPatch,b))));
        write('synthetic-corrected',body);
        for(const [name,offset] of Object.entries({otherSceneChannel:7474,otherSceneBypass:7486,otherChannel:7530,routing:428,wrongParameter:7506})){
          const b=Buffer.from(body);b[offset]^=1;write(name,b);
        }
        '''
        subprocess.run(['node','--input-type=module','-e',js,str(previous),str(failures[0]),str(tmp)],cwd=HERE,check=True,capture_output=True,text=True)
        differences=json.loads((tmp/'differences.json').read_text())
        assert differences==[dict(offset=7488,before=1,after=0),dict(offset=7508,before=0,after=65534)]
        fixed=tmp/'synthetic-corrected.syx'
        comparison=app.offline('compare',previous,fixed,json.dumps(plan[index]))
        assert comparison['changedWords']==[dict(channel='A',pid=1,offset=7508,before=0,after=65534)]
        for name in ['otherSceneChannel','otherSceneBypass','otherChannel','routing','wrongParameter']:
            expect_rejection(lambda:app.offline('compare',previous,tmp/(name+'.syx'),json.dumps(plan[index])))
        run(root,[str(fixed),'q']) # cancellation at display input, still no GET
        assert app.resume(root)[0]==7
        for p,data in originals.items():assert p.read_bytes()==data,p
        archives=list(tmp.glob('FM3_ENHANCER_FULL_V2_*.zip'));assert archives
        with zipfile.ZipFile(archives[-1]) as z:
            for p,data in originals.items():assert z.read(str(p.relative_to(root)))==data
        summary=dict(date='2026-10-12',passed=True,sourceZipSha256=hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),revalidatedHardwarePairs=7,matchedWordsEach=48,nextStep=8,totalSteps=86,failedAttempts=2,failureBodyWordDiff=differences,failedAttemptsHadNoCapture=True,noNewDeviceIO=True,originalSessionBytesPreserved=True,pauseAndExportNoGet=True,failedAttemptResumeUnchanged=True,clearBypassError=True,otherScopeNegatives=5,syntheticCorrectedFixtureOnly=True,hardwareStep8StillPending=True)
    (HERE/'BYPASS_RECOVERY_TESTS.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
