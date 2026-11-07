// Receipt for the 2026-11-07 T36 Multi Delay Type check (multidelayTypes, 0.3.56). Offline.
// FM3_SHOT_LOAD.py --load sent the generated preset "T36 MD TYPES" to the edit buffer (7F 00) and read the Multi Delay
// record back with fn=0x1F: all 484 words equal the generated file. Jan then saw the four Type names in FM3-Edit
// (no Save) and listened to scenes 1..4. Nothing was stored or set.
// The pack manifest the collector used is kept with the raw result (its SHA-256 is the one the collector recorded); the
// current generator must still produce the same preset from the same spec (rebuilt by the T36 builder).
// Usage: node tools/fm3/t36-multidelay-types-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-07/t36/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const mf=path.join(RAW,'manifest.json'),mb=fs.readFileSync(mf),m=JSON.parse(mb),res=J(path.join(RAW,'shot-load-MDT.json')),obs=J(path.join(RAW,'observations.json'));
assert.equal(res.kind,'fm3-shot-load');assert.equal(res.packSha256,sha(mb),'collector used this manifest');
assert.equal(m.kind,'fm3-shot-check');assert.equal(m.test,'T36');const it=m.items[0];assert.equal(res.preset,it.id);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t36-'));let rebuilt;
try{execFileSync('node',[path.join(ROOT,'tools/fm3/t36-multidelay-types-build.mjs'),tmp],{stdio:'ignore'});rebuilt=J(path.join(tmp,'FM3_T36_MDTYPES','manifest.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.equal(rebuilt.items[0].sha256,it.sha256,'current generator reproduces the tested preset byte for byte');
assert.deepEqual(rebuilt.items[0].blocks[0].expected,it.blocks[0].expected);
const b=res.blocks[0];assert.equal(res.allMatch,true);assert.equal(b.effectId,74);assert.equal(b.values,484);assert.equal(b.matches,true);assert.deepEqual(b.mismatches,[]);
assert.deepEqual(b.testWords.map(t=>[t.param,t.channel,t.raw,t.device]),it.blocks[0].writes.map(w=>[w.param,w.channel,w.raw,w.raw]));
const T35=J(path.join(ENG,'references/fm3-t35-multidelay-presets-20261107.json'));
it.types.forEach((t,k)=>{const img=T35.presets[t.index].words,got=it.blocks[0].expected.slice(k*121,(k+1)*121);
  assert.equal(t.channel,'ABCD'[k]);assert.equal(T35.presets[t.index].label,t.type);
  assert.deepEqual(img.map((w,i)=>w!==got[i]?i:-1).filter(i=>i>=0),t.channel==='A'?[it.blocks[0].writes[0].pid]:[],t.type);
  assert.equal(obs.fm3EditTypes[t.channel],t.type,'FM3-Edit Type '+t.channel);});
assert.equal(obs.matchedDescription,true);assert.equal(obs.stored,false);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',test:'T36',generator:m.generator,
 method:m.method,builder:'tools/fm3/t36-multidelay-types-build.mjs',collector:'FM3_SHOT_LOAD.py --load',packSha256:sha(mb),presetSha256:it.sha256,
 types:it.types,controlsOnTop:it.blocks[0].writes,
 result:{deviceWordsMatch:'484/484',fm3EditTypes:obs.fm3EditTypes,audio:obs.audio,stored:false},
 meaning:'A preset written through multidelayTypes (four Types on channels A..D, Mix on top of A) loads with every Multi Delay word as generated, FM3-Edit shows the four Type names and the channels sound like them. multidelayTypes is device-confirmed for load + edit buffer; STORE/reload was not done.',
 files:[rel(mf),rel(path.join(RAW,'shot-load-MDT.json')),rel(path.join(RAW,'observations.json'))],
 notMeasured:['STORE/reload of a templated channel','Types other than these four on the device through the generator (their images are the T35 reads)']};
const target=path.join(ENG,'references','fm3-t36-multidelay-types-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T36 receipt stale');
console.log(JSON.stringify({ok:true,words:484,types:it.types.map(t=>t.type)}));
