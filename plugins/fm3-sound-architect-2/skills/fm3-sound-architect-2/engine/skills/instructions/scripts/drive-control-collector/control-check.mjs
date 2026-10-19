import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {inspect} from './fm3-prototype.mjs';import {preflight,pair} from './drive-check.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const plan=JSON.parse(fs.readFileSync(path.join(here,'plan.json')));
const check=(x,m)=>{if(!x)throw Error(m)};
export function compare(previous,current,index){
 const step=plan[index];check(step,'Unknown step');
 preflight(current);const a=inspect(previous),b=inspect(current);
 check(a.validation.ok&&b.validation.ok,'Integrity failed');
 check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'Dump header changed');
 const nameBytes=x=>Buffer.from(x.raw.rawPatch).subarray(8,39);
 const presetNameChange=nameBytes(a).equals(nameBytes(b))?null:{before:nameBytes(a).toString('utf8').replace(/\0/g,'').trimEnd(),after:nameBytes(b).toString('utf8').replace(/\0/g,'').trimEnd(),beforeHex:nameBytes(a).toString('hex'),afterHex:nameBytes(b).toString('hex')};
 for(let i=0;i<72;i++)if(i!==4&&i!==5&&!(i>=8&&i<39))check(a.raw.rawPatch[i]===b.raw.rawPatch[i],'Raw header changed at '+i);
 const old=Buffer.from(a.raw.body),body=Buffer.from(b.raw.body),changes=[];
 const channel='ABCD'.indexOf(step.channel),start=8460+channel*88;
 const selection=8424+old[0]*2;
 for(let i=0;i<body.length;i++)if(old[i]!==body[i]){
  changes.push({offset:i,before:old[i],after:body[i]});
  const allowed=step.kind==='type'?((i>=start&&i<start+88)||i===selection||i===selection+1):step.kind==='control'?(i===start+step.pid*2||i===start+step.pid*2+1):false;
  check(allowed,'Ootamatu muudatus baidil '+i+'; taasta eelmise eduka katse preset ja korda ainult antud muudatust.');
 }
 let observation=null;
 if(step.kind!=='baseline'){
  check(body.readUInt16LE(start)===step.binaryId,'Vale Drive tüüp');
  check(body.readUInt16LE(selection)===channel,'Vali ülesandes nimetatud Drive kanal');
 }
 if(step.kind==='control'){
  check(changes.length>0,'Väärtus ei muutunud. Kui see oli juba sama, kasuta s.');
  const offset=start+step.pid*2;
  observation={field:step.field,userConfirmedDisplayValue:step.value,rawBefore:old.readUInt16LE(offset),rawAfter:body.readUInt16LE(offset),candidateRaw:Math.round(step.value/(step.field==='Mix'?100:10)*65534)};
  observation.matchesCandidate=observation.rawAfter===observation.candidateRaw;
 }
 return {step,changes,presetNameChange,observation,integrity:true,onlyPlannedBodyChanges:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,...args]=process.argv.slice(2);let out;
 if(cmd==='compare')out=compare(fs.readFileSync(args[0]),fs.readFileSync(args[1]),Number(args[2]));
 else if(cmd==='pair')out=pair(args[0]);else throw Error('Unknown command');
 console.log(JSON.stringify(out));}catch(e){console.error(e.message);process.exitCode=1;}
}
