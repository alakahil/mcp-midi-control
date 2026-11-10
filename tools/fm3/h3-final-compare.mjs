// Offline whole-preset comparison for the H3 final-file check. Sound, transitions, switches and CPU stay separate.
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compareNextSession} from './audit-next-compare.mjs';
import {KIND,CASES} from './h3-final-build.mjs';
export const compareH3Session=(packDir,sessionDir,{allowSynthetic=false}={})=>
 compareNextSession(packDir,sessionDir,{allowSynthetic,kind:KIND,cases:CASES});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: h3-final-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareH3Session(path.resolve(process.argv[2]),path.resolve(process.argv[3]));
 console.log(JSON.stringify({kind:'fm3-h3-final-comparison',deviceIO:false,results},null,2));
 // A skipped candidate is "not done", not a failure; a completed candidate must pass.
 if(results.every(r=>!r.completed)||results.some(r=>r.completed&&!r.dataPassed))process.exitCode=2;
}
