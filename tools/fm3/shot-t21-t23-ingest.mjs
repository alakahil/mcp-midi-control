// Receipts for the 2026-11-02 T21-T23 screenshot tests (FM3_SHOT_LOAD.py --load, then FM3-Edit screenshots and
// front-panel photos read by the user). Offline. The packs are rebuilt (tools/fm3/shot-t21-t23-build.mjs) and must
// match the pack SHA-256 recorded by the loader. The loader read every test block back with fn=0x1F; the readings
// are compared with the encoder display of the written word, rounded to the decimals shown. Screenshots are not
// kept in the repo; the readings were transcribed from them. Nothing was stored or set.
// Usage: node tools/fm3/shot-t21-t23-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-02/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t21-'));execFileSync('node',[path.join(ROOT,'tools/fm3/shot-t21-t23-build.mjs'),tmp],{stdio:'ignore'});
const packs={};for(const d of ['FM3_T21_MIX','FM3_T22_INT','FM3_T23_DYN']){const b=fs.readFileSync(path.join(tmp,d,'manifest.json'));packs[d]={sha:sha(b),m:JSON.parse(b)};}
fs.rmSync(tmp,{recursive:true,force:true});
const raw=(t,id,kind)=>path.join(RAW,`fm3-shot-${t}-${id.toLowerCase()}-20261102-${kind}.json`);
// Loader result: pack identical, every word of every test block equal to the generated preset.
function load(pack,t,id){
  const f=raw(t,id,'load'),r=JSON.parse(fs.readFileSync(f,'utf8')),it=pack.m.items.find(x=>x.id===id);
  assert.equal(r.kind,'fm3-shot-load');assert.equal(r.packSha256,pack.sha,'pack rebuilt identically '+id);assert.equal(r.preset,id);assert.equal(r.name,it.name);
  assert.equal(r.allMatch,true,'all words match '+id);assert.deepEqual(r.blocks.map(b=>b.family),it.blocks.map(b=>b.family));
  for(const b of r.blocks){assert.equal(b.matches,true);assert.deepEqual(b.mismatches,[]);for(const w of b.testWords)assert.equal(w.device,w.raw,'read-back '+w.param+' '+w.channel);}
  return {it,file:f,time:r.time,blocks:r.blocks.length,words:r.blocks.reduce((a,b)=>a+b.values,0),testWords:r.blocks.reduce((a,b)=>a+b.testWords.length,0)};
}
function readings(pack,t,id){
  const L=load(pack,t,id),f=raw(t,id,'readings'),r=JSON.parse(fs.readFileSync(f,'utf8'));
  assert.equal(r.preset,id);
  const byKey=new Map(L.it.writes.map(w=>[w.param+':'+w.channel,w]));
  const cmp=(x,src)=>{const w=byKey.get(x.param+':'+x.channel);assert.ok(w,'written '+x.param+' '+x.channel);
    const num=Number((/-?\d+(?:\.\d+)?/.exec(x.shown))[0]),dec=(/\.(\d+)/.exec(x.shown)?.[1]??'').length;
    const display=w.kind==='integer'?w.requested:w.codecDisplay;
    return {source:src,block:w.block,channel:w.channel,type:x.type??null,page:x.page??null,param:w.param,label:w.label,kind:w.kind,flags:w.flags,requested:w.requested,raw:w.raw,codecDisplay:display,
      shown:x.shown,shownValue:num,shownDecimals:dec,exact:Math.abs(Number(display.toFixed(dec))-num)<1e-9&&num===w.requested};};
  const rows=r.readings.map(x=>cmp(x,'FM3-Edit'));const fp=(r.frontPanel??[]).map(x=>cmp({...x,type:rows.find(y=>y.param===x.param&&y.channel===x.channel)?.type},'front panel'));
  assert.equal(new Set(rows.map(x=>x.param+':'+x.channel)).size,L.it.writes.length,'every written control read '+id);
  assert.deepEqual([...rows,...fp].filter(x=>!x.exact),[],'all readings exact '+id);
  return {preset:id,name:L.it.name,load:{...rel(L.file),time:L.time,blocks:L.blocks,words:L.words,testWords:L.testWords,allMatch:true},readings:rel(f),controls:rows,frontPanel:fp,notes:r.notes};
}
const common={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-02',
 method:'FM3_SHOT_LOAD.py --load (Remote Control): edit-buffer load (7F 00) of one generated preset, then a read-only fn=0x1F bulk read of every test block (all words, all channels) compared word for word; the user then read the written controls from FM3-Edit screenshots and front-panel photos. Nothing stored or set.',
 notMeasured:['audio','STORE/reload']};
