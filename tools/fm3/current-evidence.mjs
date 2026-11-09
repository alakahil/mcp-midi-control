// Current evidence, rebuilt from dated receipts and the public runtime contract. No device I/O.
// Historical receipts are immutable inputs; missing hardware evidence is never promoted by a software test.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const EP='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const E=path.join(ROOT,EP), sources=new Map();
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const b=fs.readFileSync(path.join(ROOT,p));sources.set(p,sha(b));return b;};
const receipt=f=>JSON.parse(read(EP+'references/'+f));
const t={};for(let n=32;n<=38;n++){
 const names={32:'live-20261106',33:'controllers-scene-20261106',34:'controllers-sources-20261107',35:'multidelay-presets-20261107',36:'multidelay-types-20261107',37:'synth-cpu-20261107',38:'multidelay-store-20261107'};
 t[n]=receipt(`fm3-t${n}-${names[n]}.json`);
}
const t42=receipt('fm3-t42-modifier-targets-20261109.json');
const combo=receipt('fm3-combo-store-20261029.json');
const t3941=receipt('fm3-t39-t41-controllers-store-20261109.json');
const stored3941=new Set(t3941.parts.filter(p=>p.storeReload==='confirmed'&&p.storedBodyByteIdentical).map(p=>p.source));
const {VOLUME_SOURCES,volumePedalCapabilities}=await import(path.join(E,'scripts/fm3-volume-pedal.mjs'));
const {MULTIDELAY_TYPE_LABELS}=await import(path.join(E,'scripts/fm3-multidelay-types.mjs'));
const {loadDictionary,DEFAULT_STATUSES,OPT_IN_STATUSES}=await import(path.join(E,'scripts/fm3-table-encoder.mjs'));
for(const f of ['fm3-volume-pedal.mjs','fm3-multidelay-types.mjs','fm3-table-encoder.mjs','fm3-enum-promotion.mjs'])read(EP+'scripts/'+f);
for(const f of ['fm3-param-dictionary.json','fm3-enum-promotion-20261103.json','fm3-shot-t30-enum-20261105.json','fm3-shot-t31-cab-cpu-20261105.json'])receipt(f);
read('tools/fm3/current-evidence.mjs');
const dictionary=loadDictionary().params;
const enumCounts={defaultPromoted:dictionary.filter(p=>p.enumEvidence).length,optIn:dictionary.filter(p=>p.status==='enum-labels').length};
const scalarDescriptors=dictionary.filter(p=>[...DEFAULT_STATUSES,...OPT_IN_STATUSES].includes(p.status)&&['enum','integer','linear','log','knob'].includes(p.kind)).length;
assert.deepEqual(enumCounts,{defaultPromoted:227,optIn:121});assert.equal(scalarDescriptors,2114);
assert.equal(t[33].findings.modifierSource.storedAndReloaded,true);
assert.equal(t[34].findings.scenes5to8.storedAndReloaded,true);
assert.ok(combo.findings.some(s=>s.includes('External 1 -> Volume')));
const confirmed=volumePedalCapabilities().sources.deviceConfirmed;
const controllers=Object.entries(VOLUME_SOURCES).map(([name,code])=>{
 const stored=name==='External 1'||name==='LFO 1A'||stored3941.has(name);
 const observed=Object.hasOwn(confirmed,name);
 if(t[34].findings.sources.confirmed[name])assert.equal(t[34].findings.sources.confirmed[name].stored,false);
 return {name,code,softwareSupported:true,target:'Volume/Pan 1 Volume (102:0), ALL',
  deviceImport:observed?'confirmed':'not-measured',audibleBehavior:observed?'confirmed':'not-measured',
  storeReload:stored?'confirmed':'not-measured',
  evidence:observed?[confirmed[name],...(name==='External 1'?['T11 STORE']:[])]:[],
  scope:observed?'Only the dated test settings and target; not every curve/rate/target.':'Source code from the editor list; software support is not a device test.'};
});
assert.equal(controllers.filter(r=>r.deviceImport==='confirmed').length,19);
assert.equal(controllers.filter(r=>r.storeReload==='confirmed').length,19);
const multiDelay=t[35].presets.map(p=>{
 const imported=t[36].types.some(x=>x.type===p.label),stored=t[38].types.some(x=>x.type===p.label);
 assert.equal(MULTIDELAY_TYPE_LABELS[p.index],p.label);assert.equal(p.words.length,121);
 return {index:p.index,name:p.label,algorithm:p.algorithm,softwareSupported:true,
  measuredFullChannelWords:121,templateStart:'device default, channel A',
  generatedDeviceImport:imported||stored?'confirmed':'not-measured',
  audibleBehavior:imported||stored?'confirmed':'not-measured',storeReload:stored?'confirmed':'not-measured',
  evidence:['T35',...(imported?['T36']:[]),...(stored?['T38']:[])],
  scope:'Whole-channel template before controls; Type selector alone is not a fill operation.'};
});
assert.equal(multiDelay.length,39);assert.equal(multiDelay.filter(r=>r.generatedDeviceImport==='confirmed').length,8);
assert.equal(multiDelay.filter(r=>r.storeReload==='confirmed').length,4);
const {modifierTargetsCapabilities}=await import(path.join(E,'scripts/fm3-modifier-targets.mjs'));
read(EP+'scripts/fm3-modifier-targets.mjs');
const targetSupport=modifierTargetsCapabilities();assert.equal(targetSupport.targets,468);
const modifierTargets={softwareSupported:true,namedTargets:468,maxBindings:8,
 flagRule:{bit:'0x0080',allowedWhen:'clear and labelled',acceptedTargetsObserved:20,rejectedTargetsObserved:1,
  scope:'Rule inference, not 468 individually measured targets.'},
 measured:t42.parts.filter(p=>p.hypothesis==='H1').map(p=>({case:p.case,target:p.target,source:p.source,
  min:p.min.display,max:p.max.display,channel:'ALL',curve:'default',deviceImport:'confirmed',display:'confirmed',
  audibleBehavior:'confirmed',storeReload:'confirmed',storedBodyByteIdentical:true,
  generatedFinalPresetImport:'not-measured',evidence:'T42',scope:t42.scope})),
 rejected:t42.parts.filter(p=>p.hypothesis==='H2').map(p=>({case:p.case,target:p.target,softwareSupported:false,
  deviceResult:p.deviceResult,clearedWords:p.clearedWords,evidence:'T42'})),
 scope:'T42 research files; public-generator final presets and A-D/channel combinations require their own device test.'};
