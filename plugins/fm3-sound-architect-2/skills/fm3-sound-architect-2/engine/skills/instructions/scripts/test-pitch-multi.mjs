import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './pitch-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
const base=read('../references/pitch-batch-20261007-153634/capture-20261007T153125-b17a97eec7/donor.syx');
const lib=JSON.parse(read('../references/pitch-library.json'));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const before=body(base),meta={schemaVersion:1,firmware:13,baseProfile:'jb-pitch-multi'};
let combinations=0;
// Independent fixture words, relocated one channel at a time; all other bytes must match the base.
for(const model of lib.models){
 const original=body(read('../references/'+lib.evidenceDirectory+'/'+model.sourceCapture+'/donor.syx'));
 const source=original.subarray(8928+'ABCD'.indexOf(model.sourceChannel)*228,8928+('ABCD'.indexOf(model.sourceChannel)+1)*228);
 for(const channel of 'ABCD'){
  const out=generatePreset(base,{...meta,pitchChannels:[{channel,type:model.name}]}),expected=Buffer.from(before);
  source.copy(expected,8928+'ABCD'.indexOf(channel)*228);
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
 const selections=[...'ABCD'].map((channel,i)=>({channel,type:lib.models.find(m=>m.binaryId===expected.readUInt16LE(8928+228*i)).name}));
 before.copy(expected,8892,8892,8908);
 assert.deepEqual(body(generatePreset(base,{...meta,pitchChannels:selections}).syx),expected);replays++;
}
const spec={...meta,pitchChannels:[{channel:'A',type:"Advanced Whammy"},{channel:'B',type:'Virtual Capo'},{channel:'C',type:'Crystal Echoes'},{channel:'D',type:'Dual Detune'}]};
for(const p of ['../references/'+lib.evidenceDirectory+'/capture-20261007T153632-72d46bca9a/donor.syx']){
 const input=read(p),expected=body(input),out=generatePreset(input,spec);
 for(const s of spec.pitchChannels){const m=lib.models.find(m=>m.name===s.type);m.words.forEach((w,i)=>expected.writeUInt16LE(w,8928+'ABCD'.indexOf(s.channel)*228+2*i))}
 assert.deepEqual(body(out.syx),expected);
}
let rejected=0;
for(const bad of [[],null,Array(5).fill(spec.pitchChannels[0]),[spec.pitchChannels[0],spec.pitchChannels[0]],[{channel:'E',type:"Advanced Whammy"}],[{channel:'A',type:'Unknown'}],[{channel:'A',type:"Advanced Whammy",mix:22}],[{channel:'A',type:"Advanced Whammy",timeMs:400}],[{channel:'A',type:"Advanced Whammy",feedback:22}],[{channel:'A',type:"Advanced Whammy",tempo:'NONE'}],[{channel:'A',type:"Advanced Whammy",bypass:false}],[null]]){
 assert.throws(()=>generatePreset(base,{...meta,pitchChannels:bad}));rejected++;
}
for(const extra of [{firmware:14},{schemaVersion:2},{name:'NEW'},{driveChannels:[]}]){assert.throws(()=>generatePreset(base,{...spec,...extra}));rejected++}
const altered=Buffer.from(base);altered[20]^=1;assert.throws(()=>generatePreset(altered,spec));rejected++;
assert.throws(()=>generatePreset(read('../examples/JB_YDOM_RHYTHM.syx'),spec));rejected++;
const out=generatePreset(base,spec);
for(const [ext,data] of [['syx',out.syx],['txt',out.txt],['spec.json',JSON.stringify(spec,null,2)+'\n'],['validation.json',JSON.stringify(out.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_PITCH_ABCD_TEST.'+ext,import.meta.url),data);
const report={combinations,independentCaptureBodyReplays:replays,replayScenePolicy:'Only Pitch scene-channel choices copied explicitly from base; no other differences normalized',additionalPinnedBases:1,invalidRequestsRejected:rejected,hardwareImport:'pending'};
fs.writeFileSync(new URL('../../../docs/FM3_PITCH_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
