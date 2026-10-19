#!/usr/bin/env python3
"""Jätkatav GEQ täiskogumine: üks kasutaja kinnitatud GET mõõtmise kohta."""
import argparse, datetime, fcntl, hashlib, json, math, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import geq_transport as core
from geq_plan import build_plan, validate_setup, instruction, BASE_TYPE
HERE=Path(__file__).resolve().parent
BASE_SHA='51f5f3e297bec66f9bf36e0482e1e360bea93ec35fd09f7c80b1e88c78a2470b'
STAGES={'baseline':'Algpaar samas paketis','types':'18 tüüpi, nähtavad ribad ja Master Q','common':'Level, Balance, Bypass Mode ja Scene Ignore','channels':'A–D kanalid'}

def dump(path,data):
    tmp=path.with_suffix('.tmp');core.check(not path.is_symlink() and not tmp.is_symlink(),'Sümbollink ei sobi')
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def offline(*args):
    r=subprocess.run(['node',str(HERE/'full-check.mjs'),*map(str,args)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Failikontroll ebaõnnestus');return json.loads(r.stdout)

def ensure_setup(root):
    f=root/'setup.json';core.check(not f.is_symlink(),'Sümbollink ei sobi')
    if f.exists():return validate_setup(json.loads(f.read_text()))
    core.check(not [p for p in root.iterdir() if p.name!='.collector.lock'],'Uus sessioonikaust peab olema tühi')
    print('Ava paketi baseline.syx, Scene 2, GEQ A/bypass. PEQ ja teised plokid jäta samaks.')
    print('Vaata GEQ Bypass Mode menüü kõiki valikuid. Ainult loeme nimetusi, valitud režiim jäta Thru.')
    answer=input('Enter kinnitab loendi Thru;Mute. Kui menüü erineb, sisesta KÕIK nimed semikoolonitega; q katkestab: ').strip()
    if answer.lower()=='q':return None
    extra=input('Muud seni nimetamata GEQ üldjuhid (Enter = puuduvad; q = katkestus): ').strip()
    if extra.lower()=='q':return None
    setup={'bypassModes':[v.strip() for v in (answer or 'Thru;Mute').split(';')],'otherControls':extra}
    validate_setup(setup);dump(f,setup);return setup

def number(answer,positive=False,level_min=False):
    if level_min and answer.strip().lower() in ['-inf','-∞','mute']:return '-inf'
    try:v=float(answer.strip().replace(',','.'))
    except (ValueError,TypeError):raise ValueError('Sisesta tegelik arv; mitut näitu eralda semikooloniga')
    core.check(math.isfinite(v) and (not positive or v>0),'Näit peab olema lõplik'+(' positiivne' if positive else '')+' arv');return v

def display_control(answer,step):
    target=step.get('value');endpoint=step.get('endpoint')
    if isinstance(target,str):
        value=answer.strip() or target;core.check(value.casefold()==target.casefold(),'Ekraaninimi ei vasta sihile');return target
    core.check(answer.strip() or endpoint is None,'Piirväärtuse tegelik ekraaninäit on kohustuslik')
    value=number(str(target) if not answer.strip() else answer,step['parameter']=='Master Q',step['parameter']=='Level' and endpoint=='minimum')
    if endpoint is None:core.check(isinstance(value,(int,float)) and abs(value-target)<=max(.01,abs(target)*.005)+1e-12,'Ekraaninäit erineb sihist')
    return value

def display_bands(answer,step):
    targets=step.get('values');n=1 if step.get('firstOnly') else step['bandCount']
    core.check(answer.strip() or targets is not None,'Sisesta tegelikud piirnäidud')
    values=[number(v) for v in answer.split(';')] if answer.strip() else list(targets)
    if len(values)==1 and n>1:values*=n
    core.check(len(values)==n,'Nähtavate ribade näitude arv ei klapi')
    if targets is not None:core.check(all(abs(v-t)<=max(.01,abs(t)*.005)+1e-12 for v,t in zip(values,targets)),'Ribade näidud erinevad sihtidest')
    return values

def validate_ui(ui,step):
    core.check(isinstance(ui,dict) and set(ui)=={'typeName','bandLabels','masterQVisible','extraControls'},'Juhtpaneeli kirjeldus puudub')
    core.check(ui['typeName']==step['typeName'],'Type nimi ei vasta plaanile')
    labels=ui['bandLabels'];core.check(isinstance(labels,list) and len(labels)==step['bandCount'],'Ribade arv ei vasta Type nimele; säilita pilt ja kasuta s')
    core.check(all(isinstance(x,str) and 0<len(x)<=80 and x==x.strip() for x in labels),'Ribade tegelikud nimetused on vajalikud')
    core.check(isinstance(ui['masterQVisible'],bool),'Master Q nähtavus puudub')
    core.check(isinstance(ui['extraControls'],str) and len(ui['extraControls'])<=1000,'Lisajuhtide märge vigane');return ui

def dependency_reason(step,state):
    if step['kind'] in ['baseline','type']:return None
    if state.get('typeName')!=step['typeName']:return 'Selle Type edukas mõõtmine puudub; senine tüüp on '+str(state.get('typeName'))
    if step.get('requiresMasterQ') and not state['ui']['masterQVisible']:return 'Kasutaja kinnitas selle Type vaates Master Q puudumise'
    return None

def validate_observations(result,step,state):
    o=result.get('observations');core.check(isinstance(o,dict),'Ekraaniandmed puuduvad')
    if step['kind'] in ['baseline','type']:
        core.check(set(o)=={'ui'},'Vigane Type vaatlus');validate_ui(o['ui'],step)
    elif step['kind']=='bands':
        core.check(set(o)=={'bandLabels','displayValues'},'Vigane ribavaatlus')
        labels=state['ui']['bandLabels'][:1] if step.get('firstOnly') else state['ui']['bandLabels']
        core.check(o['bandLabels']==labels,'Ribade nimetused erinevad Type mõõtmisest')
        core.check(display_bands(';'.join(map(str,o['displayValues'])),step)==o['displayValues'],'Ribade näidud vigased')
    elif step['kind']=='control':
        core.check(set(o)=={'displayValue'} and display_control(str(o['displayValue']),step)==o['displayValue'],'Juhi näit vigane')
    else:core.check(o=={},'Kanalikatsel ootamatu vaatlus')

def resume(root,incomplete=None):
    setup=validate_setup(json.loads((root/'setup.json').read_text()));plan=build_plan(setup)
    planfile=root/'plan.json';core.check(not planfile.is_symlink(),'Sümbollink ei sobi')
    if planfile.exists():core.check(json.loads(planfile.read_text())==plan,'Sessiooni plaani muudeti')
    else:dump(planfile,plan)
    expected={'schemaVersion':1,'kind':'FM3_GEQ_FULL','collector':'0.1.0','firmwareDeclared':13,'baselineSha256':BASE_SHA,
              'setupSha256':hashlib.sha256((root/'setup.json').read_bytes()).hexdigest(),'planSha256':hashlib.sha256(planfile.read_bytes()).hexdigest()}
    manifest=root/'session.json';core.check(not manifest.is_symlink(),'Sümbollink ei sobi')
    if manifest.exists():core.check(json.loads(manifest.read_text())==expected,'Sessiooni plaan või alus erineb')
    else:
        core.check(not [p for p in root.iterdir() if p.name not in ['.collector.lock','setup.json','plan.json']],'Sessiooni algfail puudub; ära kirjuta olemasolevaid katseid üle')
        dump(manifest,expected)
    core.check(hashlib.sha256((HERE/'baseline.syx').read_bytes()).hexdigest()==BASE_SHA,'Algfail muutus');offline('preflight',HERE/'baseline.syx')
    index,previous,state=0,HERE/'baseline.syx',{}
    folders=sorted(root.glob('step-*'))
    if folders:print('Kontrollin varasemaid mõõtmisi; uut GET-i selle ajal ei saadeta.',flush=True)
    for folder in folders:
        core.check(folder.is_dir() and not folder.is_symlink(),'Vigane katsekaust')
        for name in ['result.json','donor.syx','capture.json']:core.check(not (folder/name).is_symlink(),'Sümbollink ei sobi')
        try:result=json.loads((folder/'result.json').read_text())
        except (FileNotFoundError,json.JSONDecodeError,UnicodeDecodeError):
            if incomplete is not None:incomplete.append(str(folder))
            continue
        if not isinstance(result,dict) or result.get('status') in [None,'pending']:
            if incomplete is not None:incomplete.append(str(folder))
            continue
        if result.get('status') in ['failed','cancelled']:continue
        core.check(index<len(plan) and result.get('index')==index and result.get('step')==plan[index],'Vigane katsete järjekord või plaan')
        step=plan[index];status=result.get('status')
        core.check(status in ['passed','skipped'],'Tundmatu katse olek')
        if status=='passed':
            core.check(not dependency_reason(step,state),'Mõõtmise Type/eeltingimus puudub')
            core.check(result.get('displayConfirmed') is True,'Ekraaniväärtuste kinnitus puudub');validate_observations(result,step,state)
            core.check(offline('compare',previous,folder/'donor.syx',json.dumps(step))==result.get('comparison'),'Võrdlus erineb algfailidest')
            core.check(offline('pair',folder)==result.get('pair'),'GET/SYX raport erineb tõenditest')
            previous=folder/'donor.syx'
            if step['kind'] in ['baseline','type']:state={'typeName':step['typeName'],'ui':result['observations']['ui']}
        else:
            core.check(index>0 and isinstance(result.get('reason'),str) and result['reason'].strip(),'Algpaari ei saa vahele jätta; muul sammul põhjus vajalik')
            if result.get('automatic'):core.check(dependency_reason(step,state)==result['reason'],'Automaatse vahelejätmise alus erineb')
        index+=1
        if index%20==0:print('Kontrollitud %d/%d plaanisammu.'%(index,len(plan)),flush=True)
    return index,previous,state,plan

def export_zip(root):
    out=root.parent/('FM3_GEQ_FULL_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED,strict_timestamps=False) as archive:
        archive.write(HERE/'baseline.syx','baseline.syx');archive.write(HERE/'types.json','types.json')
        for p in sorted(root.rglob('*')):
            core.check(not p.is_symlink(),'Sümbollink ei sobi')
            if p.is_file() and p.name!='.collector.lock':archive.write(p,str(p.relative_to(root)))
    print('\nSaada vestlusse tulemuste ZIP: '+str(out));return out

def capture(folder,port):
    report={'schemaVersion':1,'collectorVersion':'geq-full-0.1.0','firmwareDeclared':13,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'port':port,
            'txHex':core.GET.hex(),'txCalls':0,'rxChunks':[],'status':'pending','syxSha256':hashlib.sha256((folder/'donor.syx').read_bytes()).hexdigest()}
    dump(folder/'capture.json',report)
    try:
        print('TX (üks GET): '+core.GET.hex(),flush=True);report['decoded']=core.collect(port,report);report['status']='captured'
    except (Exception,KeyboardInterrupt) as error:report.update(status='failed',error=str(error) or 'Katkestatud')
    finally:dump(folder/'capture.json',report)
    core.check(report['status']=='captured',report.get('error','GET ebaõnnestus'));return offline('pair',folder)

def ask(prompt):
    answer=input(prompt).strip()
    if answer.lower()=='q':raise KeyboardInterrupt('Paus')
    return answer

def observe(step,state):
    if step['kind'] in ['baseline','type']:
        actual=ask('Type ekraanil (Enter = '+step['typeName']+'): ') or step['typeName'];core.check(actual.casefold()==step['typeName'].casefold(),'Type nimi erineb; GET-i ei saadeta')
        default='31;63;125;250;500;1k;2k;4k;8k;16k' if step['kind']=='baseline' else None
        text=ask('Ribade tegelikud nimetused VASAKULT PAREMALE, eralda ;'+(' (Enter = '+default+')' if default else '')+': ')
        labels=(text or default or '').split(';')
        visible=ask('Kas Master Q nupp on selles Type vaates nähtav? [jah/ei]: ').lower();core.check(visible in ['jah','ei'],'Vasta jah või ei')
        ui=dict(typeName=step['typeName'],bandLabels=[x.strip() for x in labels],masterQVisible=visible=='jah',extraControls=ask('Muud selles Type vaates nähtavad juhid peale ribade/Master Q/Level/Balance/Bypass Mode/Scene Ignore/Zero All (Enter = puuduvad): '))
        return {'ui':validate_ui(ui,step)}
    if step['kind']=='bands':
        labels=state['ui']['bandLabels'][:1] if step.get('firstOnly') else state['ui']['bandLabels'];print('Nähtavad ribad: '+'; '.join(labels))
        hint='tegelikud '+step['endpoint']+' Gain-näidud; kui KÕIGIL sama, piisab ühest arvust' if 'endpoint' in step else 'Enter kinnitab: '+'; '.join(map(str,step['values']))
        return {'bandLabels':labels,'displayValues':display_bands(ask(hint+'; muidu sisesta kõik näidud semikoolonitega: '),step)}
    if step['kind']=='control':
        hint='SISSESTA tegelik '+step['endpoint'] if 'endpoint' in step else 'Enter kinnitab '+str(step['value'])
        return {'displayValue':display_control(ask(step['parameter']+' — '+hint+': '),step)}
    return {}

def collect_steps(root,port,index,previous,state,plan):
    print('GEQ täiskogumine: kuni %d sammu. q = ZIP ja paus; s = mõõtmata punkt koos põhjusega.'%len(plan))
    print('Master Q puudumisel jäävad selle tüübi neli Q-sammu automaatselt vahele, GET-e ei saadeta.')
    print('Lähteolek / viimane edukas fail: '+str(previous))
    print('Taasta selle faili olek tööpuhvrisse. Hoia Scene 2, GEQ bypass ja helitugevus madalal.')
    print('Muudatused on järjestikused; ära taasta nende vahel baseline-i. q toimib igal küsimusel.')
    stage=None
    while index<len(plan):
        step=plan[index]
        if stage!=step['stage']:stage=step['stage'];print('\nETAPP: '+STAGES[stage])
        print('\nKatse %d/%d: %s\n%s'%(index+1,len(plan),step['label'],instruction(step)))
        reason=dependency_reason(step,state)
        if reason:
            folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir();dump(folder/'result.json',dict(index=index,step=step,status='skipped',reason=reason,automatic=True));print('Mõõtmata, GET-ita: '+reason);index+=1;continue
        answer=input('Enter kasutab muutmata paketi baseline.syx faili [q]: ' if step['kind']=='baseline' else 'Lohista eksporditud terve SYX siia [q/s]: ').strip()
        if answer.lower()=='q':break
        if answer.lower()=='s':
            core.check(index>0,'AlgGET/SYX paari ei saa vahele jätta');reason=ask('Põhjus ja tegelik ekraaninäit/valik (puudub / ei salvestu / ei sobi): ');core.check(bool(reason),'Põhjus vajalik')
            folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir();dump(folder/'result.json',dict(index=index,step=step,status='skipped',reason=reason));print('Taasta viimase eduka faili olek: '+str(previous));index+=1;continue
        if step['kind']=='baseline':core.check(not answer,'Algpaar kasutab ainult paketi baseline.syx faili');data=(HERE/'baseline.syx').read_bytes()
        else:
            parts=shlex.split(answer);core.check(len(parts)==1,'Lohista üks fail');data=Path(parts[0]).expanduser().read_bytes()
        folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir();(folder/'donor.syx').write_bytes(data)
        result=dict(index=index,step=step,status='pending');dump(folder/'result.json',result)
        try:
            comparison=offline('compare',previous,folder/'donor.syx',json.dumps(step));result['comparison']=comparison
            if comparison['presetNameChange']:print('Preseti nime muutus salvestati eraldi.')
            if comparison['typeCoupledChanges']:print('Type muutis ka seotud GEQ A sõnu; need säilitatakse auditiks.')
            print('Failikontroll OK; muud plokid, stseenid ja routing säilisid.')
            result['observations']=observe(step,state)
            confirm=ask('Ekraaninäidud õiged? Sulge FM3-Edit/Fractal-Bot. Lubad ühe GEQ GET-i? [jah/q]: ').lower()
            core.check(confirm=='jah','GET-i ei lubatud');result['displayConfirmed']=True;dump(folder/'result.json',result)
            result['pair']=capture(folder,port);result['status']='passed';dump(folder/'result.json',result)
        except KeyboardInterrupt:
            result['status']='cancelled';dump(folder/'result.json',result);return
        except Exception as error:
            result.update(status='failed',error=str(error));dump(folder/'result.json',result);raise
        print('PASS: GET/SYX 80/80. Mõõtmine salvestatud; kirjutustugi järgneb alles analüüsile.')
        previous=folder/'donor.syx';index+=1
        if step['kind'] in ['baseline','type']:state={'typeName':step['typeName'],'ui':result['observations']['ui']}
        if index<len(plan):print('Ava FM3-Edit ja jätka samast olekust.')
    if index==len(plan):print('Plaan läbitud. Saada ZIP analüüsiks; vahelejätmine ega muutumatu sõna ei tõenda kirjutustuge.')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--session',default=str(HERE/'FM3_GEQ_FULL_SESSION'))
    parser.add_argument('--port');parser.add_argument('--export-only',action='store_true');args=parser.parse_args();core.check(shutil.which('node'),'Node puudub')
    root=Path(args.session).expanduser().absolute();core.check(not root.is_symlink(),'Sessioonikausta sümbollink ei sobi');root.mkdir(parents=True,exist_ok=True)
    lockpath=root/'.collector.lock';core.check(not lockpath.is_symlink(),'Sümbollink ei sobi')
    with lockpath.open('a+') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise ValueError('Sama sessioon on teises terminalis avatud')
        owned=False
        try:
            if ensure_setup(root) is None:return
            incomplete=[];index,previous,state,plan=resume(root,incomplete);owned=True
            if incomplete:print('Poolikud katsed säilivad; neid ei loeta mõõtmisteks.')
            if args.export_only or index==len(plan):
                if index==len(plan):print('Plaan juba läbitud. GET-i ei saadeta.')
                return
            core.check(args.port and args.port.startswith('/dev/cu.'),'Anna tegelik macOS port --port /dev/cu.…')
            collect_steps(root,args.port,index,previous,state,plan)
        finally:
            if owned:export_zip(root)

if __name__=='__main__':
    try:main()
    except (Exception,KeyboardInterrupt) as error:
        print('PEATATUD: '+(str(error) or 'Katkestatud')+'\nAndmed säilivad; automaatset korduspäringut ei tehta. Käivita sama käsk jätkamiseks.',file=sys.stderr);sys.exit(1)
