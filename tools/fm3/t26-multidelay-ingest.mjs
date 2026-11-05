// Receipt for the 2026-11-04 T26 Multi Delay tests (FM3_SHOT_LOAD.py --load + FM3-Edit window captures; FM3_CPU_SWEEP.py).
// Offline. Both packs are rebuilt (tools/fm3/t26-multidelay-build.mjs) and must match the manifest SHA-256 recorded by
// the loader and the preset SHA-256 values the CPU collector checked. Screenshots are not kept; the readings were
// transcribed from them. Nothing was stored or set.
//   Placement (MDP): composer preset with Multi Delay inserted from its donor pair; all 484 Multi Delay words read back
//     equal; FM3-Edit shows the block in row 3, column 7 (between Delay and Reverb), type Quad-Tap Delay, engaged in Scene 1.
//   CPU: calibration 52.5 % (hand reading 52.8 %); Multi Delay cost = item - calibration, per Base Type (meter step 0.5 %).
//     The three FM3-Edit-authored channels (types 1..3) read the same as the raw Base Type word.
// Usage: node tools/fm3/t26-multidelay-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-04/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t26-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t26-multidelay-build.mjs'),tmp],{stdio:'ignore'});
const pm=fs.readFileSync(path.join(tmp,'FM3_T26_PLACE','manifest.json')),place=JSON.parse(pm);
const cmBytes=fs.readFileSync(path.join(tmp,'FM3_T26_CPU','manifest.json')),cm=JSON.parse(cmBytes);
fs.rmSync(tmp,{recursive:true,force:true});

// ---- placement ----
const loadFile=path.join(RAW,'fm3-shot-t26-mdp-20261104-load.json'),readFile=path.join(RAW,'fm3-shot-t26-mdp-20261104-readings.json');
const load=J(loadFile),shots=J(readFile),item=place.items[0];
assert.equal(load.kind,'fm3-shot-load');assert.equal(load.packSha256,sha(pm),'placement pack rebuilt identically');
assert.equal(load.preset,'MDP');assert.equal(load.name,item.name);assert.equal(load.allMatch,true);
const b=load.blocks[0];assert.equal(b.effectId,74);assert.equal(b.values,121*4);assert.equal(b.matches,true);assert.deepEqual(b.mismatches,[]);
for(const w of b.testWords)assert.equal(w.device,w.raw);
assert.deepEqual(shots.grid.multiDelayCell,{row:item.placement.row,column:item.placement.column},'FM3-Edit cell = generated cell');
assert.equal(shots.block.type,'Quad-Tap Delay');assert.equal(shots.block.channel,'A');assert.equal(shots.block.bypassLit,false,'engaged in Scene 1');

// ---- CPU ----
const resFile=path.join(RAW,'fm3-t26-cpu-20261104-results.jsonl');
const res=fs.readFileSync(resFile,'utf8').trim().split('\n').map(l=>JSON.parse(l)),byId=new Map(res.map(r=>[r.id,r]));
assert.equal(res.length,cm.items.length,'every CPU item measured once');
for(const r of res){assert.equal(r.saturated,false);assert.ok(r.reads.slice(-3).every(v=>v===r.raw),'settled reading (last three equal, collector rule) '+r.id);assert.ok(cm.items.some(i=>i.id===r.id));}
const cal=byId.get('cal-newlook');assert.equal(cal.calibrationOk,true);assert.equal(cal.userConfirmedName,true);
const items=cm.items.filter(i=>i.id!=='cal-newlook').map(i=>({id:i.id,baseType:i.baseType,type:i.type,source:i.source,presetSha256:i.sha256,
  cpuPercent:byId.get(i.id).cpuPercent,costPoints:+(byId.get(i.id).cpuPercent-cal.cpuPercent).toFixed(1)}));
const raw=items.filter(i=>i.id.startsWith('md:')),editor=items.filter(i=>i.id.startsWith('md-editor:'));
assert.equal(raw.length,6);
for(const e of editor)assert.equal(e.costPoints,raw.find(r=>r.baseType===e.baseType).costPoints,'editor-authored channel = raw Base Type '+e.type);
const costPoints=Object.fromEntries(raw.map(r=>[r.type,r.costPoints]));

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-04',test:'T26',
 method:'Placement: FM3_SHOT_LOAD.py --load (Remote Control) sent one composer preset to the edit buffer (7F 00) and read the Multi Delay block back with fn=0x1F; Claude read FM3-Edit window captures. CPU: FM3_CPU_SWEEP.py (Remote Control; the user confirmed the first preset name on the FM3 screen) loaded ten edit-buffer presets and read the CPU meter (fn=0x01 sub=0x2E). Nothing stored or set.',
 notMeasured:['audio','STORE/reload','Multi Delay parameter display scales','Multi Delay presets (MULTITAP_PRESETS)','CPU with a second Multi Delay (the FM3 has one instance)'],
 placement:{packSha256:sha(pm),preset:'MDP',presetSha256:item.sha256,load:{...rel(loadFile),time:load.time,values:b.values,allMatch:true},readings:rel(readFile),
  cell:{row:item.placement.row,column:item.placement.column},editor:{type:shots.block.type,scene1Engaged:!shots.block.bypassLit,mix:shots.block.mix,level:shots.block.level}},
 cpu:{packSha256:sha(cmBytes),results:rel(resFile),calibration:{id:'cal-newlook',cpuPercent:cal.cpuPercent,handReading:52.8},items,costPoints,meterStepPercent:0.5,
  rule:'Multi Delay cost depends on Base Type only: FM3-Edit-authored types 1..3 (editor side effects included) equal the raw Base Type word.'},
 summary:{placementWordsExact:b.values,editorCell:`row ${item.placement.row}, column ${item.placement.column}`,cpuItems:items.length,costRange:[Math.min(...raw.map(r=>r.costPoints)),Math.max(...raw.map(r=>r.costPoints))],
  meaning:'Multi Delay is insertable with device defaults (0.3.47); fm3-cpu.mjs counts its measured cost per Base Type. Parameter writes stay refused until Base Type and Multi Delay preset side effects are mapped.'}};
const target=path.join(ENG,'references','fm3-shot-t26-multidelay-20261104.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T26 receipt stale');
console.log(JSON.stringify({placement:b.values+'/484 words, cell '+out.summary.editorCell,cpu:costPoints}));
