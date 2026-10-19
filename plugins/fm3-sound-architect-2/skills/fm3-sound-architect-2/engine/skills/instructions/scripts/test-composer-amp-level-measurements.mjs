import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {applyAmpLevels,ampLevelCapabilities,matchAmpLevelDeviceBody} from './fm3-composer-amp-levels.mjs';
import {verifyAmpLevelMeasurements,ampLevelMeasurementRoot} from './fm3-amp-level-measurements.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const rawByDb=new Map([[-80,0],[-30,32767],[-6,48495],[0,52427],[20,65534]]);
const models={A:'Double Verb Vibrato',B:'Brit Silver',C:'USA MK IV Lead Bright',D:'Plexi 50W High 1'};
const offsets={A:4658,B:4946,C:5234,D:5522};
const proof=verifyAmpLevelMeasurements();
assert.equal(proof.captures.length,5);assert.equal(proof.points.length,20);
for(const point of proof.points)assert.equal(point.raw,rawByDb.get(point.levelDb));
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const musicalSpec=JSON.parse(read('examples/JB_EIGHT_SCENES_V2.spec.json'));
const musical=generatePreset(base,musicalSpec);
assert.deepEqual(musical.syx,read('examples/JB_EIGHT_SCENES_V2.syx'),'Musical preset must stay byte-identical');

const reproductions=[];
for(const capture of proof.captures){
 const spec={...musicalSpec,name:'AMP LEVEL PROOF '+(capture.index+1),ampLevels:Object.entries(capture.levelDb).map(([channel,levelDb])=>({channel,levelDb}))};
 delete spec.levelB;
 const result=generatePreset(base,spec),actual=body(result.syx);
 assert.equal(actual.length,13146);assert.deepEqual(actual,capture.body,'Entire independently exported body');
 assert.equal(result.report.knownDeviceBody.sha256,capture.syxSha256);
 assert.equal(result.report.knownDeviceBody.submittedFileConfirmed,false,'Renamed file cannot inherit exact-file import approval');
 assert.equal(result.report.audio,'Not assessed for this composition');
 assert.equal(result.report.cpu,'Not supplied for this composition');
 assert.equal(result.report.components.ampLevels.length,4);
 for(const point of result.report.components.ampLevels){
  assert.equal(point.raw,rawByDb.get(point.valueDb));assert.ok(point.evidence.startsWith(ampLevelMeasurementRoot));
  assert.ok(result.txt.includes('Amp '+point.channel+' Level:'));
 }
 const actualFile=read(capture.file);
 assert.equal(matchAmpLevelDeviceBody(capture.body,actualFile).submittedFileConfirmed,true);
 const changed=Buffer.from(actual);changed[4670]^=1;
 assert.equal(matchAmpLevelDeviceBody(changed,result.syx),null,'A changed composition must not inherit device approval');
 reproductions.push({step:capture.index+1,spec,matchedBodyBytes:actual.length,bodySha256:sha(actual),sourceFile:capture.file,sourceSha256:capture.syxSha256,generatedSha256:sha(result.syx),newNameSeparatelyImported:false});
}

