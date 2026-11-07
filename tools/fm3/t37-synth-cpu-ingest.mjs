// Receipt for the 2026-11-07 T37 Synth voice CPU sweep (audit H6). Offline. The pack is rebuilt
// (tools/fm3/t37-synth-cpu-build.mjs) and must equal the manifest kept with the raw results (the one sent to the Mac).
// FM3_CPU_SWEEP.py (Jan in Terminal, first preset name confirmed on the FM3 screen) loaded 21 edit-buffer presets and
// read the CPU meter until three equal values. Nothing stored or set. Cost of an item = CPU(item) - CPU(cal-newlook).
// Usage: node tools/fm3/t37-synth-cpu-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-07/t37/');
const sha=b=>createHash('sha256').update(b).digest('hex'),r1=x=>Math.round(x*10)/10;
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const mf=path.join(RAW,'manifest.json'),mb=fs.readFileSync(mf),m=JSON.parse(mb),rf=path.join(RAW,'results.jsonl');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t37-'));let rebuilt;
try{execFileSync('node',[path.join(ROOT,'tools/fm3/t37-synth-cpu-build.mjs'),tmp],{stdio:'ignore'});rebuilt=fs.readFileSync(path.join(tmp,'FM3_T37_SYNTH_CPU','manifest.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.equal(sha(rebuilt),sha(mb),'pack rebuilt identically (as measured)');
const rows=fs.readFileSync(rf,'utf8').trim().split('\n').map(l=>JSON.parse(l));
assert.deepEqual(rows.map(r=>r.id),m.items.map(i=>i.id),'every item measured, in pack order');
for(const r of rows){assert.equal(r.saturated,false,r.id);const last=r.reads.slice(-3);assert.ok(last.every(v=>v===r.raw),r.id+' settled');}
assert.equal(rows[0].userConfirmedName,true);
const cal=rows[0].cpuPercent,end=rows.at(-1).cpuPercent;assert.equal(cal,52.5);assert.equal(end,cal,'no drift');
const T31=JSON.parse(fs.readFileSync(path.join(ENG,'references/fm3-shot-t31-cab-cpu-20261105.json'))).cpu.costPoints.synth;
const BASE=T31.OFF,inc=t=>T31[t]-BASE;
const items=m.items.map((it,i)=>{const r=rows[i];const cost=r1(r.cpuPercent-cal);
  if(it.family==='calibration')return {id:it.id,cpuPercent:r.cpuPercent};
  const summed=r1(BASE+it.voices.filter(v=>v!=='OFF').reduce((a,v)=>a+inc(v),0));
  return {id:it.id,voices:it.voices,cpuPercent:r.cpuPercent,costPoints:cost,summedPoints:summed,errorPoints:r1(cost-summed)};});
const syn=items.filter(x=>x.voices);
// Voice 2 and voice 3 alone cost what voice 1 costs (T31) within one meter step (1 % at or above 64 %).
for(const x of syn.filter(x=>/^v[23]:/.test(x.id)))assert.ok(Math.abs(x.errorPoints)<=1,x.id);
assert.equal(syn.find(x=>x.id==='default').errorPoints,0,'T31 default repeat');
// Summed voices never under-estimate: the sum is at or above every measured combination.
for(const x of syn)assert.ok(x.errorPoints<=1,x.id+' not above the sum by more than a meter step');
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',test:'T37',audit:'H6',
 method:'FM3_CPU_SWEEP.py: edit-buffer loads (7F 00) of cal-newlook and cal-newlook + Synth in row 3 (Scene 1 engaged) with only the voice type words set; CPU meter fn=0x01 sub=0x2E until three equal reads. Nothing stored or set.',
 builder:'tools/fm3/t37-synth-cpu-build.mjs',packSha256:sha(mb),calibration:{start:cal,end},meterStepPercent:{below64:0.5,atOrAbove64:1},
 voiceIncrementPoints:Object.fromEntries(Object.keys(T31).filter(t=>t!=='OFF').map(t=>[t,r1(inc(t))])),blockBasePoints:BASE,
 items,
 rule:'Synth cost = 2.5 (block, all voices OFF) + for each voice that is not OFF its T31 voice-1 cost minus 2.5. Voices 2 and 3 alone matched voice 1 within one meter step; two voices and SINE/SAWTOOTH/WHT NOISE matched the sum exactly; three TRIANGLE measured 1 point and three PINK NOISE 4 points below the sum (the sum is conservative).',
 files:[rel(mf),rel(rf)]};
const target=path.join(ENG,'references','fm3-t37-synth-cpu-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T37 receipt stale');
console.log(JSON.stringify({ok:true,items:items.length,errors:syn.map(x=>x.id+':'+x.errorPoints).join(' ')}));
