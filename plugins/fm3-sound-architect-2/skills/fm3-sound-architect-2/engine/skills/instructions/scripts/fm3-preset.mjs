// One public entry point. Legacy specs retain their measured writer; sound specs
// add the two-row/table stages. Generation emits four files; read modes use stdout.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPreset,resolveReplayBase} from './fm3-preset-core.mjs';
export {createPreset} from './fm3-preset-core.mjs';
import {getSoundCapabilities} from './fm3-sound.mjs';
import {writePresetOutputs,verifyPresetOutputs} from './fm3-output.mjs';
import {loadGlobalScaleObservations} from './fm3-global-scale-observations.mjs';
import {auditModifiers,renderModifierAuditText} from './fm3-modifier-audit.mjs';
import {parameterMapCLI} from './fm3-parameter-map.mjs';
import {readGridPreset,renderGridAuditText} from './fm3-grid-audit.mjs';
export {getSoundCapabilities as getPresetCapabilities,writePresetOutputs,verifyPresetOutputs,auditModifiers,renderModifierAuditText};

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [b,s,stem,...extra]=process.argv.slice(2);
  if(b==='--capabilities'){if(stem||extra.length)throw Error('Usage: --capabilities [BASE.syx]');console.log(JSON.stringify(getSoundCapabilities(s?fs.readFileSync(s):undefined),null,2));}
  else if(b==='--parameter-map'){console.log(JSON.stringify(parameterMapCLI([s,stem,...extra].filter(v=>v!==undefined)),null,2));}
  else if(b==='--inspect-grid'){
    if(!s||!((!stem&&!extra.length)||(stem==='--format'&&extra.length===1&&['json','txt'].includes(extra[0]))))throw Error('Usage: --inspect-grid PRESET.syx [--format json|txt]');
    const audit=readGridPreset(s);process.stdout.write(extra[0]==='txt'?renderGridAuditText(audit):JSON.stringify(audit,null,2)+'\n');
  }
  else if(b==='--inspect-modifiers'){
    if(!s||!((!stem&&!extra.length)||(stem==='--format'&&extra.length===1&&['json','txt'].includes(extra[0]))))throw Error('Usage: --inspect-modifiers PRESET.syx [--format json|txt]');
    const audit=auditModifiers(fs.readFileSync(s));process.stdout.write(extra[0]==='txt'?renderModifierAuditText(audit):JSON.stringify(audit,null,2)+'\n');
  }
  else if(b==='--verify'){if(!s||stem||extra.length)throw Error('Usage: --verify OUTPUT_STEM');const r=verifyPresetOutputs(s);console.log(JSON.stringify({passed:true,outputSha256:r.outputSha256}));}
  else{if(!b||!s||!stem||(extra.length&&!(extra.length===2&&extra[0]==='--global-scales'&&extra[1])))throw Error('Usage: node fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM [--global-scales OBSERVATIONS.json]');const options=extra.length?{globalScaleObservations:loadGlobalScaleObservations(extra[1])}:{},spec=JSON.parse(fs.readFileSync(s,'utf8')),r=createPreset(fs.readFileSync(b),spec,options);resolveReplayBase(r.report.baseSha256);const files=writePresetOutputs(stem,r,spec);verifyPresetOutputs(stem);console.log(JSON.stringify({outputSha256:r.report.outputSha256,files}));}
 }catch(e){console.error(e.message);process.exitCode=1;}
}
