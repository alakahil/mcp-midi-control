import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,applyTableControls,applyBlockScenes} from './fm3-layout.mjs';
import {insertVolumePan} from './fm3-volume.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {findParam,encodeValue} from './fm3-table-encoder.mjs';
import {decodeGen3PresetDump,readBlockParamsForModel} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const donor=JSON.parse(read('references/fm3-volume-donor.json'));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const c=(channel,param,value)=>({block:'volpan',channel,param,value});
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FM3 INPUT VOL CHECK',modifiers:{external1Wah:false}},volumePan:true,layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb'],columns:{drive:4,amp:6,cab:8,volpan:2,delay:9,reverb:10}},selectedScene:1,controls:[]};
for(const [i,ch] of [...'ABCD'].entries()){
 const values=[[-65,3,150,3,-3],[-70,4,200,4,-6],[-75,5,250,5,-9],[-60,6,300,6,-12]][i];
 ['THRESH','RATIO','RELEASE','ATTACK','LEVEL'].forEach((param,j)=>spec.controls.push({block:'in1',channel:ch,param,value:values[j]}));
}
const reconstruction=createPreset(base,spec);
assert.equal(sha(body(reconstruction.syx)),donor.captureBodySha256,'Entire returned device body is reconstructed exactly');
assert.equal(reconstruction.report.volumePan.states.length,4);
// The public sound path uses NewLook. Older full/empty grids are rejected; no arbitrary routing is invented.
let insertions=0,rejectedLayouts=0;
for(const b of composerBases){const before=read(b.file);if(b.id!=='jb-newlook'){assert.throws(()=>insertVolumePan(before),/shunt|two-row/);rejectedLayouts++;continue;}const inserted=insertVolumePan(before);insertions++;assert.equal(body(inserted.syx).length,body(before).length+166);assert.throws(()=>insertVolumePan(inserted.syx),/already exists/);}
const original=body(insertVolumePan(base).syx),r=scanRecords(original).records.find(x=>x.eid===102);
let writes=0;
for(const [pid,values] of [[0,[0,2.5,5,7.5,10]],[1,[-100,-50,0,50,100]],[4,[-99.9,-50,0,50,99.9]],[5,[-99.9,-50,0,50,99.9]],[6,[-80,-40,0,10,20]],[2,[0,1,2,3,4,5,6]],[7,[0,1]],[8,[0,1,2]]]){
 for(const value of values)for(const channel of 'ABCD'){
  const before=Buffer.from(original),after=Buffer.from(original),allowed=new Set(),out=applyTableControls(after,[c(channel,pid,value)],{allow:['enum-labels']},(at,n)=>{for(let j=0;j<n;j++)allowed.add(at+j);});
  for(let i=0;i<before.length;i++)if(!allowed.has(i))assert.equal(after[i],before[i],'Collateral word');
  const raw=encodeValue(findParam('volpan',pid),value,{allow:['enum-labels']});assert.equal(after.readUInt16LE(out[0].offset),raw);writes++;
 }
}
// Fixed normalized anchors are software expectations, not fresh physical points.
for(const [p,v,raw] of [[0,5,32767],[1,0,32767],[4,0,32767],[6,-30,32767]])assert.equal(encodeValue(findParam('volpan',p),v),raw);
const invalid=[c('E',0,5),c('A',0,-1),c('A',0,11),c('A',0,'5'),c('A',1,101),c('A',4,-100),c('A',5,100),c('A',6,21),c('A',2,7),c('A',3,0),c('A',9,2),c('A',10,-40),c('A',11,100),c('A',12,10),c('A',13,6),c('A',14,0),c('A',0,NaN),{...c('A',0,5),extra:1}];
for(const bad of invalid){const b=Buffer.from(original);let calls=0;assert.throws(()=>applyTableControls(b,[c('B',0,8),bad],{allow:['enum-labels']},()=>calls++));assert.deepEqual(b,original);assert.equal(calls,0);}
assert.throws(()=>applyTableControls(Buffer.from(original),[c('A',2,'LINEAR')]),/not writable/);
assert.throws(()=>applyTableControls(Buffer.from(original),[c('A',0,1),c('A','GAIN',2)]),/Duplicate/);
for(const type of [1,2,65535]){const b=Buffer.from(original);b.writeUInt16LE(type,r.start+18);assert.throws(()=>applyTableControls(b,[c('A',0,5)]),type===1?/hidden in final type AUTO-SWELL/:/unknown Volume type/);}
// AUTO-SWELL (front-panel check 2026-10-24): TYPE is one word; Auto-Swell controls follow the FINAL type, in any order.
let swell=0;
for(const channel of 'ABCD')for(const order of [0,1]){
  const ctl=[c(channel,10,-40),c(channel,11,250),c(channel,12,20),c(channel,13,3),c(channel,1,-25),c(channel,6,-6)],typ=c(channel,9,'AUTO-SWELL');
  const before=Buffer.from(original),after=Buffer.from(original),allowed=new Set();
  applyTableControls(after,order?[...ctl,typ]:[typ,...ctl],{allow:['enum-labels']},(at,n)=>{for(let j=0;j<n;j++)allowed.add(at+j);});
  for(let i=0;i<before.length;i++)if(!allowed.has(i))assert.equal(after[i],before[i],'Collateral word (Auto-Swell)');
  const at=r.start+'ABCD'.indexOf(channel)*30;assert.equal(after.readUInt16LE(at+18),1);
  for(const [pid,v] of [[10,-40],[11,250],[12,20],[13,3],[1,-25],[6,-6]])assert.equal(after.readUInt16LE(at+2*pid),encodeValue(findParam('volpan',pid),v));
  for(const pid of [0,2,4,5,7,8])assert.equal(after.readUInt16LE(at+2*pid),original.readUInt16LE(at+2*pid),'other words kept');
  swell++;}
