// Build the Control Switch / per-preset switch step pack (FM3_MOD_STEPS.py, test T14). Offline. NO GLOBAL SETTING:
// the FM3 stores per-preset switch definitions and overrides IN THE PRESET (Footswitch Functions Guide: "You must
// STORE the preset after setting up FC Switch definitions and overrides"), and the Control Switch state per scene is
// a per-preset Controllers setting. One generated preset:
//   External 1 -> Wah Control (record 0) with Off Value 95 % (word 12 = 65534; settles the T7 "5.0%" reading),
//   Control Switch 2 -> Input Boost, Control Switch 3 -> Bright (inverted), Control Switch 4 -> Fat (CHAN D only),
//   scene 1 = Amp channel A, scene 2 = Amp channel D.
// The user makes ONE change per step on the front panel and STOREs to his test location; the collector reads that
// location after each STORE (fn=0x03, read only), so consecutive dumps locate the CS-per-scene and per-preset switch
// words. Observation steps (store:false) record what a footswitch press does.
// Usage: node tools/fm3/cs-steps-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: cs-steps-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='CS STEPS T14';
export const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true,wahControls:{offValuePercent:95}}},
  layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']},selectedScene:1,
  blockScenes:{wah:[{scene:1,channel:'A',bypass:true},{scene:2,channel:'A',bypass:true}],amp:[{scene:1,channel:'A',bypass:false},{scene:2,channel:'D',bypass:false}]},
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},{switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}]};
const result=createPreset(BASE,spec),syx=Buffer.from(result.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx),body=Buffer.from(st.raw.body);assert.equal(st.decoded.preset_name,NAME);
const active=readModifiers(body).filter(m=>m.active).map(m=>[m.record,m.sourceName,m.effectId,m.pid,m.channelScope]);
assert.deepEqual(active,[[0,'External 1',94,5,'ALL'],[1,'Control Switch 2',58,42,'ALL'],[2,'Control Switch 3',58,41,'ALL'],[3,'Control Switch 4',58,80,'CHAN D']]);
assert.equal(body.readUInt16LE(1584+24),65534,'Off Value word 12 = 65534 (95 %)');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'CS_STEPS.syx'),syx);
const BBF='Input Boost / Bright / Fat? (Amp plokk; näiteks "ON OFF OFF")';
const steps=[
  {id:'base',field:'Off Value',question:'Wah plokk → Control → ENTER → PAGE RIGHT: mis on Off Value? (EXIT pärast)',
   text:'Ära muuda midagi. Loe ainult Wahi Off Value. (Võrdlus: genereeritud fail pärast STORE-i.)'},
  {id:'csLookup',field:null,store:false,question:'Mis leheküljed/valikud CONTROLLERS menüüs on ja mida näitavad CS 2 / CS 3 Scene 1 ja Scene 2?',
   text:'HOME lehel vajuta nuppu C (CONTROLLERS). Otsi lehte, kus on Control Switchid stseeni kaupa (näiteks "CS per Scene" / "Control Switches"). ÄRA veel muuda midagi.'},
  {id:'cs2scene1',field:'CS 2 Scene 1',text:'CONTROLLERS, Control Switch stseeni lehel: CS 2, Scene 1 → ON (kui juba ON, siis OFF). Muuda ainult seda.'},
  {id:'cs2scene2',field:'CS 2 Scene 2',text:'Sama leht: CS 2, Scene 2 → LAST (kui LAST-i pole, vali kolmas valik). Muuda ainult seda.'},
  {id:'cs3scene1',field:'CS 3 Scene 1',text:'Sama leht: CS 3, Scene 1 → ON (kui juba ON, siis OFF). Muuda ainult seda.'},
  {id:'ppLookup',field:null,store:false,question:'Mis on FC PER-PRESET lehtedel (nimed, mitu definitsiooni, kas override on lubatud)?',
   text:'HOME lehel vajuta nuppu D (FC PER-PRESET). Vaata lehed läbi. ÄRA veel muuda midagi. Kui ekraan ütleb, et per-preset override on globaalselt keelatud, kirjuta see üles ja ÄRA lülita seda sisse.'},
  {id:'ppDefine',field:'Per-preset switch 1',question:'Mis on nüüd definitsiooni 1 Tap ja Hold, ja mis Control Switchi number?',
   text:'FC PER-PRESET: per-preset lüliti definitsioon 1 → Tap: kategooria Control Switch, funktsioon "Control Switch: Latching", Control Switch 2. Hold jäta tühjaks (NONE).'},
  {id:'ppOverride',field:'Override',question:'Millise jalglüliti (number ja paigutus/layout) see nüüd asendab?',
   text:'FC PER-PRESET: määra definitsioon 1 asendama (override) üht esipaneeli jalglülitit, mida sa selles presetis muidu ei vaja.'},
  {id:'press1',field:null,store:false,question:'Scene 1 enne vajutust, pärast 1. vajutust ja pärast 2. vajutust: '+BBF+' (näiteks "ON OFF OFF / OFF ON OFF / ON OFF OFF")',
   text:'Vali Scene 1 (Amp kanal A). Vajuta asendatud jalglülitit lühidalt ühe korra, loe; vajuta uuesti, loe. Kas lüliti LED muutus?'},
  {id:'press2',field:null,store:false,question:'Scene 2 kohe pärast valimist, siis pärast 1. vajutust: '+BBF,
   text:'Vali Scene 2 (Amp kanal D). Loe kohe; siis vajuta asendatud jalglülitit üks kord ja loe.'},
  {id:'scene1again',field:null,store:false,question:'Scene 1 kohe pärast valimist: '+BBF,
   text:'Vali uuesti Scene 1 ja loe kohe (vajutamata). See näitab, kas CS 2 Scene 1 = ON rakendub stseeni valikul.'}];
const manifest={kind:'fm3-store-steps',version:1,date:'2026-10-29',test:'T14',confirmName:NAME,preset:{file:'CS_STEPS.syx',sha256:sha(syx)},
  bindings:active.map(([record,source,effectId,pid,channel])=>({record,source,effectId,pid,channel})),scenes:{1:'Amp channel A',2:'Amp channel D'},offValueWord:65534,
  open:'Vali HOME leht. Kõik muudatused on ainult selles presetis; üldseadeid (SETUP) ära muuda.',
  steps,method:'Edit-buffer load (7F 00) once; after each user STORE one read-only stored-dump request (fn=0x03 hi lo 00); observation steps have no STORE and no read. The script never stores and never sets. Per-preset switches and CS-per-scene states are stored in the preset; no global setting is changed.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,steps:steps.length,bindings:active.length}));
