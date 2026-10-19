// Bounded XML-derived authoring policy. Scalar curve support is a separate axis.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const typePolicyHash='9fdc92ed23349838699db18dbcce223602ae6a22984cef5e5728e35150a49f99';
const bytes=fs.readFileSync(new URL('../references/fm3-type-applicability.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==typePolicyHash)throw Error('Type applicability policy changed; review and regenerate');
const policy=JSON.parse(bytes);
const familyFor={chorus:'CHORUS',drive:'FUZZ'};
export function typePolicySummary(){
  return {sha256:typePolicyHash,firmware:policy.firmware,source:'FM3-Edit '+policy.editor,
    families:Object.fromEntries(Object.entries(policy.families).map(([family,f])=>[family,{types:f.types.length,parameters:Object.keys(f.parameters).length,restrictedParameters:Object.values(f.parameters).filter(p=>p.allowedTypes.length<f.types.length).length}])),
    rule:'Explicit writes checked against final per-channel type; stored hidden words preserved',limits:policy.limits};
}
export function typeApplicability(p,type){
  const f=policy.families[p.family];
  if(!f)return {covered:false};
  const rule=f.parameters[p.param];
  if(!rule||rule.name!==p.name)throw Error('Type policy binding mismatch: '+p.name);
  const valid=Number.isInteger(type)&&type>=0&&type<f.types.length;
  const labels=valid?[...new Set(f.pages.filter(page=>page.effectiveTypes.includes(type)).flatMap(page=>page.controls[p.name]??[]).map(s=>s.replace(/\s+/g,' ')))]:[];
  return {covered:true,allowed:valid&&rule.allowedTypes.includes(type),typeId:type,typeName:f.types[type]??'unknown',
    label:labels.length===1?labels[0]:p.label,source:'FM3-Edit XML authoring policy'};
}
// Preflight the complete plan. A type change may appear before or after its controls.
// No body mutation or allowance callback is permitted until this succeeds.
export function validateTypeWrites(body,writes){
  const planned=new Map(writes.map(w=>[w.offset,w.raw]));
  for(const w of writes){
    const family=familyFor[w.block];
    if(!family)continue;
    const f=policy.families[family],typeOffset=w.offset-2*w.pid+2*f.typePid;
    const type=planned.get(typeOffset)??body.readUInt16LE(typeOffset);
    const a=typeApplicability({family,param:w.pid,name:w.name,label:w.label},type);
    if(!a.allowed)throw Error(`${w.block} ${w.channel} ${w.name}: not applicable to final type ${type} (${a.typeName}) in the FW13 editor policy`);
    w.typeApplicability=a;
    w.label=a.label;
  }
}
