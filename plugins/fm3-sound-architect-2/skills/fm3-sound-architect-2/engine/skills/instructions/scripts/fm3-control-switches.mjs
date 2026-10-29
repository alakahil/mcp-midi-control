// Control Switch -> Amp switch bindings (modifier records). Offline; no device I/O.
// Evidence: references/fm3-control-switch-evidence-20261028.json. 1 401 of 1 610 Control Switch -> Amp switch
// records the FM3 itself serialised in a FW13 commercial tonepack (the rest are inverted/partial Min/Max or
// channel-limited forms, not written here) and the user's own FM3-created External 1 -> Volume binding
// (references/fm3-volume-binding-evidence.json) use one 25-word template; only Source (word 0), target effect
// (8) and target PID (9) differ:
//   [src, 0, 65534, 0, 32767, 65534, 32767, 66, eid, pid, 0, 0, 0, 32767, 32767, 66, 0, 0, 0, 0, 0, 65534, 65534, 0, 0]
// Words 1/2 = Min/Max (full range, normal direction), 17 = channel (0 = ALL), 20 = secondary source (none).
// The tonepack places such bindings in consecutive records starting at record 1; record 0 holds the Wah
// template. In the supported jb-newlook base record 1 is an inactive default (BASE_RECORD1) and records
// 2..31 are unused (UNUSED); only records still in that base form may be written, and only words 0..20.
// Not covered: Control Switch type/default state (latching or momentary, stored elsewhere), footswitch
// assignment (global / per-preset FC), inverted or partial Min/Max, channel-limited scope, other targets.
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
import {findParam} from './fm3-table-encoder.mjs';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
const check=(ok,m)=>{if(!ok)throw Error('Control switches: '+m);};
const evidenceBytes=fs.readFileSync(new URL('../references/fm3-control-switch-evidence-20261028.json',import.meta.url));
export const controlSwitchEvidenceHash='7b7e7e2f8addc4abe9da2c7fd2b9ae8866aa98f10b88e9b6da83e43674f29945';
const evidence=JSON.parse(evidenceBytes);
check(createHash('sha256').update(evidenceBytes).digest('hex')===controlSwitchEvidenceHash,'evidence drift');
const FIELDS0=1584,RECORD=96,RECORDS=32,TEMPLATE=[0,0,65534,0,32767,65534,32767,66,0,0,0,0,0,32767,32767,66,0,0,0,0,0];
export const CONTROL_SWITCH_SOURCE=Object.freeze({1:50,2:51,3:52,4:53,5:54,6:55});
// Targets observed bound to Control Switches in the evidence corpus (amp switches, ALL channels).
export const CONTROL_SWITCH_TARGETS=Object.freeze({amp:Object.freeze(['DISTORT_BOOST','DISTORT_BRIGHT','DISTORT_CUT','DISTORT_FAT','DISTORT_SATSWITCH'])});
const EID={amp:58};
const words=(body,r)=>Array.from({length:25},(_,i)=>body.readUInt16LE(FIELDS0+RECORD*r+2*i));
export const BASE_RECORD1=Object.freeze([0,0,65534,0,32767,65534,32767,66,0,0,0,0,0,32767,32767,0,0,0,0,0,0,65534,65534,0,0]);
const UNUSED=Object.freeze([...Array(21).fill(0),65534,65534,0,0]);
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const baseForm=r=>r===1?BASE_RECORD1:UNUSED;
const writable=(r,w)=>same(w,UNUSED)||same(w,baseForm(r));
// Variants (0.3.32): invert = Min 65534 / Max 0 (T7: displays Min ON, Max OFF; 164 tonepack records);
// channel = word 17 (0 ALL, 1..4 CHAN A..D; T7: 4 displays CHAN D; tonepack records with 1, 2 and 4).
const CHANNELS=Object.freeze(['ALL','A','B','C','D']);
const templateFor=(source,eid,pid,{invert=false,channel='ALL'}={})=>{const t=[...TEMPLATE,65534,65534,0,0];t[0]=source;t[8]=eid;t[9]=pid;
  if(invert){t[1]=65534;t[2]=0;}t[17]=CHANNELS.indexOf(channel);return t;};
