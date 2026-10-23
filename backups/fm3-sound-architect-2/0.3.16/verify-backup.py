#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,tarfile
root=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
snapshot=json.loads((root/'snapshot.json').read_text())
for name,expected in snapshot['files'].items():
 b=(root/name).read_bytes();assert {'sha256':sha(b),'bytes':len(b)}==expected,name
expected=json.loads((root/'evidence-manifest.json').read_text())
with tarfile.open(root/'evidence.tar.gz') as tar:
 files={m.name:tar.extractfile(m).read() for m in tar.getmembers() if m.isfile()}
assert set(files)==set(expected),'Evidence inventory differs'
for name,b in files.items():assert {'sha256':sha(b),'bytes':len(b)}==expected[name],name
print(json.dumps({'passed':True,'outerFiles':len(snapshot['files']),'evidenceFiles':len(files),'sourceCommit':snapshot['sourceCommit']}))
