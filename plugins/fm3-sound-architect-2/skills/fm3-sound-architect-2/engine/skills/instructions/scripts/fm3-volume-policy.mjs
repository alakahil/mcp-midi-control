// Bounded VOLUME type only. Alternate Auto-Swell templates are not captured.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inputVolumeEvidenceHash} from './fm3-input-gate.mjs';
const bytes=fs.readFileSync(new URL('../references/fm3-input-volume-evidence.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==inputVolumeEvidenceHash)throw Error('Volume metadata drift');
const family=JSON.parse(bytes).families.VOLUME,allowed=new Set([0,1,2,4,5,6,7,8]);
export const volumeUnits=Object.freeze({VOLUME_GAIN:'/10',VOLUME_BAL:'%',VOLUME_PANL:'%',VOLUME_PANR:'%',VOLUME_LEVEL:'dB'});
export function volumePolicySummary(){return {supported:true,block:'volpan',effectId:102,channels:['A','B','C','D'],insertField:'volumePan:true',type:'VOLUME',
 parameters:[...allowed].map(pid=>({pid,name:family.parameters[pid].name,kind:family.parameters[pid].kind,unit:volumeUnits[family.parameters[pid].name]??'',displayRange:family.parameters[pid].numericFields.slice(0,2).map(v=>v*family.parameters[pid].numericFields[2]),labels:family.parameters[pid].labels})),
 enumOptIn:'allow:["enum-labels"]',metadataSha256:inputVolumeEvidenceHash,hardwareEvidence:'one default FW13 record; 20 Input words preserved in the returned export',newPhysicalScaleMeasurements:0,fullRangeEncodingProven:false,
 preserved:['TYPE','channel BYPASS word','Auto-Swell inactive words','meter word','all existing records and system tail'],
 limits:['VOLUME type only; TYPE/Auto-Swell authoring excluded','Use blockScenes.volpan for scene channel/bypass','New physical scales and authored combinations are model-based; no new live SET/STORE/audio/CPU proof','No new modifier binding or Min/Max transfer']};}
export const volumeState=(p,read)=>p.family==='VOLUME'?{type:read(9)}:null;
export function volumeApplicability(p,state){
 if(p.family!=='VOLUME')return {covered:false};
 const type=state?.type,row=family.parameters.find(x=>x.pid===p.param),visible=!!row?.cases.some(c=>c.types.includes(type));
 return {covered:true,allowed:type===0&&allowed.has(p.param)&&visible,typeId:type,typeName:type===0?'VOLUME':type===1?'AUTO-SWELL':'unknown',label:p.label,
 reason:type!==0?'only captured VOLUME type is supported':!allowed.has(p.param)?'outside bounded Volume scope':!visible?'hidden in final type':null,
 source:'FW13 native/cache/XML plus captured default VOLUME record; no per-value hardware scale claim'};
}
export function validateVolumeWrites(body,writes){
 for(const w of writes.filter(w=>w.block==='volpan')){
  if(w.effectId!==102)throw Error('Volume effect ID mismatch');
  const at=w.offset-2*w.pid,a=volumeApplicability({family:'VOLUME',param:w.pid,label:w.label},volumeState({family:'VOLUME'},pid=>body.readUInt16LE(at+2*pid)));
  if(!a.allowed)throw Error('Volume/Pan: '+a.reason);
  w.typeApplicability=a;w.encodingEvidence='FW13 metadata and existing curve classes; captured defaults, not a new parameter sweep';
 }
}
