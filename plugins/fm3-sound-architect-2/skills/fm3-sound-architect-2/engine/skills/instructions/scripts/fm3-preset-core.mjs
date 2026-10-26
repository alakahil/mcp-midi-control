// Shared creation/replay path. No CLI, transport or output-file side effects.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {generatePreset} from './fm3-generate.mjs';
import {composeSound} from './fm3-sound.mjs';
import {validateGlobalScaleObservations,bindGlobalScaleObservations,renderGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
import {renderCpuText} from './fm3-cpu.mjs';
import {renderFinalSoundText} from './fm3-final-state.mjs';
export function createPreset(base,spec,options={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='globalScaleObservations'))throw Error('Unknown preset options');
  const observations=Object.hasOwn(options,'globalScaleObservations')?validateGlobalScaleObservations(options.globalScaleObservations):null;
  const sound=spec&&Object.hasOwn(spec,'composer'),result=sound?composeSound(base,spec):generatePreset(base,spec);
  if(observations){
    result.report.globalScaleObservations=observations;
    result.report.globalScaleDependencies=bindGlobalScaleObservations(result.syx,observations);
    result.txt=sound?renderFinalSoundText(result.report,spec)+renderCpuText(result.report.cpu)+'\n':result.txt+'\n'+renderGlobalScaleObservations(result.report.globalScaleDependencies);
  }
  return result;
}
const engineRoot=fileURLToPath(new URL('../',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function resolveReplayBase(hash){
  if(typeof hash!=='string'||! /^[a-f0-9]{64}$/.test(hash))throw Error('Replay requires a valid base SHA-256');
  // The package inventory supplies candidates, never paths from the output report.
  // The original writer still enforces its own profile-specific base allowlist.
  const index=JSON.parse(fs.readFileSync(new URL('../references/evidence-index.json',import.meta.url),'utf8'));
  const candidates=index.blobs?.[hash]?.paths??[];
  for(const relative of candidates){
    if(typeof relative!=='string'||! /^(examples|references)\/.+\.syx$/.test(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..')||relative.includes('\\'))continue;
    const source=path.resolve(engineRoot,relative),real=fs.realpathSync(source);
    if(!real.startsWith(fs.realpathSync(engineRoot)+path.sep))throw Error('Replay base escapes package');
    const bytes=fs.readFileSync(real);
    if(digest(bytes)!==hash)throw Error('Replay base bytes differ from pinned SHA-256');
    return bytes;
  }
  throw Error('Replay base is not available in this package; use the matching verified engine');
}
export function verifyPresetReplay(report,syx,txt,spec){
  const base=resolveReplayBase(report.baseSha256);
  const options=Object.hasOwn(report,'globalScaleObservations')?{globalScaleObservations:report.globalScaleObservations}:{};
  const expected=createPreset(base,spec,options);
  if(!Buffer.from(expected.syx).equals(syx))throw Error('Replay SYX differs from requested spec and pinned base');
  if(expected.txt!==txt)throw Error('Replay TXT differs from requested spec and final output');
  const {artifacts,...actual}=report,canonical=JSON.parse(JSON.stringify(expected.report));
  // All report fields, including intermediate stages, claims and limits, are checked.
  // A new engine can change report text/policies: historical bundles need their engine.
  for(const key of new Set([...Object.keys(actual),...Object.keys(canonical)])){
    if(!Object.hasOwn(actual,key)||!Object.hasOwn(canonical,key)||!isDeepStrictEqual(actual[key],canonical[key]))
      throw Error('Replay report field differs: '+key+'; use the matching verified engine');
  }
}
