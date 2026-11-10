// Replay the four accepted hardware results; no device or MIDI access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from './audit-targets-build.mjs';
import {compareAuditSession} from './audit-targets-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/b1-b2-20261110');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(path.join(D,f)));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-b1-b2-'));
try {
 build(tmp);
 const comparisons=compareAuditSession(tmp,D);
 assert.deepEqual(comparisons.map(r=>r.case),['B1A','B1B','B1C','B2']);
 const targets=[['Scene Controller 1','0, 100, ALL'],['LFO1A','300.0 Hz, 3000.0 Hz, ALL'],['External 1','2.00, 8.00, ALL'],['Scene Controller 1','10, 60, D']];
 for (const [i,r] of comparisons.entries()) {
  assert.ok(r.dataPassed&&r.bodyByteIdentical&&!r.reordered&&!r.syntheticFixture);
  assert.deepEqual(r.selectedScene,{expected:1,stored:1});
  assert.deepEqual(r.missingObservations,[]);
  for(const obs of [r.observations.before,r.observations.after]) {
   assert.match(obs.name_grid_scenes,/^(jah|j)$/i);
   assert.match(obs.behavior,/^jah$/i);
   assert.equal(obs.source.replaceAll(' ',''),targets[i][0].replaceAll(' ',''));
   assert.equal(obs.minmax_channel,targets[i][1]);
   if(r.case==='B1A')assert.equal(obs.tempo,'97');
   if(r.case==='B2'){assert.equal(obs.tempo,'143');assert.equal(obs.cs2,'jah');}
  }
 }
 const display=read('display-confirmation.json');
 assert.equal(display.rateHz,0.5);assert.equal(display.depthPercent,100);assert.equal(display.type,'Sine');
 assert.equal(sha(fs.readFileSync(path.join(D,display.screenshot))),display.screenshotSha256);
 const cpu=read('cpu-correction.json');
 assert.deepEqual(cpu.correctedCpuPercentByScene.map(s=>[s.scene,s.min,s.max]),[[1,44.5,44.5],[2,44.5,44.5],[3,44.5,44.5],[4,44.5,44.6]]);
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-10',generatedPresetVersion:'0.3.62',
  scope:'Four named public-generator presets only. Actual user LOAD/GET and STORE/reload captures, observations and LFO screenshot; this replay performs no device I/O.',
  cases:comparisons.map(r=>({case:r.case,deviceImport:'confirmed',display:'confirmed',audibleBehavior:'confirmed',storeReload:'confirmed',storedBodyByteIdentical:r.bodyByteIdentical,selectedScene:r.selectedScene,records:r.records,resultSha256:r.resultSha256,observations:r.observations,expected:r.expected})),
  lfo1Display:display,cpuCorrection:cpu,sources,
  limitations:['CPU correction has no separate before/after phase attribution.','No numerical audio/period measurement; behavior is user-confirmed.','No generalization to all modifier targets, channel combinations, new presets or CPU limits.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-b1-b2-20261110.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'B1/B2 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:4,bodyByteIdentical:4,lfo1DisplayConfirmed:true,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
