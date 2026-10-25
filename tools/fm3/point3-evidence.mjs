// Exact, repeatable software proof for audit point 3. No hardware/REA execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const tests=['test-parameter-domain','test-parameter-map'];
const results=Object.fromEntries(tests.map(t=>[t,JSON.parse(execFileSync(process.execPath,[path.join(root,prefix,'scripts',t+'.mjs')],{encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024}).trim())]));
for(const result of Object.values(results))assert.equal(result.passed,true);
const sources=['tools/fm3/point3-index.py','tools/fm3/point3-evidence.mjs',...['fm3-table-encoder.mjs','fm3-parameter-map.mjs',...tests.map(t=>t+'.mjs')].map(p=>prefix+'scripts/'+p),'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_PARAMETER_EVIDENCE.json'];
const report={schemaVersion:1,version:'0.3.24',auditPoint:3,
 scope:'Finite preset-word codec conformance and evidence-linked parameter map; not a device range measurement, DSP model or expanded write permission',
 sources:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),
 baseline:{version:'0.3.23',commit:'b2c677831fdb664def04a48aeeca104c6e603db3',reproducedGaps:['Negative raw word extrapolated','String raw word coerced into a number','Normalized raw 65535 extrapolated beyond display maximum','Chorus Voices raw 65535 displayed 131070','Unknown Ten-Tap curve decoded as linear','Non-string enum object coerced to a label']},
 results,limits:['2101 scalar descriptors include global and metadata-only fields; scalar conformance is not public preset support.',
  'Catalogue-only keys, unknown curves, hidden controls and global writes remain unsupported.',
  '5275 checked device labels retain the two unrequested final words of 1-based Pitch lists; labels do not establish numeric scales.',
  'All 36 catalogue/display-range differences remain explicit source claims; canonical Cab input is 0..10, historical percent is 0..100.',
  'No new device import, STORE, live SET, audio/CPU, commercial preset audit, REA or Ghidra invocation.'],
 deviceIO:false,newHardwareMeasurements:false,newREAInvocation:false};
const target=path.join(root,'docs/fm3/parameter-evidence/point3-parameter-map.json');
if(process.argv.length===3&&process.argv[2]==='--write')fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
else if(process.argv.length===2)assert.deepEqual(JSON.parse(fs.readFileSync(target)),report,'Point-3 evidence stale');
else throw Error('Usage: point3-evidence.mjs [--write]');
console.log(JSON.stringify({passed:true,tests:tests.length,results,deviceIO:false}));
