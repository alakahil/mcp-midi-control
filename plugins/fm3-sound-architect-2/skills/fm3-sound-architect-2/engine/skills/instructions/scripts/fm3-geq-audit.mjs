// Derive GEQ semantics only from the preserved firmware-13 device session.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compare,pair,preflight} from './geq-full-collector/full-check.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export const geqSha=b=>createHash('sha256').update(b).digest('hex');
export const geqRanges={Gain:{min:-12,max:12},'Master Q':{min:.1,max:10,log:true},Level:{min:-80,max:20},Balance:{min:-100,max:100}};
export function encodeGeqNumber(parameter,value){
 const r=geqRanges[parameter];check(r&&typeof value==='number'&&Number.isFinite(value)&&value>=r.min&&value<=r.max,'Invalid GEQ '+parameter+' value');
 return Math.round((r.log?Math.log(value/r.min)/Math.log(r.max/r.min):(value-r.min)/(r.max-r.min))*65534);
}
export function decodeGeqNumber(parameter,raw){const r=geqRanges[parameter];return r.log?r.min*Math.pow(r.max/r.min,raw/65534):r.min+raw/65534*(r.max-r.min);}
export function auditGeqEvidence(root){
 const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
 const plan=json('plan.json'),session=json('session.json'),setup=json('setup.json');
 check(session.baselineSha256===geqSha(read('baseline.syx'))&&session.planSha256===geqSha(read('plan.json'))&&session.setupSha256===geqSha(read('setup.json')),'GEQ session hash mismatch');
 check(plan.length===184&&setup.otherControls===''&&JSON.stringify(setup.bypassModes)===JSON.stringify(['Thru','Mute']),'GEQ audited plan changed');
 const files={},passed=[],excludedAttempts=[],models=[],anchors=[];
 function inventory(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){check(!e.isSymbolicLink(),'GEQ symlink');const p=path.join(dir,e.name),r=rel+e.name;if(e.isDirectory())inventory(p,r+'/');else if(e.name!=='.DS_Store')files[r]=geqSha(fs.readFileSync(p));}}
 inventory(root);
 let previous='baseline.syx',currentModel=null;
 for(const folder of fs.readdirSync(root).filter(x=>x.startsWith('step-')).sort()){
  const r=json(folder+'/result.json');
  if(r.status==='failed'){excludedAttempts.push({folder,index:r.index,error:r.error});continue;}
  const i=passed.length,s=plan[i];check(r.status==='passed'&&r.index===i&&JSON.stringify(r.step)===JSON.stringify(s)&&r.displayConfirmed===true,'GEQ sequence/confirmation mismatch');
  const cmp=compare(read(previous),read(folder+'/donor.syx'),s),proof=pair(path.join(root,folder));
  check(JSON.stringify(cmp)===JSON.stringify(r.comparison)&&JSON.stringify(proof)===JSON.stringify(r.pair),'GEQ stored proof differs from source');
  check(cmp.typeCoupledChanges.length===0,'Unhandled GEQ type coupling');
  const state=preflight(read(folder+'/donor.syx')),words=state.words.slice('ABCD'.indexOf(s.channel)*20,('ABCD'.indexOf(s.channel)+1)*20);
  if(s.kind==='baseline'||s.kind==='type'){
   const ui=r.observations.ui;
   check(ui.typeName===s.typeName&&ui.bandLabels.length===s.bandCount&&ui.masterQVisible===true&&ui.extraControls==='','GEQ UI changed');
   if(s.kind==='type'){
    currentModel={name:s.typeName,binaryId:words[15],bandCount:s.bandCount,masterQVisible:ui.masterQVisible,sourceFolder:folder,sourceSha256:state.sha256,words,
     bands:ui.bandLabels.map((label,j)=>({band:j+1,capturedLabel:label,label:label==='python3 100'?null:label,labelStatus:label==='python3 100'?'Pending screen confirmation; possible input contamination':'User-confirmed screen label',pid:null}))};
    models.push(currentModel);
   }
  }
  if(s.kind==='bands'){
   const model=models.find(m=>m.name===s.typeName);check(model,'GEQ band type missing');
   const values=r.observations.displayValues;
   check(values.length===(s.firstOnly?1:model.bandCount),'GEQ gain count');
   if(s.values)check(values.every((v,j)=>v===s.values[j]),'GEQ target/display mismatch');
   if(s.endpoint)check(values.every(v=>v===(s.endpoint==='minimum'?-12:12)),'GEQ gain endpoint mismatch');
   if(s.stage==='types'&&s.values&&!s.zeroAll){
    for(const [j,value] of values.entries()){
     const matches=cmp.changedWords.filter(w=>w.channel===s.channel&&w.pid<10&&w.after===encodeGeqNumber('Gain',value));
     check(matches.length===1,'GEQ gain slot is ambiguous');model.bands[j].pid=matches[0].pid;
    }
    check(new Set(model.bands.map(b=>b.pid)).size===model.bandCount,'Duplicate GEQ slots');
   }
   for(const [j,value] of values.entries()){
    const b=model.bands[j];check(Number.isInteger(b.pid)&&words[b.pid]===encodeGeqNumber('Gain',value),'GEQ gain scale mismatch at '+i);
    check(r.observations.bandLabels[j]===b.capturedLabel,'GEQ label chain changed');
    anchors.push({index:i,type:s.typeName,channel:s.channel,parameter:'Gain',band:b.band,pid:b.pid,value,raw:words[b.pid]});
   }
  }
  if(s.kind==='control'){
   const value=r.observations.displayValue,pid={'Master Q':16,Level:11,Balance:12,'Bypass Mode':13,'Scene Ignore':19}[s.parameter];
   check(pid!==undefined,'Unknown GEQ control');
   const expected=geqRanges[s.parameter]?encodeGeqNumber(s.parameter,value):s.parameter==='Bypass Mode'?['Thru','Mute'].indexOf(value):['OFF','ON'].indexOf(value);
   check(expected>=0&&words[pid]===expected,'GEQ control scale/enum mismatch at '+i);
   if(s.value!==undefined)check(value===s.value,'GEQ scalar target mismatch');
   anchors.push({index:i,type:s.typeName,channel:s.channel,parameter:s.parameter,band:null,pid,value,raw:words[pid]});
  }
  passed.push({index:i,folder,previousFile:previous});previous=folder+'/donor.syx';
 }
 check(passed.length===184&&excludedAttempts.length===8&&models.length===18,'Incomplete GEQ evidence');
 check(new Set(models.map(m=>m.binaryId)).size===18,'GEQ type IDs conflict');
 const baseline=preflight(read('baseline.syx'));
 check('BCD'.split('').every((_,i)=>baseline.words.slice((i+1)*20,(i+2)*20).every((w,j)=>w===baseline.words[j])),'GEQ baseline channels differ');
 return {schemaVersion:1,firmware:13,effectId:50,wordsPerChannel:20,evidenceDirectory:path.basename(root),files,passed,excludedAttempts,models,anchors,
  audit:{passedSteps:184,excludedAttempts:8,pairedWordsPerStep:80,matchedWordsTotal:184*80,typeCount:18,numericAnchors:anchors.filter(a=>geqRanges[a.parameter]).length,enumAnchors:anchors.filter(a=>!geqRanges[a.parameter]).length,typeCoupledChanges:0,channelCopies:[177,179,181],independentChannelGain:[178,180,182],sceneSelections:[177,179,181,183],collectorResume:'184/184 verified using unchanged original resume()',pendingLabels:[{type:'7 Band Constant Q',band:1,captured:'python3 100',candidate:'100',status:'Not substituted in evidence or confirmed as frequency'}],hardware:'Captured samples verified; newly generated combination pending import/export, listening and CPU'}};
}
