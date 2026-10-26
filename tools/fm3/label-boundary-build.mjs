// Build the Pitch label boundary pack (FM3_LABEL_SWEEP.py, test T3). Offline.
// The 2026-10-24 sweep asked labels 0..count-1 by the dictionary count and so left out the last label of
// two Pitch lists whose device list starts with an extra word 0 (OFF / NONE):
//   PITCH_TRACKMODE (pid 35) word 2 = "CHORDS", PITCH_TEMPO (pid 76) word 78 = "63/64".
// Both are inside the FW13 list (device word 0 + dictionary labels 1..N), so this pack asks indexes
// 0..N only (count + 1), never past the end. Same preset, pilot, pacing and health checks as the sweep;
// the blocks in the preset are listed with no label requests so that every check re-reads them.
// Usage: node tools/fm3/label-boundary-build.mjs OUT_DIR
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const E=path.join(here,'../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {findParam}=await import(path.join(E,'scripts/fm3-table-encoder.mjs'));
const [out]=process.argv.slice(2);assert.ok(out,'Usage: label-boundary-build.mjs OUT_DIR');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-lb-'));
execFileSync('node',[path.join(here,'label-sweep-build.mjs'),tmp],{stdio:'ignore'});
const sweep=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
const pitch=sweep.families.find(f=>f.slug==='pitch');assert.ok(pitch,'pitch family');
const TARGET={PITCH_TRACKMODE:{word:2,label:'CHORDS'},PITCH_TEMPO:{word:78,label:'63/64'}};
const params=pitch.params.filter(p=>TARGET[p.name]).map(p=>{
  const d=findParam('pitch',p.name),t=TARGET[p.name];
  assert.equal(p.count,d.enum.length,p.name+' dictionary count');
  assert.equal(d.enum.at(-1).trim(),t.label,p.name+' last dictionary label');
  assert.equal(p.count,t.word,p.name+': device word 0 is extra, so the last label is word = count');
  return {...p,count:p.count+1,lastWord:t.word,expectLast:t.label};});
assert.deepEqual(params.map(p=>p.name),['PITCH_TRACKMODE','PITCH_TEMPO']);
// Blocks in the preset stay listed without requests, so the baseline and every health check re-read them.
const families=[...sweep.families.filter(f=>f.present).map(f=>({...f,params:[]})),{...pitch,params}];
fs.mkdirSync(out,{recursive:true});fs.copyFileSync(path.join(tmp,'SWEEP.syx'),path.join(out,'SWEEP.syx'));
const manifest={...sweep,date:'2026-10-26',families,extra:0,requests:params.reduce((n,p)=>n+p.count,0),
  method:sweep.method+' Boundary run: Pitch TRACKMODE 0..2 and TEMPO 0..78 only.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest)+'\n');fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({requests:manifest.requests,params:params.map(p=>`${p.name} 0..${p.count-1} (last ${p.expectLast})`)}));
