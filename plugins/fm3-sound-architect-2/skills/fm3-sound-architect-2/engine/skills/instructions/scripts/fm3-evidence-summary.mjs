// Current bounded evidence, shared by capabilities and the generated guide summary.
// Dated receipts remain immutable. Counts never imply confirmation of a new output.
import fs from 'node:fs';
export function evidenceSummary(){
 const e=JSON.parse(fs.readFileSync(new URL('../references/fm3-current-evidence.json',import.meta.url)));
 return {asOf:e.asOf,
  multiDelay:{templates:e.multiDelay.length,generatedImports:e.multiDelay.filter(x=>x.generatedDeviceImport==='confirmed').length,
   storeReload:e.multiDelay.filter(x=>x.storeReload==='confirmed').length,evidence:['T35','T36','T38','H2','T49'],
   selectorWriteSupported:false,templateField:'multidelayTypes',newOutputConfirmed:false,postStoreListeningH2:false},
  footswitches:{switchConfirmed:Object.values(e.auditH6T45.pluginEffects).filter(x=>x.status==='switch-confirmed').length,
   addedAfterDriveAndDelay:e.auditT47.promotedToSwitchConfirmed.length+e.auditT48.promotedToSwitchConfirmed.length,
   displayOnly:Object.entries(e.auditH6T45.pluginEffects).filter(([,x])=>x.status==='display-mapped').map(([k])=>k),holdWriter:false},
  modifierCurves:{supported:true,measuredConfigurations:e.auditT50.targets,otherTargets:'formula-derived; not individually device-tested',
   autoEngage:false,offValue:false,secondarySource:false},
  parallelLevels:{evidence:'T51B',finding:'Four unity-level rows clipped OUT 1',automaticMixerTrim:false,staticCheck:'risk only; not a signal-level simulation'},
  liveV13:{listening:'accepted in L1',numericalLevel:'not-measured',cpu:'not-measured',storeReload:'not-measured'},
  plexTemplates:{measured:e.otherEvidence.plexPresets.images,writer:e.otherEvidence.plexPresets.generatorSupport},
  deviceIO:false,newHardwareMeasurements:false};
}
export function evidenceSummaryText(s=evidenceSummary()){
 return [
  `- Multi Delay: **${s.multiDelay.templates} malli / ${s.multiDelay.generatedImports} genereeritud importi / ${s.multiDelay.storeReload} STORE-kinnitust** (T35/T36/T38/H2/T49). Kasuta \`multidelayTypes\`; üksiku \`MULTITAP_PRESETS\` otsekirjutus on keelatud. H2 järelkuulamist eraldi ei tehtud. Uue faili heli ja STORE vajavad oma kontrolli.`,
  `- Jalglülitid: **${s.footswitches.switchConfirmed} plokki kokku**, neist **${s.footswitches.addedAfterDriveAndDelay} lisaks** Drive 1 / Delay 1-le (T45/T47/T48). Resonator 2 on ainult kuva järgi kaardistatud. Hold-kirjutus puudub.`,
  '- Modifikaatorikõverad on toetatud. T50 kinnitab Filter Frequency / Envelope Follower, Amp Level / LFO 1A ja Delay Mix / Scene Controller 1 nimetatud välju ning katsevahemikke. Muud sihid on valemipõhised; Auto Engage, Off Value ja teisene allikas selle liidese kaudu puuduvad.',
  '- Paralleelharud: T51B neli unity-nivool rida klippisid OUT 1. Staatiline kontroll märgib liitumisriski; automaatset Mixer-trimmi ega klippimisvabaduse garantiid pole.',
  '- LIVE KOOSLUS V1.3 tasakaal on L1 kuulamisel heaks kiidetud. V1.3 arvuline nivoo, tegelik CPU ja STORE/reload on mõõtmata. V1 varasem valjuse probleem on ajalugu.',
  `- Plex: ${s.plexTemplates.measured} mõõdetud kanalipilti, avalik täismallide kirjutaja puudub. Laiendus ainult soundi vajadusel.`,
  '- CPU on hinnang. Failikontroll, seadmeimport, kuulamine ja STORE on eraldi tõenditasemed. Uue vestluse automaatset avastamist ei tõenda arenduskeskkonna taaste.'
 ].join('\n');
}
