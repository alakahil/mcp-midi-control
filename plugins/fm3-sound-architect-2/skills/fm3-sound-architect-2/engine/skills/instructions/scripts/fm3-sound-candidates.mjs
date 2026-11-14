// SV2/SV3/SV5: provisional LIVE KOOSLUS V1.3 comparison. Never device I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const BASE=fileURLToPath(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
import {createPreset,writePresetOutputs} from './fm3-preset.mjs';
import {reviewPreset} from './fm3-preset-review.mjs';
export function candidateSpecs(){
 const baseline=JSON.parse(fs.readFileSync(new URL('../references/sound-workflow/live-v13.input.json',import.meta.url)));
 baseline.context.output='OUT1 aktiivkõlaritesse; mono/stereo ja kõlarimudel täpsustamata';
 const variant=(name,param,value,purpose)=>{
  const s=structuredClone(baseline);s.composer.name=name;s.purpose=purpose;
  s.controls.push(...[...'ABCD'].map(channel=>({block:'cab',channel,param,value})));return s;
 };
 return [
  {id:'BASELINE_V13',spec:baseline,group:'none',expected:'Kuulamisel heaks kiidetud V1.3 lähteheli; SYX taastub muutmata.'},
  {id:'CAB_LOW80',spec:variant('LIVE V13 LOW80','CABINET_LOCUT',80,'SV3 proovivariant: ainult Cab A–D ploki Low Cut 80 Hz; V1.3 stseeninivood ja muu heli säilivad.'),
   group:'Cab filtering',expected:'Vähem sügavat bassi, võimalik selgem palm mute; hinnata ka puhta heli täidlust.'},
  {id:'CAB_HIGH6500',spec:variant('LIVE V13 HIGH6500','CABINET_HICUT',6500,'SV3 proovivariant: ainult Cab A–D ploki High Cut 6500 Hz; V1.3 stseeninivood ja muu heli säilivad.'),
   group:'Cab filtering',expected:'Vähem kõrgsageduslikku teravust, võimalik tumedam rünnak; hinnata läbikostvust.'}
 ];
}
export function build(out){
 assert.equal(process.versions.node.split('.')[0],'22','Use Node 22');
 fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Use empty output directory');
 const list=[];
 for(const c of candidateSpecs()){
  const stem=path.join(out,c.id);writePresetOutputs(stem,createPreset(fs.readFileSync(BASE),c.spec),c.spec);
  const review=reviewPreset(stem);fs.writeFileSync(stem+'.review.json',JSON.stringify(review,null,2)+'\n');
  const pending={version:1,presetSha256:review.files.syx.sha256,syntheticOnly:false,
   status:'pending-final-measurements-store-and-acceptance',historicalListening:review.hardware.historicalListening,
   userAccepted:false,recordingChain:null,comparisonReason:null,
   sceneObservations:review.decoded.scenes.map(s=>({scene:s.scene,name:s.name,cpuPeakPercent:null,relativeLevelDb:null,
    inputClip:null,outputClip:null,dropout:null,roleAccepted:null,transitionsAccepted:null})),
   afterStore:{manuallyStoredAndReloaded:false,heardAgain:false,storedFile:null},
   measurements:{audioAnalysisFile:null},storePolicy:review.storePolicy};
  fs.writeFileSync(stem+'.acceptance-pending.json',JSON.stringify(pending,null,2)+'\n');
  list.push({id:c.id,stem:c.id,group:c.group,expectedAudibleChange:c.expected,files:review.files,risks:review.risks,
   accepted:false,hardware:review.hardware});
 }
 const summary={kind:'fm3-sv2-sv3-candidates',version:1,basis:'LIVE KOOSLUS V1.3; provisional target assumption, not a new user sound selection',
  constraints:['One parameter group per round: Cab filtering','V1.3 scene levels retained','Same DI and playback chain for all variants',
   'Level-match listening copies only','No new Plex/Hold/second-instance writer needed'],candidates:list,deviceIO:false};
 fs.writeFileSync(path.join(out,'candidates.json'),JSON.stringify(summary,null,2)+'\n');return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'Usage: fm3-sound-candidates.mjs EMPTY_OUTPUT');
 console.log(JSON.stringify({presets:build(path.resolve(process.argv[2])).candidates.length,deviceIO:false}));
}
