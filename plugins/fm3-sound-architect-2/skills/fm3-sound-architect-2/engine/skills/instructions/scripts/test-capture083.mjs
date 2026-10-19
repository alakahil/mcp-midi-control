import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inspect} from './fm3-prototype.mjs';import {coverage,importAmpLibrary,bundledLibrary} from './fm3-amp-library.mjs';import {generatePreset} from './fm3-generate.mjs';
const ref=new URL('../references/',import.meta.url),base=fs.readFileSync(new URL('Baaspreset.syx',ref)),bytes=fs.readFileSync(new URL('FM3_AMP_CAPTURE_083.syx',ref));
const x=inspect(bytes),ids=[333,334,335,332],names=['Brit JVM Crunch Green','Brit JVM Crunch Orange','Brit JVM Crunch Red','PVH 6160 Block Clean'];
assert.deepEqual(Object.values(x.decoded.blocks.find(b=>b.block==='Amp').channels).map(c=>[c.type_id,c.type]),ids.map((id,i)=>[id,names[i]]));
const lib=importAmpLibrary(base,[{name:'FM3_AMP_CAPTURE_083.syx',bytes}],13);assert.deepEqual(lib.rejected,[]);assert.equal(lib.accepted.length,1);
for(const name of names){assert.ok(bundledLibrary.templates[name]);assert.ok(generatePreset(base,{schemaVersion:1,firmware:13,name:'PAIRED READY',ampModelB:name}).syx);}
const bad=Buffer.from(bytes);bad[100]^=1;assert.throws(()=>inspect(bad));
const cov=coverage();assert.equal(cov.ready,335);assert.equal(cov.missing,0);
console.log('PASS: capture083 integrity, names and same-base checks; corrupt input rejected; paired models available to generator; 335 ready.');
