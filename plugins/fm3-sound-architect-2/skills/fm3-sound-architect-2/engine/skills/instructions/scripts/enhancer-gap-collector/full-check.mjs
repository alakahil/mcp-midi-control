// Collection gates only. No parameter scales or enum meanings are inferred here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error(message)};
const baseline=fs.readFileSync(path.join(here,'baseline.syx'));
check(sha(baseline)==='755c477cd39b471b1c381f82dc735ad1285f2966d258a7381e8110a8f52a6d41','Baseline hash mismatch');
const originalState=inspectStructure(baseline),original=Buffer.from(originalState.raw.body);
const start=7506,selector=7472;
const index=(channel,pid)=>'ABCD'.indexOf(channel)*12+pid;

export function preflight(bytes){
 const state=inspectStructure(bytes),b=Buffer.from(state.raw.body);
 const raw=Buffer.from(state.raw.rawPatch),seed=Buffer.from(originalState.raw.rawPatch);
 check(Buffer.from(state.parsed.headerPayload).equals(Buffer.from(originalState.parsed.headerPayload)),'Dump header changed');
 check(state.parsed.chunkPayloads.length===originalState.parsed.chunkPayloads.length,'Chunk count changed');
 state.parsed.chunkPayloads.forEach((c,i)=>check(Buffer.from(c).subarray(0,2).equals(Buffer.from(originalState.parsed.chunkPayloads[i]).subarray(0,2)),'Chunk prefix changed at '+i));
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(raw[i]===seed[i],'Preset header changed at '+i);
 check(raw.readUInt16LE(72)===b.length&&raw.readUInt16LE(74)===state.raw.compSize,'Encoded size mismatch');
 check(raw.subarray(76+state.raw.compSize).every(v=>v===0),'Nonzero padding');
 check(b.length===13804,'Body size changed');
 check(b.readUInt16LE(7488)===original.readUInt16LE(7488),
  'Scene 2 Enhanceri Bypass-olek muutus: plokk peab olema bypass\'is. Taasta viimase eduka donor.syx faili olek, vali Scene 2 ja muuda ainult küsitud parameetrit. Ekspordi uus SYX. GET-i ei saadetud.');
 for(let i=0;i<b.length;i++)if(!(i>=start&&i<start+96)&&i!==selector&&i!==selector+1)
  check(b[i]===original[i],'Muutus väljaspool Enhancer parameetreid või Scene 2 Enhancer kanalivalikut, bait '+i+'. GET-i ei saadetud.');
 check(b.readUInt16LE(selector)<4,'Invalid Enhancer scene channel');
 return {sha256:sha(bytes),bodySha256:sha(b),effectId:122,wordsPerChannel:12,channels:4,
  words:Array.from({length:48},(_,i)=>b.readUInt16LE(start+2*i)),
  presetName:state.decoded.preset_name,presetNameHex:raw.subarray(8,40).toString('hex'),
  sceneChannels:Array.from({length:8},(_,i)=>'ABCD'[b.readUInt16LE(7470+i*2)]),
  sceneBypass:Array.from({length:8},(_,i)=>b.readUInt16LE(7486+i*2)===1)};
}

