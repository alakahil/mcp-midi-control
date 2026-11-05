// FM3 Controllers block writes (0.3.50, T28 2026-11-05). Offline only.
// The Controllers record (effect id 2, 130 words x 4 channels) is not a grid block: it sits in the preset prefix at
// body offset 452 (46-byte header: id 2, 20 zero words, words 130, channels 4), data 498..1538, before the modifier
// records. T28 (FM3 Mk II, FW13) loaded a preset with 26 distinctive values on channel A and per-channel markers on
// B/C/D into the edit buffer: the fn=0x1F read of effect 2 returned every word unchanged, and FM3-Edit showed exactly
// the expected readings on the LFO 1+2, ADSR 1, Sequencer, Envelope/Manual and Scene Ctrl 1+2 pages; its Controllers
// channel selector A/B/C/D showed copies A/B/C/D (references/fm3-shot-t28-controllers-20261105.json). So word n of a
// copy is dictionary parameter n and the copy is the Controllers channel.
// Writes follow the normal status gate (taper-class-verified knobs by default; 'enum-labels' selectors only with
// allow:['enum-labels']; n/a and unverified-taper parameters are refused). Which Controllers channel a scene uses is
// not decoded; in composer outputs the per-scene header words are all 0 and FM3-Edit showed channel A, so channel A
// is the one that sounds unless the user changes the Controllers channel on the device.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {finalizeBody} from './fm3-layout.mjs';
import {findParam,encodeValue,decodeValue,assertFields,channelIndex,validateOptions} from './fm3-table-encoder.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export const CONTROLLERS_RECORD=Object.freeze({effectId:2,header:452,start:498,words:130,channels:4});
export const controllersReceiptHash='1996998ecab2128a5ff74395e5c441f4eae2082764056081689b6e6f845a49a4';
const receiptBytes=fs.readFileSync(new URL('../references/fm3-shot-t28-controllers-20261105.json',import.meta.url));
check(createHash('sha256').update(receiptBytes).digest('hex')===controllersReceiptHash,'Controllers receipt changed; run tools/fm3/t28-controllers-ingest.mjs and review');
const receipt=JSON.parse(receiptBytes);
export const MAX_CONTROLLER_WRITES=64;
// Tempo To Use switches the preset between its own and the global tempo for every tempo-synced block: not measured.
export const CONTROLLERS_REFUSED=Object.freeze({33:'Tempo To Use (preset/global tempo source) is not measured'});

