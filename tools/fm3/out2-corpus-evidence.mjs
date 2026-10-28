// Aggregate Out 2 structure statistics from the user's OWN FM3 preset files (for example a purchased
// tonepack). Offline, read only. Prints a JSON receipt with counts only: no preset names, files or
// parameter values. Used for references/fm3-out2-evidence-20261028.json.
// Usage: node tools/fm3/out2-corpus-evidence.mjs FILE...   (each FILE a multiple of 24680 bytes)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const files=process.argv.slice(2);assert.ok(files.length,'Usage: out2-corpus-evidence.mjs FILE...');
const SIZE=24680,sha=b=>createHash('sha256').update(b).digest('hex');
const base=Buffer.from(inspectStructure(fs.readFileSync(new URL(E+'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx',import.meta.url))).raw.body);
const baseOut1=scanRecords(base).records.find(r=>r.eid===42),baseTail=sha(base.subarray(baseOut1.header+2,baseOut1.header+baseOut1.size));
const c={presets:0,withOut2:0,out2EqualsOwnOut1AfterEffectId:0,out2EqualsBaseOut1AfterEffectId:0,out2HeaderZeroExceptSize:0,
  out2Cell:{},out2Mask:{},out2FedFromCellFeedingOut1:0,out1Cell:{},recordAfterOut1:0,deadPreCabShunts:0,out2Words:{},out2Channels:{}};
const inc=(o,k)=>{o[k]=(o[k]||0)+1;};
for(const f of files){const all=fs.readFileSync(f);assert.ok(all.length%SIZE===0,f+': not a multiple of 24680 bytes');
  for(let i=0;i<all.length/SIZE;i++){let body,sc;try{const st=inspectStructure(all.subarray(i*SIZE,(i+1)*SIZE));if(!st.raw.crcValid)continue;body=Buffer.from(st.raw.body);sc=scanRecords(body,{requireAmpCab:false});}catch{continue;}
    c.presets++;const o2=sc.records.find(r=>r.eid===43),o1=sc.records.find(r=>r.eid===42);if(!o2||!o1)continue;c.withOut2++;
    const t2=body.subarray(o2.header+2,o2.header+o2.size);
    if(t2.equals(body.subarray(o1.header+2,o1.header+o1.size)))c.out2EqualsOwnOut1AfterEffectId++;
    if(sha(t2)===baseTail)c.out2EqualsBaseOut1AfterEffectId++;
    if(body.subarray(o2.header+2,o2.header+42).every(x=>x===0))c.out2HeaderZeroExceptSize++;
    inc(c.out2Words,o2.words);inc(c.out2Channels,o2.channels);
    if(sc.records.indexOf(o2)===sc.records.indexOf(o1)+1)c.recordAfterOut1++;
    const g=readGrid(body),a=g.find(x=>x.id===43),b=g.find(x=>x.id===42);
    inc(c.out2Cell,`row ${a.row+1}, col ${a.col+1}`);inc(c.out2Mask,a.mask);inc(c.out1Cell,`row ${b.row+1}, col ${b.col+1}`);
    if(a.col===b.col&&a.mask===b.mask)c.out2FedFromCellFeedingOut1++;
    if(g.some(x=>x.row===3&&x.col===9&&x.id>=1024&&x.mask===2)&&g.some(x=>x.row===3&&x.col===10&&x.id>=1024&&x.mask===8))c.deadPreCabShunts++;
  }}
console.log(JSON.stringify(c,null,1));
