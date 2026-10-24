// Build the grid mask bit-4 check pack (FM3_BIT4_CHECK.py, audit point 5). Offline, read-only research.
// Finds every FW10 factory grid cell whose input mask has bit 4 (value 16) and picks four cases
// (a lone shunt in one serial row, a shunt merge, an Out 1 merge, a block merge). The pack holds
// STRUCTURE only (location, the 48 cell ids and masks), never parameter values or preset files.
// The user selects each factory location on the FM3; the collector reads it back.
// Usage: node tools/fm3/bit4-check-build.mjs FACTORY_DIR OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {banks} from './factory_structure_evidence.mjs';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const {parsePresetDump,decodeRawPatch}=await import(new URL(E+'scripts/drive-collector/fm3-codec.mjs',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [dir,out]=process.argv.slice(2);assert.ok(dir&&out,'Usage: bit4-check-build.mjs FACTORY_DIR OUT_DIR');
const all=[];
for(const [bi,[f,h]] of Object.entries(banks).entries()){
  const b=fs.readFileSync(path.join(dir,f));assert.equal(sha(b),h,f);
  for(let i=0;i<128;i++){const raw=decodeRawPatch(parsePresetDump(b.subarray(i*24680,(i+1)*24680),0,17).chunkPayloads);assert.ok(raw.crcValid);
    const body=Buffer.from(raw.body),grid=[];
    for(let r=0;r<4;r++)for(let c=0;c<12;c++){const o=260+c*16+r*4;grid.push([r,c,body.readUInt16LE(o),body.readUInt16LE(o+2)]);}
    for(const [r,c,id,m] of grid)if(m&16)all.push({index:bi*128+i,bank:'ABC'[bi],row:r+1,col:c+1,id,mask:m,from:[0,1,2,3].filter(k=>m>>k&1).map(k=>k+1),grid});}}
assert.equal(all.length,8,'factory bit-4 cells');
const pick=[108,121,82,210].map(ix=>all.find(x=>x.index===ix));
const describe=x=>x.id>=1024?'shunt':x.id===42?'Out 1':'block '+x.id;
const items=pick.map((x,n)=>({id:'B'+(n+1),index:x.index,shownLocation:x.index+1,bank:x.bank,cell:{row:x.row,col:x.col,what:describe(x),id:x.id,mask:x.mask,inputsFromRows:x.from},
  rowCellsInUse:[1,2,3,4].filter(r=>x.grid.some(g=>g[0]===r-1&&g[2])),expectedGrid:x.grid,storedDumpRequest:hex(R.storedDumpRequest(x.index))}));
fs.mkdirSync(out,{recursive:true});
const manifest={kind:'fm3-bit4-check',version:1,date:'2026-10-24',source:'FW10 factory banks (structure only), '+Object.keys(banks).join(', '),
  allBit4Cells:all.map(x=>({index:x.index,shownLocation:x.index+1,row:x.row,col:x.col,id:x.id,mask:x.mask})),gridRequest:hex(R.gridRequest()),
  method:'No preset is sent. The user selects each factory location on the FM3 front panel (no store); the script reads that location with the read-only fn=0x03 dump request and the live grid with fn=0x01 sub=0x2E, then asks what the LAYOUT screen shows at the cell.',
  items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify(items.map(i=>`${i.id}: shown ${i.shownLocation} row ${i.cell.row} col ${i.cell.col} ${i.cell.what} mask ${i.cell.mask} from rows ${i.cell.inputsFromRows}`)));
