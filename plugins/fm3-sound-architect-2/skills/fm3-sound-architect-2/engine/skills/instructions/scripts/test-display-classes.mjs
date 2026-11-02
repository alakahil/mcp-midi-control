// Mix / Balance / class-0x01 integer promotion (0.3.44): counts, receipts and default writability. Offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,encodeValue,decodeValue,findParam,DEFAULT_STATUSES} from './fm3-table-encoder.mjs';
import {DISPLAY_CLASS_RECEIPTS,PROMOTED_STATUS,displayClassOf} from './fm3-display-classes.mjs';
const d=loadDictionary(),count={};
for(const p of d.params)if(p.displayClass)(count[p.displayClass]??=[]).push(p);
assert.deepEqual(Object.fromEntries(Object.entries(count).map(([k,v])=>[k,v.length])),{balance:29,mix:17,integer:552});
assert.ok(DEFAULT_STATUSES.includes(PROMOTED_STATUS));
for(const p of Object.values(count).flat()){assert.equal(p.status,PROMOTED_STATUS);assert.equal(p.structuralStatus,'linear-by-structure');assert.equal(displayClassOf({...p,status:p.structuralStatus}),p.displayClass);}
// Not promoted: other flags (Enhancer/Formant Balance 0x0980), own display codecs, hidden Amp dynamics.
assert.deepEqual(d.params.filter(p=>p.status==='linear-by-structure').map(p=>p.name).sort(),['ENHANCER_PAN','FORMANT_PAN']);
for(const n of ['DISTORT_DYNDEPTH','DISTORT_DYNPRES'])assert.equal(findParam('amp',n).status,'unverified-taper');
assert.throws(()=>encodeValue(findParam('amp','DISTORT_DYNDEPTH'),5),/not writable/);
// Every hardware reading is reproduced without an opt-in.
const R=f=>JSON.parse(fs.readFileSync(new URL('../references/'+f,import.meta.url),'utf8'));
let n=0;
for(const f of new Set(Object.values(DISPLAY_CLASS_RECEIPTS))){
  const r=R(f);assert.equal(r.summary.exact,r.parts.reduce((a,p)=>a+p.controls.length+p.frontPanel.length,0));
  for(const c of r.parts.flatMap(p=>p.controls)){
    const p=findParam(c.block,c.param);assert.ok(p.displayClass,c.param);
    assert.equal(encodeValue(p,c.shownValue),c.raw,c.param);assert.equal(Number(decodeValue(p,c.raw).toFixed(c.shownDecimals)),c.shownValue);n++;
  }
}
assert.equal(n,27);
const t23=R('fm3-shot-t23-dyn-20261102.json');assert.equal(t23.summary.shown,0);assert.equal(t23.summary.storedExactly,8);
console.log(JSON.stringify({promoted:{mix:17,balance:29,integer:552},readingsReproduced:n}));
