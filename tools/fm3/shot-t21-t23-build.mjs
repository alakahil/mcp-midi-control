// Build the T21-T23 screenshot test packs (FM3_SHOT_LOAD.py --load; the user sends FM3-Edit screenshots). Offline.
// Goal: make the remaining block-family values usable for the sound composer without opt-in flags.
//   T21 Mix and Balance: Mix class (flags 0x0705, 0..1 shown as 0..100 %) of Delay/Reverb/Phaser/Chorus/Flanger/Pitch
//       and Balance class (0x0900, -1..1 shown as -100..100) of Amp/Cab/Drive/Delay/Reverb/Phaser/Chorus/Flanger/
//       Wah/Pitch/Tremolo. Both are 'linear-by-structure' (opt-in) today; values at off-grid points with one decimal.
//   T22 stored integers (class 0x01, 'linear-by-structure'): Drive Bit Reduce / Diode quantities, Reverb Springs /
//       Echo Density / Voice Shifts, Delay Bit Reduction, Chorus Voices (multiplier 2), Phaser Feedback Point. The
//       channel types are chosen through the composer so that the FW13 editor policy admits each control.
//   T23 Amp Dynamic Depth / Dynamic Presence (class 0x00, 'unverified-taper'): raw words at four points (one per
//       channel), experimental only; the reading gives the display scale.
// The loader puts each preset in the edit buffer and reads every test block back with fn=0x1F (no question asked);
// the user then reads the values from FM3-Edit screenshots (plus one front-panel photo per test). Nothing is stored or set.
// Usage: node tools/fm3/shot-t21-t23-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {writeTableControls,findParam,decodeValue}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: shot-t21-t23-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const C=(block,channel,param,v)=>({block,channel,param,...(typeof v==='object'?v:{value:v})});
const TITLE={amp:'Amp',cab:'Cab',drive:'Drive',delay:'Delay',reverb:'Reverb',phaser:'Phaser',chorus:'Chorus',flanger:'Flanger',wah:'Wah',pitch:'Pitch',tremolo:'Tremolo'};
export const TESTS=[
 {dir:'FM3_T21_MIX',test:'T21',title:'Mix ja Balance',items:[
  {id:'STD',name:'SHOT T21 MIX STD',base:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',allow:['linear-by-structure'],controls:[
   C('amp','D','DISTORT_PAN',-37.4),C('cab','B','CABINET_PAN',28.6),C('drive','C','FUZZ_PAN',-14.2),
   C('delay','B','DELAY_MIX',37.4),C('delay','B','DELAY_PAN',42.8),C('reverb','C','REVERB_MIX',23.6),C('reverb','C','REVERB_PAN',-19.4),
   C('phaser','D','PHASER_MIX',61.2),C('phaser','D','PHASER_PAN',33.4),C('chorus','A','CHORUS_MIX',43.8),C('chorus','A','CHORUS_PAN',-46.6),
   C('flanger','B','OLD_FLANGER_MIX',71.4),C('flanger','B','OLD_FLANGER_PAN',12.6),C('wah','A','WAH_PAN',-27.8)]},
  {id:'PITCH',name:'SHOT T21 MIX PITCH',base:'examples/FM3_PITCH_ABCD_TEST_export.syx',allow:['linear-by-structure'],controls:[
   C('pitch','B','PITCH_MIX',33.4),C('pitch','B','PITCH_PAN',-21.6)]},
  {id:'TREM',name:'SHOT T21 MIX TREM',base:'examples/FM3_TREMOLO_ABCD_TEST_export.syx',allow:['linear-by-structure'],controls:[
   C('tremolo','C','TREMOLO_PAN',-23.4)]}]},
 {dir:'FM3_T22_INT',test:'T22',title:'täisarvulised väärtused',items:[
  {id:'INT',name:'SHOT T22 INT',composer:{
    driveChannels:[{channel:'A',type:'Bit Crusher'},{channel:'B',type:'Fat Rat'}],
    reverbChannels:[{channel:'A',type:'Spring: Medium Spring'},{channel:'B',type:'Hall: Medium Hall'}],
    delayChannels:[{channel:'A',type:'Digital Mono'}],chorusChannels:[{channel:'A',type:'Digital Stereo'}],phaserChannels:[{channel:'A',type:'Digital Mono'}]},
   layout:{row2:['drive','amp','cab','chorus','phaser'],row3:['delay','reverb']},allow:['linear-by-structure'],controls:[
   C('drive','A','FUZZ_BITREDUCE',7),C('drive','B','FUZZ_PDQTY',3),C('drive','B','FUZZ_NDQTY',2),
   C('reverb','A','REVERB_NUMSPRINGS',5),C('reverb','B','REVERB_DENSITY',6),C('reverb','B','REVERB_SHIFT1',7),C('reverb','B','REVERB_SHIFT2',-5),
   C('delay','A','DELAY_BITREDUCE',9),C('chorus','A','CHORUS_VOICES',6),C('phaser','A','PHASER_FBTAP',5)]}]},
 {dir:'FM3_T23_DYN',test:'T23',title:'Amp Dynamic Depth ja Dynamic Presence',experimental:true,items:[
  {id:'DYN',name:'SHOT T23 AMP DYN',base:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',controls:[
   C('amp','A','DISTORT_DYNDEPTH',{raw:16384}),C('amp','B','DISTORT_DYNDEPTH',{raw:32767}),C('amp','C','DISTORT_DYNDEPTH',{raw:49151}),C('amp','D','DISTORT_DYNDEPTH',{raw:65534}),
   C('amp','A','DISTORT_DYNPRES',{raw:0}),C('amp','B','DISTORT_DYNPRES',{raw:16384}),C('amp','C','DISTORT_DYNPRES',{raw:49151}),C('amp','D','DISTORT_DYNPRES',{raw:65534})]}]}];
