// Scene oracle uses literal fixture offsets, independent of the scene writer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generatePreset,getComposerCapabilities} from './fm3-generate.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const body=b=>Buffer.from(inspectStructure(b).raw.body);
const meta={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'SCENE COMPOSITION TEST'};
const common={amp:4610,cab:5808,chorus:6702,compressor:7004,delay:7346,flanger:8104,drive:8414,phaser:9192,reverb:9518,wah:10132};
const alt={...common,drive:8104,phaser:8882,reverb:9208};delete alt.flanger;
const variants=[
 ['JB_YDOM_RHYTHM.syx',common],['JB_RHYTHM_LEVEL_MINUS3.syx',common],['JB_RHYTHM_LEVEL_MINUS3_export.syx',common],
 ['FM3_TREMOLO_ABCD_TEST_export.syx',{...alt,tremolo:9822,wah:10044}],
 ['FM3_ROTARY_A_TEST_export.syx',{...alt,rotary:9822,wah:10036}],
 ['FM3_PITCH_ABCD_TEST_export.syx',{...alt,pitch:8882,phaser:9840,reverb:10166,wah:10780}],
 ['JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',{amp:4610,cab:5808,delay:6702,drive:7568,reverb:8346}]
];
let fields=0,wholeBodyCases=0;
for(const [file,at] of variants){
 const input=read('examples/'+file),copy=Buffer.from(input),expected=body(input);
 const scenes=Array.from({length:8},(_,i)=>({scene:i+1,name:'SCENE '+(i+1)+' VERIFIED',blocks:Object.fromEntries(Object.keys(at).map((family,j)=>[family,{channel:'ABCD'[(i+j+3)%4],bypass:(i+j)%2===0}]))}));
 for(const s of scenes){
  const nameAt=4+(s.scene-1)*32;expected.fill(32,nameAt,nameAt+31);Buffer.from(s.name).copy(expected,nameAt);fields++;
  for(const [f,state] of Object.entries(s.blocks)){expected.writeUInt16LE('ABCD'.indexOf(state.channel),at[f]+10+2*(s.scene-1));expected.writeUInt16LE(state.bypass?1:0,at[f]+26+2*(s.scene-1));fields+=2;}
 }
 const spec={...meta,scenes},unchanged=JSON.stringify(spec),r=generatePreset(input,spec);
 assert.deepEqual(body(r.syx),expected,'all scene fields on '+file);assert.deepEqual(input,copy);assert.equal(JSON.stringify(spec),unchanged);
 assert.equal(r.report.selectedScene,body(input)[0]+1);assert.ok(r.report.checks.routingPreserved);
 for(const s of scenes){const actual=r.report.scenes[s.scene-1];assert.equal(actual.name,s.name);for(const [f,state] of Object.entries(s.blocks)){assert.equal(actual.blocks[f].channel,state.channel);assert.equal(actual.blocks[f].bypass,state.bypass);}}
 assert.equal(r.report.effective.find(x=>x.key==='reverbScene1').source,'scene-plan');
 assert.equal(r.report.effective.find(x=>x.key==='reverbScene1').value,scenes[0].blocks.reverb.channel);
 assert.ok(r.txt.includes('stseenikirjeldusest'));
 wholeBodyCases++;
}
const base=read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),original=body(base);
// Partial assignments must not reset the other header field or another scene.
for(const scenes of [[{scene:1,blocks:{reverb:{channel:'D'}}}],[{scene:8,blocks:{drive:{bypass:true}}}],[{scene:3,name:'SCENE THREE'}]]){
 const expected=Buffer.from(original),s=scenes[0];
 if(s.name){expected.fill(32,68,99);Buffer.from(s.name).copy(expected,68);}
 if(s.blocks?.reverb)expected.writeUInt16LE(3,8356);
 if(s.blocks?.drive)expected.writeUInt16LE(1,7608);
 assert.deepEqual(body(generatePreset(base,{...meta,scenes}).syx),expected);wholeBodyCases++;
}
// New API reproduces two already device-confirmed inserted specimens exactly.
let heldOutHardwareReproductions=0;
for(const stem of ['FM3_NEWLOOK_INSERT_TEST','FM3_NEWLOOK_PITCH_TEST']){
 const spec=JSON.parse(read('examples/'+stem+'.spec.json')),byScene=new Map();
 for(const [f,entries] of Object.entries(spec.addedBlockScenes))for(const e of entries){if(!byScene.has(e.scene))byScene.set(e.scene,{scene:e.scene,blocks:{}});byScene.get(e.scene).blocks[f]={channel:e.channel,bypass:e.bypass};}
 delete spec.addedBlockScenes;spec.scenes=[...byScene.values()];
 const r=generatePreset(base,spec);assert.deepEqual(r.syx,read('examples/'+stem+'.syx'));
 assert.deepEqual(body(r.syx),body(read('examples/'+stem+'_export.syx')));heldOutHardwareReproductions++;
}
// The complete musical rhythm/solo example remains the exact approved body.
const activatedSpec=JSON.parse(read('examples/FM3_NEWLOOK_INSERT_TEST.spec.json'));
delete activatedSpec.addedBlockScenes;activatedSpec.scenes=[{scene:6,blocks:{chorus:{channel:'B',bypass:false}}}];
const activated=generatePreset(base,activatedSpec),activatedExpected=body(read('examples/FM3_NEWLOOK_INSERT_TEST_export.syx'));
activatedExpected.writeUInt16LE(0,6738);assert.deepEqual(body(activated.syx),activatedExpected);wholeBodyCases++;
assert.deepEqual(activated.report.insertions[0].sceneAssignments,[{scene:6,channel:'B',bypass:false}]);
assert.deepEqual(activated.report.components.chorus[0].activeScenes,[6]);
// This active variation is checked offline only; the held-out export was bypassed.
const musical=JSON.parse(read('examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json')),result=generatePreset(base,musical);
assert.deepEqual(body(result.syx),original);assert.equal(result.report.sceneEdits.length,22);assert.ok(result.report.sceneEdits.every(e=>!e.changed));assert.ok(result.report.knownDeviceBody);
assert.ok(result.txt.includes('Täiendavat ekspordikatset ei nõuta.'));assert.ok(!result.txt.includes('JB_NEWLOOK_RHYTHM_SOLO_export.syx'));
// Existing fixture also reproduced through the general Scene6 interface.
const old=JSON.parse(read('examples/JB_RHYTHM_LEVEL_MINUS3.spec.json'));
for(const k of ['scene6Name','phaserScene6Bypass','reverbScene6','delayScene6Bypass','ampScene6'])delete old[k];
old.scenes=[{scene:6,name:'JB SOLO',blocks:{phaser:{bypass:true},reverb:{channel:'D'},delay:{bypass:false},amp:{channel:'C'}}}];
assert.deepEqual(generatePreset(read('examples/JB_YDOM_RHYTHM.syx'),old).syx,read('examples/JB_RHYTHM_LEVEL_MINUS3.syx'));heldOutHardwareReproductions++;
const invalid=[
 null,{},[],Array(9).fill({scene:1,name:'X'}),[null],[{}],[{scene:0,name:'X'}],[{scene:9,name:'X'}],[{scene:1.5,name:'X'}],[{scene:'2',name:'X'}],
 [{scene:2}],[{scene:2,name:''}],[{scene:2,name:'X'.repeat(32)}],[{scene:2,name:'Ä'}],[{scene:2,name:' X'}],[{scene:2,name:'X '}],[{scene:2,name:'X\nY'}],[{scene:2,name:2}],
 [{scene:2,blocks:{}}],[{scene:2,blocks:null}],[{scene:2,blocks:[]}],[{scene:2,blocks:{input:{channel:'A'}}}],[{scene:2,blocks:{phaser:{channel:'A'}}}],
 [{scene:2,blocks:{amp:{}}}],[{scene:2,blocks:{amp:null}}],[{scene:2,blocks:{amp:[]}}],[{scene:2,blocks:{amp:{channel:'E'}}}],[{scene:2,blocks:{amp:{channel:0}}}],
 [{scene:2,blocks:{drive:{bypass:1}}}],[{scene:2,blocks:{drive:{enabled:true}}}],[{scene:2,blocks:{amp:{levelDb:0}}}],[{scene:2,name:'X',other:1}],
 [{scene:2,name:'X'},{scene:2,name:'Y'}]
];
let rejected=0;for(const scenes of invalid){assert.throws(()=>generatePreset(base,{...meta,scenes}));rejected++;}
for(const s of [
 {scene6Name:'X',scenes:[{scene:6,name:'X'}]},
 {ampScene6:'C',scenes:[{scene:6,blocks:{amp:{channel:'C'}}}]},
 {delayScene2:false,scenes:[{scene:2,blocks:{delay:{bypass:true}}}]},
 {reverbScene1:'A',scenes:[{scene:1,blocks:{reverb:{channel:'A'}}}]},
 {chorusChannels:[{channel:'B',type:'4-Voice Analog'}],addedBlockScenes:{chorus:[{scene:6,channel:'B',bypass:true}]},scenes:[{scene:6,blocks:{chorus:{bypass:true}}}]},
 {chorusChannels:[{channel:'B',type:'4-Voice Analog'}],scenes:[{scene:6,blocks:{chorus:{bypass:false}}}]},
 {chorusChannels:[{channel:'B',type:'4-Voice Analog'}],scenes:[{scene:6,blocks:{chorus:{channel:'A'}}}]}
]){assert.throws(()=>generatePreset(base,{...meta,...s}));rejected++;}
const merged=generatePreset(base,{...meta,ampScene6:'C',scenes:[{scene:6,blocks:{amp:{bypass:true}}}]});assert.equal(merged.report.scenes[5].blocks.amp.channel,'C');assert.equal(merged.report.scenes[5].blocks.amp.bypass,true);
const schema=JSON.parse(read('scripts/fm3-spec.schema.json')).oneOf.find(b=>b.properties?.baseProfile?.const==='jb-composer');assert.ok(schema.properties.scenes);assert.ok(schema.allOf[0].anyOf.some(x=>x.required?.includes('scenes')));
assert.ok(getComposerCapabilities(base).bases[0].fields.includes('scenes'));
const report={date:'2026-10-08',generator:'jb-composer-0.4.0',passed:true,wholeBodyCases,allSceneFieldsChecked:fields,bases:7,allEightScenes:true,partialUpdatesPreserved:true,inputsUnchanged:true,rejectedRequests:rejected,heldOutHardwareReproductions,musicalRhythmSoloBodyEqualsUserExport:true,unchangedDeviceBodyRecognizedWithoutRepeatExport:true,legacyConflictsRejected:true,insertedChannelActivationRequiresExplicitTemplate:true,finalSceneReportAndEffectiveControlsVerified:true,schema:'Structure and field coverage only; full schema validator not used',hardware:'New interface reproduces existing hardware-confirmed specimens exactly. Arbitrary new scene plans have offline tests, not blanket hardware/audio approval.'};
fs.writeFileSync(new URL('../../../docs/FM3_COMPOSER_SCENE_TESTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
