// Read stored A-D type state against existing authoring policies. No write gates.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readTypeState,typeApplicability,typePolicyHash,templateOnlyParameter} from './fm3-type-applicability.mjs';
import {algorithmPolicyHash} from './fm3-delay-reverb-applicability.mjs';
import {modulationPolicyHash} from './fm3-modulation-dynamics-applicability.mjs';
import {rotaryPitchPolicyHash} from './fm3-rotary-pitch-applicability.mjs';
import {pitchCustomScaleHash} from './fm3-pitch-custom-scales.mjs';
import {insertPolicyHash} from './fm3-insert-applicability.mjs';
const hashes={
  'fm3-type-applicability.json':typePolicyHash,
  'fm3-delay-reverb-applicability.json':algorithmPolicyHash,
  'fm3-modulation-dynamics-applicability.json':modulationPolicyHash,
  'fm3-rotary-pitch-applicability.json':rotaryPitchPolicyHash,
  'fm3-pitch-custom-scales.json':pitchCustomScaleHash,
  'fm3-insert-applicability.json':insertPolicyHash
};
const policies=Object.fromEntries(Object.entries(hashes).map(([file,hash])=>{
  const bytes=fs.readFileSync(new URL('../references/'+file,import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Modifier type audit metadata changed: '+file);
  return [file,JSON.parse(bytes)];
}));
const families=Object.assign({},...Object.values(policies).map(p=>p.families??{}));
const notes=policies['fm3-pitch-custom-scales.json'].rules.notes;
export function modifierTypeAuditPolicy(){return {
  firmware:13,families:Object.keys(families),sha256:{...hashes},
  scope:'Stored channel state against bounded FW13 authoring policies; not a modifier-support or DSP test',
  modifierSupportVerified:false,grantsWritePermission:false
};}
export function auditModifierTargetType(body,m,p,record){
  if(m.effectId===0)return null;
  const f=families[p?.family],covered=!!f;
  const reason=!p?'target-parameter-unknown':!covered?'family-not-covered':!record?'target-record-unresolved':
    record.channels!==4?'channel-layout-unsupported':p.param>=record.words?'target-word-out-of-bounds':null;
  const channels=reason?[]:Array.from({length:4},(_,i)=>{
    const selectorWords={};let outOfBounds=false;
    const state=readTypeState(p,pid=>{
      if(!Number.isInteger(pid)||pid<0||pid>=record.words){outOfBounds=true;return null;}
      const raw=body.readUInt16LE(record.start+2*(i*record.words+pid));
      selectorWords[pid]=raw;return raw;
    });
    const result=typeApplicability(p,state);
    // Unknown enums must not turn into a definite exclusion. Extra selectors
    // are checked conservatively even when a particular page does not use them.
    const validType=typeof state==='number'?Number.isInteger(state)&&state>=0&&state<f.types.length:result.stateValid===true;
    const validSelectors=Object.entries(f.selectors??{}).every(([pid,s])=>s.values.includes(state?.[pid]));
    const customNote=p.family==='PITCH'&&notes.pids.includes(p.param);
    const validNoteContext=!customNote||!notes.types.includes(state?.[0])||
      (Number.isInteger(state?.[notes.scalePid])&&state[notes.scalePid]>=0&&state[notes.scalePid]<=notes.customScaleCode&&
       (state[notes.scalePid]!==notes.customScaleCode||
        (Number.isInteger(state[notes.countPid])&&state[notes.countPid]>=notes.countMin&&state[notes.countPid]<=notes.countMax)));
    const known=!outOfBounds&&validType&&validSelectors&&validNoteContext;
    return {channel:'ABCD'[i],inModifierScope:m.channel>4?null:m.channel===0||m.channel===i+1,
      status:!known?'unknown':result.allowed?'available':'excluded',
      reason:outOfBounds?'selector-word-out-of-bounds':!validType?'unknown-or-mismatched-type':
        !validSelectors?'unknown-selector':!validNoteContext?'unknown-custom-note-context':'FW13-authoring-policy',
      selectorWords,typeId:result.typeId??null,typeName:result.typeName??null,
      modelId:result.modelId??null,label:result.label??p.label,
      templateOnly:templateOnlyParameter(p),policyReason:result.reason??null,
      blockedReason:result.blockedReason??null};
  });
  return {status:reason?'unresolved':'evaluated',reason,policyCovered:covered,
    modifierSupportVerified:false,scopeKnown:m.channel<=4,channels,
    scopedExcludedChannels:channels.filter(c=>c.inModifierScope===true&&c.status==='excluded').map(c=>c.channel),
    scopedUnknownChannels:channels.filter(c=>c.inModifierScope===true&&c.status==='unknown').map(c=>c.channel)};
}
