#!/usr/bin/env python3
"""ENHANCER Classicu puuduvate mõõtmiste lisakoguja: üks kinnitatud GET sammu kohta."""
import re, argparse, datetime, fcntl, hashlib, json, math, shlex, shutil, subprocess, sys, uuid, zipfile
from pathlib import Path
import enhancer_transport as core
from enhancer_plan import build_plan, validate_setup, instruction, BASE_TYPE, display_parameter
HERE=Path(__file__).resolve().parent
COLLECTOR_VERSION='0.1.0'
START=HERE/'ALUSTA_SIIT.syx'
SOURCE=HERE/'source-session.zip'
SOURCE_SHA='98c35922cf15ced5b2c843aabc7534b9860f084cdc0528a3ecc4966e5d7c780b'
BASE_SHA='355898b615b52f9bff56f39c4b24ac8bbe9f081e94188ee7764f157c0e158d96'
PREPARED_SETUP=HERE/'prefilled_setup.json'
PREPARED_SHA='521477571bc3fae233f33f0544dd1eadd1f260e16a4477f5d6da4fbd1df07a49'
STAGES={'baseline':'Algpaar samas paketis','types':'Kõigi kolme tüübi tegelikud juhid','channels':'A–D kanalid'}

def dump(path,data):
    tmp=path.with_suffix('.tmp');core.check(not path.is_symlink() and not tmp.is_symlink(),'Sümbollink ei sobi')
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)

def offline(*args):
    r=subprocess.run(['node',str(HERE/'full-check.mjs'),*map(str,args)],capture_output=True,text=True)
    core.check(r.returncode==0,r.stderr.strip() or 'Failikontroll ebaõnnestus');return json.loads(r.stdout)

def prepared_setup():
    data=PREPARED_SETUP.read_bytes()
    core.check(hashlib.sha256(data).hexdigest()==PREPARED_SHA,'Piltidelt koostatud alginfo fail erineb paketi omast')
    return validate_setup(json.loads(data))

def ensure_setup(root):
    expected=prepared_setup()
    f=root/'setup.json';core.check(not f.is_symlink(),'Sümbollink ei sobi')
    if f.exists():
        actual=validate_setup(json.loads(f.read_text()))
        core.check(actual==expected,'See sessioon kasutab teistsugust alginfot. Kasuta eraldi FM3_ENHANCER_LISA kausta; seniseid faile ei muudeta.')
        return actual
    core.check(not [p for p in root.iterdir() if p.name!='.collector.lock'],'Uus sessioonikaust peab olema tühi')
    dump(f,expected)
    print('Algküsimusi ei ole. Kogume ainult puuduva Classic Pan Left, Level ja Scene Ignore info.')
    print('Alusta paketi ALUSTA_SIIT.syx olekust: Scene 2, Modern, Enhancer A/bypass. Esimene samm on Type Classic.')
    return expected

def number(answer,level_min=False):
    raw=answer.strip().replace(',','.').replace('−','-')
    if level_min and raw.lower() in ['-inf','-∞','mute']:return '-inf'
    if raw.lower() in ['center','centre','c','keskel']:return 0.0
    pan=re.fullmatch(r'(?i)([LR])\s*(\d+(?:\.\d+)?)|([+-]?\d+(?:\.\d+)?)\s*([LR])',raw)
    if pan:
        side=pan[1] or pan[4];value=float(pan[2] or pan[3]);return -abs(value) if side.upper()=='L' else abs(value)
    match=re.fullmatch(r'([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(kHz|Hz|ms|dB|%)?',raw,re.I)
    core.check(bool(match),'Sisesta tegelik arv (sobivad nt 25, 0,5, 1 kHz, L25, 25R, Center)')
    value=float(match[1])*(1000 if (match[2] or '').lower()=='khz' else 1)
    core.check(math.isfinite(value),'Näit peab olema lõplik arv');return value

def display_control(answer,step):
    core.check(isinstance(answer,str) and bool(answer.strip()),'Tegelik ekraaninäit on kohustuslik')
    if step.get('mode')=='enum':
        core.check(answer.casefold()==step['value'].casefold(),'Ekraaninimi ei vasta sihile');return step['value']
    value=number(answer,step['parameter']=='Level' and step.get('point')=='minimum')
    # Bare numbers use the UI unit recorded at setup; explicit Hz/kHz wins.
    if step.get('unit','').casefold()=='khz' and re.fullmatch(r'[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)',answer.strip()):value*=1000
    if 'value' in step:core.check(isinstance(value,(int,float)) and abs(value-step['value'])<=.01,'Ekraaninäit erineb sihist')
    return value

