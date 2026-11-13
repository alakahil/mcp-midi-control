// Receipt for the 2026-11-13 T52 Plex preset sweep. Offline. The pack is rebuilt (tools/fm3/t52-plex-presets-build.mjs)
// and must match the manifest SHA-256 the collector recorded. FM3_PLEX_PRESETS.py: per preset, edit-buffer load (7F 00)
// of the device-default Plex block + fn=0x1F read (must equal the default), the user chose the Plex preset (PLEX_PRESETS,
// pid 90) on channel A (no Save), fn=0x1F read saved. The scripts never stored or set.
// Every one of the 45 Plex presets is recorded as a full 96-word channel image from the device-default start.
// Usage: node tools/fm3/t52-plex-presets-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-13/t52/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t52-'));
let mb;try{execFileSync('node',[path.join(ROOT,'tools/fm3/t52-plex-presets-build.mjs'),tmp],{stdio:'ignore'});mb=fs.readFileSync(path.join(tmp,'FM3_T52_PLEXPRESETS','manifest.json'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
const m=JSON.parse(mb),W=96,PRESET_PID=90,def=m.block.expected;
assert.equal(m.test,'T52');assert.equal(m.block.effectId,178);assert.equal(m.block.words,W);assert.equal(def.length,4*W);assert.equal(m.presets.length,45);
const presets=m.presets.map(({index,label})=>{
 const f=path.join(RAW,`plex-preset-${String(index).padStart(2,'0')}.json`),r=J(f);
 assert.equal(r.kind,'fm3-plex-preset');assert.equal(r.packSha256,sha(mb),'pack rebuilt identically '+index);
 assert.equal(r.index,index);assert.equal(r.label,label);assert.equal(r.status,'ok',label);assert.equal(r.loadMatchedDefault,true);
 assert.equal(r.device.length,4*W);
 for(let i=W;i<4*W;i++)assert.equal(r.device[i],def[i],label+': channels B..D unchanged');
 const words=r.device.slice(0,W);assert.equal(words[PRESET_PID],index,label+' preset word');assert.equal(r.presetWord,index);assert.equal(r.type,words[0]);
 const changed=words.map((v,pid)=>v!==def[pid]?pid:-1).filter(p=>p>=0);
 assert.deepEqual(r.changedA.map(c=>c.pid),changed,label+' changed list');
 return {index,label,typeWord:words[0],changedPids:changed,words,file:rel(f),time:r.time};
});
const distinct=new Set(presets.map(p=>p.words.join(','))).size;
assert.equal(distinct,45,'45 distinct images');
const anyPids=[...new Set(presets.flatMap(p=>p.changedPids))].sort((a,b)=>a-b);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-13',test:'T52',
 method:m.method,builder:'tools/fm3/t52-plex-presets-build.mjs',collector:'FM3_PLEX_PRESETS.py',packSha256:sha(mb),
 block:{family:'plex',effectId:178,words:W,presetPid:PRESET_PID},
 defaultChannel:{words:def.slice(0,W),presetWord:def[PRESET_PID]},
 summary:{presets:45,distinctImages:distinct,wordsChangedPerPreset:Object.fromEntries(presets.map(p=>[p.label,p.changedPids.length])),pidsWrittenByAnyPreset:anyPids,
  meaning:'Every Plex preset is a measured full-channel image from the device-default start; choosing one changed only channel A. A generator can apply one as a full-channel template (all 96 words), as multidelayTypes does for Multi Delay; the selector word alone fills nothing.'},
 presets,
 notMeasured:['generated load of a Plex template','audio of each preset','STORE/reload of a Plex image','the fill from a non-default start']};
const target=path.join(ENG,'references','fm3-t52-plex-presets-20261113.json'),content=JSON.stringify(out,null,1)+'\n';
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: t52-plex-presets-ingest.mjs [--write]');
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T52 receipt stale');
console.log(JSON.stringify({ok:true,presets:presets.length,distinct,maxChanged:Math.max(...presets.map(p=>p.changedPids.length)),pidsAny:anyPids.length}));
