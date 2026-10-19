// Offline collection gates; no Level scale is assumed or inferred.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error(message)};
export const plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json')));
const baseline=fs.readFileSync(path.join(here,'ALUSTA_SIIT.syx'));
check(sha(baseline)===plan.baselineSha256,'Baseline hash mismatch');
const originalState=inspectStructure(baseline),original=Buffer.from(originalState.raw.body);
const start=4656, wordsPerChannel=144;
const levelOffsets=[4658,4946,5234,5522];
const allowedBytes=new Set(levelOffsets.flatMap(x=>[x,x+1]));

export function preflight(bytes){
 const state=inspectStructure(bytes),b=Buffer.from(state.raw.body);
 const raw=Buffer.from(state.raw.rawPatch),seed=Buffer.from(originalState.raw.rawPatch);
 check(Buffer.from(state.parsed.headerPayload).equals(Buffer.from(originalState.parsed.headerPayload)),'Dump header changed');
 check(state.parsed.chunkPayloads.length===originalState.parsed.chunkPayloads.length,'Chunk count changed');
 state.parsed.chunkPayloads.forEach((c,i)=>check(Buffer.from(c).subarray(0,2).equals(Buffer.from(originalState.parsed.chunkPayloads[i]).subarray(0,2)),'Chunk prefix changed at '+i));
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(raw[i]===seed[i],'Preset header changed at '+i);
 check(raw.readUInt16LE(72)===b.length&&raw.readUInt16LE(74)===state.raw.compSize,'Encoded size mismatch');
 check(raw.subarray(76+state.raw.compSize).every(v=>v===0),'Nonzero padding');
 check(b.length===13146,'Body size changed');
 for(let i=0;i<b.length;i++)if(!allowedBytes.has(i))check(b[i]===original[i],
  'Muutus väljaspool nelja Amp Level-sõna, bait '+i+'. Taasta viimane edukas donor.syx või ALUSTA_SIIT.syx, vali Scene 2, muuda ainult Levelit ja naase Amp B-le. GET-i ei saadetud.');
 const words=Array.from({length:576},(_,i)=>b.readUInt16LE(start+2*i));
 const models=Object.fromEntries([...'ABCD'].map((ch,i)=>[ch,words[i*wordsPerChannel+6]]));
 check(JSON.stringify(models)===JSON.stringify(plan.models),'Amp model mismatch');
 return {sha256:sha(bytes),bodySha256:sha(b),words,models,
  levelsRaw:Object.fromEntries([...'ABCD'].map((ch,i)=>[ch,words[i*wordsPerChannel+1]])),
  presetName:state.decoded.preset_name,presetNameHex:raw.subarray(8,40).toString('hex')};
}

export function compare(previous,current,index){
 check(Number.isInteger(index)&&index>=0&&index<plan.steps.length,'Invalid step');
 const a=preflight(previous),b=preflight(current),changedWords=[];
 for(let i=0;i<4;i++){
  const channel='ABCD'[i];
  check(a.levelsRaw[channel]!==b.levelsRaw[channel],
   'Amp '+channel+' Level jäi samaks. Kõik neli selle sammu väärtust peavad muutuma. GET-i ei saadetud.');
  changedWords.push({channel,parameterId:1,offset:levelOffsets[i],before:a.levelsRaw[channel],after:b.levelsRaw[channel]});
 }
 return {step:plan.steps[index],previousSha256:a.sha256,syxSha256:b.sha256,changedWords,
  models:b.models,allOtherBodyBytesPreserved:true,chunkPrefixesPreserved:true,
  presetNameChange:a.presetNameHex===b.presetNameHex?null:{before:a.presetName,after:b.presetName},
  generatorSupportExpanded:false,labelsRequireOperatorConfirmation:true};
}

export function pair(folder){
 const state=preflight(fs.readFileSync(path.join(folder,'donor.syx')));
 const r=JSON.parse(fs.readFileSync(path.join(folder,'capture.json')));
 check(r.status==='captured'&&r.firmwareDeclared==='13.0','Capture status or firmware mismatch');
 check(r.txHex==='f0000174111f3a0031f7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete Amp GET');
 check(r.inputFlushedBeforeGet===true&&r.responseCompleteBeforeClose===true&&r.partialFrameHex==='','Incomplete transport evidence');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex)&&r.rawRxHex.length<252544,'Invalid raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Nested frame start');partial=[v];}else if(v===247){check(partial,'Missing start');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Invalid stream');partial.push(v);}}
 check(!partial,'Incomplete response');
 check(frames.length===5&&frames[0][5]===116&&frames[4][5]===118&&frames.slice(1,4).every(f=>f[5]===117),'Unexpected response order');
 check(frames[0].length===12&&frames[4].length===8,'Unexpected envelope sizes');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad response envelope');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad response checksum');}
 check((frames[0][6]|frames[0][7]<<7)===58&&(frames[0][8]|frames[0][9]<<7)===576,'Wrong block or count');
 const values=[];
 for(const [section,f] of frames.slice(1,4).entries()){
  const count=f[6]|f[7]<<7;
  check(count===[256,256,64][section]&&f.length===10+count*3,'Bad section count/size');
  for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 check(values.length===576&&values.every((v,i)=>v===state.words[i]),'GET/SYX mismatch; hoia seade ekspordiga samas olekus');
 check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 check(r.decoded?.effectId===58&&r.decoded.itemCount===576&&JSON.stringify(r.decoded.values)===JSON.stringify(values),'Reported decoding conflicts');
 check(r.syxSha256===state.sha256,'Reported SYX hash mismatch');
 return {paired:true,effectId:58,matchedWords:576,wordsPerChannel:144,channels:4,
  syxSha256:state.sha256,bodySha256:state.bodySha256,rawRxSha256:sha(raw),
  frameLengths:frames.map(f=>f.length),models:state.models,levelsRaw:state.levelsRaw,
  generatorSupportExpanded:false,scope:'Raw GET/SYX agreement. Display labels still depend on the operator; scale and model generality require a separate audit.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target,current,index,...rest]=process.argv.slice(2);check(target&&!rest.length,'Use preflight FILE, pair FOLDER or compare PREVIOUS CURRENT INDEX');let result;
  if(cmd==='compare')result=compare(fs.readFileSync(target),fs.readFileSync(current),Number(index));
  else{check(!current&&index===undefined,'Unexpected arguments');if(cmd==='preflight')result=preflight(fs.readFileSync(target));else if(cmd==='pair')result=pair(target);else throw Error('Unknown command');}
  console.log(JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
