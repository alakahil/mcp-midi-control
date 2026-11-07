// Build the T25 screenshot test pack (FM3_SHOT_LOAD.py --load; FM3-Edit screenshots). Offline.
// Goal: open the Ten-Tap Delay times for the sound composer. Eleven visible Ten-Tap words have no verified display
// class ('unverified-taper', no encoder): Delay Time (class 0x00, 0.001..2 s; Config page of type Ten-Tap Delay) and
// Time 1..10 (class 0x0f00, 0..10, x1000; Taps page of type Rhythm Tap Delay only). Ref Tempo (class 0x0f80) has no
// control in the FW13 editor and is not tested. First load (2026-11-03): with type Ten-Tap Delay the device replaced
// the hidden Time 1..10 words of the active channel A with 3276 (inactive channels kept the written words), so the
// times are now written on Rhythm Tap channels. The block is inserted through the composer (device-default donor
// record, Number of Taps 10 on the Ten-Tap channels, type set per channel) and the words are written as raw words at chosen points:
//   A  Rhythm Tap: Time n at small and medium values (11.7 ms .. 1873 ms, low-end shape)
//   B  Rhythm Tap: Time n at large values (2500 + 650 n ms, top of the range)
//   C  Ten-Tap Delay: Delay Time word 16384
//   D  Ten-Tap Delay: Delay Time word 40000
// Hypotheses recorded in the manifest (the reading decides): Time n linear 0..10 s shown in ms; Delay Time linear
// or logarithmic over 1..2000 ms (the two predictions differ at both written points).
// The loader puts the preset in the edit buffer and reads the block back with fn=0x1F. Nothing is stored or set.
// The pack also carries the MultiDelay donor instructions (FM3-Edit exports, no Save), see LOE_MIND.txt.
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
 delayLog:{param:'TENTAP_TIMEM',rule:'logarithmic 0.001..2 s, shown in ms',predict:raw=>0.0010000000474974513*Math.pow(2/0.0010000000474974513,raw/W)*1000}};
const TAPS=Array.from({length:10},(_,i)=>i+1);
const NEWLOOK='examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx';
function buildItem(item,RAW){
const composed=Buffer.from(composeSound(read(NEWLOOK),{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:item.name,
 compressorChannels:[{channel:'A',type:'Optical Compressor'}]},insert:['tentap'],recordOrder:'append',selectedScene:1,
 layout:{row2:['compressor','drive','amp','cab'],row3:['delay','tentap','reverb']},
 allow:['enum-labels'],controls:'ABCD'.split('').map(ch=>RAW[ch].type==='Ten-Tap Delay'?{block:'tentap',channel:ch,param:'TENTAP_NUMTAPS',value:10}:{block:'tentap',channel:ch,param:'TENTAP_TYPE',value:RAW[ch].type})}).syx);
const st0=inspectStructure(composed),body=Buffer.from(st0.raw.body),{records}=scanRecords(body,{requireAmpCab:false});
const rec=records.find(r=>r.family==='tentap');assert.ok(rec,'tentap record');assert.equal(rec.words,48);assert.equal(rec.channels,4);
const off=(ch,pid)=>rec.start+2*(ch*rec.words+pid);
// Pinned dictionary view: since 0.3.46 fm3-tentap-times.mjs promotes these words; the pack records the pre-test status.
const pinned=p=>p.structuralStatus?{...p,status:p.structuralStatus,kind:p.structuralKind,min:p.dictionaryRange?.[0]??p.min,max:p.dictionaryRange?.[1]??p.max}:p;
const P={type:findParam('tentap','TENTAP_TYPE'),delay:pinned(findParam('tentap','TENTAP_TIMEM')),times:TAPS.map(k=>pinned(findParam('tentap','TENTAP_TIME'+k+'M')))};
for(const p of [P.delay,...P.times])assert.equal(p.status,'unverified-taper',p.name+' still unverified');
const writes=[];
for(const [ci,ch] of [...'ABCD'].entries()){
 const r=RAW[ch];if(r.delay!==undefined)assert.equal(body.readUInt16LE(off(ci,7)),10,'Number of Taps 10 on '+ch);
 assert.equal(P.type.enum[body.readUInt16LE(off(ci,0))],r.type,'type on '+ch);
 const put=(p,raw)=>{const before=body.readUInt16LE(off(ci,p.param));body.writeUInt16LE(raw,off(ci,p.param));
  writes.push({block:'tentap',channel:ch,param:p.name,label:p.label,pid:p.param,kind:p.kind,status:p.status,flags:p.flags,raw,deviceDefault:before===raw});};
 if(r.delay!==undefined)put(P.delay,r.delay);
 if(r.times)P.times.forEach((p,i)=>put(p,r.times[i]));
}
const syx=Buffer.from(reencodeDumpFromRawPatch(composed,reencodeRawPatch(st0.raw.rawPatch,body)));
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,item.name);assert.ok(Buffer.from(st.raw.body).equals(body),'re-encode round trip');
const cpu=estimateCpu(syx,{model:'fm3-cpu 0.2.3'}).maxPercent; // pinned: pack sent before T31assert.ok(cpu<75,'CPU '+cpu);
const word=(ch,pid)=>body.readUInt16LE(off(ch,pid));
for(const w of writes)assert.equal(word('ABCD'.indexOf(w.channel),w.pid),w.raw);
for(const w of writes){
 if(w.param==='TENTAP_TIMEM')w.predictions={linear:+HYPOTHESES.delayLinear.predict(w.raw).toFixed(3),log:+HYPOTHESES.delayLog.predict(w.raw).toFixed(3)};
 else w.predictions={linear:+HYPOTHESES.time.predict(w.raw).toFixed(3)};
}
const blocks=[{family:'tentap',effectId:rec.eid,words:rec.words,channels:rec.channels,request:hex(R.bulkReadPoll(rec.eid)),
 expected:Array.from({length:rec.channels},(_,ch)=>Array.from({length:rec.words},(_,p)=>word(ch,p))).flat(),
 writes:writes.map(w=>({param:w.param,channel:w.channel,pid:w.pid,raw:w.raw}))}];
