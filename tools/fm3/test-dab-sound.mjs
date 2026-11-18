// Synthetic checks for the Dust and Bone pack: rebuild pins, baseline = approved V1.3 file, song presets carry the
// song scene order and stay inside the review/CPU limits, preflight refuses a changed file. No device I/O.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build,CASES,PINNED,SONG_SCENES} from './dab-sound-build.mjs';
import {build as buildV13} from './l1-v13-build.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-dab-test-')),pack=path.join(tmp,'pack');
try{
 const r=build(pack);assert.deepEqual(r.sha256,PINNED);assert.deepEqual(CASES,['BASELINE_V13','DAB_A_PLEXI','DAB_B_DIRTY']);
 const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));assert.equal(p.kind,'fm3-dab-sound-preparation');
 assert.ok(p.packs.every(c=>c.scenes.length===8&&c.hardwareTested===false&&c.cpuEstimate.scenes.length===8));
 for(const c of p.packs.filter(c=>c.id!=='BASELINE_V13')){
  assert.deepEqual(c.scenes,SONG_SCENES);assert.ok(Math.max(...c.cpuEstimate.scenes)<=75,c.id+' CPU estimate');
 }
 const v13=buildV13(path.join(tmp,'v13'));
 assert.ok(v13.syx.equals(fs.readFileSync(path.join(pack,'BASELINE_V13/BASELINE_V13.syx'))),'baseline = approved V1.3');
 execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 fs.appendFileSync(path.join(pack,'DAB_A_PLEXI/DAB_A_PLEXI.txt'),'x');
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}),'tampered pack refused');
 console.log(JSON.stringify({passed:true,presets:CASES.length,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