let isolatedCases=0,combinedCases=0,legacyAliasCases=0,rejectedInputs=0;
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'AMP LEVEL ISOLATION',ampChannels:Object.entries(models).map(([channel,model])=>({channel,model}))};
for(const candidate of composerBases){
 const b=read(candidate.file),initial=body(generatePreset(b,meta).syx);
 for(const point of proof.points){
  const result=generatePreset(b,{...meta,ampLevels:[{channel:point.channel,levelDb:point.levelDb}]}),expected=Buffer.from(initial);
  expected.writeUInt16LE(point.raw,offsets[point.channel]);
  assert.deepEqual(body(result.syx),expected,'Exactly one Level word across each approved layout');isolatedCases++;
 }
 const spec={...meta,ampLevels:[...'ABCD'].map(channel=>({channel,levelDb:-6}))},result=generatePreset(b,spec),expected=Buffer.from(initial);
 for(const channel of 'ABCD')expected.writeUInt16LE(48495,offsets[channel]);
 assert.deepEqual(body(result.syx),expected);combinedCases++;
 const alias=generatePreset(b,{...meta,ampLevels:[{channel:'B',levelDb:-2.5}]}),legacy=generatePreset(b,{...meta,levelB:-2.5});
 assert.deepEqual(alias.syx,legacy.syx);legacyAliasCases++;
}
for(const channel of 'ACD'){
 for(const levelDb of [-79,-31,-29,-5,1,19,20.01,-80.01,'-6',NaN,Infinity]){
  assert.throws(()=>generatePreset(base,{...meta,ampLevels:[{channel,levelDb}]}));rejectedInputs++;
 }
 for(const levelDb of rawByDb.keys()){
  assert.throws(()=>generatePreset(base,{...meta,ampChannels:[{channel,model:'Brit Silver'}],ampLevels:[{channel,levelDb}]}));rejectedInputs++;
 }
}
for(const ampLevels of [[],null,[{channel:'A',levelDb:-6},{channel:'A',levelDb:0}],[{channel:'E',levelDb:-6}],[{channel:'A',levelDb:-6,gain:5}]]){
 assert.throws(()=>generatePreset(base,{...meta,ampLevels}));rejectedInputs++;
}
assert.throws(()=>generatePreset(base,{...meta,levelB:-6,ampLevels:[{channel:'B',levelDb:-6}]}));rejectedInputs++;

// A later invalid request must leave every earlier requested word untouched.
const directBody=Buffer.from(proof.captures[0].body),before=Buffer.from(directBody),allowed=[];
assert.throws(()=>applyAmpLevels(directBody,layouts.newlook.amp,{ampLevels:[{channel:'A',levelDb:-6},{channel:'D',levelDb:-5}]},(...args)=>allowed.push(args)));
assert.deepEqual(directBody,before);assert.deepEqual(allowed,[]);

// Even after a successful cached decode, altered source evidence is rejected.
const file=new URL('../'+proof.captures[0].file,import.meta.url),saved=fs.readFileSync(file),bad=Buffer.from(saved);bad[100]^=1;
try{fs.writeFileSync(file,bad);assert.throws(()=>verifyAmpLevelMeasurements(),/Pinned composer donor changed/);}finally{fs.writeFileSync(file,saved);}
proof.points[0].raw=123;proof.captures[0].body[0]=7;
const fresh=verifyAmpLevelMeasurements();assert.equal(fresh.points[0].raw,0);assert.equal(fresh.captures[0].body[0],1);
const caps=ampLevelCapabilities();
assert.deepEqual(caps.A.valuesDb,[-80,-30,-12,-6,0,20]);
assert.deepEqual(caps.C.valuesDb,[-80,-30,-11,-6,0,20]);assert.deepEqual(caps.D.valuesDb,caps.C.valuesDb);
assert.equal(caps.B.measured.modelId,103);assert.deepEqual(caps.B.measured.valuesDb,[-80,-30,-6,0,20]);
assert.equal(caps.B.minimum,-80);assert.equal(caps.B.maximum,20);
const report={date:'2026-10-13',pluginVersion:'0.2.2',revision:caps.revision,passed:true,
 actualUserArchive:'FM3_AMP_LEVEL_session_TULEMUSED.zip',libraryFileId:'libfile_53abdabe155881918cc1e616c8f857bc',sourceIndex:proof.indexFile,sourceIndexSha256:proof.indexSha256,
 pairedExports:5,matchedAmpWordsPerExport:576,newMeasuredPoints:20,newACDWritablePoints:15,
 unchangedLegacyBEncoding:true,measuredRawByDb:Object.fromEntries(rawByDb),
 isolatedCases,combinedCases,legacyAliasCases,rejectedInputs,atomicValidation:true,
 corruptionAfterCachedVerificationRejected:true,returnedProofMutationIsolated:true,
 musicalV2ByteIdentical:true,renamedOutputsNotSeparatelyImportApproved:true,
 interpolatedACDValuesAllowed:false,otherACDModelsAllowed:false,newAudioOrCpuApproval:false,
 capabilities:caps,reproductions};
fs.writeFileSync(new URL('../../../docs/FM3_AMP_LEVEL_ABCD_VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,pairedExports:5,measuredPoints:20,reproducedBodies:reproductions.length,isolatedCases,combinedCases,legacyAliasCases,rejectedInputs,musicalV2ByteIdentical:true},null,2));
