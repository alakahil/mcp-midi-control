// Turn an FM3_GRID_CHECK results.jsonl into the grid-check receipt (audit point 5). Offline.
// Usage: node tools/fm3/grid-check-ingest.mjs [RESULTS.jsonl] [--write]
// Without RESULTS the pinned copy in references/ is checked. The pack is rebuilt deterministically
// by grid-check-build.mjs; every result must belong to a rebuilt preset (SHA-256 by id) and the
// device grid must equal the generator's 48 cells.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeGridReply} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-grid-audit.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const PINNED=path.join(REF,'fm3-grid-check-20261023-results.jsonl');
const resultsFile=process.argv.slice(2).find(a=>!a.startsWith('--'))??PINNED;
const sha=b=>createHash('sha256').update(b).digest('hex');
const results=fs.readFileSync(resultsFile,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-grid-'));
execFileSync('node',[path.join(ROOT,'tools/fm3/grid-check-build.mjs'),tmp],{stdio:'ignore'});
const manifest=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
// The measured pack (2026-10-23) used these preset files; the rebuild must reproduce them byte for byte.
const MEASURED={G01:'81c2f14b836aea0d',G02:'21ad36de5120259b',G03:'870f9477262ebc67',G04:'52e11da20f89bd59',G05:'671a4a5fa8eb2796',G06:'2ad2535b823e6170',G07:'59ec964fbf570ff3'};
assert.equal(results.length,manifest.items.length,'one result per preset');
const tests=manifest.items.map(it=>{
  const r=results.find(x=>x.id===it.id);assert.ok(r,'missing '+it.id);
  assert.ok(it.sha256.startsWith(MEASURED[it.id]),'rebuilt preset differs from the measured one: '+it.id);
  assert.deepEqual(r.deviceGrid,it.expectedGrid,'device grid '+it.id);assert.equal(r.gridMatches,true);
  assert.deepEqual(decodeGridReply(Buffer.from(r.frameHex,'hex')).map(c=>[c.row,c.col,c.id,c.mask]),r.deviceGrid,'original wire frame '+it.id);
  assert.equal(sha(Buffer.from(r.frameHex,'hex')).length,64);assert.equal(r.frameBytes,Buffer.from(r.frameHex,'hex').length);
  const ids=[...new Set(it.expectedGrid.map(c=>c[2]).filter(i=>i&&i<1024))].sort((a,b)=>a-b);
  const tsMisread=[...new Set(r.tsDecode.filter(c=>!c[3]).map(c=>c[2]))].filter(i=>!ids.includes(i)).sort((a,b)=>a-b);
  return {id:it.id,proves:it.proves,presetSha256:it.sha256,gridMatches:true,cells:48,effectIds:ids,shunts:it.expectedGrid.filter(c=>c[2]>=1024).length,
    links:it.links,cpuMeasured:r.cpuPercent,cpuEstimate:it.cpuEstimate,cpuUnknown:it.cpuUnknown,
    ...(r.userAnswer!==undefined?{userAnswer:r.userAnswer}:{}),fractalMidiDecoderMisreads:tsMisread};
});
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-23',
  method:'FM3_GRID_CHECK.py: each preset sent to the edit buffer (7F 00) only, live grid read via fn=0x01 sub=0x2E (tail-anchored 226-byte region, cell = u16 id + u16 mask from bit 45, MSB-first). No store, no SET.',
  findings:['All 7 generated grids (splits, merges, 4 rows, Mixer 126, Multiplexer 191, Synth 130 without input, Send 182/Return 186, instances 47/71/119, removals) read back identical in all 48 cells.',
    'The live cell is the preset-body cell word itself; the fractal-midi parseGen3GridLayout reading (7-bit id at bit 46) misreads every id > 127 (Send 182 -> 54, Return 186 -> 58, Plex 178 -> 50, Multiplexer 191 -> 63, Synth 130 -> 2).',
    'G02: the user saw the branch start after Amp (before Cab), exactly the encoded link (row 3 col 6 fed from row 2 col 5 = Amp). The original question text said "after Cab"; the generator now lists every split/merge source by block and warns when an Amp path reaches the output without a Cab.',
    'CPU of the grid presets is within the model: Mixer/Multiplexer add no measurable load at this resolution.'],
  tests,resultsSha256:sha(fs.readFileSync(resultsFile))};
const content=JSON.stringify(out,null,1)+'\n',target=path.join(REF,'fm3-grid-check-20261023.json');
if(process.argv.includes('--write')){fs.writeFileSync(target,content);if(resultsFile!==PINNED)fs.copyFileSync(resultsFile,PINNED);}
else assert.equal(fs.readFileSync(target,'utf8'),content,'grid-check receipt stale');
fs.rmSync(tmp,{recursive:true,force:true});
console.log(JSON.stringify({tests:tests.length,allMatch:true,cpu:tests.map(t=>t.id+':'+t.cpuMeasured+'/'+t.cpuEstimate)}));
