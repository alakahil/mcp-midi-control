// Bounded dependency checks. Reads modifier records; never writes controller data.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const dependencyPolicyHash='0a209c8709b043500cf222252a1ee98abaff389a39c014d936e350e32cbedab6';
const bytes=fs.readFileSync(new URL('../references/fm3-parameter-dependencies.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==dependencyPolicyHash)throw Error('Parameter dependency policy changed; review and regenerate');
const policy=JSON.parse(bytes);
export const tempoLocks=Object.freeze(policy.tempoLocks.map(Object.freeze));
export function dependencyPolicySummary(){return {sha256:dependencyPolicyHash,firmware:policy.firmware,tempoPairs:tempoLocks.length,
  families:[...new Set(tempoLocks.map(r=>r.family))],modifierMode:'read-only; reject explicit writes to active or uncertain targets',
  serializedModifierRecords:policy.modifiers.layout.records,limits:policy.limits};}
export function readModifiers(body){
  const l=policy.modifiers.layout,result=[];
  if(body.length<l.end)throw Error('Unsupported modifier record layout');
  for(let i=0;i<l.records;i++){
    const at=l.header+i*l.recordBytes,start=at+l.headerBytes;
    if(body.readUInt16LE(at)!==l.firstId+i||body.subarray(at+2,at+42).some(x=>x!==0)||body.readUInt16LE(at+42)!==l.words||body.readUInt16LE(at+44)!==1)throw Error('Unsupported modifier record layout at '+i);
    const word=p=>body.readUInt16LE(start+2*p),source=word(0),secondarySource=word(20),channel=word(17);
    const active=source!==0||secondarySource!==0,operation=word(23);
    const uncertain=active&&(secondarySource!==0||operation!==0||source>=policy.modifiers.sources.length||channel>=policy.modifiers.channels.length||word(8)===0);
    result.push({record:i,effectId:word(8),pid:word(9),source,sourceName:policy.modifiers.sources[source]??'unknown',secondarySource,operation,
      channel,channelScope:policy.modifiers.channels[channel]??'unknown',active,uncertain,offset:start});
  }
  return result;
}
const applies=(m,eid,pid,ch)=>m.active&&(m.effectId===eid||m.effectId===0)&&m.pid===pid&&(m.channel===0||m.channel>4||m.channel==='ABCD'.indexOf(ch)+1);
export function dependencyState(body,w,{planned=new Map(),modifiers=readModifiers(body)}={}){
  const r=tempoLocks.find(r=>r.effectId===w.effectId&&r.targetPid===w.pid);
  const mods=modifiers.filter(m=>applies(m,w.effectId,w.pid,w.channel));
  let tempo;
  if(r){const at=w.offset+2*(r.tempoPid-w.pid),raw=planned.get(at)??body.readUInt16LE(at);
    tempo={name:r.tempo,pid:r.tempoPid,raw,label:r.labels[raw]??'unknown',manual:raw===r.noneRaw,known:raw<r.labels.length};}
  const mode=mods.length?'modifier':tempo&&!tempo.manual?'tempo':'stored';
  return {mode,tempo,modifiers:mods,scope:'Stored word only; no DSP/controller evaluation',
    blocked:mods.length?'modifier-controlled':tempo&&!tempo.manual?'tempo-controlled':null};
}
export function validateDependencyWrites(body,writes){
  if(!writes.length)return;
  const planned=new Map(writes.map(w=>[w.offset,w.raw])),modifiers=readModifiers(body);
  for(const w of writes){
    const d=dependencyState(body,w,{planned,modifiers});
    if(d.blocked)throw Error(`${w.block} ${w.channel} ${w.name}: ${d.blocked}; ${d.tempo&&!d.tempo.manual?'final Tempo must be NONE':'explicit static write conflicts with active or uncertain modifier'}`);
    for(const r of tempoLocks.filter(r=>r.effectId===w.effectId&&r.tempoPid===w.pid)){
      if(!Number.isInteger(w.raw)||w.raw<0||w.raw>=r.labels.length)throw Error(w.name+': unknown Tempo enum');
      if(w.raw!==r.noneRaw&&modifiers.some(m=>applies(m,w.effectId,r.targetPid,w.channel)))throw Error(w.name+': tempo conflicts with modifier-controlled target');
    }
    w.dependencies=d;
  }
}
// Recheck explicit legacy fields after templates and again after sound-table writes.
export function validateLegacyDependencies(body,blocks,spec){
  const fields=[['delayTimeMs','delay','DELAY_TIME'],['reverbPredelayMs','reverb','REVERB_PREDELAY'],['rateHz','rotary','ROTARY_RATE']];
  const writes=[];
  for(const [field,block,name] of fields){
    const requested=block==='rotary'?spec.rotaryA:spec;
    if(!requested||!Object.hasOwn(requested,field))continue;
    const r=tempoLocks.find(r=>r.target===name),l=blocks[block];
    if(!l)throw Error('Missing legacy dependency block: '+block);
    const offset=l.start+2*r.targetPid;
    writes.push({block,channel:'A',name,pid:r.targetPid,effectId:r.effectId,offset,raw:body.readUInt16LE(offset)});
  }
  validateDependencyWrites(body,writes);
}
