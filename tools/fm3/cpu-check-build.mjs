// Build a CPU check pack from the user's OWN preset files (FM3_CPU_SWEEP.py). Offline.
// Compares the fm3-cpu estimate with the device meter on presets the plugin did not generate
// (e.g. a purchased tonepack). The pack is written only to OUT_DIR on the user's machine; preset
// files, names and values never go into the repository.
// Input: single 24680-byte presets or banks (N x 24680 bytes). Each picked preset is copied with
// its dump header set to the edit buffer (7F 00 00 40 00; only the 13-byte 0x77 frame changes, the
// body and its CRC stay byte-identical, checked). The first item is the repo calibration preset
// FM3_P6_INSERT_A (hand-measured 82.5 %): the collector stops if the meter decode disagrees.
// --scene=worst (default) also sets the preset's selected scene (body byte 0) to the scene with the
// highest estimate, re-encoding the dump (new CRC, readback-checked), so the meter is read in the
// scene that matters for the safe limit. --scene=stored keeps the file's own selected scene.
// Usage: node tools/fm3/cpu-check-build.mjs OUT_DIR [--pick=8] [--scene=worst|stored] FILE...
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const {toEditBuffer,selectScene}=await import(new URL('./cpu-check-edit-buffer.mjs',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const args=process.argv.slice(2),files=args.filter(a=>!a.startsWith('--')),out=files.shift();
const pickArg=args.find(a=>a.startsWith('--pick='));const pick=pickArg?Number(pickArg.slice(7)):8;
assert.ok(out&&files.length,'Usage: cpu-check-build.mjs OUT_DIR [--pick=8] FILE...');
assert.ok(Number.isInteger(pick)&&pick>=2&&pick<=40,'--pick must be 2..40');
const sceneArg=(args.find(a=>a.startsWith('--scene='))??'--scene=worst').slice(8);
assert.ok(['worst','stored'].includes(sceneArg),'--scene must be worst or stored');
const SIZE=24680;

const cands=[];
for(const f of files){const all=fs.readFileSync(f);assert.ok(all.length%SIZE===0,`${f}: not a multiple of ${SIZE} bytes`);
  for(let i=0;i<all.length/SIZE;i++){const syx=all.subarray(i*SIZE,(i+1)*SIZE);let st,est;
    try{st=inspectStructure(syx);if(!st.raw.crcValid)continue;est=estimateCpu(syx);}catch{continue;}
    const stored=Buffer.from(st.raw.body)[0]+1,sel=sceneArg==='worst'?est.worstScene:stored,scene=est.scenes.find(s=>s.scene===sel)??est.scenes[0];
    cands.push({source:path.basename(f),index:i,name:String(st.decoded.preset_name??'').trim(),syx,storedScene:stored,selectedScene:scene.scene,estimatePercent:scene.percent,
      estimateMaxPercent:est.maxPercent,measuredTypeCoverage:scene.measuredTypeCoverage,unknown:scene.unknown});}}
assert.ok(cands.length>=pick,`only ${cands.length} usable presets`);
cands.sort((a,b)=>a.estimatePercent-b.estimatePercent||a.index-b.index);
// Spread over the estimate range: always the lowest and the highest, the rest at even ranks.
const ranks=[...new Set(Array.from({length:pick},(_,k)=>Math.round(k*(cands.length-1)/(pick-1))))];
const picked=ranks.map(r=>cands[r]);
fs.mkdirSync(out,{recursive:true});
const calSrc=fs.readFileSync(new URL(E+'examples/FM3_P6_INSERT_A.syx',import.meta.url));
const items=[{id:'cal-p6a',family:'calibration',file:'CAL_P6A.syx',sha256:sha(calSrc),expectPercent:82.5}];
fs.writeFileSync(path.join(out,'CAL_P6A.syx'),calSrc);
for(const [k,c] of picked.entries()){const file=`P${String(k+1).padStart(2,'0')}.syx`,b=toEditBuffer(selectScene(c.syx,c.selectedScene));fs.writeFileSync(path.join(out,file),b);
  items.push({id:`p${String(k+1).padStart(2,'0')}`,family:'user-preset',file,sha256:sha(b),name:c.name,source:`${c.source} #${c.index+1}`,
    storedScene:c.storedScene,selectedScene:c.selectedScene,estimatePercent:c.estimatePercent,estimateMaxPercent:c.estimateMaxPercent,measuredTypeCoverage:c.measuredTypeCoverage,unknown:c.unknown});}
const manifest={kind:'fm3-cpu-check',version:1,confirmName:String(inspectStructure(calSrc).decoded.preset_name).trim(),
  scene:sceneArg,note:'User-owned presets; keep this pack outside the repository.',candidates:cands.length,items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({candidates:cands.length,picked:picked.map(c=>c.estimatePercent)}));
