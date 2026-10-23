// Regression for scanRecords block instances and single-channel records. Offline.
// Evidence (structure only, no factory values kept): device FW13 exports of factory
// presets 155/163/249/370 (2026-10-23) carry Delay 2 = 71, Volume 2 = 103, Filter 2 = 115,
// Drive 2 = 119, Comp 2 = 47 with the base block's word count, and Looper 166 as 24×1;
// FW10 factory banks carry Ring Mod/Megatap/Resonator as ×2 records.
// Before this fix the scan stopped at the first such record and treated the rest as tail.
import fs from 'node:fs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,blockOf} from './fm3-layout.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const body=Buffer.from(inspectStructure(fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url))).raw.body);
const base=scanRecords(body);check(base.tail===8960&&body.readUInt16LE(base.tail)===201,'Base tail must start at the system record 201');
const delay=base.records.find(r=>r.eid===70);check(delay&&delay.words===89,'Base delay record');
const rec=(eid,words,channels)=>{const b=Buffer.alloc(46+2*words*channels);b.writeUInt16LE(eid,0);b.writeUInt16LE(words,42);b.writeUInt16LE(channels,44);return b};
const delay2=Buffer.from(body.subarray(delay.header,delay.header+delay.size));delay2.writeUInt16LE(71,0);
const splice=(...recs)=>Buffer.concat([body.subarray(0,base.tail),...recs,body.subarray(base.tail)]);
// 1. instance and single-channel records are scanned, the system tail is found after them
const extra=[delay2,rec(166,24,1),rec(191,7,4),rec(129,21,4),rec(150,13,2),rec(43,26,4)];
const s=scanRecords(splice(...extra));
check(s.records.length===base.records.length+extra.length,'All inserted records scanned');
const add=s.records.slice(-extra.length).map(r=>`${r.family}:${r.block}:${r.instance}:${r.words}x${r.channels}`).join(' ');
check(add==='delay2:70:2:89x4 eid166:166:1:24x1 eid191:191:1:7x4 eid129:126:4:21x4 eid150:150:1:13x2 out2:42:2:26x4','Instance mapping: '+add);
check(s.tail===base.tail+extra.reduce((n,r)=>n+r.length,0),'Tail after inserted records');
// 2. wrong dimensions stop the scan (treated as tail, never misparsed)
for(const [r,why] of [[rec(166,24,4),'Looper with 4 channels'],[rec(150,13,4),'Ring Mod with 4 channels'],[rec(71,88,4),'instance with wrong word count'],[rec(209,10,4),'unknown effect ID']])
  check(scanRecords(splice(r)).tail===base.tail,why+' must stop the scan');
// 3. instance rule never crosses into a block the dictionary lists on its own
check(blockOf(191).block===191&&blockOf(190).block===190&&blockOf(47).block===46&&blockOf(119).instance===2&&blockOf(38).block===37&&blockOf(41)===null,'blockOf');
console.log(JSON.stringify({instances:'delay2,mixer4',channels:'looper×1,ringmod×2',stops:4}));
