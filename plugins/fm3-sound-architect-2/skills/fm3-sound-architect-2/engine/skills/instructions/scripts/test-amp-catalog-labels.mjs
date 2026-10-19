// Synthetic IDs exercise decoding only; never import these as channel templates.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {inspect} from './fm3-prototype.mjs';
import {catalog,importAmpLibrary,coverage} from './fm3-amp-library.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=n=>fs.readFileSync(new URL('../references/'+n,import.meta.url));
const base=read('Baaspreset.syx'),b=inspect(base);
for(let k=0;k<catalog.models.length;k+=4){
 const body=b.raw.body.slice();const group=catalog.models.slice(k,k+4);
 for(const [i,m] of group.entries()){body[4668+i*288]=m.id&255;body[4669+i*288]=m.id>>8;}
 const synthetic=Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(b.raw.rawPatch,body)));
 const channels=inspect(synthetic).decoded.blocks.find(x=>x.block==='Amp').channels;
 for(const [i,m] of group.entries()){assert.equal(channels['ABCD'[i]].type_id,m.id);assert.equal(channels['ABCD'[i]].type,m.name);}
}
const donor=read('FM3_AMP_CAPTURE_016.syx'),d=inspect(donor);
assert.deepEqual(Object.values(d.decoded.blocks.find(x=>x.block==='Amp').channels).map(c=>[c.type_id,c.type]),[[64,'Cameron CCV 2A'],[65,'SV Bass 2'],[66,'Tube Pre'],[67,'FAS Brown']]);
const lib=importAmpLibrary(base,[{name:'capture016',bytes:donor}],13);assert.equal(lib.accepted.length,1);assert.deepEqual(lib.rejected,[]);
const body=d.raw.body.slice();body[4668+3*288]=255;body[4669+3*288]=255;
const invalid=Buffer.from(reencodeDumpFromRawPatch(donor,reencodeRawPatch(d.raw.rawPatch,body)));
const rejected=importAmpLibrary(base,[{name:'unknown',bytes:invalid}],13);assert.equal(rejected.accepted.length,0);assert.deepEqual(rejected.templates,{});assert.match(rejected.rejected[0].reason,/65535/);
assert.ok(coverage().ready>=54);
console.log('PASS: all 331 catalog labels decode from synthetic IDs; real capture016 integrity and model names pass; unknown ID rejected atomically; bundled coverage unchanged. No hardware/GET validation.');
