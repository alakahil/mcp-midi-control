// Offline whole-preset comparison for the T51 grid record-order check (all cases STORE; none load-only).
// Besides the usual content comparison (which tolerates whole-record reordering) it reports the record order of the
// stored dump against the generated file and whether the bodies are byte-identical apart from the selected-scene byte.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {compareNextSession} from './audit-next-compare.mjs';
import {KIND,CASES} from './t51-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const {inspectStructure}=await import(path.join(E,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const bodyOf=syx=>Buffer.from(inspectStructure(syx).raw.body),orderOf=b=>scanRecords(b,{requireAmpCab:false}).records.map(r=>r.eid);
export function recordOrderOf(packDir,sessionDir,id){
 const r=JSON.parse(fs.readFileSync(path.join(sessionDir,id,'bind-store-results.json')));
 const stored=bodyOf(Buffer.concat(r.storedDumpFrames.map(h=>Buffer.from(h,'hex')).filter(f=>[0x77,0x78,0x79].includes(f[5]))));
 const gen=bodyOf(fs.readFileSync(path.join(packDir,id,id+'.syx'))),g=orderOf(gen),s=orderOf(stored);
 return {generated:g,stored:s,identical:JSON.stringify(g)===JSON.stringify(s),
  bodyByteIdenticalExceptSelectedScene:gen.length===stored.length&&gen.subarray(1).equals(stored.subarray(1))};
}
export const compareT51Session=(packDir,sessionDir,{allowSynthetic=false}={})=>compareNextSession(packDir,sessionDir,{allowSynthetic,kind:KIND,cases:CASES})
 .map(r=>r.completed?{...r,recordOrder:recordOrderOf(packDir,sessionDir,r.case)}:r);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,4,'Usage: t51-compare.mjs PACK_DIR SESSION_DIR');
 const results=compareT51Session(path.resolve(process.argv[2]),path.resolve(process.argv[3]));
 console.log(JSON.stringify({kind:'fm3-t51-comparison',deviceIO:false,results},null,2));
 if(results.every(r=>!r.completed)||results.some(r=>r.completed&&!r.dataPassed))process.exitCode=2;
}
