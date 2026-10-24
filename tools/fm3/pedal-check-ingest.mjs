// Receipt for the 2026-10-24 Volume pedal check (test 4a). Offline.
// Usage: node tools/fm3/pedal-check-ingest.mjs [--write]
// Inputs: the pinned collector results (references/fm3-pedal-check-20261024-results.json) and the
// user's FM3-Edit observations reported in chat on 2026-10-24 (recorded verbatim below).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const resultsFile=path.join(REF,'fm3-pedal-check-20261024-results.json'),results=JSON.parse(fs.readFileSync(resultsFile,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-pedal-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/pedal-check-build.mjs'),tmp],{stdio:'ignore'});
const manifestBytes=fs.readFileSync(path.join(tmp,'manifest.json')),manifest=JSON.parse(manifestBytes);
assert.equal(sha(manifestBytes),results.packSha256,'pedal pack rebuilt identically');
const u16=(a,b,c)=>(a&0x7f)|(b&0x7f)<<7|(c&3)<<14;
const words=frames=>{const v=[];for(const f of frames.map(h=>Buffer.from(h,'hex')))if(f[5]===0x75)for(let i=8;i+3<=f.length-2;i+=3)v.push(u16(f[i],f[i+1],f[i+2]));return v;};
const presets=results.presets.map(p=>{const it=manifest.items.find(i=>i.id===p.id);assert.ok(it);
  assert.equal(p.positions.length,4);
  for(const x of p.positions){const w=words(x.volumeFrames);assert.deepEqual(w,x.volumeWords,'bulk decode');
    assert.deepEqual([0,1,2,3].map(c=>w[c*(w.length/4)]),it.volumeStoredGain,'bulk read returns the stored Volume word at '+x.position);
    assert.ok(x.unsolicitedFrames.every(h=>{const f=Buffer.from(h,'hex');return f[5]===0x01&&f[6]===0x2e;}),'no pedal-driven frames (only late grid replies)');}
  return {id:p.id,name:it.name,binding:it.binding,positions:p.positions.map(x=>x.position),storedVolumeGain:it.volumeStoredGain,
    bulkReadAtEveryPosition:'stored word 65534 (10.00), unchanged',unsolicitedPedalFrames:0,frontPanelReading:'values not visible on the FM3 Volume page'};});
// The user's FM3-Edit check, 2026-10-24 09:11 (chat): P1 imported to the edit buffer; every question answered yes;
// P0 "as described" (no modifier, Volume stays 10.00).
const editorCheck={date:'2026-10-24',tool:'FM3-Edit (edit buffer, nothing saved)',
  P1:{modifierMarkOnVolume:true,sourceExternal1:true,knobFollowsPedalHeelToToe:true,heelToeValuesRecorded:false},
  P0:{modifierMarkOnVolume:false,volumeStays:'10.00'},userWords:'Kõigile küsimustele vastus jah. 4. oli nii nagu kirjeldasid'};
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',
  method:'FM3_PEDAL_CHECK.py loaded P1 (0.3.17 volumePedal binding) and P0 (same preset, no binding) into the edit buffer only, asked for the Volume value at heel/toe/middle/heel and recorded the Volume bulk read and any frames the FM3 sent; the user then checked both presets in FM3-Edit.',
  presets,editorCheck,
  findings:['Pedal behaviour confirmed: with P1 the FM3-Edit Volume knob carries the External 1 modifier and follows the Valeton pedal from heel to toe; P0 has no modifier and stays at 10.00.',
    'The fn=0x1F bulk read returns the stored Volume word (10.00) at every pedal position, and the FM3 sends no frames while the pedal moves: the modulated value is not machine-readable with the current read paths.',
    'Not measured: the numeric heel/toe values and the gain curve (taper); audio not checked.'],
  resultsSha256:sha(fs.readFileSync(resultsFile))};
const target=path.join(REF,'fm3-pedal-check-20261024.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'pedal receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({presets:presets.length,editorConfirmed:true}));
