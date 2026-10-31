// Build the T20 Cab cut location check packs (FM3_BIND_STORE.py --load / --record). Offline.
// T19 found that the Low Cut / High Cut on the Cab B DynaCab page are the per-cab cuts (CABINET_LOCUT1 / HICUT1),
// so the block-level CABINET_LOCUT (pid 38, log 20..2000 Hz) and CABINET_HICUT (pid 39, log 200..20000 Hz) still have
// no front-panel reading. Their slope selectors are named PRELOSLOPE / PREHISLOPE, which suggests they belong to the
// Cab Preamp section. Two presets test that: both write distinct values to the block-level cuts (87 Hz / 7300 Hz)
// and to the Cab 1 cuts (33 Hz / 12500 Hz) so every Low/High Cut the user finds can be told apart; preset B also sets
// Preamp Type NONE -> TUBE (enum-labels opt-in) in case the preamp page is hidden while the type is NONE.
//   CAB_A, CAB_B (jb-balanced-export base): Cab B.
// Usage: node tools/fm3/cab-cut-t20-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: cab-cut-t20-build.mjs OUT_DIR');
const CUTS=[['CABINET_LOCUT',87,'Low Cut (ploki / Preamp)'],['CABINET_HICUT',7300,'High Cut (ploki / Preamp)'],['CABINET_LOCUT1',33,'Cab 1 Low Cut'],['CABINET_HICUT1',12500,'Cab 1 High Cut']];
export const PACKS=[
 {dir:'CAB_A',name:'KNOBS T20 CAB A',base:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',allow:[],groups:[
   {block:'cab',title:'Cab',channel:'B',controls:CUTS}]},
 {dir:'CAB_B',name:'KNOBS T20 CAB B',base:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',allow:['enum-labels'],groups:[
   {block:'cab',title:'Cab',channel:'B',controls:[...CUTS,['CABINET_PRETYPE','TUBE','Preamp Type']]}]}];
const built=[];
for(const pk of PACKS){
 const base=fs.readFileSync(new URL(E+pk.base,import.meta.url));
 const controls=pk.groups.flatMap(g=>g.controls.map(([param,value])=>({block:g.block,channel:g.channel,param,value})));
 const r=writeTableControls(base,{name:pk.name,controls},{allow:pk.allow}),syx=Buffer.from(r.syx);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');assert.equal(inspectStructure(syx).decoded.preset_name,pk.name);
 const expected=r.writes.map(w=>({block:w.block,channel:w.channel,param:w.name,label:w.label,kind:w.kind,requested:w.value,raw:w.raw,codecDisplay:w.display}));
 assert.equal(expected.length,controls.length);
 const dir=path.join(out,pk.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'KNOBS.syx'),syx);
 const checks=[
   {id:'cuts',text:'Cab plokk -> EDIT, kanal B. Käi läbi KÕIK Cabi lehed (nt Cab/DynaCab, Mix, Preamp, EQ, Room). Kirjuta iga Low Cut ja High Cut nupu kohta: lehe nimi, nupu nimi ja väärtus (nt "DynaCab: Low Cut 33.0 Hz, High Cut 12500 Hz; Preamp: Low Cut ..., High Cut ..."). Kui mõnel lehel ei ole lõikenuppe, jäta see välja.'},
   {id:'preamp',text:'Kas Preamp leht (või Preamp Type nupp) on olemas? Mis on Preamp Type väärtus ja millised nupud sellel lehel on? (nt "Preamp: Type TUBE; Drive, Saturation, Bass, Mid, Treble, Low Cut, High Cut" või "Preamp lehte pole")'},
   {id:'type',text:'Mis on Cab kanali B MODE? (nt "Cab B: DynaCab")'}];
 const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-31',test:'T20',confirmName:pk.name,preset:{file:'KNOBS.syx',sha256:sha(syx)},
  experiment:'Location of the block-level Cab Low/High Cut (pid 38/39) on the FM3 front panel; per-cab cuts written to distinct values; preset B sets Preamp Type TUBE with allow enum-labels; no generator change',groups:pk.groups.map(g=>({block:g.block,channel:g.channel})),expected,checks,
  method:'--load: edit-buffer dump (7F 00) only; the user opens the blocks on the front panel and reads the values. --record saves the readings without device I/O. Nothing is stored or set.'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
 built.push({dir:pk.dir,sha256:manifest.preset.sha256,expected:expected.map(e=>`${e.param} ${e.channel}: ${e.requested} -> ${typeof e.codecDisplay==='number'?+e.codecDisplay.toFixed(4):e.codecDisplay} (raw ${e.raw})`)});
}
console.log(JSON.stringify(built,null,1));
