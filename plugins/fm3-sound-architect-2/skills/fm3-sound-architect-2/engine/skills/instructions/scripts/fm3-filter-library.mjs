import {fileURLToPath} from 'node:url';
// Exact captured Filter channel templates, with a fresh offline GET/SYX check.
// This supplies the unified composer; it does not send device commands.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {pair,preflight} from './filter-collector/filter-check.mjs';
import {filterControlFields,loadFilterControls,applyFilterControls} from './fm3-filter-controls.mjs';
const check=(v,m)=>{if(!v)throw Error(m)},sha=b=>createHash('sha256').update(b).digest('hex');
export const filterLibraryHash='283b85c5c4c5121a754b0f70157c8d54c6c83c53bed9236e878eb81e396f3997';
export function composeFilterTemplates(selections){
 check(Array.isArray(selections)&&selections.length>=1&&selections.length<=4,'Expected 1..4 Filter channels');
 const bytes=fs.readFileSync(new URL('../references/filter-library.json',import.meta.url));check(sha(bytes)===filterLibraryHash,'Filter library changed; revalidate evidence');
 const lib=JSON.parse(bytes);check(lib.count===18&&lib.models.length===18&&lib.effectId===114&&lib.typeParameterId===0&&lib.wordsPerChannel===37,'Invalid Filter library');
 const seen=new Set(),proofs=new Map(),channels=[],data=[];
 let measured=null;
 for(const s of selections){
  check(s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).every(k=>['channel','type',...filterControlFields].includes(k)),'Unknown Filter field; use channel/type and supported measured controls');
  check(typeof s.channel==='string'&&/^[ABCD]$/.test(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Filter channel');seen.add(s.channel);
  const model=lib.models.find(m=>m.name===s.type);check(model&&model.words.length===37&&model.words[0]===model.binaryId,'Unknown or invalid Filter template');
  if(!proofs.has(model.sourceCapture)){
   const dir=new URL('../references/'+lib.evidenceDirectory+'/'+model.sourceCapture+'/',import.meta.url);
   proofs.set(model.sourceCapture,{proof:pair(fileURLToPath(dir)),state:preflight(fs.readFileSync(new URL('donor.syx',dir)))});
  }
  const {proof,state}=proofs.get(model.sourceCapture),offset='ABCD'.indexOf(model.sourceChannel)*37;
  check(proof.syxSha256===model.syxSha256&&proof.rawRxSha256===model.rawRxSha256&&model.words.every((v,i)=>v===state.words[offset+i]),'Filter template differs from paired source');
  const raw=Buffer.alloc(74);model.words.forEach((v,i)=>{check(Number.isInteger(v)&&v>=0&&v<=65535,'Invalid Filter word');raw.writeUInt16LE(v,i*2)});
  const requested=filterControlFields.some(k=>Object.hasOwn(s,k));
  if(requested&&!measured)measured=loadFilterControls();
  const controls=requested?applyFilterControls(raw,s,measured):[];
  channels.push({channel:s.channel,type:model.name,binaryId:model.binaryId,sourceChannel:model.sourceChannel,sourceCapture:model.sourceCapture,sourceSyxSha256:model.syxSha256,sourceRawRxSha256:model.rawRxSha256,words:Array.from({length:37},(_,i)=>raw.readUInt16LE(i*2)),...(controls.length?{controls}:{})});
  data.push({channel:s.channel,bytes:raw});
 }
 return {channels,wordsPerChannel:37,data};
}
