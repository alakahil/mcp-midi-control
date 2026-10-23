import {fileURLToPath} from 'node:url';
// Firmware 13: audited screen values plus actual GET/SYX pairs. Offline only.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compare,pair,preflight} from './peq-full-collector/full-check.mjs';
import {pair as baselinePair} from './peq-baseline-collector/peq-check.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
export const peqFullLibraryHash='401974575dc6db81356758a12aa6c86b7453c981b3873530b9315eef923ab67f';
const types=[['Shelving','Peaking','Blocking','Shelving 2','Peaking 2'],['Peaking','Shelving','Shelving 2','Peaking 2'],['Peaking','Peaking 2'],['Peaking','Shelving','Shelving 2','Peaking 2'],['Shelving','Peaking','Blocking','Shelving 2','Peaking 2']];
const frequencies=[[20,2000],[100,10000],[100,10000],[100,10000],[200,20000]];
const numeric={Frequency:(band)=>({min:frequencies[band-1][0],max:frequencies[band-1][1],log:true}),Q:()=>({min:.1,max:10,log:true}),Gain:()=>({min:-20,max:20}),Level:()=>({min:-80,max:20}),Balance:()=>({min:-100,max:100})};
export function encodePeqNumber(parameter,band,value){
 const range=numeric[parameter]?.(band);check(range,'Unknown PEQ numeric parameter');
 check(typeof value==='number'&&Number.isFinite(value)&&value>=range.min&&value<=range.max,`PEQ ${parameter} ${band??''}: finite value in ${range.min}..${range.max} required`);
 return Math.round((range.log?Math.log(value/range.min)/Math.log(range.max/range.min):(value-range.min)/(range.max-range.min))*65534);
}
function decodeNumber(parameter,band,raw){const r=numeric[parameter](band);return r.log?r.min*Math.pow(r.max/r.min,raw/65534):r.min+raw/65534*(r.max-r.min);}
function enumRaw(parameter,band,value){
 const values=parameter==='Type'?types[band-1]:parameter==='Slope'?[6,12,18,24,30,36]:parameter==='Bypass Mode'?['Thru','Mute']:['OFF','ON'];
 const index=values.indexOf(value);check(index>=0,`Unsupported PEQ ${parameter} ${value}`);return index;
}
let cached;
export function loadPeqFull(){
 const bytes=read('references/peq-full.json');check(sha(bytes)===peqFullLibraryHash,'PEQ full registry changed; revalidate');
 const library=JSON.parse(bytes),root='references/'+library.evidenceDirectory+'/';
 check(library.firmware===13&&library.effectId===54&&library.wordsPerChannel===33&&library.passed.length===84&&library.excludedAttempts.length===4,'Invalid PEQ full registry');
 // Recheck actual sources on every call; cache decoding only after all hashes match.
 for(const [file,hash] of Object.entries(library.files))check(sha(read(root+file))===hash,'PEQ source changed: '+file);
 if(cached)return cached;
 const baseline=read(root+'baseline.syx'),base=preflight(baseline);
 check(base.sha256==='c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be','PEQ baseline changed');
 const proof=baselinePair(fileURLToPath(new URL('../references/peq-baseline-20261009-114022/capture-20261009T114021-4e486c054d/',import.meta.url)));
 check(proof.matchedWords===132&&proof.syxSha256===base.sha256,'PEQ baseline is not paired');
 let previous='baseline.syx',numericAnchors=0,enumAnchors=0;
 const observed=[];
 for(const [i,point] of library.passed.entries()){
  check(point.index===i&&point.previousFile===previous,'PEQ measurement chain changed');
  const folder=root+point.folder+'/',result=JSON.parse(read(folder+'result.json'));
  const comparison=compare(read(root+previous),read(folder+'donor.syx'),i),actualPair=pair(fileURLToPath(new URL('../'+folder,import.meta.url)));
  check(result.status==='passed'&&result.displayConfirmed===true,'PEQ screen confirmation missing');
  check(JSON.stringify(comparison)===JSON.stringify(result.comparison)&&JSON.stringify(actualPair)===JSON.stringify(result.pair),'PEQ stored proof differs from actual sources');
  check(comparison.typeCoupledChanges.length===0,'PEQ type has unhandled coupled changes');
  check(result.observations.length===comparison.requestedWords.length,'PEQ observation count mismatch');
  for(const [j,o] of result.observations.entries()){
   const {raw,...control}=comparison.requestedWords[j];
   check(JSON.stringify(o.control)===JSON.stringify(control),'PEQ observation labels differ');
   const a={index:i,channel:control.channel,band:control.band,parameter:control.parameter,pid:control.candidatePid,target:control.value,display:o.displayValue,unit:control.unit,raw};
   observed.push(a);
   if(numeric[a.parameter]){
    const value=a.target??a.display;
    check(encodePeqNumber(a.parameter,a.band,value)===raw,'PEQ scale disagrees with actual raw word at '+i);
    // Recorded rounded display is an alias, not a new target from which to infer raw.
    check(typeof a.display==='number'&&Number.isFinite(a.display),'Non-numeric PEQ display');
    const decoded=decodeNumber(a.parameter,a.band,raw),tolerance=a.parameter==='Frequency'?Math.max(.011,decoded*Math.log(100)/65534/2+.51*10**(Math.floor(Math.log10(decoded))-4)):a.parameter==='Q'?.005:.011;
    check(Math.abs(decoded-a.display)<=tolerance,'PEQ decoded value disagrees with screen at '+i);numericAnchors++;
   }else{check(enumRaw(a.parameter,a.band,a.display)===raw&&a.target===a.display,'PEQ enum disagrees with screen at '+i);enumAnchors++;}
  }
  previous=point.folder+'/donor.syx';
 }
 check(JSON.stringify(observed)===JSON.stringify(library.anchors),'PEQ anchor registry differs from captured observations');
 const baselineWords=base.words.slice(0,33);
 check('BCD'.split('').every((_,c)=>base.words.slice((c+1)*33,(c+2)*33).every((v,i)=>v===baselineWords[i])),'PEQ baseline channels are not identical');
 cached={library,root,baselineWords,audit:{passedSteps:84,excludedAttempts:4,pairedWordsPerStep:132,numericAnchors,enumAnchors,allScaleTargetsExact:true,typeCoupledChanges:0,channelCopies:[77,79,81],independentChannelGain:[78,80,82],sceneSelections:[77,79,81,83]}};
 return cached;
}
export function decodePeqChannel(words){
 check(Array.isArray(words)&&words.length===33,'Expected 33 PEQ channel words');
 return {bands:types.map((list,i)=>({band:i+1,type:list[words[15+i]]??'Unknown '+words[15+i],frequencyHz:decodeNumber('Frequency',i+1,words[i]),...(list[words[15+i]]==='Blocking'?{slopeDbPerOct:(words[i===0?30:31]+1)*6}:{q:decodeNumber('Q',i+1,words[5+i]),gainDb:decodeNumber('Gain',i+1,words[10+i])}),solo:words[25+i]===1})),levelDb:decodeNumber('Level',null,words[20]),balance:decodeNumber('Balance',null,words[21]),bypassMode:['Thru','Mute'][words[22]]??'Unknown',sceneIgnore:words[32]===1};
}
export function composePeqFull(selections){
 check(Array.isArray(selections)&&selections.length>=1&&selections.length<=4,'PEQ requires 1..4 channel selections');
 const context=loadPeqFull(),seen=new Set(),data=[],channels=[];
 for(const s of selections){
  check(object(s)&&Object.keys(s).every(k=>['channel','bands','levelDb','balance','bypassMode','sceneIgnore'].includes(k)),'Unknown PEQ field');
  check(typeof s.channel==='string'&&/^[ABCD]$/.test(s.channel)&&!seen.has(s.channel),'Invalid or duplicate PEQ channel');seen.add(s.channel);
  const words=[...context.baselineWords],controls=[];
  const set=(pid,key,parameter,band,value)=>{
   let raw,displayValue=value,origin='measured enum';
   if(numeric[parameter]){
    raw=encodePeqNumber(parameter,band,value);
    const anchor=context.library.anchors.find(a=>a.parameter===parameter&&a.band===band&&(a.target===value||a.display===value));
    if(anchor){raw=anchor.raw;displayValue=anchor.display;origin='measured point';}
    else{displayValue=decodeNumber(parameter,band,raw);origin='scale-derived; independent device check pending';}
   }else raw=enumRaw(parameter,band,value);
   words[pid]=raw;
   controls.push({key,band,parameterId:pid,value,displayValue,raw,roundedDisplay:displayValue!==value,unit:parameter==='Frequency'?'Hz':parameter==='Gain'||parameter==='Level'?'dB':parameter==='Slope'?'dB/oct':'',origin});
  };
  if(own(s,'bands')){
   check(Array.isArray(s.bands)&&s.bands.length>=1&&s.bands.length<=5,'PEQ bands requires 1..5 entries');const seenBands=new Set();
   for(const b of s.bands){
    check(object(b)&&Object.keys(b).every(k=>['band','type','frequencyHz','q','gainDb','slopeDbPerOct','solo'].includes(k)),'Unknown PEQ band field');
    check(Number.isInteger(b.band)&&b.band>=1&&b.band<=5&&!seenBands.has(b.band),'Invalid or duplicate PEQ band');seenBands.add(b.band);
    const i=b.band-1,prefix='bands.'+b.band+'.';
    if(own(b,'type'))set(15+i,prefix+'type','Type',b.band,b.type);
    const type=types[i][words[15+i]];
    if(own(b,'q'))check(type!=='Blocking','Blocking has no Q control; omit q and retain the baseline word');
    if(own(b,'gainDb'))check(type!=='Blocking','Blocking uses slopeDbPerOct, not gainDb');
    if(own(b,'slopeDbPerOct'))check(type==='Blocking'&&[1,5].includes(b.band),'Slope requires outer-band Blocking');
    for(const [key,pid,parameter] of [['frequencyHz',i,'Frequency'],['q',5+i,'Q'],['gainDb',10+i,'Gain'],['slopeDbPerOct',i===0?30:31,'Slope']])if(own(b,key))set(pid,prefix+key,parameter,b.band,b[key]);
    if(own(b,'solo')){check(typeof b.solo==='boolean','PEQ Solo must be boolean');set(25+i,prefix+'solo','Solo',b.band,b.solo?'ON':'OFF');}
   }
  }
  for(const [key,pid,parameter] of [['levelDb',20,'Level'],['balance',21,'Balance'],['bypassMode',22,'Bypass Mode']])if(own(s,key))set(pid,key,parameter,null,s[key]);
  if(own(s,'sceneIgnore')){check(typeof s.sceneIgnore==='boolean','PEQ Scene Ignore must be boolean');set(32,'sceneIgnore','Scene Ignore',null,s.sceneIgnore?'ON':'OFF');}
  const bytes=Buffer.alloc(66);words.forEach((v,i)=>bytes.writeUInt16LE(v,i*2));data.push({channel:s.channel,bytes});
  channels.push({channel:s.channel,type:'Parametric EQ, bands 1–5',sourceChannel:'A',sourceSyxSha256:context.library.files['baseline.syx'],words,controls,effective:decodePeqChannel(words),evidence:'docs/FM3_PEQ_FULL_VALIDATION.json',scope:'Full paired baseline with audited overrides; whole-preset evidence is matched separately; unmeasured values are not individual screen measurements'});
 }
 return {wordsPerChannel:33,data,channels};
}
export function peqFullCapabilities(){
 const {audit}=loadPeqFull();
 return {channels:['A','B','C','D'],librarySha256:peqFullLibraryHash,mode:'Measured enums/anchors; scale-derived intermediate values explicitly identified',bands:types.map((values,i)=>({band:i+1,types:[...values],frequencyHz:{minimum:frequencies[i][0],maximum:frequencies[i][1],scale:'log'},q:{minimum:.1,maximum:10,scale:'log',exceptType:'Blocking'},gainDb:{minimum:-20,maximum:20,exceptType:'Blocking'},...([0,4].includes(i)?{slopeDbPerOct:[6,12,18,24,30,36],slopeRequiresType:'Blocking'}:{}),solo:'boolean'})),levelDb:{minimum:-80,maximum:20},balance:{minimum:-100,maximum:100,measuredAnchors:[-100,0,100],intermediateStatus:'linear inference; test values -10/+10 survived import/export; screen values not explicitly reported'},bypassMode:['Thru','Mute'],sceneIgnore:'boolean; persistent word verified, scene behavior not independently measured',legacyBand3:'Existing A-only exact-point band3 syntax remains supported; use bands for full scope',reservedPids:[23,24],audit,evidence:'docs/FM3_PEQ_FULL_VALIDATION.json',hardware:'Exact FM3_PEQ_ABCD_TEST import/export confirmed, all 13456 body bytes; CPU 47–48%. Other combinations remain separate.'};
}
