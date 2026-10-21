// All changed presets here are synthetic test fixtures, never device evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {baselineUrl,compareDampingCapture} from './compare-modifier-damping.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';

const base=fs.readFileSync(baselineUrl), parsed=inspectStructure(base);
function synthetic(change,headerChange=()=>{}) {
  const body=Buffer.from(parsed.raw.body);change(body);
  const header=Buffer.from(parsed.raw.rawPatch);headerChange(header);
  const raw=reencodeRawPatch(header,body);
  return Buffer.from(reencodeDumpFromRawPatch(base,raw));
}
function check(candidate) {
  const a=Buffer.from(base),b=Buffer.from(candidate);
  const result=compareDampingCapture(a,b);
  assert.deepEqual(a,base);assert.deepEqual(b,candidate);
  assert.equal(result.writeAuthorized,false);assert.equal(result.deviceIO,false);
  assert.equal(result.presetWritten,false);assert.equal(result.reviewRequired,true);
  assert.equal(result.evidence.displayLabelVerified,false);
  assert.equal(result.evidence.deviceBehaviorVerified,false);
  assert.equal(result.evidence.audioVerified,false);
  assert.equal(result.evidence.firmwareDetected,null);
  return result;
}
test('isolated synthetic 0→1 identifies bytes without claiming label/device evidence',()=>{
  const r=check(synthetic(b=>b.writeUInt16LE(1,1632)));
  assert.equal(r.fileComparisonPassed,true);assert.equal(r.matchesHypothesis,true);
  assert.equal(r.status,'isolated-change-awaiting-display-review');
  assert.deepEqual(r.bodyChanges,[{offset:1632,before:0,after:1}]);
  assert.equal(r.targetContextPreserved,true);
});
test('unchanged export is not a changed-field pair',()=>assert.equal(check(base).status,'no-field-change'));
test('unanticipated uint16 codes retained as observations, not relabelled Linear',()=>{
  for(const value of [2,256,65535]) {
    const r=check(synthetic(b=>b.writeUInt16LE(value,1632)));
    assert.equal(r.fileComparisonPassed,true);assert.equal(r.matchesHypothesis,false);
    assert.equal(r.afterRaw,value);assert.equal(r.status,'isolated-unexpected-code-awaiting-review');
  }
});
test('all 24 other words and distant body changes are rejected',()=>{
  for(const offset of [...Array.from({length:24},(_,i)=>1584+2*i),0,1538+96+46,4609,14221]) {
    const r=check(synthetic(b=>{b.writeUInt16LE(1,1632);b[offset]^=1;}));
    assert.equal(r.fileComparisonPassed,false,`offset ${offset}`);
    assert.ok(['collateral-changes','invalid-preset'].includes(r.status));
  }
});
test('the real MED SPD export is an unrelated Auto Engage change',()=>{
  const r=check(fs.readFileSync(new URL('JB_RHYTHM_LEVEL_MINUS3_export.syx',baselineUrl)));
  assert.equal(r.status,'collateral-changes');
  assert.deepEqual(r.unrelatedBodyChanges,[{offset:1604,before:0,after:2}]);
});
test('renamed preset is rejected even with isolated damping body change',()=>{
  assert.equal(check(synthetic(b=>b.writeUInt16LE(1,1632),raw=>{raw[8]^=1;})).status,'collateral-changes');
});
test('wrong baseline, truncated and corrupt captures are rejected',()=>{
  assert.equal(compareDampingCapture(Buffer.alloc(0),base).status,'wrong-baseline');
  assert.equal(check(base.subarray(0,base.length-1)).status,'invalid-preset');
  const bad=Buffer.from(base);bad[100]^=1;
  assert.equal(check(bad).status,'invalid-preset');
});
test('CLI reads input, emits JSON and creates no files',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-damping-test-'));
  try {
    const input=path.join(dir,'synthetic-not-evidence.syx');
    const bytes=synthetic(b=>b.writeUInt16LE(1,1632));fs.writeFileSync(input,bytes);
    const run=spawnSync(process.execPath,[new URL('./compare-modifier-damping.mjs',import.meta.url).pathname,input],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).writeAuthorized,false);
    assert.deepEqual(fs.readdirSync(dir),['synthetic-not-evidence.syx']);assert.deepEqual(fs.readFileSync(input),bytes);
    const missing=spawnSync(process.execPath,[new URL('./compare-modifier-damping.mjs',import.meta.url).pathname,path.join(dir,'missing.syx')],{cwd:dir,encoding:'utf8'});
    assert.equal(missing.status,2);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
