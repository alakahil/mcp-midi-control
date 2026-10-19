import fs from 'node:fs';import assert from 'node:assert/strict';
import {generatePreset} from './fm3-generate.mjs';import {inspectStructure} from './rotary-collector/fm3-prototype.mjs';
const evidence=new URL('../references/rotary-batch-20261007-151451/',import.meta.url),read=n=>fs.readFileSync(new URL(n,evidence));
const base=read('baseline.syx'),body=b=>Buffer.from(inspectStructure(b).raw.body),original=body(base);
const spec=v=>({schemaVersion:1,firmware:13,baseProfile:'jb-rotary-controls',rotaryA:v});
const points={rateHz:[[2,13107],[5,32767],[6.5,42597]],mixPercent:[[25,16384],[50,32767],[75,49151]],levelDb:[[-6,48495],[0,52427]],hiDepthPercent:[[25,16384],[50,32767]],lowDepthPercent:[[25,16384],[50,32767]]};
const pids={rateHz:0,mixPercent:5,levelDb:6,hiDepthPercent:2,lowDepthPercent:1};let isolated=0,combinations=0;
for(const [key,vals] of Object.entries(points))for(const [v,raw] of vals){const expected=Buffer.from(original);expected.writeUInt16LE(raw,9868+2*pids[key]);assert.deepEqual(body(generatePreset(base,spec({[key]:v})).syx),expected);isolated++;}
for(const r of points.rateHz)for(const m of points.mixPercent)for(const l of points.levelDb)for(const h of points.hiDepthPercent)for(const lo of points.lowDepthPercent){
 const values={rateHz:r[0],mixPercent:m[0],levelDb:l[0],hiDepthPercent:h[0],lowDepthPercent:lo[0]},expected=Buffer.from(original);
 for(const [key,val] of Object.entries(values))expected.writeUInt16LE(points[key].find(x=>x[0]===val)[1],9868+2*pids[key]);
 assert.deepEqual(body(generatePreset(base,spec(values)).syx),expected);combinations++;
}
const mapping={'Mix':'mixPercent','Level':'levelDb','Hi Depth':'hiDepthPercent','Low Depth':'lowDepthPercent','Rate':'rateHz'};
let state={rateHz:2},replays=0;const captures=fs.readdirSync(evidence).filter(n=>n.startsWith('capture-')).sort();
for(const folder of captures){const label=JSON.parse(read(folder+'/labels.json'));state[mapping[label.parameter]]=parseFloat(label.value);const generated=body(generatePreset(base,spec(state)).syx),expected=body(read(folder+'/donor.syx'));assert.deepEqual(generated,expected);replays++;}
let additionalBases=0;for(const folder of captures){const b=read(folder+'/donor.syx');assert.deepEqual(body(generatePreset(b,spec({rateHz:5})).syx).subarray(10036),body(b).subarray(10036));additionalBases++;}
let rejected=0;const invalid=[null,{},[],{rateHz:3},{rateHz:'2'},{rateHz:NaN},{mixPercent:0},{levelDb:-3},{hiDepthPercent:75},{lowDepthPercent:100},{tempo:'None'},{channel:'B'},{rateHz:2,unknown:3}];
for(const v of invalid){assert.throws(()=>generatePreset(base,spec(v)));rejected++;}
for(const s of [{...spec({rateHz:2}),firmware:12},{...spec({rateHz:2}),schemaVersion:2},{...spec({rateHz:2}),rotaryB:{rateHz:2}}]){assert.throws(()=>generatePreset(base,s));rejected++;}
const corrupt=Buffer.from(base);corrupt[100]^=1;assert.throws(()=>generatePreset(corrupt,spec({rateHz:2})));rejected++;
const example=spec({rateHz:5,mixPercent:25,levelDb:-6,hiDepthPercent:50,lowDepthPercent:50}),out=generatePreset(base,example);
const dir=new URL('../examples/',import.meta.url);for(const [ext,data] of [['syx',out.syx],['txt',out.txt],['spec.json',JSON.stringify(example,null,2)+'\n'],['validation.json',JSON.stringify(out.report,null,2)+'\n']])fs.writeFileSync(new URL('FM3_ROTARY_A_TEST.'+ext,dir),data);
const report={status:'passed',isolated,combinations,replays,additionalBases,rejected,outputSha256:out.report.outputSha256,hardware:'Pending'};fs.writeFileSync(new URL('../../../docs/FM3_ROTARY_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
