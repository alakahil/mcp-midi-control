// Read-only preset validation. This experiment never synthesizes a SYX input.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url));
const engine=path.resolve(here,'../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const packed=fs.existsSync(path.join(here,'vendor/fm3-prototype.mjs'));
const {inspectStructure}=await import(pathToFileURL(packed?path.join(here,'vendor/fm3-prototype.mjs'):path.join(engine,'scripts/drive-collector/fm3-prototype.mjs')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const PLAN_SHA='6ffbd745f9792665a2eab52997da5e80c46b9e9a1cd9145a610a8a47695f5cb2';
const planBytes=fs.readFileSync(path.join(here,'plan.json'));
assert.equal(sha(planBytes),PLAN_SHA,'Experiment plan changed');
const plan=JSON.parse(planBytes);
const baseBytes=fs.readFileSync(packed?path.join(here,'BASELINE.syx'):path.join(engine,'examples/FM3_MOD_MIN_2p50_export.syx'));
assert.equal(sha(baseBytes),plan.baselineSha256,'Unrecognized baseline file');
const base=inspectStructure(baseBytes),body=Buffer.from(base.raw.body);
assert.equal(sha(body),plan.baselineBodySha256,'Baseline body changed');
assert.deepEqual([1538,1580,1582,1600,1602,1618,10132,10174,10176].map(o=>body.readUInt16LE(o)),[3,25,1,94,5,0,94,25,4]);
const words=(b,o,n)=>Array.from({length:n},(_,i)=>b.readUInt16LE(o+2*i));
export function baseline(){return {planSha256:PLAN_SHA,syxSha256:sha(baseBytes),bodySha256:sha(body),
  modWords:words(body,1584,25),wahWords:words(body,10178,100),target:plan.target};}
export function finalCheck(bytes,report){
 assert.equal(report.steps.length,plan.steps.length,'Incomplete experiment');
 assert.ok(report.steps.every(s=>s.status==='captured'),'Unverified step');
 assert.deepEqual(report.steps.map(s=>({id:s.id,pid:s.pid,operation:s.operation,inputBits:s.inputBits})),
  plan.steps.map(s=>({id:s.id,pid:s.pid,operation:s.operation,inputBits:s.inputBits})),'Wrong experiment');
 assert.equal(report.lastVerifiedWords.length,25,'Wrong final vector');
 const got=inspectStructure(bytes),b=Buffer.from(got.raw.body),expected=Buffer.from(body);
 for(const pid of new Set(plan.steps.map(s=>s.pid)))expected.writeUInt16LE(report.lastVerifiedWords[pid],1584+2*pid);
 assert.deepEqual(words(b,1584,25),report.lastVerifiedWords,'Export disagrees with independent raw GET');
 assert.deepEqual(b,expected,'Unexpected whole-preset body change');
 const headChanges=[];
 for(let i=0;i<76;i++)if(base.raw.rawPatch[i]!==got.raw.rawPatch[i])headChanges.push(i);
 assert.ok(headChanges.every(i=>[4,5,74,75].includes(i)),'Unrelated raw-header change');
 assert.ok(got.raw.rawPatch.slice(76+got.raw.compSize).every(v=>v===0),'Nonzero padding');
 // Transport location/header is reported separately; it is not sound data.
 const dumpHeaderEqual=Buffer.from(base.parsed.headerPayload).equals(Buffer.from(got.parsed.headerPayload));
 return {status:'full-body-and-raw-get-match',sha256:sha(bytes),bodySha256:sha(b),
  frameChecksums:true,presetCrc:true,footer:true,allUnrequestedBodyBytesPreserved:true,
  finalModWords:words(b,1584,25),rawHeaderChangedOffsets:headChanges,dumpHeaderEqual,
  baselineDumpHeader:Array.from(base.parsed.headerPayload),exportDumpHeader:Array.from(got.parsed.headerPayload),
  permanentStoreTested:false,fullRangeEncodingProven:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{
 const [cmd,folder]=process.argv.slice(2);
 if(cmd==='baseline')console.log(JSON.stringify(baseline()));
 else if(cmd==='final')console.log(JSON.stringify(finalCheck(fs.readFileSync(path.join(folder,'FM3_MOD_HW_FINAL_export.syx')),
  JSON.parse(fs.readFileSync(path.join(folder,'report.json'))))));
 else throw Error('Use baseline | final SESSION');
}catch(e){console.error(e.message);process.exitCode=2;}
