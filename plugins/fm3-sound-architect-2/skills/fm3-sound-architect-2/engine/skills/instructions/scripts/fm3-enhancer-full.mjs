import fs from 'node:fs';
import {enhancerRoundtrip,enhancerFeedback} from './fm3-enhancer-hardware.mjs';
import {auditEnhancerEvidence,enhancerSha,enhancerRanges,enhancerPids,enhancerEnums,encodeEnhancerControl,decodeEnhancerNumber} from './fm3-enhancer-audit.mjs';
export const enhancerLibraryHash='95d2146076e33175209d5270d93e7568ac5cc6695d1bf3b108b2adfabe4d2a21';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const enhancerKeys={width:'Width',depth:'Depth',lowCutHz:'Low Cut',highCutHz:'High Cut',levelDb:'Level',invert:'Invert',panLeft:'Pan L',panRight:'Pan R',balance:'Balance',sceneIgnore:'Scene Ignore'};
let cached;
export function loadEnhancerFull(){
 const bytes=read('references/enhancer-full.json');check(enhancerSha(bytes)===enhancerLibraryHash,'Enhancer registry changed; revalidate');
 const library=JSON.parse(bytes);
 for(const [file,hash] of Object.entries(library.files)){const [source,...parts]=file.split('/');check(enhancerSha(read('references/'+library.evidenceDirectories[source]+'/'+parts.join('/')))===hash,'Enhancer source changed: '+file);}
 if(cached)return cached;
 const roots=['full','supplement'].map(k=>new URL('../references/'+library.evidenceDirectories[k],import.meta.url).pathname);
 check(JSON.stringify(auditEnhancerEvidence(...roots))===JSON.stringify(library),'Enhancer registry differs from measured evidence');
 cached={library};return cached;
}
function decodeWithModel(words,m){
 const out={type:m.name};
 for(const [key,p] of Object.entries(enhancerKeys))if([...m.visibleNumeric,...m.visibleEnums].includes(p))out[key]=own(enhancerRanges,p)?decodeEnhancerNumber(p,words[enhancerPids[p]]):p==='Scene Ignore'?words[11]===1:enhancerEnums[p][words[enhancerPids[p]]];
 return out;
}
export function decodeEnhancerChannel(words){check(Array.isArray(words)&&words.length===12,'Expected 12 Enhancer words');const {library}=loadEnhancerFull(),m=library.models.find(m=>m.binaryId===words[6]);check(m,'Unknown Enhancer type');return decodeWithModel(words,m);}
// Shared pure encoder, also replayed against every captured single-control state.
export function applyEnhancerControl(words,parameter,value){check(Array.isArray(words)&&words.length===12&&Object.hasOwn(enhancerPids,parameter),'Invalid Enhancer control');const out=[...words];out[enhancerPids[parameter]]=encodeEnhancerControl(parameter,value);return out;}
export function composeEnhancerFull(selections){
 check(Array.isArray(selections)&&selections.length>=1&&selections.length<=4,'Enhancer requires 1..4 channel selections');
 const {library}=loadEnhancerFull(),seen=new Set(),data=[],channels=[];
 for(const s of selections){
  check(object(s),'Invalid Enhancer selection');
  check(typeof s.channel==='string'&&/^[ABCD]$/.test(s.channel)&&!seen.has(s.channel),'Invalid or duplicate Enhancer channel');seen.add(s.channel);
  const m=library.models.find(m=>m.name===s.type);check(m,'Explicit measured Enhancer type required');
  const visible=[...m.visibleNumeric,...m.visibleEnums];
  check(Object.keys(s).every(k=>['channel','type'].includes(k)||(own(enhancerKeys,k)&&visible.includes(enhancerKeys[k]))),'Unknown or hidden Enhancer field');
  check(own(s,'levelDb'),'Enhancer levelDb is required; captured type templates are not factory defaults');
  let words=[...m.words];const controls=[];
  for(const [key,p] of Object.entries(enhancerKeys))if(own(s,key)){
   if(key==='sceneIgnore')check(typeof s[key]==='boolean','Enhancer Scene Ignore must be boolean');
   const value=key==='sceneIgnore'?(s[key]?'ON':'OFF'):s[key];words=applyEnhancerControl(words,p,value);
   const raw=words[enhancerPids[p]],numeric=own(enhancerRanges,p),anchor=library.anchors.find(a=>a.type===m.name&&a.parameter===p&&a.value===value);
   const displayValue=numeric?(anchor?value:Number(decodeEnhancerNumber(p,raw).toFixed(2))):value;
   controls.push({key,parameterId:enhancerPids[p],value,displayValue,raw,origin:numeric?(anchor?'measured point':'scale-derived; independent screen check pending'):'measured enum',roundedDisplay:displayValue!==value,unit:p==='Level'?'dB':['Width','Depth'].includes(p)?'%':p.includes('Cut')?'Hz':''});
  }
  const bytes=Buffer.alloc(24);words.forEach((v,i)=>bytes.writeUInt16LE(v,2*i));data.push({channel:s.channel,bytes});
  channels.push({channel:s.channel,type:m.name,typeId:m.binaryId,sourceChannel:'A',sourceSyxSha256:m.sourceSha256,words,controls,effective:decodeWithModel(words,m),evidence:'docs/FM3_ENHANCER_FULL_AUDIT.json',scope:'Complete measured 12-word type template, then visible explicit overrides. PID5 and hidden controls preserved. A-D copies and independent Width measured; new combination hardware check pending.'});
 }
 return {wordsPerChannel:12,data,channels};
}
export function enhancerFullCapabilities(){const {library}=loadEnhancerFull(),feedback=enhancerFeedback();return {channels:[...'ABCD'],librarySha256:enhancerLibraryHash,types:library.models.map(m=>({name:m.name,id:m.binaryId,visibleNumeric:m.visibleNumeric,visibleEnums:m.visibleEnums})),parameters:Object.fromEntries(Object.entries(enhancerKeys).map(([k,p])=>[k,own(enhancerRanges,p)?{minimum:enhancerRanges[p].min,maximum:enhancerRanges[p].max,scale:enhancerRanges[p].log?'log':'linear'}:p==='Scene Ignore'?'boolean':enhancerEnums[p]])),required:['channel','type','levelDb'],sceneIgnore:'Persistent A word measured on all three types; full all-scene behavior not independently tested',bypass:'Use scene bypass; Bypass Mode is not exposed',opaquePids:[5],audit:{...library.audit,hardware:'Exact FM3_ENHANCER_ABCD_TEST import/export confirmed; all 13804 body bytes.'},hardwareEvidence:enhancerRoundtrip,cpu:feedback.cpu,audio:feedback.audio,hardware:'Exact combined A-D specimen imported and re-exported unchanged. User reports Enhancer works; maximum observed CPU52.7%. Other compositions require their own device evidence.'};}
