// Bounded removal/replacement of bindings authored in this same sound generation.
// No arbitrary input preset, free-slot search, record-0 edits, secondary sources or MIDI.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {removeBinding} from './fm3-modifier-removal.mjs';
import {validateControlSwitches,controlSwitchTemplate} from './fm3-control-switches.mjs';
import {volumeSourceName} from './fm3-volume-pedal.mjs';
const fail=(ok,m)=>{if(!ok)throw Error('Modifier edits: '+m);};
const own=(o,k)=>Object.hasOwn(o,k),FIELDS=1584,SIZE=96;
const sha=b=>createHash('sha256').update(b).digest('hex');
export const modifierRegion=body=>Buffer.from(body.subarray(1538,4610));
const words=(body,r)=>Array.from({length:25},(_,i)=>body.readUInt16LE(FIELDS+SIZE*r+2*i));
const keys=(o,allowed,required,label)=>{
 fail(o&&typeof o==='object'&&!Array.isArray(o),label+' must be an object');
 fail(Object.keys(o).every(k=>allowed.includes(k))&&required.every(k=>own(o,k)),label+': invalid fields');
};
const sourceOf=c=>'Control Switch '+c.switch;
const sameTarget=(a,b)=>a.block===b.block&&a.param===b.param;

// The effective spec describes final bindings; the original spec retains the full
// authored preimage and edit request for deterministic replay and audit.
export function effectiveModifierSpec(spec){
 if(!own(spec??{},'modifierEdits'))return spec;
 fail(spec.composer,'sound composer is required');
 const list=spec.modifierEdits;
 fail(Array.isArray(list)&&list.length>=1&&list.length<=9,'modifierEdits must contain 1..9 edits');
 const effective={...spec};delete effective.modifierEdits;
 const original=spec.controlSwitches??[];
 if(own(spec,'controlSwitches'))validateControlSwitches(original);
 const removed=new Set(),replacements=[],seen=new Set();let removeVolume=false;
 for(const [i,e] of list.entries()){
  keys(e,['operation','record','expect','binding'],['operation','record','expect'],'edit '+i);
  fail(['remove','replace'].includes(e.operation),'operation must be remove or replace');
  fail(Number.isInteger(e.record)&&e.record>=1&&e.record<=9,'record must be 1..9; record 0 is not editable');
  fail(!seen.has(e.record),'record edited twice');seen.add(e.record);
  keys(e.expect,['source','block','param'],['source','block','param'],'expect');
  const v=e.expect;
  if(v.block==='volpan'&&v.param==='VOLUME_GAIN'&&v.source===volumeSourceName(spec.volumePedal)){
   fail(e.record===1&&own(spec,'volumePedal')&&spec.composer.modifiers?.external1Wah===true,'Volume edit requires the generated Volume binding in record 1 next to Wah');
   fail(!removeVolume,'Volume binding edited twice');removeVolume=true;
  }else{
   const matches=original.map((c,j)=>({c,j})).filter(({c})=>sourceOf(c)===v.source&&sameTarget(c,v));
   fail(matches.length===1,'expect must identify a declared Control Switch or record-1 Volume binding');
   const j=matches[0].j;fail(!removed.has(j),'binding edited twice');removed.add(j);
  }
  if(e.operation==='remove')fail(!own(e,'binding'),'remove must not contain binding');
  else{
   fail(own(e,'binding'),'replace requires binding');
   validateControlSwitches([e.binding]);replacements.push(e.binding);
  }
 }
 if(removeVolume)delete effective.volumePedal;
 const final=original.filter((_,i)=>!removed.has(i)).concat(replacements);
 if(final.length){validateControlSwitches(final);effective.controlSwitches=final;}
 else delete effective.controlSwitches;
 return effective;
}

