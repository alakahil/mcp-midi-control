// Build the knob display check packs (FM3_BIND_STORE.py --load / --record, test T17). Offline.
// Compressor, Phaser, Tremolo and Pitch numeric controls are writable but no FM3 display reading of them exists
// yet (scales come from the FW13 descriptor: linear / log, min, max, display multiplier). Two generated presets put
// chosen controls at off-grid values; the user loads each into the edit buffer, opens the block on the front
// panel, selects the stated channel and reads the values. Nothing is stored or set; switching presets discards it.
//   A_DYN (jb-tremolo base): Compressor C, Phaser B, Tremolo A.   B_PITCH (jb-pitch base): Pitch C.
// Usage: node tools/fm3/knob-read-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {writeTableControls,findParam}=await imp('scripts/fm3-table-encoder.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: knob-read-build.mjs OUT_DIR');
export const PACKS=[
 {dir:'A_DYN',name:'KNOBS T17 DYN',base:'examples/FM3_TREMOLO_ABCD_TEST_export.syx',groups:[
   {block:'compressor',title:'Compressor',channel:'C',controls:[['COMP_THRESH',-36],['COMP_RATIO',3.5],['COMP_ATTACK',12],['COMP_RELEASE',250],['COMP_LEVEL',2.5],['COMP_MIX',70]]},
   {block:'phaser',title:'Phaser',channel:'B',controls:[['PHASER_RATE',1.25],['PHASER_DEPTH',6.5],['PHASER_FEEDBACK',35],['PHASER_FMIN',80],['PHASER_FMAX',3500],['PHASER_TONE',4]]},
   {block:'tremolo',title:'Tremolo',channel:'A',controls:[['TREMOLO_RATE',4.5],['TREMOLO_DEPTH',65],['TREMOLO_DUTY',30],['TREMOLO_LEVEL',-3]]}]},
 {dir:'B_PITCH',name:'KNOBS T17 PITCH',base:'examples/FM3_PITCH_ABCD_TEST_export.syx',groups:[
   {block:'pitch',title:'Pitch',channel:'C',controls:[['PITCH_SHIFT1',7],['PITCH_DETUNE1',12.5],['PITCH_LEVEL1',80],['PITCH_DELAY1',150],['PITCH_FEEDBACK1',25],['PITCH_LPFREQ',6000],['PITCH_HPFREQ',120]]}]}];
const built=[];
for(const pk of PACKS){
 const base=fs.readFileSync(new URL(E+pk.base,import.meta.url));
 const controls=pk.groups.flatMap(g=>g.controls.map(([param,value])=>({block:g.block,channel:g.channel,param,value})));
 const r=writeTableControls(base,{name:pk.name,controls}),syx=Buffer.from(r.syx);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');assert.equal(inspectStructure(syx).decoded.preset_name,pk.name);
 const expected=r.writes.map(w=>({block:w.block,channel:w.channel,param:w.name,label:w.label,kind:w.kind,requested:w.value,raw:w.raw,codecDisplay:w.display}));
 assert.equal(expected.length,controls.length);
 const dir=path.join(out,pk.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'KNOBS.syx'),syx);
 const checks=[...pk.groups.map(g=>({id:g.block,text:`${g.title} plokk → EDIT, vali kanal ${g.channel}. Kirjuta järjest, mida ekraan näitab: ${g.controls.map(([n])=>findParam(g.block,n).label).join(' / ')} (näiteks "${g.controls.map(()=>'?').join(' / ')}"; ühikud ka, kui ekraan neid näitab)`})),
   {id:'type',text:'Mis TYPE on igal neist plokkidest valitud kanalil? (nt "Compressor C: ..., Phaser B: ..., Tremolo A: ...")'}];
 const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-31',test:'T17',confirmName:pk.name,preset:{file:'KNOBS.syx',sha256:sha(syx)},
  experiment:'Display reading of table-encoder writes at off-grid values; no generator change',groups:pk.groups.map(g=>({block:g.block,channel:g.channel})),expected,checks,
  method:'--load: edit-buffer dump (7F 00) only; the user opens the blocks on the front panel and reads the values. --record saves the readings without device I/O. Nothing is stored or set.'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
 built.push({dir:pk.dir,sha256:manifest.preset.sha256,expected:expected.map(e=>`${e.param} ${e.channel}: ${e.requested} -> ${typeof e.codecDisplay==='number'?+e.codecDisplay.toFixed(4):e.codecDisplay} (raw ${e.raw})`)});
}
console.log(JSON.stringify(built,null,1));
