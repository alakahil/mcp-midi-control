// Option-selector promotion (0.3.45, T30 additions 0.3.52, T31 Cab banks 0.3.53): receipt binding, T24 readings, default writability and what stays opt-in. Offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadDictionary,encodeValue,decodeValue,findParam,DEFAULT_STATUSES} from './fm3-table-encoder.mjs';
import {ENUM_PROMOTION_STATUS,enumPromotionSummary} from './fm3-enum-promotion.mjs';
const R=f=>JSON.parse(fs.readFileSync(new URL('../references/'+f,import.meta.url),'utf8'));
const d=loadDictionary(),rec=R('fm3-enum-promotion-20261103.json'),t24=R('fm3-shot-t24-enum-20261103.json');
assert.ok(DEFAULT_STATUSES.includes(ENUM_PROMOTION_STATUS));
const promoted=d.params.filter(p=>p.enumEvidence),t30=R('fm3-shot-t30-enum-20261105.json');
assert.equal(promoted.length,227);assert.equal(promoted.filter(p=>!['hardware-t30','hardware-t28','hardware-t31'].includes(p.enumEvidence)).length,197);
assert.deepEqual(promoted.filter(p=>p.enumEvidence==='hardware-t31').map(p=>p.name).sort(),['CABINET_BANK1','CABINET_BANK2']);assert.equal(rec.summary.promoted,197);assert.equal(rec.summary.candidates,348);
assert.deepEqual(enumPromotionSummary().byEvidence,{'shared-labels':108,'hardware-t24':50,'family-t24':39,none:0});
for(const p of promoted){assert.equal(p.status,ENUM_PROMOTION_STATUS);assert.equal(p.structuralStatus,'enum-labels');assert.equal(p.kind,'enum');}
// Corpus: no promoted (or any candidate) selector has a stored word outside its list.
// Includes the generated D-channel trial and its 6 November device export.
assert.equal(rec.corpus.distinctBodies,644);assert.deepEqual(rec.parameters.filter(r=>r.corpus.outOfRange.length),[]);
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
// T30: 25 FM3-Edit readings exact; each shown option is reproduced by the encoder without an opt-in.
assert.equal(t30.editorReadings.length,25);assert.equal(t30.promote.length,28);
for(const r of t30.editorReadings){const p=d.params.find(x=>x.name===r.param);assert.equal(p.enumEvidence,'hardware-t30',r.param);assert.equal(p.status,ENUM_PROMOTION_STATUS);
  assert.equal(encodeValue(p,r.shown),r.raw,r.param);assert.equal(decodeValue(p,r.raw).trim().toLowerCase(),r.shown.toLowerCase(),r.param);}
for(const n of ['CONTROLLERS_LFO1TYPE','CONTROLLERS_LFO2TYPE','CONTROLLERS_ADSR1MODE'])assert.equal(d.params.find(x=>x.name===n).enumEvidence,'hardware-t28',n);
assert.equal(enumPromotionSummary().t30.promoted,28);
for(const [b,name] of [['pitch','PITCH_TYPE'],['gate','GATE_TYPE'],['cab','CABINET_MODE'],['tentap','TENTAP_TYPE'],['pitch','PITCH_LEARN'],['plex','PLEX_PRESETS'],['volpan','VOLUME_TAPER'],['multidelay','MULTITAP_PRESETS'],['CONTROLLERS','CONTROLLERS_TEMPOTOUSE']]){
  const p=findParam(b,name);assert.equal(p.status,'enum-labels',name);assert.throws(()=>encodeValue(p,p.enum[0]),/not writable/,name);
  assert.equal(encodeValue(p,p.enum[0],{allow:['enum-labels']}),p.enumBase??0,name);
}
assert.equal(d.params.filter(p=>p.status==='enum-labels').length,121);
assert.ok(d.params.filter(p=>['GLOBAL','MOD'].includes(p.family)).every(p=>p.status!==ENUM_PROMOTION_STATUS));
assert.deepEqual(d.params.filter(p=>p.family==='CONTROLLERS'&&p.status==='enum-labels').map(p=>p.name),['CONTROLLERS_TEMPOTOUSE']);
console.log(JSON.stringify({promoted:promoted.length,t24Reproduced:n,t30Readings:t30.editorReadings.length,optIn:121}));
