// Reproducible grid software evidence. Factory bytes stay outside the repository/package.
// --factory DIRECTORY --write refreshes the hash-bound factory replay receipt as well.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {banks} from './factory_structure_evidence.mjs';
import {extract as extractFactory} from './factory_grid_evidence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const engine=path.join(root,prefix),read=p=>fs.readFileSync(path.join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const {auditGrid,analyzeGridCells}=await import(path.join(engine,'scripts/fm3-grid-audit.mjs'));
const {readGrid}=await import(path.join(engine,'scripts/fm3-layout.mjs'));
const {parsePresetDump,decodeRawPatch}=await import(path.join(engine,'scripts/drive-collector/fm3-codec.mjs'));
const args=process.argv.slice(2),write=args.at(-1)==='--write';
assert.ok(args.length===0||args.length===1&&write||args.length===3&&args[0]==='--factory'&&write,'Usage: point5-evidence.mjs [--factory DIRECTORY] [--write]');
const factoryFile='docs/fm3/parameter-evidence/point5-factory-grid.json';
const factorySources=['tools/fm3/point5-evidence.mjs','tools/fm3/factory_grid_evidence.mjs','tools/fm3/factory_structure_evidence.mjs',
 ...['scripts/fm3-grid.mjs','scripts/fm3-grid-audit.mjs','scripts/fm3-layout.mjs','scripts/drive-collector/fm3-codec.mjs','references/fm3-factory-grid-evidence.json'].map(p=>prefix+p)];
const bindings=Object.fromEntries(factorySources.map(p=>[p,sha(read(p))]));
if(args[0]==='--factory'){
 const directory=args[1],legacy=extractFactory(directory);
 assert.deepEqual(legacy,JSON.parse(read(prefix+'references/fm3-factory-grid-evidence.json')));
 const stats={presets:0,occupiedCells:0,knownEdges:0,bit4Cells:0,bit4MergeCells:0,bit4SingleInputCells:0,violations:{},unresolved:{}};
 for(const [file,hash] of Object.entries(banks)){
  const data=fs.readFileSync(path.join(directory,file));assert.equal(sha(data),hash);assert.equal(data.length,128*24680);
  for(let i=0;i<128;i++){
   const raw=decodeRawPatch(parsePresetDump(data.subarray(i*24680,(i+1)*24680),0,17).chunkPayloads);assert.ok(raw.crcValid);
   const a=analyzeGridCells(readGrid(Buffer.from(raw.body)));stats.presets++;stats.occupiedCells+=a.summary.occupiedCells;stats.knownEdges+=a.edges.length;stats.bit4Cells+=a.summary.bit4Cells;
   for(const c of a.cells.filter(c=>c.unknownMask&16)){if(c.inputRows.length>1)stats.bit4MergeCells++;else if(c.inputRows.length===1)stats.bit4SingleInputCells++;}
   for(const [name,list] of [['violations',a.violations],['unresolved',a.unresolved]])for(const x of list)stats[name][x.code]=(stats[name][x.code]??0)+1;
  }
 }
 assert.equal(stats.presets,384);assert.equal(stats.occupiedCells,4801);assert.deepEqual(stats.violations,{});assert.deepEqual(stats.unresolved,{'unknown-mask-bits':8});
 assert.equal(stats.bit4MergeCells,6);assert.equal(stats.bit4SingleInputCells,2);
 const receipt={schemaVersion:1,sourceURL:legacy.source.url,banks,sources:bindings,legacyPlannerReplay:legacy.grid,gridAuditReplay:stats,
  scope:'Derived aggregate only; no factory names, parameter values, layouts or preset bytes. Known bits 0..3 are replayed; bit 4 remains unresolved.',deviceIO:false};
 fs.writeFileSync(path.join(root,factoryFile),JSON.stringify(receipt,null,2)+'\n');
}
const factory=JSON.parse(read(factoryFile));assert.deepEqual(factory.sources,bindings,'Factory receipt stale; replay the pinned banks with --factory DIRECTORY --write');
assert.deepEqual(factory.banks,banks);
const tests=['test-grid-domain','test-grid-audit'];
const results=Object.fromEntries(tests.map(t=>[t,JSON.parse(execFileSync(process.execPath,[path.join(engine,'scripts',t+'.mjs')],{encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024}).trim())]));
for(const r of Object.values(results))assert.equal(r.passed,true);
const files=[];function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,x.name);if(x.isDirectory())walk(p);else if(x.isFile()&&x.name.endsWith('.syx'))files.push(p);}}walk(engine);
const unique=new Map(),inventory=[];let sized=0;
for(const file of files){const b=fs.readFileSync(file);if(b.length!==24680)continue;sized++;const h=sha(b);if(unique.has(h)){unique.get(h).copies++;continue;}
 const row={sha256:h,copies:1};unique.set(h,row);inventory.push(row);
 try{const a=auditGrid(b);Object.assign(row,{status:a.structuralStatus,completeRecordScan:a.recordAssociation.complete,...a.grid.summary,
  violationCodes:[...new Set(a.grid.violations.map(v=>v.code))].sort(),unresolvedCodes:[...new Set(a.grid.unresolved.map(v=>v.code))].sort()});}
 catch(e){Object.assign(row,{status:'unsupported-or-invalid',reason:e.message});}
}
inventory.sort((a,b)=>a.sha256.localeCompare(b.sha256));
const corpus={files:files.length,sizedInputs:sized,unique:inventory.length,duplicates:sized-inventory.length,
 statuses:Object.fromEntries([...new Set(inventory.map(r=>r.status))].sort().map(s=>[s,inventory.filter(r=>r.status===s).length])),inventory};
