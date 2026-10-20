// One public entry point. Legacy specs retain their measured writer; sound specs
// add the two-row/table stages. Every successful CLI emits the same four files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatePreset} from './fm3-generate.mjs';
import {composeSound,getSoundCapabilities} from './fm3-sound.mjs';
import {writePresetOutputs,verifyPresetOutputs} from './fm3-output.mjs';
import {validateGlobalScaleObservations,loadGlobalScaleObservations,bindGlobalScaleObservations,renderGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
import {renderFinalSoundText} from './fm3-final-state.mjs';
export {getSoundCapabilities as getPresetCapabilities,writePresetOutputs,verifyPresetOutputs};
export function createPreset(base,spec,options={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='globalScaleObservations'))throw Error('Unknown preset options');
  const observations=Object.hasOwn(options,'globalScaleObservations')?validateGlobalScaleObservations(options.globalScaleObservations):null;
  const sound=spec&&Object.hasOwn(spec,'composer'),result=sound?composeSound(base,spec):generatePreset(base,spec);
  if(observations){
    result.report.globalScaleObservations=observations;
    result.report.globalScaleDependencies=bindGlobalScaleObservations(result.syx,observations);
    result.txt=sound?renderFinalSoundText(result.report,spec):result.txt+'\n'+renderGlobalScaleObservations(result.report.globalScaleDependencies);
  }
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [b,s,stem,...extra]=process.argv.slice(2);
  if(b==='--capabilities'){if(stem||extra.length)throw Error('Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
  else if(b==='--verify'){if(!s||stem||extra.length)throw Error('Usage: --verify OUTPUT_STEM');const r=verifyPresetOutputs(s);console.log(JSON.stringify({passed:true,outputSha256:r.outputSha256}));}
  else{if(!b||!s||!stem||(extra.length&&!(extra.length===2&&extra[0]==='--global-scales'&&extra[1])))throw Error('Usage: node fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM [--global-scales OBSERVATIONS.json]');const options=extra.length?{globalScaleObservations:loadGlobalScaleObservations(extra[1])}:{},spec=JSON.parse(fs.readFileSync(s,'utf8')),r=createPreset(fs.readFileSync(b),spec,options);const files=writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);console.log(JSON.stringify({outputSha256:r.report.outputSha256,files}));}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
