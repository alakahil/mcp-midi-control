import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findParam,loadDictionary} from './fm3-table-encoder.mjs';
import {readTypeState,typeApplicability,validateTypeWrites} from './fm3-type-applicability.mjs';
import {dependencyState,validateDependencyWrites} from './fm3-parameter-dependencies.mjs';
import {insertBlocks} from './fm3-insert-blocks.mjs';
import {inspectStructure} from './drive-collector/fm3-prototype.mjs';
import {scanRecords,applyTableControls} from './fm3-layout.mjs';
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url));
const body=Buffer.from(inspectStructure(insertBlocks(base,['plex','gate','tentap','synth','multiband']).syx).raw.body);
const records=scanRecords(body).records,allow=['linear-by-structure','enum-labels'];
// Independent expectations from FW13 active pages, including negative controls.
const examples=[['plex','PLEX_DETUNE1',[1,2]],['plex','PLEX_SHIFT1',[2]],['plex','PLEX_SIZE',[3,4]],
  ['plex','PLEX_SPLICE',[1]],['plex','PLEX_PRESETS',[]],['gate','GATE_RATIO',[0,3]],
  ['gate','GATE_RANGE',[1,2]],['gate','GATE_HOLD',[1,2]],['gate','GATE_KNEE',[3]],
  ['gate','GATE_GAINMONITOR',[]],['tentap','TENTAP_FEEDBACK',[1]],['tentap','TENTAP_NUMTAPS',[0]],
  ['tentap','TENTAP_LEARN',[]],['tentap','TENTAP_DECAYSTYLE',[]],
  ['synth','SYNTH_TYPE3',[0]],['multiband','MULTICOMP_AUTO',[0]],['multiband','MULTICOMP_GAINMON1',[]]];
for(const [slug,name,allowed] of examples){
  const p=findParam(slug,name),pid={plex:0,gate:14,tentap:0}[slug],max={plex:5,gate:4,tentap:2}[slug]??1;
  for(let type=0;type<max;type++)assert.equal(typeApplicability(p,readTypeState(p,k=>k===pid?type:0)).allowed,allowed.includes(type),name+' type '+type);
}
let combinations=0;
for(const slug of ['plex','gate','tentap','synth','multiband']){
  const r=records.find(r=>r.family===slug),selector={plex:0,gate:14,tentap:0}[slug],types={plex:5,gate:4,tentap:2}[slug]??1;
  for(let type=0;type<types;type++)for(let ch=0;ch<4;ch++){
    const b=Buffer.from(body),at=r.start+ch*r.words*2;if(selector!==undefined)b.writeUInt16LE(type,at+selector*2);
    for(const p of loadDictionary().params.filter(p=>p.block===r.block)){
      const w={block:slug,pid:p.param,name:p.name,label:p.label,channel:'ABCD'[ch],offset:at+p.param*2,raw:b.readUInt16LE(at+p.param*2)};
      const state=readTypeState(p,k=>b.readUInt16LE(at+k*2)),app=typeApplicability(p,state),before=Buffer.from(b);
      if(app.allowed)validateTypeWrites(b,[w]);else assert.throws(()=>validateTypeWrites(b,[w]),/not applicable/);
      assert.ok(before.equals(b),'Preflight mutated body');combinations++;
    }
  }
}
// Final-type planning is order independent, and a refused plan is atomic.
const control=(param,value)=>({block:'gate',channel:'D',param,value});
const plan=[control('RATIO',4),control('TYPE','Modern Expander')],a=Buffer.from(body),b=Buffer.from(body);
applyTableControls(a,plan,{allow});applyTableControls(b,[...plan].reverse(),{allow});assert.ok(a.equals(b));
let callbacks=0;const saved=Buffer.from(body);
assert.throws(()=>applyTableControls(body,[control('LEVEL',-10),control('RATIO',4),control('TYPE','Modern Gate')],{allow},()=>callbacks++),/not applicable/);
assert.ok(saved.equals(body));assert.equal(callbacks,0);
assert.throws(()=>applyTableControls(body,[{block:'tentap',channel:'A',param:'LEARN',value:'<TAP ENTER>'}],{allow}),/not applicable/);
assert.throws(()=>applyTableControls(body,[{block:'tentap',channel:'A',param:'TIMEM',value:300}],{allow}),/unverified|Unsupported|blocked|unconfirmed|scale/i);
// The inserted tempo rule must be visible in reports and reject a modifier conflict.
const pl=records.find(r=>r.family==='plex'),bound=Buffer.from(body);
bound.writeUInt16LE(1,1584);bound.writeUInt16LE(pl.eid,1600);bound.writeUInt16LE(18,1602);bound.writeUInt16LE(0,1618);
const tempo={effectId:pl.block,block:'plex',pid:26,channel:'A',offset:pl.start+52,raw:1,name:'PLEX_TEMPO1'};
assert.throws(()=>validateDependencyWrites(bound,[tempo]),/tempo conflicts with modifier/);
const dependency=dependencyState(body,{effectId:pl.block,pid:18,channel:'A',offset:pl.start+36});
assert.equal(dependency.tempo.name,'PLEX_TEMPO1');assert.equal(dependency.mode,'tempo');
console.log(JSON.stringify({passed:true,families:5,parameters:242,typeChannelCombinations:combinations,independentVisibilityCases:examples.length,atomic:true,deviceIO:false}));
