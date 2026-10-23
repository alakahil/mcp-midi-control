#!/usr/bin/env python3
"""Build a deterministic static-analysis handoff from one explicit Git commit."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'tools/fm3/rea-volume-pedal/'
FILES = ['FM3_REA_VOLUME_PEDAL.command','fm3-rea-volume-pedal.mjs','plan.json',
         'README.txt','test-volume-pedal-batch.mjs','validation.json']
sha = lambda b: hashlib.sha256(b).hexdigest()

def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)

def build(commit, output):
    commit = git('rev-parse',commit+'^{commit}').decode().strip()
    if output.exists():
        raise ValueError('Output exists')
    files = {name:git('show',commit+':'+PREFIX+name) for name in FILES}
    files['TULEMUS.md'] = git('show',commit+':docs/fm3/parameter-evidence/volume-pedal-static-result.md')
    source = dict(schemaVersion=1,repository='https://github.com/alakahil/mcp-midi-control',
                  sourceCommit=commit,sourceTree=git('rev-parse',commit+'^{tree}').decode().strip(),
                  publishedPluginVersion='0.3.16',publishedEngineCommit='a11d8e44d0df339411d7e45ad6bea126b0bf89d5',
                  purpose='Static Volume pedal research handoff; not a plugin release',
                  sourceFiles=[dict(name=name,bytes=len(data),sha256=sha(data)) for name,data in sorted(files.items())])
    files['SOURCE.json'] = (json.dumps(source,indent=2)+'\n').encode()
    files['SHA256SUMS'] = ''.join(sha(data)+'  '+name+'\n' for name,data in sorted(files.items())).encode()
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo('FM3_REA_VOLUME_PEDAL/'+name,(1980,1,1,0,0,0))
            info.create_system=3
            info.external_attr=(0o100755 if name.endswith('.command') else 0o100644)<<16
            info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    with zipfile.ZipFile(output) as z:
        assert z.testzip() is None
        assert len(z.infolist())==len(files)
        for name,data in files.items():
            assert z.read('FM3_REA_VOLUME_PEDAL/'+name)==data
    return dict(sourceCommit=commit,archive=str(output),bytes=output.stat().st_size,
                sha256=sha(output.read_bytes()),files=len(files),zipVerified=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--commit',required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(build(a.commit,a.output.resolve()),indent=2))
