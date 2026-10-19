#!/usr/bin/env python3
"""One user-confirmed read-only PEQ GET, paired with the already supplied SYX."""
import argparse, datetime, hashlib, json, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import peq_transport as core
HERE=Path(__file__).resolve().parent

def offline(command,target):
    r=subprocess.run(['node',str(HERE/'peq-check.mjs'),command,str(target)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline check failed')
    return json.loads(r.stdout)

def put(path,data):
    with path.open('xb') as f:f.write(data)

def session(root,incomplete=None):
    root.mkdir(parents=True,exist_ok=True)
    expected={'schemaVersion':1,'kind':'FM3_PEQ_BASE_SESSION','collector':'0.1.0','baselineSha256':'c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be'}
    manifest=root/'session.json'
    core.check(not manifest.is_symlink(),'Symlink refused')
    if manifest.exists():core.check(json.loads(manifest.read_text())==expected,'Wrong session type/version')
    else:
        core.check(not list(root.iterdir()),'New session folder must be empty')
        put(manifest,(json.dumps(expected,indent=2)+'\n').encode())
    successful=[]
    for folder in sorted(root.glob('capture-*')):
        core.check(folder.is_dir() and not folder.is_symlink(),'Unsafe capture folder')
        for name in ['capture.json','donor.syx','pair.json']:core.check(not (folder/name).is_symlink(),'Symlink refused')
        try:r=json.loads((folder/'capture.json').read_text())
        except (FileNotFoundError,json.JSONDecodeError,UnicodeDecodeError):
            if incomplete is not None:incomplete.append(folder)
            continue
        if not isinstance(r,dict) or r.get('status')=='pending':
            if incomplete is not None:incomplete.append(folder)
            continue
        if r.get('status')=='failed':continue
        proof=offline('pair',folder)
        if (folder/'pair.json').exists():core.check(json.loads((folder/'pair.json').read_text())==proof,'Stored pair report conflicts')
        successful.append(folder)
    return successful

def export_zip(root):
    session(root)
    out=root.parent/('FM3_PEQ_BASE_CHECK_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(root/'session.json','session.json');z.write(HERE/'baseline.syx','baseline.syx')
        for folder in sorted(root.glob('capture-*')):
            z.write(folder,folder.name+'/')
            for name in ['capture.json','donor.syx','pair.json']:
                p=folder/name;core.check(not p.is_symlink(),'Symlink refused')
                if p.is_file():z.write(p,folder.name+'/'+name)
    print('Saada vestlusse tulemuste ZIP: '+str(out))
    return out

def capture(root,port,state):
    folder=root/('capture-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:10]);folder.mkdir()
    data=(HERE/'baseline.syx').read_bytes();core.check(hashlib.sha256(data).hexdigest()==state['sha256'],'Baseline changed after preflight')
    put(folder/'donor.syx',data)
    r={'schemaVersion':1,'collectorVersion':'peq-base-0.1.0','firmwareDeclared':13,'port':port,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'syxSha256':state['sha256'],'status':'pending'}
    try:
        print('TX (one GET): '+core.GET.hex(),flush=True)
        r['decoded']=core.collect(port,r);r['status']='captured'
    except (Exception,KeyboardInterrupt) as e:r.update(status='failed',error=str(e) or 'Interrupted')
    finally:put(folder/'capture.json',(json.dumps(r,indent=2)+'\n').encode())
    print('Saved: '+str(folder));core.check(r['status']=='captured',r.get('error','Capture failed'))
    try:proof=offline('pair',folder)
    except Exception as e:
        r.update(status='failed',error=str(e));(folder/'capture.json').write_text(json.dumps(r,indent=2)+'\n');raise
    put(folder/'pair.json',(json.dumps(proof,indent=2)+'\n').encode())
    print('PASS: PEQ GET/SYX 132/132; kontrollsummad korras.')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port');p.add_argument('--session',default=str(HERE/'FM3_PEQ_BASE_SESSION'));p.add_argument('--export-only',action='store_true');a=p.parse_args()
    core.check(shutil.which('node'),'Node puudub; vaja on seniste kogujatega kasutatud Node paigaldust')
    state=offline('preflight',HERE/'baseline.syx');root=Path(a.session).expanduser().resolve()
    incomplete=[];complete=session(root,incomplete)
    if incomplete:print('Leiti %s pooleli jäänud katset. Algandmed säilivad ja lähevad ZIP-i; need pole kinnitatud paarid.'%len(incomplete))
    if a.export_only or complete:
        if complete:print('PEQ algpaar on juba kontrollitud. Uut GET-i ei saadeta.')
        export_zip(root);return
    core.check(a.port and a.port.startswith('/dev/cu.'),'Anna enda FM3 kinnitatud macOS port argumendiga --port')
    print('Jäta seadmesse sama FM3_PEQ_BASELINE.syx seisund: Scene 2, PEQ 1 kanal A bypass.')
    print('Kui seisund muutus, impordi kaasasolev baseline.syx tööpuhvrisse. Uut eksporti pole vaja.')
    print('Sulge FM3-Edit ja Fractal-Bot. Loetakse üks PEQ GET; SET/SAVE/STORE-käske ei saadeta.')
    if input('Kinnitad sama seisundi ja ühe PEQ GET-lugemise? [jah/q]: ').strip().lower()!='jah':
        export_zip(root);return
    try:capture(root,a.port,state)
    except (Exception,KeyboardInterrupt):
        export_zip(root);raise
    export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as e:
        print('PEATATUD: '+(str(e) or 'Interrupted')+'\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.',file=sys.stderr);sys.exit(1)
