// Actual device exports are the expected bytes; no reconstructed scale formulas.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composePeqTemplates} from './fm3-peq-controls.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const decode=b=>Buffer.from(inspectStructure(b).raw.body),sha=b=>createHash('sha256').update(b).digest('hex');
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),copy=Buffer.from(base);
const v3spec=JSON.parse(read('examples/JB_EIGHT_SCENES_V3.spec.json')),v3=read('examples/JB_EIGHT_SCENES_V3.syx'),v3body=decode(v3);
assert.deepEqual(generatePreset(base,v3spec).syx,v3,'Existing V3 is byte-identical');
const baseline=decode(read('examples/FM3_PEQ_BASELINE.syx'));
const seed=structuredClone(v3spec);seed.name='PEQ DEVICE BODY REPLAY';seed.peqChannels=[{channel:'A'}];
// Match the captured donor's scene states explicitly; insertion defaults stay bypass.
for(const scene of seed.scenes)scene.blocks.peq={channel:'A',bypass:scene.scene===2};
const initial=generatePreset(base,seed);assert.deepEqual(decode(initial.syx),baseline);assert.ok(initial.report.knownDeviceBody);
const lib=JSON.parse(read('references/peq-controls.json')),root='references/'+lib.evidenceDirectory+'/';
const valid=[seed],invalid=[];let isolated=0,aliases=0,replays=0,rejected=0;
const setValue=(spec,point,value)=>{const s=spec.peqChannels[0];if(point.band===3){s.band3??={type:'Peaking'};s.band3[point.field]=value;}else s[point.field]=value;};
for(const point of lib.points){
 const exported=decode(read(root+point.folder+'/donor.syx')),offset=8734+2*point.parameterId;
 for(const value of new Set([point.targetValue,point.displayValue])){
  const spec=structuredClone(seed);setValue(spec,point,value);const before=JSON.stringify(spec),r=generatePreset(base,spec);
  const expected=Buffer.from(baseline);exported.copy(expected,offset,offset,offset+2);
  assert.deepEqual(decode(r.syx),expected,'Isolated measured point '+point.index+'/'+value);
  assert.equal(JSON.stringify(spec),before);assert.deepEqual(base,copy);
  const c=r.report.components.peq[0].controls[0];assert.equal(c.raw,exported.readUInt16LE(offset));assert.equal(c.displayValue,point.displayValue);
  assert.equal(c.roundedDisplay,value!==point.displayValue);assert.ok(r.txt.includes(`${c.key}: ${point.displayValue} ${point.unit}`));
  valid.push(spec);isolated++;if(value!==point.targetValue)aliases++;
 }
}
// Accumulating the independently measured points reproduces all eleven full exports.
const accumulated=structuredClone(seed);
for(const point of lib.points){
 setValue(accumulated,point,point.targetValue);const r=generatePreset(base,accumulated),body=decode(r.syx),device=decode(read(root+point.folder+'/donor.syx'));
 assert.deepEqual(body,device,'Exact unnormalised export replay '+point.index);assert.ok(r.report.knownDeviceBody);
 assert.equal(r.report.knownDeviceBody.bodySha256,sha(device));valid.push(structuredClone(accumulated));replays++;
}
const fixture=JSON.parse(read('examples/FM3_PEQ_BAND3_TEST.spec.json')),r=generatePreset(base,fixture),body=decode(r.syx);
assert.deepEqual(r.syx,read('examples/FM3_PEQ_BAND3_TEST.syx'));
assert.equal(r.report.knownDeviceBody.submittedFileConfirmed,true);assert.ok(r.txt.includes('Selle täpse SYX-faili import ja tagasieksport on kinnitatud'));
assert.deepEqual(r.report.scenes.map(s=>s.blocks.peq.bypass),[true,false,true,true,true,true,true,true]);
assert.ok(r.report.scenes.every(s=>s.blocks.peq.channel==='A'));
assert.equal(body.readUInt16LE(408),54);assert.equal(body.readUInt16LE(410),2);
assert.equal(body.readUInt16LE(8738),32767);assert.equal(body.readUInt16LE(8748),37555);assert.equal(body.readUInt16LE(8758),37682);assert.equal(body.readUInt16LE(8774),52427);
// Complete pre-PEQ V3 reconstruction: no old block, scene, routing flag or tail drift.
const restored=Buffer.concat([body.subarray(0,8688),body.subarray(8998)]);restored.writeUInt16LE(1029,408);
assert.deepEqual(restored,v3body);assert.equal(restored.length,13146);
const peqExpected=Buffer.from(baseline.subarray(8688,8998));
for(let scene=0;scene<8;scene++)peqExpected.writeUInt16LE(scene===1?0:1,26+2*scene);
for(const [pid,value] of [[2,32767],[7,37555],[12,37682],[20,52427]])peqExpected.writeUInt16LE(value,46+2*pid);
assert.deepEqual(body.subarray(8688,8998),peqExpected,'Only declared new PEQ words/scenes differ');
valid.push(fixture);
const minimal={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'PEQ ONLY',peqChannels:[{channel:'A'}]};
const neutral=generatePreset(base,minimal);assert.ok(neutral.report.scenes.every(s=>s.blocks.peq.bypass&&s.blocks.peq.channel==='A'));
assert.equal(neutral.report.bodyBytes,12804+310);valid.push(minimal);
const noPeq={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'NO PEQ',levelB:-3};
assert.ok(!generatePreset(base,noPeq).report.insertions.some(x=>x.family==='peq'));
const badSelections=[
 [],[{channel:'A'},{channel:'A'}],
 [{channel:'A',type:'Peaking'}],[{channel:'A',band1:{gainDb:3}}],
 [{channel:'A',band3:{type:'Peaking 2',gainDb:3}}],[{channel:'A',band3:{gainDb:3}}],
 [{channel:'A',band3:{type:'Peaking',q:.707}}],[{channel:'A',band3:{type:'Peaking',q:1.5}}],
 [{channel:'A',band3:{type:'Peaking',frequencyHz:1500}}],[{channel:'A',band3:{type:'Peaking',frequencyHz:'1000'}}],
 [{channel:'A',band3:{type:'Peaking',gainDb:6}}],
 [{channel:'A',levelDb:null}],[{channel:'A',levelDb:true}],[{channel:'A',levelDb:Infinity}],
 [{channel:'A',band3:{type:'Peaking',q:NaN}}],[{channel:'A',band3:null}],
 [{channel:'A',band3:[]}],[{channel:'A',band3:{type:'Peaking',slope:12}}],
 [{channel:'A',frequencyHz:1000}]
];
for(const peqChannels of badSelections){const spec={...minimal,peqChannels};assert.throws(()=>generatePreset(base,spec));invalid.push(spec);rejected++;}
for(const state of [{channel:'B',bypass:false},{channel:'C',bypass:true},{channel:'D'},{bypass:'false'},{gainDb:3}]){
 const spec={...minimal,scenes:[{scene:2,blocks:{peq:state}}]};assert.throws(()=>generatePreset(base,spec));invalid.push(spec);rejected++;
}
for(const extra of [
 {addedBlockScenes:{peq:[{scene:2,channel:'B',bypass:true}]}},
 {addedBlockScenes:{peq:[{scene:2,channel:'A',bypass:false}]},scenes:[{scene:2,blocks:{peq:{bypass:false}}}]}
]){const spec={...minimal,...extra};assert.throws(()=>generatePreset(base,spec));invalid.push(spec);rejected++;}
const absent={...noPeq,scenes:[{scene:2,blocks:{peq:{bypass:false}}}]};assert.throws(()=>generatePreset(base,absent));invalid.push(absent);rejected++;
assert.throws(()=>generatePreset(read('examples/JB_YDOM_RHYTHM.syx'),minimal));rejected++;
assert.throws(()=>generatePreset(v3,minimal));rejected++;
const explicit={...minimal,addedBlockScenes:{peq:[{scene:2,channel:'A',bypass:false}]}};
assert.equal(generatePreset(base,explicit).report.scenes[1].blocks.peq.bypass,false);valid.push(explicit);
// Existing insertable components can share the same two rows with PEQ.
const all=JSON.parse(read('examples/FM3_NEWLOOK_INSERT_TEST.spec.json'));all.name='PEQ WITH OTHER INSERTIONS';all.peqChannels=fixture.peqChannels;
const combined=generatePreset(base,all);assert.ok(combined.report.insertions.some(x=>x.family==='peq'));assert.ok(combined.report.scenes.every(s=>s.blocks.peq.bypass));valid.push(all);
const cap=getComposerCapabilities(base);assert.deepEqual(cap.peqControls.channels,[...'ABCD']);assert.equal(cap.peqControls.bands.length,5);
assert.equal(cap.peqControls.bands[2].q.minimum,.1);assert.deepEqual(cap.newlookLayout.slots.peq,{row:2,column:10});
assert.ok(cap.bases[0].fields.includes('peqChannels'));
const other=getComposerCapabilities(read('examples/JB_YDOM_RHYTHM.syx'));assert.ok(!other.bases[0].fields.includes('peqChannels'));
const summary={date:'2026-10-09',passed:true,generator:'jb-composer-0.10.0',actualControlMeasurements:11,isolatedPointAndAliasCases:isolated,displayAliases:aliases,exactDeviceBodyReplays:replays,baselineBodyReplay:true,allReplayBodyBytes:13456,noNormalization:true,existingV3ByteIdentical:true,newSpecimenOriginalV3BytesReconstructed:13146,newPeqRecordBytes:310,newSpecimenSha256:r.report.outputSha256,newSpecimenKnownDeviceBody:r.report.knownDeviceBody,newPeqActiveScenes:[2],invalidRequestsRejected:rejected,otherInsertionCombinationTested:true,defaultAllScenesBypass:true,sourceInputsPreserved:true,hardware:'Exact generated active specimen import/export confirmed; user listening positive and CPU 47–48%. Other combinations remain unverified.'};
fs.writeFileSync(new URL('../../../docs/FM3_PEQ_LEGACY_REGRESSION.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({valid,invalid}));
console.log(JSON.stringify(summary,null,2));
