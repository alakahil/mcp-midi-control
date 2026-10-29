// Read-only parameter map. Scalar metadata, authoring gates and observations
// remain independent; a successful lookup never authorizes a preset write.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDictionary,findParam,baseSlug,FAMILY_BY_SLUG,DEFAULT_STATUSES,OPT_IN_STATUSES,dictionaryHash} from './fm3-table-encoder.mjs';
import {composerBases,layouts} from './fm3-composer-bases.mjs';
import {typePolicySummary,templateOnlyParameter} from './fm3-type-applicability.mjs';
import {tempoLocks} from './fm3-parameter-dependencies.mjs';
import {insertTempoLocks} from './fm3-insert-tempo.mjs';
import {CHANNELS} from './fm3-layout.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const key=p=>`${p.family??'UNNAMED'}:${p.param}`;
const supported=p=>['linear','log','knob','integer','enum'].includes(p.kind);
const gate=p=>DEFAULT_STATUSES.includes(p.status)?'default':OPT_IN_STATUSES.includes(p.status)?'opt-in':'blocked';
const originalDictionary=JSON.parse(fs.readFileSync(new URL('../references/fm3-param-dictionary.json',import.meta.url),'utf8'));
const originals=new Map(originalDictionary.params.map(p=>[key(p),p]));
const effective=new Map(loadDictionary().params.map(p=>[key(p),p]));
export const parameterEvidenceIndexHash='3489c9ff43a015bbdf1321f8075353c156364947282b70f89edcc9df93b42d65';
export function validateParameterIndex(bytes){
 if(sha(bytes)!==parameterEvidenceIndexHash)throw Error('Parameter evidence index hash mismatch');
 const d=JSON.parse(bytes);
 if(d.schemaVersion!==1||d.sources.dictionarySha256!==dictionaryHash||d.sources.encoderSha256!==sha(fs.readFileSync(new URL('./fm3-table-encoder.mjs',import.meta.url))))throw Error('Parameter evidence index does not match this encoder');
 return d;
}
let cached;
function index(){
 if(cached)return cached;
 const d=validateParameterIndex(fs.readFileSync(new URL('../../../docs/FM3_PARAMETER_EVIDENCE.json',import.meta.url)));
 const byId=new Map(d.parameters.map(p=>[p.id,p]));
 if(byId.size!==d.parameters.length||!loadDictionary().params.every(p=>byId.has(key(p))))throw Error('Parameter evidence index identity mismatch');
 return cached={...d,byId};
}

export function parameterScale(p){
 if(!supported(p)||p.status==='unverified-taper'||p.status==='n/a')return {known:false,reason:'No supported scalar interpretation; retain the stored word without inventing a value'};
 if(p.kind==='enum'){
  const base=p.enumBase??0;
  const groups=new Map();p.enum.forEach((label,i)=>{const k=label.trim().toLowerCase();groups.set(k,[...(groups.get(k)??[]),i+base]);});
  return {known:true,kind:'enum',input:'numeric stored word or exact label (case/outer whitespace normalized)',
   storedRange:[base,base+p.enum.length-1],options:p.enum.map((label,i)=>({word:i+base,label})),
   repeatedLabels:[...groups].filter(([,words])=>words.length>1).map(([label,words])=>({label,words,stringSelects:words[0]})),
   labelRule:'Repeated labels retain distinct words; a string selects the first match. Use the numeric word to select another occurrence.'};
 }
 const m=p.kind==='integer'?(p.integerScale??1):(p.displayMultiplier||1);
 const range=p.kind==='knob'?[0,m]:[p.min*m,p.max*m];
 return {known:true,kind:p.kind,input:'FM3 display value; numeric global-scale selectors retain stored-index meaning',
  numericInputRange:range,storedDomain:p.kind==='integer'?{kind:p.signedWord?'signed-int16':'unsigned-int16',logicalRange:[p.min,p.max],displayStep:m}:{kind:'normalized-uint16',range:[0,65534]},
  ...(p.displayCodec?{displayCodec:structuredClone(p.displayCodec)}:{}),
  ...(p.family==='INPUT'&&p.param===0?{displayEndpoint:{input:-100,word:0,label:'OFF'}}:{}),
  ...(p.family==='CABINET'&&[93,94].includes(p.param)?{unit:'unitless 0..10; historical 0..100 is normalized percent, not display units'}:{})};
}

