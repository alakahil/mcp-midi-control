import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectStructure} from './runtime/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {scanRecords, describeRows} from './runtime/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
import {finalSoundState} from './runtime/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-final-state.mjs';
import {readModifiers} from './runtime/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-parameter-dependencies.mjs';

const root=new URL('./',import.meta.url);
const engine=new URL('./runtime/skills/fm3-sound-architect-2/engine/skills/instructions/',root);
const read=p=>fs.readFileSync(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const basePath=new URL('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',engine);
const base=fs.readFileSync(basePath), final=read('DAILY_VOLUME.syx');
const before=Buffer.from(inspectStructure(base).raw.body), after=Buffer.from(inspectStructure(final).raw.body);
const a=scanRecords(before), b=scanRecords(after);
const baseState=finalSoundState(base,[]), report=JSON.parse(read('DAILY_VOLUME.validation.json'));
const finalState=finalSoundState(final,report.controls);
assert.equal(sha(base),'afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c');
assert.equal(finalState.name,'DAILY VOLUME');
assert.equal(finalState.selectedScene,baseState.selectedScene);
const preservedRecords=[];
for(const old of a.records){
 const current=b.records.find(r=>r.eid===old.eid);
 assert.ok(current,`Missing existing record ${old.family}`);
 assert.equal(current.size,old.size);
 const left=before.subarray(old.header,old.header+old.size);
 const right=after.subarray(current.header,current.header+current.size);
 if(old.family==='in1'){
  const changedWords=[0,5].map(pid=>old.start-old.header+pid*2);
  const allowed=new Set(changedWords.flatMap(n=>[n,n+1]));
  for(let i=0;i<left.length;i++)if(!allowed.has(i))assert.equal(right[i],left[i],`Unexpected Input record change ${i}`);
 }else{
  assert.deepEqual(right,left,`${old.family} record changed`);
  preservedRecords.push({block:old.family,effectId:old.eid,bytes:left.length,sha256:sha(left)});
 }
}
assert.equal(b.records.length,a.records.length+1);
assert.equal(b.records.filter(r=>r.eid===102).length,1);
assert.deepEqual(after.subarray(b.tail),before.subarray(a.tail),'System tail changed');
const policy=JSON.parse(fs.readFileSync(new URL('references/fm3-parameter-dependencies.json',engine)));
const modifierLayout=policy.modifiers.layout;
const beforeModifiers=before.subarray(modifierLayout.header,modifierLayout.end);
const afterModifiers=after.subarray(modifierLayout.header,modifierLayout.end);
assert.deepEqual(afterModifiers,beforeModifiers,'Modifier record bytes changed');
assert.equal(readModifiers(after).filter(m=>m.active).length,0);
for(let i=0;i<8;i++){
 const expected={scene:i+1,channel:i===1?'B':'A',bypassRaw:i<2?0:1};
 assert.deepEqual(finalState.volumePan.scenes[i],expected);
 assert.equal(finalState.scenes[i].name,baseState.scenes[i].name);
 for(const [block,state] of Object.entries(baseState.scenes[i].blocks)){
  assert.deepEqual(finalState.scenes[i].blocks[block],state,`Existing scene ${i+1}/${block} changed`);
 }
}
const expectedControls=[['volpan','A','VOLUME_GAIN',6],['volpan','B','VOLUME_GAIN',8],['in1','A','INPUT_THRESH',-65],['in1','A','INPUT_LEVEL',-3]];
assert.equal(finalState.controls.length,expectedControls.length);
for(const [block,channel,name,value] of expectedControls){
 const p=finalState.controls.find(x=>x.block===block&&x.channel===channel&&x.name===name);
 assert.ok(p);assert.equal(p.value,value);assert.ok(Math.abs(p.display-value)<0.001,`${name} quantization exceeds 0.001`);
 assert.equal(p.dependencies.mode,'stored');
}
const rows=describeRows(after);
assert.deepEqual(rows,report.signalRows);
const inputDiff=[];
const inputBefore=a.records.find(r=>r.family==='in1'), inputAfter=b.records.find(r=>r.family==='in1');
for(let i=0;i<inputBefore.words*inputBefore.channels;i++){
 const old=before.readUInt16LE(inputBefore.start+i*2), current=after.readUInt16LE(inputAfter.start+i*2);
 if(old!==current)inputDiff.push({channel:'ABCD'[Math.floor(i/inputBefore.words)],pid:i%inputBefore.words,before:old,after:current});
}
assert.deepEqual(inputDiff.map(x=>[x.channel,x.pid]),[['A',0],['A',5]]);
const result={
 passed:true,scope:'Independent comparison of decoded base and generated output using the verified 0.3.15 decoder',
 base:{path:fileURLToPath(basePath),sha256:sha(base)},output:{path:fileURLToPath(new URL('DAILY_VOLUME.syx',root)),sha256:sha(final)},
 name:finalState.name,selectedScene:finalState.selectedScene,
 ampCabEntireRecordsByteIdentical:true,preservedRecords,
 existingScenesAndNamesPreserved:true,volumeScenes:finalState.volumePan.scenes,signalRows:rows,
 controls:finalState.controls.map(p=>({block:p.block,channel:p.channel,name:p.name,requested:p.value,decoded:p.display,raw:p.raw,unit:p.unit})),
 inputChangesOnlyRequestedWords:inputDiff,
 modifierBytes:{preserved:true,bytes:beforeModifiers.length,sha256:sha(beforeModifiers),activeBindings:0},
 systemTailPreserved:true,deviceIO:false,hardwareImportTested:false,audioTested:false,cpuMeasured:false
};
fs.writeFileSync(new URL('preservation-audit.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,ampCabEntireRecordsByteIdentical:true,modifierBytesPreserved:true,activeBindings:0,volumeScenes:result.volumeScenes}));
