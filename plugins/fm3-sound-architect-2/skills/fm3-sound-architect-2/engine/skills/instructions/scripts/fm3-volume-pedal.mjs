// Exact firmware-created binding from one FW13 export; optional numeric Min/Max (words 1/2, target codec).
// No curve codec, global controller setup or device I/O. Record 0 (the captured place) when the Wah binding is
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
import {findParam,encodeValue,decodeValue} from './fm3-table-encoder.mjs';
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
export function volumeRange(request){
 if(request===true)return {min:0,max:10,custom:false};
 check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>k==='min'||k==='max'),'volumePedal must be true or {min, max}');
 const r={min:request.min??0,max:request.max??10};
 for(const k of ['min','max'])check(typeof r[k]==='number'&&Number.isFinite(r[k])&&r[k]>=0&&r[k]<=10,`volumePedal.${k} must be a number 0..10`);
 check(r.min!==r.max,'volumePedal min and max must differ');
 return {...r,custom:!(r.min===0&&r.max===10)};
}
const words=(range=volumeRange(true))=>{const w=Array.from(evidence.binding.words);w[1]=encodeValue(GAIN,range.min);w[2]=encodeValue(GAIN,range.max);return w;};
check(words().every((x,i)=>x===evidence.binding.words[i]),'default range must reproduce the captured words');
function target(body){
 const found=scanRecords(body).records.filter(r=>r.eid===102);
 check(found.length===1,'exactly one Volume/Pan 1 record is required');
 const r=found[0];check(r.words===15&&r.channels===4,'unsupported Volume record');
 for(let ch=0;ch<4;ch++)check(body.readUInt16LE(r.start+ch*30+18)===0,'VOLUME type required on A–D');
 check(readGrid(body).filter(g=>g.id===102).length===1,'Volume/Pan 1 must occur once on the grid');
}
export function volumePedalCapabilities(){return {
 field:'volumePedal',values:[true,'{min 0..10, max 0..10}'],requires:'volumePan:true; exact captured inactive modifier region (records 1..31 when Wah is bound in record 0)',
 source:'External 1',sourceCode:14,target:{effectId:102,pid:0,name:'VOLUME_GAIN',displayLabel:'Volume',channelScope:'ALL'},
 record:'0, or 1 when External 1 -> Wah is active in record 0',words:words(),policy:'captured-volume-default-fw13',evidenceSha256:volumeBindingEvidenceHash,
 captureSha256:evidence.capture.sha256,fullRangeEncodingProven:false,numericMinMaxAuthoring:true,
 minMaxEncoding:{words:[1,2],codec:'target VOLUME_GAIN stored word (0..10)',evidence:displayReceipt,sha256:modifierDisplayHash,hardware:'confirmed 2026-10-28 (T10: Min 2.50 / Max 7.50 on the Modify page, knob 2.50 heel -> 7.50 toe; references/fm3-volume-range-20261028.json); other ranges follow the same codec'},
 globalControllerSetup:false,deviceIO:false,storeReloadProven:false,pedalBehaviorEvidence:pedalBehaviorEvidence(),
 limits:evidence.limits.map(x=>x.startsWith('No arbitrary source')?'No arbitrary source, channel, target or record allocation; with External 1 -> Wah the binding goes to record 1':x)};}
