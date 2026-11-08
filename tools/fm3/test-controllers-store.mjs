// Comparator tests use explicitly synthetic sessions, never new hardware evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compareStoredPreset,compareSession} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {parsePresetDump,serializePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-k1-test-')),pack=process.argv[2]?path.resolve(process.argv[2]):path.join(tmp,'pack');
let rejected=0;
try{
 if(!process.argv[2])execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/controllers-store-build.mjs'),pack],{stdio:'pipe'});
 const root=JSON.parse(fs.readFileSync(path.join(pack,'pack.json'))),session=path.join(tmp,'SYNTHETIC_SESSION');
 const samples=[];
 for(const c of root.packs){
  const d=path.join(pack,c.dir),m=JSON.parse(fs.readFileSync(path.join(d,'manifest.json'))),syx=fs.readFileSync(path.join(d,m.preset.file));
  const parsed=parsePresetDump(syx,0,17);parsed.headerPayload=Uint8Array.from([3,38,...parsed.headerPayload.slice(2)]);
  const stored=Buffer.from(serializePresetDump(parsed)),frames=[];for(let i=0;i<stored.length;){const end=stored.indexOf(247,i);assert.ok(end>=i);frames.push(stored.subarray(i,end+1).toString('hex'));i=end+1;}
  const result={kind:'fm3-bind-store-results',syntheticFixture:true,packSha256:c.manifestSha256,shownLocation:423,index:422,
   beforeStore:{source:c.source,behavior:'jah'},afterReload:{source:c.source,behavior:'jah'},note:'SYNTHETIC TEST, NOT DEVICE EVIDENCE',storedDumpFrames:frames,frameKinds:[119,...Array(8).fill(120),121]};
  fs.mkdirSync(path.join(session,c.dir),{recursive:true});
  fs.writeFileSync(path.join(session,c.dir,'bind-store-load.json'),JSON.stringify({kind:'fm3-bind-store-load',packSha256:c.manifestSha256,userConfirmedName:true}));
  fs.writeFileSync(path.join(session,c.dir,'bind-store-results.json'),JSON.stringify(result));
  assert.equal(compareStoredPreset(syx,stored).dataPassed,true);samples.push({c,syx,stored,result});
 }
 assert.equal(compareSession(pack,session).filter(r=>r.observationsPassed).length,3);
 assert.ok(compareSession(pack,session).every(r=>!r.audibleBehaviorConfirmed),'synthetic observations never become hardware evidence');
 assert.throws(()=>execFileSync(process.execPath,[path.join(ROOT,'tools/fm3/controllers-store-compare.mjs'),pack,session],{stdio:'pipe'}),undefined,'CLI refuses synthetic sessions');rejected++;
 const {c,syx,stored,result}=samples[0],file=path.join(session,c.dir,'bind-store-results.json');
 for(const [label,mutate] of [
  ['wrong pack',r=>r.packSha256='0'.repeat(64)],['missing frame',r=>r.storedDumpFrames.pop()],
  ['invalid hex',r=>r.storedDumpFrames[0]='f0xxf7'],['wrong location',r=>{r.index=423;r.shownLocation=424;}],
  ['invalid location',r=>r.shownLocation=513],['reported frame kinds',r=>r.frameKinds=[]],
 ]){const r=structuredClone(result);mutate(r);fs.writeFileSync(file,JSON.stringify(r));assert.throws(()=>compareSession(pack,session),undefined,label);rejected++;}
 const unknown=structuredClone(result);unknown.afterReload.behavior='mõõtmata';fs.writeFileSync(file,JSON.stringify(unknown));
 assert.equal(compareSession(pack,session)[0].observationsPassed,false,'unknown listening stays unconfirmed');
 unknown.afterReload.behavior='jah';unknown.afterReload.source='LFO 1A';fs.writeFileSync(file,JSON.stringify(unknown));
 assert.equal(compareSession(pack,session)[0].observationsPassed,false,'wrong source observation requires review');
 fs.writeFileSync(file,JSON.stringify(result));
 const mutateBody=fn=>{const x=inspectStructure(stored),b=Buffer.from(x.raw.body);fn(b);return Buffer.from(reencodeDumpFromRawPatch(stored,reencodeRawPatch(x.raw.rawPatch,b)));};
 const scene=mutateBody(b=>b[0]=3);assert.equal(compareStoredPreset(syx,scene).selectedScene.stored,4);
 for(const [label,fn] of [
  ['invalid scene',b=>b[0]=8],['source changed with valid CRC',b=>b.writeUInt16LE(5,1584)],
  ['controller scene changed',b=>b.writeUInt16LE(3,462)],['grid changed',b=>b[270]^=1],
  ['block data changed',b=>b[scanRecords(b).records[0].start+20]^=1],['system tail changed',b=>b[scanRecords(b).tail+2]^=1],
 ]){assert.throws(()=>compareStoredPreset(syx,mutateBody(fn)),undefined,label);rejected++;}
 const bad=Buffer.from(stored);bad[30]^=1;assert.throws(()=>compareStoredPreset(syx,bad));rejected++;
 const reordered=mutateBody(b=>{const s=scanRecords(b),parts=s.records.map(r=>Buffer.from(b.subarray(r.header,r.header+r.size))).reverse();Buffer.concat(parts).copy(b,s.records[0].header);});
 assert.equal(compareStoredPreset(syx,reordered).reordered,true,'only whole records may reorder');
 // Validate the comparator against existing real stored bytes, independently of synthetic fixture construction.
 for(const k of ['A','B'])assert.equal(compareStoredPreset(fs.readFileSync(path.join(E,`examples/FM3_P6_INSERT_${k}.syx`)),fs.readFileSync(path.join(E,`examples/FM3_P6_INSERT_${k}_export.syx`))).dataPassed,true);
 console.log(JSON.stringify({passed:true,presets:3,fourFiles:12,syntheticSessionTests:true,rejected,unknownObservationsPreserved:2,existingDeviceExports:2,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
