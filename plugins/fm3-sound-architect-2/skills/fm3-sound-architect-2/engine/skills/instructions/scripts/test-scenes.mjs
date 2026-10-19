import fs from 'node:fs';import assert from 'node:assert/strict';import {generateScenes} from './fm3-scenes.mjs';import {inspect} from './fm3-prototype.mjs';
const dir=process.argv[2],read=n=>fs.readFileSync(dir+'/'+n),base=read('Baaspreset.syx');
for(const on of [false,true]){const r=generateScenes(base,{name:'TEST',gainB:5,delayScene2:on});const expected=inspect(read(on?'S2_Delay_Engaged.syx':'S2_Delay_Bypass.syx')).raw.body.slice();expected[4958]=255;expected[4959]=127;assert.deepEqual(inspect(r.syx).raw.body,expected);}
const orig=inspect(base).raw.body,rv=inspect(read('S1_Reverb_channelB.syx')).raw.body;
const observed=[];for(let i=0;i<orig.length;i++)if(orig[i]!==rv[i])observed.push(i);assert.deepEqual(observed,[0,7372,9528]);
const r=generateScenes(base,{name:'TEST',reverbScene1:'B',delayScene2:true});const expected=rv.slice();expected[0]=orig[0];expected[7372]=orig[7372];expected[7374]=0;expected[4958]=255;expected[4959]=127;assert.deepEqual(inspect(r.syx).raw.body,expected);
for(const spec of [{name:'TEST',delayScene2:'true'},{name:'TEST',reverbScene1:'C'},{name:'TEST',delayScene2:true,other:1},{name:'TEST'}])assert.throws(()=>generateScenes(base,spec));
console.log('PASS: two independent Delay export comparisons; Reverb controlled delta with two incidental changes excluded; combined entire-body match; four invalid inputs rejected.');
