// Offline-only evidence check for the user's exact firmware-13 Filter baseline.
// Parameter offsets are established by complete contiguous record boundaries.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),read=p=>fs.readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const baseline=read(path.join(here,'baseline.syx'));
check(sha(baseline)==='b3d406ce0bf847dadd20ba4b36553e8a54cc4939fe4808ee7e389e40d63ae2a3','Baseline hash mismatch');
const originalState=inspectStructure(baseline),original=Buffer.from(originalState.raw.body);
const plan=JSON.parse(read(path.join(here,'plan.json')));
function envelope(s){
 const raw=Buffer.from(s.raw.rawPatch),seed=Buffer.from(originalState.raw.rawPatch);
 check(Buffer.from(s.parsed.headerPayload).equals(Buffer.from(originalState.parsed.headerPayload)),'Dump header changed');
 // Name occupies exactly bytes 8..39. Preserve every other non-CRC header byte.
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(raw[i]===seed[i],'Preset header changed at '+i);
 check(raw.readUInt16LE(72)===s.raw.body.length&&raw.readUInt16LE(74)===s.raw.compSize,'Encoded length mismatch');
 check(raw.subarray(76+s.raw.compSize).every(v=>v===0),'Nonzero padding');
}
export function preflight(bytes){
 const state=inspectStructure(bytes);envelope(state);const b=Buffer.from(state.raw.body);
 check(b.length===13146,'Body size changed');
 // Only Filter scalar words and Scene2 Filter channel may vary. All bypass states are pinned.
 for(let i=0;i<b.length;i++)if(!(i>=7614&&i<7910)&&!(i>=7580&&i<7582))check(b[i]===original[i],'Non-permitted change at '+i);
 check(b.readUInt16LE(7568)===114&&b.readUInt16LE(7610)===37&&b.readUInt16LE(7612)===4,'Filter layout mismatch');
 const sceneChannels=Array.from({length:8},(_,i)=>b.readUInt16LE(7578+i*2));
 const sceneBypass=Array.from({length:8},(_,i)=>b.readUInt16LE(7594+i*2));
 check(sceneChannels.every(x=>x<=3)&&sceneBypass.every(x=>x<=1),'Invalid Filter scene value');
 const words=Array.from({length:148},(_,i)=>b.readUInt16LE(7614+2*i));
 check([3,1,6,8].every((v,i)=>words[i*37]===v),'Filter Type changed');
 return {sha256:sha(bytes),presetName:state.decoded.preset_name,presetNameHex:Buffer.from(state.raw.rawPatch).subarray(8,40).toString('hex'),words,sceneChannels,sceneBypass,scene2Bypass:sceneBypass[1]===1,channels:Array.from({length:4},(_,i)=>({channel:'ABCD'[i],binaryId:words[i*37]}))};
}
export function pair(folder){
 const p=preflight(read(path.join(folder,'donor.syx'))),r=JSON.parse(read(path.join(folder,'capture.json')));
 check(r.status==='captured','Capture is not successful');
 check(r.txHex==='f0000174111f720079f7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete Filter GET');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Bad raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Nested start');partial=[v];}else if(v===247){check(partial,'Missing start');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Invalid stream');partial.push(v);}}
 check(!partial,'Incomplete response');check(frames.length>=3&&frames[0][5]===116&&frames.at(-1)[5]===118&&frames.slice(1,-1).every(f=>f[5]===117),'Unexpected response order');
 check(frames[0].length===12&&frames.at(-1).length===8,'Unexpected response envelope sizes');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad envelope');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad checksum');}
 check((frames[0][6]|frames[0][7]<<7)===114&&(frames[0][8]|frames[0][9]<<7)===148,'Wrong block/count');
 const values=[];
 for(const f of frames.slice(1,-1)){
  const count=f[6]|f[7]<<7;
  check(count>0&&count<=256&&f.length===10+count*3,'Wrong section count/size');
  for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 check(values.length===148&&values.every((v,i)=>v===p.words[i]),'GET/SYX mismatch');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 const reported=r.decoded?.values||r.response?.values;if(reported)check(JSON.stringify(reported)===JSON.stringify(values),'Reported words conflict');
 if(r.syxSha256)check(r.syxSha256===p.sha256,'SYX hash mismatch');
 return {paired:true,matchedWords:148,syxSha256:p.sha256,rawRxSha256:sha(raw),channels:p.channels,scene2Bypass:p.scene2Bypass};
}
export function compare(previous,current,index){
 const step=plan[index];check(Number.isInteger(index)&&step,'Unknown step');
 const a=preflight(previous),b=preflight(current),channel='ABCD'.indexOf(step.channel);
 check(b.sceneChannels[1]===channel,'Vali Filter1 kanal '+step.channel+' ja ekspordi uuesti; GET-i ei saadetud');
 const changedWords=[];
 for(let i=0;i<148;i++)if(a.words[i]!==b.words[i]){
  check(Math.floor(i/37)===channel&&i%37!==0,'Muutus teise kanali parameeter või Type');
  changedWords.push({pid:i%37,offset:7614+i*2,before:a.words[i],after:b.words[i]});
 }
 check(changedWords.length>0,'Ükski parameeter ei muutunud. Kui väärtus oli juba sama, kasuta s; muidu taasta viimane edukas fail.');
 // Omit this field when unchanged, preserving exact 0.1.0 saved comparisons.
 const nameChange=a.presetNameHex===b.presetNameHex?{}:{presetNameChange:{before:a.presetName,after:b.presetName,beforeHex:a.presetNameHex,afterHex:b.presetNameHex}};
 return {index,step,previousSha256:a.sha256,syxSha256:b.sha256,changedWords,...nameChange,
  scene2ChannelChange:a.sceneChannels[1]===b.sceneChannels[1]?null:{before:'ABCD'[a.sceneChannels[1]],after:step.channel},
  allOtherBodyBytesPreserved:true,allTypesAndBypassPreserved:true,
  mappingStatus:changedWords.length===1?'isolated-word-pending-display-and-audit':'coupled-words-require-review'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target,current,index]=process.argv.slice(2);let result;if(cmd==='compare')result=compare(read(target),read(current),Number(index));else if(cmd==='preflight'){result=preflight(read(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Use compare PREVIOUS CURRENT INDEX, preflight FILE or pair FOLDER');console.log(JSON.stringify(result));}catch(e){console.error(e.message);process.exitCode=1;}
}
