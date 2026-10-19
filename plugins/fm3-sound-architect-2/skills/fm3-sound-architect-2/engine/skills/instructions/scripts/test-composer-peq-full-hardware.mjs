// Actual uploaded FM3 export: compare every original byte without normalisation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {composePeqTemplates,matchPeqDeviceBody} from './fm3-peq-controls.mjs';
import {peqFullRoundtrip,verifyPeqFullRoundtrip} from './fm3-peq-full-hardware.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const proof=verifyPeqFullRoundtrip(),{a,b,body}=proof;
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec=JSON.parse(read('examples/FM3_PEQ_ABCD_TEST.spec.json'));
const replay=generatePreset(base,spec);
assert.deepEqual(replay.syx,proof.generated,'Removing invisible baseline Q overrides must not alter the supplied SYX');
assert.equal(replay.report.knownDeviceBody.submittedFileConfirmed,true);
assert.equal(b.decoded.preset_name,'FM3 PEQ ABCD TEST');assert.equal(body[0],1);assert.deepEqual(a.decoded.grid,b.decoded.grid);
assert.deepEqual(replay.report.scenes.map(s=>s.blocks.peq.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(replay.report.scenes.filter(s=>!s.blocks.peq.bypass).map(s=>s.scene),[2,3,4,6]);
const restored=Buffer.concat([body.subarray(0,8688),body.subarray(8998)]);restored.writeUInt16LE(1029,408);
assert.deepEqual(restored,Buffer.from(inspectStructure(read('examples/JB_EIGHT_SCENES_V3.syx')).raw.body));
const peq=replay.report.components.peq;
for(const c of peq){
 const at=8734+'ABCD'.indexOf(c.channel)*66;
 assert.deepEqual(c.words,Array.from({length:33},(_,i)=>body.readUInt16LE(at+i*2)));
 for(const band of c.effective.bands)if(band.type==='Blocking'){
  assert.ok(!Object.hasOwn(band,'q')&&!Object.hasOwn(band,'gainDb'));
  assert.ok(!c.controls.some(p=>p.key===`bands.${band.band}.q`));
  assert.equal(c.words[4+band.band],27833,'Invisible Q word stays at the actual baseline');
 }
}
let invalidBlockingQ=0;
for(const channel of 'ABCD')for(const band of [1,5]){
 assert.throws(()=>composePeqTemplates([{channel,bands:[{band,type:'Blocking',q:.707}]}]),/no Q control/);invalidBlockingQ++;
 const other=composePeqTemplates([{channel,bands:[{band,type:'Peaking',q:1.4}]}]);assert.equal(other.channels[0].words[band+4],37555);
}
const renamed=generatePreset(base,{...spec,name:'PEQ ABCD RENAMED'});assert.equal(renamed.report.knownDeviceBody.submittedFileConfirmed,false);
const unseen=structuredClone(spec);unseen.peqChannels[1].bands[2].gainDb=1.6;assert.equal(generatePreset(base,unseen).report.knownDeviceBody,null);
const changed=Buffer.from(body);changed[4946]^=1;assert.equal(matchPeqDeviceBody(changed,proof.generated),null);
const headerChanges=[];for(let i=0;i<76;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){assert.ok([4,5].includes(i));headerChanges.push({offset:i,field:'CRC',before:a.raw.rawPatch[i],after:b.raw.rawPatch[i]});}
const report={date:'2026-10-09',generator:'jb-composer-0.10.1',passed:true,...peqFullRoundtrip,hardwareExportLibraryFileId:'libfile_178113e2e4008191b94dab8d95226c32',fullFilesIdentical:proof.generated.equals(proof.exported),bodyBytes:13456,changedBodyOffsets:[],presetName:b.decoded.preset_name,selectedScene:2,headerChanges,
 peq:{effectId:54,recordOffset:8688,recordBytes:310,matchedParameterWords:132,sceneChannels:replay.report.scenes.map(s=>s.blocks.peq.channel),activeScenes:[2,3,4,6],channels:peq.map(c=>({channel:c.channel,values:c.effective})),valueLabels:'Decoded numeric values; not a claim that every intermediate value was separately screen-confirmed'},
 checks:{frameChecksums:true,presetCrc:true,footer:true,entireBodyIdenticalWithoutNormalization:true,all132PeqWordsPreserved:true,allOriginal13146V3BytesReconstructed:true,existingLevelsAndScenesPreserved:true,sendReturnAndTwoRowsPreserved:true,presetNameAndSelectedScenePreserved:true,chunkPrefixesAndDumpHeaderPreserved:true,rawHeaderChangesOnlyCrc:true,encodedLengthsAndZeroPadding:true,correctedSpecRegeneratesIdenticalSyx:true,blockingQHiddenAndRejected:true,invalidBlockingQRequestsRejected:invalidBlockingQ,nonBlockingQStillSupported:true,renamedFileNotFalselySubmittedConfirmed:true,newCombinationNotFalselyConfirmed:true},
 encoding:{compressedBytesBefore:a.raw.compSize,compressedBytesAfter:b.raw.compSize,compressedRepresentationIdentical:Buffer.from(a.raw.rawPatch).subarray(76,76+a.raw.compSize).equals(Buffer.from(b.raw.rawPatch).subarray(76,76+b.raw.compSize))},
 cpu:{minimumPercent:47,maximumPercent:48,source:'User report for this specimen; not a universal maximum'},audio:'No explicit listening verdict supplied for this specimen',display:'User explicitly reports Blocking has no Q control. Other intermediate screen values not explicitly confirmed.',next:'Do not repeat import/export or GET collection. Corrected checklist uses unchanged SYX. Next planned block: Graphic EQ, then Enhancer.'};
fs.writeFileSync(new URL('../../../docs/FM3_PEQ_ABCD_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const [suffix,data] of [['.txt',replay.txt],['.validation.json',JSON.stringify(replay.report,null,2)+'\n']])fs.writeFileSync(new URL('../examples/FM3_PEQ_ABCD_TEST'+suffix,import.meta.url),data);
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_CAPABILITIES.json',import.meta.url),JSON.stringify(getComposerCapabilities(),null,2)+'\n');
console.log(JSON.stringify({passed:true,bodyBytes:13456,changedBodyBytes:0,headerChanges,identicalSyxAfterBlockingQCorrection:true,blockingQRequestsRejected:invalidBlockingQ,cpu:report.cpu,audio:report.audio}));
