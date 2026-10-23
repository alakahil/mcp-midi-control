import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {baseline,finalCheck} from './check.mjs';
import {inspectStructure} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
const base=fs.readFileSync(new URL('../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/examples/FM3_MOD_MIN_2p50_export.syx',import.meta.url));
const parsed=inspectStructure(base),plan=JSON.parse(fs.readFileSync(new URL('./plan.json',import.meta.url)));
const report={steps:plan.steps.map(s=>({...s,status:'captured'})),lastVerifiedWords:baseline().modWords};
const encode=b=>Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(parsed.raw.rawPatch,b)));
test('pinned baseline identities and 25/100 raw words',()=>{
 assert.equal(baseline().modWords.length,25);assert.equal(baseline().wahWords.length,100);
 assert.equal(baseline().target.modifierChannelScope,'ALL');
});
test('final whole-body checks accept exact raw observations without treating them as a codec',()=>{
 const b=Buffer.from(parsed.raw.body),r=structuredClone(report);
 for(const p of [1,2,3,4,5,6,7,12,13,14,15]){r.lastVerifiedWords[p]=1234+p;b.writeUInt16LE(1234+p,1584+2*p);}
 assert.equal(finalCheck(encode(b),r).allUnrequestedBodyBytesPreserved,true);
});
test('wrong raw, collateral body, wrong source, incomplete run and corrupt checksum fail',()=>{
 const b=Buffer.from(parsed.raw.body);b[1590]^=1;assert.throws(()=>finalCheck(encode(b),report));
 const other=Buffer.from(parsed.raw.body);other[5000]^=1;assert.throws(()=>finalCheck(encode(other),report));
 const source=Buffer.from(parsed.raw.body);source[1584]^=1;assert.throws(()=>finalCheck(encode(source),report));
 assert.throws(()=>finalCheck(base,{...report,steps:report.steps.slice(1)}));
 const corrupt=Buffer.from(base);corrupt[20]^=1;assert.throws(()=>finalCheck(corrupt,report));
});
