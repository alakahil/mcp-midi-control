// Exact first PEQ composition device roundtrip; no body normalisation or I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset} from './fm3-generate.mjs';
import {peqRoundtrip,verifyPeqRoundtrip,matchPeqDeviceBody} from './fm3-peq-controls.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const proof=verifyPeqRoundtrip(),a=inspectStructure(proof.generated),b=inspectStructure(proof.exported),body=proof.body;
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_PEQ_BAND3_TEST.spec.json'));
const replay=generatePreset(base,spec);assert.deepEqual(replay.syx,proof.generated);
assert.equal(replay.report.knownDeviceBody.submittedFileConfirmed,true);
assert.ok(replay.txt.includes('Selle täpse SYX-faili import ja tagasieksport on kinnitatud'));
assert.equal(b.decoded.preset_name,'FM3 PEQ BAND3 TEST');assert.equal(body[0],1);
assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.deepEqual(replay.report.scenes.map(s=>s.blocks.peq.bypass),[true,false,true,true,true,true,true,true]);
assert.ok(replay.report.scenes.every(s=>s.blocks.peq.channel==='A'));
assert.deepEqual([body.readUInt16LE(8768),body.readUInt16LE(8738),body.readUInt16LE(8748),body.readUInt16LE(8758),body.readUInt16LE(8774)],[0,32767,37555,37682,52427]);
const restored=Buffer.concat([body.subarray(0,8688),body.subarray(8998)]);restored.writeUInt16LE(1029,408);
assert.deepEqual(restored,Buffer.from(inspectStructure(read('examples/JB_EIGHT_SCENES_V3.syx')).raw.body));
const headerChanges=[];for(let i=0;i<76;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){assert.ok([4,5].includes(i));headerChanges.push({offset:i,field:'CRC',before:a.raw.rawPatch[i],after:b.raw.rawPatch[i]});}
// A renamed encoding shares body evidence, but is not the actually submitted file.
const renamed=generatePreset(base,{...spec,name:'PEQ RENAMED'});assert.ok(renamed.report.knownDeviceBody);assert.equal(renamed.report.knownDeviceBody.submittedFileConfirmed,false);
const unseen=structuredClone(spec);unseen.peqChannels[0].band3.q=2;assert.equal(generatePreset(base,unseen).report.knownDeviceBody,null);
const changed=Buffer.from(body);changed[4946]^=1;assert.equal(matchPeqDeviceBody(changed,proof.generated),null);
const report={date:'2026-10-09',generatedFile:peqRoundtrip.generatedFile,hardwareExportFile:peqRoundtrip.exportFile,generatedSha256:peqRoundtrip.generatedSha256,hardwareExportSha256:peqRoundtrip.exportSha256,hardwareExportLibraryFileId:'libfile_e85cad3b77b88191a98dddeea8805254',fullFilesIdentical:proof.generated.equals(proof.exported),bodyBytes:13456,bodySha256:sha(body),changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:2,headerChanges,
 peq:{effectId:54,row:2,column:10,recordOffset:8688,recordBytes:310,matchedParameterWords:132,sceneChannels:Array(8).fill('A'),activeScenes:[2],band3:{type:'Peaking',typeRaw:0,frequencyHz:1000,frequencyRaw:32767,q:1.4,qRaw:37555,gainDb:3,gainRaw:37682},levelDb:0,levelRaw:52427},
 checks:{generatorReplayByteIdentical:true,frameChecksums:true,presetCrc:true,footer:true,entireBodyIdenticalWithoutNormalization:true,all132PeqParameterWordsPreserved:true,allOriginal13146V3BytesReconstructed:true,existingBlocksLevelsAndScenesPreserved:true,sendReturnAndTwoRowsPreserved:true,presetNameAndSelectedScenePreserved:true,chunkPrefixesPreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsAndZeroPadding:true,renamedFileNotFalselySubmittedConfirmed:true,changedCombinationNotFalselyHardwareConfirmed:true},
 encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:Buffer.from(a.raw.rawPatch).subarray(76,76+a.raw.compSize).equals(Buffer.from(b.raw.rawPatch).subarray(76,76+b.raw.compSize))},
 hardware:'Exact supplied active PEQ composition import/export confirmed. Do not repeat this export or any completed GET collection.',audio:'No listening feedback supplied',cpu:'Not supplied for this specimen',next:'Ask only for current CPU and listening feedback, then continue the agreed EQ work. Do not infer other bands/types/channels or general ranges.'};
fs.writeFileSync(new URL('../../../docs/FM3_PEQ_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [suffix,data] of [['.txt',replay.txt],['.validation.json',JSON.stringify(replay.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_PEQ_BAND3_TEST'+suffix,import.meta.url),data);
console.log(JSON.stringify({passed:true,bodyBytes:13456,changedBodyBytes:0,headerChanges,exactSubmittedFileConfirmed:true,audio:report.audio,cpu:report.cpu}));
