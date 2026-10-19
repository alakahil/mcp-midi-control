import fs from 'node:fs';import assert from 'node:assert/strict';import {generatePreset} from './fm3-generate.mjs';import {applyDriveControls} from './fm3-drive-multi.mjs';import {inspect} from './fm3-prototype.mjs';import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=u=>fs.readFileSync(new URL(u,import.meta.url)),base=read('../examples/JB_YDOM_RHYTHM.syx'),lib=JSON.parse(read('../references/drive-library.json'));
const spec={schemaVersion:1,firmware:13,baseProfile:'jb-drive-multi',driveChannels:[{channel:'A',type:'BB Pre',drive:2,level:2,mix:25},{channel:'B',type:'T808 OD',drive:2,tone:7,level:2,mix:25},{channel:'C',type:'Rat Distortion',level:2,mix:25},{channel:'D',type:'Zen Master',drive:2,tone:7,level:2,mix:25}]};
// Each of the 87 captured type payloads is transplanted into all four channels.
for(const model of lib.models){const r=generatePreset(base,{...spec,driveChannels:[...'ABCD'].map(channel=>({channel,type:model.name}))});const b=Buffer.from(inspectStructure(r.syx).raw.body);for(let c=0;c<4;c++)assert.deepEqual(Array.from({length:44},(_,i)=>b.readUInt16LE(8460+88*c+i*2)),model.words);}
// Replay control writes against independent hardware fixtures, preserving every other body byte.
const root=new URL('../references/drive-controls-20261006-123230/',import.meta.url);let previous=read('../scripts/drive-control-collector/baseline.syx'),count=0;
for(const name of fs.readdirSync(root).filter(n=>n.startsWith('step-')).sort()){
 const r=JSON.parse(fs.readFileSync(new URL(name+'/result.json',root)));if(r.status!=='passed')continue;
 const current=fs.readFileSync(new URL(name+'/donor.syx',root));
 if(r.step.kind==='control'){const body=Buffer.from(inspect(previous).raw.body);const types={A:'BB Pre',B:'T808 OD',C:'Rat Distortion',D:'Zen Master'};applyDriveControls(body,{channel:r.step.channel,type:types[r.step.channel],[r.step.field.toLowerCase()]:r.step.value});assert.deepEqual(body,Buffer.from(inspect(current).raw.body));count++;}previous=current;
}assert.equal(count,13);
for(const bad of [{channel:'A',type:'BB Pre',tone:7},{channel:'C',type:'Rat Distortion',drive:2},{channel:'C',type:'Rat Distortion',tone:7},{channel:'A',type:'Zen Master',drive:2},{channel:'D',type:'Zen Master',drive:8},{channel:'D',type:'Zen Master',mix:50},{channel:'D',type:'Unknown'},{channel:'E',type:'BB Pre'},{channel:'A',type:'BB Pre',bypass:true}])assert.throws(()=>generatePreset(base,{...spec,driveChannels:[bad]}));
assert.throws(()=>generatePreset(base,{...spec,driveChannels:[spec.driveChannels[0],spec.driveChannels[0]]}));
const result=generatePreset(base,spec);
for(const [ext,data] of [['syx',result.syx],['txt',result.txt],['spec.json',JSON.stringify(spec,null,2)+'\n'],['validation.json',JSON.stringify(result.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_DRIVE_ABCD_TEST.'+ext,import.meta.url),data);
console.log('PASS: 348 type/channel transplants; 13 independent full-body control replays; 10 invalid requests; ABCD test generated.');