const out={};
{const P=packs.FM3_T21_MIX,parts=['STD','PITCH','TREM'].map(id=>readings(P,'t21',id)),all=parts.flatMap(p=>[...p.controls,...p.frontPanel]);
 const cls=f=>parts.flatMap(p=>p.controls).filter(c=>c.flags===f);
 out.t21={...common,test:'T21',packSha256:P.sha,parts,summary:{controls:parts.reduce((a,p)=>a+p.controls.length,0),frontPanel:parts.reduce((a,p)=>a+p.frontPanel.length,0),exact:all.filter(x=>x.exact).length,
  mixParameters:cls('0x0705').map(c=>c.param),balanceParameters:cls('0x0900').map(c=>c.param),
  meaning:'Mix (flags 0x0705, 0..100 %, one decimal) and Balance (flags 0x0900, -100..100, one decimal) display exactly as the linear encoder predicts on every tested family; both classes become default-writable (fm3-display-classes.mjs).'}};}
{const P=packs.FM3_T22_INT,parts=[readings(P,'t22','INT')],all=parts.flatMap(p=>[...p.controls,...p.frontPanel]);
 out.t22={...common,test:'T22',packSha256:P.sha,parts,summary:{controls:parts[0].controls.length,frontPanel:parts[0].frontPanel.length,exact:all.filter(x=>x.exact).length,
  multiplierChecked:parts[0].controls.filter(c=>c.param==='CHORUS_VOICES').map(c=>({param:c.param,raw:c.raw,shown:c.shown})),signedChecked:parts[0].controls.filter(c=>c.requested<0).map(c=>({param:c.param,raw:c.raw,shown:c.shown})),
  meaning:'Class 0x01 stored integers display as raw × multiplier, signed (two’s complement 16-bit), on drive, reverb, delay, chorus and phaser; the class becomes default-writable (fm3-display-classes.mjs).'}};}
{const P=packs.FM3_T23_DYN,L=load(P,'t23','DYN'),f=raw('t23','DYN','readings'),r=JSON.parse(fs.readFileSync(f,'utf8'));
 assert.equal(r.result,'not-shown');assert.deepEqual(r.readings,[]);assert.equal(L.testWords,8);
 out.t23={...common,test:'T23',experimental:true,packSha256:P.sha,parts:[{preset:'DYN',name:L.it.name,load:{...rel(L.file),time:L.time,blocks:L.blocks,words:L.words,testWords:L.testWords,allMatch:true},readings:rel(f),
  written:L.it.writes.map(w=>({param:w.param,channel:w.channel,raw:w.raw})),notes:r.notes}],
  summary:{storedExactly:L.testWords,shown:0,result:'DISTORT_DYNDEPTH and DISTORT_DYNPRES are stored and read back exactly but have no control in FM3-Edit or on the FM3 front panel; they stay unverified-taper and the composer must not write them.'}};}
const targets={t21:'fm3-shot-t21-mix-20261102.json',t22:'fm3-shot-t22-int-20261102.json',t23:'fm3-shot-t23-dyn-20261102.json'};
for(const [k,name] of Object.entries(targets)){const target=path.join(ENG,'references',name),content=JSON.stringify(out[k],null,1)+'\n';
 if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,name+' stale');}
console.log(JSON.stringify({t21:out.t21.summary.exact,t22:out.t22.summary.exact,t23Stored:out.t23.summary.storedExactly}));
