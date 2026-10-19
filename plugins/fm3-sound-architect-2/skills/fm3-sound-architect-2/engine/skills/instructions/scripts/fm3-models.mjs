// Fixed, SHA-checked channel templates. No device I/O or guessed enum writes.
import fs from 'node:fs';
import {catalog,resolveImportedTemplate,bundledLibrary} from './fm3-amp-library.mjs';
import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';
export const ampModels = Object.freeze({
 'USA MK IV Rhythm 1':0, 'USA MK IV Rhythm 2':1,
 'USA MK IV Lead Bright':2, 'USA MK IV Lead Mid':3, 'USA MK IV Lead':'lead'
});
export const cabChoices = Object.freeze({'4x12 RECTO SLANT':'B','4x12 RECTO STRAIGHT':'C','2x12 CHIEFMAN':'D'});
const check=(v,m)=>{if(!v)throw Error(m)};
export function applySelections(original,body,spec,library=bundledLibrary){
 const details={};
 if(Object.hasOwn(spec,'ampModelB')){
  check(typeof spec.ampModelB==='string'&&catalog.models.some(m=>m.name===spec.ampModelB),'Unknown ampModelB in codec catalogue');
  const selectedLibrary=library&&Object.hasOwn(library.templates??{},spec.ampModelB)?library:bundledLibrary;
  if(Object.hasOwn(selectedLibrary.templates??{},spec.ampModelB)){
   const imported=resolveImportedTemplate(selectedLibrary,spec.ampModelB);body.set(imported.raw,4944);
   details.amp={model:spec.ampModelB,source:imported.source,targetChannel:'B',affectedScenes:[2,6],policy:'Full imported channel then explicit controls',hardware:'not confirmed for this combination'};
  }else{
  check(Object.hasOwn(ampModels,spec.ampModelB),'Missing full channel template for '+spec.ampModelB+'; import a same-base firmware13 donor. Model ID alone is insufficient.');
  let source=original,channel=ampModels[spec.ampModelB];
  if(channel==='lead'){
   const bytes=fs.readFileSync(new URL('../references/S2_AmpModelLead.syx',import.meta.url));
   check(createHash('sha256').update(bytes).digest('hex')==='9d74d7e0f7747e54b405fcbc03678ee07aba55c9f26665c4fc660243fed77e13','Lead template checksum mismatch');
   source=inspect(bytes).raw.body;channel=1;
   for(let i=0;i<source.length;i++)if(i<4944||i>=5232)check(source[i]===original[i],'Lead fixture has unrelated changes');
  }
  // 144 uint16 parameters per channel; Amp header 4610 + 46.
  body.set(source.slice(4656+channel*288,4656+(channel+1)*288),4944);
  details.amp={model:spec.ampModelB,sourceChannel:'ABCD'[channel],targetChannel:'B',affectedScenes:[2,6],policy:'Entire saved channel settings, then explicit controls; not universal factory defaults',hardware:'not tested for new selections'};
  }
 }
 if(Object.hasOwn(spec,'cabScene2')){
  check(Object.hasOwn(cabChoices,spec.cabScene2),'Unsupported cabScene2; external IR writing is not implemented');
  const ch=cabChoices[spec.cabScene2];body[5820]='ABCD'.indexOf(ch);body[5821]=0;
  details.cab={name:spec.cabScene2,channel:ch,affectedScenes:[2],mode:'DYNA-CAB',policy:'Select existing whole Cab channel; mic/mix/filter settings remain from that channel',hardware:'not tested'};
 }
 return details;
}
export function selectionReadback(decoded,spec){
 const amp=decoded.blocks.find(b=>b.block==='Amp'),cab=decoded.blocks.find(b=>b.block==='Cab');
 if(Object.hasOwn(spec,'ampModelB'))check(amp.channels.B.type===spec.ampModelB,'Amp model readback mismatch');
 if(Object.hasOwn(spec,'cabScene2')){const ch=cabChoices[spec.cabScene2];check(cab.scene_channels[1]===ch&&cab.channels[ch].dynacab1===spec.cabScene2&&cab.channels[ch].dynacab2===spec.cabScene2,'Cab selection readback mismatch');}
 return {ampB:amp.channels.B,cabScene2:{channel:cab.scene_channels[1],...cab.channels[cab.scene_channels[1]]}};
}
