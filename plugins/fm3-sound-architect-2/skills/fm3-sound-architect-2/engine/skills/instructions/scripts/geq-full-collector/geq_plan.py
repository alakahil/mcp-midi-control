"""Collection candidates, not generator support. Type labels are from user UI."""
import json
from pathlib import Path
TYPES=json.loads((Path(__file__).parent/'types.json').read_text())
BASE_TYPE='10 Band Variable Q'

def validate_setup(setup):
    assert isinstance(setup,dict) and set(setup)=={'bypassModes','otherControls'},'Vigane alginfo'
    modes=setup['bypassModes']
    assert isinstance(modes,list) and 1<=len(modes)<=16 and len(set(modes))==len(modes),'Bypass Mode loend vigane'
    assert all(isinstance(m,str) and 1<=len(m)<=64 and m==m.strip() and all(ord(c)>=32 for c in m) for m in modes),'Bypass Mode nimi vigane'
    assert 'Thru' in modes,'Alusfail kasutab Thru režiimi; loend peab seda sisaldama'
    assert isinstance(setup['otherControls'],str) and len(setup['otherControls'])<=1000,'Muude juhtide märge vigane'
    return setup

def build_plan(setup):
    validate_setup(setup); plan=[]
    def add(kind,stage,label,**kw):
        plan.append(dict(id='%03d-%s'%(len(plan)+1,kind),kind=kind,stage=stage,label=label,channel='A',**kw))
    add('baseline','baseline','Muutmata alusfaili üks GET',typeName=BASE_TYPE,bandCount=10,source='bundled',allowUnchanged=True)
    for t in TYPES:
        name,n=t['name'],t['bands']
        add('type','types',name+' — Type ja tegelik juhtpaneel',typeName=name,bandCount=n,allowUnchanged=True)
        add('bands','types',name+' — eristatav ribamuster',typeName=name,bandCount=n,values=[(i+1)/2 for i in range(n)])
        for endpoint in ['minimum','maximum']:
            add('bands','types',name+' — kõigi nähtavate ribade '+endpoint,typeName=name,bandCount=n,endpoint=endpoint)
        add('bands','types',name+' — Zero All / ribad nulli',typeName=name,bandCount=n,values=[0]*n,zeroAll=True,allowUnchanged=True)
        for endpoint in ['minimum','maximum']:
            add('control','types',name+' — Master Q '+endpoint,typeName=name,parameter='Master Q',endpoint=endpoint,requiresMasterQ=True,allowUnchanged=True)
        for value in [1.4,1.0]:
            add('control','types',name+' — Master Q '+str(value),typeName=name,parameter='Master Q',value=value,requiresMasterQ=True,allowUnchanged=True)
    for parameter,values in [('Level',[-6,'minimum','maximum',3,0]),('Balance',['minimum','maximum',-25,25,0])]:
        for value in values:
            args={'endpoint':value} if isinstance(value,str) else {'value':value}
            add('control','common',parameter+' '+str(value),typeName=BASE_TYPE,parameter=parameter,allowUnchanged=True,**args)
    # User confirms actual menu once; any additional modes join this same plan.
    for mode in [m for m in setup['bypassModes'] if m!='Thru']+['Thru']:
        add('control','common','Bypass Mode '+mode,typeName=BASE_TYPE,parameter='Bypass Mode',value=mode,allowUnchanged=True)
    for value in ['ON','OFF']:
        add('control','common','Scene Ignore '+value,typeName=BASE_TYPE,parameter='Scene Ignore',value=value,allowUnchanged=True)
    for channel,value in [('B',-3),('C',1),('D',3)]:
        add('copy-channel','channels','Kopeeri kogu A kanal → '+channel,sourceChannel='A',typeName=BASE_TYPE)
        plan[-1]['channel']=channel
        add('bands','channels',channel+' — ainult vasakpoolseim riba '+str(value)+' dB',typeName=BASE_TYPE,bandCount=10,values=[value],firstOnly=True)
        plan[-1]['channel']=channel
    add('select-channel','channels','Scene 2 GEQ tagasi A peale',typeName=BASE_TYPE)
    return plan

def instruction(step):
    kind=step['kind']; ch=step['channel']
    prefix='Hoia Scene 2 ja GEQ 1 bypass. Muud plokid/stseenid/ühendused säilita. '
    if kind=='baseline':return prefix+'Taasta paketi baseline.syx olek. Uut eksporti pole vaja; kontrollime olemasolevat faili ühe GET-iga.'
    if kind=='type':return prefix+'Kanal A: vali Type '+step['typeName']+'. Muid juhte ära muuda. Ekspordi terve preset; programm küsib nähtavate ribade nimetused ja Master Q olemasolu.'
    if kind=='bands':
        action='Liiguta iga nähtav Gain-liugur '+('miinimumi' if step['endpoint']=='minimum' else 'maksimumi')+'.' if 'endpoint' in step else ('Muuda ainult vasakpoolseima riba Gain → '+str(step['values'][0])+' dB.' if step.get('firstOnly') else 'Sea nähtavate ribade Gain vasakult paremale: '+', '.join(map(str,step['values']))+' dB.')
        if step.get('zeroAll'):action='Vajuta Zero All; kui seda nuppu pole, sea kõik nähtavad Gain-ribad käsitsi nulli.'
        return prefix+'Kanal '+ch+', Type '+step['typeName']+'. '+action+' Ära puutu Master Q ega Level/Balance juhte. Ekspordi terve preset.'
    if kind=='control':
        value=('tegelikku '+('miinimumi' if step['endpoint']=='minimum' else 'maksimumi')) if 'endpoint' in step else str(step['value'])
        return prefix+'Kanal '+ch+', Type '+step['typeName']+'. Muuda ainult '+step['parameter']+' → '+value+'. Ekspordi terve preset.'
    if kind=='copy-channel':return prefix+'Kopeeri GEQ menüüst kogu kanal A kanalisse '+ch+', seejärel vali Scene 2-s GEQ kanal '+ch+'. Ära muuda teisi plokke. Ekspordi terve preset.'
    return prefix+'Vali ainult Scene 2 GEQ kanal A; hoia GEQ bypass. Ekspordi terve preset.'
