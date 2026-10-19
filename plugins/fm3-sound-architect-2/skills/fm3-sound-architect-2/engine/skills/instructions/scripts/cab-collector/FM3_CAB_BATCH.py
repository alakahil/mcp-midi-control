#!/usr/bin/env python3
"""Firmware-13 Dyna-Cab evidence collector. Manual selection, one confirmed GET."""
import argparse, datetime, json, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import cab_transport as core
HERE=Path(__file__).resolve().parent
ROSTER=json.loads((HERE/'cab-roster.json').read_text())['models']
BY_ID={m['expectedId']:m for m in ROSTER}
core.check(len(BY_ID)==len(ROSTER),'Duplicate cabinet ID in roster')

def offline(command,target):
    r=subprocess.run(['node',str(HERE/'cab-check.mjs'),command,str(target)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline check failed')
    return json.loads(r.stdout)

def put(path,data):
    with path.open('xb') as f: f.write(data)

def session(root):
    root.mkdir(parents=True,exist_ok=True)
    manifest=root/'session.json'
    expected={'schemaVersion':1,'kind':'FM3_CAB_SESSION','firmware':13,'collector':'0.1.0'}
    if manifest.exists():core.check(json.loads(manifest.read_text())==expected,'Wrong session type/version')
    else:
        core.check(not list(root.iterdir()),'New session folder must be empty')
        put(manifest,(json.dumps(expected,indent=2)+'\n').encode())
    for folder in sorted(root.glob('capture-*')):
        core.check(not folder.is_symlink() and folder.is_dir(),'Unsafe capture path')
        for name in ['capture.json','donor.syx']:
            core.check(not (folder/name).is_symlink(),'Symlink refused')
        report=json.loads((folder/'capture.json').read_text())
        if report.get('status')=='failed':continue
        offline('pair',folder)
    return root

def export_zip(root):
    session(root)
    out=root.parent/('FM3_CAB_BATCH_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(root/'session.json','session.json')
        z.write(HERE/'cab-roster.json','cab-roster.json')
        for folder in sorted(root.glob('capture-*')):
            for name in ['capture.json','donor.syx','labels.json','pair.json']:
                p=folder/name
                core.check(not p.is_symlink(),'Symlink refused')
                if p.is_file():z.write(p,folder.name+'/'+name)
    print('Laadi siia ZIP: '+str(out))
    return out

def capture(root,port,data,labels):
    folder=root/('capture-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:10])
    folder.mkdir();put(folder/'donor.syx',data);put(folder/'labels.json',(json.dumps(labels,ensure_ascii=False,indent=2)+'\n').encode())
    r={'schemaVersion':1,'collectorVersion':'cab-batch-0.2.2','firmwareDeclared':13,'port':port,
       'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending'}
    try:
        print('TX (one GET): '+core.GET.hex(),flush=True)
        r['decoded']=core.collect(port,r);r['status']='captured'
    except (Exception,KeyboardInterrupt) as e:r.update(status='failed',error=str(e) or 'Interrupted')
    finally:put(folder/'capture.json',(json.dumps(r,indent=2)+'\n').encode())
    print('Saved: '+str(folder));core.check(r['status']=='captured',r.get('error','Capture failed'))
    result=offline('pair',folder);put(folder/'pair.json',(json.dumps(result,indent=2)+'\n').encode())
    print('PASS: GET/SYX 424/424; kontrollsummad korras.')

def next_group(root):
    covered=set()
    for folder in sorted(root.glob('capture-*')):
        r=json.loads((folder/'capture.json').read_text())
        if r.get('status')=='failed':continue
        proof=offline('pair',folder)
        # Seed B/C/D names independently match the supplied screenshot and prior selection evidence.
        if folder.name=='capture-001':
            for ch in proof['channels']:
                if ch['slot1']==ch['slot2'] and ch['slot1'] in [25,38,39]:covered.add(ch['slot1'])
            continue
        labels=json.loads((folder/'labels.json').read_text())
        for ch in proof['channels']:
            matches=[x for x in labels if x.get('channel')==ch['channel'] and x.get('source')=='planned roster; user confirmed selection']
            if not matches:continue
            label=matches[0];mid=label['expectedId']
            core.check(ch['slot1']==ch['slot2']==mid,'Label and binary selection conflict')
            core.check(mid in BY_ID and label['name']==BY_ID[mid]['name'],'Roster label conflict')
            covered.add(mid)
    missing=[m for m in ROSTER if m['expectedId'] not in covered]
    return missing[:4],len(missing)

def verify_plan(state,models):
    for ch,m in zip(state['channels'],models):
        core.check(ch['slot1']==ch['slot2']==m['expectedId'],
                   'Kanal '+ch['channel']+': mõlemad pesad peavad vastama valikule %02d %s. Kui valik ekraanil on õige, saada SYX vestlusse vastenduse kontrolliks.' % (m['displayNumber'],m['name']))

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--session',required=True);p.add_argument('--port')
    p.add_argument('--export-only',action='store_true');a=p.parse_args()
    core.check(shutil.which('node'),'Node puudub')
    core.check(a.export_only or (a.port and a.port.startswith('/dev/cu.')),'Anna kinnitatud macOS port')
    root=session(Path(a.session).expanduser().resolve())
    seed=root/'capture-001'
    if not seed.exists():
        offline('pair',HERE/'seed'/'capture-001');shutil.copytree(HERE/'seed'/'capture-001',seed)
    if a.export_only:export_zip(root);return
    print('Igas nimetatud kanalis vali MÕLEMAS CAB-pesas sama kabinet. Muid parameetreid ära muuda. Save/Store pole vajalik.')
    print('q = ZIP ja lõpeta. Esimese uue neliku järel soovitame q ning ZIP vestlusse Maci-kontrolliks.')
    while True:
        models,remaining=next_group(root)
        if not models:print('Kõik 45 selle Dyna-Cab loendi valikut on paaridega kaetud.');break
        print('Puudu: '+str(remaining))
        for ch,m in zip('ABCD',models):print('%s: %02d %s — CAB1 ja CAB2' % (ch,m['displayNumber'],m['name']))
        if len(models)<4:print('Ülejäänud kanalid jäta samaks.')
        answer=input('Vali kabinetid, ekspordi terve preset ja lohista SYX siia (või q): ').strip()
        if answer.lower()=='q':break
        parts=shlex.split(answer);core.check(len(parts)==1,'Anna üks failitee')
        data=Path(parts[0]).expanduser().read_bytes()
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            staged=Path(tmp)/'donor.syx';staged.write_bytes(data);state=offline('preflight',staged)
        verify_plan(state,models)
        if input('Kas mõlema pesa ekraaninimed vastavad nelikule? Sulge FM3-Edit/Fractal-Bot. Üks GET? [jah/q]: ').strip().lower()!='jah':break
        labels=[dict(m,channel=ch,source='planned roster; user confirmed selection') for ch,m in zip('ABCD',models)]
        capture(root,a.port,data,labels)
    export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as e:
        print('PEATATUD: '+(str(e) or 'Interrupted')+'\nAndmed säilivad; automaatset korduspäringut ei tehta.',file=sys.stderr);sys.exit(1)
