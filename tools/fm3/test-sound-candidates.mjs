import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from './sound-candidates-build.mjs';
import {build as buildV13} from './l1-v13-build.mjs';
import {acceptance} from './sound-acceptance.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {scanRecords} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-candidates-'));
try{
 const out=path.join(tmp,'pack'),result=build(out),v13=buildV13(path.join(tmp,'v13'));
 const base=fs.readFileSync(path.join(out,'BASELINE_V13.syx'));assert.ok(base.equals(v13.syx),'Baseline must reproduce V1.3 exactly');
 const body=bytes=>Buffer.from(inspectStructure(bytes).raw.body),a=body(base),ar=scanRecords(a);
 for(const [id,pid] of [['CAB_LOW80',38],['CAB_HIGH6500',39]]){
  const b=body(fs.readFileSync(path.join(out,id+'.syx')));assert.equal(a.length,b.length);
  const cab=ar.records.find(r=>r.eid===62),allowed=new Set(Array.from({length:32},(_,i)=>2+i));
  for(let c=0;c<4;c++){allowed.add(cab.start+2*(c*cab.words+pid));allowed.add(cab.start+2*(c*cab.words+pid)+1);}
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])assert.ok(allowed.has(i),'Unexpected changed byte '+i);
 }
 const pending=path.join(out,'BASELINE_V13.acceptance-pending.json');assert.throws(()=>acceptance(path.join(out,'BASELINE_V13'),pending),/acceptance is missing/);
 assert.equal(result.candidates[0].hardware.historicalListening.presetSha256,result.candidates[0].files.syx.sha256);
 assert.equal(result.candidates[0].hardware.historicalListening.measured.cpu,false);
 for(const c of result.candidates.slice(1))assert.equal(c.hardware.historicalListening,null);
 const incomplete=JSON.parse(fs.readFileSync(pending));incomplete.userAccepted=true;incomplete.comparisonReason='Test fixture only';incomplete.recordingChain={fixture:true};
 fs.writeFileSync(pending,JSON.stringify(incomplete));assert.throws(()=>acceptance(path.join(out,'BASELINE_V13'),pending),/Measured CPU/);
 incomplete.presetSha256='0'.repeat(64);fs.writeFileSync(pending,JSON.stringify(incomplete));
 assert.throws(()=>acceptance(path.join(out,'BASELINE_V13'),pending),/different final file/);
 const bad=JSON.parse(fs.readFileSync(pending));bad.syntheticOnly=true;fs.writeFileSync(pending,JSON.stringify(bad));
 assert.throws(()=>acceptance(path.join(out,'BASELINE_V13'),pending),/Synthetic/);
 assert.equal(result.candidates.length,3);
 console.log(JSON.stringify({passed:true,presets:3,quartetFiles:12,baselineByteIdentical:true,onlyCabAndNameBytesChanged:true,pendingAcceptanceRejected:true,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
