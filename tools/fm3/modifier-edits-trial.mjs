#!/usr/bin/env node
// Build/compare a new device-test quartet. No MIDI, import, STORE or device I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assertHistoricalRuntime} from './historical-runtime.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {context}=await imp('scripts/fm3-p3-modifier-reuse.mjs');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function trialSpec(){
 const s=structuredClone(context().seedSpec);
 s.composer.name='FM3 MOD EDITS D';
 s.composer.scenes.forEach((scene,i)=>{
  scene.name=['A CS2 OFF','D CS2 OFF','D CS2 ON','A CS2 ON'][i%4];
  scene.blocks.amp.channel=[1,2].includes(i%4)?'D':'A';
 });
 s.controlSwitchScenes=s.controlSwitchScenes.map(x=>({...x,state:x.switch===2&&[2,3].includes((x.scene-1)%4)?'ON':'OFF'}));
 s.modifierEdits=[
  {operation:'remove',record:2,expect:{source:'Control Switch 2',block:'amp',param:'DISTORT_BOOST'}},
  {operation:'replace',record:1,expect:{source:'External 1',block:'volpan',param:'VOLUME_GAIN'},binding:{switch:2,block:'amp',param:'DISTORT_CUT',invert:true,channel:'D'}}
 ];
 // Static Cut is explicit on A only; the new modifier owns D.
 s.allow=['enum-labels'];s.controls=[{block:'amp',channel:'A',param:'DISTORT_CUT',value:'OFF'}];
 return s;
}
export function buildTrial(stem){
 assertHistoricalRuntime();
 const spec=trialSpec(),base=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
 const result=createPreset(base,spec);writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);
 return {passed:true,outputSha256:sha(result.syx),deviceIO:false,hardwareVerified:false};
}
export function compareBodies(expectedSyx,exportSyx){
 const decoded=[expectedSyx,exportSyx].map(b=>inspectStructure(b));
 decoded.forEach(d=>assert.equal(d.raw.crcValid,true,'CRC'));
 const [a,b]=decoded.map(d=>Buffer.from(d.raw.body));assert.equal(a.length,b.length,'body size');
 const [ar,br]=[a,b].map(scanRecords);
 assert.equal(ar.records.length,br.records.length,'block count');
 assert.equal(new Set(br.records.map(r=>r.eid)).size,br.records.length,'duplicate block');
 // Selected scene must be 1 again before export; no silent byte exceptions.
 assert.deepEqual(b.subarray(0,br.records[0].header),a.subarray(0,ar.records[0].header),'prefix / modifiers / selected scene');
 assert.deepEqual(b.subarray(br.tail),a.subarray(ar.tail),'system tail');
 const reordered=[];
 for(const [i,r] of ar.records.entries()){
  const j=br.records.findIndex(x=>x.eid===r.eid);assert.ok(j>=0,'missing block');const s=br.records[j];
  assert.equal(s.size,r.size,'block size');
  assert.deepEqual(b.subarray(s.header,s.header+s.size),a.subarray(r.header,r.header+r.size),'block bytes '+r.eid);
  if(i!==j)reordered.push({effectId:r.eid,generatedIndex:i,exportIndex:j});
 }
 return {passed:true,comparisonOnly:true,deviceIO:false,exportSha256:sha(exportSyx),bodyByteIdentical:a.equals(b),
  allRecordBytesPreserved:true,modifierRegionIdentical:true,reorderedBlocks:reordered,humanChecks:'must be supplied separately'};
}
export function compareTrial(stem,file){
 verifyPresetOutputs(stem);
 assert.deepEqual(JSON.parse(fs.readFileSync(stem+'.spec.json')),trialSpec(),'trial spec differs');
 return compareBodies(fs.readFileSync(stem+'.syx'),fs.readFileSync(file));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,stem,file,...extra]=process.argv.slice(2);assert.ok(stem&&!extra.length,'Usage: modifier-edits-trial.mjs build STEM | compare STEM EXPORT.syx');
 assert.ok(mode==='build'&&!file||mode==='compare'&&file,'invalid arguments');
 console.log(JSON.stringify(mode==='build'?buildTrial(stem):compareTrial(stem,file),null,2));
}
