// Modifier removal codec: FM3 removal form (words 0, 8, 9 -> 0), no compaction, refusals. Offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPreset} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {readModifiers} from './fm3-parameter-dependencies.mjs';
import {removeBinding,REMOVAL_WORDS} from './fm3-modifier-removal.mjs';
const receipt=JSON.parse(fs.readFileSync(new URL('../references/fm3-modifier-removal-20261028.json',import.meta.url)));
const c=receipt.corpus;
assert.equal(c.initialisedInactiveWithTargetCleared,c.initialisedInactiveRecords);assert.equal(c.initialisedInactiveWithTargetKept,0);
assert.ok(c.initialisedInactiveBetweenActive>0,'holes between active records: no compaction');
assert.deepEqual(REMOVAL_WORDS,[0,8,9]);
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'REMOVE CHECK',wahChannels:[{channel:'A',type:'FAS Wah'}],modifiers:{external1Wah:true}},
  volumePan:true,volumePedal:{min:1,max:9},layout:{row2:['wah','drive','amp','cab'],row3:['volpan','delay','reverb']},
  controlSwitches:[{switch:2,block:'amp',param:'DISTORT_BOOST',invert:true},{switch:3,block:'amp',param:'DISTORT_BRIGHT'}]};
const body=Buffer.from(inspectStructure(createPreset(base,spec).syx).raw.body);
const w=(b,r)=>Array.from({length:25},(_,i)=>b.readUInt16LE(1584+96*r+2*i));
// Remove the Volume binding (record 1): the Wah (0) and both switches (2, 3) keep their records.
const r=removeBinding(body,1),after=readModifiers(r.body);
assert.deepEqual(after.filter(m=>m.active).map(m=>m.record),[0,2,3]);
const was=w(body,1),now=w(r.body,1);
for(let i=0;i<25;i++)assert.equal(now[i],[0,8,9].includes(i)?0:was[i],'word '+i);
assert.equal(now[1],was[1]);assert.equal(now[2],was[2]);  // Min/Max kept, as in the FM3 form
for(let o=0;o<body.length;o+=2)if(!(o>=1584+96&&o<1584+96+20&&[0,16,18].includes(o-1584-96)))assert.equal(r.body.readUInt16LE(o),body.readUInt16LE(o));
assert.deepEqual(r.removed,{record:1,source:'External 1',effectId:102,pid:0,clearedWords:[0,8,9],previous:[14,102,0]});
// Refusals: inactive or unused records, out-of-range record numbers; input buffer untouched.
const copy=Buffer.from(body);
for(const rec of [5,31,-1,32,1.5])assert.throws(()=>removeBinding(body,rec),/Modifier removal/);
assert.throws(()=>removeBinding(r.body,1),/not an active/);
assert.deepEqual(body,copy);
console.log(JSON.stringify({passed:true,removalWords:REMOVAL_WORDS,remaining:after.filter(m=>m.active).map(m=>m.record),deviceIO:false}));
