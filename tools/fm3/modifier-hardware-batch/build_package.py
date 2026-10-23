#!/usr/bin/env python3
"""Package a self-contained research collector, without firmware/editor binaries."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[2]
ENGINE=REPO/'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions'


def main():
    p=argparse.ArgumentParser();p.add_argument('output',type=Path);a=p.parse_args()
    dest=a.output.resolve();dest.mkdir(parents=True,exist_ok=True)
    root=dest/'FM3_MOD_HW_BATCH'
    if root.exists():raise ValueError('Refusing to overwrite an existing package directory')
    root.mkdir()
    for name in ['transport.py','FM3_MOD_HW_BATCH.py','FM3_MOD_HW_BATCH.command','check.mjs','plan.json','LOE_MIND.md']:
        shutil.copyfile(HERE/name,root/name)
    (root/'FM3_MOD_HW_BATCH.command').chmod(0o755)
    shutil.copyfile(ENGINE/'examples/FM3_MOD_MIN_2p50_export.syx',root/'BASELINE.syx')
    (root/'vendor').mkdir();(root/'licenses').mkdir()
    for name in ['fm3-codec.mjs','fm3-prototype.mjs']:
        shutil.copyfile(ENGINE/'scripts/drive-collector'/name,root/'vendor'/name)
    for name in ['forgefx-midi-LICENSE','forgefx-midi-NOTICE']:
        shutil.copyfile(ENGINE/'scripts/wah-collector/licenses'/name,root/'licenses'/name)
    manifest={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(root.rglob('*')) if f.is_file()}
    (root/'SHA256SUMS.json').write_text(json.dumps(manifest,indent=2)+'\n')
    output=dest/'FM3_MOD_HW_BATCH_0.1.0.zip'
    with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED) as z:
        for f in sorted(root.rglob('*')):
            if f.is_file():z.write(f,str(Path(root.name)/f.relative_to(root)))
    print(json.dumps(dict(path=str(output),bytes=output.stat().st_size,sha256=hashlib.sha256(output.read_bytes()).hexdigest())))


if __name__=='__main__':main()