export function applyModifierEdits(syx,spec,{pedal=null,switches=null}={}){
 const effective=effectiveModifierSpec(spec);
 fail(own(spec,'modifierEdits'),'modifierEdits required');
 const decoded=inspectStructure(syx),original=Buffer.from(decoded.raw.body);
 fail(decoded.raw.crcValid,'input CRC');
 const mods=readModifiers(original),authored=new Map();
 if(pedal)authored.set(pedal.record,{source:pedal.state.sourceName,block:'volpan',param:'VOLUME_GAIN',words:pedal.state.words});
 for(const w of switches?.writes??[])authored.set(w.record,{source:sourceOf(w),block:w.block,param:w.param,words:[...w.after,65534,65534,0,0]});
 // Validate every preimage before the first mutation; a caller cannot replace a
 // secondary-source or changed record merely by naming its public target.
 for(const e of spec.modifierEdits){
  const a=authored.get(e.record),m=mods[e.record];
  fail(a&&a.source===e.expect.source&&sameTarget(a,e.expect),'record does not match the declared authored binding');
  fail(m.active&&!m.uncertain&&m.secondarySource===0&&m.operation===0,'active single-source binding required');
  assert.deepEqual(words(original,e.record),a.words,'Modifier edits: authored record preimage changed');
 }
 let body=Buffer.from(original);
 // Clear all selected bindings first; conflict rules apply to the final set,
 // independently of request order. There is no implicit allocation or compaction.
 for(const e of spec.modifierEdits)body=removeBinding(body,e.record).body;
 for(const e of spec.modifierEdits.filter(e=>e.operation==='replace')){
  const target=validateControlSwitches([e.binding])[0];
  fail(!readModifiers(body).some(m=>m.active&&m.effectId===target.effectId&&m.pid===target.pid),'replacement target already has a binding');
  const template=controlSwitchTemplate(e.binding),old=words(body,e.record);
  assert.deepEqual(old.slice(21),template.slice(21),'Modifier edits: reserved tail differs');
  template.slice(0,21).forEach((w,i)=>body.writeUInt16LE(w,FIELDS+SIZE*e.record+2*i));
 }
 const changes=spec.modifierEdits.map(e=>({operation:e.operation,record:e.record,expect:e.expect,...(e.binding?{binding:e.binding}:{}),before:words(original,e.record),after:words(body,e.record),writtenWords:e.operation==='remove'?[0,8,9]:Array.from({length:21},(_,i)=>i)}));
 const allowed=new Set(changes.flatMap(c=>c.writtenWords.flatMap(w=>[FIELDS+SIZE*c.record+2*w,FIELDS+SIZE*c.record+2*w+1])));
 for(let i=0;i<body.length;i++)if(body[i]!==original[i])fail(allowed.has(i),'write escaped declared words');
 const out=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(decoded.raw.rawPatch,body))),after=inspectStructure(out);
 fail(after.raw.crcValid&&Buffer.from(after.raw.body).equals(body),'output CRC/body readback');
 assert.deepEqual(after.parsed.headerPayload,decoded.parsed.headerPayload,'Modifier edits: dump header changed');
 return {syx:out,effectiveSpec:effective,region:modifierRegion(body),report:{policy:'authored-binding-edits-fw13',changes,
  beforeRegionSha256:sha(modifierRegion(original)),afterRegionSha256:sha(modifierRegion(body)),
  onlyDeclaredWordsChanged:true,recordHeadersAndTailsPreserved:true,recordCount:32,compacted:false,deviceIO:false,
  evidence:['references/fm3-modifier-removal-20261028.json','references/fm3-mod-steps-20261029.json','references/p3-modifier-reuse-20261030/FM3_P3_seadmekatse_kviitung_2026-10-30.json'],
  hardwareScope:'P3 confirms record-2 Boost removal and record-1 Volume replacement with CS2 -> Amp Cut in one fixed preset; other authored combinations are offline-verified only'}};
}
export function renderModifierEditsText(state){
 if(!state)return [];
 return ['','MODIFIKAATORISEOSTE MUUDATUSED — LÕPPFAILIST',...state.changes.map(c=>`Kirje ${c.record}: ${c.expect.source} → ${c.expect.block}.${c.expect.param} ${c.operation==='remove'?'eemaldatud (Source ja sihtmärk NONE)':`asendatud: Control Switch ${c.binding.switch} → ${c.binding.block}.${c.binding.param}; uue seose vaikemall`}.`),
  'Kõik 32 kirjet ja nende järjestus säilivad; kirje päis ja reserveeritud lõpusõnad säilivad. Taaskasutamisel asendatakse vana Min/Max ja kõver uue seose malliga.',
  'P3 varasem seadmetõend: Boost kirje 2 eemaldamine ja Volume kirje 1 taaskasutus CS2 → Amp Cut jaoks. Teisi uusi kombinatsioone on kontrollitud seadmevabalt; selle faili importi ja heli ei ole kinnitatud.'];
}
export function verifyModifierEditsOutput(report,syx,txt,spec){
 const effective=effectiveModifierSpec(spec),state=report.modifierEdits;
 if(!own(spec??{},'modifierEdits')){fail(!state&&!report.stages?.modifierEdits,'unrequested edit report');return {spec:effective};}
 fail(state?.policy==='authored-binding-edits-fw13','missing edit policy');
 assert.deepEqual(state,report.stages.modifierEdits,'Modifier edits: stage mismatch');
 const body=Buffer.from(inspectStructure(syx).raw.body),region=modifierRegion(body);
 fail(sha(region)===state.afterRegionSha256,'final modifier region differs');
 for(const c of state.changes)assert.deepEqual(words(body,c.record),c.after,'Modifier edits: final record differs');
 for(const line of renderModifierEditsText(state).filter(Boolean))fail(txt.includes(line),'TXT edit summary differs');
 // Called only after full deterministic replay has authenticated these fields
 // against the requested spec and the bundled base, never as a standalone oracle.
 return {spec:effective,region};
}
export function modifierEditsCapabilities(){return {field:'modifierEdits',operations:['remove','replace'],records:'1..9, explicitly identified, authored during this same generation',
 expect:'{source: the volumePedal source (default External 1)|Control Switch 1..6, block: volpan|amp, param: VOLUME_GAIN|supported Amp switch}',replacement:'binding: existing controlSwitches entry; full template replaces words 0..20',
 removalWords:[0,8,9],preserved:'all other bytes, 32 record headers, words 21..24 and record order',
 notSupported:['record 0','arbitrary preset editing','free-slot allocation','secondary sources','unknown record layouts'],deviceIO:false};}