// The device words of the front-panel check: Threshold -40 dB = 32767; Attack 100 ms and Hysteresis 6 dB defaults = 32767.
for(const [pid,v,raw] of [[10,-40,32767],[11,100,32767],[13,6,32767]])assert.equal(encodeValue(findParam('volpan',pid),v),raw);
for(const bad of [[c('A',9,'AUTO-SWELL'),c('A',0,5)],[c('A',9,'AUTO-SWELL'),c('A',4,-50)],[c('A',9,'AUTO-SWELL'),c('A',5,50)],[c('A',10,-40)],[c('A',9,'VOLUME'),c('A',13,6)]]){
  const b=Buffer.from(original);assert.throws(()=>applyTableControls(b,bad,{allow:['enum-labels']}),/hidden in final type/);assert.deepEqual(b,original);}
assert.throws(()=>applyTableControls(Buffer.from(original),[c('A',9,'AUTO-SWELL')]),/not writable/);
const mod=Buffer.from(original);mod.writeUInt16LE(1,1584);mod.writeUInt16LE(102,1600);mod.writeUInt16LE(0,1602);mod.writeUInt16LE(0,1618);assert.throws(()=>applyTableControls(mod,[c('D',0,5)]),/modifier-controlled/);
const scene=Buffer.from(original),scenes=[1,2,3,4,5,6,7,8].map(n=>({scene:n,channel:'ABCD'[(n-1)%4],bypass:n%2===0}));
const allowed=new Set();applyBlockScenes(scene,{volpan:scenes},(at,n)=>{for(let i=0;i<n;i++)allowed.add(at+i)});
for(let i=0;i<scene.length;i++)if(!allowed.has(i))assert.equal(scene[i],original[i]);
for(const s of scenes){assert.equal(scene.readUInt16LE(r.header+10+(s.scene-1)*2),'ABCD'.indexOf(s.channel));assert.equal(scene.readUInt16LE(r.header+26+(s.scene-1)*2),s.bypass?1:0);}
const demo={...spec,composer:{...spec.composer,name:'FM3 VOLUME CANDIDATE'},allow:['enum-labels'],controls:[...spec.controls,c('A','GAIN',7.5),c('B','BAL',-25),c('C','PANL',-50),c('C','PANR',50),c('D','LEVEL',-6),c('D','TAPER','LINEAR')],blockScenes:{volpan:scenes}};
const out=createPreset(base,demo),d=decodeGen3PresetDump(out.syx,17),independent=readBlockParamsForModel(d.decompressed_body,new Set([102]),17).find(x=>x.effectId===102);
assert.equal(d.crc_valid,true);assert.equal(independent.params.find(p=>p.paramId===0).raw,49151);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 volume ')),stem=path.join(dir,'four files');
try{
 // Full public four-file verification, not only the scalar writer. TYPE may
 // occur before or after its controls; unrequested words must remain captured.
 for(const reverse of [false,true]){
  const controls=[c('A','TYPE','AUTO-SWELL'),c('A','THRESHOLD',-40),c('A','ATTACK',250),c('A','RELEASE',20),c('A','HYSTERESIS',3),c('B','GAIN',7.5)];
  const mixed={...spec,allow:['enum-labels'],controls:reverse?controls.reverse():controls,blockScenes:{volpan:[{scene:1,channel:'A',bypass:false},{scene:2,channel:'B',bypass:false}]}};
  const result=createPreset(base,mixed),swellStem=path.join(dir,'swell-'+reverse);
  writePresetOutputs(swellStem,result,mixed);verifyPresetOutputs(swellStem);
  const line=result.txt.split('\n').find(l=>l.startsWith('Volume/Pan 1 kanal A:'));
  assert.ok(line.includes('TYPE=AUTO-SWELL')&&line.includes('THRESHOLD=')&&line.includes('ATTACK=')&&line.includes('RELEASE=')&&line.includes('HYSTERESIS='));
  assert.ok(!/GAIN=|PANL=|PANR=/.test(line),'hidden VOLUME controls must not describe AUTO-SWELL');
  assert.ok(!result.txt.includes('Auto-Swell ja TYPE pole selle kirjutustoe osa'));
 }
 writePresetOutputs(stem,out,demo);verifyPresetOutputs(stem);
 const report=JSON.parse(fs.readFileSync(stem+'.validation.json')),saved=JSON.stringify(report);
 report.volumePan.states[0].words[0]++;fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));assert.throws(()=>verifyPresetOutputs(stem),/final state/);
 const changed=JSON.parse(JSON.stringify(demo));changed.controls.find(c=>c.block==='volpan').value=5;const b=Buffer.from(JSON.stringify(changed));fs.writeFileSync(stem+'.spec.json',b);const clean=JSON.parse(saved);clean.artifacts['.spec.json']={sha256:sha(b),bytes:b.length};fs.writeFileSync(stem+'.validation.json',JSON.stringify(clean));assert.throws(()=>verifyPresetOutputs(stem),/Volume SYX differs/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert.throws(()=>createPreset(base,{...spec,volumePan:false}),/must be true/);
assert.throws(()=>createPreset(base,{...spec,volumePan:undefined}),/must be true/);
assert.throws(()=>createPreset(base,{...spec,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']}}),/exactly/);
console.log(JSON.stringify({passed:true,autoSwellCases:swell,capturedBodyReconstructed:true,baseInsertions:insertions,rejectedLayouts,parameterWrites:writes,invalidCases:invalid.length,sceneCases:8,independentRawDecoder:true,fourFileTamper:true,newPhysicalScaleMeasurements:0}));