assert.equal(modifierTargets.measured.length,3);assert.equal(modifierTargets.rejected.length,1);
const presetTempo={softwareSupported:true,rangeBpm:[24,250],integerOnly:true,channels:['A','B','C','D'],tempoToUse:'PRESET',
 measured:t42.parts.filter(p=>p.hypothesis==='H3').map(p=>({case:p.case,bpm:p.tempoBpm,storedWord:p.storedWord,
  display:'confirmed',storeReload:'confirmed',evidence:'T42'})),
 scope:'97 and 143 BPM only; not every BPM, tempo-synced effect, tap-tempo or global setting.'};
assert.deepEqual(presetTempo.measured.map(p=>p.bpm),[97,143]);
const current={schemaVersion:1,asOf:'2026-11-09',hardwareEvidenceThrough:'2026-11-09',baselineVersion:'0.3.62',
 scope:'T32-T42 and their named prerequisite receipts; current software contract, not a complete claim about every FM3 function.',
 definitions:{confirmed:'A cited dated device result exists in the stated scope.',notMeasured:'No cited device result for this scope; not a failure and not a software-support restriction.'},
 enumCounts,scalarDescriptors,controllers,multiDelay,modifierTargets,presetTempo,
 otherEvidence:{
  controllersScenes:{scenes:8,channels:['A','B','C','D'],storeReload:'confirmed',evidence:['T33','T34A'],scope:'The measured scene/channel selections, not every permutation.'},
  liveComposition:{evidence:['T32','T34E'],cpuPercent:t[32].cpu.scenes.map(s=>s.measuredPercent),storedBlockRecords:11,
   finalLeadLevelDb:t[32].level.finalAmpCLevelDb,finalListening:t[34].findings.liveKooslusV1.as,
   limitations:['No numerical loudness measurement.','T32 CPU/STORE belong to the measured file; the final -8 dB file has T34 listening, not an independent full CPU/STORE repeat.']},
  synthCpu:{evidence:['T37'],presets:t[37].items.length,model:'0.2.5',rule:t[37].rule,scope:'Measured voice types/settings, not all non-default parameters.'},
  cabCuts:{evidence:['T34F'],displayReadings:t[34].findings.cabPreampNone.controls.map(c=>({param:c.param,shown:c.shown,page:c.page})),
   preampTypeNoneReadback:'not-measured',scope:'Cuts visible in the preset prepared with NONE; the Preamp Type value itself was not read back.'},
  recordOrder:{evidence:['T38'],storedBodyReproduced:t[38].result.deviceRecordOrderBodyByteIdentical,scope:'T38 same spec with device order; insert only, unknown-pair fallback; grid unchanged.'}},
 supersededHistoricalGaps:[
  {from:'T32 final -8 dB listening pending',resolvedBy:'T34E',remaining:'Numerical loudness; separate final-file CPU/STORE.'},
  {from:'T33 scenes 5-8 pending',resolvedBy:'T34A',remaining:'Other source/target/shape combinations.'},
  {from:'T34 sources B-D edit buffer only; 14 sources unmeasured',resolvedBy:'T39-T41',remaining:'Other LFO shapes/depths, modifier curves and targets.'},
  {from:'T35 no generated Type import or STORE',resolvedBy:'T36 and T38',remaining:'31 unimported generated Types; T36 four Types lack their own STORE result.'}],
 notPromoted:['General modifier allocator and arbitrary preset bases.','Other footswitch layouts, Hold and every PP definition.','Out 2 stereo/right and 4CM.','New preset audio/CPU/STORE.','Fresh-chat automatic launcher discovery.'],
 sources:Object.fromEntries([...sources].sort(([a],[b])=>a.localeCompare(b))),newHardwareMeasurements:false,deviceIO:false};
