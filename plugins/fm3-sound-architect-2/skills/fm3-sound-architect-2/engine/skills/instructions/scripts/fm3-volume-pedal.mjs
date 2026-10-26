// Exact firmware-created binding from one FW13 export. No numeric modifier
// codec, free-record allocator, global controller setup or device I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,message)=>{if(!ok)throw Error('Volume pedal: '+message);};
const bytes=fs.readFileSync(new URL('../references/fm3-volume-binding-evidence.json',import.meta.url));
export const volumeBindingEvidenceHash='0eb1abb5c47585c08ec5d1aee65a2829a8fda245f3d9f5403bc7f2b20fe9759b';
check(sha(bytes)===volumeBindingEvidenceHash,'evidence drift');
const evidence=JSON.parse(bytes),start=1584,end=start+50;
const pedalReceipt='references/fm3-pedal-check-20261024.json';
const pedalCheck=JSON.parse(fs.readFileSync(new URL('../'+pedalReceipt,import.meta.url)));
check(pedalCheck.editorCheck.P1.knobFollowsPedalHeelToToe===true&&pedalCheck.editorCheck.P1.sourceExternal1===true&&pedalCheck.editorCheck.P0.volumeStays==='10.00','pedal observation receipt');
const pedalBehaviorEvidence=()=>({receipt:pedalReceipt,date:'2026-10-24',scope:'captured P1/P0 presets on FM3 Mk II Turbo FW13; FM3-Edit observation',
  knobFollowsPedal:true,numericHeelToeMeasured:false,taperMeasured:false,audioVerified:false,currentGeneratedPresetHardwareTested:false});
const words=()=>Array.from(evidence.binding.words);
function target(body){
 const found=scanRecords(body).records.filter(r=>r.eid===102);
 check(found.length===1,'exactly one Volume/Pan 1 record is required');
 const r=found[0];check(r.words===15&&r.channels===4,'unsupported Volume record');
 for(let ch=0;ch<4;ch++)check(body.readUInt16LE(r.start+ch*30+18)===0,'VOLUME type required on A–D');
 check(readGrid(body).filter(g=>g.id===102).length===1,'Volume/Pan 1 must occur once on the grid');
}
export function volumePedalCapabilities(){return {
 field:'volumePedal',values:[true],requires:'volumePan:true; exact captured inactive modifier region; no active Wah binding',
 source:'External 1',sourceCode:14,target:{effectId:102,pid:0,name:'VOLUME_GAIN',displayLabel:'Volume',channelScope:'ALL'},
 record:0,words:words(),policy:'captured-volume-default-fw13',evidenceSha256:volumeBindingEvidenceHash,
 captureSha256:evidence.capture.sha256,fullRangeEncodingProven:false,numericMinMaxAuthoring:false,
 globalControllerSetup:false,deviceIO:false,storeReloadProven:false,pedalBehaviorEvidence:pedalBehaviorEvidence(),
 limits:evidence.limits};}
