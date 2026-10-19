import fs from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';
import {generatePreset,controls} from './fm3-generate.mjs';import {inspect} from './fm3-prototype.mjs';
const dir=process.argv[2],examples=process.argv[3],base=fs.readFileSync(path.join(dir,'Baaspreset.syx'));
const meta={schemaVersion:1,firmware:13};
const tone={gainB:5,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12,delayScene2:true,reverbScene1:'A'};
const time={...tone,delayTimeMs:400,delayFeedback:25,reverbTimeS:2.5,reverbPredelayMs:40,delayTempoA:'NONE',reverbPredelayTempoA:'NONE'};
const cases=[['G5',{gainB:5}],['SCENES',{gainB:5,delayScene2:true,reverbScene1:'B'}],['TONE',tone],['TIME',time]];
for(const [n,c] of cases){const spec={...meta,name:'FM3 SA TEST '+n,...c},result=generatePreset(base,spec),previous=fs.readFileSync(path.join(examples,'FM3_SA_TEST_'+n+'.syx'));assert.deepEqual(result.syx,previous,'Reference file '+n+' must be byte-identical')}
// Every individual control changes only its own word (plus explicitly required tempo).
const values={gainB:5,bassB:4,midB:5,trebleB:4,presenceB:2,levelB:-18,delayMixA:15,reverbMixA:12,delayTimeMs:400,delayFeedback:25,reverbTimeS:2.5,reverbPredelayMs:40,delayTempoA:'NONE',reverbPredelayTempoA:'NONE',delayScene2:true,reverbScene1:'B'};
const a=inspect(base).raw.body;
for(const [key,value] of Object.entries(values)){const spec={...meta,name:'ONE', [key]:value};if(key==='delayTimeMs')spec.delayTempoA='NONE';if(key==='reverbPredelayMs')spec.reverbPredelayTempoA='NONE';const result=generatePreset(base,spec),b=inspect(result.syx).raw.body,allowed=new Set(Object.keys(controls).filter(k=>Object.hasOwn(spec,k)).flatMap(k=>[controls[k].offset,controls[k].offset+1]));for(let i=0;i<a.length;i++)if(!allowed.has(i))assert.equal(b[i],a[i],key+' collateral at '+i);for(const row of result.report.effective)assert.equal(row.source,Object.hasOwn(spec,row.key)?'requested':'base')}
// Independent original exported Gain/Bass fixtures remain exact across the body.
for(const [key,stem] of [['gainB','S2_AmpGain'],['bassB','S2_AmpBass']])for(const value of [4,5,6,7])assert.deepEqual(inspect(generatePreset(base,{...meta,name:'FIXTURE',[key]:value}).syx).raw.body,inspect(fs.readFileSync(path.join(dir,stem+'_'+value+'.syx'))).raw.body);
for(const bad of [{delayTimeMs:400},{reverbPredelayMs:40},{gainB:4.5},{gainB:null},{midB:NaN},{levelB:21},{delayFeedback:100},{delayTempoA:'1/4'},{model:'other'},{toString:5},{}])assert.throws(()=>generatePreset(base,{...meta,name:'BAD',...bad}));
assert.throws(()=>generatePreset(base,{...meta,name:'BAD',gainB:5,firmware:14}));
console.log('PASS: 4 complete files byte-identical; 16 isolated controls preserve omitted bytes; 8 independent exported bodies match; 12 invalid requests rejected.');
