import fs from 'node:fs';import assert from 'node:assert/strict';import {generateTime} from './fm3-time.mjs';import {generateTone} from './fm3-tone.mjs';import {inspect} from './fm3-prototype.mjs';
const base=fs.readFileSync(process.argv[2]+'/Baaspreset.syx'),spec={name:'FM3 SA TEST TIME',delayTimeMs:400,delayFeedback:25,reverbTimeS:2.5,reverbPredelayMs:40};
const previous=generateTone(base,{name:spec.name,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12});
const a=inspect(previous.syx),b=inspect(generateTime(base,spec).syx),expected=a.raw.body.slice();
// Explicit expected words from the selected FM3 cache ranges; independent of writer definitions.
for(const [offset,raw] of [[7408,1634],[7412,40959],[7422,0],[9566,1574],[9582,2621],[9688,0]]){expected[offset]=raw&255;expected[offset+1]=raw>>8}
assert.deepEqual(b.raw.body,expected);assert.deepEqual(b.decoded.grid,a.decoded.grid);
for(const [key,value] of [['delayTimeMs',0],['delayTimeMs',16000],['delayFeedback',100],['reverbTimeS',NaN],['reverbPredelayMs',Infinity],['reverbPredelayMs','40']])assert.throws(()=>generateTime(base,{...spec,[key]:value}));
assert.throws(()=>generateTime(base,{...spec,other:1}));assert.throws(()=>generateTime(base,{name:'missing'}));
console.log('PASS: all body bytes and grid; six explicit expected words; eight invalid requests rejected. Hardware pending.');
