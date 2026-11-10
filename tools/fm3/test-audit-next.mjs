// Synthetic failures protect the device-preparation boundary and the later evidence classification.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {build,specs} from './audit-next-build.mjs';
import {compareNextSession} from './audit-next-compare.mjs';
import {compareStoredPreset} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump,serializePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {createPreset}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-audit-test-')),pack=path.join(tmp,'pack'),session=path.join(tmp,'SYNTHETIC');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
const frames=b=>{const out=[];for(let i=0;i<b.length;){const j=b.indexOf(247,i);assert.ok(j>=i);out.push(b.subarray(i,j+1).toString('hex'));i=j+1;}return out;};
const compare=()=>compareNextSession(pack,session,{allowSynthetic:true});
let refusals=0;
try{
 assert.equal(build(pack).presets,2);const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));const samples=[];
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
  samples.push({c,r,load,syx,stored,d});
 }
 assert.ok(compare().every(r=>r.dataPassed&&r.needsObservationReview&&r.missingObservations.length>0&&!r.audioConfirmed));
 assert.throws(()=>compareNextSession(pack,session),/Synthetic/);refusals++;
 const x=samples[0],file=path.join(x.d,'bind-store-results.json');
 for(const mutate of [r=>r.packSha256='0'.repeat(64),r=>r.storedDumpFrames.pop(),r=>r.storedDumpFrames[0]='f0xxf7',
  r=>{r.index++;r.shownLocation++;},r=>r.frameKinds=[],r=>r.shownLocation=0]){
  const r=structuredClone(x.r);mutate(r);write(file,r);assert.throws(compare);refusals++;
 }write(file,x.r);
 const lf=path.join(x.d,'shot-load-'+x.c.id+'.json');
 for(const mutate of [r=>r.allMatch=false,r=>r.blocks.pop(),r=>r.blocks[0].matches=false,r=>r.packSha256='0'.repeat(64)]){
  const r=structuredClone(x.load);mutate(r);write(lf,r);assert.throws(compare);refusals++;
 }write(lf,x.load);
 const mutateBody=fn=>{const st=inspectStructure(x.stored),b=Buffer.from(st.raw.body);fn(b);return Buffer.from(reencodeDumpFromRawPatch(x.stored,reencodeRawPatch(st.raw.rawPatch,b)));};
 assert.equal(compareStoredPreset(x.syx,mutateBody(b=>b[0]=3)).selectedScene.stored,4);
 for(const off of [462,1584+96,1584+96+4,270,756]){assert.throws(()=>compareStoredPreset(x.syx,mutateBody(b=>b[off]^=1)));refusals++;}
 // A skipped case cannot become a successful two-case session.
 fs.renameSync(file,file+'.skip');assert.equal(compare()[0].dataPassed,false);fs.renameSync(file+'.skip',file);
 // Changed bytes are refused before device access, even on a machine with no USB.
 const syxf=path.join(pack,x.c.stem+'.syx'),bad=Buffer.from(x.syx);bad[40]^=1;fs.writeFileSync(syxf,bad);
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}));refusals++;
 fs.writeFileSync(syxf,x.syx);
 const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx')),s=specs()[0].spec;
 assert.throws(()=>createPreset(base,{...s,modifierTargets:[{source:'Scene Controller 1',block:'delay',param:'DELAY_LOCUT'}]}),/not a modifier target/);refusals++;
 // Do not write a static Mix over the active SC1 binding: scene values drive it.
 assert.throws(()=>createPreset(base,{...s,controls:[{block:'reverb',channel:'A',param:'REVERB_MIX',value:25}]}),/modifier-controlled/);refusals++;
 assert.throws(()=>build(pack),/empty/);refusals++;
 console.log(JSON.stringify({passed:true,presets:2,verifiedFiles:8,preflight:true,refusals,syntheticOnly:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
