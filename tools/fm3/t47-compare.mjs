// Offline whole-preset comparison for the T47 per-preset footswitch check (all cases STORE; none load-only).
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compareNextSession} from './audit-next-compare.mjs';
import {KIND,CASES} from './t47-build.mjs';
export const compareT47Session=(packDir,sessionDir,{allowSynthetic=false}={})=>compareNextSession(packDir,sessionDir,{allowSynthetic,kind:KIND,cases:CASES});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: t47-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareT47Session(path.resolve(process.argv[2]),path.resolve(process.argv[3]));
 console.log(JSON.stringify({kind:'fm3-t47-comparison',deviceIO:false,results},null,2));
 if(results.every(r=>!r.completed)||results.some(r=>r.completed&&!r.dataPassed))process.exitCode=2;
}
