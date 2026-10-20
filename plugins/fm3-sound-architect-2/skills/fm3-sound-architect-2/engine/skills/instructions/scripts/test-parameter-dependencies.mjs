// Existing exports are evidence; modified bodies below are software-only fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {composerBases,layouts,filterDonor} from './fm3-composer-bases.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {tempoLocks,readModifiers,dependencyState,validateDependencyWrites,validateLegacyDependencies} from './fm3-parameter-dependencies.mjs';
import {applyTableControls} from './fm3-layout.mjs';
import {writeTableControls} from './fm3-table-encoder.mjs';
import {createPreset} from './fm3-preset.mjs';
import {finalSoundState,renderFinalSoundText} from './fm3-final-state.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const samples=composerBases.map(b=>({...b,bytes:read(b.file),blocks:layouts[b.layout]}));
for(const b of samples){
  b.body=Buffer.from(inspectStructure(b.bytes).raw.body);
  const mods=readModifiers(b.body);assert.equal(mods.length,32);
  assert.equal(mods.filter(m=>m.active).length,b.id==='jb-newlook'?0:1);
  assert.equal(mods[0].effectId,94);assert.equal(mods[0].pid,5);assert.equal(mods[0].channelScope,'ALL');
  assert.equal(mods[0].source,b.id==='jb-newlook'?0:14);
}
const filter={body:Buffer.from(inspectStructure(read(filterDonor.file)).raw.body),blocks:filterDonor.blocks};
let pairs=0,channelCases=0;
for(const r of tempoLocks){
  const slug=r.family.toLowerCase(),b=[...samples,filter].find(b=>b.blocks[slug]),l=b.blocks[slug];
  for(const channel of 'ABCD'){
    const body=Buffer.from(b.body),start=l.start+'ABCD'.indexOf(channel)*l.words*2;
    const target={block:slug,effectId:r.effectId,channel,pid:r.targetPid,name:r.target,offset:start+2*r.targetPid,raw:12345};
    const tempo={block:slug,effectId:r.effectId,channel,pid:r.tempoPid,name:r.tempo,offset:start+2*r.tempoPid,raw:0};
    body.writeUInt16LE(1,tempo.offset);
    assert.throws(()=>validateDependencyWrites(body,[target]),/tempo-controlled/);
    for(const plan of [[target,tempo],[tempo,target]])assert.doesNotThrow(()=>validateDependencyWrites(body,plan));
    body.writeUInt16LE(0,tempo.offset);
    for(const plan of [[target,{...tempo,raw:1}],[{...tempo,raw:1},target]])assert.throws(()=>validateDependencyWrites(body,plan),/tempo-controlled/);
    assert.doesNotThrow(()=>validateDependencyWrites(body,[target]));
    assert.throws(()=>validateDependencyWrites(body,[{...tempo,raw:65534}]),/unknown Tempo/);
    const other=start+2*((channel==='D'?-3:1)*l.words+r.tempoPid);body.writeUInt16LE(1,other);
    assert.doesNotThrow(()=>validateDependencyWrites(body,[target]),'Other channel must not lock this one');
    channelCases++;
  }
  pairs++;
}
const b=samples[1],c=(channel,param,value)=>({block:'delay',channel,param,value});
for(const channel of 'ABCD'){
  for(const controls of [[c(channel,'TIME',500),c(channel,'TEMPO','NONE')],[c(channel,'TEMPO','NONE'),c(channel,'TIME',500)]]){
    const a=writeTableControls(b.bytes,{name:'DEPENDENCY CHECK',controls});
    const body=Buffer.from(b.body);applyTableControls(body,controls);
    assert.deepEqual(body,Buffer.from(inspectStructure(a.syx).raw.body));
  }
  for(const param of ['DELAY_TIME',8]){
    // PID is independently pinned below; name/PID/raw routes share the gate.
    const controls=[c(channel,'TEMPO',1),c(channel,param,500)];
    assert.throws(()=>writeTableControls(b.bytes,{name:'LOCK CHECK',controls}),/tempo-controlled/);
  }
  assert.throws(()=>writeTableControls(b.bytes,{name:'RAW LOCK',controls:[c(channel,'TEMPO',1),{block:'delay',channel,param:'TIME',raw:1000}]},{experimental:true}),/tempo-controlled/);
  const body=Buffer.from(b.body),saved=Buffer.from(body);let callbacks=0;
  assert.throws(()=>applyTableControls(body,[c(channel,'MIX',50),c(channel,'TEMPO',1),c(channel,'TIME',500)],{allow:['linear-by-structure']},()=>callbacks++),/tempo-controlled/);
  assert.deepEqual(body,saved);assert.equal(callbacks,0);
  assert.throws(()=>writeTableControls(b.bytes,{name:'MOD LOCK',controls:[{block:'wah',channel,param:5,raw:1000}]},{experimental:true}),/modifier-controlled/);
}
assert.equal(tempoLocks.find(r=>r.target==='DELAY_TIME').targetPid,8);
// Every serialized slot, including records beyond the historical 12-record heuristic.
const l=b.blocks.delay,offset=l.start+16,w={block:'delay',effectId:70,channel:'A',pid:8,name:'DELAY_TIME',offset,raw:1000};
for(let slot=0;slot<32;slot++){
  const body=Buffer.from(b.body),at=1584+slot*96;
  body.writeUInt16LE(14,at);body.writeUInt16LE(70,at+16);body.writeUInt16LE(8,at+18);body.writeUInt16LE(1,at+34);body.writeUInt16LE(0,l.start+30);
  assert.throws(()=>validateDependencyWrites(body,[w]),/modifier-controlled/);
  assert.doesNotThrow(()=>validateDependencyWrites(body,[{...w,channel:'B',offset:offset+2*l.words}]));
  body.writeUInt16LE(0,at);assert.doesNotThrow(()=>validateDependencyWrites(body,[w]),'NONE with retained target is inactive');
  body.writeUInt16LE(1,at+40);assert.throws(()=>validateDependencyWrites(body,[w]),/modifier-controlled/);
  assert.equal(readModifiers(body)[slot].uncertain,true);
}
for(const channelRaw of [0,1,2,3,4,5]){
  const body=Buffer.from(b.body);body.writeUInt16LE(channelRaw,1584+34);
  for(const channel of 'ABCD')assert.equal(dependencyState(body,{effectId:94,pid:5,channel,offset:b.blocks.wah.start+10}).blocked==='modifier-controlled',channelRaw===0||channelRaw===5||channelRaw==='ABCD'.indexOf(channel)+1);
}
const malformed=Buffer.from(b.body);malformed.writeUInt16LE(24,1538+42);assert.throws(()=>readModifiers(malformed),/Unsupported modifier/);
const uncertain=Buffer.from(b.body);uncertain.writeUInt16LE(65534,1584);assert.equal(readModifiers(uncertain)[0].uncertain,true);
const sync=Buffer.from(b.body);sync.writeUInt16LE(70,1600);sync.writeUInt16LE(8,1602);
assert.throws(()=>validateDependencyWrites(sync,[{...w,name:'DELAY_TEMPO',pid:15,offset:l.start+30,raw:1}]),/tempo conflicts with modifier/);
// Final state preserves a stored value while identifying the actual control mode.
const locked=writeTableControls(b.bytes,{name:'STORED TIME',controls:[c('A','TEMPO',1)]});
const state=finalSoundState(locked.syx,locked.writes,{allow:['linear-by-structure','enum-labels']});
assert.equal(state.parameters.find(p=>p.name==='DELAY_TIME'&&p.channel==='A').dependencies.mode,'tempo');
assert.equal(state.parameters.find(p=>p.name==='WAH_CONTROL'&&p.channel==='A').dependencies.mode,'modifier');
const txt=renderFinalSoundText(state,{composer:{}});
assert.ok(txt.includes('salvestatud väärtus, juhib DELAY_TEMPO='));
assert.ok(txt.includes('Modifikaator: WAH_CONTROL; allikas External 1; kanal ALL'));
const rotary=samples.find(b=>b.id==='jb-rotary');
for(const [name,block,spec] of [['DELAY_TIME','delay',{delayTimeMs:500}],['REVERB_PREDELAY','reverb',{reverbPredelayMs:20}],['ROTARY_RATE','rotary',{rotaryA:{rateHz:2}}]]){
  const body=Buffer.from(rotary.body),r=tempoLocks.find(r=>r.target===name),at=rotary.blocks[block].start+2*r.tempoPid;
  body.writeUInt16LE(1,at);assert.throws(()=>validateLegacyDependencies(body,rotary.blocks,spec),/tempo-controlled/);
  body.writeUInt16LE(0,at);assert.doesNotThrow(()=>validateLegacyDependencies(body,rotary.blocks,spec));
}
const newlook=samples.find(b=>b.id==='jb-newlook'),spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.delayChannels=[{channel:'A',type:'Deluxe Mind Guy'}];spec.composer.delayTimeMs=500;spec.composer.delayTempoA='NONE';spec.controls=[c('A','TEMPO',1)];
assert.throws(()=>createPreset(newlook.bytes,spec),/tempo-controlled/,'Later stage cannot invalidate a legacy explicit manual value');
console.log(JSON.stringify({passed:true,tempoPairs:pairs,tempoChannelCases:channelCases,bases:7,serializedModifierSlots:32,deviceIO:false,newHardwareEvidence:false}));
