// Exact 2026-10-08 user firmware-13 device export; no normalization.
// Confirms this one inserted Chorus specimen, not all possible insertions/audio.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const generated=read('examples/FM3_NEWLOOK_INSERT_TEST.syx'),exported=read('examples/FM3_NEWLOOK_INSERT_TEST_export.syx');
assert.equal(sha(generated),'3b12cf473112e102cfa5329b5d4a9dde7c46da00b5c558198b51e11bba13c0ec');
assert.equal(sha(exported),'c258a4b6952687acc693a400b2a2d0310db6301d2daae01b363077034d28c381');
const spec=JSON.parse(read('examples/FM3_NEWLOOK_INSERT_TEST.spec.json'));
const replay=generatePreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec);
assert.deepEqual(replay.syx,generated,'Current writer reproduces the submitted SYX exactly');
const a=inspectStructure(generated),b=inspectStructure(exported),before=Buffer.from(a.raw.body),after=Buffer.from(b.raw.body);
assert.equal(before.length,13106);assert.deepEqual(after,before,'All body bytes match exactly');
assert.equal(after[0],1);assert.equal(b.decoded.preset_name,'FM3 NEWLOOK INSERT TEST');
assert.deepEqual(b.parsed.headerPayload,a.parsed.headerPayload);assert.deepEqual(b.decoded.grid,a.decoded.grid);
const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch),headerChanges=[];
for(let i=0;i<76;i++)if(rawA[i]!==rawB[i]){assert.ok(i===4||i===5,'Only raw-header CRC differs');headerChanges.push({offset:i,before:rawA[i],after:rawB[i],field:'CRC'});}
assert.equal(a.raw.compSize,4337);assert.equal(b.raw.compSize,4337);
assert.ok(rawA.subarray(76+a.raw.compSize).every(v=>v===0));assert.ok(rawB.subarray(76+b.raw.compSize).every(v=>v===0));
const blocks={};
for(const [family,eid,header,words,channels] of [
 ['amp',58,4610,144,4],['cab',62,5808,106,4],['chorus',78,6702,32,4],['delay',70,7004,89,4],
 ['return',186,7762,6,1],['send',182,7820,2,1],['drive',118,7870,44,4],['input',37,8268,10,4],['output',42,8394,26,4],['reverb',66,8648,71,4]
]){
 assert.equal(after.readUInt16LE(header),eid);assert.equal(after.readUInt16LE(header+42),words);assert.equal(after.readUInt16LE(header+44),channels);
 const bytes=46+2*words*channels;assert.deepEqual(after.subarray(header,header+bytes),before.subarray(header,header+bytes));
 blocks[family]={eid,header,recordBytes:bytes,matchedParameterWords:words*channels,channels,sceneChannels:Array.from({length:8},(_,s)=>'ABCD'[after.readUInt16LE(header+10+s*2)]),sceneBypass:Array.from({length:8},(_,s)=>after.readUInt16LE(header+26+s*2)===1)};
}
assert.equal(after.readUInt16LE(6722),1,'Chorus Scene6 B');assert.ok(blocks.chorus.sceneBypass.every(Boolean));
assert.deepEqual(b.decoded.grid.find(g=>g.effect_id===78),{effect_id:78,row:2,col:2,route_flag:4,name:'Chorus 1',from_rows:[2]});
assert.equal(after.readUInt16LE(4946),50461,'Amp B -3 dB');assert.equal(after.readUInt16LE(5234),47184,'Amp C -8 dB');
const report={date:'2026-10-08',generatedFile:'examples/FM3_NEWLOOK_INSERT_TEST.syx',hardwareExportFile:'examples/FM3_NEWLOOK_INSERT_TEST_export.syx',generatedSha256:sha(generated),hardwareExportSha256:sha(exported),fullFilesIdentical:generated.equals(exported),bodyBytes:after.length,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:after[0]+1,headerChanges,dumpHeaderChanges:[],blocks,signalRows:replay.report.signalRows,scenes:replay.report.scenes,checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,allRequestedAndUnrequestedBodyBytesPreserved:true,chorusInsertedAtRow3Column3:true,chorusScene6BAndAllScenesBypassed:true,existingBlockParametersAndLevelsPreserved:true,sendReturnRecordsPreserved:true,routingPreserved:true,scenesAndBypassPreserved:true,presetNamePreserved:true,selectedScenePreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsValid:true,zeroPadding:true},encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:rawA.subarray(76,76+a.raw.compSize).equals(rawB.subarray(76,76+b.raw.compSize)),note:'Compressed representation and CRC differ; the entire decompressed body is exact. No fields normalized or omitted.'},hardware:'Import/export confirmed for this exact automatic Chorus insertion on the NewLook base. Other inserted families/combinations retain separate offline evidence.',audio:'No new listening assessment supplied; Chorus remained bypassed',cpu:'Not supplied for this generated preset',next:'Continue unified composer using the preferred two-row NewLook base; no repeat of this roundtrip or model collection. Choose further hardware checks only for concrete new sound requirements.'};
fs.writeFileSync(new URL('../../../docs/FM3_NEWLOOK_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:report.bodyBytes,changedBodyBytes:0,headerChanges,chorus:blocks.chorus,hardware:report.hardware},null,2));
