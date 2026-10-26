// Raw capture replay, non-mutating inspection, malformed grids and complete public bundles.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditGrid,analyzeGridCells,decodeGridReply,renderGridAuditText,readGridPreset} from './fm3-grid-audit.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readGrid,scanRecords} from './fm3-layout.mjs';
import {sha256} from './fm3-output.mjs';
const rd=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=rd('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),snapshot=Buffer.from(base),parsed=inspectStructure(base),body=Buffer.from(parsed.raw.body);
const rewrite=b=>Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(parsed.raw.rawPatch,b)));
const initial=auditGrid(base);assert.equal(initial.structuralStatus,'consistent-known-edges');assert.equal(initial.grid.cells.length,48);
assert.equal(initial.recordAssociation.complete,true);assert.equal(initial.firmwareDetected,null);
assert.deepEqual(initial.grid.paths.map(p=>[p.source.name,p.sinks.map(s=>s.name)]),[['in1',['send']],['return',['out1']]]);
assert.equal(initial.grid.ampRoutes[0].withoutCab,false);assert.equal(initial.grid.ampRoutes[0].withCab,true);
assert.equal(initial.generatorEligibility,'not-evaluated');assert.deepEqual(base,snapshot);
let negativeCases=0,unknownBitCases=0,wireCells=0,bundles=0,tamperedBundles=0;
// Every unknown mask bit is retained at its original cell, without adding an audio edge.
for(let bit=4;bit<16;bit++){
 const b=Buffer.from(body),o=260+6*16+4+2;b.writeUInt16LE(2+2**bit,o);
 const a=auditGrid(rewrite(b)),cell=a.grid.cells.find(c=>c.row===2&&c.col===7);
 assert.equal(cell.raw,2+2**bit);assert.equal(cell.unknownMask,2**bit);assert.deepEqual(cell.inputRows,[2]);
 assert.deepEqual(a.grid.edges,initial.grid.edges);assert.equal(a.structuralStatus,'unresolved');unknownBitCases++;
}
const mutations=[
 ['empty mask',b=>b.writeUInt16LE(2,262),'empty-cell-has-mask'],
 ['first column',b=>b.writeUInt16LE(2,266),'first-column-has-input'],
 ['empty predecessor',b=>b.writeUInt16LE(1,260+6*16+4+2),'input-from-empty-cell'],
 ['duplicate shunt',b=>b.writeUInt16LE(1024,260+2*16+4),'duplicate-effect-or-shunt-id'],
 ['duplicate block',b=>b.writeUInt16LE(58,260+6*16+4),'duplicate-effect-or-shunt-id'],
 ['orphan branch',b=>{b.writeUInt16LE(1050,260+2*16);b.writeUInt16LE(2,260+2*16+2);},'does-not-reach-known-sink'],
 ['broken chain',b=>b.writeUInt16LE(0,260+6*16+4+2),'not-reached-from-known-source'],
 ['source input',b=>{b.writeUInt16LE(38,260+2*16);b.writeUInt16LE(2,260+2*16+2);},'non-audio-input'],
 ['MIDI input',b=>{b.writeUInt16LE(190,260+2*16);b.writeUInt16LE(2,260+2*16+2);},'non-audio-input'],
 ['MIDI output',b=>b.writeUInt16LE(190,260+6*16+4),'input-from-scene-midi']
];
for(const [name,change,code] of mutations){const b=Buffer.from(body);change(b);const a=auditGrid(rewrite(b));assert.ok(a.grid.violations.some(v=>v.code===code),name);negativeCases++;}
{
 const b=Buffer.from(body);b.writeUInt16LE(999,260+6*16+4);const a=auditGrid(rewrite(b));assert.ok(a.grid.unresolved.some(v=>v.code==='unknown-cell-role'));
 assert.ok(a.recordAssociation.gridIdsWithoutParsedRecord.includes(999));negativeCases++;
 const partial=Buffer.from(body);partial.writeUInt16LE(0,scanRecords(partial).records[1].header+42);const p=auditGrid(rewrite(partial));
 assert.equal(p.recordAssociation.complete,false);assert.ok(p.limits.some(l=>l.includes('partial record scan')));negativeCases++;
}
for(const input of [[],readGrid(body).slice(1),readGrid(body).map((x,i)=>i===1?{...x,row:0,col:0}:x),readGrid(body).map((x,i)=>i?x:{...x,mask:'2'})]){assert.throws(()=>analyzeGridCells(input));negativeCases++;}
for(const bytes of [base.subarray(1),Buffer.alloc(24680),Buffer.from(base).fill(127,30,31)]){assert.throws(()=>auditGrid(bytes));negativeCases++;}
// Re-decode the original seven device replies independently as a 7-bit bit-string.
// This verifies the stored wire bytes, not just the old JSON grid equality booleans.
const captures=rd('references/fm3-grid-check-20261023-results.jsonl').toString().trim().split('\n').map(JSON.parse);
for(const r of captures){
 const f=Buffer.from(r.frameHex,'hex');assert.equal(f.length,r.frameBytes);assert.equal(f.subarray(0,7).toString('hex'),'f000017411012e');assert.equal(f.at(-1),247);
 assert.ok([...f.subarray(1,-1)].every(x=>x<128));assert.equal(f.subarray(0,-2).reduce((v,b)=>v^b,0)&127,f.at(-2));
 const bits=[...f.subarray(-228,-2)].map(v=>v.toString(2).padStart(7,'0')).join('');
 const grid=[];for(let row=0;row<4;row++)for(let col=0;col<12;col++){
  const at=45+128*col+32*row,bytes=[0,8,16,24].map(i=>parseInt(bits.slice(at+i,at+i+8),2));grid.push([row,col,bytes[0]+256*bytes[1],bytes[2]+256*bytes[3]]);wireCells++;
 }
 assert.deepEqual(grid,r.deviceGrid,'original wire '+r.id);
 assert.deepEqual(decodeGridReply(f),grid.map(([row,col,id,mask])=>({row,col,id,mask})));
 const a=analyzeGridCells(grid.map(([row,col,id,mask])=>({row,col,id,mask})));assert.equal(a.violations.length,0,r.id);assert.equal(a.unresolved.length,0,r.id);
 if(r.id==='G02')assert.ok(a.ampRoutes.some(p=>p.withoutCab),'captured Amp-before-Cab branch');
}
const wire=Buffer.from(captures[0].frameHex,'hex');
for(const bad of [wire.subarray(1),Buffer.concat([wire,Buffer.from([0])]),Buffer.from(wire).fill(127,30,31),Buffer.from(wire).fill(128,30,31),Buffer.from(wire).fill(0,6,7)]){assert.throws(()=>decodeGridReply(bad));negativeCases++;}
// Valid framing/checksum is insufficient: re-encoded wire data must still match recorded cells.
{
 const changed=Buffer.from(wire);changed[changed.length-228+8]^=1;changed[changed.length-2]=changed.subarray(0,-2).reduce((v,b)=>v^b,0)&127;
 assert.notDeepEqual(decodeGridReply(changed),decodeGridReply(wire));negativeCases++;
}
// Recorded bit-4 facts keep the entire raw mask and its independently observed low-bit rows.
const facts=JSON.parse(rd('references/fm3-bit4-check-20261024-facts.json'));
for(const item of facts.items){
 const r=readGrid(body),c=r.find(c=>c.row===item.cell.row-1&&c.col===item.cell.col-1);c.id=item.cell.id;c.mask=item.cell.mask;
 const a=analyzeGridCells(r),x=a.cells.find(c=>c.row===item.cell.row&&c.col===item.cell.col);
 assert.equal(x.unknownMask,16);assert.deepEqual(x.inputRows,item.cell.inputsFromRows);
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 grid audit ü ')),cli=fileURLToPath(new URL('fm3-preset.mjs',import.meta.url));
const empty=()=>Array(12).fill('');
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'GRID MIDI ADJACENCY',modifiers:{external1Wah:false}};
try{
 const specs=[
  {composer,remove:['send','return'],insert:['scenemidi'],grid:{rows:[empty(),['in1','drive','amp','cab','delay','reverb','out1','scenemidi','','','',''],empty(),empty()]}},
  {composer,remove:['send','return'],insert:['scenemidi'],grid:{rows:[empty(),['in1','drive','amp','cab','delay','reverb','-','-','-','-','out1','scenemidi'],empty(),empty()]}}
 ];
 for(const [i,spec] of specs.entries()){
  const good=createPreset(base,spec),stem=path.join(tmp,'bundle'+i);writePresetOutputs(stem,good,spec);verifyPresetOutputs(stem);bundles++;
  const a=readGridPreset(stem+'.syx');assert.equal(a.structuralStatus,'consistent-known-edges');assert.equal(a.grid.summary.standalone,1);
  assert.equal(a.grid.cells.find(c=>c.effectId===190).raw,0);assert.ok(!a.grid.edges.some(e=>e.from.effectId===190||e.to.effectId===190));
  const b=Buffer.from(inspectStructure(good.syx).raw.body),p=inspectStructure(good.syx),midi=a.grid.cells.find(c=>c.effectId===190);
  for(const [j,change] of [
   b=>b.writeUInt16LE(2,260+(midi.col-1)*16+(midi.row-1)*4+2),
   b=>b.writeUInt16LE(18,260+2*16+4+2),
   b=>b.writeUInt16LE(16,262)
  ].entries()){
   const altered=Buffer.from(b);change(altered);const syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(p.raw.rawPatch,altered)));
   const result={...good,syx,report:structuredClone(good.report)};result.report.outputSha256=sha256(syx);result.report.bytes=syx.length;
   const badStem=path.join(tmp,`tampered${i}-${j}`);writePresetOutputs(badStem,result,spec);assert.throws(()=>verifyPresetOutputs(badStem),/Grid input mask/);tamperedBundles++;
  }
 }
 const filename=path.join(tmp,'base.syx');fs.writeFileSync(filename,base);const before=fs.readdirSync(tmp).sort();
 assert.deepEqual(JSON.parse(execFileSync(process.execPath,[cli,'--inspect-grid',filename],{encoding:'utf8'})),initial);
 assert.equal(execFileSync(process.execPath,[cli,'--inspect-grid',filename,'--format','txt'],{encoding:'utf8'}),renderGridAuditText(initial));
 for(const args of [[],[filename,'extra'],[filename,'--format','csv'],[filename,'--format','json','extra']]){
  const r=spawnSync(process.execPath,[cli,'--inspect-grid',...args],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/Usage:/);negativeCases++;
 }
 assert.deepEqual(fs.readdirSync(tmp).sort(),before);assert.deepEqual(fs.readFileSync(filename),base);
 fs.symlinkSync(filename,path.join(tmp,'link.syx'));assert.throws(()=>readGridPreset(path.join(tmp,'link.syx')));negativeCases++;
 for(const name of ['in2','out2']){const spec=structuredClone(specs[0]);spec.grid.rows[1][name==='in2'?0:6]=name;assert.throws(()=>createPreset(base,spec),/not in the preset/);negativeCases++;}
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,uint16UnknownBitCases:unknownBitCases,negativeCases,recordedFrames:captures.length,recordedWireCells:wireCells,bit4ObservedFacts:facts.items.length,publicBundles:bundles,rehashedMaskTampering:tamperedBundles,readOnlyCLI:true,deviceIO:false}));
