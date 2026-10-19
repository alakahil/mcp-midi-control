// Exact user-returned specimen. Do not transfer its proof to new compositions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(v,m)=>{if(!v)throw Error(m)};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export const geqRoundtrip=Object.freeze({generatedFile:'examples/FM3_GEQ_ABCD_TEST.syx',generatedSha256:'adf176e949c0645031775a5eeaaa68b1bcdabc36adb238a413848c832e0fff8b',exportFile:'examples/FM3_GEQ_ABCD_TEST_export.syx',exportSha256:'1663e891e6bc1a7cb89a1bc0540a48ce8d61527911267682bc3082bf06e70c3e',bodySha256:'9fe63e3567565cf6e99468919fe1aa2488785835c929ba8b8b806010c2b2d770'});
export const geqFeedbackHash='5a5d66bf43a5e2f9ca82380741a05f8d1f0d430700e572dc49b74e198fbc6bb8';
export function geqDisplayEvidence(){
 const bytes=read('references/geq-feedback-20261011/feedback.json');check(sha(bytes)===geqFeedbackHash,'GEQ feedback changed; revalidate');
 const feedback=JSON.parse(bytes);check(sha(read(feedback.screenshot.file))===feedback.screenshot.sha256,'GEQ screenshot changed');return feedback;
}
export function verifyGeqRoundtrip(){
 const generated=read(geqRoundtrip.generatedFile),exported=read(geqRoundtrip.exportFile);
 check(sha(generated)===geqRoundtrip.generatedSha256&&sha(exported)===geqRoundtrip.exportSha256,'GEQ roundtrip source changed');
 const a=inspectStructure(generated),b=inspectStructure(exported),body=Buffer.from(b.raw.body);
 check(body.length===13662&&body.equals(Buffer.from(a.raw.body))&&sha(body)===geqRoundtrip.bodySha256,'GEQ entire body mismatch');
 check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'GEQ dump header differs');
 check(a.parsed.chunkPayloads.length===b.parsed.chunkPayloads.length&&a.parsed.chunkPayloads.every((c,i)=>Buffer.from(c).subarray(0,2).equals(Buffer.from(b.parsed.chunkPayloads[i]).subarray(0,2))),'GEQ chunk prefix differs');
 for(let i=0;i<76;i++)if(i!==4&&i!==5)check(a.raw.rawPatch[i]===b.raw.rawPatch[i],'GEQ unrelated header differs at '+i);
 for(const s of [a,b]){const raw=Buffer.from(s.raw.rawPatch);check(raw.readUInt16LE(72)===13662&&raw.readUInt16LE(74)===s.raw.compSize&&raw.subarray(76+s.raw.compSize).every(v=>v===0),'GEQ encoded sizes/padding mismatch');}
 return {generated,exported,a,b,body,feedback:geqDisplayEvidence()};
}
export function matchGeqDeviceBody(body,syx){
 if(sha(body)!==geqRoundtrip.bodySha256)return null;
 const proof=verifyGeqRoundtrip();check(body.equals(proof.body),'GEQ full-body mismatch');
 return {file:geqRoundtrip.exportFile,sha256:geqRoundtrip.exportSha256,bodySha256:geqRoundtrip.bodySha256,submittedFileConfirmed:!!syx&&sha(syx)===geqRoundtrip.generatedSha256,
 scope:'Every unnormalised body byte matches the actual GEQ A-D import/export. Submitted-file confirmation applies only to the original generated hash.',
 cpu:'User observed a maximum of 50% for this specimen; screenshot shows 49.4%. Not a universal maximum.',audio:'User reports GEQ worked (2026-10-11).',display:'Scene4 / GEQ C screenshot confirms 7 Band Constant Q, bands 100/200/400/800/1600/3200/6400 Hz, gains, Q0.80, balance0, Thru and Level display -0.7 dB. Other channels are preserved in the export; their intermediate screen values were not individually pictured.'};
}
