// Read internal algorithm selectors as raw enums, independently of model IDs.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const algorithmPolicyHash='5f062f0cca465c8576b8857260af693a03563bb6b8672257e4bda533b4605b21';
const bytes=fs.readFileSync(new URL('../references/fm3-delay-reverb-applicability.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==algorithmPolicyHash)throw Error('Delay/Reverb policy changed; review and regenerate');
const policy=JSON.parse(bytes);
export function algorithmPolicySummary(){return {sha256:algorithmPolicyHash,firmware:policy.firmware,
  families:Object.fromEntries(Object.entries(policy.families).map(([n,f])=>[n,{models:Object.keys(f.models).length,parameters:Object.keys(f.parameters).length,
    selector:f.selector,selectorPid:f.selectorPid,selectorValues:f.selectors[f.selectorPid].values,xmlOnlySelectorValues:f.xmlOnlySelectorValues,
    templateOnlyPids:f.templateOnlyPids}])),rule:policy.policy,limits:policy.limits};}
export function templateOnlyParameter(p){return policyTemplateOnly(policy,p);}
export function policyTemplateOnly(policy,p){return policy.families[p.family]?.templateOnlyPids.includes(p.param)??false;}
export function algorithmState(p,read){return policyState(policy,p,read);}
export function policyState(policy,p,read){
  const f=policy.families[p.family];
  return f?Object.fromEntries([...new Set([f.modelPid,...Object.keys(f.selectors).map(Number)])].map(pid=>[pid,read(pid)])):null;
}
export function algorithmApplicability(p,state){return policyApplicability(policy,p,state);}
export function policyApplicability(policy,p,state){
  const f=policy.families[p.family];if(!f)return {covered:false};
  const r=f.parameters[p.param];
  if(!r||r.name!==p.name)throw Error('Algorithm policy binding mismatch: '+p.name);
  const modelId=state?.[f.modelPid],type=state?.[f.selectorPid],model=f.models[modelId];
  const valid=Number.isInteger(modelId)&&Number.isInteger(type)&&f.selectors[f.selectorPid].values.includes(type)&&model?.selectorValue===type;
  const cases=valid?r.cases.filter(c=>c.types.includes(type)&&Object.entries(c.when).every(([pid,values])=>values.includes(state[pid]))):[];
  const labels=[...new Set(cases.map(c=>c.label.replace(/\s+/g,' ').trim()).filter(Boolean))];
  return {covered:true,allowed:valid&&(p.param===f.modelPid||cases.length>0),stateValid:!!valid,
    typeId:type,typeName:model?.name??'unknown model',modelId,selector:f.selector,selectorPid:f.selectorPid,
    label:labels.length===1?labels[0]:p.label,templateOnly:policyTemplateOnly(policy,p),selectors:state,
    reason:valid?'FW13 page/control predicates':'unknown or mismatched model/internal selector; use full channel template',source:'FM3 XML and captured-template authoring policy'};
}
