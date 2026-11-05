import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {context,candidate} from './fm3-p3-modifier-reuse.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {checkSchema} from './fm3-schema-check.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-public-p3-'));
const body=r=>Buffer.from(inspectStructure(r.syx).raw.body),sha=b=>createHash('sha256').update(b).digest('hex');
const c=context(),seed=structuredClone(c.seedSpec);
const remove={operation:'remove',record:2,expect:{source:'Control Switch 2',block:'amp',param:'DISTORT_BOOST'}};
const replace={operation:'replace',record:1,expect:{source:'External 1',block:'volpan',param:'VOLUME_GAIN'},binding:{switch:2,block:'amp',param:'DISTORT_CUT'}};
const spec={...seed,modifierEdits:[remove,replace]};let positive=0,negative=0,tamper=0;
function good(s){assert.deepEqual(checkSchema('fm3-sound.schema.json',s),[]);const r=createPreset(base,s),stem=path.join(tmp,'case-'+positive++);writePresetOutputs(stem,r,s);verifyPresetOutputs(stem);return {r,stem};}
try{
 const {r,stem}=good(spec),oracle=candidate();assert.deepEqual(r.syx,oracle.syx,'P3 research replay agrees');
 assert.deepEqual(r.syx,fs.readFileSync(new URL('../references/p3-modifier-reuse-20261030/FM3_P3_REMOVE_REUSE.syx',import.meta.url)),'stored historical P3 SYX is the independent byte oracle');
 assert.deepEqual(readModifiers(body(r)).filter(m=>m.active).map(m=>m.record),[0,1,3,4]);
 assert.ok(!r.report.volumePedal&&!r.txt.includes('EXTERNAL 1 → VOLUME/PAN 1 — LÕPPFAILIST'));
 assert.deepEqual(r.report.controlSwitches.map(c=>c.param).sort(),['DISTORT_BRIGHT','DISTORT_CUT','DISTORT_FAT']);
 assert.ok(r.txt.includes('Kirje 2:')&&r.txt.includes('Kirje 1:'));
 const reversed=good({...spec,modifierEdits:[replace,remove]}).r;assert.deepEqual(reversed.syx,r.syx,'request order does not allocate or move slots');
 // Remove a CS while retaining the custom Volume binding; only the three removal words may change.
 const removal=structuredClone(seed);delete removal.controlSwitchScenes;removal.modifierEdits=[remove];
 const removed=good(removal).r,clean=structuredClone(removal);delete clean.modifierEdits;
 const before=body(createPreset(base,clean)),after=body(removed),allowed=new Set([0,8,9].flatMap(w=>[1584+96*2+2*w,1584+96*2+2*w+1]));
 for(let i=0;i<before.length;i++)if(before[i]!==after[i])assert.ok(allowed.has(i),'removal changed another byte');
 assert.ok(removed.report.volumePedal&&removed.txt.includes('EXTERNAL 1 → VOLUME/PAN 1 — LÕPPFAILIST'));
 // Replacement variants use the existing CS template codec; remaining slots never move.
 const variant=structuredClone(spec);variant.modifierEdits[1].binding.invert=true;variant.modifierEdits[1].binding.channel='D';
 const vr=good(variant).r;assert.equal(vr.report.controlSwitches.find(x=>x.record===1).channelScope,'CHAN D');
 const volumeOnly=structuredClone(seed);delete volumeOnly.controlSwitchScenes;volumeOnly.modifierEdits=[{...replace,operation:'remove'}];delete volumeOnly.modifierEdits[0].binding;
 const vol=good(volumeOnly).r;assert.equal(readModifiers(body(vol))[1].active,false);
 const last=structuredClone(seed);delete last.controlSwitchScenes;delete last.volumePedal;last.controlSwitches=[seed.controlSwitches[0]];last.modifierEdits=[{...remove,record:1}];
 const lr=good(last).r;assert.ok(!lr.report.controlSwitches);assert.deepEqual(readModifiers(body(lr)).filter(x=>x.active).map(x=>x.record),[0]);
 // Final-state dependency: an explicit static control is allowed only after its old binding is removed.
 const freed=structuredClone(removal);freed.allow=['enum-labels'];freed.controls=[{block:'amp',channel:'D',param:'DISTORT_BOOST',value:'ON'}];good(freed);
 // The CS-to-CS replacement path retains the custom Volume binding and uses
 // the replacement's source/channel, not the old binding's settings.
 const csReplace=structuredClone(removal);csReplace.modifierEdits[0]={...remove,operation:'replace',binding:{switch:5,block:'amp',param:'DISTORT_CUT',invert:true,channel:'B'}};
 const cr=good(csReplace).r;assert.ok(cr.report.volumePedal);assert.equal(cr.report.controlSwitches.find(x=>x.record===2).switch,5);
 // Volume alone occupies record 0. Editing a separate CS must preserve it too.
 const volumeAlone=structuredClone(removal);volumeAlone.composer.modifiers.external1Wah=false;volumeAlone.modifierEdits[0].record=1;
 const va=good(volumeAlone).r;assert.equal(va.report.volumePedal.record,0);
 const bad=[
  s=>s.modifierEdits=[],s=>s.modifierEdits=null,s=>s.modifierEdits[0].record=0,s=>s.modifierEdits[0].record=10,s=>s.modifierEdits[0].record='2',
  s=>s.modifierEdits[0].record=3,s=>s.modifierEdits[0].expect.source='Control Switch 1',s=>s.modifierEdits[0].expect.param='DISTORT_GAIN',
  s=>s.modifierEdits[0].expect.block='cab',s=>s.modifierEdits[0].expect.secondarySource=0,s=>s.modifierEdits[0].extra=true,
  s=>s.modifierEdits[0].operation='reuse',s=>s.modifierEdits[0].binding=replace.binding,s=>delete s.modifierEdits[1].binding,
  s=>s.modifierEdits.push(structuredClone(s.modifierEdits[0])),s=>s.modifierEdits[1].binding.param='DISTORT_BRIGHT',
  s=>s.modifierEdits[1].binding.switch=7,s=>s.modifierEdits[1].binding.channel='E',s=>s.modifierEdits[1].binding.invert='true',
  s=>s.modifierEdits[1].expect.source='LFO 1',s=>delete s.volumePedal,s=>s.composer.modifiers.external1Wah=false,
  s=>{s.modifierEdits=[remove];}, // CS2 scene declarations would be orphaned.
  s=>{s.controlSwitchScenes=[];s.footswitches=[{layout:1,switch:1,function:'latching',controlSwitch:6}];},
  s=>{s.allow=['enum-labels'];s.controls=[{block:'amp',channel:'A',param:'DISTORT_CUT',value:'ON'}];}
 ];
 for(const edit of bad){const s=structuredClone(spec);edit(s);assert.throws(()=>createPreset(base,s));negative++;}
 // Re-hash tampered files as an adversary could; deterministic replay must still reject them.
 const original=Object.fromEntries(['.syx','.txt','.spec.json','.validation.json'].map(ext=>[ext,fs.readFileSync(stem+ext)]));
 function altered(edit){
  for(const [ext,bytes] of Object.entries(original))fs.writeFileSync(stem+ext,bytes);
  const report=JSON.parse(original['.validation.json']);edit(report);
  for(const ext of ['.syx','.txt','.spec.json']){const bytes=fs.readFileSync(stem+ext);report.artifacts[ext]={sha256:sha(bytes),bytes:bytes.length};}
  report.outputSha256=sha(fs.readFileSync(stem+'.syx'));fs.writeFileSync(stem+'.validation.json',JSON.stringify(report));
  assert.throws(()=>verifyPresetOutputs(stem));tamper++;
 }
 altered(report=>report.modifierEdits.changes[0].after[0]=51);
 altered(report=>report.stages.modifierEdits.recordCount=31);
 altered(report=>report.hardware='confirmed');
 altered(()=>fs.appendFileSync(stem+'.txt','\nHardware confirmed\n'));
 altered(()=>{const s=structuredClone(spec);s.modifierEdits[1].binding.invert=true;fs.writeFileSync(stem+'.spec.json',JSON.stringify(s));});
 altered(()=>{const b=Buffer.from(original['.syx']);b[20]^=1;fs.writeFileSync(stem+'.syx',b);});
 console.log(JSON.stringify({passed:true,positiveCases:positive,rejectedInputs:negative,rehashedTamperCases:tamper,historicalP3SyxByteIdentical:true,deviceIO:false}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
