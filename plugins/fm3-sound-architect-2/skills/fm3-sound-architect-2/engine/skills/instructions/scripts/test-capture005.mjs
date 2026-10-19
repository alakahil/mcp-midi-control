import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';import {generatePreset} from './fm3-generate.mjs';
import {decodeAmpGet,importAmpGet} from './fm3-amp-get.mjs';
const read=n=>fs.readFileSync(new URL('../references/'+n,import.meta.url));
const base=read('Baaspreset.syx'),donor=read('FM3_AMP_CAPTURE_005.syx'),report=read('FM3_AMP_GET_capture005.json');
const cap=decodeAmpGet(JSON.parse(report),13),lib=importAmpGet(base,report,donor,13,'FM3_AMP_GET_capture005.json','FM3_AMP_CAPTURE_005.syx');
assert.deepEqual(cap.channels.map(c=>c.modelId),[16,17,19,21]);
const b=inspect(base),d=inspect(donor),results=[];
for(const [i,c] of cap.channels.entries()){
 const r=generatePreset(base,{schemaVersion:1,firmware:13,name:'CAPTURE005 CHECK',ampModelB:c.name},lib),a=inspect(r.syx);
 assert.equal(a.decoded.blocks.find(x=>x.block==='Amp').channels.B.type,c.name);
 assert.deepEqual(a.raw.body.slice(4944,5232),d.raw.body.slice(4656+i*288,4656+(i+1)*288));
 for(let k=0;k<a.raw.body.length;k++)if(k<4944||k>=5232)assert.equal(a.raw.body[k],b.raw.body[k]);
 results.push({model:c.name,id:c.modelId,sourceChannel:c.channel,exactChannel:true,otherBodyBytesPreserved:true,checks:r.report.checks});
}
if(process.argv.includes('--report')){
 const sha=x=>createHash('sha256').update(x).digest('hex');
 fs.writeFileSync(new URL('../../../docs/FM3_AMP_CAPTURE_005_RESULTS.json',import.meta.url),JSON.stringify({date:'2026-10-02',syxSha256:sha(donor),getSha256:sha(report),getChecks:cap.checks,matchedWords:576,totalWords:576,source:lib.accepted[0],results,hardware:'User exported and read device state; generated combinations not imported or audio-tested',decoderCorrection:'ID21 USA MK IIC+ restored from existing catalog and confirmed user model selection; malformed ID65535 still rejected atomically'},null,2)+'\n');
}
console.log('PASS: capture005 GET/SYX 576/576; all 4 complete channels generate exactly; other body bytes preserved; ID21 decoded.');
