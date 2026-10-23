// Tempo locks for the point-6 insertable families (Plex, Ten-Tap). Same rule as
// fm3-parameter-dependencies: an explicit write to a locked target requires the final
// channel Tempo to be NONE. Source: FM3-Edit 1.07.17 layout XML (tools/fm3/insert_tempo_locks.py).
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const insertTempoHash='059e30a1102e5f6c16bbbcf5a6edd2140119e8a004573b8bcee32bf2ae615b0d';
const bytes=fs.readFileSync(new URL('../references/fm3-insert-tempo-locks.json',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==insertTempoHash)throw Error('Insert tempo locks changed; regenerate with tools/fm3/insert_tempo_locks.py');
export const insertTempoLocks=Object.freeze(JSON.parse(bytes).tempoLocks.map(Object.freeze));
// writes: [{effectId,pid,channel,offset,raw,name}] as built by applyTableControls
export function validateInsertedTempo(body,writes){
  const planned=new Map(writes.map(w=>[w.offset,w.raw]));
  for(const w of writes){
    const r=insertTempoLocks.find(r=>r.effectId===w.effectId&&r.targetPid===w.pid);if(!r)continue;
    const at=w.offset+2*(r.tempoPid-w.pid),raw=planned.get(at)??body.readUInt16LE(at);
    if(raw!==r.noneRaw)throw Error(`${w.block} ${w.channel} ${w.name}: tempo-controlled by ${r.tempo} = ${r.labels[raw]?.trim()??raw}; set ${r.tempo} to NONE in the same spec`);
  }
}
export function insertTempoState(effectId,pid,read){
  const r=insertTempoLocks.find(r=>r.effectId===effectId&&r.targetPid===pid);if(!r)return null;
  const raw=read(r.tempoPid);return {name:r.tempo,raw,label:r.labels[raw]??'unknown',manual:raw===r.noneRaw};
}
