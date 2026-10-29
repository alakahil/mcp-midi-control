// Current status of the 25 modifier record words (2026-10-29): joins the Codex field audit (native MOD
// descriptor: word index = modifier PID; docs/fm3/parameter-evidence/modifier-fields-audit.json, pinned to its
// baseline commit and left unchanged) with the T7/T7b display readings, the T10 Volume check, the T9 / T11 STORE
// checks, the T12 per-field step check and the T13 switching check. Offline. Writes docs/fm3/parameter-evidence/modifier-fields-status.json and .md.
// Usage: node tools/fm3/modifier-fields-status.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const REF=path.join(ROOT,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/');
const P=path.join(ROOT,'docs/fm3/parameter-evidence/');
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const src={audit:path.join(P,'modifier-fields-audit.json'),display:path.join(REF,'fm3-modifier-display-20261028.json'),volumeRange:path.join(REF,'fm3-volume-range-20261028.json'),
  bindStore:path.join(REF,'fm3-bind-store-20261028.json'),controlSwitches:path.join(REF,'fm3-control-switch-evidence-20261028.json'),removal:path.join(REF,'fm3-modifier-removal-20261028.json'),
  comboStore:path.join(REF,'fm3-combo-store-20261029.json'),modSteps:path.join(REF,'fm3-mod-steps-20261029.json'),switchDirect:path.join(REF,'fm3-switch-direct-20261029.json')};
const audit=JSON.parse(fs.readFileSync(src.audit,'utf8')),disp=JSON.parse(fs.readFileSync(src.display,'utf8')),vr=JSON.parse(fs.readFileSync(src.volumeRange,'utf8'));
const st=JSON.parse(fs.readFileSync(src.modSteps,'utf8')),sw=JSON.parse(fs.readFileSync(src.switchDirect,'utf8')),cs=JSON.parse(fs.readFileSync(src.comboStore,'utf8'));
const D=w=>st.decoded['word'+w],pts=w=>Object.entries(D(w).points).map(([k,v])=>k+' -> '+v).join('; ');
assert.equal(sw.readings.source1,'14 PEDAL 2 (SW RING)');assert.equal(cs.storedVsGenerated.blockRecordWordDiffs,0);
const byPid=Object.fromEntries(audit.fields.map(f=>[f.pid,f]));
const item=id=>[...disp.items,...disp.repeat.items].find(i=>i.id===id&&i.validReading!==false);
const base=item('baseline'),cont=disp.repeat.items.find(i=>i.id==='continuous'),curve=disp.repeat.items.find(i=>i.id==='curve'),auto=item('autoengage'),w17=item('word17');
assert.ok(base&&cont&&curve&&auto&&w17,'display readings present');
assert.equal(vr.readings.modifyPage.min,2.5);assert.equal(vr.readings.modifyPage.max,7.5);
const f=(word,name,display,status,writer)=>({word,name,codexAudit:byPid[word]?{pid:word,writeDecision:byPid[word].writeDecision}:null,display,status,writer});
const fields=[
  f(0,'Source',`code + 1 is the FM3 list number (51 -> "${base.source1}", 14 -> "${auto.source1}", 13 -> "${sw.readings.source1}" (T13))`,'decoded','controlSwitches (Control Switch 1..6), volumePedal (External 1), Wah toggle'),
  f(1,'MOD_MIN',`target stored word: Rotary Rate ${cont.words[1]} -> ${cont.fields.Min}; Amp GEQ band ${curve.words[1]} -> ${curve.fields.Min}; Volume 16384 -> 2.50 (T10); switch 0 -> OFF, 65534 -> ON`,'decoded, device-confirmed on Volume','volumePedal {min,max}; controlSwitches invert'),
  f(2,'MOD_MAX',`target stored word: Rotary Rate ${cont.words[2]} -> ${cont.fields.Max}; Amp GEQ band ${curve.words[2]} -> ${curve.fields.Max}; Volume 49151 -> 7.50 (T10)`,'decoded, device-confirmed on Volume','volumePedal {min,max}; controlSwitches invert'),
  f(3,'MOD_STARTPT',`${D(3).display}: ${pts(3)}`,'decoded, device-stepped (T12)','template value'),
  f(4,'MOD_MIDPT',`${D(4).display}: ${pts(4)}; ${curve.words[4]} -> ${curve.fields.Mid}`,'decoded, device-stepped (T12)','template value'),
  f(5,'MOD_ENDPT',`${D(5).display}: ${pts(5)}`,'decoded, device-stepped (T12)','template value'),
  f(6,'MOD_SLOPE',`${D(6).display}: ${pts(6)}; ${curve.words[6]} -> ${curve.fields.Slope}`,'decoded, device-stepped (T12)','template value'),
  f(7,'MOD_ATTACK',`${D(7).display}: ${pts(7)}`,'decoded, device-stepped (T12)','template value'),
  f(8,'Target effect ID','-','structural','all writers'),
  f(9,'Target PID','-','structural','all writers'),
  f(10,'MOD_AUTOENGAGE',`0 -> ${base.fields['Auto-Engage']}; 1 -> SLOW SPD (T12); 5 -> ${auto.fields['Auto-Engage']}`,'three labels (plus the existing Wah OFF / MED SPD pair)','Wah modifier (existing)'),
  f(11,'PC Reset',pts(11),'decoded (T12)','template value'),
  f(12,'MOD_OFFVAL',`${D(12).display}: ${pts(12)}; ${D(12).open}`,'decoded (native descriptor 5..95 %, T12, Wah captures); T7 word 65534 reading is an outlier','template value'),
  f(13,'MOD_SCALE',`${D(13).display}: ${pts(13)}; ${curve.words[13]} -> ${curve.fields.Scale}`,'decoded, device-stepped (T12)','template value'),
  f(14,'MOD_OFFSET',`${D(14).display}: ${pts(14)}`,'decoded, device-stepped (T12)','template value'),
  f(15,'MOD_RELEASE',`${D(15).display}: ${pts(15)}`,'decoded, device-stepped (T12)','template value'),
  f(16,'Update Rate',pts(16),'decoded (T12)','template value'),
  f(17,'Channel',`0 -> ALL; 4 -> ${w17.fields.Channel}; 1 -> ${cont.fields.Channel}`,'decoded','controlSwitches channel'),
  f(20,'Secondary source','0 in every written record','not written','-'),
  f(24,'MOD_DAMPING',pts(24),'decoded (T12, plus the existing Wah Damping pair)','Wah modifier (existing)')];
