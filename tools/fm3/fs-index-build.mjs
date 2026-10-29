// Build the footswitch override position check pack (FM3_BIND_STORE.py --load / --record, test T15). Offline.
// EXPERIMENT FILE (not a generator feature): which override word belongs to which footswitch. The per-preset region
// holds 108 override words (65535 = none); T14 confirmed only word 0 = Layout 1 switch 1. This preset defines eight
// per-preset switches PP#1..PP#8 (Control Switch: Latching, Control Switch 1..6 then 1..2) and puts PP#k into a
// different override word each, so the Overrides page shows which word is which switch:
//   word 0 -> PP#1, 1 -> PP#2, 2 -> PP#3, 3 -> PP#4, 11 -> PP#5, 12 -> PP#6, 24 -> PP#7, 107 -> PP#8.
// Edit buffer only (7F 00); the user reads FC PER-PRESET -> Overrides on the front panel. Nothing is stored or set,
// and switching to another preset discards it.
// Usage: node tools/fm3/fs-index-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: fs-index-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='FS INDEX T15';
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,modifiers:{external1Wah:false}},layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'}],footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2}]};
const gen=Buffer.from(createPreset(BASE,spec).syx),p=inspectStructure(gen),body=Buffer.from(p.raw.body),L=body.length,DEF=L-3052,OV=DEF+1920;
// Start from the generator's own PP#1 -> word 0 (T14 replay-confirmed) and add PP#2..PP#8 the same way.
assert.deepEqual([body.readUInt16LE(DEF),body.readUInt16LE(DEF+48),body.readUInt16LE(DEF+144),body.readUInt16LE(OV)],[7,1,1,0]);
export const WORDS=[0,1,2,3,11,12,24,107];
WORDS.forEach((w,k)=>{const cs=k%6+1;body.writeUInt16LE(7,DEF+2*k);body.writeUInt16LE(1,DEF+48+2*k);body.writeUInt16LE(cs-1,DEF+144+2*k);body.writeUInt16LE(k,OV+2*w);});
for(let i=0;i<108;i++)assert.equal(body.readUInt16LE(OV+2*i),WORDS.includes(i)?WORDS.indexOf(i):65535);
const syx=Buffer.from(reencodeDumpFromRawPatch(gen,reencodeRawPatch(p.raw.rawPatch,body))),st=inspectStructure(syx);
assert.ok(st.raw.crcValid&&Buffer.from(st.raw.body).equals(body));assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0]);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'FS_INDEX.syx'),syx);
const checks=[
  {id:'layout1',text:'HOME → nupp D → Overrides, Layout 1: kirjuta iga rea lüliti ja mis tal on, näiteks "1: PP#1, 2: PP#2, 3: --, ..." (kõik read; ka mitu rida kokku on)'},
  {id:'layout2',text:'Overrides, Layout 2: samamoodi (iga rida)'},
  {id:'otherLayouts',text:'Mitu layout\'i saab Overrides lehel valida? Kas mõnes muus layout\'is on PP# (millises, mis real, milline PP#)?'},
  {id:'perPresetFc',text:'Per-Preset FC leht: mitu definitsiooni (PP#) on täidetud ja mis on PP#1 ja PP#8 Tap funktsioon ning Control Switch?'}];
const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-29',test:'T15',confirmName:NAME,preset:{file:'FS_INDEX.syx',sha256:sha(syx)},
  experiment:'Override words '+WORDS.join(', ')+' set to PP#1..PP#8 (Control Switch: Latching, CS 1..6, 1..2); not a generator feature',overrideWords:WORDS,checks,
  method:'--load: edit-buffer dump (7F 00) only; the user reads FC PER-PRESET Overrides and Per-Preset FC on the front panel. --record saves the readings without device I/O. Nothing is stored or set.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,words:WORDS}));