export function compare(previous,current,step){
 check(step&&typeof step==='object'&&['baseline','type','control','copy-channel','select-channel'].includes(step.kind),'Unknown collection step');
 check(['A','B','C','D'].includes(step.channel),'Invalid channel');
 const a=preflight(previous),b=preflight(current),allowed=new Set(),changedWords=[];
 check(b.sceneChannels[1]===step.channel,'Vali Scene 2-s Enhancer kanal '+step.channel+'. GET-i ei saadetud.');
 if(!['copy-channel','select-channel'].includes(step.kind))check(a.sceneChannels[1]===b.sceneChannels[1],'Kanalivalik muutus parameetrisammus');
 if(step.kind==='baseline'){
  check(b.bodySha256===preflight(baseline).bodySha256,'AlgGET nõuab muutmata paketi baseline.syx olekut');
 }else if(step.kind==='type'){
  check(step.channel==='A','Type collection only on A');
  for(let pid=0;pid<12;pid++)allowed.add(index('A',pid));
 }else if(step.kind==='control'){
  const pid={'Width':0,'Depth':1,'Low Cut':2,'High Cut':3,'Level':4,'Bypass Mode':5,'Invert':7,'Pan L':8,'Pan R':9,'Balance':10,'Scene Ignore':11}[step.parameter];
  check(pid!==undefined,'Unknown scalar control');
  for(const ch of step.parameter==='Scene Ignore'?'ABCD':[step.channel])allowed.add(index(ch,pid));
 }else if(step.kind==='copy-channel'){
  check(step.sourceChannel==='A'&&step.channel!=='A','Copy A to B/C/D only');
  for(let pid=0;pid<12;pid++){
   allowed.add(index(step.channel,pid));
   check(b.words[index(step.channel,pid)]===a.words[index('A',pid)],'Sihtkanal pole A täpne 12-sõnaline koopia, PID '+pid);
  }
 }
 for(let i=0;i<48;i++)if(a.words[i]!==b.words[i]){
  check(allowed.has(i),'Ootamatu Enhancer muutus: kanal '+'ABCD'[Math.floor(i/12)]+', PID '+i%12+'. GET-i ei saadetud.');
  changedWords.push({channel:'ABCD'[Math.floor(i/12)],pid:i%12,offset:start+2*i,before:a.words[i],after:b.words[i]});
 }
 const channelChanged=a.sceneChannels[1]!==b.sceneChannels[1];
 check(changedWords.length||channelChanged||step.allowUnchanged,'Sisu ei muutunud. Kasuta s, kui muudatus jäi tegemata.');
 if(step.kind==='type'&&changedWords.length)check(changedWords.some(c=>c.pid===6),'Type PID6 ei muutunud, kuid muud sõnad muutusid; GET-i ei saadetud');
 if(step.kind==='select-channel')check(changedWords.length===0,'Kanalivalik muutis parameetreid');
 const typeCoupledChanges=step.kind==='type'?changedWords.filter(c=>c.pid!==6):[];
 return {step,previousSha256:a.sha256,syxSha256:b.sha256,changedWords,
  sceneChannelChange:channelChanged?{scene:2,before:a.sceneChannels[1],after:b.sceneChannels[1]}:null,
  presetNameChange:a.presetNameHex===b.presetNameHex?null:{before:a.presetName,after:b.presetName,beforeHex:a.presetNameHex,afterHex:b.presetNameHex},
  typeCoupledChanges,persistentDelta:!!(changedWords.length||channelChanged),
  allOtherBodyBytesPreserved:true,chunkPrefixesPreserved:true,
  mappingStatus:'Captured candidates only. Audit actual labels, candidate PID mappings, ranges, coupling and GET pairs before enabling writes'};
}

export function pair(folder){
 const state=preflight(fs.readFileSync(path.join(folder,'donor.syx'))),r=JSON.parse(fs.readFileSync(path.join(folder,'capture.json')));
 check(r.status==='captured','Capture status is not successful');
 check(r.txHex==='f0000174111f7a0071f7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete Enhancer GET');
 check(r.inputFlushedBeforeGet===true,'Pre-request input flush not recorded');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Invalid raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Nested frame start');partial=[v];}else if(v===247){check(partial,'Missing start');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Invalid stream');partial.push(v);}}
 check(!partial,'Incomplete response');check(frames.length>=3&&frames[0][5]===116&&frames.at(-1)[5]===118&&frames.slice(1,-1).every(f=>f[5]===117),'Unexpected response order');
 check(frames[0].length===12&&frames.at(-1).length===8,'Unexpected envelope sizes');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad response envelope');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad response checksum');}
 check((frames[0][6]|frames[0][7]<<7)===122&&(frames[0][8]|frames[0][9]<<7)===48,'Wrong block or count');
 const values=[];
 for(const f of frames.slice(1,-1)){const count=f[6]|f[7]<<7;check(count>0&&count<=256&&f.length===10+count*3,'Bad section count/size');for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}}
 check(values.length===48&&values.every((v,i)=>v===state.words[i]),'GET/SYX mismatch; keep the same device state');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 if(r.decoded)check(r.decoded.effectId===122&&r.decoded.itemCount===48&&JSON.stringify(r.decoded.values)===JSON.stringify(values),'Reported decoding conflicts');
 check(r.syxSha256===state.sha256,'Reported SYX hash mismatch');
 return {paired:true,effectId:122,matchedWords:48,wordsPerChannel:12,channels:4,syxSha256:state.sha256,bodySha256:state.bodySha256,rawRxSha256:sha(raw),frameLengths:frames.map(f=>f.length),sceneChannels:state.sceneChannels,sceneBypass:state.sceneBypass,generatorSupport:false,parameterSemantics:'Still require targeted control measurements; a baseline pair alone does not confirm names, types or scales'};
}


if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target,current,index,...rest]=process.argv.slice(2);check(target&&!rest.length,'Use preflight FILE, pair FOLDER or compare PREVIOUS CURRENT STEP_JSON');let result;
  if(cmd==='compare')result=compare(fs.readFileSync(target),fs.readFileSync(current),JSON.parse(index));
  else{check(!current&&index===undefined,'Unexpected arguments');if(cmd==='preflight'){result=preflight(fs.readFileSync(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Unknown command');}
  console.log(JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
