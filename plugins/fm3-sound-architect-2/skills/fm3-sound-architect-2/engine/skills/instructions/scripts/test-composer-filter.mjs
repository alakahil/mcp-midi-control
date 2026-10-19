// Full-body oracles use the user's independent Filter exports, not writer maps.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const decode=b=>Buffer.from(inspectStructure(b).raw.body);
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),baseCopy=Buffer.from(base),clean=decode(base);
const lib=JSON.parse(read('references/filter-library.json')),donor=decode(read('references/'+lib.evidenceDirectory+'/baseline.syx'));
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FILTER COMPOSER VALIDATION'};
let combinations=0,replays=0;
for(const m of lib.models){
 const captured=decode(read('references/'+lib.evidenceDirectory+'/'+m.sourceCapture+'/donor.syx'));
 const from=7614+'ABCD'.indexOf(m.sourceChannel)*74,words=captured.subarray(from,from+74);
 for(const channel of 'ABCD'){
  const spec={...meta,filterChannels:[{channel,type:m.name}]},copy=JSON.stringify(spec),expected=Buffer.from(donor);
  for(let i=0;i<8;i++)expected.writeUInt16LE(1,7594+2*i);
  words.copy(expected,7614+'ABCD'.indexOf(channel)*74);
  const result=generatePreset(base,spec);assert.deepEqual(decode(result.syx),expected,m.name+'/'+channel);
  assert.equal(JSON.stringify(spec),copy);assert.deepEqual(base,baseCopy);
  assert.ok(result.report.scenes.every(s=>s.blocks.filter.channel==='A'&&s.blocks.filter.bypass));
  assert.ok(result.txt.includes(m.name));assert.deepEqual(result.report.insertions.map(x=>[x.family,x.row,x.column]),[['filter',2,9]]);
  combinations++;
 }
}
// Reproduce every raw device-exported body exactly, including real scene state.
const root=new URL('../references/'+lib.evidenceDirectory+'/',import.meta.url);
for(const capture of fs.readdirSync(root).filter(n=>n.startsWith('capture-')).sort()){
 const expected=decode(fs.readFileSync(new URL(capture+'/donor.syx',root)));
 const filterChannels=[...'ABCD'].map((channel,i)=>({channel,type:lib.models.find(m=>m.binaryId===expected.readUInt16LE(7614+i*74)).name}));
 const scenes=Array.from({length:8},(_,i)=>({scene:i+1,blocks:{filter:{channel:'ABCD'[expected.readUInt16LE(7578+i*2)],bypass:expected.readUInt16LE(7594+i*2)===1}}}));
 const r=generatePreset(base,{...meta,filterChannels,scenes});assert.deepEqual(decode(r.syx),expected,'Unnormalised captured body '+capture);replays++;
}
// Move every other existing insertion around Filter and check the whole body.
// The combination's device import is pending; its byte intent is explicit here.
const spec={...meta,filterChannels:[{channel:'C',type:'Peaking'}],rotaryA:{rateHz:5,mixPercent:25},scenes:[{scene:6,blocks:{filter:{channel:'C',bypass:false}}}]};
const defs={compressor:[46,7004,37,1,1,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],wah:[94,10132,25,1,2,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],phaser:[90,9192,35,1,4,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],chorus:[78,6702,32,2,2,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],flanger:[82,8104,33,2,3,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],pitch:[110,8882,114,2,1,'FM3_PITCH_ABCD_TEST_export.syx'],rotary:[86,9822,21,2,4,'FM3_ROTARY_A_TEST_export.syx'],tremolo:[106,9822,22,2,5,'FM3_TREMOLO_ABCD_TEST_export.syx']};
const prefix=Buffer.from(donor.subarray(0,4610)),parts=[[58,4610,5808],[62,5808,6702],[70,6702,7460],[186,7460,7518],[182,7518,7568],[114,7568,7910],[118,7910,8308],[37,8308,8434],[42,8434,8688],[66,8688,9302]].map(([id,a,b])=>({id,raw:Buffer.from(donor.subarray(a,b))}));
for(const [f,[id,h,w,row,col,file]] of Object.entries(defs)){
 const raw=Buffer.from(decode(read('examples/'+file)).subarray(h,h+46+w*8));raw.fill(0,10,26);for(let s=0;s<8;s++)raw.writeUInt16LE(1,26+s*2);
 if(f==='rotary'){raw.writeUInt16LE(32767,46);raw.writeUInt16LE(16384,56);}
 else{const library=JSON.parse(read('references/'+f+'-library.json')),m=library.models[0];spec[f+'Channels']=[{channel:'B',type:m.name}];m.words.forEach((v,i)=>raw.writeUInt16LE(v,46+w*2+i*2));}
 prefix.writeUInt16LE(id,260+col*16+row*4);parts.push({id,raw});
}
const filter=parts.find(p=>p.id===114).raw;for(let s=0;s<8;s++)filter.writeUInt16LE(1,26+s*2);
lib.models.find(m=>m.name==='Peaking').words.forEach((v,i)=>filter.writeUInt16LE(v,46+148+2*i));filter.writeUInt16LE(2,20);filter.writeUInt16LE(0,36);
const order=[58,62,78,46,70,186,182,114,82,118,37,42,90,110,66,86,106,94];parts.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
const expected=Buffer.concat([prefix,...parts.map(p=>p.raw),donor.subarray(9302)]),all=generatePreset(base,spec);
assert.deepEqual(decode(all.syx),expected);assert.equal(all.report.insertions.length,9);assert.equal(all.report.scenes[5].blocks.filter.channel,'C');assert.equal(all.report.scenes[5].blocks.filter.bypass,false);
assert.deepEqual(all.report.components.filter[0].activeScenes,[6]);
// REA added the measured 2nd/4th Order choices; keep a genuinely invalid enum here.
const orderAccepted=generatePreset(base,{...meta,filterChannels:[{channel:'A',type:'High-Pass',order:'2nd'}]});
assert.ok(orderAccepted.report.components.filter[0].controls.some(c=>c.key==='order'));
// Unmeasured fields/type/channel/value combinations remain rejected.
let rejected=0;
for(const extra of [{filterChannels:[]},{filterChannels:null},{filterChannels:[{channel:'E',type:'Null'}]},{filterChannels:[{channel:'A',type:'Unknown'}]},{filterChannels:[{channel:'A',type:'Null'},{channel:'A',type:'Peaking'}]},{filterChannels:[{channel:'A',type:'Peaking',frequency:1000}]},{filterChannels:[{channel:'A',type:'Peaking',q:1}]},{filterChannels:[{channel:'A',type:'Peaking',gainDb:3}]},{filterChannels:[{channel:'A',type:'Peaking',levelDb:0}]},{filterChannels:[{channel:'A',type:'High-Pass',order:'3rd'}]},{filterChannels:[{channel:'B',type:'Peaking'}],scenes:[{scene:6,blocks:{filter:{channel:'A',bypass:false}}}]},{filterChannels:[{channel:'C',type:'Peaking'}],scenes:[{scene:6,blocks:{filter:{bypass:false}}}]}]){assert.throws(()=>generatePreset(base,{...meta,...extra}));rejected++;}
for(const file of ['JB_YDOM_RHYTHM.syx','JB_RHYTHM_LEVEL_MINUS3.syx','JB_RHYTHM_LEVEL_MINUS3_export.syx','FM3_PITCH_ABCD_TEST_export.syx','FM3_TREMOLO_ABCD_TEST_export.syx','FM3_ROTARY_A_TEST_export.syx']){assert.throws(()=>generatePreset(read('examples/'+file),{...meta,filterChannels:[{channel:'A',type:'Null'}]}));rejected++;}
assert.throws(()=>generatePreset(read('references/'+lib.evidenceDirectory+'/baseline.syx'),{...meta,filterChannels:[{channel:'A',type:'Null'}]}));rejected++;
const cap=getComposerCapabilities(base);assert.equal(cap.templates.filter.count,18);assert.ok(cap.bases[0].fields.includes('filterChannels'));
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(b=>b.properties?.baseProfile?.const==='jb-composer');assert.equal(schema.properties.filterChannels.items.properties.type.enum.length,18);assert.ok(schema.properties.scenes.items.properties.blocks.properties.filter);
const testSpec=JSON.parse(read('examples/FM3_NEWLOOK_FILTER_TEST.spec.json')),test=generatePreset(base,testSpec),b=decode(test.syx);
const restored=Buffer.concat([b.subarray(0,7568),b.subarray(7910)]);restored.writeUInt16LE(1028,392);assert.deepEqual(restored,clean);
assert.ok(test.report.scenes.every(s=>s.blocks.filter.bypass));assert.equal(test.report.scenes[1].blocks.filter.channel,'A');assert.equal(test.report.scenes[5].blocks.filter.channel,'C');
const report={date:'2026-10-08',generator:'jb-composer-0.6.0',passed:true,allTypeChannelCombinations:combinations,exactDeviceBodyReplays:replays,deviceReplayNormalization:'None',allNineAddedTogetherWholeBodyCompared:true,invalidRequestsRejected:rejected,inputsPreserved:true,newFilterDefaultsToBypass:true,sceneAssignmentsAndReportVerified:true,exampleFilterRemovalRestoresAll12804OriginalBytes:true,exampleSyxSha256:test.report.outputSha256,exampleBodyBytes:b.length,hardware:'Six captured type-source bodies reproduce exactly; mixed ABCD specimen separately device-confirmed; arbitrary combined insertions remain unconfirmed',audio:'New Filter sounds and CPU not assessed',numericControls:'Only separately measured channel/type/points enabled; unmeasured combinations rejected',schema:'Field/enum structure checked; full schema validator not used'};
fs.writeFileSync(new URL('../../../docs/FM3_FILTER_GENERATOR_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
