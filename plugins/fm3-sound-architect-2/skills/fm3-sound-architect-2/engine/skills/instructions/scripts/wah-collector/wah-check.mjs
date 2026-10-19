// Offline validation, scoped to the confirmed firmware-13 Wah donor.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {inspect,inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),read=p=>fs.readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const original=Buffer.from(inspectStructure(read(path.join(here,'baseline.syx'))).raw.body);
export function preflight(bytes){
 const b=Buffer.from(inspectStructure(bytes).raw.body);
 check(b.length===14222,'Body size changed');
 for(let i=0;i<b.length;i++)if(!(i>=10178&&i<10378)&&!(i>=10142&&i<10158))check(b[i]===original[i],'Non-Wah change at '+i);
 check(b.readUInt16LE(10132)===94&&b.readUInt16LE(10174)===25&&b.readUInt16LE(10176)===4,'Wah layout mismatch');
 const sceneChannels=Array.from({length:8},(_,i)=>b.readUInt16LE(10142+i*2));check(sceneChannels.every(x=>x<=3),'Invalid scene channel');
 const words=Array.from({length:100},(_,i)=>b.readUInt16LE(10178+2*i));
 return {sha256:sha(bytes),words,sceneChannels,channels:Array.from({length:4},(_,i)=>({channel:'ABCD'[i],binaryId:words[i*25]}))};
}
export function pair(folder){
 const p=preflight(read(path.join(folder,'donor.syx'))),r=JSON.parse(read(path.join(folder,'capture.json')));
 check(r.txHex==='f0000174111f5e0055f7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete Wah GET');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Bad raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Nested start');partial=[v];}else if(v===247){check(partial,'Missing start');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Invalid stream');partial.push(v);}}
 check(!partial,'Incomplete response');check(frames.map(f=>f[5]).join(',')==='116,117,118','Unexpected response order');
 check(frames.map(f=>f.length).join(',')==='12,310,8','Unexpected response sizes');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad envelope');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad checksum');}
 check((frames[0][6]|frames[0][7]<<7)===94&&(frames[0][8]|frames[0][9]<<7)===100,'Wrong block/count');
 const values=[];
 for(const f of frames.slice(1,-1)){
 check((f[6]|f[7]<<7)===(f.length-10)/3,'Wrong section count');
 for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 check(values.length===100&&values.every((v,i)=>v===p.words[i]),'GET/SYX mismatch');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 const reported=r.decoded?.values||r.response?.values;if(reported)check(JSON.stringify(reported)===JSON.stringify(values),'Reported words conflict');
 if(r.syxSha256)check(r.syxSha256===p.sha256,'SYX hash mismatch');
 return {paired:true,matchedWords:100,syxSha256:p.sha256,rawRxSha256:sha(raw),channels:p.channels};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target]=process.argv.slice(2);let result;if(cmd==='preflight'){result=preflight(read(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Use preflight FILE or pair FOLDER');console.log(JSON.stringify(result));}catch(e){console.error(e.message);process.exitCode=1;}
}
