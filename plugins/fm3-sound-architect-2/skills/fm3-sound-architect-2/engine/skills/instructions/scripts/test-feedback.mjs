// Feedback Return writes (0.3.51, T29): controls with block "return" write Return Level, Output Level and Balance
// of the Feedback Return record (effect id 186) that links row 2 to row 3, and nothing else.
// Replays the T29 readings of references/fm3-shot-t29-feedback-20261105.json: the FS1 display values give exactly
// the words the FM3 held and FM3-Edit showed. Feedback Send writes are refused (no user-editable parameter; the FM3
// clears its words on load), as are Return Bypass Mode/Bypass, channels B-D and the schema/generator mismatches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {composeSound} from './fm3-sound.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {feedbackCapabilities,RETURN_WRITABLE} from './fm3-feedback.mjs';
import {findParam,decodeValue} from './fm3-table-encoder.mjs';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const receipt=JSON.parse(fs.readFileSync(new URL('../references/fm3-shot-t29-feedback-20261105.json',import.meta.url)));
const composer={schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FDBK TEST',compressorChannels:[{channel:'A',type:'Optical Compressor'}]};
const layout={row2:['compressor','drive','amp','cab'],row3:['delay','reverb']};
const body=syx=>Buffer.from(inspectStructure(syx).raw.body);
const ret=b=>scanRecords(b).records.find(r=>r.eid===186);
const plain=composeSound(base,{composer,layout}),b0=body(plain.syx),r0=ret(b0);
assert.equal(r0.family,'return');assert.equal(r0.words,6);assert.equal(r0.channels,1);
assert.deepEqual([...Array(6).keys()].map(i=>b0.readUInt16LE(r0.start+2*i)),receipt.runs.FS0.returnDevice,'composer default = FS0 device words');
// FS1 readings: value as FM3-Edit showed it -> the stored word the FM3 held.
const fs1=receipt.editorReadings.filter(r=>r.preset==='FS1'&&Object.values(RETURN_WRITABLE).includes(r.param));
assert.equal(fs1.length,3);
const controls=fs1.map(r=>({block:'return',channel:'A',param:r.param.replace('FDBKRET_',''),value:Number(/^-?[\d.]+/.exec(r.shown)[0])}));
const out=composeSound(base,{composer,layout,controls}),b1=body(out.syx),r1=ret(b1),changed=new Set();
assert.equal(r1.start,r0.start);
for(const r of fs1){
  const off=r1.start+2*r.pid;changed.add(off);changed.add(off+1);
  assert.equal(b1.readUInt16LE(off),receipt.runs.FS1.returnDevice[r.pid],r.param);
  const shown=/^-?\d+(?:\.(\d+))?/.exec(r.shown);assert.equal(decodeValue(findParam('FDBKRET',r.param),b1.readUInt16LE(off)).toFixed((shown[1]??'').length),shown[0],r.param);
}
for(let i=0;i<b0.length;i++)if(!changed.has(i))assert.equal(b1[i],b0[i],'collateral byte '+i);
assert.equal(out.report.generator,'fm3-sound-0.3.62');
assert.match(out.txt,/return A Return Level \(FDBKRET_RETLEVEL\)/);
// Grid mode: the same Return record is written.
const grid=composeSound(base,{composer,grid:{rows:[Array(12).fill(''),['in1','compressor','drive','-','amp','cab','-','-','-','-','-','send'],['return','delay','-','-','reverb','-','-','-','-','-','-','out1'],Array(12).fill('')]},
  controls:[{block:'return',channel:'A',param:'PAN',value:-50}]});
const bg=body(grid.syx);assert.equal(bg.readUInt16LE(ret(bg).start+4),Math.round(0.25*65534));
// Refusals.
const refuse=[[{block:'send',channel:'A',param:0,value:0},/Feedback Send has no user editable parameters/],
  [{block:'send',channel:'A',param:'SENDLEVEL',value:50},/Feedback Send/],
  [{block:'return',channel:'B',param:'RETLEVEL',value:50},/Channel absent/],
  [{block:'return',channel:'A',param:'BYPASS',value:0},/only Return Level, Output Level and Balance/],
  [{block:'return',channel:'A',param:'BYPASSMODE',value:'Thru'},/only Return Level, Output Level and Balance/],
  [{block:'return',channel:'A',param:'GLOBALMIX',value:0},/not writable|only Return Level/],
  [{block:'return',channel:'A',param:'RETLEVEL',value:101},/outside/],
  [{block:'return',channel:'A',param:'LEVEL',value:30},/outside/]];
for(const [c,re] of refuse)assert.throws(()=>composeSound(base,{composer,layout,allow:['enum-labels'],controls:[c]}),re,JSON.stringify(c));
// Saved bundle verifies, and a tampered Return word is refused.
const spec={composer,layout,controls:[{block:'return',channel:'A',param:'LEVEL',value:-6}]};
const good=createPreset(base,spec),dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-feedback-'));
try{
  const stem=path.join(dir,'good');writePresetOutputs(stem,good,spec);verifyPresetOutputs(stem);
  const bad={...spec,controls:[{block:'return',channel:'A',param:'LEVEL',value:-7}]},t=path.join(dir,'bad');
  writePresetOutputs(t,good,bad);assert.throws(()=>verifyPresetOutputs(t));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
const cap=feedbackCapabilities();assert.equal(cap.hardwareReceipt.editorReadings,8);assert.deepEqual(cap.writable,['FDBKRET_RETLEVEL','FDBKRET_LEVEL','FDBKRET_PAN']);
console.log(JSON.stringify({passed:true,readingsReplayed:fs1.length,refusals:refuse.length,changedBytesOnly:true,bundleRoundTrip:true}));
