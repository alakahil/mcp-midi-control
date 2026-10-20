// Pinned FW13 context rules and a data-only global GET plan. No device transport.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const pitchCustomScaleHash='3d184e65494dbb74ee225a8eaf03a115ffa71e746902a2e88a86b0f1d5eb1aa7';
const bytes=fs.readFileSync(new URL('../references/fm3-pitch-custom-scales.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==pitchCustomScaleHash)throw Error('Pitch custom-scale evidence changed; review and regenerate');
const receipt=JSON.parse(bytes),notes=receipt.rules.notes,global=receipt.rules.global;
export const isCustomNote=pid=>notes.pids.includes(pid);
export const pitchCustomScaleSummary=()=>({sha256:pitchCustomScaleHash,noteFields:7,globalReadAddresses:384,scope:receipt.scope,limits:receipt.limits});
export function validateCustomOffsets(count,offsets){
  if(!Number.isInteger(count)||count<4||count>8)throw Error('Custom scale count must be an integer 4..8');
  if(!Array.isArray(offsets)||offsets.length<count-1)throw Error('Complete final custom scale is required');
  let previous=0;
  for(let i=1;i<count;i++){
    const value=offsets[i-1],min=previous+1,max=12-count+i;
    if(!Number.isInteger(value)||value<min||value>max)throw Error(`Custom NOTE${i+1}: final semitone offset must be ${min}..${max}; got ${value}`);
    previous=value;
  }
}
export function customNoteApplicability(pid,state){
  if(!isCustomNote(pid))return null;
  const count=state?.[63];
  const allowed=notes.types.includes(state?.[0])&&state?.[9]===17&&Number.isInteger(count)&&count>=4&&count<=8&&pid-62<=count;
  return {allowed,reason:allowed?'Active local custom-scale note; whole-scale validation is also required':'Custom note requires SCALE=CUSTOM and an active note slot (CUSTOMNOTES 4..8)'};
}
// Read every channel from the complete planned state before callers mutate bytes.
export function validatePitchCustomWrites(body,writes){
  const planned=new Map(writes.map(w=>[w.offset,w.raw])),groups=new Map();
  for(const w of writes.filter(w=>w.block==='pitch')){
    if(w.pid===63||isCustomNote(w.pid)||(w.pid===9&&w.raw===17)){
      const base=w.offset-2*w.pid;
      if(!groups.has(base))groups.set(base,[]);
      groups.get(base).push(w);
    }
  }
  for(const [base,group] of groups){
    const read=pid=>planned.get(base+2*pid)??body.readUInt16LE(base+2*pid);
    const state={0:read(0),9:read(9),63:read(63)};
    for(const w of group){const a=customNoteApplicability(w.pid,state);if(a&&!a.allowed)throw Error(`${w.name}: ${a.reason}`);}
    validateCustomOffsets(state[63],notes.pids.map(read));
  }
}
export function planGlobalScaleReads(scales){
  if(!Array.isArray(scales)||scales.some(n=>!Number.isInteger(n)||n<1||n>32))throw Error('Global scale numbers must be integers 1..32');
  const unique=[...new Set(scales)].sort((a,b)=>a-b);
  const requests=unique.flatMap(scale=>global.noteOrder.map((note,noteIndex)=>({operation:'GET',effectId:1,pid:902+12*(scale-1)+noteIndex,scale,noteIndex,note})));
  return {schemaVersion:1,firmware:'13.0',status:'plan-only',executed:false,deviceIO:false,selectorWrites:0,liveGetEncodingVerified:false,
    evidenceSha256:pitchCustomScaleHash,scales:unique,requestCount:requests.length,requests,
    limits:'Firmware/native address mapping only. A future transport must verify response identity, encoding and range before accepting contents. This script sends no commands.'};
}
export function globalScaleDependencies(channels){
  const uses=[];
  for(const block of channels.filter(b=>b.block==='pitch'))for(const ch of block.channels){
    if(ch.words[0]!==11)continue;
    for(const pid of [71,72]){
      const raw=ch.words[pid],valid=Number.isInteger(raw)&&raw>=0&&raw<=31;
      uses.push({channel:ch.channel,voice:pid-70,storedIndex:raw,scale:valid?raw+1:null,valid,scope:'stored channel; may be inactive in scenes'});
    }
  }
  return {uses,contentsIncluded:false,contentsVerified:false,readPlan:planGlobalScaleReads(uses.filter(u=>u.valid).map(u=>u.scale))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(!(args.length===1&&args[0]==='--all')&&!(args.length===2&&args[0]==='--scales'&&/^\d+(,\d+)*$/.test(args[1])))throw Error('Usage: node fm3-pitch-custom-scales.mjs --scales 1,32 | --all');
  const scales=args[0]==='--all'?Array.from({length:32},(_,i)=>i+1):args[1].split(',').map(Number);
  console.log(JSON.stringify(planGlobalScaleReads(scales),null,2));
}
