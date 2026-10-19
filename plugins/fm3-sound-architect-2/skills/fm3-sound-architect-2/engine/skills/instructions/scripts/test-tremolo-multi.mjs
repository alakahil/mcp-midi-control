import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './tremolo-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
const base=read('../references/tremolo-batch-20261007-143642/capture-001/donor.syx');
const lib=JSON.parse(read('../references/tremolo-library.json'));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const before=body(base),meta={schemaVersion:1,firmware:13,baseProfile:'jb-tremolo-multi'};
let combinations=0;
// Independent fixture words, relocated one channel at a time; all other bytes must match the base.
for(const model of lib.models){
 const original=body(read('../references/'+lib.evidenceDirectory+'/'+model.sourceCapture+'/donor.syx'));
 const source=original.subarray(9868+'ABCD'.indexOf(model.sourceChannel)*44,9868+('ABCD'.indexOf(model.sourceChannel)+1)*44);
 for(const channel of 'ABCD'){
  const out=generatePreset(base,{...meta,tremoloChannels:[{channel,type:model.name}]}),expected=Buffer.from(before);
  source.copy(expected,9868+'ABCD'.indexOf(channel)*44);
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
 const selections=[...'ABCD'].map((channel,i)=>({channel,type:lib.models.find(m=>m.binaryId===expected.readUInt16LE(9868+44*i)).name}));
 before.copy(expected,9832,9832,9848);
 assert.deepEqual(body(generatePreset(base,{...meta,tremoloChannels:selections}).syx),expected);replays++;
}
const spec={...meta,tremoloChannels:[{channel:'A',type:"Bias Trem"},{channel:'B',type:'Optical Trem 2'},{channel:'C',type:'Neon Trem'},{channel:'D',type:'Panner'}]};
for(const p of ['../references/'+lib.evidenceDirectory+'/capture-20261007T143641-d0af19e1e9/donor.syx']){
 const input=read(p),expected=body(input),out=generatePreset(input,spec);
 for(const s of spec.tremoloChannels){const m=lib.models.find(m=>m.name===s.type);m.words.forEach((w,i)=>expected.writeUInt16LE(w,9868+'ABCD'.indexOf(s.channel)*44+2*i))}
 assert.deepEqual(body(out.syx),expected);
}
let rejected=0;
for(const bad of [[],null,Array(5).fill(spec.tremoloChannels[0]),[spec.tremoloChannels[0],spec.tremoloChannels[0]],[{channel:'E',type:"Bias Trem"}],[{channel:'A',type:'Unknown'}],[{channel:'A',type:"Bias Trem",mix:22}],[{channel:'A',type:"Bias Trem",timeMs:400}],[{channel:'A',type:"Bias Trem",feedback:22}],[{channel:'A',type:"Bias Trem",tempo:'NONE'}],[{channel:'A',type:"Bias Trem",bypass:false}],[null]]){
 assert.throws(()=>generatePreset(base,{...meta,tremoloChannels:bad}));rejected++;
}
for(const extra of [{firmware:14},{schemaVersion:2},{name:'NEW'},{driveChannels:[]}]){assert.throws(()=>generatePreset(base,{...spec,...extra}));rejected++}
const altered=Buffer.from(base);altered[20]^=1;assert.throws(()=>generatePreset(altered,spec));rejected++;
assert.throws(()=>generatePreset(read('../examples/JB_YDOM_RHYTHM.syx'),spec));rejected++;
const out=generatePreset(base,spec);
for(const [ext,data] of [['syx',out.syx],['txt',out.txt],['spec.json',JSON.stringify(spec,null,2)+'\n'],['validation.json',JSON.stringify(out.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_TREMOLO_ABCD_TEST.'+ext,import.meta.url),data);
const report={combinations,independentCaptureBodyReplays:replays,replayScenePolicy:'Only Tremolo scene-channel choices copied explicitly from base; no other differences normalized',additionalPinnedBases:1,invalidRequestsRejected:rejected,hardwareImport:'pending'};
fs.writeFileSync(new URL('../../../docs/FM3_TREMOLO_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
