// Exhaustive finite preset-word domain, not new physical range evidence.
import assert from 'node:assert/strict';
import {loadDictionary,findParam,encodeValue,decodeValue,DEFAULT_STATUSES,OPT_IN_STATUSES} from './fm3-table-encoder.mjs';
const params=loadDictionary().params;
const statuses=[...DEFAULT_STATUSES,...OPT_IN_STATUSES];
const eligible=params.filter(p=>statuses.includes(p.status)&&['enum','integer','linear','log','knob'].includes(p.kind));
let words=0,rejections=0,numeric=0,enums=0,integers=0,duplicates=0;
const invalid=[-1,65536,0.5,NaN,Infinity,-Infinity,null,true,false,'0',[],{}];
for(const p of params){
 for(const raw of invalid){assert.equal(decodeValue(p,raw),undefined,p.name+': invalid raw');rejections++;}
 if(!['enum','integer','linear','log','knob'].includes(p.kind)||['unverified-taper','n/a'].includes(p.status)){
  for(const raw of [0,32767,65534,65535]){assert.equal(decodeValue(p,raw),undefined,p.name+': unknown curve');rejections++;}
 }
}
for(const p of eligible){
 const opts=DEFAULT_STATUSES.includes(p.status)?{}:{allow:[p.status]};
 if(p.kind==='enum'){
  const base=p.enumBase??0;
  for(let i=0;i<p.enum.length;i++){
   const raw=base+i,label=p.enum[i];
   assert.equal(decodeValue(p,raw),label);assert.equal(encodeValue(p,raw,opts),raw);
   const first=p.enum.findIndex(s=>s.trim().toLowerCase()===label.trim().toLowerCase())+base;
   assert.equal(encodeValue(p,label,opts),first);if(first!==raw)duplicates++;
   words++;enums++;
  }
  for(const value of [null,true,false,{},[],{toString:()=>p.enum[0]}]){assert.throws(()=>encodeValue(p,value,opts),/option must be/);rejections++;}
  for(const raw of [base-1,base+p.enum.length,65535]){assert.equal(decodeValue(p,raw),undefined);rejections++;}
 }else if(p.kind==='integer'){
  for(let value=p.min;value<=p.max;value++){
   const raw=value<0?65536+value:value;
   const display=decodeValue(p,raw);
   assert.equal(encodeValue(p,display,opts),raw,p.name+': integer display roundtrip');
   words++;integers++;
  }
  // Check every raw word outside the integer interval too, including signed boundaries.
  for(let raw=0;raw<=65535;raw++){
   const value=p.signedWord&&raw>=32768?raw-65536:raw;
   if(value<p.min||value>p.max){assert.equal(decodeValue(p,raw),undefined,p.name+': integer outside interval');rejections++;}
  }
 }else{
  let last=-Infinity;
  for(let raw=0;raw<=65534;raw++){
   const v=decodeValue(p,raw);
   assert.ok(Number.isFinite(v)&&v>=last,p.name+': finite monotone curve');
   assert.equal(encodeValue(p,v,opts),raw,p.name+': complete normalized roundtrip');
   last=v;words++;numeric++;
  }
  assert.equal(decodeValue(p,65535),undefined);rejections++;
 }
}
assert.equal(decodeValue(findParam('chorus','VOICES'),65535),undefined);
assert.equal(decodeValue(findParam('tentap','TIME1M'),32767),undefined);
assert.equal(encodeValue(findParam('plex','NUMDLINES'),4,{allow:['linear-by-structure']}),2);
assert.equal(encodeValue(findParam('pitch','CUSTOMSCALE1'),'SCALE 32'),31);
console.log(JSON.stringify({passed:true,dictionaryRows:params.length,scalarDescriptors:eligible.length,validWords:words,normalizedWords:numeric,integerWords:integers,enumWords:enums,rejections,repeatedLabelWords:duplicates,deviceIO:false,fullRangeHardwareProven:false}));
