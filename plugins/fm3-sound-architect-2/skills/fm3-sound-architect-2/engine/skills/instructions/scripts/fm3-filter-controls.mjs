import {fileURLToPath} from 'node:url';
// Exact measured points only. No device I/O and no inferred interpolation.
import fs from 'node:fs';
import {loadFilterReaControls,validateFilterReaPoint,filterReaLibraryHash} from './fm3-filter-rea-controls.mjs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {compare,pair} from './filter-control-collector/control-check.mjs';
const check=(v,m)=>{if(!v)throw Error(m)},sha=b=>createHash('sha256').update(b).digest('hex');
export const filterControlFields=Object.freeze(['frequencyHz','q','gainDb','levelDb','order']);
export const filterControlLibraryHash='02cc7820c37b19b9f5983023117c7e8f0108b73705d32d09f3eecc01ec0aa4ac';
export function loadFilterControls(){
 const data=fs.readFileSync(new URL('../references/filter-controls.json',import.meta.url));
 check(sha(data)===filterControlLibraryHash,'Filter control evidence changed; revalidate');
 const library=JSON.parse(data);
 check(library.schemaVersion===1&&library.firmware===13&&library.effectId===114&&library.wordsPerChannel===37&&library.count===17&&library.points.length===17,'Invalid Filter control library');
 const supplement=loadFilterReaControls();
 return {library:{...library,count:library.count+supplement.count,points:[...library.points,...supplement.points]},validated:new Map()};
}
function validatePoint(context,point){
 if(context.validated.has(point.index))return context.validated.get(point.index);
 if(point.evidenceKind==='rea-gap'){const value=validateFilterReaPoint(point);context.validated.set(point.index,value);return value;}
 const root=new URL('../references/'+context.library.evidenceDirectory+'/',import.meta.url),dir=new URL(point.folder+'/',root);
 const current=fs.readFileSync(new URL('donor.syx',dir)),previous=fs.readFileSync(new URL(point.previousFile,root));
 const rb=fs.readFileSync(new URL('result.json',dir)),cb=fs.readFileSync(new URL('capture.json',dir));
 check(sha(current)===point.syxSha256&&sha(previous)===point.previousSha256&&sha(rb)===point.resultSha256&&sha(cb)===point.captureSha256,'Filter control source hash mismatch');
 const result=JSON.parse(rb),comparison=compare(previous,current,point.index),proof=pair(fileURLToPath(dir));
 check(result.status==='passed'&&result.displayConfirmed===true&&result.displayValue===point.displayValue,'Missing Filter display confirmation');
 check(JSON.stringify(comparison)===JSON.stringify(result.comparison)&&JSON.stringify(proof)===JSON.stringify(result.pair),'Filter control source comparison differs');
 check(proof.rawRxSha256===point.rawRxSha256&&proof.matchedWords===148,'Filter control GET evidence differs');
 const step=result.step,word=comparison.changedWords[0],keys={Frequency:'frequencyHz',Q:'q',Gain:'gainDb',Level:'levelDb'};
 check(comparison.changedWords.length===1&&word.pid===point.parameterId&&word.after===point.raw&&word.before===point.rawBefore,'Filter control is not the measured isolated word');
 check(step.channel===point.channel&&step.type===point.type&&step.binaryId===point.binaryId&&keys[step.parameter]===point.field&&step.value===point.targetValue&&step.unit===point.unit,'Filter control label differs');
 const body=Buffer.from(inspectStructure(current).raw.body),offset=7614+'ABCD'.indexOf(point.channel)*74+point.parameterId*2;
 check(sha(body)===point.bodySha256&&body.length===point.bodyBytes&&body.readUInt16LE(offset)===point.raw,'Filter control body differs');
 const value={body,proof};context.validated.set(point.index,value);return value;
}
export function applyFilterControls(raw,selection,context){
 const controls=[];
 for(const field of filterControlFields){
  if(!Object.hasOwn(selection,field))continue;
  const value=selection[field];
  if(field==='order')check(value==='2nd'||value==='4th','Filter order must be 2nd or 4th');
  else check(typeof value==='number'&&Number.isFinite(value),'Filter '+field+' must be a finite number');
  const point=context.library.points.find(p=>p.channel===selection.channel&&p.type===selection.type&&p.field===field&&(p.targetValue===value||p.displayValue===value));
  check(point,'Unmeasured Filter '+selection.channel+' '+selection.type+' '+field+'='+value+'; only listed measured channel/type/values are supported');
  validatePoint(context,point);
  raw.writeUInt16LE(point.raw,point.parameterId*2);
  controls.push({key:field,parameterId:point.parameterId,value,displayValue:point.displayValue,measuredTargetValue:point.targetValue,unit:point.unit,raw:point.raw,
   roundedDisplay:point.displayValue!==value,sourceChannel:point.channel,sourceFolder:point.folder,sourceSyxSha256:point.syxSha256,sourceRawRxSha256:point.rawRxSha256});
 }
 return controls;
}
export function filterControlCapabilities(){
 const {library}=loadFilterControls(),groups=[];
 for(const p of library.points){
  let group=groups.find(g=>g.channel===p.channel&&g.type===p.type&&g.field===p.field);
  if(!group){group={channel:p.channel,type:p.type,field:p.field,parameterId:p.parameterId,unit:p.unit,values:[],readback:[]};groups.push(group);}
  for(const v of [p.targetValue,p.displayValue])if(!group.values.includes(v))group.values.push(v);
  group.readback.push({targetValue:p.targetValue,displayValue:p.displayValue,raw:p.raw});
 }
 return {mode:'exact measured points; target values and recorded display aliases',groups,librarySha256:filterControlLibraryHash,supplementSha256:filterReaLibraryHash,measuredPoints:40,pairedExports:32,
  unmeasured:['Other type/channel/value combinations','No continuous ranges or interpolation','Active Filter audio and CPU not assessed by this collection'],
  evidence:'docs/FM3_FILTER_REA_AUDIT_20261012.json'};
}
export function matchFilterControlDeviceBody(body){
 const context=loadFilterControls(),hash=sha(body),point=context.library.points.find(p=>p.bodySha256===hash);
 if(!point)return null;
 const evidence=validatePoint(context,point);check(body.equals(evidence.body),'Filter device-body comparison mismatch');
 return {file:'references/'+(point.evidenceDirectory??context.library.evidenceDirectory)+'/'+point.folder+'/donor.syx',sha256:point.syxSha256,bodySha256:hash,
  scope:'Every decompressed body byte matches this actual paired device export; generated filename/encoding is separate. No repeat export needed for identical body.',
  audio:'Filter bypassed; active effect audio and CPU not assessed'};
}
