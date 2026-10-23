// Reuse every captured Delay/Reverb template. Edited fixture bodies are software tests.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,findParam,writeTableControls,OPT_IN_STATUSES,DEFAULT_STATUSES,encodeValue} from './fm3-table-encoder.mjs';
import {typeApplicability,readTypeState,templateOnlyParameter} from './fm3-type-applicability.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3.syx'),before=Buffer.from(inspectStructure(base).raw.body);
const records=scanRecords(before).records,dict=loadDictionary().params,opts={allow:[...OPT_IN_STATUSES]};
const libs=Object.fromEntries(['delay','reverb'].map(s=>[s,JSON.parse(read('references/'+s+'-library.json'))]));
const ctl=(block,channel,param,value)=>({block,channel,param,value});
const valueFor=p=>p.kind==='enum'?0:p.kind==='knob'?(p.displayMultiplier||1)/2:p.kind==='integer'?Math.round((p.min+p.max)/2)*(p.integerScale??1):(p.min+p.max)/2*(p.displayMultiplier||1);
const record=slug=>records.find(r=>r.family===slug);
function fixture(slug,name){const body=Buffer.from(before),r=record(slug),m=libs[slug].models.find(m=>m.name===name);assert.ok(m);for(let ch=0;ch<4;ch++)m.words.forEach((v,pid)=>body.writeUInt16LE(v,r.start+2*(ch*r.words+pid)));return body;}
const policy=(p,body,ch=0)=>typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(record(p.family.toLowerCase()).start+2*(ch*record(p.family.toLowerCase()).words+pid))));
let templates=0,accepted=0,rejected=0,templateOnly=0;
for(const [slug,lib] of Object.entries(libs)){
  const r=record(slug),params=dict.filter(p=>p.family===slug.toUpperCase()&&[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status));
  for(const m of lib.models){
    const body=fixture(slug,m.name),original=Buffer.from(body),controls=[];
    const primary=m.words[slug==='delay'?7:45];
    if(slug==='delay'){
      for(const [name,allowed] of [['SPREAD',[1,2,3,5,6,7]],['TIMER',[3]],['SPEED',[6]],['RUN',[4]],['RATE3',[5]],['FEEDLR',[3,7]]])assert.equal(policy(findParam(slug,name),body).allowed,allowed.includes(primary),m.name+'/'+name);
    }else{
      const spring=[0,5].includes(primary);
      assert.equal(policy(findParam(slug,'NUMSPRINGS'),body).allowed,spring);
      assert.equal(policy(findParam(slug,'QUALITY'),body).allowed,!spring);
      assert.equal(policy(findParam(slug,'PITCHPOS'),body).allowed,!spring&&primary!==4);
      assert.equal(policy(findParam(slug,'DIFFUSION'),body).allowed,!spring||m.words[66]===1);
    }
    for(const p of params)for(const ch of 'ABCD'){
      const value=p.name==='REVERB_SPRINGTYPE'?m.words[66]:valueFor(p),c=ctl(slug,ch,p.param,value);
      if(templateOnlyParameter(p)){assert.throws(()=>applyTableControls(body,[c],opts),/full channel template required/);templateOnly++;continue;}
      if(policy(p,body,'ABCD'.indexOf(ch)).allowed){controls.push(c);accepted++;}
      else{assert.throws(()=>applyTableControls(body,[c],opts),/not applicable/);rejected++;}
    }
    assert.deepEqual(body,original,'Rejected calls must not mutate');
    const writes=applyTableControls(body,controls,opts),allowed=new Set(writes.flatMap(w=>[w.offset,w.offset+1]));
    for(const w of writes)assert.equal(body.readUInt16LE(w.offset),encodeValue(findParam(w.block,w.pid),w.value,opts));
    for(let i=0;i<body.length;i++)if(!allowed.has(i))assert.equal(body[i],original[i],m.name+': collateral change');
    templates++;
  }
}
assert.equal(templates,106);
assert.equal(libs.delay.models.find(m=>m.name==='Stereo Tape').words[7],1,'Model name is not the algorithm');
assert.equal(libs.reverb.models.find(m=>m.name==='Room: Ambience').words[45],3,'Model prefix is not the base type');
// Spring Tank Type is an editable enum; final state, not input order, controls Scattering.
for(const ch of 'ABCD'){
  const a=fixture('reverb','Spring: British Spring'),b=Buffer.from(a),diff=ctl('reverb',ch,'DIFFUSION',valueFor(findParam('reverb','DIFFUSION'))),tank=ctl('reverb',ch,'SPRINGTYPE',1);
  assert.throws(()=>applyTableControls(a,[diff],opts),/not applicable/);
  applyTableControls(a,[diff,tank],opts);applyTableControls(b,[tank,diff],opts);assert.deepEqual(a,b);
  const saved=Buffer.from(a);let callbacks=0;
  assert.throws(()=>applyTableControls(a,[ctl('amp','A','MID',7),diff,{...tank,value:0}],opts,()=>callbacks++),/not applicable/);
  assert.equal(callbacks,0);assert.deepEqual(a,saved);
}
const isolated=fixture('reverb','Spring: British Spring');
assert.throws(()=>applyTableControls(isolated,[ctl('reverb','B','SPRINGTYPE',1),ctl('reverb','A','DIFFUSION',0.5)],opts),/reverb A.*not applicable/);
// Generic name, PID and raw entry points cannot change model/internal selector words.
for(const [slug,names] of [['delay',['MODEL',6,'TYPE',7]],['reverb',['TYPE',0,'BASETYPE',45]]])for(const param of names){
  assert.throws(()=>writeTableControls(base,{name:'NO SELECTOR BYPASS',controls:[{block:slug,channel:'A',param,raw:0}]},{experimental:true}),/full channel template required/);
}
for(const [slug,pid,values] of [['delay',7,[3,8,65534]],['reverb',45,[4,9,10,65534]]])for(const raw of values){
  const body=Buffer.from(before);body.writeUInt16LE(raw,record(slug).start+2*pid);
  assert.throws(()=>applyTableControls(body,[ctl(slug,'A',slug==='delay'?'TIME':'TIME',1)],opts),/unknown or mismatched/);
}
assert.throws(()=>writeTableControls(base,{name:'WRONG MONO CONTROL',controls:[ctl('delay','A','TIMER',500)]},opts),/not applicable/);
// Full template changes remain supported and the final guide follows the composed state.
const newlook=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.reverbChannels=[{channel:'A',type:'Spring: British Spring'}];
spec.controls=[ctl('reverb','A','DIFFUSION',valueFor(findParam('reverb','DIFFUSION'))),ctl('reverb','A','SPRINGTYPE',1)];
const good=createPreset(newlook,spec);
assert.equal(good.report.controls[0].label,'Scattering');assert.ok(good.txt.includes('Scattering'));
for(const n of ['REVERB_QUALITY','REVERB_PITCHPOS','REVERB_DEPTH','REVERB_SPREAD'])assert.ok(!good.report.parameters.some(p=>p.block==='reverb'&&p.channel==='A'&&p.name===n));
spec.controls=[ctl('reverb','A','QUALITY',0)];assert.throws(()=>createPreset(newlook,spec),/not applicable/);
spec.composer.delayChannels=[{channel:'A',type:'Stereo Tape'}];spec.controls=[ctl('delay','A','SPEED',0.5)];assert.throws(()=>createPreset(newlook,spec),/not applicable/);
console.log(JSON.stringify({passed:true,templates,channels:'ABCD',acceptedWrites:accepted,rejectedWrites:rejected,templateOnlyChecks:templateOnly,deviceIO:false,newHardwareEvidence:false}));
