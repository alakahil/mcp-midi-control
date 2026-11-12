// Synthetic checks for the T47 pack: deterministic rebuild, switch/effect mapping, preflight refusal and the comparison.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build,CASES,T47} from './t47-build.mjs';
import {compareT47Session} from './t47-compare.mjs';
import {compareH6Session} from './h6-t45-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump,serializePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {PP_EFFECTS}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t47-test-')),pack=path.join(tmp,'pack'),pack2=path.join(tmp,'pack2'),session=path.join(tmp,'SYNTHETIC');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
const frames=b=>{const out=[];for(let i=0;i<b.length;){const j=b.indexOf(247,i);assert.ok(j>=i);out.push(b.subarray(i,j+1).toString('hex'));i=j+1;}return out;};
const compare=()=>compareT47Session(pack,session,{allowSynthetic:true});
let refusals=0;
try{
 const r0=build(pack),r1=build(pack2);assert.deepEqual(r0.sha256,r1.sha256,'deterministic rebuild');
 assert.deepEqual(CASES,['T47A','T47B','T47C']);
 // The seven requested blocks (plus Reverb 1, whose switch T45 never pressed), each on its own FM3 switch 1..3.
 const all=CASES.flatMap(c=>T47[c].effects);
 assert.deepEqual(all,['compressor1','chorus1','tremolo1','pitch1','flanger1','synth1','rotary1','reverb1']);
 assert.ok(all.every(e=>PP_EFFECTS[e].status!=='switch-confirmed'),'only untested switches');
 assert.ok(CASES.every(c=>T47[c].effects.length<=3),'FM3 has three footswitches');
 const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));assert.equal(p.kind,'fm3-t47-preparation');
 assert.ok(p.packs.every(c=>c.hardwareTested===false&&!c.loadOnly));
 assert.deepEqual(p.packs.flatMap(c=>c.switches.map(s=>s.index)),all.map(e=>PP_EFFECTS[e].index));
 for(const c of p.packs){
  const syx=fs.readFileSync(path.join(pack,c.stem+'.syx')),shot=JSON.parse(fs.readFileSync(path.join(pack,c.id,'shot/manifest.json'))).items[0];
  const d=path.join(session,c.id);fs.mkdirSync(d,{recursive:true});
  write(path.join(d,'shot-load-'+c.id+'.json'),{kind:'fm3-shot-load',syntheticFixture:true,packSha256:c.shotManifestSha256,preset:c.id,allMatch:true,
   blocks:shot.blocks.map(b=>({effectId:b.effectId,matches:true,mismatches:[],values:b.expected.length}))});
  write(path.join(d,'load-confirmation.json'),{kind:'fm3-audit-load-confirmation',syntheticFixture:true,presetSha256:c.presetSha256,userConfirmedName:true});
  const parsed=parsePresetDump(syx,0,17);parsed.headerPayload=Uint8Array.from([3,42,...parsed.headerPayload.slice(2)]);
  const m=JSON.parse(fs.readFileSync(path.join(pack,c.id,'store/manifest.json')));
  assert.deepEqual(m.checks.map(x=>x.id),['name_grid_scenes','pp_display','pp_switch','behavior']);
  write(path.join(d,'bind-store-results.json'),{kind:'fm3-bind-store-results',syntheticFixture:true,packSha256:c.storeManifestSha256,index:426,shownLocation:427,
   frameKinds:[119,...Array(8).fill(120),121],storedDumpFrames:frames(Buffer.from(serializePresetDump(parsed))),
   beforeStore:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),afterReload:Object.fromEntries(m.checks.map(x=>[x.id,'-'])),note:'SYNTHETIC ONLY'});
 }
 assert.ok(compare().every(r=>r.completed&&r.dataPassed));
 assert.throws(()=>compareT47Session(pack,session),/Synthetic/);refusals++;
 { const f=path.join(session,'T47B','shot-load-T47B.json'),orig=fs.readFileSync(f),bad=JSON.parse(orig);bad.packSha256='0'.repeat(64);
  fs.writeFileSync(f,JSON.stringify(bad));assert.throws(compare);refusals++;fs.writeFileSync(f,orig);}
 assert.throws(()=>compareH6Session(pack,session,{allowSynthetic:true}));refusals++;
 const syxf=path.join(pack,'T47A/T47A.syx'),orig=fs.readFileSync(syxf),b=Buffer.from(orig);b[40]^=1;fs.writeFileSync(syxf,b);
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}));refusals++;
 fs.writeFileSync(syxf,orig);
 assert.throws(()=>build(pack),/empty/);refusals++;
 console.log(JSON.stringify({passed:true,presets:3,switches:all.length,preflight:true,refusals,syntheticOnly:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
