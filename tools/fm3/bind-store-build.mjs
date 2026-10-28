// Build the modifier bindings STORE/reload pack (FM3_BIND_STORE.py, test T9). Offline.
// One generated preset with four bindings: External 1 -> Wah (record 0), External 1 -> Volume/Pan 1 Volume
// (record 1), Control Switch 2 -> Amp Input Boost (record 2) and Control Switch 3 -> Amp Bright (record 3).
// The collector loads it into the edit buffer (--load); the USER checks the sources on the front panel,
// STOREs the preset to a location HE chooses, reloads it and checks again. Then --verify reads that location
// with the read-only stored-dump request. The script never stores. No commercial preset content is used.
// Usage: node tools/fm3/bind-store-build.mjs OUT_DIR
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
const [out]=process.argv.slice(2);assert.ok(out,'Usage: bind-store-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='BIND T9 STORE';
export const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}},
  volumePan:true,volumePedal:true,layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']},selectedScene:1,
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT'}]};
const result=createPreset(BASE,spec),syx=Buffer.from(result.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,NAME);
const active=readModifiers(Buffer.from(st.raw.body)).filter(m=>m.active).map(m=>[m.record,m.sourceName,m.effectId,m.pid]);
assert.deepEqual(active,[[0,'External 1',94,5],[1,'External 1',102,0],[2,'Control Switch 2',58,42],[3,'Control Switch 3',58,41]]);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'BIND.syx'),syx);
const manifest={kind:'fm3-bind-store',version:1,date:'2026-10-28',confirmName:NAME,preset:{file:'BIND.syx',sha256:sha(syx)},
  bindings:active.map(([record,source,effectId,pid])=>({record,source,effectId,pid})),
  checks:[
    {id:'wahSource',text:'Wah plokk, parameeter Control, ENTER: mis on Source 1?'},
    {id:'volumeSource',text:'Volume/Pan plokk, parameeter Volume, ENTER: mis on Source 1?'},
    {id:'boostSource',text:'Amp plokk (Preamp leht), Input Boost, ENTER: mis on Source 1?'},
    {id:'brightSource',text:'Amp plokk, Bright, ENTER: mis on Source 1?'},
    {id:'pedal',text:'Pedaali liigutades (FM3-Edit või esipaneel): kas Wah Control ja Volume liiguvad? (mõlemad / ainult wah / ainult volume / ei kumbki)'},
    {id:'switches',text:'Kui sul on jalglüliti Control Switch 2/3 jaoks: kas Input Boost / Bright lülitub? (j / e / - kui pole määratud)'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 / in FM3-Edit to a location he chooses. --verify: one read-only stored-dump request (fn=0x03 hi lo 00) for that location; bodies compared offline. The script never stores and never sets.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256,bindings:active}));
