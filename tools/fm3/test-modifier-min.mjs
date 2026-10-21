// Changed presets in these tests are synthetic and never saved as device evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {baselineUrl,compareMinCapture} from './compare-modifier-min.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';

const base=fs.readFileSync(baselineUrl),parsed=inspectStructure(base);
function synthetic(change,headerChange=()=>{}) {
  const body=Buffer.from(parsed.raw.body);change(body);
  const header=Buffer.from(parsed.raw.rawPatch);headerChange(header);
  return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(header,body)));
}
function check(candidate) {
  const a=Buffer.from(base),b=Buffer.from(candidate),r=compareMinCapture(a,b);
  assert.deepEqual(a,base);assert.deepEqual(b,candidate);
  for(const k of ['writeAuthorized','deviceIO','presetWritten'])assert.equal(r[k],false);
  for(const k of ['displayValueVerified','fullRangeCodecVerified','deviceBehaviorVerified','audioVerified','changedFieldCaptureReviewed'])assert.equal(r.evidence[k],false);
  assert.equal(r.field.encodingVerified,false);assert.equal(r.reviewRequired,true);
  assert.equal(r.evidence.firmwareDetected,null);
  return r;
}
test('two synthetic rounding hypotheses remain unverified observations',()=>{
  for(const value of [16383,16384]) {
    const r=check(synthetic(b=>b.writeUInt16LE(value,1586)));
    assert.equal(r.fileComparisonPassed,true);assert.equal(r.matchesHypothesis,true);
    assert.equal(r.afterRaw,value);assert.equal(r.beforeRaw,0);
    assert.equal(r.status,'isolated-change-awaiting-display-review');
    assert.equal(r.targetContextPreserved,true);
    assert.deepEqual(r.target,{source:14,effectId:94,pid:5,channel:0});
  }
});
test('unchanged baseline does not prove a Min change',()=>assert.equal(check(base).status,'no-field-change'));
test('unexpected uint16 codes retained, never converted into a measured display',()=>{
  for(const value of [1,250,32767,65534,65535]) {
    const r=check(synthetic(b=>b.writeUInt16LE(value,1586)));
    assert.equal(r.fileComparisonPassed,true);assert.equal(r.matchesHypothesis,false);
    assert.equal(r.afterRaw,value);assert.equal(r.status,'isolated-unexpected-code-awaiting-review');
  }
});
test('all other modifier words, scene and distant body changes are rejected',()=>{
  const offsets=[...Array.from({length:25},(_,i)=>i).filter(i=>i!==1).map(i=>1584+2*i),0,1538+96+46,4609,14221];
  for(const offset of offsets) {
    const r=check(synthetic(b=>{b.writeUInt16LE(16384,1586);b[offset]^=1;}));
    assert.equal(r.fileComparisonPassed,false,`offset ${offset}`);
    assert.ok(['collateral-changes','invalid-preset'].includes(r.status));
  }
});
test('earlier real captures are collateral changes, not new Min evidence',()=>{
  for(const name of ['FM3_MOD_AUTOENGAGE_OFF_export.syx','JB_RHYTHM_LEVEL_MINUS3_export.syx'])
    assert.equal(check(fs.readFileSync(new URL(name,baselineUrl))).status,'collateral-changes');
});
test('renamed preset with a Min change is rejected',()=>
  assert.equal(check(synthetic(b=>b.writeUInt16LE(16384,1586),raw=>{raw[8]^=1;})).status,'collateral-changes'));
test('wrong baseline, truncation and corruption fail closed',()=>{
  assert.equal(compareMinCapture(Buffer.alloc(0),base).status,'wrong-baseline');
  assert.equal(check(base.subarray(0,base.length-1)).status,'invalid-preset');
  const bad=Buffer.from(base);bad[100]^=1;assert.equal(check(bad).status,'invalid-preset');
});
test('CLI emits a report without modifying inputs or creating files',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-min-test-'));
  try {
    const input=path.join(dir,'synthetic-not-evidence.syx'),bytes=synthetic(b=>b.writeUInt16LE(16384,1586));
    fs.writeFileSync(input,bytes);
    const cli=new URL('./compare-modifier-min.mjs',import.meta.url).pathname;
    const run=spawnSync(process.execPath,[cli,input],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).writeAuthorized,false);
    assert.deepEqual(fs.readdirSync(dir),['synthetic-not-evidence.syx']);assert.deepEqual(fs.readFileSync(input),bytes);
    const missing=spawnSync(process.execPath,[cli,path.join(dir,'missing.syx')],{cwd:dir,encoding:'utf8'});
    assert.equal(missing.status,2);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
