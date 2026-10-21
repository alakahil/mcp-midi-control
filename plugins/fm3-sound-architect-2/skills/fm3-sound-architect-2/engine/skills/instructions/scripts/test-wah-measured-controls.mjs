// Real captures are distinct from synthetic combinations; all execution is offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {applyWahModifier,verifyWahModifierReadback} from './fm3-wah-modifier.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const evidence=JSON.parse(read('references/wah-measured-controls.json'));
const base=composerBases.find(b=>b.sha256==='a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3');
const bytes=read(base.file),original=body(bytes),blocks=layouts[base.layout];
const rawExpected={A:[49159,6553,26214,58981,39320,655,1638,38537,29490,10922],B:[49159,13107,36044,52427,22937,3277,6553,28673,37682,54612],MAX5:[32784,13107,36044,52427,22937,3277,6553,28673,37682,54612]};
const bodies={};let reconstructions=0,pointWrites=0,negative=0;
for(const c of evidence.captures){
 const capture=read(c.file),observed=body(capture);bodies[c.id]=observed;
 assert.equal(sha(capture),c.sha256);assert.equal(sha(observed),c.bodySha256);
 assert.deepEqual(evidence.fields.map(f=>observed.readUInt16LE(f.offset)),rawExpected[c.id]);
 const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:inspectStructure(bytes).decoded.preset_name,modifiers:{wahAutoEngage:'OFF',wahDamping:'LINEAR',wahMin:2.5,wahControls:c.values}};
 const result=createPreset(bytes,spec);
 assert.deepEqual(body(result.syx),observed,'Entire captured '+c.id+' body reconstructed');
 assert.equal(result.report.knownDeviceBody.sha256,c.sha256);assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false);
 assert.equal(result.report.knownDeviceBody.modifierBehavior,'not tested');
 for(const f of evidence.fields){const row=result.report.modifierEdit.controls[f.key];assert.equal(row.after,c.rawWords[f.key]);assert.equal(row.display,c.values[f.key]);}
 assert.ok(result.report.scenes.every(s=>s.blocks.wah.bypass));
 assert.throws(()=>createPreset(capture,spec),/Unknown|Unrecogn|Unsupported/,'Evidence files are not new composer bases');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-wah-points-'));
 try{const stem=path.join(dir,c.id);writePresetOutputs(stem,result,spec);assert.equal(verifyPresetOutputs(stem).modifierEdit.controls.max.after,c.rawWords.max);assert.equal(fs.readdirSync(dir).length,4);}finally{fs.rmSync(dir,{recursive:true,force:true});}
 reconstructions++;
}
const maxExpected=Buffer.from(bodies.B);maxExpected.writeUInt16LE(32784,1588);assert.deepEqual(maxExpected,bodies.MAX5,'Isolated user Max change');
assert.equal(evidence.captures[0].discrepancies[0].userReportedDisplay,9.99);
assert.equal(evidence.captures[0].values.attackMs,99.9);
assert.equal(evidence.captures[1].values.max,7.5);assert.equal(evidence.captures[1].values.releaseMs,999.9);
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(x=>x.properties?.baseProfile?.const==='jb-composer').properties.modifiers.properties.wahControls;
assert.equal(schema.additionalProperties,false);assert.equal(schema.minProperties,1);
for(const b of composerBases){
 const bbytes=read(b.file),initial=body(bbytes),layout=layouts[b.layout];if(!layout.wah)continue;
 for(const f of evidence.fields)for(const point of f.points){
  const copy=Buffer.from(initial),want=Buffer.from(initial),calls=[];want.writeUInt16LE(point.raw,f.offset);
  const edit=applyWahModifier(copy,{wahControls:{[f.key]:point.input}},layout,(at,n)=>calls.push([at,n]));
  assert.deepEqual(copy,want);assert.deepEqual(calls,initial.readUInt16LE(f.offset)===point.raw?[]:[[f.offset,2]]);
  assert.equal(edit.controls[f.key].display,point.display);verifyWahModifierReadback(copy,edit);
  assert.deepEqual(schema.properties[f.key].enum,f.points.map(p=>p.input));pointWrites++;
 }
}
function reject(request,mutate=()=>{},target=blocks){const copy=Buffer.from(original);mutate(copy);const before=Buffer.from(copy);let calls=0;
 assert.throws(()=>applyWahModifier(copy,request,target,()=>calls++),/Wah modifier|Unsupported modifier/);assert.deepEqual(copy,before);assert.equal(calls,0);negative++;}
