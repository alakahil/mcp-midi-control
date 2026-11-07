// Exact firmware-created binding from one FW13 export; optional numeric Min/Max (words 1/2, target codec) and
// optional curve / timing fields (words 3-7, 13-15, native-descriptor codec: fm3-modifier-curve.mjs). No global
// controller setup or device I/O. Record 0 (the captured place) when the Wah binding is
// inactive; record 1 when External 1 -> Wah is active in record 0 (the FM3 places further bindings in the
// next records: references/fm3-control-switch-evidence-20261028.json). The 25 words are the same in both.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
import {stripControlSwitchRecords,BASE_RECORD1} from './fm3-control-switches.mjs';
import {findParam,encodeValue,decodeValue,loadDictionary} from './fm3-table-encoder.mjs';
import {modifierCurveFields,encodeCurveValue,decodeCurveWord,modifierCurveCapability} from './fm3-modifier-curve.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error('Volume pedal: '+message);};
const bytes=fs.readFileSync(new URL('../references/fm3-volume-binding-evidence.json',import.meta.url));
export const volumeBindingEvidenceHash='0eb1abb5c47585c08ec5d1aee65a2829a8fda245f3d9f5403bc7f2b20fe9759b';
check(sha(bytes)===volumeBindingEvidenceHash,'evidence drift');
const evidence=JSON.parse(bytes),FIELDS0=1584,REGION=[1538,4610];
// Baseline modifier region with record 0's 25 field words zeroed (derived from evidence.baseline; the test
// recomputes it). Pins records 1..31 when record 0 carries the composer's Wah binding.
const baselineOutsideRecord0Sha256='a647a63867a4d50ffa2c18eafcb6b5cb169cd89d258bba6d131fe468f7c05cc1';
const offsetOf=r=>FIELDS0+96*r;
const outsideRecord0=body=>{const g=Buffer.from(body.subarray(...REGION));g.fill(0,46,96);return sha(g);};
const isExternal1Wah=m=>m.record===0&&m.active&&m.source===14&&m.effectId===94&&m.pid===5&&m.channel===0&&!m.uncertain;
const pedalReceipt='references/fm3-pedal-check-20261024.json';
const pedalCheck=JSON.parse(fs.readFileSync(new URL('../'+pedalReceipt,import.meta.url)));
check(pedalCheck.editorCheck.P1.knobFollowsPedalHeelToToe===true&&pedalCheck.editorCheck.P1.sourceExternal1===true&&pedalCheck.editorCheck.P0.volumeStays==='10.00','pedal observation receipt');
const pedalBehaviorEvidence=()=>({receipt:pedalReceipt,date:'2026-10-24',scope:'captured P1/P0 presets on FM3 Mk II Turbo FW13; FM3-Edit observation',
  knobFollowsPedal:true,numericHeelToeMeasured:false,taperMeasured:false,audioVerified:false,currentGeneratedPresetHardwareTested:false});
