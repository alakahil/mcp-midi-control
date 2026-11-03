// Receipt for the 2026-11-03 T24 option-selector screenshot test (FM3_SHOT_LOAD.py --load, then FM3-Edit window
// captures). Offline. The pack is rebuilt (tools/fm3/shot-t24-build.mjs) and must match the pack SHA-256 recorded by
// the loader. The loader read every test block back with fn=0x1F; every written option is compared with the label
// FM3-Edit showed (case-insensitive; the Dyna-Cab list prefixes its index, the Cab 2 solo state is a lit S button and
// the Resonator mode is shown in the TYPE field). Screenshots are not kept; the readings were transcribed from them.
// Nothing was stored or set.
// Usage: node tools/fm3/shot-t24-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-03/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t24-'));execFileSync('node',[path.join(ROOT,'tools/fm3/shot-t24-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'FM3_T24_ENUM','manifest.json')),pack={sha:sha(mb),m:JSON.parse(mb)};fs.rmSync(tmp,{recursive:true,force:true});
const raw=(id,kind)=>path.join(RAW,`fm3-shot-t24-${id.toLowerCase()}-20261103-${kind}.json`);
function load(f,it){
  const r=JSON.parse(fs.readFileSync(f,'utf8'));
  assert.equal(r.kind,'fm3-shot-load');assert.equal(r.packSha256,pack.sha,'pack rebuilt identically '+it.id);assert.equal(r.preset,it.id);assert.equal(r.name,it.name);
  assert.equal(r.allMatch,true,'all words match '+it.id);assert.deepEqual(r.blocks.map(b=>b.family),it.blocks.map(b=>b.family));
  for(const b of r.blocks){assert.equal(b.matches,true);assert.deepEqual(b.mismatches,[]);for(const w of b.testWords)assert.equal(w.device,w.raw,'read-back '+w.param+' '+w.channel);}
  return {...rel(f),time:r.time,blocks:r.blocks.length,words:r.blocks.reduce((a,b)=>a+b.values,0),testWords:r.blocks.reduce((a,b)=>a+b.testWords.length,0),allMatch:true};
}
const norm=s=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
const SPECIAL={CABINET_DYNACAB_TYPE1:(shown,label)=>new RegExp('^\\d+: '+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i').test(shown),
 CABINET_MUTE2:(shown,label)=>label==='SOLO'&&/^S \(/.test(shown),RESONATOR_MODE:(shown,label)=>norm(shown).startsWith(norm(label)+' (')};
const parts=pack.m.items.map(it=>{
  const loads=[load(raw(it.id,'load'),it)];if(fs.existsSync(raw(it.id,'load2')))loads.push(load(raw(it.id,'load2'),it));
  const f=raw(it.id,'readings'),r=JSON.parse(fs.readFileSync(f,'utf8'));assert.equal(r.test,'T24');assert.equal(r.preset,it.id);
  const byKey=new Map(it.writes.map(w=>[w.param+':'+w.channel,w]));
  const rows=r.readings.map(x=>{const w=byKey.get(x.param+':'+x.channel);assert.ok(w,'written '+x.param+' '+x.channel);assert.equal(x.block,w.block);
    const exact=SPECIAL[w.param]?SPECIAL[w.param](x.shown,w.codecDisplay):norm(x.shown)===norm(w.codecDisplay);
    return {block:w.block,channel:w.channel,type:x.type,param:w.param,label:w.label,pid:w.pid,status:w.status,raw:w.raw,options:w.options,codecDisplay:w.codecDisplay,shown:x.shown,exact};});
  assert.equal(new Set(rows.map(x=>x.param+':'+x.channel)).size,it.writes.length,'every written option read '+it.id);
  const fp=(r.frontPanel??[]).map(x=>{const w=byKey.get(x.param+':'+x.channel);assert.ok(w,'front panel '+x.param);return {block:w.block,channel:w.channel,type:x.type,param:w.param,raw:w.raw,codecDisplay:w.codecDisplay,shown:x.shown,exact:norm(x.shown)===norm(w.codecDisplay)};});
  assert.deepEqual([...rows,...fp].filter(x=>!x.exact),[],'all readings exact '+it.id);
  return {preset:it.id,name:it.name,cpuEstimate:it.cpuEstimate,loads,readings:rel(f),controls:rows,frontPanel:fp,notes:r.notes??null};
});
const all=parts.flatMap(p=>p.controls),front=parts.flatMap(p=>p.frontPanel);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-03',test:'T24',packSha256:pack.sha,
 method:'FM3_SHOT_LOAD.py --load (Remote Control): edit-buffer load (7F 00) of one generated preset, then a read-only fn=0x1F bulk read of every test block (all words, all channels) compared word for word; the written option selectors were then read from FM3-Edit block pages (window captures) and two of them from an FM3 front-panel photo. Nothing stored or set.',
 notMeasured:['audio','STORE/reload'],parts,
 summary:{controls:all.length,exact:all.filter(x=>x.exact).length,frontPanel:front.length,frontPanelExact:front.filter(x=>x.exact).length,families:[...new Set(all.map(x=>x.block))],parameters:[...new Set(all.map(x=>x.param))].sort(),
  meaning:'Every written option selector (non-default label, unique and shared label lists, 15 families including the inserted blocks) shows exactly the label the encoder maps the stored index to; no 0/1-based offset anywhere. The option index convention of the pinned dictionary is confirmed on hardware for these families (fm3-enum-promotion.mjs).'}};
const target=path.join(ENG,'references','fm3-shot-t24-enum-20261103.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T24 receipt stale');
console.log(JSON.stringify({controls:out.summary.controls,exact:out.summary.exact}));
