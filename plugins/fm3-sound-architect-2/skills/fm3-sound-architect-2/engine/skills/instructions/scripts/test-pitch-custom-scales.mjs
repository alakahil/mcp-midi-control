import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCustomOffsets,planGlobalScaleReads,globalScaleDependencies} from './fm3-pitch-custom-scales.mjs';
import {findParam,encodeValue,writeTableControls,OPT_IN_STATUSES} from './fm3-table-encoder.mjs';
import {applyTableControls,scanRecords} from './fm3-layout.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {createPreset} from './fm3-preset.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const base=read('examples/FM3_PITCH_ABCD_TEST_export.syx'),original=Buffer.from(inspectStructure(base).raw.body),r=scanRecords(original).records.find(r=>r.family==='pitch');
const lib=JSON.parse(read('references/pitch-library.json')),opts={allow:[...OPT_IN_STATUSES]};
const at=(channel,pid)=>r.start+2*('ABCD'.indexOf(channel)*r.words+pid);
const ctl=(channel,param,value)=>({block:'pitch',channel,param,value});
const fixture=(type=4)=>{const b=Buffer.from(original);for(const ch of 'ABCD')lib.models.find(m=>m.binaryId===type).words.forEach((v,pid)=>b.writeUInt16LE(v,at(ch,pid)));return b;};
let scales=0;
function combinations(start,left,values=[]){
 if(!left){validateCustomOffsets(values.length+1,values);scales++;return;}
 for(let n=start;n<=12-left;n++)combinations(n+1,left-1,[...values,n]);
}
for(let count=4;count<=8;count++)combinations(1,count-1);
assert.equal(scales,1749);
for(const [count,values] of [[3,[1,2]],[9,[1,2,3,4,5,6,7,8]],[4,[0,4,7]],[4,[4,4,7]],[4,[4,7,12]],[4,[4,3,7]],[4,[4,7]],[4,[4,7,10.5]],[4,[4,'7',10]]])assert.throws(()=>validateCustomOffsets(count,values));
const configurations=[{channel:'A',type:'Dual Diatonic',offsets:[4,7,10]},{channel:'B',type:'Quad Diatonic',offsets:[2,4,7,9]},
 {channel:'C',type:'Arpeggiator',offsets:[2,4,5,7,9,11]},{channel:'D',type:'Quad Diatonic Delay',offsets:[1,3,4,6,7,9,11]}];
const controls=configurations.flatMap(({channel,offsets})=>[ctl(channel,'SCALE','CUSTOM'),ctl(channel,'CUSTOMNOTES',offsets.length+1),...offsets.map((v,i)=>ctl(channel,'NOTE'+(i+2),v))]);
// Complete final state, independent of field order; no undeclared clamping.
const b=fixture(),forward=Buffer.from(b),reverse=Buffer.from(b);
applyTableControls(forward,controls,opts);applyTableControls(reverse,[...controls].reverse(),opts);assert.deepEqual(forward,reverse);
const touched=new Set(controls.flatMap(c=>{const o=at(c.channel,findParam('pitch',c.param).param);return [o,o+1];}));
for(let i=0;i<b.length;i++)if(!touched.has(i))assert.equal(forward[i],b[i]);
let rejectedPlans=0;
const rejectPlan=(body,plan,options=opts)=>{
 const before=Buffer.from(body);let callbacks=0;
 for(const list of [plan,[...plan].reverse()]){assert.throws(()=>applyTableControls(body,list,options,()=>callbacks++));assert.deepEqual(body,before);assert.equal(callbacks,0);rejectedPlans++;}
};
for(const type of [0,1,2,3,6,7,8,9,11,12,14,15])rejectPlan(fixture(type),[ctl('A','SCALE','CUSTOM'),ctl('A','NOTE2',1)]);
rejectPlan(fixture(),[ctl('A','NOTE2',1)]); // not CUSTOM
rejectPlan(forward,[ctl('A','NOTE5',11)]); // inactive slot
rejectPlan(forward,[ctl('A','NOTE3',3)]); // descending
rejectPlan(forward,[ctl('A','NOTE3',4)]); // duplicate
rejectPlan(forward,[ctl('A','NOTE4',12)]); // octave
rejectPlan(forward,[ctl('A','CUSTOMNOTES',8)]); // newly active retained slots invalid
rejectPlan(forward,[ctl('A','TONIC',0)]);
rejectPlan(forward,[ctl('A','NOTE2',4.5)]);
rejectPlan(forward,[{block:'pitch',channel:'A',param:64,raw:7}],{experimental:true});
rejectPlan(forward,[{block:'amp',channel:'A',param:'MID',value:7},ctl('A','NOTE3',3)]);
// The alternate SYX API also checks raw plans, preserving inactive words.
assert.throws(()=>writeTableControls(base,{name:'NO RAW CONTEXT',controls:[{block:'pitch',channel:'A',param:64,raw:1}]},{experimental:true}));
for(const v of ['C','D#','4',null,true,NaN])assert.throws(()=>encodeValue(findParam('pitch','NOTE2'),v));
const spec=JSON.parse(read('examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json'));
spec.composer.pitchChannels=configurations.map(({channel,type})=>({channel,type}));
spec.layout={row2:['drive','phaser','amp','cab'],row3:['pitch','delay','reverb']};spec.allow=[...OPT_IN_STATUSES];spec.controls=controls;
const result=createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec);
const final=Buffer.from(inspectStructure(result.syx).raw.body),record=scanRecords(final).records.find(r=>r.family==='pitch');
for(const c of controls){const pid=findParam('pitch',c.param).param;assert.equal(final.readUInt16LE(record.start+2*('ABCD'.indexOf(c.channel)*record.words+pid)),encodeValue(findParam('pitch',c.param),c.value,opts));}
for(const {channel,offsets} of configurations){
 const shown=result.report.parameters.filter(p=>p.channel===channel&&/^PITCH_NOTE[2-8]$/.test(p.name));assert.equal(shown.length,offsets.length);
 assert.deepEqual(shown.sort((a,b)=>a.name.localeCompare(b.name)).map(p=>p.value),offsets);
}
assert.match(result.txt,/pooltooni toonikast/);
assert.deepEqual(result.syx,createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),{...spec,controls:[...controls].reverse()}).syx);
// All distinct firmware IDs, without changing the selected global scale.
const all=planGlobalScaleReads(Array.from({length:32},(_,i)=>i+1));
assert.equal(all.requestCount,384);assert.equal(new Set(all.requests.map(r=>r.pid)).size,384);
assert.equal(all.requests[0].pid,902);assert.equal(all.requests.at(-1).pid,1285);
assert.equal(all.requests[0].note,'A');assert.equal(all.requests.at(-1).note,'G#/Ab');
assert.equal(all.selectorWrites,0);assert.equal(all.executed,false);assert.equal(all.liveGetEncodingVerified,false);
assert.equal(planGlobalScaleReads([32,1,32]).requestCount,24);
for(const bad of [[0],[33],[1.5],['1'],null])assert.throws(()=>planGlobalScaleReads(bad));
const words=Array(114).fill(0);words[0]=11;words[71]=0;words[72]=31;
const deps=globalScaleDependencies([{block:'pitch',channels:[{channel:'D',words}]}]);
assert.deepEqual(deps.readPlan.scales,[1,32]);assert.equal(deps.contentsIncluded,false);assert.equal(deps.contentsVerified,false);
console.log(JSON.stringify({passed:true,validScales:scales,rejectedPlans,finalPresetControls:controls.length,globalAddresses:384,deviceIO:false,newHardwareMeasurements:false}));
