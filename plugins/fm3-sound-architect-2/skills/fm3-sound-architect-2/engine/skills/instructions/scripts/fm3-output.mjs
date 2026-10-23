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
  }catch(e){for(const ext of created){const dest=stem+ext,src=path.join(temp,'preset'+ext);if(fs.existsSync(dest)&&fs.statSync(dest).ino===fs.statSync(src).ino)fs.unlinkSync(dest);}throw e;}
  finally{fs.rmSync(temp,{recursive:true,force:true});}
  return Object.keys(values).map(ext=>stem+ext);
}
export function verifyPresetOutputs(stem){
  const report=JSON.parse(fs.readFileSync(stem+'.validation.json','utf8'));
  if(!report.artifacts)throw Error('Missing artifact manifest');
  for(const ext of ['.syx','.txt','.spec.json']){
    const bytes=fs.readFileSync(stem+ext),entry=report.artifacts[ext];
    if(!entry||sha256(bytes)!==entry.sha256||bytes.length!==entry.bytes)throw Error('Artifact mismatch: '+ext);
  }
  if(sha256(fs.readFileSync(stem+'.syx'))!==report.outputSha256)throw Error('Final SYX hash mismatch');
  verifyGlobalScaleReport(report,fs.readFileSync(stem+'.syx'),fs.readFileSync(stem+'.txt','utf8'));
  verifyWahExactOutput(report,fs.readFileSync(stem+'.syx'),fs.readFileSync(stem+'.txt','utf8'),JSON.parse(fs.readFileSync(stem+'.spec.json','utf8')));
  return report;
}
