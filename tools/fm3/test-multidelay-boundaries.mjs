// All Type/channel images and public tempo/type boundaries. Software checks, no new device evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const imp=f=>import(path.join(E,'scripts',f+'.mjs'));
const {insertBlocks}=await imp('fm3-insert-blocks');
const {applyMultidelayTypes,MULTIDELAY_TYPE_LABELS,multidelayType}=await imp('fm3-multidelay-types');
const {inspectStructure}=await imp('drive-collector/fm3-prototype');
const {scanRecords}=await imp('fm3-layout');
const {composeSound}=await imp('fm3-sound');
const {insertTempoLocks}=await imp('fm3-insert-tempo');
const {findParam,decodeValue,encodeValue}=await imp('fm3-table-encoder');
const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const body=x=>Buffer.from(inspectStructure(x).raw.body),plain=insertBlocks(base,['multidelay']).syx,original=body(plain);
const record=b=>scanRecords(b).records.find(r=>r.eid===74),at=(b,c,p=0)=>record(b).start+2*('ABCD'.indexOf(c)*121+p);
const words=(b,c)=>Array.from({length:121},(_,i)=>b.readUInt16LE(at(b,c,i)));
let imageChecks=0,resetChecks=0,refused=0;
for(const type of MULTIDELAY_TYPE_LABELS){
 for(const c of 'ABCD'){
  const result=body(applyMultidelayTypes(plain,[{channel:c,type}]).syx),start=at(result,c);
  assert.deepEqual(words(result,c),multidelayType(type).words,`${type} ${c}`);
  assert.ok(result.subarray(0,start).equals(original.subarray(0,start))&&result.subarray(start+242).equals(original.subarray(start+242)),`${type} ${c}: outside channel preserved`);imageChecks++;
 }
 const nondefault=applyMultidelayTypes(plain,[{channel:'B',type:'Pealing Bells'}]).syx;
 const reset=applyMultidelayTypes(nondefault,[{channel:'B',type}]).syx;
 assert.deepEqual(words(body(reset),'B'),multidelayType(type).words);resetChecks++;
}
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'MD BOUNDARY',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const spec=(type,controls,channel='A')=>({composer,insert:['multidelay'],selectedScene:1,allow:['enum-labels'],
 layout:{row2:['compressor','drive','amp','cab'],row3:['delay','multidelay','reverb']},multidelayTypes:[{channel,type}],controls});
const ctrl=(param,value,channel='A')=>({block:'multidelay',channel,param,value});
const locks=insertTempoLocks.filter(r=>r.effectId===74);assert.equal(locks.length,7);
const tempoCases=[];
for(const lock of locks){
 const p=findParam('multidelay',lock.target),value=decodeValue(p,32767);assert.ok(Number.isFinite(value),lock.target);
 const none=lock.labels[lock.noneRaw].trim(),sync=lock.labels.find((l,i)=>i!==lock.noneRaw&&l.trim()==='1/4')?.trim();assert.ok(sync);
 let picked=null;
 for(const type of MULTIDELAY_TYPE_LABELS){
  try{composeSound(base,spec(type,[ctrl(lock.tempo,none),ctrl(lock.target,value)]));picked=type;break;}
  catch(e){if(!/not applicable|not writable|Unsupported|not exposed|not visible/.test(e.message))throw e;}
 }
 assert.ok(picked,lock.target+' has a writable template');
 const both=[ctrl(lock.tempo,none),ctrl(lock.target,value)];
 for(const order of [both,[...both].reverse()]){
  const b=body(composeSound(base,spec(picked,order)).syx);
  assert.equal(b.readUInt16LE(at(b,'A',lock.tempoPid)),lock.noneRaw);
  assert.equal(b.readUInt16LE(at(b,'A',lock.targetPid)),encodeValue(p,value));
 }
 assert.throws(()=>composeSound(base,spec(picked,[ctrl(lock.tempo,sync),ctrl(lock.target,value)])),/tempo-controlled/);refused++;
 // Clearing channel B must not unlock the same parameter on channel A.
 assert.throws(()=>composeSound(base,spec(picked,[ctrl(lock.tempo,sync),ctrl(lock.tempo,none,'B'),ctrl(lock.target,value)])),/tempo-controlled/);refused++;
 tempoCases.push({target:lock.target,tempo:lock.tempo,type:picked,value,manualBothOrders:true,synchronizedRejected:true,wrongChannelUnlockRejected:true});
}
// Explicit allow must not unlock a selector-only fill or change a templated Algorithm.
assert.throws(()=>composeSound(base,spec('Pealing Bells',[ctrl('MULTITAP_PRESETS','Dub Echo')])),/preset selection|not writable/);refused++;
assert.throws(()=>composeSound(base,spec('Pealing Bells',[ctrl('MULTITAP_BASETYPE','Quad-Tap Delay')])),/Algorithm changed/);refused++;
assert.throws(()=>composeSound(base,spec('Quad-Tap Delay',[ctrl('MULTITAP_RINGFREQ1',100)])),/not applicable/);refused++;
const out={passed:true,typeChannelImages:imageChecks,nonDefaultSoftwareResets:resetChecks,tempoCases,rejected:refused,
 scope:'Software template replacement and bounded public dependencies; not FM3-Edit non-default Type fill, new audio or STORE evidence.',deviceIO:false,newHardwareMeasurements:false};
assert.equal(imageChecks,156);assert.equal(resetChecks,39);
const file=path.join(ROOT,'docs/fm3/parameter-evidence/multidelay-boundaries.json');
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');else assert.deepEqual(JSON.parse(fs.readFileSync(file)),out,'MultiDelay boundary result stale');
console.log(JSON.stringify(out));