const show=w=>w.label+' ≈ '+Object.values(w.predictions).map(v=>Math.round(v*10)/10).join(' / ');
const shots=[...'ABCD'].map(ch=>({block:'tentap',channel:ch,type:RAW[ch].type,page:RAW[ch].times?'Taps':'Config',controls:writes.filter(w=>w.channel===ch).map(show)}));
return {id:item.id,file:item.id+'.syx',sha256:sha(syx),name:item.name,cpuEstimate:cpu,writes,blocks,shots,syx};
}
const RAW_TAP={
 A:{type:'Rhythm Tap Delay',times:[11.7,35.1,93.6,187.3,374.6,561.9,936.5,1311.1,1685.7,1873].map(msWord)},
 B:{type:'Rhythm Tap Delay',times:TAPS.map(k=>msWord(2500+650*k))},
 C:{type:'Ten-Tap Delay',delay:16384},
 D:{type:'Ten-Tap Delay',delay:40000}};
// T25b (after the TAP reading): showing a Ten-Tap channel in FM3-Edit made the device rewrite its Delay Time word
// (16384 and 40000 both became 6494, shown 1000 ms) and derive Time 1..10 from it (6553 = 1000 ms on the verified
// linear Time scale). TAPB writes four Delay Time words below 6494 on Ten-Tap channels; the display and the derived
// Time words read back after viewing give the Delay Time scale.
const RAW_TAPB={A:{type:'Ten-Tap Delay',delay:650},B:{type:'Ten-Tap Delay',delay:1950},C:{type:'Ten-Tap Delay',delay:3214},D:{type:'Ten-Tap Delay',delay:5200}};
const PACKS=[{dir:'FM3_T25_TENTAP',item:{id:'TAP',name:'SHOT T25 TENTAP TIMES'},raw:RAW_TAP},{dir:'FM3_T25B_TENTAP',item:{id:'TAPB',name:'SHOT T25B TENTAP DELAY'},raw:RAW_TAPB}];
const summary=[];
for(const pk of PACKS){
const it=buildItem(pk.item,pk.raw),{syx}=it;delete it.syx;const items=[it],shots=it.shots,item={...pk.item,dir:pk.dir},cpu=it.cpuEstimate,writes=it.writes;
const dir=path.join(out,pk.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,it.file),syx);
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-03',test:'T25',title:'Ten-Tap ajad',experimental:true,
 firstLoad:'2026-11-03 first pack (all channels type Ten-Tap Delay): the device replaced hidden Time 1..10 of the active channel A with 3276; channels B-D kept the written words. Times are now written on Rhythm Tap channels.',
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
 '  3. FM3-Editis Ten-Tap Delay plokk: iga kanal oma lehel (Taps: Time 1-10, Config: Delay Time).',
 '     Väärtused pärast "≈" on hüpoteesid, mitte kohustuslikud.'];
for(const s of shots)L.push(`     kanal ${s.channel} (${s.type}, leht ${s.page}): ${s.controls.join('; ')}`);
L.push('  4. Üks foto FM3 ekraanist (näiteks kanal B Time 10) sõltumatuks kontrolliks.','',
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
summary.push({dir:pk.dir,sha256:it.sha256,cpu,writes:writes.length,shots:shots.map(s=>s.channel+': '+s.controls.join('; '))});
}
console.log(JSON.stringify(summary,null,1));
