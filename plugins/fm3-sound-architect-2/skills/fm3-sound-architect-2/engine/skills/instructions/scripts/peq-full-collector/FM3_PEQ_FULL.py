#!/usr/bin/env python3
"""Jätkatav PEQ laienduse kogumine; üks eraldi lubatud GET ekspordi kohta."""
import argparse, datetime, fcntl, hashlib, json, math, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import peq_transport as core

HERE=Path(__file__).resolve().parent
PLAN=json.loads((HERE/'plan.json').read_text())
BASE_SHA='c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be'
STAGES={'types':'Tüübid ja Slope','numeric':'Frequency, Q ja Gain','common':'Level, Balance ja muud juhid','channels':'A–D kanalid'}

def dump(path,data):
    tmp=path.with_suffix('.tmp')
    core.check(not path.is_symlink() and not tmp.is_symlink(),'Sümbollink ei sobi')
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n'); tmp.replace(path)

def offline(*args):
    r=subprocess.run(['node',str(HERE/'full-check.mjs'),*map(str,args)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Failikontroll ebaõnnestus')
    return json.loads(r.stdout)

def display_value(answer,control):
    target=control['value']; answer=answer.strip()
    if isinstance(target,str):
        value=target if not answer else answer
        core.check(value.casefold()==target.casefold(),'Ekraanitekst ei vasta sihile. GET-i ei saadetud; kasuta q või s puuduvate valikute jaoks.')
        return target
    if control['endpoint']:
        core.check(bool(answer),'Piirväärtuse tegelik ekraaninäit tuleb sisestada')
        if control['parameter']=='Level' and answer.lower() in ['-inf','-∞','mute']:
            core.check(control['endpoint']=='minimum','Vaigistus sobib ainult Leveli miinimumiks')
            return '-inf'
    value=target if not answer else float(answer.replace(',','.'))
    core.check(type(value) in [int,float] and math.isfinite(value),'Sisesta lõplik arv')
    if control['parameter'] in ['Frequency','Q']: core.check(value>0,'Frequency/Q peab olema positiivne')
    if not control['endpoint']:
        tolerance=max(.01,abs(target)*.005)
        core.check(abs(value-target)<=tolerance,'Näit erineb sihist rohkem kui ümardus lubab. GET-i ei saadetud.')
    return value

def resume(root,incomplete=None):
    core.check(not root.is_symlink(),'Sessioonikausta sümbollink ei sobi')
    root.mkdir(parents=True,exist_ok=True)
    expected={'schemaVersion':1,'kind':'FM3_PEQ_FULL','collector':'0.1.0','firmwareDeclared':13,
              'baselineSha256':BASE_SHA,'planSha256':hashlib.sha256((HERE/'plan.json').read_bytes()).hexdigest()}
    manifest=root/'session.json'
    core.check(not manifest.is_symlink(),'Sümbollink ei sobi')
    if manifest.exists(): core.check(json.loads(manifest.read_text())==expected,'Sessiooni plaan või alus erineb')
    else:
        core.check(not [p for p in root.iterdir() if p.name!='.collector.lock'],'Uus sessioonikaust peab olema tühi')
        dump(manifest,expected)
    core.check(hashlib.sha256((HERE/'baseline.syx').read_bytes()).hexdigest()==BASE_SHA,'Algfail muutus')
    offline('preflight',HERE/'baseline.syx')
    index,previous=0,HERE/'baseline.syx'
    for folder in sorted(root.glob('step-*')):
        core.check(folder.is_dir() and not folder.is_symlink(),'Vigane katsekaust')
        for name in ['result.json','donor.syx','capture.json']: core.check(not (folder/name).is_symlink(),'Sümbollink ei sobi')
        try: result=json.loads((folder/'result.json').read_text())
        except (FileNotFoundError,json.JSONDecodeError,UnicodeDecodeError):
            if incomplete is not None: incomplete.append(str(folder))
            continue
        if not isinstance(result,dict) or result.get('status') in [None,'pending']:
            if incomplete is not None: incomplete.append(str(folder))
            continue
        if result.get('status') in ['failed','cancelled']: continue
        core.check(result.get('status') in ['passed','skipped'],'Tundmatu katse olek')
        core.check(index<len(PLAN) and result.get('index')==index and result.get('step')==PLAN[index],'Vigane katsete järjekord või plaan')
        if result['status']=='passed':
            core.check(result.get('displayConfirmed') is True,'Ekraaniväärtuste kinnitus puudub')
            observed=result.get('observations')
            core.check(isinstance(observed,list) and len(observed)==len(PLAN[index]['changes']),'Puuduvad ekraaniväärtused')
            for c,v in zip(PLAN[index]['changes'],observed):
                core.check(v.get('control')==c,'Ekraaniväärtuse juht erineb')
                core.check(display_value(str(v.get('displayValue')),c)==v.get('displayValue'),'Ekraaniväärtus vigane')
            core.check(offline('compare',previous,folder/'donor.syx',index)==result.get('comparison'),'Võrdlus erineb algfailidest')
            core.check(offline('pair',folder)==result.get('pair'),'GET/SYX raport erineb tõenditest')
            previous=folder/'donor.syx'
        else: core.check(isinstance(result.get('reason'),str) and result['reason'].strip(),'Puudub vahelejätmise põhjus')
        index+=1
    return index,previous

def export_zip(root):
    out=root.parent/('FM3_PEQ_FULL_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED,strict_timestamps=False) as archive:
        for name in ['plan.json','baseline.syx']: archive.write(HERE/name,name)
        for p in sorted(root.rglob('*')):
            core.check(not p.is_symlink(),'Sümbollink ei sobi')
            if p.is_file() and p.name!='.collector.lock': archive.write(p,str(p.relative_to(root)))
    print('\nSaada vestlusse tulemuste ZIP: '+str(out)); return out

def capture(folder,port):
    report={'schemaVersion':1,'collectorVersion':'peq-full-0.1.0','firmwareDeclared':13,
            'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'port':port,
            'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending',
            'syxSha256':hashlib.sha256((folder/'donor.syx').read_bytes()).hexdigest()}
    dump(folder/'capture.json',report)
    try:
        print('TX (üks GET): '+core.GET.hex(),flush=True)
        report['decoded']=core.collect(port,report); report['status']='captured'
    except (Exception,KeyboardInterrupt) as error: report.update(status='failed',error=str(error) or 'Katkestatud')
    finally: dump(folder/'capture.json',report)
    core.check(report['status']=='captured',report.get('error','GET ebaõnnestus'))
    return offline('pair',folder)

def collect_steps(root,port,index,previous):
    print('PEQ laiendus: 84 sammu neljas etapis. q = ZIP ja paus; s = mõõtmata punkt koos põhjusega.')
    print('Vana A/Band 3 kogumist ja algpaari ei korrata. Uued piirpunktid vajavad uusi tõendeid.')
    print('Lähteolek / viimane edukas fail: '+str(previous))
    print('Taasta selle faili olek tööpuhvrisse. Hoia Scene 2, PEQ bypass ja helitugevus madalal.')
    print('Muudatused on järjestikused; ära taasta nende vahel baseline-i ega muuda muid plokke.')
    stage=None
    while index<len(PLAN):
        step=PLAN[index]
        if stage!=step['stage']:
            stage=step['stage']; print('\nETAPP: '+STAGES[stage])
        print('\nKatse %d/%d: %s\n%s'%(index+1,len(PLAN),step['id'],step['instruction']))
        answer=input('Lohista eksporditud terve SYX siia [q/s]: ').strip()
        if answer.lower()=='q': break
        if answer.lower()=='s':
            reason=input('Põhjus ja tegelik ekraaninäit/valikuloend (puudub / juba sama / ei salvestu): ').strip()
            core.check(bool(reason),'Põhjus on vajalik')
            folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10])); folder.mkdir()
            dump(folder/'result.json',{'index':index,'step':step,'status':'skipped','reason':reason})
            print('Taasta vajadusel viimase eduka faili olek: '+str(previous))
            index+=1; continue
        parts=shlex.split(answer); core.check(len(parts)==1,'Lohista üks fail')
        data=Path(parts[0]).expanduser().read_bytes()
        folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10])); folder.mkdir()
        (folder/'donor.syx').write_bytes(data)
        result={'index':index,'step':step,'status':'pending'}; dump(folder/'result.json',result)
        try:
            comparison=offline('compare',previous,folder/'donor.syx',index); result['comparison']=comparison
            if comparison['presetNameChange']: print('Preseti nime muutus salvestati eraldi.')
            if comparison['typeCoupledChanges']: print('Tüübivahetus muutis ka sama riba seotud sõnu. Need säilitatakse analüüsiks; eraldatud parameetrikatset ei eeldata.')
            print('Failikontroll OK; muud plokid, stseenid ja routing säilisid.')
            observations=[]
            for c in step['changes']:
                label=('Band '+str(c['band'])+' ' if c['band'] else '')+c['parameter']
                hint='SISSESTA tegelik '+c['endpoint']+' ekraaninäit' if c['endpoint'] else 'Enter = '+str(c['value'])+' '+c['unit']
                shown=input(label+' — '+hint+'; või q: ').strip()
                if shown.lower()=='q':
                    result['status']='cancelled'; dump(folder/'result.json',result); return
                observations.append({'control':c,'displayValue':display_value(shown,c)})
            result['observations']=observations
            confirm=input('Kõik nimetatud ekraaninäidud õiged ja ainult juhendatud muudatused? Sulge FM3-Edit/Fractal-Bot. Lubad ühe PEQ GET-i? [jah/q]: ').strip().lower()
            if confirm!='jah':
                result['status']='cancelled'; dump(folder/'result.json',result); break
            result['displayConfirmed']=True; dump(folder/'result.json',result)
            result['pair']=capture(folder,port)
            result['status']='passed'; dump(folder/'result.json',result)
        except (Exception,KeyboardInterrupt) as error:
            result.update(status='failed',error=str(error) or 'Katkestatud'); dump(folder/'result.json',result); raise
        print('PASS: GET/SYX 132/132. Mõõtmine salvestatud; generaatoritoe otsus järgneb analüüsis.')
        previous=folder/'donor.syx'; index+=1
        if index<len(PLAN): print('Ava FM3-Edit ja jätka samast olekust. q lubab järgmisel küsimusel pausi.')
    if index==len(PLAN): print('Plaan läbitud. Saada ZIP analüüsiks. Vahelejätmised ja UI-only tulemused ei tõenda täielikku kirjutustuge.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session',default=str(HERE/'FM3_PEQ_FULL_SESSION'))
    parser.add_argument('--port'); parser.add_argument('--export-only',action='store_true')
    args=parser.parse_args(); core.check(shutil.which('node'),'Node puudub')
    root=Path(args.session).expanduser().absolute()
    core.check(not root.is_symlink(),'Sessioonikausta sümbollink ei sobi'); root.mkdir(parents=True,exist_ok=True)
    lockpath=root/'.collector.lock'; core.check(not lockpath.is_symlink(),'Sümbollink ei sobi')
    with lockpath.open('a+') as lock:
        try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError: raise ValueError('Sama sessioon on juba teises terminalis avatud')
        owned=False
        try:
            incomplete=[]; index,previous=resume(root,incomplete); owned=True
            if incomplete: print('Poolikud katsed säilivad; neid ei loeta mõõtmisteks.')
            if args.export_only or index==len(PLAN):
                if index==len(PLAN): print('Plaan juba läbitud. GET-i ei saadeta.')
                return
            core.check(args.port and args.port.startswith('/dev/cu.'),'Anna tegelik macOS port --port /dev/cu.…')
            collect_steps(root,args.port,index,previous)
        finally:
            if owned: export_zip(root)

if __name__=='__main__':
    try: main()
    except (Exception,KeyboardInterrupt) as error:
        print('PEATATUD: '+(str(error) or 'Katkestatud')+'\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.',file=sys.stderr)
        sys.exit(1)
