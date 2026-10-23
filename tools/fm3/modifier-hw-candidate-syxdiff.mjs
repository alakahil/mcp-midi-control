// Prepare an unpublished candidate in memory; export only the audit, not a SYX.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {fixtures,fixtureRoot,compareCandidate} from './modifier-minmax-syxdiff.mjs';
const out=new URL('../../docs/fm3/parameter-evidence/modifier-hw-candidate-syxdiff-audit.json',import.meta.url);
export function buildAudit(){
 const cases=[];
 for(const fixture of fixtures){
  const source=fs.readFileSync(new URL(fixture.file,fixtureRoot));
  for(const field of ['min','max']){
   const request={policy:'exact-wah-cent-fw13-hw1',[field]:'6.47'};
   const r=compareCandidate(source,request);
   assert.equal(r.afterRaw[field],42401);
   const other=field==='min'?'max':'min';assert.equal(r.afterRaw[other],fixture[other]);
   cases.push({fixture:fixture.file,request,inputSha256:r.inputSha256,candidateSha256:r.candidateSha256,
    beforeRaw:r.beforeRaw,afterRaw:r.afterRaw,bodyChanges:r.bodyChanges,checks:r.checks,
    evidence:r.plan.changes.map(c=>({pid:c.pid,inputBits:c.normalizedBits,raw:c.raw,basis:c.evidenceBasis,steps:c.measuredSteps}))});
  }
 }
 return {schemaVersion:1,date:'2026-10-22',productionPlugin:'0.3.13',policy:'exact-wah-cent-fw13-hw1',
  cases,caseCount:cases.length,candidateStage:'unpublished offline generator plan and in-memory SYX integration',
  presetFilesWritten:0,deviceIO:false,generatedPresetImported:false,publishedGeneratorSupport:false,
  fullRangeEncodingProven:false,limits:['6.47 uses field-specific captured op82 evidence; other ambiguous inputs remain blocked.',
   'The complete 1001-cent request contract has 6 measured input points and 995 four-mode-consensus points per field.',
   'Existing historical mouse-code behavior is preserved under the old production interface.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=buildAudit();
 if(process.argv[2]==='--write')fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 else {assert.equal(process.argv.length,2);assert.deepEqual(JSON.parse(fs.readFileSync(out)),result);}
 console.log(JSON.stringify({cases:result.caseCount,presetFilesWritten:0,publishedGeneratorSupport:false}));
}
