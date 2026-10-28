// Control Switch -> Amp switch bindings: template words, record placement next to the Wah and Volume
// bindings, fail-closed input, final-artifact tamper checks and the aggregate evidence receipt. Offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs,getPresetCapabilities} from './fm3-preset.mjs';
import {bindControlSwitches,controlSwitchEvidenceHash,isControlSwitchRecord,stripControlSwitchRecords,BASE_RECORD1} from './fm3-control-switches.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receiptBytes=fs.readFileSync(new URL('../references/fm3-control-switch-evidence-20261028.json',import.meta.url));
assert.equal(sha(receiptBytes),controlSwitchEvidenceHash);
const receipt=JSON.parse(receiptBytes);
// Aggregate receipt only: no preset names or files of the commercial corpus.
assert.ok(!/\.syx|LiveGold|Petrucci|Satriani/i.test(receiptBytes.toString()));
assert.equal(receipt.corpus.templateRecords+Object.values(receipt.corpus.nonTemplate).reduce((a,b)=>a+b,0),receipt.corpus.ampSwitchBindings);
assert.deepEqual(receipt.corpus.targetPids,{DISTORT_BRIGHT:41,DISTORT_BOOST:42,DISTORT_CUT:47,DISTORT_SATSWITCH:56,DISTORT_FAT:80});
const volumeEvidence=JSON.parse(fs.readFileSync(new URL('../references/fm3-volume-binding-evidence.json',import.meta.url)));
for(const i of [1,2,3,4,5,6,7,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24])assert.equal(volumeEvidence.binding.words[i],receipt.template[i],'Volume capture template word '+i);

const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const words=(b,r)=>Array.from({length:25},(_,i)=>b.readUInt16LE(1584+96*r+2*i));
const bodyOf=syx=>Buffer.from(inspectStructure(syx).raw.body);
const rewrite=(input,mutate)=>{const p=inspectStructure(input),b=Buffer.from(p.raw.body);mutate(b);return Buffer.from(reencodeDumpFromRawPatch(input,reencodeRawPatch(p.raw.rawPatch,b)));};
const switches=[{switch:2,block:'amp',param:'DISTORT_BOOST'},{switch:3,block:'amp',param:'DISTORT_BRIGHT'},{switch:4,block:'amp',param:'DISTORT_FAT'},{switch:5,block:'amp',param:'DISTORT_CUT'},{switch:6,block:'amp',param:'DISTORT_SATSWITCH'}];
const pid={DISTORT_BOOST:42,DISTORT_BRIGHT:41,DISTORT_FAT:80,DISTORT_CUT:47,DISTORT_SATSWITCH:56};
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'CS BIND CHECK',modifiers:{external1Wah:false}};
const spec={composer,layout:{row2:['drive','amp','cab'],row3:['delay','reverb']},controlSwitches:switches};
const {controlSwitches:_cs,...noSwitches}=spec;
const plain=createPreset(base,noSwitches),good=createPreset(base,spec);
const pb=bodyOf(plain.syx),gb=bodyOf(good.syx);
// Records 1..5 hold the template; every other body byte equals the same spec without bindings.
switches.forEach((c,k)=>{const w=words(gb,k+1),exp=[...receipt.template];exp[0]=49+c.switch;exp[8]=58;exp[9]=pid[c.param];assert.deepEqual(w,exp);assert.ok(isControlSwitchRecord(w));});
for(let o=0;o<gb.length;o++)if(gb[o]!==pb[o])assert.ok(o>=1584+96&&o<1584+96*5+50&&(o-1584)%96<42,'unexpected byte '+o);
assert.deepEqual(stripControlSwitchRecords(gb),pb);
assert.deepEqual(words(pb,1),[...BASE_RECORD1]);
assert.deepEqual(good.report.controlSwitches.map(s=>[s.switch,s.param,s.record,s.channelScope]),switches.map((c,k)=>[c.switch,c.param,k+1,'ALL']));
assert.deepEqual(good.report.stages.controlSwitches.records,[1,2,3,4,5]);
for(const line of ['CONTROL SWITCH SEOSED — LÕPPFAILIST','Control Switch 2 → amp Boost (DISTORT_BOOST); kanalid ALL; kirje 1;','Control Switch 6 → amp Saturation Switch (DISTORT_SATSWITCH); kanalid ALL; kirje 5;'])assert.ok(good.txt.includes(line),line);
const cap=getPresetCapabilities().controlSwitches;
assert.equal(cap.field,'controlSwitches');assert.equal(cap.evidence.sha256,controlSwitchEvidenceHash);assert.equal(cap.hardware.switching,'not tested');assert.equal(cap.hardware.thisFile,'not tested');assert.match(cap.hardware.storeReload,/^confirmed 2026-10-28/);

