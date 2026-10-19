import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './compressor-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
const base=read('../examples/FM3_REVERB_ABCD_TEST_export.syx');
const lib=JSON.parse(read('../references/compressor-library.json'));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const before=body(base),meta={schemaVersion:1,firmware:13,baseProfile:'jb-compressor-multi'};
let combinations=0;
// Independent fixture words, relocated one channel at a time; all other bytes must match the base.
for(const model of lib.models){
 const original=body(read('../references/'+lib.evidenceDirectory+'/'+model.sourceCapture+'/donor.syx'));
 const source=original.subarray(7050+'ABCD'.indexOf(model.sourceChannel)*74,7050+('ABCD'.indexOf(model.sourceChannel)+1)*74);
 for(const channel of 'ABCD'){
  const out=generatePreset(base,{...meta,compressorChannels:[{channel,type:model.name}]}),expected=Buffer.from(before);
  source.copy(expected,7050+'ABCD'.indexOf(channel)*74);
  assert.deepEqual(body(out.syx),expected);
  assert.ok(out.txt.includes(model.name));combinations++;
 }
}
// Reconstruct all four channels of each device-exported specimen, comparing the full body.
// Scene channel choices are explicitly preserved from our base, not claimed equal to those exports.
let replays=0;
const root=new URL('../references/'+lib.evidenceDirectory+'/',import.meta.url);
for(const folder of fs.readdirSync(root).filter(n=>n.startsWith('capture-')).sort()){
 const expected=body(fs.readFileSync(new URL(folder+'/donor.syx',root)));
 const selections=[...'ABCD'].map((channel,i)=>({channel,type:lib.models.find(m=>m.binaryId===expected.readUInt16LE(7050+74*i+24)).name}));
 before.copy(expected,7014,7014,7030);
 assert.deepEqual(body(generatePreset(base,{...meta,compressorChannels:selections}).syx),expected);replays++;
}
const spec={...meta,compressorChannels:[{channel:'A',type:'Citrus Juicer'},{channel:'B',type:'Dynami-Comp Soft'},{channel:'C',type:'JFET Studio Compressor'},{channel:'D',type:'Optical Compressor'}]};
for(const p of ['../examples/JB_YDOM_RHYTHM.syx','../references/'+lib.evidenceDirectory+'/capture-20261007T120335-cba8c1eb81/donor.syx']){
 const input=read(p),expected=body(input),out=generatePreset(input,spec);
 for(const s of spec.compressorChannels){const m=lib.models.find(m=>m.name===s.type);m.words.forEach((w,i)=>expected.writeUInt16LE(w,7050+'ABCD'.indexOf(s.channel)*74+2*i))}
 assert.deepEqual(body(out.syx),expected);
}
let rejected=0;
for(const bad of [[],null,Array(5).fill(spec.compressorChannels[0]),[spec.compressorChannels[0],spec.compressorChannels[0]],[{channel:'E',type:'Citrus Juicer'}],[{channel:'A',type:'Unknown'}],[{channel:'A',type:'Citrus Juicer',mix:25}],[{channel:'A',type:'Citrus Juicer',timeMs:400}],[{channel:'A',type:'Citrus Juicer',feedback:25}],[{channel:'A',type:'Citrus Juicer',tempo:'NONE'}],[{channel:'A',type:'Citrus Juicer',bypass:false}],[null]]){
 assert.throws(()=>generatePreset(base,{...meta,compressorChannels:bad}));rejected++;
}
for(const extra of [{firmware:14},{schemaVersion:2},{name:'NEW'},{driveChannels:[]}]){assert.throws(()=>generatePreset(base,{...spec,...extra}));rejected++}
const altered=Buffer.from(base);altered[20]^=1;assert.throws(()=>generatePreset(altered,spec));rejected++;
const out=generatePreset(base,spec);
for(const [ext,data] of [['syx',out.syx],['txt',out.txt],['spec.json',JSON.stringify(spec,null,2)+'\n'],['validation.json',JSON.stringify(out.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_COMPRESSOR_ABCD_TEST.'+ext,import.meta.url),data);
const report={combinations,independentCaptureBodyReplays:replays,replayScenePolicy:'Only Compressor scene-channel choices copied explicitly from base; no other differences normalized',additionalPinnedBases:2,invalidRequestsRejected:rejected,hardwareImport:'pending'};
fs.writeFileSync(new URL('../../../docs/FM3_COMPRESSOR_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
