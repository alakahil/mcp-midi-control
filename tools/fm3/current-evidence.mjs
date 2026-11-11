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
const b1b2=receipt('fm3-b1-b2-20261110.json');
assert.equal(b1b2.cases.length,4);
assert.ok(b1b2.cases.every(c=>c.storedBodyByteIdentical&&c.storeReload==='confirmed'));
const h12=receipt('fm3-h1-h2-h4-20261110.json');
assert.deepEqual(h12.cases.map(c=>c.case),['H1','H2']);
assert.ok(h12.cases.every(c=>c.storedBodyByteIdentical&&c.storeReload==='confirmed'));
const h2Stored=new Set(h12.display.H2.scenes.map(s=>s.type));
const h5=receipt('fm3-h5-t43-20261111.json');
assert.deepEqual(h5.cases.map(c=>c.case),['H5','H5B','T43','T44']);
assert.ok(h5.cases.every(c=>c.dataPassed&&c.storeReload==='confirmed'));
const h3=receipt('fm3-h3-20261110.json');
assert.deepEqual(h3.cases.map(c=>c.case),['V1','V4']);
assert.ok(h3.cases.every(c=>c.storeReload==='confirmed')&&h3.cases[1].storedBodyByteIdentical);
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
 const imported=t[36].types.some(x=>x.type===p.label),stored38=t[38].types.some(x=>x.type===p.label),storedH2=h2Stored.has(p.label),stored=stored38||storedH2;
 assert.equal(MULTIDELAY_TYPE_LABELS[p.index],p.label);assert.equal(p.words.length,121);
 return {index:p.index,name:p.label,algorithm:p.algorithm,softwareSupported:true,
  measuredFullChannelWords:121,templateStart:'device default, channel A',
  generatedDeviceImport:imported||stored?'confirmed':'not-measured',
  audibleBehavior:imported||stored?'confirmed':'not-measured',storeReload:stored?'confirmed':'not-measured',
  evidence:['T35',...(imported?['T36']:[]),...(stored38?['T38']:[]),...(storedH2?['H2']:[])],
  scope:'Whole-channel template before controls; Type selector alone is not a fill operation.'};
});
assert.equal(multiDelay.length,39);assert.equal(multiDelay.filter(r=>r.generatedDeviceImport==='confirmed').length,8);
assert.equal(multiDelay.filter(r=>r.storeReload==='confirmed').length,8);
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
const current={schemaVersion:1,asOf:'2026-11-11',hardwareEvidenceThrough:'2026-11-11',baselineVersion:'0.3.65',
 scope:'T32-T42, B1A/B1B/B1C/B2, H1/H2/H4, H3 and their named prerequisite receipts; current software contract, not a complete claim about every FM3 function.',
 definitions:{confirmed:'A cited dated device result exists in the stated scope.',notMeasured:'No cited device result for this scope; not a failure and not a software-support restriction.'},
 enumCounts,scalarDescriptors,controllers,multiDelay,modifierTargets,presetTempo,
 auditFinalPresets:{evidence:'B1A/B1B/B1C/B2 2026-11-10',cases:b1b2.cases,lfo1Display:b1b2.lfo1Display,cpuCorrection:b1b2.cpuCorrection,scope:b1b2.scope},
 auditNextPresets:{evidence:'H1/H2/H4 2026-11-10',cases:h12.cases,display:h12.display,findings:h12.findings,limitations:h12.limitations,scope:h12.scope},
 auditFinalPerformance:{evidence:'H3 2026-11-10',cases:h3.cases.map(({observations,...c})=>c),findings:h3.findings,limitations:h3.limitations,scope:h3.scope},
 auditH5T43:{evidence:'H5/H5B/T43/T44 2026-11-11',cases:h5.cases.map(({observations,...c})=>c),perPresetSwitchWords:h5.perPresetSwitchWords,findings:h5.findings,limitations:h5.limitations,scope:h5.scope},
 otherEvidence:{
  controllersScenes:{scenes:8,channels:['A','B','C','D'],storeReload:'confirmed',evidence:['T33','T34A'],scope:'The measured scene/channel selections, not every permutation.'},
  liveComposition:{evidence:['T32','T34E'],cpuPercent:t[32].cpu.scenes.map(s=>s.measuredPercent),storedBlockRecords:11,
   finalLeadLevelDb:t[32].level.finalAmpCLevelDb,finalListening:t[34].findings.liveKooslusV1.as,
   finalFile:{evidence:'H3 V1 2026-11-10',cpuPercent:h3.cases[0].cpuPercent.after,storeReload:'confirmed',storedBlockRecords:h3.cases[0].records,levelFinding:h3.cases[0].levelFinding},
   limitations:['No numerical loudness measurement.','H3: scene levels of the -8 dB file are uneven; not accepted as the final file.']},
  synthCpu:{evidence:['T37'],presets:t[37].items.length,model:'0.2.5',rule:t[37].rule,scope:'Measured voice types/settings, not all non-default parameters.'},
  cabCuts:{evidence:['T34F'],displayReadings:t[34].findings.cabPreampNone.controls.map(c=>({param:c.param,shown:c.shown,page:c.page})),
   preampTypeNoneReadback:'confirmed',preampTypeNoneEvidence:'H4 2026-11-10: FM3-Edit Cab B Preamp page shows Preamp Type None, Filters 87.0 Hz / 7300 Hz',scope:'Cuts and Preamp Type None visible in the T20 CAB_A preset (FM3-Edit display); not other presets or Preamp Types.'},
  recordOrder:{evidence:['T38'],storedBodyReproduced:t[38].result.deviceRecordOrderBodyByteIdentical,scope:'T38 same spec with device order; insert only, unknown-pair fallback; grid unchanged.'}},
 supersededHistoricalGaps:[
  {from:'T32 final -8 dB listening pending',resolvedBy:'T34E',remaining:'Numerical loudness; separate final-file CPU/STORE.'},
  {from:'Audit H3 final performance preset unchecked; LIVE KOOSLUS V1 final-file CPU/STORE missing',resolvedBy:'H3',remaining:'V1 scene level balance; numerical loudness.'},
  {from:'T33 scenes 5-8 pending',resolvedBy:'T34A',remaining:'Other source/target/shape combinations.'},
  {from:'T34 sources B-D edit buffer only; 14 sources unmeasured',resolvedBy:'T39-T41',remaining:'Other LFO shapes/depths, modifier curves and targets.'},
  {from:'T35 no generated Type import or STORE',resolvedBy:'T36, T38 and H2',remaining:'31 unimported generated Types.'},
  {from:'T34F Preamp Type NONE not read back',resolvedBy:'H4',remaining:'Front-panel reading and other Preamp Types.'}],
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
 'B1A/B1B/B1C/B2 kinnitavad allpool nimetatud avaliku generaatori lõppfailid. Muud A–D kooslused vajavad oma katset. T42 algkviitungit ei muudeta.',
 '','## B1/B2 lõpppresetite seadmekatse — 10.11.2026','',
 'Kõigi nelja preseti import, kuvanäidud, kasutaja kinnitatud käitumine ja STORE/reload on kinnitatud. Salvestatud keha on igal juhul baittäpne.',
 '- B1A: SC1 → Delay Mix 0–100%, ALL, 97 BPM. CPU stseenid 1–3 44,5%; stseen 4 44,5–44,6%.',
 '- B1B: LFO 1A → Filter Freq 300–3000 Hz, ALL. Sine, Rate 0,500 Hz ja Depth 100,0% kinnitatud kasutaja ning ekraanipildiga. CPU stseen 1 46,4%.',
 '- B1C: External 1 → Amp Gain 2–8, ALL. CPU stseen 1 44,5–44,6%.',
 '- B2: SC1 → Delay Mix 10–60% ja CS2 → Amp Cut, mõlemad D-kanalil, 143 BPM; nelja stseeni käitumine kinnitatud. CPU 44,4/44,4/44,5/44,6%.',
 'Algtõendid ja räsidega kviitung: MOOTOR references/fm3-b1-b2-20261110.json. LFO juhikud: Controllers → LFO 1 + 2 → ülemine LFO 1 rida. CPU-parandusel pole eraldi enne/pärast faasimäärangut. Need tulemused ei kinnita iga uut presetit.',
 '','## H1/H2/H4 seadmekatse — 10.11.2026','',
 'H1 ja H2 import, FM3-Editi kuvanäidud, kasutaja kuulamine ja STORE/reload on kinnitatud. Salvestatud keha on mõlemal baittäpne.',
 '- H1: SC1 → Reverb Mix 10–40%, ALL, vaikekõver, Room: Recording Studio A. Stseenid 1/2/3 Mix 10/25/40% enne ja pärast STORE-i; CPU 44,4–44,6%.',
 '- H2: MultiDelay A–D Pealing Bells / Dub Echo / Mono Diffuser / Aurora Delay säilivad STORE järel; nende nelja T36 tüübi STORE on nüüd kinnitatud. CPU 62,5/55,3/50,0/52,2%; Pealing Bells on CPU mudeli hinnangust 51,1% ~11 punkti kõrgem (mudel muutmata).',
 '- H4: T20 CAB_A Cab B Preamp lehel Preamp Type None ja ploki lõiked 87,0 Hz / 7300 Hz (FM3-Edit).',
 'Kviitung: MOOTOR references/fm3-h1-h2-h4-20261110.json. Heli on kasutaja kuulamishinnang; H2 heli kuulati enne STORE-i.',
 '','## H3 lõpliku esinemispreseti kontroll — 10.11.2026','',
 'Mõlemad kandidaadid laaditi, loeti tagasi, mängiti päris kitarriga läbi kõigis 8 stseenis, salvestati kohta 427 ja loeti pärast tagasitulekut uuesti.',
 '- V4 SATCH SOAP ON A ROPE V4 on lõplik esinemispreset: salvestatud keha baittäpne, klippimist pole, heli ja valjus sobivad kõigis stseenides, vahetus plõksuta. CPU '+h3.cases[1].cpuPercent.before.join('/')+'%.',
 '- V1 LIVE KOOSLUS V1: 11 ploki andmed säilisid (FM3 salvestusjärjekord), klippimist pole; stseenide valjus ebaühtlane (lead kõige vaiksem), lõppfailiks ei sobi. CPU '+h3.cases[0].cpuPercent.before.join('/')+'%.',
 'Kõik 16 CPU näitu on 0.2.5 hinnangust 1 punkti ja enne/pärast STORE-i 0,5 punkti piires. Stseene valiti M-Wave MIDI lülitiga (1–4).',
 'Kviitung: MOOTOR references/fm3-h3-20261110.json.',
 '','## H5/H5B/T43/T44 seadmekatse — 11.11.2026','',
 'Kõik neli presetti laaditi, kuulati päris kitarriga, salvestati kohta 427 ja loeti tagasi; andmesõnad vastavad failile.',
 '- H5 LIVE KOOSLUS V1.1: Amp A/D −10,2 dB, C −7,0 dB säilivad STORE-i järel (FM3 salvestusjärjekord). Kasutaja: lead võiks veel ~2 dB valjem olla.',
 '- H5B: Out 1 Scene Level 1–8 −2/0/+1/−2/−2/0/+1/−2 dB enne ja pärast STORE-i — OUTPUT_SCENE1..8 esimene seadmekinnitus.',
 '- T43: Amp Level, Drive Drive, Delay Feedback, Reverb Time, Chorus Depth, Out 1 Level ja Chorus Bypass modifikaatori sihid salvestuvad baittäpselt; Chorus Bypass SC2 0% = sees, 50%/100% = bypass. CPU 49,7–49,8% (hinnang 50,4%).',
 '- T44: per-preset lüliti kategooria 4 = Effect, 3 = Scene; Bypass/Select funktsioon 0; Effect param on ploki indeks (Drive 1 = 9, Delay 1 = 7, Reverb 1 = 51), Scene param = stseeni number. Värv ja Mini-Display silt ei salvestu kehasse.',
 'Kviitung: MOOTOR references/fm3-h5-t43-20261111.json. Modifikaatori dialooge ei avatud; seosed tuletatud näidatud väärtustest ja baittäpsest salvestisest.',
 '','## MultiDelay Type mallid','', '| Tüüp | Mõõdetud sõnu | Generaatori import | Heli | STORE | Tõend |','|---|---:|---|---|---|---|',
 ...multiDelay.map(r=>`| ${r.name} | ${r.measuredFullChannelWords} | ${mark(r.generatedDeviceImport)} | ${mark(r.audibleBehavior)} | ${mark(r.storeReload)} | ${r.evidence.join(', ')} |`),
 '','39 malli, 8 generaatori importi, 8 STORE-kinnitust (T38 ja H2). Mall asendab kogu kanali enne controls-muudatusi; üksik Type sõna ei täida kanalit.',
 '','## Muud T32-T41 tulemused','',
 '- T32: 8 stseeni CPU 55-71%, 11 ploki andmed säilisid STORE järel. T34E kinnitab lõpliku -8 dB lead-nivoo kuulamist; H3 mõõtis lõppfaili CPU ja STORE-i, stseenide valjus vajab sättimist.',
 '- T37: Synthi häälte 2/3 mõõdetud tüübid on CPU mudelis 0.2.5; muud parameetrid vajavad oma tõendit.',
 '- T34F: Cab lõiked nähtavad; H4 luges Preamp Type None otse FM3-Editist tagasi.',
 '- T38: sama spec taastab 0.3.58 device-järjekorras salvestatud keha; see ei kinnita kõigi presetite ega grid-režiimi baittäpsust.',
 '','## Allikad ja piirid','',
 'Masinloetav koond koos iga sisendi SHA-256-ga: [fm3-current-evidence.json](../../'+EP+'references/fm3-current-evidence.json).',
 'Ajaloolised kviitungid säilivad muutmata. Koondi kontroll: `node tools/fm3/current-evidence.mjs`; uuendus: lisa `--write` ja vaata muutused üle.',
 'Üldine modifikaatorijaotaja, suvaline baaspreset, Hold/teised paigutused, Out 2 stereo/4CM ja iga uue preseti heli/CPU/STORE jäävad eraldi ulatuseks. Uusi seadmemõõtmisi selle koondiga ei tehtud.',''].join('\n');
const outputs=[[path.join(E,'references/fm3-current-evidence.json'),JSON.stringify(current,null,2)+'\n'],[path.join(ROOT,'docs/fm3/FM3_CURRENT_EVIDENCE.md'),md]];
assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: current-evidence.mjs [--write]');
for(const [file,text] of outputs){if(process.argv.includes('--write'))fs.writeFileSync(file,text);else assert.equal(fs.readFileSync(file,'utf8'),text,'Current evidence stale: '+file);}
console.log(JSON.stringify({passed:true,controllers:controllers.length,deviceSources:19,storedSources:19,multiDelay:39,importedTypes:8,storedTypes:8,enumCounts,scalarDescriptors,deviceIO:false}));
