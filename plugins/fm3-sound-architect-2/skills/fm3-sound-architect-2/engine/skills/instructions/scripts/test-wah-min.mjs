// Real pair and observed display values are evidence; other combinations are synthetic.
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
const evidence=JSON.parse(read('references/wah-min-evidence.json'));
const [before,after]=evidence.pair.map(p=>{const b=read(p.file);assert.equal(sha(b),p.sha256);assert.equal(sha(body(b)),p.bodySha256);return b;});
const original=body(before),observed=body(after),expected=Buffer.from(original);
expected.writeUInt16LE(16375,1586);assert.deepEqual(observed,expected,'Real pair differs only in the observed Min word, not 16383/16384');
const views=[before,after].map(inspectStructure);
assert.deepEqual(views[0].parsed.headerPayload,views[1].parsed.headerPayload);
assert.deepEqual(Array.from({length:76},(_,i)=>i).filter(i=>views[0].raw.rawPatch[i]!==views[1].raw.rawPatch[i]),[4,5,74]);
assert.deepEqual(views.map(v=>v.raw.compSize),[4924,4928]);
for(const v of views)assert.ok(v.raw.rawPatch.slice(76+v.raw.compSize).every(b=>b===0));
assert.equal(views[0].decoded.preset_name,views[1].decoded.preset_name);
const metadata=JSON.parse(read('references/fm3-parameter-dependencies.json'));
assert.deepEqual(metadata.descriptors.MOD.bindings.find(([pid])=>pid===1),[1,'MOD_MIN']);
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer');
assert.deepEqual(schema.properties.modifiers.properties.wahMin.enum,[0,2.5]);
assert.equal(schema.properties.modifiers.properties.wahMin.type,'number');
assert.equal(schema.properties.modifiers.additionalProperties,false);
let reconstructionCases=0,negative=0,combinationCases=0;
for(const b of composerBases){
  const bytes=read(b.file),initial=body(bytes),blocks=layouts[b.layout];
  if(!blocks.wah)continue;
  for(const [display,code] of [[0,0],[2.5,16375]]){
    const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(bytes).decoded.preset_name,modifiers:{wahMin:display}};
    const result=createPreset(bytes,spec),want=Buffer.from(initial);want.writeUInt16LE(code,1586);
    assert.deepEqual(body(result.syx),want);assert.deepEqual(body(bytes),initial);
    assert.deepEqual(result.report.changedBodyOffsets,code?[1586,1587]:[]);
    assert.equal(result.report.modifierEdit.min.display,display);
    assert.equal(result.report.modifierEdit.min.after,code);
    assert.equal(result.report.modifierEdit.autoEngage.after,2);
    assert.equal(result.report.modifierEdit.damping.after,0);
    assert.equal(result.report.modifierEdit.after,14);
    assert.ok(result.txt.includes('Min: '+display.toFixed(2)));
    assert.ok(result.txt.includes('kogu skaala valem kinnitamata'));
    assert.ok(result.report.scenes.every(s=>s.blocks.wah.bypass));
    if(code)assert.equal(result.report.knownDeviceBody,null,'Other combinations do not inherit whole-body device evidence');
    reconstructionCases++;
  }
  const copy=Buffer.from(initial);
  for(const display of [2.5,2.5,0,0]){
    const prev=Buffer.from(copy),calls=[],code=display===2.5?16375:0;
    const edit=applyWahModifier(copy,{wahMin:display},blocks,(at,n)=>calls.push([at,n]));
    const want=Buffer.from(prev);want.writeUInt16LE(code,1586);assert.deepEqual(copy,want);
    assert.deepEqual(calls,prev.readUInt16LE(1586)===code?[]:[[1586,2]]);verifyWahModifierReadback(copy,edit);
  }
  assert.deepEqual(copy,initial,'Min roundtrip restores exact bytes');
  for(const auto of ['OFF','MED SPD'])for(const damping of ['EXPONENTIAL','LINEAR'])for(const display of [0,2.5]){
    const copy=Buffer.from(initial),want=Buffer.from(initial);
    const edit=applyWahModifier(copy,{wahAutoEngage:auto,wahDamping:damping,wahMin:display},blocks);
    want.writeUInt16LE(auto==='OFF'?0:2,1604);want.writeUInt16LE(damping==='LINEAR'?1:0,1632);want.writeUInt16LE(display===2.5?16375:0,1586);
    assert.deepEqual(copy,want);verifyWahModifierReadback(copy,edit);combinationCases++;
  }
}
const base=composerBases.find(b=>b.sha256==='a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3');
const bytes=read(base.file),blocks=layouts[base.layout];
const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:views[0].decoded.preset_name,modifiers:{wahAutoEngage:'OFF',wahDamping:'LINEAR',wahMin:2.5}};
const result=createPreset(bytes,spec);assert.deepEqual(body(result.syx),observed);
assert.equal(result.report.knownDeviceBody.sha256,evidence.pair[1].sha256);
assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false);
assert.equal(result.report.knownDeviceBody.modifierBehavior,'not tested');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-min-'));
try{const stem=path.join(tmp,'test');writePresetOutputs(stem,result,spec);assert.equal(verifyPresetOutputs(stem).modifierEdit.min.after,16375);assert.equal(fs.readdirSync(tmp).length,4);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const reject=(request,mutate=()=>{},target=blocks)=>{
  const copy=Buffer.from(original);mutate(copy);const saved=Buffer.from(copy);let calls=0;
  assert.throws(()=>applyWahModifier(copy,request,target,()=>calls++),/Wah modifier|Unsupported modifier/);
  assert.deepEqual(copy,saved);assert.equal(calls,0);negative++;
};
for(const value of [null,undefined,false,true,-1,0.01,1,2.49,2.51,5,10,16375,16383,16384,65534,NaN,Infinity,'0','2.50','2.5','',{},[]])reject({wahMin:value});
for(const request of [{},{wahMin:2.5,extra:1},{wahMin:2.5,external1Wah:false},{wahMin:2.5,external1Wah:1},{wahMin:2.5,wahAutoEngage:'FAST SPD'},{wahMin:2.5,wahDamping:'linear'}])reject(request);
for(const code of [1,16374,16376,16383,16384,65534,65535])reject({wahMin:2.5},b=>b.writeUInt16LE(code,1586));
for(const source of [0,1,15,65535])reject({wahMin:2.5},b=>b.writeUInt16LE(source,1584));
for(let word=2;word<25;word++)if(![10,24].includes(word))reject({wahMin:2.5},b=>b.writeUInt16LE((b.readUInt16LE(1584+2*word)+1)%65536,1584+2*word));
for(const code of [1,3,65535])reject({wahMin:2.5},b=>b.writeUInt16LE(code,1604));
for(const code of [2,256,65535])reject({wahMin:2.5},b=>b.writeUInt16LE(code,1632));
reject({wahMin:2.5},()=>{},{});
reject({wahMin:2.5},b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);});
// Other edits retain observed Min; explicit Min requires final External 1.
const retained=Buffer.from(observed);
applyWahModifier(retained,{external1Wah:false},blocks);assert.equal(retained.readUInt16LE(1586),16375);
applyWahModifier(retained,{external1Wah:true},blocks);assert.deepEqual(retained,observed);
applyWahModifier(retained,{wahAutoEngage:'MED SPD',wahDamping:'EXPONENTIAL'},blocks);assert.equal(retained.readUInt16LE(1586),16375);
const edit=applyWahModifier(retained,{wahMin:0},blocks);
retained.writeUInt16LE(16375,1586);assert.throws(()=>verifyWahModifierReadback(retained,edit),/final Min readback/);
assert.throws(()=>createPreset(after,spec),/Unknown|Unrecogn|Unsupported/,'New export must not become an unpinned composer base');
const newlook=read(composerBases.at(-1).file);
const sound={composer:{...spec,name:'MIN CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahAutoEngage:'OFF',wahDamping:'LINEAR',wahMin:2.5}},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const composed=createPreset(newlook,sound);assert.equal(body(composed.syx).readUInt16LE(1586),16375);
assert.equal(composed.report.modifierEdit.min.display,2.5);assert.ok(composed.txt.includes('Min: 2.50'));
assert.equal(composed.report.knownDeviceBody,undefined);
for(const channel of 'ABCD')assert.throws(()=>createPreset(newlook,{...sound,controls:[{block:'wah',channel,param:5,value:5}],allow:['linear-by-structure']}),/modifier-controlled/);
assert.equal(getPresetCapabilities().modifiers.min.field,'composer.modifiers.wahMin');
assert.deepEqual(getPresetCapabilities().modifiers.min.values,[0,2.5]);
assert.equal(getPresetCapabilities().modifiers.min.fullRange,false);
console.log(JSON.stringify({passed:true,devicePairs:1,reconstructionCases,combinationCases,negative,wordOffset:1586,observedCode:16375,channelLockCases:4,deviceIO:false,fullRangeCodec:false,audioTested:false}));
