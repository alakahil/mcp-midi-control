// Build the switching check pack (FM3_BIND_STORE.py --load / --record, test T13). Offline. EXPERIMENT FILES:
// the generator binds Control Switches; to test the switching behaviour of the same records WITHOUT changing a
// global FM3 setting, these two test presets take the generated Control Switch records and replace only the
// source word (word 0) with the FM3's own PEDAL 2 switch sources (11 = PEDAL 2 TIP, 13 = PEDAL 2 RING), so the
// Ampero switch already plugged into PEDAL 2 drives them directly. One switch drives three records:
//   Input Boost (default template), Bright (invert: Min ON / Max OFF), Fat (channel D only).
// Scene 1 keeps the Amp on channel A, scene 2 on channel D. Nothing is stored; the user reads the front panel.
// Usage: node tools/fm3/switch-direct-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {readModifiers}=await imp('scripts/fm3-parameter-dependencies.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: switch-direct-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const variants=[{dir:'A_TIP',name:'SW T13 TIP',source:11,label:'PEDAL 2 (EXP/SW TIP)'},{dir:'B_RING',name:'SW T13 RING',source:13,label:'PEDAL 2 (SW RING)'}];
const checks=[
  {id:'scene1Before',text:'Scene 1 (Amp kanal A), ENNE vajutust: Input Boost / Bright / Fat? (näiteks "OFF ON OFF")'},
  {id:'scene1Press1',text:'Scene 1: vajuta Ampero B-nuppu LÜHIDALT üks kord. Input Boost / Bright / Fat?'},
  {id:'scene1Press2',text:'Scene 1: vajuta B LÜHIDALT veel kord. Input Boost / Bright / Fat?'},
  {id:'scene1Held',text:'Kas väärtus muutus ainult vajutuse ajal (momentary) või jäi püsima (latching)? Kirjuta, mida nägid.'},
  {id:'scene2Before',text:'Vali Scene 2 (Amp kanal D). Input Boost / Bright / Fat enne vajutust?'},
  {id:'scene2Press1',text:'Scene 2: vajuta B LÜHIDALT üks kord. Input Boost / Bright / Fat?'},
  {id:'source',text:'Amp → Input Boost → ENTER: mis on Source 1? (EXIT pärast)'}];
fs.mkdirSync(out,{recursive:true});const built=[];
for(const v of variants){
  const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:v.name,modifiers:{external1Wah:false}},layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},selectedScene:1,
    blockScenes:{amp:[{scene:1,channel:'A',bypass:false},{scene:2,channel:'D',bypass:false}]},
    controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT',invert:true},{switch:4,block:'amp',param:'DISTORT_FAT',channel:'D'}]};
  const gen=Buffer.from(createPreset(BASE,spec).syx),p=inspectStructure(gen),body=Buffer.from(p.raw.body);
  for(const r of [1,2,3]){assert.ok([51,52,53].includes(body.readUInt16LE(1584+96*r)));body.writeUInt16LE(v.source,1584+96*r);}
  const syx=Buffer.from(reencodeDumpFromRawPatch(gen,reencodeRawPatch(p.raw.rawPatch,body))),st=inspectStructure(syx);
  assert.ok(st.raw.crcValid&&Buffer.from(st.raw.body).equals(body));assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0]);
  const mods=readModifiers(body).filter(m=>m.active).map(m=>[m.record,m.sourceName,m.pid,m.channelScope]);
  assert.deepEqual(mods.map(m=>m[1]),[v.label,v.label,v.label]);
  const dir=path.join(out,v.dir);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SWITCH.syx'),syx);
  const manifest={kind:'fm3-bind-check',version:1,date:'2026-10-29',confirmName:v.name,preset:{file:'SWITCH.syx',sha256:sha(syx)},
    experiment:'Generated Control Switch records with word 0 set to '+v.source+' ('+v.label+'); not a generator feature',bindings:mods.map(([record,source,pid,channel])=>({record,source,pid,channel})),
    scenes:{1:'Amp channel A',2:'Amp channel D'},checks,method:'--load: edit-buffer dump (7F 00) only; the user presses the Ampero B switch briefly, selects scenes on the front panel and reads the Amp page. --record saves the readings without device I/O. Nothing is stored or set.'};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');built.push([v.dir,manifest.preset.sha256,mods]);
}
console.log(JSON.stringify(built));
