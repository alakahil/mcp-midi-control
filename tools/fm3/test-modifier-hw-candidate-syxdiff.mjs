import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildAudit} from './modifier-hw-candidate-syxdiff.mjs';
import {fixtures,fixtureRoot,compareCandidate,verifyMemoryDiff} from './modifier-minmax-syxdiff.mjs';
import {inspectStructure} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from '../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-codec.mjs';
const req={policy:'exact-wah-cent-fw13-hw1',min:'6.47',max:'6.47'};
const base=fs.readFileSync(new URL(fixtures[1].file,fixtureRoot));
test('both fields use measured word while complete source/context is retained',()=>{
 const before=Buffer.from(base),r=compareCandidate(base,req);
 assert.deepEqual(base,before);assert.deepEqual(r.afterRaw,{min:42401,max:42401});
 assert.ok(Object.values(r.checks).every(x=>x===true));
 assert.equal(r.deviceImportTested,false);assert.equal(r.generatorWriteSupportAdded,false);
});
test('correct checksums cannot conceal wrong 6.47 word or collateral body change',()=>{
 const a=inspectStructure(base);
 for(const [raw,offset] of [[42400,null],[42401,1590]]){
  const b=Buffer.from(a.raw.body);b.writeUInt16LE(raw,1586);b.writeUInt16LE(42401,1588);
  if(offset)b[offset]^=1;
  const bad=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(a.raw.rawPatch,b)));
  assert.throws(()=>verifyMemoryDiff(base,bad,req),/body change/);
 }
});
test('new candidate receipt replays across all five historical captures',()=>{
 const expected=JSON.parse(fs.readFileSync(new URL('../../docs/fm3/parameter-evidence/modifier-hw-candidate-syxdiff-audit.json',import.meta.url)));
 assert.deepEqual(buildAudit(),expected);assert.equal(expected.caseCount,10);
});
