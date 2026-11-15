// SV7 binds user observations and measured files to the exact verified preset.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {reviewPreset} from './fm3-preset-review.mjs';
import {compareStoredPreset} from './fm3-store-compare.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function acceptance(stem,observationsFile){
 const review=reviewPreset(stem),raw=fs.readFileSync(observationsFile),o=JSON.parse(raw),dir=path.dirname(path.resolve(observationsFile));
 assert.equal(o.version,1);assert.equal(o.syntheticOnly,false,'Synthetic/unknown observations cannot accept a hardware preset');
 assert.equal(o.presetSha256,review.files.syx.sha256,'Observations belong to a different final file');
 assert.equal(o.userAccepted,true,'User acceptance is missing');
 assert.ok(typeof o.comparisonReason==='string'&&o.comparisonReason.trim().length>0,'Listening choice needs a reason');
 assert.ok(o.recordingChain&&typeof o.recordingChain==='object'&&Object.keys(o.recordingChain).length>0,'Recording chain missing');
 assert.deepEqual(o.sceneObservations.map(s=>s.scene),review.decoded.scenes.map(s=>s.scene),'All used scenes must be observed once');
 for(const s of o.sceneObservations){
  assert.ok(Number.isFinite(s.cpuPeakPercent)&&s.cpuPeakPercent>0&&s.cpuPeakPercent<100,'Measured CPU missing/invalid');
  assert.ok(Number.isFinite(s.relativeLevelDb),'Measured relative level missing');
  for(const k of ['inputClip','outputClip','dropout'])assert.equal(s[k],false,'Failed or missing observation '+k);
  for(const k of ['roleAccepted','transitionsAccepted'])assert.equal(s[k],true,'Failed or missing observation '+k);
 }
 assert.equal(o.afterStore?.manuallyStoredAndReloaded,true,'Manual STORE/reload missing');
 assert.equal(o.afterStore?.heardAgain,true,'Post-STORE listening missing');
 assert.ok(typeof o.afterStore.storedFile==='string'&&o.afterStore.storedFile.length,'Stored export missing');
 const stored=fs.readFileSync(path.resolve(dir,o.afterStore.storedFile));
 const comparison=compareStoredPreset(fs.readFileSync(stem+'.syx'),stored);
 assert.ok(typeof o.measurements?.audioAnalysisFile==='string'&&o.measurements.audioAnalysisFile.length,'Audio analysis missing');
 const audioBytes=fs.readFileSync(path.resolve(dir,o.measurements.audioAnalysisFile)),audio=JSON.parse(audioBytes);
 assert.equal(audio.kind,'fm3-audio-session-analysis');assert.equal(audio.syntheticOnly,false,'Synthetic audio is not hardware evidence');
 assert.ok(audio.takes.length>=2&&audio.commonDi?.sha256,'Common DI identity required for the acceptance comparison');
 assert.ok(audio.recordingChain?.presetSha256s?.includes(review.files.syx.sha256),'Audio chain must name this exact preset hash');
 return {kind:'fm3-sound-acceptance',version:1,files:review.files,observationsSha256:sha(raw),storedFileSha256:sha(stored),
  audioAnalysisSha256:sha(audioBytes),storeComparison:comparison,userObservations:o,
  levelAndCpuBasis:'User-reported readings bound to this file; CPU is not inferred from the estimate',
  listeningBasis:'User acceptance and post-STORE listening declaration, not an automatic sound-match score',accepted:true,deviceIO:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{assert.equal(process.argv.length,4,'Usage: fm3-sound-acceptance.mjs OUTPUT_STEM OBSERVATIONS.json');
  console.log(JSON.stringify(acceptance(path.resolve(process.argv[2]),path.resolve(process.argv[3])),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
