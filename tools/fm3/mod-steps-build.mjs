// Build the modifier field step pack (FM3_MOD_STEPS.py, test T12). Offline.
// One generated preset with the External 1 -> Volume/Pan 1 Volume binding (record 0, FW13 captured defaults).
// The user changes ONE Modify-page field per step on the front panel, types the shown value and STOREs to his
// test location; the collector reads that location after each step (fn=0x03). Consecutive dumps differ in the
// changed word only, which pairs every modifier word with its display. The last step sets Source 1 to NONE,
// which shows the FM3's own removal form on the device.
// Usage: node tools/fm3/mod-steps-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: mod-steps-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const NAME='MOD STEPS T12';
const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name=NAME;spec.blockScenes={volpan:[{scene:1,channel:'A',bypass:false}]};spec.selectedScene=1;spec.volumePedal=true;
const syx=Buffer.from(createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec).syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,NAME);
assert.deepEqual(readModifiers(Buffer.from(st.raw.body)).filter(m=>m.active).map(m=>[m.record,m.sourceName,m.effectId,m.pid]),[[0,'External 1',102,0]]);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'STEPS.syx'),syx);
// One field per step, cumulative (each step keeps the previous changes). Values are targets; the user types
// what the screen actually shows (the FM3 may offer the nearest step).
const steps=[
  {id:'base',field:null,text:'Ära muuda midagi. (Võrdlus: genereeritud fail pärast STORE-i.)',ask:false},
  {id:'start',field:'Start',text:'Modify leht: Start → 20.0 % (või lähim).'},
  {id:'end',field:'End',text:'Modify leht: End → 80.0 % (või lähim).'},
  {id:'mid',field:'Mid',text:'Modify leht: Mid → 25.0 %.'},
  {id:'slope',field:'Slope',text:'Modify leht: Slope → 75.0 %.'},
  {id:'scale',field:'Scale',text:'Modify leht: Scale → 2.000 (või lähim).'},
  {id:'scale2',field:'Scale',text:'Modify leht: Scale → 0.500 (või lähim).'},
  {id:'offset',field:'Offset',text:'Modify leht: Offset → 10.0 % (või lähim).'},
  {id:'attack',field:'Attack',text:'Modify leht: Attack → 100 ms (või lähim). Release jäta samaks.'},
  {id:'release',field:'Release',text:'Modify leht: Release → 500 ms (või lähim).'},
  {id:'damping',field:'Damping',text:'Modify leht: Damping → järgmine valik (praegu EXPONENTIAL).'},
  {id:'autoengage',field:'Auto-Engage',text:'Modify leht: Auto-Engage → järgmine valik pärast OFF.'},
  {id:'offvalue',field:'Off Value',text:'Modify leht: Off Value → 50.0 % (või lähim).'},
  {id:'updaterate',field:'Update Rate',text:'Modify leht: Update Rate → järgmine valik (praegu SLOW).'},
  {id:'pcreset',field:'PC Reset',text:'Modify leht: PC Reset → ON.'},
  {id:'remove',field:'Source 1',text:'Mine tagasi Source lehele (PAGE LEFT): Source 1 → NONE (eemaldab seose).'}];
const manifest={kind:'fm3-mod-steps',version:1,date:'2026-10-29',confirmName:NAME,preset:{file:'STEPS.syx',sha256:sha(syx)},
  binding:{record:0,source:'External 1',target:'Volume/Pan 1 Volume (VOLUME_GAIN)'},
  open:'LAYOUT: Volume/Pan plokk → EDIT → parameeter Volume → ENTER (Modifier menüü) → PAGE RIGHT (Modify leht). Jää sellele lehele; iga samm muudab ainult ühte välja.',
  steps,method:'Edit-buffer load (7F 00) once; after each user STORE one read-only stored-dump request (fn=0x03 hi lo 00). The script never stores and never sets.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,steps:steps.length}));
