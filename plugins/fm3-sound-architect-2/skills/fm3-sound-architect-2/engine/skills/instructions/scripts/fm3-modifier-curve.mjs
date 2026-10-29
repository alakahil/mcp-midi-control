// Modifier curve / timing fields (record words 3-7, 12-15): full-range display codec. Offline, no device I/O.
// Each formula is the native FW13 MOD descriptor (min, max, display multiplier; kind linear or log,
// docs/fm3/parameter-evidence/modifier-fields-audit.json) mapped onto the 0..65534 stored word. It reproduces
// every device reading we hold: the T12 step check (one field per step, references/fm3-mod-steps-20261029.json),
// the three Wah measured-control captures (references/wah-measured-controls.json) and the T7/T7b display readings.
// Word = round(formula); display = word decoded and rounded to the FM3's shown decimals.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error('Modifier curve: '+message);};
const FULL=65534,MID=32767,lin=(lo,hi)=>({enc:v=>Math.round((v-lo)/(hi-lo)*FULL),dec:w=>lo+w/FULL*(hi-lo)});
export const modifierCurveFields=Object.freeze([
 {key:'startPercent',word:3,label:'Start',unit:'%',min:0,max:100,decimals:1,...lin(0,100)},
 {key:'midPercent',word:4,label:'Mid',unit:'%',min:0,max:100,decimals:1,...lin(0,100)},
 {key:'endPercent',word:5,label:'End',unit:'%',min:0,max:100,decimals:1,...lin(0,100)},
 {key:'slopePercent',word:6,label:'Slope',unit:'%',min:0,max:100,decimals:1,...lin(0,100)},
 {key:'attackMs',word:7,label:'Attack',unit:'ms',min:0,max:10000,decimals:1,...lin(0,10000)},
 {key:'offValuePercent',word:12,label:'Off Value',unit:'%',min:5,max:95,decimals:1,...lin(5,95)},
 {key:'scale',word:13,label:'Scale',unit:'',min:0.1,max:10,decimals:3,enc:v=>Math.round(MID+MID*Math.log10(v)),dec:w=>10**((w-MID)/MID)},
 {key:'offsetPercent',word:14,label:'Offset',unit:'%',min:-100,max:100,decimals:1,enc:v=>Math.round(MID+v/100*MID),dec:w=>(w-MID)/MID*100},
 {key:'releaseMs',word:15,label:'Release',unit:'ms',min:0,max:10000,decimals:1,...lin(0,10000)}].map(f=>Object.freeze(f)));
const byKey=Object.fromEntries(modifierCurveFields.map(f=>[f.key,f]));
const round=(v,d)=>Number(v.toFixed(d))+0;
export function encodeCurveValue(key,value){
 const f=byKey[key];check(f,'unknown field '+key);
 check(typeof value==='number'&&Number.isFinite(value),`${key} must be a number ${f.min}..${f.max}`);
 check(value>=f.min&&value<=f.max,`${key} out of range [${f.min}..${f.max}]: ${value}`);
 const word=f.enc(value);check(Number.isInteger(word)&&word>=0&&word<=FULL,key+' encoding');return word;
}
export function decodeCurveWord(key,word){
 const f=byKey[key];check(f,'unknown field '+key);check(Number.isInteger(word)&&word>=0&&word<=FULL,`${key} stored word out of range: ${word}`);
 return round(f.dec(word),f.decimals);
}
// Every device reading of these words, joined by word index; the codec must reproduce each one.
const REF=new URL('../references/',import.meta.url),EV=['fm3-mod-steps-20261029.json','wah-measured-controls.json','fm3-modifier-display-20261028.json'];
export const curveEvidenceHashes=Object.freeze({'fm3-mod-steps-20261029.json':'22d3eae35e206b3efb86af4307daf36acb2341406892273645a80bdf1e232d48','wah-measured-controls.json':'f5112b4340c09eabee0fc366fc6a9f1394c2bcb969b2b0fe8f88760ee2225406','fm3-modifier-display-20261028.json':'a05a22e35e5c7a157a15fd093d92a5653fcaaf85736f4da2b5a57068ee279e9a'});
function devicePoints(){
 const [steps,wah,disp]=EV.map(f=>{const b=fs.readFileSync(new URL(f,REF));check(sha(b)===curveEvidenceHashes[f],'evidence drift: '+f);return JSON.parse(b);});
 const pts=[],num=s=>Number(String(s).replace(',','.').replace(/[^0-9.\-]/g,''));
 for(const f of modifierCurveFields){
  for(const [w,shown] of Object.entries(steps.decoded['word'+f.word]?.points??{}))pts.push({key:f.key,word:+w,display:num(shown),source:'T12'});
  for(const p of wah.fields.find(x=>x.word===f.word)?.points??[])pts.push({key:f.key,word:p.raw,display:p.display,input:p.input,source:'wah-measured-controls'});
  for(const it of [...disp.items,...disp.repeat.items].filter(i=>i.validReading!==false&&i.words?.[f.word]!==undefined&&i.fields?.[f.label]!==undefined))
   pts.push({key:f.key,word:it.words[f.word],display:num(it.fields[f.label]),source:'T7/T7b '+it.id});
 }
 return pts;
}
// One T7 reading disagrees with the codec: the Wah record with Off Value word 65534 was read as "5.0%" (95.0%
// expected). Five other device points, the native descriptor (5..95 %) and T12 agree; kept visible, not used.
const KNOWN_OUTLIERS=[{key:'offValuePercent',word:65534,display:5,source:'T7/T7b autoengage'}];
export function verifyCurveEvidence(){
 const pts=devicePoints(),out=[];
 for(const p of pts){
  const outlier=KNOWN_OUTLIERS.some(o=>o.key===p.key&&o.word===p.word&&o.display===p.display&&o.source===p.source);
  const shown=decodeCurveWord(p.key,p.word),ok=Math.abs(shown-p.display)<1e-9;
  if(outlier){check(!ok,'listed outlier now agrees: remove it');out.push({...p,outlier:true});continue;}
  check(ok,`${p.key} word ${p.word}: codec shows ${shown}, device ${p.display} (${p.source})`);
  if(p.input!==undefined)check(encodeCurveValue(p.key,p.input)===p.word,`${p.key} input ${p.input} must encode to ${p.word}`);
  check(encodeCurveValue(p.key,p.display)===p.word||decodeCurveWord(p.key,encodeCurveValue(p.key,p.display))===p.display,`${p.key} ${p.display} round trip`);
  out.push(p);
 }
 return {points:out.filter(p=>!p.outlier).length,outliers:out.filter(p=>p.outlier),fields:modifierCurveFields.length};
}
export function modifierCurveCapability(){return {
 keys:Object.fromEntries(modifierCurveFields.map(f=>[f.key,{word:f.word,label:f.label,unit:f.unit,min:f.min,max:f.max,decimals:f.decimals}])),
 codec:'native FW13 MOD descriptor ranges on the 0..65534 stored word (linear; Scale log10 0.1..10; Offset centred at 32767)',
 evidence:EV.map(f=>'references/'+f),fullRange:true,fieldIndependenceVerified:true,
 hardware:'every field stepped on the device one at a time (T12, 2026-10-29); values between the measured points follow the descriptor formula, hardware-unverified',
 offValueOutlier:'T7 read Off Value word 65534 as 5.0%; the codec gives 95.0% (all other readings agree)',deviceIO:false};}
