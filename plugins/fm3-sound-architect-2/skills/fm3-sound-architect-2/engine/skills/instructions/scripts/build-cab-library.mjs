// Import only independently paired captures from the completed fixed-base session.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pair,preflight} from './cab-collector/cab-check.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const [session,output]=process.argv.slice(2);
check(session&&output,'Usage: build-cab-library SESSION OUTPUT');
const roster=JSON.parse(fs.readFileSync(new URL('./cab-collector/cab-roster.json',import.meta.url))).models;
const entries=new Map();
for(const name of fs.readdirSync(session).filter(n=>n.startsWith('capture-')).sort()){
 const folder=path.join(session,name),capture=JSON.parse(fs.readFileSync(path.join(folder,'capture.json')));
 if(capture.status==='failed')continue;
 const proof=pair(folder),bytes=fs.readFileSync(path.join(folder,'donor.syx')),state=preflight(bytes);
 const labels=name==='capture-001'?proof.channels.filter(c=>[25,38,39].includes(c.slot1)&&c.slot1===c.slot2).map(c=>({...roster.find(m=>m.expectedId===c.slot1),channel:c.channel})):JSON.parse(fs.readFileSync(path.join(folder,'labels.json'))).filter(l=>l.source==='planned roster; user confirmed selection');
 for(const label of labels){
  const m=roster.find(m=>m.expectedId===label.expectedId),ch=proof.channels.find(c=>c.channel===label.channel);
  check(m&&m.name===label.name&&m.displayNumber===label.displayNumber,'Cab label conflict');
  check(ch&&ch.slot1===ch.slot2&&ch.slot1===m.expectedId,'Cab ID mismatch');
  const index='ABCD'.indexOf(ch.channel),words=state.words.slice(index*106,(index+1)*106),raw=Buffer.alloc(212);
  words.forEach((w,i)=>raw.writeUInt16LE(w,i*2));
  const entry={...m,rawHex:raw.toString('hex'),sha256:sha(raw),source:{folder:name,channel:ch.channel,syxSha256:proof.syxSha256,rawRxSha256:proof.rawRxSha256,matchedWords:424}};
  if(entries.has(m.expectedId))check(entries.get(m.expectedId).sha256===entry.sha256,'Conflicting full channel template');
  else entries.set(m.expectedId,entry);
 }
}
check(entries.size===45&&roster.every(m=>entries.has(m.expectedId)),'Incomplete CAB library');
const library={schemaVersion:1,firmware:13,mode:'DYNA-CAB',channelWords:106,policy:'Entire captured channel including both slots and microphone/mix/filter settings; not universal factory defaults',templates:roster.map(m=>entries.get(m.expectedId))};
fs.writeFileSync(output,JSON.stringify(library,null,2)+'\n',{flag:'wx'});
console.log('45 paired full-channel templates; SHA256 '+sha(fs.readFileSync(output)));
