#!/usr/bin/env python3
"""Stage the 0.3.16 restoration evidence without changing its frozen source checkout."""
from pathlib import Path
import gzip,hashlib,io,json,tarfile,shutil
ROOT=Path('/workspace/scratch/7bb7161c8153')
OUT=ROOT/'research/backup-0316-staging'
sha=lambda b:hashlib.sha256(b).hexdigest()
def jb(d):return (json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()
def build(source,release_id,merge_sha,launcher_commit):
    OUT.mkdir(parents=True,exist_ok=True);members={}
    def add_dir(src,prefix,all_files=True):
        for p in sorted(src.rglob('*')):
            if p.is_file():members[prefix+'/'+p.relative_to(src).as_posix()]=p.read_bytes()
    add_dir(ROOT/'research/0316-release-offline','offline')
    add_dir(ROOT/'research/forward-0316','forward-source')
    add_dir(ROOT/'research/host-0316-use','host-use')
    add_dir(ROOT/'research/0316-preliminary','superseded/preliminary')
    add_dir(ROOT/'research/0316-offline','superseded/626e550-partial')
    add_dir(ROOT/'research/0316-final-offline','superseded/54ab902')
    review=ROOT/'research/0316-review'
    for p in review.iterdir():
        if p.is_file() and p.name!='changed-files.json':members['review/'+p.name]=p.read_bytes()
    add_dir(ROOT/'research/0316-publication-receipts','receipts')
    add_dir(Path('/root/.codex/skills/remote-skills/skill-6accfd6fb6f48191a5211c5b063bee5d'),'launcher')
    report=ROOT/'deliverables/FM3_0.3.1_TOOTULEMUS_2026-10-19-2-2.md'
    members['reports/'+report.name]=report.read_bytes()
    manifest={p:{'sha256':sha(b),'bytes':len(b)} for p,b in sorted(members.items())}
    (OUT/'evidence-manifest.json').write_bytes(jb(manifest))
    buf=io.BytesIO()
    with gzip.GzipFile(fileobj=buf,mode='wb',filename='',mtime=0) as gz:
        with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as tar:
            for name,b in sorted(members.items()):
                info=tarfile.TarInfo(name);info.size=len(b);info.mode=0o644;tar.addfile(info,io.BytesIO(b))
    (OUT/'evidence.tar.gz').write_bytes(buf.getvalue())
    (OUT/'test-summary.json').write_bytes(members['offline/summary.json'])
    for name in ['release-receipt.json','publication.json','ci.json','published-comparison.json']:
        (OUT/name).write_bytes(members['receipts/'+name])
    (OUT/'verify-backup.py').write_text('''#!/usr/bin/env python3
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
''')
    (OUT/'README.md').write_text(f'''# FM3 Sound Architect 2 0.3.16 taastamine

Privaatne plugin `plugins_6accfd716e148191b0adb61e4e36f0e4`, release `{release_id}`.
Avaldatud mootori lähtecommit: **{source}**. PR #23 ühenduscommit: `{merge_sha}`.
Hilisem varukoopia commit ei muuda avaldatud versiooni ega mootori lähtecommit'i.
Salvestatud käivitaja commit: `{launcher_commit}`.

`test-summary.json` tõendab täpse puhta lähtecommit'i 59/59 nõutud kontrolli. `ci.json` seob neli edukat ühendamiseelset CI-töövoogu sama lähtepuuga. `published-comparison.json` võrdleb avaldatud paketi kõiki faile lähtepaketiga.

`evidence.tar.gz` sisaldab täielikke testilogisid, juhendi ja tegeliku avaldatud käivitaja kasutuskatseid, käivitaja viit faili, tööaruannet, räsidega kviitungeid ning eraldi superseded-katsete diagnostikat. `evidence-manifest.json` loetleb kõik sisefailid. Avaldatud mootori allikas on Git-commit'is, mitte arhiveeritud katseväljundites. Tihendus on kadudeta ja deterministlik.

Kontroll: `python3 backups/fm3-sound-architect-2/0.3.16/verify-backup.py`.

Taasta ainult Gitist (repo juurkaustas):

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.16"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" {source}
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" --commit {source} --tests "$FM3_BACKUP_ROOT/test-summary.json" --output "$FM3_RESTORE_ROOT/rebuilt"
```

Võrdle taastatud arhiivi SHA-256 väärtust `release-receipt.json` väärtusega `archiveSha256`. Paketi sisu ja laadimise kontrollid on kviitungites; selle sessiooni käigus ei tehtud uusi FM3 kirjutusi, ekspordikatseid ega REA/Ghidra analüüsi. Wah Min/Max-i kuus mõõtepunkti välja kohta ja `fullRangeEncodingProven=false` säilivad.
''')
    (OUT/'build-backup.py').write_bytes(Path(__file__).read_bytes())
    files={p.name:{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='snapshot.json'}
    (OUT/'snapshot.json').write_bytes(jb({'sourceCommit':source,'releaseId':release_id,'version':'0.3.16','files':files}))
    print(json.dumps({'directory':str(OUT),'files':len(files)+1,'evidenceFiles':len(members),'evidenceArchiveBytes':len(buf.getvalue())}))
if __name__=='__main__':
    import sys
    build(*sys.argv[1:])
