#!/usr/bin/env python3
"""Firmware-13 Rotary evidence collector. Manual selection, one confirmed GET."""
import argparse, datetime, json, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import rotary_transport as core
HERE=Path(__file__).resolve().parent
STEPS=json.loads((HERE/'steps.json').read_text())

def offline(command,target):
    r=subprocess.run(['node',str(HERE/'rotary-check.mjs'),command,str(target)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline check failed')
    return json.loads(r.stdout)

def put(path,data):
    with path.open('xb') as f: f.write(data)

def session(root):
    root.mkdir(parents=True,exist_ok=True)
    manifest=root/'session.json'
    expected={'schemaVersion':1,'kind':'FM3_ROTARY_SESSION','firmware':13,'collector':'0.1.0'}
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
    progress(root)
    out=root.parent/('FM3_ROTARY_BATCH_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(root/'session.json','session.json')
        
        for name in ['steps.json','baseline.syx','baseline-get.json','start.syx']:z.write(HERE/name,name)
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
    r={'schemaVersion':1,'collectorVersion':'rotary-batch-0.1.0','firmwareDeclared':13,'port':port,
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
    print('PASS: GET/SYX 84/84; kontrollsummad korras.')

def transition(previous,current):
    before=offline('preflight',previous);after=offline('preflight',current)
    changes=[i for i,(a,b) in enumerate(zip(before['words'],after['words'])) if a!=b]
    core.check(len(changes)==1 and changes[0]<21,'Muuta ainult üht Rotary A parameetrit; leitud muutused: '+str(changes))
    return changes[0]

def progress(root):
    done=[];previous=HERE/'start.syx'
    for folder in sorted(root.glob('capture-*')):
        report=json.loads((folder/'capture.json').read_text())
        if report.get('status')=='failed':continue
        core.check(len(done)<len(STEPS),'Extra capture')
        core.check(json.loads((folder/'labels.json').read_text())==STEPS[len(done)],'Step order mismatch')
        offline('pair',folder);transition(previous,folder/'donor.syx')
        done.append(folder);previous=folder/'donor.syx'
    return len(done),previous

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--session',default=str(HERE/'FM3_ROTARY_SESSION'));p.add_argument('--port');p.add_argument('--export-only',action='store_true');a=p.parse_args()
    core.check(shutil.which('node'),'Node puudub')
    core.check(a.export_only or (a.port and a.port.startswith('/dev/cu.')),'Anna kinnitatud macOS port')
    root=session(Path(a.session).expanduser().resolve())
    if a.export_only:export_zip(root);return
    count,previous=progress(root)
    print('Rotary A parameetrite kogumine. q = ZIP ja lõpeta. SET/SAVE käske ei saadeta.')
    print('Enne jätkamist laadi FM3-Editis tööpuhvrisse see seisund: '+str(previous))
    print('Vali Rotary1 kanal A. Tempo peab jääma None. Teisi plokke, stseeni ja pedaali ära muuda.')
    while count<len(STEPS):
        step=STEPS[count]
        print('\nSAMM %d/%d: A %s = %s. Kõik muud väärtused jäta samaks.' % (count+1,len(STEPS),step['parameter'],step['value']))
        answer=input('Ekspordi TERVE preset; lohista SYX siia ja Enter (või q): ').strip()
        if answer.lower()=='q':break
        parts=shlex.split(answer);core.check(len(parts)==1,'Anna üks failitee')
        donor=Path(parts[0]).expanduser();data=donor.read_bytes()
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            staged=Path(tmp)/'donor.syx';staged.write_bytes(data);pid=transition(previous,staged)
        print('SYX korras; muutus üks A sõna (pid %d).' % pid)
        if input('Kas ekraanil on ülaltoodud väärtus? Sulge FM3-Edit/Fractal-Bot. Üks GET? [jah/q]: ').strip().lower()!='jah':break
        capture(root,a.port,data,step)
        count,previous=progress(root)
        if count<len(STEPS):print('Ava FM3-Edit uuesti ja jätka samast seisundist.')
    if count==len(STEPS):print('Kõik 8 katset kogutud.')
    export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as e:
        print('PEATATUD: '+(str(e) or 'Interrupted')+'\nAndmed säilivad; automaatset korduspäringut ei tehta. Jätkamiseks käivita sama käsk.',file=sys.stderr);sys.exit(1)
