// All candidates remain synthetic buffers, never saved as hardware evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {fixtures,fixtureRoot,compareCandidate,verifyMemoryDiff} from './modifier-minmax-syxdiff.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';

const sources=fixtures.map(f=>fs.readFileSync(new URL(f.file,fixtureRoot)));
const request=values=>({policy:'exact-wah-cent-v1',...values});
const base=sources[0];
function synthetic(change,headerChange=()=>{}) {
  const parsed=inspectStructure(base),body=Buffer.from(parsed.raw.body),header=Buffer.from(parsed.raw.rawPatch);
  change(body);headerChange(header);
  return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(header,body)));
}
function check(source,values) {
  const original=Buffer.from(source),r=compareCandidate(source,request(values));
  assert.deepEqual(source,original);
  for(const key of ['deviceIO','presetFileWritten','deviceImportTested','runtimeModeAtStoreProven',
    'fullRangeEncodingProven','generatorWriteSupportAdded']) assert.equal(r[key],false);
  assert.equal('syx' in r,false);assert.equal('base64' in r,false);
  assert.ok(Object.values(r.checks).every(v=>v===true));
  return r;
}

test('Min-only retains every measured Max raw; Max-only retains measured Min raw',()=>{
  sources.forEach((source,i)=>{
    const min=check(source,{min:'2.50'}),max=check(source,{max:'5.00'});
    assert.deepEqual(min.afterRaw,{min:16384,max:fixtures[i].max});
    assert.deepEqual(max.afterRaw,{min:fixtures[i].min,max:32767});
    assert.ok(min.bodyChanges.every(d=>[1586,1587].includes(d.offset)));
    assert.ok(max.bodyChanges.every(d=>[1588,1589].includes(d.offset)));
  });
});
test('two explicit fields change only their intended bytes, including a shared low byte',()=>{
  sources.forEach((source,i)=>{
    const r=check(source,{min:'2.50',max:'7.50'});
    assert.deepEqual(r.afterRaw,{min:16384,max:49151});
    // 0x0000 -> 0x4000 retains the low byte; measured 0x3ff7 -> 0x4000 does not.
    assert.deepEqual(r.bodyChanges.map(d=>d.offset),i===0?[1587,1588,1589]:[1586,1587,1588,1589]);
  });
});
test('an exact no-op keeps the original entire SYX, not a recompressed surrogate',()=>{
  const r=check(base,{min:'0.00',max:'10.00'});
  assert.equal(r.candidateSha256,r.inputSha256);
  assert.equal(r.syxChangedByteCount,0);assert.deepEqual(r.bodyChanges,[]);
  assert.deepEqual(r.rawHeaderChanges,[]);
});
test('6.47 blocks both single and batched changes atomically on every fixture',()=>{
  for(const source of sources) for(const values of [{min:'6.47'},{max:'6.47'},{min:'2.50',max:'6.47'}]) {
    const original=Buffer.from(source);
    assert.throws(()=>compareCandidate(source,request(values)),/runtime MODE1/);
    assert.deepEqual(source,original);
  }
});
test('implicit display values, wrong policy and arbitrary targets cannot enter the candidate',()=>{
  for(const r of [{min:'2.50'},request({min:2.5}),request({min:'2.5'}),
    {...request({min:'2.50'}),channel:1},{...request({max:'7.50'}),raw:49151}])
    assert.throws(()=>compareCandidate(base,r));
  for(const wrong of [Buffer.alloc(0),base.subarray(0,-1),synthetic(b=>b.writeUInt16LE(0,1584)),
    synthetic(b=>b.writeUInt16LE(1,1618)),synthetic(b=>b.writeUInt16LE(95,1600))])
    assert.throws(()=>compareCandidate(wrong,request({min:'2.50'})),/Unrecognized source/);
});
test('verifier rejects wrong requested raw and every other modifier field plus distant body changes',()=>{
  for(const raw of [16375,16383,16385,65535])
    assert.throws(()=>verifyMemoryDiff(base,synthetic(b=>b.writeUInt16LE(raw,1586)),request({min:'2.50'})),/body change/);
  const offsets=[...Array.from({length:25},(_,i)=>1584+2*i).filter(o=>o!==1586),
    0,1538+96+46,4609,14221];
  for(const offset of offsets) {
    const altered=synthetic(b=>{b.writeUInt16LE(16384,1586);b[offset]^=1;});
    assert.throws(()=>verifyMemoryDiff(base,altered,request({min:'2.50'})),`offset ${offset}`);
  }
});
test('verifier rejects rename, corrupted frame and truncation even with correct Min',()=>{
  const rename=synthetic(b=>b.writeUInt16LE(16384,1586),h=>{h[8]^=1;});
  assert.throws(()=>verifyMemoryDiff(base,rename,request({min:'2.50'})),/header/);
  const valid=synthetic(b=>b.writeUInt16LE(16384,1586));
  assert.equal(verifyMemoryDiff(base,valid,request({min:'2.50'})).afterRaw.min,16384);
  const corrupt=Buffer.from(valid);corrupt[100]^=1;
  assert.throws(()=>verifyMemoryDiff(base,corrupt,request({min:'2.50'})),/checksum/);
  assert.throws(()=>verifyMemoryDiff(base,valid.subarray(0,-1),request({min:'2.50'})),/24680/);
});
test('CLI replays the saved audit and has no preset output argument or files',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-minmax-syxdiff-'));
  try {
    const script=new URL('./modifier-minmax-syxdiff.mjs',import.meta.url).pathname;
    const run=spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    assert.equal(JSON.parse(run.stdout).cases,35);
    const refused=spawnSync(process.execPath,[script,'output.syx'],{cwd:dir,encoding:'utf8'});
    assert.equal(refused.status,2);assert.deepEqual(fs.readdirSync(dir),[]);
    sources.forEach((source,i)=>assert.deepEqual(fs.readFileSync(new URL(fixtures[i].file,fixtureRoot)),source));
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
