// Synthetic checks for the H5/H5B/T43 pack: deterministic rebuild, preflight refusal and the later evidence classification.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build,CASES,T43_TARGETS} from './h5-t43-build.mjs';
import {compareH5Session} from './h5-t43-compare.mjs';
import {compareH3Session} from './h3-final-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump,serializePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h5-test-')),pack=path.join(tmp,'pack'),pack2=path.join(tmp,'pack2'),session=path.join(tmp,'SYNTHETIC');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
const frames=b=>{const out=[];for(let i=0;i<b.length;){const j=b.indexOf(247,i);assert.ok(j>=i);out.push(b.subarray(i,j+1).toString('hex'));i=j+1;}return out;};
const compare=()=>compareH5Session(pack,session,{allowSynthetic:true});
let refusals=0;
try{
 const r0=build(pack),r1=build(pack2);assert.deepEqual(r0.sha256,r1.sha256,'deterministic rebuild');
 assert.deepEqual(CASES,['H5','H5B','T43','T44']);assert.equal(T43_TARGETS.length,7);
 const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));assert.equal(p.kind,'fm3-h5-t43-preparation');
 assert.ok(p.packs.every(c=>c.hardwareTested===false));
 assert.equal(p.packs.find(c=>c.id==='T43').activeModifiers,7);assert.equal(p.packs.find(c=>c.id==='T44').activeModifiers,0);assert.ok(p.packs.find(c=>c.id==='T44').userEdits);
 const samples=[];
 for(const c of p.packs){
  const syx=fs.readFileSync(path.join(pack,c.stem+'.syx')),parsed=parsePresetDump(syx,0,17);
  parsed.headerPayload=Uint8Array.from([3,42,...parsed.headerPayload.slice(2)]); // shown 427
  const stored=Buffer.from(serializePresetDump(parsed));
  const m=JSON.parse(fs.readFileSync(path.join(pack,c.id,'store/manifest.json'))),shot=JSON.parse(fs.readFileSync(path.join(pack,c.id,'shot/manifest.json'))).items[0];
  const r={kind:'fm3-bind-store-results',syntheticFixture:true,packSha256:c.storeManifestSha256,index:426,shownLocation:427,
   frameKinds:[119,...Array(8).fill(120),121],storedDumpFrames:frames(stored),
   beforeStore:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),afterReload:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),note:'SYNTHETIC ONLY'};
  const load={kind:'fm3-shot-load',syntheticFixture:true,packSha256:c.shotManifestSha256,preset:c.id,allMatch:true,
   blocks:shot.blocks.map(b=>({effectId:b.effectId,matches:true,mismatches:[],values:b.expected.length}))};
  const d=path.join(session,c.id);fs.mkdirSync(d,{recursive:true});
  write(path.join(d,'shot-load-'+c.id+'.json'),load);write(path.join(d,'bind-store-results.json'),r);
  write(path.join(d,'load-confirmation.json'),{kind:'fm3-audit-load-confirmation',syntheticFixture:true,presetSha256:c.presetSha256,userConfirmedName:true});
  samples.push({c,r,load,d});
 }
 assert.ok(compare().every(r=>r.dataPassed&&r.needsObservationReview));
 assert.throws(()=>compareH5Session(pack,session),/Synthetic/);refusals++;
 const x=samples[0],file=path.join(x.d,'bind-store-results.json');
 for(const mutate of [r=>r.packSha256='0'.repeat(64),r=>r.storedDumpFrames.pop(),r=>{r.index++;r.shownLocation++;}]){
  const r=structuredClone(x.r);mutate(r);write(file,r);assert.throws(compare);refusals++;
 }write(file,x.r);
 const lf=path.join(x.d,'shot-load-'+x.c.id+'.json'),bad=structuredClone(x.load);bad.allMatch=false;write(lf,bad);assert.throws(compare);refusals++;write(lf,x.load);
 // A skipped preset is "not done", never passed.
 fs.renameSync(file,file+'.skip');const one=compare();assert.equal(one[0].completed,false);assert.equal(one[2].dataPassed,true);fs.renameSync(file+'.skip',file);
 // An H3 pack comparison does not accept this pack.
 assert.throws(()=>compareH3Session(pack,session,{allowSynthetic:true}));refusals++;
 const syxf=path.join(pack,'T43/T43.syx'),orig=fs.readFileSync(syxf),b=Buffer.from(orig);b[40]^=1;fs.writeFileSync(syxf,b);
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}));refusals++;
 fs.writeFileSync(syxf,orig);
 assert.throws(()=>build(pack),/empty/);refusals++;
 console.log(JSON.stringify({passed:true,presets:4,verifiedFiles:16,preflight:true,refusals,syntheticOnly:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
