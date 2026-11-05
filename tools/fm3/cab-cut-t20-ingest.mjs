// Receipt for the 2026-11-02 T20 Cab cut location check (Cab B; FM3_BIND_STORE.py --load / --record). Offline.
// The pack is rebuilt (tools/fm3/cab-cut-t20-build.mjs). Only part CAB_B (Preamp Type TUBE) was run; CAB_A (Preamp Type
// NONE) was not, so whether the Preamp page cuts are visible with Preamp Type NONE stays open. The user read every
// Low/High Cut on the Cab B pages; each reading is compared with the encoder display of the written word, rounded to
// the decimals shown. Nothing was stored or set. Raw answers are kept verbatim; the shifted answers are interpreted below.
// Usage: node tools/fm3/cab-cut-t20-ingest.mjs [--write]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ENG=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/');
const RAW=path.join(ROOT,'docs/fm3/hardware-results/2026-11-02/');
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t20-'));execFileSync('node',[path.join(ROOT,'tools/fm3/cab-cut-t20-build.mjs'),tmp],{stdio:'ignore'});
const mb=fs.readFileSync(path.join(tmp,'CAB_B','manifest.json')),m=JSON.parse(mb);fs.rmSync(tmp,{recursive:true,force:true});
const rf=path.join(RAW,'fm3-cab-cut-t20-cab-b-20261102-results.json'),lf=path.join(RAW,'fm3-cab-cut-t20-cab-b-20261102-load.json');
const res=JSON.parse(fs.readFileSync(rf,'utf8')),load=JSON.parse(fs.readFileSync(lf,'utf8'));
for(const r of [res,load])assert.equal(sha(mb),r.packSha256,'pack rebuilt identically');assert.ok(load.userConfirmedName);
const CUTS_RAW='Cabs leht: Cab1 - Low Cut: 33.0 Hz; High Cut 12499 Hz; Cab2 - Low Cut: 20.0 Hz; High Cut 20000 Hz; Preamp leht: Low Cut: 87.0 Hz; High Cut 7300 Hz';
assert.equal(res.readings.cuts,CUTS_RAW,'cuts answer unchanged');
assert.equal(res.readings.preamp,'Preamp Type: Tube; Preamp:');
assert.equal(res.readings.type,'Drive/Saturation/Bass/Mid/Treble/Preamp Type/Low Cut/Low Cut Slope/High Cut/ High Cut Slope');
assert.equal(res.note,'Cab kanali B MODE - DYNA-CAB');
const interpretations=[
 {field:'preamp+type',raw:[res.readings.preamp,res.readings.type],as:'Preamp page present; Preamp Type TUBE; controls Drive, Saturation, Bass, Mid, Treble, Preamp Type, Low Cut, Low Cut Slope, High Cut, High Cut Slope',reason:'Enter pressed early: the Preamp control list continued in the "type" answer'},
 {field:'note',raw:res.note,as:'Cab B mode: DynaCab',reason:'the MODE answer was given in the note'},
 {field:'cuts',raw:'Cab2 - Low Cut: 20.0 Hz; High Cut 20000 Hz',as:'unwritten Cab 2 cuts (base words), not indexed',reason:'the test wrote Cab 1 and block-level cuts only'}];
// Page -> reading for each written control.
const shownBy={CABINET_LOCUT1:'33.0 Hz',CABINET_HICUT1:'12499 Hz',CABINET_LOCUT:'87.0 Hz',CABINET_HICUT:'7300 Hz',CABINET_PRETYPE:'Tube'};
const page={CABINET_LOCUT1:'Cab (Cab 1)',CABINET_HICUT1:'Cab (Cab 1)',CABINET_LOCUT:'Preamp (Filters)',CABINET_HICUT:'Preamp (Filters)',CABINET_PRETYPE:'Preamp'};
const controls=[],enums=[];
for(const e of m.expected){
 const s=shownBy[e.param];assert.ok(s,'reading for '+e.param);
 if(e.kind==='enum'){assert.equal(String(e.codecDisplay).toUpperCase(),s.toUpperCase());enums.push({param:e.param,channel:e.channel,raw:e.raw,codecDisplay:e.codecDisplay,shown:s,page:page[e.param]});continue;}
 const num=Number((/-?\d+(?:\.\d+)?/.exec(s))[0]),dec=(/\.(\d+)/.exec(s)?.[1]??'').length,codec=Number(e.codecDisplay.toFixed(dec));
 controls.push({block:e.block,channel:e.channel,param:e.param,label:e.label,kind:e.kind,requested:e.requested,raw:e.raw,codecDisplay:+e.codecDisplay.toFixed(6),
  shown:s,shownValue:num,shownDecimals:dec,page:page[e.param],exact:Math.abs(codec-num)<1e-9,withinOneDisplayStep:Math.abs(e.codecDisplay-num)<=10**-dec+1e-9});
}
assert.equal(controls.length,4);assert.deepEqual(controls.filter(c=>!c.withinOneDisplayStep),[],'within one display step');
// Cab 1 High Cut 12499.91 Hz is shown 12499 Hz (below the rounded value), the same log High Cut pattern as T17/T18; recorded, not hidden.
assert.deepEqual(controls.filter(c=>!c.exact).map(c=>[c.param,c.shown,c.codecDisplay]),[['CABINET_HICUT1','12499 Hz',12499.911697]]);
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-11-02',test:'T20',
 method:'Edit-buffer load (7F 00) of one generated preset (Cab B: block-level and Cab 1 cuts at distinct off-grid values, Preamp Type TUBE); the user read every Low/High Cut on the Cab B pages on the FM3 front panel; nothing stored or set.',
 files:{CAB_B:{results:{path:path.relative(ROOT,rf),sha256:sha(fs.readFileSync(rf))},load:{path:path.relative(ROOT,lf),sha256:sha(fs.readFileSync(lf))}}},
 partsRun:['CAB_B'],partsNotRun:{CAB_A:'Preamp Type NONE variant not run; visibility of the Preamp page cuts with Preamp Type NONE is not established'},
 mode:'Cab B: DynaCab',answerInterpretations:interpretations,controls,enums,
 editorCorroboration:'The user also sent FM3-Edit screenshots of the same edit buffer (Cab page: Cab 1 Low Cut 33.0 Hz, High Cut 12499 Hz; Preamp page Filters: Low Cut 87.0 Hz, High Cut 7300 Hz, Preamp Type Tube). Editor display is secondary to the front panel and is not indexed.',
 summary:{controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length,
  location:'CABINET_LOCUT (pid 38) and CABINET_HICUT (pid 39) are the Preamp page "Filters" Low Cut / High Cut (with Low/High Cut Slope = PRELOSLOPE / PREHISLOPE). CABINET_LOCUT1 / HICUT1 are the Cab page per-cab Low Cut / High Cut. This confirms the T19 interpretation of the Cab 20 Hz / 20000 Hz readings.',
  roundingNote:'CABINET_HICUT1 (log 2000..20000 Hz): codec 12499.912 Hz, FM3 showed 12499 Hz; within one display step, below the rounded value like T17 Pitch High Cut and T18 Reverb High Cut.',
  meaning:'The FW13 descriptor scales match the FM3 display for the block-level Cab Low/High Cut and the Cab 1 Low/High Cut; three exact to the shown digits, Cab 1 High Cut one display step low. Write support is unchanged.'},
 notMeasured:['Preamp page visibility with Preamp Type NONE (CAB_A not run)','audio','STORE/reload']};
const target=path.join(ENG,'references/fm3-cab-cut-t20-20261102.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T20 cab cut receipt stale');
console.log(JSON.stringify({controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length}));
