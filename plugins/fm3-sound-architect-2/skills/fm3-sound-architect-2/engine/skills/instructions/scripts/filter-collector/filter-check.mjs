// Offline-only evidence check for the user's exact firmware-13 Filter baseline.
// Parameter offsets are established by complete contiguous record boundaries.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),read=p=>fs.readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const baseline=read(path.join(here,'baseline.syx'));
check(sha(baseline)==='9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80','Baseline hash mismatch');
const original=Buffer.from(inspectStructure(baseline).raw.body);
export function preflight(bytes){
 const b=Buffer.from(inspectStructure(bytes).raw.body);
 check(b.length===13146,'Body size changed');
 // Only Filter A-D parameters, the currently selected Scene2 Filter channel,
 // and its bypass word may differ. All other body bytes remain pinned.
 for(let i=0;i<b.length;i++)if(!(i>=7614&&i<7910)&&!(i>=7580&&i<7582)&&!(i>=7596&&i<7598))check(b[i]===original[i],'Non-permitted change at '+i);
 check(b.readUInt16LE(7568)===114&&b.readUInt16LE(7610)===37&&b.readUInt16LE(7612)===4,'Filter layout mismatch');
 const sceneChannels=Array.from({length:8},(_,i)=>b.readUInt16LE(7578+i*2));
 const sceneBypass=Array.from({length:8},(_,i)=>b.readUInt16LE(7594+i*2));
 check(sceneChannels.every(x=>x<=3)&&sceneBypass.every(x=>x<=1),'Invalid Filter scene value');
 const words=Array.from({length:148},(_,i)=>b.readUInt16LE(7614+2*i));
 return {sha256:sha(bytes),words,sceneChannels,sceneBypass,scene2Bypass:sceneBypass[1]===1,channels:Array.from({length:4},(_,i)=>({channel:'ABCD'[i],binaryId:words[i*37]}))};
}
export function pair(folder){
 const p=preflight(read(path.join(folder,'donor.syx'))),r=JSON.parse(read(path.join(folder,'capture.json')));
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
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target]=process.argv.slice(2);let result;if(cmd==='preflight'){result=preflight(read(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Use preflight FILE or pair FOLDER');console.log(JSON.stringify(result));}catch(e){console.error(e.message);process.exitCode=1;}
}
