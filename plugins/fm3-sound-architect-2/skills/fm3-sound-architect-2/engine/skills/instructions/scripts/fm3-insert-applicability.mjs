// Firmware-active XML visibility; scalar support and tempo locks are separate.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const insertPolicyHash='9cedfafba267139f220224ac63a6013dd524c1c0914b49207368f590c3eb0b2a';
const bytes=fs.readFileSync(new URL('../references/fm3-insert-applicability.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==insertPolicyHash)throw Error('Insert applicability policy changed; review and regenerate');
const policy=JSON.parse(bytes);
// Name-only overlay. Keep the historical dictionary and every scalar field intact.
export function effectiveInsertParameter(p){
  const r=policy.families[p.family]?.parameters[p.param];
  if(!r||!Object.hasOwn(r,'dictionaryName'))return p;
  if(p.family!=='MIXER'||p.param<17||p.param>20||p.name!==null||r.dictionaryName!==null||r.name!=='MIXER_DELAY'+(p.param-16))throw Error('Mixer native name binding differs');
  return {...p,dictionaryName:p.name,name:r.name,label:r.label};
}
export function insertState(p,read){
  const f=policy.families[p.family];
  return f?{type:f.selectorPid===null?0:read(f.selectorPid)}:null;
}
export function insertApplicability(p,state){
  const f=policy.families[p.family];if(!f)return {covered:false};
  const r=f.parameters[p.param];
  if(!r||r.name!==p.name)throw Error('Insert policy binding mismatch: '+p.name);
  const type=state?.type,valid=Number.isInteger(type)&&type>=0&&type<(f.typeLabels?.length??1);
  const cases=valid?r.cases.filter(c=>c.types.includes(type)):[];
  const labels=[...new Set(cases.map(c=>c.label.replace(/\s+/g,' ').trim()).filter(Boolean))];
  return {covered:true,allowed:valid&&cases.length>0,stateValid:valid,typeId:type,
    typeName:f.typeLabels?.[type]??(valid?'type-free':'unknown'),selectorPid:f.selectorPid,
    label:labels.length===1?labels[0]:p.label,reason:valid?r.reason:'unknown final type',
    source:'FW13 XML with pinned dictionary/cache bindings'};
}
export function insertPolicySummary(){return {sha256:insertPolicyHash,firmware:policy.firmware,
  families:Object.fromEntries(Object.entries(policy.families).map(([name,f])=>[name,{
    parameters:Object.keys(f.parameters).length,types:f.typeLabels?.length??0,selectorPid:f.selectorPid,
    writableParameters:Object.values(f.parameters).filter(p=>p.cases.length).length,
    excludedControls:f.excludedControls}])),rule:policy.policy,limits:policy.limits};}
