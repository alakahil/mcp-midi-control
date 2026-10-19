// Exact supplied specimen only. A new composition must not inherit this proof.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export const peqFullRoundtrip=Object.freeze({generatedFile:'examples/FM3_PEQ_ABCD_TEST.syx',generatedSha256:'a94e6fe3cc4b0f76434b56b93809c15f973810ee1635cdc91f87153e604395da',exportFile:'examples/FM3_PEQ_ABCD_TEST_export.syx',exportSha256:'b4794f55fe14565029ebaca6f2e9d7cac39572b5d33bcc0a2c9802e5cc6a6c5b',bodySha256:'e78189a469c6cfe436bd586715e3d4cc6a91dd4b1539b90f5da9a8b20482df46'});
export function verifyPeqFullRoundtrip(){
 const generated=read(peqFullRoundtrip.generatedFile),exported=read(peqFullRoundtrip.exportFile);
 check(sha(generated)===peqFullRoundtrip.generatedSha256&&sha(exported)===peqFullRoundtrip.exportSha256,'PEQ A–D roundtrip source changed');
 const a=inspectStructure(generated),b=inspectStructure(exported),body=Buffer.from(b.raw.body);
 check(body.length===13456&&body.equals(Buffer.from(a.raw.body))&&sha(body)===peqFullRoundtrip.bodySha256,'PEQ A–D roundtrip body differs');
 check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'PEQ A–D dump header differs');
 check(a.parsed.chunkPayloads.length===b.parsed.chunkPayloads.length&&a.parsed.chunkPayloads.every((c,i)=>Buffer.from(c).subarray(0,2).equals(Buffer.from(b.parsed.chunkPayloads[i]).subarray(0,2))),'PEQ A–D chunk prefix differs');
 for(let i=0;i<76;i++)if(i!==4&&i!==5)check(a.raw.rawPatch[i]===b.raw.rawPatch[i],'PEQ A–D unrelated header differs');
 for(const s of [a,b]){const raw=Buffer.from(s.raw.rawPatch);check(raw.readUInt16LE(72)===13456&&raw.readUInt16LE(74)===s.raw.compSize&&raw.subarray(76+s.raw.compSize).every(v=>v===0),'PEQ A–D size/padding mismatch');}
 return {body,generated,exported,a,b};
}
export function matchPeqFullDeviceBody(body,syx){
 if(sha(body)!==peqFullRoundtrip.bodySha256)return null;
 const proof=verifyPeqFullRoundtrip();check(body.equals(proof.body),'PEQ A–D entire body mismatch');
 const submittedFileConfirmed=!!syx&&sha(syx)===peqFullRoundtrip.generatedSha256;
 return {file:peqFullRoundtrip.exportFile,sha256:peqFullRoundtrip.exportSha256,bodySha256:peqFullRoundtrip.bodySha256,submittedFileConfirmed,scope:'Every unnormalised body byte matches the actual A–D import/export. Exact submitted-file status applies only to the original SYX hash.',cpu:'User observed 47–48% for this specimen; not a maximum for other compositions',audio:'No explicit listening verdict supplied for this specimen',display:'User confirmed Blocking has no Q control; other intermediate screen values not explicitly reported'};
}
