// Receipt for the 2026-10-31 T18 knob display check (Amp A, Delay B, Reverb C; FM3_BIND_STORE.py --load / --record).
// Offline. The pack is rebuilt (tools/fm3/knob-read-t18-build.mjs). For each control the user read the FM3 front
// panel (edit buffer, block on the stated channel); the reading is compared with the table encoder's own display
// for the stored word, rounded to the decimals the FM3 showed. Nothing was stored or set.
// The raw answers are kept verbatim; two answer-format issues are interpreted explicitly below, not hidden.
// Usage: node tools/fm3/knob-read-t18-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-10-31/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t18-'));execFileSync('node',[path.join(ROOT,'tools/fm3/knob-read-t18-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'ADR','manifest.json')),m=JSON.parse(mb);fs.rmSync(tmp,{recursive:true,force:true});
const rf=path.join(RAW,'fm3-knob-read-t18-20261031-results.json'),lf=path.join(RAW,'fm3-knob-read-t18-20261031-load.json');
const res=JSON.parse(fs.readFileSync(rf,'utf8')),load=JSON.parse(fs.readFileSync(lf,'utf8'));
for(const r of [res,load])assert.equal(sha(mb),r.packSha256,'pack rebuilt identically');assert.ok(load.userConfirmedName);
// Answer interpretation (raw strings stay in the results file and in this receipt).
const AMP_RAW='6.30/4.70/5.6076.80/3.70/4.30/2.90/ -2.5 dB /35.0 Hz/9000 Hz/1.600';
const DELAY_HEAD='437 ms/37%/28%/-1.5 dB/4500 Hz/140.0 Hz/';
assert.equal(res.readings.amp,AMP_RAW,'amp answer unchanged');assert.ok(res.readings.delay.startsWith(DELAY_HEAD),'delay answer unchanged');
assert.ok(res.readings.delay.includes('LF01 tulbas: Depth 18% ja Rate 0.650 Hz'),'delay LFO1 reading present');
const interpretations=[
 {block:'amp',raw:'5.6076.80',as:['5.60','6.80'],reason:'missing "/" separator between Mid and Treble (one reading per control otherwise: 10 fields for 11 controls)'},
 {block:'delay',raw:'LF01 tulbas: Depth 18% ja Rate 0.650 Hz',as:['0.650 Hz','18%'],reason:'Rate and Depth answered as a sentence; the written controls are LFO 1 Rate / Depth (DELAY_RATE1, DELAY_DEPTH1), read from the LFO1 column'}];
const answers={amp:AMP_RAW.replace('5.6076.80','5.60/6.80').split('/'),
 delay:[...DELAY_HEAD.split('/').slice(0,6),'0.650 Hz','18%'],reverb:res.readings.reverb.split('/')};
const controls=[];
for(const g of m.groups){
 const shown=answers[g.block].map(s=>s.trim());const exp=m.expected.filter(e=>e.block===g.block);
 assert.equal(shown.length,exp.length,g.block+': one reading per control');
 exp.forEach((e,i)=>{const s=shown[i],num=Number((/-?\d+(?:\.\d+)?/.exec(s)??[''])[0]),dec=(/\.(\d+)/.exec(s)?.[1]??'').length;
  assert.ok(Number.isFinite(num),'reading '+s);const codec=Number(e.codecDisplay.toFixed(dec));
  controls.push({block:e.block,channel:e.channel,param:e.param,label:e.label,kind:e.kind,requested:e.requested,raw:e.raw,
   codecDisplay:+e.codecDisplay.toFixed(6),shown:s,shownValue:num,shownDecimals:dec,exact:Math.abs(codec-num)<1e-9,withinOneDisplayStep:Math.abs(e.codecDisplay-num)<=10**-dec+1e-9});});
}
assert.equal(controls.length,28);
assert.deepEqual(controls.filter(c=>!c.withinOneDisplayStep),[],'every reading within one display step of the codec value');
// One reading is below the rounded codec value (6500.054 Hz shown 6500.0), as T17 Pitch High Cut (6000.07 -> 6000.0); recorded, not hidden.
assert.deepEqual(controls.filter(c=>!c.exact).map(c=>[c.param,c.shown,c.codecDisplay]),[['REVERB_HICUT','6500.0 Hz',6500.053858]]);
const optIn=controls.filter(c=>['DELAY_MIX','REVERB_MIX'].includes(c.param)).map(c=>`${c.param} ${c.channel}: requested ${c.requested}, FM3 ${c.shown}, codec ${c.codecDisplay}`);
assert.equal(optIn.length,2);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-31',test:'T18',
 method:'Edit-buffer load (7F 00) of one generated preset (table encoder writes at off-grid values); the user read each control on the FM3 front panel on the stated channel; nothing stored or set. Each reading is compared with the encoder display of the written word, rounded to the decimals shown.',
 files:{ADR:{results:{path:path.relative(ROOT,rf),sha256:sha(fs.readFileSync(rf))},load:{path:path.relative(ROOT,lf),sha256:sha(fs.readFileSync(lf))},type:res.readings.type}},
 answerInterpretations:interpretations,userNote:res.note,controls,
 summary:{controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length,
  families:{DISTORT:11,DELAY:8,REVERB:9},kinds:Object.fromEntries(['linear','log','integer'].map(k=>[k,controls.filter(c=>c.kind===k).length])),
  roundingNote:'REVERB_HICUT (High Cut Frequency, log 200..20000 Hz): codec 6500.054 Hz, FM3 showed 6500.0 Hz. Both log High Cut readings that fall below the rounded codec value (T17 Pitch 6000.07, T18 Reverb 6500.05) have a fractional part under 0.1 Hz; far below one display step of the knob.',
  labelNote:'DISTORT_LEVEL (dictionary label "Amp1 Level") is shown as "Level" on the FM3 Amp block.',
  optInLinearByStructure:optIn,
  unwrittenControls:'Delay LFO 2 (Depth 0.0 %, Rate 10.000 Hz) and LFO 3 (Depth 100 %, Rate 1.000 Hz) were not written by the test; they are base-preset values and are not indexed.',
  meaning:'The FW13 descriptor scales used by the table encoder (linear / log range and display multiplier) match the FM3 display for these 28 controls on the stated types, 27 exact to the shown digits; Reverb High Cut Frequency codec 6500.054 Hz showed 6500.0 Hz (0.05 Hz, the same pattern as T17 Pitch High Cut 6000.07 -> 6000.0). Delay Mix and Reverb Mix (status linear-by-structure, opt-in) each have one matching front-panel point; their write status is unchanged.'},
 notMeasured:['other controls and types of these blocks','audio','STORE/reload']};
const target=path.join(ENG,'references/fm3-knob-read-t18-20261031.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T18 knob read receipt stale');
console.log(JSON.stringify({controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length}));