def dependency_reason(step,state):
    if step['kind'] in ['baseline','type']:return None
    if state.get('typeName')!=step['typeName']:return 'Selle Type edukas mõõtmine puudub; senine tüüp on '+str(state.get('typeName'))
    if step.get('point') in ['maximum','lower','middle','upper']:
        points=state.get('points',{}).get(step['parameter'],{})
        needed=['minimum'] if step['point']=='maximum' else ['minimum','maximum']
        if any(p not in points for p in needed):return 'Selle juhi vajalik piirväärtuse mõõtmine puudub'
    return None

def validate_observations(result,step,state):
    o=result.get('observations');core.check(isinstance(o,dict),'Ekraaniandmed puuduvad')
    if step['kind'] in ['baseline','type']:
        core.check(set(o)=={'typeName','controlsConfirmed'} and o['typeName']==step['typeName'] and o['controlsConfirmed'] is True,'Type või juhtide kinnitus puudub')
    elif step['kind']=='control':
        core.check(set(o)=={'displayText','displayValue'} and display_control(o['displayText'],step)==o['displayValue'],'Juhi näit vigane')
        point=step.get('point');value=o['displayValue'];points=state.get('points',{}).get(step['parameter'],{})
        if point in ['maximum','lower','middle','upper']:
            low=points['minimum'];high=points.get('maximum')
            core.check(low=='-inf' or value>low,'Näit peab olema miinimumist suurem')
            if point!='maximum':
                core.check(value<high and value not in points.values(),'Vaheväärtus peab erinema piiridest ja varasematest vaheväärtustest')
                earlier=[points[k] for k in ['lower','middle'] if k in points]
                core.check(not earlier or value>max(earlier),'Vali järgmisest kõrgem vaheväärtus')
    else:core.check(o=={},'Kanalikatsel ootamatu vaatlus')

def advance_state(step,result,state):
    if step['kind'] in ['baseline','type']:return {'typeName':step['typeName'],'points':{}}
    if step.get('point'):state.setdefault('points',{}).setdefault(step['parameter'],{})[step['point']]=result['observations']['displayValue']
    return state

def resume(root,incomplete=None):
    core.check(hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA,'Algse täiskogumise ZIP muutus')
    setup=validate_setup(json.loads((root/'setup.json').read_text()));plan=build_plan(setup)
    planfile=root/'plan.json';core.check(not planfile.is_symlink(),'Sümbollink ei sobi')
    if planfile.exists():core.check(json.loads(planfile.read_text())==plan,'Sessiooni plaani muudeti')
    else:dump(planfile,plan)
    expected={'schemaVersion':1,'kind':'FM3_ENHANCER_GAPS','collector':'0.1.0','sourceZipSha256':SOURCE_SHA,'prefilledSetupSha256':PREPARED_SHA,'firmwareDeclared':13,'startSha256':BASE_SHA,
              'setupSha256':hashlib.sha256((root/'setup.json').read_bytes()).hexdigest(),'planSha256':hashlib.sha256(planfile.read_bytes()).hexdigest()}
    manifest=root/'session.json';core.check(not manifest.is_symlink(),'Sümbollink ei sobi')
    if manifest.exists():core.check(json.loads(manifest.read_text())==expected,'Sessiooni plaan või alus erineb')
    else:
        core.check(not [p for p in root.iterdir() if p.name not in ['.collector.lock','setup.json','plan.json']],'Sessiooni algfail puudub; ära kirjuta olemasolevaid katseid üle')
        dump(manifest,expected)
    core.check(hashlib.sha256((START).read_bytes()).hexdigest()==BASE_SHA,'Algfail muutus');offline('preflight',START)
    index,previous,state=0,START,{}
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
            state=advance_state(step,result,state)
        else:
            core.check(index>0 and isinstance(result.get('reason'),str) and result['reason'].strip(),'Algpaari ei saa vahele jätta; muul sammul põhjus vajalik')
            if result.get('automatic'):core.check(dependency_reason(step,state)==result['reason'],'Automaatse vahelejätmise alus erineb')
        index+=1
        if index%20==0:print('Kontrollitud %d/%d plaanisammu.'%(index,len(plan)),flush=True)
    return index,previous,state,plan

