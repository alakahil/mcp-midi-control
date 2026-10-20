// Captured full-channel templates + explicit semantic expectations. All edits
// below create synthetic test inputs; none are device or authoring evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {auditModifiers,renderModifierAuditText} from './fm3-modifier-audit.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {findParam} from './fm3-table-encoder.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const standard='JB_RHYTHM_LEVEL_MINUS3_export.syx';
// Literal fixture data offsets/widths, independent of the production scan.
const fixtures={
  chorus:[standard,6748,32],compressor:[standard,7050,37],delay:[standard,7392,89],
  flanger:[standard,8150,33],drive:[standard,8460,44],phaser:[standard,9238,35],
  reverb:[standard,9564,71],wah:[standard,10178,25],
  tremolo:['FM3_TREMOLO_ABCD_TEST_export.syx',9868,22],
  rotary:['FM3_ROTARY_A_TEST_export.syx',9868,21],pitch:['FM3_PITCH_ABCD_TEST_export.syx',8928,114]
};
function run(slug,param,models=null,edit=()=>{},scope=0){
  const [file,start,words]=fixtures[slug],input=read('examples/'+file),decoded=inspectStructure(input);
  const body=Buffer.from(decoded.raw.body),p=findParam(slug,param);
  body.writeUInt16LE(p.block,1600);body.writeUInt16LE(p.param,1602);body.writeUInt16LE(scope,1618);
  if(models){
    const library=JSON.parse(read('references/'+slug+'-library.json'));
    models.forEach((name,ch)=>{
      const model=library.models.find(m=>m.name===name||m.binaryId===name);assert.ok(model,'missing fixture '+slug+'/'+name);
      assert.equal(model.words.length,words);
      model.words.forEach((v,pid)=>body.writeUInt16LE(v,start+2*(ch*words+pid)));
    });
  }
  const word=(ch,pid,raw)=>body.writeUInt16LE(raw,start+2*(ch*words+pid));edit(word,body);
  const syx=Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(decoded.raw.rawPatch,body))),copy=Buffer.from(syx);
  const audit=auditModifiers(syx);assert.deepEqual(syx,copy,'audit changed input');
  assert.equal(audit.contextScan.status,'complete');assert.equal(audit.presetWritten,false);assert.equal(audit.deviceIO,false);
  assert.equal(audit.typePolicy.families.length,11);assert.equal(audit.typePolicy.grantsWritePermission,false);
  const m=audit.modifiers[0],a=m.targetApplicability;
  assert.equal(a.modifierSupportVerified,false);assert.equal(a.status,'evaluated');
  assert.deepEqual(a.channels.map(c=>c.channel),['A','B','C','D']);
  assert.deepEqual(m.words,Array.from({length:25},(_,i)=>body.readUInt16LE(1584+2*i)));
  return {audit,m,a};
}
const status=result=>result.a.channels.map(c=>c.status);
const A='available',E='excluded',U='unknown';
const repeat=x=>[x,x,x,x];
let cases=0;
function check(slug,param,models,expected,edit,scope){const r=run(slug,param,models,edit,scope);assert.deepEqual(status(r),expected,slug+'/'+param);cases++;return r;}
check('chorus','BASS',[2,0,2,0],[A,E,A,E]);
const drive=check('drive','TONE',[19,6,19,6],[E,A,E,A]);
assert.deepEqual(drive.a.scopedExcludedChannels,['A','C']);assert.ok(drive.m.issues.includes('target-type-excluded'));
const scoped=check('drive','TONE',[19,6,19,6],[E,A,E,A],undefined,2);
assert.deepEqual(scoped.a.scopedExcludedChannels,[]);assert.ok(!scoped.m.issues.includes('target-type-excluded'));
assert.deepEqual(scoped.a.channels.map(c=>c.inModifierScope),[false,true,false,false]);
const unknownScope=check('drive','TONE',[19,6,19,6],[E,A,E,A],undefined,65535);
assert.equal(unknownScope.a.scopeKnown,false);assert.ok(unknownScope.a.channels.every(c=>c.inModifierScope===null));
check('delay','TIMER',repeat('Stereo Tape'),repeat(E)); // Name is not algorithm 6 or Dual.
check('delay','TIME',repeat('Stereo Tape'),[U,A,A,A],w=>w(0,7,3)); // valid enum, wrong model/selector pair
check('reverb','DIFFUSION',repeat('Spring: British Spring'),[E,A,U,E],w=>{w(0,66,0);w(1,66,1);w(2,66,2);w(3,66,0);});
check('flanger','MANUAL',repeat('Digital Mono'),repeat(A));
check('phaser','MANUAL',['Barber Pole','Digital Mono','Barber Pole','Digital Mono'],[E,A,E,A]);
check('compressor','RATIO',['Compander','Modern VCA Compressor','Compander','Modern VCA Compressor'],[E,A,E,A]);
check('wah','BIAS',['Paragon','Clyde','Paragon','Clyde'],[E,A,E,A]);
check('wah','CONTROL',repeat('Paragon'),repeat(A));
check('tremolo','WIDTH',['Panner','VCA Trem','Panner','VCA Trem'],[A,E,A,E]);
check('tremolo','DEPTH',repeat('VCA Trem'),[U,A,A,A],w=>w(0,0,65535));
const rotary=check('rotary','RATE',null,repeat(A),w=>w(0,0,65535));
assert.equal(rotary.a.channels[0].typeId,null);assert.deepEqual(rotary.a.channels[0].selectorWords,{});
check('pitch','NOTE8',repeat('Dual Diatonic'),[A,E,U,E],w=>{
  for(let ch=0;ch<4;ch++)w(ch,9,17);
  w(0,63,8);w(1,63,4);w(2,63,9);w(3,9,0);
});
check('pitch','NOTE2',repeat('Dual Diatonic'),[U,A,A,A],w=>{
  for(let ch=0;ch<4;ch++){w(ch,9,17);w(ch,63,4);}w(0,9,65535);
});
const fixed=check('pitch','TONIC',repeat('Dual Diatonic'),repeat(E));
assert.ok(fixed.a.channels.every(c=>c.blockedReason));
const selector=check('wah','TYPE',repeat('Clyde'),repeat(A));
assert.ok(selector.a.channels.every(c=>c.templateOnly));
check('chorus','BASS',repeat(2),[U,A,A,A],w=>w(0,0,65535));
// Unknown context and families never acquire a type verdict.
const original=read('examples/'+standard),decoded=inspectStructure(original);
function synthetic(change){const b=Buffer.from(decoded.raw.body);return auditModifiers(Buffer.from(reencodeDumpFromRawPatch(original,reencodeRawPatch(decoded.raw.rawPatch,change(b)??b))));}
for(const [mutate,reason] of [
  [b=>{b[b.length-1]^=1;},'target-record-unresolved'],
  [b=>Buffer.concat([b.subarray(0,10378),b.subarray(10132,10378),b.subarray(10378)]),'target-record-unresolved'],
  [b=>{b.writeUInt16LE(58,1600);b.writeUInt16LE(0,1602);},'family-not-covered'],
  [b=>{b.writeUInt16LE(65535,1602);},'target-parameter-unknown']
]){
  const a=synthetic(mutate).modifiers[0].targetApplicability;
  assert.equal(a.status,'unresolved');assert.equal(a.reason,reason);assert.deepEqual(a.channels,[]);
}
const absent=auditModifiers(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
assert.equal(absent.modifiers[0].targetApplicability.reason,'target-record-unresolved');
assert.ok(absent.modifiers.slice(1).every(m=>m.targetApplicability===null));
for(const file of ['JB_YDOM_RHYTHM.syx','JB_RHYTHM_LEVEL_MINUS3.syx',standard,'FM3_TREMOLO_ABCD_TEST_export.syx','FM3_ROTARY_A_TEST_export.syx','FM3_PITCH_ABCD_TEST_export.syx']){
  const audit=auditModifiers(read('examples/'+file));assert.deepEqual(audit.modifiers[0].targetApplicability.channels.map(c=>c.status),repeat(A));
  assert.equal(audit.summary.recordsWithIssues,0);assert.deepEqual(audit.modifiers[0].targetContext.channelMatchedNotBypassedScenes,[]);
}
const txt=renderModifierAuditText(drive.audit);
assert.ok(txt.includes('A: välistatud; BB Pre'));assert.ok(txt.includes('seose ulatus jah'));
assert.ok(txt.includes('ei kinnita modifikaatori tuge'));assert.ok(txt.includes('globaalseid skaalaväärtusi ei kontrollita'));
console.log(JSON.stringify({passed:true,families:11,semanticCases:cases,channels:'ABCD',unknownContextCases:5,pinnedBases:7,inputPreserved:true,deviceIO:false,newHardwareMeasurements:false}));
