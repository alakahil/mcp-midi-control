// Receipt for the 2026-11-03 T25/T25b Ten-Tap time screenshot tests (FM3_SHOT_LOAD.py --load, FM3-Edit window
// captures, FM3_SHOT_READ.py re-read after viewing, one front-panel photo). Offline. Both packs are rebuilt
// (tools/fm3/shot-t25-build.mjs) and must match the pack SHA-256 recorded by the loader. Screenshots are not kept;
// the readings were transcribed from them. Nothing was stored or set.
//   T25  (TAP):  Rhythm Tap Time 1–10 on A/B (20 words): loaded exactly, shown exactly (linear 0…10 s, whole ms).
//                Ten-Tap Delay Time 16384/40000 on C/D: shown 1000 ms; re-read 6494 (device clamp with 10 taps).
//                The v1 pack (all channels Ten-Tap) is kept as evidence that Ten-Tap type derives the tap words.
//   T25b (TAPB): Ten-Tap Delay Time 650/1950/3214/5200: all four words held; shown 109/307/500/803 ms (linear
//                0.01…10 s), front panel 803 ms; the device-derived tap words equal Delay Time on the tap scale.
// Usage: node tools/fm3/shot-t25-ingest.mjs [--write]
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
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t25-'));execFileSync('node',[path.join(ROOT,'tools/fm3/shot-t25-build.mjs'),tmp],{stdio:'ignore'});
const packs={};for(const d of ['FM3_T25_TENTAP','FM3_T25B_TENTAP']){const b=fs.readFileSync(path.join(tmp,d,'manifest.json'));packs[d]={sha:sha(b),m:JSON.parse(b)};}
fs.rmSync(tmp,{recursive:true,force:true});
const raw=(id,kind)=>path.join(RAW,`fm3-shot-t25-${id.toLowerCase()}-20261103-${kind}.json`);
const W=65534,TAPW=ms=>ms/10000*W,delayMs=r=>10+r*9990/W,tapMs=r=>r/W*10000;
const num=s=>Number(/-?\d+(?:\.\d+)?/.exec(s)[0]);
const idx=(ch,pid)=>'ABCD'.indexOf(ch)*48+pid;
const TAPS=Array.from({length:10},(_,i)=>17+i);

// ---- T25 (TAP) ----
const P1=packs.FM3_T25_TENTAP,tap=P1.m.items.find(x=>x.id==='TAP');
const l1=J(raw('tap','load'));
assert.equal(l1.kind,'fm3-shot-load');assert.equal(l1.packSha256,P1.sha,'TAP pack rebuilt identically');assert.equal(l1.preset,'TAP');assert.equal(l1.name,tap.name);
assert.equal(l1.allMatch,true);for(const b of l1.blocks){assert.equal(b.matches,true);for(const w of b.testWords)assert.equal(w.device,w.raw,'read-back '+w.param+' '+w.channel);}
const r1=J(raw('tap','read'));assert.equal(r1.kind,'fm3-shot-read');assert.equal(r1.packSha256,P1.sha);assert.equal(r1.preset,'TAP');
const dev1=r1.blocks[0].device,exp1=tap.blocks[0].expected;
for(const m of r1.blocks[0].mismatches)assert.ok('CD'.includes(m.channel)&&[2,...TAPS].includes(m.pid),'only C/D Delay Time and taps changed');
for(const ch of 'CD'){assert.equal(dev1[idx(ch,2)],6494,'clamped Delay Time '+ch);for(const p of TAPS)assert.equal(dev1[idx(ch,p)],6553,'derived tap '+ch);}
for(const ch of 'AB')for(let p=0;p<48;p++)assert.equal(dev1[idx(ch,p)],exp1[idx(ch,p)],'A/B unchanged after viewing');
const s1=J(raw('tap','readings'));assert.equal(s1.preset,'TAP');
const byKey=it=>new Map(it.writes.map(w=>[w.param+':'+w.channel,w]));
const k1=byKey(tap);
const times=s1.readings.filter(x=>x.param!=='TENTAP_TIMEM').map(x=>{const w=k1.get(x.param+':'+x.channel);assert.ok(w,'written '+x.param+' '+x.channel);
  const predicted=tapMs(w.raw);return {channel:x.channel,type:x.type,page:x.page,param:x.param,raw:w.raw,predictedMs:+predicted.toFixed(3),shown:x.shown,exact:Math.round(predicted)===num(x.shown)};});
assert.equal(times.length,20);assert.deepEqual(times.filter(x=>!x.exact),[],'all Rhythm Tap times exact');
const clampShots=s1.readings.filter(x=>x.param==='TENTAP_TIMEM').map(x=>{const w=k1.get(x.param+':'+x.channel),dv=dev1[idx(x.channel,2)];
  return {channel:x.channel,written:w.raw,device:dv,shown:x.shown,numberOfTaps:x.numberOfTaps,exact:Math.round(delayMs(dv))===num(x.shown)};});
assert.deepEqual(clampShots.filter(x=>!x.exact),[],'clamped Delay Time shown as decoded');
const v1=J(raw('tap','load-v1')),m1=J(raw('tap','manifest-v1'));
assert.equal(v1.packSha256,sha(fs.readFileSync(raw('tap','manifest-v1'))),'v1 load matches the kept v1 manifest');assert.equal(v1.allMatch,false);
assert.ok(v1.blocks[0].mismatches.every(m=>m.channel==='A'&&TAPS.includes(m.pid)&&m.device===3276),'v1: channel A Time words reset to the Delay Time image');

