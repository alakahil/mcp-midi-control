// Literal fixture offsets are the oracle, independent of the context scanner.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {auditModifiers,renderModifierAuditText} from './fm3-modifier-audit.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=p=>fs.readFileSync(new URL('../examples/'+p,import.meta.url));
const variants=[
  ['JB_YDOM_RHYTHM.syx',10132],['JB_RHYTHM_LEVEL_MINUS3.syx',10132],
  ['JB_RHYTHM_LEVEL_MINUS3_export.syx',10132],['FM3_TREMOLO_ABCD_TEST_export.syx',10044],
  ['FM3_ROTARY_A_TEST_export.syx',10036],['FM3_PITCH_ABCD_TEST_export.syx',10780]
];
let sceneFields=0;
for(const [file,at] of variants){
  const bytes=read(file),copy=Buffer.from(bytes),body=Buffer.from(inspectStructure(bytes).raw.body),audit=auditModifiers(bytes);
  assert.deepEqual(bytes,copy);assert.equal(audit.contextScan.status,'complete');
  const c=audit.modifiers[0].targetContext;
  assert.equal(c.recordPresence,'present');assert.equal(c.gridPresence,'present');assert.equal(c.recordHeader,at);
  assert.equal(c.sceneStatus,'known');assert.equal(c.scenes.length,8);assert.equal(c.issues.length,0);
  assert.deepEqual(c.channelMatchedScenes,[1,2,3,4,5,6,7,8]);
  assert.deepEqual(c.channelMatchedNotBypassedScenes,[],'held-out Wah is bypassed in all scenes');
  for(let i=0;i<8;i++){
    assert.equal(c.scenes[i].scene,i+1);
    assert.equal(c.scenes[i].channelRaw,body.readUInt16LE(at+10+2*i));
    assert.equal(c.scenes[i].bypassRaw,body.readUInt16LE(at+26+2*i));
    assert.equal(c.scenes[i].channel,'ABCD'[body.readUInt16LE(at+10+2*i)]);
    assert.equal(c.scenes[i].bypass,body.readUInt16LE(at+26+2*i)===1);
    sceneFields+=4;
  }
  assert.ok(renderModifierAuditText(audit).includes('See ei kinnita seose toimimist ega kuuldavust.'));
}
const newlook=auditModifiers(read('JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
assert.equal(newlook.contextScan.status,'complete');assert.equal(newlook.modifiers[0].active,false);
assert.equal(newlook.modifiers[0].targetContext.recordPresence,'absent');
assert.equal(newlook.modifiers[0].targetContext.gridPresence,'absent');
assert.equal(newlook.modifiers[0].targetContext.channelMatchedScenes,null);
assert.deepEqual(newlook.modifiers[0].targetContext.scenes,[]);
assert.ok(newlook.modifiers[0].issues.includes('target-record-absent'));
assert.ok(renderModifierAuditText(newlook).includes('Sihtploki parameetrikirje: puudub; ruudustikus: puudub.'));
assert.ok(newlook.modifiers.slice(1).every(m=>m.targetContext===null));
const base=read('JB_RHYTHM_LEVEL_MINUS3_export.syx'),decoded=inspectStructure(base),original=Buffer.from(decoded.raw.body);
function synthetic(change){const body=Buffer.from(original);return Buffer.from(reencodeDumpFromRawPatch(base,reencodeRawPatch(decoded.raw.rawPatch,change(body)??body)));}
const run=change=>auditModifiers(synthetic(change));
const modifierWord=(b,p,v)=>{b.writeUInt16LE(v,1584+2*p);};
// A/B/C/D and ALL against eight distinct channel/bypass assignments.
for(const modifierChannel of [0,1,2,3,4,65535]){
  const a=run(b=>{
    modifierWord(b,17,modifierChannel);
    for(let i=0;i<8;i++){b.writeUInt16LE(i%4,10142+2*i);b.writeUInt16LE(i<4?0:1,10158+2*i);}
  }),c=a.modifiers[0].targetContext;
  assert.deepEqual(c.scenes.map(s=>s.channel),['A','B','C','D','A','B','C','D']);
  assert.deepEqual(c.channelMatchedScenes,modifierChannel===0?[1,2,3,4,5,6,7,8]:modifierChannel>4?[]:[modifierChannel,modifierChannel+4]);
  assert.deepEqual(c.channelMatchedNotBypassedScenes,modifierChannel===0?[1,2,3,4]:modifierChannel>4?[]:[modifierChannel]);
  if(modifierChannel>4)assert.ok(c.scenes.every(s=>s.modifierChannelMatches===null));
}
const unknownScenes=run(b=>{b.writeUInt16LE(7,10142);b.writeUInt16LE(2,10160);});
assert.equal(unknownScenes.modifiers[0].targetContext.sceneStatus,'uncertain');
assert.equal(unknownScenes.modifiers[0].targetContext.scenes[0].channel,null);
assert.equal(unknownScenes.modifiers[0].targetContext.scenes[0].modifierChannelMatches,null);
assert.equal(unknownScenes.modifiers[0].targetContext.scenes[1].bypass,null);
assert.ok(unknownScenes.modifiers[0].issues.includes('unknown-target-scene-channel'));
assert.ok(unknownScenes.modifiers[0].issues.includes('unknown-target-scene-bypass'));
assert.ok(renderModifierAuditText(unknownScenes).includes('tundmatu bypass [2]'));
// Grid and parameter record are separate facts. Grid coordinates are 1-based.
const c=auditModifiers(base).modifiers[0].targetContext;
assert.deepEqual(c.gridCells,[{row:2,column:3,routeMask:2}]);
const unplaced=run(b=>{b.writeUInt16LE(0,296);}).modifiers[0];
assert.equal(unplaced.targetContext.recordPresence,'present');assert.equal(unplaced.targetContext.gridPresence,'absent');
assert.ok(unplaced.issues.includes('target-not-in-grid'));
const duplicateGrid=run(b=>{b.writeUInt16LE(94,260);}).modifiers[0];
assert.equal(duplicateGrid.targetContext.gridPresence,'ambiguous');assert.ok(duplicateGrid.issues.includes('duplicate-target-grid-cell'));
const duplicateRecord=run(b=>Buffer.concat([b.subarray(0,10378),b.subarray(10132,10378),b.subarray(10378)])).modifiers[0];
assert.equal(duplicateRecord.targetContext.recordPresence,'ambiguous');assert.deepEqual(duplicateRecord.targetContext.scenes,[]);
// Truncated/unsupported scans and a changed tail must never report absence.
for(const mutate of [
  b=>{b.writeUInt16LE(65535,4610);},
  b=>{b.writeUInt16LE(65535,6702);},
  b=>{b[b.length-1]^=1;},
  b=>b.subarray(0,10378),
  b=>Buffer.concat([b.subarray(0,10378),b.subarray(10132,10178)])
]){
  const a=run(mutate);assert.equal(a.contextScan.status,'unavailable');
  assert.equal(a.modifiers[0].targetContext.recordPresence,'unknown');
  assert.deepEqual(a.modifiers[0].targetContext.scenes,[]);
  assert.ok(!a.modifiers[0].issues.includes('target-record-absent'));
  assert.equal(a.summary.serializedRecords,32,'base modifier audit remains available');
}
const unsupported=run(b=>{modifierWord(b,8,37);modifierWord(b,9,0);}).modifiers[0];
assert.equal(unsupported.targetContext.recordPresence,'present');assert.deepEqual(unsupported.targetContext.scenes,[]);
assert.ok(unsupported.issues.includes('target-scene-layout-unsupported'));
// The four newer effect families use the existing, independently pinned exports.
for(const [file,eid,at] of [
  ['FM3_PEQ_BASELINE.syx',54,8688],['FM3_GEQ_BASELINE.syx',50,8308],
  ['FM3_ENHANCER_BASELINE.syx',122,7460],['FM3_NEWLOOK_FILTER_TEST_export.syx',114,7568]
]){
  const input=read(file),i=inspectStructure(input),body=Buffer.from(i.raw.body);
  modifierWord(body,8,eid);modifierWord(body,9,0);
  const audit=auditModifiers(Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(i.raw.rawPatch,body))));
  assert.equal(audit.contextScan.status,'complete',file);
  assert.equal(audit.modifiers[0].targetContext.recordHeader,at,file);
  assert.equal(audit.modifiers[0].targetContext.scenes.length,8,file);
}
console.log(JSON.stringify({passed:true,pinnedBases:7,sceneFields,additionalEffectFixtures:4,channelScopes:6,
  unknownLayoutsRemainUnknown:5,inputPreserved:true,deviceIO:false,newHardwareMeasurements:false}));
