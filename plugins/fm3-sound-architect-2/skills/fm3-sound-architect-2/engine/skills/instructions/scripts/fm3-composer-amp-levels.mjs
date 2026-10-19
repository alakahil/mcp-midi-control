// Channel Level overrides backed by explicit firmware-13 evidence.
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readPinnedComposerFile} from './fm3-composer-components.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message)};
const sha=b=>createHash('sha256').update(b).digest('hex');
export const ampLevelEvidenceFile='examples/JB_EIGHT_SCENES_V2_export.syx';
export const ampLevelEvidenceSha='db508e85b3e0ef015dce6b562699f16e20e5179917069d52de8ac22caf5da32d';
export const ampLevelBodySha='80bd02b70b79b542cf018cba57df602856eded6afe9da03c3537d031e555ce1f';
export const ampCDLevelEvidenceFile='examples/FM3_AMP_CD_LEVEL_CHECK_export.syx';
export const ampCDLevelEvidenceSha='aac60417ad82db7be996bbc1dd6026a2ff9a5a246bdf4966c116ab33cd87c237';
export const ampCDLevelBodySha='2dd66a505053273fd72dd9400458e6a45f805672aa92ff418fa5ebf21b6b07e4';
export function verifyAmpLevelEvidence(){
  const before=inspectStructure(readPinnedComposerFile('examples/JB_EIGHT_SCENES_V1_export.syx','862f0088b9b50198a4484e5999ce72e44292db3855b70e23b3010683eab2fa27'));
  const after=inspectStructure(readPinnedComposerFile(ampLevelEvidenceFile,ampLevelEvidenceSha));
  const a=Buffer.from(before.raw.body),b=Buffer.from(after.raw.body);
  check(a.length===13146&&b.length===a.length,'Amp Level evidence body length');
  const changes=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])changes.push(i);
  check(changes.join(',')==='4658,4659','Amp A Level evidence contains collateral changes');
  check(a.readUInt16LE(4668)===4&&b.readUInt16LE(4668)===4,'Expected Double Verb Vibrato evidence');
  check(a.readUInt16LE(4658)===46529&&b.readUInt16LE(4658)===44563,'Amp A Level evidence words changed');
  check(sha(b)===ampLevelBodySha,'Amp A evidence body hash');
  check(before.decoded.preset_name===after.decoded.preset_name,'Evidence preset name changed');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Evidence dump header changed');
  return {body:b,changedOffsets:changes,channel:'A',modelId:4,model:'Double Verb Vibrato',parameterId:1,displayDb:-12,raw:44563,beforeDisplayDb:-9,beforeRaw:46529,file:ampLevelEvidenceFile,sha256:ampLevelEvidenceSha,bodySha256:ampLevelBodySha};
}
export function verifyAmpCDLevelEvidence(){
  const a=verifyAmpLevelEvidence().body;
  const actual=inspectStructure(readPinnedComposerFile(ampCDLevelEvidenceFile,ampCDLevelEvidenceSha));
  const b=Buffer.from(actual.raw.body),changes=[];
  check(b.length===a.length,'C/D Level evidence body length');
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])changes.push(i);
  check(changes.join(',')==='5234,5235,5522,5523','C/D Level evidence contains collateral changes');
  const points=[
    {channel:'C',modelId:24,model:'USA MK IV Lead Bright',offset:5234,modelOffset:5244,beforeRaw:47184},
    {channel:'D',modelId:11,model:'Plexi 50W High 1',offset:5522,modelOffset:5532,beforeRaw:47080}
  ].map(p=>{
    check(a.readUInt16LE(p.modelOffset)===p.modelId&&b.readUInt16LE(p.modelOffset)===p.modelId,'C/D evidence model mismatch');
    check(a.readUInt16LE(p.offset)===p.beforeRaw&&b.readUInt16LE(p.offset)===45218,'C/D evidence Level word mismatch');
    return {...p,parameterId:1,displayDb:-11,raw:45218,file:ampCDLevelEvidenceFile};
  });
  check(sha(b)===ampCDLevelBodySha,'C/D evidence body hash');
  check(actual.decoded.preset_name==='JB EIGHT SCENES V2'&&b[0]===1,'C/D export name or selected scene changed');
  // The user used the delivered V2 name. Compare its header separately from
  // the earlier A-control export whose internal name still said V1.
  const namedBase=inspectStructure(readPinnedComposerFile('examples/JB_EIGHT_SCENES_V2.syx','aed7727e29b12765a661708ca29fcf211cc8901a4655edbec53738920adf565f'));
  check(Buffer.from(namedBase.raw.body).equals(a),'Delivered V2 body mismatch');
  check(Buffer.from(actual.parsed.headerPayload).equals(Buffer.from(namedBase.parsed.headerPayload)),'C/D dump header changed');
  const headerChanges=[];
  for(let i=0;i<76;i++)if(actual.raw.rawPatch[i]!==namedBase.raw.rawPatch[i]){
    check([4,5,74,75].includes(i),'Unrelated C/D raw header change');
    headerChanges.push({offset:i,before:namedBase.raw.rawPatch[i],after:actual.raw.rawPatch[i],field:i<6?'CRC':'compressed length'});
  }
  for(const d of [namedBase,actual]){const raw=Buffer.from(d.raw.rawPatch);check(raw.readUInt16LE(72)===13146&&raw.readUInt16LE(74)===d.raw.compSize,'C/D encoded lengths');check(raw.subarray(76+d.raw.compSize).every(v=>v===0),'C/D nonzero padding');}
  return {body:b,changedOffsets:changes,points,file:ampCDLevelEvidenceFile,sha256:ampCDLevelEvidenceSha,bodySha256:ampCDLevelBodySha,headerChanges};
}
export function ampLevelCapabilities(){
  return {field:'ampLevels',entryFields:['channel','levelDb'],channels:['A','B','C','D'],pendingChannels:[],A:{modelId:4,model:'Double Verb Vibrato',valuesDb:[-12],evidence:ampLevelEvidenceFile},B:{minimum:-80,maximum:20,policy:'Existing levelB scope; specifying both forms is rejected'},C:{modelId:24,model:'USA MK IV Lead Bright',valuesDb:[-11],evidence:ampCDLevelEvidenceFile},D:{modelId:11,model:'Plexi 50W High 1',valuesDb:[-11],evidence:ampCDLevelEvidenceFile},policy:'A/C/D use exact observed words on the listed models, no interpolation or other-model inference. No Gain/EQ/Master or per-scene output control.'};
}
export function applyAmpLevels(body,layout,spec,allow){
  if(!Object.hasOwn(spec,'ampLevels'))return [];
  const entries=spec.ampLevels;
  check(Array.isArray(entries)&&entries.length>=1&&entries.length<=4,'ampLevels must contain 1..4 entries');
  const seen=new Set(),writes=[];
  for(const entry of entries){
    check(entry!==null&&typeof entry==='object'&&!Array.isArray(entry)&&Object.keys(entry).every(k=>['channel','levelDb'].includes(k)),'ampLevels entries support only channel and levelDb');
    const {channel,levelDb}=entry;
    check(typeof channel==='string'&&/^[ABCD]$/.test(channel),'Invalid Amp Level channel');
    check(!seen.has(channel),'Duplicate Amp Level channel '+channel);seen.add(channel);
    check(typeof levelDb==='number'&&Number.isFinite(levelDb),'Amp Level must be a finite number');
    const start=layout.start+'ABCD'.indexOf(channel)*layout.words*2,offset=start+2,modelId=body.readUInt16LE(start+12);
    let raw,evidence;
    if(channel==='B'){
      check(!Object.hasOwn(spec,'levelB'),'levelB conflicts with ampLevels channel B');
      check(levelDb>=-80&&levelDb<=20,'Unsupported Amp B Level');
      raw=Math.round((levelDb+80)/100*65534);evidence='Existing levelB encoding and scope';
    }else if(channel==='A'){
      const point=verifyAmpLevelEvidence();
      check(modelId===point.modelId&&levelDb===point.displayDb,'Amp A Level supports only measured Double Verb Vibrato -12 dB');
      raw=point.raw;evidence=point.file;
    }else{
      const point=verifyAmpCDLevelEvidence().points.find(p=>p.channel===channel);
      check(modelId===point.modelId&&levelDb===point.displayDb,'Amp '+channel+' Level supports only measured '+point.model+' -11 dB');
      raw=point.raw;evidence=point.file;
    }
    writes.push({channel,modelId,parameterId:1,offset,valueDb:levelDb,displayValueDb:-80+raw/65534*100,beforeRaw:body.readUInt16LE(offset),raw,evidence});
  }
  // Validate every request before writing any of these Level words.
  for(const w of writes){body.writeUInt16LE(w.raw,w.offset);allow(w.offset,2)}
  return writes;
}
export function matchAmpLevelDeviceBody(body,syx){
  const hash=sha(body);
  const proof=hash===ampLevelBodySha?verifyAmpLevelEvidence():hash===ampCDLevelBodySha?verifyAmpCDLevelEvidence():null;
  if(!proof)return null;
  check(proof.body.equals(body),'Entire Amp Level device body mismatch');
  return {file:proof.file,sha256:proof.sha256,bodySha256:proof.bodySha256,submittedFileConfirmed:sha(syx)===proof.sha256,scope:'Entire unnormalised body matches the named actual user Level export. New names/encodings are not separately import-confirmed; other values/models and listening are not inferred.'};
}
