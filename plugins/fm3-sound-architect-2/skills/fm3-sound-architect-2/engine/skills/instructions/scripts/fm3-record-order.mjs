// Device block-record order (0.3.58). The FM3 stores and exports block records in one fixed order (T38 2026-11-07: a
// Multi Delay appended last by the generator was stored after Drive, before Input 1). references/fm3-record-order-20261107.json
// (tools/fm3/record-order-build.mjs) holds the record order of every device-made preset in the repo; together they are
// consistent with a single order. placeRecords() puts an inserted block where that evidence fixes its position against
// every other record; where any pair is unknown it is appended last (the pre-0.3.58 behaviour, which the device loads too).
// Offline; no device I/O.
import {createHash} from 'node:crypto';
import {readComposerFile} from './fm3-composer-components.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};
export const RECORD_ORDER_RECEIPT='references/fm3-record-order-20261107.json';
export const recordOrderReceiptHash='08623c97551ac8b558d25269ffd8e04e7762c708ae6d44d0ff337393e196b687';
export const RECORD_ORDER_MODES=Object.freeze(['device','append']);
let cache=null;
function closure(){
  if(cache)return cache;
  const bytes=readComposerFile(RECORD_ORDER_RECEIPT);
  check(createHash('sha256').update(bytes).digest('hex')===recordOrderReceiptHash,'Record order receipt changed; run tools/fm3/record-order-build.mjs and review');
  const r=JSON.parse(bytes),before=new Set();
  for(const o of r.orders)o.forEach((a,i)=>o.slice(i+1).forEach(b=>before.add(a+'<'+b)));
  // Transitive closure over the observed pairs (37 blocks, a few hundred pairs).
  for(let grew=true;grew;){grew=false;
    for(const p of [...before]){const [a,b]=p.split('<');for(const c of r.blocks)if(before.has(b+'<'+c)&&!before.has(a+'<'+c)){check(!before.has(c+'<'+a),'Record order receipt is cyclic');before.add(a+'<'+c);grew=true;}}}
  return cache={before,blocks:r.blocks};
}
// known(a,b): -1 if the device puts a before b, 1 if after, 0 if no evidence.
export function knownOrder(a,b){const {before}=closure();return before.has(a+'<'+b)?-1:before.has(b+'<'+a)?1:0;}
// existing: record eids in the base's order (kept as is); added: eids to insert, in request order.
// Returns {order:[eid...], placed:[{eid,index,by:'device order'|'appended'}]} where index is the final position.
export function placeRecords(existing,added,mode='device'){
  check(RECORD_ORDER_MODES.includes(mode),'recordOrder must be one of: '+RECORD_ORDER_MODES.join(', '));
  const seq=[...existing],how=new Map(),tail=[];
  for(const e of added){
    let at=-1;
    if(mode==='device'&&seq.every(x=>knownOrder(x,e)!==0)){
      at=seq.findIndex(x=>knownOrder(e,x)===-1);if(at<0)at=seq.length;
      // Only a gap that is consistent on both sides: everything before is before e, everything after is after e.
      if(!seq.every((x,i)=>(i<at)===(knownOrder(x,e)===-1)))at=-1;
    }
    if(at<0){tail.push(e);how.set(e,'appended');}else{seq.splice(at,0,e);how.set(e,'device order');}
  }
  const order=[...seq,...tail];
  return {order,placed:added.map(e=>({eid:e,index:order.indexOf(e),by:how.get(e)}))};
}
