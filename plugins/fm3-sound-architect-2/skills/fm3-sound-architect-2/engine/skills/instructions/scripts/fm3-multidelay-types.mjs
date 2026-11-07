// Multi Delay Type (0.3.56): FM3-Edit "Type" (MULTITAP_PRESETS, pid 114, 39 choices) as a full-channel template.
// T35 (2026-11-07, references/fm3-t35-multidelay-presets-20261107.json) chose every Type on the device-default Multi Delay
// channel and read the block back (fn=0x1F): each Type is a measured 121-word channel image (0..44 words differ from
// the default; Pealing Bells repeated T27 byte for byte, Types 1..3 equal the MD_TYPES export). A Type is never a
// selector write (the stored word alone fills nothing, T27): multidelayTypes replaces all 121 words of the channel with
// the measured image before layout/controls, so controls apply on top of it. The Algorithm (pid 0) belongs to the Type
// and may not be changed afterwards; MULTITAP_PRESETS stays refused in controls.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {finalizeBody,scanRecords} from './fm3-layout.mjs';
import {assertFields} from './fm3-table-encoder.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export const MULTIDELAY_TYPES_RECEIPT='references/fm3-t35-multidelay-presets-20261107.json';
export const multidelayTypesReceiptHash='5877c6980d34ce7edd6e2f5bb453d8232f0da1b5721f7babf7cf7b0ab2f209c9';
const bytes=fs.readFileSync(new URL('../'+MULTIDELAY_TYPES_RECEIPT,import.meta.url));
check(createHash('sha256').update(bytes).digest('hex')===multidelayTypesReceiptHash,'Multi Delay Type receipt changed; run tools/fm3/t35-multidelay-presets-ingest.mjs and review');
const receipt=JSON.parse(bytes),WORDS=121,EID=74,CHANNELS='ABCD';
const TYPES=receipt.presets.map(p=>Object.freeze({index:p.index,label:p.label,algorithm:p.algorithm,words:Object.freeze([...p.words]),changed:p.changedPids.length}));
check(TYPES.length===39&&TYPES.every((t,i)=>t.index===i&&t.words.length===WORDS&&t.words[114]===i),'Multi Delay Type table');
const byLabel=new Map(TYPES.map(t=>[t.label.toLowerCase(),t]));
export const MULTIDELAY_TYPE_LABELS=Object.freeze(TYPES.map(t=>t.label));
export function multidelayType(name){
  check(typeof name==='string'&&byLabel.has(name.trim().toLowerCase()),'multidelayTypes type must be one of: '+MULTIDELAY_TYPE_LABELS.join(', '));
  return byLabel.get(name.trim().toLowerCase());
}
// multidelayTypes: [{channel:'A',type:'Pealing Bells'}, ...] (1..4, one entry per channel)
export function validateMultidelayTypes(list){
  check(Array.isArray(list)&&list.length>=1&&list.length<=4,'multidelayTypes must be an array of 1…4 {channel,type}');
  const seen=new Set();
  return list.map(e=>{assertFields(e,['channel','type'],'multidelayTypes entry');
    check(typeof e.channel==='string'&&e.channel.length===1&&CHANNELS.includes(e.channel),'multidelayTypes channel must be A, B, C or D');
    check(!seen.has(e.channel),'multidelayTypes: channel '+e.channel+' listed twice');seen.add(e.channel);
    return {channel:e.channel,type:multidelayType(e.type)};});
}
function locate(body){
  const r=scanRecords(body,{requireAmpCab:false}).records.find(x=>x.eid===EID);
  check(r,'multidelayTypes needs a Multi Delay block (insert:["multidelay"] or grid add)');
  check(r.words===WORDS&&r.channels===4,'Multi Delay record shape');return r;
}
const channelWords=(body,r,ch)=>[...Array(WORDS).keys()].map(i=>body.readUInt16LE(r.start+2*(ch*WORDS+i)));
export function applyMultidelayTypes(syx,list){
  const wanted=validateMultidelayTypes(list);
  const original=Buffer.from(inspectStructure(syx).raw.body),body=Buffer.from(original),r=locate(body),allowed=new Set();
  const channels=wanted.map(({channel,type})=>{
    const ch=CHANNELS.indexOf(channel),before=channelWords(original,r,ch);
    type.words.forEach((w,i)=>{const o=r.start+2*(ch*WORDS+i);body.writeUInt16LE(w,o);allowed.add(o);allowed.add(o+1);});
    return {channel,type:type.label,index:type.index,algorithm:type.algorithm,wordsChanged:before.filter((w,i)=>w!==type.words[i]).length};
  });
  const out=finalizeBody(syx,original,body,allowed),rb=Buffer.from(inspectStructure(out).raw.body),r2=locate(rb);
  for(const {channel,type} of wanted)check(channelWords(rb,r2,CHANNELS.indexOf(channel)).every((w,i)=>w===type.words[i]),'Multi Delay Type readback '+channel);
  return {syx:out,channels,report:{stage:'fm3-multidelay-types 0.1.0',receipt:MULTIDELAY_TYPES_RECEIPT,receiptSha256:multidelayTypesReceiptHash,channels,
    rule:'all 121 words of the channel replaced by the measured T35 image; controls apply afterwards',
    hardware:'T35 2026-11-07: every image read back from the FM3 after choosing the Type on the device-default channel; this output itself not tested',audio:'not tested'}};
}
// Final check: the Type word and its Algorithm must still be the template's (controls may change other words).
export function verifyMultidelayTypesOutput(body,spec,reported,stage){
  if(!Object.hasOwn(spec,'multidelayTypes')){check(reported===undefined&&stage===undefined,'Multi Delay Type report without spec.multidelayTypes');return undefined;}
  const wanted=validateMultidelayTypes(spec.multidelayTypes),r=locate(body);
  for(const {channel,type} of wanted){const w=channelWords(body,r,CHANNELS.indexOf(channel));
    check(w[114]===type.index,'Multi Delay '+channel+': Type word differs from '+type.label);
    check(w[0]===type.words[0],'Multi Delay '+channel+': Algorithm changed after Type '+type.label+'; do not set MULTITAP_BASETYPE on a channel with multidelayTypes');}
  check(JSON.stringify(reported)===JSON.stringify(stage?.channels),'Multi Delay Type report differs from stage');
  check(JSON.stringify(reported?.map(c=>[c.channel,c.type]))===JSON.stringify(wanted.map(w=>[w.channel,w.type.label])),'Multi Delay Type report differs from spec');
  return reported;
}
export function renderMultidelayTypesText(channels){
  if(!channels?.length)return '';
  return ['','MULTI DELAY TYPE (terve kanali mall):',...channels.map(c=>`  Kanal ${c.channel}: ${c.type} (Type nr ${c.index+1}, Algorithm ${c.algorithm}; ${c.wordsChanged} sõna erines vaikimisi kanalist).`),
    '  Mall on T35 07.11.2026 seadmelt loetud kanal pärast Type valikut vaikimisi kanalil; selle faili import ja heli on kontrollimata. Controls rakenduvad malli peale.'].join('\n')+'\n';
}
export function multidelayTypesCapabilities(){
  return {field:'multidelayTypes',values:'[{channel:"A".."D",type:<label>}], one per channel',types:MULTIDELAY_TYPE_LABELS,
    rule:'full-channel template (121 words) from the T35 device reads; applied before layout/controls; Algorithm stays the Type\'s',receipt:MULTIDELAY_TYPES_RECEIPT,
    hardware:'T35 2026-11-07: 39/39 images read from the FM3; Pealing Bells = T27, Types 1..3 = MD_TYPES export; generated output not tested'};
}
