// Device block-record order evidence (2026-11-07). Offline.
// The FM3 writes a preset's block records in its own fixed order when it stores or exports a preset (T38: the
// generator appended an inserted Multi Delay record last; the stored dump had it after Drive, before Input 1).
// This tool collects the record order of every device-made preset in the repo: FM3-Edit exports of stored presets
// (git-tracked *_export.syx), the default-blocks donor export, and the stored dumps the read-only fn=0x03 collector
// recorded (hardware-results/**.json with storedDumpFrames). It requires all of them to be consistent with one order
// (no pair of blocks in both orders) and writes the receipt fm3-record-order uses to place inserted blocks.
// Without --write it rebuilds the receipt from the sources it lists and checks that device files added since then
// (not listed) agree with the order; --write adds them to the receipt.
// Usage: node tools/fm3/record-order-build.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const {inspectStructure}=await import(path.join(ENG,'scripts/drive-collector/fm3-prototype.mjs'));
const {scanRecords}=await import(path.join(ENG,'scripts/fm3-layout.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...a)=>execFileSync('git',a,{cwd:ROOT}).toString().trim().split('\n').filter(Boolean);
const order=syx=>{const s=inspectStructure(syx);assert.equal(s.raw.crcValid,true);return scanRecords(Buffer.from(s.raw.body),{requireAmpCab:false}).records.map(r=>r.eid);};

const WRITE=process.argv.includes('--write');
const target=path.join(ENG,'references','fm3-record-order-20261107.json');
const read=f=>{const b=fs.readFileSync(path.join(ROOT,f));if(f.endsWith('.syx'))return {path:f,sha256:sha(b),kind:'device export',order:order(b)};
  const j=JSON.parse(b);if(!Array.isArray(j.storedDumpFrames))return null;
  return {path:f,sha256:sha(b),kind:'stored dump (fn=0x03)',order:order(Buffer.concat(j.storedDumpFrames.map(h=>Buffer.from(h,'hex'))))};};
const found=[...git('ls-files','*_export.syx'),'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-default-blocks-20261023.syx',
  ...git('ls-files','docs/fm3/hardware-results/*.json')].sort().map(read).filter(Boolean);
const listed=WRITE?null:JSON.parse(fs.readFileSync(target,'utf8')).sources;
if(listed)for(const s of listed){const r=read(s.path);assert.ok(r&&r.sha256===s.sha256,'record-order source changed: '+s.path);}
const sources=listed?found.filter(s=>listed.some(l=>l.path===s.path)):found,unlisted=listed?found.filter(s=>!listed.some(l=>l.path===s.path)):[];
assert.equal(sources.length,listed?listed.length:found.length,'every listed source still present');
assert.ok(sources.some(s=>s.path.endsWith('2026-11-07/t38/bind-store-results.json')),'T38 stored dump included');
const used=sources.filter(s=>s.order.length>1);
// One consistent order: no pair seen both ways, and the precedence graph has no cycle.
const seen=new Map();
for(const s of used)s.order.forEach((a,i)=>s.order.slice(i+1).forEach(b=>{assert.ok(!seen.has(b+'<'+a),`order conflict ${a}/${b}: ${s.path} vs ${seen.get(b+'<'+a)}`);if(!seen.has(a+'<'+b))seen.set(a+'<'+b,s.path);}));
const distinct=[...new Map(used.map(s=>[s.order.join(','),s.order])).values()];
const nodes=[...new Set(distinct.flat())].sort((a,b)=>a-b),next=new Map(nodes.map(n=>[n,new Set()]));
for(const o of distinct)for(let i=0;i+1<o.length;i++)next.get(o[i]).add(o[i+1]);
const state=new Map();const visit=n=>{assert.notEqual(state.get(n),1,'cycle at '+n);if(state.get(n))return;state.set(n,1);for(const m of next.get(n))visit(m);state.set(n,2);};
nodes.forEach(visit);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-07',kind:'fm3-record-order',
 rule:'The FM3 stores and exports block records in one fixed order. Every device-made preset in the repo agrees with a single order; an inserted block is placed where that evidence fixes its position relative to every other record, otherwise it is appended (the generator default before 0.3.58, which the device also loads).',
 trigger:'T38 2026-11-07: Multi Delay (74) appended last by the generator was stored after Drive (118), before Input 1 (37).',
 blocks:nodes,orders:distinct,
 sources:sources.map(({path:p,sha256,kind,order:o})=>({path:p,sha256,kind,records:o.length})),
 pairs:seen.size};
const content=JSON.stringify(out,null,1)+'\n';
if(WRITE)fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'record-order receipt stale; run with --write and review');
// Device files added after the receipt must agree with it (a conflict means the fixed-order rule is wrong).
for(const s of unlisted.filter(s=>s.order.length>1))s.order.forEach((a,i)=>s.order.slice(i+1).forEach(b=>assert.ok(!seen.has(b+'<'+a),`new device file ${s.path} contradicts the record order (${a}/${b}); review fm3-record-order`)));
console.log(JSON.stringify({ok:true,sources:sources.length,distinctOrders:distinct.length,blocks:nodes.length,pairs:seen.size,unlistedConsistent:unlisted.length}));
