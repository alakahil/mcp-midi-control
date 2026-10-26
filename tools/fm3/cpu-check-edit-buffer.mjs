// Shared by cpu-check-build.mjs and cpu-scenes-build.mjs. Offline.
// toEditBuffer: set a preset dump's 0x77 header to the edit buffer (7F 00 00 40 00); only the 13-byte
// header frame changes, the body and its CRC stay byte-identical (checked).
// selectScene: set the selected scene (body byte 0), re-encoded and read back; nothing else in the body changes.
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump,reencodeRawPatch,reencodeDumpFromRawPatch}=await imp('scripts/fm3-codec.mjs');
export function selectScene(syx,s){
  const before=inspectStructure(syx),body=Buffer.from(before.raw.body);if(body[0]===s-1)return Buffer.from(syx);
  body[0]=s-1;const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body)));
  const after=Buffer.from(inspectStructure(out).raw.body);assert.ok(after.equals(body)&&inspectStructure(out).raw.crcValid,'scene readback');
  return out;
}
export function toEditBuffer(syx){
  const b=Buffer.from(syx),end=b.indexOf(0xf7);
  assert.ok(end===12&&b[5]===0x77,'unexpected 0x77 header frame');
  b[6]=0x7f;b[7]=0;let x=0;for(let i=0;i<end-1;i++)x^=b[i];b[end-1]=x&0x7f;
  const a=inspectStructure(syx),c=inspectStructure(b);
  assert.ok(c.raw.crcValid&&Buffer.from(a.raw.body).equals(Buffer.from(c.raw.body)),'body changed');
  assert.ok(b.subarray(13).equals(Buffer.from(syx).subarray(13)),'only the header frame may change');
  assert.deepEqual([...parsePresetDump(b,0,17).headerPayload],[0x7f,0,0,0x40,0],'edit-buffer header');
  return b;
}
