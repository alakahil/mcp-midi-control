// Read-only inventory of serialized modifier records. No preset authoring or I/O.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readModifiers,dependencyPolicyHash} from './fm3-parameter-dependencies.mjs';
import {loadDictionary} from './fm3-table-encoder.mjs';
const policyBytes=fs.readFileSync(new URL('../references/fm3-parameter-dependencies.json',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(policyBytes)!==dependencyPolicyHash)throw Error('Modifier audit metadata changed');
const policy=JSON.parse(policyBytes),sourceName=n=>policy.modifiers.sources[n]?.trim()??'unknown';
export function modifierAuditCapabilities(){return {
  command:'--inspect-modifiers PRESET.syx [--format json|txt]',readOnly:true,
  format:'FM3 0x0146, single 24680-byte dump with the supported 32-record layout',
  metadataFirmware:13,detectsFirmware:false,serializedRecords:32,
  requiresPinnedComposerBase:false,grantsWritePermission:false,
  evaluatesControllerValue:false,deviceIO:false
};}
export function auditModifiers(syx){
  const inspected=inspectStructure(syx),body=Buffer.from(inspected.raw.body);
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
    return {...m,sourceName:sourceName(m.source),secondarySourceName:sourceName(m.secondarySource),
      state:m.active?'active':m.effectId===0?'inactive-unbound':'inactive-binding',
      targetName:p?.name??null,targetLabel:p?.label??null,targetFamily:p?.family??null,
      issues,words:Array.from({length:25},(_,i)=>body.readUInt16LE(m.offset+2*i))};
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
    modifiers,overlappingTargets,externalControllers,
    limits:['Serialized record count is not a usable modifier capacity claim.',
      'Target names use the FW13 dictionary; block presence and type visibility are not validated.',
      'Curve, range, damping and operation words are retained as raw integers, not decoded or evaluated.',
      'Active means a nonzero stored source; it does not establish scene bypass or current controller value.',
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
  'target-parameter-not-in-dictionary':'sihtparameetri nimi puudub sõnastikust'
};
export function renderModifierAuditText(audit){
  const lines=['FM3 SOUND ARCHITECT 2 — MODIFIKAATORITE AUDIT',
    `Preset: ${audit.name}`,`SHA-256: ${audit.inputSha256}`,
    'Ainult faililugemine; presetit ei muudeta ja seadmega ei suhelda.',
    'Metaandmed: FW13; faili tegelikku püsivara ei tuvastata.',
    `Serialiseeritud kirjeid ${audit.summary.serializedRecords}; aktiivseid ${audit.summary.active}; väljalülitatud seoseid ${audit.summary.inactiveBindings}; sidumata ${audit.summary.inactiveUnbound}.`,
    'Kirjete arv ei tähenda seadme kasutatavate modifikaatorite mahtu.','',
    'SEOSED (kirje number on siin 1-põhine; JSON record on 0-põhine)'];
  for(const m of audit.modifiers.filter(m=>m.state!=='inactive-unbound'||m.issues.length)){
    lines.push(`#${m.record+1}: ${m.active?'aktiivne':'väljas'}; ${m.sourceName} [${m.source}] → ${m.targetName??'tundmatu parameeter'} (plokk ${m.effectId}, PID ${m.pid}); ${m.channelScope} [${m.channel}].`);
    if(m.secondarySource!==0||m.operation!==0)lines.push(`  Teisene allikas: ${m.secondarySourceName} [${m.secondarySource}]; operaatori toorkood ${m.operation}.`);
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
    'Sihtnimed pärinevad FW13 sõnastikust; ploki olemasolu ja tüübi nähtavust ei kinnitata.',
    'Kõik 25 sõna säilivad JSON-is toorväärtustena. Kõvera, vahemiku, summutuse ja operaatori mõju ei arvutata.',
    'Aktiivne allikas ei kinnita stseeni bypass-olekut ega pedaali hetkeasendit.',
    'Edukas audit ei anna tundmatu preseti või seose kirjutusluba.',
    'Faili kaadrid, CRC, footer ja modifikaatorite päised kontrolliti; FM3 import, pedaali toimimine, heli ja CPU on kontrollimata.');
  return lines.join('\n')+'\n';
}
