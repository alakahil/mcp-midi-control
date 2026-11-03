// Build the T25 screenshot test pack (FM3_SHOT_LOAD.py --load; FM3-Edit screenshots). Offline.
// Goal: open the Ten-Tap Delay times for the sound composer. Twelve Ten-Tap words have no verified display class
// ('unverified-taper', no encoder): Delay Time (class 0x00, 0.001..2 s), Time 1..10 (class 0x0f00, 0..10, x1000)
// and the hidden Ref Tempo (class 0x0f80, 30..250; device default word 120). The Ten-Tap block is inserted through
// the composer (device-default donor record, Number of Taps 10 on every channel so all ten taps are visible), and
// the twelve words are then written as raw words at chosen points, one set per channel:
//   A  Time n at off-grid multiples of 187.3 ms (to 1873 ms), Delay Time = device default word 3214, Ref Tempo 120
//   B  Time n at small values (11.7 ms steps, low-end shape), Delay Time word 16384, Ref Tempo 90
//   C  Time n at large values (2500 + 650 n ms, top of the range), Delay Time word 32767, Ref Tempo 140
//   D  Time n left at the device default words (3276 x6, 0 x4), Delay Time word 65534, Ref Tempo 200
// Hypotheses recorded in the manifest (the reading decides): Time n linear 0..10 s shown in ms; Delay Time linear
// or logarithmic over 1..2000 ms (the two predictions differ at every written point); Ref Tempo a plain integer.
// The loader puts the preset in the edit buffer and reads the block back with fn=0x1F. Nothing is stored or set.
// The pack also carries the MultiDelay donor instructions (two FM3-Edit exports, no Save), see LOE_MIND.txt.
// Usage: node tools/fm3/shot-t25-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: shot-t25-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const W=65534,msWord=ms=>Math.round(ms/10000*W);
export const HYPOTHESES={
 time:{param:'TENTAP_TIMEnM',rule:'linear 0..10 s, shown in ms',predict:raw=>raw/W*10000},
 delayLinear:{param:'TENTAP_TIMEM',rule:'linear 0.001..2 s, shown in ms',predict:raw=>(0.0010000000474974513+raw/W*(2-0.0010000000474974513))*1000},
 delayLog:{param:'TENTAP_TIMEM',rule:'logarithmic 0.001..2 s, shown in ms',predict:raw=>0.0010000000474974513*Math.pow(2/0.0010000000474974513,raw/W)*1000},
 refTempo:{param:'TENTAP_REFTEMPO',rule:'plain integer BPM',predict:raw=>raw}};
const TAPS=Array.from({length:10},(_,i)=>i+1);
const RAW={
 A:{times:TAPS.map(k=>msWord(187.3*k)),delay:3214,ref:120},
 B:{times:TAPS.map(k=>msWord(11.7*k)),delay:16384,ref:90},
 C:{times:TAPS.map(k=>msWord(2500+650*k)),delay:32767,ref:140},
 D:{times:null,delay:65534,ref:200}};
const NEWLOOK='examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx';
const item={id:'TAP',name:'SHOT T25 TENTAP TIMES',dir:'FM3_T25_TENTAP'};
const composed=Buffer.from(composeSound(read(NEWLOOK),{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:item.name,
 compressorChannels:[{channel:'A',type:'Optical Compressor'}]},insert:['tentap'],selectedScene:1,
 layout:{row2:['compressor','drive','amp','cab'],row3:['delay','tentap','reverb']},
 controls:'ABCD'.split('').map(ch=>({block:'tentap',channel:ch,param:'TENTAP_NUMTAPS',value:10}))}).syx);
