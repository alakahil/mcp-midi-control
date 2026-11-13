// Offline sound pipeline: templates -> layout -> scenes -> controls -> final readback.
import fs from 'node:fs';
import {effectiveModifierSpec,applyModifierEdits,modifierEditsCapabilities} from './fm3-modifier-edits.mjs';
import {applyCsPreset,readCsPreset,validateCsPreset,csPresetCapabilities,csPresetNeedsControlSwitches} from './fm3-cs-preset.mjs';
import {bindVolumePedal,readVolumePedal,volumePedalCapabilities,volumeRange} from './fm3-volume-pedal.mjs';
import {bindControlSwitches,readControlSwitches,controlSwitchCapabilities,validateControlSwitches} from './fm3-control-switches.mjs';
import {insertVolumePan} from './fm3-volume.mjs';
import {volumePolicySummary} from './fm3-volume-policy.mjs';
import {inputGateSummary} from './fm3-input-gate.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {arrangeSound,SLUG_BY_EID,scanRecords} from './fm3-layout.mjs';
import {assertFields,validateOptions,loadDictionary,DEFAULT_STATUSES,OPT_IN_STATUSES,FAMILY_BY_SLUG} from './fm3-table-encoder.mjs';
import {finalSoundState,renderFinalSoundText} from './fm3-final-state.mjs';
import {writePresetOutputs,sha256} from './fm3-output.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {validateLegacyDependencies,dependencyPolicySummary} from './fm3-parameter-dependencies.mjs';
import {wahModifierCapabilities,verifyWahModifierReadback} from './fm3-wah-modifier.mjs';
import {modifierAuditCapabilities} from './fm3-modifier-audit.mjs';
import {typePolicySummary} from './fm3-type-applicability.mjs';
import {pitchCustomScaleSummary} from './fm3-pitch-custom-scales.mjs';
import {insertBlocks,insertCapabilities} from './fm3-insert-blocks.mjs';
import {editRecords,arrangeGrid,gridCapabilities} from './fm3-grid.mjs';
import {estimateCpu,renderCpuText} from './fm3-cpu.mjs';
import {RECORD_ORDER_MODES} from './fm3-record-order.mjs';
import {orderGridRecords} from './fm3-grid-record-order.mjs';
import {applyMultidelayTypes,validateMultidelayTypes,verifyMultidelayTypesOutput,renderMultidelayTypesText,multidelayTypesCapabilities} from './fm3-multidelay-types.mjs';
import {applyControllers,validateControllers,renderControllersText,controllersCapabilities,applyControllersScenes,validateControllersScenes,applyPresetTempo,validatePresetTempo,renderPresetTempoText} from './fm3-controllers.mjs';
import {bindModifierTargets,readModifierTargets,validateModifierTargets,modifierTargetsCapabilities} from './fm3-modifier-targets.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export function getSoundCapabilities(base){
  const composer=getComposerCapabilities(base),d=loadDictionary();
  return {profile:'fm3-sound',revision:'0.3.70',firmware:13,base:'jb-newlook',composer,
    fields:['composer','layout','grid','remove','duplicate','blockScenes','controls','allow','purpose','selectedScene','context','volumePan','volumePedal','controlSwitches','controlSwitchScenes','footswitches','insert','sceneMidi','controllers','controllersScenes','modifierEdits','multidelayTypes','recordOrder','modifierTargets','tempo'],
    insert:insertCapabilities(),
    controllers:controllersCapabilities(),modifierTargets:modifierTargetsCapabilities(),multidelayTypes:multidelayTypesCapabilities(),modifierEdits:modifierEditsCapabilities(),
    outputs:['.syx','.txt','.spec.json','.validation.json'],
    deviceTests:{guide:'engine/docs/FM3_LOAD_READBACK.md',scripts:'scripts/cpu-sweep-collector',transport:'local POSIX USB serial',load:'validated complete edit-buffer preset only',readback:['block bulk','stored preset','CPU'],automaticStore:false,parameterSet:false,localDeviceAccessRequired:true},
    parameterMap:{command:'fm3-preset.mjs --parameter-map [FAMILY [PID|NAME] | --all]',readOnly:true,scope:'Effective scalar metadata and historical observations; complete preset context still required'},
    gridAudit:{command:'fm3-preset.mjs --inspect-grid PRESET.syx [--format json|txt]',readOnly:true,scope:'Raw masks, known graph edges and record association; unknown bits and physical/global routing remain unresolved'},
    outputVerification:{mode:'deterministic-source-replay',scope:'Complete SYX bytes, canonical TXT and every report field against the requested spec and a hashed bundled base',historicalBundles:'Use their matching verified engine',authenticity:'Software consistency, not a signature or new hardware evidence'},
    modifiers:{...wahModifierCapabilities(),field:'composer.modifiers.external1Wah',autoEngage:{...wahModifierCapabilities().autoEngage,field:'composer.modifiers.wahAutoEngage'},damping:{...wahModifierCapabilities().damping,field:'composer.modifiers.wahDamping'},min:{...wahModifierCapabilities().min,field:'composer.modifiers.wahMin'},controls:{...wahModifierCapabilities().controls,field:'composer.modifiers.wahControls'},exactMinMax:{...wahModifierCapabilities().exactMinMax,field:'composer.modifiers.wahMinMaxExact'}},
    modifierAudit:modifierAuditCapabilities(),
    globalScaleObservations:{input:'fm3-preset.mjs --global-scales OBSERVATIONS.json',decoder:'global-scale-collector/FM3_DECODE_SCALES.py',requires:'Python 3.9+ for optional observation input and verification',scope:'capture-time display/value crosscheck; report only',changesPresetBytes:false,deviceIO:false,liveGetEncodingVerified:false},
    layout:{rows:[2,3],maxBlocksPerRow:10,blocks:Object.values(SLUG_BY_EID).filter(s=>s!=='mixer'&&s!=='multiplexer'&&s!=='scenemidi'),policy:'Serial two-row layout of exactly the composed blocks; use grid for parallel rows, removal and second instances'},
    grid:gridCapabilities(),
    table:{defaultStatuses:DEFAULT_STATUSES,optInStatuses:OPT_IN_STATUSES,families:FAMILY_BY_SLUG,dictionaryEntries:d.params.length,
      blockedParameters:d.params.filter(p=>p.status==='blocked-hidden-editor').map(p=>({family:p.family,pid:p.param,name:p.name,reason:'Hidden in FM3-Edit 1.07.17; no write support'})),
      pitchCustomScales:pitchCustomScaleSummary(),
      pitchDisplay:{status:'firmware-display-crosschecked',repeats:'1..30 or INFINITE (stored code 31)',globalScales:'SCALE 1..SCALE 32; numeric inputs retain stored indices 0..31',globalScaleContents:false,newHardwareMeasurements:false},
      cabPosition:{parameters:['CABINET_DYNACAB_R1','CABINET_DYNACAB_R2'],displayRange:[0,10],unit:'unitless'},
      typeApplicability:typePolicySummary(),dependencies:dependencyPolicySummary(),
      policy:'Entry counts are not validated device coverage. Chorus/Drive, Delay/Reverb and Flanger/Phaser/Compressor/Wah/Tremolo explicit writes follow final-channel type/algorithm policy. Delay/Reverb/Flanger/Phaser/Compressor/Wah/Tremolo model selectors and Phaser Mode require full channel templates. Pitch TYPE also requires full templates. Rotary has no type selector: PID 0 is Rate. Pitch uses a pinned 34-field integer/nonzero-enum preset-word overlay. Seven local custom notes require final-scale validation; fixed/unused slots remain blocked; global scale contents and arpeggiator playback are not validated. Verified native Flanger aliases preserve exact legacy addresses. 21 tempo pairs and read-only modifier target checks are enforced; other dependencies, including automatic compressor timing/makeup, remain outside this scope. Use full templates for model/type changes.'},
    inputGate:inputGateSummary(),volumePan:volumePolicySummary(),volumePedal:volumePedalCapabilities(),controlSwitches:controlSwitchCapabilities(),csPreset:csPresetCapabilities(),
    outputSceneLevels:{supported:true,block:'out1',parameters:'OUTPUT_SCENE1..8',rangeDb:[-20,20],channels:['A','B','C','D']},
    limitations:['No device connection','New output hardware/audio/CPU unconfirmed','Experimental raw/taper writes excluded from this entry point','Global settings and all FM3 families are not implemented','Grid mode: Mixer/Multiplexer parameters and bit 4 of the grid input mask are not decoded']};
}
export function composeSound(base,spec){
  assertFields(spec,['composer','layout','grid','remove','duplicate','blockScenes','controls','allow','purpose','selectedScene','context','volumePan','volumePedal','controlSwitches','controlSwitchScenes','footswitches','insert','sceneMidi','controllers','controllersScenes','modifierEdits','multidelayTypes','recordOrder','modifierTargets','tempo'],'sound');
  check(spec.composer&&(spec.layout===undefined)!==(spec.grid===undefined),'spec.composer and exactly one of spec.layout / spec.grid are required');
  const finalSpec=effectiveModifierSpec(spec);
  const gridMode=spec.grid!==undefined;
  check(gridMode||(spec.remove===undefined&&spec.duplicate===undefined),'remove and duplicate need grid mode (spec.grid)');
  check(gridMode||spec.sceneMidi===undefined,'sceneMidi needs grid mode (spec.grid) with insert:["scenemidi"]');
  validateOptions({allow:spec.allow});
  if(Object.hasOwn(spec,'controls'))check(Array.isArray(spec.controls),'controls must be an array');
  if(Object.hasOwn(spec,'blockScenes'))check(spec.blockScenes&&typeof spec.blockScenes==='object'&&!Array.isArray(spec.blockScenes),'blockScenes must be an object');
  if(spec.purpose!==undefined)check(typeof spec.purpose==='string'&&spec.purpose.length<=4000&&!/[\x00-\x1f]/.test(spec.purpose),'Invalid sound purpose');
  if(spec.context!==undefined){assertFields(spec.context,['guitar','pickups','output'],'context');for(const v of Object.values(spec.context))check(typeof v==='string'&&v.length>0&&v.length<=300&&!/[\x00-\x1f]/.test(v),'Invalid context value');}
  if(Object.hasOwn(spec,'volumePan'))check(spec.volumePan===true,'volumePan must be true to request insertion');
  if(Object.hasOwn(spec,'volumePedal')){
    volumeRange(spec.volumePedal);check(spec.volumePan===true,'volumePedal requires volumePan:true');
    const mods=spec.composer.modifiers;
    check(!mods||mods.external1Wah===true||Object.keys(mods).every(k=>k==='external1Wah'),'Volume pedal: Wah modifier settings need external1Wah:true (the Volume binding then goes to record 1)');
  }
  if(Object.hasOwn(spec,'controlSwitches'))validateControlSwitches(spec.controlSwitches);
  if(Object.hasOwn(spec,'modifierTargets'))validateModifierTargets(spec.modifierTargets);
  if(Object.hasOwn(spec,'tempo'))validatePresetTempo(spec.tempo);
  if(Object.hasOwn(spec,'controllers'))validateControllers(spec.controllers);
  if(Object.hasOwn(spec,'controllersScenes'))validateControllersScenes(spec.controllersScenes);
  if(Object.hasOwn(spec,'multidelayTypes'))validateMultidelayTypes(spec.multidelayTypes);
  if(Object.hasOwn(spec,'recordOrder'))check((spec.insert!==undefined||(gridMode&&spec.duplicate!==undefined))&&RECORD_ORDER_MODES.includes(spec.recordOrder),'recordOrder needs insert (or duplicate in grid mode) and one of: '+RECORD_ORDER_MODES.join(', '));
  const csPresetRequested=Object.hasOwn(spec,'controlSwitchScenes')||Object.hasOwn(spec,'footswitches');
  if(csPresetRequested){if(csPresetNeedsControlSwitches(spec))check(Object.hasOwn(finalSpec,'controlSwitches'),'controlSwitchScenes / Control Switch footswitches need final controlSwitches bindings');validateCsPreset(finalSpec);}
  const first=generatePreset(base,spec.composer);
  check(first.report.baseId==='jb-newlook','Sound composer requires the jb-newlook base');
  const volume=spec.volumePan?insertVolumePan(first.syx):null;
  const inserted=gridMode||spec.insert===undefined?null:insertBlocks(volume?.syx??first.syx,spec.insert,{recordOrder:spec.recordOrder??'device'});
  const records=gridMode?editRecords(volume?.syx??first.syx,{remove:spec.remove??[],duplicate:spec.duplicate??[],add:spec.insert??[]}):null;
  // 0.3.70: recordOrder in grid mode moves the added records to the device order (default append = unchanged output).
  const gridOrder=records&&Object.hasOwn(spec,'recordOrder')?orderGridRecords(records.syx,[...records.inserted.map(x=>({block:x.block,effectId:x.effectId})),...records.duplicated.map(x=>({block:x.block,effectId:x.effectId}))],spec.recordOrder):null;
  const arrangedInput=gridOrder?.syx??records?.syx??inserted?.syx??volume?.syx??first.syx;
  const pedal=spec.volumePedal?bindVolumePedal(arrangedInput,spec.volumePedal):null;
  const switches=spec.controlSwitches?bindControlSwitches(pedal?.syx??arrangedInput,spec.controlSwitches):null;
  // Generic targets (0.3.60) take the next unused records after the Volume and Control Switch bindings.
  const targets=spec.modifierTargets?bindModifierTargets(switches?.syx??pedal?.syx??arrangedInput,spec.modifierTargets):null;
  const edits=Object.hasOwn(spec,'modifierEdits')?applyModifierEdits(targets?.syx??switches?.syx??pedal?.syx??arrangedInput,spec,{pedal,switches}):null;
  const csp=csPresetRequested?applyCsPreset(edits?.syx??targets?.syx??switches?.syx??pedal?.syx??arrangedInput,finalSpec):null;
  const bound=csp?.syx??edits?.syx??targets?.syx??switches?.syx??pedal?.syx??arrangedInput;
  // Multi Delay Type (0.3.56): measured full-channel images replace the channel before layout/controls.
  const mdt=Object.hasOwn(spec,'multidelayTypes')?applyMultidelayTypes(bound,spec.multidelayTypes):null;
  const templated=mdt?.syx??bound;
  const arranged=gridMode?arrangeGrid(templated,spec,{allow:spec.allow??[]}):arrangeSound(templated,spec,{allow:spec.allow??[]});
  // Controllers (prefix record, effect id 2) are written last, on the arranged preset; only their words change.
  const ctl=spec.controllers?applyControllers(arranged.syx,spec.controllers,{allow:spec.allow??[]}):null;
  const cts=Object.hasOwn(spec,'controllersScenes')?applyControllersScenes(ctl?.syx??arranged.syx,spec.controllersScenes):null;
  const tmp=Object.hasOwn(spec,'tempo')?applyPresetTempo((cts??ctl??arranged).syx,spec.tempo):null;
  const second=ctl||cts||tmp?{...arranged,syx:(tmp??cts??ctl).syx}:arranged;
  const finalBody=Buffer.from(inspectStructure(second.syx).raw.body);
  validateLegacyDependencies(finalBody,Object.fromEntries(scanRecords(finalBody).records.map(r=>[r.family,r])),spec.composer);
  // A Volume binding in record 0 replaced the composer's (inactive) Wah record; in record 1 the Wah edit is final.
  const modifierEdit=pedal?.record===0?null:first.report.modifierEdit??null;
  verifyWahModifierReadback(finalBody,modifierEdit);
  if(mdt)verifyMultidelayTypesOutput(finalBody,spec,mdt.channels,mdt.report);
  if(finalSpec.volumePedal){const vr=scanRecords(finalBody).records.find(r=>r.eid===102);
    for(let ch=0;ch<4;ch++)check(finalBody.readUInt16LE(vr.start+ch*vr.words*2+18)===0,`volumePedal binds Volume, which AUTO-SWELL hides (volpan channel ${'ABCD'[ch]})`);}
  const volumePedal=finalSpec.volumePedal?readVolumePedal(finalBody,volumeRange(finalSpec.volumePedal),edits?.region):null;
  const controlSwitches=finalSpec.controlSwitches?readControlSwitches(finalBody,finalSpec.controlSwitches):null;
  const modifierTargets=finalSpec.modifierTargets?readModifierTargets(finalBody,finalSpec.modifierTargets):null;
  const csPreset=csp?readCsPreset(finalBody,finalSpec):null;
  const switchReport=controlSwitches?{...switches?.report,policy:'control-switch-default-template-fw13',evidenceSha256:controlSwitchCapabilities().evidence.sha256,records:controlSwitches.map(c=>c.record),onlyDeclaredWordsChanged:true,bodyReadback:true,dumpHeaderPreserved:true,deviceIO:false}:null;
  const state=finalSoundState(second.syx,second.writes,{allow:spec.allow??[]});
  const cpuEstimate=estimateCpu(second.syx);
  const report={generator:'fm3-sound-0.3.70',outputSha256:sha256(second.syx),bytes:second.syx.length,baseSha256:sha256(base),
    checks:{...second.report.checks,finalControlReadback:true,finalStateDecoded:true},
    hardware:'not tested for this final output',audio:'not tested',cpu:cpuEstimate,...state,modifierEdit,volumePedal,...(controlSwitches?{controlSwitches}:{}),...(modifierTargets?{modifierTargets}:{}),...(tmp?{presetTempo:tmp.state}:{}),...(edits?{modifierEdits:edits.report}:{}),...(csp?{csPreset}:{}),...(ctl?{controllers:ctl.writes}:{}),...(cts?{controllersScenes:[...cts.channels]}:{}),...(mdt?{multidelayTypes:mdt.channels}:{}),
    stages:{volumePedal:volumePedal?pedal.report:null,...(targets?{modifierTargets:targets.report}:{}),...(tmp?{presetTempo:tmp.report}:{}),...(edits?{modifierEdits:edits.report}:{}),...(ctl?{controllers:ctl.report}:{}),...(cts?{controllersScenes:cts.report}:{}),...(mdt?{multidelayTypes:mdt.report}:{}),...(switchReport?{controlSwitches:switchReport}:{}),...(csp?{csPreset:csp.report}:{}),volumePan:volume?.report??null,composer:{scope:'intermediate; not final settings',...first.report},...(inserted?{insert:{...inserted.report,inserted:inserted.inserted}}:{}),...(records?{records:{...records.report,removed:records.removed,inserted:records.inserted,duplicated:records.duplicated,...(gridOrder?{recordOrder:gridOrder.recordOrder}:{})}}:{}),layout:{...second.report,rows:second.rows,...(gridMode?{expectedGrid:second.expectedGrid}:{}),writes:second.writes,sceneEdits:second.sceneEdits,...(second.sceneMidi?{sceneMidi:second.sceneMidi}:{}),composerOutputSha256:first.report.outputSha256}}};
  return {syx:second.syx,txt:renderFinalSoundText({...state,modifierEdit,volumePedal,controlSwitches,modifierTargets,csPreset,modifierEdits:edits?.report},spec)+renderControllersText(ctl?.writes,cts?.channels)+renderPresetTempoText(tmp?.state)+renderMultidelayTypesText(mdt?.channels)+renderCpuText(cpuEstimate)+'\n',report,composerReport:first.report,layoutReport:report.stages.layout};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const [b,s,stem,...extra]=process.argv.slice(2);
    if(b==='--capabilities'){check(!stem&&!extra.length,'Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
    else{check(b&&s&&stem&&!extra.length,'Usage: node fm3-sound.mjs BASE.syx SPEC.json OUTPUT_STEM');const spec=JSON.parse(fs.readFileSync(s,'utf8')),r=composeSound(fs.readFileSync(b),spec);writePresetOutputs(stem,r,spec);console.log(JSON.stringify({sha256:r.report.outputSha256,rows:r.report.signalRows,outputs:4}));}
  }catch(e){console.error(e.message);process.exitCode=1;}
}
