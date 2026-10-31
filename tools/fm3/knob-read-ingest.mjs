// Receipt for the 2026-10-31 knob display check (FM3_BIND_STORE.py --load / --record, test T17). Offline.
// The packs are rebuilt (tools/fm3/knob-read-build.mjs). For each control the user read the FM3 front panel
// (edit buffer, block on the stated channel); the reading is compared with the table encoder's own display for
// the stored word, rounded to the decimals the FM3 showed. Nothing was stored or set.
// Usage: node tools/fm3/knob-read-ingest.mjs [--write]
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
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t17-'));execFileSync('node',[path.join(ROOT,'tools/fm3/knob-read-build.mjs'),tmp],{stdio:'ignore'});
const parts={A_DYN:'a',B_PITCH:'b'},controls=[],files={};
for(const [dir,tag] of Object.entries(parts)){
  const mb=fs.readFileSync(path.join(tmp,dir,'manifest.json')),m=JSON.parse(mb);
  const rf=path.join(RAW,`fm3-knob-read-${tag}-20261031-results.json`),lf=path.join(RAW,`fm3-knob-read-${tag}-20261031-load.json`);
  const res=JSON.parse(fs.readFileSync(rf,'utf8')),load=JSON.parse(fs.readFileSync(lf,'utf8'));
  for(const r of [res,load])assert.equal(sha(mb),r.packSha256,dir+' pack rebuilt identically');assert.ok(load.userConfirmedName);
  files[dir]={results:{path:path.relative(ROOT,rf),sha256:sha(fs.readFileSync(rf))},load:{path:path.relative(ROOT,lf),sha256:sha(fs.readFileSync(lf))},type:res.readings.type};
  for(const g of m.groups){
    const shown=res.readings[g.block].split('/').map(s=>s.trim());const exp=m.expected.filter(e=>e.block===g.block);
    assert.equal(shown.length,exp.length,g.block+': one reading per control');
    exp.forEach((e,i)=>{const s=shown[i],num=Number((/-?\d+(?:\.\d+)?/.exec(s)??[''])[0]),dec=(/\.(\d+)/.exec(s)?.[1]??'').length;
      assert.ok(Number.isFinite(num),'reading '+s);const codec=Number(e.codecDisplay.toFixed(dec));
      controls.push({pack:dir,block:e.block,channel:e.channel,param:e.param,label:e.label,kind:e.kind,requested:e.requested,raw:e.raw,
        codecDisplay:+e.codecDisplay.toFixed(6),shown:s,shownValue:num,shownDecimals:dec,exact:Math.abs(codec-num)<1e-9,withinOneDisplayStep:Math.abs(e.codecDisplay-num)<=10**-dec+1e-9});});
  }
}
fs.rmSync(tmp,{recursive:true,force:true});
assert.equal(controls.length,23);
assert.deepEqual(controls.filter(c=>!c.withinOneDisplayStep),[],'every reading within one display step of the codec value');
// One reading is the codec value truncated instead of rounded (6000.07 Hz shown 6000.0); recorded, not hidden.
assert.deepEqual(controls.filter(c=>!c.exact).map(c=>[c.param,c.shown,c.codecDisplay]),[['PITCH_LPFREQ','6000.0 Hz',6000.070769]]);
// Readings that discriminate the curve: the shown value carries more than the requested digits.
const beyondRequest=controls.filter(c=>c.shownValue!==c.requested).map(c=>`${c.param}: requested ${c.requested}, FM3 ${c.shown}, codec ${c.codecDisplay}`);
assert.deepEqual(beyondRequest,['COMP_RELEASE: requested 250, FM3 249.99 ms, codec 249.992091','PHASER_FMAX: requested 3500, FM3 3500.1 Hz, codec 3500.091558']);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-31',test:'T17',
  method:'Edit-buffer load (7F 00) of two generated presets (table encoder writes at off-grid values); the user read each control on the FM3 front panel on the stated channel; nothing stored or set. Each reading is compared with the encoder display of the written word, rounded to the decimals shown.',
  files,controls,
  summary:{controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.length,
    roundingNote:'PITCH_LPFREQ (High Cut, log 200..20000 Hz): codec 6000.07 Hz, FM3 showed 6000.0 Hz; every other reading, including Pitch Level 1 79.9997 -> 80.0 and Phaser Max Frequency 3500.09 -> 3500.1, equals the codec value rounded to the shown digits. A 0.07 Hz difference at 6 kHz is far below one display step of the knob.',families:{COMP:6,PHASER:6,TREMOLO:4,PITCH:7},
    kinds:Object.fromEntries(['linear','log','integer'].map(k=>[k,controls.filter(c=>c.kind===k).length])),
    discriminating:beyondRequest,
    meaning:'The FW13 descriptor scales used by the table encoder (linear / log range and display multiplier) match the FM3 display for these 23 controls on the stated types (22 exact to the shown digits, one 0.07 Hz below the rounded codec value); the two values the FM3 showed with extra digits equal the codec value of the stored word, not the rounded request.'},
  notMeasured:['other controls and types of these blocks','audio','STORE/reload (not needed: generator words already match stored-word replays elsewhere)']};
const target=path.join(ENG,'references/fm3-knob-read-20261031.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'knob read receipt stale');
console.log(JSON.stringify({controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length}));
