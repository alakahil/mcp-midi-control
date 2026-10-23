// Turn an FM3_CPU_SWEEP results.jsonl into per-type CPU costs (audit point 7). Offline.
// Usage: node tools/fm3/cpu-sweep-ingest.mjs RESULTS.jsonl [--write]
// The manifest is rebuilt deterministically by cpu-sweep-build.mjs; results are matched by id and
// the decoded type labels come from the manifest, i.e. from the measured presets themselves.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const [resultsFile]=process.argv.slice(2);assert.ok(resultsFile,'Usage: cpu-sweep-ingest.mjs RESULTS.jsonl [--write]');
const lines=fs.readFileSync(resultsFile,'utf8').split('\n').filter(Boolean),results=new Map(lines.map(l=>{const r=JSON.parse(l);return [r.id,r];}));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-cpu-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/cpu-sweep-build.mjs'),tmp],{stdio:'ignore'});
const manifest=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
const items=manifest.items.filter(i=>i.file);
for(const it of items){const r=results.get(it.id);assert.ok(r,'missing result '+it.id);assert.equal(r.decode,'piecewise-20261023','decode');assert.ok(r.cpuPercent!==null&&!r.saturated,'unusable '+it.id);}
const cpu=id=>results.get(id).cpuPercent;
for(const id of ['cal-newlook','cal-p6a'])assert.ok(results.get(id).calibrationOk,'calibration '+id);
// Hand-measured anchors (session A) for the blocks the NewLook base already holds.
const HAND={drive:{cost:7.9,ref:'drive:Full OD'},reverb:{cost:13.2,ref:'reverb:Room: Large Room'},delay:{cost:1.2,ref:'delay:Deluxe Mind Guy'}};
const base=(cpu('drive:Full OD')+cpu('delay:Deluxe Mind Guy')+cpu('reverb:Room: Large Room'))/3;
const label=it=>it.decoded?Object.values(it.decoded)[0]:null;
const families={};
for(const it of items){
  if(it.family==='calibration'||it.family==='reverb-quality')continue;
  let cost;
  if(HAND[it.family])cost=HAND[it.family].cost+cpu(it.id)-cpu(HAND[it.family].ref);
  else if(it.family==='synth')cost=cpu(it.id)-cpu('cal-newlook'); // NewLook + compressor + Synth
  else cost=cpu(it.id)-base;
  const key=label(it)??'default';
  (families[it.family]??={})[key]=Math.round(Math.max(0,cost)*10)/10;
}
const quality={};
for(const it of items.filter(i=>i.family==='reverb-quality')){
  const eco=cpu(`reverb-quality:${it.type}:ECONOMY`);(quality[it.decoded.REVERB_TYPE]??={})[it.quality]=Math.round((cpu(it.id)-eco)*10)/10;
}
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-23',
  method:'FM3_CPU_SWEEP.py: each preset sent to the edit buffer (7F 00), Scene 1, CPU from fn=0x01 sub=0x2E f[37] (piecewise decode, calibrated ±0.5 % against 12 hand readings). One type changed per preset on the pinned NewLook base.',
  resolution:'0.5 % below 64 %, 1 % above; per-type costs ±0.5 %',
  derivation:{baseCpu:Math.round(base*10)/10,replacedBlocks:'hand cost of the base type + (CPU(type) - CPU(base type)) for drive, reverb, delay',addedBlocks:'CPU(NewLook + block) - CPU(NewLook)',synth:'CPU(NewLook + compressor + Synth) - CPU(cal-newlook)'},
  reverbQualityDelta:quality,reverbQualityScope:'Measured on Room: Large Room, Plate: Medium Plate, Hall: Large Hall; other algorithms use the delta of the same category (prefix) or the largest measured delta.',
  families,resultsSha256:createHash('sha256').update(fs.readFileSync(resultsFile)).digest('hex'),items:items.length};
const content=JSON.stringify(out,null,1)+'\n',target=path.join(REF,'fm3-cpu-types-20261023.json');
if(process.argv.includes('--write')){fs.writeFileSync(target,content);fs.copyFileSync(resultsFile,path.join(REF,'fm3-cpu-sweep-20261023-results.jsonl'));}
else assert.equal(fs.readFileSync(target,'utf8'),content,'CPU type costs stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({families:Object.keys(families).length,types:Object.values(families).reduce((n,f)=>n+Object.keys(f).length,0),base:out.derivation.baseCpu}));
