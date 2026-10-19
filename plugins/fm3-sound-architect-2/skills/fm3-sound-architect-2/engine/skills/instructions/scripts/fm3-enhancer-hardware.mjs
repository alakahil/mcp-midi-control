// Device proof applies only to this returned complete body and submitted file.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(v,m)=>{if(!v)throw Error(m)};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export const enhancerRoundtrip=Object.freeze({generatedFile:'examples/FM3_ENHANCER_ABCD_TEST.syx',generatedSha256:'a545aa8bb7f659b10dc2a7beb4a902e1377bbeef995381d2dc6ece55ef14965b',exportFile:'examples/FM3_ENHANCER_ABCD_TEST_export.syx',exportSha256:'463aaf84ce2bafc4f531f03b6d1af6c441ec98028bc5a1767d90111062f32edf',bodySha256:'0dd583acf671f1c556b8d676415456ad2412a05acb8b9b2400f93dbedddec728'});
export const enhancerFeedbackHash='2e4cdc717ac8d83b6ff8b638af270ff35ce52e5e7d515aafa1ef07dcffba1165';
export function enhancerFeedback(){const bytes=read('references/enhancer-feedback-20261012/feedback.json');check(sha(bytes)===enhancerFeedbackHash,'Enhancer feedback changed; revalidate');return JSON.parse(bytes);}
export function verifyEnhancerRoundtrip(){
 const generated=read(enhancerRoundtrip.generatedFile),exported=read(enhancerRoundtrip.exportFile);
 check(sha(generated)===enhancerRoundtrip.generatedSha256&&sha(exported)===enhancerRoundtrip.exportSha256,'Enhancer roundtrip source changed');
 const a=inspectStructure(generated),b=inspectStructure(exported),body=Buffer.from(b.raw.body);
 check(body.length===13804&&body.equals(Buffer.from(a.raw.body))&&sha(body)===enhancerRoundtrip.bodySha256,'Enhancer entire body mismatch');
 check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'Enhancer dump header differs');
 check(a.parsed.chunkPayloads.length===b.parsed.chunkPayloads.length&&a.parsed.chunkPayloads.every((c,i)=>Buffer.from(c).subarray(0,2).equals(Buffer.from(b.parsed.chunkPayloads[i]).subarray(0,2))),'Enhancer chunk prefix differs');
 for(let i=0;i<76;i++)if(i!==4&&i!==5)check(a.raw.rawPatch[i]===b.raw.rawPatch[i],'Enhancer unrelated header differs at '+i);
 for(const s of [a,b]){const raw=Buffer.from(s.raw.rawPatch);check(raw.readUInt16LE(72)===13804&&raw.readUInt16LE(74)===s.raw.compSize&&raw.subarray(76+s.raw.compSize).every(v=>v===0),'Enhancer encoded sizes/padding mismatch');}
 return {generated,exported,a,b,body,feedback:enhancerFeedback()};
}
export function matchEnhancerDeviceBody(body,syx){
 if(sha(body)!==enhancerRoundtrip.bodySha256)return null;
 const proof=verifyEnhancerRoundtrip();check(body.equals(proof.body),'Enhancer full-body mismatch');
 return {effectId:122,file:enhancerRoundtrip.exportFile,sha256:enhancerRoundtrip.exportSha256,bodySha256:enhancerRoundtrip.bodySha256,submittedFileConfirmed:!!syx&&sha(syx)===enhancerRoundtrip.generatedSha256,
 scope:'Every unnormalised body byte matches the actual Enhancer A-D import/export. Submitted-file confirmation applies only to the original generated hash.',
 cpu:'User observed a maximum of 52.7% for this specimen (2026-10-12); not a universal maximum.',audio:'User reports Enhancer works (2026-10-12).',display:'All 48 Enhancer words and all other body bytes preserved in export. No individual screen observation claimed for every value.'};
}
