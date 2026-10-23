import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compareInputVolume} from './compare-input-volume.mjs';
import {createPreset} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-preset.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {scanRecords} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
const source=createPreset(fs.readFileSync(new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url)),JSON.parse(fs.readFileSync(new URL('../../docs/fm3/parameter-evidence/input-volume-check.spec.json',import.meta.url)))).syx;
const initial=inspectStructure(source),original=Buffer.from(initial.raw.body),at=scanRecords(original).tail;
// Synthetic all-zero Volume record: software fixture only, never a usable donor.
const volume=Buffer.alloc(166);volume.writeUInt16LE(102,0);volume.writeUInt16LE(15,42);volume.writeUInt16LE(4,44);
const body=Buffer.concat([original.subarray(0,at),volume,original.subarray(at)]);body.writeUInt16LE(102,284);
const encode=b=>Buffer.from(reencodeDumpFromRawPatch(source,reencodeRawPatch(initial.raw.rawPatch,b)));
const result=compareInputVolume(source,encode(body));assert.equal(result.passed,true,JSON.stringify(result.errors));assert.equal(result.volume.words,15);
assert.equal(compareInputVolume(source,source).passed,false);
for(const offset of [3,284,scanRecords(body).records.find(r=>r.eid===37).start,body.length-1]){const b=Buffer.from(body);b[offset]^=1;assert.equal(compareInputVolume(source,encode(b)).passed,false,'Mutation '+offset);}
const old=Buffer.from(body);old.writeUInt16LE(14,at+42);assert.equal(compareInputVolume(source,encode(old)).passed,false);
const corrupt=encode(body);corrupt[100]^=1;assert.equal(compareInputVolume(source,corrupt).passed,false);
console.log(JSON.stringify({passed:true,syntheticOnly:true,validInsertion:1,rejections:7,newHardwareMeasurements:0}));
