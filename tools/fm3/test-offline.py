#!/usr/bin/env python3
"""Run the explicit offline allowlist in a disposable package copy.
Historical tests write reports beside fixtures; the source remains untouched.
Missing required tests fail, never count as a pass. This runner opens no device.
"""
import argparse,hashlib,json,os,runpy,subprocess,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PLUGIN=ROOT/'plugins/fm3-sound-architect-2'
def tree_hash(root):
    entries=sorted((p.relative_to(root).as_posix(),p) for p in root.rglob('*') if p.is_file())
    return hashlib.sha256(''.join(rel+':'+hashlib.sha256(p.read_bytes()).hexdigest()+'\n' for rel,p in entries).encode()).hexdigest()
def run(output):
    output.mkdir(parents=True,exist_ok=True)
    before=tree_hash(PLUGIN);results=[]
    # New SYX fixtures change the corpus summary and its pinned runtime copy.
    # Catch stale evidence locally, before the full suite, as CI already does.
    subprocess.run(['node',str(ROOT/'tools/fm3/modifier-corpus-audit.mjs')],check=True)
    subprocess.run(['python3',str(ROOT/'tools/fm3/point4-evidence.py')],check=True)
    subprocess.run(['python3',str(ROOT/'tools/fm3/evidence-index.py')],check=True)
    # Keep the packaged Node-only lookup tied to the independently replayed
    # hardware capture and Python arithmetic model, not just its pinned hash.
    subprocess.run(['python3',str(ROOT/'tools/fm3/build-wah-exact-table.py')],check=True)
    subprocess.run(['python3',str(ROOT/'tools/fm3/test-release-layout.py')],check=True)
    with tempfile.TemporaryDirectory(prefix='fm3-offline-') as temp:
        # Exercise the release transformation and automatic runtime restore.
        # The developer's Git tree and all existing consumers stay unchanged.
        layout=runpy.run_path(str(PLUGIN/'skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-session-archive.py'))
        source={p.relative_to(PLUGIN).as_posix():p.read_bytes() for p in PLUGIN.rglob('*') if p.is_file()}
        packed,packaging=layout['pack_files'](source)
        manifest={'packaging':packaging,'sourcePluginTreeSha256':before,
          'generatedFiles':['release-manifest.json',packaging['archive']],
          'files':{p:{'sha256':layout['sha'](b),'bytes':len(b)} for p,b in packed.items()}}
        packed['release-manifest.json']=(json.dumps(manifest)+'\n').encode()
        restored=layout['restore_files'](packed,manifest)
        if restored!=source:raise ValueError('Release round trip changed source bytes')
        package=layout['write_new_tree'](Path(temp)/'plugin',restored)
        engine=package/'skills/fm3-sound-architect-2/engine/skills/instructions'
        suite=json.loads((engine/'references/offline-suite.json').read_text())
        for test in suite['tests']:
            start=time.monotonic();cmd=test['command'];log=output/(test['id']+'.log')
            if not (engine/cmd[1]).is_file():
                result={'id':test['id'],'status':'missing','required':test['required']};log.write_text('Required test missing\n')
            else:
                try:
                    with log.open('w') as f:r=subprocess.run(cmd,cwd=engine,stdout=f,stderr=subprocess.STDOUT,timeout=240,env={**os.environ,'FM3_OFFLINE_TEST':'1'})
                    result={'id':test['id'],'status':'passed' if r.returncode==0 else 'failed','exitCode':r.returncode}
                except subprocess.TimeoutExpired:result={'id':test['id'],'status':'timeout'}
            result['seconds']=round(time.monotonic()-start,3);result['logSha256']=hashlib.sha256(log.read_bytes()).hexdigest();results.append(result)
            print(test['id']+': '+result['status'],flush=True)
    unchanged=before==tree_hash(PLUGIN)
    report={'schemaVersion':1,'scope':'Explicit offline suite; no new hardware/audio confirmation','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
      'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),'pluginTreeSha256':before,'sourceUnchangedByTests':unchanged,'results':results,
      'compactLayoutVerified':True,'passed':unchanged and all(r['status']=='passed' for r in results)}
    (output/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
    return report['passed']
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=Path);a=p.parse_args();raise SystemExit(0 if run(a.output.resolve()) else 1)
