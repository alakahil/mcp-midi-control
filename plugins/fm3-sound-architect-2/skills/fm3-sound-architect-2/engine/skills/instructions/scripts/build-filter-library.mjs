// Rebuild the Filter catalog exclusively from complete verified GET/SYX pairs.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {pair,preflight} from './filter-collector/filter-check.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../references/filter-batch-20261008-132133/',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const session=JSON.parse(read('session.json'));assert.deepEqual(session,{schemaVersion:1,kind:'FM3_FILTER_SESSION',firmware:13,collector:'0.1.0'});
assert.equal(sha(read('baseline.syx')),'9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80');
const roster=JSON.parse(read('filter-roster.json')).models;
assert.deepEqual(roster,JSON.parse(fs.readFileSync(new URL('./filter-collector/filter-roster.json',import.meta.url))).models);
const models=[],captures=[],used=new Set(),ids=new Set();
for(const capture of fs.readdirSync(root).filter(n=>n.startsWith('capture-')).sort()){
 const prefix=capture+'/',folder=new URL(prefix,root),r=JSON.parse(read(prefix+'capture.json'));
 assert.equal(r.status,'captured');const proof=pair(folder.pathname),state=preflight(read(prefix+'donor.syx'));
 assert.deepEqual(JSON.parse(read(prefix+'pair.json')),proof);
 const labels=JSON.parse(read(prefix+'labels.json'));assert.ok(labels.length>=1&&labels.length<=4);
 const seenChannels=new Set();
 for(const label of labels){
  const entry=roster.find(m=>m.displayNumber===label.displayNumber);
  assert.ok(entry&&entry.name===label.name&&label.source==='planned roster; user confirmed selection');
  assert.ok('ABCD'.includes(label.channel)&&label.channel.length===1&&!seenChannels.has(label.channel));seenChannels.add(label.channel);
  const ch=proof.channels.find(c=>c.channel===label.channel),start='ABCD'.indexOf(label.channel)*37,words=state.words.slice(start,start+37);
  if(entry.binaryId!==null)assert.equal(ch.binaryId,entry.binaryId);
  assert.ok(!used.has(entry.name)&&!ids.has(ch.binaryId));used.add(entry.name);ids.add(ch.binaryId);
  assert.equal(words.length,37);assert.equal(words[0],ch.binaryId);
  models.push({name:entry.name,displayNumber:entry.displayNumber,binaryId:ch.binaryId,words,sourceChannel:label.channel,sourceCapture:capture,syxSha256:proof.syxSha256,rawRxSha256:proof.rawRxSha256});
 }
 assert.ok(labels.length===1&&labels[0].name==='Null'||proof.scene2Bypass);
 captures.push({capture,...proof,frameLengths:r.frames.map(f=>f.length),labels:labels.map(l=>l.name)});
}
assert.equal(captures.length,6);assert.equal(models.length,18);assert.equal(used.size,18);assert.equal(ids.size,18);
const library={schemaVersion:1,firmware:13,effectId:114,typeParameterId:0,wordsPerChannel:37,count:18,evidenceDirectory:'filter-batch-20261008-132133',models:models.sort((a,b)=>a.displayNumber-b.displayNumber)};
const bytes=Buffer.from(JSON.stringify(library,null,2)+'\n');fs.writeFileSync(new URL('../references/filter-library.json',import.meta.url),bytes);
const report={date:'2026-10-08',archiveSha256:'9e74986af47b5fe109ef2c6c3565c10673cdd3b5682868072198fac05065ebc7',passed:true,captures,types:18,uniqueIds:18,wordsPerCapture:148,totalPairedWords:888,librarySha256:sha(bytes),typeIds:Object.fromEntries(library.models.map(m=>[m.name,m.binaryId])),nonFilterBodyChanges:'None beyond allowed Scene2 Filter channel/bypass',hardware:'Six actual user device GET/SYX pairs verified; generated Filter imports remain separate',numericControls:'Not measured; no Frequency/Q/Gain/Level/Order scaling claim'};
fs.writeFileSync(new URL('../../../docs/FM3_FILTER_COLLECTION_VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,captures:6,types:18,pairedWords:888,librarySha256:sha(bytes),typeIds:report.typeIds}));
