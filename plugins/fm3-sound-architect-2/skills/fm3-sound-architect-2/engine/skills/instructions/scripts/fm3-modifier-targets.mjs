// Generic modifier targets (0.3.60). Offline; no device I/O.
// Rule: a block parameter is a modifier target when its FM3-Edit FW13 cache flags have bit 0x0080 clear
// (476 parameters; MOD/CONTROLLERS/GLOBAL and unused parameters excluded). The 8 of them without an FM3-Edit label
// (hidden: Delay/Plex/Reverb base types, Mixer/Multiplexer bypass, Send levels) are not offered: 468 targets. Evidence:
//  - T42 (2026-11-09, references/fm3-t42-modifier-targets-20261109.json): Scene Controller 1 -> Delay Mix,
//    LFO 1A -> Filter Freq and External 1 -> Amp Gain (bit clear) were shown with the written Min/Max, heard and
//    byte-identical after STORE/reload; Delay Low Cut (bit set) was refused: the FM3 cleared Source and target.
//  - The 17 earlier device/corpus targets (Volume, Wah Control, Amp switches, Rotary Rate, Amp EQ) all have the bit clear.
// The record is the Control Switch / T42 template: word 0 Source (MOD_CTRLID), words 1/2 Min/Max in the target's
// stored-word codec (S1 + T7/T7b/T10/T42), 8 target effect id, 9 target PID, 17 channel (0 ALL, 1..4 A..D).
// Records: the next unused (or inactive default) records after the Volume and Control Switch bindings.
// 0.3.69: optional curve / timing per binding (words 3-7, 13-15; the codec of fm3-modifier-curve.mjs, stepped on the
// device field by field in T12 on the Volume record). On other targets these words are formula-derived until T50.
// Not covered: secondary sources, second block instances, Auto-Engage/Off Value, Min/Max on
// non-continuous targets (those keep the full 0..65534 range).
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue,loadDictionary,FAMILY_BY_SLUG} from './fm3-table-encoder.mjs';
import {modifierTemplate,nextWritableModifierRecord,MODIFIER_RECORDS,isModifierTargetRecord} from './fm3-control-switches.mjs';
import {VOLUME_SOURCES} from './fm3-volume-pedal.mjs';
import {modifierCurveFields,encodeCurveValue,decodeCurveWord} from './fm3-modifier-curve.mjs';
const check=(ok,m)=>{if(!ok)throw Error('Modifier targets: '+m);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const FIELDS0=1584,RECORD=96,MAX=8,CHANNELS=['ALL','A','B','C','D'],CONTINUOUS=new Set(['linear','log','knob']);
export const MODIFIER_TARGET_BIT=0x0080;
const EXCLUDED_FAMILIES=new Set(['MOD','CONTROLLERS','GLOBAL']);
export const isModifierTarget=p=>!!p&&p.flags!==undefined&&!!p.family&&!EXCLUDED_FAMILIES.has(p.family)&&p.kind!=='unused'&&!!p.label&&(+p.flags&MODIFIER_TARGET_BIT)===0;
const dictionary=loadDictionary();
export const MODIFIER_TARGET_COUNT=dictionary.params.filter(isModifierTarget).length;
check(MODIFIER_TARGET_COUNT===468,'dictionary flag rule no longer yields 468 labelled targets');
const receiptPath='references/fm3-t42-modifier-targets-20261109.json';
const receiptBytes=fs.readFileSync(new URL('../'+receiptPath,import.meta.url));
const receipt=JSON.parse(receiptBytes);
check(receipt.parts.filter(p=>p.hypothesis==='H1'&&p.deviceResult.startsWith('accepted')).length===3&&receipt.parts.some(p=>p.hypothesis==='H2'&&p.deviceResult.startsWith('refused')),'T42 receipt');
export const t42ReceiptHash=sha(receiptBytes);
// Targets the FM3 has shown/kept as modifier targets (T42 here; Volume, Wah and Amp switches have their own fields).
export const DEVICE_CONFIRMED_TARGETS=Object.freeze(Object.fromEntries(receipt.parts.filter(p=>p.hypothesis==='H1').map(p=>[p.target,`T42 ${p.case.slice(3,4)} (2026-11-09, ${p.source})`])));
const words=(body,r)=>Array.from({length:25},(_,i)=>body.readUInt16LE(FIELDS0+RECORD*r+2*i));
const slugOf=family=>Object.keys(FAMILY_BY_SLUG).find(k=>FAMILY_BY_SLUG[k]===family);
const CURVE=modifierCurveFields.filter(f=>f.key!=='offValuePercent');
const near=(p,word,v)=>Math.abs(decodeValue(p,word)-v)<=Math.max(0.006*Math.abs(v),0.06);

export function validateModifierTargets(list){
 check(Array.isArray(list)&&list.length>=1&&list.length<=MAX,`modifierTargets must be a list of 1..${MAX} bindings`);
 const seen=new Set();
 return list.map((e,i)=>{
  const at=`modifierTargets[${i}]`;
  check(e&&typeof e==='object'&&!Array.isArray(e),at+' must be an object');
  for(const k of Object.keys(e))check(['source','block','param','min','max','channel','curve'].includes(k),`${at}: unknown field ${k}`);
  check(typeof e.source==='string'&&Object.hasOwn(VOLUME_SOURCES,e.source),`${at}.source must be one of ${Object.keys(VOLUME_SOURCES).join(', ')}`);
  check(typeof e.block==='string'&&Object.hasOwn(FAMILY_BY_SLUG,e.block),`${at}.block must be a block slug (${Object.keys(FAMILY_BY_SLUG).join(', ')})`);
  check(typeof e.param==='string'&&e.param.length>0,`${at}.param must be a parameter name`);
  let p;try{p=findParam(e.block,e.param);}catch{p=null;}
  check(p&&p.family===FAMILY_BY_SLUG[e.block],`${at}: ${e.block}.${e.param} is not in the dictionary`);
  check(!(p.block===102&&p.param===0),`${at}: Volume/Pan Volume is bound with volumePedal`);
  check(!(p.block===94&&p.param===5),`${at}: Wah Control is bound with composer.modifiers.external1Wah`);
  check(isModifierTarget(p),`${at}: ${p.name} is not a modifier target on the FM3 (FM3-Edit flag 0x0080; T42: the FM3 clears such a binding on import)`);
  check(e.channel===undefined||CHANNELS.includes(e.channel),`${at}.channel must be ${CHANNELS.join(', ')}`);
  const ranged=e.min!==undefined||e.max!==undefined;
  check(!ranged||CONTINUOUS.has(p.kind),`${at}: Min/Max are only written for continuous targets; ${p.name} (${p.kind}) keeps the full range`);
  for(const k of ['min','max'])check(e[k]===undefined||typeof e[k]==='number'&&Number.isFinite(e[k]),`${at}.${k} must be a number`);
  const min=e.min===undefined?0:encodeValue(p,e.min),max=e.max===undefined?65534:encodeValue(p,e.max);
  for(const [k,w] of [['min',min],['max',max]])if(e[k]!==undefined)check(near(p,w,e[k]),`${at}.${k} ${e[k]} is not representable`);
  check(min!==max,`${at}: Min and Max must differ`);
  const curve={};
  if(Object.hasOwn(e,'curve')){const c=e.curve;
   check(c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length>0&&Object.keys(c).every(k=>CURVE.some(f=>f.key===k)),`${at}.curve must name ${CURVE.map(f=>f.key).join(', ')}`);
   for(const f of CURVE)if(Object.hasOwn(c,f.key)){try{curve[f.key]=encodeCurveValue(f.key,c[f.key]);}catch(err){check(false,`${at}.curve.`+err.message.replace(/^Modifier curve: /,''));}}
  }
  const key=p.block+':'+p.param;check(!seen.has(key),`${at}: ${e.block}.${p.name} bound twice`);seen.add(key);
  return {source:e.source,sourceCode:VOLUME_SOURCES[e.source],block:e.block,param:p.name,label:p.label??p.name,effectId:p.block,pid:p.param,kind:p.kind,
   channel:e.channel??'ALL',min,max,minDisplay:e.min,maxDisplay:e.max,...(Object.hasOwn(e,'curve')?{curve}:{})};
 });
}
const templateOf=w=>{const t=modifierTemplate(w.sourceCode,w.effectId,w.pid,{min:w.min,max:w.max,channel:w.channel});
 for(const f of CURVE)if(Object.hasOwn(w.curve??{},f.key))t[f.word]=w.curve[f.key];return t;};
const DEFAULT_CURVE=modifierTemplate(1,1,0);
const curveState=ws=>Object.fromEntries(CURVE.map(f=>[f.key,{word:ws[f.word],display:decodeCurveWord(f.key,ws[f.word]),unit:f.unit}]));
export function bindModifierTargets(syx,list){
 const wanted=validateModifierTargets(list);
 const before=inspectStructure(syx),original=Buffer.from(before.raw.body),body=Buffer.from(original);
 check(before.raw.crcValid,'input CRC');
 const {records}=scanRecords(body),grid=readGrid(body);
 for(const w of wanted){
  check(records.filter(r=>r.eid===w.effectId).length===1,`${w.block} must be in the preset exactly once (first instance)`);
  check(grid.filter(g=>g.id===w.effectId).length===1,`${w.block} must occur once on the grid`);
 }
 const mods=readModifiers(body);
 for(const w of wanted)check(!mods.some(m=>m.active&&m.effectId===w.effectId&&m.pid===w.pid),`${w.block}.${w.param} already has an active modifier`);
 const writes=[];let r=1;
 for(const w of wanted){
  r=nextWritableModifierRecord(body,r);check(r<MODIFIER_RECORDS,'no unused modifier record left');
  const was=words(body,r),next=templateOf(w).slice(0,21);
  next.forEach((v,i)=>body.writeUInt16LE(v,FIELDS0+RECORD*r+2*i));
  writes.push({record:r,before:was.slice(0,21),after:next});r++;
 }
 const allowed=new Set(writes.flatMap(x=>Array.from({length:42},(_,k)=>FIELDS0+RECORD*x.record+k)));
 for(let o=0;o<body.length;o++)if(body[o]!==original[o])check(allowed.has(o),'byte outside the declared record words changed at '+o);
 const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body))),after=inspectStructure(out);
 check(after.raw.crcValid&&Buffer.from(after.raw.body).equals(body),'encoded body readback differs');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'dump header changed');
 return {syx:out,report:{policy:'modifier-target-flag-rule-fw13',records:writes.map(x=>x.record),writes,
  onlyDeclaredWordsChanged:true,bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}};
}
export function readModifierTargets(body,list){
 const wanted=validateModifierTargets(list),mods=readModifiers(body);
 return wanted.map(w=>{
  const m=mods.filter(x=>x.active&&x.effectId===w.effectId&&x.pid===w.pid);
  check(m.length===1,`${w.block}.${w.param}: expected exactly one active modifier, found ${m.length}`);
  const ws=words(body,m[0].record),t=templateOf(w);
  check(isModifierTargetRecord(ws)&&ws.every((x,i)=>x===t[i]),`${w.block}.${w.param}: record ${m[0].record} is not the requested template`);
  const p=findParam(w.block,w.param),show=(x,asked)=>!CONTINUOUS.has(w.kind)?null:asked!==undefined?asked:Math.round(decodeValue(p,x)*100)/100;  // validated: asked decodes back within tolerance
  return {record:m[0].record,source:w.source,sourceCode:w.sourceCode,block:w.block,param:w.param,label:w.label,effectId:w.effectId,pid:w.pid,
   channelScope:m[0].channelScope,min:{display:show(w.min,w.minDisplay),word:w.min},max:{display:show(w.max,w.maxDisplay),word:w.max},fullRange:w.min===0&&w.max===65534,
   evidence:DEVICE_CONFIRMED_TARGETS[w.param]??'flag rule (T42 2026-11-09); this target not device-tested',
   ...(w.curve?{curve:curveState(ws),curveCustom:CURVE.some(f=>ws[f.word]!==DEFAULT_CURVE[f.word]),curveEvidence:'codec stepped on the device on the Volume record (T12 2026-10-29); on this target formula-derived, device-unverified'}:{})};
 });
}
const fmt=v=>String(Number(v.toPrecision(4)));
export function renderModifierTargetsText(state){
 if(!state?.length)return [];
 return ['','MODIFIKAATORI SIHID — LÕPPFAILIST',
  ...state.map(s=>`${s.source} → ${s.block} ${s.label} (${s.param}); kanalid ${s.channelScope}; kirje ${s.record}; ${s.fullRange?'täisvahemik (Min 0 / Max 65534 sõnana)':`Min ${fmt(s.min.display)} / Max ${fmt(s.max.display)} (sõnad ${s.min.word} / ${s.max.word})`}; ${DEVICE_CONFIRMED_TARGETS[s.param]?'siht seadmel kinnitatud: '+DEVICE_CONFIRMED_TARGETS[s.param]:'siht lubatud FM3-Editi lipu 0x0080 reegli järgi, seadmel seda sihti eraldi ei kontrollitud'}.`),
  ...state.filter(s=>s.curve).map(s=>`Kõver ja ajad (${s.block} ${s.label}): ${CURVE.map(f=>`${f.label} ${s.curve[f.key].display}${f.unit==='%'?'%':f.unit==='ms'?' ms':''}`).join(', ')} (sõnad ${CURVE.map(f=>s.curve[f.key].word).join(' / ')}). Kodeering on seadmel sammhaaval kinnitatud Volume'i kirjel (T12, 29.10.2026); sellel sihil on kõver valemi järgi, seadmel kontrollimata.`),
  `Seose mall on sama, mida FM3 ise salvestab (Control Switch / T42); ${state.some(s=>s.curve)?'kõver ja ajad on vaikimisi seal, kus neid ülal ei nimetata':'kõver ja ajad on vaikimisi'}. Allika seaded (LFO kiirus, Scene Controlleri väärtused jms) tulevad väljadest controllers / controllersScenes.`,
  'T42 (09.11.2026): kolm uut sihti kuvati, kõlasid ja säilisid STORE/reload-is baiditäpselt; lipuga 0x0080 siht (Delay Low Cut) jäi FM3-s tühjaks. Selle uue faili import ja heli on kontrollimata.'];
}
export function modifierTargetsCapabilities(){return {field:'modifierTargets',entry:'{source: External 1 | LFO 1A..2B | ADSR 1..2 | Sequencer | Envelope/Pitch Follower | Scene Controller 1..4 | Manual 1..5, block: block slug, param: dictionary name, min?/max?: display values (continuous targets only), channel?: ALL|A|B|C|D, curve?: {'+CURVE.map(f=>f.key).join(', ')+'}}',
 maxBindings:MAX,targets:MODIFIER_TARGET_COUNT,rule:'FM3-Edit FW13 cache flags bit 0x0080 clear (476); MOD/CONTROLLERS/GLOBAL, unused and the 8 unlabelled (editor-hidden) parameters excluded',
 deviceConfirmed:DEVICE_CONFIRMED_TARGETS,refusedOnDevice:'Delay Low Cut (bit set): FM3 cleared Source and target on import (T42 D)',
 records:'next unused records after volumePedal and controlSwitches',template:'Control Switch / T42 template; words 1/2 = target stored-word codec',
 evidence:{receipt:receiptPath,sha256:t42ReceiptHash},
 notSupported:['Volume/Pan Volume (volumePedal)','Wah Control (composer.modifiers.external1Wah)','second block instances','Auto-Engage, Off Value, PC Reset, Update Rate and Damping (template values)','Min/Max on non-continuous targets','secondary sources'],
 curve:{keys:Object.fromEntries(CURVE.map(f=>[f.key,{word:f.word,label:f.label,unit:f.unit,min:f.min,max:f.max,decimals:f.decimals,default:decodeCurveWord(f.key,DEFAULT_CURVE[f.word])}])),evidence:'codec device-stepped on the Volume record (T12); other targets formula-derived until a device check (T50)'},deviceIO:false};}