for(const value of [undefined,null,[],{},true,false,5,'5'])reject({wahControls:value});
for(const f of evidence.fields){
 for(const value of [undefined,null,NaN,Infinity,-Infinity,true,false,'1',{},[],123.456])reject({wahControls:{[f.key]:value}});
 reject({wahControls:{[f.key]:f.points[0].input}},b=>b.writeUInt16LE(65535,f.offset));
}
for(const request of [{wahControls:{unknown:1}},{wahControls:{max:5},external1Wah:false},{wahControls:{max:5},extra:true},{wahControls:{max:5,scale:2}},{wahControls:{attackMs:9.99}}])reject(request);
reject({wahControls:{max:5}},()=>{},{});
reject({wahControls:{max:5}},b=>b.writeUInt16LE(0,1584));
reject({wahControls:{max:5}},b=>{b.writeUInt16LE(14,1680);b.writeUInt16LE(94,1696);b.writeUInt16LE(5,1698);});
// In-memory synthetic mixing is not additional hardware evidence.
const mixed=Buffer.from(bodies.MAX5),prior=Buffer.from(mixed);
const edit=applyWahModifier(mixed,{wahControls:{startPercent:10,scale:1.5}},blocks);
const want=Buffer.from(prior);want.writeUInt16LE(6553,1590);want.writeUInt16LE(38537,1610);assert.deepEqual(mixed,want);verifyWahModifierReadback(mixed,edit);
for(const f of evidence.fields){const bad=Buffer.from(mixed);bad[f.offset]^=1;assert.throws(()=>verifyWahModifierReadback(bad,edit),/readback failed/);}
applyWahModifier(mixed,{external1Wah:false},blocks);const unchanged=Buffer.from(mixed);applyWahModifier(mixed,{external1Wah:true},blocks);unchanged.writeUInt16LE(14,1584);assert.deepEqual(mixed,unchanged);
const newlook=read(composerBases.at(-1).file);
const sound={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'WAH POINT CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahAutoEngage:'OFF',wahDamping:'LINEAR',wahMin:2.5,wahControls:{max:5,attackMs:100,releaseMs:1000,scale:.75}}},layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
const composed=createPreset(newlook,sound);assert.equal(body(composed.syx).readUInt16LE(1588),32784);
assert.equal(composed.report.modifierEdit.controls.attackMs.display,99.9);assert.equal(composed.report.modifierEdit.controls.releaseMs.display,999.9);
assert.ok(composed.txt.includes('Max: 5.00'));assert.ok(composed.txt.includes('Attack: 99.9 ms'));assert.ok(composed.txt.includes('Release: 999.9 ms'));
assert.equal(composed.report.knownDeviceBody,undefined);
for(const channel of 'ABCD')assert.throws(()=>createPreset(newlook,{...sound,controls:[{block:'wah',channel,param:5,value:5}],allow:['linear-by-structure']}),/modifier-controlled/);
const caps=getPresetCapabilities().modifiers.controls;assert.equal(caps.field,'composer.modifiers.wahControls');assert.equal(caps.fullRange,false);assert.equal(caps.fieldIndependenceVerified,false);
console.log(JSON.stringify({passed:true,deviceCaptures:3,jointCaptures:2,isolatedMaxChanges:1,reconstructions,pointWrites,negative,channelLocks:4,fullRangeCodec:false,newCombinationsDeviceConfirmed:false,deviceIO:false}));
