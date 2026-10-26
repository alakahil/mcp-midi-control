// Reproduce the point-6 software evidence; commercial presets are not inputs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {auditCorpus} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-corpus-audit.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const policy=JSON.parse(read(prefix+'references/fm3-insert-applicability.json'));
const test='scripts/test-point6-offline.mjs';
const tested=JSON.parse(execFileSync(process.execPath,[path.join(root,prefix,test)],{encoding:'utf8'}).trim());
assert.equal(tested.passed,true);
const corpus=auditCorpus(path.join(root,prefix));
const sources=['tools/fm3/point6-evidence.mjs','tools/fm3/insert_applicability.py','tools/fm3/point6_native_bindings.py',
 ...['references/fm3-point6-native-bindings.json','references/fm3-insert-applicability.json','references/fm3-param-dictionary.json',test,
 'scripts/test-controls-output.mjs','scripts/fm3-final-state.mjs','scripts/fm3-corpus-audit.mjs','scripts/fm3-insert-applicability.mjs','scripts/fm3-scene-midi.mjs',
 'scripts/fm3-modifier-type-audit.mjs','scripts/fm3-type-applicability.mjs','scripts/fm3-table-encoder.mjs'].map(p=>prefix+p)];
const report={schemaVersion:1,scope:'Audit point 6 bounded offline software conformance; no new device or REA execution',
 sources:Object.fromEntries(sources.map(p=>[p,sha(read(p))])),nativeMetadataSources:policy.sources,
 families:Object.fromEntries(Object.entries(policy.families).map(([name,f])=>[name,{
  parameters:Object.keys(f.parameters).length,selectorPid:f.selectorPid,typeLabels:f.typeLabels,
  parametersWithVisibleControls:Object.values(f.parameters).filter(p=>p.cases.length).length,
  excludedControls:f.excludedControls}])),tests:tested,corpus,
 remaining:['Hardware import/STORE/audio/CPU/MIDI-output behavior is not tested.',
  'MultiDelay dynamic feedback metadata remains unresolved; Mixer Delay 1-4 names are bound to native descriptors without scale promotion.',
  'MultiDelay metadata is read-only; no new insertion or scalar authoring is enabled.',
  'Unknown scalar curves remain gated; XML visibility is not a range measurement or proof of modifier support.',
  'Looper runtime actions remain unavailable through scalar preset controls.',
  'AustinBuddy Live Gold Tonepack was not accessible and is not included in this corpus.'],
 deviceIO:false,newHardwareMeasurements:false,newREAInvocation:false,commercialPresetContentsPublished:false};
const output=path.join(root,'docs/fm3/parameter-evidence/point6-offline.json');
if(process.argv.length===3&&process.argv[2]==='--write')fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else if(process.argv.length===2)assert.deepEqual(JSON.parse(fs.readFileSync(output)),report,'Point-6 evidence stale');
else throw Error('Usage: point6-evidence.mjs [--write]');
console.log(JSON.stringify({passed:true,...tested,corpus:{files:corpus.files,unique:corpus.uniqueSizedInputs,...corpus.summary},deviceIO:false}));
