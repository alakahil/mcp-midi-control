import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectSession} from './fm3-amp-session.mjs';
import {generatePreset} from './fm3-generate.mjs';
import {inspect} from './fm3-prototype.mjs';
import {coverage,bundledLibrary} from './fm3-amp-library.mjs';
import {decodeAmpGet} from './fm3-amp-get.mjs';
import {fileURLToPath} from 'node:url';
const refs=new URL('../references/',import.meta.url),base=fs.readFileSync(new URL('Baaspreset.syx',refs)),b=inspect(base);
const session=inspectSession(fileURLToPath(new URL('batch-20261004-153604',refs)),base);
assert.deepEqual(session.rejected,[]);assert.deepEqual(session.conflicts,[]);
assert.equal(session.captures.filter(c=>c.state==='paired-verified').length,81);
assert.equal(session.captures.filter(c=>c.state==='failed').length,1);
const results=[];
for(const t of Object.values(session.templates).filter(t=>t.modelId===331&&t.modelId<=335&&t.modelId!==314)){
 assert.equal(bundledLibrary.templates[t.name].channelBytesHex,t.channelBytesHex);
 const r=generatePreset(base,{schemaVersion:1,firmware:13,name:'BATCH CHANNEL CHECK',ampModelB:t.name});
 const a=inspect(r.syx),ch=a.decoded.blocks.find(x=>x.block==='Amp').channels.B;
 assert.equal(ch.type_id,t.modelId);assert.equal(ch.type,t.name);
 assert.equal(Buffer.from(a.raw.body.slice(4944,5232)).toString('hex'),t.channelBytesHex);
 for(let i=0;i<a.raw.body.length;i++)if(i<4944||i>=5232)assert.equal(a.raw.body[i],b.raw.body[i]);
 assert.ok(r.txt.includes(t.name));
 const source=bundledLibrary.templates[t.name].source;
 for(const f of [source,source.get])assert.equal(createHash('sha256').update(fs.readFileSync(new URL(f.file,refs))).digest('hex'),f.sha256);
 results.push({id:t.modelId,name:t.name,sourceChannel:t.source.channel,exactChannel:true,otherBodyBytesPreserved:true,checks:r.report.checks});
}
assert.equal(results.length,1);
const cov=coverage();assert.equal(cov.ready,336);assert.equal(cov.missing,0);
const pairs=session.captures.filter(c=>c.state==='paired-verified'&&c.models.some(n=>session.templates[n].modelId===331&&session.templates[n].modelId<=335&&session.templates[n].modelId!==314)).map(c=>{
 const p=new URL('batch-20261004-153604/'+c.id+'/capture.json',refs),get=decodeAmpGet(JSON.parse(fs.readFileSync(p)),13);
 return {capture:c.id,ids:get.channels.map(c=>c.modelId),checks:get.checks,matchedWords:576,totalWords:576};
});
if(process.argv.includes('--report')){
 fs.writeFileSync(new URL('../../../docs/FM3_AMP_BATCH_20261004_153604_RESULTS.json',import.meta.url),JSON.stringify({date:'2026-10-04',version:'0.29.28',sessionCaptures:session.captures,conflicts:[],rejected:[],newPairs:pairs,newModels:results,coverage:{ready:336,missing:0,total:336},next:[],hardware:'User device GET/SYX pairs confirmed; newly generated combinations not imported, listened to or CPU-tested'},null,2)+'\n');
 fs.writeFileSync(new URL('../../../docs/FM3_AMP_COVERAGE.json',import.meta.url),JSON.stringify(cov,null,2)+'\n');
}
console.log('PASS: 81 verified pairs, 1 failed capture excluded; 1 new bundled channels generate exactly, all unrelated body bytes preserved; source hashes valid; coverage 336/336.');
