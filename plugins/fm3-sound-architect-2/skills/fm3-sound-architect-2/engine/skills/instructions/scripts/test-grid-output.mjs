// End-to-end grid/instance/Volume outputs, plus valid-CRC, rehashed tampering.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {validateDependencyWrites} from './fm3-parameter-dependencies.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,decodeGen3PresetDump} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const empty=()=>Array(12).fill('');
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'GRID INSTANCE OUTPUT',modifiers:{external1Wah:false}},
  volumePan:true,remove:['send','return'],duplicate:['drive2','volpan2'],
  grid:{rows:[empty(),['in1','volpan','volpan2','drive','drive2','amp','cab','delay','reverb','-','-','out1'],empty(),empty()]},
  blockScenes:{drive2:[{scene:1,channel:'B',bypass:false}],volpan2:[{scene:1,channel:'D',bypass:false}]},
  controls:[{block:'drive2',channel:'B',param:'FUZZ_DRIVE',value:3},{block:'volpan',channel:'D',param:'GAIN',value:5},{block:'volpan2',channel:'D',param:'GAIN',value:7.5}]};
const good=createPreset(base,spec),parsed=inspectStructure(good.syx),body=Buffer.from(parsed.raw.body),records=scanRecords(body).records;
const d=records.find(r=>r.family==='drive2'),v=records.find(r=>r.family==='volpan2');
assert.equal(body.readUInt16LE(d.header+10),1);assert.equal(body.readUInt16LE(d.header+26),0);
assert.equal(body.readUInt16LE(v.header+10),3);assert.equal(body.readUInt16LE(v.header+26),0);
assert.equal(good.report.scenes[0].blocks.drive2.channel,'B');assert.equal(good.report.scenes[0].blocks.volpan2.type,'VOLUME');
const before=Buffer.from(inspectStructure(createPreset(base,{...spec,controls:[]}).syx).raw.body);
const allowed=new Set(good.report.controls.flatMap(w=>[w.offset,w.offset+1]));
for(let i=0;i<body.length;i++)if(!allowed.has(i))assert.equal(body[i],before[i],'Unrequested byte '+i);
const w=good.report.controls.find(w=>w.instanceBlock==='drive2');
assert.equal(body.readUInt16LE(w.offset),19660,'Drive 2 independent raw word for 3/10');
assert.equal(body.readUInt16LE(v.start+3*v.words*2),49151,'Volume 2 independent raw word for 7.5/10');
// A modifier on instance 1 must not block instance 2; the instance-2 binding must.
const bound=Buffer.from(body);bound.writeUInt16LE(1,1584);bound.writeUInt16LE(118,1600);bound.writeUInt16LE(w.pid,1602);bound.writeUInt16LE(0,1618);
validateDependencyWrites(bound,[{...w}]);bound.writeUInt16LE(119,1600);
assert.throws(()=>validateDependencyWrites(bound,[{...w}]),/modifier-controlled/);
const cases=[
  ['instance omitted',r=>{delete r.report.scenes[0].blocks.drive2},/Missing instance scene/],
  ['wrong instance text',r=>{r.txt=r.txt.replaceAll('drive2 B','drive B')},/Instance .* TXT/],
  ['wrong CPU report',r=>{r.report.cpu.scenes[0].percent+=1},/CPU report/],
  ['missing CPU text',r=>{r.txt=r.txt.slice(0,r.txt.indexOf('CPU HINNANG'))},/CPU TXT/],
  ['wrong control raw',r=>{r.body.writeUInt16LE(19661,w.offset)},/Control SYX/],
  ['wrong grid mask',r=>{r.body.writeUInt16LE(0,260+4*16+1*4+2)},/Grid input mask/],
  ['wrong scene',r=>{r.body.writeUInt16LE(0,d.header+10)},/Scene channel/]
];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 grid outputs % # ü '));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,spec);verifyPresetOutputs(stem);
  for(const [i,[name,mutate,error]] of cases.entries()){
    const r={...good,report:structuredClone(good.report),body:Buffer.from(body)};mutate(r);
    r.syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,r.body)));
    assert.equal(decodeGen3PresetDump(r.syx,17).crc_valid,true);
    r.report.outputSha256=sha256(r.syx);r.report.bytes=r.syx.length;
    const stem=path.join(dir,String(i));writePresetOutputs(stem,r,spec);assert.throws(()=>verifyPresetOutputs(stem),error,name);
  }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,gridVolumeInstances:true,otherBytesPreserved:true,rehashedTamperCases:cases.length,deviceIO:false}));
