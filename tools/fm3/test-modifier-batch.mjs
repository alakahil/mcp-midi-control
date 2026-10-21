// Synthetic test inputs never become hardware evidence or authored presets.
// The explicitly identified batch-A fixture is one user-provided joint capture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {plan,baselineUrl,compareBatchCapture} from './compare-modifier-batch.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
const base=fs.readFileSync(baselineUrl),parsed=inspectStructure(base);
function synthetic(change,headerChange=()=>{}){
 const b=Buffer.from(parsed.raw.body);change(b);const h=Buffer.from(parsed.raw.rawPatch);headerChange(h);return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(h,b)));
}
const changeAll=b=>plan.fields.forEach((f,i)=>b.writeUInt16LE(1000+1111*i,f.offset));
function check(bytes){
 const before=Buffer.from(base),after=Buffer.from(bytes),r=compareBatchCapture(before,after);assert.deepEqual(before,base);assert.deepEqual(after,bytes);
 for(const k of ['writeAuthorized','deviceIO','presetWritten'])assert.equal(r[k],false);
 assert.ok(Object.values(r.evidence).every(v=>v===false));assert.equal(r.reviewRequired,true);
 for(const f of r.fields??[]){assert.equal(f.actualDisplay,null);assert.equal(f.encodingVerified,false);}
 return r;
}
test('ten distinct synthetic changes are one unreviewed batch, never ten experiments',()=>{
 const r=check(synthetic(changeAll));assert.equal(r.fileComparisonPassed,true);assert.equal(r.status,'batch-awaiting-display-review');assert.equal(r.changedFields.length,10);assert.deepEqual(r.missingRequestedChanges,[]);assert.equal(r.bodyChanges.length,20);
});
test('each selected word is reported separately, including actual missing changes',()=>{
 for(const f of plan.fields){const r=check(synthetic(b=>b.writeUInt16LE(12345,f.offset)));assert.equal(r.status,'partial-batch-awaiting-display-review');assert.deepEqual(r.changedFields,[f.name]);assert.equal(r.missingRequestedChanges.length,9);}
});
test('raw extremes remain observations, not accepted codecs',()=>{
 for(const value of [0,1,65534,65535]){const r=check(synthetic(b=>{changeAll(b);b.writeUInt16LE(value,1588);}));assert.equal(r.fileComparisonPassed,true);assert.equal(r.fields.find(x=>x.word===2).afterRaw,value);}
});
test('unselected words, other records, scene and effect data fail closed',()=>{
 const selected=new Set(plan.fields.map(f=>f.word));
 const offsets=[...Array.from({length:25},(_,i)=>i).filter(i=>!selected.has(i)).map(i=>1584+i*2),0,1680,4609,14221];
 for(const offset of offsets){const r=check(synthetic(b=>{changeAll(b);b[offset]^=1;}));assert.equal(r.fileComparisonPassed,false,'offset '+offset);assert.ok(['collateral-changes','invalid-preset'].includes(r.status));}
});
test('renamed preset is a collateral change',()=>assert.equal(check(synthetic(changeAll,h=>h[8]^=1)).status,'collateral-changes'));
test('baseline is not another observation and wrong baseline is rejected',()=>{
 assert.equal(check(base).status,'no-field-change');assert.equal(compareBatchCapture(Buffer.alloc(0),base).status,'wrong-baseline');
});
test('corrupted and truncated dumps fail closed',()=>{
 assert.equal(check(base.subarray(0,base.length-1)).status,'invalid-preset');const bad=Buffer.from(base);bad[100]^=1;assert.equal(check(bad).status,'invalid-preset');
});
test('CLI only reads input and emits JSON',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-batch-'));
 try{const input=path.join(dir,'synthetic.syx'),bytes=synthetic(changeAll);fs.writeFileSync(input,bytes);
 const r=spawnSync(process.execPath,[new URL('./compare-modifier-batch.mjs',import.meta.url).pathname,input],{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).evidence.singleFieldIsolation,false);assert.deepEqual(fs.readdirSync(dir),['synthetic.syx']);assert.deepEqual(fs.readFileSync(input),bytes);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const evidenceUrl=new URL('../../docs/fm3/parameter-evidence/',import.meta.url);
const observed=fs.readFileSync(new URL('captures/FM3_MOD_BATCH_A_export.syx',evidenceUrl));
const reviewed=JSON.parse(fs.readFileSync(new URL('modifier-batch-a-evidence.json',evidenceUrl)));
const planB=JSON.parse(fs.readFileSync(new URL('modifier-batch-b-plan.json',evidenceUrl)));
test('actual batch A replays the retained comparison without promoting screenshot or codec claims',()=>{
 const r=check(observed);
 assert.deepEqual(r,JSON.parse(fs.readFileSync(new URL('modifier-batch-a-comparison.json',evidenceUrl))));
 assert.equal(r.candidateSha256,'7377e1494af98b181fc0557f3d66e57c532693bc2332a2212a2cbe4feb730ecb');
 assert.equal(r.body.afterSha256,'06c3ba9920c8e3d26186cb0e4cec42f11011b7a9cd00e4366b84578809ef0ea8');
 assert.deepEqual(r.fields.map(f=>[f.name,f.afterRaw]),[['MOD_MAX',49159],['MOD_STARTPT',6553],['MOD_MIDPT',26214],['MOD_ENDPT',58981],['MOD_SLOPE',39320],['MOD_ATTACK',655],['MOD_RELEASE',1638],['MOD_SCALE',38537],['MOD_OFFSET',29490],['MOD_OFFVAL',10922]]);
 assert.deepEqual(reviewed.fields.map(f=>[f.name,f.afterRaw]),r.fields.map(f=>[f.name,f.afterRaw]));
 assert.equal(reviewed.evidence.newDeviceCaptures,1);assert.equal(reviewed.evidence.jointFieldObservations,10);
 assert.equal(reviewed.evidence.singleFieldIsolation,false);assert.equal(reviewed.evidence.authoringEnabled,false);
 assert.equal(reviewed.fields.find(f=>f.name==='MOD_ATTACK').actualDisplay,99.9);
 assert.equal(reviewed.discrepancies[0].userReportedDisplay,9.99);assert.equal(reviewed.discrepancies[0].userCorrectionConfirmed,false);
 assert.equal(reviewed.fields.find(f=>f.name==='MOD_RELEASE').actualDisplay,249.9);
});
function syntheticB(){
 const p=inspectStructure(observed),body=Buffer.from(p.raw.body);changeAll(body);
 return Buffer.from(reencodeDumpFromRawPatch(observed,reencodeRawPatch(p.raw.rawPatch,body)));
}
test('batch B is pinned to actual A and preserves the actual screenshot baseline values',()=>{
 assert.equal(planB.baseline.sha256,createHash('sha256').update(observed).digest('hex'));
 assert.deepEqual(planB.fields.map(f=>f.baselineDisplay),reviewed.fields.map(f=>f.actualDisplay));
 assert.equal(compareBatchCapture(base,syntheticB(),planB).status,'wrong-baseline');
 assert.equal(compareBatchCapture(observed,observed,planB).status,'no-field-change');
 const r=compareBatchCapture(observed,syntheticB(),planB);
 assert.equal(r.fileComparisonPassed,true);assert.equal(r.changedFields.length,10);assert.deepEqual(r.unrelatedBodyChanges,[]);
 assert.ok(Object.values(r.evidence).every(v=>v===false));
});
test('CLI accepts an explicit B plan without writing or promoting synthetic B to device evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-batch-b-'));
 try{
  const input=path.join(dir,'synthetic.syx'),bytes=syntheticB();fs.writeFileSync(input,bytes);
  const r=spawnSync(process.execPath,[new URL('./compare-modifier-batch.mjs',import.meta.url).pathname,'--plan',new URL('modifier-batch-b-plan.json',evidenceUrl).pathname,input],{cwd:dir,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);
  assert.equal(result.baselineSha256,reviewed.capture.sha256);assert.equal(result.evidence.displayValuesVerified,false);
  assert.deepEqual(fs.readdirSync(dir),['synthetic.syx']);assert.deepEqual(fs.readFileSync(input),bytes);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const observedB=fs.readFileSync(new URL('captures/FM3_MOD_BATCH_B_export.syx',evidenceUrl));
const reviewedB=JSON.parse(fs.readFileSync(new URL('modifier-batch-b-evidence.json',evidenceUrl)));
const maxPlan=JSON.parse(fs.readFileSync(new URL('modifier-max-5-plan.json',evidenceUrl)));
test('actual B has nine new points and unchanged Max, never a captured Max 5.00',()=>{
 const r=compareBatchCapture(observed,observedB,planB);
 assert.deepEqual(r,JSON.parse(fs.readFileSync(new URL('modifier-batch-b-comparison.json',evidenceUrl))));
 assert.equal(r.candidateSha256,'c6d460678803699e245ac7d13e777afd6993efc0e704508e4ac1995e77fe1b63');
 assert.equal(r.status,'partial-batch-awaiting-display-review');assert.equal(r.fileComparisonPassed,true);
 assert.deepEqual(r.missingRequestedChanges,['MOD_MAX']);assert.equal(r.changedFields.length,9);assert.equal(r.bodyChanges.length,17);
 assert.deepEqual(r.fields.map(f=>f.afterRaw),[49159,13107,36044,52427,22937,3277,6553,28673,37682,54612]);
 assert.deepEqual(reviewedB.fields.map(f=>[f.name,f.afterRaw]),r.fields.map(f=>[f.name,f.afterRaw]));
 assert.equal(reviewedB.fields.find(f=>f.name==='MOD_MAX').actualDisplay,7.5);
 assert.equal(reviewedB.fields.find(f=>f.name==='MOD_ATTACK').actualDisplay,500);
 assert.equal(reviewedB.fields.find(f=>f.name==='MOD_RELEASE').actualDisplay,999.9);
 assert.equal(reviewedB.evidence.newJointFieldObservations,9);assert.equal(reviewedB.evidence.singleFieldIsolation,false);
 assert.equal(reviewedB.integrity.completeRequestedBatch,false);assert.equal(reviewedB.evidence.authoringEnabled,false);
});
test('targeted Max completion pins B and rejects another baseline or any collateral B-field edit',()=>{
 assert.equal(maxPlan.baseline.sha256,createHash('sha256').update(observedB).digest('hex'));
 assert.deepEqual(maxPlan.fields.map(f=>f.name),['MOD_MAX']);
 const p=inspectStructure(observedB);
 const make=extra=>{const b=Buffer.from(p.raw.body);b.writeUInt16LE(32123,1588);if(extra)b[1598]^=1;return Buffer.from(reencodeDumpFromRawPatch(observedB,reencodeRawPatch(p.raw.rawPatch,b)));};
 assert.equal(compareBatchCapture(observed,make(false),maxPlan).status,'wrong-baseline');
 const r=compareBatchCapture(observedB,make(false),maxPlan);
 assert.equal(r.status,'batch-awaiting-display-review');assert.deepEqual(r.changedFields,['MOD_MAX']);
 assert.ok(Object.values(r.evidence).every(v=>v===false));
 assert.equal(compareBatchCapture(observedB,make(true),maxPlan).status,'collateral-changes');
});
test('actual Max completion changes only the measured word to 32784',()=>{
 const bytes=fs.readFileSync(new URL('captures/FM3_MOD_MAX_5p00_export.syx',evidenceUrl));
 const r=compareBatchCapture(observedB,bytes,maxPlan);
 assert.deepEqual(r,JSON.parse(fs.readFileSync(new URL('modifier-max-5-comparison.json',evidenceUrl))));
 assert.equal(r.candidateSha256,'f4f632c005540a3f759a3960837aef70dc1e562bdb060e7671e8ebe3d1ea285f');
 assert.equal(r.fileComparisonPassed,true);assert.deepEqual(r.changedFields,['MOD_MAX']);assert.equal(r.bodyChanges.length,2);
 assert.equal(r.fields[0].afterRaw,32784);assert.deepEqual(r.missingRequestedChanges,[]);
 const review=JSON.parse(fs.readFileSync(new URL('modifier-max-5-evidence.json',evidenceUrl)));
 assert.equal(review.evidence.singleFieldIsolation,true);assert.equal(review.evidence.fullRangeCodecVerified,false);
 assert.equal(review.fields.find(f=>f.name==='MOD_MAX').actualDisplay,5);
});
