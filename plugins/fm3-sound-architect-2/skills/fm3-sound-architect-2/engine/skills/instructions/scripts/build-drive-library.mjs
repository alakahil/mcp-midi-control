// Build channel templates only from independently revalidated GET/SYX pairs.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {pair,preflight} from './drive-collector/drive-check.mjs';
const [source,out]=process.argv.slice(2);assert(source&&out,'Usage: node build-drive-library.mjs SESSION OUTPUT');
const roster=JSON.parse(fs.readFileSync(new URL('./drive-collector/drive-roster.json',import.meta.url))).models;
const models=new Map(),ids=new Set();let pairs=0;
for(const name of fs.readdirSync(source).filter(x=>x.startsWith('capture-')).sort()){
 const folder=path.join(source,name),report=JSON.parse(fs.readFileSync(path.join(folder,'capture.json')));assert.notEqual(report.status,'failed');
 const proof=pair(folder),state=preflight(fs.readFileSync(path.join(folder,'donor.syx')));pairs++;
 const labels=JSON.parse(fs.readFileSync(path.join(folder,'labels.json')));
 for(const label of labels){
  const expected=roster.find(m=>m.displayNumber===label.displayNumber);assert(expected);assert.equal(label.name,expected.name);assert.equal(label.source,'planned roster; user confirmed selection');
  const index='ABCD'.indexOf(label.channel);assert(index>=0);const words=state.words.slice(index*44,(index+1)*44),id=words[0];
  assert(!models.has(label.displayNumber),'Duplicate name');assert(!ids.has(id),'Duplicate ID');if(expected.binaryId!==null)assert.equal(id,expected.binaryId);
  ids.add(id);models.set(label.displayNumber,{displayNumber:label.displayNumber,name:label.name,binaryId:id,words,source:{capture:name,channel:label.channel,syxSha256:proof.syxSha256,rawRxSha256:proof.rawRxSha256}});
 }
}
assert.equal(models.size,87);assert.equal(pairs,22);
const result={schemaVersion:1,firmware:13,effectId:118,wordsPerChannel:44,count:models.size,evidence:'User-confirmed Type labels; complete hardware GET/SYX equality',status:'Captured channel templates; parameter writing and generated preset hardware import not yet validated',models:[...models.values()].sort((a,b)=>a.displayNumber-b.displayNumber)};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({count:result.count,pairs,uniqueIds:ids.size,lastChannelC:result.models.at(-1).words.slice(0,5)}));
