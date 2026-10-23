// Research only: reencode in memory, return JSON evidence, never a preset buffer.
// No device/network I/O. This is outside and not imported by the shipped engine.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {auditModifiers} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-modifier-audit.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
export const fixtureRoot = new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/examples/',import.meta.url);
export const fixtures = Object.freeze([
  ['DAMPING_LINEAR','f2d59758cbe24ef1bd38453968d2b2f974e3da64424fae23cedb190f2162fc5d',0,65534],
  ['MIN_2p50','11fcb7084d099429f845d7ef27b31d6bd74fa3883cfd5dec27424d771a5cdf13',16375,65534],
  ['BATCH_A','7377e1494af98b181fc0557f3d66e57c532693bc2332a2212a2cbe4feb730ecb',16375,49159],
  ['BATCH_B','c6d460678803699e245ac7d13e777afd6993efc0e704508e4ac1995e77fe1b63',16375,49159],
  ['MAX_5p00','f4f632c005540a3f759a3960837aef70dc1e562bdb060e7671e8ebe3d1ea285f',16375,32784],
].map(([name,sha256,min,max]) => Object.freeze({file:`FM3_MOD_${name}_export.syx`,sha256,min,max})));
export const requests = Object.freeze([
  {policy:'exact-wah-cent-v1',min:'2.50'},
  {policy:'exact-wah-cent-v1',max:'7.50'},
  {policy:'exact-wah-cent-v1',max:'5.00'},
  {policy:'exact-wah-cent-v1',min:'2.50',max:'7.50'},
  {policy:'exact-wah-cent-v1',min:'0.00',max:'10.00'},
  {policy:'exact-wah-cent-v1',min:'6.46',max:'10.00'},
  {policy:'exact-wah-cent-v1',min:'0.00',max:'6.48'},
].map(Object.freeze));
const receiptUrl = new URL('../../docs/fm3/parameter-evidence/modifier-minmax-syxdiff-audit.json',import.meta.url);
const differences = (a,b) => Array.from({length:Math.max(a.length,b.length)},(_,offset) =>
  ({offset,before:a[offset]??null,after:b[offset]??null})).filter(d=>d.before!==d.after);
const encode = (source,parsed,body) => Buffer.from(reencodeDumpFromRawPatch(source,
  reencodeRawPatch(parsed.raw.rawPatch,body)));

