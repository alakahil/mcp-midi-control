// Receipt for the 2026-10-26 CPU-per-scene run (FM3_CPU_SCENES.py, test T6b). Offline.
// One preset of a purchased tonepack (the CPU check item p08; not in the repository): the user selected
// scenes 1..8 on the FM3 and the meter was read after each. The receipt keeps only the scene numbers, the
// fm3-cpu estimate per scene and the readings.
// Usage: node tools/fm3/cpu-scenes-ingest.mjs                       verify
//        node tools/fm3/cpu-scenes-ingest.mjs --manifest FILE --write   (re)write from the local pack manifest
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const sha=b=>createHash('sha256').update(b).digest('hex'),r1=x=>Math.round(x*10)/10;
const resFile=path.join(REF,'fm3-cpu-scenes-20261026-results.json'),target=path.join(REF,'fm3-cpu-scenes-20261026.json');
const res=JSON.parse(fs.readFileSync(resFile,'utf8'));
function summarize(perScene){
  assert.ok(res.userConfirmedName&&String(res.sceneAfterLoad).trim()==='4','loaded in its stored scene 4');
  assert.ok(res.steps.every(s=>/^ok$/i.test(s.userNote.trim())&&s.raw!==null&&s.reads.slice(-3).every(v=>v===s.raw)),'every scene selected and settled');
  assert.deepEqual(res.steps.map(s=>s.scene),[1,2,3,4,5,6,7,8]);
  const scenes=res.steps.map(s=>({scene:s.scene,estimatePercent:perScene[s.scene-1],measuredPercent:s.cpuPercent,errorPoints:r1(perScene[s.scene-1]-s.cpuPercent)}));
  assert.equal(res.afterLoad.cpuPercent,scenes[3].measuredPercent,'after load = scene 4 reading');
  const err=scenes.map(s=>s.errorPoints);
  return {afterLoad:{scene:4,measuredPercent:res.afterLoad.cpuPercent},scenes,
    summary:{errorMinPoints:Math.min(...err),errorMaxPoints:Math.max(...err),measuredMax:Math.max(...scenes.map(s=>s.measuredPercent)),
      scenesOver80:scenes.filter(s=>s.measuredPercent>80).map(s=>s.scene),
      sameOrderAsEstimate:scenes.every((a,i)=>scenes.every((b,j)=>(a.estimatePercent<b.estimatePercent)<=(a.measuredPercent<=b.measuredPercent)))}};
}
if(process.argv.includes('--write')){
  const mf=process.argv[process.argv.indexOf('--manifest')+1];assert.ok(mf&&fs.existsSync(mf),'--manifest FILE is required to write');
  const mb=fs.readFileSync(mf),man=JSON.parse(mb);assert.equal(man.kind,'fm3-cpu-scenes');assert.equal(sha(mb),res.packSha256,'manifest of the measured pack');
  const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-26',
    preset:'one preset of a purchased fw13 tonepack (CPU check item p08, references/fm3-cpu-check-20261026.json); file, name and values not in the repository',
    estimator:{model:man.estimate.model,familiesWithoutCost:man.estimate.familiesWithoutCost},
    method:'Edit-buffer load (7F 00) of the preset with its stored scene 4; the user selected scenes 1..8 on the FM3 and the CPU meter (fn=0x01 sub=0x2E) was read after each until three equal values. No store, no SET, no scene change by the script.',
    ...summarize(man.estimate.perScene),
    findings:['The meter changes with the scene exactly as the per-scene estimate (same order, same steps); bypass does not set the cost, the active channel types do.',
      'The estimate is 1.0 to 1.5 points below the meter in every scene (a near-constant offset; the omitted Out 2 block is a likely part).',
      'Scene 5 measured 82 %, above the 80 % safe limit; the estimate (80.5 %) already flagged it.'],
    resultsSha256:sha(fs.readFileSync(resFile))};
  fs.writeFileSync(target,JSON.stringify(out,null,1)+'\n');
}
const rec=JSON.parse(fs.readFileSync(target,'utf8'));
assert.equal(rec.resultsSha256,sha(fs.readFileSync(resFile)),'results pinned');
const again=summarize(rec.scenes.map(s=>s.estimatePercent));
assert.deepEqual({afterLoad:rec.afterLoad,scenes:rec.scenes,summary:rec.summary},again,'receipt matches the results');
assert.ok(!JSON.stringify(rec).match(/'26|\.syx"|Petrucci|LiveGold/),'no third-party names');
console.log(JSON.stringify(rec.summary));
