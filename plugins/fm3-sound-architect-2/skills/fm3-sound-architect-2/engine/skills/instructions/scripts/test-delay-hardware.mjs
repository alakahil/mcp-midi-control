import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './delay-collector/fm3-prototype.mjs';
const read=n=>fs.readFileSync(new URL('../examples/'+n,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const generated=read('FM3_DELAY_ABCD_TEST.syx'),returned=read('FM3_DELAY_ABCD_TEST_export.syx');
const a=inspectStructure(generated),b=inspectStructure(returned);
assert.deepEqual(Buffer.from(a.raw.body),Buffer.from(b.raw.body),'Full body must match without normalization');
assert.deepEqual(a.parsed.headerPayload,b.parsed.headerPayload);
const headerChanges=[];
for(let i=0;i<72;i++)if(a.raw.rawPatch[i]!==b.raw.rawPatch[i]){
 assert.ok(i===4||i===5||(i>=8&&i<39),'Unexpected header difference at '+i);
 headerChanges.push({offset:i,before:a.raw.rawPatch[i],after:b.raw.rawPatch[i],field:i<6?'CRC':'presetName'});
}
const name=r=>Buffer.from(r.raw.rawPatch).subarray(8,39).toString('ascii').replace(/\0.*$/s,'').trimEnd();
assert.equal(name(a),'JB YDOM RHYTHM');assert.equal(name(b),'FM3_DELAY_ABCD_TEST_export');
const expected=JSON.parse(read('FM3_DELAY_ABCD_TEST.validation.json'));
const channels=expected.channels.map(c=>{
 const start=7392+'ABCD'.indexOf(c.channel)*178;
 const words=Array.from({length:89},(_,i)=>Buffer.from(b.raw.body).readUInt16LE(start+2*i));
 assert.deepEqual(words,c.words);assert.equal(words[6],c.binaryId);
 return {channel:c.channel,type:c.type,binaryId:c.binaryId,all89WordsPreserved:true};
});
const report={date:'2026-10-06',generatedSha256:sha(generated),hardwareExportSha256:sha(returned),fullFilesIdentical:generated.equals(returned),bodyBytes:14222,changedBodyOffsets:[],channels,presetNameChange:{before:name(a),after:name(b),beforeHex:Buffer.from(a.raw.rawPatch).subarray(8,39).toString('hex'),afterHex:Buffer.from(b.raw.rawPatch).subarray(8,39).toString('hex')},headerChanges,checks:{frameChecksums:true,presetCrc:true,footerChecksum:true,entireBodyIdenticalWithoutNormalization:true,all356DelayWordsPreserved:true,scenesAndBypassPreserved:true,dumpHeaderPreserved:true,rawHeaderChangesOnlyNameAndCrc:true},scope:'Hardware roundtrip verified for this ABCD specimen; 108 general type/channel combinations are offline tested only. No audio or CPU assessment.'};
fs.writeFileSync(new URL('../../../docs/FM3_DELAY_HARDWARE_ROUNDTRIP.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bodyBytes:report.bodyBytes,changedBodyOffsets:[],channels,nameChange:report.presetNameChange,checks:report.checks}));
