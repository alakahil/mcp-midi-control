// Legacy Cab IR numbers (0.3.53, T31 2026-11-05). Offline only.
// FM3-Edit 1.07.17 shows Cab 1/2 Type (CABINET_TYPE1/2, pid 4/5) as the IR number "#" beside the Bank picker
// (CABINET_BANK1/2, pid 0/1) on the Legacy Cab page. T31 loaded a composer preset whose Cab channel A (Legacy) held
// Cab 1 = FACTORY 1 word 17 and Cab 2 = FACTORY 2 word 200; the FM3 kept the words and FM3-Edit showed Factory 1 # 18
// and Factory 2 # 201 (references/fm3-shot-t31-cab-cpu-20261105.json). So:
//   CABINET_TYPE1/2: integer, value = the # FM3-Edit shows (1..1024), stored word = # - 1;
//   CABINET_BANK1/2: option selector, read exactly (FACTORY 1, FACTORY 2, USER, LEGACY, SCRATCHPAD), default-writable.
// The words only sound on a Legacy channel (CABINET_MODE = LEGACY): writes to a Dyna-Cab channel are refused.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const check=(v,m)=>{if(!v)throw Error(m)};
export const cabIrReceiptHash='8b52b94f8b273995e6ec038aa0bf8d9b77d6cf65a1286c11f7e575b5469fe103';
const bytes=fs.readFileSync(new URL('../references/fm3-shot-t31-cab-cpu-20261105.json',import.meta.url));
check(createHash('sha256').update(bytes).digest('hex')===cabIrReceiptHash,'T31 receipt changed; run tools/fm3/t31-ingest.mjs and review');
const receipt=JSON.parse(bytes);
const CAB_EID=62,MODE_PID=31,LEGACY=0;
export const CAB_IR=Object.freeze({type:Object.freeze([4,5]),bank:Object.freeze([0,1]),modePid:MODE_PID,displayOffset:1});
const EVIDENCE='T31 2026-11-05: Legacy Cab channel A, stored 17 / 200 shown as Factory 1 # 18 / Factory 2 # 201 in FM3-Edit';
check(receipt.cab.readings.filter(r=>/TYPE/.test(r.param)).every(r=>Number(r.shown)===r.raw+CAB_IR.displayOffset),'T31 Cab readings');
export const DYNACAB_REFUSED='Legacy IR words (Bank, #) do nothing on a Dyna-Cab channel; use cabChannels or a Legacy channel (T31)';
export function effectiveCabIrParameter(p){
  if(p.block!==CAB_EID||p.family!=='CABINET')return p;
  if(CAB_IR.type.includes(p.param)){check(p.min===0&&p.max===1023&&p.step===1,'Cab IR range');
    return {...p,kind:'integer',status:'measured',structuralStatus:p.status,displayOffset:CAB_IR.displayOffset,cabIrEvidence:EVIDENCE};}
  if(CAB_IR.bank.includes(p.param)&&p.kind==='enum'&&p.status==='enum-labels'){check(p.enum[0]==='FACTORY 1'&&p.enum[1]==='FACTORY 2','Cab bank labels');
    return {...p,status:'enum-labels-crosschecked',structuralStatus:p.status,enumEvidence:'hardware-t31'};}
  return p;
}
const MODES=['LEGACY','DYNA-CAB'];
const isIr=pid=>[...CAB_IR.type,...CAB_IR.bank].includes(pid);
// Type state/applicability hooks (fm3-type-applicability.mjs): the final channel CABINET_MODE decides.
export function cabIrState(p,read){return p.family==='CABINET'&&isIr(p.param)?read(MODE_PID):undefined;}
export function cabIrApplicability(p,type){
  if(p.family!=='CABINET'||!isIr(p.param))return {covered:false};
  return {covered:true,allowed:type===LEGACY,typeId:type,typeName:MODES[type]??'unknown',label:p.label,source:'T31 Legacy Cab IR rule',...(type===LEGACY?{}:{reason:DYNACAB_REFUSED})};
}
// Called from validateTypeWrites with the composed body and the planned writes.
export function validateCabIrWrites(body,writes){
  const planned=new Map(writes.map(w=>[w.offset,w.raw]));
  for(const w of writes){
    if(w.block!=='cab'||!isIr(w.pid))continue;
    const at=w.offset-2*w.pid+2*MODE_PID,mode=planned.get(at)??body.readUInt16LE(at);
    check(mode===LEGACY,`cab ${w.channel} ${w.name}: not applicable to final type ${mode} (${MODES[mode]??'unknown'}); ${DYNACAB_REFUSED}`);
  }
}
export function cabIrCapabilities(){
  return {block:'cab',writable:{CABINET_TYPE1:'Cab 1 IR # (1..1024, as FM3-Edit shows it)',CABINET_TYPE2:'Cab 2 IR # (1..1024)',CABINET_BANK1:'FACTORY 1 | FACTORY 2 | USER | LEGACY | SCRATCHPAD',CABINET_BANK2:'same as Bank 1'},
    onlyOn:'Legacy channels (CABINET_MODE LEGACY); the composer Cab channel A is Legacy, B-D are Dyna-Cab',
    hardwareReceipt:{file:'references/fm3-shot-t31-cab-cpu-20261105.json',sha256:cabIrReceiptHash,readings:receipt.cab.readings.length},
    limits:['IR names come from the device and are not checked','Audio and STORE/reload not measured','Cab 2 is muted on the composer Legacy channel (CABINET_MUTE2)']};
}
