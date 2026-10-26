// Receipt for the 2026-10-26 CPU check on third-party presets (cpu-check-build.mjs + FM3_CPU_SWEEP.py, test T6).
// Offline. The presets are the user's purchased tonepack and are NOT in the repository; the receipt keeps
// only anonymous ids, the selected scene, the fm3-cpu estimate and the device meter reading.
// Usage: node tools/fm3/cpu-check-ingest.mjs                     verify the receipt against the results
//        node tools/fm3/cpu-check-ingest.mjs --manifest FILE --write   (re)write it from the local pack manifest
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const resFile=path.join(REF,'fm3-cpu-check-20261026-results.jsonl'),target=path.join(REF,'fm3-cpu-check-20261026.json');
const rows=fs.readFileSync(resFile,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const {cpuMeasurementsHash}=await import(path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-cpu.mjs'));
const r1=x=>Math.round(x*10)/10;
function summarize(items){
  const by=Object.fromEntries(rows.map(r=>[r.id,r]));
  assert.ok(rows.every(r=>r.decode==='piecewise-20261023'&&!r.saturated&&r.reads.length>=3&&r.reads.slice(-3).every(v=>v===r.raw)),'settled, unsaturated readings');
  const cal=by['cal-p6a'];assert.ok(cal&&cal.calibrationOk&&cal.userConfirmedName&&Math.abs(cal.cpuPercent-82.5)<=2,'calibration preset first and within 2 %');
  assert.deepEqual(rows.map(r=>r.id),['cal-p6a',...items.map(i=>i.id)],'every item measured once, in order');
  const presets=items.map(i=>{const m=by[i.id].cpuPercent;return {...i,measuredPercent:m,errorPoints:r1(i.estimatePercent-m)};});
  const err=presets.map(p=>p.errorPoints),abs=err.map(Math.abs);
  return {calibration:{id:'cal-p6a',handMeasuredPercent:82.5,meterPercent:cal.cpuPercent},presets,
    summary:{n:presets.length,measuredMin:Math.min(...presets.map(p=>p.measuredPercent)),measuredMax:Math.max(...presets.map(p=>p.measuredPercent)),
      meanErrorPoints:r1(err.reduce((a,b)=>a+b,0)/err.length),meanAbsErrorPoints:r1(abs.reduce((a,b)=>a+b,0)/abs.length),
      largestOverestimatePoints:Math.max(...err),largestUnderestimatePoints:-Math.min(...err),overSafeLimit80:presets.filter(p=>p.measuredPercent>80).length}};
}
if(process.argv.includes('--write')){
  const mf=process.argv[process.argv.indexOf('--manifest')+1];assert.ok(mf&&fs.existsSync(mf),'--manifest FILE (the local pack manifest) is required to write');
  const man=JSON.parse(fs.readFileSync(mf,'utf8'));assert.equal(man.kind,'fm3-cpu-check');
  const items=man.items.filter(i=>i.family==='user-preset').map(i=>({id:i.id,selectedScene:i.selectedScene,sceneSetToWorst:i.selectedScene!==i.storedScene,
    estimatePercent:i.estimatePercent,measuredTypeCoverage:i.measuredTypeCoverage,familiesWithoutCost:i.unknown}));
  const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-26',
    source:'8 presets picked by cpu-check-build.mjs (--pick=8 --scene=worst) from the 328 amp presets of a purchased fw13 tonepack; files, names and parameter values are not in the repository',
    estimator:{model:'fm3-cpu 0.2.1',measurementsSha256:cpuMeasurementsHash},
    method:'Each preset was sent to the edit buffer (7F 00) and the CPU meter (fn=0x01 sub=0x2E, piecewise decode) read until three equal values; nothing stored. The selected scene was set to the scene with the highest estimate; that the FM3 was in that scene was not observed on screen.',
    ...summarize(items),
    findings:['All measured presets stay below the 80 % safe limit (max 76 %).','The estimate is within about ±2 points where the selected scene is the stored scene 1 and in one other preset; for four presets whose worst scene has another channel type it is 3.2 to 4.9 points too high (conservative).'],
    notMeasured:['whether the FM3 applied the re-encoded selected scene on load (CPU per scene of one preset)','the Out 2 block cost (omitted by the estimator)','audio'],
    resultsSha256:sha(fs.readFileSync(resFile))};
  fs.writeFileSync(target,JSON.stringify(out,null,1)+'\n');
}
const rec=JSON.parse(fs.readFileSync(target,'utf8'));
assert.equal(rec.resultsSha256,sha(fs.readFileSync(resFile)),'results file pinned');
const again=summarize(rec.presets.map(({measuredPercent,errorPoints,...i})=>i));
assert.deepEqual({calibration:rec.calibration,presets:rec.presets,summary:rec.summary},again,'receipt matches the device results');
assert.ok(!JSON.stringify(rec).match(/'26|\.syx|Bank_|LiveGold/),'no third-party names or files in the receipt');
console.log(JSON.stringify(rec.summary));
