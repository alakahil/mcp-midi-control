// Replay the 2026-11-11 H5/H5B/T43/T44 hardware results; no device or MIDI access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from './h5-t43-build.mjs';
import {compareH5Session} from './h5-t43-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/h5-t43-20261111');
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
// T44 per-preset switch words that the user's FM3-Edit edit produced (offset from body end).
const PP_WORDS=[[3052,4],[3050,4],[3048,4],[3046,3],[2908,9],[2896,7],[2884,51],[2872,3]];
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h5-t43-'));
try {
 build(path.join(tmp,'pack'));
 const rs=compareH5Session(path.join(tmp,'pack'),D);
 assert.deepEqual(rs.map(r=>r.case),['H5','H5B','T43','T44']);
 for(const r of rs)assert.ok(r.completed&&r.dataPassed&&!r.syntheticFixture,r.case);
 const [h5,h5b,t43,t44]=rs;
 // H5/H5B: FM3 reorders records on STORE (known since T38); data words are unchanged.
 for(const r of [h5,h5b])assert.ok(r.reordered&&!r.bodyByteIdentical,r.case);
 assert.ok(t43.bodyByteIdentical&&!t43.reordered);
 assert.equal(t44.unexpectedCount,0);
 assert.deepEqual(t44.userEditWords.map(w=>[w.fromEnd,w.expected,w.actual]),PP_WORDS.map(([e,a])=>[e,0,a]));
 for(const c of ['H5','H5B','T43','T44'])for(const [f,h] of Object.entries(display[c].screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
 assert.deepEqual(display.H5B.out1SceneLevelDb.before,[-2,0,1,-2,-2,0,1,-2]);
 assert.deepEqual(display.H5B.out1SceneLevelDb.after,display.H5B.out1SceneLevelDb.before);
 assert.deepEqual(display.H5.ampLevelDb,{A:-10.2,C:-7});
 assert.deepEqual([1,2,3].map(s=>display.T43.sceneReadings[s].ampLevelDb),[-12,-6,-9]);
 assert.deepEqual([1,2,3,4].map(s=>display.T43.sceneReadings[s].chorusBypassed),[false,false,true,true]);
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-11',generatedPresetVersion:'0.3.65',
  scope:'H5 (LIVE KOOSLUS V1.1), H5B (V1.1B), T43 (7 modifier targets) and T44 (user-added per-preset switches) from tools/fm3/h5-t43-build.mjs. Actual user LOAD/GET and STORE/reload captures at location 427, user answers and FM3-Edit screenshots; this replay performs no device I/O.',
  cases:rs.map(r=>({case:r.case,deviceImport:'confirmed',storeReload:'confirmed',dataPassed:r.dataPassed,storedBodyByteIdentical:r.bodyByteIdentical??null,reordered:r.reordered??null,resultSha256:r.resultSha256,observations:r.observations,expected:r.expected})),
  display,
  perPresetSwitchWords:{region:'definitions start 3052 bytes before body end; category word 2k, function word 48+2k, param word 144+12k (k = PP index 0..23)',
   observed:[{pp:1,category:4,function:0,param:9,meaning:'Effect / Bypass / Drive 1'},{pp:2,category:4,function:0,param:7,meaning:'Effect / Bypass / Delay 1'},
    {pp:3,category:4,function:0,param:51,meaning:'Effect / Bypass / Reverb 1'},{pp:4,category:3,function:0,param:3,meaning:'Scene / Select / Scene 3'}],
   notStored:'Icon colour and Mini-Display Label changed no body word; icons showed grey after reload.'},
  findings:{
   h5:'Amp channel levels A/D -10.16 dB, C -7 dB survive STORE (display -10.2 / -7.0). User: lead could be ~2 dB louder still.',
   h5b:'Out 1 Scene Level 1..8 (-2/0/+1/-2/-2/0/+1/-2 dB) shows exactly in FM3-Edit before and after STORE: first device confirmation of OUTPUT_SCENE1..8.',
   t43:'Amp Level, Drive Drive, Delay Feedback, Reverb Time, Chorus Depth, Out 1 Level and Chorus Bypass modifier targets store byte-identically and drive the expected values; Chorus Bypass from Scene Controller 2 bypasses at 50% and 100%, engaged at 0%. CPU 49.7-49.8% vs estimate 50.4%.',
   t44:'Per-preset switch category 4 = Effect, 3 = Scene; Bypass and Select are function 0; Effect param is a block index (Drive 1 = 9, Delay 1 = 7, Reverb 1 = 51), Scene param = scene number.'},
  sources,
  limitations:['Sound is a user listening judgement; no numerical audio measurement.','T43 modifier Source/Min/Max dialogs were not opened; bindings are inferred from displayed target values plus the byte-identical store.','H5 terminal answers were shifted by a pasted multi-line CPU table; the CPU values are recorded in display-confirmation.json.','T43 STORE readback was taken in a separate FM3_BIND_STORE.py --verify run after the first run stopped before readback.','T44 PP switches were not tried on a footswitch.','Screenshots are FM3-Edit display, not the front panel.','Block indices beyond Drive 1, Delay 1 and Reverb 1 are not measured.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-h5-t43-20261111.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'H5/T43 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:4,bodyByteIdentical:1,perPresetSwitchesDecoded:4,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
