// Offline whole-preset comparison. Display, sound and CPU observations remain separate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compareStoredPreset} from './controllers-store-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
const {parsePresetDump}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function compareNextSession(packDir,sessionDir,{allowSynthetic=false}={}){
 const read=p=>JSON.parse(fs.readFileSync(p));const pack=read(path.join(packDir,'pack.json'));
 assert.equal(pack.kind,'fm3-audit-next-preparation');
 assert.deepEqual(pack.packs.map(p=>p.id),['H1','H2']);
 for(const f of pack.files){assert.ok(!path.isAbsolute(f.path)&&!f.path.split(/[\\/]/).includes('..'));
  assert.equal(sha(fs.readFileSync(path.join(packDir,f.path))),f.sha256,'Pack file '+f.path);}
 return pack.packs.map(p=>{
  const sd=path.join(sessionDir,p.id),result=path.join(sd,'bind-store-results.json');
  if(!fs.existsSync(result))return {case:p.id,completed:false,dataPassed:false,reason:'STORE result missing; skipped or interrupted'};
  const r=read(result),load=read(path.join(sd,'shot-load-'+p.id+'.json')),name=read(path.join(sd,'load-confirmation.json'));
  const mb=fs.readFileSync(path.join(packDir,p.id,'store/manifest.json')),m=JSON.parse(mb);
  assert.equal(sha(mb),p.storeManifestSha256);assert.equal(r.kind,'fm3-bind-store-results');
  assert.equal(r.packSha256,p.storeManifestSha256);assert.equal(load.kind,'fm3-shot-load');
  assert.equal(load.packSha256,p.shotManifestSha256);assert.equal(load.preset,p.id);assert.equal(load.allMatch,true,'Load failed');
  const shot=read(path.join(packDir,p.id,'shot/manifest.json')).items[0];
  assert.deepEqual(load.blocks.map(b=>b.effectId),shot.blocks.map(b=>b.effectId),'Every SHOT block present');
  assert.ok(load.blocks.every((b,i)=>b.matches===true&&b.mismatches.length===0&&b.values===shot.blocks[i].expected.length),'SHOT block mismatch');
  assert.equal(name.kind,'fm3-audit-load-confirmation');assert.equal(name.presetSha256,p.presetSha256);assert.equal(name.userConfirmedName,true);
  assert.ok(Number.isInteger(r.shownLocation)&&r.shownLocation>=1&&r.shownLocation<=512);assert.equal(r.index,r.shownLocation-1);
  const synthetic=[r,load,name].some(x=>x.syntheticFixture===true);assert.ok(allowSynthetic||!synthetic,'Synthetic fixtures are not hardware evidence');
  const frames=r.storedDumpFrames.map(h=>{assert.match(h,/^(?:[0-9a-f]{2})+$/i);return Buffer.from(h,'hex');});
  const dump=frames.filter(f=>[0x77,0x78,0x79].includes(f[5]));assert.deepEqual(dump.map(f=>f[5]),[0x77,...Array(8).fill(0x78),0x79]);
  assert.deepEqual(r.frameKinds,dump.map(f=>f[5]));const actual=Buffer.concat(dump);
  assert.deepEqual([...parsePresetDump(actual,0,17).headerPayload].slice(0,2),[r.index>>7,r.index&127],'Stored location mismatch');
  const stem=path.join(packDir,p.stem);verifyPresetOutputs(stem);const expected=fs.readFileSync(stem+'.syx');
  assert.equal(sha(expected),p.presetSha256);const data=compareStoredPreset(expected,actual);
  const missingObservations=['beforeStore','afterReload'].flatMap(when=>m.checks.filter(c=>typeof r[when]?.[c.id]!=='string'||['','-','mõõtmata'].includes(r[when][c.id].trim().toLowerCase())).map(c=>when+'.'+c.id));
  return {case:p.id,completed:true,...data,syntheticFixture:synthetic,
   hardwareAcceptance:'pending observation review',needsObservationReview:true,missingObservations,
   observations:{before:r.beforeStore,after:r.afterReload,note:r.note},expected:p.expected,resultSha256:sha(fs.readFileSync(result))};
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: audit-next-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareNextSession(path.resolve(process.argv[2]),path.resolve(process.argv[3]));
 console.log(JSON.stringify({kind:'fm3-audit-next-comparison',deviceIO:false,results},null,2));
 if(results.some(r=>!r.dataPassed))process.exitCode=2;
}