const variantOf=w=>({invert:w[1]===65534&&w[2]===0,channel:CHANNELS[w[17]]??'?'});
const SOURCES=new Set(Object.values(CONTROL_SWITCH_SOURCE)),PIDS=new Map(CONTROL_SWITCH_TARGETS.amp.map(n=>[findParam('amp',n).param,n]));
// A record this engine writes: Control Switch source, amp effect, a listed PID, exactly the template (or a variant).
export function isControlSwitchRecord(w){return SOURCES.has(w[0])&&w[8]===EID.amp&&PIDS.has(w[9])&&w[17]<CHANNELS.length&&same(w,templateFor(w[0],w[8],w[9],variantOf(w)));}
// Copy of the body with every Control Switch record reset to its base form, so other verifiers can pin the rest.
export function stripControlSwitchRecords(body){
  const out=Buffer.from(body);
  for(let r=1;r<RECORDS;r++)if(isControlSwitchRecord(words(body,r)))baseForm(r).forEach((x,i)=>out.writeUInt16LE(x,FIELDS0+RECORD*r+2*i));
  return out;
}
export function validateControlSwitches(list){
  check(Array.isArray(list)&&list.length>=1&&list.length<=8,'controlSwitches must be a list of 1..8 bindings');
  const seen=new Set();
  return list.map((c,i)=>{
    check(c&&typeof c==='object'&&!Array.isArray(c),`controlSwitches[${i}] must be an object`);
    for(const k of Object.keys(c))check(['switch','block','param','invert','channel'].includes(k),`controlSwitches[${i}]: unknown field ${k}`);
    check(c.invert===undefined||typeof c.invert==='boolean',`controlSwitches[${i}].invert must be true or false`);
    check(c.channel===undefined||CHANNELS.includes(c.channel),`controlSwitches[${i}].channel must be ${CHANNELS.join(', ')}`);
    check(Number.isInteger(c.switch)&&CONTROL_SWITCH_SOURCE[c.switch],`controlSwitches[${i}].switch must be 1..6`);
    check(Object.hasOwn(CONTROL_SWITCH_TARGETS,c.block),`controlSwitches[${i}].block must be ${Object.keys(CONTROL_SWITCH_TARGETS).join(', ')}`);
    check(CONTROL_SWITCH_TARGETS[c.block].includes(c.param),`controlSwitches[${i}].param must be one of ${CONTROL_SWITCH_TARGETS[c.block].join(', ')}`);
    const key=c.block+'.'+c.param;check(!seen.has(key),`controlSwitches: ${key} bound twice`);seen.add(key);
    const p=findParam(c.block,c.param);check(p&&p.param>=0,`controlSwitches[${i}]: ${key} not in the dictionary`);
    return {switch:c.switch,source:CONTROL_SWITCH_SOURCE[c.switch],block:c.block,param:c.param,label:p.label??c.param,effectId:EID[c.block],pid:p.param,invert:c.invert===true,channel:c.channel??'ALL'};
  });
}
export function bindControlSwitches(syx,list){
  const wanted=validateControlSwitches(list);
  const before=inspectStructure(syx),original=Buffer.from(before.raw.body),body=Buffer.from(original);
  const {records}=scanRecords(body);
  for(const w of wanted){check(records.filter(r=>r.eid===w.effectId).length===1,`exactly one ${w.block} record is required`);
    check(readGrid(body).filter(g=>g.id===w.effectId).length===1,`${w.block} must occur once on the grid`);}
  const mods=readModifiers(body);
  for(const w of wanted)check(!mods.some(m=>m.active&&m.effectId===w.effectId&&m.pid===w.pid),`${w.block}.${w.param} already has an active modifier`);
  const writes=[];let r=1;
  for(const w of wanted){
    while(r<RECORDS&&!writable(r,words(body,r)))r++;
    check(r<RECORDS,'no unused modifier record left');
    const was=words(body,r),state=same(was,UNUSED)?'unused':'inactive-default',next=templateFor(w.source,w.effectId,w.pid,w).slice(0,21);
    next.forEach((v,i)=>body.writeUInt16LE(v,FIELDS0+RECORD*r+2*i));
    writes.push({...w,record:r,recordState:state,before:was.slice(0,21),after:next});r++;
  }
  const allowed=new Set(writes.flatMap(x=>Array.from({length:42},(_,k)=>FIELDS0+RECORD*x.record+k)));
  for(let o=0;o<body.length;o++)if(body[o]!==original[o])check(allowed.has(o),'byte outside the declared record words changed at '+o);
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,body))),after=inspectStructure(out);
  check(Buffer.from(after.raw.body).equals(body)&&after.raw.crcValid,'encoded body readback differs');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'dump header changed');
  return {syx:out,writes,report:{policy:'control-switch-default-template-fw13',evidenceSha256:controlSwitchEvidenceHash,records:writes.map(x=>x.record),
    onlyDeclaredWordsChanged:true,bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}};
}
// Final-state readback: every requested binding must be present, active, ALL channels, default template.
export function readControlSwitches(body,list){
  const wanted=validateControlSwitches(list),mods=readModifiers(body);
  check(mods.filter(m=>m.active&&SOURCES.has(m.source)).length===wanted.length,'Control Switch bindings other than the requested ones are present');
  return wanted.map(w=>{const m=mods.filter(x=>x.active&&x.effectId===w.effectId&&x.pid===w.pid);
    check(m.length===1,`${w.block}.${w.param}: expected exactly one active modifier, found ${m.length}`);
    check(m[0].source===w.source,`${w.block}.${w.param}: bound to ${m[0].sourceName}, expected Control Switch ${w.switch}`);
    const ws=words(body,m[0].record);
    check(isControlSwitchRecord(ws)&&same(ws,templateFor(w.source,w.effectId,w.pid,w)),`${w.block}.${w.param}: record ${m[0].record} is not the requested template`);
    return {switch:w.switch,sourceName:m[0].sourceName,block:w.block,param:w.param,label:w.label,record:m[0].record,channelScope:m[0].channelScope,invert:w.invert,
      min:w.invert?'ON (stored 65534)':'OFF (stored 0)',max:w.invert?'OFF (stored 0)':'ON (stored 65534)'};});
}
export function renderControlSwitchText(state){
  if(!state?.length)return [];
  return ['','CONTROL SWITCH SEOSED — LÕPPFAILIST',
    ...state.map(s=>`Control Switch ${s.switch} → ${s.block} ${s.label} (${s.param}); kanalid ${s.channelScope}; kirje ${s.record}; ${s.invert?'pööratud: Min ON, Max OFF (lüliti vajutamine lülitab välja)':'Min OFF, Max ON (FM3 tonepacki vaikemall)'}.`),
    'Control Switchi olek stseeni kaupa ja jalglüliti (Latching/Momentary) on eraldi väljad controlSwitchScenes / footswitches (FC PER-PRESET, salvestub presetti); ilma nendeta on kõik CS-id igas stseenis OFF ja jalglüliti määra FM3-l.',
    'Seose mall on FM3 enda salvestatud presetitest (1401 sama malliga kirjet). 28.10.2026 katses T9 jäid sama malliga seosed (CS2 → Input Boost, CS3 → Bright) pärast STORE-i ja uuesti laadimist alles; selle uue faili import ja lülitamine on seadmes kontrollimata.'];
}
export function controlSwitchCapabilities(){return {field:'controlSwitches',entry:'{switch 1..6, block "amp", param DISTORT_BOOST|DISTORT_BRIGHT|DISTORT_CUT|DISTORT_FAT|DISTORT_SATSWITCH, invert?: boolean, channel?: ALL|A|B|C|D}',
  variants:{invert:'Min 65534 / Max 0 (T7 display Min ON, Max OFF)',channel:'word 17: 0 ALL, 1..4 CHAN A..D (T7: 4 = CHAN D)'},
  maxBindings:8,records:'consecutive from record 1 (record 0 = Wah template); only unused or inactive default records',template:TEMPLATE,
  evidence:{receipt:'references/fm3-control-switch-evidence-20261028.json',sha256:controlSwitchEvidenceHash,corpusRecords:evidence.corpus?.templateRecords??null},
  notSupported:['partial Min/Max','other sources or targets'],stateAndFootswitch:'controlSwitchScenes / footswitches (fm3-cs-preset.mjs)',
  hardware:{storeReload:'confirmed 2026-10-28 (T9: CS2 -> Boost, CS3 -> Bright next to Wah + Volume; references/fm3-bind-store-20261028.json)',display:'default template shows the default Modify page (T7, references/fm3-modifier-display-20261028.json)',switching:'confirmed 2026-10-29 (T13 PEDAL 2 ring momentary; T14/T14b per-preset Latching and Momentary footswitch: normal, inverted and CHAN D records behave as written; references/fm3-cs-steps-b-20261029.json)',thisFile:'not tested'}};}
