// Build a CPU-per-scene pack from ONE of the user's own presets (FM3_CPU_SCENES.py). Offline.
// The pack is written only to OUT_DIR on the user's machine; the preset file, its name and values never
// go into the repository. The dump header is set to the edit buffer (only the 13-byte 0x77 frame changes);
// the stored selected scene is kept. The manifest holds the fm3-cpu estimate for every scene.
// Usage: node tools/fm3/cpu-scenes-build.mjs OUT_DIR FILE [INDEX]   (INDEX 1-based for a bank file)
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const {toEditBuffer}=await import(new URL('./cpu-check-edit-buffer.mjs',import.meta.url));
const [out,file,idx]=process.argv.slice(2);assert.ok(out&&file,'Usage: cpu-scenes-build.mjs OUT_DIR FILE [INDEX]');
const all=fs.readFileSync(file),SIZE=24680;assert.ok(all.length%SIZE===0,'not a multiple of 24680 bytes');
const i=idx?Number(idx)-1:0;assert.ok(Number.isInteger(i)&&i>=0&&i<all.length/SIZE,'INDEX out of range');
const b=toEditBuffer(all.subarray(i*SIZE,(i+1)*SIZE)),st=inspectStructure(b),e=estimateCpu(b);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'PRESET.syx'),b);
const m={kind:'fm3-cpu-scenes',version:1,confirmName:String(st.decoded.preset_name).trim(),
  preset:{file:'PRESET.syx',sha256:createHash('sha256').update(b).digest('hex')},storedSelectedScene:Buffer.from(st.raw.body)[0]+1,
  scenes:[1,2,3,4,5,6,7,8],estimate:{model:e.model,measurementsSha256:e.measurementsSha256,perScene:e.scenes.map(s=>s.percent),familiesWithoutCost:[...new Set(e.scenes.flatMap(s=>s.unknown))]},
  note:'User-owned preset; keep this pack outside the repository.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(m,null,1)+'\n');
console.log(JSON.stringify({storedSelectedScene:m.storedSelectedScene,perScene:m.estimate.perScene}));
