// Receipt for the 2026-10-24 grid mask bit-4 check (FM3_BIT4_CHECK.py, test 7, audit point 5). Offline.
// Usage: node tools/fm3/bit4-check-ingest.mjs [RAW_RESULTS.json FACTORY_DIR] [--write]
// With RAW_RESULTS + FACTORY_DIR (maintainer only): the pack is rebuilt to the device run's hash, the
// stored dumps are decoded (CRC) and the FACTS are written to the pinned file. The pinned file holds no
// preset dump and no grid layout (factory content stays out of the repo): only the target cells,
// the equality checks and the user's notes. Without arguments CI checks the pinned file and receipt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const PIN=path.join(ENG,'references/fm3-bit4-check-20261024-facts.json'),TARGET=path.join(ENG,'references/fm3-bit4-check-20261024.json');
const sha=b=>createHash('sha256').update(b).digest('hex'),write=process.argv.includes('--write');
const [rawFile,factory]=process.argv.slice(2).filter(a=>!a.startsWith('--'));
if(rawFile){
  const {parsePresetDump,decodeRawPatch}=await import(path.join(ENG,'scripts/drive-collector/fm3-codec.mjs'));
  const raw=JSON.parse(fs.readFileSync(rawFile,'utf8')),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-b4-'));
  execFileSync('node',[path.join(ROOT,'tools/fm3/bit4-check-build.mjs'),factory,tmp],{stdio:'ignore'});
  assert.equal(sha(fs.readFileSync(path.join(tmp,'manifest.json'))),raw.packSha256,'bit-4 pack rebuilt identically');
  const m=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json'),'utf8'));
  const items=raw.items.map(x=>{const it=m.items.find(i=>i.id===x.id),fr=x.storedDumpFrames.map(h=>Buffer.from(h,'hex'));
    const p=parsePresetDump(Buffer.concat(fr.filter(f=>[0x77,0x78,0x79].includes(f[5]))),0,17),d=decodeRawPatch(p.chunkPayloads),b=Buffer.from(d.body);
    const g=[];for(let r=0;r<4;r++)for(let c=0;c<12;c++){const o=260+c*16+r*4;g.push([r,c,b.readUInt16LE(o),b.readUInt16LE(o+2)]);}
    const sc=g.find(q=>q[0]===it.cell.row-1&&q[1]===it.cell.col-1);
    return {id:x.id,shownLocation:x.shownLocation,cell:it.cell,userSelected:x.userSelected,
      stored:{crcValid:d.crcValid,locationIndex:(p.headerPayload[0]<<7)|p.headerPayload[1],cell:sc.slice(2),gridEqualsFactory:JSON.stringify(g)===JSON.stringify(it.expectedGrid)},
      live:{cell:x.liveCell,gridEqualsFactory:x.gridEqualsFactory},userLayout:x.userLayout};});
  const facts={kind:'fm3-bit4-check-facts',date:'2026-10-24',packSha256:raw.packSha256,factoryBit4Cells:m.allBit4Cells.length,items};
  fs.writeFileSync(PIN,JSON.stringify(facts,null,1)+'\n');fs.rmSync(tmp,{recursive:true,force:true});
}
const f=JSON.parse(fs.readFileSync(PIN,'utf8'));
assert.equal(f.items.length,4);
for(const x of f.items){
  assert.ok(x.stored.crcValid&&x.stored.locationIndex===x.shownLocation-1,'stored dump of the selected location '+x.id);
  assert.ok(x.stored.gridEqualsFactory&&x.live.gridEqualsFactory,'device grid = FW10 factory grid incl. bit 4: '+x.id);
  assert.deepEqual(x.stored.cell,[x.cell.id,x.cell.mask]);assert.deepEqual(x.live.cell,[x.cell.id,x.cell.mask]);assert.ok(x.cell.mask&16);
  assert.ok(x.userLayout.length>10,'user described the LAYOUT cell '+x.id);}
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-24',auditPoint:5,
  method:'No preset sent. The user selected four factory locations whose FW10 grid has a mask bit-4 cell; each was read with fn=0x03 (stored, CRC checked) and the live grid with fn=0x01 sub=0x2E; the user described the LAYOUT cell.',
  findings:['On fw 13 the stored factory presets still carry bit 4 (value 16) on exactly the FW10 cells, and the live grid read returns it unchanged.',
    'The LAYOUT screen shows only the ordinary cables of mask bits 0..3 at those cells (user descriptions below); nothing marks bit 4.',
    'Bit 4 therefore has no visible meaning on the device; its audio effect is not measured. The generator keeps never writing it.'],
  factoryBit4Cells:f.factoryBit4Cells,
  items:f.items.map(x=>({shownLocation:x.shownLocation,row:x.cell.row,col:x.cell.col,what:x.cell.what,mask:x.cell.mask,inputsFromRows:x.cell.inputsFromRows,userLayout:x.userLayout})),
  notMeasured:['audio effect of bit 4','what operation in the editor or on the device sets it'],factsSha256:sha(fs.readFileSync(PIN))};
const content=JSON.stringify(out,null,1)+'\n';
if(write)fs.writeFileSync(TARGET,content);else assert.equal(fs.readFileSync(TARGET,'utf8'),content,'bit-4 receipt stale');
console.log(JSON.stringify({items:f.items.length,deviceEqualsFactory:true,bit4Visible:false}));
