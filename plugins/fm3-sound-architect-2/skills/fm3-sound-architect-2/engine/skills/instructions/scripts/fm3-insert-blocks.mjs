// Audit point 6: insert blocks that no composer base carries (Plex, Multiband, Synth, Looper,
// Gate, Formant, Ten-Tap, Megatap, Ring Mod, Resonator). Volume/Pan 1 uses fm3-volume.mjs (volumePan). Offline only; no device I/O.
//
// Donor: the user's own FW13 export of an <EMPTY> preset after adding one fresh block of each
// family (2026-10-23, references/fm3-default-blocks-20261023.syx), paired with the export of the
// same preset before (references/fm3-empty-preset-20261023.syx). The pair differs only by the
// appended records and their grid cells; all four channels of every record are identical, i.e.
// device defaults. Scene fields of a freshly added block are NOT defaults (the device keeps
// scenes 2-8 from the last preset that used the block), so every insertion writes all 8 scenes:
// channel A, bypassed, exactly like the NewLook composer. Use blockScenes to engage it.
import {createHash} from 'node:crypto';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords,readGrid,SHUNT_MIN,GRID} from './fm3-layout.mjs';
import {readComposerFile} from './fm3-composer-components.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const RECORDS_START=4610;
const gridAt=(row,col)=>GRID.start+col*16+row*4;
export const INSERT_DONOR=Object.freeze({file:'references/fm3-default-blocks-20261023.syx',sha256:'dc382d6ded7dafc6889abc19edb5763a1b8e483bec841879108ded68423e49af',
  empty:'references/fm3-empty-preset-20261023.syx',emptySha256:'220866f7866d9f515a98b36b2430de6e5a69ae378e58426bc86f3bc417ea7e14'});
export const INSERTABLE=Object.freeze({plex:178,multiband:154,synth:130,looper:166,gate:146,formant:98,tentap:158,megatap:138,ringmod:150,resonator:162});
// Type/mode selector per family (dictionary), for the final text report only.
export const INSERT_TYPE_PID=Object.freeze({plex:0,gate:14,tentap:0,resonator:0});
export const GATED=Object.freeze({
  volume:'Volume/Pan 1 has its own inserter and policy: use volumePan:true (fm3-volume.mjs)',
  volpan:'Volume/Pan 1 has its own inserter and policy: use volumePan:true (fm3-volume.mjs)',
  mixer:'Mixer combines parallel rows; the two-row layout is serial, use grid mode (spec.grid, audit point 5)',
  multiplexer:'Multiplexer selects between parallel rows; use grid mode (spec.grid, audit point 5)',
  scenemidi:'Scene MIDI (MIDI block, eid 190) carries no audio: use grid mode (spec.grid) with insert:["scenemidi"] and spec.sceneMidi'});

let donorCache=null;
export function insertDonor(){
  if(donorCache)return donorCache;
  const bytes=readComposerFile(INSERT_DONOR.file),empty=readComposerFile(INSERT_DONOR.empty);
  check(sha(bytes)===INSERT_DONOR.sha256&&sha(empty)===INSERT_DONOR.emptySha256,'Insert donor changed');
  const body=Buffer.from(inspectStructure(bytes).raw.body),base=Buffer.from(inspectStructure(empty).raw.body);
  const {records,tail}=scanRecords(body,{requireAmpCab:false}),before=scanRecords(base,{requireAmpCab:false});
  check(before.records.length===0&&before.tail===RECORDS_START,'Empty donor baseline must hold no records');
  // Removing every donor record and its grid cell must reproduce the empty export byte for byte.
  const prefix=Buffer.from(body.subarray(0,RECORDS_START));
  for(const g of readGrid(body))if(g.id&&g.id<SHUNT_MIN){check(g.mask===0,'Donor cells are unconnected');prefix.writeUInt16LE(0,gridAt(g.row,g.col));}
  check(Buffer.concat([prefix,body.subarray(tail)]).equals(base),'Donor pair differs outside the added blocks');
  const byEid=new Map();
  for(const r of records){
    const per=2*r.words,chs=Array.from({length:r.channels},(_,c)=>body.subarray(r.start+c*per,r.start+(c+1)*per));
    check(chs.every(c=>c.equals(chs[0])),'Donor record channels differ; not device defaults: '+r.eid);
    byEid.set(r.eid,Buffer.from(body.subarray(r.header,r.start+r.channels*per)));
  }
  for(const eid of Object.values(INSERTABLE))check(byEid.has(eid),'Donor lacks effect '+eid);
  return donorCache={byEid,records:records.map(r=>({eid:r.eid,words:r.words,channels:r.channels}))};
}

