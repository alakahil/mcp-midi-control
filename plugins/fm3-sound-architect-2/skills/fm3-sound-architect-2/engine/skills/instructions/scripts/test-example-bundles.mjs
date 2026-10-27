// Historical examples are evidence, not silently upgraded source recipes.
// Rebuild supported examples in a temporary directory and compare full SYX bytes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {resolveReplayBase} from './fm3-preset-core.mjs';
import {sha256} from './fm3-output.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),examples=path.join(root,'examples');
const read=p=>fs.readFileSync(path.join(root,p));
const missingHeaders=new Set(['FM3_SA_TEST_G5','FM3_SA_TEST_SCENES','FM3_SA_TEST_TIME','FM3_SA_TEST_TONE']);
// Reuse the complete historical contracts in test-generate.mjs, not inferred
// defaults. Two saved request snippets omit actual controls, not only headers.
const historicalTone={gainB:5,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12,delayScene2:true,reverbScene1:'A'};
const reconstructed={FM3_SA_TEST_TONE:historicalTone,FM3_SA_TEST_TIME:{...historicalTone,delayTimeMs:400,delayFeedback:25,reverbTimeS:2.5,reverbPredelayMs:40,delayTempoA:'NONE',reverbPredelayTempoA:'NONE'}};
const excluded={
 FM3_P6_INSERT_A:{reason:'Historical volume alias and generic insertion; current Volume has its own insertion policy.',error:/volume: not insertable/},
 FM3_P6_INSERT_B:{reason:'Historical Ten-Tap Feedback write is hidden by current FW13 type policy.',error:/TENTAP_FEEDBACK: not applicable/},
 FM3_TAPER_BATCH_TEST:{reason:'Deliberately experimental raw encoder input, outside the public preset contract.',error:/Unrecognised base/}
};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-point2-examples-')),rows=[];
try{
 const files=fs.readdirSync(examples).filter(f=>f.endsWith('.spec.json')).sort();assert.equal(files.length,51,'Review added/removed examples');
 for(const file of files){
  const stem=file.slice(0,-10),original=JSON.parse(read('examples/'+file)),spec=missingHeaders.has(stem)?{schemaVersion:1,firmware:13,...original,...(reconstructed[stem]??{})}:original;
  const reportFile=path.join(examples,stem+'.validation.json'),report=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile)):{};
  const hash=report.baseSha256??report.composer?.baseSha256??(missingHeaders.has(stem)?sha256(read('references/Baaspreset.syx')):null);
  const base=resolveReplayBase(hash);
  if(excluded[stem]){assert.throws(()=>createPreset(base,spec),excluded[stem].error);rows.push({name:stem,status:'historical-not-public-input',reason:excluded[stem].reason});continue;}
  const result=createPreset(base,spec),golden=read('examples/'+stem+'.syx');
  assert.deepEqual(result.syx,golden,stem+' must remain byte-identical');
  assert.doesNotMatch(result.txt,/\bundefined\b|\bNaN\b/,stem+' readable guide');
  const output=path.join(dir,stem);writePresetOutputs(output,result,spec);verifyPresetOutputs(output);
  rows.push({name:stem,status:'byte-identical-and-bundle-verified',outputSha256:sha256(golden),historicalRequestAdaptation:reconstructed[stem]?'complete contract from test-generate.mjs':missingHeaders.has(stem)?'schemaVersion and firmware headers only':null});
 }
 assert.equal(rows.filter(r=>r.status==='byte-identical-and-bundle-verified').length,48);
 console.log(JSON.stringify({passed:true,exampleSpecs:51,byteIdenticalAndVerified:48,metadataOnlyAdaptations:2,historicalRequestReconstructions:2,expectedHistoricalRejections:3,rows,sourceExamplesModified:false,newHardwareMeasurements:0}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
