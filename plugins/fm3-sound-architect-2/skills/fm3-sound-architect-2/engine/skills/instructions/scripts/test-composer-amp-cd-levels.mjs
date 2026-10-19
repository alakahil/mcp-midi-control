import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {verifyAmpCDLevelEvidence,ampLevelCapabilities} from './fm3-composer-amp-levels.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const spec=JSON.parse(read('examples/JB_EIGHT_SCENES_V2.spec.json'));
const musical=generatePreset(base,spec),proof=verifyAmpCDLevelEvidence();
assert.deepEqual(musical.syx,read('examples/JB_EIGHT_SCENES_V2.syx'),'Musical V2 unchanged');
assert.equal(sha(musical.syx),'aed7727e29b12765a661708ca29fcf211cc8901a4655edbec53738920adf565f');
const cdSpec={...spec,name:'FM3 AMP CD LEVEL CHECK',purpose:'Technical reproduction of measured C/D Level -11 dB export; temporary test levels, not a new musical balance.',ampLevels:[...spec.ampLevels,{channel:'C',levelDb:-11},{channel:'D',levelDb:-11}]};
const generated=generatePreset(base,cdSpec),actual=body(generated.syx),expected=Buffer.from(body(musical.syx));
expected.writeUInt16LE(45218,5234);expected.writeUInt16LE(45218,5522);
assert.deepEqual(actual,expected);assert.deepEqual(actual,proof.body,'All 13146 bytes match the independent C/D export');
assert.equal(generated.report.knownDeviceBody.sha256,proof.sha256);
assert.equal(generated.report.knownDeviceBody.submittedFileConfirmed,false);
for(const scene of [1,2,3,5])assert.deepEqual(generated.report.scenes[scene-1],musical.report.scenes[scene-1]);
assert.deepEqual(generated.report.scenes.filter(s=>s.blocks.amp.channel==='C').map(s=>s.scene),[6,7,8]);
assert.deepEqual(generated.report.scenes.filter(s=>s.blocks.amp.channel==='D').map(s=>s.scene),[4]);
let individualCases=0,combinedCases=0;
for(const candidate of composerBases){
  const b=read(candidate.file),meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CD LEVEL ISOLATION',ampChannels:[{channel:'C',model:'USA MK IV Lead Bright'},{channel:'D',model:'Plexi 50W High 1'}]};
  const before=body(generatePreset(b,meta).syx);
  for(const channels of [['C'],['D'],['C','D']]){
    const wanted=Buffer.from(before),ampLevels=channels.map(channel=>({channel,levelDb:-11}));
    for(const c of channels)wanted.writeUInt16LE(45218,c==='C'?5234:5522);
    assert.deepEqual(body(generatePreset(b,{...meta,ampLevels}).syx),wanted);
    if(channels.length===1)individualCases++;else combinedCases++;
  }
}
const allSpec={...spec,ampLevels:[{channel:'A',levelDb:-12},{channel:'B',levelDb:-4},{channel:'C',levelDb:-11},{channel:'D',levelDb:-11}]};delete allSpec.levelB;
const all=generatePreset(base,allSpec),allWant=Buffer.from(expected);allWant.writeUInt16LE(Math.round(.76*65534),4946);assert.deepEqual(body(all.syx),allWant);assert.equal(all.report.knownDeviceBody,null);
let rejected=0;
for(const channel of ['C','D']){
  for(const levelDb of [-10,-12,'-11',NaN,Infinity]){assert.throws(()=>generatePreset(base,{...spec,ampLevels:[{channel,levelDb}]}));rejected++;}
  assert.throws(()=>generatePreset(base,{...spec,ampChannels:[{channel,model:'Brit Silver'}],ampLevels:[{channel,levelDb:-11}]}));rejected++;
  assert.throws(()=>generatePreset(base,{...spec,ampLevels:[{channel,levelDb:-11},{channel,levelDb:-11}]}));rejected++;
}
const partial=generatePreset(base,{...spec,ampLevels:[...spec.ampLevels,{channel:'C',levelDb:-11}]});assert.equal(partial.report.knownDeviceBody,null);
assert.deepEqual(ampLevelCapabilities().channels,['A','B','C','D']);assert.deepEqual(ampLevelCapabilities().pendingChannels,[]);
const report={date:'2026-10-09',passed:true,generator:'jb-composer-0.8.1',actualUserExport:'FM3_AMP_CD_LEVEL_CHECK_export(1).syx',libraryFileId:'libfile_688f418ba6c08191b382eb56544467b1',packagedFile:proof.file,exportSha256:proof.sha256,bodySha256:proof.bodySha256,bodyBytes:actual.length,changedBodyOffsetsAgainstV2:proof.changedOffsets,rawHeaderChangesAgainstNamedV2:proof.headerChanges,points:proof.points,checks:{frames:true,presetCrc:true,footer:true,encodedLengthsAndPadding:true,exactWholeDeviceBody:true,noBodyNormalization:true,onlyTwoRequestedWordsChanged:true,ampAAndBPreserved:true,allScenesAndRoutingPreserved:true,sendReturnAndSystemDataPreserved:true,oldV2SyxUnchanged:true,renamedGeneratedFileNotImportApproved:true,partialAndChangedCompositionsNotDeviceApproved:true},individualSevenBaseCases:individualCases,combinedSevenBaseCases:combinedCases,allFourChannelsCompose:true,rejectedInputs:rejected,hardwareScope:'Actual C/D -11 dB points on model IDs 24/11; not other values, models or ranges',musicalPreset:'JB_EIGHT_SCENES_V2.syx remains unchanged; C/D test levels are temporary',audio:'No new listening approval',cpu:'No new reading; prior 45.7–46.7% belonged to V1',next:'No repeated export or GET. Restore musical V2 and assess clean scenes 1/5 after -3 dB adjustment.'};
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_AMP_CD_LEVEL_VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
generated.report.measuredControlValidation=report;
const stem='examples/FM3_AMP_CD_LEVEL_CHECK';
for(const [ext,data] of [['.spec.json',JSON.stringify(cdSpec,null,2)+'\n'],['.syx',generated.syx],['.txt',generated.txt],['.validation.json',JSON.stringify(generated.report,null,2)+'\n']])fs.writeFileSync(new URL('../'+stem+ext,import.meta.url),data);
console.log(JSON.stringify({passed:true,bodyBytes:actual.length,changedOffsets:proof.changedOffsets,individualCases,combinedCases,rejected,oldV2Unchanged:true,points:proof.points.map(({channel,model,displayDb,raw})=>({channel,model,displayDb,raw}))},null,2));
