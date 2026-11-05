// Receipt for the 2026-10-31 T19 knob display check (Cab B, Drive B, Chorus D, Flanger A, Wah C; Rotary A;
// FM3_BIND_STORE.py --load / --record). Offline. Both packs are rebuilt (tools/fm3/knob-read-t19-build.mjs). For each
// control the user read the FM3 front panel (edit buffer, block on the stated channel); the reading is compared with
// the table encoder's own display for the stored word, rounded to the decimals the FM3 showed. Nothing was stored or set.
// Raw answers are kept verbatim; answer-format issues and the two Cab cut readings are interpreted explicitly below.
// Usage: node tools/fm3/knob-read-t19-ingest.mjs [--write]
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
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t19-'));execFileSync('node',[path.join(ROOT,'tools/fm3/knob-read-t19-build.mjs'),tmp],{stdio:'ignore'});
const packs={};
for(const [key,dir] of [['cdcfw','CDCFW'],['rot','ROT']]){
 const mb=fs.readFileSync(path.join(tmp,dir,'manifest.json'));
 const rf=path.join(RAW,`fm3-knob-read-t19-${key}-20261031-results.json`),lf=path.join(RAW,`fm3-knob-read-t19-${key}-20261031-load.json`);
 const res=JSON.parse(fs.readFileSync(rf,'utf8')),load=JSON.parse(fs.readFileSync(lf,'utf8'));
 for(const r of [res,load])assert.equal(sha(mb),r.packSha256,dir+': pack rebuilt identically');assert.ok(load.userConfirmedName);
 packs[key]={dir,m:JSON.parse(mb),res,rf,lf};
}
fs.rmSync(tmp,{recursive:true,force:true});
const A=packs.cdcfw.res.readings,B=packs.rot.res.readings;
// Answer interpretation (raw strings stay in the results files and in this receipt).
const CHORUS_RAW='0.830 Hz/47.0%/37.0%/Delay Range: 40.00 ms; Minimum Delay 6.50 ms/7199.8 Hz/110.0 Hz/3.70/-1.5 dB';
const CAB_RAW='-4.5 dB/-3.50 dB/-35.0/6.30/7.30 cm/20.0 Hz/20000 Hz';
assert.equal(A.chorus,CHORUS_RAW,'chorus answer unchanged');assert.equal(A.cab,CAB_RAW,'cab answer unchanged');
assert.equal(A.type,'Cab kanal B - Dybacab/41: 4x12 Rumble EV12L/ Input Mode: Left; Drive kanal B - T808 OD');
assert.ok(packs.cdcfw.res.note.startsWith('Chorus kanal D - Japan CE-2;Flanger kanal A - Analog Stereo; Wah kanal C - Cry Babe.'),'type answer continued in note');
const interpretations=[
 {block:'chorus',raw:'Delay Range: 40.00 ms; Minimum Delay 6.50 ms',as:'6.50 ms',reason:'the written control CHORUS_DELAYTIME is shown as "Minimum Delay" on the FM3; "Delay Range 40.00 ms" is the unwritten CHORUS_DELAYRANGE base value (max 0.04 s), not indexed'},
 {block:'type',raw:packs.cdcfw.res.note,as:'Chorus D: Japan CE-2, Flanger A: Analog Stereo, Wah C: Cry Babe',reason:'the user pressed Enter early on the TYPE question and continued the list in the note; the note also says "Cab: Delay Time asemel ..." which refers to the Chorus answer above (user slip), and that the Flanger "Delay (Manual)" control is shown only as "Manual"'},
 {block:'cab',raw:'20.0 Hz/20000 Hz',as:'not a reading of CABINET_LOCUT / CABINET_HICUT',reason:'the Low Cut / High Cut the user found on the Cab B (DynaCab) page show 20.0 Hz and 20000 Hz, which are the unchanged base words of the per-cab Cab 1 Low Cut / High Cut (CABINET_LOCUT1 pid 62 = 0 -> 20 Hz, CABINET_HICUT1 pid 66 = 65534 -> 20000 Hz). The written block-level CABINET_LOCUT (pid 38, 85 Hz) and CABINET_HICUT (pid 39, 7500 Hz) were not found on that page; both readings are kept as "different control shown" and not indexed'},
 {block:'session',raw:'first CDCFW --record attempt mistyped and aborted by the user',as:'second attempt is the results file',reason:'user report 2026-10-31; only the second --record run wrote a results file'}];
const answers={cab:CAB_RAW.split('/'),drive:A.drive.split('/'),chorus:[...CHORUS_RAW.split('/').slice(0,3),'6.50 ms',...CHORUS_RAW.split('/').slice(4)],
 flanger:A.flanger.split('/'),wah:A.wah.split('/'),rotary:B.rotary.split('/')};
