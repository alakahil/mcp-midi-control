// Regression for fm3-table-encoder: 280 hardware points, existing control parity, write path.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {loadDictionary,findParam,encodeValue,decodeValue,writeTableControls} from './fm3-table-encoder.mjs';
import {controls} from './fm3-controls.mjs';import {layouts} from './fm3-composer-bases.mjs';
const check=(v,m)=>{if(!v)throw Error(m)};const d=loadDictionary();
// 1. measured points (filter-controls, PEQ, Drive, GEQ) re-derived from evidence folders
const pts=JSON.parse(execFileSync('python3',['-I',new URL('./table-points.py',import.meta.url).pathname,new URL('../references',import.meta.url).pathname]).toString());
let ok=0;for(const [,b,pid,v,raw] of pts){const p=d.byKey.get(b+':'+pid);const e=encodeValue(p,v,{allow:['linear-by-structure']});check(Math.abs(e-raw)<=1,`point ${b}:${pid}=${v} measured ${raw} got ${e}`);ok++}
check(ok===280,'Expected 280 points, got '+ok);
// 2. parity with existing hand-measured control definitions (offset + linear formula)
const L=layouts.standard,fam={58:'amp',70:'delay',66:'reverb'};let par=0;
for(const [k,c] of Object.entries(controls)){if(!c.eid||c.rawValues)continue;
  const l=L[fam[c.eid]],p=findParam(fam[c.eid],c.pid),ch=(c.offset-l.start-c.pid*2)/(l.words*2);
  check(Number.isInteger(ch)&&ch>=0&&ch<4,k+': offset does not fit table layout');
  const tv=(c.min+c.max)/2,ex=Math.round((tv-c.min)/(c.max-c.min)*65534);
  if(p.kind==='linear'){check(encodeValue(p,tv,{allow:['linear-by-structure']})===ex,k+': linear parity');par++}
  else check(p.kind==='log',k+': kind '+p.kind);
}
// 3. write path on jb-balanced: unchanged base + 3 verified controls
const base=fs.readFileSync(new URL('../examples/JB_RHYTHM_LEVEL_MINUS3.syx',import.meta.url));
const r=writeTableControls(base,{name:'TABLE ENCODER TEST',controls:[{block:'amp',channel:'B',param:'DISTORT_MID',value:6.5},{block:'reverb',channel:'A',param:'REVERB_TIME',value:2.2},{block:'chorus',channel:'A',param:'CHORUS_RATE',value:1.5}]});
check(r.writes.length===3&&r.report.checks.noCollateralChanges,'write path');
// 4. gate: unverified taper refused without experimental
let refused=false;try{writeTableControls(base,{name:'X',controls:[{block:'amp',channel:'D',param:'DISTORT_RESOLUTION',value:0.5}]})}catch(e){refused=/not writable/.test(e.message)}
check(refused,'unverified status must be refused');
// 5. taper batch 2026-10-13: user-read FM3-Edit displays
const tb=JSON.parse(fs.readFileSync(new URL('../references/taper-batch-20261013.json',import.meta.url)));let tbn=0;
for(const r of tb.readings){if(r.display===null)continue;const p=[...d.byKey.values()].find(x=>x.name===r.name);
  check(Math.abs(decodeValue(p,r.raw)-r.display)<0.006,`taper batch ${r.name}: decoded ${decodeValue(p,r.raw)} vs read ${r.display}`);
  check(Math.abs(encodeValue(p,r.display)-r.raw)<=1,`taper batch ${r.name}: encode`);tbn++}
check(tbn===15,'Expected 15 taper batch readings');
// 6. A tiny negative display value used to fit MVCAP's tolerance and return NaN.
// Reject before log evaluation; a failed write must leave its input untouched.
const mvcap=findParam('amp','DISTORT_MVCAP'),original=Buffer.from(base);
for(const value of [0,-Number.EPSILON]){
  let rejected=false;try{encodeValue(mvcap,value)}catch(e){rejected=/positive|outside/.test(e.message)}
  check(rejected,'MVCAP must reject a nonpositive logarithmic value');
  rejected=false;try{writeTableControls(base,{name:'BAD LOG',controls:[{block:'amp',channel:'A',param:33,value}]})}catch(e){rejected=/positive|outside/.test(e.message)}
  check(rejected&&base.equals(original),'Invalid logarithmic write must fail without changing the base');
}
check(encodeValue(mvcap,mvcap.min*mvcap.displayMultiplier)===0,'Valid MVCAP minimum must remain writable');
console.log(JSON.stringify({measuredPoints:ok,taperBatch:tbn,controlParity:par,writePath:r.writes.map(w=>[w.name,w.raw,+w.display.toFixed(3)]),gate:'ok'}));
