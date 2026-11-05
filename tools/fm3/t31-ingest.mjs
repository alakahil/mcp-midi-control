// Receipt for the 2026-11-05 T31 tests (legacy Cab IR number + CPU of the insertable block types). Offline.
// Both packs are rebuilt (tools/fm3/t31-build.mjs) and must match the manifest SHA-256 recorded by the loader and the
// preset SHA-256 values the CPU collector checked. Screenshots are not kept; the readings were transcribed from them.
// Nothing was stored or set; FM3-Edit was quit without saving.
//   REA (FM3-Edit 1.07.17 __block_layout.xml, sha 0fc5f3da…95a2): CABINET_TYPE1/2 are the Cab 1/2 "#" readouts of the
//     Legacy Cab page; DISTORT_XFLEAKAGE/RESOLUTION/DYNDEPTH/DYNPRES and TENTAP_REFTEMPO have no EditorControl.
//   Cab (CB1): the Cab record read back unchanged (424 words); FM3-Edit, Cab channel A: Legacy, Cab 1 Factory 1 # 18
//     "1x8 Dan-O 414 A", Cab 2 Factory 2 # 201 "4x10 Bassguy 160 B" for stored words 17 and 200: # = stored word + 1.
//   CPU: calibration 52.5 % at the start and at the end (hand reading 52.8 %); cost = item - calibration (meter step
//     0.5 %). The default types agree with the earlier hand measurements within 1 point.
// Usage: node tools/fm3/t31-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-05/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rel=f=>({path:path.relative(ROOT,f),sha256:sha(fs.readFileSync(f))});
const J=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t31-'));execFileSync('node',[path.join(ROOT,'tools/fm3/t31-build.mjs'),tmp],{stdio:'ignore'});
const am=fs.readFileSync(path.join(tmp,'FM3_T31_CAB','manifest.json')),cab=JSON.parse(am);
const cmBytes=fs.readFileSync(path.join(tmp,'FM3_T31_CPU','manifest.json')),cm=JSON.parse(cmBytes);
fs.rmSync(tmp,{recursive:true,force:true});
const cpuMeasurements=J(path.join(ENG,'references','fm3-cpu-measurements-20261023.json'));

// ---- REA ----
const insertPolicy=J(path.join(ENG,'references','fm3-insert-applicability.json'));
const LAYOUT_SHA='0fc5f3dac1e33aa2fee6d8e1efeda6fc0f6a8782f63519d54aa973cbe67595a2';
assert.equal(insertPolicy.sources.layoutSha256,LAYOUT_SHA,'same pinned FM3-Edit layout');
assert.equal(insertPolicy.families.TENTAP.parameters['37'].reason,'no active FW13 XML write control');
const rea={layoutSha256:LAYOUT_SHA,
  controls:{CABINET_TYPE1:{type:'readoutCabNumber',name:'Type',page:'Cab (Legacy)',beside:['CABINET_BANK1 dropdownCabBank','CABINET_NAME1 labelCabName']},
    CABINET_TYPE2:{type:'readoutCabNumber',name:'Type',page:'Cab (Legacy)',beside:['CABINET_BANK2 dropdownCabBank','CABINET_NAME2 labelCabName']}},
  noControl:['DISTORT_XFLEAKAGE','DISTORT_RESOLUTION','DISTORT_DYNDEPTH','DISTORT_DYNPRES','TENTAP_REFTEMPO'],
  meaning:'Only the Cab IR numbers can be read on a screen. The five words without an editor control stay unverified-taper (T23: DYNDEPTH/DYNPRES have no front-panel control either).'};

// ---- Cab ----
const loadFile=path.join(RAW,'fm3-t31-shot-load-CB1.json'),readFile=path.join(RAW,'fm3-t31-shot-read-CB1-after-load.json');
const load=J(loadFile),rd=J(readFile),item=cab.items[0],blk=item.blocks[0];
assert.equal(load.kind,'fm3-shot-load');assert.equal(load.packSha256,sha(am),'Cab pack rebuilt identically');assert.equal(load.preset,'CB1');assert.equal(load.name,item.name);assert.equal(load.allMatch,true);
assert.equal(rd.kind,'fm3-shot-read');assert.equal(rd.packSha256,sha(am));assert.deepEqual(rd.blocks[0].device,blk.expected,'re-read Cab record');
const lb=load.blocks[0];assert.equal(lb.effectId,62);assert.equal(lb.values,106*4);assert.deepEqual(lb.mismatches,[]);
for(const w of blk.writes)assert.equal(lb.testWords.find(t=>t.param===w.param).device,w.raw,w.param);
// FM3-Edit 1.07.17, Cab block, channel A (screenshot 2026-11-05 16:48 UTC; Scene 2 was active, channel A picked in the editor).
const SHOWN={CABINET_MODE:'Legacy',CABINET_BANK1:'Factory 1',CABINET_TYPE1:'18',CABINET_NAME1:'1x8 Dan-O 414 A',CABINET_LENGTH1:'Standard',
  CABINET_BANK2:'Factory 2',CABINET_TYPE2:'201',CABINET_NAME2:'4x10 Bassguy 160 B',CABINET_LENGTH2:'Standard',CABINET_MUTE2:'muted'};
