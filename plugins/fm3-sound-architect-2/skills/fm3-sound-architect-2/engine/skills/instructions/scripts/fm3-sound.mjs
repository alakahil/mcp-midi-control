// Offline sound pipeline: templates -> layout -> scenes -> controls -> final readback.
import fs from 'node:fs';
import {applyCsPreset,readCsPreset,validateCsPreset,csPresetCapabilities} from './fm3-cs-preset.mjs';
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
const check=(v,m)=>{if(!v)throw Error(m)};
export function getSoundCapabilities(base){
  const composer=getComposerCapabilities(base),d=loadDictionary();
  return {profile:'fm3-sound',revision:'0.3.35',firmware:13,base:'jb-newlook',composer,
    fields:['composer','layout','grid','remove','duplicate','blockScenes','controls','allow','purpose','selectedScene','context','volumePan','volumePedal','controlSwitches','controlSwitchScenes','footswitches','insert','sceneMidi'],
    insert:insertCapabilities(),
    outputs:['.syx','.txt','.spec.json','.validation.json'],
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
  assertFields(spec,['composer','layout','grid','remove','duplicate','blockScenes','controls','allow','purpose','selectedScene','context','volumePan','volumePedal','controlSwitches','controlSwitchScenes','footswitches','insert','sceneMidi'],'sound');
  check(spec.composer&&(spec.layout===undefined)!==(spec.grid===undefined),'spec.composer and exactly one of spec.layout / spec.grid are required');
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
  const csPresetRequested=Object.hasOwn(spec,'controlSwitchScenes')||Object.hasOwn(spec,'footswitches');
  if(csPresetRequested){check(Object.hasOwn(spec,'controlSwitches'),'controlSwitchScenes / footswitches need controlSwitches bindings');validateCsPreset(spec);}
  const first=generatePreset(base,spec.composer);
  check(first.report.baseId==='jb-newlook','Sound composer requires the jb-newlook base');
  const volume=spec.volumePan?insertVolumePan(first.syx):null;
  const inserted=gridMode||spec.insert===undefined?null:insertBlocks(volume?.syx??first.syx,spec.insert);
  const records=gridMode?editRecords(volume?.syx??first.syx,{remove:spec.remove??[],duplicate:spec.duplicate??[],add:spec.insert??[]}):null;
  const arrangedInput=records?.syx??inserted?.syx??volume?.syx??first.syx;
  const pedal=spec.volumePedal?bindVolumePedal(arrangedInput,spec.volumePedal):null;
  const switches=spec.controlSwitches?bindControlSwitches(pedal?.syx??arrangedInput,spec.controlSwitches):null;
  const csp=csPresetRequested?applyCsPreset(switches.syx,spec):null;
  const bound=csp?.syx??switches?.syx??pedal?.syx??arrangedInput;
  const second=gridMode?arrangeGrid(bound,spec,{allow:spec.allow??[]}):arrangeSound(bound,spec,{allow:spec.allow??[]});
  const finalBody=Buffer.from(inspectStructure(second.syx).raw.body);
  validateLegacyDependencies(finalBody,Object.fromEntries(scanRecords(finalBody).records.map(r=>[r.family,r])),spec.composer);
  // A Volume binding in record 0 replaced the composer's (inactive) Wah record; in record 1 the Wah edit is final.
  const modifierEdit=pedal?.record===0?null:first.report.modifierEdit??null;
  verifyWahModifierReadback(finalBody,modifierEdit);
  if(pedal){const vr=scanRecords(finalBody).records.find(r=>r.eid===102);
    for(let ch=0;ch<4;ch++)check(finalBody.readUInt16LE(vr.start+ch*vr.words*2+18)===0,`volumePedal binds Volume, which AUTO-SWELL hides (volpan channel ${'ABCD'[ch]})`);}
  const volumePedal=pedal?readVolumePedal(finalBody,volumeRange(spec.volumePedal)):null;
  const controlSwitches=switches?readControlSwitches(finalBody,spec.controlSwitches):null;
  const csPreset=csp?readCsPreset(finalBody,spec):null;
  const state=finalSoundState(second.syx,second.writes,{allow:spec.allow??[]});
  const cpuEstimate=estimateCpu(second.syx);
  const report={generator:'fm3-sound-0.3.35',outputSha256:sha256(second.syx),bytes:second.syx.length,baseSha256:sha256(base),
    checks:{...second.report.checks,finalControlReadback:true,finalStateDecoded:true},
    hardware:'not tested for this final output',audio:'not tested',cpu:cpuEstimate,...state,modifierEdit,volumePedal,...(switches?{controlSwitches}:{}),...(csp?{csPreset}:{}),
    stages:{volumePedal:pedal?.report??null,...(switches?{controlSwitches:switches.report}:{}),...(csp?{csPreset:csp.report}:{}),volumePan:volume?.report??null,composer:{scope:'intermediate; not final settings',...first.report},...(inserted?{insert:{...inserted.report,inserted:inserted.inserted}}:{}),...(records?{records:{...records.report,removed:records.removed,inserted:records.inserted,duplicated:records.duplicated}}:{}),layout:{...second.report,rows:second.rows,...(gridMode?{expectedGrid:second.expectedGrid}:{}),writes:second.writes,sceneEdits:second.sceneEdits,...(second.sceneMidi?{sceneMidi:second.sceneMidi}:{}),composerOutputSha256:first.report.outputSha256}}};
  return {syx:second.syx,txt:renderFinalSoundText({...state,modifierEdit,volumePedal,controlSwitches,csPreset},spec)+renderCpuText(cpuEstimate)+'\n',report,composerReport:first.report,layoutReport:report.stages.layout};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const [b,s,stem,...extra]=process.argv.slice(2);
    if(b==='--capabilities'){check(!stem&&!extra.length,'Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
    else{check(b&&s&&stem&&!extra.length,'Usage: node fm3-sound.mjs BASE.syx SPEC.json OUTPUT_STEM');const spec=JSON.parse(fs.readFileSync(s,'utf8')),r=composeSound(fs.readFileSync(b),spec);writePresetOutputs(stem,r,spec);console.log(JSON.stringify({sha256:r.report.outputSha256,rows:r.report.signalRows,outputs:4}));}
  }catch(e){console.error(e.message);process.exitCode=1;}
}
