#!/usr/bin/env python3
"""Build deterministic plugin bytes from one clean, tested Git commit."""
import argparse,gzip,hashlib,io,json,runpy,subprocess,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PREFIX='plugins/fm3-sound-architect-2/'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def sha(data):return hashlib.sha256(data).hexdigest()
def json_bytes(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def build(commit,tests,output):
    if git('status','--porcelain').strip():raise ValueError('Release requires a clean checkout')
    commit=git('rev-parse',commit+'^{commit}').decode().strip()
    if git('rev-parse','HEAD').decode().strip()!=commit:raise ValueError('Checkout must be the requested commit')
    files={}
    for record in git('ls-tree','-r','-z',commit,'--',PREFIX).split(b'\0'):
        if not record:continue
        meta,name=record.split(b'\t',1);mode,kind,oid=meta.split()
        if kind!=b'blob' or mode not in (b'100644',b'100755'):raise ValueError('Unsupported source entry')
        files[name.decode()[len(PREFIX):]]=git('cat-file','blob',oid.decode())
    tree_sha=sha(''.join(p+':'+sha(data)+'\n' for p,data in sorted(files.items())).encode())
    report=json.loads(tests.read_text())
    suite=json.loads(files['skills/fm3-sound-architect-2/engine/skills/instructions/references/offline-suite.json'])
    required={t['id'] for t in suite['tests'] if t['required']}
    passed={r['id'] for r in report['results'] if r['status']=='passed'}
    if not (report['passed'] and report['sourceUnchangedByTests'] and report.get('compactLayoutVerified') and not report['sourceDirty'] and
            report['sourceCommit']==commit and report['pluginTreeSha256']==tree_sha and required<=passed):
        raise ValueError('Tests do not attest this clean commit and complete suite')
    portable=json.loads(files['plugin.json']);legacy=json.loads(files['.codex-plugin/plugin.json'])
    if (portable['name'],portable['version'])!=(legacy['name'],legacy['version']):raise ValueError('Manifest mismatch')
    canonical_legacy=(json.dumps(legacy,ensure_ascii=True,indent=2)+'\n').encode()
    if files['.codex-plugin/plugin.json']!=canonical_legacy:raise ValueError('Compatibility manifest must match observed platform JSON formatting')
    layout=runpy.run_path(str(ROOT/PREFIX/'skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-session-archive.py'))
    files,packaging=layout['pack_files'](files)
    manifest={'schemaVersion':1,'pluginId':'plugins_6accfd716e148191b0adb61e4e36f0e4','name':portable['name'],
      'version':portable['version'],'sourceRepository':'https://github.com/alakahil/mcp-midi-control',
      'sourceCommit':commit,'sourcePluginTreeSha256':tree_sha,
      'packaging':packaging,'generatedFiles':['release-manifest.json',packaging['archive']],
      'files':{p:{'sha256':sha(b),'bytes':len(b)} for p,b in sorted(files.items())}}
    files['release-manifest.json']=json_bytes(manifest)
    layout['restore_files'](files,manifest)
    dirs={str(parent) for p in files for parent in Path(p).parents if str(parent)!='.'}
    if len(files)+len(dirs)+1>4000:raise ValueError('Package entry budget exceeded')
    if sum(map(len,files.values()))>512*1024*1024:raise ValueError('Uncompressed package too large')
    archive=io.BytesIO()
    with gzip.GzipFile(fileobj=archive,mode='wb',filename='',mtime=0) as gz:
        with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as tar:
            for name,data in sorted(files.items()):
                entry=tarfile.TarInfo(portable['name']+'/'+name);entry.size=len(data);entry.mode=0o644
                tar.addfile(entry,io.BytesIO(data))
    data=archive.getvalue()
    if len(data)>100*1024*1024:raise ValueError('Compressed package too large')
    output.mkdir(parents=True,exist_ok=True)
    package=output/(portable['name']+'-'+portable['version']+'.tar.gz')
    receipt=output/'release-receipt.json'
    if package.exists() or receipt.exists():raise ValueError('Release output already exists')
    package.write_bytes(data)
    receipt.write_bytes(json_bytes({'schemaVersion':1,'pluginId':manifest['pluginId'],'version':portable['version'],
      'sourceCommit':commit,'sourcePluginTreeSha256':tree_sha,'archiveSha256':sha(data),'archiveBytes':len(data),
      'testSummarySha256':sha(tests.read_bytes()),'manifestSha256':sha(files['release-manifest.json']),
      'conservativeArchiveEntries':len(files)+len(dirs)+1,'archiveFiles':len(files),'archiveDirectories':len(dirs),
      'packedHistoricalFiles':packaging['archivedFiles'],'publishedReleaseId':None,
      'status':'candidate; remote commit and host loading require separate confirmation'}))
    print(json.dumps({'archive':str(package),'receipt':str(receipt),'sourceCommit':commit,'sha256':sha(data)}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--commit',required=True);p.add_argument('--tests',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();build(a.commit,a.tests.resolve(),a.output.resolve())