// Numeric Min/Max (0.3.31): words 1/2 hold the TARGET parameter's stored word. T7/T7b decoded this on three
// continuous targets (Rotary Rate, Amp graphic EQ band, Wah Control; six points) with the target codec;
// VOLUME_GAIN uses its own verified 0..10 codec (0 / 2.5 / 7.5 -> 0 / 16384 / 49151, 2026-10-24 step diff).
const displayReceipt='references/fm3-modifier-display-20261028.json';
export const modifierDisplayHash='a05a22e35e5c7a157a15fd093d92a5653fcaaf85736f4da2b5a57068ee279e9a';
check(sha(fs.readFileSync(new URL('../'+displayReceipt,import.meta.url)))===modifierDisplayHash,'modifier display receipt drift');
const GAIN=findParam('volpan','VOLUME_GAIN');
// volumePedal.source (0.3.55): word 0 = FM3-Edit MOD_CTRLID list index. T33 (2026-11-06, STORE 425 byte-identical)
// confirmed LFO 1A = 1 driving this exact record (only word 0 changed from External 1 = 14) and showed the record
// template is source independent. Offered: External 1 and the Controllers-block sources (LFO, ADSR, Sequencer,
// Envelope/Pitch Follower, Scene Controller, Manual). T34 (2026-11-07, references/fm3-t34-controllers-sources-20261107.json, edit buffer)
// confirmed ADSR 1 = 5, Sequencer = 7 and Scene Controller 1 = 30 audibly with FM3-Edit showing the source; the other codes
// come from the editor list, not tested.
const t34Receipt='references/fm3-t34-controllers-sources-20261107.json';
const t33Receipt='references/fm3-t33-controllers-scene-20261106.json';
const CTRLID=loadDictionary().params.find(p=>p.family==='MOD'&&p.name==='MOD_CTRLID');
check(CTRLID?.enum?.length===61&&CTRLID.enum[1]==='LFO 1A'&&CTRLID.enum[14]==='External 1'&&CTRLID.enum[50]==='Control Switch 1','MOD_CTRLID source list');
export const VOLUME_SOURCES=Object.freeze(Object.fromEntries([14,...Array.from({length:9},(_,i)=>i+1),30,31,32,33,56,57,58,59,60].map(c=>[CTRLID.enum[c].trim(),c])));
const DEVICE_CONFIRMED_SOURCES=Object.freeze({'External 1':'T2/T10 (2026-10-26/28)','LFO 1A':'T33 (2026-11-06)','ADSR 1':'T34D (2026-11-07)','Sequencer':'T34C (2026-11-07)','Scene Controller 1':'T34B (2026-11-07)'});
const STORED_SOURCES=new Set(['External 1','LFO 1A']);
const sourceOf=name=>{check(typeof name==='string'&&Object.hasOwn(VOLUME_SOURCES,name),'volumePedal.source must be one of '+Object.keys(VOLUME_SOURCES).join(', '));return {name,code:VOLUME_SOURCES[name]};};
export const volumeSourceName=request=>request&&typeof request==='object'&&Object.hasOwn(request,'source')?sourceOf(request.source).name:'External 1';
// Off Value only acts with Auto-Engage, which this binding keeps OFF; it is not offered here.
const CURVE=modifierCurveFields.filter(f=>f.key!=='offValuePercent'),CURVE_WORDS=CURVE.map(f=>f.word);
// The record each binding replaces (record 0: inactive Wah default; record 1: BASE_RECORD1) holds the same curve words.
check(CURVE_WORDS.every(i=>BASE_RECORD1[i]===(i===15?0:evidence.binding.words[i])),'curve base words');
export function volumeRange(request){
 if(request===true)return {min:0,max:10,source:sourceOf('External 1'),custom:false};
 check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>['min','max','curve','source'].includes(k)),'volumePedal must be true or {min, max, curve, source}');
 const r={min:request.min??0,max:request.max??10,source:sourceOf(request.source??'External 1')};
 for(const k of ['min','max'])check(typeof r[k]==='number'&&Number.isFinite(r[k])&&r[k]>=0&&r[k]<=10,`volumePedal.${k} must be a number 0..10`);
 check(r.min!==r.max,'volumePedal min and max must differ');
 const c=request.curve,curve={};
 if(Object.hasOwn(request,'curve')){
  check(c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length>0&&Object.keys(c).every(k=>CURVE.some(f=>f.key===k)),'volumePedal.curve must name '+CURVE.map(f=>f.key).join(', '));
  for(const f of CURVE)if(Object.hasOwn(c,f.key)){try{curve[f.key]=encodeCurveValue(f.key,c[f.key]);}catch(e){check(false,'curve.'+e.message.replace(/^Modifier curve: /,''));}}
 }
 const curveChanged=CURVE.some(f=>Object.hasOwn(curve,f.key)&&curve[f.key]!==evidence.binding.words[f.word]);
 return {...r,curve,custom:!(r.min===0&&r.max===10)||curveChanged||r.source.code!==evidence.binding.words[0]};
}
const words=(range=volumeRange(true))=>{const w=Array.from(evidence.binding.words);w[0]=range.source.code;w[1]=encodeValue(GAIN,range.min);w[2]=encodeValue(GAIN,range.max);
 for(const f of CURVE)if(Object.hasOwn(range.curve??{},f.key))w[f.word]=range.curve[f.key];return w;};