// blocks: ['plex','gate',...]; each is appended after the last record (device behaviour in the
// donor export) and takes the first free serial shunt of rows 2/3 in reading order.
export function insertBlocks(syx,blocks){
  check(Array.isArray(blocks)&&blocks.length>0,'insert must be a non-empty array of block names');
  check(new Set(blocks).size===blocks.length,'A block is inserted twice');
  for(const b of blocks){check(typeof b==='string','Block names must be strings');check(!GATED[b],`${b}: not insertable — ${GATED[b]}`);check(Object.hasOwn(INSERTABLE,b),'Unknown insertable block '+b);}
  const before=inspectStructure(syx),original=Buffer.from(before.raw.body),{records,tail}=scanRecords(original),donor=insertDonor();
  const prefix=Buffer.from(original.subarray(0,RECORDS_START)),grid=readGrid(original);
  const free=grid.filter(g=>(g.row===1||g.row===2)&&g.col>=1&&g.col<=10&&g.id>=SHUNT_MIN&&g.mask===1<<g.row);
  check(free.length>=blocks.length,`Only ${free.length} free serial shunts for ${blocks.length} blocks`);
  const added=[],inserted=[];
  blocks.forEach((b,i)=>{
    const eid=INSERTABLE[b];check(!records.some(r=>r.block===eid),`${b} is already placed`);
    const rec=Buffer.from(donor.byEid.get(eid));
    for(let s=0;s<8;s++){rec.writeUInt16LE(0,10+2*s);rec.writeUInt16LE(1,26+2*s);}
    const cell=free[i];prefix.writeUInt16LE(eid,gridAt(cell.row,cell.col));
    added.push(rec);inserted.push({block:b,effectId:eid,row:cell.row+1,column:cell.col+1,replacedShunt:cell.id,words:rec.readUInt16LE(42),channels:rec.readUInt16LE(44),recordBytes:rec.length,defaultScenes:'A, bypass (all 8 scenes)'});
  });
  const body=Buffer.concat([prefix,original.subarray(RECORDS_START,tail),...added,original.subarray(tail)]);
  // Structure: old records byte-identical and in order, new ones appended, tail unchanged.
  const after=scanRecords(body);
  check(after.records.length===records.length+added.length,'Inserted record scan');
  records.forEach((r,k)=>{const n=after.records[k];check(n.eid===r.eid&&body.subarray(n.header,n.header+r.size).equals(original.subarray(r.header,r.header+r.size)),'Existing record modified');});
  check(body.subarray(after.tail).equals(original.subarray(tail)),'System tail changed');
  const cells=new Set(inserted.map(x=>gridAt(x.row-1,x.column-1)));
  for(let i=0;i<RECORDS_START;i++)if(body[i]!==original[i])check(cells.has(i&~1),'Collateral prefix change at '+i);
  check(body.length===original.length+added.reduce((n,r)=>n+r.length,0),'Unexpected body length');
  let raw;try{raw=reencodeRawPatch(before.raw.rawPatch,body)}catch(e){throw Error('Preset too large for one FM3 dump after insertion; insert fewer blocks')}
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,raw)),readback=inspectStructure(out);
  check(Buffer.from(readback.raw.body).equals(body),'Body readback mismatch');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(readback.parsed.headerPayload)),'Dump header changed');
  check(readback.decoded.preset_name===before.decoded.preset_name,'Name changed');
  const rp=Buffer.from(readback.raw.rawPatch);check(rp.readUInt16LE(72)===body.length&&rp.readUInt16LE(74)===readback.raw.compSize,'Invalid encoded size');
  check(rp.subarray(76+readback.raw.compSize).every(v=>v===0),'Nonzero output padding');
  return {syx:out,inserted,report:{stage:'fm3-insert-blocks 0.1.0',donorSha256:INSERT_DONOR.sha256,emptySha256:INSERT_DONOR.emptySha256,outputSha256:sha(out),bodyBytes:body.length,
    checks:{donorPairReconstructed:true,donorChannelsIdentical:true,existingRecordsUnchanged:true,systemTailPreserved:true,onlyDeclaredGridWords:true,frameChecksums:true,presetCrc:true,footer:true,bodyReadback:true},
    hardware:'record shapes device-confirmed (2026-10-23 exports); generated insertion import/export pending',audio:'not tested',cpu:'not tested'}};
}
export function insertCapabilities(){
  return {field:'insert',blocks:Object.keys(INSERTABLE),gated:GATED,donor:INSERT_DONOR.file,defaultScenes:'A, bypass in all 8 scenes; engage with blockScenes',
    placement:'first free serial shunt of rows 2/3, then layout decides the column',limits:'One instance per family; parameter defaults come from the device; enum writes need allow enum-labels'};
}
