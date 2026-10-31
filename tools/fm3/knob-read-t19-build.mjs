// Build the T19 knob display check packs (FM3_BIND_STORE.py --load / --record). Offline.
// Same method as T17/T18 for the blocks still without an FM3 display reading after T18: Cab, Drive, Chorus,
// Flanger, Wah and Rotary. Scales come from the FW13 descriptor table (FracTool / FM3-Edit 1.07.17) and the
// per-type applicability from the FM3-Edit XML policy; the device reading is only a confirmation. The new
// hypothesis is the 'knob' class (flags 0x05xx, display = n * multiplier, min/max is the DSP range): Drive
// Slew Rate, Chorus/Flanger/Wah/Rotary Drive and Wah Resonance Q. Chorus/Flanger/Rotary Mix are
// 'linear-by-structure' (opt-in) and are written with that explicit allowance.
// Each generated preset puts chosen controls at off-grid values; the user loads it into the edit buffer, opens
// each block on the front panel, selects the stated channel and reads the values. Nothing is stored or set.
//   CDCFW (jb-balanced-export base): Cab B, Drive B, Chorus D, Flanger A, Wah C.   ROT (jb-rotary base): Rotary A.
// Usage: node tools/fm3/knob-read-t19-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: knob-read-t19-build.mjs OUT_DIR');
export const PACKS=[
 {dir:'CDCFW',name:'KNOBS T19 CDCFW',base:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',groups:[
   {block:'cab',title:'Cab',channel:'B',controls:[['CABINET_LEVEL',-4.5,'Level (ploki väljund)'],['CABINET_LEVEL1',-3.5,'Cab 1 Level'],['CABINET_PAN1',-35,'Cab 1 Pan'],['CABINET_DYNACAB_R1',6.3,'Cab 1 DynaCab mic position'],['CABINET_DYNACAB_Z1',7.3,'Cab 1 Distance'],['CABINET_LOCUT',85,'Low Cut (ploki EQ)'],['CABINET_HICUT',7500,'High Cut (ploki EQ)']]},
   {block:'drive',title:'Drive',channel:'B',controls:[['FUZZ_LOCUT',130],['FUZZ_HICUT',5600],['FUZZ_BIAS',0.35],['FUZZ_SLEW',3.3],['FUZZ_LOW',6.4],['FUZZ_MID',4.6],['FUZZ_MIDFREQ',850],['FUZZ_TREBLE',5.8]]},
   {block:'chorus',title:'Chorus',channel:'D',controls:[['CHORUS_RATE',0.83],['CHORUS_DEPTH',47],['CHORUS_MIX',37],['CHORUS_DELAYTIME',6.5],['CHORUS_HICUT',7200],['CHORUS_LOWCUT',110],['CHORUS_DRIVE',3.7],['CHORUS_LEVEL',-1.5]]},
   {block:'flanger',title:'Flanger',channel:'A',controls:[['OLD_FLANGER_RATE',0.37],['OLD_FLANGER_DEPTH',63],['OLD_FLANGER_FEEDBACK',45],['OLD_FLANGER_DELAYTIME',4.3,'Delay (Manual)'],['OLD_FLANGER_MIX',50],['OLD_FLANGER_HICUT',6800],['OLD_FLANGER_DRIVE',2.3],['OLD_FLANGER_LEVEL',-2.5]]},
   {block:'wah',title:'Wah',channel:'C',controls:[['WAH_FSTART',420],['WAH_FSTOP',2300],['WAH_Q',6.5],['WAH_TRACK',3.5],['WAH_DRIVE',3.3],['WAH_MIX',3.7],['WAH_HPF',85],['WAH_LEVEL',-1.5]]}]},
 {dir:'ROT',name:'KNOBS T19 ROT',base:'examples/FM3_ROTARY_A_TEST_export.syx',groups:[
   {block:'rotary',title:'Rotary',channel:'A',controls:[['ROTARY_RATE',4.37],['ROTARY_LFDEPTH',65],['ROTARY_HFDEPTH',73],['ROTARY_HFLEVEL',1.5],['ROTARY_LOWRATE',0.85],['ROTARY_HIGHTIME',2.3],['ROTARY_LOWTIME',4.7],['ROTARY_MICDIST',0.37],['ROTARY_WIDTH',63],['ROTARY_HFLENGTH',47],['ROTARY_DRIVE',2.7],['ROTARY_MIX',65],['ROTARY_LEVEL',-2]]}]}];
const built=[];
for(const pk of PACKS){
 const base=fs.readFileSync(new URL(E+pk.base,import.meta.url));
 const controls=pk.groups.flatMap(g=>g.controls.map(([param,value])=>({block:g.block,channel:g.channel,param,value})));
 const r=writeTableControls(base,{name:pk.name,controls},{allow:['linear-by-structure']}),syx=Buffer.from(r.syx);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');assert.equal(inspectStructure(syx).decoded.preset_name,pk.name);
 const expected=r.writes.map(w=>({block:w.block,channel:w.channel,param:w.name,label:w.label,kind:w.kind,requested:w.value,raw:w.raw,codecDisplay:w.display}));
 assert.equal(expected.length,controls.length);
 const dir=path.join(out,pk.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'KNOBS.syx'),syx);
 const checks=[...pk.groups.map(g=>({id:g.block,text:`${g.title} plokk → EDIT, vali kanal ${g.channel}. Kirjuta järjest, mida ekraan näitab (kui nuppu sellel tüübil üldse pole, kirjuta "puudub"): ${g.controls.map(([n,,hint])=>hint??findParam(g.block,n).label).join(' / ')} (näiteks "${g.controls.map(()=>'?').join(' / ')}"; ühikud ka, kui ekraan neid näitab)`})),
   {id:'type',text:`Mis TYPE (Cab puhul MODE) on igal neist plokkidest valitud kanalil? (nt "${pk.groups.map(g=>g.title+' '+g.channel+': ...').join(', ')}")`}];
 const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-31',test:'T19',confirmName:pk.name,preset:{file:'KNOBS.syx',sha256:sha(syx)},
  experiment:'Display reading of table-encoder writes at off-grid values; no generator change; Chorus/Flanger/Rotary Mix written with allow linear-by-structure; knob-class controls included',groups:pk.groups.map(g=>({block:g.block,channel:g.channel})),expected,checks,
  method:'--load: edit-buffer dump (7F 00) only; the user opens the blocks on the front panel and reads the values. --record saves the readings without device I/O. Nothing is stored or set.'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
 built.push({dir:pk.dir,sha256:manifest.preset.sha256,expected:expected.map(e=>`${e.param} ${e.channel}: ${e.requested} -> ${typeof e.codecDisplay==='number'?+e.codecDisplay.toFixed(4):e.codecDisplay} (raw ${e.raw})`)});
}
console.log(JSON.stringify(built,null,1));
