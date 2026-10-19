// Actual firmware13 Amp/Cab composer roundtrip. No normalised/ignored body bytes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const stem='examples/FM3_AMP_CAB_AD_TEST';
const generated=read(stem+'.syx'),exported=read(stem+'_export.syx');
assert.equal(sha(generated),'e9132d54e04e9806af8506af7eb234ec9be6ec7fad01d6fcb6920446409e6493');
assert.equal(sha(exported),'22b6df6e5c3edf26ba3d9542179fc643ae3f6f9fabdcd3d61a7d4c57dfa33248');
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read(stem+'.spec.json'));
const replay=generatePreset(base,spec);assert.deepEqual(replay.syx,generated);
const a=inspectStructure(generated),b=inspectStructure(exported),clean=Buffer.from(inspectStructure(base).raw.body);
const expected=Buffer.from(a.raw.body),actual=Buffer.from(b.raw.body);
assert.equal(actual.length,12804);assert.deepEqual(actual,expected,'Entire unnormalised body');
assert.equal(sha(actual),'2336d091bf1691faa8c765ca16600b77ed57cb6e9840271823be2ad9074b9b74');
assert.equal(b.decoded.preset_name,spec.name);assert.equal(actual[0],1);
assert.deepEqual(b.parsed.headerPayload,a.parsed.headerPayload);
assert.deepEqual(b.decoded.grid,a.decoded.grid);assert.deepEqual(actual.subarray(260,452),clean.subarray(260,452));
const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch),headerChanges=[];
for(let i=0;i<76;i++)if(rawA[i]!==rawB[i]){
  assert.ok(i===4||i===5,'Only encoding CRC may differ in raw header');
  headerChanges.push({offset:i,before:rawA[i],after:rawB[i],field:'CRC'});
}
for(const d of [a,b]){const raw=Buffer.from(d.raw.rawPatch);assert.equal(raw.readUInt16LE(72),12804);assert.equal(raw.readUInt16LE(74),d.raw.compSize);assert.ok(raw.subarray(76+d.raw.compSize).every(x=>x===0));}
assert.equal(a.raw.compSize,4206);assert.equal(b.raw.compSize,4206);
const blocks={};
for(const [family,eid,header,words,channels] of [
  ['amp',58,4610,144,4],['cab',62,5808,106,4],['delay',70,6702,89,4],['return',186,7460,6,1],['send',182,7518,2,1],
  ['drive',118,7568,44,4],['input',37,7966,10,4],['output',42,8092,26,4],['reverb',66,8346,71,4]
]){
  assert.equal(actual.readUInt16LE(header),eid);assert.equal(actual.readUInt16LE(header+42),words);assert.equal(actual.readUInt16LE(header+44),channels);
  const recordBytes=46+words*channels*2;
  assert.deepEqual(actual.subarray(header,header+recordBytes),expected.subarray(header,header+recordBytes));
  if(!['amp','cab'].includes(family))assert.deepEqual(actual.subarray(header,header+recordBytes),clean.subarray(header,header+recordBytes));
  blocks[family]={eid,header,recordBytes,matchedParameterWords:words*channels,channels,sceneChannels:Array.from({length:8},(_,i)=>'ABCD'[actual.readUInt16LE(header+10+i*2)]),sceneBypass:Array.from({length:8},(_,i)=>actual.readUInt16LE(header+26+i*2)===1)};
  for(const scene of [2,6])for(const rel of [10,26])assert.deepEqual(actual.subarray(header+rel+(scene-1)*2,header+rel+scene*2),clean.subarray(header+rel+(scene-1)*2,header+rel+scene*2));
}
// Restore precisely the declared model channels and Scene1/4 name/channel words.
// The result must equal every one of the original NewLook body bytes.
const restored=Buffer.from(actual);
for(const [start,length] of [[4656,288],[5520,288],[5854,212],[6278,212],[6490,212]])clean.copy(restored,start,start,start+length);
for(const scene of [1,4]){
  const at=4+(scene-1)*32;clean.copy(restored,at,at,at+31);
  for(const h of [4610,5808])for(const rel of [10,26]){const at=h+rel+(scene-1)*2;clean.copy(restored,at,at,at+2);}
}
assert.deepEqual(restored,clean);
assert.deepEqual(actual.subarray(4944,5520),clean.subarray(4944,5520),'Amp B/C unchanged');
assert.deepEqual(actual.subarray(6066,6278),clean.subarray(6066,6278),'Cab B unchanged');
for(const scene of [2,6])assert.deepEqual(actual.subarray(4+(scene-1)*32,4+scene*32),clean.subarray(4+(scene-1)*32,4+scene*32));
assert.equal(replay.report.knownDeviceBody.submittedFileConfirmed,true);
assert.ok(replay.txt.includes('import ja tagasieksport on kinnitatud'));
assert.ok(!replay.txt.includes('seadmeimport, heli, tasemed ja CPU: OOTEL'));
// Exact body matching survives a rename, but must not claim the renamed file
// itself was imported. One different model must not inherit the approval.
const renamed=generatePreset(base,{...spec,name:'RENAMED AMP CAB TEST'});
assert.ok(renamed.report.knownDeviceBody);assert.equal(renamed.report.knownDeviceBody.submittedFileConfirmed,false);
const changed=structuredClone(spec);changed.ampChannels[0].model='USA MK IV Rhythm 1';
assert.equal(generatePreset(base,changed).report.knownDeviceBody,null);
const report={date:'2026-10-08',generator:'jb-composer-0.7.1',passed:true,generatedFile:stem+'.syx',hardwareExportFile:stem+'_export.syx',generatedSha256:sha(generated),hardwareExportSha256:sha(exported),bodySha256:sha(actual),fullFilesIdentical:generated.equals(exported),bodyBytes:actual.length,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:actual[0]+1,headerChanges,dumpHeaderChanges:[],blocks,signalRows:replay.report.signalRows,scenes:replay.report.scenes,modelSelections:{amp:spec.ampChannels,cab:spec.cabChannels},checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,all576AmpAnd424CabWordsPreserved:true,ampBandCAndCabBUnchanged:true,scene2And6OriginalContentPreserved:true,declaredChangesRestoredToAll12804OriginalBytes:true,existingOtherBlockRecordsPreserved:true,sendReturnPreserved:true,routingPreserved:true,sceneAssignmentsPreserved:true,presetNamePreserved:true,selectedScenePreserved:true,onlyCrcHeaderDifference:true,encodedLengthsAndZeroPadding:true,exactSubmittedFileRecognized:true,renamedFileNotFalselyImportConfirmed:true,changedModelNotHardwareApproved:true},encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:rawA.subarray(76,76+a.raw.compSize).equals(rawB.subarray(76,76+b.raw.compSize)),note:'Compressed representation and CRC differ; all decompressed body bytes match exactly.'},hardware:'Exact representative NewLook Amp A/D + Cab A/C/D composition import/export confirmed. Other models/destinations/combinations retain offline tests only.',audio:'No listening assessment supplied for the changed channels; Scene2/6 original content preserved',cpu:'Not supplied',next:'This Amp/Cab composer device test is complete; do not repeat import/export or request new GET collection for the same content.'};
fs.writeFileSync(new URL('../../../docs/FM3_AMP_CAB_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [ext,data] of [['.txt',replay.txt],['.validation.json',JSON.stringify(replay.report,null,2)+'\n']])fs.writeFileSync(new URL('../'+stem+ext,import.meta.url),data);
console.log(JSON.stringify({passed:true,bodyBytes:actual.length,changedBodyBytes:0,ampWords:576,cabWords:424,scene2And6Preserved:true,headerChanges,hardware:report.hardware},null,2));
