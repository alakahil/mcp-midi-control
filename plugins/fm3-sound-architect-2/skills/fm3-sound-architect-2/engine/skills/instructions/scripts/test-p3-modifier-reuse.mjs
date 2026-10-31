// Offline regression checks plus replay of the separately retained P3 device export.
// Synthetic exports below are never counted as hardware evidence.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {context,candidate,reuseFixtureRecord,words,writeCandidate,verifyCandidate,compareExport,decode,sha} from './fm3-p3-modifier-reuse.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords} from './fm3-layout.mjs';
const c=context(),r=candidate(),at=n=>1584+96*n;
// These expectations are literal FW13 words, independent of the replacement function.
assert.deepEqual(words(r.body,1),[51,0,65534,0,32767,65534,32767,66,58,47,0,0,0,32767,32767,66,0,0,0,0,0,65534,65534,0,0]);
const removed=words(c.before,2);for(const w of [0,8,9])removed[w]=0;
assert.deepEqual(words(r.body,2),removed);
assert.equal(removed[17],4,'removed record retains CHAN D');
assert.equal(removed[1],65534,'removed record retains inverted minimum');
assert.equal(words(c.before,1)[1],16384);assert.equal(words(c.before,1)[2],49151);
assert.equal(words(c.before,1)[4],16384);assert.equal(words(c.before,1)[7],3277);
assert.deepEqual(r.report.activeModifiers.map(m=>[m.record,m.effectId,m.pid]),[[0,94,5],[1,58,47],[3,58,41],[4,58,80]]);
const allowed=new Set([...Array.from({length:42},(_,i)=>at(1)+i),...[0,8,9].flatMap(i=>[at(2)+2*i,at(2)+2*i+1])]);
for(let i=0;i<r.body.length;i++)if(!allowed.has(i))assert.equal(r.body[i],c.before[i],'preservation byte '+i);
assert.equal(r.report.changedBytes.length,13);
assert.equal(sha(r.syx),'351f0c6ec26cc488af3c25c228417eccbf24f84db994a3f714741220625dd5bd','fixture drift');
let negatives=0;
const rejects=f=>{assert.throws(f);negatives++;};
// Drift in source, target, both source fields, operation, header, reserved tail,
// another active record, hole and unrelated scene/system data must all fail.
for(const pos of [0,at(1)-46,at(1),at(1)+2,at(1)+16,at(1)+18,at(1)+34,at(1)+40,at(1)+42,at(1)+46,at(1)+48,at(2),at(3)+18,r.body.length-1]){
 const b=Buffer.from(c.removed);b[pos]^=1;rejects(()=>reuseFixtureRecord(b,c.replacement));
}
for(const w of [0,1,2,8,9,17,20,21,23,24]){
 const replacement=[...c.replacement];replacement[w]^=1;rejects(()=>reuseFixtureRecord(c.removed,replacement));
}
rejects(()=>reuseFixtureRecord(c.before,c.replacement)); // occupied slot
rejects(()=>reuseFixtureRecord(r.body,c.replacement)); // no silent repeated reuse
rejects(()=>reuseFixtureRecord(c.removed.subarray(0,100),c.replacement));
assert.deepEqual(c.removed,context().removed,'caller buffer remains unchanged');
const duplicate=Buffer.from(c.removed);c.replacement.forEach((w,i)=>duplicate.writeUInt16LE(w,at(3)+2*i));
rejects(()=>reuseFixtureRecord(duplicate,c.replacement));
const encode=body=>reencodeDumpFromRawPatch(r.syx,reencodeRawPatch(decode(r.syx).p.raw.rawPatch,body));
assert.equal(compareExport(r.syx).bodyByteIdentical,true,'synthetic identical export');
for(const pos of [0,at(1),at(1)+2,at(1)+8,at(1)+14,at(1)+18,at(1)+40,at(1)+48,at(2)+16,at(2)+18,at(3),r.body.length-1]){
 const b=Buffer.from(r.body);b[pos]^=1;rejects(()=>compareExport(encode(b)));
}
// Match each whole block by unique effect ID; only harmless record order is normalized.
const scan=scanRecords(r.body),rs=scan.records;
const swapped=[rs[1],rs[0],...rs.slice(2)];
const reordered=Buffer.concat([r.body.subarray(0,rs[0].header),...swapped.map(x=>r.body.subarray(x.header,x.header+x.size)),r.body.subarray(scan.tail)]);
assert.equal(compareExport(encode(reordered)).reorderedBlocks.length,2);
const blockEdit=Buffer.from(r.body);blockEdit[rs[0].start]^=1;rejects(()=>compareExport(encode(blockEdit)));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-p3-test-')),stem=path.join(tmp,'P3');
try{
 writeCandidate(stem);assert.equal(verifyCandidate(stem).passed,true);
 rejects(()=>writeCandidate(stem));
 for(const ext of ['.syx','.txt','.spec.json','.validation.json']){
  const p=stem+ext,original=fs.readFileSync(p);fs.appendFileSync(p,' ');rejects(()=>verifyCandidate(stem));fs.writeFileSync(p,original);
 }
 // Hash-consistent tampering must fail deterministic replay as well.
 const original=fs.readFileSync(stem+'.validation.json'),report=JSON.parse(original),changed=Buffer.concat([fs.readFileSync(stem+'.txt'),Buffer.from('forged')]);
 fs.writeFileSync(stem+'.txt',changed);report.artifacts['.txt']={sha256:sha(changed),bytes:changed.length};
 fs.writeFileSync(stem+'.validation.json',JSON.stringify(report,null,2)+'\n');rejects(()=>verifyCandidate(stem));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
// The original pre-test quartet is retained unchanged; a separate receipt holds
// the later grouped user confirmation and the actual stored device export.
const dir=fileURLToPath(new URL('../references/p3-modifier-reuse-20261030/',import.meta.url));
const retainedStem=path.join(dir,'FM3_P3_REMOVE_REUSE');
verifyCandidate(retainedStem);
const hardware=fs.readFileSync(retainedStem+'_export.syx');
assert.equal(sha(hardware),'33a379410482de1f0e722efc8a2c54540c067ec845f32451d4cfe9394578a2d8','actual export hash');
const comparison=compareExport(hardware),hb=decode(hardware).body;
assert.equal(comparison.bodyByteIdentical,false);
assert.deepEqual(comparison.reorderedBlocks,[{effectId:94,generatedIndex:9,exportIndex:10},{effectId:102,generatedIndex:10,exportIndex:9}]);
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'FM3_P3_seadmekatse_kviitung_2026-10-30.json')));
assert.equal(receipt.status,'completed_passed');assert.equal(receipt.passed,true);
assert.equal(receipt.import.sha256,sha(r.syx));assert.equal(receipt.import.bytes,r.syx.length);
assert.equal(receipt.export.sha256,sha(hardware));assert.equal(receipt.export.bytes,hardware.length);
assert.equal(receipt.comparison.bodyBytes,hb.length);assert.equal(hb.length,13216);
for(const [key,value] of Object.entries(comparison))assert.deepEqual(receipt.comparison[key],value,'receipt comparison '+key);
assert.equal(receipt.comparison.all32ModifierRecordsByteIdentical,true);
assert.deepEqual(hb.subarray(1538,4610),r.body.subarray(1538,4610));
assert.deepEqual(receipt.activeModifiers,r.report.activeModifiers);
assert.deepEqual(receipt.removal.words,words(hb,2));assert.deepEqual(receipt.reuse.words,words(hb,1));
assert.equal(receipt.removal.formerTargetPid,42);assert.equal(receipt.removal.noCompaction,true);
for(const key of ['importAndSixSourcesMatch','cutMinMaxChannelMidAttackMatch','scene1CutOffScene2CutOn','storeOtherPresetReturnAndRepeatMatch'])
 assert.equal(receipt.userConfirmation[key],true,'retained user confirmation '+key);
assert.equal(receipt.userConfirmation.finalSelectedScene,1);assert.equal(hb[0],0);
assert.equal(receipt.publication.newP3DeviceEvidenceAuthorized,true);
console.log(JSON.stringify({passed:true,negativeCases:negatives,changedBytes:13,activeRecords:[0,1,3,4],inactiveHole:2,
 replayEngineVersion:'0.3.41',historicalEvidenceVersion:'0.3.38',
 sourceQuartetsVerified:true,finalResearchQuartetVerified:true,syntheticExportComparison:true,
 retainedHardwareExportVerified:true,all32ModifierRecordsPreserved:true,reorderedBlocks:2,deviceIO:false}));
