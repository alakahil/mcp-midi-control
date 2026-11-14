// Read-only STORE comparison, same byte boundaries as the historical controllers comparator.
import assert from 'node:assert/strict';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords} from './fm3-layout.mjs';
export function compareStoredPreset(expected,actual){
 const g=inspectStructure(expected),s=inspectStructure(actual);assert.equal(g.raw.crcValid,true,'expected CRC');assert.equal(s.raw.crcValid,true,'stored CRC');
 const a=Buffer.from(g.raw.body),b=Buffer.from(s.raw.body);assert.equal(a.length,b.length,'body length');
 const ar=scanRecords(a),br=scanRecords(b);assert.equal(new Set(br.records.map(r=>r.eid)).size,br.records.length,'duplicate record');
 assert.deepEqual(ar.records.map(r=>r.eid).sort((x,y)=>x-y),br.records.map(r=>r.eid).sort((x,y)=>x-y),'record set');
 assert.ok(a[0]<=7&&b[0]<=7,'selected scene in 0..7');
 assert.ok(a.subarray(1,ar.records[0].header).equals(b.subarray(1,br.records[0].header)),'prefix including controllers, modifier region, grid and names');
 for(const r of ar.records){const q=br.records.find(x=>x.eid===r.eid);assert.equal(q.size,r.size,'record shape');
  assert.ok(a.subarray(r.header,r.header+r.size).equals(b.subarray(q.header,q.header+q.size)),'record header/data '+r.eid);}
 assert.ok(a.subarray(ar.tail).equals(b.subarray(br.tail)),'system tail');
 return {dataPassed:true,bodyByteIdentical:a.equals(b),selectedScene:{expected:a[0]+1,stored:b[0]+1},
  reordered:ar.records.some((r,i)=>r.eid!==br.records[i].eid),records:ar.records.length,
  allowedDifferences:['selected-scene byte 0','whole-record ordering','SysEx destination header'],audioConfirmed:false};
}
