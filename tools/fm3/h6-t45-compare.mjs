// Offline whole-preset comparison for the H6/T45 check. T46A-D are load-only (no STORE): their evidence is the block
// read-back plus FM3-Edit screenshots, so they are reported as load results, never as a stored-preset pass.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compareNextSession} from './audit-next-compare.mjs';
import {KIND,CASES} from './h6-t45-build.mjs';
export function compareH6Session(packDir,sessionDir,{allowSynthetic=false}={}){
 const pack=JSON.parse(fs.readFileSync(path.join(packDir,'pack.json')));
 return compareNextSession(packDir,sessionDir,{allowSynthetic,kind:KIND,cases:CASES}).map(r=>{
  const p=pack.packs.find(x=>x.id===r.case);if(!p.loadOnly)return r;
  const f=path.join(sessionDir,p.id,'shot-load-'+p.id+'.json');
  if(!fs.existsSync(f))return {case:p.id,loadOnly:true,completed:false,dataPassed:false,reason:'load result missing; skipped'};
  const load=JSON.parse(fs.readFileSync(f));
  assert.equal(load.packSha256,p.shotManifestSha256,p.id+' load result belongs to another pack');
  if(load.syntheticFixture)assert.ok(allowSynthetic,'Synthetic load result');
  return {case:p.id,loadOnly:true,completed:true,dataPassed:load.allMatch===true,perPreset:p.perPreset,
   note:'Effect names come from FM3-Edit screenshots (ingest), not from this comparison.'};
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: h6-t45-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareH6Session(path.resolve(process.argv[2]),path.resolve(process.argv[3]));
 console.log(JSON.stringify({kind:'fm3-h6-t45-comparison',deviceIO:false,results},null,2));
 if(results.every(r=>!r.completed)||results.some(r=>r.completed&&!r.dataPassed))process.exitCode=2;
}
