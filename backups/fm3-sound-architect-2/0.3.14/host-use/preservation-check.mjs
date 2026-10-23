import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='/workspace/scratch/f678d3fbe33c/research/host-forward-0314';
const engine=dir+'/published-package/skills/fm3-sound-architect-2/engine/skills/instructions';
const {inspectStructure}=await import(engine+'/scripts/drive-collector/fm3-prototype.mjs');
const {scanRecords,readGrid,GRID}=await import(engine+'/scripts/fm3-layout.mjs');
const {finalSoundState}=await import(engine+'/scripts/fm3-final-state.mjs');
const base=fs.readFileSync(engine+'/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx');
const output=fs.readFileSync(dir+'/FM3_WAH_EXACT.syx');
const before=inspectStructure(base),after=inspectStructure(output);
const b=Buffer.from(before.raw.body),a=Buffer.from(after.raw.body);
const br=scanRecords(b),ar=scanRecords(a);
const records=br.records.map(r=>{
 const s=ar.records.find(x=>x.eid===r.eid); assert.ok(s); assert.equal(s.size,r.size);
 const identical=b.subarray(r.header,r.header+r.size).equals(a.subarray(s.header,s.header+s.size));
 assert.ok(identical,r.family+' changed'); return {effectId:r.eid,family:r.family,bytes:r.size,identical};
});
const bs=finalSoundState(base,[]),as=finalSoundState(output,[]);
assert.equal(as.name,'FM3 WAH EXACT');
assert.equal(bs.selectedScene,as.selectedScene);
for(let i=0;i<8;i++){
 const actual=structuredClone(as.scenes[i]); const wah=actual.blocks.wah;
 assert.equal(wah.channel,'A'); assert.equal(wah.bypass,true); assert.equal(wah.type,'FAS Wah');
 delete actual.blocks.wah; assert.deepEqual(actual,bs.scenes[i]);
}
const bg=readGrid(b),ag=readGrid(a),gridDiff=[];
for(let i=0;i<bg.length;i++)if(JSON.stringify(bg[i])!==JSON.stringify(ag[i]))gridDiff.push({before:bg[i],after:ag[i]});
assert.equal(gridDiff.length,1); assert.equal(gridDiff[0].before.row,1);assert.equal(gridDiff[0].before.col,2);
assert.equal(gridDiff[0].before.id,1025);assert.equal(gridDiff[0].after.id,94);assert.equal(gridDiff[0].before.mask,gridDiff[0].after.mask);
const prefixDiff=[];for(let i=0;i<br.records[0].header;i++)if(b[i]!==a[i])prefixDiff.push({offset:i,before:b[i],after:a[i]});
const gridIdOffset=GRID.start+2*16+1*4;
assert.ok(prefixDiff.every(d=>[1584,1587,1588,1589,gridIdOffset,gridIdOffset+1].includes(d.offset)),'Unexpected prefix difference');
assert.equal(a.readUInt16LE(1584),14);assert.equal(a.readUInt16LE(1586),16384);assert.equal(a.readUInt16LE(1588),42401);
assert.equal(a.readUInt16LE(1600),94);assert.equal(a.readUInt16LE(1602),5);assert.equal(a.readUInt16LE(1618),0);
const tailPreserved=b.subarray(br.tail).equals(a.subarray(ar.tail));assert.ok(tailPreserved);
const result={passed:true,name:as.name,originalBodyBytes:b.length,outputBodyBytes:a.length,existingRecords:records,existingSceneNamesChannelsBypassPreserved:true,selectedScene:as.selectedScene,wahAllEightScenes:{channel:'A',type:'FAS Wah',bypass:true},gridDiff,prefixDiff,systemTailPreserved:tailPreserved,exactWords:{source:14,min:16384,max:42401,effectId:94,pid:5,channel:0}};
fs.writeFileSync(dir+'/preservation-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