const NEWLOOK='examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx';
function build(t,it){
 if(it.composer){
  const r=composeSound(read(NEWLOOK),{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:it.name,...it.composer},selectedScene:1,layout:it.layout,allow:it.allow,controls:it.controls});
  return Buffer.from(r.syx);
 }
 return Buffer.from(writeTableControls(read(it.base),{name:it.name,controls:it.controls},{...(it.allow?{allow:it.allow}:{}),...(t.experimental?{experimental:true}:{})}).syx);
}
const built=[];
for(const t of TESTS){
 const dir=path.join(out,t.dir);fs.mkdirSync(dir,{recursive:true});const items=[];
 for(const it of t.items){
  const syx=build(t,it);
  assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],it.id+' edit-buffer header');
  const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,it.name);
  const body=Buffer.from(st.raw.body),{records}=scanRecords(body),cpu=estimateCpu(syx).maxPercent;
  // A table-encoder preset keeps its device-tested base layout; it may not exceed that base's own estimate.
  assert.ok(cpu<75||(it.base&&cpu<=estimateCpu(read(it.base)).maxPercent),it.id+' CPU '+cpu);
  const word=(r,ch,pid)=>body.readUInt16LE(r.start+2*(ch*r.words+pid));
  const writes=it.controls.map(c=>{const p=findParam(c.block,c.param),r=records.find(x=>x.family===c.block);assert.ok(r,c.block+' record');
   const raw=word(r,'ABCD'.indexOf(c.channel),p.param);if(c.raw!==undefined)assert.equal(raw,c.raw,c.param+' raw');
   const disp=decodeValue(p,raw);if(c.value!==undefined)assert.ok(Math.abs(disp-c.value)<=0.01*(Math.abs(c.value)+1),`${c.param} ${disp} vs ${c.value}`);
   return {block:c.block,channel:c.channel,param:p.name,label:p.label,pid:p.param,kind:p.kind,status:p.status,flags:p.flags,requested:c.value??null,raw,codecDisplay:disp===undefined?null:+disp.toFixed(6)};});
  const fams=[...new Set(writes.map(w=>w.block))];
  const blocks=fams.map(f=>{const r=records.find(x=>x.family===f);
   return {family:f,effectId:r.eid,words:r.words,channels:r.channels,request:hex(R.bulkReadPoll(r.eid)),
    expected:Array.from({length:r.channels},(_,ch)=>Array.from({length:r.words},(_,p)=>word(r,ch,p))).flat(),
    writes:writes.filter(w=>w.block===f).map(w=>({param:w.param,channel:w.channel,pid:w.pid,raw:w.raw}))};});
  const shots=[];for(const f of fams)for(const ch of [...new Set(writes.filter(w=>w.block===f).map(w=>w.channel))])
   shots.push({block:f,channel:ch,controls:writes.filter(w=>w.block===f&&w.channel===ch).map(w=>w.label??w.param)});
  const file=it.id+'.syx';fs.writeFileSync(path.join(dir,file),syx);
  items.push({id:it.id,file,sha256:sha(syx),name:it.name,cpuEstimate:cpu,writes,blocks,shots});
 }
 const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-02',test:t.test,title:t.title,experimental:t.experimental===true,
  method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads every test block back with fn=0x1F (all words, all channels; read-only); no question is asked. The user then reads the values from FM3-Edit screenshots and one front-panel photo. Nothing is stored or set.',items};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
 fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),readme(t,items));
 built.push({dir:t.dir,items:items.map(i=>({id:i.id,sha256:i.sha256,cpu:i.cpuEstimate,writes:i.writes.map(w=>`${w.block} ${w.channel} ${w.param}: ${w.requested??'raw'} -> ${w.codecDisplay??'?'} (raw ${w.raw})`)}))});
}
function readme(t,items){
 const L=[`FM3 katse ${t.test}: ${t.title} (ainult laadimine ja ekraanipildid)`,'='.repeat(60),
  'Skript EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris; preseti vahetamine kustutab selle.',
  'Ampero A-nuppu ära kasuta. B-nuppu vajuta ainult lühidalt (kui üldse).','',
  'Laadimise teeb Remote Control (või Terminal). Iga preseti jaoks:','  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
  `  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/${t.dir}`,'     python3 FM3_SHOT_LOAD.py --self-test',
  `  2. python3 FM3_SHOT_LOAD.py --load --pack . --session ../${t.dir}_SESSION --preset ID`,
  '     Skript kontrollib ise, et seade hoiab kõiki väärtusi ("Kõik plokid klapivad"). Kui ei klapi, ära tee pilte.',
  '  3. Ava FM3-Edit ja tee allpool loetletud ekraanipildid (Cmd+Shift+4, terve ploki aken koos kanali tähega).',
  '     Kui nuppu ei ole näha, tee pilt ikkagi (siis on näha, et seda pole).','  4. Sulge FM3-Edit enne järgmist presetti.','',
  'Lisaks: tee VÄHEMALT ÜKS foto FM3 enda ekraanist (ükskõik milline allolevatest nuppudest), sõltumatuks kontrolliks.',''];
 for(const it of items){
  L.push(`Preset ${it.id}  (--preset ${it.id}, nimi ekraanil "${it.name}")`);
  it.shots.forEach((s,i)=>L.push(`  pilt ${i+1}: ${TITLE[s.block]} plokk, kanal ${s.channel} -> leht, kus on: ${s.controls.join(', ')}`));
  L.push('');
 }
 L.push('Saada pildid Claude\'ile siia vestlusesse (järjekorras) ja kirjuta "valmis".','');
 return L.join('\n');
}
console.log(JSON.stringify(built,null,1));