const curveState=w=>Object.fromEntries(CURVE.map(f=>[f.key,{word:w[f.word],display:decodeCurveWord(f.key,w[f.word]),unit:f.unit}]));
check(words().every((x,i)=>x===evidence.binding.words[i]),'default range must reproduce the captured words');
function target(body){
 const found=scanRecords(body).records.filter(r=>r.eid===102);
 check(found.length===1,'exactly one Volume/Pan 1 record is required');
 const r=found[0];check(r.words===15&&r.channels===4,'unsupported Volume record');
 for(let ch=0;ch<4;ch++)check(body.readUInt16LE(r.start+ch*30+18)===0,'VOLUME type required on A–D');
 check(readGrid(body).filter(g=>g.id===102).length===1,'Volume/Pan 1 must occur once on the grid');
}
export function volumePedalCapabilities(){return {
 field:'volumePedal',values:[true,'{min 0..10, max 0..10, curve, source}'],requires:'volumePan:true; exact captured inactive modifier region (records 1..31 when Wah is bound in record 0)',
 source:'External 1',sourceCode:14,
 sources:{field:'volumePedal.source',default:'External 1',codes:VOLUME_SOURCES,encoding:'modifier word 0 = FM3-Edit MOD_CTRLID list index; the rest of the record is the same captured template',
  deviceConfirmed:DEVICE_CONFIRMED_SOURCES,receipt:t33Receipt,receipts:[t33Receipt,t34Receipt],others:'code from the FM3-Edit list, not tested on the device',controllerSettings:'set the source itself (e.g. LFO rate) with controllers / controllersScenes'},
 target:{effectId:102,pid:0,name:'VOLUME_GAIN',displayLabel:'Volume',channelScope:'ALL'},
 record:'0, or 1 when External 1 -> Wah is active in record 0',words:words(),policy:'captured-volume-default-fw13',evidenceSha256:volumeBindingEvidenceHash,
 captureSha256:evidence.capture.sha256,fullRangeEncodingProven:false,numericMinMaxAuthoring:true,
 curve:{field:'volumePedal.curve',...modifierCurveCapability(),keys:Object.fromEntries(CURVE.map(f=>[f.key,{word:f.word,label:f.label,unit:f.unit,min:f.min,max:f.max,decimals:f.decimals}])),defaults:Object.fromEntries(CURVE.map(f=>[f.key,decodeCurveWord(f.key,evidence.binding.words[f.word])]))},
 minMaxEncoding:{words:[1,2],codec:'target VOLUME_GAIN stored word (0..10)',evidence:displayReceipt,sha256:modifierDisplayHash,hardware:'confirmed 2026-10-28 (T10: Min 2.50 / Max 7.50 on the Modify page, knob 2.50 heel -> 7.50 toe; references/fm3-volume-range-20261028.json); other ranges follow the same codec'},
 globalControllerSetup:false,deviceIO:false,storeReloadProven:false,pedalBehaviorEvidence:pedalBehaviorEvidence(),
 limits:evidence.limits.filter(x=>!x.startsWith('No numeric Volume Min/Max codec')).map(x=>x.startsWith('No arbitrary source')?'No arbitrary source, channel, target or record allocation; with External 1 -> Wah the binding goes to record 1':
  x.startsWith('Captured defaults do not prove')?'Min/Max (T10) and the curve / timing fields (T12, one field per step) are device-confirmed point by point; other values follow the codecs; DSP and live SET encoding not tested':x)};}
