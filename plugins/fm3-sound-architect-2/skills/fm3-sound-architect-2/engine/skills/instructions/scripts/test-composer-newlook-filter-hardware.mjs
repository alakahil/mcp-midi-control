// Firmware-13 device roundtrip for the six-family NewLook/Filter composition.
// Exact full-body comparison; no ignored fields or audio/CPU inference.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const generated=read('examples/FM3_NEWLOOK_FILTER_TEST.syx'),exported=read('examples/FM3_NEWLOOK_FILTER_TEST_export.syx');
assert.equal(sha(generated),'63d7a9a4381bbe7bcc40179f0e79be0c7e5a6c4ebe66f475380bd1e24f0264cf');
assert.equal(sha(exported),'b3d406ce0bf847dadd20ba4b36553e8a54cc4939fe4808ee7e389e40d63ae2a3');
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_NEWLOOK_FILTER_TEST.spec.json'));
const replay=generatePreset(base,spec);assert.deepEqual(replay.syx,generated,'Generator replay must match submitted file');
const a=inspectStructure(generated),b=inspectStructure(exported),before=Buffer.from(a.raw.body),after=Buffer.from(b.raw.body);
assert.equal(before.length,13146);assert.deepEqual(after,before,'Entire device body without normalization');
assert.deepEqual(a.parsed.headerPayload,b.parsed.headerPayload);assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.equal(b.decoded.preset_name,'FM3 NEWLOOK FILTER TEST');assert.equal(after[0],1);
const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch),headerChanges=[];
for(let i=0;i<76;i++)if(rawA[i]!==rawB[i]){assert.ok(i===4||i===5,'Only CRC differs in raw header');headerChanges.push({offset:i,before:rawA[i],after:rawB[i],field:'CRC'});}
for(const r of [a,b]){const raw=Buffer.from(r.raw.rawPatch);assert.equal(raw.readUInt16LE(72),r.raw.body.length);assert.equal(raw.readUInt16LE(74),r.raw.compSize);}
assert.equal(a.raw.compSize,4373);assert.equal(b.raw.compSize,4373);
assert.ok(rawA.subarray(76+a.raw.compSize).every(v=>v===0));assert.ok(rawB.subarray(76+b.raw.compSize).every(v=>v===0));
const restored=Buffer.concat([after.subarray(0,7568),after.subarray(7910)]);restored.writeUInt16LE(1028,392);
assert.deepEqual(restored,Buffer.from(inspectStructure(base).raw.body),'All original settings preserved on device: remove only Filter and restore its shunt');
const blocks={};
for(const [family,eid,header,words,channels] of [
 ['amp',58,4610,144,4],['cab',62,5808,106,4],['delay',70,6702,89,4],['return',186,7460,6,1],['send',182,7518,2,1],
 ['filter',114,7568,37,4],['drive',118,7910,44,4],['input',37,8308,10,4],['output',42,8434,26,4],['reverb',66,8688,71,4]
]){
 assert.equal(after.readUInt16LE(header),eid);assert.equal(after.readUInt16LE(header+42),words);assert.equal(after.readUInt16LE(header+44),channels);
 const recordBytes=46+2*words*channels;assert.deepEqual(after.subarray(header,header+recordBytes),before.subarray(header,header+recordBytes));
 blocks[family]={eid,header,recordBytes,matchedParameterWords:words*channels,channels,sceneChannels:Array.from({length:8},(_,s)=>'ABCD'[after.readUInt16LE(header+10+s*2)]),sceneBypass:Array.from({length:8},(_,s)=>after.readUInt16LE(header+26+s*2)===1)};
}
assert.deepEqual(blocks.filter.sceneChannels,['A','A','A','A','A','C','A','A']);assert.ok(blocks.filter.sceneBypass.every(Boolean));
const library=JSON.parse(read('references/filter-library.json'));
for(const [channel,name] of [['A','High-Pass'],['B','Low-Pass'],['C','Peaking'],['D','Tilt EQ']]){
 const m=library.models.find(m=>m.name===name),start=7614+'ABCD'.indexOf(channel)*74;
 assert.deepEqual(Array.from({length:37},(_,i)=>after.readUInt16LE(start+2*i)),m.words,'All requested Filter channel words '+channel);
}
assert.deepEqual(b.decoded.grid.find(g=>g.effect_id===114),{effect_id:114,row:1,col:8,route_flag:2,name:'Filter 1',from_rows:[1]});
const report={date:'2026-10-08',generatedFile:'examples/FM3_NEWLOOK_FILTER_TEST.syx',hardwareExportFile:'examples/FM3_NEWLOOK_FILTER_TEST_export.syx',generatedSha256:sha(generated),hardwareExportSha256:sha(exported),fullFilesIdentical:generated.equals(exported),bodyBytes:after.length,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:after[0]+1,headerChanges,dumpHeaderChanges:[],blocks,signalRows:replay.report.signalRows,scenes:replay.report.scenes,checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,all148FilterParameterWordsPreserved:true,filterAHighPassBLowPassCPeakingDTiltEqVerified:true,filterInsertedAtRow2Column9:true,filterScene2AScene6CAndAllScenesBypassed:true,allOriginalNewLookBodyBytesReconstructedExactly:true,existingBlockSettingsAndLevelsPreserved:true,sendReturnRecordsPreserved:true,routingPreserved:true,scenesAndBypassPreserved:true,presetNamePreserved:true,selectedScenePreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsValid:true,zeroPadding:true},encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:rawA.subarray(76,76+a.raw.compSize).equals(rawB.subarray(76,76+b.raw.compSize)),note:'Compressed representation and CRC differ; every decompressed body byte is exact. No normalization.'},hardware:'Import/export confirmed for this six-family composition with automatic Filter insertion on NewLook. Other insertions/combinations are not inferred to be device-tested.',audio:'No listening assessment supplied; Filter remained bypassed in all scenes',cpu:'Not supplied for this generated preset',next:'NewLook/Filter composer test complete; do not repeat this import/export. Continue on clean NewLook with controls needed for a concrete sound. Filter Frequency/Q/Gain/Level/Order remain unmeasured.'};
fs.writeFileSync(new URL('../../../docs/FM3_NEWLOOK_FILTER_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:report.bodyBytes,changedBodyBytes:0,filterWords:blocks.filter.matchedParameterWords,sceneChannels:blocks.filter.sceneChannels,headerChanges,hardware:report.hardware},null,2));
