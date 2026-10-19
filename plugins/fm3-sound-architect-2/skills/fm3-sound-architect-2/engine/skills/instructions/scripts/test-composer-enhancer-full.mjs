// Expected states are original device exports, independent of the encoder.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {loadEnhancerFull,composeEnhancerFull,applyEnhancerControl,enhancerLibraryHash} from './fm3-enhancer-full.mjs';
import {decodeEnhancerNumber,enhancerSha} from './fm3-enhancer-audit.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url)),json=p=>JSON.parse(read(p));
const body=b=>Buffer.from(inspectStructure(b).raw.body),base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const {library}=loadEnhancerFull();let encoderReplays=0,templateSnapshots=0,copyReplays=0,selectorReplays=0;
for(const point of library.passed){
 const root='references/'+library.evidenceDirectories[point.source]+'/',r=json(root+point.folder+'/result.json'),s=r.step;
 const actual=body(read(root+point.previousFile)),expected=body(read(root+point.folder+'/donor.syx')),start=7506+'ABCD'.indexOf(s.channel)*24;
 if(s.kind==='control'){
  const previous=Array.from({length:12},(_,i)=>actual.readUInt16LE(start+2*i)),words=applyEnhancerControl(previous,s.parameter,r.observations.displayValue);
  words.forEach((v,i)=>actual.writeUInt16LE(v,start+2*i));encoderReplays++;
 }else if(s.kind==='type'||s.kind==='baseline'){
  const snapshot=library.typeSnapshots.find(t=>t.source===point.source&&t.index===point.index);snapshot.words.forEach((v,i)=>actual.writeUInt16LE(v,7506+2*i));templateSnapshots++;
 }else if(s.kind==='copy-channel'){
  actual.copy(actual,start,7506,7530);actual.writeUInt16LE('ABCD'.indexOf(s.channel),7472);copyReplays++;
 }else if(s.kind==='select-channel'){actual.writeUInt16LE('ABCD'.indexOf(s.channel),7472);selectorReplays++;}
 assert.deepEqual(actual,expected,'Entire original 13804-byte body, '+point.source+'/'+point.index);
}
assert.equal(encoderReplays,78);assert.equal(templateSnapshots,5);assert.equal(copyReplays,3);assert.equal(selectorReplays,1);
let exactChannelTemplates=0;
for(const m of library.models)for(const channel of 'ABCD'){
 const c=composeEnhancerFull([{channel,type:m.name,levelDb:decodeEnhancerNumber('Level',m.words[4])}]);
 assert.deepEqual(c.channels[0].words,m.words);assert.equal(c.data[0].bytes.length,24);exactChannelTemplates++;
}
const valid={channel:'A',type:'Modern',levelDb:-1},invalid=[[],[null],[{...valid,channel:'E'}],[valid,valid],[{channel:'A',type:'Modern'}],[{...valid,type:'Unknown'}],[{...valid,bypassMode:'Thru'}],[{...valid,pid5:0}],[{...valid,panLeft:0}],[{...valid,invert:'None'}],[{...valid,type:'Classic',depth:20}],[{...valid,type:'Stereoizer',lowCutHz:200}],[{...valid,levelDb:-80.1}],[{...valid,levelDb:20.1}],[{...valid,levelDb:'0'}],[{...valid,levelDb:null}],[{...valid,levelDb:NaN}],[{...valid,levelDb:Infinity}],[{...valid,width:-1}],[{...valid,depth:101}],[{...valid,lowCutHz:19}],[{...valid,highCutHz:20001}],[{...valid,type:'Classic',panLeft:-101}],[{...valid,type:'Classic',panRight:101}],[{...valid,type:'Classic',balance:101}],[{...valid,type:'Classic',invert:'Dry'}],[{...valid,sceneIgnore:1}]];
for(const request of invalid)assert.throws(()=>composeEnhancerFull(request));
for(const name of ['JB_EIGHT_SCENES_V3','FM3_PEQ_ABCD_TEST','FM3_GEQ_ABCD_TEST']){
 assert.deepEqual(generatePreset(base,json('examples/'+name+'.spec.json')).syx,read('examples/'+name+'.syx'),name+' remains byte-identical');
 console.log('Unchanged: '+name);
}
const spec=json('examples/FM3_ENHANCER_ABCD_TEST.spec.json'),r=generatePreset(base,spec),actual=body(r.syx);
assert.deepEqual(r.syx,read('examples/FM3_ENHANCER_ABCD_TEST.syx'));
assert.equal(r.report.knownDeviceBody.submittedFileConfirmed,true);assert.equal(actual.length,13804);
const restored=Buffer.concat([actual.subarray(0,7460),actual.subarray(7602)]);restored.writeUInt16LE(1038,428);
assert.deepEqual(restored,body(read('examples/FM3_GEQ_ABCD_TEST_export.syx')),'All 13662 prior bytes preserved');
assert.deepEqual(r.report.scenes.map(s=>s.blocks.enhancer.channel),['A','A','B','C','A','D','A','A']);
assert.deepEqual(r.report.scenes.map(s=>s.blocks.enhancer.bypass),[true,false,false,false,true,false,true,true]);
assert.deepEqual(r.report.scenes.filter(s=>[2,3,4,6].includes(s.scene)).map(s=>s.blocks.enhancer.type),['Modern','Classic','Stereoizer','Modern']);
assert.equal(r.report.insertions.find(i=>i.family==='enhancer').row,3);assert.equal(r.report.insertions.find(i=>i.family==='enhancer').column,11);
assert.equal(actual.readUInt16LE(430),4,'Routing word preserved');
const minimal={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'ENHANCER DEFAULT',enhancerChannels:[valid]};
assert.ok(generatePreset(base,minimal).report.scenes.every(s=>s.blocks.enhancer.bypass&&s.blocks.enhancer.channel==='A'));
assert.throws(()=>generatePreset(base,{...minimal,scenes:[{scene:2,blocks:{enhancer:{channel:'D',bypass:false}}}]}));
assert.throws(()=>generatePreset(read('examples/JB_YDOM_RHYTHM.syx'),minimal));
const caps=getComposerCapabilities(base);assert.equal(caps.enhancerControls.types.length,3);
const tamper=new URL('../references/'+library.evidenceDirectories.supplement+'/step-012-f1c400ab68/capture.json',import.meta.url),saved=fs.readFileSync(tamper);
try{fs.writeFileSync(tamper,Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>composeEnhancerFull([valid]),/Enhancer source changed/);}finally{fs.writeFileSync(tamper,saved);}
const summary={date:'2026-10-12',generator:'jb-composer-0.12.1',passed:true,registrySha256:enhancerLibraryHash,...library.audit,encoderReplays,templateSnapshots,copyReplays,selectorReplays,comparisonScope:'78 shared-control encoder replays, 5 captured full-template snapshots, 3 copies and 1 selector replay each equal all 13804 original body bytes. These are not 87 public-API composition replays.',exactChannelTemplates,priorSyxByteIdentical:['V3','PEQ A-D','GEQ A-D'],newPresetOriginalGeqBytesReconstructed:13662,invalidRequestsRejected:invalid.length,opaqueWordsPreserved:true,defaultBypass:true,unconfiguredChannelRejected:true,unsupportedBaseRejected:true,tamperedEvidenceRejected:true,newCombinationSha256:enhancerSha(r.syx),newCombinationHardware:'Exact specimen confirmed 2026-10-12; Enhancer works; user observed maximum CPU52.7%. Test itself performs no hardware I/O.'};
fs.writeFileSync(new URL('../../../docs/FM3_ENHANCER_COMPOSER_VALIDATION.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
