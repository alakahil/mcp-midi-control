// Adapted test strategy from forgefx-midi test/gen3/fm3/blockparams.test.ts,
// Apache-2.0, commit 553d24b7409302908d5c7e46a71b45e07dffdc05.
// Exercise OUR packaged codec against the upstream's 10 captured FM3 goldens.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sha256} from './fm3-output.mjs';
import {decodeGen3PresetDump,readBlockParamsForModel} from './fm3-codec.mjs';
const root=new URL('../references/upstream-fm3-goldens/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('provenance.json',root)));
for(const [file,hash] of Object.entries(manifest.files))assert.equal(sha256(fs.readFileSync(new URL(file,root))),hash,file);
let count=0;
for(const file of Object.keys(manifest.files).filter(f=>f.endsWith('.syx'))){
 const decoded=decodeGen3PresetDump(new Uint8Array(fs.readFileSync(new URL(file,root))),0x11);
 assert.equal(decoded.crc_valid,true,file);
 const placed=new Set(decoded.grid.filter(c=>!c.is_shunt&&c.effect_id).map(c=>c.effect_id));
 const blocks=readBlockParamsForModel(decoded.decompressed_body,placed,0x11);
 const expected=JSON.parse(fs.readFileSync(new URL(file.replace('.syx','.params.expected.json'),root)));
 assert.deepEqual(JSON.parse(JSON.stringify(blocks)),expected.blocks,file);count++;
}
assert.equal(count,10);console.log(JSON.stringify({passed:true,upstreamFM3Fixtures:count,deviceIO:false,scope:manifest.scope}));
