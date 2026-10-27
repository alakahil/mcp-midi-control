// Build the Volume pedal STORE/reload pack (FM3_PEDAL_STORE.py, test T2). Offline.
// One preset: the 0.3.17 volumePedal binding (External 1 -> Volume/Pan 1 Gain, Channels ALL), as in the
// 2026-10-24 pedal check P1, renamed "PEDAL T2 STORE". The collector loads it into the edit buffer
// (--load) and exits; the USER reads the Volume knob in FM3-Edit at heel / 25 / 50 / 75 % / toe, STOREs
// the preset to a location HE chooses, reloads it and repeats the readings. Then --verify reads that
// location with the read-only stored-dump request and compares it with this file. The script never stores.
// Usage: node tools/fm3/pedal-store-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords}=await imp('scripts/fm3-layout.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: pedal-store-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const BASE=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const NAME='PEDAL T2 STORE';
const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name=NAME;spec.blockScenes={volpan:[{scene:1,channel:'A',bypass:false}]};spec.selectedScene=1;spec.volumePedal=true;
const syx=Buffer.from(createPreset(BASE,spec).syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
const st=inspectStructure(syx);assert.equal(st.decoded.preset_name,NAME);assert.ok(scanRecords(Buffer.from(st.raw.body)).records.some(r=>r.eid===102),'Volume/Pan 1');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'PEDAL.syx'),syx);
const manifest={kind:'fm3-pedal-store',version:1,date:'2026-10-26',confirmName:NAME,preset:{file:'PEDAL.syx',sha256:sha(syx)},
  positions:[{id:'heel',text:'kand all (pedaal täiesti tagasi)'},{id:'p25',text:'umbes veerand'},{id:'p50',text:'umbes pool'},{id:'p75',text:'umbes kolmveerand'},{id:'toe',text:'varvas all (pedaal täiesti ette)'}],
  method:'--load: edit-buffer dump (7F 00) only. The user STOREs on the FM3 / in FM3-Edit to a location he chooses. --verify: one read-only stored-dump request (fn=0x03 hi lo 00) for that location; frames compared with this file. The script never stores and never sets.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,sha256:manifest.preset.sha256}));
