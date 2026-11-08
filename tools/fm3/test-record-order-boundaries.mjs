// Insert/append/grid invariants, including unknown and inconsistent-order inputs. Offline only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const imp=f=>import(path.join(E,'scripts',f+'.mjs'));
const {insertBlocks,INSERTABLE}=await imp('fm3-insert-blocks');
const {editRecords,GRID_ADDABLE}=await imp('fm3-grid');
const {placeRecords,knownOrder}=await imp('fm3-record-order');
const {inspectStructure}=await imp('drive-collector/fm3-prototype');
const {scanRecords}=await imp('fm3-layout');
const base=fs.readFileSync(path.join(E,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const body=x=>Buffer.from(inspectStructure(x).raw.body),original=body(base),before=scanRecords(original),baseIds=before.records.map(r=>r.eid);
const recordMap=b=>new Map(scanRecords(b).records.map(r=>[r.eid,b.subarray(r.header,r.header+r.size).toString('hex')]));
const ordered=m=>[...m].sort(([a],[b])=>a-b);
const compare=blocks=>{
 const device=insertBlocks(base,blocks),append=insertBlocks(base,blocks,{recordOrder:'append'}),a=body(device.syx),b=body(append.syx),ar=scanRecords(a),br=scanRecords(b);
 assert.deepEqual(ordered(recordMap(a)),ordered(recordMap(b)),blocks+' data identical in both modes');
 assert.ok(a.subarray(0,4610).equals(b.subarray(0,4610)),'same grid/scene/modifier/controller prefix');
 assert.ok(a.subarray(ar.tail).equals(original.subarray(before.tail))&&b.subarray(br.tail).equals(original.subarray(before.tail)),'system tail unchanged');
 for(const [eid,bytes] of recordMap(original))assert.equal(recordMap(a).get(eid),bytes,'base record unchanged '+eid);
 assert.deepEqual(ar.records.filter(r=>baseIds.includes(r.eid)).map(r=>r.eid),baseIds,'base relative order preserved');
 assert.deepEqual(br.records.map(r=>r.eid),[...baseIds,...blocks.map(k=>INSERTABLE[k])],'append is exactly request order');
 for(const inserted of device.inserted.filter(r=>r.recordOrder==='device order')){
  const order=ar.records.map(r=>r.eid),index=order.indexOf(inserted.effectId);
  for(const eid of baseIds){assert.notEqual(knownOrder(eid,inserted.effectId),0,'device placement has evidence against base');
   assert.equal(order.indexOf(eid)<index,knownOrder(eid,inserted.effectId)===-1);}
 }
};
const names=Object.keys(INSERTABLE);let singles=0,pairs=0,gridChecks=0;
for(const a of names){compare([a]);singles++;for(const b of names)if(a!==b){compare([a,b]);pairs++;}}
const unknown=999;
assert.equal(knownOrder(unknown,74),0);assert.deepEqual(placeRecords(baseIds,[unknown]).order,[...baseIds,unknown]);
assert.deepEqual(placeRecords([unknown,...baseIds],[74]).order,[unknown,...baseIds,74],'unknown existing record blocks inferred placement');
const inconsistent=[42,118],copy=[...inconsistent];
assert.deepEqual(placeRecords(inconsistent,[74]),{order:[42,118,74],placed:[{eid:74,index:2,by:'appended'}]},'inconsistent base is not sorted or guessed');
assert.deepEqual(inconsistent,copy,'input untouched');
assert.deepEqual(placeRecords(baseIds,[]).order,baseIds);
assert.throws(()=>placeRecords(baseIds,[74],'sort'),/recordOrder must/);
assert.throws(()=>insertBlocks(base,['multidelay','multidelay']),/twice/);
assert.throws(()=>insertBlocks(base,['unknown']),/Unknown/);
// Grid keeps its own original append policy; it does not adopt device insertion ordering.
for(const [name,eid] of Object.entries(GRID_ADDABLE)){
 const b=body(editRecords(base,{add:[name]}).syx),r=scanRecords(b);
 assert.deepEqual(r.records.map(x=>x.eid),[...baseIds,eid],'grid append '+name);
 assert.ok(b.subarray(0,4610).equals(original.subarray(0,4610)),'grid record addition does not yet route cells');
 for(const [id,bytes] of recordMap(original))assert.equal(recordMap(b).get(id),bytes,'grid preserves record '+id);
 assert.ok(b.subarray(r.tail).equals(original.subarray(before.tail)));gridChecks++;
}
const out={passed:true,singleInsertions:singles,orderedInsertionPairs:pairs,gridAdditions:gridChecks,
 checks:['device versus append: entire record bytes equal','base relative order and bytes preserved','same grid/controller/modifier prefix','system tail preserved','unknown record falls back to append','inconsistent base not reordered','invalid mode/duplicate/unknown block rejected','grid retains its separate append policy'],
 scope:'Software invariants on the verified NewLook base plus pure ordering edge cases; no arbitrary-base authoring or new hardware/CPU/audio claim.',deviceIO:false,newHardwareMeasurements:false};
assert.equal(singles,11);assert.equal(pairs,110);assert.equal(gridChecks,14);
const file=path.join(ROOT,'docs/fm3/parameter-evidence/record-order-boundaries.json');
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');else assert.deepEqual(JSON.parse(fs.readFileSync(file)),out,'record-order boundary result stale');
console.log(JSON.stringify(out));
