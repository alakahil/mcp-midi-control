// Offline session merge. Revalidates every complete GET/SYX pair; never touches hardware.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {decodeAmpGet,importAmpGet} from './fm3-amp-get.mjs';
import {BASE_SHA256} from './fm3-prototype.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
function readFile(p){check(fs.lstatSync(p).isFile(),'Not a regular file: '+p);return fs.readFileSync(p);}
export function inspectSession(root,base){
 check(fs.lstatSync(root).isDirectory(),'Session must be a real directory');
 const marker=JSON.parse(readFile(path.join(root,'session.json')));
 check(marker.kind==='fm3-amp-session'&&marker.schemaVersion===1&&marker.firmware===13,'Incompatible session');
 const variants=new Map(),captures=[],rejected=[];
 for(const name of fs.readdirSync(root).filter(n=>/^capture-[A-Za-z0-9_-]+$/.test(n)).sort()){
  const dir=path.join(root,name),entry={id:name};captures.push(entry);
  try{
   check(fs.lstatSync(dir).isDirectory(),'Capture must be a real directory');
   if(!fs.existsSync(path.join(dir,'capture.json'))){entry.state='interrupted';continue;}
   const bytes=readFile(path.join(dir,'capture.json')),report=JSON.parse(bytes);
   if(report.status==='failed'){entry.state='failed';entry.reason=report.error??'Failed capture';continue;}
   const cap=decodeAmpGet(report,13);entry.models=cap.channels.map(c=>c.name);
   if(!fs.existsSync(path.join(dir,'donor.syx'))){entry.state='awaiting-syx';continue;}
   const donor=readFile(path.join(dir,'donor.syx'));
   const lib=importAmpGet(base,bytes,donor,13,name+'/capture.json',name+'/donor.syx');
   // Do not collapse different same-model channels within one capture.
   for(const ch of cap.channels){
    const item=structuredClone(lib.templates[ch.name]);
    item.channelBytesHex=ch.channelBytesHex;item.channelSha256=ch.channelSha256;item.source.channel=ch.channel;
    const byHash=variants.get(ch.name)??new Map();variants.set(ch.name,byHash);
    if(byHash.has(ch.channelSha256))byHash.get(ch.channelSha256).sources.push(item.source);
    else byHash.set(ch.channelSha256,{...item,sources:[item.source]});
   }
   entry.state='paired-verified';
  }catch(e){entry.state='rejected';entry.reason=e.message;rejected.push(entry);}
 }
 const conflicts=[...variants].filter(([,v])=>v.size>1).map(([name,v])=>({name,variants:[...v.values()].map(t=>({sha256:t.channelSha256,sources:t.sources}))}));
 const templates=Object.fromEntries([...variants].filter(([,v])=>v.size===1).map(([n,v])=>[n,[...v.values()][0]]));
 const duplicates=[...variants].flatMap(([name,v])=>[...v.values()].filter(t=>t.sources.length>1).map(t=>({name,sha256:t.channelSha256,occurrences:t.sources.length})));
 return {schemaVersion:1,baseSha256:BASE_SHA256,firmware:13,templates,captures,rejected,conflicts,duplicates};
}
export function buildSession(root,base,out){
 const result=inspectSession(root,base);
 check(!result.rejected.length,'Rejected captures: '+result.rejected.map(x=>x.id+': '+x.reason).join('; '));
 check(!result.conflicts.length,'Conflicting model variants: '+result.conflicts.map(x=>x.name).join(', '));
 check(Object.keys(result.templates).length>0,'No paired verified templates');
 const tmp=out+'.'+randomUUID()+'.pending';
 const fd=fs.openSync(tmp,'wx');
 try{fs.writeFileSync(fd,JSON.stringify(result,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 try{fs.linkSync(tmp,out);}finally{fs.unlinkSync(tmp);}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,root,base,out,...extra]=process.argv.slice(2);
  check(root&&base&&!extra.length&&(['status','build'].includes(command))&&(command==='build'?Boolean(out):!out),'Usage: status SESSION BASE.syx | build SESSION BASE.syx NEW_LIBRARY.json');
  const r=command==='build'?buildSession(root,readFile(base),out):inspectSession(root,readFile(base));
  console.log(JSON.stringify({templates:Object.keys(r.templates),captures:r.captures,duplicates:r.duplicates,conflicts:r.conflicts,rejected:r.rejected},null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
