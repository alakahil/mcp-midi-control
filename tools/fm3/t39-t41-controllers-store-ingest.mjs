// Receipt for the 2026-11-09 T39-T41 tests: all 17 Controllers sources not yet STOREd as the Volume modifier source.
// T39 = K1 (Scene Controller 1, Sequencer, ADSR 1: STORE/reload only, T34 presets unchanged);
// T40 = LFO 1B, LFO 2A, LFO 2B, ADSR 2, Envelope Follower; T41 = Scene Controller 2-4, Manual 1-5, Pitch Follower.
// Offline. The packs are rebuilt (tools/fm3/controllers-store-build.mjs, tools/fm3/t40-controllers-sources-build.mjs);
// every session file must name the rebuilt manifest SHA-256. Each preset was loaded to the edit buffer (7F 00), the user
// listened, STOREd it on the FM3 himself (location 427), selected another preset, came back and listened again;
// FM3_BIND_STORE.py --verify then read the location (fn=0x03, read only). Scripts never stored or set.
// Usage: node tools/fm3/t39-t41-controllers-store-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compareSession} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-09/t39-t41/');
const OUT=path.join(ENG,'references/fm3-t39-t41-controllers-store-20261109.json');
const {VOLUME_SOURCES}=await import(path.join(ENG,'scripts/fm3-volume-pedal.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: t39-t41-controllers-store-ingest.mjs [--write]');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t39-t41-'));
let receipt;
try{
 execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/controllers-store-build.mjs'),path.join(tmp,'T39')],{stdio:'ignore'});
 execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/t40-controllers-sources-build.mjs'),path.join(tmp,'T40')],{stdio:'ignore'});
 const groups=[['T39',path.join(tmp,'T39')],['T40',path.join(tmp,'T40','FM3_T40_CTRL')],['T41',path.join(tmp,'T40','FM3_T41_CTRL')]];
 const parts=[],files=[];
 for(const [g,pack] of groups){
  const session=path.join(RAW,g),res=compareSession(pack,session);
  for(const r of res){
   assert.ok(!r.skipped,`${r.case} was skipped`);assert.equal(r.syntheticFixture,false,r.case+' synthetic');
   assert.equal(r.dataPassed,true,r.case+' data');assert.equal(r.bodyByteIdentical,true,r.case+' body byte-identical');
   assert.equal(r.reordered,false,r.case+' record order');assert.equal(r.observationsPassed,true,r.case+' observations');
   const rf=path.join(session,r.case,'bind-store-results.json'),lf=path.join(session,r.case,'bind-store-load.json'),res2=JSON.parse(fs.readFileSync(rf));
   for(const f of [lf,rf])files.push({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
   parts.push({test:g,case:r.case,source:r.source,code:VOLUME_SOURCES[r.source],shownLocation:res2.shownLocation,time:res2.time,
    nameConfirmedAtLoad:true,observations:r.observations,storedBodyByteIdentical:true,records:r.records,
    deviceImport:'confirmed',audibleBehavior:'confirmed',storeReload:'confirmed',resultSha256:r.resultSha256});
  }
 }
 // Only the dated session folders are inputs; an earlier T39 attempt (load only, no readback) is not part of the receipt.
 const onDisk=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else onDisk.push(path.relative(ROOT,p));}};walk(RAW);
 assert.deepEqual(onDisk.sort(),files.map(f=>f.path).sort(),'raw folder holds exactly the receipt inputs');
 assert.equal(parts.length,17);assert.equal(new Set(parts.map(p=>p.source)).size,17);
 assert.deepEqual(new Set([...parts.map(p=>p.source),'External 1','LFO 1A']),new Set(Object.keys(VOLUME_SOURCES)),'all 19 supported sources');
 receipt={schemaVersion:1,kind:'fm3-t39-t41-controllers-store',date:'2026-11-09',device:'FM3 Mk II Turbo, FW13',
  method:'Edit-buffer load (7F 00), user listening and Source check, user STORE to location 427, another preset selected and back, read-only stored dump (fn=0x03); offline comparison with tools/fm3/controllers-store-compare.mjs. Scripts never stored or set.',
  builders:['tools/fm3/controllers-store-build.mjs','tools/fm3/t40-controllers-sources-build.mjs'],
  target:'Volume/Pan 1 Volume (102:0), ALL',
  findings:{sources:parts.length,allStoredBodiesByteIdentical:true,allObservationsPassed:true,
   summary:'All 17 sources showed the expected Source name and behavior before STORE and after reload; every stored body equals the generated body byte for byte.',
   pitchFollowerRange:'Direction only (low notes quieter, high notes louder); FM3-Edit has only CONTROLLERS_PITCH_SOURCE (Ghidra 2026-11-08).'},
  scope:'Only the tested settings and the Volume/Pan Volume target; other LFO shapes/depths, modifier curves and targets are separate questions.',
  parts,files,resultsSha256:sha(Buffer.from(JSON.stringify(files)))};
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const text=JSON.stringify(receipt,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(OUT,text);
else assert.equal(fs.readFileSync(OUT,'utf8'),text,'T39-T41 receipt stale; run with --write and review');
console.log(JSON.stringify({passed:true,sources:receipt.parts.length,storedByteIdentical:receipt.parts.length,observations:'all passed',deviceIO:false}));