export function readVolumePedal(body,range=volumeRange(true),expectedModifierRegion){
 target(body);
 const modifiers=readModifiers(body),found=modifiers.filter(m=>m.active&&m.effectId===102&&m.pid===0);
 check(found.length===1,'exactly one active Volume binding is required');
 const m=found[0],record=m.record,start=offsetOf(record),w=Array.from({length:25},(_,i)=>body.readUInt16LE(start+i*2));
 check((record===0||record===1&&isExternal1Wah(modifiers[0]))&&m.source===range.source.code&&m.channel===0&&!m.uncertain,'binding readback failed');
 const exp=words(range);check(w.every((x,i)=>x===exp[i]),'Volume binding words differ from the captured binding and the requested Min/Max');
 // Remaining records: Control Switch records written by this engine are reset to their base form; the rest
 // must equal the capture (record 0) or the baseline (record 1, with record 0 holding the Wah binding).
 if(expectedModifierRegion){check(Buffer.isBuffer(expectedModifierRegion)&&expectedModifierRegion.length===3072&&body.subarray(...REGION).equals(expectedModifierRegion),'final modifier region differs from the authored edits');}
 else {
 const rest=stripControlSwitchRecords(body);
 [0,1,2,...CURVE_WORDS].forEach(i=>rest.writeUInt16LE(evidence.binding.words[i],start+2*i));  // source, Min/Max and curve checked above
 if(record===0)check(sha(rest.subarray(...REGION))===evidence.capture.modifiersSha256,'final modifier region differs from captured binding');
 else{BASE_RECORD1.forEach((x,i)=>rest.writeUInt16LE(x,offsetOf(1)+2*i));check(outsideRecord0(rest)===baselineOutsideRecord0Sha256,'final modifier region differs from the baseline outside the Wah and Volume records');}
 }
 return {policy:'captured-volume-default-fw13',record,offset:start,source:m.source,sourceName:range.source.name,
  effectId:m.effectId,pid:m.pid,targetName:'VOLUME_GAIN',displayLabel:'Volume',channelScope:m.channelScope,words:w,
  withWahBinding:record===1,min:{display:Math.round(decodeValue(GAIN,w[1])*100)/100,word:w[1]},max:{display:Math.round(decodeValue(GAIN,w[2])*100)/100,word:w[2]},
  curve:curveState(w),curveCustom:CURVE.some(f=>w[f.word]!==evidence.binding.words[f.word]),
  evidenceSha256:volumeBindingEvidenceHash,captureSha256:evidence.capture.sha256,
  capturedDefaults:!range.custom,fullRangeEncodingProven:false,physicalScaleMeasurements:0,storeReloadProven:false,
  entireBodyMatchesCapture:sha(body)===evidence.capture.bodySha256,
  submittedFileReimported:false,pedalBehavior:'confirmed on captured P1/P0 presets; see evidence scope',pedalBehaviorEvidence:pedalBehaviorEvidence(),globalControllerSetup:false};
}
export function bindVolumePedal(syx,request=true){
 const range=volumeRange(request);
 const before=inspectStructure(syx),original=Buffer.from(before.raw.body);
 target(original);const mods=readModifiers(original),wah=isExternal1Wah(mods[0]);
 if(wah)check(outsideRecord0(original)===baselineOutsideRecord0Sha256&&mods.filter(m=>m.active).length===1,
  'with the Wah binding, records 1..31 must be the captured inactive baseline; other bindings or changed defaults are unsupported');
 else check(sha(original.subarray(...REGION))===evidence.baseline.modifiersSha256,
  'requires captured inactive modifier region; active Wah, other bindings or changed defaults are unsupported');
 const record=wah?1:0,start=offsetOf(record),end=start+50,body=Buffer.from(original);
 const was=Array.from({length:25},(_,i)=>original.readUInt16LE(start+i*2));
 words(range).forEach((word,i)=>body.writeUInt16LE(word,start+i*2));
 check(body.subarray(0,start).equals(original.subarray(0,start))&&body.subarray(end).equals(original.subarray(end)),
  'bytes outside the declared record changed');
 const output=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body)));
 const after=inspectStructure(output),actual=Buffer.from(after.raw.body);
 check(actual.equals(body),'encoded body readback differs');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'dump header changed');
 return {syx:output,record,state:readVolumePedal(actual,range),report:{policy:'captured-volume-default-fw13',record,customRange:range.custom,
  changedWordIndices:was.map((x,i)=>x===words(range)[i]?null:i).filter(i=>i!==null),
  beforeModifiersSha256:sha(original.subarray(...REGION)),
  afterModifiersSha256:sha(actual.subarray(...REGION)),onlyDeclaredRecordChanged:true,
  bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}};
}
export function renderVolumePedalText(state){
 if(!state)return [];
 const ext=state.sourceName==='External 1',confirmed=DEVICE_CONFIRMED_SOURCES[state.sourceName];
 return ['',`${state.sourceName.toUpperCase()} → VOLUME/PAN 1 — LÕPPFAILIST`,
  `Seos: ${state.sourceName} → Volume/Pan 1 Volume (VOLUME_GAIN, PID 0); kanalid ALL (A–D); modifikaatori kirje ${state.record}.`,
  ...(ext?[]:[`Allikas ${state.sourceName} (kood ${state.source}) on Controllers ploki kontroller; selle seaded (nt LFO kiirus) tulevad väljadest controllers / controllersScenes. ${confirmed?`Allika kood on seadmel kinnitatud: ${confirmed}${STORED_SOURCES.has(state.sourceName)?`, ${state.sourceName} → Volume säilis STORE/reload-is baiditäpselt`:`, kuuldav ja FM3-Editis näha redaktsioonipuhvris (STORE/reload-i selle allikaga ei tehtud)`}.`:'Allika kood on FM3-Editi MOD_CTRLID loendist (T33/T34 kinnitasid sama loendi koodid LFO 1A = 1, ADSR 1 = 5, Sequencer = 7, External 1 = 14, Scene Controller 1 = 30, Control Switch n = 49+n); seda allikat seadmel ei kontrollitud.'} Muu kirje on sama seadme salvestatud mall.`]),
  ...(state.withWahBinding?[ext?'Kirjes 0 on External 1 → Wah seos; mõlemad järgivad sama pedaali (External 1). 28.10.2026 katses T9 jäid mõlemad seosed pärast STORE-i ja uuesti laadimist alles ning pedaal liigutas mõlemat; selle uue faili import on kontrollimata.':`Kirjes 0 on External 1 → Wah seos (pedaal); Volume järgib allikat ${state.sourceName}, mitte pedaali.`]:[]),
  state.capturedDefaults?'Min/Max, kõver ja muud modifikaatori väljad: 23.10.2026 FW13 ekspordist kopeeritud vaikeolek (Min 0.00, Max 10.00).':`Min ${state.min.display.toFixed(2)} / Max ${state.max.display.toFixed(2)} (Volume skaalas; sõnad ${state.min.word} / ${state.max.word}). ${state.curveCustom?'Kõver ja ajad on allpool; ülejäänud väljad on 23.10.2026 ekspordi vaikeolek.':'Kõver ja muud väljad on 23.10.2026 ekspordi vaikeolek.'} Min/Max kodeering on seadme näiduga kinnitatud (T7/T7b teistel sihtmärkidel; 28.10.2026 T10 Volume'il: Min 2.50 / Max 7.50, nupp kannas 2.50 ja varbas 7.50). Selle faili vahemikku eraldi ei mõõdetud.`,
  ...(state.curveCustom?[`Kõver ja ajad: ${Object.entries(state.curve).map(([k,c])=>`${CURVE.find(f=>f.key===k).label} ${c.display}${c.unit==='%'?'%':c.unit==='ms'?' ms':''}`).join(', ')} (sõnad ${CURVE.map(f=>state.curve[f.key].word).join('/')}). Kodeering: FM3 modifikaatori natiivne vahemik; iga väli on 29.10.2026 katses T12 seadmel ükshaaval läbi astutud, väärtused mõõdetud punktide vahel on valemi järgi.`]:[]),
  `Modifikaatori 25 toorsõna: ${state.words.join(', ')}.`,
  state.entireBodyMatchesCapture?'Kogu preseti keha kattub kasutaja Volume-seose ekspordiga; selle sisu korduseksporti pole vaja. Uut kodeeritud faili eraldi seadmesse ei imporditud.':'See on uus kombinatsioon: seose vaikeolek on seadmeekspordist, lõppfaili kombinatsioon kontrollitud tarkvaraliselt.',
  ...(ext?['External 1 globaalne pedaali/MIDI määrang ja pedaali asend ei sisaldu presetis. Seos ei muuda stseenide kanalit ega bypass’i.',
  '24.10.2026 P1/P0 katses kinnitati FM3-Editis pedaali järgimine. 26.10.2026 (T2): kand 0.00, varvas 10.00, seos säilis STORE/reload-is. 28.10.2026 (T10): vahemik 2.50/7.50 kuvati ja pedaal järgis seda. Taper ja heli on mõõtmata; selle uue faili riistvarakatset sellest ei järeldu.']:['Seos ei muuda stseenide kanalit ega bypass’i. Kuuldav seadmel: T33 06.11.2026 LFO 1A (pulseeris); T34 07.11.2026 Scene Controller 1 (tase stseeniti), Sequencer (tükeldus), ADSR 1 (noodi paisumine). Selle uue faili import ja heli on kontrollimata.'])];
}
export function verifyVolumePedalOutput(report,syx,txt,spec,expectedModifierRegion){
 const requested=Object.hasOwn(spec??{},'volumePedal');
 const range=requested?volumeRange(spec.volumePedal):null;
 if(!requested){
  check(!report.volumePedal&&!report.stages?.volumePedal,'unexpected Volume pedal report');
  if(spec?.composer)check(!readModifiers(Buffer.from(inspectStructure(syx).raw.body)).some(m=>m.active&&m.effectId===102&&m.pid===0),'unrequested Volume pedal binding');
  return;
 }
 check(spec.volumePan===true,'volumePan:true is required');
 const state=readVolumePedal(Buffer.from(inspectStructure(syx).raw.body),range,expectedModifierRegion);
 const wahOn=spec.composer?.modifiers?.external1Wah===true;
 check(state.withWahBinding===wahOn,'Volume binding record does not match the Wah request');
 assert.deepEqual(report.volumePedal,state,'Volume pedal final state differs');
 const stage=report.stages?.volumePedal;
 check(stage?.policy===state.policy&&stage.record===state.record&&stage.onlyDeclaredRecordChanged===true&&stage.bodyReadback===true&&stage.dumpHeaderPreserved===true&&stage.deviceIO===false,'stage report differs');
 if(!wahOn){
  check(!spec.composer?.modifiers||Object.keys(spec.composer.modifiers).every(k=>k==='external1Wah'),'Wah modifier settings need external1Wah:true next to the Volume binding');
  check(report.modifierEdit===null,'intermediate Wah edit must not be reported as final');
  check(stage.beforeModifiersSha256===evidence.baseline.modifiersSha256&&(range.custom||stage.afterModifiersSha256===evidence.capture.modifiersSha256),'stage report differs');
  assert.deepEqual(stage.changedWordIndices,[...new Set([...evidence.changedWords.filter(i=>!CURVE_WORDS.includes(i)),...[1,2,...CURVE_WORDS].filter(i=>words(range)[i]!==BASE_RECORD1[i])])].sort((a,b)=>a-b),'Volume pedal declared changes differ');
 }else{
  check(report.modifierEdit?.after===14,'Wah binding must be reported next to the Volume binding');
  assert.deepEqual(stage.changedWordIndices,[...new Set([0,8,...[1,2,...CURVE_WORDS].filter(i=>words(range)[i]!==BASE_RECORD1[i])])].sort((a,b)=>a-b),'Volume pedal declared changes differ');
 }
 const m=report.modifiers?.find(r=>r.record===state.record);
 check(m?.source===range.source.code&&m.effectId===102&&m.pid===0&&m.channel===0&&m.active===true&&!m.uncertain,'reported modifier differs');
 const actual=readModifiers(Buffer.from(inspectStructure(syx).raw.body));
 check(report.modifiers?.length===actual.length,'reported modifier inventory differs');
 for(const [i,row] of actual.entries())for(const [key,value] of Object.entries(row))assert.equal(report.modifiers[i][key],value,'Volume pedal modifier report differs');
 for(const line of renderVolumePedalText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final binding');
 if(!wahOn)check(!txt.includes('EXTERNAL 1 → WAH — LÕPPFAILIST'),'TXT reports an intermediate Wah edit');
}
