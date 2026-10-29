// Wah Max: exact observed point lookup (target Wah Control codec). Curve / timing fields (Start, Mid, End, Slope,
// Attack, Release, Scale, Offset, Off Value): full-range native-descriptor codec (fm3-modifier-curve.mjs), which
// reproduces every observed point of these captures and the T12 one-field-per-step device check.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeCurveValue,decodeCurveWord,modifierCurveFields,verifyCurveEvidence} from './fm3-modifier-curve.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../references/wah-measured-controls.json',import.meta.url)));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const wahMeasuredFields=freeze(data.fields);
const check=(v,m)=>{if(!v)throw Error('Wah modifier: '+m);};
const curve=Object.fromEntries(modifierCurveFields.map(f=>[f.key,f]));
const curveEvidence=verifyCurveEvidence();
check(wahMeasuredFields.every(f=>f.key==='max'||curve[f.key]?.word===f.word),'curve field table mismatch');
const guard=fn=>{try{return fn();}catch(e){throw Error('Wah modifier: '+e.message);}};
export function measuredControlsCapability(){return {
 field:'modifiers.wahControls',fullRange:'curve and timing fields (Max: measured points only)',interpolation:'native descriptor formula for curve and timing fields',fieldIndependenceVerified:true,
 properties:Object.fromEntries(wahMeasuredFields.map(f=>[f.key,f.key==='max'?{word:f.word,offset:f.offset,unit:f.unit,values:f.points.map(p=>p.input),points:f.points}:{word:f.word,offset:f.offset,unit:f.unit,min:curve[f.key].min,max:curve[f.key].max,decimals:curve[f.key].decimals,measuredPoints:f.points}])),
 evidenceFile:'references/wah-measured-controls.json',curveCodec:'scripts/fm3-modifier-curve.mjs',curveDevicePoints:curveEvidence.points,
 evidence:'Two FW13 joint captures, native word bindings, one isolated Max 7.50 -> 5.00 capture, and the T12 one-field-per-step device check (2026-10-29). Max: exact observed codes. Curve and timing fields: native descriptor formula reproducing every observed point; values between them hardware-unverified.',
 requires:'Final External 1 -> Wah1 Control ALL binding and present Wah1',deviceBehavior:'not tested',audio:'not tested'};}
export function planMeasuredControls(body,request){
 if(request!==undefined)check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>wahMeasuredFields.some(f=>f.key===k)),'wahControls must contain only named measured fields');
 return Object.fromEntries(wahMeasuredFields.map(f=>{
  const before=body.readUInt16LE(f.offset),requested=request!==undefined&&Object.hasOwn(request,f.key);
  if(f.key!=='max'){
   check(f.points.some(p=>p.raw===before),'retained configuration differs at word '+f.word);  // bases carry known words only
   const after=requested?guard(()=>encodeCurveValue(f.key,request[f.key])):before,measured=f.points.some(p=>p.raw===after);
   return [f.key,{requested:requested?request[f.key]:null,before,after,display:decodeCurveWord(f.key,after),changed:before!==after,offset:f.offset,bytes:2,label:f.label,unit:f.unit,decimals:f.decimals,basis:measured?'measured point':'descriptor formula'}];
  }
  const prior=f.points.find(p=>p.raw===before);
  check(prior,'retained configuration differs at word '+f.word);
  const point=requested?f.points.find(p=>typeof request[f.key]==='number'&&Number.isFinite(request[f.key])&&p.input===request[f.key]):prior;
  check(point,f.key+' requires an exact measured display point; no interpolation');
  return [f.key,{requested:requested?request[f.key]:null,before,after:point.raw,display:point.display,changed:before!==point.raw,offset:f.offset,bytes:2,label:f.label,unit:f.unit,decimals:f.decimals,basis:'measured point'}];
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
 return Object.values(controls??{}).filter(c=>!c.exactDecimal).map(c=>`${c.label}: ${c.display.toFixed(c.decimals)}${c.unit==='%'?'%':c.unit==='ms'?' ms':''}; ${c.changed?'muudetud':'säilitatud'}; salvestatud kood ${c.after}${c.requested!==null&&c.requested!==c.display?`; sisestussiht ${c.requested}, ${c.basis==='measured point'?'mõõdetud':'valemi järgi'} kuvanäit ${c.display}`:''}${c.basis==='descriptor formula'?' (valem, seadmel mõõtmata väärtus)':''}.`);
}
