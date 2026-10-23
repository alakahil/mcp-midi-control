// Audit point 7: offline CPU estimate per scene (FM3 Mk II Turbo, FW13). No device I/O.
// Sources (2026-10-23): hand subtractive readings (fm3-cpu-measurements) and the automated sweep
// of 342 types (fm3-cpu-types: edit-buffer loads + calibrated CPU meter, ±0.5 %). The FM3-Edit CPU
// meter counts every placed block (bypass does not save CPU) on the effects core; Amp and Delay run
// on the amp core, which the meter barely shows. Satriani V1 Scene 4: estimate 60.1 %, measured 61 %.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';

const pinned=(file,hash)=>{const b=fs.readFileSync(new URL('../references/'+file,import.meta.url));
  if(createHash('sha256').update(b).digest('hex')!==hash)throw Error(file+' changed; review and re-pin');return JSON.parse(b);};
export const cpuMeasurementsHash='dbe43ad7c772634dcf24b7924f6bea6f141407cff49b738ebacc1b1951e741c3';
export const cpuTypesHash='8976c3114255ac18ef8847d332e760bbe2485aaf19c2890bf62dbdd53f0626a9';
export const cpuMeasurements=pinned('fm3-cpu-measurements-20261023.json',cpuMeasurementsHash);
export const cpuTypes=pinned('fm3-cpu-types-20261023.json',cpuTypesHash);
// Type selector per family (decoded from the scene's active channel).
const TYPE_FIELD={drive:'FUZZ_TYPE',reverb:'REVERB_TYPE',delay:'DELAY_MODEL',compressor:'COMP_TYPE',chorus:'CHORUS_TYPE',flanger:'FLANGER_TYPE',
  phaser:'PHASER_TYPE',wah:'WAH_TYPE',tremolo:'TREMOLO_TYPE',pitch:'PITCH_TYPE',filter:'FILTER_TYPE',
  cab:'CABINET_MODE',plex:'PLEX_BASETYPE',megatap:'MEGATAP_TYPE',tentap:'TENTAP_TYPE',resonator:'RESONATOR_MODE',ringmod:'RINGMOD_TYPE',gate:'GATE_TYPE',volpan:'VOLUME_TYPE',synth:'SYNTH_TYPE1'};
