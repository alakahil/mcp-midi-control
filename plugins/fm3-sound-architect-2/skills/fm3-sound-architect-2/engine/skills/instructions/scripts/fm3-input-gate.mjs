// Bounded numeric Input 1 controls. No global, type/mode, bypass or modifier writes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bytes=fs.readFileSync(new URL('../references/fm3-input-volume-evidence.json',import.meta.url));
export const inputVolumeEvidenceHash='ab9103c43d7b3766361fad5df5ac453cd29a6411649312a1963200dec1f6de70';
if(createHash('sha256').update(bytes).digest('hex')!==inputVolumeEvidenceHash)throw Error('Input/Volume evidence changed; review and regenerate');
const evidence=JSON.parse(bytes),input=evidence.families.INPUT;
const numericPids=new Set([0,1,2,3,5]);
export const inputUnits=Object.freeze({INPUT_THRESH:'dB',INPUT_RATIO:':1',INPUT_RELEASE:'ms',INPUT_ATTACK:'ms',INPUT_LEVEL:'dB'});
export function inputGateSummary(){return {supported:true,block:'in1',effectId:37,channels:['A','B','C','D'],
  parameters:[...numericPids].map(pid=>({pid,name:input.parameters[pid].name,unit:inputUnits[input.parameters[pid].name],kind:input.parameters[pid].kind,displayRange:input.parameters[pid].numericFields.slice(0,2).map(v=>v*input.parameters[pid].numericFields[2])})),
  evidenceSha256:inputVolumeEvidenceHash,encoding:'FW13 table curves; selected front-panel points checked on 2026-10-24; unmeasured values remain model-based',
  hardwareMeasurementsPerformedByGenerator:0,frontPanelScalePoints:8,fullRangeEncodingProven:false,
  hardwareStorageRoundtrip:{targetWords:20,channels:['A','B','C','D'],captureSha256:'e6537e4a8f86b7bb9d125e341567b7c5b354afac65fc4f325a8580d0d8a06356',scope:'one imported combination; entire Input record preserved'},
  preserved:['Gate Type','Mode','Input bypass','meter/reserved words','scene assignments','global Noisegate Offset','global AC Line Frequency','modifiers'],
  frontPanelScaleCheck:{receipt:'references/fm3-step-diff-input-volume-20261024.json',points:{INPUT_THRESH:['-40 dB','OFF (= -100, word 0)','-80 dB'],INPUT_LEVEL:['+6 dB']},
    result:'every front-panel reading equals the generator encoding word for word'},
  additionalFrontPanelScaleCheck:{receipt:'references/fm3-step-diff-gate-pan-20261024.json',points:{INPUT_RATIO:[4,10],INPUT_ATTACK:[10.03],INPUT_RELEASE:[199.89]},result:'stored words decode to the observed display precision; this does not assert word-exact encoding of rounded Ratio/Attack/Release readings'},
  limits:['Input 1 only; separate Gate block excluded','Ratio and Attack require final ADVANCED; Release is visible in both FW13 modes','Threshold -100 dB = OFF on the FM3 (stored word 0, front-panel check 2026-10-24)','No new Input controller binding; Volume/Pan has a separate bounded writer']};}
export function inputGateState(p,read){
  return p.family==='INPUT'?{mode:read(9),type:read(7)}:null;
}
export function inputGateApplicability(p,state){
  if(p.family!=='INPUT')return {covered:false};
  const mode=state?.mode,type=state?.type;
  const known=[0,1].includes(mode)&&[0,1,2].includes(type);
  const row=input.parameters.find(x=>x.pid===p.param);
  const visible=!!row?.cases.some(c=>c.types.includes(mode));
  return {covered:true,allowed:known&&numericPids.has(p.param)&&visible,
    typeId:type,typeName:['CLASSIC','INTELLIGENT','NOISE REDUCER'][type]??'unknown',modeId:mode,
    modeName:['EASY','ADVANCED'][mode]??'unknown',label:p.label,
    reason:!known?'unknown Input type/mode':!numericPids.has(p.param)?'outside bounded numeric Input gate scope':!visible?'hidden in final FW13 mode':null,
    source:'hash-pinned FM3-Edit 1.07.17 native bindings + FW13 cache + XML'};
}
export function validateInputGateWrites(body,writes){
  const selected=writes.filter(w=>w.block==='in1');
  for(const w of selected){
    if(w.effectId!==37||!numericPids.has(w.pid))throw Error('Input gate: outside bounded numeric scope');
    const start=w.offset-2*w.pid;
    const a=inputGateApplicability({family:'INPUT',param:w.pid,label:w.label},inputGateState({family:'INPUT'},pid=>body.readUInt16LE(start+2*pid)));
    if(!a.allowed)throw Error('Input gate: '+a.reason);
    if(w.pid===0&&w.raw===0)w.deviceDisplay='OFF';  // -100 dB: the FM3 shows OFF (front-panel check 2026-10-24)
    w.typeApplicability=a;
    w.encodingEvidence='FW13 curve classes; 20-word storage roundtrip; selected Threshold/Level words exact and Ratio/Attack/Release matched at display precision (references/fm3-step-diff-input-volume-20261024.json; references/fm3-step-diff-gate-pan-20261024.json). Other values remain model-based.';
  }
}
export function describeInputGate(body,record){
  if(!record||record.eid!==37||record.words!==10||record.channels!==4)throw Error('Unsupported Input 1 record');
  return {effectId:37,header:record.header,wordCount:10,channels:4,
    scenes:Array.from({length:8},(_,i)=>({scene:i+1,channel:'ABCD'[body.readUInt16LE(record.header+10+i*2)]??'unknown',bypassRaw:body.readUInt16LE(record.header+26+i*2)})),
    states:Array.from({length:4},(_,i)=>({channel:'ABCD'[i],modeRaw:body.readUInt16LE(record.start+i*20+18),typeRaw:body.readUInt16LE(record.start+i*20+14)})),
    globalDependencies:['Noisegate Offset','AC Line Frequency'],globalSettingsIncluded:false,
    storage:'Preset channel words; not a live DSP value or STORE/reload confirmation'};
}
