// Offline composition on explicitly pinned firmware-13 bases. No device I/O.
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {authorGen3PresetFromIR,reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {controls} from './fm3-controls.mjs';
import {cabNames} from './fm3-cabs.mjs';
import {catalog,coverage} from './fm3-amp-library.mjs';
import {generateJBScenes} from './fm3-jb-scenes.mjs';
import {layout,layouts,composerBases,resolveComposerBase,checkComposerStructure} from './fm3-composer-bases.mjs';
import {readComposerFile as read,readPinnedComposerFile,componentDefinitions,composerLibraries,composeComponent,composeRotary} from './fm3-composer-components.mjs';
import {prepareNewLook,newlookSlots,newlookSignalRows} from './fm3-composer-newlook.mjs';
import {applyComposerScenes} from './fm3-composer-scenes.mjs';
import {ampCabRequests,composeAmpCabChannels,matchAmpCabDeviceBody} from './fm3-composer-amp-cab.mjs';
import {filterControlCapabilities,matchFilterControlDeviceBody} from './fm3-filter-controls.mjs';
import {ampLevelCapabilities,applyAmpLevels,matchAmpLevelDeviceBody} from './fm3-composer-amp-levels.mjs';
import {peqControlCapabilities,matchPeqDeviceBody} from './fm3-peq-controls.mjs';
import {decodePeqChannel} from './fm3-peq-full.mjs';
import {matchEnhancerDeviceBody} from './fm3-enhancer-hardware.mjs';
import {matchGeqDeviceBody} from './fm3-geq-hardware.mjs';
import {decodeEnhancerChannel,enhancerFullCapabilities} from './fm3-enhancer-full.mjs';
import {decodeGeqChannel,geqFullCapabilities} from './fm3-geq-full.mjs';
import {validateLegacyDependencies} from './fm3-parameter-dependencies.mjs';
import {applyWahModifier,wahModifierCapabilities,renderWahModifierText,verifyWahModifierReadback,matchWahAutoEngageDeviceBody,matchWahDampingDeviceBody} from './fm3-wah-modifier.mjs';
export {layout,composerBases};
const check=(v,m)=>{if(!v)throw Error(m)},own=(o,k)=>Object.hasOwn(o,k);
const sha=b=>createHash('sha256').update(b).digest('hex');
const sceneFields=['scene6Name','phaserScene6Bypass','reverbScene6','delayScene6Bypass','ampScene6'];
const families=Object.keys(componentDefinitions),templateKeys=families.map(f=>f+'Channels');
const sceneLocations={phaserScene6Bypass:['phaser',36],reverbScene6:['reverb',20],delayScene6Bypass:['delay',36],ampScene6:['amp',20]};
const valueAt=(body,f)=>{const raw=body.readUInt16LE(f.offset);return f.rawValues?(f.values[f.rawValues.indexOf(raw)]??'raw '+raw):f.min+raw/65534*(f.max-f.min)};
function scopedControls(blocks){
  return Object.fromEntries(Object.entries(controls).map(([key,f])=>{
    let offset;
    if(f.eid){const family=Object.keys(blocks).find(k=>blocks[k].eid===f.eid),l=blocks[family];check(l,'Missing control block');offset=l.start+(f.eid===58?l.words*2:0)+f.pid*2;}
    else offset=key==='delayScene2'?blocks.delay.header+28:blocks.reverb.header+10;
    return [key,{...f,offset}];
  }));
}
export function getComposerCapabilities(base){
  const selected=base?resolveComposerBase(base):null,lib=composerLibraries();
  readPinnedComposerFile('lookup/amp-library.json','3b93f5b76d250fc695314159d1b6db780e94adc7fd1d3e14134d54179fa31b73');
  return {profile:'jb-composer',schemaVersion:1,firmware:13,
    bases:(selected?[selected]:composerBases).map(b=>({id:b.id,file:b.file,sha256:b.sha256,bodyBytes:b.bodyBytes,blocks:Object.keys(layouts[b.layout]),fields:['modifiers','scenes','ampChannels','cabChannels','ampLevels',...Object.keys(controls),'ampModelB','cabModelB',...sceneFields.filter(k=>!sceneLocations[k]||layouts[b.layout][sceneLocations[k][0]]),...families.filter(f=>layouts[b.layout][f]||b.layout==='newlook').map(f=>f+'Channels'),...(['rotary','newlook'].includes(b.layout)?['rotaryA']:[]),...(b.layout==='newlook'?['addedBlockScenes']:[])]})),
    modifiers:wahModifierCapabilities(),
    templates:{amp:{count:coverage().ready,names:coverage().models.filter(m=>m.status!=='missing-template').map(m=>m.name),channels:['A','B','C','D']},cab:{count:cabNames.length,names:[...cabNames],channels:['A','B','C','D']},...Object.fromEntries(Object.entries(lib).filter(([k])=>!selected||selected.layout==='newlook'||selected.blocks[k]).map(([k,l])=>[k,{count:l.models.length,names:l.models.map(m=>m.name),channels:['A','B','C','D']}]))},
    modelSelection:{ampChannels:'1..4 unique {channel, model} entries',cabChannels:'1..4 unique {channel, model} entries',legacy:'ampModelB/cabModelB remain supported; combining either with its Channels entry B is rejected',policy:'Full collected channel including its levels; unselected channels are preserved; Gain/EQ scalars still target B; ampLevels adds measured A/C/D points and B alias'},
    controls:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,{...(v.values?{values:v.values}:{minimum:v.low??v.min,maximum:v.high??v.max}),unit:v.unit??'',scope:v.eid===58?'Amp B':v.eid===70?'Delay A type14':v.eid===66?'Reverb A type2':'existing scene control'}])),
    rotaryA:!selected||selected.layout==='newlook'||selected.blocks.rotary?{rateHz:[2,5,6.5],mixPercent:[25,50,75],levelDb:[-6,0],hiDepthPercent:[25,50],lowDepthPercent:[25,50]}:undefined,
    filterControls:filterControlCapabilities(),peqControls:peqControlCapabilities(),geqControls:geqFullCapabilities(),enhancerControls:enhancerFullCapabilities(),ampLevels:ampLevelCapabilities(),
    defaultBase:'jb-newlook',newlookLayout:{insertion:'Exact separate Chorus, Pitch and Filter insertion specimens confirmed; other combinations offline-tested only',hardwareEvidence:'docs/FM3_NEWLOOK_HARDWARE_ROUNDTRIP.json',pitchHardwareEvidence:'docs/FM3_NEWLOOK_PITCH_HARDWARE_ROUNDTRIP.json',filterHardwareEvidence:'docs/FM3_NEWLOOK_FILTER_HARDWARE_ROUNDTRIP.json',slots:Object.fromEntries(Object.entries(newlookSlots).map(([f,s])=>[f,{row:s.row+1,column:s.col+1}])),activation:'New blocks default to A/bypass; scenes (or legacy addedBlockScenes) explicitly selects requested channels and bypass states'},
    scenes:{numbers:[1,2,3,4,5,6,7,8],name:'1..31 printable ASCII characters, no edge spaces',blockFields:{channel:['A','B','C','D'],bypass:'boolean'},families:'Only present or explicitly inserted composer blocks; no Input/Output/Send/Return',partialUpdates:true,duplicateOrLegacyConflicts:'rejected',newBlockActivation:'requires an explicitly requested channel template'},
    limitations:['Automatic known-block insertion only on jb-newlook serial shunts; other bases retain their existing grid','Amp/Cab full templates target A-D; scalar controls keep their existing measured scope','Scene names, effect channels and bypass are supported; no arbitrary modifier writing; only the retained External 1 to Wah binding and its OFF/MED SPD Auto Engage and EXPONENTIAL/LINEAR Damping pairs','Filter A-D templates on NewLook; exact measured controls only: A High-Pass frequency, B Low-Pass frequency, C Peaking frequency/Q/Gain/Level','PEQ five bands and A-D: measured types/slopes, numeric scales and common controls; intermediate values and new combinations require independent device checks; opaque PID23/24 preserved','GEQ 18 types and A-D: paired templates and audited scales; intermediate values and new compositions require separate device checks', 'Unknown bases, fields, incompatible blocks and unmeasured values are rejected']};
}
export function generateJBComposer(base,spec,ampLibrary){
  check(spec&&typeof spec==='object'&&!Array.isArray(spec),'Expected specification object');
  const before=inspectStructure(base),sourceOriginal=Buffer.from(before.raw.body),prepared=prepareNewLook(sourceOriginal,resolveComposerBase(base),spec);
  const target=prepared.target,blocks=target.blocks,scalars=scopedControls(blocks),insertions=prepared.insertions;
  const allowedKeys=['schemaVersion','firmware','baseProfile','name','purpose','ampModelB','cabModelB','ampChannels','cabChannels','ampLevels',...Object.keys(scalars),...sceneFields,...templateKeys,'rotaryA','addedBlockScenes','scenes','modifiers'];
  check(Object.keys(spec).every(k=>allowedKeys.includes(k)),'Unsupported composer field');
  check(spec.schemaVersion===1&&spec.firmware===13&&spec.baseProfile==='jb-composer','Require schemaVersion 1, firmware 13 and jb-composer');
  check(typeof spec.name==='string'&&/^[ -~]{1,31}$/.test(spec.name),'Name must be 1–31 printable ASCII characters');
  if(own(spec,'purpose'))check(typeof spec.purpose==='string'&&spec.purpose.length<=1000&&!/[\x00-\x1f]/.test(spec.purpose),'Invalid purpose');
  const keys=Object.keys(scalars).filter(k=>own(spec,k));
  check(keys.length||['ampModelB','cabModelB','ampChannels','cabChannels','ampLevels','rotaryA','scenes','modifiers',...sceneFields,...templateKeys].some(k=>own(spec,k)),'At least one supported setting required');
  for(const family of families)if(own(spec,family+'Channels'))check(blocks[family],family+' is absent from '+target.id+'; choose a compatible composer base. Block insertion is not supported.');
  if(own(spec,'rotaryA'))check(blocks.rotary,'rotary is absent from '+target.id+'; choose jb-rotary. Block insertion is not supported.');
  for(const k of keys){const f=scalars[k],v=spec[k];check(f.values?f.values.includes(v):typeof v==='number'&&Number.isFinite(v)&&v>=(f.low??f.min)&&v<=(f.high??f.max),'Unsupported value: '+k)}
  if(own(spec,'delayTimeMs'))check(spec.delayTempoA==='NONE','delayTimeMs requires explicit delayTempoA: NONE');
  if(own(spec,'reverbPredelayMs'))check(spec.reverbPredelayTempoA==='NONE','reverbPredelayMs requires explicit reverbPredelayTempoA: NONE');
  const original=prepared.body,body=Buffer.from(original),allowed=new Set(),lib=composerLibraries(),components={};
  for(const k of sceneFields)if(own(spec,k)&&sceneLocations[k])check(blocks[sceneLocations[k][0]],'Scene field requires an existing or explicitly requested '+sceneLocations[k][0]+' block');
  checkComposerStructure(body,target);
  const canonical=readPinnedComposerFile(composerBases[0].file,composerBases[0].sha256);
  const allow=(start,size)=>{for(let i=start;i<start+size;i++)allowed.add(i)};
  const modelRequests=ampCabRequests(spec),modelWrites=[];
  for(const family of ['amp','cab']){
    const entries=composeAmpCabChannels(family,modelRequests[family],ampLibrary),l=blocks[family];
    for(const {bytes,details} of entries){
      check(bytes.length===l.words*2,'Incompatible '+family+' channel size');
      const start=l.start+'ABCD'.indexOf(details.channel)*l.words*2;
      bytes.copy(body,start);allow(start,bytes.length);
      modelWrites.push({family,channel:details.channel,start,bytes});
    }
    if(entries.length)components[family]=own(spec,family+'Channels')?entries.map(e=>e.details):entries[0].details;
  }
  for(const family of families){
    const key=family+'Channels';if(!own(spec,key))continue;
    const r=composeComponent(family,spec[key],lib),l=blocks[family];
    check(r.wordsPerChannel===l.words,'Incompatible '+family+' channel size');
    for(const c of r.data){const start=l.start+'ABCD'.indexOf(c.channel)*l.words*2;check(c.bytes.length===l.words*2,'Incomplete channel');c.bytes.copy(body,start);allow(start,l.words*2)}
    components[family]=r.channels;
  }
  if(own(spec,'rotaryA')){
    const requested=composeRotary(spec.rotaryA);
    for(const c of requested){const at=blocks.rotary.start+c.parameterId*2;body.writeUInt16LE(c.raw,at);allow(at,2)}
    components.rotary=requested;
  }
  // Type-dependent scalar controls follow the template and remain algorithm-bound.
  if(keys.some(k=>scalars[k].eid===70))check(body.readUInt16LE(blocks.delay.start+12)===14,'Delay A controls require the verified Deluxe Mind Guy type (ID 14)');
  if(keys.some(k=>scalars[k].eid===66))check(body.readUInt16LE(blocks.reverb.start)===2,'Reverb A controls require the verified Room: Large Room type (ID 2)');
  for(const k of keys){const f=scalars[k],v=spec[k],raw=f.rawValues?f.rawValues[f.values.indexOf(v)]:Math.round((v-f.min)/(f.max-f.min)*65534);body.writeUInt16LE(raw,f.offset);allow(f.offset,2)}
  const ampLevelWrites=applyAmpLevels(body,blocks.amp,spec,allow);
  if(ampLevelWrites.length)components.ampLevels=ampLevelWrites;
  // Use the original Scene writer to validate names/enums. Relocate only those
  // existing fields; do not copy any donor's other scene/channel assignments.
  const requestedScenes=sceneFields.filter(k=>own(spec,k));
  if(requestedScenes.length){
    const r=generateJBScenes(canonical,{schemaVersion:1,firmware:13,baseProfile:'jb-ydom-rhythm',name:'JB YDOM RHYTHM',...Object.fromEntries(requestedScenes.map(k=>[k,spec[k]]))});
    const sceneBody=Buffer.from(inspectStructure(r.syx).raw.body);
    for(const k of requestedScenes){
      if(k==='scene6Name'){sceneBody.copy(body,164,164,195);allow(164,31)}
      else {const [family,relative]=sceneLocations[k],source=layout[family].header+relative,at=blocks[family].header+relative;body[at]=sceneBody[source];allow(at,1)}
    }
    components.scenes=Object.fromEntries(requestedScenes.map(k=>[k,spec[k]]));
  }
  const sceneEdits=applyComposerScenes(body,blocks,spec,insertions,allow);
  if(sceneEdits.length)components.scenePlan=spec.scenes;
  checkComposerStructure(body,target);
  const modifierEdit=own(spec,'modifiers')?applyWahModifier(body,spec.modifiers,blocks,allow):null;
  validateLegacyDependencies(body,blocks,spec);
  const renamed=authorGen3PresetFromIR(base,{name:spec.name,blocks:[]},17);
  check(renamed.skipped.length===0,'Preset name authoring skipped fields');
  const named=inspectStructure(Buffer.from(renamed.syx));check(Buffer.from(named.raw.body).equals(sourceOriginal),'Name authoring changed body');
  const syx=Buffer.from(reencodeDumpFromRawPatch(renamed.syx,reencodeRawPatch(named.raw.rawPatch,body)));
  const after=inspectStructure(syx),actual=Buffer.from(after.raw.body);
  check(actual.equals(body),'Composed body readback mismatch');checkComposerStructure(actual,target);
  verifyWahModifierReadback(actual,modifierEdit);
  check(after.decoded.preset_name===spec.name,'Preset name readback mismatch');
  const changes=[];for(let i=0;i<body.length;i++)if(body[i]!==original[i]){check(allowed.has(i),'Collateral change at '+i);changes.push(i)}
  check(actual.subarray(260,452).equals(original.subarray(260,452)),'Unexpected routing change');
  check(actual[0]===original[0],'Selected scene changed');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Dump header changed');
  for(let i=0;i<74;i++)if(i!==4&&i!==5&&!(i>=8&&i<40)&&!(insertions.length&&i>=72))check(before.raw.rawPatch[i]===after.raw.rawPatch[i],'Unrelated raw header changed');
  const raw=Buffer.from(after.raw.rawPatch);check(raw.readUInt16LE(72)===actual.length&&raw.readUInt16LE(74)===after.raw.compSize,'Invalid encoded size');
  check(raw.subarray(76+after.raw.compSize).every(v=>v===0),'Nonzero output padding');
  for(const k of keys){const f=scalars[k],v=spec[k],expected=f.rawValues?f.rawValues[f.values.indexOf(v)]:Math.round((v-f.min)/(f.max-f.min)*65534);check(actual.readUInt16LE(f.offset)===expected,'Control readback failed: '+k)}
  for(const write of modelWrites){
    const expected=Buffer.from(write.bytes);
    if(write.family==='amp'&&write.channel==='B')for(const key of keys){
      const f=scalars[key];if(f.eid===58)actual.copy(expected,f.offset-write.start,f.offset,f.offset+2);
    }
    if(write.family==='amp')for(const w of ampLevelWrites)if(w.channel===write.channel)actual.copy(expected,w.offset-write.start,w.offset,w.offset+2);
    check(actual.subarray(write.start,write.start+expected.length).equals(expected),'Full '+write.family+' '+write.channel+' template readback mismatch');
  }
  for(const w of ampLevelWrites)check(actual.readUInt16LE(w.offset)===w.raw,'Amp Level readback failed: '+w.channel);
  const sceneSummary=describeComposerScenes(after,blocks);
  for(const insertion of insertions){
    const assigned=new Set([...insertion.sceneAssignments.map(s=>s.scene),...sceneEdits.filter(e=>e.family===insertion.family).map(e=>e.scene)]);
    insertion.sceneAssignments=[...assigned].sort((a,b)=>a-b).map(scene=>{const state=sceneSummary[scene-1].blocks[insertion.family];return {scene,channel:state.channel,bypass:state.bypass};});
  }
  const affected=[];
  for(const family of ['amp','cab'])if(components[family])for(const c of Array.isArray(components[family])?components[family]:[components[family]]){
    const users=sceneSummary.filter(s=>s.blocks[family].channel===c.channel);
    c.affectedScenes=users.map(s=>s.scene);c.activeScenes=users.filter(s=>!s.blocks[family].bypass).map(s=>s.scene);
  }
  for(const [family,l] of Object.entries(blocks))for(const channel of 'ABCD'){
    const start=l.start+'ABCD'.indexOf(channel)*l.words*2;
    if([...allowed].some(i=>i>=start&&i<start+l.words*2)){
      const scenes=sceneSummary.filter(s=>s.blocks[family].channel===channel);
      affected.push({family,channel,scenes:scenes.map(s=>s.scene),activeScenes:scenes.filter(s=>!s.blocks[family].bypass).map(s=>s.scene)});
      if(Array.isArray(components[family])&&family!=='rotary'){const c=components[family].find(c=>c.channel===channel);if(c){c.affectedScenes=scenes.map(s=>s.scene);c.activeScenes=scenes.filter(s=>!s.blocks[family].bypass).map(s=>s.scene)}}
    }
  }
  const sceneControlRequested=key=>sceneEdits.some(e=>key==='delayScene2'?e.scene===2&&e.family==='delay'&&e.field==='bypass':key==='reverbScene1'?e.scene===1&&e.family==='reverb'&&e.field==='channel':false);
  const effective=Object.entries(scalars).map(([key,f])=>({key,label:f.label,unit:f.unit??'',raw:actual.readUInt16LE(f.offset),value:key==='reverbScene1'?'ABCD'[actual.readUInt16LE(f.offset)]:valueAt(actual,f),requested:own(spec,key)?spec[key]:key==='levelB'?(ampLevelWrites.find(w=>w.channel==='B')?.valueDb??null):null,source:(own(spec,key)||(key==='levelB'&&ampLevelWrites.some(w=>w.channel==='B')))?'requested':sceneControlRequested(key)?'scene-plan':f.eid===58&&modelRequests.amp.some(c=>c.channel==='B')?'amp-template':f.eid===70&&spec.delayChannels?.some(c=>c.channel==='A')?'delay-template':f.eid===66&&spec.reverbChannels?.some(c=>c.channel==='A')?'reverb-template':'base',displaySupported:!(f.eid===70&&actual.readUInt16LE(blocks.delay.start+12)!==14)&&!(f.eid===66&&actual.readUInt16LE(blocks.reverb.start)!==2)}));
  const knownDeviceBody=matchWahDampingDeviceBody(actual)??matchWahAutoEngageDeviceBody(actual)??(['jb-balanced-export','jb-tremolo','jb-rotary','jb-pitch','jb-newlook'].includes(target.id)&&actual.equals(sourceOriginal)?{file:target.file,sha256:sha(base),scope:'Entire decompressed body identical to pinned user device export; new file/name not separately reimported'}:(target.id==='jb-newlook'?((components.enhancer?matchEnhancerDeviceBody(actual,syx):null)??(components.geq?matchGeqDeviceBody(actual,syx):null)??matchAmpLevelDeviceBody(actual,syx)??matchAmpCabDeviceBody(actual,syx)??(components.filter?matchFilterControlDeviceBody(actual):null)??(components.peq?matchPeqDeviceBody(actual,syx):null)):null));
  const report={generator:'jb-composer-0.13.0-dev',knownDeviceBody,spec,baseId:target.id,baseFile:target.file,baseSha256:sha(base),baseLayout:target.layout,sourceBodyBytes:sourceOriginal.length,bodyBytes:actual.length,insertions,changeOffsetReference:insertions.length?'assembled body after declared insertions':'source body',signalRows:target.layout==='newlook'?newlookSignalRows(after.decoded.grid):null,outputSha256:sha(syx),components,sceneEdits,modifierEdit,effective,affectedChannels:affected,scenes:sceneSummary,selectedScene:actual[0]+1,exportFilename:spec.name.trim().replace(/[^A-Za-z0-9_-]+/g,'_')+'_export.syx',changedBodyOffsets:changes,allowedBodyOffsets:[...allowed].sort((a,b)=>a-b),checks:{frameChecksums:true,presetCrc:true,footer:true,exactBodyReadback:true,onlyDeclaredRegionsChanged:true,routingPreserved:insertions.length===0,onlyDeclaredSlotInsertions:true,existingBlockRecordsPreservedDuringInsertion:true,selectedScenePreserved:true,unrelatedHeadersPreserved:true,encodedSizesAndPadding:true,componentEvidence:true},hardware:knownDeviceBody?.submittedFileConfirmed?'This exact generated SYX was imported and its entire unnormalised body matches the user device export. No repeat export needed.':knownDeviceBody?'Entire body matches a previous user device export; no repeat export needed for identical content. This newly encoded file/name was not separately reimported.':'New composition pending device import/export; base and component specimens have separate evidence.',audio:knownDeviceBody?.audio??'Not assessed for this composition',cpu:knownDeviceBody?.cpu??'Not supplied for this composition',limitations:['Only listed SHA-pinned bases; new blocks only on declared jb-newlook shunts','New inserted layouts require device import/export confirmation; no arbitrary routing or block removal','Amp/Cab full templates target A-D, including collected levels; unselected channels preserved; Gain/EQ scalars still target B; ampLevels adds measured A/C/D points and B alias','Drive scalar overrides retain measured type/channel/value combinations','Delay A scalar overrides only type14; Reverb A only type2; Rotary A only measured points','scenes defines names/channels/bypass for present or inserted effects; duplicate legacy assignments are rejected; new blocks default to A/bypass','Shared channel changes affect every scene using that channel','Filter copies all 37 paired words then applies only listed measured type/channel/values; recorded display rounding is explicit; Order 2nd/4th is measured for A High-Pass and B Low-Pass; no interpolation','PEQ A-D starts from a fully paired 33-word baseline; five bands, measured enums and fitted numeric scales; per-value evidence is reported. Hardware proof is matched only to exact full bodies; Blocking has no Q/Gain control; PID23/24 remain opaque','Only the existing External 1 to Wah source toggle and OFF/MED SPD Auto Engage and EXPONENTIAL/LINEAR Damping pairs; no arbitrary modifier/expression or external IR writing']};
  return {syx,report,txt:renderText(after,report)};
}
function renderText(after,r){
  const format=v=>typeof v==='number'?v.toFixed(2):typeof v==='boolean'?(v?'sees':'bypass'):String(v);
  const lines=[r.knownDeviceBody?'FM3 SOUND ARCHITECT — ÜHINE PRESET':'FM3 SOUND ARCHITECT — ÜHISE PRESETIKOOSTAJA KATSE',`Preset: ${r.spec.name}`,`Eesmärk: ${r.spec.purpose??'Kogutud plokimallide ja kinnitatud parameetrite ühine koostamine.'}`,'FM3 Mk II Turbo, firmware 13. Kasutaja senine kontekst: Ibanez humbuckeritega; OUT 1 stereo FOH.',`Alus: ${r.baseFile} (${r.baseId}). Valitud Scene ${r.selectedScene} säilib.`,...(r.signalRows?r.signalRows.map((row,i)=>`Rida ${i+2}: ${row}`):[`Signaaliahel: ${after.decoded.grid.map(g=>g.name).join(' → ')}`]),'','KÜSITUD KANALIMALLID'];
  lines.push(...renderWahModifierText(r.modifierEdit));
  for(const p of r.insertions??[])lines.push(`Lisatud ${p.family}: rida ${p.row}, veerg ${p.column}; küsitud stseenivalikud on allpool, muud stseenid A/bypass. ${r.knownDeviceBody?'Kogu väljundkeha kattub kinnitatud seadmeekspordiga.':'Uue paigutuse seadmering OOTEL.'}`);
  for(const family of families)for(const c of r.components[family]??[]){
    lines.push(`${family} ${c.channel}: ${c.type}; täielik kogutud kanalimall${family==='peq'?', seejärel küsitud parameetrid':''}.`);
    if(c.explicitControls&&Object.keys(c.explicitControls).length)lines.push('  '+Object.entries(c.explicitControls).map(([k,v])=>k+' '+v+(k==='mix'?'%':' /10')).join(', '));
    for(const p of c.controls??[])lines.push(`  ${p.key}: ${p.displayValue} ${p.unit} [${p.origin??'mõõdetud punkt'}; küsitud ${p.value}${p.roundedDisplay?'; ekraani ümardus':''}]`);
  }
  if(r.components.enhancer)lines.push('Enhancer: Modern, Classic ja Stereoizer; kanalid A–D. Level on alati määratud. Pan Left/Pan Right/Balance on ühikuta −100…+100. Bypass on stseenivalik; Bypass Mode menüüd ei ole kinnitatud. PID5 ja valitud tüübi peidetud parameetrid säilivad kogutud mallist. Mõõtepunktid ja skaalast tuletatud väärtused on eristatud. '+(r.knownDeviceBody?.effectId===122?'Selle täpse koosluse seadmering ja Enhanceri toimimine on kinnitatud; suurim kasutaja nähtud CPU52,7%.':'Selle uue koosluse seadme-, heli- ja CPU-kinnitus on ootel.'));
  if(r.components.geq)lines.push('GEQ: 18 tüüpi, A–D, Gain −12…+12 dB, Master Q 0.1…10, Level −80…+20 dB, Balance −100…+100. Ribad määratakse järjekorranumbriga; sagedused sõltuvad Type valikust. Mõõdetud punkt ja skaalast tuletatud väärtus on eraldi. 7 Band Constant Q esimene silt on pildilt kinnitatud 100 Hz. Riistvarakinnitus kehtib ainult täpse allpool tuvastatud koosluse kohta.');
  if(r.components.peq)lines.push('PEQ: viis riba, kanalid A–D. Blocking kasutab Frequency ja Slope; Q ja Gain puuduvad. Mõõdetud punktid ja skaalast arvutatud vaheväärtused on eristatud. Uue kombinatsiooni seadmekontroll on eraldi. Määramata sõnad säilivad algmallist; PID23/24 ei kirjutata.');
  if(r.knownDeviceBody?.cpu)lines.push('Selle katse CPU: '+r.knownDeviceBody.cpu);
  if(r.knownDeviceBody?.audio)lines.push('Selle katse kuulamine: '+r.knownDeviceBody.audio);
  for(const family of ['amp','cab'])if(r.components[family])for(const c of Array.isArray(r.components[family])?r.components[family]:[r.components[family]])
    lines.push(`${family==='amp'?'Amp':'Cab'} ${c.channel}: ${c.model}; ${family==='amp'?'täielik kogutud kanalimall koos Leveliga'+(c.channel==='B'?'; seejärel küsitud B-kanali parameetrid':''):'mõlemad Dyna-Cab pesad ja kogu kogutud kanal, sh mikrofonid, segu, filtrid ning tasemed'}.`);
  lines.push('','PARAMEETRID');
  for(const p of r.effective.filter(p=>p.displaySupported))lines.push(`${p.label}: ${format(p.value)} ${p.unit} [${p.source==='requested'?'määratud kirjelduses':p.source==='base'?'alusfailist':p.source==='scene-plan'?'stseenikirjeldusest':'kogutud mallist'}]`);
  for(const w of r.components.ampLevels??[])lines.push(`Amp ${w.channel} Level: ${format(w.displayValueDb)} dB [kirjelduses ${w.valueDb} dB; ${w.evidence}]`);
  for(const c of r.components.rotary??[])lines.push(`Rotary A ${c.key}: ${c.value} [mõõdetud punkt]`);
  lines.push('','KANALITE MÕJU');
  for(const c of r.affectedChannels)lines.push(`${c.family} ${c.channel}: stseenid ${c.scenes.join(', ')||'puuduvad'}; efekt sees stseenides ${c.activeScenes.join(', ')||'puuduvad'}.`);
  lines.push('','STSEENID 1–8');
  for(const s of r.scenes){lines.push(`Scene ${s.scene}: ${s.name}`);for(const [family,b] of Object.entries(s.blocks))lines.push(`  ${family} ${b.channel}: ${b.type??b.cabs?.map(c=>c.name).join(' + ')??b.mode}; ${b.bypass?'bypass':'sees'}${b.levelDb===undefined?'':'; Level '+b.levelDb.toFixed(2)+' dB'}`)}
  lines.push('','Olemasolevate plokkide määramata seaded, kanalivalikud, bypass ja lülitid säilivad alusfailist; modifikaatorid säilivad, välja arvatud selgesõnaliselt küsitud External 1 → Wah seose allika, Auto Engage’i või Damping’u režiimi muudatus. Kogutud mallid pole tingimata tehasevaikeväärtused.','Tüübimalli valik üksi ei aktiveeri efekti. Stseenikirjeldus määrab kanalid ja efekti sees/bypass oleku; lisatud plokid algavad A/bypass. Kanalite mõju on eespool.','NewLook-alusel lisatakse üksnes küsitud toetatud plokid vabade shuntide asemele. Send/Return ja kaks rida säilivad. Väliseid IR-e ei lisata. Rotary A on piiratud mõõdetud punktidega.','Failitasemel kontrollitud: GET/SYX komponenditõendid, kõik sisubaidid, lubatud alad, routing, kaadrid, CRC, footer, pikkused ja lõputäide.',r.knownDeviceBody?.submittedFileConfirmed?'Selle täpse SYX-faili import ja tagasieksport on kinnitatud: kõik kehabaidid kattuvad. Korduskatset pole vaja. Selle koosluse heli- ja CPU-tõendid on raportis.':r.knownDeviceBody?'Kogu lahtipakitud sisu kattub varasema kasutaja seadmeekspordiga. Seda kodeeritud faili pole eraldi seadmesse imporditud; sama sisu korduseksporti pole vaja. Uut kuulamis- või CPU-hinnangut ei lisandu.':'Selle uue kombinatsiooni seadmeimport, heli, tasemed ja CPU: OOTEL. Aluse ja varasemate üksikplokkide kinnitused ei kinnita automaatselt uut kombinatsiooni.','','KASUTAMINE',...(r.knownDeviceBody?['Impordi soovi korral FM3-Editi tööpuhvrisse. Stseenid ja heliseaded kattuvad raportis nimetatud seadmeekspordiga. Täiendavat ekspordikatset ei nõuta.']:['1. Säilita praegune töö ja impordi SYX FM3-Editi tööpuhvrisse.','2. Kontrolli FM3-Editi võimalikke veateateid. Täpseks tagasivõrdluseks ära muuda parameetreid, kanalivalikuid ega expression-pedaali asendit.',`3. Enne eksporti vali tagasi Scene ${r.selectedScene}. Kui muutsid ise seadeid, märgi need ekspordi juurde.`,`4. Ekspordi terve preset nimega ${r.exportFilename} ja saada võrdluseks.`,'5. Kirjelda kuuldavat tasakaalu ja vajalike efektide sobivust.']),'Tööriist ei ühenda seadet ega saada MIDI/SET/SAVE-käske.',`SHA-256: ${r.outputSha256}`);
  return lines.join('\n')+'\n';
}

