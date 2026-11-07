// Build the T37 Synth voice CPU pack (audit H6). Offline; writes measurement presets, never device I/O.
// The CPU model (fm3-cpu 0.2.4, T31 2026-11-05) prices the Synth block only by the voice 1 type with voices 2/3 OFF:
// OFF 2.5, SINE 4, TRIANGLE 7.5, SQUARE 7, SAWTOOTH 7, RANDOM 7.5, WHT NOISE 11.5, PINK NOISE 13.5 (block cost =
// CPU(item) - CPU(cal-newlook)). With voice 2 or 3 active the estimate falls back to the family maximum.
// Questions: does voice 2 / voice 3 cost the same per type as voice 1, and do the voices add up?
//   cal-newlook, Synth device default (V1 TRIANGLE, V2/V3 OFF = T31 repeat), V1 OFF + V2 each of 7 types,
//   V1 OFF + V3 each of 7 types, 4 combinations (V1+V2 TRIANGLE; all TRIANGLE; all PINK NOISE; SINE/SAWTOOTH/WHT NOISE),
//   cal-newlook again (drift). The Synth sits in row 3 between Delay and Reverb, engaged in Scene 1; every word other
//   than the three voice type words keeps the device default (raw type words on channel A, measurement only).
// FM3_CPU_SWEEP.py loads each preset to the edit buffer and reads the CPU meter. Nothing is stored or set.
// Usage: node tools/fm3/t37-synth-cpu-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {findParam}=await imp('scripts/fm3-table-encoder.mjs');
const {composeSound}=await imp('scripts/fm3-sound.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: t37-synth-cpu-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const COLLECT=new URL(E+'scripts/cpu-sweep-collector/',import.meta.url);
const NEWLOOK=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const COMPOSER={schemaVersion:1,firmware:13,baseProfile:'jb-composer',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const ROW2=['compressor','drive','amp','cab'];
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const recOf=b=>{const r=scanRecords(b,{requireAmpCab:false}).records.filter(x=>x.family==='synth');assert.equal(r.length,1);return r[0];};
const V=['SYNTH_TYPE1','SYNTH_TYPE2','SYNTH_TYPE3'].map(n=>findParam('SYNTH',n));
assert.deepEqual(V.map(p=>p.param),[0,11,29]);
const TYPES=V[0].enum;assert.deepEqual(TYPES,['SINE','TRIANGLE','SQUARE','SAWTOOTH','RANDOM','WHT NOISE','PINK NOISE','OFF']);
for(const p of V)assert.deepEqual(p.enum,TYPES);
const OFF=7,T=n=>TYPES.indexOf(n);
const calibration=()=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name:'CPU CAL NEWLOOK'},layout:{row2:ROW2,row3:['delay','reverb']}}).syx);
const synth=name=>Buffer.from(composeSound(NEWLOOK,{composer:{...COMPOSER,name},insert:['synth'],layout:{row2:ROW2,row3:['delay','synth','reverb']},
  blockScenes:{synth:[{scene:1,bypass:false}]}}).syx);
