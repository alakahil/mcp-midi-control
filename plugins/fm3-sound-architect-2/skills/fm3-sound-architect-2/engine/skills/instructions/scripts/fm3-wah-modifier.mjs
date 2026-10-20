// Only the existing, export-crosschecked External 1 -> Wah Control binding.
// No device I/O, new records, curve authoring or controller configuration.
import {readModifiers,dependencyPolicyHash} from './fm3-parameter-dependencies.mjs';
const check=(v,m)=>{if(!v)throw Error('Wah modifier: '+m)};
// Source-independent record from all seven pinned composer bases. NONE=0;
// External 1=14, Wah1=94, WAH_CONTROL=5, channel ALL=0 (FW13 metadata).
export const wahModifierWords=Object.freeze([0,0,65534,0,32767,65534,32767,66,94,5,2,0,0,32767,32767,0,0,0,0,0,0,65534,65534,0,0]);
export function wahModifierCapabilities(){return {field:'modifiers.external1Wah',values:[false,true],record:0,sourceWord:0,offset:1584,
  sourceCodes:{NONE:0,'External 1':14},target:{block:'wah',effectId:94,pid:5,name:'WAH_CONTROL',channelScope:'ALL'},
  evidence:'existing-export-and-FW13-metadata-crosschecked',metadataSha256:dependencyPolicyHash,
  preserves:'All bytes except the existing source word; explicit other composer requests remain separate',
  requires:'Exact retained 24-word configuration; enabling requires a present Wah1 block; no competing target',
  deviceIO:false,newHardwareMeasurements:false,globalControllerSetup:false,arbitraryModifierWrites:false};}
export function applyWahModifier(body,request,blocks,allow=()=>{}){
  check(request&&typeof request==='object'&&!Array.isArray(request)&&Object.keys(request).length===1&&Object.hasOwn(request,'external1Wah'),'expected only {external1Wah: boolean}');
  check(typeof request.external1Wah==='boolean','external1Wah must be boolean');
  const modifiers=readModifiers(body),m=modifiers[0];
  check(m.offset===1584&&[0,14].includes(m.source),'unsupported existing source or record');
  for(let pid=1;pid<25;pid++)check(body.readUInt16LE(m.offset+2*pid)===wahModifierWords[pid],'retained configuration differs at word '+pid);
  check(!modifiers.slice(1).some(x=>(x.effectId===94&&x.pid===5)||(x.active&&x.effectId===0&&x.pid===5)),'competing or uncertain Wah target');
  const enabled=request.external1Wah,block=blocks.wah;
  check(!enabled||(block?.eid===94&&block.words>5&&body.readUInt16LE(block.header)===94&&body.readUInt16LE(block.header+42)===block.words&&body.readUInt16LE(block.header+44)===4&&block.start>=4610&&block.start+block.words*8<=body.length),'enabling requires an existing Wah1 block');
  const source=enabled?14:0,before=m.source;
  // Validation is complete before mutating body or notifying the caller.
  if(source!==before){body.writeUInt16LE(source,m.offset);allow(m.offset,2);}
  const final=readModifiers(body)[0];
  check(final.source===source&&final.active===enabled&&!final.uncertain,'source readback failed');
  return {requested:enabled,before,after:source,changed:before!==source,offset:m.offset,bytes:2,
    sourceName:final.sourceName,targetName:'WAH_CONTROL',channelScope:final.channelScope,
    evidence:'existing-export-and-FW13-metadata-crosschecked',deviceIO:false,newHardwareMeasurements:false};
}
export function renderWahModifierText(edit){
  if(!edit)return [];
  return ['','EXTERNAL 1 → WAH — LÕPPFAILIST',
    `Seos: ${edit.after===14?'sees (External 1)':'väljas (NONE)'}; siht Wah 1 Control; kanalid ALL (A–D).`,
    edit.changed?'Muudeti ainult olemasoleva modifikaatori allikat. Kõver, vahemik, summutus ja muud modifikaatorisõnad säilivad.':'Soovitud allikas oli juba valitud; modifikaatorikirje säilis muutmata.',
    'Wah-ploki stseenikanal ja bypass on eraldi seaded. Seose sisselülitamine ei aktiveeri bypass-is Wah-plokki.',
    'External 1 peab seadme globaalsetes seadetes olema seotud soovitud pedaali või MIDI-kontrolleriga. Generaator seda ei seadista ega kontrolli pedaali asendit.',
    'Seose väljalülitamine säilitab Wah Control’i salvestatud väärtuse. Aktiivne seos blokeerib selle käsitsi kirjutamise.',
    'Tõend: olemasolevad võrdluspresetid ja FW13 metaandmed; selle uue väljundi import, pedaali toimimine, heli ja CPU pole kontrollitud.'];
}
