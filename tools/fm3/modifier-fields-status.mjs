// Current status of the 25 modifier record words (2026-10-28): joins the Codex field audit (native MOD
// descriptor: word index = modifier PID; docs/fm3/parameter-evidence/modifier-fields-audit.json, pinned to its
// baseline commit and left unchanged) with the T7/T7b display readings, the T10 Volume check and the T9 STORE
// check. Offline. Writes docs/fm3/parameter-evidence/modifier-fields-status.json and .md.
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
  bindStore:path.join(REF,'fm3-bind-store-20261028.json'),controlSwitches:path.join(REF,'fm3-control-switch-evidence-20261028.json'),removal:path.join(REF,'fm3-modifier-removal-20261028.json')};
const audit=JSON.parse(fs.readFileSync(src.audit,'utf8')),disp=JSON.parse(fs.readFileSync(src.display,'utf8')),vr=JSON.parse(fs.readFileSync(src.volumeRange,'utf8'));
const byPid=Object.fromEntries(audit.fields.map(f=>[f.pid,f]));
const item=id=>[...disp.items,...disp.repeat.items].find(i=>i.id===id&&i.validReading!==false);
const base=item('baseline'),cont=disp.repeat.items.find(i=>i.id==='continuous'),curve=disp.repeat.items.find(i=>i.id==='curve'),auto=item('autoengage'),w17=item('word17');
assert.ok(base&&cont&&curve&&auto&&w17,'display readings present');
assert.equal(vr.readings.modifyPage.min,2.5);assert.equal(vr.readings.modifyPage.max,7.5);
const f=(word,name,display,status,writer)=>({word,name,codexAudit:byPid[word]?{pid:word,writeDecision:byPid[word].writeDecision}:null,display,status,writer});
const fields=[
  f(0,'Source',`code + 1 is the FM3 list number (51 -> "${base.source1}", 14 -> "${auto.source1}")`,'decoded','controlSwitches (Control Switch 1..6), volumePedal (External 1), Wah toggle'),
  f(1,'MOD_MIN',`target stored word: Rotary Rate ${cont.words[1]} -> ${cont.fields.Min}; Amp GEQ band ${curve.words[1]} -> ${curve.fields.Min}; Volume 16384 -> 2.50 (T10); switch 0 -> OFF, 65534 -> ON`,'decoded, device-confirmed on Volume','volumePedal {min,max}; controlSwitches invert'),
  f(2,'MOD_MAX',`target stored word: Rotary Rate ${cont.words[2]} -> ${cont.fields.Max}; Amp GEQ band ${curve.words[2]} -> ${curve.fields.Max}; Volume 49151 -> 7.50 (T10)`,'decoded, device-confirmed on Volume','volumePedal {min,max}; controlSwitches invert'),
  f(3,'MOD_STARTPT',`0 -> ${base.fields.Start}`,'default only','template value'),
  f(4,'MOD_MIDPT',`32767 -> ${base.fields.Mid}; ${curve.words[4]} -> ${curve.fields.Mid} (word / 65534)`,'decoded (2 points)','template value'),
  f(5,'MOD_ENDPT',`65534 -> ${base.fields.End}`,'default only','template value'),
  f(6,'MOD_SLOPE',`32767 -> ${base.fields.Slope}; ${curve.words[6]} -> ${curve.fields.Slope} (word / 65534)`,'decoded (2 points)','template value'),
  f(7,'MOD_ATTACK',`66 -> ${base.fields.Attack}; 65 -> ${auto.fields.Attack}`,'two points','template value'),
  f(8,'Target effect ID','-','structural','all writers'),
  f(9,'Target PID','-','structural','all writers'),
  f(10,'MOD_AUTOENGAGE',`0 -> ${base.fields['Auto-Engage']}; 5 -> ${auto.fields['Auto-Engage']}`,'two labels (plus the existing Wah OFF / MED SPD pair)','Wah modifier (existing)'),
  f(12,'MOD_OFFVAL',`0 and 65534 both displayed ${base.fields['Off Value']}`,'unresolved (readings do not discriminate)','template value'),
  f(13,'MOD_SCALE',`32767 -> ${base.fields.Scale}; ${curve.words[13]} -> ${curve.fields.Scale} (10^((w - 32767) / 32767) fits)`,'one non-default point','template value'),
  f(14,'MOD_OFFSET',`32767 -> ${base.fields.Offset}`,'default only','template value'),
  f(15,'MOD_RELEASE',`66 -> ${base.fields.Release}; 65 -> ${auto.fields.Release}`,'two points','template value'),
  f(17,'Channel',`0 -> ALL; 4 -> ${w17.fields.Channel}; 1 -> ${cont.fields.Channel}`,'decoded','controlSwitches channel'),
  f(20,'Secondary source','0 in every written record','not written','-'),
  f(24,'MOD_DAMPING',`template value -> ${base.fields.Damping}`,'default only (plus the existing Wah Damping pair)','Wah modifier (existing)')];
const out={schemaVersion:1,date:'2026-10-28',scope:'Offline join of existing receipts; no new device I/O.',sources:Object.fromEntries(Object.entries(src).map(([k,v])=>[k,{path:path.relative(ROOT,v),sha256:sha(v)}])),
  wordIndexIsModifierPid:'The Codex field audit maps native MOD descriptor PIDs to record words 1:1 (MOD_AUTOENGAGE PID 10 = body offset 1604 = word 10).',fields,
  supersedes:'modifier-fields-audit.json writeDecision "blocked-pending-discriminating-preset-and-display-evidence" for words 1 and 2 (that file is a pinned replay of its baseline commit and is not rewritten).',
  removal:'words 0, 8 and 9 -> 0, other words kept, no compaction (references/fm3-modifier-removal-20261028.json)',
  storeReload:'Wah + Volume + two Control Switch records stored and reloaded unchanged (T9, references/fm3-bind-store-20261028.json)',
  stillOpen:['Start / End / Offset away from their defaults','Off Value (word 12)','Scale beyond one point','Attack / Release scale beyond 65 / 66','curve writing (Mid, Slope, Scale)']};
const md=['# Modifikaatori kirje väljad, seis 28.10.2026','',`Allikad: ${Object.values(out.sources).map(s=>'`'+s.path+'`').join(', ')}. Uut seadmekatset selle koondi jaoks ei tehtud.`,'',
  '| Sõna | Väli | Näit / dekodeering | Seis | Kirjutaja |','|---|---|---|---|---|',...fields.map(x=>`| ${x.word} | ${x.name} | ${x.display} | ${x.status} | ${x.writer} |`),'',
  `Sõna indeks = modifikaatori PID (${out.wordIndexIsModifierPid})`,'',`Eemaldamine: ${out.removal}.`,'',`STORE: ${out.storeReload}.`,'',
  'Endiselt lahti: '+out.stillOpen.join('; ')+'.',''].join('\n');
const tj=path.join(P,'modifier-fields-status.json'),tm=path.join(P,'modifier-fields-status.md'),cj=JSON.stringify(out,null,1)+'\n';
if(process.argv.includes('--write')){fs.writeFileSync(tj,cj);fs.writeFileSync(tm,md);}
else{assert.equal(fs.readFileSync(tj,'utf8'),cj,'modifier fields status stale');assert.equal(fs.readFileSync(tm,'utf8'),md,'modifier fields status (md) stale');}
console.log(JSON.stringify({fields:fields.length,decoded:fields.filter(x=>/decoded/.test(x.status)).length}));