// Single measured type (session A/B defaults) for families the sweep did not vary.
const SINGLE={amp:null,cab:'DYNA-CAB',plex:'Plex Delay',megatap:'Reverb Pre-Swell',tentap:'Ten-Tap Delay',resonator:'MANUAL',ringmod:'CLASSIC',gate:'Classic Expander',volpan:'VOLUME',looper:null,multiband:null,formant:null,synth:'TRIANGLE'};
const IGNORED=new Set(['in1','out1','send','return']);
const norm=s=>String(s).trim().toLowerCase().replace(/[’']/g,"'");
const typeTable=Object.fromEntries(Object.entries(cpuTypes.families).map(([f,t])=>[f,new Map(Object.entries(t).map(([k,v])=>[norm(k),v]))]));
const familyMax=f=>Math.max(...typeTable[f].values());
export function qualityDelta(type,quality){
  const q=String(quality).trim();if(q==='ECONOMY')return {delta:0,exact:true};
  const table=cpuTypes.reverbQualityDelta;
  if(table[type]?.[q]!==undefined)return {delta:table[type][q],exact:true};
  const cat=type.split(':')[0],same=Object.entries(table).filter(([t])=>t.split(':')[0]===cat).map(([,d])=>d[q]);
  return {delta:same.length?Math.max(...same):Math.max(...Object.values(table).map(d=>d[q])),exact:false};
}
const readLabel=(body,r,ch,name)=>{const p=findParam(r.family.replace(/\d+$/,''),name);return String(decodeValue(p,body.readUInt16LE(r.start+2*(ch*r.words+p.param)))).trim();};
function blockCost(body,r,s){
  const fam=r.instance>1?r.family.replace(/\d+$/,''):r.family,notes=[];
  const ch=Math.min(body.readUInt16LE(r.header+10+2*s),r.channels-1);
  if(r.instance>1)notes.push(fam+' instance '+r.instance+' assumed equal to instance 1');
  const label=TYPE_FIELD[fam]?readLabel(body,r,ch,TYPE_FIELD[fam]):null;
  if(typeTable[fam]&&fam!=='synth'&&!['rotary','peq','geq','enhancer'].includes(fam)){
    let cost=typeTable[fam].get(norm(label));
    if(cost===undefined){cost=familyMax(fam);notes.push(fam+' '+label+' unmeasured (family maximum used)');}
    if(fam==='reverb'){const q=readLabel(body,r,ch,'REVERB_QUALITY'),d=qualityDelta(label,q);cost+=d.delta;if(!d.exact)notes.push('reverb quality '+q+' extrapolated for '+label);}
    return {cost,label,notes};
  }
  if(typeTable[fam]?.has('default'))return {cost:typeTable[fam].get('default'),label,notes};
  const c=cpuMeasurements.costs[fam];
  if(!c||c.cpu===null)return {cost:null,label,notes:[fam+' has no CPU measurement']};
  if(SINGLE[fam]&&label&&norm(label)!==norm(SINGLE[fam]))notes.push(fam+' '+label+' unmeasured (measured: '+SINGLE[fam]+')');
  return {cost:c.cpu,label,notes};
}
export function estimateCpu(syx){
  const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body),limit=cpuMeasurements.limit.safe;
  const blocks=records.filter(r=>!IGNORED.has(r.family));
  const scenes=Array.from({length:8},(_,s)=>{
    let total=cpuMeasurements.costs.baseline.cpu;const notes=[],unknown=[],parts={};
    for(const r of blocks){const b=blockCost(body,r,s);notes.push(...b.notes);if(b.cost===null){unknown.push(r.family);continue;}total+=b.cost;parts[r.family]=b.cost;}
    const exact=!notes.length&&!unknown.length,pct=Math.round(total*10)/10;
    return {scene:s+1,percent:pct,measuredTypeCoverage:exact,exact,parts,notes,unknown,
      warning:pct>limit?'over the safe limit':pct>limit-8?'within 8 % of the safe limit':null};
  });
  const worst=scenes.reduce((a,b)=>b.percent>a.percent?b:a);
  return {model:'fm3-cpu 0.2.1',measurementsSha256:cpuMeasurementsHash,typesSha256:cpuTypesHash,limitPercent:limit,maxPercent:worst.percent,worstScene:worst.scene,
    measuredTypeCoverageAllScenes:scenes.every(s=>s.measuredTypeCoverage),
    exactAllScenes:scenes.every(s=>s.exact),exactFieldsMeaning:'Legacy aliases for measured-type coverage, not prediction accuracy',scenes,
    scope:'Effects-core meter (FM3-Edit CPU). Measured component costs do not establish a bound on combined-preset error (G06: estimate 44.3 %, measured 41.5 %). Unmeasured types use an available family maximum or a single measured reference; unknown families are omitted and named. Amp/Delay core not visible. Bypass does not reduce CPU.'};
}
export function renderCpuText(e){
  const lines=['','CPU HINNANG (FM3 Mk II Turbo, püsivara 13; mõõdetud 2026-10-23)',
    `Suurim: ${e.maxPercent} % (Scene ${e.worstScene}); ohutu piir ${e.limitPercent} %.`,
    'Stseenid: '+e.scenes.map(s=>`S${s.scene} ${s.percent} %`).join(', ')];
  if(e.measuredTypeCoverageAllScenes)lines.push('Kõigi plokkide valitud tüüpidel on mõõteandmed; nende summa ei taga presetipõhist veapiiri.');
  else{const n=[...new Set(e.scenes.flatMap(s=>s.notes))],u=[...new Set(e.scenes.flatMap(s=>s.unknown))];
    lines.push('Osa tüüpe on mõõtmata; kasutatakse olemasolevat pere maksimumi või üht mõõdetud võrdlustüüpi. See ei taga ülempiiri.');
    if(n.length)lines.push('Märkused: '+n.join('; '));if(u.length)lines.push('Mõõtmata plokid (pole arvestatud): '+u.join(', '));}
  const w=e.scenes.filter(s=>s.warning);if(w.length)lines.push('HOIATUS: '+w.map(s=>`Scene ${s.scene} ${s.percent} % (${s.warning})`).join('; '));
  lines.push('Koondmudeli kontrollnäide G06: hinnang 44,3 %, mõõdetud 41,5 % (erinevus 2,8 protsendipunkti).');
  lines.push('Amp ja Delay töötavad eraldi tuumal; selle koormust see hinnang ei näe.');
  return lines.join('\n');
}
