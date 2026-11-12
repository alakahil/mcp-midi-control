// Replay the 2026-11-12 T47 hardware results; no device or MIDI access.
// T47A-C = generator-written per-preset Effect Bypass for Comp 1, Chorus 1, TremPan 1, Pitch 1, Flanger 1, Synth 1, Rotary 1, Reverb 1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,T47,CASES} from './t47-build.mjs';
import {compareT47Session} from './t47-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/t47-20261112');
const {PP_EFFECTS}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t47-ev-'));
try {
 build(path.join(tmp,'pack'));
 const rs=compareT47Session(path.join(tmp,'pack'),D);
 assert.deepEqual(rs.map(r=>r.case),CASES);
 for(const r of rs){
  assert.ok(r.completed&&r.dataPassed&&!r.syntheticFixture,r.case);
  assert.ok(r.bodyByteIdentical&&!r.reordered,r.case+' stored body byte-identical');
  const labels=T47[r.case].effects.map(e=>PP_EFFECTS[e].label);
  assert.deepEqual(display.cases[r.case].cards.map(c=>c.effect),labels,r.case+' FM3-Edit cards');
  for(const side of ['before','after']){
   const sw=r.observations[side].pp_switch;
   labels.forEach((l,i)=>assert.match(sw,new RegExp(`L${i+1} ${l.split(/[ ]/)[0].replace('TremPan','TremPan')}[^,;]* sisse/välja`),`${r.case} ${side} switch ${i+1}`));
   assert.match(sw,/teised plokid ei muutunud/);assert.equal(r.observations[side].behavior,'jah');
  }
  for(const [f,h] of Object.entries(display.cases[r.case].screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
 }
 const confirmed=CASES.flatMap(c=>T47[c].effects);
 for(const e of confirmed)assert.equal(PP_EFFECTS[e].status,'switch-confirmed',e);
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-12',generatedPresetVersion:'0.3.67',
  scope:'T47A-C from tools/fm3/t47-build.mjs: generator-written per-preset Effect Bypass on FM3 footswitches 1-3. Actual user LOAD/GET and STORE/reload captures at location 427, user answers and FM3-Edit display read by Claude; this replay performs no device I/O.',
  cases:rs.map(r=>({case:r.case,completed:r.completed,dataPassed:r.dataPassed,storedBodyByteIdentical:r.bodyByteIdentical,reordered:r.reordered,
   resultSha256:r.resultSha256??null,switches:T47[r.case].effects.map((e,i)=>({switch:i+1,effect:e,label:PP_EFFECTS[e].label,index:PP_EFFECTS[e].index})),observations:r.observations})),
  display,
  promotedToSwitchConfirmed:confirmed,
  findings:'Comp 1 (4), Chorus 1 (2), TremPan 1 (57), Pitch 1 (47), Flanger 1 (21), Synth 1 (55), Rotary 1 (53) and Reverb 1 (51) import, display correctly in FM3-Edit, store byte-identically and each footswitch bypasses/engages only its own block before and after STORE.',
  sources,
  limitations:['Switch behaviour is the user\'s listening/display judgement.','One block type per family (Dynami-Comp Classic, VCA Trem, Octave Divider, Analog Stereo flanger, default Synth, Rotary 5 Hz/50 %).','Other display-mapped blocks stay switch-untested.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-t47-20261112.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'T47 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:rs.length,bodyByteIdentical:rs.length,switchConfirmed:Object.values(PP_EFFECTS).filter(v=>v.status==='switch-confirmed').length,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