def export_zip(root):
    out=root.parent/('FM3_ENHANCER_LISA_'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'_'+uuid.uuid4().hex[:8]+'.zip')
    with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED,strict_timestamps=False) as archive:
        archive.write(START,'ALUSTA_SIIT.syx');archive.write(HERE/'baseline.syx','baseline.syx');archive.write(SOURCE,'source-session.zip');archive.write(PREPARED_SETUP,'prefilled_setup.json')
        for p in sorted(root.rglob('*')):
            core.check(not p.is_symlink(),'Sümbollink ei sobi')
            if p.is_file() and p.name!='.collector.lock':archive.write(p,str(p.relative_to(root)))
    print('\nSaada vestlusse tulemuste ZIP: '+str(out));return out

def capture(folder,port):
    report={'schemaVersion':1,'collectorVersion':'enhancer-gaps-'+COLLECTOR_VERSION,'firmwareDeclared':13,'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'port':port,
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
        ui=prepared_setup()['types'][step['typeName']]
        print('Oodatav Type: '+step['typeName']+'. Juhid piltidelt: '+', '.join(display_parameter(x) for x in ui['numeric'])+'; '+', '.join(ui['enums']))
        # A result passes only after the explicit combined display/GET confirmation below.
        return {'typeName':step['typeName'],'controlsConfirmed':True}
    if step['kind']=='control':
        text=ask(display_parameter(step['parameter'])+' tegelik ekraaninäit'+(' (Enter = '+str(step['value'])+')' if 'value' in step else ' (kohustuslik)')+': ')
        if not text and 'value' in step:text=str(step['value'])
        return {'displayText':text,'displayValue':display_control(text,step)}
    return {}

def collect_steps(root,port,index,previous,state,plan):
    print('Koguja '+COLLECTOR_VERSION+' — Classicu 12 puuduvat punkti ja üks Type-vahetus.')
    print('ENHANCER lisakogumine: %d sammu. q = ZIP ja paus; s = mõõtmata punkt koos põhjusega.'%len(plan))
    print('Kui väärtus on juba õige, ekspordi ikkagi preset ja tee GET. s tähendab, et selle mõõtmise tõend jääb puudu.')
    print('Lähteolek / viimane edukas fail: '+str(previous))
    print('Taasta selle faili olek tööpuhvrisse. Hoia Scene 2, ENHANCER bypass ja helitugevus madalal.')
    print('Muudatused on järjestikused; ära taasta nende vahel ALUSTA_SIIT-faili. q toimib igal küsimusel.')
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
        if step['kind']=='baseline':core.check(not answer,'Algpaar kasutab ainult paketi baseline.syx faili');data=(START).read_bytes()
        else:
            parts=shlex.split(answer);core.check(len(parts)==1,'Lohista üks fail');data=Path(parts[0]).expanduser().read_bytes()
        folder=root/('step-%03d-%s'%(index,uuid.uuid4().hex[:10]));folder.mkdir();(folder/'donor.syx').write_bytes(data)
        result=dict(index=index,step=step,status='pending');dump(folder/'result.json',result)
        try:
            comparison=offline('compare',previous,folder/'donor.syx',json.dumps(step));result['comparison']=comparison
            if comparison['presetNameChange']:print('Preseti nime muutus salvestati eraldi.')
            if comparison['typeCoupledChanges']:print('Type muutis ka seotud ENHANCER A sõnu; need säilitatakse auditiks.')
            print('Failikontroll OK; muud plokid, stseenid ja routing säilisid.')
            result['observations']=observe(step,state)
            validate_observations(result,step,state)
            confirm=ask('Type '+step['typeName']+', kanal '+step['channel']+' ja ekraaninäidud õiged, Enhancer bypass? Sulge FM3-Edit/Fractal-Bot. Üks GET? [jah/q]: ').lower()
            core.check(confirm=='jah','GET-i ei lubatud');result['displayConfirmed']=True;dump(folder/'result.json',result)
            result['pair']=capture(folder,port);result['status']='passed';dump(folder/'result.json',result)
        except KeyboardInterrupt:
            result['status']='cancelled';dump(folder/'result.json',result);return
        except Exception as error:
            result.update(status='failed',error=str(error));dump(folder/'result.json',result);raise
        print('PASS: GET/SYX 48/48. Mõõtmine salvestatud; kirjutustugi järgneb alles analüüsile.')
        previous=folder/'donor.syx';index+=1
        state=advance_state(step,result,state)
        if index<len(plan):print('Ava FM3-Edit ja jätka samast olekust.')
    if index==len(plan):print('Plaan läbitud. Saada ZIP analüüsiks; vahelejätmine ega muutumatu sõna ei tõenda kirjutustuge.')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--session',default=str(HERE/'FM3_ENHANCER_LISA_SESSION'))
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
