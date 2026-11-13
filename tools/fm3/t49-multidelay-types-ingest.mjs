// Receipt for the 2026-11-13 T49 Multi Delay Type check: the 31 Types not confirmed by T36/T38/H2. Offline.
// FM3_SHOT_LOAD.py --load sent each generated preset T49A..H to the edit buffer (7F 00) and read the Multi Delay record back
// with fn=0x1F; Claude read the Type name of channels A..D in FM3-Edit (no Save) and Jan listened to scenes 1..4.
// Nothing was stored or set. The current generator must still produce the pack the collector used (same manifest SHA-256).
// Usage: node tools/fm3/t49-multidelay-types-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-13/t49/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const mf=path.join(RAW,'manifest.json'),mb=fs.readFileSync(mf),m=JSON.parse(mb),obs=J(path.join(RAW,'observations.json'));
assert.equal(m.kind,'fm3-shot-check');assert.equal(m.test,'T49');assert.equal(m.items.length,8);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t49-'));let rebuilt;
try{execFileSync('node',[path.join(ROOT,'tools/fm3/t49-multidelay-types-build.mjs'),tmp],{stdio:'ignore'});rebuilt=fs.readFileSync(path.join(tmp,'FM3_T49_MDTYPES','manifest.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.equal(sha(rebuilt),sha(mb),'current generator reproduces the tested pack byte for byte');
const T35=J(path.join(ENG,'references/fm3-t35-multidelay-presets-20261107.json'));
const results=[],files=[rel(mf),rel(path.join(RAW,'observations.json'))];
for(const it of m.items){
 const f=path.join(RAW,`shot-load-${it.id}.json`),res=J(f);files.push(rel(f));
 assert.equal(res.kind,'fm3-shot-load');assert.equal(res.packSha256,sha(mb),it.id+' collector used this manifest');assert.equal(res.preset,it.id);
 const b=res.blocks[0];assert.equal(res.allMatch,true);assert.equal(b.effectId,74);assert.equal(b.values,484);assert.equal(b.matches,true);assert.deepEqual(b.mismatches,[]);
 const o=obs.cases[it.id];assert.ok(o,it.id+' observations');
 it.types.forEach((t,k)=>{assert.equal(t.channel,'ABCD'[k]);assert.equal(T35.presets[t.index].label,t.type);
  assert.deepEqual(it.blocks[0].expected.slice(k*121,(k+1)*121),T35.presets[t.index].words,t.type+' = T35 image');
  assert.equal(o.fm3EditTypes[t.channel],t.type,`${it.id} FM3-Edit Type ${t.channel}`);});
 assert.deepEqual(Object.keys(o.fm3EditTypes),it.types.map(t=>t.channel));
 assert.match(o.listening,/^(ok|kõlas nagu nimi lubab|ok, kõlas nagu nimi lubab)$/);
 results.push({id:it.id,presetSha256:it.sha256,types:it.types,deviceWordsMatch:`${b.values}/${b.values}`,fm3EditTypes:o.fm3EditTypes,listening:o.listening});
}
assert.equal(obs.stored,false);
const types=results.flatMap(r=>r.types.map(t=>t.type));assert.equal(types.length,31);assert.equal(new Set(types).size,31);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-13',test:'T49',
 method:m.method,builder:'tools/fm3/t49-multidelay-types-build.mjs',collector:'FM3_SHOT_LOAD.py --load',packSha256:sha(mb),
 results,types,
 meaning:'All 31 remaining Multi Delay Types written through multidelayTypes (four per preset on channels A..D) load with every Multi Delay word as generated, FM3-Edit shows each Type name and the user heard each channel sound like its Type. With T36/T38/H2 all 39 Types are confirmed for generated load + edit buffer; STORE/reload is confirmed for 8.',
 files,
 notMeasured:['STORE/reload of these 31 templated channels','CPU of the loaded presets','Controls on top of these templates']};
const target=path.join(ENG,'references','fm3-t49-multidelay-types-20261113.json'),content=JSON.stringify(out,null,1)+'\n';
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: t49-multidelay-types-ingest.mjs [--write]');
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T49 receipt stale');
console.log(JSON.stringify({ok:true,presets:results.length,types:types.length,words:results.length*484,stored:false}));
