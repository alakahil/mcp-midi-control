// Receipt for the 2026-10-29 per-preset switch definition step check (FM3_MOD_STEPS.py, test T16). Offline.
// The pack is rebuilt (tools/fm3/pp-steps-build.mjs). The preset already holds the generator's PP#1 (Latching, CS 2,
// Layout 1 switch 1); the user added PP#2 / PP#3 and two overrides on the FM3, one change per stored step, and the
// script read the stored location after each STORE (fn=0x03, read only). No global setting was changed.
// Usage: node tools/fm3/pp-steps-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-29/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=path.join(RAW,'fm3-pp-steps-20261029-results.json'),res=JSON.parse(fs.readFileSync(file,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t16-'));execFileSync('node',[path.join(ROOT,'tools/fm3/pp-steps-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'manifest.json')),m=JSON.parse(mb),ref=fs.readFileSync(path.join(tmp,m.preset.file));fs.rmSync(tmp,{recursive:true,force:true});
assert.equal(sha(mb),res.packSha256,'pack rebuilt identically');assert.ok(res.userConfirmedName);assert.equal(res.index,res.shownLocation-1,'Display Offset 1');
assert.deepEqual(res.steps.map(s=>s.id),m.steps.map(s=>s.id));
const step=id=>res.steps.find(s=>s.id===id);
const bodyOf=id=>{const s=inspectStructure(Buffer.concat(step(id).storedDumpFrames.map(h=>Buffer.from(h,'hex'))));assert.ok(s.raw.crcValid,'CRC '+id);assert.equal(s.decoded.preset_name,m.confirmName);return Buffer.from(s.raw.body);};
const gen=Buffer.from(inspectStructure(ref).raw.body),L=gen.length,DEF=L-3052,OV=DEF+1920,COUNT=OV+216;
const diff=(a,b)=>{const d=[];for(let o=0;o<a.length;o+=2)if(a.readUInt16LE(o)!==b.readUInt16LE(o))d.push([o,a.readUInt16LE(o),b.readUInt16LE(o)]);return d;};
const want={base:[],pp2:[[DEF+2,0,7],[DEF+50,0,1],[DEF+156,0,2],[COUNT,1,2]],pp3:[[DEF+4,0,7],[DEF+168,0,2],[COUNT,2,3]],ov2:[[OV+2,65535,1]],ov12:[[OV+22,65535,2]]};
let prev=gen;for(const id of Object.keys(want)){const b=bodyOf(id);assert.deepEqual(diff(prev,b),want[id],id);prev=b;}
assert.match(step('base').shown,/Latching; Control Swich: CS2/);assert.match(step('ov12').shown,/PP#3: Control Swich, Momentary/);
assert.match(step('press').shown,/Muutus Scene 2 peale/);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-29',test:'T16',preset:{name:m.confirmName,sha256:m.preset.sha256},
  method:'Edit-buffer load (7F 00) once; one FC PER-PRESET change per stored step, STORE by the user, read with fn=0x03 (read-only); observation steps without STORE. No global setting changed.',
  storedLocation:{shown:res.shownLocation,index:res.index},
  steps:res.steps.map(s=>({id:s.id,shown:s.shown,...(s.observationOnly?{observationOnly:true}:{}),...(want[s.id]?{words:want[s.id].map(([o,before,after])=>({fromEnd:L-o,before,after}))}:{})})),
  decoded:{generatorPP1:'the generator-made PP#1 (category 7, function 1, parameter 1) reads "Control Switch, Latching, CS2" and is the Layout 1 switch 1 override: the 0.3.35 single-footswitch output is confirmed on the device',
    definitionLayout:'category at +2k, function at +48+2k, parameters at +144+12k (six words per definition, first = Control Switch number - 1); k = PP# - 1',
    count:'the word after the 108 override words went 1 -> 2 -> 3 as PP#2 and PP#3 were added',
    overrides:'Layout 1 switch 2 = word 1, Layout 1 switch 12 = word 11 (with T15: word = 12 x (layout - 1) + (switch - 1))'},
  observation:'The press steps changed scenes (switch 2 -> Scene 2, switch 1 -> Scene 1): the FM3 was on a layout whose switches select scenes (Layout 2 in T15), not Layout 1 where the overrides were set; switching not re-checked here (T14/T14b confirmed it on Layout 1).',
  resultsSha256:sha(fs.readFileSync(file))};
const target=path.join(ENG,'references/fm3-pp-steps-20261029.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'pp steps receipt stale');
console.log(JSON.stringify({storedSteps:Object.keys(want).length,paramStrideBytes:12}));
