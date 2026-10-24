// Build a value-check pack (FM3_VALUE_CHECK.py, --skip-store) for a generated Auto-Swell preset. Offline.
// Volume/Pan 1 channel A = AUTO-SWELL (Threshold -40 dB, Attack 250 ms, Release 20 ms, Hysteresis 3 dB),
// channel B = VOLUME 7.5; scene 1 uses channel A. The collector loads it into the edit buffer and reads
// every block back; the user then checks the Volume page on the FM3.
// Usage: node tools/fm3/auto-swell-verify-build.mjs OUT_DIR
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as R from './fm3-read-requests.mjs';
const E='../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/';
const imp=p=>import(new URL(E+p,import.meta.url));
const {createPreset}=await imp('scripts/fm3-preset.mjs');
const {inspectStructure}=await imp('scripts/drive-collector/fm3-prototype.mjs');
const {parsePresetDump}=await imp('scripts/fm3-codec.mjs');
const {scanRecords,readGrid}=await imp('scripts/fm3-layout.mjs');
const {estimateCpu}=await imp('scripts/fm3-cpu.mjs');
const sha=b=>createHash('sha256').update(b).digest('hex'),hex=a=>Buffer.from(a).toString('hex');
const [out]=process.argv.slice(2);assert.ok(out,'Usage: auto-swell-verify-build.mjs OUT_DIR');
const read=p=>fs.readFileSync(new URL(E+p,import.meta.url));
const evidence=JSON.parse(read('references/fm3-volume-binding-evidence.json'));
const spec=JSON.parse(JSON.stringify(evidence.baseline.spec));spec.composer.name='AUTO SWELL GEN';spec.selectedScene=1;spec.allow=['enum-labels'];
spec.blockScenes={volpan:[{scene:1,channel:'A',bypass:false}]};
const c=(channel,param,value)=>({block:'volpan',channel,param,value});
spec.controls=[c('A','TYPE','AUTO-SWELL'),c('A','THRESHOLD',-40),c('A','ATTACK',250),c('A','RELEASE',20),c('A','HYSTERESIS',3),c('B','GAIN',7.5)];
const r=createPreset(read('examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'),spec),syx=Buffer.from(r.syx);
assert.deepEqual([...parsePresetDump(syx,0,17).headerPayload],[0x7f,0,0,0x40,0]);
const body=Buffer.from(inspectStructure(syx).raw.body),{records}=scanRecords(body);
const vol=records.find(x=>x.eid===102);assert.equal(body.readUInt16LE(vol.start+18),1,'channel A AUTO-SWELL');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'S1.syx'),syx);
const items=[{id:'S1',file:'S1.syx',sha256:sha(syx),name:'AUTO SWELL GEN',proves:'Volume/Pan 1 channel A AUTO-SWELL with Threshold/Attack/Release/Hysteresis, channel B VOLUME 7.5',
  cpuEstimate:estimateCpu(syx).maxPercent,bodySha256:sha(body),controls:spec.controls,expectedGrid:readGrid(body).map(g=>[g.row,g.col,g.id,g.mask]),
  blocks:records.filter(x=>x.eid!==182&&x.eid!==186).map(x=>({family:x.family,effectId:x.eid,words:x.words,channels:x.channels,request:hex(R.bulkReadPoll(x.eid)),
    expected:Array.from({length:x.channels*x.words},(_,i)=>body.readUInt16LE(x.start+2*i))}))}];
const manifest={kind:'fm3-value-check',version:1,date:'2026-10-24',confirmName:items[0].name,gridRequest:hex(R.gridRequest()),
  store:{presetId:'S1',shownLocation:436,storedDumpRequest:hex(R.storedDumpRequest(435)),note:'Not used: run FM3_VALUE_CHECK.py with --skip-store.'},
  method:'Generated Auto-Swell preset sent to the edit buffer (7F 00) only; every block read back with fn=0x1F and the grid with fn=0x01 sub=0x2E. No store, no SET.',items};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
console.log(JSON.stringify({blocks:items[0].blocks.length,cpu:items[0].cpuEstimate,channelA:Array.from({length:15},(_,i)=>body.readUInt16LE(vol.start+2*i)).join(',')}));
