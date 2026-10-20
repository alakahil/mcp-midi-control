// Final report is decoded AFTER all layout/control/scene stages.
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,describeRows,SLUG_BY_EID} from './fm3-layout.mjs';
import {layouts,filterDonor,peqDonor,geqDonor,enhancerDonor} from './fm3-composer-bases.mjs';
import {describeComposerScenes} from './fm3-jb-composer.mjs';
import {loadDictionary,decodeValue,DEFAULT_STATUSES,OPT_IN_STATUSES,findParam} from './fm3-table-encoder.mjs';
import {sha256} from './fm3-output.mjs';
import {typeApplicability,typePolicySummary,readTypeState} from './fm3-type-applicability.mjs';
import {dependencyState,readModifiers,dependencyPolicySummary} from './fm3-parameter-dependencies.mjs';
import {globalScaleDependencies,pitchCustomScaleSummary} from './fm3-pitch-custom-scales.mjs';
import {renderGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
const definitions=Object.assign({},...Object.values(layouts),filterDonor.blocks,peqDonor.blocks,geqDonor.blocks,enhancerDonor.blocks);
export function finalSoundState(syx,writes,opts={}){
  const after=inspectStructure(syx),body=Buffer.from(after.raw.body),{records}=scanRecords(body),dictionary=loadDictionary();
  const blocks=Object.fromEntries(records.filter(r=>SLUG_BY_EID[r.eid]).map(r=>[r.family,{...r,typePid:definitions[r.family]?.typePid}]));
  const scenes=describeComposerScenes(after,blocks);
  const channels=records.map(r=>({block:r.family,effectId:r.eid,wordsPerChannel:r.words,channels:Array.from({length:r.channels},(_,i)=>({channel:'ABCD'[i],words:Array.from({length:r.words},(_,pid)=>body.readUInt16LE(r.start+(i*r.words+pid)*2))}))}));
  const modifiers=readModifiers(body).map(m=>({...m,targetName:dictionary.params.find(p=>p.block===m.effectId&&p.param===m.pid)?.name??'unknown target'}));
  const effective=writes.map(w=>{
    const raw=body.readUInt16LE(w.offset);if(raw!==w.raw)throw Error('Final control readback failed: '+w.name);
    const p=findParam(w.block,w.name);
    return {...w,storedDependency:p.storedDependency,encodingEvidence:p.encodingEvidence,dependencies:dependencyState(body,{...w,effectId:p.block,pid:p.param},{modifiers}),raw,display:decodeValue(p,raw),unit:unitFor(p),source:'final-syx'};
  });
  // Human-readable retained/changed settings, preserving opaque values in channels[].words.
  const statuses=new Set([...DEFAULT_STATUSES,...(opts.allow??[])]);
  const parameters=[];
  for(const r of records.filter(r=>SLUG_BY_EID[r.eid]||r.family==='out1')){
    const activeChannels=new Set(scenes.map(s=>s.blocks[r.family]?.channel).filter(Boolean));
    if(r.family==='out1')activeChannels.add('A');
    for(const w of writes.filter(w=>w.block===r.family))activeChannels.add(w.channel);
    for(const channel of [...activeChannels].sort()){
      const i='ABCD'.indexOf(channel);
      for(const p of dictionary.params.filter(p=>p.block===r.eid&&p.param<r.words&&statuses.has(p.status))){
        const raw=body.readUInt16LE(r.start+(i*r.words+p.param)*2),value=decodeValue(p,raw);
        const applicability=typeApplicability(p,readTypeState(p,pid=>body.readUInt16LE(r.start+(i*r.words+pid)*2)));
        if(applicability.covered&&!applicability.allowed)continue;
        if(value!==undefined&&!(typeof value==='number'&&!Number.isFinite(value)))parameters.push({block:r.family,channel,name:p.name,label:applicability.label??p.label,raw,value,unit:unitFor(p),status:p.status,storedDependency:p.storedDependency,encodingEvidence:p.encodingEvidence,dependencies:dependencyState(body,{effectId:r.eid,pid:p.param,channel,offset:r.start+(i*r.words+p.param)*2},{modifiers}),scope:applicability.covered?'stored value; bounded type/algorithm policy passed; dependencies reported separately':'stored value; type-specific visibility not validated',typeApplicability:applicability});
      }
    }
  }
  return {name:after.decoded.preset_name,firmware:13,selectedScene:body[0]+1,signalRows:describeRows(body),scenes,controls:effective,channels,parameters,dependencies:dependencyPolicySummary(),modifiers,typeApplicability:typePolicySummary(),pitchCustomScales:pitchCustomScaleSummary(),globalScaleDependencies:globalScaleDependencies(channels),outputSha256:sha256(syx)};
}
function unitFor(p){
  // Only explicit, already used units; unknown units stay labelled as editor values.
  if(p.kind==='enum')return '';
  if(p.family==='PITCH'&&p.param>=64&&p.param<=70)return 'pooltooni toonikast';
  if(p.family==='PITCH'&&p.param>=77&&p.param<=92)return 'skaalaastet';
  if(p.family==='PITCH'&&p.signedWord)return 'nihet (ühik sõltub Pitchi mudelist)';
  if(p.family==='PITCH'&&[71,72].includes(p.param))return '(globaalne skaala)';
  if(p.family==='PITCH'&&p.param===74)return '(kordused)';
  if(p.kind==='integer')return 'täisarv';
  if(p.family==='DISTORT'&&['DISTORT_DRIVE','DISTORT_BASS','DISTORT_MID','DISTORT_TREBLE','DISTORT_PRESENCE'].includes(p.name))return '/10';
  if(p.name==='DISTORT_LEVEL'||/^OUTPUT_SCENE[1-8]$/.test(p.name))return 'dB';
  if(p.family==='FUZZ'&&['FUZZ_DRIVE','FUZZ_TONE','FUZZ_LEVEL'].includes(p.name))return '/10';
  const units={DELAY_TIME:'ms',REVERB_TIME:'s',REVERB_PREDELAY:'ms',FILTER_FREQ:'Hz',FILTER_GAIN:'dB',FILTER_LEVEL:'dB',CHORUS_RATE:'Hz'};
  if(units[p.name])return units[p.name];
  if(['FUZZ_MIX','DELAY_MIX','DELAY_FEED','REVERB_MIX'].includes(p.name))return '%';
  return 'FM3-Editi skaala';
}
const dependencyNote=p=>p.dependencies?.mode==='tempo'?`; salvestatud väärtus, juhib ${p.dependencies.tempo.name}=${p.dependencies.tempo.label.trim()}`:p.dependencies?.mode==='modifier'?`; salvestatud väärtus, juhib modifikaator ${p.dependencies.modifiers.map(m=>(m.uncertain?'ebaselge allikas':m.sourceName)+' ('+m.channelScope+')').join(', ')}`:'';
const fmt=v=>typeof v==='number'?String(Number(v.toFixed(4))):String(v);
export function renderFinalSoundText(state,spec){
  const context=spec.context??{};
  const lines=['FM3 SOUND ARCHITECT 2 — LÕPLIK PRESET',`Preset: ${state.name}`,
    `Eesmärk: ${spec.purpose??spec.composer.purpose??'Kirjeldatud soundi koostamine.'}`,
    'Seade: FM3 Mk II Turbo, firmware 13.',`Kitarr: ${context.guitar??'selle kirjelduse jaoks määramata'}`,
    `Helipead: ${context.pickups??'selle kirjelduse jaoks määramata'}`,`Ühendus: ${context.output??'selle kirjelduse jaoks määramata'}`,
    `Valitud Scene: ${state.selectedScene}`,...state.signalRows.map((r,i)=>`Rida ${i+2}: ${r}`),'','STSEENID JA LÕPLIKUD MUDELID'];
  for(const s of state.scenes){lines.push(`Scene ${s.scene}: ${s.name}`);for(const [family,b] of Object.entries(s.blocks)){
    lines.push(`  ${family} ${b.channel}: ${b.type??b.cabs?.map(c=>c.name).join(' + ')??b.mode??'alusest'}; ${b.bypass?'bypass':'sees'}${b.levelDb===undefined?'':'; Level '+fmt(b.levelDb)+' dB'}`);
    if(['peq','geq','enhancer'].includes(family))lines.push('    '+JSON.stringify(b));
  }}
  lines.push('','TABELIGA MÄÄRATUD PARAMEETRID — LÕPPFAILIST');
  for(const w of state.controls)lines.push(`${w.block} ${w.channel} ${w.label??w.name} (${w.name}): ${fmt(w.display)} ${w.unit}; küsitud ${fmt(w.value)}; raw ${w.raw}; ${w.status}${dependencyNote(w)}${w.storedDependency?'; '+w.storedDependency:''}.`);
  const written=new Set(state.controls.map(p=>p.block+':'+p.channel+':'+p.name));
  const explicitChannels=new Set(Object.entries(spec.composer).filter(([k,v])=>k.endsWith('Channels')&&Array.isArray(v)).flatMap(([k,v])=>v.filter(c=>Object.keys(c).some(x=>!['channel','type','model'].includes(x))).map(c=>k.slice(0,-8)+':'+c.channel)));
  const mainNames=new Set(['DISTORT_DRIVE','DISTORT_BASS','DISTORT_MID','DISTORT_TREBLE','DISTORT_PRESENCE','DISTORT_LEVEL','FUZZ_DRIVE','FUZZ_TONE','FUZZ_LEVEL','FUZZ_MIX','DELAY_TIME','DELAY_TEMPO','DELAY_FEED','DELAY_MIX','REVERB_TIME','REVERB_MIX']);
  lines.push('','MUUD PÕHISEADED LÕPPFAILIST','Ümardatud salvestatud väärtused; detailne loend ja toorsõnad on validation.json failis.');
  for(const p of state.parameters.filter(p=>(mainNames.has(p.name)||explicitChannels.has(p.block+':'+p.channel))&&!written.has(p.block+':'+p.channel+':'+p.name)))lines.push(`${p.block} ${p.channel} ${p.label??p.name}: ${fmt(p.value)} ${p.unit} [${p.status}]${dependencyNote(p)}${p.storedDependency?'; '+p.storedDependency:''}`);
  for(const m of state.modifiers.filter(m=>m.active))lines.push(`Modifikaator: ${m.targetName}; allikas ${m.uncertain?'ebaselge':m.sourceName}; kanal ${m.channelScope}. Salvestatud väärtus ei tõenda kontrolleri hetkeväärtust.`);
  if(state.globalScaleDependencies.observationsIncluded)lines.push('',renderGlobalScaleObservations(state.globalScaleDependencies).trimEnd());
  else if(state.globalScaleDependencies.uses.length)lines.push(`Globaalsed kohandatud skaalad: ${state.globalScaleDependencies.readPlan.scales.join(', ')}. Sisu puudub presetifailist ja on kontrollimata. Salvestatud kanalite sõltuvuste lugemisplaan sisaldab ${state.globalScaleDependencies.readPlan.requestCount} päringut; päringuid pole käivitatud.`);
  lines.push('','SÕLTUVUSED JA KONTROLLITASE','Kanalimuudatus mõjutab kõiki seda kanalit kasutavaid stseene. Määramata väärtused pärinevad alusest või kopeeritud täiskanalimallist.',
    'Cab-mallid kasutavad olemasolevat Dyna-Cab teeki. Väliseid User IR-faile ei paigaldata; muutmata IR/pedaali/globaalseadistuse sõltuvused säilivad alusfailist.',
    'Offline-kontroll läbitud: lõppfaili kaadrid, CRC, sisu, marsruutimine ja deklareeritud muudatused. Selle lõppfaili import, heli ja CPU pole uue kontrolliga kinnitatud.',
    'Choruse, Drive’i, Delay, Reverbi, Flangeri, Phaseri, Compressori, Wah’ ja Tremolo/Panneri parameetriloend ning tabelikirjutused järgivad piiratud FW13 tüübi- ja algoritmireegleid. Delay, Reverbi, Flangeri, Phaseri, Compressori, Wah’ ja Tremolo/Panneri mudelivahetus ning Phaseri Mode nõuavad täiskanalimalli. Rotaryl puudub tüübi valija; PID 0 on Rate. Pitchi 16 mudelit kontrollitakse eraldi ja TYPE nõuab täiskanalimalli; 34 täisarvu/enum-välja kasutavad eraldi kontrollitud presetisõna kodeeringut. Seitse kohandatud noodivälja nõuavad kogu lõpliku skaala kontrolli; toonika kuvaseade jääb suletuks. Globaalse skaala valik ei lisa presetile skaala sisu ning salvestatud arpedžiaatorisamm ei kinnita selle kõlamist. 21 tempo-seost ja olemasolevad modifikaatorisihtmärgid on eraldi kontrollitud; muud sõltuvused, sh Compressori automaatne ajastus/võimendus ja muude plokkide tüübinähtavus, jäävad katmata. Tempo või modifikaatori juhitud parameetri salvestatud väärtus ei tõenda hetkel kõlavat väärtust. Peidetud salvestatud sõnad säilivad toorandmetena.',
    '','KASUTAMINE','1. Säilita pooleliolev töö ning impordi fail FM3-Editi tööpuhvrisse.',
    `2. Kontrolli veateateid, valitud Scene ${state.selectedScene}, kanaleid ja soovitud helitasemeid.`,
    '3. Uut eksporti küsi ainult konkreetse seni kinnitamata katse jaoks; varasemaid piisavaid tõendeid kasuta uuesti.',
    'Generaator ei ava seadmeühendust ega saada MIDI/SET/SAVE-käske.',`SHA-256: ${state.outputSha256}`);
  return lines.join('\n')+'\n';
}
