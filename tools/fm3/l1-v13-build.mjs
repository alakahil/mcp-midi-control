// LIVE KOOSLUS V1.3 from the 13.11.2026 L1 loudness measurement of V1.2 (H6). Offline; never device I/O.
// V1.3 = V1.2 + Out 1 Scene Level: scene 2 -1.5 dB (L1 corrected +1.5 dB vs scene 1), lead scenes 3 and 7 +2 dB
// (deliberately louder; L1 showed them not louder on average). Everything else as V1.2.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {specs as h6Specs} from './h6-t45-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {createPreset,writePresetOutputs,verifyPresetOutputs}=await import(path.join(E,'scripts/fm3-preset.mjs'));
export const BASE=path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
export const V13_SCENE_LEVELS=[0,-1.5,2,0,0,0,2,0];
export function specV13(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-v13-'));
 try{
  const h6=h6Specs(tmp).cases.find(c=>c.id==='H6').spec;
  return {v12:h6,v13:{...structuredClone(h6),composer:{...structuredClone(h6.composer),name:'LIVE KOOSLUS V1.3'},
   purpose:'LIVE KOOSLUS V1.3: V1.2 + L1 mõõtmise (13.11.2026) järgi Out 1 stseenitasemed: stseen 2 -1,5 dB, lead-stseenid 3 ja 7 +2 dB. Muu nagu V1.2.',
   controls:[...h6.controls,...V13_SCENE_LEVELS.map((value,i)=>({block:'out1',channel:'A',param:'OUTPUT_SCENE'+(i+1),value}))]}};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
export function build(out){
 fs.mkdirSync(out,{recursive:true});
 const {v13}=specV13(),stem=path.join(out,'LIVE_KOOSLUS_V1_3');
 const p=createPreset(fs.readFileSync(BASE),v13);writePresetOutputs(stem,p,v13);verifyPresetOutputs(stem);
 return {stem,syx:Buffer.from(p.syx)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: l1-v13-build.mjs OUT_DIR');
 const {stem}=build(path.resolve(process.argv[2]));console.log(JSON.stringify({written:stem+'.syx'}));
}
