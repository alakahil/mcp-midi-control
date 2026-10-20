// Existing source exports are evidence. Mutations below are synthetic regressions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {applyWahModifier,wahModifierWords} from './fm3-wah-modifier.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {applyTableControls} from './fm3-layout.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const policy=JSON.parse(read('references/fm3-parameter-dependencies.json'));
assert.equal(policy.modifiers.sources[0],'NONE');assert.equal(policy.modifiers.sources[14],'External 1');
assert.equal(policy.modifiers.channels[0],'ALL');
assert.deepEqual(policy.descriptors.MOD.bindings.filter(([i])=>[0,8,9,17,20,23].includes(i)),
  [[0,'MOD_CTRLID'],[8,'MOD_EFFECTID'],[9,'MOD_PARAM'],[17,'MOD_CHANNEL'],[20,'MOD_CTRLID2'],[23,'MOD_OPERATION']]);
const dictionary=JSON.parse(read('references/fm3-param-dictionary.json'));
assert.equal(dictionary.params.find(p=>p.block===94&&p.param===5).name,'WAH_CONTROL');
const schema=JSON.parse(read('scripts/fm3-spec.schema.json'));
const composerSchema=schema.oneOf.find(b=>b.properties?.baseProfile?.const==='jb-composer');
// Evaluate the published schema's required-change alternatives for the actual
// minimal requests used below. This guards schema/runtime agreement.
const hasRequiredChange=spec=>composerSchema.allOf[0].anyOf.some(rule=>{
  assert.deepEqual(Object.keys(rule),['required']);
  return rule.required.every(key=>Object.hasOwn(spec,key));
});
assert.equal(hasRequiredChange({schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'NO CHANGES'}),false);
let toggles=0,negative=0,schemaAdmissionCases=0;
const samples=composerBases.map(b=>({...b,bytes:read(b.file),blocks:layouts[b.layout]}));
for(const b of samples){
  assert.equal(sha(b.bytes),b.sha256);const original=body(b.bytes),words=Array.from({length:25},(_,i)=>original.readUInt16LE(1584+2*i));
  assert.equal(words[0],b.id==='jb-newlook'?0:14);words[0]=0;assert.deepEqual(words,wahModifierWords);
  const copy=Buffer.from(original),initial=original.readUInt16LE(1584);let calls=[];
  if(b.id==='jb-newlook'){
    assert.throws(()=>applyWahModifier(copy,{external1Wah:true},b.blocks,()=>calls.push(1)),/existing Wah1/);
    assert.deepEqual(copy,original);assert.deepEqual(calls,[]);negative++;
  }else{
    for(const enabled of [false,false,true,true]){
      calls=[];const prev=Buffer.from(copy),edit=applyWahModifier(copy,{external1Wah:enabled},b.blocks,(at,n)=>calls.push([at,n]));
      assert.equal(edit.after,enabled?14:0);
      assert.deepEqual(calls,prev.readUInt16LE(1584)===(enabled?14:0)?[]:[[1584,2]]);
      for(let i=0;i<copy.length;i++)if(i!==1584)assert.equal(copy[i],original[i],'Collateral byte '+i);
      toggles++;
    }
    assert.deepEqual(copy,original,'on/off roundtrip body');
  }
  // Public composer path retains all remaining bytes; name is held unchanged.
  for(const enabled of [false,...(b.id==='jb-newlook'?[]:[true])]){
    const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(b.bytes).decoded.preset_name,modifiers:{external1Wah:enabled}};
    assert.equal(hasRequiredChange(spec),true,'Schema must admit the modifier-only request');schemaAdmissionCases++;
    const result=createPreset(b.bytes,spec),expected=Buffer.from(original);expected.writeUInt16LE(enabled?14:0,1584);
    assert.deepEqual(body(result.syx),expected);assert.deepEqual(body(b.bytes),original);
    assert.equal(result.report.modifierEdit.after,enabled?14:0);
    if(initial===(enabled?14:0))assert.ok(result.txt.includes('Soovitud allikas oli juba valitud'));
    assert.ok(result.txt.includes('Seos: '+(enabled?'sees (External 1)':'väljas (NONE)')));
    assert.deepEqual(result.report.changedBodyOffsets,initial===(enabled?14:0)?[]:[1584]);
    toggles++;
  }
}
const b=samples[2],original=body(b.bytes);
const reject=(mutate,request={external1Wah:true},pattern=/Wah modifier|Unsupported modifier/)=>{
  const copy=Buffer.from(original);mutate(copy);const before=Buffer.from(copy);let calls=0;
  assert.throws(()=>applyWahModifier(copy,request,b.blocks,()=>calls++),pattern);
  assert.deepEqual(copy,before);assert.equal(calls,0);negative++;
};
for(const request of [null,[],{},true,{external1Wah:1},{external1Wah:'true'},{external1Wah:true,channel:'A'},{external2Wah:true}])reject(()=>{},request);
// Every retained word is out of scope, including curve/secondary source/channel.
for(let pid=1;pid<25;pid++)reject(x=>x.writeUInt16LE((x.readUInt16LE(1584+2*pid)+1)%65536,1584+2*pid));
for(const source of [1,15,65535])reject(x=>x.writeUInt16LE(source,1584));
for(let slot=0;slot<32;slot++)reject(x=>x.writeUInt16LE(24,1538+slot*96+42));
for(const active of [0,14])reject(x=>{x.writeUInt16LE(active,1680);x.writeUInt16LE(94,1696);x.writeUInt16LE(5,1698)});
reject(x=>{x.writeUInt16LE(14,1680);x.writeUInt16LE(0,1696);x.writeUInt16LE(5,1698)});
// Noncompeting modifier bytes must survive untouched.
const other=Buffer.from(original);other.writeUInt16LE(14,1680);other.writeUInt16LE(70,1696);other.writeUInt16LE(8,1698);
const saved=Buffer.from(other);applyWahModifier(other,{external1Wah:false},b.blocks);saved.writeUInt16LE(0,1584);assert.deepEqual(other,saved);
for(const channel of 'ABCD'){
  const copy=Buffer.from(original),controls=[{block:'wah',channel,param:5,value:5}];
  assert.throws(()=>applyTableControls(copy,controls,{allow:['linear-by-structure']}),/modifier-controlled/);
  applyWahModifier(copy,{external1Wah:false},b.blocks);assert.doesNotThrow(()=>applyTableControls(copy,controls,{allow:['linear-by-structure']}));
  applyWahModifier(copy,{external1Wah:true},b.blocks);assert.throws(()=>applyTableControls(copy,controls,{allow:['linear-by-structure']}),/modifier-controlled/);
}
const newlook=samples.at(-1),baseSpec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'WAH MODIFIER CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}]};
const sound={composer:{...baseSpec,modifiers:{external1Wah:true}},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const on=createPreset(newlook.bytes,sound),off=createPreset(newlook.bytes,{...sound,composer:{...sound.composer,modifiers:{external1Wah:false}}});
const omitted=createPreset(newlook.bytes,{...sound,composer:baseSpec});
assert.deepEqual(body(off.syx),body(omitted.syx),'omitted means retained NONE');
const expected=body(off.syx);expected.writeUInt16LE(14,1584);assert.deepEqual(body(on.syx),expected);
assert.equal(on.report.modifiers[0].source,14);assert.equal(on.report.modifierEdit.after,14);
assert.ok(on.report.scenes.every(s=>s.blocks.wah.bypass),'toggle does not activate scenes');
assert.ok(on.txt.includes('Seos: sees (External 1)'));assert.ok(off.txt.includes('Seos: väljas (NONE)'));
for(const channel of 'ABCD'){
  const controls=[{block:'wah',channel,param:5,value:5}],allow=['linear-by-structure'];
  assert.throws(()=>createPreset(newlook.bytes,{...sound,controls,allow}),/modifier-controlled/);
  assert.doesNotThrow(()=>createPreset(newlook.bytes,{...sound,composer:{...sound.composer,modifiers:{external1Wah:false}},controls,allow}));
}
assert.throws(()=>createPreset(newlook.bytes,{...sound,modifiers:{external1Wah:false}}),/Unsupported|Unknown/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-wah-modifier-'));
try{const stem=path.join(tmp,'test');writePresetOutputs(stem,on,sound);assert.equal(verifyPresetOutputs(stem).modifierEdit.after,14);assert.equal(fs.readdirSync(tmp).length,4)}finally{fs.rmSync(tmp,{recursive:true,force:true})}
assert.equal(getPresetCapabilities().modifiers.field,'composer.modifiers.external1Wah');
console.log(JSON.stringify({passed:true,bases:7,toggles,negative,schemaAdmissionCases,channelCases:4,recordLayoutCases:32,deviceIO:false,newHardwareMeasurements:false}));
