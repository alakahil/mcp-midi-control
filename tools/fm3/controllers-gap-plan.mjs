// Next Controllers evidence questions. No new source support and no device I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ref='plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-current-evidence.json';
const bytes=fs.readFileSync(path.join(ROOT,ref)),current=JSON.parse(bytes);
const checks=name=>name.startsWith('LFO ')?'Määra valitud LFO-le aeglane ja kiire sagedus; kuula Volume pulsseerimist, kontrolli Source nime ja STORE järel kordumist.':
 name.startsWith('ADSR ')?'Määra paisumine; mängi eraldi noote, kontrolli Source nime, retrigger-käitumist ja STORE järel kordumist.':
 name==='Envelope Follower'?'Mängi nõrku ja tugevaid noote; ootus määratakse kinnitatud envelope-seadistuse järgi, kontrolli Volume reaktsiooni ja STORE järel kordumist.':
 name==='Pitch Follower'?'Mängi etteantud madalaid ja kõrgeid üksiknoote; kontrolli õiget Source nime, ootuspärast Volume muutust ja STORE järel kordumist.':
 name.startsWith('Scene Controller ')?'Määra neljale stseenile selgelt erinevad väärtused; kontrolli järjest kasvavat Volume taset ja STORE järel säilimist.':
 name.startsWith('Manual ')?'Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist.':
 name==='Sequencer'?'Kontrolli rütmilist helikatkestust enne ja pärast STORE; kasuta sama T34 neljaastmelist jada.':
 'Kasuta olemasoleva T34 allikakatse ootust enne ja pärast STORE-i.';
const pending=current.controllers.filter(r=>r.audibleBehavior==='confirmed'&&r.storeReload==='not-measured');
assert.deepEqual(pending.map(r=>r.name).sort(),['ADSR 1','Scene Controller 1','Sequencer']);
const unmeasured=current.controllers.filter(r=>r.audibleBehavior==='not-measured');assert.equal(unmeasured.length,14);
const rows=[...pending,...unmeasured].map(r=>({source:r.name,code:r.code,
 priority:pending.includes(r)?'next-store-only':'only-when-needed',
 existing:r,missing:pending.includes(r)?['store-reload']:['device-import','audible-behavior','store-reload'],
 nextCheck:checks(r.name),target:'Volume/Pan 1 Volume, ALL',
 prerequisites:['Verified four-file bundle; one independent source binding per preset.','Validated controller values and expected response before import.'],
 deviceMeasurementPerformed:false}));
const report={schemaVersion:1,asOf:'2026-11-08',evidence:{path:ref,sha256:createHash('sha256').update(bytes).digest('hex')},
 supportedSources:19,behaviorConfirmed:5,storeConfirmed:2,storeOnlyPending:3,behaviorPending:14,
 rows,excluded:['External 2-16','PEDAL','Control Switch in volumePedal.source','Other modifier targets'],
 separateQuestions:['Different LFO shapes/depths and modifier curves.','Sequencer Rate units beyond the measured 4 Hz case.'],
 minimalNextRound:'Three separate T34 source presets, one STORE/reload/readback each; submit the three sessions together. No hardware has been used by this plan.'};
const md=['# Controllersi järgmised tõendilüngad','',
 '## Esimene voor: ainult puuduv STORE-kinnitus','',
 'Scene Controller 1, Sequencer ja ADSR 1 on juba kuuldavalt kinnitatud. Järgmine pakett kordab nende kolme säilimist pärast STORE-i ja taaslaadimist. Üks sõltumatu sidumine ühes presetis; kolm tulemust saab saata koos.',
 '', '| Allikas | Puudu | Järgmine kontroll |','|---|---|---|',
 ...rows.map(r=>`| ${r.source} | ${r.missing.join(', ')} | ${r.nextCheck} |`),
 '', '## Piirid','',
 'Ülejäänud 14 allika katse on vajaduspõhine. See plaan ei ava uusi allikaid ega sihtparameetreid. Kõigi allikate siht on Volume/Pan Volume, ALL. Erinevad LFO-kujud, sügavused ja modifikaatorikõverad vajavad oma kontrollitud ootust.',
 '', 'Masinloetav plaan: [controllers-gap-plan.json](parameter-evidence/controllers-gap-plan.json). Tõendibaas: [FM3_CURRENT_EVIDENCE.md](FM3_CURRENT_EVIDENCE.md).',
 'Taasesitus: `node tools/fm3/controllers-gap-plan.mjs`; uuendamine: lisa `--write`. Uusi seadmemõõtmisi pole tehtud.',''].join('\n');
assert.ok(process.argv.slice(2).every(a=>a==='--write'));
for(const [file,text] of [['docs/fm3/parameter-evidence/controllers-gap-plan.json',JSON.stringify(report,null,2)+'\n'],['docs/fm3/FM3_CONTROLLERS_GAPS.md',md]]){
 if(process.argv.includes('--write'))fs.writeFileSync(path.join(ROOT,file),text);else assert.equal(fs.readFileSync(path.join(ROOT,file),'utf8'),text,'Controllers gap plan stale');
}
console.log(JSON.stringify({passed:true,sources:19,behaviorConfirmed:5,stored:2,storeOnlyPending:3,otherPending:14,deviceIO:false}));