export function readVolumePedal(body){
 target(body);
 const modifiers=readModifiers(body);
 check(sha(body.subarray(1538,4610))===evidence.capture.modifiersSha256,'final modifier region differs from captured binding');
 const m=modifiers[0];
 check(m.source===14&&m.effectId===102&&m.pid===0&&m.channel===0&&!m.uncertain,'binding readback failed');
 return {policy:'captured-volume-default-fw13',record:0,offset:start,source:m.source,sourceName:m.sourceName,
  effectId:m.effectId,pid:m.pid,targetName:'VOLUME_GAIN',displayLabel:'Volume',channelScope:m.channelScope,
  words:Array.from({length:25},(_,i)=>body.readUInt16LE(start+i*2)),
  evidenceSha256:volumeBindingEvidenceHash,captureSha256:evidence.capture.sha256,
  capturedDefaults:true,fullRangeEncodingProven:false,physicalScaleMeasurements:0,storeReloadProven:false,
  entireBodyMatchesCapture:sha(body)===evidence.capture.bodySha256,
  submittedFileReimported:false,pedalBehavior:'confirmed on captured P1/P0 presets; see evidence scope',pedalBehaviorEvidence:pedalBehaviorEvidence(),globalControllerSetup:false};
}
export function bindVolumePedal(syx){
 const before=inspectStructure(syx),original=Buffer.from(before.raw.body);
 target(original);readModifiers(original);
 check(sha(original.subarray(1538,4610))===evidence.baseline.modifiersSha256,
  'requires captured inactive modifier region; active Wah, other bindings or changed defaults are unsupported');
 const body=Buffer.from(original);
 words().forEach((word,i)=>body.writeUInt16LE(word,start+i*2));
 check(body.subarray(0,start).equals(original.subarray(0,start))&&body.subarray(end).equals(original.subarray(end)),
  'bytes outside the declared record changed');
 const output=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body)));
 const after=inspectStructure(output),actual=Buffer.from(after.raw.body);
 check(actual.equals(body),'encoded body readback differs');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'dump header changed');
 return {syx:output,state:readVolumePedal(actual),report:{policy:'captured-volume-default-fw13',
  changedWordIndices:evidence.changedWords,beforeModifiersSha256:sha(original.subarray(1538,4610)),
  afterModifiersSha256:sha(actual.subarray(1538,4610)),onlyDeclaredRecordChanged:true,
  bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}};
}
export function renderVolumePedalText(state){
 if(!state)return [];
 return ['','EXTERNAL 1 → VOLUME/PAN 1 — LÕPPFAILIST',
  'Seos: External 1 → Volume/Pan 1 Volume (VOLUME_GAIN, PID 0); kanalid ALL (A–D).',
  'Min/Max, kõver ja muud modifikaatori väljad: 23.10.2026 FW13 ekspordist kopeeritud vaikeolek. Arvulist Min/Max muutmist ei toetata.',
  `Modifikaatori 25 toorsõna: ${state.words.join(', ')}.`,
  state.entireBodyMatchesCapture?'Kogu preseti keha kattub kasutaja Volume-seose ekspordiga; selle sisu korduseksporti pole vaja. Uut kodeeritud faili eraldi seadmesse ei imporditud.':'See on uus kombinatsioon: seose vaikeolek on seadmeekspordist, lõppfaili kombinatsioon kontrollitud tarkvaraliselt.',
  'External 1 globaalne pedaali/MIDI määrang ja pedaali asend ei sisaldu presetis. Seos ei muuda stseenide kanalit ega bypass’i.',
  '24.10.2026 P1/P0 katses kinnitati FM3-Editis pedaali järgimine. Täpsed kanna/varba arvud, taper, heli ja pedaalipreseti STORE/reload on kontrollimata. Uue faili riistvarakatset sellest ei järeldu; fullRangeEncodingProven=false. Wahi Min/Max tõendeid Volume’ile ei laiendata.'];
}
export function verifyVolumePedalOutput(report,syx,txt,spec){
 const requested=Object.hasOwn(spec??{},'volumePedal');
 check(!requested||spec.volumePedal===true,'volumePedal must be true');
 if(!requested){
  check(!report.volumePedal&&!report.stages?.volumePedal,'unexpected Volume pedal report');
  if(spec?.composer)check(!readModifiers(Buffer.from(inspectStructure(syx).raw.body)).some(m=>m.active&&m.effectId===102&&m.pid===0),'unrequested Volume pedal binding');
  return;
 }
 check(spec.volumePan===true,'volumePan:true is required');
 check(!spec.composer?.modifiers||Object.keys(spec.composer.modifiers).every(k=>k==='external1Wah')&&spec.composer.modifiers.external1Wah===false,
  'Wah modifier requests conflict with captured Volume binding');
 const state=readVolumePedal(Buffer.from(inspectStructure(syx).raw.body));
 assert.deepEqual(report.volumePedal,state,'Volume pedal final state differs');
 check(report.modifierEdit===null,'intermediate Wah edit must not be reported as final');
 const stage=report.stages?.volumePedal;
 check(stage?.policy===state.policy&&stage.beforeModifiersSha256===evidence.baseline.modifiersSha256&&stage.afterModifiersSha256===evidence.capture.modifiersSha256&&stage.onlyDeclaredRecordChanged===true&&stage.bodyReadback===true&&stage.dumpHeaderPreserved===true&&stage.deviceIO===false,'stage report differs');
 assert.deepEqual(stage.changedWordIndices,evidence.changedWords,'Volume pedal declared changes differ');
 const m=report.modifiers?.find(r=>r.record===0);
 check(m?.source===14&&m.effectId===102&&m.pid===0&&m.channel===0&&m.active===true&&!m.uncertain,'reported modifier differs');
 const actual=readModifiers(Buffer.from(inspectStructure(syx).raw.body));
 check(report.modifiers?.length===actual.length,'reported modifier inventory differs');
 for(const [i,row] of actual.entries())for(const [key,value] of Object.entries(row))assert.equal(report.modifiers[i][key],value,'Volume pedal modifier report differs');
 for(const line of renderVolumePedalText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final binding');
 check(!txt.includes('EXTERNAL 1 → WAH — LÕPPFAILIST'),'TXT reports an intermediate Wah edit');
}