// Placement next to the Volume binding (record 0) and next to Wah (record 0) + Volume (record 1).
const vol={...spec,composer:{...composer,name:'CS VOL'},volumePan:true,volumePedal:true,layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']},controlSwitches:switches.slice(0,2)};
const wah={...vol,composer:{...composer,name:'CS WAH VOL',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}},layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']}};
const wahOnly={...wah,layout:{row2:['wah','drive','amp','cab'],row3:['delay','reverb']}};
for(const k of ['volumePan','volumePedal'])delete wahOnly[k];
const vr=createPreset(base,vol),wr=createPreset(base,wah),wo=createPreset(base,wahOnly);
assert.equal(vr.report.volumePedal.record,0);assert.deepEqual(vr.report.controlSwitches.map(s=>s.record),[1,2]);
assert.equal(wr.report.volumePedal.record,1);assert.deepEqual(wr.report.controlSwitches.map(s=>s.record),[2,3]);
assert.deepEqual(wo.report.controlSwitches.map(s=>s.record),[1,2]);
assert.deepEqual(readModifiers(bodyOf(wr.syx)).filter(m=>m.active).map(m=>[m.record,m.sourceName]),[[0,'External 1'],[1,'External 1'],[2,'Control Switch 2'],[3,'Control Switch 3']]);

// Fail-closed input; the base buffer is never modified.
let rejected=0;
const bad=(edit,re=/Control switches|Unknown field|unknown/)=>{const s=structuredClone(spec);edit(s);const before=Buffer.from(base);assert.throws(()=>createPreset(base,s),re);assert.deepEqual(base,before);rejected++;};
for(const v of [[],{},'x',null,true,Array(9).fill(switches[0])])bad(s=>s.controlSwitches=v);
for(const v of [0,7,'2',1.5,null])bad(s=>s.controlSwitches=[{...switches[0],switch:v}]);
for(const v of ['drive','cab','AMP',undefined])bad(s=>s.controlSwitches=[{...switches[0],block:v}]);
for(const v of ['DISTORT_GAIN','BOOST',42,'DISTORT_BOOSTLVL'])bad(s=>s.controlSwitches=[{...switches[0],param:v}]);
bad(s=>s.controlSwitches=[switches[0],{...switches[0],switch:3}]);
for(const v of ['E','a',1,null,'CHAN A'])bad(s=>s.controlSwitches=[{...switches[0],channel:v}]);
for(const v of ['true',1,null])bad(s=>s.controlSwitches=[{...switches[0],invert:v}]);
bad(s=>s.controlSwitches=[{...switches[0],min:0}]);
// A static write to a bound switch is refused by the dependency policy.
bad(s=>{s.allow=['enum-labels'];s.controls=[{block:'amp',channel:'A',param:'DISTORT_BOOST',value:'ON'}];},/modifier-controlled/);
// Writer refuses a record that is not in its base form and a target that is already bound.
assert.throws(()=>bindControlSwitches(good.syx,[switches[0]]),/already has an active modifier/);
const busy=rewrite(plain.syx,b=>{for(let r=1;r<32;r++)b.writeUInt16LE(7,1584+96*r+2*3);});
assert.throws(()=>bindControlSwitches(busy,[switches[0]]),/no unused modifier record/);
const r1changed=rewrite(plain.syx,b=>b.writeUInt16LE(1,1584+96+2*3));
assert.equal(bindControlSwitches(r1changed,[switches[0]]).writes[0].record,2,'changed record 1 is skipped, not overwritten');

// Variants: inverted Min/Max and a channel-limited binding (words 1/2 and 17 only).
const varSpec={...spec,composer:{...composer,name:'CS VARIANTS'},controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST',invert:true},{switch:3,block:'amp',param:'DISTORT_FAT',channel:'D'}]};
const vres=createPreset(base,varSpec),vb=bodyOf(vres.syx);
{const e1=[...receipt.template];e1[0]=51;e1[8]=58;e1[9]=42;e1[1]=65534;e1[2]=0;assert.deepEqual(words(vb,1),e1);
 const e2=[...receipt.template];e2[0]=52;e2[8]=58;e2[9]=80;e2[17]=4;assert.deepEqual(words(vb,2),e2);}
assert.deepEqual(vres.report.controlSwitches.map(x=>[x.invert,x.channelScope,x.min,x.max]),[[true,'ALL','ON (stored 65534)','OFF (stored 0)'],[false,'CHAN D','OFF (stored 0)','ON (stored 65534)']]);
assert.ok(vres.txt.includes('kanalid CHAN D; kirje 2;')&&vres.txt.includes('pööratud: Min ON, Max OFF'));
assert.deepEqual(stripControlSwitchRecords(vb),bodyOf(createPreset(base,{...noSwitches,composer:{...composer,name:'CS VARIANTS'}}).syx));
// A channel-limited binding leaves the other channels writable; the bound channel is refused.
const chOk={...varSpec,allow:['enum-labels'],controls:[{block:'amp',channel:'A',param:'DISTORT_FAT',value:'ON'}]};createPreset(base,chOk);
assert.throws(()=>createPreset(base,{...chOk,controls:[{block:'amp',channel:'D',param:'DISTORT_FAT',value:'ON'}]}),/modifier-controlled/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 control switch % ü '));let tamper=0;
try{
  const verify=(name,result,s)=>{const stem=path.join(temp,name);writePresetOutputs(stem,result,s);return verifyPresetOutputs(stem);};
  verify('good',good,spec);verify('variants',vres,varSpec);verify('variants-controls',createPreset(base,chOk),chOk);verify('vol',vr,vol);verify('wah',wr,wah);verify('wah-only',wo,wahOnly);verify('plain',plain,noSwitches);
  const fail=(name,change,src=good,s0=spec)=>{const r={...src,report:structuredClone(src.report)},s=structuredClone(s0);change(r,s);assert.throws(()=>verify(name,r,s),/Control|modifier|TXT|differs|Volume/);tamper++;};
  for(let i=0;i<25;i++)fail('word-'+i,r=>{r.syx=rewrite(good.syx,b=>b.writeUInt16LE(b.readUInt16LE(1584+96+2*i)^1,1584+96+2*i));r.report.outputSha256=sha(r.syx);});
  fail('extra-binding',r=>{r.syx=rewrite(good.syx,b=>{b.writeUInt16LE(50,1584+96*6);b.writeUInt16LE(58,1584+96*6+16);b.writeUInt16LE(47,1584+96*6+18);});r.report.outputSha256=sha(r.syx);});
  fail('foreign-active',r=>{r.syx=rewrite(good.syx,b=>b.writeUInt16LE(14,1584+96*7));r.report.outputSha256=sha(r.syx);});
  fail('state',r=>r.report.controlSwitches[0].record=4);
  fail('stage',r=>r.report.stages.controlSwitches.records=[1]);
  fail('stage-device',r=>r.report.stages.controlSwitches.deviceIO=true);
  fail('report-missing',r=>delete r.report.controlSwitches);
  fail('txt',r=>r.txt=r.txt.replace('Control Switch 2 → amp Boost','Control Switch 1 → amp Boost'));
  fail('switch-number',(_r,s)=>s.controlSwitches[0].switch=1);
  fail('invert-spec',(_r,s)=>s.controlSwitches[0].invert=true);
  fail('channel-spec',(_r,s)=>s.controlSwitches[0].channel='A');
  fail('variant-word',r=>{r.syx=rewrite(vres.syx,b=>b.writeUInt16LE(3,1584+96*2+2*17));r.report.outputSha256=sha(r.syx);},vres,varSpec);
  fail('unrequested',(r,s)=>{delete s.controlSwitches;delete r.report.controlSwitches;delete r.report.stages.controlSwitches;});
  fail('volume-moved',r=>{r.syx=rewrite(wr.syx,b=>{for(let i=0;i<25;i++){const a=b.readUInt16LE(1584+96+2*i),c=b.readUInt16LE(1584+96*2+2*i);b.writeUInt16LE(c,1584+96+2*i);b.writeUInt16LE(a,1584+96*2+2*i);}});r.report.outputSha256=sha(r.syx);},wr,wah);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,records:[1,2,3,4,5],withVolume:[1,2],withWahAndVolume:[2,3],invalidSpecs:rejected,crcValidTamperCases:tamper,evidenceTemplateRecords:receipt.corpus.templateRecords,deviceIO:false,storeReloadConfirmed:true,switchingTested:false}));
