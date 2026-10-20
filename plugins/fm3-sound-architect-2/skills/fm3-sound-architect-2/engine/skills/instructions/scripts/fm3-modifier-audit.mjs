// Read-only inventory of serialized modifier records. No preset authoring or I/O.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readModifiers,dependencyPolicyHash} from './fm3-parameter-dependencies.mjs';
import {loadDictionary} from './fm3-table-encoder.mjs';
import {scanRecords,readGrid,SLUG_BY_EID} from './fm3-layout.mjs';
const policyBytes=fs.readFileSync(new URL('../references/fm3-parameter-dependencies.json',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(policyBytes)!==dependencyPolicyHash)throw Error('Modifier audit metadata changed');
const policy=JSON.parse(policyBytes),sourceName=n=>policy.modifiers.sources[n]?.trim()??'unknown';
// All seven pinned bases have this identical system tail. Requiring its full
// fingerprint prevents a partial record scan from becoming a false absence claim.
// Its controller/global words are not decoded, modified or evaluated here.
const supportedTailSha256='ed7f69e7c6201a7aedda97f3ca1d188ae833bfb6dd147eceed8bd13a20b9483a';
function scanContext(body){
  const grid=readGrid(body);
  try{
    const {records,tail}=scanRecords(body);
    const complete=sha(body.subarray(tail))===supportedTailSha256;
    return {grid,records,report:{status:complete?'complete':'unavailable',
      reason:complete?null:'unsupported-effect-section-or-system-tail',
      recordsRead:records.length,tailOffset:tail,tailFingerprintMatched:complete,
      scope:'Sequential supported effect records followed by the pinned system tail; grid placement is separate.'}};
  }catch(error){
    if(!/^(Amp\/Cab records not found|Record out of bounds)$/.test(error.message))throw error;
    return {grid,records:[],report:{status:'unavailable',reason:'unsupported-effect-record-layout',
      recordsRead:0,tailOffset:null,tailFingerprintMatched:false,
      scope:'Effect section unresolved; no block absence or scene inference.'}};
  }
}
function targetContext(body,m,index,sceneNames){
  if(m.effectId===0)return null;
  const matches=index.records.filter(r=>r.eid===m.effectId);
  const cells=index.grid.filter(g=>g.id===m.effectId);
  const complete=index.report.status==='complete';
  const recordPresence=!complete?'unknown':matches.length===0?'absent':matches.length===1?'present':'ambiguous';
  const gridPresence=cells.length===0?'absent':cells.length===1?'present':'ambiguous';
  const issues=[];
  if(recordPresence==='unknown')issues.push('target-record-unresolved');
  if(recordPresence==='absent')issues.push('target-record-absent');
  if(recordPresence==='ambiguous')issues.push('duplicate-target-record');
  if(gridPresence==='absent')issues.push('target-not-in-grid');
  if(gridPresence==='ambiguous')issues.push('duplicate-target-grid-cell');
  const r=recordPresence==='present'?matches[0]:null;
  const supported=!!r&&r.channels===4&&Object.hasOwn(SLUG_BY_EID,r.eid);
  if(r&&!supported)issues.push('target-scene-layout-unsupported');
  const scenes=supported?Array.from({length:8},(_,i)=>{
    const channelRaw=body.readUInt16LE(r.header+10+2*i),bypassRaw=body.readUInt16LE(r.header+26+2*i);
    const channel=channelRaw<4?'ABCD'[channelRaw]:null,bypass=bypassRaw<2?bypassRaw===1:null;
    const modifierChannelMatches=channel===null||m.channel>4?null:m.channel===0||m.channel===channelRaw+1;
    return {scene:i+1,name:sceneNames[i]??null,channelRaw,channel,bypassRaw,bypass,modifierChannelMatches};
  }):[];
  if(scenes.some(s=>s.channel===null))issues.push('unknown-target-scene-channel');
  if(scenes.some(s=>s.bypass===null))issues.push('unknown-target-scene-bypass');
  return {recordPresence,gridPresence,gridCells:cells.map(g=>({row:g.row+1,column:g.col+1,routeMask:g.mask})),
    recordHeader:r?.header??null,sceneStatus:!supported?'unavailable':scenes.some(s=>s.channel===null||s.bypass===null)?'uncertain':'known',
    scenes,
    channelMatchedScenes:supported?scenes.filter(s=>s.modifierChannelMatches===true).map(s=>s.scene):null,
    channelMatchedNotBypassedScenes:supported?scenes.filter(s=>s.modifierChannelMatches===true&&s.bypass===false).map(s=>s.scene):null,
    issues};
}
export function modifierAuditCapabilities(){return {
  command:'--inspect-modifiers PRESET.syx [--format json|txt]',readOnly:true,
  format:'FM3 0x0146, single 24680-byte dump with the supported 32-record layout',
  metadataFirmware:13,detectsFirmware:false,serializedRecords:32,
  requiresPinnedComposerBase:false,grantsWritePermission:false,
  targetContext:'Supported sequential effect records, pinned system tail, grid cells and stored A-D scene channel/bypass words',
  unresolvedContext:'reported as unknown; never inferred absent',evaluatesSignalPath:false,
  evaluatesControllerValue:false,deviceIO:false
};}
export function auditModifiers(syx){
  const inspected=inspectStructure(syx),body=Buffer.from(inspected.raw.body);
  const context=scanContext(body);
  const dictionary=loadDictionary(),modifiers=readModifiers(body).map(m=>{
    const p=dictionary.params.find(p=>p.block===m.effectId&&p.param===m.pid);
    const issues=[];
    if(m.source>=policy.modifiers.sources.length)issues.push('unknown-source');
    if(m.secondarySource>=policy.modifiers.sources.length)issues.push('unknown-secondary-source');
    if(m.secondarySource!==0)issues.push('secondary-source-not-evaluated');
    if(m.operation!==0)issues.push('operation-not-evaluated');
    if(m.channel>=policy.modifiers.channels.length)issues.push('unknown-channel');
    if(m.active&&m.effectId===0)issues.push('target-effect-unspecified');
    if((m.active||m.effectId!==0)&&!p)issues.push('target-parameter-not-in-dictionary');
    const target=targetContext(body,m,context,inspected.decoded.scene_names??[]);
    if(target)issues.push(...target.issues);
    return {...m,sourceName:sourceName(m.source),secondarySourceName:sourceName(m.secondarySource),
      state:m.active?'active':m.effectId===0?'inactive-unbound':'inactive-binding',
      targetName:p?.name??null,targetLabel:p?.label??null,targetFamily:p?.family??null,
      targetContext:target,issues,words:Array.from({length:25},(_,i)=>body.readUInt16LE(m.offset+2*i))};
  });
  const active=modifiers.filter(m=>m.active),overlappingTargets=[];
  for(let a=0;a<active.length;a++)for(let b=a+1;b<active.length;b++){
    const x=active[a],y=active[b];
    const effect=x.effectId===y.effectId||x.effectId===0||y.effectId===0;
    const channel=x.channel===y.channel||x.channel===0||y.channel===0||x.channel>4||y.channel>4;
    if(x.pid===y.pid&&effect&&channel)overlappingTargets.push({records:[x.record,y.record],
      certainty:x.effectId!==0&&x.effectId===y.effectId&&x.channel<=4&&y.channel<=4?'same-target':'possible-target'});
  }
  const externalControllers=[...new Set(active.flatMap(m=>[m.source,m.secondarySource]).filter(n=>n>=14&&n<=29))]
    .sort((a,b)=>a-b).map(n=>({source:n,name:sourceName(n),mapping:'global; not contained or verified here'}));
  return {schemaVersion:1,mode:'read-only-modifier-audit',name:inspected.decoded.preset_name,
    inputSha256:sha(syx),inputBytes:syx.length,bodyBytes:body.length,format:'0x0146',
    firmwareDetected:null,metadataFirmware:13,metadataSha256:dependencyPolicyHash,
    checks:{frameChecksums:true,presetCrc:true,footer:true,modifierRecordLayout:true},
    summary:{serializedRecords:modifiers.length,active:active.length,
      inactiveBindings:modifiers.filter(m=>m.state==='inactive-binding').length,
      inactiveUnbound:modifiers.filter(m=>m.state==='inactive-unbound').length,
      recordsWithIssues:modifiers.filter(m=>m.issues.length).length,overlappingTargets:overlappingTargets.length},
    contextScan:context.report,modifiers,overlappingTargets,externalControllers,
    limits:['Serialized record count is not a usable modifier capacity claim.',
      'Target names use the FW13 dictionary; parameter type visibility is not validated.',
      'Block absence requires the complete supported record scan and pinned system tail; otherwise presence is unknown.',
      'Grid cells and stored scene channel/bypass words do not establish a connected or audible signal path.',
      'Curve, range, damping and operation words are retained as raw integers, not decoded or evaluated.',
      'Active means a nonzero stored source. Scene summaries do not evaluate modifiers, bypass mode or current controller value.',
      'Audit success grants no writing permission for an unknown preset or modifier configuration.',
      'Device import, pedal operation, audio and CPU are not tested.'],
    deviceIO:false,presetWritten:false};
}
const issueText={
  'unknown-source':'tundmatu põhilähte kood',
  'unknown-secondary-source':'tundmatu teisese allika kood',
  'secondary-source-not-evaluated':'teisese allika mõju ei arvutata',
  'operation-not-evaluated':'allikate operaatorit ei tõlgendata',
  'unknown-channel':'tundmatu kanalikood',
  'target-effect-unspecified':'sihtploki kood puudub',
  'target-parameter-not-in-dictionary':'sihtparameetri nimi puudub sõnastikust',
  'target-record-unresolved':'sihtploki olemasolu teadmata; plokkide osa või süsteemisaba pole toetatud',
  'target-record-absent':'sihtploki parameetrikirje puudub',
  'duplicate-target-record':'sihtploki parameetrikirje esineb korduvalt',
  'target-not-in-grid':'sihtplokk puudub ruudustikust',
  'duplicate-target-grid-cell':'sihtplokk esineb ruudustikus korduvalt',
  'target-scene-layout-unsupported':'selle ploki stseenikirjete tõlgendamine pole toetatud',
  'unknown-target-scene-channel':'sihtploki stseenis on tundmatu kanalikood',
  'unknown-target-scene-bypass':'sihtploki stseenis on tundmatu bypass-kood'
};
const presenceText={present:'olemas',absent:'puudub',ambiguous:'mitu kirjet',unknown:'teadmata'};
export function renderModifierAuditText(audit){
  const lines=['FM3 SOUND ARCHITECT 2 — MODIFIKAATORITE AUDIT',
    `Preset: ${audit.name}`,`SHA-256: ${audit.inputSha256}`,
    'Ainult faililugemine; presetit ei muudeta ja seadmega ei suhelda.',
    'Metaandmed: FW13; faili tegelikku püsivara ei tuvastata.',
    `Serialiseeritud kirjeid ${audit.summary.serializedRecords}; aktiivseid ${audit.summary.active}; väljalülitatud seoseid ${audit.summary.inactiveBindings}; sidumata ${audit.summary.inactiveUnbound}.`,
    'Kirjete arv ei tähenda seadme kasutatavate modifikaatorite mahtu.',
    `Plokkide struktuuri kontekst: ${audit.contextScan.status==='complete'?'toetatud kirjeloend ja süsteemisaba kinnitatud':'teadmata; ploki puudumist ei järeldata'}.`,'',
    'SEOSED (kirje number on siin 1-põhine; JSON record on 0-põhine)'];
  for(const m of audit.modifiers.filter(m=>m.state!=='inactive-unbound'||m.issues.length)){
    lines.push(`#${m.record+1}: ${m.active?'aktiivne':'väljas'}; ${m.sourceName} [${m.source}] → ${m.targetName??'tundmatu parameeter'} (plokk ${m.effectId}, PID ${m.pid}); ${m.channelScope} [${m.channel}].`);
    if(m.secondarySource!==0||m.operation!==0)lines.push(`  Teisene allikas: ${m.secondarySourceName} [${m.secondarySource}]; operaatori toorkood ${m.operation}.`);
    const c=m.targetContext;
    if(c){
      lines.push(`  Sihtploki parameetrikirje: ${presenceText[c.recordPresence]}; ruudustikus: ${presenceText[c.gridPresence]}.`);
      for(const cell of c.gridCells)lines.push(`  Ruudustik: rida ${cell.row}, veerg ${cell.column}; marsruudimask ${cell.routeMask}.`);
      for(const s of c.scenes)lines.push(`  Stseen ${s.scene} (${JSON.stringify(s.name)}): kanal ${s.channel??'tundmatu'} [${s.channelRaw}], ${s.bypass===null?'tundmatu bypass':s.bypass?'bypass':'sees'} [${s.bypassRaw}]; seose kanal ${s.modifierChannelMatches===null?'teadmata':s.modifierChannelMatches?'sobib':'ei sobi'}.`);
      if(c.scenes.length)lines.push(`  Kindlalt sobiva kanaliga ja salvestatud bypass-välja järgi sees: ${c.channelMatchedNotBypassedScenes.join(', ')||'ühtegi kinnitatud stseeni pole'}. See ei kinnita seose toimimist ega kuuldavust.`);
    }
    for(const issue of m.issues)lines.push('  Märkus: '+issueText[issue]+'.');
  }
  if(!audit.modifiers.some(m=>m.state!=='inactive-unbound'||m.issues.length))lines.push('Salvestatud seoseid ei leitud.');
  lines.push('','KATTUVAD SIHTMÄRGID');
  for(const o of audit.overlappingTargets)lines.push(`Kirjed ${o.records.map(n=>n+1).join(' ja ')}: ${o.certainty==='same-target'?'sama siht ja kattuvad kanalid':'võimalik kattumine; siht või kanal on ebaselge'}. See ei kinnita DSP-konflikti.`);
  if(!audit.overlappingTargets.length)lines.push('Aktiivsete kirjete vahel kattuvaid sihte ei leitud.');
  lines.push('','GLOBAALSED SÕLTUVUSED');
  for(const c of audit.externalControllers)lines.push(`${c.name}: pedaali/MIDI vastendus on globaalne ega ole selles auditis kontrollitud.`);
  if(!audit.externalControllers.length)lines.push('Aktiivset External-kontrolleri viidet ei leitud.');
  lines.push('','PIIRID',
    'Sihtnimed pärinevad FW13 sõnastikust; parameetri tüübinähtavust ei kinnitata.',
    'Ploki puudumine kinnitatakse ainult toetatud kirjeloendi ja süsteemisaba korral; muul juhul on olemasolu teadmata.',
    'Ruudustiku asukoht ei kinnita ühendatud signaaliteed. Stseenide kanal/bypass on failis salvestatud olek.',
    'Kõik 25 sõna säilivad JSON-is toorväärtustena. Kõvera, vahemiku, summutuse ja operaatori mõju ei arvutata.',
    'Aktiivne allikas ja stseenide kokkuvõte ei kinnita pedaali hetkeasendit, modifikaatori mõju, bypass-režiimi ega kuuldavust.',
    'Edukas audit ei anna tundmatu preseti või seose kirjutusluba.',
    'Faili kaadrid, CRC, footer ja modifikaatorite päised kontrolliti; FM3 import, pedaali toimimine, heli ja CPU on kontrollimata.');
  return lines.join('\n')+'\n';
}
