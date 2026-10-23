#!/usr/bin/env python3
"""Stage deterministic 0.3.17 receipts; raw user exports and private URLs excluded."""
from pathlib import Path
import gzip,hashlib,io,json,tarfile,sys
ROOT=Path('/workspace/scratch/7bb7161c8153')
WORK=ROOT/'research/volume-binding-0317'
OUT=WORK/'backup-staging'
sha=lambda b:hashlib.sha256(b).hexdigest()
def jb(v):return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def build(source,release,merge,launcher):
 OUT.mkdir(exist_ok=False);members={}
 def directory(p,prefix):
  for f in sorted(p.rglob('*')):
   if f.is_file() and '__pycache__' not in f.parts:members[prefix+'/'+f.relative_to(p).as_posix()]=f.read_bytes()
 directory(WORK/'tests','offline')
 directory(WORK/'tests-2390290-superseded','superseded/2390290-offline')
 directory(WORK/'forward-use','forward-source')
 directory(WORK/'host-use','host-use')
 directory(WORK/'receipts','receipts')
 directory(Path('/root/.codex/skills/remote-skills/skill-6accfd6fb6f48191a5211c5b063bee5d'),'launcher')
 members['evidence/returned-comparison.json']=(ROOT/'research/volume-binding-returned-check.json').read_bytes()
 p=ROOT/'fm3-volume-pedal/plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-volume-binding-evidence.json'
 members['evidence/derived-binding.json']=p.read_bytes()
 p=ROOT/'deliverables/FM3_0.3.1_TOOTULEMUS_2026-10-19-2-2.md';members['reports/'+p.name]=p.read_bytes()
 manifest={n:{'sha256':sha(b),'bytes':len(b)} for n,b in sorted(members.items())}
 (OUT/'evidence-manifest.json').write_bytes(jb(manifest))
 b=io.BytesIO()
 with gzip.GzipFile(fileobj=b,mode='wb',filename='',mtime=0) as gz:
  with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT) as t:
   for n,data in sorted(members.items()):
    info=tarfile.TarInfo(n);info.mode=0o644;info.size=len(data);t.addfile(info,io.BytesIO(data))
 (OUT/'evidence.tar.gz').write_bytes(b.getvalue())
 (OUT/'test-summary.json').write_bytes(members['offline/summary.json'])
 for n in ['release-receipt.json','publication.json','ci.json','published-comparison.json']:(OUT/n).write_bytes(members['receipts/'+n])
 (OUT/'verify-backup.py').write_bytes((ROOT/'fm3-volume-pedal/backups/fm3-sound-architect-2/0.3.16/verify-backup.py').read_bytes())
 (OUT/'build-backup.py').write_bytes(Path(__file__).read_bytes())
 (OUT/'README.md').write_text(f'''# FM3 Sound Architect 2 0.3.17 taastamine

Privaatne plugin `plugins_6accfd716e148191b0adb61e4e36f0e4`, release `{release}`.
Avaldatud mootori lähtecommit **{source}**. PR #26 ühenduscommit `{merge}`.
Hilisem varukoopia commit ei muuda pluginaversiooni ega mootori lähtecommit'i.
Salvestatud käivitaja commit `{launcher}`.

`test-summary.json`: täpse puhta lähtecommit'i 60/60 nõutud kontrolli.
`ci.json`: neli edukat ühendamiseelset töövoogu sama lähtepuuga.
`published-comparison.json`: kõigi 3185 faili baitvõrdluse ja faililoendi kontrolli kviitung.
`evidence.tar.gz`: täielikud testilogid, lähte- ja avaldatud käivitaja kasutuskatsed,
käivitaja failid, tööaruanne ning tuletatud Volume-seose tõend ja räsid.
Algset kasutaja toor-SYX-i ja täielikku Maci REA arhiivi ei ole siia lisatud.
Tööaruande ning analüüsipaketi avalikuks taastamisvarukoopiaks oli kasutaja luba.

Kontroll: `python3 backups/fm3-sound-architect-2/0.3.17/verify-backup.py`.

Taasta ainult Gitist repo juurkaustas:

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.17"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" {source}
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" --commit {source} --tests "$FM3_BACKUP_ROOT/test-summary.json" --output "$FM3_RESTORE_ROOT/rebuilt"
```

Võrdle taastatud arhiivi SHA-256 väärtust `release-receipt.json` väljaga
`archiveSha256`. Tõendikapsli iga faili räsi on `evidence-manifest.json`-is.
Kogu kapsel on kadudeta, deterministlikult tihendatud; mootori lähtekood on Git-commit'is.

Uus tugi: `volumePedal:true`, ainult mõõdetud FW13 Ext1 → Volume/Pan 1 Gain ALL
vaikekirje. Üks uus aktiivse puhvri eksport; puudub arvuline Min/Max-skaala,
STORE/reload'i, heli või pedaali toimimise kinnitus. Uut REA jooksu selles etapis
ei tehtud. Wah Min/Max ja `fullRangeEncodingProven=false` säilivad.
''')
 files={p.name:{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='snapshot.json'}
 (OUT/'snapshot.json').write_bytes(jb({'sourceCommit':source,'releaseId':release,'version':'0.3.17','files':files}))
 print(json.dumps({'directory':str(OUT),'outerFiles':len(files)+1,'evidenceFiles':len(members),'archiveBytes':len(b.getvalue())}))
if __name__=='__main__':build(*sys.argv[1:])
