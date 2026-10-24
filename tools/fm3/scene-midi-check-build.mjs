// Build the FM3 Scene MIDI decode pack (audit point 6, test 6b). Offline; writes one preset.
// Measurement preset only (the generator still refuses Scene MIDI): the composer NewLook preset
// plus the device-default Scene MIDI record (effect 190, 257 x 1 words, all zero) from the user's
// own FW13 export of fresh blocks, placed unconnected in row 1, column 1 exactly like that export.
// The collector loads it into the edit buffer; the user changes ONE Scene MIDI field at a time on
// the front panel; after each change the collector reads block 190 with the read-only fn=0x1F bulk
// read and reports which words changed. No store, no SET.
// Usage: node tools/fm3/scene-midi-check-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {generatePreset}=await imp('scripts/fm3-generate.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid,GRID}=await imp('scripts/fm3-layout.mjs');
const {insertDonor,INSERT_DONOR}=await imp('scripts/fm3-insert-blocks.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: scene-midi-check-build.mjs OUT_DIR');
const BASE=fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const NAME='SCENE MIDI 6B';
const composed=generatePreset(BASE,{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:NAME,reverbChannels:[{channel:'A',type:'Room: Large Room'}]}).syx;
const before=inspectStructure(composed),body=Buffer.from(before.raw.body),{records,tail}=scanRecords(body);
const rec=Buffer.from(insertDonor().byEid.get(190));assert.equal(rec.length,46+2*257);
for(let i=46;i<rec.length;i+=2)assert.equal(rec.readUInt16LE(i),0,'donor Scene MIDI words are all zero');
const cell=GRID.start+0*16+0*4;assert.equal(body.readUInt16LE(cell),0,'row 1 col 1 empty');
const prefix=Buffer.from(body.subarray(0,4610));prefix.writeUInt16LE(190,cell);prefix.writeUInt16LE(0,cell+2);
const nb=Buffer.concat([prefix,body.subarray(4610,tail),rec,body.subarray(tail)]);
const after=scanRecords(nb);assert.equal(after.records.length,records.length+1);assert.ok(after.records.some(r=>r.eid===190&&r.words===257&&r.channels===1));
const syx=Buffer.from(reencodeDumpFromRawPatch(composed,reencodeRawPatch(before.raw.rawPatch,nb)));
const st=inspectStructure(syx);assert.ok(Buffer.from(st.raw.body).equals(nb),'body readback');assert.equal(st.decoded.preset_name,NAME);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
assert.equal(readGrid(nb).find(g=>g.row===0&&g.col===0).id,190);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'S6B.syx'),syx);
// One field per step. The user may describe what they actually changed; the collector records it.
const STEPS=[
  'Scene 1, sõnum (message/command) 1: Type -> PC (programmivahetus)',
  'Scene 1, sõnum 1: Channel -> 2',
  'Scene 1, sõnum 1: number (Program / PC number) -> 5',
  'Scene 1, sõnum 1: Type -> CC',
  'Scene 1, sõnum 1: CC number -> 20',
  'Scene 1, sõnum 1: Value -> 64',
  'Scene 1, sõnum 2: Type -> PC',
  'Scene 2, sõnum 1: Type -> PC',
  'Scene 8, viimane sõnum: Type -> PC',
];
const manifest={kind:'fm3-scene-midi-check',version:1,date:'2026-10-24',confirmName:NAME,
  preset:{file:'S6B.syx',sha256:sha(syx),bodySha256:sha(nb),sceneMidiCell:{row:1,col:1},donor:INSERT_DONOR.file},
  blockRequest:hex(R.bulkReadPoll(190)),steps:STEPS,
  method:'Edit-buffer load (7F 00) and read-only fn=0x1F bulk reads of effect 190 only; the user edits on the front panel, one field per step. No store, no SET.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({name:NAME,steps:STEPS.length,sha:sha(syx).slice(0,16)}));