const OTHER_CONTROL=new Set(['CABINET_LOCUT','CABINET_HICUT']);
const controls=[],otherControl=[];
for(const {m} of Object.values(packs))for(const g of m.groups){
 const shown=answers[g.block].map(s=>s.trim());const exp=m.expected.filter(e=>e.block===g.block);
 assert.equal(shown.length,exp.length,g.block+': one reading per control');
 exp.forEach((e,i)=>{const s=shown[i],num=Number((/-?\d+(?:\.\d+)?/.exec(s)??[''])[0]),dec=(/\.(\d+)/.exec(s)?.[1]??'').length;
  assert.ok(Number.isFinite(num),'reading '+s);const codec=Number(e.codecDisplay.toFixed(dec));
  const row={block:e.block,channel:e.channel,param:e.param,label:e.label,kind:e.kind,requested:e.requested,raw:e.raw,
   codecDisplay:+e.codecDisplay.toFixed(6),shown:s,shownValue:num,shownDecimals:dec,exact:Math.abs(codec-num)<1e-9,withinOneDisplayStep:Math.abs(e.codecDisplay-num)<=10**-dec+1e-9};
  if(OTHER_CONTROL.has(e.param)){assert.equal(row.withinOneDisplayStep,false,'cab cut reading is a different control');otherControl.push({...row,differentControlShown:true});}
  else controls.push(row);});
}
assert.equal(controls.length,50);assert.equal(otherControl.length,2);
assert.deepEqual(controls.filter(c=>!c.withinOneDisplayStep),[],'every indexed reading within one display step of the codec value');
assert.deepEqual(controls.filter(c=>!c.exact).map(c=>c.param),[],'every indexed reading exact to the shown digits');
const KNOB=['FUZZ_SLEW','CHORUS_DRIVE','OLD_FLANGER_DRIVE','WAH_DRIVE','WAH_Q','ROTARY_DRIVE'];
const knob=controls.filter(c=>c.kind==='knob');assert.deepEqual(knob.map(c=>c.param).sort(),[...KNOB].sort());
const optIn=controls.filter(c=>['CHORUS_MIX','OLD_FLANGER_MIX','ROTARY_MIX'].includes(c.param)).map(c=>`${c.param} ${c.channel}: requested ${c.requested}, FM3 ${c.shown}, codec ${c.codecDisplay}`);
assert.equal(optIn.length,3);
const fam=p=>p.replace(/^OLD_/,'').split('_')[0];
const families={};for(const c of controls)families[fam(c.param)]=(families[fam(c.param)]??0)+1;
const out={schemaVersion:1,device:'FM3 Mk II Turbo',firmware:13,date:'2026-10-31',test:'T19',
 method:'Edit-buffer load (7F 00) of two generated presets (table encoder writes at off-grid values); the user read each control on the FM3 front panel on the stated channel; nothing stored or set. Each reading is compared with the encoder display of the written word, rounded to the decimals shown.',
 files:Object.fromEntries(Object.values(packs).map(p=>[p.dir,{results:{path:path.relative(ROOT,p.rf),sha256:sha(fs.readFileSync(p.rf))},load:{path:path.relative(ROOT,p.lf),sha256:sha(fs.readFileSync(p.lf))}}])),
 types:{cab:'B: DynaCab (4x12 Rumble EV12L, Input Mode Left)',drive:'B: T808 OD',chorus:'D: Japan CE-2',flanger:'A: Analog Stereo',wah:'C: Cry Babe',rotary:'A: no type selector'},
 answerInterpretations:interpretations,userNotes:{CDCFW:packs.cdcfw.res.note,ROT:packs.rot.res.note},controls,differentControlShown:otherControl,
 summary:{controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length,
  notIndexed:otherControl.map(c=>c.param),families,
  kinds:Object.fromEntries(['linear','log','integer','knob'].map(k=>[k,controls.filter(c=>c.kind===k).length])),
  knobClass:`First FM3 display readings of the 'knob' class (flags 0x05xx; display = n * multiplier, descriptor min/max is the DSP range): ${knob.map(c=>`${c.param} ${c.shown}`).join(', ')}; all exact.`,
  labelNotes:['CHORUS_DELAYTIME (dictionary "Delay Time") is shown as "Minimum Delay" on the Japan CE-2 page, next to "Delay Range".','OLD_FLANGER_DELAYTIME (dictionary "Delay") is shown as "Manual".','CABINET_DYNACAB_Z1 (Distance, multiplier 24) is shown in cm.'],
  optInLinearByStructure:optIn,
  cabCuts:'The Low Cut / High Cut found on the Cab B DynaCab page are the per-cab Cab 1 cuts (base 20 Hz / 20000 Hz unchanged), not the block-level CABINET_LOCUT / CABINET_HICUT that were written; those two remain without a front-panel reading.',
  meaning:'The FW13 descriptor scales used by the table encoder match the FM3 display for these 50 controls on the stated types, all exact to the shown digits, including six knob-class controls. Chorus, Flanger and Rotary Mix (status linear-by-structure, opt-in) each have one matching front-panel point; their write status is unchanged.'},
 notMeasured:['CABINET_LOCUT / CABINET_HICUT (block-level cuts; not on the DynaCab page the user read)','other controls and types of these blocks','audio','STORE/reload']};
const target=path.join(ENG,'references/fm3-knob-read-t19-20261031.json'),content=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write'))fs.writeFileSync(target,content);else assert.equal(fs.readFileSync(target,'utf8'),content,'T19 knob read receipt stale');
console.log(JSON.stringify({controls:controls.length,exact:controls.filter(c=>c.exact).length,withinOneDisplayStep:controls.filter(c=>c.withinOneDisplayStep).length,notIndexed:otherControl.length}));
