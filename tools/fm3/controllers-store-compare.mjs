// Offline comparison of the K1 stored readbacks. Never infer listening from preserved bytes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const {parsePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function compareStoredPreset(expected,actual){
 const g=inspectStructure(expected),s=inspectStructure(actual);assert.equal(g.raw.crcValid,true,'expected CRC');assert.equal(s.raw.crcValid,true,'stored CRC');
 const a=Buffer.from(g.raw.body),b=Buffer.from(s.raw.body);assert.equal(a.length,b.length,'body length');
 const ar=scanRecords(a),br=scanRecords(b);assert.equal(new Set(br.records.map(r=>r.eid)).size,br.records.length,'duplicate record');
 assert.deepEqual(ar.records.map(r=>r.eid).sort((x,y)=>x-y),br.records.map(r=>r.eid).sort((x,y)=>x-y),'record set');
 assert.ok(a[0]<=7&&b[0]<=7,'selected scene in 0..7');
 assert.ok(a.subarray(1,ar.records[0].header).equals(b.subarray(1,br.records[0].header)),'prefix including controllers, modifier region, grid and names');
 for(const r of ar.records){const q=br.records.find(x=>x.eid===r.eid);assert.equal(q.size,r.size,'record shape');
  assert.ok(a.subarray(r.header,r.header+r.size).equals(b.subarray(q.header,q.header+q.size)),'record header/data '+r.eid);}
 assert.ok(a.subarray(ar.tail).equals(b.subarray(br.tail)),'system tail');
 return {dataPassed:true,bodyByteIdentical:a.equals(b),selectedScene:{expected:a[0]+1,stored:b[0]+1},
  reordered:ar.records.some((r,i)=>r.eid!==br.records[i].eid),records:ar.records.length,
  allowedDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],audioConfirmed:false};
}
export function compareSession(packDir,sessionDir){
 const root=JSON.parse(fs.readFileSync(path.join(packDir,'pack.json')));assert.equal(root.kind,'fm3-controllers-store-preparation');
 assert.deepEqual(root.packs.map(p=>[p.dir,p.source]),[['K1_B','Scene Controller 1'],['K1_C','Sequencer'],['K1_D','ADSR 1']],'exactly three independent source packs');
 for(const f of root.files){assert.ok(!path.isAbsolute(f.path)&&!f.path.split(/[\\/]/).includes('..'),'pack path');assert.equal(sha(fs.readFileSync(path.join(packDir,f.path))),f.sha256,'pack file '+f.path);}
 return root.packs.map(p=>{
  const d=path.join(packDir,p.dir),sd=path.join(sessionDir,p.dir),mb=fs.readFileSync(path.join(d,'manifest.json')),m=JSON.parse(mb);
  assert.equal(sha(mb),p.manifestSha256,'manifest hash');
  const load=JSON.parse(fs.readFileSync(path.join(sd,'bind-store-load.json'))),r=JSON.parse(fs.readFileSync(path.join(sd,'bind-store-results.json')));
  assert.equal(load.kind,'fm3-bind-store-load');assert.equal(load.userConfirmedName,true,'name confirmed at load');
  assert.equal(r.kind,'fm3-bind-store-results');assert.equal(r.packSha256,sha(mb));assert.equal(load.packSha256,sha(mb));
  assert.ok(Number.isInteger(r.shownLocation)&&r.shownLocation>=1&&r.shownLocation<=512);assert.equal(r.index,r.shownLocation-1);
  assert.ok(Array.isArray(r.storedDumpFrames));
  const frames=r.storedDumpFrames.map(h=>{assert.match(h,/^(?:[0-9a-f]{2})+$/i,'frame hex');return Buffer.from(h,'hex');});
  const dump=frames.filter(f=>[0x77,0x78,0x79].includes(f[5]));
  assert.deepEqual(dump.map(f=>f[5]),[0x77,...Array(8).fill(0x78),0x79],'complete stored dump');
  assert.deepEqual(r.frameKinds,dump.map(f=>f[5]),'reported frames');
  const actual=Buffer.concat(dump),header=[...parsePresetDump(actual,0,17).headerPayload];
  assert.deepEqual(header.slice(0,2),[r.index>>7,r.index&127],'dump matches reported stored location');
  const expected=fs.readFileSync(path.join(d,m.preset.file));assert.equal(sha(expected),m.preset.sha256);
  verifyPresetOutputs(path.join(d,m.preset.file.replace(/\.syx$/,'')));
  const comparison=compareStoredPreset(expected,actual);
  const yes=v=>typeof v==='string'&&['jah','j','yes','ok'].includes(v.trim().toLowerCase());
  const observationsPassed=[r.beforeStore,r.afterReload].every(o=>o?.source===p.source&&yes(o.behavior));
  return {case:p.dir,source:p.source,...comparison,observationsPassed,
   syntheticFixture:r.syntheticFixture===true,
   audibleBehaviorConfirmed:observationsPassed&&r.syntheticFixture!==true,needsObservationReview:!observationsPassed,
   observations:{before:r.beforeStore,after:r.afterReload,note:r.note},resultSha256:sha(fs.readFileSync(path.join(sd,'bind-store-results.json')))};
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [pack,session]=process.argv.slice(2);assert.ok(pack&&session,'Usage: controllers-store-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareSession(pack,session);assert.ok(results.every(r=>!r.syntheticFixture),'Synthetic test sessions are not hardware results');
 console.log(JSON.stringify({kind:'fm3-k1-offline-comparison',deviceIO:false,results},null,2));
}
