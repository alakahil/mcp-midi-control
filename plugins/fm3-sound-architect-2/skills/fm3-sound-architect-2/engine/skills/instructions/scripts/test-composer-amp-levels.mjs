import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {verifyAmpLevelEvidence,ampLevelCapabilities} from './fm3-composer-amp-levels.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'AMP LEVEL CHECK'};
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const v1spec=JSON.parse(read('examples/JB_EIGHT_SCENES_V1.spec.json'));
assert.deepEqual(generatePreset(base,v1spec).syx,read('examples/JB_EIGHT_SCENES_V1.syx'));
const proof=verifyAmpLevelEvidence();
const spec={...v1spec,name:'JB EIGHT SCENES V2',ampLevels:[{channel:'A',levelDb:-12}]};
const result=generatePreset(base,spec),actual=body(result.syx),old=body(read('examples/JB_EIGHT_SCENES_V1.syx'));
assert.deepEqual(actual,proof.body,'All 13146 bytes match independent user export');
const restored=Buffer.from(actual);old.copy(restored,4658,4658,4660);assert.deepEqual(restored,old);
assert.equal(actual.readUInt16LE(4658),44563);
assert.equal(result.report.knownDeviceBody.sha256,proof.sha256);
assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false);
assert.deepEqual(result.report.scenes.filter(s=>s.blocks.amp.channel==='A').map(s=>s.scene),[1,5]);
for(const s of [2,3,4,6,7,8])assert.deepEqual(result.report.scenes[s-1],generatePreset(base,v1spec).report.scenes[s-1]);
let isolation=0;
for(const candidate of composerBases){
  const b=read(candidate.file),initial=generatePreset(b,{...meta,ampChannels:[{channel:'A',model:'Double Verb Vibrato'}]});
  const revised=generatePreset(b,{...meta,ampChannels:[{channel:'A',model:'Double Verb Vibrato'}],ampLevels:[{channel:'A',levelDb:-12}]}),expected=body(initial.syx);
  // Literal independent address in all seven measured layouts.
  expected.writeUInt16LE(44563,4658);assert.deepEqual(body(revised.syx),expected);isolation++;
  const alias=generatePreset(b,{...meta,ampLevels:[{channel:'B',levelDb:-11}]}),legacy=generatePreset(b,{...meta,levelB:-11});
  assert.deepEqual(alias.syx,legacy.syx);assert.equal(alias.report.effective.find(x=>x.key==='levelB').source,'requested');
}
let rejected=0;
for(const ampLevels of [null,{},[],[null],[{}],[{channel:'E',levelDb:-12}],[{channel:'A',levelDb:'-12'}],[{channel:'A',levelDb:-9}],[{channel:'A',levelDb:-12,gain:5}],[{channel:'A',levelDb:-12},{channel:'A',levelDb:-12}],[{channel:'C',levelDb:-10}],[{channel:'D',levelDb:-10}],[{channel:'B',levelDb:21}],[{channel:'B',levelDb:NaN}]]){
  assert.throws(()=>generatePreset(base,{...meta,ampChannels:[{channel:'A',model:'Double Verb Vibrato'}],ampLevels}));rejected++;
}
assert.throws(()=>generatePreset(base,{...meta,levelB:-11,ampLevels:[{channel:'B',levelDb:-11}]}));rejected++;
assert.throws(()=>generatePreset(base,{...meta,ampChannels:[{channel:'A',model:'Brit Silver'}],ampLevels:[{channel:'A',levelDb:-12}]}));rejected++;
const different=generatePreset(base,{...spec,levelB:-4});assert.equal(different.report.knownDeviceBody,null);
assert.deepEqual(ampLevelCapabilities().pendingChannels,[]);
const report={date:'2026-10-09',passed:true,bodyBytes:actual.length,exactV2DeviceBody:true,onlyAWordChanged:true,scenesAffected:[1,5],otherSixScenesUnchanged:true,sevenBaseIsolationCases:isolation,sevenLegacyBAliasCases:isolation,rejectedInputs:rejected,oldV1SyxByteIdentical:true,renamedFileNotFalselyImportApproved:true,changedBodyNotDeviceApproved:true,A:{model:'Double Verb Vibrato',levelDb:-12,raw:44563},CD:'Measured model-specific -11 dB points verified by test-composer-amp-cd-levels.mjs',scope:'A exact measured point and existing B compatibility tested here; C/D device evidence and isolation have a separate test.'};
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_AMP_LEVEL_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