export function readVolumePedal(body,range=volumeRange(true)){
 target(body);
 const modifiers=readModifiers(body),found=modifiers.filter(m=>m.active&&m.effectId===102&&m.pid===0);
 check(found.length===1,'exactly one active Volume binding is required');
 const m=found[0],record=m.record,start=offsetOf(record),w=Array.from({length:25},(_,i)=>body.readUInt16LE(start+i*2));
 check((record===0||record===1&&isExternal1Wah(modifiers[0]))&&m.source===14&&m.channel===0&&!m.uncertain,'binding readback failed');
 const exp=words(range);check(w.every((x,i)=>x===exp[i]),'Volume binding words differ from the captured binding and the requested Min/Max');
 // Remaining records: Control Switch records written by this engine are reset to their base form; the rest
 // must equal the capture (record 0) or the baseline (record 1, with record 0 holding the Wah binding).
 const rest=stripControlSwitchRecords(body);
 [1,2].forEach(i=>rest.writeUInt16LE(evidence.binding.words[i],start+2*i));  // Min/Max checked above
 if(record===0)check(sha(rest.subarray(...REGION))===evidence.capture.modifiersSha256,'final modifier region differs from captured binding');
 else{BASE_RECORD1.forEach((x,i)=>rest.writeUInt16LE(x,offsetOf(1)+2*i));check(outsideRecord0(rest)===baselineOutsideRecord0Sha256,'final modifier region differs from the baseline outside the Wah and Volume records');}
 return {policy:'captured-volume-default-fw13',record,offset:start,source:m.source,sourceName:m.sourceName,
  effectId:m.effectId,pid:m.pid,targetName:'VOLUME_GAIN',displayLabel:'Volume',channelScope:m.channelScope,words:w,
  withWahBinding:record===1,min:{display:Math.round(decodeValue(GAIN,w[1])*100)/100,word:w[1]},max:{display:Math.round(decodeValue(GAIN,w[2])*100)/100,word:w[2]},
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
 return ['','EXTERNAL 1 → VOLUME/PAN 1 — LÕPPFAILIST',
  `Seos: External 1 → Volume/Pan 1 Volume (VOLUME_GAIN, PID 0); kanalid ALL (A–D); modifikaatori kirje ${state.record}.`,
  ...(state.withWahBinding?['Kirjes 0 on External 1 → Wah seos; mõlemad järgivad sama pedaali (External 1). 28.10.2026 katses T9 jäid mõlemad seosed pärast STORE-i ja uuesti laadimist alles ning pedaal liigutas mõlemat; selle uue faili import on kontrollimata.']:[]),
  state.capturedDefaults?'Min/Max, kõver ja muud modifikaatori väljad: 23.10.2026 FW13 ekspordist kopeeritud vaikeolek (Min 0.00, Max 10.00).':`Min ${state.min.display.toFixed(2)} / Max ${state.max.display.toFixed(2)} (Volume skaalas; sõnad ${state.min.word} / ${state.max.word}). Kõver ja muud väljad on 23.10.2026 ekspordi vaikeolek. Min/Max kodeering on seadme näiduga kinnitatud (T7/T7b teistel sihtmärkidel; 28.10.2026 T10 Volume'il: Min 2.50 / Max 7.50, nupp kannas 2.50 ja varbas 7.50). Selle faili vahemikku eraldi ei mõõdetud.`,
  `Modifikaatori 25 toorsõna: ${state.words.join(', ')}.`,
  state.entireBodyMatchesCapture?'Kogu preseti keha kattub kasutaja Volume-seose ekspordiga; selle sisu korduseksporti pole vaja. Uut kodeeritud faili eraldi seadmesse ei imporditud.':'See on uus kombinatsioon: seose vaikeolek on seadmeekspordist, lõppfaili kombinatsioon kontrollitud tarkvaraliselt.',
  'External 1 globaalne pedaali/MIDI määrang ja pedaali asend ei sisaldu presetis. Seos ei muuda stseenide kanalit ega bypass’i.',
  '24.10.2026 P1/P0 katses kinnitati FM3-Editis pedaali järgimine. 26.10.2026 (T2): kand 0.00, varvas 10.00, seos säilis STORE/reload-is. 28.10.2026 (T10): vahemik 2.50/7.50 kuvati ja pedaal järgis seda. Taper ja heli on mõõtmata; selle uue faili riistvarakatset sellest ei järeldu.'];
}
export function verifyVolumePedalOutput(report,syx,txt,spec){
 const requested=Object.hasOwn(spec??{},'volumePedal');
 const range=requested?volumeRange(spec.volumePedal):null;
 if(!requested){
  check(!report.volumePedal&&!report.stages?.volumePedal,'unexpected Volume pedal report');
  if(spec?.composer)check(!readModifiers(Buffer.from(inspectStructure(syx).raw.body)).some(m=>m.active&&m.effectId===102&&m.pid===0),'unrequested Volume pedal binding');
  return;
 }
 check(spec.volumePan===true,'volumePan:true is required');
 const state=readVolumePedal(Buffer.from(inspectStructure(syx).raw.body),range);
 const wahOn=spec.composer?.modifiers?.external1Wah===true;
 check(state.withWahBinding===wahOn,'Volume binding record does not match the Wah request');
 assert.deepEqual(report.volumePedal,state,'Volume pedal final state differs');
 const stage=report.stages?.volumePedal;
 check(stage?.policy===state.policy&&stage.record===state.record&&stage.onlyDeclaredRecordChanged===true&&stage.bodyReadback===true&&stage.dumpHeaderPreserved===true&&stage.deviceIO===false,'stage report differs');
 if(!wahOn){
  check(!spec.composer?.modifiers||Object.keys(spec.composer.modifiers).every(k=>k==='external1Wah'),'Wah modifier settings need external1Wah:true next to the Volume binding');
  check(report.modifierEdit===null,'intermediate Wah edit must not be reported as final');
  check(stage.beforeModifiersSha256===evidence.baseline.modifiersSha256&&(range.custom||stage.afterModifiersSha256===evidence.capture.modifiersSha256),'stage report differs');
  assert.deepEqual(stage.changedWordIndices,[...new Set([...evidence.changedWords,...[1,2].filter(i=>words(range)[i]!==BASE_RECORD1[i])])].sort((a,b)=>a-b),'Volume pedal declared changes differ');
 }else{
  check(report.modifierEdit?.after===14,'Wah binding must be reported next to the Volume binding');
  assert.deepEqual(stage.changedWordIndices,[...new Set([0,8,15,...[1,2].filter(i=>words(range)[i]!==BASE_RECORD1[i])])].sort((a,b)=>a-b),'Volume pedal declared changes differ');
 }
 const m=report.modifiers?.find(r=>r.record===state.record);
 check(m?.source===14&&m.effectId===102&&m.pid===0&&m.channel===0&&m.active===true&&!m.uncertain,'reported modifier differs');
 const actual=readModifiers(Buffer.from(inspectStructure(syx).raw.body));
 check(report.modifiers?.length===actual.length,'reported modifier inventory differs');
 for(const [i,row] of actual.entries())for(const [key,value] of Object.entries(row))assert.equal(report.modifiers[i][key],value,'Volume pedal modifier report differs');
 for(const line of renderVolumePedalText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final binding');
 if(!wahOn)check(!txt.includes('EXTERNAL 1 → WAH — LÕPPFAILIST'),'TXT reports an intermediate Wah edit');
}
