// Exact Level points from the user's five paired FW13.0 exports, 2026-10-13.
// This module does not extrapolate a scale or generalise to other models.
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {readPinnedComposerFile} from './fm3-composer-components.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {compare,pair} from './amp-level-collector/level-check.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message)};
export const ampLevelMeasurementRoot='references/amp-level-20261013/';
export const ampLevelMeasurementIndex=ampLevelMeasurementRoot+'index.json';
export const ampLevelMeasurementIndexSha='5a0a8167aea678be9e103e4e4f3efd34d836d61f79f49601a3e2648a20b65cf8';
export const ampLevelMeasuredValues=Object.freeze([-80,-30,-6,0,20]);
let verified=null;
const copyProof=p=>({...p,points:p.points.map(x=>({...x})),captures:p.captures.map(({body,...c})=>({...structuredClone(c),body:Buffer.from(body)}))});

export function verifyAmpLevelMeasurements(){
 const index=JSON.parse(readPinnedComposerFile(ampLevelMeasurementIndex,ampLevelMeasurementIndexSha));
 check(index.firmware==='13.0'&&index.captures.length===5&&index.points.length===20,'Invalid Amp Level evidence index');
 const files=new Map(Object.entries(index.files).map(([name,hash])=>[name,readPinnedComposerFile(ampLevelMeasurementRoot+name,hash)]));
 // Rehash every input on every call; only the costly decoding of unchanged
 // bytes is cached. Callers receive copies, including all body buffers.
 if(verified)return copyProof(verified);
 const json=name=>JSON.parse(files.get(name));
 let previous=files.get('session/baseline.syx');
 const captures=[],points=[];
 for(const [i,capture] of index.captures.entries()){
  check(capture.index===i,'Amp Level evidence sequence gap');
  const dir=capture.directory,a=json(dir+'/attempt.json'),bytes=files.get(dir+'/donor.syx');
  check(a.status==='passed'&&a.index===i&&a.labelsConfirmed===true,'Amp Level operator confirmation missing');
  check(isDeepStrictEqual(a.step,{index:i,levelDb:capture.levelDb}),'Amp Level step mismatch');
  const comparison=compare(previous,bytes,i);
  check(isDeepStrictEqual(comparison,json(dir+'/comparison.json')),'Amp Level comparison changed');
  const paired=pair(fileURLToPath(new URL('../'+ampLevelMeasurementRoot+dir+'/',import.meta.url)));
  check(isDeepStrictEqual(paired,json(dir+'/pair.json')),'Amp Level pair changed');
  check(paired.syxSha256===capture.syxSha256&&paired.bodySha256===capture.bodySha256&&paired.rawRxSha256===capture.rawRxSha256,'Amp Level evidence hash mismatch');
  for(const channel of 'ABCD'){
   const levelDb=capture.levelDb[channel],raw=paired.levelsRaw[channel],modelId=paired.models[channel];
   check(modelId===index.models[channel]&&raw===index.measuredRawByDb[String(levelDb)],'Amp Level point mismatch');
   points.push({channel,modelId,levelDb,raw,stepIndex:i});
  }
  captures.push({...capture,file:ampLevelMeasurementRoot+dir+'/donor.syx',body:Buffer.from(inspectStructure(bytes).raw.body),paired});
  previous=bytes;
 }
 check(isDeepStrictEqual(points,index.points),'Amp Level point inventory changed');
 for(const channel of 'ABCD')check(isDeepStrictEqual(points.filter(p=>p.channel===channel).map(p=>p.levelDb).sort((a,b)=>a-b),ampLevelMeasuredValues),'Incomplete channel coverage');
 verified={indexFile:ampLevelMeasurementIndex,indexSha256:ampLevelMeasurementIndexSha,captures,points};
 return copyProof(verified);
}

// Evidence is checked on each call; corrupted packaged inputs cannot be hidden
// by a previously cached verification result.
export function measuredAmpLevel(channel,modelId,levelDb){
 if(!ampLevelMeasuredValues.includes(levelDb))return null;
 const proof=verifyAmpLevelMeasurements();
 const point=proof.points.find(p=>p.channel===channel&&p.modelId===modelId&&p.levelDb===levelDb);
 return point?{...point,file:proof.captures[point.stepIndex].file,indexFile:proof.indexFile}:null;
}

export function matchMeasuredAmpLevelBody(body,syxHash,bodyHash){
 const index=JSON.parse(readPinnedComposerFile(ampLevelMeasurementIndex,ampLevelMeasurementIndexSha));
 if(!index.captures.some(c=>c.bodySha256===bodyHash))return null;
 const proof=verifyAmpLevelMeasurements(),capture=proof.captures.find(c=>c.bodySha256===bodyHash);
 check(capture.body.equals(body),'Entire measured Amp Level body mismatch');
 return {file:capture.file,sha256:capture.syxSha256,bodySha256:capture.bodySha256,
  submittedFileConfirmed:syxHash===capture.syxSha256,
  scope:'Entire unnormalised body matches one operator-confirmed Level export and its 576-word GET. New names/encodings were not separately imported. No interpolation, other-model, audio or CPU confirmation.'};
}