const out={schemaVersion:1,date:'2026-10-29',scope:'Offline join of existing receipts; no new device I/O.',sources:Object.fromEntries(Object.entries(src).map(([k,v])=>[k,{path:path.relative(ROOT,v),sha256:sha(v)}])),
  wordIndexIsModifierPid:'The Codex field audit maps native MOD descriptor PIDs to record words 1:1 (MOD_AUTOENGAGE PID 10 = body offset 1604 = word 10).',fields,
  supersedes:'modifier-fields-audit.json writeDecision "blocked-pending-discriminating-preset-and-display-evidence" for words 1 and 2 (that file is a pinned replay of its baseline commit and is not rewritten).',
  removal:'words 0, 8 and 9 -> 0, other words kept, no compaction (references/fm3-modifier-removal-20261028.json; stored by the FM3 itself in T12)',
  storeReload:'Wah + Volume + two Control Switch records stored and reloaded unchanged (T9); Wah + Volume 2.50..7.50 + three Control Switch records (normal, inverted, CHAN D) + Out 2 stored and reloaded unchanged (T11)',
  switching:'Inverted and CHAN D records behave as written on the device when driven by the PEDAL 2 ring switch (T13, momentary); Control Switch footswitch state not checked (global setting)',
  stillOpen:['Off Value word 65534 (T7 read 5.0%, formula 95.0%; one-step device check)','curve writing in the generator (Start, End, Mid, Slope, Scale, Offset, Attack, Release are decoded but not exposed)','Control Switch footswitch behaviour (needs a global FC assignment)']};
const md=['# Modifikaatori kirje väljad, seis 29.10.2026','',`Allikad: ${Object.values(out.sources).map(s=>'`'+s.path+'`').join(', ')}. Uut seadmekatset selle koondi jaoks ei tehtud.`,'',
  '| Sõna | Väli | Näit / dekodeering | Seis | Kirjutaja |','|---|---|---|---|---|',...fields.map(x=>`| ${x.word} | ${x.name} | ${x.display} | ${x.status} | ${x.writer} |`),'',
  `Sõna indeks = modifikaatori PID (${out.wordIndexIsModifierPid})`,'',`Eemaldamine: ${out.removal}.`,'',`STORE: ${out.storeReload}.`,'',
  `Lülitus: ${out.switching}.`,'','Endiselt lahti: '+out.stillOpen.join('; ')+'.',''].join('\n');
const tj=path.join(P,'modifier-fields-status.json'),tm=path.join(P,'modifier-fields-status.md'),cj=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write')){fs.writeFileSync(tj,cj);fs.writeFileSync(tm,md);}
else{assert.equal(fs.readFileSync(tj,'utf8'),cj,'modifier fields status stale');assert.equal(fs.readFileSync(tm,'utf8'),md,'modifier fields status (md) stale');}
console.log(JSON.stringify({fields:fields.length,decoded:fields.filter(x=>/decoded/.test(x.status)).length}));
