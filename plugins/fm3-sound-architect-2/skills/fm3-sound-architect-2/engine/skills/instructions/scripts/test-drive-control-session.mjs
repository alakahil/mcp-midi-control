import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {compare} from './drive-control-collector/control-check.mjs';import {pair} from './drive-control-collector/drive-check.mjs';
const root=fileURLToPath(new URL('../references/drive-controls-20261006-123230/',import.meta.url));
const plan=JSON.parse(fs.readFileSync(new URL('./drive-control-collector/plan.json',import.meta.url)));
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'plan.json'))),plan);
let previous=fs.readFileSync(new URL('./drive-control-collector/baseline.syx',import.meta.url)),index=0;
const results=[],historicalFailures=[];
for(const name of fs.readdirSync(root).filter(n=>n.startsWith('step-')).sort()){
 const folder=path.join(root,name),r=JSON.parse(fs.readFileSync(path.join(folder,'result.json')));
 if(r.status==='failed'){historicalFailures.push({folder:name,index:r.index,error:r.error});continue;}
 assert.equal(r.index,index);assert.deepEqual(r.step,plan[index]);
 if(r.status==='skipped'){assert.equal(plan[index].kind,'control');assert.ok(r.reason);results.push({index,step:plan[index].id,status:'skipped',reason:r.reason});}
 else{
 assert.equal(r.status,'passed');assert.equal(r.displayConfirmed,true);
 const bytes=fs.readFileSync(path.join(folder,'donor.syx')),comparison=compare(previous,bytes,index),proof=pair(folder);
 results.push({index,step:plan[index].id,status:'passed',folder:name,comparison,proof});previous=bytes;
 }index++;
}
assert.equal(index,21);assert.equal(results.filter(r=>r.status==='passed').length,18);
const observations=results.flatMap(r=>r.comparison?.observation?[r.comparison.observation]:[]);
assert.equal(observations.length,13);assert.ok(observations.every(x=>x.matchesCandidate));
const report={date:'2026-10-06',session:'FM3_DRIVE_CONTROLS_20261006T123230_71801ce0.zip',plannedSteps:21,verifiedPairs:18,isolatedControlChanges:13,skipped:3,historicalFailures,results,limitations:['Four type/channel specimens only; not hardware import validation of a general writer','BB Pre Tone and Rat Distortion Tone absent per user; do not map other controls to Tone','Rat Distortion Drive2 skipped because already same: no isolated change evidence','No sound assessment']};
fs.writeFileSync(new URL('../../../docs/FM3_DRIVE_CONTROL_SESSION_123230.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('PASS: 18 independently revalidated GET/SYX pairs, 13 isolated controls, 3 documented skips; 21/21 steps complete.');
