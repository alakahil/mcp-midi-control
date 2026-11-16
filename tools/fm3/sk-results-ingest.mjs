// SK1-SK4 results (16.11.2026): LIVE KOOSLUS V1.3 vs two Cab-filter variants, then SK4 STORE of the chosen BASELINE_V13.
// Rebuilds the pack, checks every result against the pinned pack hashes, the device read-backs, measured CPU and levels,
// and the stored location against the generated file (allowed: scene byte 0, whole-record order, SysEx header).
// Writes the receipt with --write. Offline; no device I/O. WAVs stay outside the repo (hashes in wav-sha256.txt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,CASES,PINNED} from './sk-sound-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {compareStoredPreset}=await import(path.join(E,'scripts/fm3-store-compare.mjs'));
const R=path.join(ROOT,'docs/fm3/hardware-results/2026-11-16/sk'),OUT=path.join(E,'references/fm3-sk-sound-20261116.json');
const sha=b=>createHash('sha256').update(b).digest('hex'),rd=p=>JSON.parse(fs.readFileSync(path.join(R,p)));
export function ingest(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sk-ing-'));
 try{
  assert.deepEqual(build(path.join(tmp,'pack')).sha256,PINNED);
  const pack=JSON.parse(fs.readFileSync(path.join(tmp,'pack/pack.json'))),cases={};
  for(const p of pack.packs){
   const a=rd(`sk1-3/${p.id}/sk-audio-results.json`),l=rd(`sk1-3/${p.id}/shot-load-${p.id}.json`),c=rd(`sk1-3/${p.id}/load-confirmation.json`);
   assert.equal(a.presetSha256,p.presetSha256);assert.equal(c.presetSha256,p.presetSha256);assert.equal(c.userConfirmedName,true);
   assert.equal(l.packSha256,p.shotManifestSha256,p.id+' load belongs to this pack');assert.equal(l.allMatch,true,p.id+' read-back');
   assert.deepEqual(a.scenes.map(s=>s.scene),[1,2,3,4,5,6,7,8]);
   for(const s of a.scenes){
    assert.ok(s.cpuReadings.length>=10&&s.cpuPeakPercent>0&&s.cpuPeakPercent<80,'CPU measured');
    assert.ok(Math.abs(s.cpuPeakPercent-s.cpuEstimatePercent)<=1.0,'CPU estimate within 1 point');
    assert.ok(s.wet.peakDb<-1&&s.dry.peakDb<-1,'no clip');assert.equal(s.silent,false);
   }
   cases[p.id]={presetSha256:p.presetSha256,loadReadBack:true,nameConfirmed:true,userNote:a.userNote,
    scenes:a.scenes.map(s=>({scene:s.scene,name:s.name,cpuPeakPercent:s.cpuPeakPercent,cpuEstimatePercent:s.cpuEstimatePercent,
     wetLufs:s.wet.lufs,wetPeakDb:s.wet.peakDb,dryPeakDb:s.dry.peakDb,correctedDeltaDb:s.correctedDeltaDb}))};
  }
  const st=rd('sk4/bind-store-results.json'),sl=rd('sk4/shot-load-BASELINE_V13.json'),b=pack.packs[0];
  assert.equal(b.id,'BASELINE_V13');assert.equal(st.packSha256,b.storeManifestSha256);assert.equal(sl.allMatch,true);
  assert.equal(st.shownLocation,427);assert.equal(st.index,426);
  for(const k of ['scenes','transitions','switches','accepted'])assert.match(st.afterReload[k],/^jah/,'after reload '+k);
  const stored=Buffer.concat(st.storedDumpFrames.map(h=>Buffer.from(h,'hex')).filter(f=>f.length>6&&[0x77,0x78,0x79].includes(f[5])));
  const cmp=compareStoredPreset(fs.readFileSync(path.join(tmp,'pack/BASELINE_V13/BASELINE_V13.syx')),stored);
  assert.equal(cmp.dataPassed,true);
  const files=['sk1-3/wav-sha256.txt',...CASES.flatMap(id=>[`sk1-3/${id}/sk-audio-results.json`,`sk1-3/${id}/shot-load-${id}.json`,`sk1-3/${id}/load-confirmation.json`]),
   'sk4/bind-store-results.json','sk4/shot-load-BASELINE_V13.json'];
  return {kind:'fm3-sk-sound-receipt',version:1,date:'2026-11-16',device:'FM3 Mk II Turbo FW13',packVersion:pack.version,
   resultsSha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(R,f)))])),cases,
   chosenFinal:{id:'BASELINE_V13',name:'LIVE KOOSLUS V1.3',presetSha256:b.presetSha256,storedLocation:427,storeComparison:cmp,
    userAfterReload:st.afterReload},
   findings:['All 3 candidates load and read back word for word; no output or input clip (wet peak <= -4.8 dBFS).',
    'CPU measured while playing: scenes 1/4 71-72 %, others 55.5-56 %; fm3-cpu 0.2.6 estimate within 0.6 points.',
    'CAB_LOW80 lowers <100 Hz by about 1.6 dB on average (3-4 dB in clean scenes); CAB_HIGH6500 effect is within playing variation.',
    'User chose the unchanged V1.3; STORE 427 keeps all data (only whole-record order differs, allowed).'],
   limits:['Each candidate was a separate live take; no common DI/reamp (no global Input Source change), so tonal deltas include playing variation.',
    'SV7 fm3-sound-acceptance needs a common-DI audio analysis; this receipt does not claim that acceptance.'],
   deviceIO:false};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=ingest(),text=JSON.stringify(r,null,2)+'\n';
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,text);
 else assert.equal(fs.readFileSync(OUT,'utf8'),text,'Receipt stale; run with --write');
 console.log(JSON.stringify({passed:true,cases:Object.keys(r.cases).length,storeDataPassed:r.chosenFinal.storeComparison.dataPassed}));
}
