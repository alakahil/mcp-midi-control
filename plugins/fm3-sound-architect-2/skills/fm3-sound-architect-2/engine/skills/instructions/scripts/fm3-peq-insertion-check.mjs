// Read-only preflight for the FIRST user-created PEQ specimen. No device I/O.
// Parsing a record does not establish parameter semantics or writing support.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';

export const PEQ_BASE_SHA256='0a17b54fcee104887b6707b29ae34ea7bec6e049a341c1ec8e77ec75c7b68683';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error(message)};
const definitions=[[58,144,4],[62,106,4],[70,89,4],[186,6,1],[182,2,1],[114,37,4],[118,44,4],[37,10,4],[42,26,4],[66,71,4]];
const start=4610,gridOffset=408,peqId=54;
function record(body,at){
  check(at+46<=body.length,'Truncated block header');
  const eid=body.readUInt16LE(at),words=body.readUInt16LE(at+42),channels=body.readUInt16LE(at+44);
  check(words>=1&&words<=512&&channels>=1&&channels<=4,'Unexpected record dimensions; manual review required');
  const end=at+46+2*words*channels;check(end<=body.length,'Truncated block parameters');
  return {eid,words,channels,at,end,bytes:body.subarray(at,end)};
}
export function checkPeqInsertion(base,exported){
  check(sha(base)===PEQ_BASE_SHA256,'Use unchanged JB_EIGHT_SCENES_V3.syx as baseline');
  const a=inspectStructure(base),b=inspectStructure(exported),before=Buffer.from(a.raw.body),after=Buffer.from(b.raw.body);
  check(a.parsed.chunkPayloads.length===b.parsed.chunkPayloads.length,'Chunk count changed');
  for(let i=0;i<a.parsed.chunkPayloads.length;i++)check(Buffer.from(a.parsed.chunkPayloads[i]).subarray(0,2).equals(Buffer.from(b.parsed.chunkPayloads[i]).subarray(0,2)),'Chunk prefix changed at '+i);
  check(before.length===13146,'Unexpected V3 body');
  check(before.readUInt16LE(gridOffset)===1029&&before.readUInt16LE(gridOffset+2)===2,'Unexpected V3 slot');
  check(after[0]===1,'Select Scene 2 before export');
  const prefix=Buffer.from(after.subarray(0,start));
  check(prefix.length===start&&prefix.readUInt16LE(gridOffset)===peqId,'Expected PEQ 1 at row 2, column 10');
  // Restore exactly the declared grid word. No other prefix normalization.
  prefix.writeUInt16LE(1029,gridOffset);
  check(prefix.equals(before.subarray(0,start)),'Unrelated prefix, routing, scene, controller or modifier change');
  const baseRecords=[];let oldAt=start;
  for(const [eid,words,channels] of definitions){const r=record(before,oldAt);check(r.eid===eid&&r.words===words&&r.channels===channels,'Unexpected pinned V3 record');baseRecords.push(r);oldAt=r.end;}
  check(oldAt===9302,'Unexpected pinned V3 system tail');
  let at=start,oldIndex=0,peq=null;const observed=[];
  for(let i=0;i<definitions.length+1;i++){
    const r=record(after,at);observed.push({eid:r.eid,offset:r.at,wordsPerChannel:r.words,channels:r.channels});
    if(r.eid===peqId){check(!peq,'Duplicate PEQ record');check(r.channels===4,'Expected four PEQ channels; manual review required');peq=r;}
    else {const expected=baseRecords[oldIndex++];check(expected&&r.eid===expected.eid,'Unexpected block or original block order change');check(r.bytes.equals(expected.bytes),'Existing block changed: '+r.eid);}
    at=r.end;
  }
  check(peq&&oldIndex===definitions.length,'Require exactly one new PEQ record');
  check(after.subarray(at).equals(before.subarray(oldAt)),'System tail or extra block changed');
  check(after.length===before.length+peq.bytes.length,'Unexpected body length');
  const sceneChannels=[],sceneBypass=[];
  for(let s=0;s<8;s++){const ch=peq.bytes.readUInt16LE(10+2*s),bp=peq.bytes.readUInt16LE(26+2*s);check(ch<=3&&bp<=1,'Invalid PEQ scene fields');sceneChannels.push('ABCD'[ch]);sceneBypass.push(bp===1);}
  check(sceneChannels[1]==='A'&&sceneBypass[1],'PEQ must use channel A and be bypassed in Scene 2');
  const reconstructed=Buffer.concat([after.subarray(0,peq.at),after.subarray(peq.end)]);reconstructed.writeUInt16LE(1029,gridOffset);
  check(reconstructed.equals(before),'Full V3 reconstruction failed');
  check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'Dump header changed');
  const rawA=Buffer.from(a.raw.rawPatch),rawB=Buffer.from(b.raw.rawPatch),headerChanges=[];
  for(let i=0;i<76;i++)if(rawA[i]!==rawB[i]){
    const field=i===4||i===5?'CRC':i>=8&&i<40?'presetName':i>=72&&i<76?'encodedSize':null;
    check(field,'Unrelated raw header changed at '+i);headerChanges.push({offset:i,field,before:rawA[i],after:rawB[i]});
  }
  for(const r of [a,b]){const raw=Buffer.from(r.raw.rawPatch);check(raw.readUInt16LE(72)===r.raw.body.length&&raw.readUInt16LE(74)===r.raw.compSize,'Encoded size mismatch');check(raw.subarray(76+r.raw.compSize).every(x=>x===0),'Nonzero padding');}
  return {checker:'peq-insertion-preflight-0.1.0',status:'structure-only',baseSha256:sha(base),exportSha256:sha(exported),bodySha256:sha(after),baseBodyBytes:before.length,bodyBytes:after.length,
    presetName:{before:a.decoded.preset_name,after:b.decoded.preset_name,beforeRawHex:rawA.subarray(8,40).toString('hex'),afterRawHex:rawB.subarray(8,40).toString('hex')},selectedScene:2,
    peq:{candidateEffectId:peqId,row:2,column:10,offset:peq.at,recordBytes:peq.bytes.length,wordsPerChannel:peq.words,channels:peq.channels,sceneChannels,sceneBypass,parameterWords:Array.from({length:peq.words*peq.channels},(_,i)=>peq.bytes.readUInt16LE(46+2*i)),parameterSemantics:'Unverified; do not infer from table labels or neutral appearance'},
    records:observed,headerChanges,checks:{frameChecksums:true,presetCrc:true,footer:true,chunkPrefixesPreserved:true,encodedSizesAndPadding:true,onlyDeclaredGridWordChanged:true,allOriginalRecordsAndSystemBytesPreserved:true,all13146V3BytesReconstructed:true},
    generatorSupport:false,parameterPairVerified:false,audio:'Not assessed by this check',next:'Inspect the actual PEQ record and user settings, then prepare a separately confirmed read-only GET/SYX pair. No automatic device query.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {const [file,...rest]=process.argv.slice(2);check(file&&!rest.length,'Usage: node fm3-peq-insertion-check.mjs USER_PEQ_BASELINE.syx');
    const base=fs.readFileSync(new URL('../examples/JB_EIGHT_SCENES_V3.syx',import.meta.url));
    console.log(JSON.stringify(checkPeqInsertion(base,fs.readFileSync(file)),null,2));
  } catch(e){console.error('PEATATUD: '+e.message);process.exitCode=1;}
}
