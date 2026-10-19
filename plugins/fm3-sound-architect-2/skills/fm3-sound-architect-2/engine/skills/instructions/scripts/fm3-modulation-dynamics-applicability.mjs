// Verified native bindings; model and Phaser Mode changes use complete templates.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {policyState,policyApplicability,policyTemplateOnly} from './fm3-delay-reverb-applicability.mjs';
export const modulationPolicyHash='3cfe8a40d48d0901f8801b7f7a4b49129802e765cc8080ec5ce4ec2cea439aaf';
const bytes=fs.readFileSync(new URL('../references/fm3-modulation-dynamics-applicability.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==modulationPolicyHash)throw Error('Modulation/dynamics policy changed; review and regenerate');
const policy=JSON.parse(bytes);
export const modulationState=(p,read)=>policyState(policy,p,read);
export const modulationApplicability=(p,state)=>policyApplicability(policy,p,state);
export const modulationTemplateOnly=p=>policyTemplateOnly(policy,p);
export function nativeParameterId(family,param){
  if(typeof param!=='string'||!policy.families[family])return undefined;
  const name=param.toUpperCase().startsWith(family+'_')?param.toUpperCase():family+'_'+param.toUpperCase();
  return policy.families[family].nativeDescriptors.find(r=>r.name===name)?.pid;
}
export function modulationPolicySummary(){return {sha256:modulationPolicyHash,firmware:policy.firmware,
  families:Object.fromEntries(Object.entries(policy.families).map(([n,f])=>[n,{models:Object.keys(f.models).length,parameters:Object.keys(f.parameters).length,
    selector:f.selector,selectorPid:f.selectorPid,selectorValues:f.selectors[f.selectorPid].values,templateOnlyPids:f.templateOnlyPids,
    nativeAliases:Object.entries(f.parameters).filter(([,p])=>p.name!==p.nativeName).map(([pid,p])=>({pid:Number(pid),legacy:p.name,native:p.nativeName}))}])),
  rule:policy.policy,limits:policy.limits};}
