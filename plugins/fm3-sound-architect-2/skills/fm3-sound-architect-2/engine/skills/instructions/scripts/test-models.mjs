import fs from 'node:fs';import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';import {inspect} from './fm3-prototype.mjs';import {ampModels,cabChoices} from './fm3-models.mjs';
const base=fs.readFileSync(new URL('../references/Baaspreset.syx',import.meta.url)), original=inspect(base),meta={schemaVersion:1,firmware:13,name:'FM3 SA TEST MODEL'};
let count=0;
for(const ampModelB of Object.keys(ampModels))for(const cabScene2 of Object.keys(cabChoices)){
 const result=generatePreset(base,{...meta,ampModelB,cabScene2}),out=inspect(result.syx);
 assert.equal(out.decoded.blocks.find(b=>b.block==='Amp').channels.B.type,ampModelB);
 const ch=ampModels[ampModelB];const donor=ch==='lead'?inspect(fs.readFileSync(new URL('../references/S2_AmpModelLead.syx',import.meta.url))).raw.body:original.raw.body;
 const n=ch==='lead'?1:ch;assert.deepEqual(out.raw.body.slice(4944,5232),donor.slice(4656+n*288,4656+(n+1)*288));
 for(let i=0;i<out.raw.body.length;i++)if(!(i>=4944&&i<5232)&&i!==5820&&i!==5821)assert.equal(out.raw.body[i],original.raw.body[i],'Unrelated byte '+i);
 assert.match(result.txt,new RegExp(ampModelB));assert.equal(result.report.modelReadback.cabScene2.channel,cabChoices[cabScene2]);count++;
}
// Model-only result independently reproduces the whole exported Lead body.
const lead=generatePreset(base,{...meta,ampModelB:'USA MK IV Lead'});
assert.deepEqual(inspect(lead.syx).raw.body,inspect(fs.readFileSync(new URL('../references/S2_AmpModelLead.syx',import.meta.url))).raw.body);
// A Cab-only selection leaves every Amp byte intact.
const cab=generatePreset(base,{...meta,cabScene2:'4x12 RECTO STRAIGHT'});assert.deepEqual(inspect(cab.syx).raw.body.slice(4656,5808),original.raw.body.slice(4656,5808));
const override=generatePreset(base,{...meta,ampModelB:'USA MK IV Lead',gainB:5,bassB:4});assert.equal(override.report.effective.find(p=>p.key==='gainB').raw,32767);assert.equal(override.report.effective.find(p=>p.key==='midB').source,'amp-template');
for(const bad of [{ampModelB:'Plexi'},{ampModelB:null},{cabScene2:'USER 1'},{cabScene2:0},{userIR:'test.wav'}])assert.throws(()=>generatePreset(base,{...meta,...bad}));
console.log(`PASS: ${count} template/Cab combinations; independent Lead body; Cab isolation; explicit control precedence; 5 invalid selections rejected.`);