const mark=s=>s==='confirmed'?'jah':'mõõtmata';
const md=['# FM3 kehtiv tõendiseis','',`Koondatud ${current.asOf}; seadmetõendid kuni ${current.hardwareEvidenceThrough}. Alus ${current.baselineVersion}.`,
 '','See on ulatusega tõendikoond, mitte kõigi FM3 võimaluste valmidusprotsent. „Mõõtmata” ei tähenda keelatud sisendit ega ebaõnnestunud katset.',
 '',`Enum: ${enumCounts.defaultPromoted} vaikimisi / ${enumCounts.optIn} opt-in; scalarDescriptors: ${scalarDescriptors}.`,
 '','## Controllersi allikad','', '| Allikas | Kood | Tarkvaratugi | Import / käitumine | STORE | Tõend |','|---|---:|---|---|---|---|',
 ...controllers.map(r=>`| ${r.name} | ${r.code} | jah | ${mark(r.deviceImport)} / ${mark(r.audibleBehavior)} | ${mark(r.storeReload)} | ${r.evidence.join('; ')||'FM3-Editi allikaloend'} |`),
 '','Siht: Volume/Pan 1 Volume, ALL. T39-T41 (09.11.2026) kinnitasid ülejäänud 17 allikat: õige Source, ootuspärane heli ning STORE/reload baiditäpselt, ainult katse seadetega. Controllersi kõik kaheksa stseenikanalit on T33/T34 ulatuses kinnitatud. See ei laienda tuge suvalisele sihtparameetrile.',
 '','## T42: modifikaatori sihid ja tempo','',
 '| Siht | Allikas | Min–Max | Import / kuva / heli / STORE | Ulatus |',
 '|---|---|---|---|---|',
 ...modifierTargets.measured.map(p=>`| ${p.target} | ${p.source} | ${p.min}–${p.max} | kinnitatud | T42, ALL, vaikekõver |`),
 '', 'Delay Low Cut on keelatud: FM3 tühjendas Source ja sihtploki. 468 nimega sihti on lipureegli põhjal lubatud, mitte eraldi mõõdetud.',
 'Preseti tempo tarkvaravahemik 24–250 BPM; T42 kinnitab 97 ja 143 BPM näidu ning STORE/reload säilimise.',
 'Avaliku generaatori uue lõppfaili import, A–D piirangud ja kooskasutus jäävad eraldi katsesse. Algkviitungit ei muudeta.',
 '','## MultiDelay Type mallid','', '| Tüüp | Mõõdetud sõnu | Generaatori import | Heli | STORE | Tõend |','|---|---:|---|---|---|---|',
 ...multiDelay.map(r=>`| ${r.name} | ${r.measuredFullChannelWords} | ${mark(r.generatedDeviceImport)} | ${mark(r.audibleBehavior)} | ${mark(r.storeReload)} | ${r.evidence.join(', ')} |`),
 '','39 malli, 8 generaatori importi, 4 STORE-kinnitust. Mall asendab kogu kanali enne controls-muudatusi; üksik Type sõna ei täida kanalit.',
 '','## Muud T32-T41 tulemused','',
 '- T32: 8 stseeni CPU 55-71%, 11 ploki andmed säilisid STORE järel. T34E kinnitab lõpliku -8 dB lead-nivoo kuulamist; arvuline nivoo ja lõppfaili eraldi CPU/STORE puuduvad.',
 '- T37: Synthi häälte 2/3 mõõdetud tüübid on CPU mudelis 0.2.5; muud parameetrid vajavad oma tõendit.',
 '- T34F: Cab lõiked nähtavad; Preamp Type väärtust NONE ennast ei loetud tagasi.',
 '- T38: sama spec taastab 0.3.58 device-järjekorras salvestatud keha; see ei kinnita kõigi presetite ega grid-režiimi baittäpsust.',
 '','## Allikad ja piirid','',
 'Masinloetav koond koos iga sisendi SHA-256-ga: [fm3-current-evidence.json](../../'+EP+'references/fm3-current-evidence.json).',
 'Ajaloolised kviitungid säilivad muutmata. Koondi kontroll: `node tools/fm3/current-evidence.mjs`; uuendus: lisa `--write` ja vaata muutused üle.',
 'Üldine modifikaatorijaotaja, suvaline baaspreset, Hold/teised paigutused, Out 2 stereo/4CM ja iga uue preseti heli/CPU/STORE jäävad eraldi ulatuseks. Uusi seadmemõõtmisi selle koondiga ei tehtud.',''].join('\n');
const outputs=[[path.join(E,'references/fm3-current-evidence.json'),JSON.stringify(current,null,2)+'\n'],[path.join(ROOT,'docs/fm3/FM3_CURRENT_EVIDENCE.md'),md]];
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: current-evidence.mjs [--write]');
for(const [file,text] of outputs){if(process.argv.includes('--write'))fs.writeFileSync(file,text);else assert.equal(fs.readFileSync(file,'utf8'),text,'Current evidence stale: '+file);}
console.log(JSON.stringify({passed:true,controllers:controllers.length,deviceSources:19,storedSources:19,multiDelay:39,importedTypes:8,storedTypes:4,enumCounts,scalarDescriptors,deviceIO:false}));
