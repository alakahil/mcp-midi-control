// Replay the H1/H2 audit hardware results and the H4 Preamp NONE readback; no device or MIDI access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from './audit-next-build.mjs';
import {compareNextSession} from './audit-next-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/h1-h2-20261110');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(path.join(D,f)));
const TYPES=['Pealing Bells','Dub Echo','Mono Diffuser','Aurora Delay'];
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h1-h2-'));
try {
 build(path.join(tmp,'pack'));
 const comparisons=compareNextSession(path.join(tmp,'pack'),D);
 assert.deepEqual(comparisons.map(r=>r.case),['H1','H2']);
 for(const r of comparisons){
  assert.ok(r.completed&&r.dataPassed&&r.bodyByteIdentical&&!r.reordered&&!r.syntheticFixture);
  assert.deepEqual(r.selectedScene,{expected:1,stored:1});assert.deepEqual(r.missingObservations,[]);
  for(const obs of [r.observations.before,r.observations.after]){
   assert.match(obs.name_grid_scenes,/^jah\b/i);assert.match(obs.behavior,/^jah\b/i);
   if(r.case==='H1'){
    assert.match(obs.source,/Controller 1$/);assert.equal(obs.minmax_channel,'10.0%, 40.0%, All');
    assert.match(obs.type,/Recording Studio A$/);
    [10,25,40].forEach((m,i)=>assert.match(obs['scene'+(i+1)],new RegExp('Mix '+m+'\\.0%')));
   } else TYPES.forEach((t,i)=>assert.ok(obs['scene'+(i+1)].startsWith(t),t));
  }
 }
 const display=read('display-confirmation.json');
 for(const c of ['H1','H2','H4'])for(const [f,h] of Object.entries(display[c].screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
 assert.equal(display.H1.modifier.source,'Scene Controller 1');assert.equal(display.H1.reverbType,'Room: Recording Studio A');
 assert.deepEqual(display.H1.scenes.map(s=>s.mixPercent),[10,25,40]);
 assert.deepEqual(display.H2.scenes.map(s=>s.type),TYPES);
 assert.equal(display.H4.preampType,'None');assert.equal(display.H4.channel,'B');
 assert.equal(display.H4.presetSha256,'c0aa8221a43ba176ec613e2931e73374d342be2387ebada48069483008397094');
 const load=read(display.H4.loadRecord);assert.equal(load.kind,'fm3-bind-store-load');assert.equal(load.userConfirmedName,true);
 assert.equal(load.packSha256,'bb1471ea8080aa394e358103117b00b073ea6c27a125e4842d105f44fe936c6a','T20 CAB_A manifest');
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-10',generatedPresetVersion:'0.3.64',
  scope:'H1 and H2 audit presets from tools/fm3/audit-next-build.mjs plus the H4 Preamp Type NONE readback of the existing T20 CAB_A preset. Actual user LOAD/GET and STORE/reload captures, user answers and FM3-Edit screenshots; this replay performs no device I/O.',
  cases:comparisons.map(r=>({case:r.case,deviceImport:'confirmed',display:'confirmed',audibleBehavior:'confirmed',storeReload:'confirmed',storedBodyByteIdentical:r.bodyByteIdentical,selectedScene:r.selectedScene,records:r.records,resultSha256:r.resultSha256,observations:r.observations,expected:r.expected})),
  display,
  findings:{
   h1:'Scene Controller 1 -> Reverb Mix 10-40%, ALL, default curve: scenes 1/2/3 show 10/25/40% before and after STORE; CPU 44.4-44.6% (estimate 44.6%).',
   h2:'Pealing Bells, Dub Echo, Mono Diffuser and Aurora Delay on MultiDelay A-D survive STORE/reload byte-identically; these four T36 Types now have STORE confirmation.',
   h4:'Cab channel B Preamp page shows Preamp Type None with block Low/High Cut 87.0 Hz / 7300 Hz.',
   cpuModelGap:'Pealing Bells scene CPU 62.4-62.5% vs fm3-cpu 0.2.5 estimate 51.1% (+11 p.p.); other H1/H2 scenes within 0-3 p.p. Recorded only; model unchanged.'},
  sources,
  limitations:['Sound is a user listening judgement; no numerical audio measurement.','H2 sound was judged before STORE only.','Screenshots are FM3-Edit display, not the front panel.','Scene Controller 1 value itself was not displayed.','No generalization to other targets, Types, channels, presets or CPU limits.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-h1-h2-h4-20261110.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'H1/H2/H4 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:2,bodyByteIdentical:2,preampTypeNoneReadback:true,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
