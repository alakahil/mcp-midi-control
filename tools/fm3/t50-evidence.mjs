// Replay the 2026-11-13 T50 hardware results; no device or MIDI access.
// T50A/B = generator-written modifierTargets[].curve on Filter Frequency (Envelope Follower), Amp Level (LFO 1A) and
// Delay Mix (Scene Controller 1): FM3-Edit dialog values, the user's listening and byte-identical STORE/reload at 427.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,T50,CASES} from './t50-build.mjs';
import {compareT50Session} from './t50-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/t50-20261113');
const {CURVE_CONFIRMED_TARGETS}=await import(path.join(E,'scripts/fm3-modifier-targets.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
const shownOf={startPercent:'start',midPercent:'mid',endPercent:'end',slopePercent:'slope',scale:'scale',offsetPercent:'offset',attackMs:'attack',releaseMs:'release'};
const num=s=>parseFloat(s);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t50-ev-'));
try {
 build(path.join(tmp,'pack'));
 const rs=compareT50Session(path.join(tmp,'pack'),D);
 assert.deepEqual(rs.map(r=>r.case),CASES);
 for(const r of rs){
  assert.ok(r.completed&&r.dataPassed&&!r.syntheticFixture,r.case);
  assert.ok(r.bodyByteIdentical&&!r.reordered,r.case+' stored body byte-identical');
  for(const side of ['before','after'])assert.ok(r.observations[side].behavior==='jah'&&r.observations[side].name_grid_scenes==='jah',r.case+' '+side);
 }
 const targets=CASES.flatMap(c=>T50[c].targets.map(t=>({case:c,...t})));
 assert.equal(display.dialogs.length,targets.length);
 targets.forEach((t,i)=>{const d=display.dialogs[i];
  assert.equal(d.case,t.case);assert.equal(d.source,t.source);assert.equal(d.channel,'All');
  assert.equal(num(d.min),t.min);assert.equal(num(d.max),t.max);
  for(const [k,v] of Object.entries(t.curve))assert.ok(Math.abs(num(d.shown[shownOf[k]])-v)<=0.15,`${t.case} ${t.param} ${k}`);
  assert.equal(sha(fs.readFileSync(path.join(D,d.file))),d.sha256,d.file);
  assert.ok(CURVE_CONFIRMED_TARGETS[t.param],t.param+' marked curve-confirmed');});
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-13',generatedPresetVersion:'0.3.69',
  scope:'T50A-B from tools/fm3/t50-build.mjs: modifierTargets[].curve on Filter Frequency, Amp Level and Delay Mix. Actual user LOAD/GET and STORE/reload captures at location 427, user listening answers and FM3-Edit modifier dialogs read by Claude; this replay performs no device I/O.',
  cases:rs.map(r=>({case:r.case,completed:r.completed,dataPassed:r.dataPassed,storedBodyByteIdentical:r.bodyByteIdentical,reordered:r.reordered,resultSha256:r.resultSha256??null,observations:r.observations})),
  targets:targets.map(({case:c,source,block,param,min,max,curve})=>({case:c,source,block,param,min,max,curve})),
  display,curveConfirmedTargets:CURVE_CONFIRMED_TARGETS,
  findings:'The written curve and timing fields show in FM3-Edit as generated (Release 250 ms shows 249.9 ms), the auto-wah, tremolo and per-scene Delay Mix sound as intended and both presets store byte-identically. The curve codec stepped on the Volume record (T12) holds on these three targets.',
  sources,
  limitations:['Listening is the user\'s judgement.','Three targets and the named fields only; other targets stay formula-derived.','Auto-Engage, Off Value and secondary sources are not written.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-t50-20261113.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'T50 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:rs.length,bodyByteIdentical:rs.length,curveTargets:targets.length,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
