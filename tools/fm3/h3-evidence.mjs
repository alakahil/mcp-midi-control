// Replay the H3 final-preset device check (10.11.2026); no device or MIDI access.
// V1 LIVE KOOSLUS V1 and V4 SATCH SOAP ON A ROPE V4 were each loaded, read back, played in all 8 scenes, stored to 427,
// reloaded and read with the stored-dump request. V4 was accepted as the final performance preset; V1 needs level work.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,PINNED} from './h3-final-build.mjs';
import {compareH3Session} from './h3-final-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/h3-20261110');
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h3-ev-'));
try{
 build(path.join(tmp,'pack'));
 const comparisons=compareH3Session(path.join(tmp,'pack'),D);
 assert.deepEqual(comparisons.map(r=>r.case),['V1','V4']);
 for(const r of comparisons){
  assert.ok(r.completed&&r.dataPassed&&!r.syntheticFixture,r.case);
  assert.deepEqual(r.selectedScene,{expected:1,stored:1});assert.deepEqual(r.missingObservations,[]);
  const res=JSON.parse(fs.readFileSync(path.join(D,r.case,'bind-store-results.json')));assert.equal(res.shownLocation,427);
  for(const obs of [r.observations.before,r.observations.after])assert.match(obs.name_grid_scenes,/^j(ah)?\b/i);
 }
 const [v1,v4]=comparisons;
 // V1 was built with the pre-0.3.58 append order; FM3 stores its own record order (T38), the data are unchanged.
 assert.ok(v1.reordered&&!v1.bodyByteIdentical&&v1.records===11);
 assert.ok(v4.bodyByteIdentical&&!v4.reordered&&v4.records===10);
 assert.match(v1.observations.before.behavior,/sättima/);
 for(const obs of [v4.observations.before,v4.observations.after]){
  assert.match(obs.behavior,/^jah$/i);for(const k of ['scenes1_4','scenes5_8'])assert.match(obs[k],/Ei ole punases kõik sobib/);
  assert.match(obs.transitions,/Plõsu ei ole/);}
 for(const c of ['V1','V4']){
  const d=display[c];for(const [f,h] of Object.entries(d.screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
  assert.equal(d.cpuBefore.length,8);assert.equal(d.cpuAfter.length,8);assert.equal(d.cpuEstimate.scenes.length,8);
  d.cpuAfter.forEach((x,i)=>assert.ok(Math.abs(x-d.cpuBefore[i])<=0.5,c+' S'+(i+1)+' before/after'));
  d.cpuBefore.forEach((x,i)=>assert.ok(Math.abs(x-d.cpuEstimate.scenes[i])<=1,c+' S'+(i+1)+' estimate'));
 }
 const sources={};
 (function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}})(D);
 const range=a=>[Math.min(...a),Math.max(...a)];
 const report={schemaVersion:1,date:'2026-11-10',test:'H3',generatedPresetVersion:'0.3.64',
  scope:'Audit H3 final performance preset check: two candidate files from tools/fm3/h3-final-build.mjs, each loaded, read back, played with real guitar in all 8 scenes, stored by the user to 427, reloaded and read back. This replay performs no device I/O.',
  cases:comparisons.map(r=>({case:r.case,name:display[r.case].name,presetSha256:PINNED[r.case],deviceImport:'confirmed',storeReload:'confirmed',
   storedBodyByteIdentical:r.bodyByteIdentical,reordered:r.reordered,records:r.records,selectedScene:r.selectedScene,resultSha256:r.resultSha256,
   cpuPercent:{before:display[r.case].cpuBefore,after:display[r.case].cpuAfter,estimate:display[r.case].cpuEstimate},
   levelFinding:display[r.case].levelFinding,finalVerdict:display[r.case].finalVerdict,observations:r.observations})),
  findings:{
   final:'V4 SATCH SOAP ON A ROPE V4 is accepted as the final performance preset: stored body byte-identical, no clipping, levels and sound fit in all 8 scenes, scene changes without a click; CPU '+range([...display.V4.cpuBefore,...display.V4.cpuAfter]).join('-')+'%.',
   v1:'V1 LIVE KOOSLUS V1: data preserved after STORE (11 records, device record order), no clipping, clean scene changes; scene levels uneven (lead quietest, clean/Plexi loudest); not accepted as final.',
   cpu:'All 16 scene readings within 1 point of the fm3-cpu 0.2.5 estimate and within 0.5 points before/after STORE.',
   switches:display.switches},
  sources,
  limitations:['Loudness is a user listening judgement; no numerical audio measurement.','Screenshots and CPU are FM3-Edit display, not the front panel.','Scenes were selected with an M-Wave MIDI footswitch for scenes 1-4; the FM3 footswitches and scenes 5-8 by footswitch were not checked.','No generalization to other presets.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-h3-20261110.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'H3 evidence is stale');
 console.log(JSON.stringify({passed:true,cases:2,finalPreset:'V4',v4BodyByteIdentical:true,v1Reordered:true,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
