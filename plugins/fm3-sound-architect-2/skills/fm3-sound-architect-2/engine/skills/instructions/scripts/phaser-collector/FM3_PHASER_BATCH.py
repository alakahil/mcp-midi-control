#!/usr/bin/env python3
"""Firmware-13 Phaser evidence collector. Manual selection, one confirmed GET."""
import argparse, datetime, json, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import phaser_transport as core
HERE=Path(__file__).resolve().parent
ROSTER=json.loads((HERE/'phaser-roster.json').read_text())['models']
BY_ID={m['displayNumber']:m for m in ROSTER}
core.check(len(BY_ID)==len(ROSTER),'Duplicate display number in roster')

def offline(command,target):
    r=subprocess.run(['node',str(HERE/'phaser-check.mjs'),command,str(target)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline check failed')
    return json.loads(r.stdout)

def put(path,data):
    with path.open('xb') as f: f.write(data)

def session(root):
    root.mkdir(parents=True,exist_ok=True)
    manifest=root/'session.json'
    expected={'schemaVersion':1,'kind':'FM3_PHASER_SESSION','firmware':13,'collector':'0.1.0'}
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
    next_group(root)
    out=root.parent/('FM3_PHASER_BATCH_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(root/'session.json','session.json')
        z.write(HERE/'phaser-roster.json','phaser-roster.json')
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
    r={'schemaVersion':1,'collectorVersion':'phaser-batch-0.1.0','firmwareDeclared':13,'port':port,
       'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending'}
    try:
        print('TX (one GET): '+core.GET.hex(),flush=True)
        r['decoded']=core.collect(port,r);r['status']='captured'
    except (Exception,KeyboardInterrupt) as e:r.update(status='failed',error=str(e) or 'Interrupted')
    finally:put(folder/'capture.json',(json.dumps(r,indent=2)+'\n').encode())
    print('Saved: '+str(folder));core.check(r['status']=='captured',r.get('error','Capture failed'))
    try:
        result=offline('pair',folder)
    except Exception as exc:
        r.update(status='failed',error=str(exc))
        (folder/'capture.json').write_text(json.dumps(r,indent=2)+'\n')
        raise
    put(folder/'pair.json',(json.dumps(result,indent=2)+'\n').encode())
    print('PASS: GET/SYX 140/140; kontrollsummad korras.')

def next_group(root):
    covered=set(); assignments={}
    for folder in sorted(root.glob('capture-*')):
        r=json.loads((folder/'capture.json').read_text())
        if r.get('status')=='failed':continue
        proof=offline('pair',folder)
        labels=json.loads((folder/'labels.json').read_text())
        core.check(1<=len(labels)<=4,'Bad labels')
        core.check(len({x['channel'] for x in labels})==len(labels),'Duplicate channel labels')
        for label in labels:
            number=label['displayNumber']; model=BY_ID.get(number)
            core.check(model and label['name']==model['name'],'Roster label conflict')
            core.check(label['source']=='planned roster; user confirmed selection','Unconfirmed name')
            ch=next(x for x in proof['channels'] if x['channel']==label['channel'])
            mid=ch['binaryId']
            if model['binaryId'] is not None:core.check(mid==model['binaryId'],'Known ID conflict')
            core.check(number not in assignments or assignments[number]==mid,'Name changed binary ID')
            core.check(not any(n!=number and i==mid for n,i in assignments.items()),'Two different names have the same ID; check selection')
            assignments[number]=mid;covered.add(number)
    missing=[m for m in ROSTER if m['displayNumber'] not in covered]
    return missing[:4],len(missing)

def verify_plan(state,models,root):
    known={m['binaryId']:m['displayNumber'] for m in ROSTER if m['binaryId'] is not None}
    for folder in root.glob('capture-*'):
        if json.loads((folder/'capture.json').read_text()).get('status')=='failed':continue
        proof=offline('pair',folder)
        for label in json.loads((folder/'labels.json').read_text()):
            ch=next(x for x in proof['channels'] if x['channel']==label['channel'])
            known[ch['binaryId']]=label['displayNumber']
    selected=[]
    for ch,m in zip(state['channels'],models):
        if m['binaryId'] is not None:core.check(ch['binaryId']==m['binaryId'],'Known type ID conflict')
        core.check(ch['binaryId'] not in known or known[ch['binaryId']]==m['displayNumber'],'Type already belongs to another collected name; check selection')
        selected.append(ch['binaryId'])
    core.check(len(set(selected))==len(selected),'Duplicate types in selected channels')

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
    print('Igas nimetatud Phaser1 kanalis muuda ainult Type-valikut. Tüübi automaatseid muudatusi ära taasta. Muud plokid ja stseen jäta samaks. Save/Store pole vajalik.')
    print('q = ZIP ja lõpeta. Esimese uue neliku järel kirjuta q ja saada ZIP kontrollimiseks.')
    while True:
        models,remaining=next_group(root)
        if not models:print('Kõik 17 Phaser-tüüpi on GET/SYX paaridega kaetud; nimed põhinevad sinu kinnitatud valikutel.');break
        print('Puudu: '+str(remaining))
        for ch,m in zip('ABCD',models):print('%s: %02d %s' % (ch,m['displayNumber'],m['name']))
        if len(models)<4:print('Ülejäänud kanalid jäta samaks.')
        answer=input('Vali Phaser-tüübid, ekspordi terve preset ja lohista SYX siia (või q): ').strip()
        if answer.lower()=='q':break
        parts=shlex.split(answer);core.check(len(parts)==1,'Anna üks failitee')
        data=Path(parts[0]).expanduser().read_bytes()
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            staged=Path(tmp)/'donor.syx';staged.write_bytes(data);state=offline('preflight',staged)
        verify_plan(state,models,root)
        if input('Kas Phaser A/B/C/D Type-ekraaninimed vastavad ülaltoodud valikutele? Sulge FM3-Edit/Fractal-Bot. Üks GET? [jah/q]: ').strip().lower()!='jah':break
        labels=[dict(m,channel=ch,source='planned roster; user confirmed selection') for ch,m in zip('ABCD',models)]
        capture(root,a.port,data,labels)
        next_group(root)
    export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as e:
        print('PEATATUD: '+(str(e) or 'Interrupted')+'\nAndmed säilivad; automaatset korduspäringut ei tehta.',file=sys.stderr);sys.exit(1)
