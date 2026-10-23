// Only the existing, export-crosschecked External 1 -> Wah Control binding.
// No device I/O, new records, arbitrary curves or controller configuration.
// Bounded point authoring uses retained native bindings and reviewed FW13 captures.
import {planWahExact,exactWahCapability,renderWahExact} from './fm3-wah-minmax-exact.mjs';
import {readModifiers,dependencyPolicyHash} from './fm3-parameter-dependencies.mjs';
import {createHash} from 'node:crypto';
import {wahMeasuredFields,measuredControlsCapability,planMeasuredControls,renderMeasuredControls} from './fm3-wah-measured-controls.mjs';
export {matchWahMeasuredDeviceBody} from './fm3-wah-measured-controls.mjs';
const check=(v,m)=>{if(!v)throw Error('Wah modifier: '+m)};
export const wahAutoEngageCodes=Object.freeze({'OFF':0,'MED SPD':2});
const autoLabel=code=>Object.keys(wahAutoEngageCodes).find(k=>wahAutoEngageCodes[k]===code);
export const wahDampingCodes=Object.freeze({'EXPONENTIAL':0,'LINEAR':1});
const dampingLabel=code=>Object.keys(wahDampingCodes).find(k=>wahDampingCodes[k]===code);
// Exact captured words, not a general numeric codec or interpolated scale.
export const wahMinCodes=Object.freeze({'0':0,'2.5':16375});
const minDisplay=code=>Number(Object.keys(wahMinCodes).find(k=>wahMinCodes[k]===code));
export function matchWahMinDeviceBody(body){
  if(createHash('sha256').update(body).digest('hex')!=='cd352d25d04a9bb281b3a19b8753d4dcb47a05e57a14cca41afeee9796c6c763')return null;
  return {file:'examples/FM3_MOD_MIN_2p50_export.syx',sha256:'11fcb7084d099429f845d7ef27b31d6bd74fa3883cfd5dec27424d771a5cdf13',
    scope:'Entire body identical to user FW13 Min 2.50 / LINEAR / OFF export, 2026-10-21; generated file not separately reimported',
    submittedFileConfirmed:false,audio:'not tested',cpu:'not validated',modifierBehavior:'not tested'};
}
export function matchWahDampingDeviceBody(body){
  if(createHash('sha256').update(body).digest('hex')!=='36e5e13b233db49784ce8ca17e78335871a66fc4c84c928ad23a3bc4f9af69d8')return null;
  return {file:'examples/FM3_MOD_DAMPING_LINEAR_export.syx',sha256:'f2d59758cbe24ef1bd38453968d2b2f974e3da64424fae23cedb190f2162fc5d',
    scope:'Entire body identical to user FW13 Damping LINEAR / Auto Engage OFF export, 2026-10-21; generated file not separately reimported',
    submittedFileConfirmed:false,audio:'not tested',cpu:'not validated',modifierBehavior:'not tested'};
}
export function matchWahAutoEngageDeviceBody(body){
  if(createHash('sha256').update(body).digest('hex')!=='a719c1c52a96fe2144e4d661c73f33594c3dc3f618a52cbcd3679b23e083efac')return null;
  return {file:'examples/FM3_MOD_AUTOENGAGE_OFF_export.syx',sha256:'7b6026539df41c36bf828dc35bf78510c0a3f30d77afe830eda5a2a7b71ea913',
    scope:'Entire body identical to user FW13 Auto Engage OFF export, 2026-10-21; generated file not separately reimported',
    submittedFileConfirmed:false,audio:'not tested',cpu:'not validated',modifierBehavior:'not tested'};
}
// Source-independent record from all seven pinned composer bases. NONE=0;
// External 1=14, Wah1=94, WAH_CONTROL=5, channel ALL=0 (FW13 metadata).
export const wahModifierWords=Object.freeze([0,0,65534,0,32767,65534,32767,66,94,5,2,0,0,32767,32767,0,0,0,0,0,0,65534,65534,0,0]);
export function wahModifierCapabilities(){return {field:'modifiers.external1Wah',values:[false,true],record:0,sourceWord:0,offset:1584,
  sourceCodes:{NONE:0,'External 1':14},target:{block:'wah',effectId:94,pid:5,name:'WAH_CONTROL',channelScope:'ALL'},
  evidence:'existing-export-and-FW13-metadata-crosschecked',metadataSha256:dependencyPolicyHash,
  autoEngage:{field:'modifiers.wahAutoEngage',values:Object.keys(wahAutoEngageCodes),codes:wahAutoEngageCodes,word:10,offset:1604,
    evidence:'FW13 user changed-field export and screenshot, 2026-10-21',requires:'Final External 1 -> Wah1 Control ALL binding',
    evidenceFile:'references/wah-auto-engage-evidence.json',deviceBehavior:'not tested',audio:'not tested'},
  damping:{field:'modifiers.wahDamping',values:Object.keys(wahDampingCodes),codes:wahDampingCodes,word:24,offset:1632,
    evidence:'FW13 user changed-field export and screenshot, 2026-10-21',requires:'Final External 1 -> Wah1 Control ALL binding',
    evidenceFile:'references/wah-damping-evidence.json',deviceBehavior:'not tested',audio:'not tested'},
  min:{field:'modifiers.wahMin',values:[0,2.5],codes:wahMinCodes,word:1,offset:1586,
    encoding:'Exact observed display-point lookup; no interpolation or full-range codec',fullRange:false,
    evidence:'FW13 user changed-field export, screenshot and baseline confirmation, 2026-10-21',requires:'Final External 1 -> Wah1 Control ALL binding; supported measured Max code',
    evidenceFile:'references/wah-min-evidence.json',deviceBehavior:'not tested',audio:'not tested'},
  controls:measuredControlsCapability(),
  exactMinMax:exactWahCapability(),
  preserves:'All bytes except explicitly requested source / Auto Engage / Damping / measured Min / wahControls / explicit exact Min/Max words; other composer requests remain separate',
  requires:'Retained configuration uses only supported source, Auto Engage, Damping, Min and measured control codes; present Wah1 when enabled; no competing target',
  deviceIO:false,newDeviceExportEvidence:true,globalControllerSetup:false,arbitraryModifierWrites:false};}