function plan(request) {
  const script=request?.policy==='exact-wah-cent-fw13-hw1'?'./modifier_minmax_hw_candidate.py':'./modifier_minmax_plan.py';
  const run=spawnSync('python3',[fileURLToPath(new URL(script,import.meta.url))],
    {input:JSON.stringify([request]),encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(run.status,0,run.error?.message??run.stderr);
  return JSON.parse(run.stdout)[0];
}

function sourceContext(source) {
  assert.ok(Buffer.isBuffer(source),'Expected a SYX Buffer');
  const fixture=fixtures.find(f=>f.sha256===sha(source));
  assert.ok(fixture,'Unrecognized source; only five pinned captures are in scope');
  const parsed=inspectStructure(source),body=Buffer.from(parsed.raw.body),audit=auditModifiers(source);
  const m=audit.modifiers[0];
  // Independent coordinates, rather than trusting an offset returned by a reader.
  assert.equal(body.readUInt16LE(1538),3);
  assert.equal(body.readUInt16LE(1580),25);
  assert.equal(body.readUInt16LE(1582),1);
  assert.deepEqual([m.offset,m.source,m.effectId,m.pid,m.channel,m.secondarySource,m.operation],
    [1584,14,94,5,0,0,0]);
  assert.deepEqual([body.readUInt16LE(1586),body.readUInt16LE(1588)],[fixture.min,fixture.max]);
  assert.equal(audit.contextScan.status,'complete');
  assert.deepEqual(m.issues,[]);
  assert.deepEqual(audit.overlappingTargets,[]);
  assert.equal(m.targetContext.recordPresence,'present');
  assert.equal(m.targetContext.gridPresence,'present');
  return {fixture,parsed,body,audit};
}

// Read-only verifier exposed for adversarial tests; request is revalidated here.
// It accepts a candidate buffer but cannot return or create one.
export function verifyMemoryDiff(source,candidate,request) {
  const {fixture,parsed:before,body,audit}=sourceContext(source),p=plan(request);
  const expected=Buffer.from(body);
  for(const change of p.changes) expected.writeUInt16LE(change.raw,change.bodyOffset);
  const after=inspectStructure(candidate),nextBody=Buffer.from(after.raw.body);
  assert.deepEqual(nextBody,expected,'Unrequested body change or wrong requested word');
  const nextAudit=auditModifiers(candidate);
  assert.deepEqual(nextAudit.checks,audit.checks);
  // Recheck all context, scenes, other records and retained words via whole body
  // equality above, then separately verify the target reader's interpretation.
  assert.deepEqual(nextAudit.modifiers[0].targetContext,audit.modifiers[0].targetContext);
  assert.deepEqual(nextAudit.modifiers[0].targetApplicability,audit.modifiers[0].targetApplicability);
  assert.deepEqual(nextAudit.overlappingTargets,[]);
  assert.deepEqual(nextAudit.modifiers[0].issues,[]);
  assert.deepEqual(after.parsed.headerPayload,before.parsed.headerPayload);
  assert.equal(after.raw.rawPatch.length,before.raw.rawPatch.length);
  const headerChanges=differences(before.raw.rawPatch.slice(0,76),after.raw.rawPatch.slice(0,76));
  assert.ok(headerChanges.every(d=>[4,5,74,75].includes(d.offset)),'Unrelated raw header change');
  for(const raw of [before.raw,after.raw])
    assert.ok(raw.rawPatch.slice(76+raw.compSize).every(v=>v===0),'Nonzero raw padding');
  const bodyChanges=differences(body,nextBody);
  if(!bodyChanges.length) assert.deepEqual(candidate,source,'No-op must preserve exact input bytes');
  return {fixture:fixture.file,inputSha256:sha(source),candidateSha256:sha(candidate),
    candidateKind:'synthetic-in-memory-only; not device evidence',request,plan:p,
    beforeRaw:{min:fixture.min,max:fixture.max},
    afterRaw:{min:nextBody.readUInt16LE(1586),max:nextBody.readUInt16LE(1588)},
    bodyChanges,rawHeaderChanges:headerChanges,
    syxChangedByteCount:differences(source,candidate).length,
    checks:{exactRequestedBody:true,unrequestedWordsPreserved:true,targetAndScenesPreserved:true,
      unchangedInput:true,rawHeaderPreservedExceptCrcAndCompressionLength:true,paddingZero:true,
      frameChecksums:true,presetCrc:true,footer:true},
    deviceIO:false,presetFileWritten:false,deviceImportTested:false,
    runtimeModeAtStoreProven:false,fullRangeEncodingProven:false,generatorWriteSupportAdded:false};
}

export function compareCandidate(source,request) {
  const original=Buffer.from(source),{parsed,body}=sourceContext(source),p=plan(request);
  const proposed=Buffer.from(body);
  for(const change of p.changes) proposed.writeUInt16LE(change.raw,change.bodyOffset);
  const candidate=proposed.equals(body)?Buffer.from(source):encode(source,parsed,proposed);
  const report=verifyMemoryDiff(source,candidate,request);
  assert.deepEqual(source,original,'Input buffer mutated');
  return report; // Deliberately do not expose the generated SYX buffer.
}

export function buildAudit() {
  const cases=[],compressionControls=[];
  for(const fixture of fixtures) {
    const source=fs.readFileSync(new URL(fixture.file,fixtureRoot));
    const {parsed,body}=sourceContext(source);
    const repacked=encode(source,parsed,body),roundtrip=inspectStructure(repacked);
    assert.deepEqual(Buffer.from(roundtrip.raw.body),body);
    compressionControls.push({fixture:fixture.file,inputSha256:sha(source),
      noEditRepackedSha256:sha(repacked),noEditRepackedSyxChangedBytes:differences(source,repacked).length,
      decompressedBodyUnchanged:true});
    for(const request of requests) cases.push(compareCandidate(source,request));
    assert.equal(sha(fs.readFileSync(new URL(fixture.file,fixtureRoot))),fixture.sha256);
  }
  return {schemaVersion:1,date:'2026-10-22',productionVersion:'0.3.13',
    method:'Python exact-input mode-consensus plans; existing codec reencoding in memory; full body and envelope verification',
    target:{record:0,source:14,effectId:94,pid:5,channel:0,channelScope:'ALL',
      minBodyOffset:1586,maxBodyOffset:1588,storage:'uint16-le'},
    fixtureCount:fixtures.length,caseCount:cases.length,compressionControls,cases,
    newPhysicalExports:0,newReaDecompilation:false,presetFilesWritten:0,
    fullRangeEncodingProven:false,runtimeModeAtStoreProven:false,generatorWriteSupportAdded:false,
    limits:['Only five pinned captures and explicit exact-wah-cent-v1 requests.',
      'A request is not inferred from a historical display label; unrequested raw words are retained.',
      '6.47 rejected by mode consensus; packet input and live MODE1 have not been measured.',
      'A checksum-valid roundtrip does not prove device import, DSP, pedal, audio, CPU, or UI display.',
      'Recompression changes serialized bytes beyond the two raw fields; full decompressed body is checked.']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    assert.ok(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--write','Only --write (JSON audit) is supported');
    const audit=buildAudit();
    if(process.argv[2]==='--write') fs.writeFileSync(receiptUrl,JSON.stringify(audit,null,2)+'\n');
    else assert.deepEqual(JSON.parse(fs.readFileSync(receiptUrl,'utf8')),audit,'Stale SYX diff audit');
    console.log(JSON.stringify({fixtures:audit.fixtureCount,cases:audit.caseCount,
      compressionControls:audit.compressionControls,presetFilesWritten:0}));
  } catch(error) {console.error(error.message);process.exitCode=2;}
}
