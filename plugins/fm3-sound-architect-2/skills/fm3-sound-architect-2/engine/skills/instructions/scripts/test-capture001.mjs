import fs from 'node:fs';import assert from 'node:assert/strict';import {inspect} from './fm3-prototype.mjs';import {generatePreset} from './fm3-generate.mjs';import {importAmpLibrary} from './fm3-amp-library.mjs';
const base=fs.readFileSync(new URL('../references/Baaspreset.syx',import.meta.url)),donor=fs.readFileSync(new URL('../references/FM3_AMP_CAPTURE_001.syx',import.meta.url)),d=inspect(donor),b=inspect(base);
const lib=importAmpLibrary(base,[{name:'capture001',bytes:donor}],13);assert.equal(lib.accepted.length,1);assert.deepEqual(lib.accepted[0].ignoredSceneSelections.map(x=>x.scene),[2]);
for(const [i,name] of ['59 Bassguy Bright','65 Bassguy Normal','Vibrato Verb','Deluxe Verb Vibrato'].entries()){
 const r=generatePreset(base,{schemaVersion:1,firmware:13,name:'CAPTURE TEST',ampModelB:name}),a=inspect(r.syx);
 assert.deepEqual(a.raw.body.slice(4944,5232),d.raw.body.slice(4656+i*288,4656+(i+1)*288));assert.equal(a.decoded.blocks.find(x=>x.block==='Amp').channels.B.type,name);assert.deepEqual(a.raw.body.slice(4620,4636),b.raw.body.slice(4620,4636));
 for(let k=0;k<a.raw.body.length;k++)if(k<4944||k>=5232)assert.equal(a.raw.body[k],b.raw.body[k]);
}
console.log('PASS: 4 captured channels generate exactly in Amp B; source Scene2 A is recorded but not copied; all other bytes preserved.');
