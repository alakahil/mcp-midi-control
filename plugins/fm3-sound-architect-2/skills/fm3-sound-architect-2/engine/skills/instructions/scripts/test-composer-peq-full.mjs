// Expected output comes from the 84 actual, unnormalised hardware exports.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {composePeqTemplates} from './fm3-peq-controls.mjs';
import {loadPeqFull} from './fm3-peq-full.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const decode=b=>Buffer.from(inspectStructure(b).raw.body),sha=b=>createHash('sha256').update(b).digest('hex');
const {library,root,audit}=loadPeqFull(),base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const v3spec=JSON.parse(read('examples/JB_EIGHT_SCENES_V3.spec.json')),v3=read('examples/JB_EIGHT_SCENES_V3.syx');
assert.deepEqual(generatePreset(base,v3spec).syx,v3,'V3 remains byte-identical');
const oldspec=JSON.parse(read('examples/FM3_PEQ_BAND3_TEST.spec.json'));
assert.deepEqual(generatePreset(base,oldspec).syx,read('examples/FM3_PEQ_BAND3_TEST.syx'),'Legacy confirmed preset stays byte-identical');
const spec=structuredClone(v3spec);spec.name='PEQ FULL DEVICE REPLAY';spec.peqChannels=[{channel:'A',bands:[]}];
for(const scene of spec.scenes)scene.blocks.peq={channel:'A',bypass:scene.scene===2};
let replayCount=0,exactBodyReplays=0,inactiveSlopeComparisons=0;
for(const point of library.passed){
 const result=JSON.parse(read(root+point.folder+'/result.json')),step=result.step;
 if(step.kind==='copy-channel'){
  const source=spec.peqChannels.find(c=>c.channel===step.sourceChannel);
  spec.peqChannels.push({...structuredClone(source),channel:step.channel});
 }
 if(['copy-channel','select-channel'].includes(step.kind))spec.scenes[1].blocks.peq.channel=step.channel;
 for(const o of result.observations){
  const c=o.control,channel=spec.peqChannels.find(s=>s.channel===c.channel),value=c.value??o.displayValue;
  const field={Type:'type',Frequency:'frequencyHz',Q:'q',Gain:'gainDb',Slope:'slopeDbPerOct',Solo:'solo',Level:'levelDb',Balance:'balance','Bypass Mode':'bypassMode','Scene Ignore':'sceneIgnore'}[c.parameter];
  const target=c.band?(channel.bands.find(b=>b.band===c.band)??(channel.bands.push({band:c.band}),channel.bands.at(-1))):channel;
  target[field]=['Solo','Scene Ignore'].includes(c.parameter)?value==='ON':value;
  if(field==='type'&&value!=='Blocking')delete target.slopeDbPerOct;
 }
 const r=generatePreset(base,spec),expected=decode(read(root+point.folder+'/donor.syx')),actual=decode(r.syx);
 // Compare originals without modifying either body. Unrequested inactive
 // slope words intentionally retain the pinned template instead of history.
 const inactive=new Set();
 for(const channel of spec.peqChannels){
  const start=8734+'ABCD'.indexOf(channel.channel)*66;
  for(const band of [1,5])if(channel.bands.find(b=>b.band===band)?.type!=='Blocking'){
   const pid=band===1?30:31;
   assert.equal(actual.readUInt16LE(start+pid*2),loadPeqFull().baselineWords[pid],'Inactive slope retained from baseline');
   inactive.add(start+pid*2);inactive.add(start+pid*2+1);
  }
 }
 const differences=[];
 for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])differences.push(i);
 assert.equal(actual.length,expected.length);
 assert.ok(differences.every(i=>inactive.has(i)),'No differences beyond explicitly baseline-retained inactive slope words at step '+point.index);
 if(differences.length)inactiveSlopeComparisons++;else exactBodyReplays++;
 replayCount++;
}
const invalid=[[],[{channel:'E'}],[{channel:'A'},{channel:'A'}],Array.from({length:5},()=>({channel:'A'})),[{channel:'A',bands:[]}],[{channel:'B',band3:{type:'Peaking'}}],[{channel:'A',bands:[{band:0}]}],[{channel:'A',bands:[{band:1},{band:1}]}],[{channel:'A',bands:[{band:3,type:'Blocking'}]}],[{channel:'A',bands:[{band:2,type:'Shelving',slopeDbPerOct:12}]}],[{channel:'A',bands:[{band:1,type:'Blocking',gainDb:0}]}],[{channel:'A',bands:[{band:1,slopeDbPerOct:12}]}],[{channel:'A',bands:[{band:1,type:'Blocking',slopeDbPerOct:7}]}],[{channel:'A',bands:[{band:1,frequencyHz:2001}]}],[{channel:'A',bands:[{band:2,frequencyHz:99}]}],[{channel:'A',bands:[{band:5,frequencyHz:20001}]}],[{channel:'A',bands:[{band:2,q:.09}]}],[{channel:'A',bands:[{band:2,q:10.01}]}],[{channel:'A',bands:[{band:4,gainDb:20.01}]}],[{channel:'A',bands:[{band:4,gainDb:-20.01}]}],[{channel:'A',bands:[{band:5,solo:1}]}],[{channel:'A',levelDb:20.1}],[{channel:'A',levelDb:-80.1}],[{channel:'A',balance:101}],[{channel:'A',sceneIgnore:1}],[{channel:'A',bypassMode:'Dry'}],[{channel:'A',pid23:0}],[{channel:'A',bands:[{band:1,frequencyHz:'100'}]}],[{channel:'A',bands:[{band:1,q:NaN}]}],[{channel:'A',levelDb:Infinity}],[{channel:'A',levelDb:null}],[{channel:'A',bands:[{band:1,type:'peaking'}]}]];
for(const s of invalid)assert.throws(()=>composePeqTemplates(s));
const fixture=JSON.parse(read('examples/FM3_PEQ_ABCD_TEST.spec.json')),r=generatePreset(base,fixture),body=decode(r.syx);
assert.equal(r.report.knownDeviceBody.submittedFileConfirmed,true,'Exact returned A–D specimen has device evidence');
const restored=Buffer.concat([body.subarray(0,8688),body.subarray(8998)]);restored.writeUInt16LE(1029,408);
assert.deepEqual(restored,decode(v3),'All 13146 original V3 bytes preserved');
assert.deepEqual(r.report.scenes.map(s=>s.blocks.peq.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(r.report.scenes.map(s=>s.blocks.peq.bypass),[true,false,false,false,true,false,true,true]);
assert.equal(r.report.components.peq.length,4);
for(const c of r.report.components.peq){
 const start=8734+'ABCD'.indexOf(c.channel)*66;
 assert.deepEqual(c.words,Array.from({length:33},(_,i)=>body.readUInt16LE(start+2*i)));
 for(const pid of [23,24])assert.equal(c.words[pid],loadPeqFull().baselineWords[pid]);
}
const minimal={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'PEQ CHECK',peqChannels:[{channel:'A'}]};
assert.ok(generatePreset(base,minimal).report.scenes.every(s=>s.blocks.peq.bypass));
assert.throws(()=>generatePreset(base,{...minimal,scenes:[{scene:2,blocks:{peq:{channel:'D',bypass:false}}}]}));
const caps=getComposerCapabilities(base);assert.deepEqual(caps.peqControls.channels,[...'ABCD']);assert.equal(caps.peqControls.bands.length,5);
// Hash checking remains effective even after the parsed evidence is cached.
const tamper=new URL('../'+root+library.passed[0].folder+'/capture.json',import.meta.url),saved=fs.readFileSync(tamper);
try{fs.writeFileSync(tamper,Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>composePeqTemplates([{channel:'A'}]),/PEQ source changed/);}finally{fs.writeFileSync(tamper,saved);}
const out=new URL('../examples/FM3_PEQ_ABCD_TEST',import.meta.url);
fs.writeFileSync(out.pathname+'.syx',r.syx);fs.writeFileSync(out.pathname+'.txt',r.txt);fs.writeFileSync(out.pathname+'.validation.json',JSON.stringify(r.report,null,2)+'\n');
const summary={date:'2026-10-09',generator:'jb-composer-0.10.1',passed:true,...audit,actualDeviceComparisons:replayCount,exactBodyReplays,inactiveSlopeComparisons,comparisonScope:'All body bytes compared. Inactive slope words after switching away from Blocking are explicitly checked against the pinned baseline rather than last device setting; neither original body is normalized or edited.',legacySyxByteIdentical:true,existingV3ByteIdentical:true,newPresetOriginalV3BytesReconstructed:13146,reservedWordsPreserved:true,defaultBypass:true,unconfiguredChannelRejected:true,tamperedEvidenceRejected:true,invalidRequestsRejected:invalid.length,newPresetSha256:sha(r.syx),hardware:'Exact combined A-D preset import/export and CPU 47–48% confirmed. Other screen values and new listening verdict not explicitly supplied.'};
fs.writeFileSync(new URL('../../../docs/FM3_PEQ_FULL_VALIDATION.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
