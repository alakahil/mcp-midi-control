// Replay the 2026-11-13 T51 hardware results (grid mode, recordOrder "device"); no device or MIDI access.
// T51A/B: stored body byte-identical to the generated file, record order included. T51C: the FM3 stored the second Drive
// instance right after Drive 1 (the pack appended it, having no evidence); that dump was added to the record-order
// receipt, and the CURRENT generator reproduces all three FM3-stored bodies byte for byte.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,CASES} from './t51-build.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(ROOT,'docs/fm3/hardware-results/2026-11-13/t51');
const {parsePresetDump,decodeRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const {scanRecords}=await import(path.join(E,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const body=b=>Buffer.from(decodeRawPatch(parsePresetDump(b,0,17).chunkPayloads).body);
const stored=c=>body(Buffer.concat(J(path.join(D,c,'bind-store-results.json')).storedDumpFrames.map(h=>Buffer.from(h,'hex')).filter(x=>[0x77,0x78,0x79].includes(x[5]))));
const order=b=>scanRecords(b,{requireAmpCab:false}).records.map(r=>r.eid);
const SHOTS={'T51A/grid.jpg':'Rida 2 Comp/Drive/Amp/Cab/Delay/Mixer, rida 3 Reverb','T51B/grid.jpg':'Delay, Reverb ja PlexDly kolmes reas, neljas kuiv shunt, Mixer liidab neli rida',
 'T51C/grid.jpg':'Comp hargneb: rida 2 Drive (sees), rida 3 Drive 2 (bypass), M-Plex, Amp, Cab, Delay, Reverb','T51C/multiplexer.jpg':'Multiplexer 1 Input Select Row 2, Input Mode Stereo'};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t51-ev-'));
try{
 build(path.join(tmp,'pack'));
 const cases=CASES.map(c=>{
  const r=J(path.join(D,c,'bind-store-results.json')),load=J(path.join(D,c,'load-confirmation.json')),shot=J(path.join(D,c,`shot-load-${c}.json`));
  assert.equal(r.shownLocation,427);assert.equal(r.index,426);assert.ok(!r.syntheticFixture);assert.equal(shot.allMatch,true);assert.equal(load.userConfirmedName,true);
  for(const side of ['beforeStore','afterReload']){const o=r[side];assert.equal(String(o.behavior).toLowerCase(),'jah');assert.equal(o.name_grid_scenes,'jah');assert.equal(o.grid_display,'Claude');}
  const tested=load.presetSha256;
  const syx=fs.readFileSync(path.join(tmp,'pack',c,c+'.syx')),gen=body(syx),st=stored(c);
  assert.ok(gen.equals(st),c+': current generator = FM3-stored body, byte for byte');
  if(c!=='T51C')assert.equal(sha(syx),tested,c+' pack unchanged since the test');else assert.notEqual(sha(syx),tested,'T51C pack regenerated with device order');
  return {case:c,storedBodyByteIdenticalToCurrentGenerator:true,storedRecordOrder:order(st),presetSha256:sha(syx),testedPresetSha256:tested,
   beforeStore:r.beforeStore,afterReload:r.afterReload,note:r.note||null};
 });
 assert.match(cases[1].note,/OUT 1 clipp/);
 assert.deepEqual(cases[2].storedRecordOrder,[58,62,46,70,118,119,37,191,42,66]);
 const rec=J(path.join(E,'references/fm3-record-order-20261107.json'));
 assert.ok(JSON.stringify(rec).includes('2026-11-13/t51/T51C/bind-store-results.json'),'T51C dump is a record-order source');
 const shots=Object.fromEntries(Object.entries(SHOTS).map(([f,shown])=>[f,{sha256:sha(fs.readFileSync(path.join(D,f))),shown}]));
 const report={schemaVersion:1,date:'2026-11-13',testedGeneratorVersion:'0.3.70',
  scope:'T51A-C from tools/fm3/t51-build.mjs (grid mode, parallel rows, recordOrder "device"). Actual user LOAD/GET and STORE/reload captures at location 427, user answers and FM3-Edit grid read by Claude; this replay performs no device I/O.',
  cases,shots,
  findings:'T51A (Delay || Reverb + Mixer) and T51B (Delay || Reverb || Plex + dry row, Mixer of four rows) stored byte-identically, record order included. T51C (Drive || Drive 2 + Multiplexer, Input Select Row 2) stored all data; the FM3 placed the Drive 2 record right after Drive 1 instead of last. With that order evidence the generator now reproduces all three stored bodies byte for byte. T51B note: OUT 1 clipped (Mixer sums four rows at unity).',
  limitations:['Grid display and sound are the user\'s judgement and Claude\'s FM3-Edit reading.','Second instances other than Drive 2 still have no order evidence (appended).','T51B level: four summed rows clip OUT 1; the generator does not trim Mixer levels.'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-t51-20261113.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(a=>a==='--write'),'Usage: t51-evidence.mjs [--write]');
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'T51 evidence is stale');
 console.log(JSON.stringify({passed:true,cases:cases.length,byteIdenticalToCurrentGenerator:cases.length,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
