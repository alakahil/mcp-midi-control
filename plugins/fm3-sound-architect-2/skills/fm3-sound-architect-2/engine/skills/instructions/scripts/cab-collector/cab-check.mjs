// Offline checker for this user's firmware-13 CAB fixture only. No device I/O.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspect,inspectStructure} from './fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const check=(v,m)=>{if(!v)throw Error(m)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p);
const base=inspect(read(path.join(here,'baseline.syx')));
export function preflight(bytes){
 // The generic type scanner can mistake CAB slot values for INPUT headers.
 // Keep envelope/CRC/footer checks; prove every non-CAB byte equals the fully
 // validated baseline, then validate CAB layout, modes and scene channels here.
 const v=inspectStructure(bytes),b=Buffer.from(v.raw.body),orig=base.raw.body;
 const cab=v.decoded.blocks.filter(x=>x.block==='Cab');
 check(cab.length===1&&cab[0].cols===106&&cab[0].rows===4&&cab[0].params_offset===5866,'Unsupported CAB layout');
 check(b.length===orig.length,'Body size changed');
 // CAB channel selection in existing scenes may change during manual collection. Record, do not copy it into templates.
 for(let i=0;i<b.length;i++)if((i<5854||i>=6702)&&(i<5818||i>=5834))check(b[i]===orig[i],'Non-CAB change at '+i);
 for(let i=5818;i<5834;i+=2)check(b.readUInt16LE(i)<=3,'Invalid CAB scene channel');
 const words=Array.from({length:424},(_,i)=>b.readUInt16LE(5854+2*i));
 const channels=Array.from({length:4},(_,i)=>{
  const w=words.slice(i*106,(i+1)*106);check(w[31]===1,'Dyna-Cab only');
  return {channel:'ABCD'[i],mode:w[31],slot1:w[85],slot2:w[86]};
 });
 return {sha256:sha(bytes),words,channels,cabSceneChannels:cab[0].scene_channels};
}
export function pair(folder){
 const p=preflight(read(path.join(folder,'donor.syx'))),r=JSON.parse(read(path.join(folder,'capture.json')));
 check(r.txHex==='f0000174111f3e0035f7'&&r.txCalls===1&&r.txBytesWritten===10,'Expected one complete CAB GET');
 check(r.firmwareDeclared===13,'Firmware not 13');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Bad raw RX');
 const raw=Buffer.from(r.rawRxHex,'hex');check(raw.length===1312,'Unexpected RX length');
 const frames=[];let at=0;
 while(at<raw.length){let end=raw.indexOf(247,at+1);check(end>at,'Incomplete frame');const f=raw.subarray(at,end+1);
  check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Bad envelope');
  check([...f.subarray(1,-1)].every(v=>v<128),'Non-seven-bit data');
  check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Bad checksum');frames.push(f);at=end+1;
 }
 check(frames.map(f=>f[5]).join(',')==='116,117,117,118','Unexpected response order');
 check(frames.map(f=>f.length).join(',')==='12,778,514,8','Unexpected response sizes');
 check((frames[0][6]|frames[0][7]<<7)===62&&(frames[0][8]|frames[0][9]<<7)===424,'Wrong block/count');
 const values=[];
 for(const f of frames.slice(1,-1)){
  check((f[6]|f[7]<<7)===(f.length-10)/3,'Wrong section word count');
  for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Not uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 check(values.length===424&&values.every((v,i)=>v===p.words[i]),'GET/SYX mismatch');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames conflict');
 if(r.decoded?.values)check(JSON.stringify(r.decoded.values)===JSON.stringify(values),'Reported words conflict');
 return {paired:true,matchedWords:424,syxSha256:p.sha256,rawRxSha256:sha(raw),channels:p.channels};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,target]=process.argv.slice(2);let result;
 if(cmd==='preflight'){result=preflight(read(target));delete result.words;}
 else if(cmd==='pair')result=pair(target);else throw Error('Use preflight FILE or pair FOLDER');
 console.log(JSON.stringify(result));}catch(e){console.error(e.message);process.exitCode=1;}
}
