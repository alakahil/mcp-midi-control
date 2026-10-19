// Regression against the user's 2026-10-08 firmware-13 device re-export.
// File/device roundtrip evidence only; no audio/level/CPU assessment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
import {layout} from './fm3-jb-composer.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const generated=read('examples/JB_UNIFIED_RHYTHM_SOLO_TEST.syx');
const exported=read('examples/JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx');
assert.equal(sha(generated),'19953730a62fb5a5c59f7069d99320030457e9ea4f200d5800e70eb457b2d6a3');
assert.equal(sha(exported),'0838937628b863e253c64c170ab96ae2bde6d3c0f9d4d3083382e4967ce5fc68');
const spec=JSON.parse(read('examples/JB_UNIFIED_RHYTHM_SOLO_TEST.spec.json'));
const replay=generatePreset(read('examples/JB_YDOM_RHYTHM.syx'),spec);
assert.deepEqual(replay.syx,generated,'Current generator must reproduce the submitted test');
const a=inspectStructure(generated),b=inspectStructure(exported);
const bodyA=Buffer.from(a.raw.body),bodyB=Buffer.from(b.raw.body);
assert.equal(bodyA.length,14222);assert.deepEqual(bodyB,bodyA,'Entire device-export body must match without normalization');
assert.deepEqual(b.parsed.headerPayload,a.parsed.headerPayload);
assert.equal(a.decoded.preset_name,'JB UNIFIED R-S TEST');
assert.equal(b.decoded.preset_name,a.decoded.preset_name);
assert.equal(bodyA[0],1);assert.equal(bodyB[0],1);
const headerChanges=[];
for(let i=0;i<76;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){
  assert.ok(i===4||i===5,'Only CRC may change in raw header');
  headerChanges.push({offset:i,before:a.raw.rawPatch[i],after:b.raw.rawPatch[i],field:'CRC'});
}
const blocks=Object.fromEntries(Object.entries(layout).map(([family,l])=>{
  const count=l.words*4;
  const before=Array.from({length:count},(_,i)=>bodyA.readUInt16LE(l.start+i*2));
  const after=Array.from({length:count},(_,i)=>bodyB.readUInt16LE(l.start+i*2));
  assert.deepEqual(after,before,family+' all A-D words');
  return [family,{matchedWords:count,wordsPerChannel:l.words,allFourChannelsPreserved:true,sceneChannels:Array.from({length:8},(_,i)=>'ABCD'[bodyB.readUInt16LE(l.header+10+2*i)]),sceneBypass:Array.from({length:8},(_,i)=>bodyB.readUInt16LE(l.header+26+2*i)===1)}];
}));
const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch);
const report={date:'2026-10-08',generatedSha256:sha(generated),hardwareExportSha256:sha(exported),generatedFile:'examples/JB_UNIFIED_RHYTHM_SOLO_TEST.syx',hardwareExportFile:'examples/JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx',fullFilesIdentical:generated.equals(exported),bodyBytes:bodyA.length,changedBodyOffsets:[],selectedSceneBefore:bodyA[0]+1,selectedSceneAfter:bodyB[0]+1,presetNameBefore:a.decoded.preset_name,presetNameAfter:b.decoded.preset_name,headerChanges,dumpHeaderChanges:[],blocks,scenes:replay.report.scenes.filter(s=>[2,6].includes(s.scene)),checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,allRequestedAndUnrequestedBodyBytesPreserved:true,scenesAndBypassPreserved:true,routingPreserved:true,presetNamePreserved:true,selectedScenePreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true},encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:rawA.subarray(76,76+a.raw.compSize).equals(rawB.subarray(76,76+b.raw.compSize)),paddingBeforeAllZero:rawA.subarray(76+a.raw.compSize).every(v=>v===0),paddingAfterAllZero:rawB.subarray(76+b.raw.compSize).every(v=>v===0),note:'Compressed representation differs; CRC changes are recorded. No body byte was normalized or ignored.'},hardware:'Import/export confirmed for this exact composed specimen only; general combinations remain separately assessed',audio:'User listening assessment not supplied',levels:'Perceived rhythm/solo balance not assessed',cpu:'Not assessed'};
fs.writeFileSync(new URL('../../../docs/FM3_JB_COMPOSER_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:report.bodyBytes,changedBodyBytes:0,blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,v.matchedWords])),headerChanges,hardware:report.hardware},null,2));
