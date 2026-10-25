// Replay existing evidence for slot planning. No allocation, preset writes or I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {readModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-parameter-dependencies.mjs';
const root=new URL('../../',import.meta.url),engine='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/';
const ref=engine+'skills/instructions/',sha=b=>createHash('sha256').update(b).digest('hex'),sources={};
const read=path=>{const b=fs.readFileSync(new URL(path,root));sources[path]=sha(b);return b;};
const observations=[];
for(const [file,source] of [['JB_RHYTHM_LEVEL_MINUS3_export.syx',14],['JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',0]]){
  const path=ref+'examples/'+file,bytes=read(path),before=sha(bytes),body=Buffer.from(inspectStructure(bytes).raw.body);
  const modifiers=readModifiers(body),first=modifiers[0];
  assert.equal(modifiers.length,32);assert.equal(first.offset,1584);
  assert.deepEqual([first.source,first.effectId,first.pid,first.channel],[source,94,5,0]);
  for(const m of modifiers){
    const start=1584+96*m.record;
    assert.equal(m.offset,start);
    assert.deepEqual([m.source,m.effectId,m.pid,m.channel,m.secondarySource,m.operation],
      [0,8,9,17,20,23].map(i=>body.readUInt16LE(start+2*i)));
  }
  const active=modifiers.filter(m=>m.active),bound=modifiers.filter(m=>!m.active&&m.effectId!==0);
  const unbound=modifiers.filter(m=>!m.active&&m.effectId===0);
  assert.deepEqual(unbound.map(m=>m.record),Array.from({length:31},(_,i)=>i+1));
  const words=Array.from({length:25},(_,i)=>body.readUInt16LE(first.offset+2*i));
  observations.push({path,inputSha256:before,serializedRecords:32,
    activeRecords:active.map(m=>m.record),inactiveBoundRecords:bound.map(m=>m.record),
    inactiveUnboundRecords:unbound.map(m=>m.record),firstRecordWords:words,
    inference:'Inactive/unbound describes stored words only; it is not an allocation or capacity guarantee.'});
  assert.equal(sha(bytes),before);
}
const binding=JSON.parse(read(ref+'references/fm3-volume-binding-evidence.json'));
assert.equal(binding.binding.record,0);assert.equal(binding.binding.offset,1584);assert.equal(binding.binding.wireEffect,3);
assert.deepEqual(binding.binding.previousWords,observations[1].firstRecordWords);
assert.equal(binding.binding.words.length,25);
const wordBytes=Buffer.alloc(50);binding.binding.words.forEach((v,i)=>wordBytes.writeUInt16LE(v,i*2));
assert.equal(sha(wordBytes),binding.capture.recordSha256);
assert.deepEqual([0,8,9,17].map(i=>binding.binding.words[i]),[14,102,0,0]);
const changed=binding.binding.words.flatMap((v,i)=>v===binding.binding.previousWords[i]?[]:[i]);
assert.deepEqual(changed,[0,8,9,10,15]);assert.deepEqual(changed,binding.changedWords);
const native=JSON.parse(read('docs/fm3/parameter-evidence/volume-pedal-static-audit.json'));
assert.equal(native.newREAAnalysis,false);assert.equal(native.deviceIO,false);
const names=['create-serializer-argument','assigned-modifier-id','send-pending-after-id'];
assert.ok(names.every(name=>native.findings.some(f=>f.name===name)));
read('tools/fm3/modifier_slot_readiness.mjs');
const report={schemaVersion:1,scope:'Existing pinned examples and one FW13 donor receipt; not a complete device/preset corpus.',
  sources,observations,volumeDonor:{record:0,wireEffect:3,offset:1584,changedWords:changed,
    captureSha256:binding.capture.sha256,recordSha256:binding.capture.recordSha256,
    allOtherBodyBytesPreserved:binding.checks.allOtherBodyBytesPreserved},
  priorNativeEvidence:{path:'docs/fm3/parameter-evidence/volume-pedal-static-audit.json',
    findings:native.findings.filter(f=>names.includes(f.name)),
    limit:'The editor requests a binding and receives an assigned ID; this does not resolve firmware allocation/default initialization.'},
  decision:{bothCurrentWritersUseRecord:0,inactiveUnboundSlotsAreNotProvenFree:true,
    simultaneousWahVolumeWriterSupported:false,arbitraryAllocationSupported:false,
    reason:'Both bounded writers use the same proven first record. Moving a donor to a second serialized record is not covered by either existing exact-body proof.'},
  nextOfflineQuestions:[
    'Locate firmware handling of assigned modifier IDs and second-record initialization using existing native evidence before requesting new captures.',
    'Establish removal/reuse semantics and whether the first active binding is preserved when another is created.',
    'Keep the two sources, target/channel overlap and global controller mapping explicit in any later allocation design.'
  ],checks:{passed:true,independentWordCoordinates:true,volumeRecordHash:true,baselineWordsMatch:true,inputPreserved:true},
  deviceIO:false,presetWrites:false,newHardwareMeasurements:false,newREAAnalysis:false};
const output=new URL('docs/fm3/parameter-evidence/modifier-slot-readiness.json',root);
if(process.argv.slice(2).length===1&&process.argv[2]==='--write')fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else{assert.equal(process.argv.length,2,'Only --write is supported');assert.deepEqual(JSON.parse(fs.readFileSync(output)),report,'Slot readiness evidence is stale');}
console.log(JSON.stringify({passed:true,output:fileURLToPath(output),sourceExamples:2,volumeDonors:1,serializedRecords:32,
  inactiveUnboundPerExample:31,allocationProven:false,deviceIO:false,newREAAnalysis:false}));
