// Receipt for the 2026-10-28 CPU runs (test T8). Offline.
// T8a: the repository's Satriani V4 example (examples/SATRIANI_SOAP_ON_A_ROPE_V4.syx); the pack is rebuilt
//      with tools/fm3/cpu-scenes-build.mjs and the eight scene readings are compared with the fm3-cpu estimate.
// T8b: one user-owned commercial preset with an Out 2 branch (file and name not in the repository; manifest
//      pinned by hash only). The user removed the Out 2 block and then the two row-4 shunts on the front panel,
//      the meter was read after each step. Nothing was stored.
// Usage: node tools/fm3/cpu-t8-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-28/');
const sha=b=>createHash('sha256').update(b).digest('hex'),r1=x=>Math.round(x*10)/10;
const v4File=path.join(RAW,'fm3-cpu-scenes-v4-20261028-results.json'),o2File=path.join(RAW,'fm3-cpu-steps-out2-20261028-results.json');
const v4=JSON.parse(fs.readFileSync(v4File,'utf8')),o2=JSON.parse(fs.readFileSync(o2File,'utf8'));
const OUT2_MANIFEST_SHA256='2d1e4b67458f98d11d5ff8b2de93dbe5ed36be8d35ae11a69b4529275534fc7f';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t8-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/cpu-scenes-build.mjs'),tmp,path.join(ENG,'examples/SATRIANI_SOAP_ON_A_ROPE_V4.syx')],{stdio:'ignore'});
// The pack was built with fm3-cpu 0.2.1 (before the Out 2 cost this run measured); V4 has no Out 2, so the
// rebuilt manifest differs only in the model name.
const man=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json')));
assert.ok(['fm3-cpu 0.2.1','fm3-cpu 0.2.2'].includes(man.estimate.model));man.estimate.model='fm3-cpu 0.2.1';
assert.equal(sha(JSON.stringify(man,null,1)+'\n'),v4.packSha256,'V4 pack rebuilt identically (as measured)');
assert.ok(v4.userConfirmedName&&String(v4.sceneAfterLoad).trim()==='1');
assert.deepEqual(v4.steps.map(s=>s.scene),[1,2,3,4,5,6,7,8]);
assert.ok(v4.steps.every(s=>/^ok$/i.test(s.userNote.trim())&&s.raw!==null&&s.reads.slice(-3).every(v=>v===s.raw)),'every scene selected and settled');
const scenes=v4.steps.map(s=>({scene:s.scene,estimatePercent:man.estimate.perScene[s.scene-1],measuredPercent:s.cpuPercent,errorPoints:r1(man.estimate.perScene[s.scene-1]-s.cpuPercent)}));
const err=scenes.map(s=>Math.abs(s.errorPoints));
assert.ok(Math.max(...err)<=0.5,'V4 estimate within 0.5 points in every scene');
assert.equal(o2.packSha256,OUT2_MANIFEST_SHA256);assert.ok(o2.userConfirmedName&&String(o2.sceneAfterLoad).trim()==='4');
assert.deepEqual(o2.steps.map(s=>s.id),['remove-out2','remove-row4-shunts']);
const [rm,sh]=o2.steps;
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-28',
  v4:{preset:'examples/SATRIANI_SOAP_ON_A_ROPE_V4.syx (pack rebuilt by tools/fm3/cpu-scenes-build.mjs)',packSha256:v4.packSha256,estimator:man.estimate.model,
    method:'Edit-buffer load (7F 00) with its stored scene 1; the user selected scenes 1..8 on the FM3, the CPU meter (fn=0x01 sub=0x2E) was read after each until three equal values.',
    scenes,summary:{maxAbsErrorPoints:Math.max(...err),meanErrorPoints:r1(scenes.reduce((a,s)=>a+s.errorPoints,0)/8),measuredMax:Math.max(...scenes.map(s=>s.measuredPercent))}},
  out2:{preset:'one user-owned commercial FW13 preset with an Out 2 branch fed from row 3 (file and name not in the repository)',manifestSha256:OUT2_MANIFEST_SHA256,scene:4,
    method:'Edit-buffer load (7F 00); the user removed the Out 2 block (row 4, column 12) on the front panel, then the two row-4 shunts; the meter was read after the load and after each step. Nothing was stored.',
    readings:{afterLoadPercent:o2.afterLoad.cpuPercent,afterRemovingOut2Percent:rm.cpuPercent,afterRemovingShuntsPercent:sh.cpuPercent},
    userNotes:{removeOut2:rm.userNote.trim(),removeShunts:sh.userNote.trim()},
    costPoints:{out2:r1(o2.afterLoad.cpuPercent-rm.cpuPercent),row4Shunts:r1(rm.cpuPercent-sh.cpuPercent)},
    resolution:'The meter reads in whole percent above 64 %: the Out 2 cost is 1 point within ±1.'},
  findings:['V4: the per-scene estimate matches the meter within 0.5 points in all eight scenes (47 / 46.5 / 62.5 / 62.5 / 47 / 47 / 47 / 62.5 measured).',
    'Out 2 costs about 1 point of effects-core CPU; the shunts that feed it cost nothing measurable. This accounts for the 1.0 to 1.5 point under-estimate in the 2026-10-26 run (references/fm3-cpu-scenes-20261026.json), whose preset has an Out 2 branch.',
    'Deleting Out 2 on the front panel leaves a shunt with its cable in its place (user note).'],
  resultsSha256:{v4:sha(fs.readFileSync(v4File)),out2:sha(fs.readFileSync(o2File))}};
const target=path.join(ENG,'references/fm3-cpu-t8-20261028.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T8 CPU receipt stale');
assert.ok(!/'26|\.syx"|Petrucci|LiveGold|IIC/.test(content.replace('SATRIANI_SOAP_ON_A_ROPE_V4.syx','')),'no third-party names');
fs.rmSync(tmp,{recursive:true,force:true});console.log(JSON.stringify({v4:out.v4.summary,out2:out.out2.costPoints}));