const st0=inspectStructure(composed),body=Buffer.from(st0.raw.body),{records}=scanRecords(body,{requireAmpCab:false});
const rec=records.find(r=>r.family==='tentap');assert.ok(rec,'tentap record');assert.equal(rec.words,48);assert.equal(rec.channels,4);
const off=(ch,pid)=>rec.start+2*(ch*rec.words+pid);
const P={delay:findParam('tentap','TENTAP_TIMEM'),ref:findParam('tentap','TENTAP_REFTEMPO'),times:TAPS.map(k=>findParam('tentap','TENTAP_TIME'+k+'M'))};
for(const p of [P.delay,P.ref,...P.times])assert.equal(p.status,'unverified-taper',p.name+' still unverified');
const writes=[];
for(const [ci,ch] of [...'ABCD'].entries()){
 const r=RAW[ch];assert.equal(body.readUInt16LE(off(ci,7)),10,'Number of Taps 10 on '+ch);
 const put=(p,raw)=>{const before=body.readUInt16LE(off(ci,p.param));body.writeUInt16LE(raw,off(ci,p.param));
  writes.push({block:'tentap',channel:ch,param:p.name,label:p.label,pid:p.param,kind:p.kind,status:p.status,flags:p.flags,raw,deviceDefault:before===raw});};
 put(P.delay,r.delay);put(P.ref,r.ref);
 P.times.forEach((p,i)=>put(p,r.times?r.times[i]:body.readUInt16LE(off(ci,p.param))));
}
const syx=Buffer.from(reencodeDumpFromRawPatch(composed,reencodeRawPatch(st0.raw.rawPatch,body)));
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,item.name);assert.ok(Buffer.from(st.raw.body).equals(body),'re-encode round trip');
const cpu=estimateCpu(syx).maxPercent;assert.ok(cpu<75,'CPU '+cpu);
const word=(ch,pid)=>body.readUInt16LE(off(ch,pid));
for(const w of writes)assert.equal(word('ABCD'.indexOf(w.channel),w.pid),w.raw);
for(const w of writes){
 if(w.param==='TENTAP_TIMEM')w.predictions={linear:+HYPOTHESES.delayLinear.predict(w.raw).toFixed(3),log:+HYPOTHESES.delayLog.predict(w.raw).toFixed(3)};
 else if(w.param==='TENTAP_REFTEMPO')w.predictions={integer:w.raw};
 else w.predictions={linear:+HYPOTHESES.time.predict(w.raw).toFixed(3)};
}
const dir=path.join(out,item.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,item.id+'.syx'),syx);
const blocks=[{family:'tentap',effectId:rec.eid,words:rec.words,channels:rec.channels,request:hex(R.bulkReadPoll(rec.eid)),
 expected:Array.from({length:rec.channels},(_,ch)=>Array.from({length:rec.words},(_,p)=>word(ch,p))).flat(),
 writes:writes.map(w=>({param:w.param,channel:w.channel,pid:w.pid,raw:w.raw}))}];
const show=w=>(w.label??'Ref Tempo')+' ≈ '+Object.values(w.predictions).map(v=>Math.round(v*10)/10).join(' / ');
const shots=[...'ABCD'].map(ch=>({block:'tentap',channel:ch,controls:writes.filter(w=>w.channel===ch).map(show)}));
const items=[{id:item.id,file:item.id+'.syx',sha256:sha(syx),name:item.name,cpuEstimate:cpu,writes,blocks,shots}];
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-03',test:'T25',title:'Ten-Tap ajad',experimental:true,
 hypotheses:Object.fromEntries(Object.entries(HYPOTHESES).map(([k,h])=>[k,{param:h.param,rule:h.rule}])),
 method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads the Ten-Tap block back with fn=0x1F (all words, all channels; read-only). The twelve Ten-Tap time words are raw words (experimental); the FM3-Edit screenshots give their display scale. Nothing is stored or set.',items};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=['FM3 katse T25: Ten-Tap ajad + MultiDelay näidis (ainult laadimine, pildid ja eksport)','='.repeat(60),
 'Skript EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris; preseti vahetamine kustutab selle.',
 'FM3-Editis EI vajutata kunagi Save. Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse).','',
 'OSA 1: Ten-Tap ajad (Remote Control laadib, Claude teeb pildid)',
 '  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 `  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/${item.dir}`,'     python3 FM3_SHOT_LOAD.py --self-test',
 `  2. python3 FM3_SHOT_LOAD.py --load --pack . --session ../${item.dir}_SESSION --preset ${item.id}`,
 '     Skript kontrollib ise, et seade hoiab kõiki väärtusi ("Kõik plokid klapivad").',
 '  3. FM3-Editis Ten-Tap Delay plokk, kanalid A, B, C ja D: pildid lehtedest, kus on Delay Time ja Time 1-10',
 '     (ja Ref Tempo, kui see on kuskil näha). Väärtused pärast "≈" on hüpoteesid, mitte kohustuslikud.'];
for(const s of shots)L.push(`     kanal ${s.channel}: ${s.controls.join('; ')}`);
L.push('  4. Üks foto FM3 ekraanist (näiteks kanal C Time 10) sõltumatuks kontrolliks.','',
 'OSA 2: MultiDelay näidis (Jan, FM3-Editis, umbes 5 minutit; sama moodi nagu 23.10 plokinäidised)',
 '  1. Vali FM3-Editis tühi (<EMPTY>) presetiasukoht. Ekspordi see presetina faili MD_EMPTY.syx sellesse kausta.',
 '  2. Lisa ruudustiku tühja kohta Multi Delay plokk (Multi Delay 1). Ära muuda midagi.',
 '     Ekspordi preset faili MD_FRESH.syx.',
 '  3. Sama ploki kanalites vali Algorithm: B = Quad Parallel Delay, C = Quad Series Delay, D = Diffusor',
 '     (A jääb Quad-Tap Delay). Lisa teine Multi Delay plokk (Multi Delay 2): A = Quad Tape Delay, B = Quad-Tap Band Delay.',
 '     Ekspordi preset faili MD_TYPES.syx.',
 '  4. Ära salvesta (Save) ega STORE-i. Seejärel vali mõni muu preset; muudatused kaovad.','',
 'Kirjuta Claude\'ile "valmis", kui eksport on tehtud.','');
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({sha256:sha(syx),cpu,writes:writes.length,shots:shots.map(s=>s.channel+': '+s.controls.join('; '))},null,1));