export function applyWahModifier(body,request,blocks,allow=()=>{}){
  check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>['external1Wah','wahAutoEngage','wahDamping','wahMin','wahControls','wahMinMaxExact'].includes(k)),'expected external1Wah, wahAutoEngage, wahDamping, wahMin, wahControls and/or wahMinMaxExact');
  const sourceRequested=Object.hasOwn(request,'external1Wah'),autoRequested=Object.hasOwn(request,'wahAutoEngage'),dampingRequested=Object.hasOwn(request,'wahDamping'),minRequested=Object.hasOwn(request,'wahMin'),controlsRequested=Object.hasOwn(request,'wahControls');
  if(controlsRequested)check(request.wahControls!==undefined,'wahControls must be an object');
  if(sourceRequested)check(typeof request.external1Wah==='boolean','external1Wah must be boolean');
  if(autoRequested)check(typeof request.wahAutoEngage==='string'&&Object.hasOwn(wahAutoEngageCodes,request.wahAutoEngage),'wahAutoEngage must be OFF or MED SPD');
  if(dampingRequested)check(typeof request.wahDamping==='string'&&Object.hasOwn(wahDampingCodes,request.wahDamping),'wahDamping must be EXPONENTIAL or LINEAR');
  if(minRequested)check(typeof request.wahMin==='number'&&Object.hasOwn(wahMinCodes,request.wahMin),'wahMin must be the measured display value 0 or 2.5');
  const exact=Object.hasOwn(request,'wahMinMaxExact')?planWahExact(request.wahMinMaxExact):null;
  check(!exact?.changes.some(c=>c.field==='min'&&minRequested||c.field==='max'&&Object.hasOwn(request.wahControls??{},'max')),'same Min/Max field requested through two policies');
  const modifiers=readModifiers(body),m=modifiers[0];
  check(m.offset===1584&&[0,14].includes(m.source),'unsupported existing source or record');
  const controls=planMeasuredControls(body,controlsRequested?request.wahControls:undefined);
  for(let pid=1;pid<25;pid++)check(wahMeasuredFields.some(f=>f.word===pid)?true:pid===1?[0,16375].includes(body.readUInt16LE(m.offset+2*pid)):pid===10?[0,2].includes(body.readUInt16LE(m.offset+2*pid)):pid===24?[0,1].includes(body.readUInt16LE(m.offset+2*pid)):body.readUInt16LE(m.offset+2*pid)===wahModifierWords[pid],'retained configuration differs at word '+pid);
  check(!modifiers.slice(1).some(x=>(x.effectId===94&&x.pid===5)||(x.active&&x.effectId===0&&x.pid===5)),'competing or uncertain Wah target');
  const enabled=sourceRequested?request.external1Wah:m.source===14,block=blocks.wah;
  check(!autoRequested||enabled,'Auto Engage requires final External 1 binding');
  check(!dampingRequested||enabled,'Damping requires final External 1 binding');
  check(!minRequested||enabled,'Min requires final External 1 binding');
  check(!controlsRequested||enabled,'wahControls requires final External 1 binding');
  check(!exact||enabled,'exact Min/Max requires final External 1 binding');
  check(!enabled||(block?.eid===94&&block.words>5&&body.readUInt16LE(block.header)===94&&body.readUInt16LE(block.header+42)===block.words&&body.readUInt16LE(block.header+44)===4&&block.start>=4610&&block.start+block.words*8<=body.length),'enabling requires an existing Wah1 block');
  const source=enabled?14:0,before=m.source,autoBefore=body.readUInt16LE(m.offset+20),autoAfter=autoRequested?wahAutoEngageCodes[request.wahAutoEngage]:autoBefore;
  const dampingBefore=body.readUInt16LE(m.offset+48),dampingAfter=dampingRequested?wahDampingCodes[request.wahDamping]:dampingBefore;
  const exactMin=exact?.changes.find(c=>c.field==='min'),exactMax=exact?.changes.find(c=>c.field==='max');
  const minBefore=body.readUInt16LE(m.offset+2),minAfter=exactMin?.raw??(minRequested?wahMinCodes[request.wahMin]:minBefore);
  if(exactMax)Object.assign(controls.max,{requested:exactMax.exactDecimal,after:exactMax.raw,display:null,exactDecimal:exactMax.exactDecimal,changed:controls.max.before!==exactMax.raw,evidenceBasis:exactMax.evidenceBasis});
  // Validation is complete before mutating body or notifying the caller.
  if(source!==before){body.writeUInt16LE(source,m.offset);allow(m.offset,2);}
  if(autoAfter!==autoBefore){body.writeUInt16LE(autoAfter,m.offset+20);allow(m.offset+20,2);}
  if(dampingAfter!==dampingBefore){body.writeUInt16LE(dampingAfter,m.offset+48);allow(m.offset+48,2);}
  if(minAfter!==minBefore){body.writeUInt16LE(minAfter,m.offset+2);allow(m.offset+2,2);}
  for(const c of Object.values(controls))if(c.changed){body.writeUInt16LE(c.after,c.offset);allow(c.offset,2);}
  const final=readModifiers(body)[0];
  check(final.source===source&&final.active===enabled&&!final.uncertain,'source readback failed');
  check(body.readUInt16LE(m.offset+20)===autoAfter,'Auto Engage readback failed');
  check(body.readUInt16LE(m.offset+48)===dampingAfter,'Damping readback failed');
  check(body.readUInt16LE(m.offset+2)===minAfter,'Min readback failed');
  return {requested:sourceRequested?enabled:null,before,after:source,changed:before!==source,offset:m.offset,bytes:2,
    autoEngage:{requested:autoRequested?request.wahAutoEngage:null,before:autoBefore,after:body.readUInt16LE(m.offset+20),
      label:autoLabel(autoAfter),changed:autoBefore!==autoAfter,offset:m.offset+20,bytes:2,
      evidence:'FW13 user export/display pair: MED SPD=2, OFF=0; other modes and behavior untested'},
    damping:{requested:dampingRequested?request.wahDamping:null,before:dampingBefore,after:body.readUInt16LE(m.offset+48),
      label:dampingLabel(dampingAfter),changed:dampingBefore!==dampingAfter,offset:m.offset+48,bytes:2,
      evidence:'FW13 user export/display pair: EXPONENTIAL=0, LINEAR=1; timing behavior untested'},
    min:{requested:exactMin?.exactDecimal??(minRequested?request.wahMin:null),before:minBefore,after:body.readUInt16LE(m.offset+2),
      display:exactMin?null:minDisplay(minAfter),...(exactMin?{exactDecimal:exactMin.exactDecimal,evidenceBasis:exactMin.evidenceBasis}:{}),changed:minBefore!==minAfter,offset:m.offset+2,bytes:2,
      evidence:exactMin?'Exact-input contract; see exactMinMax evidence':'FW13 observed display points: 0.00=0, 2.50=16375; no full-range codec, interpolation or DSP confirmation'},
    controls,...(exact?{exactMinMax:exact}:{}),
    sourceName:final.sourceName,targetName:'WAH_CONTROL',channelScope:final.channelScope,
    evidence:'existing-export-and-FW13-metadata-crosschecked',deviceIO:false,newHardwareMeasurements:false};
}
export function verifyWahModifierReadback(body,edit){
  if(!edit)return;
  const m=readModifiers(body)[0];
  check(m.source===edit.after&&m.effectId===94&&m.pid===5&&m.channel===0&&!m.uncertain,'final binding readback failed');
  check(body.readUInt16LE(m.offset+20)===edit.autoEngage.after,'final Auto Engage readback failed');
  check(body.readUInt16LE(m.offset+48)===edit.damping.after,'final Damping readback failed');
  check(body.readUInt16LE(m.offset+2)===edit.min.after,'final Min readback failed');
  for(const [key,c] of Object.entries(edit.controls??{}))check(body.readUInt16LE(c.offset)===c.after,'final '+key+' readback failed');
}
export function renderWahModifierText(edit){
  if(!edit)return [];
  return ['','EXTERNAL 1 → WAH — LÕPPFAILIST',
    `Seos: ${edit.after===14?'sees (External 1)':'väljas (NONE)'}; siht Wah 1 Control; kanalid ALL (A–D).`,
    edit.changed?'Muudeti olemasoleva modifikaatori allikat.':edit.requested===null?'Allikas säilis muutmata.':'Soovitud allikas oli juba valitud; allikasõna säilis muutmata.',
    `Auto Engage: ${edit.autoEngage.label}; ${edit.autoEngage.changed?'muudetud':'säilitatud'}; salvestatud kood ${edit.autoEngage.after}.`,
    `Damping: ${edit.damping.label}; ${edit.damping.changed?'muudetud':'säilitatud'}; salvestatud kood ${edit.damping.after}.`,
    ...(edit.min.display===null?[]:[`Min: ${edit.min.display.toFixed(2)}; ${edit.min.changed?'muudetud':'säilitatud'}; salvestatud kood ${edit.min.after}; täpne mõõdetud kuvapunkt, kogu skaala valem kinnitamata.`]),
    ...renderWahExact(edit.exactMinMax),
    ...renderMeasuredControls(edit.controls),
    edit.controls?.attackMs.changed||edit.controls?.releaseMs.changed?'Attack/Release ajad: muudeti ainult selgesõnaliselt määratud ajaväärtusi.':'Attack/Release ajad säilisid muutmata.',
    edit.exactMinMax?'Min/Max täpse päringu tõenditase on toodud iga välja juures; ajaloolised kuvapunktid säilitavad oma tähenduse.': 'Muudetakse ainult selgesõnaliselt valitud mõõtepunkte. Täisvahemiku valem ja väljade sõltumatus pole kinnitatud; uued kombinatsioonid on kontrollitud ainult arvutis. Auto Engage OFF ei lülita External 1 → Wah Control seost välja.',
    'Wah-ploki stseenikanal ja bypass on eraldi seaded. Seose sisselülitamine ei aktiveeri bypass-is Wah-plokki.',
    'External 1 peab seadme globaalsetes seadetes olema seotud soovitud pedaali või MIDI-kontrolleriga. Generaator seda ei seadista ega kontrolli pedaali asendit.',
    'Seose väljalülitamine säilitab Wah Control’i salvestatud väärtuse. Aktiivne seos blokeerib selle käsitsi kirjutamise.',
    'Tõend: olemasolevad võrdluspresetid ja FW13 metaandmed; Auto Engage MED SPD=2 / OFF=0, Damping EXPONENTIAL=0 / LINEAR=1 ning Min 0.00=0 / 2.50=16375 on kinnitatud 21.10.2026 eraldi kasutaja muutmispaaride, ekraanipiltide ja algväärtuste kinnitustega. Maxi ja wahControls punktid põhinevad kahel koondkatsel ning eraldi Max 7.50 → 5.00 katsel; koondkatsed ei ole sõltumatud üksikkatsed. Damping’u ajakäitumine, uue väljundi import, pedaali toimimine, heli ja CPU on eraldi kontrollid.'];
}
