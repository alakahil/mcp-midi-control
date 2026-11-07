// Build the T24 screenshot test pack (FM3_SHOT_LOAD.py --load; the user sends FM3-Edit screenshots). Offline.
// Goal: make the remaining option selectors ('enum-labels', opt-in today) usable for the sound composer without an
// allow flag. The 2026-11-03 preset-corpus scan (639 bodies) found every observed stored word inside its label list,
// and 127 sound-block selectors share a label list with an already crosschecked selector. T24 reads the selectors whose
// label list is unique: each is written at a non-default label through the composer (final-type policy applies) and
// the user reads the label FM3-Edit shows. Type/model selectors are not written here (they need full channel
// templates and are chosen through the composer's *Channels fields). A few shared lists are included as spot checks.
// The loader puts each preset in the edit buffer and reads every test block back with fn=0x1F (no question asked).
// Nothing is stored or set.
// Usage: node tools/fm3/shot-t24-build.mjs OUT_DIR
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
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: shot-t24-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const C=(block,channel,param,value)=>({block,channel,param,value});
const TITLE={pitch:'Pitch',tremolo:'Tremolo',phaser:'Phaser',wah:'Wah',cab:'Cab',gate:'Gate',multiband:'Multiband Compressor',plex:'Plex Delay',
 looper:'Looper',synth:'Synth',tentap:'Ten-Tap Delay',megatap:'Megatap Delay',ringmod:'Ring Modulator',resonator:'Resonator',formant:'Formant'};
