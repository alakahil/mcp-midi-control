// Device record order for grid mode (0.3.70). editRecords() (fm3-grid.mjs) appends added records last, the placement of
// every grid pack built before 0.3.70. This stage moves the added records to where the device record-order evidence
// (fm3-record-order.mjs) fixes them against every kept record; a record without that evidence stays appended. Kept
// records keep their order and an added Out 2 stays directly after Out 1. Only whole records move: every record's
// bytes, the prefix (grid, controllers, modifiers) and the system tail are unchanged. Offline; no device I/O.
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {reencodeRawPatch,reencodeDumpFromRawPatch} from './fm3-codec.mjs';
import {scanRecords} from './fm3-layout.mjs';
import {placeRecords,RECORD_ORDER_MODES,RECORD_ORDER_RECEIPT,recordOrderReceiptHash} from './fm3-record-order.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
const RECORDS_START=4610,OUT1=42,OUT2=43;
// added: [{block,effectId}] in the order editRecords appended them (Out 2 excluded by the caller or passed; it is pinned).
export function orderGridRecords(syx,added,mode='append'){
  check(RECORD_ORDER_MODES.includes(mode),'recordOrder must be one of: '+RECORD_ORDER_MODES.join(', '));
  check(Array.isArray(added)&&added.every(a=>a&&typeof a.block==='string'&&Number.isInteger(a.effectId)),'added must list {block,effectId}');
  const before=inspectStructure(syx),original=Buffer.from(before.raw.body),{records,tail}=scanRecords(original);
  const free=added.filter(a=>a.effectId!==OUT2);
  for(const a of free)check(records.some(r=>r.eid===a.effectId),a.block+' is not in the preset');
  check(new Set(free.map(a=>a.effectId)).size===free.length,'A record is listed twice');
  const freeIds=new Set(free.map(a=>a.effectId)),kept=records.filter(r=>!freeIds.has(r.eid)).map(r=>r.eid);
  const placement=placeRecords(kept,free.map(a=>a.effectId),mode);
  const o1=placement.order.indexOf(OUT1),o2=placement.order.indexOf(OUT2);check(o2<0||o2===o1+1,'Out 2 must follow Out 1');
  const report={mode,receipt:RECORD_ORDER_RECEIPT,receiptSha256:recordOrderReceiptHash,
    placed:placement.placed.map(p=>({block:free.find(a=>a.effectId===p.eid).block,effectId:p.eid,recordIndex:p.index,by:p.by}))};
  if(JSON.stringify(placement.order)===JSON.stringify(records.map(r=>r.eid)))return {syx,moved:false,recordOrder:report};
  const buf=new Map(records.map(r=>[r.eid,original.subarray(r.header,r.header+r.size)]));
  const body=Buffer.concat([original.subarray(0,RECORDS_START),...placement.order.map(e=>buf.get(e)),original.subarray(tail)]);
  check(body.length===original.length,'Body length changed');
  const after=scanRecords(body);
  check(JSON.stringify(after.records.map(r=>r.eid))===JSON.stringify(placement.order),'Record order differs from placement');
  check(JSON.stringify(placement.order.filter(e=>!freeIds.has(e)))===JSON.stringify(kept),'Kept record order changed');
  for(const r of after.records)check(body.subarray(r.header,r.header+r.size).equals(buf.get(r.eid)),'Record bytes changed');
  check(body.subarray(0,RECORDS_START).equals(original.subarray(0,RECORDS_START))&&body.subarray(after.tail).equals(original.subarray(tail)),'Prefix or system tail changed');
  let raw;try{raw=reencodeRawPatch(before.raw.rawPatch,body)}catch{throw Error('Preset too large for one FM3 dump')}
  const out=Buffer.from(reencodeDumpFromRawPatch(syx,raw)),rb=inspectStructure(out);
  check(Buffer.from(rb.raw.body).equals(body),'Body readback mismatch');
  check(Buffer.from(before.parsed.headerPayload).equals(Buffer.from(rb.parsed.headerPayload))&&rb.decoded.preset_name===before.decoded.preset_name,'Dump header or name changed');
  return {syx:out,moved:true,recordOrder:report};
}