const word=pid=>blk.expected[pid];
assert.equal(word(31),0,'channel A Legacy');
const cabReadings=blk.writes.map(w=>({param:w.param,pid:w.pid,raw:w.raw,before:w.before,shown:SHOWN[w.param]}));
for(const r of cabReadings.filter(r=>/TYPE/.test(r.param)))assert.equal(Number(r.shown),r.raw+1,'# = stored + 1 '+r.param);
assert.deepEqual(cabReadings.filter(r=>/BANK/.test(r.param)).map(r=>r.shown),['Factory 1','Factory 2']);

// ---- CPU ----
const resFile=path.join(RAW,'fm3-t31-cpu-results.jsonl');
const res=fs.readFileSync(resFile,'utf8').trim().split('\n').map(l=>JSON.parse(l)),byId=new Map(res.map(r=>[r.id,r]));
assert.equal(res.length,cm.items.length,'every CPU item measured once');
for(const r of res){assert.equal(r.saturated,false);assert.ok(r.reads.slice(-3).every(v=>v===r.raw),'settled reading '+r.id);assert.ok(cm.items.some(i=>i.id===r.id));}
const cal=byId.get('cal-newlook'),end=byId.get('cal-newlook-end');assert.equal(cal.calibrationOk,true);assert.equal(cal.userConfirmedName,true);
assert.equal(end.cpuPercent,cal.cpuPercent,'no meter drift over the sweep');
const items=cm.items.filter(i=>i.family!=='calibration').map(i=>({id:i.id,family:i.family,type:i.type??null,typeWord:i.typeWord??null,source:i.source,presetSha256:i.sha256,
  cpuPercent:byId.get(i.id).cpuPercent,costPoints:+(byId.get(i.id).cpuPercent-cal.cpuPercent).toFixed(1)}));
const DYNACAB=cpuMeasurements.costs.cab.cpu;
const costPoints={};
for(const it of items){
  const f=it.family,k=it.type??'default';(costPoints[f]??={});
  costPoints[f][k]=f==='cab'?+(DYNACAB+it.costPoints).toFixed(1):it.costPoints;
}
costPoints.cab['DYNA-CAB']=DYNACAB;
// Cross-check against the 2026-10-23 hand measurements (single default type per family).
const DEFAULT={plex:'Plex Delay',megatap:'Reverb Pre-Swell',tentap:'Ten-Tap Delay',resonator:'MANUAL',ringmod:'CLASSIC',gate:'Classic Expander',volpan:'VOLUME',multiband:'default',looper:'default',formant:'default'};
const crossCheck=Object.entries(DEFAULT).map(([f,t])=>({family:f,type:t,hand:cpuMeasurements.costs[f].cpu,t31:costPoints[f][t],delta:+(costPoints[f][t]-cpuMeasurements.costs[f].cpu).toFixed(1)}));
for(const c of crossCheck)assert.ok(Math.abs(c.delta)<=1.0,'default type agrees with the hand measurement '+c.family);

const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,editor:'FM3-Edit 1.07.17',date:'2026-11-05',test:'T31',
 method:'REA: FM3-Edit 1.07.17 __block_layout.xml (pinned). Cab: FM3_SHOT_LOAD.py --load + FM3_SHOT_READ.py (Remote Control) sent CB1 to the edit buffer (7F 00) and read the Cab record with fn=0x1F; Claude read the Cab page from a background FM3-Edit capture and quit FM3-Edit without saving. CPU: FM3_CPU_SWEEP.py (Jan in Terminal; he confirmed the first preset name on the FM3 screen) loaded 54 edit-buffer presets and read the CPU meter. Nothing stored or set.',
 notMeasured:['audio','STORE/reload','IR names (they come from the device)','CPU of non-default parameters inside a type','Synth voices 2 and 3 (CPU measured with voice 1 only changed)'],
 rea,
 cab:{packSha256:sha(am),preset:'CB1',presetSha256:item.sha256,load:{...rel(loadFile),time:load.time,values:lb.values,allMatch:true},read:{...rel(readFile),time:rd.time},
  editor:SHOWN,readings:cabReadings,rule:'Cab 1/2 Type is the IR number in its bank: FM3-Edit shows # = stored word + 1 (stored 0..1023 = # 1..1024).'},
 cpu:{packSha256:sha(cmBytes),results:rel(resFile),calibration:{id:'cal-newlook',cpuPercent:cal.cpuPercent,endCpuPercent:end.cpuPercent,handReading:52.8},
  items,costPoints,crossCheck,meterStepPercent:0.5,
  rule:'Block cost = CPU(item) - CPU(cal-newlook), every item being cal-newlook plus one block in row 3. Legacy Cab: Scene 1 on the composer Legacy channel changed the meter by 0, so Legacy costs the same as Dyna-Cab.'},
 summary:{cabWordsExact:lb.values,cabEditorReadings:cabReadings.length,cpuItems:items.length,
  meaning:'Cab 1/2 IR numbers are writable as the # FM3-Edit shows (Legacy channels only); fm3-cpu.mjs counts the measured cost of every type of Plex, Megatap, Ten-Tap, Resonator, Ring Mod, Gate, Synth voice 1, Volume/Pan and Legacy Cab.'}};
const target=path.join(ENG,'references','fm3-shot-t31-cab-cpu-20261105.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T31 receipt stale');
console.log(JSON.stringify({cab:cabReadings.map(r=>`${r.param} ${r.raw} -> ${r.shown}`),costPoints,crossCheck:crossCheck.map(c=>`${c.family} ${c.hand}->${c.t31}`)}));
