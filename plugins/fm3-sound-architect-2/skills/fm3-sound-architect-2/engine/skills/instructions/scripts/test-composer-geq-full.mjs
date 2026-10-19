// Independent expected outputs are all 184 original device exports, not code-generated fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {loadGeqFull,composeGeqFull} from './fm3-geq-full.mjs';
import {geqSha} from './fm3-geq-audit.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const json=p=>JSON.parse(read(p)),body=b=>Buffer.from(inspectStructure(b).raw.body);
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),{library,root,audit}=loadGeqFull();
for(const name of ['JB_EIGHT_SCENES_V3','FM3_PEQ_BAND3_TEST','FM3_PEQ_ABCD_TEST'])assert.deepEqual(generatePreset(base,json('examples/'+name+'.spec.json')).syx,read('examples/'+name+'.syx'),name+' remains byte-identical');
const spec=json('examples/FM3_PEQ_ABCD_TEST.spec.json');spec.name='GEQ DEVICE EVIDENCE REPLAY';
spec.geqChannels=[{channel:'A',type:'10 Band Variable Q'}];
for(const scene of spec.scenes)scene.blocks.geq={channel:'A',bypass:scene.scene===2};
let exactBodyReplays=0;
for(const point of library.passed){
 const r=json(root+point.folder+'/result.json'),s=r.step;
 if(s.kind==='type')spec.geqChannels[0]={channel:'A',type:s.typeName};
 if(s.kind==='copy-channel')spec.geqChannels.push({...structuredClone(spec.geqChannels[0]),channel:s.channel});
 if(['copy-channel','select-channel'].includes(s.kind))spec.scenes[1].blocks.geq.channel=s.channel;
 const c=spec.geqChannels.find(c=>c.channel===s.channel);
 if(s.kind==='bands'){
  c.bands??=[];
  r.observations.displayValues.forEach((gainDb,j)=>{const old=c.bands.find(b=>b.band===j+1);if(old)old.gainDb=gainDb;else c.bands.push({band:j+1,gainDb});});
 }
 if(s.kind==='control')c[{'Master Q':'masterQ',Level:'levelDb',Balance:'balance','Bypass Mode':'bypassMode','Scene Ignore':'sceneIgnore'}[s.parameter]]=s.parameter==='Scene Ignore'?r.observations.displayValue==='ON':r.observations.displayValue;
 const actual=body(generatePreset(base,spec).syx),expected=body(read(root+point.folder+'/donor.syx'));
 assert.deepEqual(actual,expected,'All original body bytes, no normalization, step '+point.index);exactBodyReplays++;
 if(exactBodyReplays%40===0)console.log('Exact device-body replays: '+exactBodyReplays+'/184');
}
const valid={channel:'A',type:'5 Band Mark'};
const invalid=[[],[{...valid,channel:'E'}],[valid,valid],[{channel:'A'}],[{...valid,type:'Unknown'}],[{...valid,bands:[]}],[{...valid,bands:[{band:6,gainDb:0}]}],[{...valid,bands:[{band:1,gainDb:13}]}],[{...valid,bands:[{band:1,gainDb:-13}]}],[{...valid,bands:[{band:1,gainDb:0},{band:1,gainDb:1}]}],[{...valid,bands:[{band:1,gainDb:0,frequencyHz:80}]}],[{...valid,masterQ:.09}],[{...valid,masterQ:10.01}],[{...valid,masterQ:NaN}],[{...valid,levelDb:20.01}],[{...valid,levelDb:-80.01}],[{...valid,balance:-101}],[{...valid,balance:101}],[{...valid,bypassMode:'Dry'}],[{...valid,sceneIgnore:1}],[{...valid,levelDb:'0'}],[{...valid,levelDb:null}],[{...valid,mix:100}],[{...valid,pid17:0}]];
for(const request of invalid)assert.throws(()=>composeGeqFull(request));
for(const m of library.models){const c=composeGeqFull([{channel:'D',type:m.name}]).channels[0];assert.deepEqual(c.words,m.words);for(const pid of [10,14,17,18])assert.equal(c.words[pid],m.words[pid]);}
const test=json('examples/FM3_GEQ_ABCD_TEST.spec.json'),r=generatePreset(base,test),actual=body(r.syx);
assert.equal(r.report.knownDeviceBody.submittedFileConfirmed,true,'Only this exact returned GEQ specimen is confirmed');
const restored=Buffer.concat([actual.subarray(0,8308),actual.subarray(8514)]);restored.writeUInt16LE(1030,424);
assert.deepEqual(restored,body(read('examples/FM3_PEQ_ABCD_TEST_export.syx')),'All 13456 prior bytes preserved');
assert.deepEqual(r.report.scenes.map(s=>s.blocks.geq.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(r.report.scenes.map(s=>s.blocks.geq.bypass),[true,false,false,false,true,false,true,true]);
assert.equal(r.report.insertions.find(i=>i.family==='geq').row,2);assert.equal(r.report.insertions.find(i=>i.family==='geq').column,11);
const minimal={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'GEQ DEFAULT',geqChannels:[valid]};
assert.ok(generatePreset(base,minimal).report.scenes.every(s=>s.blocks.geq.bypass));
assert.throws(()=>generatePreset(base,{...minimal,scenes:[{scene:2,blocks:{geq:{channel:'D',bypass:false}}}]}));
assert.throws(()=>generatePreset(read('examples/JB_YDOM_RHYTHM.syx'),minimal));
assert.equal(getComposerCapabilities(base).geqControls.types.length,18);
const pending=getComposerCapabilities(base).geqControls.types.find(m=>m.name==='7 Band Constant Q').bands[0];assert.equal(pending.label,'100');assert.equal(pending.capturedLabel,'python3 100');
const tamper=new URL('../'+root+library.passed[0].folder+'/capture.json',import.meta.url),saved=fs.readFileSync(tamper);
try{fs.writeFileSync(tamper,Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>composeGeqFull([valid]),/GEQ source changed/);}finally{fs.writeFileSync(tamper,saved);}
const summary={date:'2026-10-10',generator:'jb-composer-0.11.1',passed:true,...audit,exactBodyReplays,comparisonScope:'All 13662 original body bytes compared for every accepted device export; neither body normalized.',priorSyxByteIdentical:['V3','PEQ Band3','PEQ A-D'],newPresetOriginalPeqBytesReconstructed:13456,invalidRequestsRejected:invalid.length,all18TypeTemplatesExact:true,reservedWordsPreserved:true,defaultBypass:true,unconfiguredChannelRejected:true,unsupportedBaseRejected:true,tamperedEvidenceRejected:true,newCombinationSha256:geqSha(r.syx),newCombinationHardware:'Exact specimen confirmed 2026-10-11; CPU50% observed maximum; user reports GEQ worked'};
fs.writeFileSync(new URL('../../../docs/FM3_GEQ_COMPOSER_VALIDATION.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
