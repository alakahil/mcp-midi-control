import {verifyPresetReplay} from './fm3-preset-core.mjs';
import {verifyControlsOutput} from './fm3-controls-output.mjs';
import {verifyVolumePedalOutput} from './fm3-volume-pedal.mjs';
import {verifyControlSwitchOutput} from './fm3-control-switches.mjs';
import {verifyGridOutput} from './fm3-grid-output.mjs';
import {verifyVolumeOutput} from './fm3-volume-output.mjs';
import {verifyInputGateOutput} from './fm3-input-gate-output.mjs';
// Stage all four files; never overwrite existing output. The validation file is
// published last and is the completion marker. Caught failures remove our links.
// A process/machine crash can leave an incomplete bundle: consumers must verify
// all hashes in validation.artifacts before accepting it.
import fs from 'node:fs';
import {verifyWahExactOutput} from './fm3-wah-minmax-exact.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyGlobalScaleReport} from './fm3-global-scale-observations.mjs';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function writePresetOutputs(stem,result,spec){
  const dir=path.dirname(path.resolve(stem));fs.mkdirSync(dir,{recursive:true});
  const values={'.syx':result.syx,'.txt':result.txt,'.spec.json':JSON.stringify(spec,null,2)+'\n'};
  const artifacts=Object.fromEntries(Object.entries(values).map(([ext,value])=>[ext,{sha256:sha256(value),bytes:Buffer.byteLength(value)}]));
  values['.validation.json']=JSON.stringify({...result.report,artifacts},null,2)+'\n';
  for(const ext of Object.keys(values))if(fs.existsSync(stem+ext))throw Error('Output already exists: '+stem+ext);
  const temp=fs.mkdtempSync(path.join(dir,'.fm3-output-')),created=[];
  try{
    for(const [ext,value] of Object.entries(values))fs.writeFileSync(path.join(temp,'preset'+ext),value,{flag:'wx'});
    for(const ext of Object.keys(values)){fs.linkSync(path.join(temp,'preset'+ext),stem+ext);created.push(ext);}
  }catch(e){for(const ext of created){
    const dest=stem+ext,src=path.join(temp,'preset'+ext),owned=fs.lstatSync(src),current=fs.lstatSync(dest,{throwIfNoEntry:false});
    if(current?.isFile()&&current.dev===owned.dev&&current.ino===owned.ino)fs.unlinkSync(dest);
  }throw e;}
  finally{fs.rmSync(temp,{recursive:true,force:true});}
  return Object.keys(values).map(ext=>stem+ext);
}
export function verifyPresetOutputs(stem){
  // Read one consistent snapshot. Every semantic check uses these same bytes.
  const utf8=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
  const report=JSON.parse(utf8.decode(fs.readFileSync(stem+'.validation.json')));
  if(!report||typeof report!=='object'||Array.isArray(report)||!report.artifacts)throw Error('Missing artifact manifest');
  const extensions=['.syx','.txt','.spec.json'];
  if(Object.keys(report.artifacts).sort().join('|')!==[...extensions].sort().join('|'))throw Error('Unexpected artifact manifest fields');
  const files=Object.fromEntries(extensions.map(ext=>[ext,fs.readFileSync(stem+ext)]));
  for(const ext of extensions){
    const bytes=files[ext],entry=report.artifacts[ext];
    if(!entry||Object.keys(entry).sort().join('|')!=='bytes|sha256'||sha256(bytes)!==entry.sha256||bytes.length!==entry.bytes)throw Error('Artifact mismatch: '+ext);
  }
  const syx=files['.syx'],txt=utf8.decode(files['.txt']),spec=JSON.parse(utf8.decode(files['.spec.json']));
  if(sha256(syx)!==report.outputSha256)throw Error('Final SYX hash mismatch');
  verifyGlobalScaleReport(report,syx,txt);
  verifyWahExactOutput(report,syx,txt,spec);
  verifyInputGateOutput(report,syx,txt,spec);
  verifyVolumeOutput(report,syx,txt,spec);
  verifyVolumePedalOutput(report,syx,txt,spec);
  verifyControlSwitchOutput(report,syx,txt,spec);
  verifyGridOutput(report,syx,txt,spec);
  verifyControlsOutput(report,syx,txt,spec);
  verifyPresetReplay(report,syx,txt,spec);
  return report;
}