// Final artifact check (verifyPresetOutputs): bindings, stage report, active-record inventory and TXT.
export function verifyControlSwitchOutput(report,syx,txt,spec){
  const requested=Object.hasOwn(spec??{},'controlSwitches'),body=Buffer.from(inspectStructure(syx).raw.body);
  if(!requested){
    check(!report.controlSwitches&&!report.stages?.controlSwitches,'unexpected Control Switch report');
    if(spec?.composer)check(!readModifiers(body).some(m=>m.active&&SOURCES.has(m.source)),'unrequested Control Switch binding');
    return;
  }
  const state=readControlSwitches(body,spec.controlSwitches);
  check(JSON.stringify(report.controlSwitches)===JSON.stringify(state),'Control Switch final state differs');
  const stage=report.stages?.controlSwitches;
  check(stage?.policy==='control-switch-default-template-fw13'&&stage.evidenceSha256===controlSwitchEvidenceHash&&JSON.stringify(stage.records)===JSON.stringify(state.map(s=>s.record))
    &&stage.onlyDeclaredWordsChanged===true&&stage.bodyReadback===true&&stage.dumpHeaderPreserved===true&&stage.deviceIO===false,'Control Switch stage report differs');
  const expected=new Set(state.map(s=>s.record));
  if(report.volumePedal)expected.add(report.volumePedal.record);
  if(spec.composer?.modifiers?.external1Wah===true)expected.add(0);
  const active=readModifiers(body).filter(m=>m.active).map(m=>m.record);
  check(active.length===expected.size&&active.every(r=>expected.has(r)),'active modifier records differ from the requested bindings');
  for(const line of renderControlSwitchText(state).filter(Boolean))check(txt.includes(line),'TXT differs from final Control Switch bindings');
}
