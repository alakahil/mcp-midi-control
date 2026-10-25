// Reproduce audit-point-2 software evidence without modifying historical presets.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const tests=['test-output-replay','test-example-bundles'];
const results=Object.fromEntries(tests.map(name=>[name,JSON.parse(execFileSync(process.execPath,[path.join(root,prefix,'scripts',name+'.mjs')],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024}).trim())]));
for(const result of Object.values(results))assert.equal(result.passed,true);
const sources=['tools/fm3/point2-evidence.mjs',...['fm3-output.mjs','fm3-preset.mjs','fm3-preset-core.mjs','fm3-sound.mjs','fm3-jb-composer.mjs','fm3-final-state.mjs','fm3-controls-output.mjs',...tests.map(t=>t+'.mjs')].map(p=>prefix+'scripts/'+p)];
const report={schemaVersion:1,version:'0.3.23',auditPoint:2,
 scope:'Deterministic consistency of supported SYX/TXT/spec/report bundles; not an independent DSP model or authenticity signature',
 sources:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),
 baseline:{version:'0.3.22',commit:'86a1b8bac212bceb14cecbb7c48ace02d9df1ac8',reproducedAcceptedMutations:['legacy TXT changed and rehashed','legacy spec name changed and rehashed','sound composer Amp model changed and rehashed','sound report checks/hardware claim changed']},
 results,limits:['Checks use the installed verified engine and bundled base bytes; historical bundles need the corresponding engine.',
  'Replay shares the generator. Existing independent raw-byte, captured-template and device-export regression tests remain necessary.',
  'Three historical/experimental specs are expected to fail the current public contract; two incomplete legacy snippets are explicitly reconstructed from test-generate.mjs.',
  'Multi-file publication is not OS-atomic across process or power failure. Run --verify before use.',
  'No new hardware import/STORE, DSP/audio/CPU, MIDI output, commercial preset audit or live REA run.'],
 usageFinding:{legacyInputText:"undefined was displayed when no type label was present",fix:"Explicit retained-base-state label; no type is inferred and SYX bytes remain unchanged",regression:"All generated historical and profile-test guides reject undefined/NaN"},
 deviceIO:false,newHardwareMeasurements:false,newREAInvocation:false};
const output=path.join(root,'docs/fm3/parameter-evidence/point2-output-replay.json');
if(process.argv.length===3&&process.argv[2]==='--write')fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else if(process.argv.length===2)assert.deepEqual(JSON.parse(fs.readFileSync(output)),report,'Point-2 evidence stale');
else throw Error('Usage: point2-evidence.mjs [--write]');
console.log(JSON.stringify({passed:true,tests:tests.length,bundles:results['test-output-replay'].bundles,exampleByteReplays:results['test-example-bundles'].byteIdenticalAndVerified,deviceIO:false}));
