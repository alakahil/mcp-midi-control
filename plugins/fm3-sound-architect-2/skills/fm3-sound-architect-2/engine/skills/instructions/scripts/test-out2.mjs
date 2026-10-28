// Out 2 (grid mode, duplicate:['out2']): record = Out 1 record with effect ID 43 directly after Out 1,
// placed as a second sink fed like Out 1; aggregate tonepack receipt; fail-closed input and tamper checks. Offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receiptBytes=fs.readFileSync(new URL('../references/fm3-out2-evidence-20261028.json',import.meta.url));
assert.equal(sha(receiptBytes),'2653e9ad9d691b03b17b2fff662b8a69539df3dcd07c0fcc47370d787d0ca987','Out 2 receipt pinned');
const receipt=JSON.parse(receiptBytes),c=receipt.corpus;
assert.ok(!/\.syx|LiveGold|Petrucci|Satriani/i.test(receiptBytes.toString()),'aggregate receipt only');
assert.ok(c.withOut2>300&&c.out2EqualsOwnOut1AfterEffectId===c.withOut2&&c.out2EqualsBaseOut1AfterEffectId===c.withOut2&&c.recordAfterOut1===c.withOut2&&c.out2HeaderZeroExceptSize===c.withOut2);
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const bodyOf=syx=>Buffer.from(inspectStructure(syx).raw.body);
const rewrite=(input,mutate)=>{const p=inspectStructure(input),b=Buffer.from(p.raw.body);mutate(b);return Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(p.raw.rawPatch,b)));};
const E=Array(12).fill('');
const grid=out2Row=>({rows:[E,['in1','drive','-','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],out2Row],links:[{row:4,col:12,from:[3]}]});
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'OUT2 MIRROR',modifiers:{external1Wah:false}},grid:grid([...Array(11).fill(''),'out2']),duplicate:['out2'],
  allow:['enum-labels'],controls:[{block:'out1',channel:'A',param:'OUTPUT_SCENE1',value:2}]};
const r=createPreset(base,spec),b=bodyOf(r.syx),rec=scanRecords(b).records,bb=bodyOf(base),baseOut1=scanRecords(bb).records.find(x=>x.eid===42);
const o1=rec.find(x=>x.eid===42),o2=rec.find(x=>x.eid===43);
assert.equal(rec.indexOf(o2),rec.indexOf(o1)+1,'Out 2 directly after Out 1');
assert.equal(b.readUInt16LE(o2.header),43);
assert.ok(b.subarray(o2.header+2,o2.header+o2.size).equals(bb.subarray(baseOut1.header+2,baseOut1.header+baseOut1.size)),'Out 2 = base Out 1 template (before Out 1 controls)');
assert.ok(!b.subarray(o1.header,o1.header+o1.size).equals(bb.subarray(baseOut1.header,baseOut1.header+baseOut1.size)),'Out 1 control applied to Out 1 only');
assert.deepEqual(readGrid(b).filter(g=>g.id===42||g.id===43).map(g=>[g.row,g.col,g.id,g.mask]),[[2,11,42,4],[3,11,43,4]]);
assert.equal(r.report.cpu.scenes[0].parts.out2,1);assert.equal(r.report.stages.records.duplicated[0].block,'out2');
assert.ok(r.txt.includes('rida 4, veerg 12 (Out 2) ← reverb (rida 3, veerg 5)'));
const cap=getPresetCapabilities().grid.duplicate.out2;assert.equal(cap.hardware,'not tested (import, signal on the Out 2 jacks)');
let rejected=0;
const bad=(edit,re)=>{const s=structuredClone(spec);edit(s);assert.throws(()=>createPreset(base,s),re);rejected++;};
bad(s=>s.duplicate=['out2','out2'],/twice|already/);
bad(s=>{s.grid.rows[3]=E;s.grid.links=[];},/out2 is in the preset but not on the grid/);
bad(s=>s.grid.links=[],/Out 2|out2.*no input/);
bad(s=>s.duplicate=[],/not in the preset/);
bad(s=>{s.grid.rows[3]=[...Array(10).fill(''),'out2',''];s.grid.links=[{row:4,col:11,from:[5]}];},/Link from|rows 1..4/);
bad(s=>s.controls=[{block:'out2',channel:'A',param:'OUTPUT_SCENE1',value:2}],/Unknown|out2|not/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 out2 % '));let tamper=0;
try{
  const verify=(name,res,s)=>{const stem=path.join(temp,name);writePresetOutputs(stem,res,s);return verifyPresetOutputs(stem);};
  verify('good',r,spec);
  // Out 2 also below Out 1 when Out 1 sits in row 2 (fed from row 2).
  const alt={...spec,composer:{...spec.composer,name:'OUT2 ROW3'},grid:{rows:[E,['in1','drive','amp','cab','delay','reverb','-','-','-','-','-','out1'],[...Array(11).fill(''),'out2'],E],links:[{row:3,col:12,from:[2]}]},remove:['send','return'],controls:[]};
  verify('alt',createPreset(base,alt),alt);
  const fail=(name,change)=>{const x={...r,report:structuredClone(r.report)},s=structuredClone(spec);change(x,s);assert.throws(()=>verify(name,x,s));tamper++;};
  fail('out2-word',x=>{x.syx=rewrite(r.syx,bb2=>bb2.writeUInt16LE(bb2.readUInt16LE(o2.start)^1,o2.start));x.report.outputSha256=sha(x.syx);});
  fail('out2-mask',x=>{x.syx=rewrite(r.syx,bb2=>bb2.writeUInt16LE(2,260+11*16+3*4+2));x.report.outputSha256=sha(x.syx);});
  fail('spec-no-out2',(_x,s)=>{s.duplicate=[];});
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,out2AfterOut1:true,templateFromBaseOut1:true,invalidSpecs:rejected,tamperCases:tamper,hardwareTested:false}));
