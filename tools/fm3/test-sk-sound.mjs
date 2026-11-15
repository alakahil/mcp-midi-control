// Synthetic checks for the SK1-SK4 pack: rebuild pins, baseline = approved V1.3 file, candidates differ only by Cab filters,
// preflight refuses a changed file. No device I/O.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build,CASES,PINNED} from './sk-sound-build.mjs';
import {build as buildV13} from './l1-v13-build.mjs';
import {fileURLToPath} from 'node:url';
const E=fileURLToPath(new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/',import.meta.url));
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const body=f=>Buffer.from(inspectStructure(fs.readFileSync(f)).raw.body);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-sk-test-')),pack=path.join(tmp,'pack');
try{
 const r=build(pack);assert.deepEqual(r.sha256,PINNED);assert.deepEqual(CASES,['BASELINE_V13','CAB_LOW80','CAB_HIGH6500']);
 const p=JSON.parse(fs.readFileSync(path.join(pack,'pack.json')));assert.equal(p.kind,'fm3-sk-sound-preparation');
 assert.ok(p.packs.every(c=>c.scenes.length===8&&c.hardwareTested===false&&c.cpuEstimate.scenes.length===8));
 const v13=buildV13(path.join(tmp,'v13'));
 assert.ok(v13.syx.equals(fs.readFileSync(path.join(pack,'BASELINE_V13/BASELINE_V13.syx'))),'baseline = approved V1.3');
 const base=body(path.join(pack,'BASELINE_V13/BASELINE_V13.syx'));
 for(const id of ['CAB_LOW80','CAB_HIGH6500']){
  const b=body(path.join(pack,id,id+'.syx'));assert.equal(b.length,base.length);
  let n=0;for(let i=0;i<b.length;i++)if(b[i]!==base[i])n++;assert.ok(n>0&&n<=40,id+' body differs only in Cab filter and name bytes ('+n+')');
 }
 execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'});
 fs.appendFileSync(path.join(pack,'CAB_LOW80/CAB_LOW80.txt'),'x');
 assert.throws(()=>execFileSync('python3',['-B',path.join(pack,'ALUSTA.py'),'--preflight'],{stdio:'pipe'}),'tampered pack refused');
 console.log(JSON.stringify({passed:true,presets:CASES.length,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
