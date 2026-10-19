// Offline control evidence only. Candidate identities are gates, not validated scales.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error(message)};
const baseline=fs.readFileSync(path.join(here,'baseline.syx'));
check(sha(baseline)==='c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be','Baseline hash mismatch');
const originalState=inspectStructure(baseline),original=Buffer.from(originalState.raw.body);
const plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json')));
const allowedPids=[2,7,12,20];

export function preflight(bytes){
 const state=inspectStructure(bytes),b=Buffer.from(state.raw.body);
 const raw=Buffer.from(state.raw.rawPatch),seed=Buffer.from(originalState.raw.rawPatch);
 check(Buffer.from(state.parsed.headerPayload).equals(Buffer.from(originalState.parsed.headerPayload)),'Dump header changed');
 check(state.parsed.chunkPayloads.length===originalState.parsed.chunkPayloads.length,'Chunk count changed');
 state.parsed.chunkPayloads.forEach((c,i)=>check(Buffer.from(c).subarray(0,2).equals(Buffer.from(originalState.parsed.chunkPayloads[i]).subarray(0,2)),'Chunk prefix changed at '+i));
 // Preset rename is recorded separately; exactly the 32 name bytes are allowed.
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(raw[i]===seed[i],'Preset header changed at '+i);
 check(raw.readUInt16LE(72)===b.length&&raw.readUInt16LE(74)===state.raw.compSize,'Encoded size mismatch');
 check(raw.subarray(76+state.raw.compSize).every(v=>v===0),'Nonzero padding');
 check(b.length===13456,'Body size changed');
 const allowed=new Set(allowedPids.flatMap(pid=>[8734+2*pid,8735+2*pid]));
 for(let i=0;i<b.length;i++)if(!allowed.has(i))check(b[i]===original[i],'Muutus väljaspool PEQ A sihitud juhte, bait '+i+'. Hoia Scene 2, PEQ A bypass ja kõik muu samana. GET-i ei saadetud.');
 return {sha256:sha(bytes),bodySha256:sha(b),effectId:54,wordsPerChannel:33,channels:4,
  words:Array.from({length:132},(_,i)=>b.readUInt16LE(8734+2*i)),
  presetName:state.decoded.preset_name,presetNameHex:raw.subarray(8,40).toString('hex'),
  sceneChannels:Array.from({length:8},(_,i)=>'ABCD'[b.readUInt16LE(8698+i*2)]),
  sceneBypass:Array.from({length:8},(_,i)=>b.readUInt16LE(8714+i*2)===1)};
}

export function compare(previous,current,index){
 check(Number.isInteger(index)&&plan[index],'Unknown measurement step');
 const step=plan[index],a=preflight(previous),b=preflight(current),changedWords=[];
 for(let i=0;i<132;i++)if(a.words[i]!==b.words[i])changedWords.push({channel:'ABCD'[Math.floor(i/33)],pid:i%33,offset:8734+2*i,before:a.words[i],after:b.words[i]});
 check(changedWords.length>0,'Parameeter ei muutunud. Kui väärtus oli juba sama, kasuta s. GET-i ei saadetud.');
 check(changedWords.length===1&&changedWords[0].channel==='A'&&changedWords[0].pid===step.candidatePid,'Muutus ei vasta ühele oodatud juhile. Fail säilitatakse analüüsiks; GET-i ei saadetud.');
 const presetNameChange=a.presetNameHex===b.presetNameHex?null:{before:a.presetName,after:b.presetName,beforeHex:a.presetNameHex,afterHex:b.presetNameHex};
 return {index,step,previousSha256:a.sha256,syxSha256:b.sha256,changedWords,presetNameChange,
  allOtherBodyBytesPreserved:true,chunkPrefixesPreserved:true,typesChannelsAndBypassPreserved:true,
  mappingStatus:'one-candidate-word-isolated-awaiting-display-and-pair-audit'};
}

export function pair(folder){
 const state=preflight(fs.readFileSync(path.join(folder,'donor.syx'))),r=JSON.parse(fs.readFileSync(path.join(folder,'capture.json')));
 check(r.status==='captured','Capture status is not successful');
 check(r.txHex==='f0000174111f36003df7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete PEQ GET');
 check(r.inputFlushedBeforeGet===true,'Pre-request input flush not recorded');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Invalid raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Nested frame start');partial=[v];}else if(v===247){check(partial,'Missing start');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Invalid stream');partial.push(v);}}
 check(!partial,'Incomplete response');check(frames.length>=3&&frames[0][5]===116&&frames.at(-1)[5]===118&&frames.slice(1,-1).every(f=>f[5]===117),'Unexpected response order');
 check(frames[0].length===12&&frames.at(-1).length===8,'Unexpected envelope sizes');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad response envelope');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad response checksum');}
 check((frames[0][6]|frames[0][7]<<7)===54&&(frames[0][8]|frames[0][9]<<7)===132,'Wrong block or count');
 const values=[];
 for(const f of frames.slice(1,-1)){const count=f[6]|f[7]<<7;check(count>0&&count<=256&&f.length===10+count*3,'Bad section count/size');for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}}
 check(values.length===132&&values.every((v,i)=>v===state.words[i]),'GET/SYX mismatch; keep the same device state');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 if(r.decoded)check(r.decoded.effectId===54&&r.decoded.itemCount===132&&JSON.stringify(r.decoded.values)===JSON.stringify(values),'Reported decoding conflicts');
 check(r.syxSha256===state.sha256,'Reported SYX hash mismatch');
 return {paired:true,effectId:54,matchedWords:132,wordsPerChannel:33,channels:4,syxSha256:state.sha256,bodySha256:state.bodySha256,rawRxSha256:sha(raw),frameLengths:frames.map(f=>f.length),sceneChannels:state.sceneChannels,sceneBypass:state.sceneBypass,generatorSupport:false,parameterSemantics:'Still require targeted control measurements; a baseline pair alone does not confirm names, types or scales'};
}


if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target,current,index,...rest]=process.argv.slice(2);check(target&&!rest.length,'Use preflight FILE, pair FOLDER or compare PREVIOUS CURRENT INDEX');let result;
  if(cmd==='compare')result=compare(fs.readFileSync(target),fs.readFileSync(current),Number(index));
  else{check(!current&&index===undefined,'Unexpected arguments');if(cmd==='preflight'){result=preflight(fs.readFileSync(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Unknown command');}
  console.log(JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
