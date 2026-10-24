// Bounded Volume/Pan 1 policy: VOLUME and AUTO-SWELL types. TYPE is one word and a type change touches no other
// word (front-panel check 2026-10-24, references/fm3-step-diff-volume-type-20261024.json); writes are checked
// against the FINAL per-channel type, and a control hidden in that type is refused.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inputVolumeEvidenceHash} from './fm3-input-gate.mjs';
const bytes=fs.readFileSync(new URL('../references/fm3-input-volume-evidence.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==inputVolumeEvidenceHash)throw Error('Volume metadata drift');
const family=JSON.parse(bytes).families.VOLUME,TYPE_PID=9;
const allowedByType={0:new Set([0,1,2,4,5,6,7,8]),1:new Set([1,2,6,7,8,10,11,12,13])};
const allowed=new Set([...allowedByType[0],...allowedByType[1],TYPE_PID]);
export const volumeUnits=Object.freeze({VOLUME_GAIN:'/10',VOLUME_BAL:'%',VOLUME_PANL:'%',VOLUME_PANR:'%',VOLUME_LEVEL:'dB',VOLUME_THRESHOLD:'dB',VOLUME_ATTACK:'ms',VOLUME_RELEASE:'ms',VOLUME_HYSTERESIS:'dB'});
export function volumePolicySummary(){return {supported:true,block:'volpan',effectId:102,channels:['A','B','C','D'],insertField:'volumePan:true',types:['VOLUME','AUTO-SWELL'],typeControl:'controls param TYPE value VOLUME|AUTO-SWELL (allow:["enum-labels"])',
 parametersByType:{VOLUME:[...allowedByType[0]].map(pid=>family.parameters[pid].name),'AUTO-SWELL':[...allowedByType[1]].map(pid=>family.parameters[pid].name)},
 parameters:[...allowed].map(pid=>({pid,name:family.parameters[pid].name,kind:family.parameters[pid].kind,unit:volumeUnits[family.parameters[pid].name]??'',displayRange:family.parameters[pid].numericFields.slice(0,2).map(v=>v*family.parameters[pid].numericFields[2]),labels:family.parameters[pid].labels})),
 enumOptIn:'allow:["enum-labels"]',metadataSha256:inputVolumeEvidenceHash,hardwareEvidence:'one default FW13 record; 20 Input words preserved in the returned export',newPhysicalScaleMeasurements:0,fullRangeEncodingProven:false,
 frontPanelChecks:['references/fm3-step-diff-input-volume-20261024.json','references/fm3-step-diff-volume-type-20261024.json'],
 preserved:['TYPE unless written','channel BYPASS word','words of the other type','meter word','all existing records and system tail'],
 limits:['Controls hidden in the final type are refused (Volume/Pan L/R in AUTO-SWELL; Threshold/Attack/Release/Hysteresis in VOLUME)','Auto-Swell Release: the log curve is 0.05 % off the FM3 at 20 ms','volumePedal binds Volume and is refused with AUTO-SWELL','Use blockScenes.volpan for scene channel/bypass','New physical scales and authored combinations are model-based; no new live SET/STORE/audio/CPU proof','Default Ext1 binding uses separate volumePedal:true policy; no numeric Min/Max transfer']};}
export const volumeState=(p,read)=>p.family==='VOLUME'?{type:read(TYPE_PID)}:null;
export function volumeApplicability(p,state){
 if(p.family!=='VOLUME')return {covered:false};
 const type=state?.type,known=type===0||type===1,row=family.parameters.find(x=>x.pid===p.param);
 const visible=p.param===TYPE_PID||!!row?.cases.some(c=>c.types.includes(type)),inScope=known&&(p.param===TYPE_PID||allowedByType[type].has(p.param));
 return {covered:true,allowed:known&&inScope&&visible,typeId:type,typeName:type===0?'VOLUME':type===1?'AUTO-SWELL':'unknown',label:p.label,
 reason:!known?'unknown Volume type':!allowed.has(p.param)?'outside bounded Volume scope':!visible||!inScope?'hidden in final type '+(type===0?'VOLUME':'AUTO-SWELL'):null,
 source:'FW13 native/cache/XML, captured default VOLUME record, front-panel checks 2026-10-24'};
}
export function validateVolumeWrites(body,writes){
 const vol=writes.filter(w=>w.block==='volpan'),planned=new Map(vol.map(w=>[w.offset,w.raw]));
 for(const w of vol){
  if(w.effectId!==102)throw Error('Volume effect ID mismatch');
  const at=w.offset-2*w.pid,read=pid=>planned.get(at+2*pid)??body.readUInt16LE(at+2*pid);  // final type, even if TYPE is written later in the list
  const a=volumeApplicability({family:'VOLUME',param:w.pid,label:w.label},volumeState({family:'VOLUME'},read));
  if(!a.allowed)throw Error('Volume/Pan '+w.channel+' '+w.name+': '+a.reason);
  w.typeApplicability=a;w.encodingEvidence=w.pid===12?'log curve class; front panel 19.999 ms vs generator 19.989 ms at word 42623 (0.05 %)':'FW13 metadata and curve classes; front-panel checks 2026-10-24 matched the encoding';
 }
}
