// Offline sound pipeline: templates -> layout -> scenes -> controls -> final readback.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {arrangeSound,SLUG_BY_EID,scanRecords} from './fm3-layout.mjs';
import {assertFields,validateOptions,loadDictionary,DEFAULT_STATUSES,OPT_IN_STATUSES,FAMILY_BY_SLUG} from './fm3-table-encoder.mjs';
import {finalSoundState,renderFinalSoundText} from './fm3-final-state.mjs';
import {writePresetOutputs,sha256} from './fm3-output.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {validateLegacyDependencies,dependencyPolicySummary} from './fm3-parameter-dependencies.mjs';
import {wahModifierCapabilities} from './fm3-wah-modifier.mjs';
import {modifierAuditCapabilities} from './fm3-modifier-audit.mjs';
import {typePolicySummary} from './fm3-type-applicability.mjs';
import {pitchCustomScaleSummary} from './fm3-pitch-custom-scales.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export function getSoundCapabilities(base){
  const composer=getComposerCapabilities(base),d=loadDictionary();
  return {profile:'fm3-sound',revision:'0.3.7',firmware:13,base:'jb-newlook',composer,
    fields:['composer','layout','blockScenes','controls','allow','purpose','selectedScene','context'],
    outputs:['.syx','.txt','.spec.json','.validation.json'],
    modifiers:{...wahModifierCapabilities(),field:'composer.modifiers.external1Wah'},
    modifierAudit:modifierAuditCapabilities(),
    globalScaleObservations:{input:'fm3-preset.mjs --global-scales OBSERVATIONS.json',decoder:'global-scale-collector/FM3_DECODE_SCALES.py',requires:'Python 3.9+ for optional observation input and verification',scope:'capture-time display/value crosscheck; report only',changesPresetBytes:false,deviceIO:false,liveGetEncodingVerified:false},
    layout:{rows:[2,3],maxBlocksPerRow:10,blocks:Object.values(SLUG_BY_EID),policy:'Exactly the composed blocks; no removal, duplicates or arbitrary 4-row graph'},
    table:{defaultStatuses:DEFAULT_STATUSES,optInStatuses:OPT_IN_STATUSES,families:FAMILY_BY_SLUG,dictionaryEntries:d.params.length,
      blockedParameters:d.params.filter(p=>p.status==='blocked-hidden-editor').map(p=>({family:p.family,pid:p.param,name:p.name,reason:'Hidden in FM3-Edit 1.07.17; no write support'})),
      pitchCustomScales:pitchCustomScaleSummary(),
      pitchDisplay:{status:'firmware-display-crosschecked',repeats:'1..30 or INFINITE (stored code 31)',globalScales:'SCALE 1..SCALE 32; numeric inputs retain stored indices 0..31',globalScaleContents:false,newHardwareMeasurements:false},
      cabPosition:{parameters:['CABINET_DYNACAB_R1','CABINET_DYNACAB_R2'],displayRange:[0,10],unit:'unitless'},
      typeApplicability:typePolicySummary(),dependencies:dependencyPolicySummary(),
      policy:'Entry counts are not validated device coverage. Chorus/Drive, Delay/Reverb and Flanger/Phaser/Compressor/Wah/Tremolo explicit writes follow final-channel type/algorithm policy. Delay/Reverb/Flanger/Phaser/Compressor/Wah/Tremolo model selectors and Phaser Mode require full channel templates. Pitch TYPE also requires full templates. Rotary has no type selector: PID 0 is Rate. Pitch uses a pinned 34-field integer/nonzero-enum preset-word overlay. Seven local custom notes require final-scale validation; fixed/unused slots remain blocked; global scale contents and arpeggiator playback are not validated. Verified native Flanger aliases preserve exact legacy addresses. 21 tempo pairs and read-only modifier target checks are enforced; other dependencies, including automatic compressor timing/makeup, remain outside this scope. Use full templates for model/type changes.'},
    outputSceneLevels:{supported:true,block:'out1',parameters:'OUTPUT_SCENE1..8',rangeDb:[-20,20],channels:['A','B','C','D']},
    limitations:['No device connection','New output hardware/audio/CPU unconfirmed','Experimental raw/taper writes excluded from this entry point','Global settings, arbitrary routing and all FM3 families are not implemented']};
}
export function composeSound(base,spec){
  assertFields(spec,['composer','layout','blockScenes','controls','allow','purpose','selectedScene','context'],'sound');
  check(spec.composer&&spec.layout,'spec.composer and spec.layout are required');
  validateOptions({allow:spec.allow});
  if(Object.hasOwn(spec,'controls'))check(Array.isArray(spec.controls),'controls must be an array');
  if(Object.hasOwn(spec,'blockScenes'))assertFields(spec.blockScenes,Object.values(SLUG_BY_EID),'blockScenes');
  if(spec.purpose!==undefined)check(typeof spec.purpose==='string'&&spec.purpose.length<=4000&&!/[\x00-\x1f]/.test(spec.purpose),'Invalid sound purpose');
  if(spec.context!==undefined){assertFields(spec.context,['guitar','pickups','output'],'context');for(const v of Object.values(spec.context))check(typeof v==='string'&&v.length>0&&v.length<=300&&!/[\x00-\x1f]/.test(v),'Invalid context value');}
  const first=generatePreset(base,spec.composer);
  check(first.report.baseId==='jb-newlook','Sound composer requires the jb-newlook base');
  const second=arrangeSound(first.syx,spec,{allow:spec.allow??[]});
  const finalBody=Buffer.from(inspectStructure(second.syx).raw.body);
  validateLegacyDependencies(finalBody,Object.fromEntries(scanRecords(finalBody).records.map(r=>[r.family,r])),spec.composer);
  const state=finalSoundState(second.syx,second.writes,{allow:spec.allow??[]});
  const report={generator:'fm3-sound-0.3.7',outputSha256:sha256(second.syx),bytes:second.syx.length,baseSha256:sha256(base),
    checks:{...second.report.checks,finalControlReadback:true,finalStateDecoded:true},
    hardware:'not tested for this final output',audio:'not tested',cpu:'not tested',...state,modifierEdit:first.report.modifierEdit??null,
    stages:{composer:{scope:'intermediate; not final settings',...first.report},layout:{...second.report,rows:second.rows,writes:second.writes,sceneEdits:second.sceneEdits,composerOutputSha256:first.report.outputSha256}}};
  return {syx:second.syx,txt:renderFinalSoundText({...state,modifierEdit:first.report.modifierEdit??null},spec),report,composerReport:first.report,layoutReport:report.stages.layout};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const [b,s,stem,...extra]=process.argv.slice(2);
    if(b==='--capabilities'){check(!stem&&!extra.length,'Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
    else{check(b&&s&&stem&&!extra.length,'Usage: node fm3-sound.mjs BASE.syx SPEC.json OUTPUT_STEM');const spec=JSON.parse(fs.readFileSync(s,'utf8')),r=composeSound(fs.readFileSync(b),spec);writePresetOutputs(stem,r,spec);console.log(JSON.stringify({sha256:r.report.outputSha256,rows:r.report.signalRows,outputs:4}));}
  }catch(e){console.error(e.message);process.exitCode=1;}
}
