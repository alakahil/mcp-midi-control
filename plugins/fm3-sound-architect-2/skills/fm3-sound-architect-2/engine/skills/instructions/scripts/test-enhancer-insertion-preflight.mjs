// Synthetic parser tests only. Fixtures stay in memory, never device presets.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {checkEnhancerInsertion} from './fm3-enhancer-insertion-check.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,parsePresetDump,serializePresetDump} from './fm3-codec.mjs';
const base=fs.readFileSync(new URL('../examples/FM3_GEQ_ABCD_TEST_export.syx',import.meta.url));
const source=inspectStructure(base),body=Buffer.from(source.raw.body);
const makeRecord=(words=12,channels=2)=>{const r=Buffer.alloc(46+2*channels*words);r.writeUInt16LE(122);r.writeUInt16LE(words,42);r.writeUInt16LE(channels,44);for(let s=0;s<8;s++)r.writeUInt16LE(1,26+2*s);return r;};
const inserted=(at=7568,r=makeRecord())=>{const b=Buffer.concat([body.subarray(0,at),r,body.subarray(at)]);b.writeUInt16LE(122,428);return b;};
const encode=(b,headerChange)=>{const raw=Buffer.from(source.raw.rawPatch);if(headerChange)headerChange(raw);return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(raw,b)));};
let positive=0,negative=0;
for(const at of [4610,5808,6702,7460,7518,7568,7910,8308,8514,8640,8894,9204,9818]){
 const r=checkEnhancerInsertion(base,encode(inserted(at)));assert.equal(r.status,'structure-only');assert.equal(r.generatorSupport,false);assert.equal(r.parameterPairVerified,false);assert.equal(r.checks.all13662BaseBytesReconstructed,true);positive++;
}
const renamed=checkEnhancerInsertion(base,encode(inserted(),r=>{r.fill(0,8,40);r.write('FM3 ENHANCER BASELINE',8,'ascii');}));
assert.equal(renamed.presetName.after,'FM3 ENHANCER BASELINE');assert.ok(renamed.headerChanges.some(x=>x.field==='presetName'));positive++;
assert.equal(checkEnhancerInsertion(base,encode(inserted(7568,makeRecord(35)))).enhancer.wordsPerChannel,35);positive++;
for(const channels of [1,3,4]){assert.equal(checkEnhancerInsertion(base,encode(inserted(7568,makeRecord(12,channels)))).enhancer.channels,channels);positive++;}
const invalid=[
 ['Amp Level collateral',b=>b[4946]^=1],['old GEQ parameter changed',b=>b[8308+94+46]^=1],['grid route',b=>b[430]^=4],['scene selection',b=>b[0]=5],
 ['scene name',b=>b[40]^=1],['modifier',b=>b[1584]^=1],['system tail',b=>b[b.length-30]^=1],
 ['wrong ENHANCER grid ID',b=>b.writeUInt16LE(123,428)],['wrong ENHANCER record ID',b=>b.writeUInt16LE(123,7568)],
 ['invalid ENHANCER channel count',b=>b.writeUInt16LE(0,7568+44)],['invalid record size',b=>b.writeUInt16LE(0,7568+42)],
 ['ENHANCER scene2 active',b=>b.writeUInt16LE(0,7568+28)],['ENHANCER scene2 B',b=>b.writeUInt16LE(1,7568+12)],
 ['scene channel outside observed count',b=>b.writeUInt16LE(2,7568+10)],['invalid ENHANCER bypass value',b=>b.writeUInt16LE(2,7568+26)]
];
for(const [label,mutate] of invalid){const b=inserted();mutate(b);assert.throws(()=>checkEnhancerInsertion(base,encode(b)),undefined,label);negative++;}
assert.throws(()=>checkEnhancerInsertion(base,base));negative++;
assert.throws(()=>checkEnhancerInsertion(base,encode(inserted(),r=>r[6]^=1)));negative++;
const corrupt=encode(inserted());corrupt[100]^=1;assert.throws(()=>checkEnhancerInsertion(base,corrupt));negative++;
assert.throws(()=>checkEnhancerInsertion(encode(inserted()),encode(inserted())));negative++;
const duplicate=Buffer.concat([inserted().subarray(0,7568),makeRecord(),inserted().subarray(7568)]);assert.throws(()=>checkEnhancerInsertion(base,encode(duplicate)));negative++;
for(let chunk=0;chunk<8;chunk++)for(let byte=0;byte<2;byte++){
 const parsed=parsePresetDump(encode(inserted()));parsed.chunkPayloads[chunk][byte]^=1;
 // Valid recomputed frame checksums and identical decoded raw/body content.
 assert.throws(()=>checkEnhancerInsertion(base,Buffer.from(serializePresetDump(parsed))),/Chunk prefix changed/);negative++;
}
const result={date:'2026-10-11',passed:true,syntheticOnly:true,positiveCases:positive,rejectedCases:negative,noHardwareEvidence:true,noGeneratorSupportAdded:true,scope:'Only Enhancer insertion structure on exact GEQ A-D export; candidate ID122, observed record length, opaque parameters. Fixtures never written to disk.'};
fs.writeFileSync(new URL('../../../docs/FM3_ENHANCER_PREFLIGHT_TESTS.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