const LABEL={CABINET_DYNACAB_TYPE1:'Cab 1 (Dyna-Cab)',CABINET_DYNACAB_MIC1:'Mic 1',CABINET_MUTE2:'Cab 2 Mute/Solo',RESONATOR_MODE:'Mode'};
const COMP={compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
export const TEST={dir:'FM3_T24_ENUM',test:'T24',title:'valikunupud (enum)',items:[
 {id:'MOD',name:'SHOT T24 ENUM MOD',composer:{
   pitchChannels:[{channel:'A',type:'Dual Diatonic'},{channel:'B',type:'Quad Chromatic'},{channel:'C',type:'Arpeggiator'}],
   tremoloChannels:[{channel:'A',type:'VCA Trem'},{channel:'C',type:'Harmonic Trem'}],
   phaserChannels:[{channel:'A',type:'Script 90'},{channel:'C',type:'Barber Pole'}],wahChannels:[{channel:'A',type:'Clyde'}]},
  layout:{row2:['wah','drive','amp','cab','phaser','tremolo'],row3:['pitch','delay','reverb']},controls:[
   C('pitch','A','PITCH_SCALE','DORIAN'),C('pitch','A','PITCH_KEY','E'),C('pitch','A','PITCH_QUANTIZE','STEPPED'),C('pitch','A','PITCH_HARM1','5'),
   C('pitch','B','PITCH_DTEMPO1','1/8 DOT'),
   C('pitch','C','PITCH_PANSHAPE','INCREASING'),C('pitch','C','PITCH_AMPSHAPE','DECREASING'),
   C('tremolo','A','TREMOLO_LFOTYPE','SAW DOWN'),C('tremolo','C','TREMOLO_ORDER','24 dB/oct'),
   C('phaser','A','PHASER_VCR_CURVE','PHOTOCELL'),C('phaser','A','PHASER_LFOMODE','UNIVIBE'),C('phaser','A','PHASER_ORDER','10'),C('phaser','A','PHASER_LFORESET','90 DEG'),
   C('phaser','C','PHASER_DIRECTION','DOWN'),
   C('wah','A','WAH_TAPER','LOG 15A'),
   C('cab','A','CABINET_LOSLOPE1','18 dB/OCT'),C('cab','A','CABINET_HISLOPE1','24 dB/OCT'),C('cab','A','CABINET_INPUTSEL','RIGHT'),C('cab','A','CABINET_ROOMSHAPE','ROOM'),
   C('cab','B','CABINET_DYNACAB_TYPE1','2x12 TEXAS STAR'),C('cab','B','CABINET_DYNACAB_MIC1','Ribbon'),C('cab','B','CABINET_PRETYPE','FET II'),
   C('cab','B','CABINET_PRELOSLOPE','18 dB/OCT'),C('cab','B','CABINET_PREHISLOPE','24 dB/OCT'),C('cab','B','CABINET_MUTE2','SOLO')]},
 {id:'INSA',name:'SHOT T24 ENUM INS A',composer:COMP,insert:['gate','multiband'],
  layout:{row2:['gate','compressor','drive','amp','cab','multiband'],row3:['delay','reverb']},controls:[
   C('gate','A','GATE_KEY','ROW 3'),
   C('multiband','A','MULTICOMP_KNEE','SOFT'),C('multiband','A','MULTICOMP_ORDER','24 dB/oct'),C('multiband','A','MULTICOMP_MUTE2','MUTE'),C('multiband','A','MULTICOMP_DETECT3','PEAK')]},
 {id:'INSB',name:'SHOT T24 ENUM INS B',composer:COMP,insert:['plex','looper'],
  layout:{row2:['compressor','drive','amp','cab'],row3:['delay','plex','reverb','looper']},controls:[
   C('plex','A','PLEX_FLTLFOTYPE','TRAPEZOID'),C('plex','A','PLEX_FILTERTYPE','NOTCH'),C('plex','A','PLEX_TEMPO3','1/16 DOT'),
   C('looper','A','LOOPER_HALF','HALF'),C('looper','A','LOOPER_RECORDMODE','STOP')]},
 {id:'INSC',name:'SHOT T24 ENUM INS C',composer:COMP,insert:['synth','ringmod','resonator','formant'],
  layout:{row2:['compressor','drive','amp','cab','synth','formant'],row3:['ringmod','resonator','delay','reverb']},controls:[
   C('synth','A','SYNTH_TYPE1','SAWTOOTH'),C('synth','A','SYNTH_TRACK1','QUANTIZE'),C('synth','A','SYNTH_PD_RANGE','BASS'),
   C('ringmod','A','RINGMOD_PD_RANGE','BASS'),
   C('resonator','A','RESONATOR_LOC2','POST'),C('resonator','A','RESONATOR_INPUTMODE','STEREO'),
   C('resonator','B','RESONATOR_MODE','CHORDAL'),C('resonator','B','RESONATOR_CHORD','MINOR 7'),
   C('formant','A','FORMANT_F1','OOO'),C('formant','A','FORMANT_F2','AWW'),C('formant','A','FORMANT_F3','ERR')]},
 {id:'INSD',name:'SHOT T24 ENUM INS D',composer:COMP,insert:['tentap','megatap'],
  layout:{row2:['compressor','drive','amp','cab'],row3:['delay','tentap','megatap','reverb']},controls:[
   C('tentap','A','TENTAP_PANSHAPE','SINE'),C('tentap','A','TENTAP_STEREO','STEREO'),
   C('megatap','A','MEGATAP_TIMESHAPE','COSINE'),C('megatap','A','MEGATAP_PANSHAPE','COSINE'),C('megatap','A','MEGATAP_AMPSHAPE','SINE')]}]};
const NEWLOOK='examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx';
const build=(it,controls=it.controls)=>Buffer.from(composeSound(read(NEWLOOK),{composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:it.name,...it.composer},
 ...(it.insert?{insert:it.insert,recordOrder:'append'}:{}),selectedScene:1,layout:it.layout,allow:['enum-labels'],...(controls.length?{controls}:{})}).syx);
