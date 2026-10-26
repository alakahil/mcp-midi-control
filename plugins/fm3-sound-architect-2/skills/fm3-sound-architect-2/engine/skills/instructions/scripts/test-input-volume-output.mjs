// Adversarial four-file verification: valid CRC and updated artifact hashes
// must not hide writes outside the bounded Input/Volume contract.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from './fm3-preset.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {describeInputGate} from './fm3-input-gate.mjs';
import {describeVolumePan} from './fm3-volume.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch,decodeGen3PresetDump} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'INPUT VOLUME OUTPUT',modifiers:{external1Wah:false}},volumePan:true,
 layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']},controls:[{block:'in1',channel:'A',param:'THRESH',value:-65},{block:'volpan',channel:'A',param:'GAIN',value:7.5}],
 blockScenes:{volpan:[{scene:2,channel:'D'},{scene:3,bypass:true}]}};
const good=createPreset(base,spec),parsed=inspectStructure(good.syx),records=scanRecords(Buffer.from(parsed.raw.body)).records;
const input=records.find(r=>r.eid===37),volume=records.find(r=>r.eid===102);
const modifier=(body,eid,uncertain=false)=>{body.writeUInt16LE(1,1584);body.writeUInt16LE(uncertain?2:0,1586);body.writeUInt16LE(eid,1600);body.writeUInt16LE(0,1602);body.writeUInt16LE(0,1618)};
const cases=[
 ['volume header first reserved word',b=>b.writeUInt16LE(1,volume.header+2),/Volume header/],
 ['volume header last reserved word',b=>b.writeUInt16LE(1,volume.header+8),/Volume header/],
 ['input header',b=>b.writeUInt16LE(1,input.header+2),/Input record/],
 ['input impedance',b=>b.writeUInt16LE(1,input.start+8),/Input record/],
 ['input channel bypass',b=>b.writeUInt16LE(1,input.start+12),/Input record/],
 ['input untouched numeric word',b=>b.writeUInt16LE(99,input.start+20+10),/Input record/],
 ['input scene with matching report',b=>b.writeUInt16LE(1,input.header+10),/Input record/],
 ['input known type with matching report',b=>b.writeUInt16LE(0,input.start+14),/Input record/],
 ['volume active modifier',b=>modifier(b,102),/modifier-controlled/],
 ['volume uncertain modifier',b=>modifier(b,102,true),/modifier-controlled/],
 ['input active modifier',b=>modifier(b,37),/modifier-controlled/],
 ['input uncertain modifier',b=>modifier(b,37,true),/modifier-controlled/]
];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fm3 input volume output '));
try{
 writePresetOutputs(path.join(dir,'good'),good,spec);verifyPresetOutputs(path.join(dir,'good'));
 // Accept declared AUTO-SWELL while still rejecting a changed hidden VOLUME
 // word, even when the attacker refreshes CRC, artifact hashes and the report.
 const swellSpec={...spec,allow:['enum-labels'],controls:[{block:'volpan',channel:'A',param:'TYPE',value:'AUTO-SWELL'},{block:'volpan',channel:'A',param:'ATTACK',value:250}]};
 const swell=createPreset(base,swellSpec),sp=inspectStructure(swell.syx),sb=Buffer.from(sp.raw.body),sr=scanRecords(sb).records.find(r=>r.eid===102);
 writePresetOutputs(path.join(dir,'swell'),swell,swellSpec);verifyPresetOutputs(path.join(dir,'swell'));
 sb.writeUInt16LE(12345,sr.start); // hidden Gain must remain the captured default
 const changed=Buffer.from(reencodeDumpFromRawPatch(swell.syx,reencodeRawPatch(sp.raw.rawPatch,sb)));
 assert.equal(decodeGen3PresetDump(changed,17).crc_valid,true);
 const refreshed=structuredClone(swell.report);refreshed.outputSha256=sha(changed);refreshed.bytes=changed.length;refreshed.volumePan=describeVolumePan(sb,sr);
 writePresetOutputs(path.join(dir,'swell-tampered'),{...swell,syx:changed,report:refreshed},swellSpec);
 assert.throws(()=>verifyPresetOutputs(path.join(dir,'swell-tampered')),/Undeclared Volume word changed/);
 for(const [i,[name,mutate,error]] of cases.entries()){
  const body=Buffer.from(parsed.raw.body);mutate(body);
  const syx=Buffer.from(reencodeDumpFromRawPatch(good.syx,reencodeRawPatch(parsed.raw.rawPatch,body)));
  assert.equal(decodeGen3PresetDump(syx,17).crc_valid,true,name+' must have a valid CRC');
  const report=structuredClone(good.report);report.outputSha256=sha(syx);report.bytes=syx.length;
  // Give the attacker matching exposed Input state: the baseline contract must
  // still reject unrequested type/scene changes, not only stale report fields.
  report.inputGate=describeInputGate(body,input);
  const stem=path.join(dir,String(i));writePresetOutputs(stem,{...good,syx,report},spec);
  assert.throws(()=>verifyPresetOutputs(stem),error,name);
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log(JSON.stringify({passed:true,validPartialSceneEdits:true,crcValidRehashedRejections:cases.length,newHardwareMeasurements:0}));
