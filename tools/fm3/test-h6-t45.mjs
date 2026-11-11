// Synthetic checks for the H6/T45/T46 pack: deterministic rebuild, preflight refusal and the comparison classification.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build,CASES,T46_INDEX,ppWords} from './h6-t45-build.mjs';
import {compareH6Session} from './h6-t45-compare.mjs';
import {compareH5Session} from './h5-t43-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump,serializePresetDump,decodeRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-h6-test-')),pack=path.join(tmp,'pack'),pack2=path.join(tmp,'pack2'),session=path.join(tmp,'SYNTHETIC');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
const frames=b=>{const out=[];for(let i=0;i<b.length;){const j=b.indexOf(247,i);assert.ok(j>=i);out.push(b.subarray(i,j+1).toString('hex'));i=j+1;}return out;};
const compare=()=>compareH6Session(pack,session,{allowSynthetic:true});
let refusals=0;
try{
 const r0=build(pack),r1=build(pack2);assert.deepEqual(r0.sha256,r1.sha256,'deterministic rebuild');
 assert.deepEqual(CASES,['H6','T45','T46A','T46B','T46C','T46D']);
 const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));assert.equal(p.kind,'fm3-h6-t45-preparation');
 assert.ok(p.packs.every(c=>c.hardwareTested===false));
 // The four sweep presets cover Effect indices 0..92 exactly once, PP#1.. in order.
 const idx=p.packs.filter(c=>c.loadOnly).flatMap(c=>c.perPreset.map(x=>x.index));assert.deepEqual(idx,Array.from({length:93},(_,i)=>i));
 assert.deepEqual(Object.keys(T46_INDEX),p.packs.filter(c=>c.loadOnly).map(c=>c.id));
 { // T44-measured positions: PP#1 category at 3052 from the end, its param at 2908; PP#2 param at 2896.
  assert.deepEqual([ppWords(0).category,ppWords(0).param,ppWords(1).param,ppWords(3).category],[3052,2908,2896,3046]);
  const body=Buffer.from(decodeRawPatch(parsePresetDump(fs.readFileSync(path.join(pack,'T46A/T46A.syx')),0,17).chunkPayloads).body);
  assert.equal(body.readUInt16LE(body.length-916),1,'Effect definitions leave the base count word (1) unchanged');
  for(let i=0;i<108;i++)assert.equal(body.readUInt16LE(body.length-1132+2*i),65535,'no overrides in the sweep');
 }
 for(const c of p.packs){
  const syx=fs.readFileSync(path.join(pack,c.stem+'.syx')),shot=JSON.parse(fs.readFileSync(path.join(pack,c.id,'shot/manifest.json'))).items[0];
  const d=path.join(session,c.id);fs.mkdirSync(d,{recursive:true});
  write(path.join(d,'shot-load-'+c.id+'.json'),{kind:'fm3-shot-load',syntheticFixture:true,packSha256:c.shotManifestSha256,preset:c.id,allMatch:true,
   blocks:shot.blocks.map(b=>({effectId:b.effectId,matches:true,mismatches:[],values:b.expected.length}))});
  write(path.join(d,'load-confirmation.json'),{kind:'fm3-audit-load-confirmation',syntheticFixture:true,presetSha256:c.presetSha256,userConfirmedName:true});
  if(c.loadOnly)continue;
  const parsed=parsePresetDump(syx,0,17);parsed.headerPayload=Uint8Array.from([3,42,...parsed.headerPayload.slice(2)]);
  const m=JSON.parse(fs.readFileSync(path.join(pack,c.id,'store/manifest.json')));
  write(path.join(d,'bind-store-results.json'),{kind:'fm3-bind-store-results',syntheticFixture:true,packSha256:c.storeManifestSha256,index:426,shownLocation:427,
   frameKinds:[119,...Array(8).fill(120),121],storedDumpFrames:frames(Buffer.from(serializePresetDump(parsed))),
   beforeStore:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),afterReload:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),note:'SYNTHETIC ONLY'});
 }
 const all=compare();assert.ok(all.every(r=>r.completed&&r.dataPassed));
 assert.ok(all.filter(r=>r.loadOnly).length===4&&all.filter(r=>r.needsObservationReview).length===2);
 assert.throws(()=>compareH6Session(pack,session),/Synthetic/);refusals++;
 { // a failed sweep load is not passed; a skipped one is "not done"
  const f=path.join(session,'T46B','shot-load-T46B.json'),orig=fs.readFileSync(f),bad=JSON.parse(orig);bad.allMatch=false;fs.writeFileSync(f,JSON.stringify(bad));
  assert.equal(compare().find(r=>r.case==='T46B').dataPassed,false);refusals++;
  bad.allMatch=true;bad.packSha256='0'.repeat(64);fs.writeFileSync(f,JSON.stringify(bad));assert.throws(compare);refusals++;
  fs.rmSync(f);assert.equal(compare().find(r=>r.case==='T46B').completed,false);fs.writeFileSync(f,orig);
  const nf=path.join(session,'T46B','load-confirmation.json'),norig=fs.readFileSync(nf),n=JSON.parse(norig);
  n.userConfirmedName=false;fs.writeFileSync(nf,JSON.stringify(n));assert.equal(compare().find(r=>r.case==='T46B').dataPassed,false);refusals++;
  fs.rmSync(nf);assert.equal(compare().find(r=>r.case==='T46B').dataPassed,false);refusals++;
  n.userConfirmedName=true;n.presetSha256='0'.repeat(64);fs.writeFileSync(nf,JSON.stringify(n));assert.throws(compare);refusals++;fs.writeFileSync(nf,norig);
 }
 assert.throws(()=>compareH5Session(pack,session,{allowSynthetic:true}));refusals++;
 const syxf=path.join(pack,'T46A/T46A.syx'),orig=fs.readFileSync(syxf),b=Buffer.from(orig);b[40]^=1;fs.writeFileSync(syxf,b);
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}));refusals++;
 fs.writeFileSync(syxf,orig);
 assert.throws(()=>build(pack),/empty/);refusals++;
 console.log(JSON.stringify({passed:true,presets:6,sweepIndices:93,preflight:true,refusals,syntheticOnly:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
