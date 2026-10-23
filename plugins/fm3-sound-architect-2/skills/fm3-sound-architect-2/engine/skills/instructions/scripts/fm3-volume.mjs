// Append one captured Volume/Pan 1 record. Existing graph remains two-row only.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid} from './fm3-layout.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),check=(v,m)=>{if(!v)throw Error(m);};
const evidenceBytes=fs.readFileSync(new URL('../references/fm3-volume-donor.json',import.meta.url));
check(sha(evidenceBytes)==='74724bdc22ebb7bbf6f5b89c491ae2daacc13974e814fba3343a77dd9362663e','Volume capture receipt drift');
const evidence=JSON.parse(evidenceBytes);
export const volumeRecordHash='fdf6204515c4d9e2c42b26be4ed26603becc571a1ec040f48a75d6e08b640ecc';
export const volumeCaptureHash='e6537e4a8f86b7bb9d125e341567b7c5b354afac65fc4f325a8580d0d8a06356';
const record=Buffer.from(evidence.recordHex,'hex');
check(sha(record)===volumeRecordHash&&evidence.captureSha256===volumeCaptureHash,'Volume donor hash mismatch');
check(record.length===166&&record.readUInt16LE(0)===102&&record.readUInt16LE(42)===15&&record.readUInt16LE(44)===4,'Volume donor shape mismatch');
for(let ch=0;ch<4;ch++)check(record.readUInt16LE(46+ch*30+18)===0,'Volume donor is not VOLUME');
export function insertVolumePan(syx){
 const before=inspectStructure(syx),body=Buffer.from(before.raw.body),scan=scanRecords(body),grid=readGrid(body);
 check(!scan.records.some(r=>r.eid===102)&&!grid.some(g=>g.id===102),'Volume/Pan 1 already exists');
 check(grid.filter(g=>g.row===0||g.row===3).every(g=>g.id===0&&g.mask===0),'Volume insertion requires existing two-row graph');
 const target=grid.find(g=>g.row===2&&g.col===1&&g.id>=1024)??grid.find(g=>[1,2].includes(g.row)&&g.col>=1&&g.col<=10&&g.id>=1024);
 check(target,'No free inner shunt for Volume/Pan 1');
 const offset=260+target.col*16+target.row*4,prefix=Buffer.from(body.subarray(0,scan.tail));prefix.writeUInt16LE(102,offset);
 const expected=Buffer.concat([prefix,record,body.subarray(scan.tail)]);
 const output=Buffer.from(reencodeDumpFromRawPatch(syx,reencodeRawPatch(before.raw.rawPatch,expected))),after=inspectStructure(output),actual=Buffer.from(after.raw.body),next=scanRecords(actual);
 check(actual.equals(expected),'Volume insertion body readback differs');
 check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(after.parsed.headerPayload)),'Volume insertion changed dump header');
 check(after.decoded.preset_name===before.decoded.preset_name,'Volume insertion changed name');
 check(next.records.length===scan.records.length+1&&next.tail===scan.tail+166,'Volume insertion record count/size mismatch');
 for(const r of scan.records)check(body.subarray(r.header,r.header+r.size).equals(actual.subarray(r.header,r.header+r.size)),'Volume insertion changed existing record');
 check(body.subarray(scan.tail).equals(actual.subarray(next.tail)),'Volume insertion changed system tail');
 return {syx:output,report:{stage:'captured Volume/Pan 1 insertion',effectId:102,header:scan.tail,recordSha256:volumeRecordHash,captureSha256:volumeCaptureHash,
  temporaryGridCell:{row:target.row+1,col:target.col+1,oldId:target.id,newId:102},outputSha256:sha(output),bodyReadback:true,existingRecordsPreserved:true,systemTailPreserved:true,
  hardwareScope:'One captured FW13 default record; new locations, parameters and scene edits remain software-checked',newPhysicalScaleMeasurements:0}};
}
export function describeVolumePan(body,r){
 if(!r)return null;check(r.eid===102&&r.words===15&&r.channels===4,'Unsupported Volume record');
 return {effectId:102,header:r.header,wordCount:15,channels:4,donorRecordSha256:volumeRecordHash,captureSha256:volumeCaptureHash,
  states:Array.from({length:4},(_,ch)=>({channel:'ABCD'[ch],typeRaw:body.readUInt16LE(r.start+ch*30+18),words:Array.from({length:15},(_,pid)=>body.readUInt16LE(r.start+ch*30+2*pid))})),
  scenes:Array.from({length:8},(_,i)=>({scene:i+1,channel:'ABCD'[body.readUInt16LE(r.header+10+i*2)]??'unknown',bypassRaw:body.readUInt16LE(r.header+26+i*2)})),
  fullRangeEncodingProven:false,storeReloadProven:false,newPhysicalScaleMeasurements:0};
}
