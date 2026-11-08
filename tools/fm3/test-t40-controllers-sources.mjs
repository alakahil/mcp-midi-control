// T40/T41 pack builder + comparator tests. Synthetic sessions only; never new hardware evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compareSession} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {parsePresetDump,serializePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {readModifiers}=await import(path.join(E,'scripts/fm3-parameter-dependencies.mjs'));
const {VOLUME_SOURCES}=await import(path.join(E,'scripts/fm3-volume-pedal.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t40-test-'));
const build=dir=>execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/t40-controllers-sources-build.mjs'),dir],{stdio:'pipe'});
const tree=dir=>{const o={};const w=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else o[path.relative(dir,p)]=sha(fs.readFileSync(p));}};w(dir);return o;};
let rejected=0;
try{
 const a=path.join(tmp,'a'),b=path.join(tmp,'b');build(a);build(b);
 assert.deepEqual(tree(a),tree(b),'reproducible build');
 assert.throws(()=>build(a),undefined,'non-empty output refused');rejected++;
 const sources=[];
 for(const group of ['T40','T41']){
  const pack=path.join(a,`FM3_${group}_CTRL`),root=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));
  assert.equal(root.kind,'fm3-controllers-sources-preparation');assert.equal(root.deviceIO,false);
  const session=path.join(tmp,'SYNTH_'+group);
  for(const c of root.packs){
   const d=path.join(pack,c.dir),m=JSON.parse(fs.readFileSync(path.join(d,'manifest.json'))),syx=fs.readFileSync(path.join(d,m.preset.file));
   assert.equal(m.kind,'fm3-bind-store');assert.ok(!('storeLocation' in m),'no fixed STORE slot');
   assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[127,0,0,64,0],'edit buffer only');
   const mods=readModifiers(Buffer.from(inspectStructure(syx).raw.body)).filter(x=>x.active);
   assert.equal(mods.length,1,'exactly one active modifier');assert.equal(mods[0].source,VOLUME_SOURCES[c.source]);assert.equal(mods[0].effectId,102);
   sources.push(c.source);
   const parsed=parsePresetDump(syx,0,17);parsed.headerPayload=Uint8Array.from([3,38,...parsed.headerPayload.slice(2)]);
   const stored=Buffer.from(serializePresetDump(parsed)),frames=[];for(let i=0;i<stored.length;){const end=stored.indexOf(247,i);frames.push(stored.subarray(i,end+1).toString('hex'));i=end+1;}
   fs.mkdirSync(path.join(session,c.dir),{recursive:true});
   fs.writeFileSync(path.join(session,c.dir,'bind-store-load.json'),JSON.stringify({kind:'fm3-bind-store-load',packSha256:c.manifestSha256,userConfirmedName:true}));
   fs.writeFileSync(path.join(session,c.dir,'bind-store-results.json'),JSON.stringify({kind:'fm3-bind-store-results',syntheticFixture:true,packSha256:c.manifestSha256,shownLocation:423,index:422,
    beforeStore:{source:c.source,behavior:'jah'},afterReload:{source:c.source,behavior:'jah'},note:'SYNTHETIC TEST, NOT DEVICE EVIDENCE',storedDumpFrames:frames,frameKinds:[119,...Array(8).fill(120),121]}));
  }
  const res=compareSession(pack,session);
  assert.equal(res.filter(r=>r.dataPassed&&r.observationsPassed).length,root.packs.length);
  assert.ok(res.every(r=>!r.audibleBehaviorConfirmed),'synthetic observations never become hardware evidence');
  assert.throws(()=>execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/controllers-store-compare.mjs'),pack,session],{stdio:'pipe'}),undefined,'CLI refuses synthetic sessions');rejected++;
  // a skipped part is reported, never a pass
  const last=root.packs.at(-1).dir;fs.rmSync(path.join(session,last),{recursive:true});
  const sk=compareSession(pack,session).find(r=>r.case===last);assert.equal(sk.skipped,true);assert.equal(sk.dataPassed,false);
  // wrong source observation needs review
  const first=path.join(session,root.packs[0].dir,'bind-store-results.json'),r=JSON.parse(fs.readFileSync(first));
  r.afterReload.source='LFO 1A';fs.writeFileSync(first,JSON.stringify(r));
  assert.equal(compareSession(pack,session)[0].observationsPassed,false);
  // tampered pack file refused
  const mf=path.join(pack,root.packs[0].dir,'manifest.json'),orig=fs.readFileSync(mf);fs.appendFileSync(mf,' ');
  assert.throws(()=>compareSession(pack,session),undefined,'tampered manifest');rejected++;fs.writeFileSync(mf,orig);
 }
 assert.equal(sources.length,14);assert.equal(new Set(sources).size,14);
 for(const done of ['External 1','LFO 1A','ADSR 1','Sequencer','Scene Controller 1'])assert.ok(!sources.includes(done),'already measured source not repeated: '+done);
 assert.deepEqual(new Set([...sources,'External 1','LFO 1A','ADSR 1','Sequencer','Scene Controller 1']),new Set(Object.keys(VOLUME_SOURCES)),'all 19 supported sources covered');
 console.log(JSON.stringify({passed:true,sources:14,rejected,reproducible:true,syntheticSessionTests:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
