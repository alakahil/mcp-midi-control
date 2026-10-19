// One public entry point. Legacy specs retain their measured writer; sound specs
// add the two-row/table stages. Every successful CLI emits the same four files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatePreset} from './fm3-generate.mjs';
import {composeSound,getSoundCapabilities} from './fm3-sound.mjs';
import {writePresetOutputs,verifyPresetOutputs} from './fm3-output.mjs';
export {getSoundCapabilities as getPresetCapabilities,writePresetOutputs,verifyPresetOutputs};
export function createPreset(base,spec){
  return spec&&Object.hasOwn(spec,'composer')?composeSound(base,spec):generatePreset(base,spec);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [b,s,stem,...extra]=process.argv.slice(2);
  if(b==='--capabilities'){if(stem||extra.length)throw Error('Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
  else if(b==='--verify'){if(!s||stem||extra.length)throw Error('Usage: --verify OUTPUT_STEM');const r=verifyPresetOutputs(s);console.log(JSON.stringify({passed:true,outputSha256:r.outputSha256}));}
  else{if(!b||!s||!stem||extra.length)throw Error('Usage: node fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM');const spec=JSON.parse(fs.readFileSync(s,'utf8')),r=createPreset(fs.readFileSync(b),spec);const files=writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);console.log(JSON.stringify({outputSha256:r.report.outputSha256,files}));}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
