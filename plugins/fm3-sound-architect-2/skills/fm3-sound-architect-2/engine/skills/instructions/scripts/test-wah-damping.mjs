// The submitted export pair is evidence; other mutations are synthetic regressions.
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
const evidence=JSON.parse(read('references/wah-damping-evidence.json'));
const [before,after]=evidence.pair.map(p=>{const b=read(p.file);assert.equal(sha(b),p.sha256);assert.equal(sha(body(b)),p.bodySha256);return b;});
const original=body(before),observed=body(after),expected=Buffer.from(original);
expected.writeUInt16LE(1,1632);assert.deepEqual(observed,expected,'Real user pair must differ only in Damping mode');
const views=[before,after].map(inspectStructure);
assert.deepEqual(views[0].parsed.headerPayload,views[1].parsed.headerPayload);
assert.deepEqual(Array.from({length:76},(_,i)=>i).filter(i=>views[0].raw.rawPatch[i]!==views[1].raw.rawPatch[i]),[4,5,74]);
assert.deepEqual(views.map(v=>v.raw.compSize),[4923,4924]);
for(const v of views)assert.ok(v.raw.rawPatch.slice(76+v.raw.compSize).every(b=>b===0));
assert.equal(views[0].decoded.preset_name,views[1].decoded.preset_name);
const metadata=JSON.parse(read('references/fm3-parameter-dependencies.json'));
assert.deepEqual(metadata.descriptors.MOD.bindings.find(([pid])=>pid===24),[24,'MOD_DAMPING']);
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer');
assert.deepEqual(schema.properties.modifiers.properties.wahDamping.enum,['EXPONENTIAL','LINEAR']);
assert.equal(schema.properties.modifiers.additionalProperties,false);
assert.equal(schema.properties.modifiers.minProperties,1);
assert.ok(schema.allOf[0].anyOf.some(r=>r.required.includes('modifiers')));
let reconstructionCases=0,negative=0,combinationCases=0;
for(const b of composerBases){
  const bytes=read(b.file),initial=body(bytes),blocks=layouts[b.layout];
  if(!blocks.wah)continue;
  for(const [label,code] of [['EXPONENTIAL',0],['LINEAR',1]]){
    const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(bytes).decoded.preset_name,modifiers:{wahDamping:label}};
    const result=createPreset(bytes,spec),want=Buffer.from(initial);want.writeUInt16LE(code,1632);
    assert.deepEqual(body(result.syx),want);assert.deepEqual(body(bytes),initial);
    assert.deepEqual(result.report.changedBodyOffsets,code?[1632]:[]);
    assert.equal(result.report.modifierEdit.damping.label,label);
    assert.equal(result.report.modifierEdit.autoEngage.after,2,'Damping-only must retain Auto Engage');
    assert.equal(result.report.modifierEdit.after,14);
    assert.ok(result.txt.includes('Damping: '+label));assert.ok(result.txt.includes('Attack/Release ajad'));
    assert.ok(result.report.scenes.every(s=>s.blocks.wah.bypass));
    if(code)assert.equal(result.report.knownDeviceBody,null,'MED SPD + LINEAR is not the measured whole-body pair');
    reconstructionCases++;
  }
  const copy=Buffer.from(initial);
  for(const label of ['LINEAR','LINEAR','EXPONENTIAL','EXPONENTIAL']){
    const prev=Buffer.from(copy),calls=[],code=label==='LINEAR'?1:0;
    const edit=applyWahModifier(copy,{wahDamping:label},blocks,(at,n)=>calls.push([at,n]));
    const want=Buffer.from(prev);want.writeUInt16LE(code,1632);assert.deepEqual(copy,want);
    assert.deepEqual(calls,prev.readUInt16LE(1632)===code?[]:[[1632,2]]);verifyWahModifierReadback(copy,edit);
  }
  assert.deepEqual(copy,initial,'Damping mode roundtrip');
  for(const auto of ['OFF','MED SPD'])for(const damping of ['EXPONENTIAL','LINEAR']){
    const copy=Buffer.from(initial),want=Buffer.from(initial);
    const edit=applyWahModifier(copy,{wahAutoEngage:auto,wahDamping:damping},blocks);
    want.writeUInt16LE(auto==='OFF'?0:2,1604);want.writeUInt16LE(damping==='LINEAR'?1:0,1632);
    assert.deepEqual(copy,want);verifyWahModifierReadback(copy,edit);combinationCases++;
  }
}
const base=composerBases.find(b=>b.sha256==='a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3');
const bytes=read(base.file),blocks=layouts[base.layout];
const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:views[0].decoded.preset_name,modifiers:{wahAutoEngage:'OFF',wahDamping:'LINEAR'}};
const result=createPreset(bytes,spec);assert.deepEqual(body(result.syx),observed);
assert.equal(result.report.knownDeviceBody.sha256,evidence.pair[1].sha256);
assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false);
assert.equal(result.report.knownDeviceBody.modifierBehavior,'not tested');
assert.ok(result.txt.includes('Damping: LINEAR'));assert.ok(result.txt.includes('ajakäitumine'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-damping-'));
try{const stem=path.join(tmp,'test');writePresetOutputs(stem,result,spec);assert.equal(verifyPresetOutputs(stem).modifierEdit.damping.after,1);assert.equal(fs.readdirSync(tmp).length,4);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const reject=(request,mutate=()=>{},target=blocks)=>{
  const copy=Buffer.from(original);mutate(copy);const saved=Buffer.from(copy);let calls=0;
  assert.throws(()=>applyWahModifier(copy,request,target,()=>calls++),/Wah modifier|Unsupported modifier/);
  assert.deepEqual(copy,saved);assert.equal(calls,0);negative++;
};
for(const value of [null,undefined,false,true,0,1,2,'0','1','linear','Linear','EXP','',{},[]])reject({wahDamping:value});
for(const request of [{},{wahDamping:'LINEAR',extra:1},{wahDamping:'LINEAR',external1Wah:false},{wahDamping:'LINEAR',external1Wah:1},{wahDamping:'LINEAR',wahAutoEngage:'FAST SPD'}])reject(request);
for(const code of [2,3,256,65535])reject({wahDamping:'LINEAR'},b=>b.writeUInt16LE(code,1632));
for(const source of [0,1,15,65535])reject({wahDamping:'LINEAR'},b=>b.writeUInt16LE(source,1584));
for(let word=1;word<24;word++)if(word!==10)reject({wahDamping:'LINEAR'},b=>b.writeUInt16LE((b.readUInt16LE(1584+2*word)+1)%65536,1584+2*word));
for(const code of [1,3,65535])reject({wahDamping:'LINEAR'},b=>b.writeUInt16LE(code,1604));
reject({wahDamping:'LINEAR'},()=>{},{});
reject({wahDamping:'LINEAR'},b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);});
// Other supported operations retain LINEAR. A disabled binding may retain it,
// but an explicit Damping write requires the final External 1 binding.
const retained=Buffer.from(observed);
applyWahModifier(retained,{external1Wah:false},blocks);assert.equal(retained.readUInt16LE(1632),1);
applyWahModifier(retained,{external1Wah:true},blocks);assert.deepEqual(retained,observed);
applyWahModifier(retained,{wahAutoEngage:'MED SPD'},blocks);assert.equal(retained.readUInt16LE(1632),1);
const edit=applyWahModifier(retained,{wahDamping:'EXPONENTIAL'},blocks);
retained[1632]=1;assert.throws(()=>verifyWahModifierReadback(retained,edit),/final Damping readback/);
assert.throws(()=>createPreset(after,spec),/Unknown|Unrecogn|Unsupported/,'New export must not become an unpinned composer base');
const newlook=read(composerBases.at(-1).file);
const sound={composer:{...spec,name:'DAMPING CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahAutoEngage:'OFF',wahDamping:'LINEAR'}},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const composed=createPreset(newlook,sound);assert.equal(body(composed.syx).readUInt16LE(1632),1);
assert.equal(composed.report.modifierEdit.damping.after,1);assert.ok(composed.txt.includes('Damping: LINEAR'));
assert.equal(composed.report.knownDeviceBody,undefined);
for(const channel of 'ABCD')assert.throws(()=>createPreset(newlook,{...sound,controls:[{block:'wah',channel,param:5,value:5}],allow:['linear-by-structure']}),/modifier-controlled/);
assert.equal(getPresetCapabilities().modifiers.damping.field,'composer.modifiers.wahDamping');
assert.deepEqual(getPresetCapabilities().modifiers.damping.codes,{EXPONENTIAL:0,LINEAR:1});
console.log(JSON.stringify({passed:true,devicePairs:1,reconstructionCases,combinationCases,negative,wordOffset:1632,channelLockCases:4,deviceIO:false,timingBehaviorTested:false,audioTested:false}));