function policies(){
 const p=typePolicySummary();
 return new Set([...Object.keys(p.families),...Object.keys(p.algorithmApplicability.families),...Object.keys(p.modulationDynamics.families),...Object.keys(p.insertFamilies.families),'ROTARY','PITCH','INPUT','VOLUME']);
}
const covered=policies();
function describe(row){
 const p=effective.get(row.id);
 const observations=structuredClone(row.observations);
 const refs=[...new Set(observations.flatMap(o=>Object.values(o).filter(v=>v&&typeof v==='object'&&v.path).map(v=>v.path)))];
 const evidence={observations,sources:Object.fromEntries(refs.map(path=>[path,index().evidenceSources[path]])),
  fullRangeHardwareProven:false,scope:index().scope,catalogRangeDifferences:structuredClone(row.catalogRangeDifferences)};
 if(!p)return {id:row.id,family:row.family,pid:row.pid,catalogNames:structuredClone(row.catalogNames),evidence,authoring:{scalarGate:'blocked',reason:'Catalog only; no encoder descriptor or guessed address'}};
 const slug=Object.keys(FAMILY_BY_SLUG).find(s=>FAMILY_BY_SLUG[s]===p.family)??null;
 const bases=composerBases.filter(b=>Object.entries(layouts[b.layout]).some(([s,l])=>FAMILY_BY_SLUG[s]===p.family&&l.eid===p.block&&p.param<l.words)).map(b=>b.id);
 const fullTemplate=templateOnlyParameter(p);
 const inputAllowed=p.family!=='INPUT'||[0,1,2,3,5].includes(p.param);
 return {id:row.id,family:p.family,pid:p.param,effectId:p.block,name:p.name,label:p.label,
  catalogNames:structuredClone(row.catalogNames),dictionary:{kind:originals.get(row.id).kind,status:originals.get(row.id).status},
  effective:{kind:p.kind,status:p.status,scale:parameterScale(p)},
  authoring:{block:slug,scalarGate:gate(p),requiredAllow:gate(p)==='opt-in'?[p.status]:[],
   tableBases:bases,tableScalarEligible:!!bases.length&&supported(p)&&gate(p)!=='blocked'&&inputAllowed,
   fullChannelTemplateRequired:fullTemplate,boundedTypePolicy:covered.has(p.family),
   channels:slug?'ABCD'.slice(0,CHANNELS[p.block]??4).split(''):[],
   inputScopeAllowed:inputAllowed,publicBlockBinding:slug!==null,
   tempoDependencies:structuredClone([...tempoLocks,...insertTempoLocks].filter(r=>r.family===p.family&&(r.targetPid===p.param||r.tempoPid===p.param))),
   writeDecision:'Not evaluated: scalar eligibility is not write permission. The complete preset writer must validate placement, final type/mode, tempo, modifier targets and channel scope.'},evidence};
}

export function parameterMapSummary(){
 const d=index();
 return {parameterKeys:d.parameters.length,dictionaryRows:loadDictionary().params.length,
  catalogOnlyKeys:d.parameters.length-loadDictionary().params.length,indexedObservations:d.parameters.reduce((n,p)=>n+p.observations.length,0),
  families:[...new Set(d.parameters.map(p=>p.family??'UNNAMED'))].sort(),deviceIO:false,newHardwareMeasurements:false};
}

export function getParameterMap(family,param){
 const d=index();
 let rows=d.parameters;
 if(family!==undefined){
  if(typeof family!=='string'||!family.length)throw Error('Parameter family must be a nonempty string');
  const fam=FAMILY_BY_SLUG[family]??FAMILY_BY_SLUG[baseSlug(family)]??family.toUpperCase();
  rows=rows.filter(p=>(p.family??'UNNAMED')===fam);
  if(!rows.length)throw Error('Unknown parameter family '+family);
  if(param!==undefined){
   if(!(typeof param==='string'&&param.length||Number.isInteger(param)&&param>=0))throw Error('Invalid parameter selector');
   let runtime;
   try{runtime=findParam(fam,param);}catch{}
   rows=runtime?rows.filter(r=>r.pid===runtime.param):rows.filter(r=>typeof param==='number'?r.pid===param:r.catalogNames.includes(param));
   if(rows.length!==1)throw Error('Unknown or ambiguous parameter '+family+'/'+param);
  }
 }else if(param!==undefined)throw Error('Parameter requires a family');
 return {schemaVersion:1,firmware:'13.0',summary:parameterMapSummary(),selection:family??'all',parameters:rows.map(describe)};
}

export function parameterMapCLI(args){
 if(!args.length)return {schemaVersion:1,summary:parameterMapSummary(),usage:'--parameter-map FAMILY [PID|NAME]; --parameter-map --all'};
 if(args.length===1&&args[0]==='--all')return getParameterMap();
 if(args.length>2||args.some(s=>s.startsWith('--')))throw Error('Usage: --parameter-map [FAMILY [PID|NAME] | --all]');
 const param=args[1]!==undefined&&/^\d+$/.test(args[1])?Number(args[1]):args[1];
 return getParameterMap(args[0],param);
}
