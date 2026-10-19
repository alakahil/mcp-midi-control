// Expected values come from actual independent device exports, not conversion formulas.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),decode=b=>Buffer.from(inspectStructure(b).raw.body),sha=b=>createHash('sha256').update(b).digest('hex');
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),baseCopy=Buffer.from(base),clean=decode(base);
const spec=JSON.parse(read('examples/FM3_NEWLOOK_FILTER_TEST.spec.json')),seed=decode(read('examples/FM3_NEWLOOK_FILTER_TEST.syx'));
const lib=JSON.parse(read('references/filter-controls.json')),root='references/'+lib.evidenceDirectory+'/';
let pointCases=0,aliases=0,replays=0,rejected=0;
const validSpecs=[],invalidSpecs=[];
for(const p of lib.points){
 const device=decode(read(root+p.folder+'/donor.syx'));
 const at=7614+'ABCD'.indexOf(p.channel)*74+p.parameterId*2;
 const expected=Buffer.from(seed);device.copy(expected,at,at,at+2);
 for(const value of new Set([p.targetValue,p.displayValue])){
  const s=structuredClone(spec);s.filterChannels.find(c=>c.channel===p.channel)[p.field]=value;
  const before=JSON.stringify(s),r=generatePreset(base,s);
  assert.deepEqual(decode(r.syx),expected,'Whole body isolated point '+p.index+'/'+value);
  assert.equal(JSON.stringify(s),before);assert.deepEqual(base,baseCopy);
  const result=r.report.components.filter.find(c=>c.channel===p.channel).controls[0];
  assert.equal(result.raw,device.readUInt16LE(at));assert.equal(result.displayValue,p.displayValue);
  assert.equal(result.value,value);assert.equal(result.roundedDisplay,value!==p.displayValue);
  assert.ok(r.txt.includes(`${p.field}: ${p.displayValue} ${p.unit}`));
  if(value!==p.targetValue)aliases++;pointCases++;validSpecs.push(s);
 }
}
// Accumulate exactly the measured edits and reproduce every successful device body.
const accumulated=structuredClone(spec);accumulated.name='FM3 FILTER CONTROLS VERIFIED';
accumulated.purpose='Taastab mõõtmiste viimase seadmeekspordi sisu; Filter on bypass-is. Pole uus kuulatud sound.';
let final;
for(const p of lib.points){
 accumulated.filterChannels.find(c=>c.channel===p.channel)[p.field]=p.targetValue;
 const device=decode(read(root+p.folder+'/donor.syx'));
 accumulated.scenes.find(s=>s.scene===2).blocks.filter.channel='ABCD'[device.readUInt16LE(7580)];
 const r=generatePreset(base,accumulated),body=decode(r.syx);
 assert.deepEqual(body,device,'Every unnormalised device body '+p.folder);
 assert.ok(r.report.knownDeviceBody);assert.equal(r.report.knownDeviceBody.bodySha256,sha(device));
 assert.ok(!r.txt.includes('Uue paigutuse seadmering OOTEL.'));
 assert.ok(r.txt.includes('sama sisu korduseksporti pole vaja'));
 const restored=Buffer.concat([body.subarray(0,7568),body.subarray(7910)]);restored.writeUInt16LE(1028,392);
 assert.deepEqual(restored,clean,'All original 12804 bytes preserved, including Amp/Output/Send/Return');
 assert.ok(r.report.scenes.every(s=>s.blocks.filter.bypass));
 validSpecs.push(structuredClone(accumulated));replays++;final=r;
}
// Unsupported combinations stay closed, including the skipped point and other channels.
const invalidSelections=[
 {channel:'C',type:'Peaking',q:.708},{channel:'C',type:'Peaking',q:1.5},
 {channel:'C',type:'Peaking',frequencyHz:1500},{channel:'A',type:'High-Pass',frequencyHz:90},
 {channel:'B',type:'Low-Pass',frequencyHz:5000},{channel:'C',type:'Peaking',gainDb:6},
 {channel:'C',type:'Peaking',levelDb:1},{channel:'A',type:'Peaking',gainDb:3},
 {channel:'B',type:'Peaking',q:2},{channel:'D',type:'Peaking',levelDb:0},
 {channel:'C',type:'High-Pass',frequencyHz:120},{channel:'A',type:'High-Pass',q:1.4},
 {channel:'B',type:'Low-Pass',levelDb:0},{channel:'D',type:'Tilt EQ',gainDb:3},
 {channel:'C',type:'Peaking 2',q:2},{channel:'C',type:'Peaking',frequencyHz:'1000'},
 {channel:'C',type:'Peaking',q:null},{channel:'C',type:'Peaking',gainDb:true},
 {channel:'C',type:'Peaking',order:'2nd'},{channel:'C',type:'Peaking',frequency:1000},
 {channel:'C',type:'Peaking',frequencyHz:Infinity},{channel:'C',type:'Peaking',q:NaN}
];
for(const selection of invalidSelections){
 const s={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'INVALID FILTER CONTROL',filterChannels:[selection]};
 assert.throws(()=>generatePreset(base,s));invalidSpecs.push(s);rejected++;
}
const cap=getComposerCapabilities(base);assert.equal(cap.filterControls.groups.length,8);
assert.ok(cap.filterControls.groups.find(g=>g.field==='q').values.includes(.707));
// Confirm a new, unexported combination is not accidentally declared device-verified.
const unseen=structuredClone(spec);unseen.filterChannels[0].frequencyHz=120;
unseen.filterChannels[2].q=1.4;unseen.filterChannels[2].gainDb=3;
unseen.scenes.find(s=>s.scene===6).blocks.filter.bypass=false;
const active=generatePreset(base,unseen);assert.equal(active.report.knownDeviceBody,null);
assert.equal(active.report.scenes[5].blocks.filter.bypass,false);
assert.ok(active.txt.includes('seadmeimport, heli, tasemed ja CPU: OOTEL'));
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(s=>s.properties?.baseProfile?.const==='jb-composer');
assert.deepEqual(Object.keys(schema.properties.filterChannels.items.properties).sort(),['channel','frequencyHz','gainDb','levelDb','q','order','type'].sort());
const examples=new URL('../examples/',import.meta.url);
for(const [suffix,data] of [['.spec.json',JSON.stringify(accumulated,null,2)+'\n'],['.syx',final.syx],['.txt',final.txt],['.validation.json',JSON.stringify(final.report,null,2)+'\n']])fs.writeFileSync(new URL('FM3_FILTER_CONTROLS_VERIFIED'+suffix,examples),data);
const report={date:'2026-10-12',sourceCollectionDate:'2026-10-08',passed:true,generator:'jb-composer-0.13.0-dev',measuredPoints:17,isolatedPointAndAliasWholeBodyCases:pointCases,additionalDisplayAliases:aliases,
 exactDeviceBodyReplays:replays,bodyBytes:13146,normalization:'None',allOriginal12804BytesReconstructedEveryTime:true,
 invalidRequestsRejected:rejected,unseenActiveCombinationNotHardwareApproved:true,sourceInputsPreserved:true,roundingReportedInTxtAndJson:true,
 exampleSyxSha256:final.report.outputSha256,exampleKnownDeviceBody:final.report.knownDeviceBody,examplePresetName:accumulated.name,
 measurements:'A High-Pass frequency; B Low-Pass frequency; C Peaking frequency/Q/Gain/Level; exact listed points only',
 skipped:'Q 0.707 was skipped in the old collection; now supplied by the 2026-10-12 supplemental evidence',audio:'Filter remained bypassed in the device evidence; no active sound or CPU approval'};
fs.writeFileSync(new URL('../../../docs/FM3_FILTER_CONTROL_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
// Optional output consumed by a full JSON Schema validator, outside the plugin.
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({valid:validSpecs,invalid:invalidSpecs}));
console.log(JSON.stringify(report,null,2));
