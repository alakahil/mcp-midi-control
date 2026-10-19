#!/usr/bin/env python3
"""Build/verify a deduplicated inventory; it does not promote evidence status."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PLUGIN=ROOT/'plugins/fm3-sound-architect-2'
ENGINE=PLUGIN/'skills/fm3-sound-architect-2/engine/skills/instructions'
INDEX=ENGINE/'references/evidence-index.json'
def collect():
    blobs={}
    for top in [ENGINE/'references',ENGINE/'examples']:
        for p in sorted(top.rglob('*')):
            if not p.is_file() or p==INDEX or p.suffix not in ['.syx','.json','.gz','.zip']:continue
            data=p.read_bytes();sha=hashlib.sha256(data).hexdigest()
            entry=blobs.setdefault(sha,{'bytes':len(data),'paths':[]})
            entry['paths'].append(p.relative_to(ENGINE).as_posix())
    return {'schemaVersion':1,'scope':'Inventory only; validation scope and firmware come from the source reports and offline-suite. Hash equality deduplicates content, not hardware experiments.',
      'sourceBaselines':{'publishedPlugin':'0.2.2','releaseId':'pluginrel_6ace00064c4481918342ed7364ac773f','gitMain':'27316fb09a57218c12dc75e517527d0c0748a61f','upstreamGoldens':'553d24b7409302908d5c7e46a71b45e07dffdc05'},
      'uniqueContents':len(blobs),'filePaths':sum(len(x['paths']) for x in blobs.values()),'blobs':dict(sorted(blobs.items()))}
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--write',action='store_true');args=ap.parse_args();data=collect()
    if args.write:INDEX.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    elif json.loads(INDEX.read_text())!=data:raise SystemExit('Evidence inventory differs; review changes before --write')
    print(json.dumps({k:data[k] for k in ['uniqueContents','filePaths']}))
