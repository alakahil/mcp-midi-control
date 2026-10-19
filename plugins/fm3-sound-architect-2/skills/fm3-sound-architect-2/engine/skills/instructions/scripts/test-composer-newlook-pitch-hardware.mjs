// Firmware-13 device roundtrip for the six-family NewLook/Pitch composition.
// Exact full-body comparison; no ignored fields or audio/CPU inference.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const generated=read('examples/FM3_NEWLOOK_PITCH_TEST.syx'),exported=read('examples/FM3_NEWLOOK_PITCH_TEST_export.syx');
assert.equal(sha(generated),'7cd158293247cc80083f316eb4916b31d37563f150d92a2dc257370bf4b0c3a2');
assert.equal(sha(exported),'d8ab1f7915e6d06990692b78b8a29b76035ed9216f528891ae88b864b653e437');
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_NEWLOOK_PITCH_TEST.spec.json'));
const replay=generatePreset(base,spec);assert.deepEqual(replay.syx,generated,'Generator replay must match submitted file');
const a=inspectStructure(generated),b=inspectStructure(exported),before=Buffer.from(a.raw.body),after=Buffer.from(b.raw.body);
assert.equal(before.length,13762);assert.deepEqual(after,before,'Entire device body without normalization');
assert.deepEqual(a.parsed.headerPayload,b.parsed.headerPayload);assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.equal(b.decoded.preset_name,'FM3 NEWLOOK PITCH TEST');assert.equal(after[0],1);
const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch),headerChanges=[];
for(let i=0;i<76;i++)if(rawA[i]!==rawB[i]){assert.ok(i===4||i===5,'Only CRC differs in raw header');headerChanges.push({offset:i,before:rawA[i],after:rawB[i],field:'CRC'});}
assert.equal(a.raw.compSize,4525);assert.equal(b.raw.compSize,4525);
assert.ok(rawA.subarray(76+a.raw.compSize).every(v=>v===0));assert.ok(rawB.subarray(76+b.raw.compSize).every(v=>v===0));
const restored=Buffer.concat([after.subarray(0,8346),after.subarray(9304)]);restored.writeUInt16LE(1031,284);
assert.deepEqual(restored,Buffer.from(inspectStructure(base).raw.body),'All original settings preserved on device: remove only Pitch and restore its shunt');
const blocks={};
for(const [family,eid,header,words,channels] of [
 ['amp',58,4610,144,4],['cab',62,5808,106,4],['delay',70,6702,89,4],['return',186,7460,6,1],['send',182,7518,2,1],
 ['drive',118,7568,44,4],['input',37,7966,10,4],['output',42,8092,26,4],['pitch',110,8346,114,4],['reverb',66,9304,71,4]
]){
 assert.equal(after.readUInt16LE(header),eid);assert.equal(after.readUInt16LE(header+42),words);assert.equal(after.readUInt16LE(header+44),channels);
 const recordBytes=46+2*words*channels;assert.deepEqual(after.subarray(header,header+recordBytes),before.subarray(header,header+recordBytes));
 blocks[family]={eid,header,recordBytes,matchedParameterWords:words*channels,channels,sceneChannels:Array.from({length:8},(_,s)=>'ABCD'[after.readUInt16LE(header+10+s*2)]),sceneBypass:Array.from({length:8},(_,s)=>after.readUInt16LE(header+26+s*2)===1)};
}
assert.deepEqual(blocks.pitch.sceneChannels,['A','B','A','A','A','C','A','A']);assert.ok(blocks.pitch.sceneBypass.every(Boolean));
const library=JSON.parse(read('references/pitch-library.json'));
for(const [channel,name] of [['B','Virtual Capo'],['C','Dual Detune']]){
 const m=library.models.find(m=>m.name===name),start=8392+'ABCD'.indexOf(channel)*228;
 assert.deepEqual(Array.from({length:114},(_,i)=>after.readUInt16LE(start+2*i)),m.words,'All requested Pitch channel words '+channel);
}
assert.deepEqual(b.decoded.grid.find(g=>g.effect_id===110),{effect_id:110,row:2,col:1,route_flag:4,name:'Pitch 1',from_rows:[2]});
const report={date:'2026-10-08',generatedFile:'examples/FM3_NEWLOOK_PITCH_TEST.syx',hardwareExportFile:'examples/FM3_NEWLOOK_PITCH_TEST_export.syx',generatedSha256:sha(generated),hardwareExportSha256:sha(exported),fullFilesIdentical:generated.equals(exported),bodyBytes:after.length,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:after[0]+1,headerChanges,dumpHeaderChanges:[],blocks,signalRows:replay.report.signalRows,scenes:replay.report.scenes,checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,all456PitchParameterWordsPreserved:true,pitchBVirtualCapoAndCDualDetuneVerified:true,pitchInsertedAtRow3Column2:true,pitchScene2BScene6CAndAllScenesBypassed:true,allOriginalNewLookBodyBytesReconstructedExactly:true,existingBlockSettingsAndLevelsPreserved:true,sendReturnRecordsPreserved:true,routingPreserved:true,scenesAndBypassPreserved:true,presetNamePreserved:true,selectedScenePreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsValid:true,zeroPadding:true},encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:rawA.subarray(76,76+a.raw.compSize).equals(rawB.subarray(76,76+b.raw.compSize)),note:'Compressed representation and CRC differ; every decompressed body byte is exact. No normalization.'},hardware:'Import/export confirmed for this six-family composition with automatic Pitch insertion on NewLook. Other insertions/combinations are not inferred to be device-tested.',audio:'No listening assessment supplied; Pitch remained bypassed in all scenes',cpu:'Not supplied for this generated preset',next:'Requested NewLook/Pitch composer test complete. No repeat export or return to superseded FM3_COMPOSER_PITCH_TEST. Continue with concrete sound requirements on clean NewLook base.'};
fs.writeFileSync(new URL('../../../docs/FM3_NEWLOOK_PITCH_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:report.bodyBytes,changedBodyBytes:0,pitchWords:blocks.pitch.matchedParameterWords,sceneChannels:blocks.pitch.sceneChannels,headerChanges,hardware:report.hardware},null,2));
