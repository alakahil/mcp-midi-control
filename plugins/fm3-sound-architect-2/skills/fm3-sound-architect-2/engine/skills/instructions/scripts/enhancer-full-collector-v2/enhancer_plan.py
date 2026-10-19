"""UI-confirmed collection plan. Candidate word positions are not write support."""
TYPES=['Modern','Classic','Stereoizer']
BASE_TYPE='Modern'
NUMERIC=['Width','Depth','Low Cut','High Cut','Level','Pan L','Pan R','Balance']
ENUMS=['Bypass Mode','Invert','Scene Ignore']
def display_parameter(parameter):
    return {'Pan L':'Pan Left','Pan R':'Pan Right'}.get(parameter,parameter)


def validate_type_ui(ui):
    assert isinstance(ui,dict) and set(ui)=={'numeric','enums','units','extraControls'},'Vigane juhtpaneeli kirjeldus'
    numeric=ui['numeric'];assert isinstance(numeric,list) and numeric and len(set(numeric))==len(numeric),'Vigane arvuliste juhtide loend'
    assert all(v in NUMERIC for v in numeric),'Tundmatu juht: saada pilt enne kogumise jätkamist'
    assert isinstance(ui['enums'],dict) and set(ui['enums'])<=set(ENUMS),'Tundmatu valik'
    for control,values in ui['enums'].items():
        assert isinstance(values,list) and 1<=len(values)<=16 and len(set(v.casefold() for v in values))==len(values),'Vigane valikute loend'
        assert all(isinstance(v,str) and 0<len(v)<=64 and v==v.strip() and all(ord(c)>=32 for c in v) for v in values),'Vigane valikunimi'
        if control=='Scene Ignore':assert values==['ON','OFF'],'Scene Ignore valikud peavad olema ON/OFF'
    assert isinstance(ui['units'],dict) and set(ui['units'])==set(numeric),'Ühikud puuduvad'
    assert all(isinstance(v,str) and 0<len(v)<=24 for v in ui['units'].values()),'Vigane ühik'
    assert ui['extraControls']=='','Loendis nimetamata juhid vajavad enne kogumist ülevaatust; saada pilt'
    return ui

def validate_setup(setup):
    assert isinstance(setup,dict) and set(setup)=={'types'} and set(setup['types'])==set(TYPES),'Vigane Type loend'
    for ui in setup['types'].values():validate_type_ui(ui)
    assert 'Width' in setup['types']['Modern']['numeric'],'Modern Width peab olema nähtav'
    assert setup['types']['Modern']['units']['Width']=='%','Modern Width protsendiskaala erineb pildist; vaja ülevaatust'
    return setup

def build_plan(setup):
    validate_setup(setup);plan=[]
    def add(kind,stage,label,**kw):
        plan.append(dict(id='%03d-%s'%(len(plan)+1,kind),kind=kind,stage=stage,label=label,channel='A',**kw))
    add('baseline','baseline','Muutmata Modern-alusfaili üks GET',typeName=BASE_TYPE,source='bundled',allowUnchanged=True)
    for name in TYPES:
        if name!=BASE_TYPE:add('type','types','Type '+name,typeName=name,allowUnchanged=True)
        ui=setup['types'][name]
        for parameter in ui['numeric']:
            for point in ['minimum','maximum','lower','middle','upper']:
                add('control','types',name+' — '+parameter+' '+point,typeName=name,parameter=parameter,mode='numeric',point=point,unit=ui['units'][parameter],allowUnchanged=True)
        for parameter,values in ui['enums'].items():
            for value in values:add('control','types',name+' — '+parameter+' '+value,typeName=name,parameter=parameter,mode='enum',value=value,allowUnchanged=True)
    add('type','channels','Tagasi Modern peale',typeName=BASE_TYPE,allowUnchanged=True)
    for channel,value in [('B',25),('C',75),('D',35)]:
        add('copy-channel','channels','Kopeeri kogu A kanal → '+channel,sourceChannel='A',typeName=BASE_TYPE)
        plan[-1]['channel']=channel
        add('control','channels',channel+' — ainult Width '+str(value)+'%',typeName=BASE_TYPE,parameter='Width',mode='numeric',value=value,allowUnchanged=True)
        plan[-1]['channel']=channel
    add('select-channel','channels','Scene 2 Enhancer tagasi A peale',typeName=BASE_TYPE)
    return plan

def instruction(step):
    prefix='Hoia Scene 2 ja Enhancer 1 bypass. Muud plokid/stseenid/ühendused säilita. '
    kind=step['kind'];ch=step['channel']
    if kind=='baseline':return prefix+'Taasta paketi baseline.syx olek. Uut eksporti pole vaja; kontrollime olemasolevat faili ühe GET-iga.'
    if kind=='type':return prefix+'Kanal A: vali Type '+step['typeName']+'. Muid juhte ära muuda. Ekspordi terve preset.'
    if kind=='control':
        if 'value' in step:target=str(step['value'])+(' '+step.get('unit','%') if step['mode']=='numeric' else '')
        else:target={'minimum':'tegelik miinimum','maximum':'tegelik maksimum','lower':'üks vaheväärtus vahemiku alumises osas','middle':'teine vaheväärtus vahemiku keskosas','upper':'kolmas vaheväärtus vahemiku ülemises osas'}[step['point']]
        hint=' Vaheväärtused vali üksteisest ja piiridest erinevad; sobivad mugavad ümmargused näidud.' if step.get('point') in ['lower','middle','upper'] else ''
        return prefix+'Kanal '+ch+', Type '+step['typeName']+'. Muuda ainult '+display_parameter(step['parameter'])+' → '+target+'.'+hint+' Kui väärtus on juba õige, jäta see nii; ära kasuta s. Ekspordi ikkagi terve preset ja sisesta tegelik ekraaninäit.'
    if kind=='copy-channel':return prefix+'Kopeeri Enhanceri menüüst KOGU kanal A kanalisse '+ch+', seejärel vali Scene 2-s Enhanceri kanal '+ch+'. Ekspordi terve preset.'
    return prefix+'Vali ainult Scene 2 Enhanceri kanal A. Ekspordi terve preset.'
