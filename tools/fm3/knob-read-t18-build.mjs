// Build the T18 knob display check pack (FM3_BIND_STORE.py --load / --record). Offline.
// Same method as T17 (knob-read-build.mjs) for Amp, Delay and Reverb, the blocks with the most numeric controls
// without an FM3 display reading. One generated preset puts chosen controls at off-grid values so linear / log
// scale and display-multiplier errors differ; the user loads it into the edit buffer, opens each block on the front
// panel, selects the stated channel and reads the values. Nothing is stored or set; switching presets discards it.
// Delay Mix and Reverb Mix are 'linear-by-structure' (opt-in) and are written with that explicit allowance.
//   ADR (jb-tremolo base): Amp A, Delay B, Reverb C.
// Usage: node tools/fm3/knob-read-t18-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: knob-read-t18-build.mjs OUT_DIR');
export const PACKS=[
 {dir:'ADR',name:'KNOBS T18 ADR',base:'examples/FM3_TREMOLO_ABCD_TEST_export.syx',groups:[
   {block:'amp',title:'Amp',channel:'A',controls:[['DISTORT_DRIVE',6.3],['DISTORT_BASS',4.7],['DISTORT_MID',5.6],['DISTORT_TREBLE',6.8],['DISTORT_MASTER',3.7],['DISTORT_PRESENCE',4.3],['DISTORT_DEPTH',2.9],['DISTORT_LEVEL',-2.5],['DISTORT_HPFREQ',35],['DISTORT_LPFREQ',9000],['DISTORT_TRIM',1.6]]},
   {block:'delay',title:'Delay',channel:'B',controls:[['DELAY_TIME',437],['DELAY_FEED',37],['DELAY_MIX',28],['DELAY_LEVEL',-1.5],['DELAY_HICUT',4500],['DELAY_LOCUT',140],['DELAY_RATE1',0.65],['DELAY_DEPTH1',18]]},
   {block:'reverb',title:'Reverb',channel:'C',controls:[['REVERB_TIME',3.7],['REVERB_SIZE',63],['REVERB_PREDELAY',47],['REVERB_HICUT',6500],['REVERB_LOWCUT',160],['REVERB_MIX',23],['REVERB_LEVEL',-2],['REVERB_HFRATIO',0.55],['REVERB_DEPTH',35]]}]}];
const built=[];
for(const pk of PACKS){
 const base=fs.readFileSync(new URL(E+pk.base,import.meta.url));
 const controls=pk.groups.flatMap(g=>g.controls.map(([param,value])=>({block:g.block,channel:g.channel,param,value})));
 const r=writeTableControls(base,{name:pk.name,controls},{allow:['linear-by-structure']}),syx=Buffer.from(r.syx);
 assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');assert.equal(inspectStructure(syx).decoded.preset_name,pk.name);
 const expected=r.writes.map(w=>({block:w.block,channel:w.channel,param:w.name,label:w.label,kind:w.kind,requested:w.value,raw:w.raw,codecDisplay:w.display}));
 assert.equal(expected.length,controls.length);
 const dir=path.join(out,pk.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'KNOBS.syx'),syx);
 const checks=[...pk.groups.map(g=>({id:g.block,text:`${g.title} plokk → EDIT, vali kanal ${g.channel}. Kirjuta järjest, mida ekraan näitab: ${g.controls.map(([n])=>findParam(g.block,n).label).join(' / ')} (näiteks "${g.controls.map(()=>'?').join(' / ')}"; ühikud ka, kui ekraan neid näitab)`})),
   {id:'type',text:'Mis TYPE on igal neist plokkidest valitud kanalil? (nt "Amp A: ..., Delay B: ..., Reverb C: ...")'}];
 const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-31',test:'T18',confirmName:pk.name,preset:{file:'KNOBS.syx',sha256:sha(syx)},
  experiment:'Display reading of table-encoder writes at off-grid values; no generator change; Delay/Reverb Mix written with allow linear-by-structure',groups:pk.groups.map(g=>({block:g.block,channel:g.channel})),expected,checks,
  method:'--load: edit-buffer dump (7F 00) only; the user opens the blocks on the front panel and reads the values. --record saves the readings without device I/O. Nothing is stored or set.'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
 built.push({dir:pk.dir,sha256:manifest.preset.sha256,expected:expected.map(e=>`${e.param} ${e.channel}: ${e.requested} -> ${typeof e.codecDisplay==='number'?+e.codecDisplay.toFixed(4):e.codecDisplay} (raw ${e.raw})`)});
}
console.log(JSON.stringify(built,null,1));