const SAME=[];const t=TEST,dir=path.join(out,t.dir);fs.mkdirSync(dir,{recursive:true});const items=[];
for(const it of t.items){
 const syx=build(it),plain=Buffer.from(inspectStructure(build(it,[])).raw.body);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],it.id+' edit-buffer header');
 const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,it.name);
 const body=Buffer.from(st.raw.body),{records}=scanRecords(body,{requireAmpCab:false}),cpu=estimateCpu(syx,{model:'fm3-cpu 0.2.3'}).maxPercent; // pinned: pack sent before T31
 assert.ok(cpu<75,it.id+' CPU '+cpu);
 const word=(r,ch,pid)=>body.readUInt16LE(r.start+2*(ch*r.words+pid));
 const writes=it.controls.map(c=>{const p=findParam(c.block,c.param),r=records.find(x=>x.family===c.block);assert.ok(r,c.block+' record');
  const raw=word(r,'ABCD'.indexOf(c.channel),p.param),label=p.enum[raw-(p.enumBase??0)]?.trim();
  assert.equal(label,c.value,`${c.param} ${raw} -> ${label}`);
  if(plain.readUInt16LE(r.start+2*('ABCD'.indexOf(c.channel)*r.words+p.param))===raw)SAME.push(c.param+' '+c.channel+' '+c.value+' of '+p.enum.join('|'));
  return {block:c.block,channel:c.channel,param:p.name,label:p.label,pid:p.param,kind:p.kind,status:p.structuralStatus??p.status,flags:p.flags,requested:c.value,raw,codecDisplay:label,options:p.enum.length};});
 const fams=[...new Set(writes.map(w=>w.block))];
 const blocks=fams.map(f=>{const r=records.find(x=>x.family===f);
  return {family:f,effectId:r.eid,words:r.words,channels:r.channels,request:hex(R.bulkReadPoll(r.eid)),
   expected:Array.from({length:r.channels},(_,ch)=>Array.from({length:r.words},(_,p)=>word(r,ch,p))).flat(),
   writes:writes.filter(w=>w.block===f).map(w=>({param:w.param,channel:w.channel,pid:w.pid,raw:w.raw}))};});
 const shots=[];for(const f of fams)for(const ch of [...new Set(writes.filter(w=>w.block===f).map(w=>w.channel))])
  shots.push({block:f,channel:ch,controls:writes.filter(w=>w.block===f&&w.channel===ch).map(w=>(w.label??LABEL[w.param]??w.param)+' = '+w.codecDisplay)});
 const file=it.id+'.syx';fs.writeFileSync(path.join(dir,file),syx);
 items.push({id:it.id,file,sha256:sha(syx),name:it.name,cpuEstimate:cpu,writes,blocks,shots});
}
assert.deepEqual(SAME,[],'every written option must differ from the untouched preset');
const manifest={kind:'fm3-shot-check',version:1,date:'2026-11-03',test:t.test,title:t.title,experimental:false,
 method:'FM3_SHOT_LOAD.py --load sends one preset to the edit buffer (7F 00) and reads every test block back with fn=0x1F (all words, all channels; read-only); no question is asked. The user then reads the option labels from FM3-Edit screenshots and one front-panel photo. Nothing is stored or set.',items};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
const L=[`FM3 katse ${t.test}: ${t.title} (ainult laadimine ja ekraanipildid)`,'='.repeat(60),
 'Skript EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris; preseti vahetamine kustutab selle.',
 'Ampero A-nuppu ära kasuta. B-nuppu vajuta ainult lühidalt (kui üldse).','',
 'Laadimise teeb Remote Control (või Terminal). Iga preseti jaoks:','  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 `  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/${t.dir}`,'     python3 FM3_SHOT_LOAD.py --self-test',
 `  2. python3 FM3_SHOT_LOAD.py --load --pack . --session ../${t.dir}_SESSION --preset ID`,
 '     Skript kontrollib ise, et seade hoiab kõiki väärtusi ("Kõik plokid klapivad"). Kui ei klapi, ära tee pilte.',
 '  3. Ava FM3-Edit ja tee allpool loetletud ekraanipildid (terve ploki aken koos kanali tähega).',
 '     Oodatav valik on kirjas pärast "=". Kui FM3-Edit näitab midagi muud või nuppu pole, tee pilt ikkagi.','  4. Sulge FM3-Edit enne järgmist presetti.','',
 'Lisaks: tee VÄHEMALT ÜKS foto FM3 enda ekraanist (ükskõik milline allolevatest valikutest), sõltumatuks kontrolliks.',''];
for(const it of items){
 L.push(`Preset ${it.id}  (--preset ${it.id}, nimi ekraanil "${it.name}")`);
 it.shots.forEach((s,i)=>L.push(`  pilt ${i+1}: ${TITLE[s.block]} plokk, kanal ${s.channel} -> leht(ed), kus on: ${s.controls.join('; ')}`));
 L.push('');
}
L.push('Saada pildid Claude\'ile siia vestlusesse (järjekorras) ja kirjuta "valmis".','');
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify(items.map(i=>({id:i.id,sha256:i.sha256,cpu:i.cpuEstimate,writes:i.writes.length})),null,1));
