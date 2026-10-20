// Existing captures replayed on explicitly synthetic bodies; no hardware I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,findParam,writeTableControls,OPT_IN_STATUSES,DEFAULT_STATUSES,encodeValue} from './fm3-table-encoder.mjs';
import {typeApplicability,readTypeState,templateOnlyParameter,typePolicySummary} from './fm3-type-applicability.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const bases={pitch:read('examples/FM3_PITCH_ABCD_TEST_export.syx'),rotary:read('examples/FM3_ROTARY_A_TEST_export.syx')};
const before=Object.fromEntries(Object.entries(bases).map(([s,b])=>[s,Buffer.from(inspectStructure(b).raw.body)]));
const records=Object.fromEntries(Object.entries(before).map(([s,b])=>[s,scanRecords(b).records.find(r=>r.family===s)]));
const dict=loadDictionary().params,opts={allow:[...OPT_IN_STATUSES]},lib=JSON.parse(read('references/pitch-library.json'));
const ctl=(block,channel,param,value)=>({block,channel,param,value});
const valueFor=p=>p.kind==='enum'?(p.enumBase??0):p.kind==='integer'?Math.floor((p.min+p.max)/2):p.kind==='knob'?(p.displayMultiplier||1)/2:(p.min+p.max)/2*(p.displayMultiplier||1);
const at=(slug,ch,pid)=>records[slug].start+2*('ABCD'.indexOf(ch)*records[slug].words+pid);
const policy=(slug,p,body,ch='A')=>typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(at(slug,ch,pid))));
function fixture(m){const body=Buffer.from(before.pitch);for(const ch of 'ABCD')m.words.forEach((v,pid)=>body.writeUInt16LE(v,at('pitch',ch,pid)));return body;}
let templates=0,accepted=0,rejected=0,templateOnly=0;
for(const m of lib.models){
  const body=fixture(m),original=Buffer.from(body),controls=[];
  const expected={TIME1:m.binaryId===0,SPLICE1:m.binaryId===8,PITCHMODE:m.binaryId===6,UCTRL:[6,9].includes(m.binaryId),
    DETUNE3:[1,3,5,12,13].includes(m.binaryId),FEEDBACK3:[1,12,13,15].includes(m.binaryId),SOURCE:![0,1,8,15].includes(m.binaryId)};
  for(const [name,allowed] of Object.entries(expected))assert.equal(policy('pitch',findParam('pitch',name),body).allowed,allowed,m.name+'/'+name);
  for(const p of dict.filter(p=>p.family==='PITCH'&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status)))for(const ch of 'ABCD'){
    const c=ctl('pitch',ch,p.param,valueFor(p));
    if(templateOnlyParameter(p)){assert.throws(()=>applyTableControls(body,[c],opts),/full channel template required/);templateOnly++;continue;}
    if(policy('pitch',p,body,ch).allowed){controls.push(c);accepted++;}
    else{assert.throws(()=>applyTableControls(body,[c],opts),/not applicable/);rejected++;}
  }
  assert.deepEqual(body,original);
  const writes=applyTableControls(body,controls,opts),allowed=new Set(writes.flatMap(w=>[w.offset,w.offset+1]));
  for(const w of writes)assert.equal(body.readUInt16LE(w.offset),encodeValue(findParam(w.block,w.pid),w.value,opts));
  for(let i=0;i<body.length;i++)if(!allowed.has(i))assert.equal(body[i],original[i],m.name+': collateral change');
  templates++;
}
assert.equal(templates,16);
// All twenty Rotary controls A-D; PID 0 is Rate, with no accidental model read.
assert.deepEqual(readTypeState(findParam('rotary',0),()=>{throw Error('Rotary read an imaginary model selector');}),{});
assert.equal(templateOnlyParameter(findParam('rotary',0)),false);
const rotaryBody=Buffer.from(before.rotary),rotaryControls=[];
for(const p of dict.filter(p=>p.family==='ROTARY'&&p.kind!=='unused'))for(const ch of 'ABCD'){
  assert.equal(policy('rotary',p,rotaryBody,ch).allowed,true);rotaryControls.push(ctl('rotary',ch,p.param,valueFor(p)));
}
const rotaryWrites=applyTableControls(rotaryBody,rotaryControls,opts),rotaryAllowed=new Set(rotaryWrites.flatMap(w=>[w.offset,w.offset+1]));
assert.equal(rotaryWrites.length,80);
for(const w of rotaryWrites)assert.equal(rotaryBody.readUInt16LE(w.offset),encodeValue(findParam('rotary',w.pid),w.value,opts));
for(let i=0;i<rotaryBody.length;i++)if(!rotaryAllowed.has(i))assert.equal(rotaryBody[i],before.rotary[i]);
assert.deepEqual(rotaryBody,Buffer.from(inspectStructure(writeTableControls(bases.rotary,{name:'ROTARY ALL CONTROLS',controls:rotaryControls},opts).syx).raw.body));
assert.throws(()=>writeTableControls(bases.rotary,{name:'NO UNUSED',controls:[{block:'rotary',channel:'A',param:9,raw:0}]},{experimental:true}),/not applicable/);
// Former metadata conflicts now use the separately tested word overlay; custom notes need their final scale context; fixed controls remain blocked.
const conflicts=[15,16,17,18,35,63,71,72,73,74,76,...Array.from({length:16},(_,i)=>77+i)];
assert.deepEqual(typePolicySummary().rotaryPitch.families.PITCH.metadataConflicts.map(p=>p.pid),[]);
let rawRefusals=0;
for(const channel of 'ABCD')for(const param of [37,42,64,65,66,67,68,69,70,107]){
  for(const key of [param,findParam('pitch',param).name]){
    assert.throws(()=>writeTableControls(bases.pitch,{name:'NO METADATA BYPASS',controls:[{block:'pitch',channel,param:key,raw:0}]},{experimental:true}),/not applicable|outside allowed preset domain/);rawRefusals++;
  }
}
for(const channel of 'ABCD'){
  for(const param of ['TYPE',0])assert.throws(()=>writeTableControls(bases.pitch,{name:'NO TYPE BYPASS',controls:[{block:'pitch',channel,param,raw:0}]},{experimental:true}),/full channel template required/);
  const body=Buffer.from(before.pitch);body.writeUInt16LE(16,at('pitch',channel,0));
  assert.throws(()=>applyTableControls(body,[ctl('pitch',channel,'LEVEL',0)],opts),/unknown or mismatched/);
  applyTableControls(body,[ctl('pitch',channel==='D'?'A':'D','LEVEL',0)],opts);
}
for(const [model,param] of [['Octave Divider','DETUNE1'],['Quad Chromatic','FEEDBACK1'],['Dual Detune','NUMSTEPS'],['Virtual Capo','NUMSTEPS']]){
  const body=fixture(lib.models.find(m=>m.name===model)),original=Buffer.from(body);let callbacks=0;
  const plan=[ctl('amp','A','MID',7),ctl('pitch','D',param,valueFor(findParam('pitch',param)))];
  for(const controls of [plan,[...plan].reverse()]){
    assert.throws(()=>applyTableControls(body,controls,opts,()=>callbacks++),/not applicable/);assert.deepEqual(body,original);assert.equal(callbacks,0);
  }
}
// Existing tempo locks still operate on applicable controls, independent of order.
for(const [slug,model,target,tempo] of [['pitch','Crystal Echoes','SPLICE1','STEMPO1'],['pitch','Quad Detune','DELAY4','DTEMPO4'],['pitch','Dual Detune','LFORATE','LFOTEMPO'],['rotary',null,'RATE','TEMPO']])for(const channel of 'ABCD'){
  const body=model?fixture(lib.models.find(m=>m.name===model)):Buffer.from(before.rotary),original=Buffer.from(body);
  const plan=[ctl(slug,channel,target,valueFor(findParam(slug,target))),ctl(slug,channel,tempo,1)];
  for(const controls of [plan,[...plan].reverse()]){
    assert.throws(()=>applyTableControls(body,controls,opts),/tempo-controlled/);assert.deepEqual(body,original);
    const free=controls.map(c=>c.param===tempo?{...c,value:'NONE'}:c),copy=Buffer.from(body);applyTableControls(copy,free,opts);
  }
}
// Synthetic modifier-target fixture; no controller assignment is edited in delivered presets.
for(const channel of 'ABCD'){
  const body=fixture(lib.models.find(m=>m.name==='Advanced Whammy')),original=Buffer.from(body);
  body.writeUInt16LE(14,1584);body.writeUInt16LE(110,1600);body.writeUInt16LE(3,1602);body.writeUInt16LE('ABCD'.indexOf(channel)+1,1618);
  const locked=Buffer.from(body);assert.throws(()=>applyTableControls(body,[ctl('pitch',channel,'UCTRL',5)],opts),/modifier-controlled/);assert.deepEqual(body,locked);
  applyTableControls(body,[ctl('pitch',channel==='D'?'A':'D','UCTRL',5)],opts);
  assert.notDeepEqual(body,original);
}
// Complete model templates preserve all words, while final guide hides unsupported scalars.
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.pitchChannels=[{channel:'A',type:'Dual Detune Delay'}];spec.composer.rotaryA={rateHz:5,mixPercent:25};
spec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','rotary','delay','reverb']};spec.allow=[...OPT_IN_STATUSES];
spec.controls=[ctl('pitch','A','FEEDBACK3',25),ctl('pitch','A','DELAY1',400),ctl('pitch','A','DTEMPO1','NONE'),ctl('rotary','A','HFDEPTH',50)];
const good=createPreset(newlook,spec);
for(const name of ['PITCH_SHIFT1','PITCH_TEMPO','PITCH_TIME1','PITCH_DETUNE3'])assert.ok(!good.report.parameters.some(p=>p.channel==='A'&&p.name===name));
assert.ok(good.txt.includes('Feedback 1->2 (PITCH_FEEDBACK3)'));assert.ok(good.txt.includes('Hi Depth (ROTARY_HFDEPTH)'));
const finalBody=Buffer.from(inspectStructure(good.syx).raw.body),pitchRecord=scanRecords(finalBody).records.find(r=>r.family==='pitch');
const template=lib.models.find(m=>m.name==='Dual Detune Delay');
for(const pid of [...conflicts,64,107])assert.equal(finalBody.readUInt16LE(pitchRecord.start+2*pid),template.words[pid]);
assert.deepEqual(readModifiers(finalBody),readModifiers(Buffer.from(inspectStructure(newlook).raw.body)));
spec.controls=[ctl('pitch','A','TRACKMODE','OFF')];assert.throws(()=>createPreset(newlook,spec),/unknown option/);
console.log(JSON.stringify({passed:true,pitchTemplates:templates,channels:'ABCD',acceptedPitchWrites:accepted,rejectedPitchWrites:rejected,templateOnlyChecks:templateOnly,rotaryWrites:rotaryWrites.length,resolvedWordCodecs:conflicts.length,rawRefusals,deviceIO:false,newHardwareEvidence:false}));
