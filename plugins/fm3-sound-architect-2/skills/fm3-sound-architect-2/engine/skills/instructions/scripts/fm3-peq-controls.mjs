// Legacy exact-point syntax plus the audited full five-band/A–D writer. Offline only.
import fs from 'node:fs';
import {matchPeqFullDeviceBody} from './fm3-peq-full-hardware.mjs';
import {composePeqFull,peqFullCapabilities} from './fm3-peq-full.mjs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {pair as baselinePair,preflight as baselinePreflight} from './peq-baseline-collector/peq-check.mjs';
import {compare,pair} from './peq-control-collector/control-check.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export const peqControlLibraryHash='f111b767d57a9354ff6ac32c0e39e9684940e373f7ad79aab3dd904c95fd4ce0';
const baseFolder='references/peq-baseline-20261009-114022/capture-20261009T114021-4e486c054d/';
const fields=Object.freeze({frequencyHz:{pid:2,band:3},q:{pid:7,band:3},gainDb:{pid:12,band:3},levelDb:{pid:20,band:null}});

export function loadPeqControls(){
 const bytes=read('references/peq-controls.json');check(sha(bytes)===peqControlLibraryHash,'PEQ control evidence changed; revalidate');
 const library=JSON.parse(bytes);
 check(library.schemaVersion===1&&library.firmware===13&&library.effectId===54&&library.wordsPerChannel===33&&library.count===11&&library.points.length===11,'Invalid PEQ library');
 const root='references/'+library.evidenceDirectory+'/';
 for(const [file,key] of [['baseline.syx','baselineSha256'],['setup.json','setupSha256'],['session.json','sessionSha256'],['plan.json','planSha256']])check(sha(read(root+file))===library[key],'PEQ session source changed: '+file);
 check(JSON.parse(read(root+'setup.json')).band3TypeLabel==='Peaking','Unverified PEQ Band 3 type label');
 const baseline=read(baseFolder+'donor.syx'),state=baselinePreflight(baseline),proof=baselinePair(new URL('../'+baseFolder,import.meta.url).pathname);
 check(state.sha256===library.baselineSha256&&proof.matchedWords===132,'PEQ baseline proof mismatch');
 check(JSON.stringify(proof)===JSON.stringify(JSON.parse(read(baseFolder+'pair.json'))),'Stored PEQ baseline proof differs');
 check(state.words[17]===0,'PEQ Band 3 type changed');
 return {library,root,baseline,baselineBody:Buffer.from(inspectStructure(baseline).raw.body),baselineState:state,baselineProof:proof,validated:new Map()};
}
function validatePoint(context,point){
 if(context.validated.has(point.index))return context.validated.get(point.index);
 const dir=context.root+point.folder+'/',current=read(dir+'donor.syx'),previous=read(context.root+point.previousFile);
 const rb=read(dir+'result.json'),cb=read(dir+'capture.json');
 check(sha(current)===point.syxSha256&&sha(previous)===point.previousSha256&&sha(rb)===point.resultSha256&&sha(cb)===point.captureSha256,'PEQ measurement source hash mismatch');
 const result=JSON.parse(rb),comparison=compare(previous,current,point.index),proof=pair(new URL('../'+dir,import.meta.url).pathname);
 check(result.status==='passed'&&result.displayConfirmed===true&&result.displayValue===point.displayValue&&result.band3TypeLabel==='Peaking','Missing PEQ screen confirmation');
 check(JSON.stringify(comparison)===JSON.stringify(result.comparison)&&JSON.stringify(proof)===JSON.stringify(result.pair),'PEQ saved comparison differs');
 check(proof.matchedWords===132&&proof.rawRxSha256===point.rawRxSha256,'PEQ GET evidence mismatch');
 const step=result.step,word=comparison.changedWords[0],field=fields[point.field];
 check(field&&step.channel==='A'&&point.channel==='A'&&step.band===field.band&&point.band===field.band&&point.parameterId===field.pid,'PEQ control scope differs');
 check(({Frequency:'frequencyHz',Q:'q',Gain:'gainDb',Level:'levelDb'})[step.parameter]===point.field&&step.value===point.targetValue&&step.unit===point.unit,'PEQ label/target differs');
 check(comparison.changedWords.length===1&&word.channel==='A'&&word.pid===field.pid&&word.before===point.rawBefore&&word.after===point.raw,'PEQ word is not isolated');
 const body=Buffer.from(inspectStructure(current).raw.body);
 check(body.length===13456&&sha(body)===point.bodySha256&&body.readUInt16LE(8734+field.pid*2)===point.raw&&body.readUInt16LE(8734+17*2)===0,'PEQ body/type differs');
 const evidence={body,proof};context.validated.set(point.index,evidence);return evidence;
}
export function composePeqTemplates(selections){
 if(Array.isArray(selections)&&selections.some(s=>object(s)&&own(s,'band3')))return composePeqLegacy(selections);
 if(Array.isArray(selections)&&selections.length===1){
  const s=selections[0];
  if(object(s)&&s.channel==='A'&&Object.keys(s).every(k=>['channel','levelDb'].includes(k))&&[-3,0,3].includes(s.levelDb))return composePeqLegacy(selections);
 }
 return composePeqFull(selections);
}
function composePeqLegacy(selections){
 check(Array.isArray(selections)&&selections.length===1,'PEQ currently supports exactly one selection: channel A');
 const s=selections[0];check(object(s)&&Object.keys(s).every(k=>['channel','band3','levelDb'].includes(k)),'Unknown PEQ field; use channel, band3 and levelDb');
 check(s.channel==='A','PEQ controls and template are verified only on channel A');
 if(own(s,'band3'))check(object(s.band3)&&s.band3.type==='Peaking'&&Object.keys(s.band3).every(k=>['type','frequencyHz','q','gainDb'].includes(k)),'PEQ Band 3 requires fixed type Peaking and measured Frequency/Q/Gain');
 const context=loadPeqControls(),raw=Buffer.from(context.baselineBody.subarray(8734,8800)),controls=[];
 for(const [field,{pid,band}] of Object.entries(fields)){
  const selection=band===3?s.band3:s;if(!selection||!own(selection,field))continue;
  const value=selection[field];check(typeof value==='number'&&Number.isFinite(value),'PEQ '+field+' must be a finite number');
  const point=context.library.points.find(p=>p.field===field&&(p.targetValue===value||p.displayValue===value));
  check(point,'Unmeasured PEQ A '+(band===3?'Band 3 ':'')+field+'='+value+'; only listed measured values are supported');
  validatePoint(context,point);raw.writeUInt16LE(point.raw,pid*2);
  controls.push({key:band===3?'band3.'+field:field,band,parameterId:pid,value,displayValue:point.displayValue,measuredTargetValue:point.targetValue,unit:point.unit,raw:point.raw,roundedDisplay:point.displayValue!==value,sourceChannel:'A',sourceFolder:point.folder,sourceSyxSha256:point.syxSha256,sourceRawRxSha256:point.rawRxSha256});
 }
 return {wordsPerChannel:33,data:[{channel:'A',bytes:raw}],channels:[{channel:'A',type:'Band 3 Peaking; muud ribad alusest',sourceChannel:'A',sourceSyxSha256:context.baselineState.sha256,sourceRawRxSha256:context.baselineProof.rawRxSha256,words:Array.from({length:33},(_,i)=>raw.readUInt16LE(2*i)),controls,scope:'Only Band 3 fixed Peaking and common Level; all other words retain the measured baseline'}]};
}
export function peqControlCapabilities(){return peqFullCapabilities();}
export function peqLegacyCapabilities(){
 const {library}=loadPeqControls(),groups=[];
 for(const [field,{pid,band}] of Object.entries(fields)){
  const points=library.points.filter(p=>p.field===field);
  groups.push({channel:'A',band,type:band===3?'Peaking':undefined,field,parameterId:pid,unit:points[0].unit,values:[...new Set(points.flatMap(p=>[p.targetValue,p.displayValue]))],readback:points.map(p=>({targetValue:p.targetValue,displayValue:p.displayValue,raw:p.raw}))});
 }
 return {mode:'Exact measured targets and recorded display aliases',groups,channels:['A'],librarySha256:peqControlLibraryHash,
  syntax:{channel:'A',band3:{type:'Peaking',frequencyHz:1000,q:1.4,gainDb:3},levelDb:0},
  unmeasured:['Q 0.707 was skipped: inherited value can be preserved but no explicit override','Other bands, channels, types, slopes and values','No continuous ranges, interpolation or PEQ channel cloning'],evidence:'docs/FM3_PEQ_CONTROL_VALIDATION.json'};
}
export const peqRoundtrip=Object.freeze({generatedFile:'examples/FM3_PEQ_BAND3_TEST.syx',generatedSha256:'3869051de07add62df3e528b3f53cd70e236ef9fe5c61bb1a342879f465d0f98',exportFile:'examples/FM3_PEQ_BAND3_TEST_export.syx',exportSha256:'d4dc973e430ac37cd26be7ba92869fb514eada2e9d013bf72136f2538cfd11ab',bodySha256:'066d10740819f788d6a10f15777f859c927bf960c567d074255b98beaba3aa17'});
export function verifyPeqRoundtrip(){
 const generated=read(peqRoundtrip.generatedFile),exported=read(peqRoundtrip.exportFile);
 check(sha(generated)===peqRoundtrip.generatedSha256&&sha(exported)===peqRoundtrip.exportSha256,'PEQ roundtrip source changed');
 const a=inspectStructure(generated),b=inspectStructure(exported),body=Buffer.from(b.raw.body);
 check(body.length===13456&&body.equals(Buffer.from(a.raw.body))&&sha(body)===peqRoundtrip.bodySha256,'PEQ roundtrip body differs');
 check(Buffer.from(a.parsed.headerPayload).equals(Buffer.from(b.parsed.headerPayload)),'PEQ roundtrip dump header differs');
 check(a.parsed.chunkPayloads.length===b.parsed.chunkPayloads.length&&a.parsed.chunkPayloads.every((c,i)=>Buffer.from(c).subarray(0,2).equals(Buffer.from(b.parsed.chunkPayloads[i]).subarray(0,2))),'PEQ roundtrip chunk prefix differs');
 for(let i=0;i<76;i++)if(i!==4&&i!==5)check(a.raw.rawPatch[i]===b.raw.rawPatch[i],'PEQ roundtrip unrelated header differs');
 for(const s of [a,b]){const raw=Buffer.from(s.raw.rawPatch);check(raw.readUInt16LE(72)===13456&&raw.readUInt16LE(74)===s.raw.compSize&&raw.subarray(76+s.raw.compSize).every(v=>v===0),'PEQ roundtrip size/padding mismatch');}
 return {body,generated,exported};
}
export function matchPeqDeviceBody(body,syx){
 const full=matchPeqFullDeviceBody(body,syx);if(full)return full;
 if(sha(body)===peqRoundtrip.bodySha256){
  const proof=verifyPeqRoundtrip();check(body.equals(proof.body),'Entire PEQ roundtrip body mismatch');
  return {file:peqRoundtrip.exportFile,sha256:peqRoundtrip.exportSha256,bodySha256:peqRoundtrip.bodySha256,submittedFileConfirmed:!!syx&&sha(syx)===peqRoundtrip.generatedSha256,scope:'Every unnormalised body byte matches the actual user import/export. submittedFileConfirmed applies only to the exact originally delivered SYX; new encodings/names are not separately imported.',audio:'User: Kõlas hästi tunnetasin vahet.',cpu:'User observed 47–48%; not a maximum for other combinations'};
 }
 const context=loadPeqControls(),hash=sha(body);
 if(body.equals(context.baselineBody))return {file:baseFolder+'donor.syx',sha256:context.baselineState.sha256,bodySha256:hash,scope:'All body bytes match actual baseline export; new filename/encoding not separately imported'};
 const point=context.library.points.find(p=>p.bodySha256===hash);if(!point)return null;
 const evidence=validatePoint(context,point);check(body.equals(evidence.body),'PEQ full body comparison mismatch');
 return {file:context.root+point.folder+'/donor.syx',sha256:point.syxSha256,bodySha256:hash,scope:'Every unnormalised body byte matches this actual paired device export; new filename/encoding not separately imported',audio:'PEQ bypassed in Scene 2 during collection; no active sound or CPU assessment'};
}
