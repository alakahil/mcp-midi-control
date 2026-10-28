// Remove one modifier binding the way the FM3 itself leaves a removed record (codec only; offline).
// Evidence: references/fm3-modifier-removal-20261028.json. In a FW13 tonepack all 652 initialised but
// inactive records have source, target effect ID and target PID = 0 (words 0, 8, 9) and keep every other
// word; 265 sit between active records, so removal does not compact the list. This module writes exactly
// that: words 0, 8 and 9 of one active, certain record become 0; nothing else in the body changes.
// No generator field uses it yet: generated presets start from bases without the binding to remove.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
const check=(ok,m)=>{if(!ok)throw Error('Modifier removal: '+m);};
const bytes=fs.readFileSync(new URL('../references/fm3-modifier-removal-20261028.json',import.meta.url));
export const modifierRemovalHash='585ac02a39738b6f7c4d5bcccbb411b59f7b64d30f0f3574253926fd28913675';
check(createHash('sha256').update(bytes).digest('hex')===modifierRemovalHash,'evidence drift');
const evidence=JSON.parse(bytes),FIELDS0=1584,RECORD=96;
export const REMOVAL_WORDS=Object.freeze([...evidence.removalForm.clearedWords]);
export function removeBinding(body,record){
  check(Buffer.isBuffer(body)&&Number.isInteger(record)&&record>=0&&record<32,'body and record 0..31 required');
  const m=readModifiers(body)[record];
  check(m.active&&!m.uncertain&&m.secondarySource===0&&m.operation===0,'record '+record+' is not an active, single-source binding');
  const out=Buffer.from(body),at=FIELDS0+RECORD*record;
  const before=REMOVAL_WORDS.map(i=>body.readUInt16LE(at+2*i));
  for(const i of REMOVAL_WORDS)out.writeUInt16LE(0,at+2*i);
  for(let o=0;o<body.length;o++)if(out[o]!==body[o])check(o>=at&&o<at+50&&REMOVAL_WORDS.includes((o-at)>>1),'byte outside the removal words changed at '+o);
  const after=readModifiers(out)[record];check(!after.active&&after.effectId===0&&after.pid===0,'readback');
  return {body:out,removed:{record,source:m.sourceName,effectId:m.effectId,pid:m.pid,clearedWords:REMOVAL_WORDS,previous:before},evidenceSha256:modifierRemovalHash};
}
