// Integration oracles use literal target offsets + raw collected words,
// independently of the composer's mapping and allowed-region calculations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {resolveImportedTemplate,bundledLibrary,catalog} from './fm3-amp-library.mjs';
import {resolveCab} from './fm3-cabs.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'COMPOSER INTEGRATION'};
const standard={amp:[4610,144],cab:[5808,106],drive:[8414,44],delay:[7346,89],reverb:[9518,71],phaser:[9192,35],compressor:[7004,37],chorus:[6702,32],flanger:[8104,33],wah:[10132,25]};
const withoutFlanger=Object.fromEntries(Object.entries(standard).filter(([k])=>k!=='flanger'));
const variants=[
 {id:'jb-original',file:'examples/JB_YDOM_RHYTHM.syx',at:standard},
 {id:'jb-balanced',file:'examples/JB_RHYTHM_LEVEL_MINUS3.syx',at:standard},
 {id:'jb-balanced-export',file:'examples/JB_RHYTHM_LEVEL_MINUS3_export.syx',at:standard},
 {id:'jb-tremolo',file:'examples/FM3_TREMOLO_ABCD_TEST_export.syx',at:{...withoutFlanger,drive:[8104,44],phaser:[8882,35],reverb:[9208,71],wah:[10044,25],tremolo:[9822,22]}},
 {id:'jb-rotary',file:'examples/FM3_ROTARY_A_TEST_export.syx',at:{...withoutFlanger,drive:[8104,44],phaser:[8882,35],reverb:[9208,71],wah:[10036,25],rotary:[9822,21]}},
 {id:'jb-pitch',file:'examples/FM3_PITCH_ABCD_TEST_export.syx',at:{...withoutFlanger,drive:[8104,44],phaser:[9840,35],reverb:[10166,71],wah:[10780,25],pitch:[8882,114]}}
];
const libs=Object.fromEntries(['drive','delay','reverb','compressor','chorus','flanger','phaser','wah','tremolo','pitch'].map(f=>[f,JSON.parse(read('references/'+f+'-library.json'))]));
const start=(at,f,ch)=>at[f][0]+46+'ABCD'.indexOf(ch)*at[f][1]*2;
function fullRequest(v){
 const spec={...meta,ampModelB:'Brit Silver',cabModelB:'4x12 Lerxst',gainB:7,bassB:6,midB:6.5,trebleB:5.2,presenceB:3,levelB:-3,delayMixA:15,delayTimeMs:400,delayFeedback:25,delayTempoA:'NONE',reverbMixA:12,reverbTimeS:2.5,reverbPredelayMs:40,reverbPredelayTempoA:'NONE',scene6Name:'COMPOSED SOLO',ampScene6:'C',reverbScene6:'D',phaserScene6Bypass:true,delayScene6Bypass:false,delayScene2:true,reverbScene1:'B'};
 for(const f of Object.keys(libs))if(v.at[f]){
  const m=libs[f].models;
  spec[f+'Channels']='ABCD'.split('').map((channel,i)=>({channel,type:i===0&&f==='delay'?'Deluxe Mind Guy':i===0&&f==='reverb'?'Room: Large Room':m[[0,m.length-1,Math.floor(m.length/2),1][i]].name}));
 }
 if(v.at.rotary)spec.rotaryA={rateHz:5,mixPercent:25,levelDb:-6,hiDepthPercent:50,lowDepthPercent:50};
 return spec;
}
function oracle(input,v,s){
 const out=Buffer.from(body(input));
 if(s.ampModelB)resolveImportedTemplate(bundledLibrary,s.ampModelB).raw.copy(out,start(v.at,'amp','B'));
 if(s.cabModelB)resolveCab(s.cabModelB).raw.copy(out,start(v.at,'cab','B'));
 for(const [f,l] of Object.entries(libs))for(const c of s[f+'Channels']??[]){
  const m=l.models.find(m=>m.name===c.type);m.words.forEach((raw,i)=>out.writeUInt16LE(raw,start(v.at,f,c.channel)+i*2));
 }
 const values={gainB:['amp','B',7,0,10],bassB:['amp','B',8,0,10],midB:['amp','B',9,0,10],trebleB:['amp','B',10,0,10],presenceB:['amp','B',26,0,10],levelB:['amp','B',1,-80,20],delayMixA:['delay','A',0,0,100],delayTimeMs:['delay','A',8,1,16000],delayFeedback:['delay','A',10,-100,100],reverbMixA:['reverb','A',13,0,100],reverbTimeS:['reverb','A',1,0.1,100],reverbPredelayMs:['reverb','A',9,0,1000]};
 for(const [key,[family,ch,pid,low,high]] of Object.entries(values))if(Object.hasOwn(s,key))out.writeUInt16LE(Math.round((s[key]-low)/(high-low)*65534),start(v.at,family,ch)+pid*2);
 if(s.delayTempoA==='NONE')out.writeUInt16LE(0,start(v.at,'delay','A')+30);
 if(s.reverbPredelayTempoA==='NONE')out.writeUInt16LE(0,start(v.at,'reverb','A')+124);
 if(s.rotaryA){const raw={rateHz:[0,32767],mixPercent:[5,16384],levelDb:[6,48495],hiDepthPercent:[2,32767],lowDepthPercent:[1,32767]};for(const key of Object.keys(s.rotaryA)){const [pid,value]=raw[key];out.writeUInt16LE(value,start(v.at,'rotary','A')+pid*2)}}
 if(s.scene6Name){out.fill(32,164,195);Buffer.from(s.scene6Name).copy(out,164)}
 if(s.ampScene6)out.writeUInt16LE('ABCD'.indexOf(s.ampScene6),v.at.amp[0]+20);
 if(s.reverbScene6)out.writeUInt16LE('ABCD'.indexOf(s.reverbScene6),v.at.reverb[0]+20);
 if(Object.hasOwn(s,'phaserScene6Bypass'))out.writeUInt16LE(s.phaserScene6Bypass?1:0,v.at.phaser[0]+36);
 if(Object.hasOwn(s,'delayScene6Bypass'))out.writeUInt16LE(s.delayScene6Bypass?1:0,v.at.delay[0]+36);
 if(Object.hasOwn(s,'delayScene2'))out.writeUInt16LE(s.delayScene2?0:1,v.at.delay[0]+28);
 if(s.reverbScene1)out.writeUInt16LE('ABCD'.indexOf(s.reverbScene1),v.at.reverb[0]+10);
 return out;
}
let allComponentCases=0,channelTransfers=0,scalarOnlyCases=0,subsetCases=0,rejected=0;
for(const v of variants){
 const input=read(v.file),original=Buffer.from(input),spec=fullRequest(v),copy=JSON.stringify(spec),r=generatePreset(input,spec),want=oracle(input,v,spec);
 assert.deepEqual(body(r.syx),want,v.id+' entire body');assert.deepEqual(input,original);assert.equal(JSON.stringify(spec),copy);
 assert.equal(r.report.baseId,v.id);assert.equal(r.report.selectedScene,body(input)[0]+1);
 assert.deepEqual(r.report.components.amp.affectedScenes,[2]);
 for(const c of r.report.affectedChannels){const [h]=v.at[c.family];const scenes=Array.from({length:8},(_,i)=>want.readUInt16LE(h+10+i*2)==='ABCD'.indexOf(c.channel)?i+1:null).filter(Boolean);assert.deepEqual(c.scenes,scenes);assert.deepEqual(c.activeScenes,scenes.filter(s=>want.readUInt16LE(h+26+(s-1)*2)===0));}
 for(const f of Object.keys(libs))for(const c of spec[f+'Channels']??[]){assert.ok(r.txt.includes(f+' '+c.channel+': '+c.type),f+' in TXT');channelTransfers++;}
 assert.ok(r.txt.includes(r.report.exportFilename));assert.ok(r.txt.includes(r.report.outputSha256));
 const cap=getComposerCapabilities(input);assert.equal(cap.bases[0].id,v.id);assert.equal(Boolean(cap.templates.flanger),Boolean(v.at.flanger));assert.equal(Boolean(cap.rotaryA),Boolean(v.at.rotary));
 allComponentCases++;
 // Partial control changes on a previously confirmed base must never restore
 // other parameter words from the component's canonical donor.
 for(const extra of [{levelB:-4},{scene6Name:'KEEP OTHER SETTINGS'},{ampScene6:'C',phaserScene6Bypass:true}]){
  const s={...meta,...extra};assert.deepEqual(body(generatePreset(input,s).syx),oracle(input,v,s));scalarOnlyCases++;
 }
 // Every absent structural family fails rather than being ignored or inserted.
 for(const f of ['flanger','tremolo','pitch'])if(!v.at[f]){assert.throws(()=>generatePreset(input,{...meta,[f+'Channels']:[{channel:'A',type:libs[f].models[0].name}]}),/absent/);rejected++;}
 if(!v.at.rotary){assert.throws(()=>generatePreset(input,{...meta,rotaryA:{rateHz:5}}),/absent/);rejected++;}
}
// All subsets of newly integrated standard families, tested also after the
// Pitch insertion has shifted Phaser and Wah in the target layout.
for(const v of [variants[1],variants[5]]){
 const input=read(v.file),groups=['compressor','chorus','phaser','wah'];
 for(let mask=1;mask<16;mask++){
  const s={...meta};for(let j=0;j<groups.length;j++)if(mask&(1<<j)){const f=groups[j];s[f+'Channels']=[{channel:'C',type:libs[f].models.at(-1).name}];}
  assert.deepEqual(body(generatePreset(input,s).syx),oracle(input,v,s));subsetCases++;
 }
}
// New template fields retain the component's input restrictions.
for(const f of Object.keys(libs)){
 const v=f==='tremolo'?variants[3]:f==='pitch'?variants[5]:variants[1],base=read(v.file),type=libs[f].models[0].name;
 for(const bad of [[],null,[null],[{channel:'E',type}],[{channel:'A',type:'NOT A MODEL'}],[{channel:'A',type},{channel:'A',type}],[{channel:'A',type,unverifiedControl:1}]]){assert.throws(()=>generatePreset(base,{...meta,[f+'Channels']:bad}));rejected++;}
}
for(const bad of [{rateHz:3},{levelDb:-3},{channel:'B'},{}]){assert.throws(()=>generatePreset(read(variants[4].file),{...meta,rotaryA:bad}));rejected++;}
const corrupt=Buffer.from(read(variants[1].file));corrupt[100]^=1;assert.throws(()=>generatePreset(corrupt,{...meta,levelB:-3}));rejected++;
assert.throws(()=>generatePreset(read(variants[1].file),{...meta,scenes:[{scene:2,compressor:'D'}]}));rejected++;
// The confirmed final rhythm/solo output remains bit-exact, and importing its
// device re-export as a base preserves the full accepted body on a no-op Level.
const acceptedSpec=JSON.parse(read('examples/JB_RHYTHM_LEVEL_MINUS3.spec.json'));
assert.deepEqual(generatePreset(read(variants[0].file),acceptedSpec).syx,read(variants[1].file));
assert.deepEqual(body(generatePreset(read(variants[2].file),{...meta,levelB:-3}).syx),body(read(variants[2].file)));
// Schema branch includes every existing/new field in the same nonempty-choice
// group; this is a structural schema check, not a full JSON-Schema validator.
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')),branch=schema.oneOf.find(b=>b.properties?.baseProfile?.const==='jb-composer');
assert.equal(branch.anyOf,undefined);for(const f of Object.keys(libs)){assert.ok(branch.properties[f+'Channels']);assert.ok(branch.allOf[0].anyOf.some(c=>c.required?.includes(f+'Channels')))}
assert.ok(branch.properties.rotaryA);assert.ok(branch.allOf[0].anyOf.some(c=>c.required?.includes('rotaryA')));
// The five built-in templates predate the JB preset. In particular, the JB
// Amp B is Brit Silver and must never stand in for USA MK IV Rhythm 2.
const ampBase=body(read('references/Baaspreset.syx')),lead=body(read('references/S2_AmpModelLead.syx'));
const builtins=['USA MK IV Rhythm 1','USA MK IV Rhythm 2','USA MK IV Lead Bright','USA MK IV Lead Mid','USA MK IV Lead'];
let builtinAmpTransfers=0;
for(const v of variants)for(const [i,name] of builtins.entries()){
 const bytes=read(v.file),out=generatePreset(bytes,{...meta,ampModelB:name}),expected=Buffer.from(body(bytes));
 const donor=i===4?lead:ampBase,channel=i===4?1:i;
 donor.copy(expected,start(v.at,'amp','B'),4656+channel*288,4656+(channel+1)*288);
 assert.deepEqual(body(out.syx),expected,name+' on '+v.id);
 assert.equal(body(out.syx).readUInt16LE(start(v.at,'amp','B')+12),catalog.models.find(m=>m.name===name).id);
 builtinAmpTransfers++;
}
assert.equal(getComposerCapabilities().templates.amp.count,336);
assert.equal(getComposerCapabilities().templates.cab.count,45);
const report={date:'2026-10-08',generator:'jb-composer-0.2.0',passed:true,compatibleBases:variants.length,structuralLayouts:4,allComponentCases,fullChannelTransfersInAllComponentCases:channelTransfers,builtinAmpTransfers,scalarAndSceneIsolationCases:scalarOnlyCases,newFamilySubsetCases:subsetCases,rejectedRequests:rejected,acceptedBonamassaFileByteIdentical:true,acceptedExportNoopBodyIdentical:true,inputsPreserved:true,allTargetsComparedAgainstIndependentWholeBodyOracle:true,affectedAndActiveScenesVerified:true,txtAllRequestedTemplatesAndExportNames:true,capabilityInventoryVerified:true,schema:'Structure and field coverage checked; full Draft2020-12 validator unavailable',hardware:'New extended combinations are offline-tested only; need one representative cross-layout device roundtrip',audio:'New combinations not assessed'};
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_INTEGRATION_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
