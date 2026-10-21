// Exact observed point lookups. Joint captures are not independent field trials.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const data=JSON.parse(fs.readFileSync(new URL('../references/wah-measured-controls.json',import.meta.url)));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const wahMeasuredFields=freeze(data.fields);
const check=(v,m)=>{if(!v)throw Error('Wah modifier: '+m);};
export function measuredControlsCapability(){return {
 field:'modifiers.wahControls',fullRange:false,interpolation:false,fieldIndependenceVerified:false,
 properties:Object.fromEntries(wahMeasuredFields.map(f=>[f.key,{word:f.word,offset:f.offset,unit:f.unit,values:f.points.map(p=>p.input),points:f.points}])),
 evidenceFile:'references/wah-measured-controls.json',
 evidence:'Two FW13 joint captures, native word bindings, and one isolated Max 7.50 -> 5.00 capture. Exact observed codes; new combinations are software-checked only.',
 requires:'Final External 1 -> Wah1 Control ALL binding and present Wah1',deviceBehavior:'not tested',audio:'not tested'};}
export function planMeasuredControls(body,request){
 if(request!==undefined)check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>wahMeasuredFields.some(f=>f.key===k)),'wahControls must contain only named measured fields');
 return Object.fromEntries(wahMeasuredFields.map(f=>{
  const before=body.readUInt16LE(f.offset),prior=f.points.find(p=>p.raw===before);
  check(prior,'retained configuration differs at word '+f.word);
  const requested=request!==undefined&&Object.hasOwn(request,f.key);
  const point=requested?f.points.find(p=>typeof request[f.key]==='number'&&Number.isFinite(request[f.key])&&p.input===request[f.key]):prior;
  check(point,f.key+' requires an exact measured display point; no interpolation');
  return [f.key,{requested:requested?request[f.key]:null,before,after:point.raw,display:point.display,changed:before!==point.raw,offset:f.offset,bytes:2,label:f.label,unit:f.unit,decimals:f.decimals}];
 }));
}
export function matchWahMeasuredDeviceBody(body){
 const hash=createHash('sha256').update(body).digest('hex'),capture=data.captures.find(c=>c.bodySha256===hash);
 if(!capture)return null;
 return {file:capture.file,sha256:capture.sha256,capture:capture.id,
  scope:'Entire body identical to reviewed user FW13 '+capture.id+' export, 2026-10-21; generated file not separately reimported',
  submittedFileConfirmed:false,audio:'not tested',cpu:'not validated',modifierBehavior:'not tested'};
}
export function renderMeasuredControls(controls){
 return Object.values(controls??{}).map(c=>`${c.label}: ${c.display.toFixed(c.decimals)}${c.unit==='%'?'%':c.unit==='ms'?' ms':''}; ${c.changed?'muudetud':'säilitatud'}; salvestatud kood ${c.after}${c.requested!==null&&c.requested!==c.display?`; sisestussiht ${c.requested}, mõõdetud kuvanäit ${c.display}`:''}.`);
}
