// FM3 Controllers block writes (0.3.50, T28 2026-11-05). Offline only.
// The Controllers record (effect id 2, 130 words x 4 channels) is not a grid block: it sits in the preset prefix at
// body offset 452 (46-byte header: id 2, 20 zero words, words 130, channels 4), data 498..1538, before the modifier
// records. T28 (FM3 Mk II, FW13) loaded a preset with 26 distinctive values on channel A and per-channel markers on
// B/C/D into the edit buffer: the fn=0x1F read of effect 2 returned every word unchanged, and FM3-Edit showed exactly
// the expected readings on the LFO 1+2, ADSR 1, Sequencer, Envelope/Manual and Scene Ctrl 1+2 pages; its Controllers
// channel selector A/B/C/D showed copies A/B/C/D (references/fm3-shot-t28-controllers-20261105.json). So word n of a
// copy is dictionary parameter n and the copy is the Controllers channel.
// Writes follow the normal status gate (taper-class-verified knobs by default; option selectors by default since
// 0.3.52, after T28/T30 FM3-Edit readings; n/a and unverified-taper parameters are refused). T33 (2026-11-06,
// references/fm3-t33-controllers-scene-20261106.json) confirmed that header word 5+(scene-1) is the scene's
// Controllers channel (0..3 = A..D), byte-identical after STORE 425 for scenes 1..4 = A..D. controllersScenes
// (0.3.55) writes those 8 header words; scenes 5..8 follow the same layout (the grid-block header, T32), not measured
// on other channels. Without controllersScenes every composer scene keeps channel A.
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
const CHANNELS='ABCD',SCENES=8;
export const CONTROLLERS_SCENE_OFFSET=CONTROLLERS_RECORD.header+10;  // body 462 + 2*(scene-1)
const t33Receipt='references/fm3-t33-controllers-scene-20261106.json',t34Receipt='references/fm3-t34-controllers-sources-20261107.json';
// Tempo To Use switches the preset between its own and the global tempo for every tempo-synced block: not measured.
// Tempo (pid 32) is written only through the tempo field, which sets all four channel copies (T42).
export const CONTROLLERS_REFUSED=Object.freeze({32:'Tempo is set with the tempo field (all four Controllers channels)',33:'Tempo To Use (preset/global tempo source) is not measured'});
// Preset tempo (0.3.60). T42 (2026-11-09, references/fm3-t42-modifier-targets-20261109.json): CONTROLLERS_TEMPO stored
// word = BPM; 97 and 143 written to all four channel copies were shown on the FM3, delay 1/4 followed, and the body was
// byte-identical after STORE/reload. Tempo To Use stays 0 = PRESET (every jb-newlook output; GLOBAL is not written).
const TEMPO_PID=32,TEMPO_TO_USE_PID=33,t42Receipt='references/fm3-t42-modifier-targets-20261109.json';
export const TEMPO_RANGE=Object.freeze([24,250]);
export function validatePresetTempo(v){check(Number.isInteger(v)&&v>=TEMPO_RANGE[0]&&v<=TEMPO_RANGE[1],`tempo must be an integer BPM ${TEMPO_RANGE[0]}…${TEMPO_RANGE[1]}`);return v;}
const tempoOffset=(r,ch,pid)=>r.start+2*(ch*r.words+pid);
export function readPresetTempo(body){
  const r=locateControllers(body),v=[0,1,2,3].map(ch=>body.readUInt16LE(tempoOffset(r,ch,TEMPO_PID)));
  return {bpm:v.every(x=>x===v[0])?v[0]:null,channels:v,tempoToUse:[0,1,2,3].map(ch=>body.readUInt16LE(tempoOffset(r,ch,TEMPO_TO_USE_PID))).every(x=>x===0)?'PRESET':'mixed/GLOBAL'};
}
export function applyPresetTempo(syx,bpm){
  validatePresetTempo(bpm);
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original),r=locateControllers(body),allowed=new Set();
  const before=readPresetTempo(original);check(before.tempoToUse==='PRESET','tempo needs Tempo To Use = PRESET in every Controllers channel');
  for(let ch=0;ch<4;ch++){const o=tempoOffset(r,ch,TEMPO_PID);body.writeUInt16LE(bpm,o);allowed.add(o);allowed.add(o+1);}
  const out=finalizeBody(syx,original,body,allowed),after=readPresetTempo(Buffer.from(inspectStructure(out).raw.body));
  check(after.bpm===bpm&&after.tempoToUse==='PRESET','tempo readback');
  return {syx:out,state:{bpm,channels:4,tempoToUse:'PRESET'},report:{before:before.channels,after:after.channels,offsets:[0,1,2,3].map(ch=>tempoOffset(r,ch,TEMPO_PID)),
    hardware:'T42 2026-11-09: 97 and 143 BPM shown on the FM3 and byte-identical after STORE/reload ('+t42Receipt+'); this output itself not tested'}};
}
export function verifyPresetTempoOutput(body,spec,reported,stage){
  if(!Object.hasOwn(spec,'tempo')){check(reported===undefined&&stage===undefined,'Preset tempo report without spec.tempo');return undefined;}
  const bpm=validatePresetTempo(spec.tempo),actual=readPresetTempo(body);
  check(actual.bpm===bpm&&actual.tempoToUse==='PRESET','Final preset tempo differs from spec');
  check(JSON.stringify(reported)===JSON.stringify({bpm,channels:4,tempoToUse:'PRESET'}),'Final preset tempo report differs');
  check(JSON.stringify(stage?.after)===JSON.stringify(actual.channels),'Preset tempo stage report differs');
  return reported;
}
export function renderPresetTempoText(state){
  if(!state)return '';
  return ['','PRESETI TEMPO:',`  ${state.bpm} BPM (Controllers Tempo kõigis neljas kanalis; Tempo To Use = PRESET). Kodeering seadmel kinnitatud: T42 09.11.2026 (97 ja 143 BPM näidati FM3-l ja säilisid STORE/reload-is baiditäpselt); selle faili import kontrollimata.`].join('\n')+'\n';
}

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
// controllersScenes: ['A','B','C','D'] = Controllers channel of scenes 1..n (n <= 8); unlisted scenes stay A.
export function validateControllersScenes(list){
  check(Array.isArray(list)&&list.length>=1&&list.length<=SCENES,'controllersScenes must be an array of 1…8 channels (scene 1 first)');
  list.forEach((c,i)=>check(typeof c==='string'&&c.length===1&&CHANNELS.includes(c),`controllersScenes[${i}] must be A, B, C or D`));
  return Array.from({length:SCENES},(_,i)=>list[i]??'A');
}
export function readControllersScenes(body){
  locateControllers(body);
  return Array.from({length:SCENES},(_,i)=>{const v=body.readUInt16LE(CONTROLLERS_SCENE_OFFSET+2*i);check(v<4,`Controllers scene ${i+1} channel word ${v} is not 0..3`);return CHANNELS[v];});
}
export function applyControllersScenes(syx,list){
  const wanted=validateControllersScenes(list);
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original);locateControllers(body);
  const before=readControllersScenes(original),allowed=new Set();
  wanted.forEach((c,i)=>{const o=CONTROLLERS_SCENE_OFFSET+2*i;body.writeUInt16LE(CHANNELS.indexOf(c),o);allowed.add(o);allowed.add(o+1);});
  const out=finalizeBody(syx,original,body,allowed),after=readControllersScenes(Buffer.from(inspectStructure(out).raw.body));
  check(after.join('')===wanted.join(''),'Controllers scene channel readback');
  return {syx:out,channels:after,report:{offsets:wanted.map((_,i)=>CONTROLLERS_SCENE_OFFSET+2*i),before,after,
    changedScenes:wanted.map((c,i)=>c===before[i]?null:i+1).filter(Boolean),
    hardware:'T33 2026-11-06: scenes 1..4 = A..D; T34 2026-11-07: scenes 5..8 = D,C,B,D; both shown in FM3-Edit, heard and byte-identical after STORE/reload ('+t33Receipt+', '+t34Receipt+'); this output itself not tested'}};
}
export function verifyControllersScenesOutput(body,spec,reported,stage){
  if(!Object.hasOwn(spec,'controllersScenes')){
    check(reported===undefined&&stage===undefined,'Controllers scene report without spec.controllersScenes');
    if(spec.composer)check(readControllersScenes(body).every(c=>c==='A'),'Controllers scene channel set without controllersScenes');
    return undefined;}
  const wanted=validateControllersScenes(spec.controllersScenes),actual=readControllersScenes(body);
  check(actual.join('')===wanted.join(''),'Final Controllers scene channels differ from spec');
  check(JSON.stringify(reported)===JSON.stringify(actual),'Final Controllers scene report differs');
  check(JSON.stringify(stage?.after)===JSON.stringify(actual),'Controllers scene stage report differs');
  return actual;
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
    hardware:'T28: storage, word order, channels A-D and FM3-Edit readings confirmed for 26 parameters; this output itself not tested',sceneChannel:'controllersScenes (header words 462+2*(scene-1)); without it every scene uses channel A'}};
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
export function renderControllersText(writes,scenes){
  if(!writes?.length&&!scenes)return '';
  const fmt=w=>typeof w.display==='number'?String(Number(w.display.toPrecision(4))):String(w.display);
  const head=scenes?['','CONTROLLERS (Control plokk):',`  Kanal stseeniti 1–8: ${scenes.join(', ')} (seadmel kinnitatud kõigis 8 stseenis: T33 06.11.2026 stseenid 1–4 = A–D, T34 07.11.2026 stseenid 5–8 = D, C, B, D; selle faili import kontrollimata).`]
    :['','CONTROLLERS (Control plokk, kõik stseenid kasutavad kanalit A):'];
  return [...head,...(writes??[]).map(w=>`  ${w.channel} ${w.label} (${w.name}) = ${fmt(w)}`)].join('\n')+'\n';
}
export function controllersCapabilities(){
  return {field:'controllers',maxWrites:MAX_CONTROLLER_WRITES,record:{...CONTROLLERS_RECORD},parameters:130,
    writable:'taper-class-verified knobs, integers and option selectors (T28/T30) by default; n/a and unverified-taper refused',
    channels:['A','B','C','D'],
    sceneChannel:{field:'controllersScenes',values:'array of 1..8 of A|B|C|D, scene 1 first; unlisted scenes stay A',offsets:'body 462+2*(scene-1) (Controllers header word 5+(scene-1))',
      hardware:'T33 2026-11-06 scenes 1..4 = A..D and T34 2026-11-07 scenes 5..8 = D,C,B,D confirmed (FM3-Edit, audible, STORE/reload byte-identical); other patterns follow the same layout',receipt:t33Receipt,receipts:[t33Receipt,t34Receipt]},
    hardwareReceipt:{file:'references/fm3-shot-t28-controllers-20261105.json',sha256:controllersReceiptHash,editorReadings:receipt.summary.editorReadingsMatched,deviceWords:receipt.summary.deviceWordsMatched},
    presetTempo:{field:'tempo',values:'integer BPM 24..250, written to all four Controllers channels; Tempo To Use stays PRESET',hardware:'T42 2026-11-09: 97/143 BPM shown and byte-identical after STORE/reload',receipt:t42Receipt},
    limits:['Controllers as a modifier source: volumePedal.source and modifierTargets','Tempo only through the tempo field; Tempo To Use and Envelope Gain Monitor stay unwritable']};
}
