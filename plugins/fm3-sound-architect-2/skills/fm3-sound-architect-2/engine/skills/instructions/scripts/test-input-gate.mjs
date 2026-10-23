import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {findParam,encodeValue,decodeValue,writeTableControls} from './fm3-table-encoder.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {decodeGen3PresetDump,readBlockParamsForModel} from './fm3-codec.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {sha256} from './fm3-output.mjs';
import {inputGateApplicability} from './fm3-input-gate.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const bodyOf=b=>Buffer.from(inspectStructure(b).raw.body);
const c=(channel,param,value)=>({block:'in1',channel,param,value});
// Explicit table values, not computed using encodeValue. These are model checks,
// never labelled new hardware measurements. Log metadata endpoints are float32.
const points=[['THRESH',-50,32767],['RATIO',1,0],['RATIO',20,65534],['RELEASE',100,32767],['ATTACK',1,21845],['LEVEL',0,32767],['LEVEL',-20,16384]];
for(const [p,v,raw] of points){assert.equal(encodeValue(findParam('in1',p),v),raw,p);}
let writesCount=0;
for(const b of composerBases){
  const base=read(b.file),before=bodyOf(base),controls=[... 'ABCD'].flatMap(ch=>points.map(([p,v])=>c(ch,p,v)));
  // Use one value per PID; the endpoint cases above are separate assertions.
  const unique=controls.filter((x,i)=>controls.findIndex(y=>y.channel===x.channel&&y.param===x.param)===i);
  const out=writeTableControls(base,{name:'INPUT GATE CHECK',controls:unique});
  const after=bodyOf(out.syx),record=scanRecords(after).records.find(r=>r.eid===37);
  assert.equal(record.words,10);assert.equal(record.channels,4);
  const allowed=new Set(out.writes.flatMap(w=>[w.offset,w.offset+1]));
  for(let i=0;i<before.length;i++)if(!allowed.has(i))assert.equal(after[i],before[i],'Collateral byte '+i);
  // Separate packaged decoder locates its own block and confirms channel A raws.
  // Its approximate physical values are deliberately not used as scale evidence.
  const d=decodeGen3PresetDump(new Uint8Array(out.syx),17);assert.equal(d.crc_valid,true);
  const independent=readBlockParamsForModel(d.decompressed_body,new Set([37]),17).find(x=>x.effectId===37);
  for(const w of out.writes){assert.equal(after.readUInt16LE(w.offset),w.raw);if(w.channel==='A')assert.equal(independent.params.find(p=>p.paramId===w.pid).raw,w.raw);writesCount++;}
}
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),original=bodyOf(base),r=scanRecords(original).records.find(r=>r.eid===37);
const invalid=[c('E','THRESH',-60),c('A','THRESH',-100),c('A','THRESH',1),c('A','THRESH','-60'),c('A','ATTACK',0),c('A','LEVEL',NaN),c('A','RATIO',21),c('A','Z',0),c('A','GAINMONITOR',0),c('A','BYPASS',0),c('A','TYPE',1),c('A','MODE',1),{...c('A','THRESH',-60),extra:1}, {block:'volpan',channel:'A',param:'GAIN',value:5},{block:'gate',channel:'A',param:'THRESH',value:-60}];
for(const bad of invalid){const b=Buffer.from(original);let calls=0;assert.throws(()=>applyTableControls(b,[c('B','LEVEL',-5),bad],{allow:['enum-labels']},()=>calls++));assert.deepEqual(b,original);assert.equal(calls,0);}
assert.throws(()=>applyTableControls(Buffer.from(original),[c('A',0,-60),c('A','THRESH',-65)]),/Duplicate/);
for(const type of [0,1,2])for(const mode of [0,1])for(const pid of [0,1,2,3,5]){
  const b=Buffer.from(original);b.writeUInt16LE(type,r.start+14);b.writeUInt16LE(mode,r.start+18);
  const p=findParam('in1',pid),v={0:-65,1:3,2:150,3:2,5:-3}[pid];
  const visible=mode===1||![1,3].includes(pid);
  assert.equal(inputGateApplicability(p,{type,mode}).allowed,visible);
  if(visible)applyTableControls(b,[c('A',pid,v)]);else assert.throws(()=>applyTableControls(b,[c('A',pid,v)]),/hidden/);
}
for(const pid of [7,9]){const b=Buffer.from(original);b.writeUInt16LE(99,r.start+2*pid);assert.throws(()=>applyTableControls(b,[c('A',0,-65)]),/unknown/);}
// An active modifier target must block static Input writes, on any addressed channel.
const mod=Buffer.from(original);mod.writeUInt16LE(1,1584);mod.writeUInt16LE(37,1600);mod.writeUInt16LE(0,1602);mod.writeUInt16LE(0,1618);
assert.throws(()=>applyTableControls(mod,[c('D',0,-65)]),/modifier-controlled/);
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FM3 INPUT GATE CANDIDATE',modifiers:{external1Wah:false}},layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controls:[c('A','THRESH',-65),c('B','RATIO',4),c('C','RELEASE',200),c('D','ATTACK',2),c('D','LEVEL',-6)],purpose:'Offline Input 1 kandidaat; uus seadmekinnitus puudub.'};
const result=createPreset(base,spec);
assert.equal(result.report.controls.length,5);assert.equal(result.report.inputGate.globalSettingsIncluded,false);
assert.ok(result.report.controls.every(w=>w.source==='final-syx'&&w.encodingEvidence));
assert.ok(result.txt.includes('SISENDI GATE'));assert.ok(!result.report.parameters.some(p=>p.block==='in1'&&['INPUT_Z','INPUT_GAINMONITOR','INPUT_BYPASS'].includes(p.name)));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 input gate ')),stem=path.join(dir,'four files');
try{
  writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);
  const report=JSON.parse(fs.readFileSync(stem+'.validation.json')),saved=JSON.stringify(report);
  report.controls[0].raw++;fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));assert.throws(()=>verifyPresetOutputs(stem));
  fs.writeFileSync(stem+'.validation.json',saved);
  const changed={...spec,controls:[c('A','THRESH',-70),...spec.controls.slice(1)]},buf=Buffer.from(JSON.stringify(changed));fs.writeFileSync(stem+'.spec.json',buf);
  report.controls[0].raw--;report.artifacts['.spec.json']={sha256:sha256(buf),bytes:buf.length};fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));assert.throws(()=>verifyPresetOutputs(stem),/SYX differs/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,baseCount:composerBases.length,channelWrites:writesCount,negativeCases:invalid.length,modeTypeCases:30,independentRawDecoder:true,fourFilesAndTamper:true,newHardwareMeasurements:0}));
