// Offline pairing only. Exact immutable user PEQ baseline, no parameter writes.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
export const BASELINE_SHA256='c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be';
export function preflight(bytes){
 check(sha(bytes)===BASELINE_SHA256,'Baseline changed: use the supplied original FM3_PEQ_BASELINE.syx state');
 const result=inspectStructure(bytes),b=Buffer.from(result.raw.body);
 check(b.length===13456&&b[0]===1,'Expected PEQ baseline, Scene 2');
 check(b.readUInt16LE(408)===54&&b.readUInt16LE(410)===2,'PEQ grid mismatch');
 check(b.readUInt16LE(8688)===54&&b.readUInt16LE(8730)===33&&b.readUInt16LE(8732)===4,'PEQ record mismatch');
 check(b.readUInt16LE(8700)===0&&b.readUInt16LE(8716)===1,'PEQ must be A and bypassed in Scene 2');
 const sceneChannels=Array.from({length:8},(_,i)=>'ABCD'[b.readUInt16LE(8698+i*2)]);
 const sceneBypass=Array.from({length:8},(_,i)=>b.readUInt16LE(8714+i*2)===1);
 return {sha256:sha(bytes),bodySha256:sha(b),effectId:54,wordsPerChannel:33,channels:4,words:Array.from({length:132},(_,i)=>b.readUInt16LE(8734+2*i)),sceneChannels,sceneBypass,parameterSemantics:'Not established by this baseline pair'};
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
 try{const [cmd,target,...extra]=process.argv.slice(2);check(target&&!extra.length,'Usage: preflight FILE or pair FOLDER');let result;
 if(cmd==='preflight'){result=preflight(fs.readFileSync(target));delete result.words;}else if(cmd==='pair')result=pair(target);else throw Error('Use preflight FILE or pair FOLDER');console.log(JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
