// Build the per-preset switch definition step pack (FM3_MOD_STEPS.py, test T16). Offline. No global setting.
// T15 showed the override word order (word = 12 x (layout - 1) + (switch - 1), 9 layouts x 12 switches) but the
// FM3 displayed the extra definitions PP#2..PP#8 written at the T14 array positions as "Unassigned", and PP#1 as
// Momentary. This pack starts from a generator preset with the T14-confirmed PP#1 (Latching, CS 2, Layout 1
// switch 1) and lets the FM3 itself write PP#2 / PP#3 and two more overrides, one change per stored step, so the
// stored dumps show where definitions 2 and 3 really live.
// Usage: node tools/fm3/pp-steps-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: pp-steps-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='PP STEPS T16';
export const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,modifiers:{external1Wah:false}},layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},selectedScene:1,
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true}],
  footswitches:[{layout:1,switch:1,function:'latching',controlSwitch:2}]};
const syx=Buffer.from(createPreset(BASE,spec).syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
assert.equal(inspectStructure(syx).decoded.preset_name,NAME);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'PP_STEPS.syx'),syx);
const BB='Input Boost / Bright? (Amp plokk; näiteks "OFF ON")';
const steps=[
  {id:'base',field:'PP#1',question:'Per-Preset FC: mis on PP#1 Tap kategooria, funktsioon (Latching/Momentary) ja Control Switch? Ja Overrides, Layout 1 lüliti 1?',
   text:'Ära muuda midagi. HOME → nupp D (FC PER-PRESET) → Per-Preset FC: vaata PP#1; siis Overrides: Layout 1 lüliti 1.'},
  {id:'pp2',field:'PP#2',text:'Per-Preset FC: PP#2 → Tap: kategooria Control Switch, "Control Switch: Latching", Control Switch 3. Hold jäta Unassigned. Muuda ainult PP#2.'},
  {id:'pp3',field:'PP#3',text:'Per-Preset FC: PP#3 → Tap: kategooria Control Switch, "Control Switch: Momentary", Control Switch 3. Hold Unassigned. Muuda ainult PP#3.'},
  {id:'ov2',field:'Override L1 S2',text:'Overrides: Layout 1, lüliti 2 → PP#2. Muuda ainult seda.'},
  {id:'ov12',field:'Override L1 S12',text:'Overrides: Layout 1, lüliti 12 → PP#3. Muuda ainult seda.'},
  {id:'press',field:null,store:false,question:'Scene 1: enne, pärast FM3 lüliti 2 1. vajutust, pärast 2. vajutust: '+BB+' (näiteks "OFF ON / OFF OFF / OFF ON")',
   text:'Ole Layout 1-s ja Scene 1-s. Vajuta FM3 esipaneeli lülitit 2 lühidalt kaks korda; loe pärast igat vajutust.'},
  {id:'press1',field:null,store:false,question:'Pärast FM3 lüliti 1 vajutust: '+BB,text:'Vajuta FM3 esipaneeli lülitit 1 üks kord lühidalt ja loe.'}];
const manifest={kind:'fm3-store-steps',version:1,date:'2026-10-29',test:'T16',confirmName:NAME,preset:{file:'PP_STEPS.syx',sha256:sha(syx)},
  open:'Vali HOME leht. Kõik muudatused on ainult selles presetis; üldseadeid (SETUP) ära muuda.',steps,
  method:'Edit-buffer load (7F 00) once; after each user STORE one read-only stored-dump request (fn=0x03 hi lo 00); observation steps have no STORE and no read. The script never stores and never sets. No global setting is changed.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,steps:steps.length}));
