// Rotary has no TYPE word. Pitch model visibility and metadata conflicts are separate gates.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {policyState,policyApplicability,policyTemplateOnly} from './fm3-delay-reverb-applicability.mjs';
export const rotaryPitchPolicyHash='9d6a3655d138deebf83bd7fc81f9df45ca1a4bf5c17f4396e4b0d835b3627a03';
const bytes=fs.readFileSync(new URL('../references/fm3-rotary-pitch-applicability.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==rotaryPitchPolicyHash)throw Error('Rotary/Pitch policy changed; review and regenerate');
const policy=JSON.parse(bytes);
export const rotaryPitchState=(p,read)=>p.family==='ROTARY'?{}:policyState(policy,p,read);
export const rotaryPitchTemplateOnly=p=>policyTemplateOnly(policy,p);
export function rotaryPitchApplicability(p,state){
  const f=policy.families[p.family];if(!f)return {covered:false};
  const r=f.parameters[p.param];if(!r||r.name!==p.name)throw Error('Rotary/Pitch binding mismatch: '+p.name);
  let result;
  if(p.family==='PITCH')result=policyApplicability(policy,p,state);
  else{
    const labels=[...new Set(r.cases.map(c=>c.label.replace(/\s+/g,' ').trim()).filter(Boolean))];
    result={covered:true,allowed:r.cases.length>0,stateValid:true,typeId:null,typeName:'Rotary (no type selector)',modelId:null,
      selector:null,selectorPid:null,label:labels.length===1?labels[0]:p.label,templateOnly:false,selectors:{},reason:'FW13 Rotary controls',source:'FM3 XML and native descriptors'};
  }
  return {...result,metadataConflict:r.metadataConflict,blockedReason:r.blockedReason,
    ...(r.blockedReason?{allowed:false,reason:r.blockedReason}: {})};
}
export function rotaryPitchPolicySummary(){return {sha256:rotaryPitchPolicyHash,firmware:policy.firmware,
  families:Object.fromEntries(Object.entries(policy.families).map(([n,f])=>[n,{hasTypeSelector:f.hasTypeSelector,models:Object.keys(f.models).length,
    parameters:Object.keys(f.parameters).length,templateOnlyPids:f.templateOnlyPids,
    metadataConflicts:Object.entries(f.parameters).filter(([,p])=>p.metadataConflict).map(([pid,p])=>({pid:Number(pid),name:p.name,reason:p.blockedReason})),
    blockedDynamicOrFixed:Object.entries(f.parameters).filter(([,p])=>p.blockedReason&&!p.metadataConflict).map(([pid,p])=>({pid:Number(pid),name:p.name,reason:p.blockedReason}))}])),
  rule:policy.policy,limits:policy.limits};}
