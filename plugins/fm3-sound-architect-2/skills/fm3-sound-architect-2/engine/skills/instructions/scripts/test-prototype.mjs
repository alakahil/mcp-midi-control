import fs from 'node:fs';import assert from 'node:assert/strict';
import {generate,inspect} from './fm3-prototype.mjs';
const dir=process.argv[2];const base=fs.readFileSync(dir+'/Baaspreset.syx');
const results=[];
for(const [key,stem] of [['gainB','S2_AmpGain'],['bassB','S2_AmpBass']])for(const value of [4,5,6,7]){
 const r=generate(base,{name:'FM3 SA TEST', [key]:value});const gold=inspect(fs.readFileSync(`${dir}/${stem}_${value}.syx`));
 assert.deepEqual(inspect(r.syx).raw.body,gold.raw.body);results.push({key,value,entireBodyMatchesIndependentExport:true});
}
for(const gainB of [4,5,6,7])for(const bassB of [4,5,6,7])generate(base,{name:'COMBINED TEST',gainB,bassB});
for(const spec of [{name:'test',gainB:11},{name:'test',gainB:4.5},{name:'test',channel:'A',gainB:5},{name:'test',gainB:NaN},{name:'test'}, {name:'õ',gainB:5}])assert.throws(()=>generate(base,spec));
const corrupt=Buffer.from(base);corrupt[100]^=1;assert.throws(()=>generate(corrupt,{name:'test',gainB:5}));
console.log(JSON.stringify({fixtures:results,combinedBodyChecks:16,rejectedInvalidRequests:7},null,2));
