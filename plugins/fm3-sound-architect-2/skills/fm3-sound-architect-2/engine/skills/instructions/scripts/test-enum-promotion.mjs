// Option-selector promotion (0.3.45): receipt binding, T24 readings, default writability and what stays opt-in. Offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,encodeValue,decodeValue,findParam,DEFAULT_STATUSES} from './fm3-table-encoder.mjs';
import {ENUM_PROMOTION_STATUS,enumPromotionSummary} from './fm3-enum-promotion.mjs';
const R=f=>JSON.parse(fs.readFileSync(new URL('../references/'+f,import.meta.url),'utf8'));
const d=loadDictionary(),rec=R('fm3-enum-promotion-20261103.json'),t24=R('fm3-shot-t24-enum-20261103.json');
assert.ok(DEFAULT_STATUSES.includes(ENUM_PROMOTION_STATUS));
const promoted=d.params.filter(p=>p.enumEvidence);
assert.equal(promoted.length,197);assert.equal(rec.summary.promoted,197);assert.equal(rec.summary.candidates,348);
assert.deepEqual(enumPromotionSummary().byEvidence,{'shared-labels':108,'hardware-t24':50,'family-t24':39,none:0});
for(const p of promoted){assert.equal(p.status,ENUM_PROMOTION_STATUS);assert.equal(p.structuralStatus,'enum-labels');assert.equal(p.kind,'enum');}
// Corpus: no promoted (or any candidate) selector has a stored word outside its list.
assert.equal(rec.corpus.distinctBodies,639);assert.deepEqual(rec.parameters.filter(r=>r.corpus.outOfRange.length),[]);
// Hardware: 51/51 readings exact; every option read is reproduced by the encoder in both directions without an opt-in
// (the Resonator mode is a channel type selector and stays opt-in).
assert.equal(t24.summary.controls,51);assert.equal(t24.summary.exact,51);
let n=0;
for(const c of t24.parts.flatMap(x=>x.controls)){
  const p=findParam(c.block,c.param);assert.equal(decodeValue(p,c.raw).trim(),c.codecDisplay);
  if(p.name==='RESONATOR_MODE'){assert.equal(p.status,'enum-labels');assert.throws(()=>encodeValue(p,c.codecDisplay),/not writable/);continue;}
  assert.equal(p.enumEvidence,'hardware-t24',p.name);assert.equal(encodeValue(p,c.codecDisplay),c.raw);n++;
}
assert.equal(n,50);
// Still opt-in: type/model selectors, non-sound families, pickers, unresolved list.
for(const [b,name] of [['pitch','PITCH_TYPE'],['gate','GATE_TYPE'],['cab','CABINET_MODE'],['tentap','TENTAP_TYPE'],['phaser','PHASER_LFOQUANTIZE'],['pitch','PITCH_LEARN'],['cab','CABINET_BANK1'],['plex','PLEX_PRESETS'],['peq','PEQ_TYPE1'],['volpan','VOLUME_TAPER']]){
  const p=findParam(b,name);assert.equal(p.status,'enum-labels',name);assert.throws(()=>encodeValue(p,p.enum[0]),/not writable/,name);
  assert.equal(encodeValue(p,p.enum[0],{allow:['enum-labels']}),p.enumBase??0,name);
}
assert.equal(d.params.filter(p=>p.status==='enum-labels').length,151);
assert.ok(d.params.filter(p=>['GLOBAL','CONTROLLERS','MOD'].includes(p.family)).every(p=>p.status!==ENUM_PROMOTION_STATUS));
console.log(JSON.stringify({promoted:promoted.length,t24Reproduced:n,optIn:151}));
