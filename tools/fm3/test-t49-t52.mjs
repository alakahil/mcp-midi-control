// Synthetic checks for the T49 (31 Multi Delay Types) and T52 (45 Plex presets) packs: deterministic rebuild, counts and collector self-tests. No device I/O.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t49-t52-test-'));
const run=(tool,out)=>JSON.parse(execFileSync(process.execPath,[path.join(HERE,tool),out],{encoding:'utf8'}).trim().split('\n').pop());
try{
 const a=run('t49-multidelay-types-build.mjs',path.join(tmp,'a')),a2=run('t49-multidelay-types-build.mjs',path.join(tmp,'a2'));
 assert.deepEqual(a,a2,'T49 deterministic');assert.equal(a.presets,8);assert.equal(a.types,31);assert.ok(a.cpuMax<80);
 const d49=path.join(tmp,'a/FM3_T49_MDTYPES'),m49=JSON.parse(fs.readFileSync(path.join(d49,'manifest.json')));
 assert.equal(new Set(m49.items.flatMap(i=>i.types.map(t=>t.type))).size,31);
 for(const it of m49.items){const r=JSON.parse(execFileSync('python3',['-B',path.join(d49,'FM3_SHOT_LOAD.py'),'--preflight','--pack',d49,'--preset',it.id],{encoding:'utf8'}).trim().split('\n').pop());
  assert.ok(r.passed&&r.portOpened===false&&r.comparedWords===484,it.id);}
 const b=run('t52-plex-presets-build.mjs',path.join(tmp,'b')),b2=run('t52-plex-presets-build.mjs',path.join(tmp,'b2'));
 assert.deepEqual(b,b2,'T52 deterministic');assert.equal(b.presets,45);assert.equal(b.words,96);
 const d52=path.join(tmp,'b/FM3_T52_PLEXPRESETS'),m52=JSON.parse(fs.readFileSync(path.join(d52,'manifest.json')));
 assert.equal(m52.kind,'fm3-plex-presets');assert.equal(m52.block.effectId,178);assert.equal(m52.block.expected.length,384);
 const py=fs.readFileSync(path.join(d52,'FM3_PLEX_PRESETS.py'),'utf8');assert.ok(!/Multi Delay|md-preset|\[114\]/.test(py),'collector fully derived');
 assert.match(execFileSync('python3',['-B',path.join(d52,'FM3_PLEX_PRESETS.py'),'--self-test'],{encoding:'utf8'}),/"selfTest": "passed"/);
 console.log(JSON.stringify({passed:true,t49:{presets:a.presets,types:a.types},t52:{presets:b.presets,words:b.words},syntheticOnly:true,deviceIO:false,newHardwareMeasurements:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
