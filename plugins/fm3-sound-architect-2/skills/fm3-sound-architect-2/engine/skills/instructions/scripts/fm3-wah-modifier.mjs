// Only the existing, export-crosschecked External 1 -> Wah Control binding.
// No device I/O, new records, curve authoring or controller configuration.
// The user-exported 2026-10-21 pair proves only Auto Engage OFF=0 / MED SPD=2.
import {readModifiers,dependencyPolicyHash} from './fm3-parameter-dependencies.mjs';
import {createHash} from 'node:crypto';
const check=(v,m)=>{if(!v)throw Error('Wah modifier: '+m)};
export const wahAutoEngageCodes=Object.freeze({'OFF':0,'MED SPD':2});
const autoLabel=code=>Object.keys(wahAutoEngageCodes).find(k=>wahAutoEngageCodes[k]===code);
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
  preserves:'All bytes except explicitly requested source / Auto Engage words; other composer requests remain separate',
  requires:'Exact retained configuration except supported source and Auto Engage codes; present Wah1 when enabled; no competing target',
  deviceIO:false,newDeviceExportEvidence:true,globalControllerSetup:false,arbitraryModifierWrites:false};}
export function applyWahModifier(body,request,blocks,allow=()=>{}){
  check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length>0&&Object.keys(request).every(k=>['external1Wah','wahAutoEngage'].includes(k)),'expected external1Wah and/or wahAutoEngage');
  const sourceRequested=Object.hasOwn(request,'external1Wah'),autoRequested=Object.hasOwn(request,'wahAutoEngage');
  if(sourceRequested)check(typeof request.external1Wah==='boolean','external1Wah must be boolean');
  if(autoRequested)check(typeof request.wahAutoEngage==='string'&&Object.hasOwn(wahAutoEngageCodes,request.wahAutoEngage),'wahAutoEngage must be OFF or MED SPD');
  const modifiers=readModifiers(body),m=modifiers[0];
  check(m.offset===1584&&[0,14].includes(m.source),'unsupported existing source or record');
  for(let pid=1;pid<25;pid++)check(pid===10?[0,2].includes(body.readUInt16LE(m.offset+2*pid)):body.readUInt16LE(m.offset+2*pid)===wahModifierWords[pid],'retained configuration differs at word '+pid);
  check(!modifiers.slice(1).some(x=>(x.effectId===94&&x.pid===5)||(x.active&&x.effectId===0&&x.pid===5)),'competing or uncertain Wah target');
  const enabled=sourceRequested?request.external1Wah:m.source===14,block=blocks.wah;
  check(!autoRequested||enabled,'Auto Engage requires final External 1 binding');
  check(!enabled||(block?.eid===94&&block.words>5&&body.readUInt16LE(block.header)===94&&body.readUInt16LE(block.header+42)===block.words&&body.readUInt16LE(block.header+44)===4&&block.start>=4610&&block.start+block.words*8<=body.length),'enabling requires an existing Wah1 block');
  const source=enabled?14:0,before=m.source,autoBefore=body.readUInt16LE(m.offset+20),autoAfter=autoRequested?wahAutoEngageCodes[request.wahAutoEngage]:autoBefore;
  // Validation is complete before mutating body or notifying the caller.
  if(source!==before){body.writeUInt16LE(source,m.offset);allow(m.offset,2);}
  if(autoAfter!==autoBefore){body.writeUInt16LE(autoAfter,m.offset+20);allow(m.offset+20,2);}
  const final=readModifiers(body)[0];
  check(final.source===source&&final.active===enabled&&!final.uncertain,'source readback failed');
  check(body.readUInt16LE(m.offset+20)===autoAfter,'Auto Engage readback failed');
  return {requested:sourceRequested?enabled:null,before,after:source,changed:before!==source,offset:m.offset,bytes:2,
    autoEngage:{requested:autoRequested?request.wahAutoEngage:null,before:autoBefore,after:body.readUInt16LE(m.offset+20),
      label:autoLabel(autoAfter),changed:autoBefore!==autoAfter,offset:m.offset+20,bytes:2,
      evidence:'FW13 user export/display pair: MED SPD=2, OFF=0; other modes and behavior untested'},
    sourceName:final.sourceName,targetName:'WAH_CONTROL',channelScope:final.channelScope,
    evidence:'existing-export-and-FW13-metadata-crosschecked',deviceIO:false,newHardwareMeasurements:false};
}
export function verifyWahModifierReadback(body,edit){
  if(!edit)return;
  const m=readModifiers(body)[0];
  check(m.source===edit.after&&m.effectId===94&&m.pid===5&&m.channel===0&&!m.uncertain,'final binding readback failed');
  check(body.readUInt16LE(m.offset+20)===edit.autoEngage.after,'final Auto Engage readback failed');
}
export function renderWahModifierText(edit){
  if(!edit)return [];
  return ['','EXTERNAL 1 → WAH — LÕPPFAILIST',
    `Seos: ${edit.after===14?'sees (External 1)':'väljas (NONE)'}; siht Wah 1 Control; kanalid ALL (A–D).`,
    edit.changed?'Muudeti olemasoleva modifikaatori allikat.':edit.requested===null?'Allikas säilis muutmata.':'Soovitud allikas oli juba valitud; allikasõna säilis muutmata.',
    `Auto Engage: ${edit.autoEngage.label}; ${edit.autoEngage.changed?'muudetud':'säilitatud'}; salvestatud kood ${edit.autoEngage.after}.`,
    'Kõver, min/max, summutus ja muud modifikaatorisõnad säilivad. Auto Engage OFF ei lülita External 1 → Wah Control seost välja.',
    'Wah-ploki stseenikanal ja bypass on eraldi seaded. Seose sisselülitamine ei aktiveeri bypass-is Wah-plokki.',
    'External 1 peab seadme globaalsetes seadetes olema seotud soovitud pedaali või MIDI-kontrolleriga. Generaator seda ei seadista ega kontrolli pedaali asendit.',
    'Seose väljalülitamine säilitab Wah Control’i salvestatud väärtuse. Aktiivne seos blokeerib selle käsitsi kirjutamise.',
    'Tõend: olemasolevad võrdluspresetid ja FW13 metaandmed; Auto Engage MED SPD=2 / OFF=0 on kinnitatud 21.10.2026 kasutaja muutmispaari, ekraanipildi ja algväärtuse kinnitusega. Uue väljundi import, pedaali toimimine, heli ja CPU on eraldi kontrollid.'];
}
