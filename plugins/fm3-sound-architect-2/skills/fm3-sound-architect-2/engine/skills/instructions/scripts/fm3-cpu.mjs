// Audit point 7: offline CPU estimate from user-measured block costs (2026-10-23). No device I/O.
// The FM3-Edit CPU meter counts every placed block (bypass does not save CPU) on the effects core;
// Amp and Delay run on the amp core, which this meter barely shows and this estimate cannot see.
// Costs are exact only for the measured types: another type of the same family can differ a lot
// (Satriani V1 Scene 4 measured 61 % against a family-level 44.6 %), so every scene reports which
// blocks use an unmeasured type and the estimate is a floor, never a guarantee.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';

export const cpuMeasurementsHash='dbe43ad7c772634dcf24b7924f6bea6f141407cff49b738ebacc1b1951e741c3';
const bytes=fs.readFileSync(new URL('../references/fm3-cpu-measurements-20261023.json',import.meta.url));
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==cpuMeasurementsHash)throw Error('CPU measurements changed; review and re-pin');
export const cpuMeasurements=JSON.parse(bytes);
// Type selector(s) per family; the measured type label must match for the cost to count as measured.
const TYPE_FIELDS={drive:['FUZZ_TYPE'],reverb:['REVERB_TYPE','REVERB_QUALITY'],compressor:['COMP_TYPE'],delay:['DELAY_MODEL'],
  cab:['CABINET_MODE'],plex:['PLEX_BASETYPE'],megatap:['MEGATAP_TYPE'],tentap:['TENTAP_TYPE'],resonator:['RESONATOR_MODE'],
  ringmod:['RINGMOD_TYPE'],gate:['GATE_TYPE'],volpan:['VOLUME_TYPE'],synth:['SYNTH_TYPE1']};
const measuredLabel=f=>{const c=cpuMeasurements.costs[f];if(!c?.type)return null;const t=c.type.replace(/ \((default|MONO)\)$/,'');return f==='reverb'?[t,c.quality]:[t];};
const IGNORED=new Set(['in1','out1','send','return']);
const read=(body,r,ch,name)=>{const p=findParam(r.family.replace(/\d+$/,''),name);return String(decodeValue(p,body.readUInt16LE(r.start+2*(ch*r.words+p.param)))).trim();};

export function estimateCpu(syx){
  const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body),costs=cpuMeasurements.costs,limit=cpuMeasurements.limit.safe;
  const blocks=records.filter(r=>!IGNORED.has(r.family));
  const scenes=Array.from({length:8},(_,s)=>{
    let floor=costs.baseline.cpu;const unmeasuredFamily=[],otherType=[],measured=[];
    for(const r of blocks){
      const fam=r.instance>1?r.family.replace(/\d+$/,''):r.family,c=costs[fam];
      if(r.instance>1||!c||c.cpu===null){unmeasuredFamily.push(r.family);continue;}
      floor+=c.cpu;
      const want=measuredLabel(fam),fields=TYPE_FIELDS[fam];
      if(fields&&want){const ch=Math.min(body.readUInt16LE(r.header+10+2*s),r.channels-1),got=fields.map(n=>read(body,r,ch,n));
        if(got.some((g,i)=>g!==want[i]))otherType.push(`${fam} ${got.join('/')}`);else measured.push(fam);}
      else measured.push(fam);
    }
    const exact=!unmeasuredFamily.length&&!otherType.length;
    return {scene:s+1,floorPercent:Math.round(floor*10)/10,exact,measured,unmeasuredFamily,otherType,
      warning:floor>limit?'over the safe limit':floor>limit-10?'within 10 % of the safe limit':null};
  });
  const worst=scenes.reduce((a,b)=>b.floorPercent>a.floorPercent?b:a);
  return {model:'fm3-cpu 0.1.0',measurementsSha256:sha,limitPercent:limit,maxFloorPercent:worst.floorPercent,worstScene:worst.scene,
    exactAllScenes:scenes.every(s=>s.exact),scenes,
    scope:'Effects-core meter only (Amp/Delay core not visible). Floor = baseline + measured family costs; exact only where every block uses the measured type. Bypass does not reduce CPU.'};
}
export function renderCpuText(e){
  const lines=['','CPU HINNANG (FM3-Edit CPU näit, mõõdetud 2026-10-23)',
    `Suurim alampiir: ${e.maxFloorPercent} % (Scene ${e.worstScene}); ohutu piir ${e.limitPercent} %.`];
  if(e.exactAllScenes)lines.push('Kõik plokid kasutavad mõõdetud tüüpe: hinnang on täpne (±1 %).');
  else{const u=new Set(e.scenes.flatMap(s=>s.unmeasuredFamily)),o=new Set(e.scenes.flatMap(s=>s.otherType));
    lines.push('Hinnang on ALAMPIIR, tegelik CPU võib olla suurem (sama pere teine tüüp võib maksta kuni ~16 % rohkem).');
    if(u.size)lines.push('Mõõtmata plokid: '+[...u].join(', '));if(o.size)lines.push('Mõõtmata tüübid: '+[...o].join('; '));}
  const w=e.scenes.filter(s=>s.warning);if(w.length)lines.push('HOIATUS: '+w.map(s=>`Scene ${s.scene} ${s.floorPercent} % (${s.warning})`).join('; '));
  lines.push('Amp ja Delay töötavad eraldi tuumal; selle koormust see hinnang ei näe.');
  return lines.join('\n');
}
