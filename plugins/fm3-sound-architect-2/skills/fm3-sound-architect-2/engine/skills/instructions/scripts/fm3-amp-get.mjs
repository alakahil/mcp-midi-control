// Offline firmware-13 Amp GET decoder and paired-SYX importer. No device access.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';
import {catalog,importAmpLibrary} from './fm3-amp-library.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const xor=b=>b.reduce((a,v)=>a^v,0)&127;

export function decodeAmpGet(report,firmware){
 check(firmware===13&&report?.firmwareDeclared===13,'Require explicitly confirmed firmware 13');
 check(report.txHex==='f0000174111f3a0031f7'&&report.txCalls===1,'Expected one Amp1 GET');
 check(typeof report.rawRxHex==='string'&&/^(?:[0-9a-fA-F]{2})+$/.test(report.rawRxHex),'Invalid raw RX hex');
 const raw=Buffer.from(report.rawRxHex,'hex'),frames=[];
 check(raw.length===1778,'Unsupported/incomplete Amp reply length');
 for(let at=0;at<raw.length;){
  check(raw[at]===240,'Invalid frame boundary');
  const end=raw.indexOf(247,at+1);check(end>=0,'Incomplete frame');
  const f=raw.subarray(at,end+1);
  check(f.length>=8&&f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Wrong FM3 envelope');
  check([...f.subarray(1,-1)].every(v=>v<128),'Non-seven-bit data');
  check(xor(f.subarray(0,-2))===f.at(-2),'Frame checksum mismatch');
  frames.push(f);at=end+1;
 }
 check(frames.map(f=>f[5]).join(',')==='116,117,117,117,118','Unexpected frame sequence');
 check(frames.map(f=>f.length).join(',')==='12,778,778,202,8','Unsupported frame layout');
 const head=frames[0];check((head[6]|head[7]<<7)===58,'Not Amp1');
 check((head[8]|head[9]<<7)===576,'Expected 576 words');
 const values=[];
 for(const f of frames.slice(1,-1)){
  check((f[6]|f[7]<<7)===(f.length-10)/3,'Body word count mismatch');
  for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Invalid uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 // Redundant collector fields cannot override the independently decoded raw bytes.
 if(report.frames!==undefined)check(JSON.stringify(report.frames)===JSON.stringify(frames.map(f=>[...f])),'Reported frames disagree with raw RX');
 if(report.decoded?.values!==undefined)check(JSON.stringify(report.decoded.values)===JSON.stringify(values),'Reported values disagree with raw RX');
 const channels='ABCD'.split('').map((channel,k)=>{
  const bytes=Buffer.alloc(288);values.slice(k*144,(k+1)*144).forEach((v,i)=>bytes.writeUInt16LE(v,i*2));
  const modelId=bytes.readUInt16LE(12),model=catalog.models.find(m=>m.id===modelId);check(model,'Unknown model ID '+modelId);
  return {channel,modelId,name:model.name,channelBytesHex:bytes.toString('hex'),channelSha256:sha(bytes)};
 });
 return {schemaVersion:1,kind:'amp-get-capture',firmware:13,effectId:58,itemCount:576,rawRxSha256:sha(raw),checks:{frames:true,checksums:true,sevenBit:true,wordCounts:true},channels,validation:'transport-validated only; paired same-base SYX required for generator import'};
}

export function importAmpGet(base,reportBytes,donor,firmware,sourceName='capture.json',donorName='donor.syx'){
 const capture=decodeAmpGet(JSON.parse(reportBytes.toString('utf8')),firmware);
 // Reuse existing full-preset checks for layout, names and non-Amp dependencies.
 const library=importAmpLibrary(base,[{name:donorName,bytes:donor}],firmware);
 check(library.accepted.length===1&&library.rejected.length===0,'Paired SYX rejected: '+library.rejected.map(r=>r.reason).join('; '));
 const body=Buffer.from(inspect(donor).raw.body);
 for(const [i,ch] of capture.channels.entries())check(Buffer.from(ch.channelBytesHex,'hex').equals(body.subarray(4656+i*288,4656+(i+1)*288)),'GET/SYX mismatch in channel '+ch.channel);
 for(const t of Object.values(library.templates)){
  const ch=capture.channels.find(c=>c.channel===t.source.channel);
  t.channelBytesHex=ch.channelBytesHex;t.channelSha256=ch.channelSha256;
  t.source.get={file:sourceName,sha256:sha(reportBytes),rawRxSha256:capture.rawRxSha256,pairedSyxSha256:sha(donor)};
  t.validation='raw GET checksums and 576/576 words match same-base firmware13 SYX; generated output not hardware-tested';
 }
 return library;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,...args]=process.argv.slice(2);let result;
  if(command==='decode'){
   check(args.length===2,'Usage: decode CAPTURE.json 13');
   result=decodeAmpGet(JSON.parse(fs.readFileSync(args[0],'utf8')),Number(args[1]));
  }else if(command==='import'){
   check(args.length===5,'Usage: import BASE.syx CAPTURE.json SAME_STATE.syx OUTPUT.json 13');
   const [base,capture,donor,out,fw]=args;check(!fs.existsSync(out),'Output exists');
   result=importAmpGet(fs.readFileSync(base),fs.readFileSync(capture),fs.readFileSync(donor),Number(fw),path.basename(capture),path.basename(donor));
   fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   result={templates:Object.keys(result.templates),pairedMatch:true};
  }else throw Error('Use decode or import');
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
