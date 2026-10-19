// Real device export plus user screenshot/report; no normalized body comparisons.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {geqRoundtrip,verifyGeqRoundtrip,matchGeqDeviceBody} from './fm3-geq-hardware.mjs';
import {loadGeqFull} from './fm3-geq-full.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const proof=verifyGeqRoundtrip(),{a,b,body,feedback}=proof;
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_GEQ_ABCD_TEST.spec.json'));
const replay=generatePreset(base,spec);
assert.deepEqual(replay.syx,proof.generated,'Metadata/label update must not alter SYX');
assert.equal(replay.report.knownDeviceBody.submittedFileConfirmed,true);
assert.equal(b.decoded.preset_name,'FM3 GEQ ABCD TEST');assert.equal(body[0],1);assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.deepEqual(replay.report.scenes.map(s=>s.blocks.geq.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(replay.report.scenes.filter(s=>!s.blocks.geq.bypass).map(s=>s.scene),[2,3,4,6]);
const restored=Buffer.concat([body.subarray(0,8308),body.subarray(8514)]);restored.writeUInt16LE(1030,424);
assert.deepEqual(restored,Buffer.from(inspectStructure(read('examples/FM3_PEQ_ABCD_TEST_export.syx')).raw.body));
for(const c of replay.report.components.geq){const at=8354+'ABCD'.indexOf(c.channel)*40;assert.deepEqual(c.words,Array.from({length:20},(_,i)=>body.readUInt16LE(at+i*2)));}
const screen=feedback.screenshot,channel=replay.report.scenes[screen.scene-1].blocks.geq;
assert.equal(channel.channel,screen.channel);assert.equal(channel.type,screen.type);
assert.deepEqual(channel.bands.map(b=>b.label),screen.bandLabels);
assert.deepEqual(channel.bands.map(b=>Number(b.gainDb.toFixed(2))),screen.gainDb);
assert.equal(Number(channel.masterQ.toFixed(2)),screen.masterQ);assert.equal(channel.balance,screen.balance);assert.equal(channel.bypassMode,screen.bypassMode);
assert.equal(Number(channel.levelDb.toFixed(1)),screen.levelDisplayDb);assert.equal(channel.levelDb,screen.levelDecodedDb);
const renamed=generatePreset(base,{...spec,name:'GEQ CONFIRMED RENAMED'});assert.equal(renamed.report.knownDeviceBody.submittedFileConfirmed,false);
const unseen=structuredClone(spec);unseen.geqChannels[1].bands[2].gainDb=1.6;assert.equal(generatePreset(base,unseen).report.knownDeviceBody,null);
const changed=Buffer.from(body);changed[4946]^=1;assert.equal(matchGeqDeviceBody(changed,proof.generated),null);
const caps=getComposerCapabilities(base);assert.equal(caps.geqControls.types.find(t=>t.name==='7 Band Constant Q').bands[0].label,'100');assert.deepEqual(caps.geqControls.audit.pendingLabels,[]);
assert.equal(loadGeqFull().library.models.find(m=>m.name==='7 Band Constant Q').bands[0].capturedLabel,'python3 100');
assert.equal(JSON.parse(read('references/geq-full.json')).models.find(m=>m.name==='7 Band Constant Q').bands[0].label,null,'Original collection evidence remains untouched');
const headerChanges=[];for(let i=0;i<76;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){assert.ok([4,5].includes(i));headerChanges.push({offset:i,field:'CRC',before:a.raw.rawPatch[i],after:b.raw.rawPatch[i]});}
const report={date:'2026-10-11',generator:'jb-composer-0.11.1',passed:true,...geqRoundtrip,hardwareExportLibraryFileId:feedback.export.libraryFileId,fullFilesIdentical:proof.generated.equals(proof.exported),bodyBytes:13662,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:2,headerChanges,
 geq:{effectId:50,recordOffset:8308,recordBytes:206,matchedParameterWords:80,sceneChannels:replay.report.scenes.map(s=>s.blocks.geq.channel),activeScenes:[2,3,4,6],channels:replay.report.components.geq.map(c=>({channel:c.channel,values:c.effective})),valueLabels:'C screenshot values confirmed. Other channel values decoded from unchanged export; no claim of separate screen observation for every value.'},
 checks:{frameChecksums:true,presetCrc:true,footer:true,entireBodyIdenticalWithoutNormalization:true,all80GeqWordsPreserved:true,allOriginal13456PeqBytesReconstructed:true,existingLevelsAndScenesPreserved:true,sendReturnAndTwoRowsPreserved:true,presetNameAndSelectedScenePreserved:true,chunkPrefixesAndDumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsAndZeroPadding:true,unchangedSpecRegeneratesIdenticalSyx:true,screenshotChannelCMatches:true,levelSingleDecimalDisplayExplained:true,firstBand100HzConfirmed:true,rawCollectionEvidencePreserved:true,renamedFileNotFalselySubmittedConfirmed:true,newCombinationNotFalselyConfirmed:true},
 encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:Buffer.from(a.raw.rawPatch).subarray(76,76+a.raw.compSize).equals(Buffer.from(b.raw.rawPatch).subarray(76,76+b.raw.compSize))},
 cpu:feedback.cpu,audio:feedback.audio,displayEvidence:feedback.screenshot,limits:feedback.limits,next:'This GEQ specimen is complete. Do not request repeated import/export, CPU, label or GET collection. Next agreed block: Enhancer.'};
fs.writeFileSync(new URL('../../../docs/FM3_GEQ_ABCD_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [suffix,data] of [['.txt',replay.txt],['.validation.json',JSON.stringify(replay.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_GEQ_ABCD_TEST'+suffix,import.meta.url),data);
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_CAPABILITIES.json',import.meta.url),JSON.stringify(getComposerCapabilities(),null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:13662,changedBodyBytes:0,matchedGeqWords:80,screenshotChannelCMatches:true,firstBand:'100 Hz',levelDisplay:screen.levelDisplayDb,identicalGeneratedSyx:true,cpu:report.cpu,audio:report.audio},null,2));