const sources=['tools/fm3/point5-evidence.mjs','tools/fm3/grid-check-ingest.mjs',factoryFile,...['scripts/fm3-grid.mjs','scripts/fm3-grid-audit.mjs','scripts/fm3-grid-output.mjs','scripts/fm3-preset.mjs',
 ...tests.map(t=>'scripts/'+t+'.mjs'),'references/fm3-grid-check-20261023-results.jsonl','references/fm3-bit4-check-20261024-facts.json'].map(p=>prefix+p)];
const report={schemaVersion:1,version:'0.3.25',auditPoint:5,
 scope:'Known grid edges, raw-mask retention, original wire replay and public-bundle consistency. No audio, implicit feedback or physical I/O simulation.',
 sources:Object.fromEntries(sources.map(p=>[p,sha(read(p))])),
 baseline:{version:'0.3.24',commit:'1901a4b14e75debb87f15f58d2eeab4b3578b8a2',reproducedGap:'A standalone Scene MIDI cell after Out 1 was generated with mask 0 but --verify expected an inherited audio cable and rejected it.'},
 tests:results,factory:{receipt:factoryFile,...factory.gridAuditReplay},corpus,
 limits:['The factory receipt is replayed locally from three pinned original banks. CI binds that receipt to code hashes; CI does not download the banks.',
  'Bundled inputs include historical/corrupted fixtures. A scan reports unsupported, partial, disconnected and unknown cases; counts are not device acceptance rates.',
  'All 65536 raw masks are partitioned, not all declared valid. Only bits 0..3 describe evidenced row inputs; eight factory bit-4 cells remain unresolved.',
  'Four captured bit-4 observations have source facts only; their full original dumps are not bundled and are not claimed as independently re-decoded.',
  'No new In 2/Out 2 authoring, generic preset rewriting, FOH+monitor, 4CM, global I/O, feedback, audio, CPU or import/STORE proof.',
  'No new device operation, REA/Ghidra invocation, or commercial tonepack access.'],deviceIO:false,newHardwareMeasurements:false,newREAInvocation:false};
const target=path.join(root,'docs/fm3/parameter-evidence/point5-grid-audit.json');
if(write)fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');else assert.deepEqual(JSON.parse(fs.readFileSync(target)),report,'Point-5 evidence stale');
console.log(JSON.stringify({passed:true,tests:results,factory:factory.gridAuditReplay,corpus:{files:corpus.files,unique:corpus.unique,statuses:corpus.statuses},deviceIO:false}));
