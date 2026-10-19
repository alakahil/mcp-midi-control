// Whole-body oracle built from literal source slices and the user's screenshot.
// Deliberately does not import the insertion writer, slots or base layout maps.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const write=(p,x)=>fs.writeFileSync(new URL('../../../docs/'+p,import.meta.url),JSON.stringify(x,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex');
const decode=b=>Buffer.from(inspectStructure(b).raw.body);
const input=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),fresh=Buffer.from(input),body=decode(input),old=decode(read('examples/JB_RHYTHM_LEVEL_MINUS3_export.syx'));
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'NEWLOOK VALIDATION'};
const pieces=[[58,4610,5808],[62,5808,6702],[70,6702,7460],[186,7460,7518],[182,7518,7568],[118,7568,7966],[37,7966,8092],[42,8092,8346],[66,8346,8960]];
const preserved=[[58,4610,4610,1198],[62,5808,5808,894],[70,7346,6702,758],[118,8414,7568,398],[37,8812,7966,126],[42,8938,8092,254],[66,9518,8346,614]];
for(const [eid,a,b,n] of preserved)assert.deepEqual(body.subarray(b,b+n),old.subarray(a,a+n),'existing full record '+eid);
assert.deepEqual(body.subarray(8960),old.subarray(10378));
const prefixChanges=[];for(let i=0;i<4610;i++)if(body[i]!==old[i]&&!(i>=260&&i<452))prefixChanges.push([i,old[i],body[i]]);
assert.deepEqual(prefixChanges,[[1584,14,0]]);
// Observed before/after validates record removal and size model exactly.
const expectedPrefix=Buffer.from(old.subarray(0,4610));expectedPrefix.fill(0,260,452);expectedPrefix[1584]=0;
const row2=[37,1024,1025,118,1026,58,1027,62,1028,1029,1030,182],row3=[186,1031,1032,1033,1034,1035,1036,1037,70,66,1038,42];
for(const [row,ids] of [[1,row2],[2,row3]])ids.forEach((eid,col)=>{expectedPrefix.writeUInt16LE(eid,260+16*col+4*row);expectedPrefix.writeUInt16LE(col?1<<row:0,262+16*col+4*row)});
assert.deepEqual(expectedPrefix,body.subarray(0,4610),'screenshot-derived grid and one disabled source');
const reconstructed=Buffer.concat([expectedPrefix,old.subarray(4610,6702),old.subarray(7346,8104),body.subarray(7460,7568),old.subarray(8414,9192),old.subarray(9518,10132),old.subarray(10378)]);
assert.deepEqual(reconstructed,body,'exact old-to-NewLook structural reconstruction');
const definitions={
 compressor:[46,7004,37,1,1,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],
 wah:[94,10132,25,1,2,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],
 phaser:[90,9192,35,1,4,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],
 chorus:[78,6702,32,2,2,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],
 flanger:[82,8104,33,2,3,'JB_RHYTHM_LEVEL_MINUS3_export.syx'],
 pitch:[110,8882,114,2,1,'FM3_PITCH_ABCD_TEST_export.syx'],
 rotary:[86,9822,21,2,4,'FM3_ROTARY_A_TEST_export.syx'],
 tremolo:[106,9822,22,2,5,'FM3_TREMOLO_ABCD_TEST_export.syx']
};
const ordering=[58,62,78,46,70,186,182,82,118,37,42,90,110,66,86,106,94];
function request(families){
 const spec={...meta,levelB:-4,delayMixA:15,scene6Name:'NEWLOOK SOLO',addedBlockScenes:{}};
 for(const f of families){
  if(f==='rotary'){spec.rotaryA={rateHz:5,mixPercent:25};spec.addedBlockScenes[f]=[{scene:6,channel:'A',bypass:false}];}
  else{const lib=JSON.parse(read('references/'+f+'-library.json'));spec[f+'Channels']=[{channel:'B',type:lib.models.at(-1).name}];spec.addedBlockScenes[f]=[{scene:6,channel:'B',bypass:false}];}
 }
 return spec;
}
function oracle(spec,families){
 const prefix=Buffer.from(body.subarray(0,4610));prefix.fill(32,164,195);Buffer.from(spec.scene6Name).copy(prefix,164);
 const records=pieces.map(([id,a,b])=>({id,bytes:Buffer.from(body.subarray(a,b))}));
 for(const f of families){
  const [id,h,w,row,col,file]=definitions[f],donor=decode(read('examples/'+file)),rec=Buffer.from(donor.subarray(h,h+46+w*8));
  rec.fill(0,10,26);for(let i=0;i<8;i++)rec.writeUInt16LE(1,26+2*i);
  if(f==='rotary'){rec.writeUInt16LE(32767,46);rec.writeUInt16LE(16384,56);}
  else{const lib=JSON.parse(read('references/'+f+'-library.json')),m=lib.models.find(m=>m.name===spec[f+'Channels'][0].type);m.words.forEach((v,i)=>rec.writeUInt16LE(v,46+2*w+2*i));}
  for(const s of spec.addedBlockScenes[f]){rec.writeUInt16LE('ABCD'.indexOf(s.channel),10+(s.scene-1)*2);rec.writeUInt16LE(s.bypass?1:0,26+(s.scene-1)*2);}
  prefix.writeUInt16LE(id,260+16*col+4*row);records.push({id,bytes:rec});
 }
 records.find(r=>r.id===58).bytes.writeUInt16LE(Math.round(76/100*65534),46+288+2);
 records.find(r=>r.id===70).bytes.writeUInt16LE(Math.round(15/100*65534),46);
 records.sort((a,b)=>ordering.indexOf(a.id)-ordering.indexOf(b.id));
 return Buffer.concat([prefix,...records.map(r=>r.bytes),body.subarray(8960)]);
}
const names=Object.keys(definitions);let cases=0;
for(const families of [...names.map(f=>[f]),['chorus','compressor'],names]){
 const spec=request(families),unchanged=JSON.stringify(spec),r=generatePreset(input,spec),actual=decode(r.syx);
 assert.deepEqual(actual,oracle(spec,families),'entire output '+families.join(','));assert.deepEqual(input,fresh);assert.equal(JSON.stringify(spec),unchanged);
 assert.equal(r.report.insertions.length,families.length);assert.equal(r.report.checks.routingPreserved,false);
 assert.ok(r.txt.includes('Rida 2: Input 1'));assert.ok(r.txt.includes('Rida 3: Return 1'));assert.ok(!r.txt.includes('Shunt'));
 for(const f of families){const s=r.report.scenes[5].blocks[f];assert.equal(s.channel,f==='rotary'?'A':'B');assert.equal(s.bypass,false);assert.ok(r.report.scenes.filter(s=>s.scene!==6).every(s=>s.blocks[f].bypass));}
 cases++;
}
// No insertion: all 12,804 bytes retained, and donor scene activation is never inherited.
assert.deepEqual(decode(generatePreset(input,{...meta,levelB:-3}).syx),body);
const noScene=generatePreset(input,{...meta,chorusChannels:[{channel:'B',type:'4-Voice Analog'}]});
assert.ok(noScene.report.scenes.every(s=>s.blocks.chorus.bypass&&s.blocks.chorus.channel==='A'));
const comp=JSON.parse(read('references/compressor-library.json')).models[0].name;
let rejected=0;
for(const extra of [
 {addedBlockScenes:{chorus:[]},levelB:-3},
 {phaserScene6Bypass:true},
 {chorusChannels:[],addedBlockScenes:{}},
 {chorusChannels:[{channel:'B',type:'unknown'}]},
 {chorusChannels:[{channel:'B',type:'4-Voice Analog'}],addedBlockScenes:{chorus:[{scene:6,channel:'A',bypass:false}]}},
 {compressorChannels:[{channel:'A',type:comp}],addedBlockScenes:{compressor:[{scene:9,channel:'A',bypass:false}]}},
 {compressorChannels:[{channel:'A',type:comp}],addedBlockScenes:{compressor:[{scene:1,channel:'A',bypass:false},{scene:1,channel:'A',bypass:true}]}},
 {compressorChannels:[{channel:'A',type:comp}],addedBlockScenes:{compressor:[{scene:1,channel:'A',bypass:0}]}},
 {levelB:-3,addedBlockScenes:null},
 {filterChannels:[{channel:'A',type:'Lowpass'}]},
 {layout:'arbitrary',levelB:-3},
]){assert.throws(()=>generatePreset(input,{...meta,...extra}));rejected++;}
const altered=Buffer.from(input);altered[100]^=1;assert.throws(()=>generatePreset(altered,{...meta,levelB:-3}));rejected++;
assert.throws(()=>generatePreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_export.syx'),{...meta,levelB:-3,addedBlockScenes:{}}));rejected++;
const cap=getComposerCapabilities(input);assert.equal(cap.defaultBase,'jb-newlook');for(const f of names)assert.ok(cap.bases[0].fields.includes(f==='rotary'?'rotaryA':f+'Channels'));
write('FM3_NEWLOOK_SOURCE_AUDIT.json',{date:'2026-10-08',input:'JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',sha256:sha(input),bodyBytes:body.length,source:'User firmware-13 export and FM3-Edit screenshot',selectedScene:2,removed:['compressor','wah','phaser','chorus','flanger'],added:['send','return'],allExistingRecordsByteIdentical:preserved.map(([eid,,,bytes])=>({eid,bytes})),opaqueSystemTailByteIdentical:true,nonGridPrefixChanges:prefixChanges.map(([offset,before,after])=>({offset,before,after,note:'Former Wah modifier source disabled by user editor export; preserved as-is'})),exactOldToNewReconstruction:true,ampBLevelRaw:body.readUInt16LE(4946),ampCLevelRaw:body.readUInt16LE(5234),screenshotCpuPercent:44.6,cpuScope:'Screenshot only, Scene2, not an all-scene maximum or new-generated-layout result',audio:'User changed layout; no new listening assessment inferred'});
const report={date:'2026-10-08',generator:'jb-composer-0.3.0',passed:true,independentWholeBodyInsertionCases:cases,allEightAddedTogether:true,newLookNoopBodyIdentical:true,sourceHistoricalReconstruction:true,invalidRequestsRejected:rejected,donorSceneActivationNotInherited:true,inputsUnchanged:true,existingInputOutputSendReturnAndSystemDataPreserved:true,hardware:'Generated insertion awaiting user import/export. Supplied NewLook is a user device export.',audio:'New inserted effects not assessed'};
write('FM3_NEWLOOK_TESTS.json',report);console.log(JSON.stringify(report,null,2));
