// Firmware 13 paired templates, with separately identified scale-derived values.
import fs from 'node:fs';
import {geqDisplayEvidence} from './fm3-geq-hardware.mjs';
import {auditGeqEvidence,geqSha,geqRanges,encodeGeqNumber,decodeGeqNumber} from './fm3-geq-audit.mjs';
export {encodeGeqNumber};
export const geqFullLibraryHash='c0bb60d52c1819ecbea4a959d3cfa8d19501c46735da05a086a93333d459e8d0';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
let cached;
export function loadGeqFull(){
 const bytes=read('references/geq-full.json');check(geqSha(bytes)===geqFullLibraryHash,'GEQ registry changed; revalidate');
 const library=JSON.parse(bytes),root='references/'+library.evidenceDirectory+'/';
 for(const [file,hash] of Object.entries(library.files))check(geqSha(read(root+file))===hash,'GEQ source changed: '+file);
 const displayEvidence=geqDisplayEvidence();
 if(cached)return cached;
 const audit=auditGeqEvidence(new URL('../'+root,import.meta.url).pathname);
 check(JSON.stringify(audit)===JSON.stringify(library),'GEQ derived registry differs from evidence');
 const label=displayEvidence.labelResolution;
 const band=library.models.find(m=>m.name===label.type).bands[label.band-1];
 check(band.capturedLabel===label.originalCapturedLabel,'GEQ original label changed');
 band.label=label.label;band.labelStatus=label.status;band.labelEvidence=displayEvidence.screenshot.file;
 cached={library,root,audit:{...library.audit,pendingLabels:[],resolvedLabels:[label],hardware:'Exact combined preset import/export confirmed; user reports GEQ worked and maximum observed CPU50%. Other combinations remain separate.'}};return cached;
}
function decodeWithModel(words,m){return {type:m.name,bands:m.bands.map(b=>({band:b.band,label:b.label??'Band '+b.band+' (silt kinnitamata)',labelStatus:b.labelStatus,gainDb:decodeGeqNumber('Gain',words[b.pid])})),masterQ:decodeGeqNumber('Master Q',words[16]),levelDb:decodeGeqNumber('Level',words[11]),balance:decodeGeqNumber('Balance',words[12]),bypassMode:['Thru','Mute'][words[13]]??'Unknown',sceneIgnore:words[19]===1};}
export function decodeGeqChannel(words){check(Array.isArray(words)&&words.length===20,'Expected 20 GEQ words');const {library}=loadGeqFull(),m=library.models.find(m=>m.binaryId===words[15]);check(m,'Unknown GEQ type');return decodeWithModel(words,m);}
export function composeGeqFull(selections){
 check(Array.isArray(selections)&&selections.length>=1&&selections.length<=4,'GEQ requires 1..4 channel selections');
 const {library}=loadGeqFull(),seen=new Set(),data=[],channels=[];
 for(const s of selections){
  check(object(s)&&Object.keys(s).every(k=>['channel','type','bands','masterQ','levelDb','balance','bypassMode','sceneIgnore'].includes(k)),'Unknown GEQ field');
  check(typeof s.channel==='string'&&/^[ABCD]$/.test(s.channel)&&!seen.has(s.channel),'Invalid or duplicate GEQ channel');seen.add(s.channel);
  const m=library.models.find(m=>m.name===s.type);check(m,'Explicit measured GEQ type required');
  const words=[...m.words],controls=[];
  const set=(pid,key,parameter,value,band=null)=>{
   const numeric=own(geqRanges,parameter);let raw,origin,displayValue=value;
   if(numeric){raw=encodeGeqNumber(parameter,value);const anchor=library.anchors.find(a=>a.type===m.name&&a.parameter===parameter&&a.band===band&&a.value===value);
    origin=anchor?'measured point':'scale-derived; independent screen check pending';displayValue=anchor?value:Number(decodeGeqNumber(parameter,raw).toFixed(2));
   }else{const list=parameter==='Bypass Mode'?['Thru','Mute']:['OFF','ON'];raw=list.indexOf(value);check(raw>=0,'Invalid GEQ '+parameter);origin='measured enum';}
   words[pid]=raw;controls.push({key,band,parameterId:pid,value,displayValue,raw,origin,roundedDisplay:displayValue!==value,unit:['Gain','Level'].includes(parameter)?'dB':''});
  };
  if(own(s,'bands')){
   check(Array.isArray(s.bands)&&s.bands.length>=1&&s.bands.length<=m.bandCount,'Invalid GEQ bands');const seenBands=new Set();
   for(const b of s.bands){
    check(object(b)&&Object.keys(b).length===2&&own(b,'band')&&own(b,'gainDb'),'GEQ band requires band and gainDb only');
    check(Number.isInteger(b.band)&&b.band>=1&&b.band<=m.bandCount&&!seenBands.has(b.band),'Invalid or duplicate GEQ band');seenBands.add(b.band);
    set(m.bands[b.band-1].pid,'bands.'+b.band+'.gainDb','Gain',b.gainDb,b.band);
   }
  }
  for(const [key,pid,parameter] of [['masterQ',16,'Master Q'],['levelDb',11,'Level'],['balance',12,'Balance'],['bypassMode',13,'Bypass Mode']])if(own(s,key))set(pid,key,parameter,s[key]);
  if(own(s,'sceneIgnore')){check(typeof s.sceneIgnore==='boolean','GEQ Scene Ignore must be boolean');set(19,'sceneIgnore','Scene Ignore',s.sceneIgnore?'ON':'OFF');}
  const bytes=Buffer.alloc(40);words.forEach((v,i)=>bytes.writeUInt16LE(v,2*i));data.push({channel:s.channel,bytes});
  channels.push({channel:s.channel,type:m.name,typeId:m.binaryId,sourceChannel:'A',sourceSyxSha256:m.sourceSha256,words,controls,effective:decodeWithModel(words,m),evidence:'docs/FM3_GEQ_FULL_AUDIT.json',scope:'Whole paired type template then explicit overrides; A-D transfer supported by full copies and independent gain/scene samples. New combinations require device check.'});
 }
 return {wordsPerChannel:20,data,channels};
}
export function geqFullCapabilities(){const {library,audit}=loadGeqFull();return {channels:[...'ABCD'],librarySha256:geqFullLibraryHash,types:library.models.map(m=>({name:m.name,id:m.binaryId,bands:m.bands,masterQVisible:m.masterQVisible})),gainDb:{minimum:-12,maximum:12},masterQ:{minimum:.1,maximum:10,scale:'log'},levelDb:{minimum:-80,maximum:20},balance:{minimum:-100,maximum:100},bypassMode:['Thru','Mute'],sceneIgnore:'boolean; persistent word measured on A, full behavior not independently tested',reservedPids:[10,14,17,18],frequency:'Type-specific fixed labels; not editable. Use 1-based band indices. 7 Band Constant Q first label confirmed as 100 Hz from screenshot.',audit,hardware:'Exact FM3_GEQ_ABCD_TEST import/export confirmed, all 13662 body bytes. User reports GEQ worked; maximum observed CPU50%. Other compositions require their own evidence.'};}
