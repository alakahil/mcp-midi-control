import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectLegacy,auditLegacy} from './volume-pedal-legacy-audit.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {parsePresetDump,decodeRawPatch,reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-codec.mjs';
const inventory=JSON.parse(fs.readFileSync(new URL('../../docs/fm3/parameter-evidence/volume-pedal-0316-corpus.json',import.meta.url)));
const recorded=JSON.parse(fs.readFileSync(new URL('../../docs/fm3/parameter-evidence/volume-pedal-legacy.json',import.meta.url)));
const base=fs.readFileSync(new URL('../../'+recorded.volumeBindings[0].file,import.meta.url));
const parsed=parsePresetDump(base,0,17),raw=decodeRawPatch(parsed.chunkPayloads);
test('ten original old-format files replay all headers and the sole Volume Balance record',()=>{
  assert.deepEqual(auditLegacy(inventory),recorded);
  assert.equal(recorded.files.length,10);assert.equal(recorded.volumeBindings.length,1);
  const m=recorded.volumeBindings[0];
  assert.deepEqual([m.record,m.source,m.effectId,m.pid,m.channel],[2,3,102,1,0]);
  assert.deepEqual(m.words,[3,6600,61893,0,32767,65534,32767,66,102,1,0,0,0,32767,32767,66,2,0,0,0,0,0,0,0,0]);
  assert.equal(recorded.ext1VolumeGainBindings.length,0);
});
test('production structure guard still rejects the legacy file',()=>{
  assert.throws(()=>inspectStructure(base),/Unsupported preset format/);
});
test('corrupt framing, checksum and truncated input are rejected',()=>{
  const bad=Buffer.from(base);bad[20]^=1;
  assert.throws(()=>inspectLegacy(bad),/checksum/);
  assert.throws(()=>inspectLegacy(base.subarray(1)),/complete/);
  bad[0]=0;assert.throws(()=>inspectLegacy(bad),/boundary/);
});
test('valid transport cannot conceal a bad raw CRC or modifier layout',()=>{
  const badRaw=Uint8Array.from(raw.rawPatch);badRaw[8]^=1;
  assert.throws(()=>inspectLegacy(Buffer.from(reencodeDumpFromRawPatch(base,badRaw))),/CRC/);
  const body=Buffer.from(raw.body);body.writeUInt16LE(24,1538+42);
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(raw.rawPatch,body)));
  assert.throws(()=>inspectLegacy(syx),/header mismatch/);
});
test('unknown format and changed evidence identity fail closed',()=>{
  const patch=Uint8Array.from(raw.rawPatch);patch[0]=0x45;patch[1]=1;
  const syx=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(patch,raw.body)));
  assert.throws(()=>inspectLegacy(syx),/investigated legacy/);
  const inv=structuredClone(inventory);inv.unsupported[0].sha256='0'.repeat(64);
  assert.throws(()=>auditLegacy(inv),/hash mismatch/);
});