export function describeComposerScenes(after,blocks){
  const actual=Buffer.from(after.raw.body),lib=composerLibraries();
  const cabLib=JSON.parse(read('lookup/cab-library.json'));
  return Array.from({length:8},(_,i)=>({scene:i+1,name:after.decoded.scene_names[i],blocks:Object.fromEntries(Object.entries(blocks).map(([family,l])=>{
    const channel=actual.readUInt16LE(l.header+10+2*i),start=l.start+channel*l.words*2,bypass=actual.readUInt16LE(l.header+26+2*i)===1;
    const typeId=l.typePid===undefined?null:actual.readUInt16LE(start+l.typePid*2);
    const type=family==='amp'?catalog.models.find(m=>m.id===typeId)?.name:lib[family]?.models.find(m=>m.binaryId===typeId)?.name;
    const extra={};
    if(family==='cab'){const mode=actual.readUInt16LE(start+62);extra.mode=mode===1?'DYNA-CAB':'inherited';if(mode===1)extra.cabs=[85,86].map(pid=>{const id=actual.readUInt16LE(start+pid*2);return {id,name:cabLib.templates.find(t=>t.expectedId===id)?.name??'ID '+id}})}
    if(family==='amp')extra.levelDb=-80+actual.readUInt16LE(start+2)/65534*100;
    if(family==='rotary')extra.type='Rotary';
    if(family==='peq'){extra.type='Parametric EQ';Object.assign(extra,decodePeqChannel(Array.from({length:33},(_,j)=>actual.readUInt16LE(start+2*j))));}
    if(family==='enhancer')Object.assign(extra,decodeEnhancerChannel(Array.from({length:12},(_,j)=>actual.readUInt16LE(start+2*j))));
    if(family==='geq')Object.assign(extra,decodeGeqChannel(Array.from({length:20},(_,j)=>actual.readUInt16LE(start+2*j))));
    return [family,{channel:'ABCD'[channel],bypass,...(typeId!==null?{typeId,type:type??'ID '+typeId}:{}),...extra}];
  }))}));
}
