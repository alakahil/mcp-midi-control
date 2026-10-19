// Full-channel Amp/Cab selections for the existing, pinned composer layouts.
// Reuses the original template resolvers; never writes a guessed model ID.
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {applySelections} from './fm3-models.mjs';
import {applyCab} from './fm3-cabs.mjs';
import {catalog} from './fm3-amp-library.mjs';
import {composerBases} from './fm3-composer-bases.mjs';
import {readPinnedComposerFile} from './fm3-composer-components.mjs';
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
const sha=b=>createHash('sha256').update(b).digest('hex');

export function ampCabRequests(spec){
  return Object.fromEntries(['amp','cab'].map(family=>{
    const key=family+'Channels',legacy=family+'ModelB',entries=[];
    if(own(spec,key)){
      check(Array.isArray(spec[key])&&spec[key].length>=1&&spec[key].length<=4,key+' must contain 1..4 entries');
      for(const entry of spec[key]){
        check(entry!==null&&typeof entry==='object'&&!Array.isArray(entry)&&Object.keys(entry).every(k=>['channel','model'].includes(k)),key+' entries support only channel and model');
        check(typeof entry.channel==='string'&&/^[ABCD]$/.test(entry.channel),'Invalid '+family+' channel');
        check(typeof entry.model==='string'&&entry.model.length>0,'Missing '+family+' model');
        check(!entries.some(e=>e.channel===entry.channel),'Duplicate '+family+' channel '+entry.channel);
        entries.push({channel:entry.channel,model:entry.model});
      }
    }
    if(own(spec,legacy)){
      check(typeof spec[legacy]==='string'&&spec[legacy].length>0,'Missing '+legacy);
      check(!entries.some(e=>e.channel==='B'),legacy+' conflicts with '+key+' channel B');
      entries.push({channel:'B',model:spec[legacy]});
    }
    return [family,entries];
  }));
}

export function composeAmpCabChannels(family,entries,ampLibrary){
  check(['amp','cab'].includes(family),'Unsupported model family');
  if(!entries.length)return [];
  if(family==='amp'&&!ampLibrary)readPinnedComposerFile('lookup/amp-library.json','3b93f5b76d250fc695314159d1b6db780e94adc7fd1d3e14134d54179fa31b73');
  const donor=family==='amp'
    ?readPinnedComposerFile('references/Baaspreset.syx','fecac6a61d3a33c547a12e69b5056fd8750f9ded789e44672744d2e32e29c2c4')
    :readPinnedComposerFile(composerBases[0].file,composerBases[0].sha256);
  const state=inspectStructure(donor),original=Buffer.from(state.raw.body);
  return entries.map(({channel,model})=>{
    const temporary=Buffer.from(original);
    const details=family==='amp'
      ?applySelections(original,temporary,{ampModelB:model},ampLibrary).amp
      :applyCab(temporary,{cabModelB:model},state.decoded);
    const bytes=Buffer.from(family==='amp'?temporary.subarray(4944,5232):temporary.subarray(6066,6278));
    if(family==='amp')check(bytes.readUInt16LE(12)===catalog.models.find(m=>m.name===model)?.id,'Amp template model readback mismatch');
    // Scene users are recomputed from the final output, never the donor.
    const {affectedScenes,...metadata}=details;
    return {bytes,details:{...metadata,channel,model,targetChannel:channel,templateSha256:sha(bytes),...(family==='amp'?{modelId:bytes.readUInt16LE(12)}:{})}};
  });
}

// Recognise only the complete, unnormalised body of the actual device export.
// Source template support is never promoted to blanket hardware approval.
export function matchAmpCabDeviceBody(body,syx){
  const bodySha256='2336d091bf1691faa8c765ca16600b77ed57cb6e9840271823be2ad9074b9b74';
  if(sha(body)!==bodySha256)return null;
  const file='examples/FM3_AMP_CAB_AD_TEST_export.syx';
  const sha256='22b6df6e5c3edf26ba3d9542179fc643ae3f6f9fabdcd3d61a7d4c57dfa33248';
  const actual=readPinnedComposerFile(file,sha256);
  check(Buffer.from(inspectStructure(actual).raw.body).equals(body),'Amp/Cab hardware body mismatch');
  const submittedFileConfirmed=sha(syx)==='e9132d54e04e9806af8506af7eb234ec9be6ec7fad01d6fcb6920446409e6493';
  return {file,sha256,bodySha256,submittedFileConfirmed,scope:'Entire decompressed body identical to the actual Amp A/D and Cab A/C/D NewLook device export; no normalization, audio or CPU inference'};
}
