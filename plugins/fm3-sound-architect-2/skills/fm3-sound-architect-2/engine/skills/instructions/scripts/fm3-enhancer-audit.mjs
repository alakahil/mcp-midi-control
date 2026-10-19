// Firmware-13 semantics derived from Jan's preserved GET/SYX measurements.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compare,pair,preflight} from './enhancer-full-collector-v2/full-check.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export const enhancerSha=b=>createHash('sha256').update(b).digest('hex');
export const enhancerRanges={Width:{min:0,max:100},Depth:{min:0,max:100},'Low Cut':{min:20,max:2000,log:true},'High Cut':{min:200,max:20000,log:true},Level:{min:-80,max:20},'Pan L':{min:-100,max:100},'Pan R':{min:-100,max:100},Balance:{min:-100,max:100}};
export const enhancerPids={Width:0,Depth:1,'Low Cut':2,'High Cut':3,Level:4,Invert:7,'Pan L':8,'Pan R':9,Balance:10,'Scene Ignore':11};
export const enhancerTypeIds={Modern:0,Classic:1,Stereoizer:2};
export const enhancerEnums={Invert:['None','Right','Left','Both'],'Scene Ignore':['OFF','ON']};
export function encodeEnhancerNumber(parameter,value){
 const r=enhancerRanges[parameter];check(r&&typeof value==='number'&&Number.isFinite(value)&&value>=r.min&&value<=r.max,'Invalid Enhancer '+parameter+' value');
 return Math.round((r.log?Math.log(value/r.min)/Math.log(r.max/r.min):(value-r.min)/(r.max-r.min))*65534);
}
export function decodeEnhancerNumber(parameter,raw){const r=enhancerRanges[parameter];check(r&&Number.isInteger(raw)&&raw>=0&&raw<=65534,'Invalid Enhancer numeric word');return r.log?r.min*Math.pow(r.max/r.min,raw/65534):r.min+raw/65534*(r.max-r.min);}
export function encodeEnhancerControl(parameter,value){if(Object.hasOwn(enhancerRanges,parameter))return encodeEnhancerNumber(parameter,value);const raw=enhancerEnums[parameter]?.indexOf(value);check(Number.isInteger(raw)&&raw>=0,'Invalid Enhancer enum');return raw;}
export function auditEnhancerEvidence(fullRoot,gapRoot){
 const files={},passed=[],skipped=[],excludedAttempts=[],models=[],anchors=[],typeSnapshots=[],typeCoupledChanges=[];
 const roots={full:fullRoot,supplement:gapRoot};
 for(const [source,root] of Object.entries(roots)){
  const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
  const session=json('session.json'),plan=json('plan.json'),setup=json('setup.json');
  check(session.firmwareDeclared===13&&session.planSha256===enhancerSha(read('plan.json'))&&session.setupSha256===enhancerSha(read('setup.json')),'Enhancer session hash mismatch');
  check(plan.length===(source==='full'?86:13),'Unexpected Enhancer plan');
  if(source==='full')check(session.baselineSha256===enhancerSha(read('baseline.syx')),'Enhancer baseline mismatch');
  else{
   check(session.sourceZipSha256==='98c35922cf15ced5b2c843aabc7534b9860f084cdc0528a3ecc4966e5d7c780b'&&enhancerSha(read('source-session.zip'))===session.sourceZipSha256,'Supplement source ZIP mismatch');
   check(session.startSha256===enhancerSha(read('ALUSTA_SIIT.syx'))&&read('ALUSTA_SIIT.syx').equals(fs.readFileSync(path.join(fullRoot,'step-085-4ce1514d33/donor.syx'))),'Supplement start does not match full-session endpoint');
   check(read('setup.json').equals(fs.readFileSync(path.join(fullRoot,'setup.json'))),'Supplement setup changed');
  }
  function inventory(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){check(!e.isSymbolicLink(),'Enhancer evidence symlink');if(e.name==='__pycache__'||e.name==='.DS_Store')continue;const p=path.join(dir,e.name),r=rel+e.name;if(e.isDirectory())inventory(p,r+'/');else files[source+'/'+r]=enhancerSha(fs.readFileSync(p));}}
  inventory(root);
  let previous=source==='full'?'baseline.syx':'ALUSTA_SIIT.syx',index=0;
  for(const folder of fs.readdirSync(root).filter(x=>x.startsWith('step-')).sort()){
   const r=json(folder+'/result.json');
   if(r.status==='failed'){excludedAttempts.push({source,folder,index:r.index,error:r.error});continue;}
   const s=plan[index];check(s&&r.index===index&&JSON.stringify(r.step)===JSON.stringify(s),'Enhancer sequence mismatch');index++;
   if(r.status==='skipped'){check(source==='full'&&s.typeName==='Classic'&&['Pan L','Level','Scene Ignore'].includes(s.parameter),'Unexpected skipped measurement');skipped.push({source,folder,index:r.index,parameter:s.parameter,point:s.point??s.value,resolvedBy:'supplement'});continue;}
   check(r.status==='passed'&&r.displayConfirmed===true,'Unconfirmed Enhancer result');
   const cmp=compare(read(previous),read(folder+'/donor.syx'),s),proof=pair(path.join(root,folder));
   check(JSON.stringify(cmp)===JSON.stringify(r.comparison)&&JSON.stringify(proof)===JSON.stringify(r.pair),'Enhancer stored proof differs from source');
   const state=preflight(read(folder+'/donor.syx')),ci='ABCD'.indexOf(s.channel),words=state.words.slice(ci*12,(ci+1)*12);
   check(words[6]===enhancerTypeIds[s.typeName],'Enhancer type ID mismatch');
   if(s.kind==='baseline'||s.kind==='type'){
    check(r.observations.typeName===s.typeName&&r.observations.controlsConfirmed===true,'Enhancer type not confirmed');
    const snapshot={source,index:r.index,folder,name:s.typeName,binaryId:words[6],words,sourceSha256:state.sha256};typeSnapshots.push(snapshot);
    if(!models.some(m=>m.name===s.typeName))models.push({...snapshot,visibleNumeric:setup.types[s.typeName].numeric,visibleEnums:Object.keys(setup.types[s.typeName].enums)});
    if(cmp.typeCoupledChanges.length)typeCoupledChanges.push({source,index:r.index,changes:cmp.typeCoupledChanges});
   }
   if(s.kind==='control'){
    const value=r.observations.displayValue,pid=enhancerPids[s.parameter],raw=encodeEnhancerControl(s.parameter,value);
    check(pid!==undefined&&words[pid]===raw,'Enhancer control scale/enum mismatch: '+source+'/'+r.index);
    check(setup.types[s.typeName].numeric.includes(s.parameter)||Object.hasOwn(setup.types[s.typeName].enums,s.parameter),'Hidden Enhancer control');
    if(s.value!==undefined)check(value===s.value,'Enhancer target differs from display');
    if(s.point==='minimum'||s.point==='maximum')check(value===enhancerRanges[s.parameter][s.point==='minimum'?'min':'max'],'Enhancer endpoint mismatch');
    anchors.push({source,index:r.index,type:s.typeName,channel:s.channel,parameter:s.parameter,pid,value,raw,point:s.point??null});
   }
   passed.push({source,index:r.index,folder,previousFile:previous,kind:s.kind});previous=folder+'/donor.syx';
  }
  check(index===plan.length,'Incomplete Enhancer session');
 }
 check(passed.length===87&&skipped.length===12&&excludedAttempts.length===2&&models.length===3&&anchors.length===78,'Unexpected Enhancer evidence counts');
 for(const m of models){
  for(const p of m.visibleNumeric){const a=anchors.filter(a=>a.type===m.name&&a.channel==='A'&&a.parameter===p);check(a.length===5&&new Set(a.map(a=>a.value)).size===5,'Five distinct Enhancer points required');}
  for(const p of m.visibleEnums)for(const v of enhancerEnums[p])check(anchors.some(a=>a.type===m.name&&a.parameter===p&&a.value===v),'Missing Enhancer enum');
 }
 const baseline=preflight(fs.readFileSync(path.join(fullRoot,'baseline.syx')));
 check([1,2,3].every(c=>baseline.words.slice(c*12,c*12+12).every((w,p)=>w===baseline.words[p])),'Baseline Enhancer channels differ');
 check(typeSnapshots.length===5&&typeCoupledChanges.length===1&&typeCoupledChanges[0].changes.length===1&&typeCoupledChanges[0].changes[0].pid===10,'Unexpected Enhancer type coupling');
 return {schemaVersion:1,firmware:13,effectId:122,wordsPerChannel:12,evidenceDirectories:Object.fromEntries(Object.entries(roots).map(([k,v])=>[k,path.basename(v)])),files,passed,skipped,excludedAttempts,models,anchors,typeSnapshots,typeCoupledChanges,
  audit:{passedSteps:87,fullSessionPairs:74,supplementPairs:13,resolvedSkippedSteps:12,excludedAttempts:2,pairedWordsPerStep:48,matchedWordsTotal:4176,typeCount:3,numericAnchors:68,enumAnchors:10,channelCopies:[79,81,83],independentChannelWidth:[80,82,84],sceneSelections:[79,81,83,85],opaquePids:[5],bypass:'Scene header control; no Bypass Mode menu observed',panLeft:'-100..100, unitless. Measured points -100,+100,0,+40,+80; three distinct interior values are valid regardless of collector point labels.',hardware:'Measured GET/SYX states confirmed; newly generated composition awaits import/export, listening and CPU'}};
}
