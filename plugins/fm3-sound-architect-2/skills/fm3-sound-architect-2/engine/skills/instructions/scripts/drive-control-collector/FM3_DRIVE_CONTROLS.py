#!/usr/bin/env python3
"""Jätkatav Drive kontrollkoguja. Ainult kasutaja kinnitatud üks GET katse kohta."""
import argparse, datetime, hashlib, json, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import drive_transport as core
HERE=Path(__file__).resolve().parent
PLAN=json.loads((HERE/'plan.json').read_text())

def dump(p,obj):
    tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n');tmp.replace(p)

def offline(*args):
    r=subprocess.run(['node',str(HERE/'control-check.mjs'),*map(str,args)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Offline kontroll ebaõnnestus')
    return json.loads(r.stdout)

def resume(root):
    root.mkdir(parents=True,exist_ok=True)
    expected={'kind':'FM3_DRIVE_CONTROLS','version':1,'planSha256':hashlib.sha256((HERE/'plan.json').read_bytes()).hexdigest()}
    p=root/'session.json'
    if p.exists():core.check(json.loads(p.read_text())==expected,'Sessiooni versioon/plaan erineb')
    else:
        core.check(not list(root.iterdir()),'Uus sessioonikaust peab olema tühi');dump(p,expected)
    previous=HERE/'baseline.syx';index=0
    for folder in sorted(root.glob('step-*')):
        core.check(not folder.is_symlink(),'Symlink refused')
        rpath=folder/'result.json'
        if not rpath.exists():continue # interrupted attempt is retained but not accepted
        r=json.loads(rpath.read_text())
        if r.get('status') not in ('passed','skipped'):continue
        core.check(r['index']==index,'Katsete järjekord on vigane')
        if r['status']=='passed':
            offline('compare',previous,folder/'donor.syx',index);offline('pair',folder)
            previous=folder/'donor.syx'
        else:core.check(PLAN[index]['kind']=='control','Ainult põhiseade võib vahele jääda')
        index+=1
    return index,previous

def export_zip(root):
    out=root.parent/('FM3_DRIVE_CONTROLS_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
        z.write(HERE/'plan.json','plan.json');z.write(HERE/'baseline.syx','baseline.syx')
        for p in sorted(root.rglob('*')):
            core.check(not p.is_symlink(),'Symlink refused')
            if p.is_file():z.write(p,str(p.relative_to(root)))
    print('\nLaadi vestlusse ZIP: '+str(out));return out

def capture(folder,port):
    r={'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending','port':port,'firmwareDeclared':13}
    try:
        print('TX (üks GET): '+core.GET.hex(),flush=True)
        r['decoded']=core.collect(port,r);r['status']='captured'
    except (Exception,KeyboardInterrupt) as e:r.update(status='failed',error=str(e) or 'Katkestatud')
    finally:dump(folder/'capture.json',r)
    core.check(r['status']=='captured',r.get('error','GET ebaõnnestus'))
    return offline('pair',folder)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--session',default=str(Path.home()/'Documents'/'FM3_DRIVE_CONTROLS_SESSION'))
    p.add_argument('--port');p.add_argument('--export-only',action='store_true');a=p.parse_args()
    root=Path(a.session).expanduser().resolve()
    core.check(shutil.which('node'),'Node puudub')
    index,previous=resume(root)
    if a.export_only:export_zip(root);return
    core.check(a.port and a.port.startswith('/dev/cu.'),'Anna kinnitatud port --port /dev/cu.…')
    print('q = ZIP ja lõpeta; s = põhiseade juba sama / puudub (põhjus salvestatakse).')
    print('Save/Store pole vajalik. Ära muuda stseeni, bypass’i ega muid plokke.')
    print('Jätkamisel impordi viimane edukas fail: '+str(previous))
    try:
        while index<len(PLAN):
            step=PLAN[index];print('\nKatse %d/%d: %s\n%s' %(index+1,len(PLAN),step['id'],step['instruction']))
            answer=input('Lohista eksporditud terve SYX siia [q/s]: ').strip()
            if answer.lower()=='q':break
            if answer.lower()=='s':
                core.check(step['kind']=='control','Seda katset ei saa vahele jätta')
                reason=input('Põhjus (juba sama väärtus / parameeter puudub; täpsusta): ').strip();core.check(reason,'Põhjus on vajalik')
                folder=root/('step-%02d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir()
                dump(folder/'result.json',{'index':index,'status':'skipped','reason':reason,'step':step});index+=1;continue
            parts=shlex.split(answer);core.check(len(parts)==1,'Lohista üks fail')
            data=Path(parts[0]).expanduser().read_bytes()
            folder=root/('step-%02d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir();(folder/'donor.syx').write_bytes(data)
            result={'index':index,'status':'pending','step':step}
            try:
                result['comparison']=offline('compare',previous,folder/'donor.syx',index)
                if result['comparison'].get('presetNameChange'):print('MÄRKUS: preseti nimi muutus; nimi salvestatakse raportisse: '+json.dumps(result['comparison']['presetNameChange'],ensure_ascii=False))
                confirm=input('Kas ekraanil on ülesande väärtus/tüüp? Sulge FM3-Edit ja Fractal-Bot. Üks GET? [jah/q]: ').strip().lower()
                if confirm!='jah':result['status']='cancelled';dump(folder/'result.json',result);break
                result['displayConfirmed']=True;result['pair']=capture(folder,a.port);result['status']='passed'
                dump(folder/'result.json',result)
            except (Exception,KeyboardInterrupt) as e:
                result.update(status='failed',error=str(e) or 'Katkestatud');dump(folder/'result.json',result);raise
            print('PASS: ainult kavandatud muudatused; GET/SYX 176/176. Ava FM3-Edit järgmise katse jaoks.')
            previous=folder/'donor.syx';index+=1
        if index==len(PLAN):print('Sessioon lõpetatud. Vahele jäetud katsed ei loe valideerituks.')
    finally:export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as e:
        print('PEATATUD: '+(str(e) or 'Katkestatud')+'\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.',file=sys.stderr);sys.exit(1)
