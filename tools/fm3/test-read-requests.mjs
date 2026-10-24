// The inline read-only request builders equal the fractal-midi builders (when the codec is built).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
// Without the codec build: index 0 equals the zero-value display read; the float field is LSB-first septets.
for(const [e,p] of [[58,6],[178,73],[37,0]])assert.deepEqual(R.labelRequest(e,p,0),R.displayRequest(e,p));
assert.deepEqual(R.floatSeptets(16),[0,0,0,0x0c,0x04]);
assert.deepEqual(R.labelRequest(58,6,300).slice(12,21),[44,2,0,0,0,0,0,0,0]);
// Reply parser on a pinned FM3 fw 13 reply (read probe 2026-10-23, amp type, value 0).
const probe=JSON.parse(fs.readFileSync(new URL('../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-read-probe-20261023-results.json',import.meta.url)));
const ampReply=probe.replies.find(r=>r.label==='amp.DISTORT_TYPE').frames.map(h=>R.parseLabelReply(Buffer.from(h,'hex'))).find(Boolean);
assert.deepEqual(ampReply,{effectId:58,paramId:6,value:0,text:'59 Bassguy Bright'});
const knob=probe.replies.find(r=>r.label==='amp.DISTORT_DRIVE').frames.map(h=>R.parseLabelReply(Buffer.from(h,'hex'))).find(Boolean);
assert.ok(knob&&knob.text===''&&knob.effectId===58&&knob.paramId===7,'knob reply has no text');
const dist=new URL('../../packages/fractal-midi/dist/gen3/axe-fx-iii/setParam.js',import.meta.url);
if(!fs.existsSync(dist)){console.log(JSON.stringify({skipped:'fractal-midi not built'}));process.exit(0);}
const C={...await import(new URL('../../packages/fractal-midi/dist/gen3/axe-fx-iii/index.js',import.meta.url)),...await import(dist)};
const F=0x11;
assert.deepEqual(R.gridRequest(),C.buildRequestGridLayout(F));
assert.deepEqual(R.editBufferDumpRequest(),C.buildRequestEditBufferDump(F));
for(const e of [37,58,119,126,178,191,1037])assert.deepEqual(R.bulkReadPoll(e),C.buildBlockBulkReadPoll(e,F));
for(const i of [0,127,128,435,511])assert.deepEqual(R.storedDumpRequest(i),C.buildRequestPresetDump(i,F));
for(const [e,p] of [[58,6],[178,73],[37,0],[119,1]])assert.deepEqual(R.displayRequest(e,p),C.buildRequestCurrentTypeName(e,p,F));
for(const [e,p,i] of [[58,6,1],[58,6,335],[118,0,86],[66,0,16],[178,73,4095]]){
  const ours=R.labelRequest(e,p,i),ref=C.buildRequestCurrentTypeName(e,p,F);
  assert.deepEqual(ours.slice(0,12),ref.slice(0,12),'same envelope, sub-action and target');assert.deepEqual(ours.slice(14,21),ref.slice(14,21));}
for(const r of probe.replies.filter(r=>r.kind==='display'))for(const h of r.frames){const f=[...Buffer.from(h,'hex')];
  if(!C.isGetParameterResponse(f,F))continue;const a=C.parseGetParameterResponse(f,F),b=R.parseLabelReply(f);
  assert.deepEqual([b.effectId,b.paramId,b.value,b.text],[a.effectId,a.paramId,a.internalValue,a.displayString],'reply parser = parseGetParameterResponse');}
console.log(JSON.stringify({equal:true}));