export function locateControllers(body){
  const {effectId,header,words,channels,start}=CONTROLLERS_RECORD;
  check(body.length>=start+2*words*channels,'Preset too short for the Controllers record');
  check(body.readUInt16LE(header)===effectId&&body.readUInt16LE(header+42)===words&&body.readUInt16LE(header+44)===channels,'Controllers record not at body offset 452');
  return CONTROLLERS_RECORD;
}
export function controllersParam(param){
  check((typeof param==='string'&&param.length>0)||(Number.isInteger(param)&&param>=0),'Invalid Controllers parameter');
  const p=findParam('CONTROLLERS',param);check(p.family==='CONTROLLERS'&&p.block===2&&p.param<CONTROLLERS_RECORD.words,'Not a Controllers parameter');
  check(!Object.hasOwn(CONTROLLERS_REFUSED,p.param),`${p.name}: ${CONTROLLERS_REFUSED[p.param]}`);
  return p;
}
export function readControllers(body){
  const r=locateControllers(body);
  return [...'ABCD'].map((channel,ch)=>({channel,words:[...Array(r.words).keys()].map(i=>body.readUInt16LE(r.start+2*(ch*r.words+i)))}));
}
export function validateControllers(list){
  check(Array.isArray(list)&&list.length>=1&&list.length<=MAX_CONTROLLER_WRITES,`controllers must be an array of 1…${MAX_CONTROLLER_WRITES} writes`);
  for(const c of list){assertFields(c,['channel','param','value'],'controllers write');channelIndex(c.channel);check(Object.hasOwn(c,'value'),'controllers write needs a value');controllersParam(c.param);}
}
// controllers: [{channel:'A',param:'LFO1FREQ'|'CONTROLLERS_LFO1FREQ'|1,value:2.5}]
export function applyControllers(syx,list,opts={}){
  validateOptions(opts);validateControllers(list);
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original),r=locateControllers(body);
  const writes=[],seen=new Set(),allowed=new Set();
  for(const c of list){
    const p=controllersParam(c.param),ch=channelIndex(c.channel),offset=r.start+2*(ch*r.words+p.param);
    check(!seen.has(offset),`Duplicate Controllers write ${p.name} channel ${c.channel}`);seen.add(offset);
    const raw=encodeValue(p,c.value,opts);
    writes.push({effectId:2,block:'controllers',channel:c.channel,pid:p.param,name:p.name,label:p.label,status:p.status,kind:p.kind,value:c.value,raw,before:body.readUInt16LE(offset),offset,display:decodeValue(p,raw)});
  }
  for(const w of writes){body.writeUInt16LE(w.raw,w.offset);allowed.add(w.offset);allowed.add(w.offset+1);}
  const out=finalizeBody(syx,original,body,allowed),after=Buffer.from(inspectStructure(out).raw.body);
  for(const w of writes)check(after.readUInt16LE(w.offset)===w.raw,'Controllers readback '+w.name);
  return {syx:out,writes,report:{record:{...r},writes:writes.length,changedWords:writes.filter(w=>w.raw!==w.before).length,
    hardware:'T28: storage, word order, channels A-D and FM3-Edit readings confirmed for 26 parameters; this output itself not tested',sceneChannel:'not decoded; composer scenes use channel A'}};
}
// Saved-bundle check: re-encode the requested writes and compare them with the stored words and the report.
export function verifyControllersOutput(body,spec,reported){
  if(!spec.controllers){check(reported===undefined,'Controllers report without spec.controllers');return [];}
  validateControllers(spec.controllers);const r=locateControllers(body),opts={allow:spec.allow??[]};
  const writes=spec.controllers.map(c=>{const p=controllersParam(c.param),offset=r.start+2*(channelIndex(c.channel)*r.words+p.param),raw=encodeValue(p,c.value,opts);
    check(body.readUInt16LE(offset)===raw,`Final Controllers word differs: ${p.name} channel ${c.channel}`);
    return {channel:c.channel,pid:p.param,name:p.name,label:p.label,value:c.value,raw,offset,display:decodeValue(p,raw)};});
  check(Array.isArray(reported)&&reported.length===writes.length,'Final Controllers count differs');
  writes.forEach((w,i)=>{for(const k of ['channel','pid','name','label','raw','offset','display','value'])check(JSON.stringify(reported[i][k])===JSON.stringify(w[k]),`Final Controllers ${k} differs (${w.name})`);});
  return writes;
}
export function renderControllersText(writes){
  if(!writes?.length)return '';
  const fmt=w=>typeof w.display==='number'?String(Number(w.display.toPrecision(4))):String(w.display);
  return ['','CONTROLLERS (Control plokk, kõik stseenid kasutavad kanalit A):',...writes.map(w=>`  ${w.channel} ${w.label} (${w.name}) = ${fmt(w)}`)].join('\n')+'\n';
}
export function controllersCapabilities(){
  return {field:'controllers',maxWrites:MAX_CONTROLLER_WRITES,record:{...CONTROLLERS_RECORD},parameters:130,
    writable:'taper-class-verified knobs and integers by default; enum-labels selectors with allow:["enum-labels"]; n/a and unverified-taper refused',
    channels:['A','B','C','D'],sceneChannel:'not decoded; composer scenes use channel A',
    hardwareReceipt:{file:'references/fm3-shot-t28-controllers-20261105.json',sha256:controllersReceiptHash,editorReadings:receipt.summary.editorReadingsMatched,deviceWords:receipt.summary.deviceWordsMatched},
    limits:['Modifier source assignment is separate (modifiers)','Tempo, Tempo To Use and Envelope Gain Monitor stay unwritable','Per-scene Controllers channel not decoded']};
}
