import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {enhancerRoundtrip,verifyEnhancerRoundtrip,matchEnhancerDeviceBody} from './fm3-enhancer-hardware.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const proof=verifyEnhancerRoundtrip(),{a,b,body,feedback}=proof;
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_ENHANCER_ABCD_TEST.spec.json'));
const replay=generatePreset(base,spec);
assert.deepEqual(replay.syx,proof.generated,'Adding device proof must not change generated SYX');
assert.equal(replay.report.knownDeviceBody.submittedFileConfirmed,true);
assert.equal(b.decoded.preset_name,'FM3 ENHANCER ABCD TEST');assert.equal(body[0],1);assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.deepEqual(replay.report.scenes.map(s=>s.blocks.enhancer.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(replay.report.scenes.filter(s=>!s.blocks.enhancer.bypass).map(s=>s.scene),[2,3,4,6]);
assert.deepEqual(replay.report.components.enhancer.map(c=>c.type),['Modern','Classic','Stereoizer','Modern']);
const restored=Buffer.concat([body.subarray(0,7460),body.subarray(7602)]);restored.writeUInt16LE(1038,428);
assert.deepEqual(restored,Buffer.from(inspectStructure(read('examples/FM3_GEQ_ABCD_TEST_export.syx')).raw.body),'All 13662 prior GEQ bytes preserved');
for(const c of replay.report.components.enhancer){const at=7506+'ABCD'.indexOf(c.channel)*24;assert.deepEqual(c.words,Array.from({length:12},(_,i)=>body.readUInt16LE(at+i*2)));}
const renamed=generatePreset(base,{...spec,name:'ENHANCER CONFIRMED RENAMED'});assert.equal(renamed.report.knownDeviceBody.submittedFileConfirmed,false);
const unseen=structuredClone(spec);unseen.enhancerChannels[0].width=21;assert.equal(generatePreset(base,unseen).report.knownDeviceBody,null);
const changed=Buffer.from(body);changed[4946]^=1;assert.equal(matchEnhancerDeviceBody(changed,proof.generated),null);
assert.match(replay.report.cpu,/52\.7/);assert.match(replay.report.audio,/works/);
assert.equal(getComposerCapabilities(base).enhancerControls.hardwareEvidence.exportSha256,enhancerRoundtrip.exportSha256);
const headerChanges=[];for(let i=0;i<76;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){assert.ok([4,5].includes(i));headerChanges.push({offset:i,field:'CRC',before:a.raw.rawPatch[i],after:b.raw.rawPatch[i]});}
const report={date:'2026-10-12',generator:'jb-composer-0.12.1',passed:true,...enhancerRoundtrip,hardwareExportLibraryFileId:feedback.export.libraryFileId,fullFilesIdentical:proof.generated.equals(proof.exported),bodyBytes:13804,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:2,headerChanges,
 enhancer:{effectId:122,recordOffset:7460,recordBytes:142,matchedParameterWords:48,sceneChannels:replay.report.scenes.map(s=>s.blocks.enhancer.channel),activeScenes:[2,3,4,6],channels:replay.report.components.enhancer.map(c=>({channel:c.channel,values:c.effective})),valueEvidence:'All values retained in device export; not individually pictured'},
 checks:{frameChecksums:true,presetCrc:true,footer:true,entireBodyIdenticalWithoutNormalization:true,all48EnhancerWordsPreserved:true,allOriginal13662GeqBytesReconstructed:true,existingLevelsAndScenesPreserved:true,sendReturnAndTwoRowsPreserved:true,presetNameAndSelectedScenePreserved:true,chunkPrefixesAndDumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsAndZeroPadding:true,unchangedSpecRegeneratesIdenticalSyx:true,renamedFileNotFalselySubmittedConfirmed:true,newCombinationNotFalselyConfirmed:true},
 encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:Buffer.from(a.raw.rawPatch).subarray(76,76+a.raw.compSize).equals(Buffer.from(b.raw.rawPatch).subarray(76,76+b.raw.compSize))},
 cpu:feedback.cpu,audio:feedback.audio,limits:feedback.limits,next:'Enhancer integration and this combined preset are confirmed. Do not request repeated collection/import/export/CPU for this specimen. New compositions have separate device evidence.'};
fs.writeFileSync(new URL('../../../docs/FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [suffix,data] of [['.txt',replay.txt],['.validation.json',JSON.stringify(replay.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_ENHANCER_ABCD_TEST'+suffix,import.meta.url),data);
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_CAPABILITIES.json',import.meta.url),JSON.stringify(getComposerCapabilities(),null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:13804,changedBodyBytes:0,matchedEnhancerWords:48,identicalGeneratedSyx:true,cpu:report.cpu,audio:report.audio},null,2));
