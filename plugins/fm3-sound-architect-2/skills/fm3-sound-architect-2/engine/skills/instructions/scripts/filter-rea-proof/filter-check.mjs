// Read-only file validation for the 2026-10-08 Filter evidence and targeted gap plan.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import readline from 'node:readline';
import {inspectStructure} from '../drive-collector/fm3-prototype.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(p), sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m);};
const seed=read(path.join(here,'../../references/filter-rea-20261012/baseline.syx'));
check(sha(seed)==='5be74c3f11b097732cb276c22b7c757470b3a8087660afb0888d6d43c022fc49','Alusfaili kontrollsumma erineb');
const originalState=inspectStructure(seed), original=Buffer.from(originalState.raw.body);
const plan=JSON.parse(read(path.join(here,'plan.json')));
const allowed=new Set(plan.flatMap(s=>s.targets.map(t=>'ABCD'.indexOf(t.channel)*37+t.parameterId)));
const byteAllowed=new Set([...allowed].flatMap(i=>[7614+i*2,7615+i*2]));
function envelope(s){
 const raw=Buffer.from(s.raw.rawPatch),base=Buffer.from(originalState.raw.rawPatch);
 check(Buffer.from(s.parsed.headerPayload).equals(Buffer.from(originalState.parsed.headerPayload)),'Dump päis muutus');
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<40))check(raw[i]===base[i],'Preseti päis muutus väljaspool nimevälja: '+i);
 check(raw.readUInt16LE(72)===s.raw.body.length&&raw.readUInt16LE(74)===s.raw.compSize,'Vigane kodeeritud pikkus');
 check(raw.subarray(76+s.raw.compSize).every(v=>v===0),'Täitebaidid muutusid');
}
export function preflight(bytes){
 const s=inspectStructure(bytes);envelope(s);const b=Buffer.from(s.raw.body);
 check(b.length===13146,'Preseti andmete pikkus muutus');
 // Scope is the union of planned individual words, not a whole channel/block.
 for(let i=0;i<b.length;i++)if(!byteAllowed.has(i)&&i!==7580&&i!==7581){
  const bypass=i>=7594&&i<7610;
  check(b[i]===original[i],bypass?'Filteri Bypass muutus. Hoia Filter kõigis stseenides bypass-olekus.':'Plaaniväline muudatus bait '+i+'. Taasta viimane edukas fail.');
 }
 check(b.readUInt16LE(7568)===114&&b.readUInt16LE(7610)===37&&b.readUInt16LE(7612)===4,'Filteri paigutus erineb');
 const words=Array.from({length:148},(_,i)=>b.readUInt16LE(7614+i*2));
 check([3,1,6,8].every((v,i)=>words[i*37]===v),'Filteri Type muutus');
 const sceneChannels=Array.from({length:8},(_,i)=>b.readUInt16LE(7578+i*2));
 const sceneBypass=Array.from({length:8},(_,i)=>b.readUInt16LE(7594+i*2));
 check(sceneChannels.every(x=>x<=3)&&sceneBypass.every(x=>x===1),'Filteri kanal või bypass erineb');
 return {sha256:sha(bytes),presetName:s.decoded.preset_name,presetNameHex:Buffer.from(s.raw.rawPatch).subarray(8,40).toString('hex'),bodySha256:sha(b),words,sceneChannels,sceneBypass};
}
export function compare(previous,current,index){
 const step=plan[index];check(Number.isInteger(index)&&step,'Tundmatu plaanisamm');
 const a=preflight(previous),b=preflight(current),active='ABCD'.indexOf(step.activeChannel);
 check(b.sceneChannels[1]===active,'Vali Scene 2 Filteri kanal '+step.activeChannel+' ja ekspordi uuesti. GET-i ei saadetud.');
 const permitted=new Set(step.targets.map(t=>'ABCD'.indexOf(t.channel)*37+t.parameterId));
 const changes=[];
 for(let i=0;i<148;i++)if(a.words[i]!==b.words[i]){
  check(permitted.has(i),'Muutus vale parameeter: kanal '+'ABCD'[Math.floor(i/37)]+', PID '+i%37+'. GET-i ei saadetud.');
  changes.push({channel:'ABCD'[Math.floor(i/37)],pid:i%37,offset:7614+i*2,before:a.words[i],after:b.words[i]});
 }
 const targets=step.targets.map(t=>{const n='ABCD'.indexOf(t.channel)*37+t.parameterId;return {channel:t.channel,pid:t.parameterId,before:a.words[n],after:b.words[n],wordChanged:a.words[n]!==b.words[n]};});
 return {index,step,previousSha256:a.sha256,syxSha256:b.sha256,bodySha256:b.bodySha256,changedWords:changes,targets,
  presetNameChange:a.presetNameHex===b.presetNameHex?null:{before:a.presetName,after:b.presetName,beforeHex:a.presetNameHex,afterHex:b.presetNameHex},
  scene2ChannelChange:a.sceneChannels[1]===b.sceneChannels[1]?null:{before:'ABCD'[a.sceneChannels[1]],after:step.activeChannel},
  allOtherBodyBytesPreserved:true,allTypesAndBypassPreserved:true,
  mappingStatus:'pending-real-display-and-GET-pair; unchanged words are not isolated-change evidence'};
}
export function pair(folder){
 const p=preflight(read(path.join(folder,'donor.syx'))),r=JSON.parse(read(path.join(folder,'capture.json')));
 check(r.status==='captured','GET pole edukas');
 check(r.txHex==='f0000174111f720079f7'&&r.txCalls===1&&r.txBytesWritten===10,'Oodatud üks täielik Filter GET');
 check(typeof r.rawRxHex==='string'&&/^(?:[a-fA-F0-9]{2})+$/.test(r.rawRxHex),'Vigane toorvastus');
 const raw=Buffer.from(r.rawRxHex,'hex'),frames=[];let partial=null;
 for(const v of raw){if(v>=248)continue;if(v===240){check(!partial,'Kattuv kaadri algus');partial=[v];}else if(v===247){check(partial,'Algus puudub');frames.push(Buffer.from([...partial,v]));partial=null;}else{check(partial&&v<128,'Vigane andmevoog');partial.push(v);}}
 check(!partial,'Poolik vastus');
 check(frames.length>=3&&frames[0][5]===116&&frames.at(-1)[5]===118&&frames.slice(1,-1).every(f=>f[5]===117),'Vale vastuste järjekord');
 check(frames[0].length===12&&frames.at(-1).length===8,'Vale vastuse pikkus');
 for(const f of frames){check(f.subarray(0,5).equals(Buffer.from([240,0,1,116,17])),'Vale seadme vastus');check((f.subarray(0,-2).reduce((a,b)=>a^b,0)&127)===f.at(-2),'Vastuse kontrollsumma erineb');}
 check((frames[0][6]|frames[0][7]<<7)===114&&(frames[0][8]|frames[0][9]<<7)===148,'Vale plokk või sõnade arv');
 const values=[];
 for(const f of frames.slice(1,-1)){
  const count=f[6]|f[7]<<7;
  check(count>0&&count<=256&&f.length===10+count*3,'Vale vastuselõigu suurus');
  for(let i=8;i<f.length-2;i+=3){check(f[i+2]<=3,'Vigane uint16');values.push(f[i]|f[i+1]<<7|f[i+2]<<14);}
 }
 check(values.length===148&&values.every((v,i)=>v===p.words[i]),'GET/SYX erineb. Seade peab vastama antud ekspordile.');
 if(r.frames)check(JSON.stringify(r.frames)===JSON.stringify(frames.map(f=>[...f])),'Raporti kaadrid erinevad');
 const reported=r.decoded?.values||r.response?.values;
 if(reported)check(JSON.stringify(reported)===JSON.stringify(values),'Raporti väärtused erinevad');
 if(r.syxSha256)check(r.syxSha256===p.sha256,'Ekspordi kontrollsumma erineb');
 return {paired:true,matchedWords:148,syxSha256:p.sha256,bodySha256:p.bodySha256,rawRxSha256:sha(raw)};
}
function dispatch([cmd,target,current,index]){
 let r;
  if(cmd==='compare')r=compare(read(target),read(current),Number(index));
  else if(cmd==='preflight')r=preflight(read(target));
  else if(cmd==='pair')r=pair(target);
  else throw Error('Use preflight FILE, compare PREVIOUS CURRENT INDEX or pair FOLDER');
 return r;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]==='--server'){
  // Private stdio child only: no sockets, network, MIDI or device access.
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
   try{const args=JSON.parse(line);check(Array.isArray(args),'Expected argument list');console.log(JSON.stringify({ok:true,value:dispatch(args)}));}
   catch(e){console.log(JSON.stringify({ok:false,error:e.message}));}
  }
 }else{
  try{console.log(JSON.stringify(dispatch(process.argv.slice(2))));}
  catch(e){console.error(e.message);process.exitCode=1;}
 }
}