// ---- T25b (TAPB) ----
const P2=packs.FM3_T25B_TENTAP,tapb=P2.m.items.find(x=>x.id==='TAPB');
const l2=J(raw('tapb','load')),r2=J(raw('tapb','read'));
for(const r of [l2,r2]){assert.equal(r.packSha256,P2.sha,'TAPB pack rebuilt identically');assert.equal(r.preset,'TAPB');}
assert.equal(l2.name,tapb.name);for(const w of l2.blocks[0].testWords)assert.equal(w.device,w.raw,'Delay Time held '+w.channel);
const dev2=r2.blocks[0].device,exp2=tapb.blocks[0].expected;
for(const m of [...l2.blocks[0].mismatches,...r2.blocks[0].mismatches])assert.ok(TAPS.includes(m.pid),'only derived tap words differ');
const k2=byKey(tapb);
const derived=[...'ABCD'].map(ch=>{const d=dev2[idx(ch,2)];assert.equal(d,k2.get('TENTAP_TIMEM:'+ch).raw);const t=dev2[idx(ch,17)];
  for(const p of TAPS)assert.equal(dev2[idx(ch,p)],t,'equal taps '+ch);
  const predicted=Math.round(TAPW(delayMs(d)));assert.ok(Math.abs(predicted-t)<=1,'tap word = Delay Time on tap scale '+ch);return {channel:ch,delayRaw:d,tapWord:t,predictedTapWord:predicted};});
for(let i=0;i<dev2.length;i++)if(!TAPS.includes(i%48))assert.equal(dev2[i],exp2[i],'non-tap word unchanged '+i);
const s2=J(raw('tapb','readings'));assert.equal(s2.preset,'TAPB');
const cmp=(x,src)=>{const w=k2.get(x.param+':'+x.channel);assert.ok(w);const predicted=delayMs(w.raw),dict=HYP(w.raw);
  return {source:src,channel:x.channel,type:x.type,param:x.param,raw:w.raw,predictedMs:+predicted.toFixed(3),dictionaryLinearMs:+dict.toFixed(3),shown:x.shown,numberOfTaps:x.numberOfTaps,exact:Math.round(predicted)===num(x.shown)};};
const HYP=r=>(0.0010000000474974513+r/W*(2-0.0010000000474974513))*1000;
const delay=s2.readings.map(x=>cmp(x,'FM3-Edit')),front=(s2.frontPanel??[]).map(x=>cmp(x,'front panel'));
assert.equal(delay.length,4);assert.deepEqual([...delay,...front].filter(x=>!x.exact),[],'all Delay Time readings exact');

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-03',test:'T25/T25b',
 method:'FM3_SHOT_LOAD.py --load (Remote Control): edit-buffer load (7F 00) of one generated preset and a read-only fn=0x1F bulk read of the Ten-Tap block (all words, all channels); Claude read the controls from FM3-Edit window captures, FM3_SHOT_READ.py re-read the block after viewing, and the user photographed the front panel once. Nothing stored or set.',
 notMeasured:['audio','STORE/reload','Delay Time limit for fewer than 10 taps'],
 t25:{packSha256:P1.sha,preset:'TAP',name:tap.name,load:{...rel(raw('tap','load')),time:l1.time,allMatch:true,testWords:l1.blocks[0].testWords.length},reread:{...rel(raw('tap','read')),time:r1.time},readings:rel(raw('tap','readings')),
  rhythmTimes:times,clampedDelay:clampShots,firstPack:{load:rel(raw('tap','load-v1')),manifest:rel(raw('tap','manifest-v1')),result:'all channels type Ten-Tap Delay: channel A Time 1–10 words replaced by 3276 on load (derived from the default Delay Time), so Time 1–10 are not stored in Ten-Tap type'}},
 t25b:{packSha256:P2.sha,preset:'TAPB',name:tapb.name,load:{...rel(raw('tapb','load')),time:l2.time},reread:{...rel(raw('tapb','read')),time:r2.time},readings:rel(raw('tapb','readings')),delayTime:delay,frontPanel:front,derivedTaps:derived},
 summary:{rhythmTimesExact:times.filter(x=>x.exact).length,delayTimeExact:delay.filter(x=>x.exact).length,frontPanelExact:front.filter(x=>x.exact).length,
  timeScale:'TENTAP_TIME1M…10M: linear 0…10 s, whole ms; Rhythm Tap Delay only',delayScale:'TENTAP_TIMEM: linear 0.01…10 s (ms = 10 + raw·9990/65534), not the pinned 0.001…2 s; Ten-Tap Delay only',
  clamp:'With 10 taps the device clamps Delay Time to 1000 ms (raw 6494); writes are limited to 10…1000 ms',
  meaning:'Time 1–10 and Delay Time move from unverified-taper to measured (fm3-tentap-times.mjs).'}};
const target=path.join(ENG,'references','fm3-shot-t25-tentap-20261103.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T25 receipt stale');
console.log(JSON.stringify(out.summary.rhythmTimesExact+'/'+times.length+' times, '+out.summary.delayTimeExact+'/4 delay, front '+out.summary.frontPanelExact));
