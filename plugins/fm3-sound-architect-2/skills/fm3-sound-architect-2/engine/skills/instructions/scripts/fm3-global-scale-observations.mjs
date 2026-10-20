// Optional offline evidence. No transport, no change to preset bytes.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {globalScaleDependencies} from './fm3-pitch-custom-scales.mjs';
const decoder=fileURLToPath(new URL('./global-scale-collector/FM3_DECODE_SCALES.py',import.meta.url));
const marker='GLOBAALSETE SKAALADE VAATLUSANDMED';
export function validateGlobalScaleObservations(observations){
  try{return JSON.parse(execFileSync('python3',[decoder,'--validate','-'],{
    input:JSON.stringify(observations),encoding:'utf8',maxBuffer:8*1024*1024,timeout:15000,stdio:['pipe','pipe','pipe']}));}
  catch(e){throw Error('Global scale observations rejected (Python 3.9+ required): '+(e.stderr?.toString().trim()||e.message));}
}
export function loadGlobalScaleObservations(file){
  if(fs.statSync(file).size>4*1024*1024)throw Error('Global scale observation file too large');
  // The Python reader also rejects duplicate JSON keys, before JSON.parse can hide them.
  try{return JSON.parse(execFileSync('python3',[decoder,'--validate',file],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:15000,stdio:['pipe','pipe','pipe']}));}
  catch(e){throw Error('Global scale observations rejected (Python 3.9+ required): '+(e.stderr?.toString().trim()||e.message));}
}
function dependenciesFromSyx(syx){
  const body=Buffer.from(inspectStructure(syx).raw.body);
  const channels=scanRecords(body).records.filter(r=>r.family==='pitch').map(r=>({block:r.family,
    channels:Array.from({length:r.channels},(_,i)=>({channel:'ABCD'[i],words:Array.from({length:r.words},(_,pid)=>body.readUInt16LE(r.start+2*(i*r.words+pid)))}))}));
  return globalScaleDependencies(channels);
}
export function bindGlobalScaleObservations(syx,observations){
  const deps=dependenciesFromSyx(syx),byScale=new Map(observations.scales.map(s=>[s.scale,s]));
  if(deps.uses.some(u=>!u.valid))throw Error('Invalid global scale selector in final preset');
  const missing=deps.readPlan.scales.filter(n=>!byScale.has(n));
  if(missing.length)throw Error('Missing global scale observations: '+missing.join(', '));
  return {...deps,observationsIncluded:true,observationScope:'capture-time device display; not current state or preset contents',
    observedScales:deps.readPlan.scales.map(n=>byScale.get(n)),source:observations.source,
    assessment:observations.assessment,requiredScalesCovered:true};
}
export function renderGlobalScaleObservations(deps){
  if(!deps.observationsIncluded)return '';
  const lines=[marker,`Kogutud: ${deps.source.startedAt} kuni ${deps.source.endedAt}.`,
    `Algarhiivi SHA-256: ${deps.source.archiveSha256}`,
    'Allpool on kogumise ajal saadud kuva ja arvuvälja ristkontroll. Püsivara ja seadme identiteet pole päringuga kinnitatud.',
    'Skaala sisu ei sisaldu SYX-is, ei kandu selle impordiga üle ega kinnita seadme praegust olekut.'];
  for(const scale of deps.observedScales)lines.push(`SCALE ${scale.scale}: `+scale.notes.map(n=>`${n.note}=${n.shiftSemitones}`).join(', ')+' pooltooni.');
  if(!deps.observedScales.length)lines.push('Lõpp-presetis pole salvestatud Custom Shifteri skaalasõltuvusi.');
  lines.push('Nullist erinevate väärtuste üldist riistvarakinnitust ega globaalsete skaalade kirjutustuge sellest ei järeldu.');
  return lines.join('\n')+'\n';
}
export function verifyGlobalScaleReport(report,syx,txt){
  if(!Object.hasOwn(report,'globalScaleObservations')){
    if(report.globalScaleDependencies?.observationsIncluded||txt.includes(marker))throw Error('Missing retained global scale evidence');
    return;
  }
  const observations=validateGlobalScaleObservations(report.globalScaleObservations);
  const expected=bindGlobalScaleObservations(syx,observations);
  if(!isDeepStrictEqual(report.globalScaleDependencies,expected))throw Error('Global scale report differs from final SYX/evidence');
  if(!txt.includes(renderGlobalScaleObservations(expected)))throw Error('Global scale TXT differs from evidence');
}
