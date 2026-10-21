// One real user changed-field pair; all other mutations are synthetic regressions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {applyWahModifier,verifyWahModifierReadback} from './fm3-wah-modifier.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const evidence=JSON.parse(read('references/wah-auto-engage-evidence.json'));
const [before,after]=evidence.pair.map(p=>{const bytes=read(p.file);assert.equal(sha(bytes),p.sha256);assert.equal(sha(body(bytes)),p.bodySha256);return bytes;});
const original=body(before),observed=body(after),expected=Buffer.from(original);
expected.writeUInt16LE(0,1604);assert.deepEqual(observed,expected,'Independent user export must differ only at the Auto Engage word');
const views=[before,after].map(inspectStructure);
assert.deepEqual(views[0].parsed.headerPayload,views[1].parsed.headerPayload);
for(let i=0;i<72;i++)if(![4,5].includes(i))assert.equal(views[0].raw.rawPatch[i],views[1].raw.rawPatch[i],'Unrelated header byte '+i);
assert.equal(views[0].decoded.preset_name,views[1].decoded.preset_name);
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer');
assert.deepEqual(schema.properties.modifiers.properties.wahAutoEngage.enum,['OFF','MED SPD']);
assert.equal(schema.properties.modifiers.minProperties,1);
assert.equal(schema.properties.modifiers.required,undefined);
assert.equal(schema.properties.modifiers.additionalProperties,false);
assert.equal(schema.allOf[0].anyOf.some(r=>r.required.includes('modifiers')),true);
let reconstructionCases=0,negative=0;
for(const b of composerBases){
  const bytes=read(b.file),initial=body(bytes),blocks=layouts[b.layout];
  if(!blocks.wah)continue;
  for(const label of ['OFF','MED SPD']){
    const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(bytes).decoded.preset_name,modifiers:{wahAutoEngage:label}};
    const result=createPreset(bytes,spec),want=Buffer.from(initial);want.writeUInt16LE(label==='OFF'?0:2,1604);
    assert.deepEqual(body(result.syx),want);assert.deepEqual(body(bytes),initial);
    assert.deepEqual(result.report.changedBodyOffsets,label==='OFF'?[1604]:[]);
    assert.equal(result.report.modifierEdit.after,14);assert.equal(result.report.modifierEdit.autoEngage.label,label);
    assert.ok(result.txt.includes('Auto Engage: '+label));assert.ok(result.txt.includes('OFF ei lülita'));
    assert.ok(result.report.scenes.every(s=>s.blocks.wah.bypass));
    if(sha(bytes)===evidence.pair[0].sha256&&label==='OFF'){
      assert.deepEqual(body(result.syx),observed);assert.ok(result.report.knownDeviceBody);
      assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false);
      const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-auto-engage-'));
      try{const stem=path.join(tmp,'test');writePresetOutputs(stem,result,spec);assert.equal(verifyPresetOutputs(stem).modifierEdit.autoEngage.after,0);assert.equal(fs.readdirSync(tmp).length,4);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
    }
    reconstructionCases++;
  }
  const copy=Buffer.from(initial);
  for(const label of ['OFF','OFF','MED SPD','MED SPD']){
    const prev=Buffer.from(copy),calls=[],code=label==='OFF'?0:2;
    const edit=applyWahModifier(copy,{wahAutoEngage:label},blocks,(at,n)=>calls.push([at,n]));
    const want=Buffer.from(prev);want.writeUInt16LE(code,1604);assert.deepEqual(copy,want);
    assert.deepEqual(calls,prev.readUInt16LE(1604)===code?[]:[[1604,2]]);verifyWahModifierReadback(copy,edit);
  }
  assert.deepEqual(copy,initial,'OFF -> MED SPD roundtrip');
}
const base=composerBases.find(b=>b.sha256===evidence.pair[0].sha256),blocks=layouts[base.layout];
const reject=(request,mutate=()=>{},target=blocks)=>{
  const copy=Buffer.from(original);mutate(copy);const prev=Buffer.from(copy);let calls=0;
  assert.throws(()=>applyWahModifier(copy,request,target,()=>calls++),/Wah modifier|Unsupported modifier/);
  assert.deepEqual(copy,prev);assert.equal(calls,0);negative++;
};
for(const value of [null,undefined,false,true,0,2,1,'0','off','MED_SPD','SLOW SPD','FAST SPD','SLOW POS','MED POS','FAST POS','',{},[]])reject({wahAutoEngage:value});
for(const request of [{},{wahAutoEngage:'OFF',extra:1},{wahAutoEngage:'OFF',external1Wah:false},{wahAutoEngage:'OFF',external1Wah:1}])reject(request);
for(const code of [1,3,4,5,6,65535])reject({wahAutoEngage:'OFF'},b=>b.writeUInt16LE(code,1604));
for(const source of [0,1,15,65535])reject({wahAutoEngage:'OFF'},b=>b.writeUInt16LE(source,1584));
for(let word=1;word<25;word++)if(word!==10)reject({wahAutoEngage:'OFF'},b=>b.writeUInt16LE((b.readUInt16LE(1584+2*word)+1)%65536,1584+2*word));
reject({wahAutoEngage:'OFF'},()=>{},{});
reject({wahAutoEngage:'OFF'},b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);});
// Source-only operations preserve the measured OFF state. Auto Engage OFF keeps source 14.
const off=Buffer.from(observed);applyWahModifier(off,{external1Wah:false},blocks);assert.equal(off.readUInt16LE(1604),0);
applyWahModifier(off,{external1Wah:true},blocks);assert.deepEqual(off,observed);
const edit=applyWahModifier(off,{wahAutoEngage:'MED SPD'},blocks);assert.deepEqual(off,original);
off[1604]=0;assert.throws(()=>verifyWahModifierReadback(off,edit),/final Auto Engage readback/);
// A generated file is not implicitly admitted as an unpinned composer base.
assert.throws(()=>createPreset(after,{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'REJECT',modifiers:{wahAutoEngage:'MED SPD'}}),/Unknown|Unrecogn|Unsupported/);
const newlook=read(composerBases.at(-1).file);
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'AUTO ENGAGE CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahAutoEngage:'OFF'}},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const result=createPreset(newlook,spec);assert.equal(body(result.syx).readUInt16LE(1604),0);assert.equal(body(result.syx).readUInt16LE(1584),14);
assert.equal(result.report.modifierEdit.autoEngage.label,'OFF');assert.ok(result.txt.includes('Auto Engage: OFF'));
assert.equal(result.report.knownDeviceBody,undefined,'NewLook composition has no whole-body hardware evidence');
for(const channel of 'ABCD')assert.throws(()=>createPreset(newlook,{...spec,controls:[{block:'wah',channel,param:5,value:5}],allow:['linear-by-structure']}),/modifier-controlled/);
const caps=getPresetCapabilities();assert.equal(caps.modifiers.autoEngage.field,'composer.modifiers.wahAutoEngage');
assert.deepEqual(caps.modifiers.autoEngage.values,['OFF','MED SPD']);
console.log(JSON.stringify({passed:true,devicePairs:1,reconstructionCases,negative,wordOffset:1604,channelLockCases:4,deviceIO:false,behaviorTested:false,audioTested:false}));