const s0=body(synth('X')),r0=recOf(s0);
assert.equal(s0.readUInt16LE(r0.header+10),0,'Scene 1 on Synth channel A');
const DEF=V.map(p=>s0.readUInt16LE(r0.start+2*p.param));assert.deepEqual(DEF,[T('TRIANGLE'),OFF,OFF],'device default V1 TRIANGLE, V2/V3 OFF');
function voices(name,v){
  const syx=synth(name),st=inspectStructure(syx),b=Buffer.from(st.raw.body),r=recOf(b);
  V.forEach((p,k)=>b.writeUInt16LE(v[k],r.start+2*p.param));
  const o=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(st.raw.rawPatch,b)));
  assert.deepEqual([...parsePresetDump(o,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  const ob=body(o);assert.ok(ob.equals(b),'re-encode round trip');
  for(let i=0;i<ob.length;i++)if(ob[i]!==s0[i]&&!(i>=r0.start&&V.some(p=>i===r0.start+2*p.param||i===r0.start+2*p.param+1)))
    assert.ok(name!=='X'&&i<r0.start,'only the voice type words differ from the default insert @'+i);
  return o;
}
const items=[];
const add=(id,syx,meta)=>items.push({id,family:meta.family??'synth',syx,...meta});
add('cal-newlook',calibration(),{family:'calibration',expectPercent:52.8,note:'NewLook + Optical Compressor (= T26/T31 cal-newlook)'});
const synthItem=(id,v,note)=>add(id,voices(('CPU SYN '+id).toUpperCase().slice(0,31),v),{voices:v.map(x=>TYPES[x]),voiceWords:v,source:note});
synthItem('default',DEF,'device-default Synth insert (T31 synth:1 repeat, 7.5 above cal-newlook)');
for(let t=0;t<7;t++)synthItem('v2:'+t,[OFF,t,OFF],'V1 OFF, V2 '+TYPES[t]+', V3 OFF');
for(let t=0;t<7;t++)synthItem('v3:'+t,[OFF,OFF,t],'V1 OFF, V2 OFF, V3 '+TYPES[t]);
synthItem('mix:tri2',[T('TRIANGLE'),T('TRIANGLE'),OFF],'V1+V2 TRIANGLE');
synthItem('mix:tri3',[T('TRIANGLE'),T('TRIANGLE'),T('TRIANGLE')],'all three TRIANGLE');
synthItem('mix:pink3',[T('PINK NOISE'),T('PINK NOISE'),T('PINK NOISE')],'all three PINK NOISE');
synthItem('mix:ssw',[T('SINE'),T('SAWTOOTH'),T('WHT NOISE')],'SINE / SAWTOOTH / WHT NOISE');
add('cal-newlook-end',calibration(),{family:'calibration',note:'cal-newlook again: meter drift over the sweep'});
assert.equal(new Set(items.map(i=>i.id)).size,items.length);
assert.equal(new Set(items.filter(i=>i.family==='synth').map(i=>sha(i.syx))).size,items.filter(i=>i.family==='synth').length,'distinct presets');
const dir=path.join(out,'FM3_T37_SYNTH_CPU');fs.mkdirSync(path.join(dir,'presets'),{recursive:true});
fs.copyFileSync(new URL('FM3_CPU_SWEEP.py',COLLECT),path.join(dir,'FM3_CPU_SWEEP.py'));
const m={schemaVersion:1,builder:'t37-synth-cpu-build 0.1.0',test:'T37',audit:'H6',calibrationOnly:false,confirmName:'CPU CAL NEWLOOK',reference:'cal-newlook',scene:1,header:'7f0000400',
  note:'Cost of an item = CPU(item) - CPU(cal-newlook); every Synth item is cal-newlook plus the Synth block in row 3 with only the three voice type words set (V1 pid 0, V2 pid 11, V3 pid 29; 7 = OFF).',
  items:items.map((it,i)=>{const f=`presets/${String(i).padStart(3,'0')}.syx`;fs.writeFileSync(path.join(dir,f),it.syx);const {syx,...meta}=it;return {...meta,file:f,sha256:sha(syx)};})};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(m,null,1)+'\n');
const L=['FM3 katse T37: Synth häälte CPU (H6, ainult laadimine ja CPU lugemine)','='.repeat(64),
 'Skriptid EI salvesta ega sea midagi. STORE-i pole vaja. Preset on ainult redaktsioonipuhvris.',
 'Ampero A-nuppu ära kasuta, B-nuppu ainult lühidalt (kui üldse). Hoia kõlarid vaiksel ja ära mängi:',
 'osa presette lülitab Synth\'i müra-hääled (WHT/PINK NOISE) sisse.','',
 '  0. Sulge FM3-Edit ja Fractal-Bot (USB-port on ainukasutuses).',
 '  1. cd ~/Downloads/FM3_REA_DEVELOPMENT/FM3_T37_SYNTH_CPU',
 '  2. python3 FM3_CPU_SWEEP.py --pack . --session ../FM3_T37_SESSION',
 '     Esimese preseti järel küsib skript, kas FM3 ekraanil on nimi "CPU CAL NEWLOOK". Vasta j ja Enter.',
 `     Edasi läheb ise läbi (${items.length} presetti, umbes 2 minutit). Lõpus vali FM3-l mõni preset; midagi ei salvestatud.`,
 '  3. Kirjuta Claude\'ile "valmis".',''];
fs.writeFileSync(path.join(dir,'LOE_MIND.txt'),L.join('\n'));
console.log(JSON.stringify({items:m.items.length,manifest:sha(fs.readFileSync(path.join(dir,'manifest.json'))),ids:m.items.map(i=>i.id).join(', ')}));