export const listModifierTargets=()=>dictionary.params.filter(isModifierTarget).map(p=>({block:slugOf(p.family)??null,family:p.family,param:p.name,label:p.label,kind:p.kind,
 minMax:CONTINUOUS.has(p.kind),deviceConfirmed:!!DEVICE_CONFIRMED_TARGETS[p.name]}));
export function verifyModifierTargetsOutput(report,syx,txt,spec){
 const requested=Object.hasOwn(spec??{},'modifierTargets'),body=Buffer.from(inspectStructure(syx).raw.body);
 if(!requested){
  check(!report.modifierTargets&&!report.stages?.modifierTargets,'unexpected modifier target report');
  if(spec?.composer)check(!readModifiers(body).some(m=>m.active&&isModifierTargetRecord(words(body,m.record))),'unrequested modifier target binding');
  return;
 }
 const state=readModifierTargets(body,spec.modifierTargets);
 check(JSON.stringify(report.modifierTargets)===JSON.stringify(state),'modifier target final state differs');
 const stage=report.stages?.modifierTargets;
 check(stage?.policy==='modifier-target-flag-rule-fw13'&&JSON.stringify(stage.records)===JSON.stringify(state.map(s=>s.record))&&stage.onlyDeclaredWordsChanged===true&&stage.bodyReadback===true&&stage.deviceIO===false,'modifier target stage report differs');
 check(readModifiers(body).filter(m=>m.active&&isModifierTargetRecord(words(body,m.record))).length===state.length,'modifier target bindings other than the requested ones are present');
 for(const line of renderModifierTargetsText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final modifier targets');
}
