import fs from 'node:fs';import assert from 'node:assert/strict';
import {generateTone} from './fm3-tone.mjs';import {inspect} from './fm3-prototype.mjs';
const base=fs.readFileSync(process.argv[2]+'/Baaspreset.syx');
const spec={name:'FM3 SA TEST TONE',midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12};
const r=generateTone(base,spec),a=inspect(base),b=inspect(r.syx);
// Independently enumerate expected words, including the explicitly applied defaults.
const words=new Map([[4958,32767],[7374,0],[4962,32767],[4964,26214],[4996,13107],[4946,40631],[7392,9830],[9590,7864]]);
const expected=a.raw.body.slice();for(const [o,v] of words){expected[o]=v&255;expected[o+1]=v>>8}
assert.deepEqual(b.raw.body,expected);
assert.deepEqual(b.decoded.grid,a.decoded.grid);
assert.equal(b.decoded.blocks.find(x=>x.block==='Reverb').scene_channels[0],'A');
for(const k of Object.keys(spec).filter(k=>k!=='name'))for(const v of [NaN,Infinity,'5',null])assert.throws(()=>generateTone(base,{name:'BAD',[k]:v}));
for(const bad of [{name:'BAD',levelB:21},{name:'BAD',delayMixA:-1},{name:'BAD',reverbMixA:101},{name:'BAD',midB:11},{name:'BAD',delayTime:400},{name:'BAD'}])assert.throws(()=>generateTone(base,bad));
const changed=Buffer.from(base);changed[100]^=1;assert.throws(()=>generateTone(changed,spec));
console.log('PASS: complete body against independent word list; unchanged grid; correct Reverb scene; 31 invalid/unrecognised inputs rejected. Hardware mapping remains pending.');
