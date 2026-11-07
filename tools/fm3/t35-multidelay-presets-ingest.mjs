// Receipt for the 2026-11-07 T35 Multi Delay preset sweep (audit O4/H3). Offline. The pack is rebuilt
// (tools/fm3/t35-multidelay-presets-build.mjs) and must match the manifest SHA-256 the collector recorded.
// FM3_MD_PRESETS.py: per Type, edit-buffer load (7F 00) of the device-default Multi Delay + fn=0x1F read (must equal the
// default), the user chose the Type on channel A (no Save), fn=0x1F read saved. The scripts never stored or set.
// Every one of the 39 Types is recorded as a full 121-word channel image; cross-checks: Pealing Bells repeats T27
// byte for byte, Types 1..3 equal the MD_TYPES export images, Type 0 equals the device-default channel.
// Usage: node tools/fm3/t35-multidelay-presets-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-07/t35/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t35-'));
let mb;try{execFileSync('node',[path.join(ROOT,'tools/fm3/t35-multidelay-presets-build.mjs'),tmp],{stdio:'ignore'});mb=fs.readFileSync(path.join(tmp,'FM3_T35_MDPRESETS','manifest.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
const m=JSON.parse(mb),W=121,def=m.block.expected;
const o4f=path.join(ENG,'references/fm3-o4-multidelay-presets-20261107.json'),o4=J(o4f);
const dict=J(path.join(ENG,'references/fm3-param-dictionary.json')),P=new Map(dict.params.filter(p=>p.family==='MULTITAP').map(p=>[p.param,p]));
assert.equal(m.presets.length,39);assert.deepEqual(def.slice(0,W),o4.defaultChannel.words);
const presets=m.presets.map(({index,label})=>{
  const f=path.join(RAW,`md-preset-${String(index).padStart(2,'0')}.json`),r=J(f);
  assert.equal(r.kind,'fm3-md-preset');assert.equal(r.packSha256,sha(mb),'pack rebuilt identically '+index);
  assert.equal(r.index,index);assert.equal(r.label,label);assert.equal(r.status,'ok',label);assert.equal(r.loadMatchedDefault,true);
  assert.equal(r.device.length,4*W);
  for(let i=W;i<4*W;i++)assert.equal(r.device[i],def[i],label+': channels B..D unchanged');
  const words=r.device.slice(0,W);assert.equal(words[114],index);assert.equal(r.presetWord,index);assert.equal(r.algorithm,words[0]);
  const changed=words.map((v,pid)=>v!==def[pid]?pid:-1).filter(p=>p>=0);
  assert.deepEqual(r.changedA.map(c=>c.pid),changed,label+' changed list');
  return {index,label,algorithm:P.get(0).enum[words[0]],algorithmWord:words[0],changedPids:changed,words,file:rel(f),time:r.time};
});
// Cross-checks with earlier, independent observations.
assert.deepEqual(presets[12].words,o4.pealingBells.words,'Pealing Bells = T27 (FM3-Edit, 2026-11-05)');
for(const d of o4.donorPresets.presets)assert.deepEqual(presets[d.presetWord].words,d.words,d.label+' = MD_TYPES export');
assert.deepEqual(presets[0].words,o4.defaultChannel.words,'Type 0 = device-default channel');
assert.equal(new Set(presets.map(p=>p.words.join(','))).size,39,'39 distinct images');
const anyTypePids=[...new Set(presets.flatMap(p=>p.changedPids))].sort((a,b)=>a-b);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',test:'T35',audit:'O4/H3',
 method:m.method,builder:'tools/fm3/t35-multidelay-presets-build.mjs',collector:'FM3_MD_PRESETS.py',packSha256:sha(mb),
 defaultChannel:{words:def.slice(0,W),presetWord:0},
 crossChecks:{pealingBellsEqualsT27:true,types1to3EqualMdTypesExport:true,type0EqualsDefault:true,distinctImages:39,source:rel(o4f)},
 summary:{types:39,wordsChangedPerType:Object.fromEntries(presets.map(p=>[p.label,p.changedPids.length])),pidsWrittenByAnyType:anyTypePids,
  algorithmPerType:Object.fromEntries(presets.map(p=>[p.label,p.algorithm])),
  meaning:'Every Multi Delay Type is now a measured full-channel image from the device-default start. Choosing a Type changed only channel A; the device kept channels B..D. These images are what a Type selection produces from the default; the generator can apply one as a full-channel template (all 121 words), not as a selector write.'},
 presets:presets.map(({words,...p})=>({...p,words})),
 notMeasured:['audio of each Type','STORE/reload of a Type image','the fill from a non-default start (images are from the device default)','whether front panel and FM3-Edit fills differ (the Pealing Bells repeat matched T27 exactly)']};
const target=path.join(ENG,'references','fm3-t35-multidelay-presets-20261107.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T35 receipt stale');
console.log(JSON.stringify({types:presets.length,ok:true,maxChanged:Math.max(...presets.map(p=>p.changedPids.length)),pidsAny:anyTypePids.length}));
