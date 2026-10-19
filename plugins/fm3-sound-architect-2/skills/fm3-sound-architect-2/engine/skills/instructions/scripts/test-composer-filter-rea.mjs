// Expected words and complete bodies come from independently captured device exports.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {loadFilterReaControls,validateFilterReaPoint} from './fm3-filter-rea-controls.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const decode=b=>Buffer.from(inspectStructure(b).raw.body);
const sha=b=>createHash('sha256').update(b).digest('hex');
const lib=loadFilterReaControls(),root='references/'+lib.evidenceDirectory+'/';
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),baseCopy=Buffer.from(base),clean=decode(base);
const seed=read(root+'baseline.syx'),seedBody=decode(seed);
const initial=JSON.parse(read('examples/FM3_FILTER_CONTROLS_VERIFIED.spec.json'));
assert.deepEqual(decode(generatePreset(base,initial).syx),seedBody);
const valid=[],invalid=[];let pointCases=0,aliases=0,bodyReplays=0;
for(const point of lib.points){
 const evidence=validateFilterReaPoint(point),at=7614+'ABCD'.indexOf(point.channel)*74+2*point.parameterId;
 const expected=Buffer.from(seedBody);evidence.body.copy(expected,at,at,at+2);
 for(const value of new Set([point.targetValue,point.displayValue])){
  const spec=structuredClone(initial);spec.filterChannels.find(c=>c.channel===point.channel)[point.field]=value;
  const before=JSON.stringify(spec),r=generatePreset(base,spec);
  assert.deepEqual(decode(r.syx),expected,'Only the requested measured word changes: '+point.index);
  assert.equal(JSON.stringify(spec),before);assert.deepEqual(base,baseCopy);
  const control=r.report.components.filter.find(c=>c.channel===point.channel).controls.find(c=>c.key===point.field);
  assert.equal(control.raw,evidence.body.readUInt16LE(at));assert.equal(control.displayValue,point.displayValue);
  assert.equal(control.value,value);assert.equal(control.roundedDisplay,value!==point.displayValue);
  assert.ok(r.txt.includes(`${point.field}: ${point.displayValue} ${point.unit}`));
  valid.push(spec);pointCases++;if(value!==point.targetValue)aliases++;
 }
}
const accumulated=structuredClone(initial);let final;
accumulated.name='FM3 FILTER REA VERIFIED';
accumulated.purpose='Taastab Filteri lisaauditi viimase ekspordi sisu. Filter on bypass-is; aktiivset heli ei hinnatud.';
for(const index of [...new Set(lib.points.map(p=>p.stepIndex))]){
 const group=lib.points.filter(p=>p.stepIndex===index);
 for(const p of group)accumulated.filterChannels.find(c=>c.channel===p.channel)[p.field]=p.targetValue;
 accumulated.scenes.find(s=>s.scene===2).blocks.filter.channel=group[0].scene2FilterChannel;
 const r=generatePreset(base,accumulated),actual=decode(r.syx),device=decode(read(root+group[0].folder+'/donor.syx'));
 assert.deepEqual(actual,device,'Whole unnormalised captured body '+index);
 assert.equal(r.report.knownDeviceBody.bodySha256,sha(device));
 assert.ok(r.report.scenes.every(s=>s.blocks.filter.bypass));
 const restored=Buffer.concat([actual.subarray(0,7568),actual.subarray(7910)]);restored.writeUInt16LE(1028,392);
 assert.deepEqual(restored,clean,'Every original non-Filter byte remains unchanged');
 valid.push(structuredClone(accumulated));bodyReplays++;final=r;
}
for(const selection of [
 {channel:'C',type:'Peaking',q:.708},{channel:'C',type:'Peaking',q:1.5},
 {channel:'C',type:'Peaking',gainDb:-15},{channel:'C',type:'Peaking',levelDb:-40},
 {channel:'A',type:'High-Pass',frequencyHz:751},{channel:'B',type:'Low-Pass',frequencyHz:1601},
 {channel:'C',type:'Peaking',order:'2nd'},{channel:'A',type:'High-Pass',order:0},
 {channel:'A',type:'High-Pass',order:'6th'},{channel:'A',type:'High-Pass',order:'4TH'},
 {channel:'D',type:'Low-Pass',order:'2nd'},{channel:'B',type:'High-Pass',order:'4th'},
 {channel:'A',type:'Peaking',q:.707},{channel:'D',type:'Peaking',frequencyHz:20},
 {channel:'C',type:'Peaking',q:'0.707'},{channel:'C',type:'Peaking',levelDb:null}
]){
 const spec={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'INVALID FILTER REA',filterChannels:[selection]};
 assert.throws(()=>generatePreset(base,spec));invalid.push(spec);
}
// Runtime must reject changed source evidence before producing an output.
const tamperFile=new URL('../'+root+lib.points[0].folder+'/capture.json',import.meta.url);
const original=fs.readFileSync(tamperFile);
try{
 fs.writeFileSync(tamperFile,Buffer.concat([original,Buffer.from(' ')]));
 assert.throws(()=>generatePreset(base,valid[0]),/source hash mismatch/);
}finally{fs.writeFileSync(tamperFile,original);}
const active=structuredClone(accumulated);active.scenes.find(s=>s.scene===2).blocks.filter.bypass=false;
assert.equal(generatePreset(base,active).report.knownDeviceBody,null);
const caps=getComposerCapabilities(base).filterControls;
assert.equal(caps.measuredPoints,40);assert.equal(caps.pairedExports,32);assert.equal(caps.groups.length,8);
for(const channel of ['A','B'])assert.deepEqual(caps.groups.find(g=>g.channel===channel&&g.field==='order').values.sort(),['2nd','4th']);
assert.ok(caps.groups.find(g=>g.field==='q').values.includes(.707));
for(const [suffix,data] of [['.spec.json',JSON.stringify(accumulated,null,2)+'\n'],['.syx',final.syx],['.txt',final.txt],['.validation.json',JSON.stringify(final.report,null,2)+'\n']])
 fs.writeFileSync(new URL('../examples/FM3_FILTER_REA_VERIFIED'+suffix,import.meta.url),data);
const report={date:'2026-10-12',passed:true,generator:'jb-composer-0.13.0-dev',newMeasuredPoints:23,newPairedExports:15,
 wholeBodyIsolatedPointsAndAliases:pointCases,additionalDisplayAliases:aliases,exactCompleteDeviceBodyReplays:bodyReplays,
 bodyBytes:13146,allOriginal12804BytesPreserved:true,invalidRequestsRejected:invalid.length,tamperedSourceRejected:true,
 inputBuffersAndSpecsPreserved:true,unseenActiveBodyNotHardwareApproved:true,combinedMeasuredPoints:40,combinedPairedExports:32,
 exampleSha256:sha(final.syx),exampleBodySha256:sha(decode(final.syx)),hardwareIO:false,
 limitations:['Measured type/channel/points only; no interpolation','Filter remained bypassed; no active-effect audio or CPU confirmation','Local development candidate; publication remains blocked by archive entry limit']};
fs.writeFileSync(new URL('../../../docs/FM3_FILTER_REA_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({valid,invalid}));
console.log(JSON.stringify(report,null,2));
