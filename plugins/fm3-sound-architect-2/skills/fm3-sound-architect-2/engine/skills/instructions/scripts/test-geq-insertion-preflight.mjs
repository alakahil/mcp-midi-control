// Synthetic parser tests only. Fixtures stay in memory, never device presets.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {checkGeqInsertion} from './fm3-geq-insertion-check.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,parsePresetDump,serializePresetDump} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('../examples/FM3_PEQ_ABCD_TEST_export.syx',import.meta.url));
const source=inspectStructure(base),body=Buffer.from(source.raw.body);
const makeRecord=(words=33)=>{const r=Buffer.alloc(46+8*words);r.writeUInt16LE(50);r.writeUInt16LE(words,42);r.writeUInt16LE(4,44);for(let s=0;s<8;s++)r.writeUInt16LE(1,26+2*s);return r;};
const inserted=(at=7568,r=makeRecord())=>{const b=Buffer.concat([body.subarray(0,at),r,body.subarray(at)]);b.writeUInt16LE(50,424);return b;};
const encode=(b,headerChange)=>{const raw=Buffer.from(source.raw.rawPatch);if(headerChange)headerChange(raw);return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(raw,b)));};
let positive=0,negative=0;
for(const at of [4610,5808,6702,7460,7518,7568,7910,8308,8434,8688,8998,9612]){
 const r=checkGeqInsertion(base,encode(inserted(at)));assert.equal(r.status,'structure-only');assert.equal(r.generatorSupport,false);assert.equal(r.parameterPairVerified,false);assert.equal(r.checks.all13456BaseBytesReconstructed,true);positive++;
}
const renamed=checkGeqInsertion(base,encode(inserted(),r=>{r.fill(0,8,40);r.write('FM3 GEQ BASELINE',8,'ascii');}));
assert.equal(renamed.presetName.after,'FM3 GEQ BASELINE');assert.ok(renamed.headerChanges.some(x=>x.field==='presetName'));positive++;
assert.equal(checkGeqInsertion(base,encode(inserted(7568,makeRecord(35)))).geq.wordsPerChannel,35);positive++;
const invalid=[
 ['Amp Level collateral',b=>b[4946]^=1],['grid route',b=>b[426]^=4],['scene selection',b=>b[0]=5],
 ['scene name',b=>b[40]^=1],['modifier',b=>b[1584]^=1],['system tail',b=>b[b.length-30]^=1],
 ['wrong GEQ grid ID',b=>b.writeUInt16LE(51,424)],['wrong GEQ record ID',b=>b.writeUInt16LE(51,7568)],
 ['wrong GEQ channel count',b=>b.writeUInt16LE(2,7568+44)],['invalid record size',b=>b.writeUInt16LE(0,7568+42)],
 ['GEQ scene2 active',b=>b.writeUInt16LE(0,7568+28)],['GEQ scene2 B',b=>b.writeUInt16LE(1,7568+12)],
 ['invalid GEQ scene value',b=>b.writeUInt16LE(4,7568+10)],['invalid GEQ bypass value',b=>b.writeUInt16LE(2,7568+26)]
];
for(const [label,mutate] of invalid){const b=inserted();mutate(b);assert.throws(()=>checkGeqInsertion(base,encode(b)),undefined,label);negative++;}
assert.throws(()=>checkGeqInsertion(base,base));negative++;
assert.throws(()=>checkGeqInsertion(base,encode(inserted(),r=>r[6]^=1)));negative++;
const corrupt=encode(inserted());corrupt[100]^=1;assert.throws(()=>checkGeqInsertion(base,corrupt));negative++;
assert.throws(()=>checkGeqInsertion(encode(inserted()),encode(inserted())));negative++;
const duplicate=Buffer.concat([inserted().subarray(0,7568),makeRecord(),inserted().subarray(7568)]);assert.throws(()=>checkGeqInsertion(base,encode(duplicate)));negative++;
for(let chunk=0;chunk<8;chunk++)for(let byte=0;byte<2;byte++){
 const parsed=parsePresetDump(encode(inserted()));parsed.chunkPayloads[chunk][byte]^=1;
 // Valid recomputed frame checksums and identical decoded raw/body content.
 assert.throws(()=>checkGeqInsertion(base,Buffer.from(serializePresetDump(parsed))),/Chunk prefix changed/);negative++;
}
const result={date:'2026-10-09',passed:true,syntheticOnly:true,positiveCases:positive,rejectedCases:negative,noHardwareEvidence:true,noGeneratorSupportAdded:true,scope:'Only GEQ insertion structure on exact PEQ A-D export; candidate ID50, observed record length, opaque parameters. Fixtures never written to disk.'};
fs.writeFileSync(new URL('../../../docs/FM3_GEQ_PREFLIGHT_TESTS.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
