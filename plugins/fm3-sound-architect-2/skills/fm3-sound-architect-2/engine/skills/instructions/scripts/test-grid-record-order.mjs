// Grid-mode recordOrder (0.3.70): append is the unchanged default; device moves only whole added records to the device
// order (evidence in fm3-record-order.mjs), keeps kept records, Out 2 and all bytes; fail-closed input. Offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {editRecords} from './fm3-grid.mjs';
import {orderGridRecords} from './fm3-grid-record-order.mjs';
import {knownOrder} from './fm3-record-order.mjs';
const NL=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const body=s=>Buffer.from(inspectStructure(s).raw.body),eids=s=>scanRecords(body(s)).records.map(r=>r.eid);
const recs=s=>{const b=body(s);return new Map(scanRecords(b).records.map(r=>[r.eid,b.subarray(r.header,r.header+r.size).toString('hex')]))};
let refusals=0;const no=(f,re)=>{assert.throws(f,re);refusals++};
// 1. The 2026-11-13 observation (an FM3 factory preset with parallel rows) is in the receipt: Mixer between In 1 and Out 1.
assert.equal(knownOrder(37,126),-1);assert.equal(knownOrder(126,42),-1);assert.equal(knownOrder(126,129),-1);assert.equal(knownOrder(130,95),-1);
// 2. Stage: append keeps the file; device moves Mixer, appends Drive 2 (no evidence), keeps everything else.
const ed=editRecords(NL,{remove:['send','return'],duplicate:['drive2'],add:['mixer']}),added=[{block:'mixer',effectId:126},{block:'drive2',effectId:119}];
const kept=eids(NL).filter(e=>e!==186&&e!==182);
assert.deepEqual(eids(ed.syx),[...kept,126,119]);
const ap=orderGridRecords(ed.syx,added,'append');assert.equal(ap.moved,false);assert.ok(Buffer.from(ap.syx).equals(Buffer.from(ed.syx)));
const dv=orderGridRecords(ed.syx,added,'device'),o=eids(dv.syx);assert.equal(dv.moved,true);
assert.ok(o.indexOf(126)===o.indexOf(37)+1&&o.indexOf(42)===o.indexOf(126)+1&&o.at(-1)===119,'Mixer between In 1 and Out 1, Drive 2 last: '+o);
assert.deepEqual(o.filter(e=>kept.includes(e)),kept);
assert.deepEqual(dv.recordOrder.placed.map(p=>[p.block,p.by]),[['mixer','device order'],['drive2','appended']]);
{const a=recs(ed.syx),b=recs(dv.syx);assert.ok(a.size===b.size&&[...a].every(([e,h])=>b.get(e)===h),'same records');
 const x=body(ed.syx),y=body(dv.syx),sx=scanRecords(x),sy=scanRecords(y);assert.equal(x.length,y.length);
 assert.ok(x.subarray(0,4610).equals(y.subarray(0,4610))&&x.subarray(sx.tail).equals(y.subarray(sy.tail)),'prefix and tail unchanged');}
assert.ok(Buffer.from(orderGridRecords(dv.syx,added,'device').syx).equals(Buffer.from(dv.syx)),'idempotent');
// Out 2 stays directly after Out 1.
{const e2=editRecords(NL,{duplicate:['out2'],add:['mixer']}),d2=orderGridRecords(e2.syx,[{block:'mixer',effectId:126},{block:'out2',effectId:43}],'device'),q=eids(d2.syx);
 assert.ok(q.indexOf(43)===q.indexOf(42)+1&&q.indexOf(126)===q.indexOf(42)-1,'Out 2 follows Out 1: '+q);}
no(()=>orderGridRecords(ed.syx,added,'sorted'),/recordOrder must be/);
no(()=>orderGridRecords(ed.syx,[{block:'plex',effectId:178}],'device'),/not in the preset/);
no(()=>orderGridRecords(ed.syx,[...added,added[0]],'device'),/listed twice/);
no(()=>orderGridRecords(ed.syx,[{block:'mixer'}],'device'),/added must list/);
// 3. Full pipeline: the default grid output is unchanged by the new field; device differs only in record order; four files verify.
const e=()=>Array(12).fill('');
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'GRID ORDER TEST',modifiers:{external1Wah:false},
  reverbChannels:[{channel:'A',type:'Room: Recording Studio A'}],driveChannels:[{channel:'A',type:'T808 OD'}],delayChannels:[{channel:'A',type:'Digital Stereo'}],
  scenes:Array.from({length:8},(_,i)=>({scene:i+1,name:'S'+(i+1)}))},
 grid:{rows:[e(),['in1','drive','amp','cab','delay','-','mixer','-','-','-','-','out1'],['','','','','-','reverb','','','','','',''],e()],links:[{row:3,col:5,from:[2]},{row:2,col:7,from:[2,3]}]},
 remove:['send','return'],insert:['mixer'],selectedScene:1,
 context:{guitar:'Ibanez AS-120',pickups:'humbucker',output:'OUT1 stereo FOH'},purpose:'Grid record order test.'};
const plain=createPreset(NL,spec),app=createPreset(NL,{...spec,recordOrder:'append'}),dev=createPreset(NL,{...spec,recordOrder:'device'});
assert.ok(Buffer.from(plain.syx).equals(Buffer.from(app.syx)),'append equals the default');
assert.equal(plain.report.stages.records.recordOrder,undefined,'default report unchanged');
assert.equal(dev.report.stages.records.recordOrder.mode,'device');assert.deepEqual(dev.report.stages.records.recordOrder.placed.map(p=>p.by),['device order']);
{const a=recs(plain.syx),b=recs(dev.syx);assert.ok(a.size===b.size&&[...a].every(([k,h])=>b.get(k)===h),'pipeline: same records');
 assert.notDeepEqual(eids(plain.syx),eids(dev.syx));const q=eids(dev.syx);assert.equal(q.indexOf(126),q.indexOf(37)+1);}
no(()=>createPreset(NL,{...spec,recordOrder:'sorted'}),/recordOrder needs insert/);
no(()=>createPreset(NL,{...spec,insert:undefined,remove:['send','return'],grid:{rows:[e(),['in1','drive','amp','cab','delay','reverb','-','-','-','-','-','out1'],e(),e()]},recordOrder:'device'}),/recordOrder needs insert/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-grid-order-'));
try{const stem=path.join(tmp,'G');writePresetOutputs(stem,dev,{...spec,recordOrder:'device'});verifyPresetOutputs(stem);
 // Tamper: swapping two records back (append order) no longer matches the validated output.
 fs.writeFileSync(stem+'.syx',Buffer.from(plain.syx));assert.throws(()=>verifyPresetOutputs(stem));refusals++;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,stage:true,pipeline:true,out2AfterOut1:true,refusals,hardwareConfirmed:false}));
