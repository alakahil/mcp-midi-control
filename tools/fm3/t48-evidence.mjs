// Replay the 2026-11-13 T48 hardware results; no device or MIDI access.
// T48A-F = generator-written per-preset Effect Bypass for the 17 blocks mapped only from the FM3-Edit display (T46),
// plus the T48A Hold probe (the user set a Hold Scene Select in FM3-Edit and stored again).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build,T48,CASES} from './t48-build.mjs';
import {compareT48Session} from './t48-compare.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const E=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const D=path.join(E,'references/t48-20261113');
const {PP_EFFECTS}=await import(path.join(E,'scripts/fm3-cs-preset.mjs'));
const {parsePresetDump,decodeRawPatch}=await import(path.join(E,'scripts/fm3-codec.mjs'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const display=JSON.parse(fs.readFileSync(path.join(D,'display-confirmation.json')));
const body=f=>{const frames=JSON.parse(fs.readFileSync(f)).storedDumpFrames.map(h=>Buffer.from(h,'hex')).filter(x=>[0x77,0x78,0x79].includes(x[5]));
 return Buffer.from(decodeRawPatch(parsePresetDump(Buffer.concat(frames),0,17).chunkPayloads).body);};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fm3-t48-ev-'));
try {
 build(path.join(tmp,'pack'));
 const rs=compareT48Session(path.join(tmp,'pack'),D);
 assert.deepEqual(rs.map(r=>r.case),CASES);
 const mislabelled=[];
 for(const r of rs){
  assert.ok(r.completed&&r.dataPassed&&!r.syntheticFixture,r.case);
  assert.ok(r.bodyByteIdentical&&!r.reordered,r.case+' stored body byte-identical');
  const labels=T48[r.case].effects.map(e=>PP_EFFECTS[e].label),cards=display.cases[r.case].cards;
  assert.deepEqual(cards.map(c=>c.frontPanel??c.fm3Edit),labels,r.case+' front panel / FM3-Edit cards');
  cards.forEach((c,i)=>{if(c.fm3Edit!==labels[i]){assert.equal(c.fm3Edit,'Amp 1');assert.equal(c.pp,1);mislabelled.push(PP_EFFECTS[T48[r.case].effects[i]].index);}});
  for(const side of ['before','after']){
   const o=r.observations[side];
   labels.forEach((l,i)=>assert.ok(o.pp_switch.includes(`lüliti ${i+1} ${l}`),`${r.case} ${side} switch ${i+1}`));
   assert.match(o.pp_switch,/sisse\/välja/);assert.equal(o.behavior,'jah');assert.equal(o.name_grid_scenes,'jah');
  }
  for(const [f,h] of Object.entries(display.cases[r.case].screenshots))assert.equal(sha(fs.readFileSync(path.join(D,f))),h,f);
 }
 assert.deepEqual(mislabelled.sort((a,b)=>a-b),[11,17,37,38,48]);
 // Hold probe: compare the T48A stored body with the body stored after the user added PP#1 Hold = Scene Select, Scene 2.
 const a=body(path.join(D,'T48A/bind-store-results.json')),h=body(path.join(D,'T48A/hold-probe.json'));
 assert.equal(a.length,h.length);
 const holdDiff=[];for(let i=0;i<a.length;i+=2)if(a.readUInt16LE(i)!==h.readUInt16LE(i))holdDiff.push({fromEnd:a.length-i,before:a.readUInt16LE(i),after:h.readUInt16LE(i)});
 assert.deepEqual(holdDiff,[{fromEnd:2620,before:0,after:3},{fromEnd:2476,before:0,after:2}]);
 assert.equal(3052-2620,432);assert.equal(3052-144-2476,432);
 const hp=JSON.parse(fs.readFileSync(path.join(D,'T48A/hold-probe.json')));assert.equal(hp.skipped,false);assert.equal(hp.shownLocation,427);
 assert.equal(sha(fs.readFileSync(path.join(D,display.hold.screenshot))),display.cases.T48A.screenshots['T48A/hold.jpg']);
 const confirmed=CASES.flatMap(c=>T48[c].effects);
 for(const e of confirmed)assert.equal(PP_EFFECTS[e].status,'switch-confirmed',e);
 const sources={};
 function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true}).sort((x,y)=>x.name.localeCompare(y.name))){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else sources[path.relative(D,p)]=sha(fs.readFileSync(p));}}
 walk(D);
 const report={schemaVersion:1,date:'2026-11-13',generatedPresetVersion:'0.3.68',
  scope:'T48A-F from tools/fm3/t48-build.mjs: generator-written per-preset Effect Bypass on FM3 footswitches 1-3 for the 17 blocks mapped only from the FM3-Edit display (T46). Actual user LOAD/GET and STORE/reload captures at location 427, user answers (FM3 front panel) and FM3-Edit display read by Claude; plus the T48A Hold probe. This replay performs no device I/O.',
  cases:rs.map(r=>({case:r.case,completed:r.completed,dataPassed:r.dataPassed,storedBodyByteIdentical:r.bodyByteIdentical,reordered:r.reordered,
   resultSha256:r.resultSha256??null,switches:T48[r.case].effects.map((e,i)=>({switch:i+1,effect:e,label:PP_EFFECTS[e].label,index:PP_EFFECTS[e].index})),observations:r.observations})),
  display,
  fm3EditPp1Mislabel:{indices:mislabelled,shown:'Amp 1',groundTruth:'FM3 front panel showed and the footswitch toggled the right block; FM3-Edit FW13 display bug, not an encoding error.'},
  hold:{set:display.hold.set,userResult:display.hold.userResult,storedWordChanges:holdDiff,
   layout:'Hold category word = 3052-432-2k from the body end (Tap category 3052-2k), Hold param words = 3052-144-432-12k (Tap 3052-144-12k): the Tap layout shifted by 432 bytes. Function word (Select = 0) presumed at +432 too, not observed changing.',
   generatorSupport:false},
  promotedToSwitchConfirmed:confirmed,
  findings:'All 17 blocks (Cab 1, Phaser 1, Wah 1, Filter 1, GEQ 1, PEQ 1, Enhance 1, Vol/Pan 1, Gate 1, MultDly 1, Megatap 1, Ten-Tap 1, Plex 1, RingMod 1, Reso 1, MultCmp 1, Looper) import, show correctly on the FM3, store byte-identically and each footswitch bypasses/engages only its own block before and after STORE. FM3-Edit labels PP#1 of indices 11/17/37/38/48 "Amp 1" (display bug). Hold Scene Select = Tap layout + 432 bytes; the long press selected scene 2.',
  sources,
  limitations:['Switch behaviour is the user\'s listening/display judgement.','One block type per family.','Hold: one definition (PP#1, Scene Select, Scene 2), set in FM3-Edit; the generator does not write Hold.','Reso 2 stays display-mapped (needs a second instance).'],
  deviceIO:false,newHardwareMeasurements:false};
 const out=path.join(E,'references/fm3-t48-20261113.json'),text=JSON.stringify(report,null,2)+'\n';
 assert.ok(process.argv.slice(2).every(x=>x==='--write'));
 if(process.argv.includes('--write'))fs.writeFileSync(out,text);else assert.equal(fs.readFileSync(out,'utf8'),text,'T48 evidence is stale');
 console.log(JSON.stringify({passed:true,acceptedHardwareCases:rs.length,bodyByteIdentical:rs.length,switchConfirmed:Object.values(PP_EFFECTS).filter(v=>v.status==='switch-confirmed').length,holdWords:holdDiff.length,deviceIO:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
