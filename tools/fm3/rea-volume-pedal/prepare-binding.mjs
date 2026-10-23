// Prepare an offline baseline and complete one-export donor handoff.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createPreset,writePresetOutputs,verifyPresetOutputs} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-preset.mjs';
import {auditModifiers} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-modifier-audit.mjs';
import {inspectStructure} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/drive-collector/fm3-prototype.mjs';
import {scanRecords,readGrid} from '../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-layout.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../..');
const engine=path.join(repo,'plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions');
const out=process.argv[2];assert.ok(out&&path.isAbsolute(out),'Absolute new output folder required');
fs.mkdirSync(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=fs.readFileSync(path.join(engine,'examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx'));
const spec={composer:{schemaVersion:1,firmware:13,baseProfile:'jb-composer',name:'FM3 VOL BIND CHECK',modifiers:{external1Wah:false}},
 volumePan:true,layout:{row2:['drive','amp','cab'],row3:['volpan','delay','reverb']}};
const result=createPreset(base,spec),stem=path.join(out,'FM3_VOL_BIND_CHECK');
writePresetOutputs(stem,result,spec);verifyPresetOutputs(stem);
const audit=auditModifiers(result.syx);assert.equal(audit.summary.active,0);assert.equal(audit.name,spec.composer.name);
const body=Buffer.from(inspectStructure(result.syx).raw.body),volume=scanRecords(body).records.find(r=>r.eid===102),cell=readGrid(body).find(r=>r.id===102);
assert.equal(volume.channels,4);assert.equal(volume.words,15);assert.equal(body.readUInt16LE(volume.header+10),0);
for(let ch=0;ch<4;ch++)assert.equal(body.readUInt16LE(volume.start+ch*30+18),0);
fs.writeFileSync(path.join(out,'baseline-modifiers.json'),JSON.stringify(audit,null,2)+'\n');
const plan={schemaVersion:1,name:spec.composer.name,firmware:'13.0',scene:1,block:'Volume/Pan 1',effectId:102,parameter:'Gain',displayLabel:'Volume',pid:0,grid:{row:cell.row+1,column:cell.col+1},
 blockChannel:'A',modifierChannel:'ALL',source:14,sourceLabel:'External 1',baselineSha256:sha(result.syx),
 engineSource:'a11d8e44d0df339411d7e45ad6bea126b0bf89d5',baselineSourceSha256:sha(base),
 exportName:'FM3_VOL_BIND_CHECK_export.syx',deviceWritesByScripts:false,storeRequested:false,
 observations:['new 25-word modifier record','channel ALL','Min/Max defaults as raw words','curve and flags as raw words','all other preset body bytes preserved'],
 limits:['No numerical Min/Max sweep','No global External 1 assignment','No pedal/audio proof','No STORE/reload','Not a generator modifier writer']};
fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(plan,null,2)+'\n');
fs.copyFileSync(path.join(here,'check-binding.mjs'),path.join(out,'check-binding.mjs'));
fs.mkdirSync(path.join(out,'vendor'));fs.mkdirSync(path.join(out,'licenses'));
for(const name of ['fm3-prototype.mjs','fm3-codec.mjs'])fs.copyFileSync(path.join(engine,'scripts/drive-collector',name),path.join(out,'vendor',name));
for(const name of ['forgefx-midi-LICENSE','forgefx-midi-NOTICE'])fs.copyFileSync(path.join(engine,'scripts/wah-collector/licenses',name),path.join(out,'licenses',name));
const guide=`# Volume’i pedaaliseose doonor — üks lõppeksport

## Miks seadet vaja on

Uus Maci REA/Ghidra jooks kinnitas editori loomise → ID → Source saatmise tee. Kolm piiratud andmevoojälge ei sisalda firmware’i loodava 25-sõnalise Volume Gain’i seose täielikku vaikeolekut. Kõigi 638 olemasoleva SYX-i hulgas pole Ext1 → Volume Gain’i doonorit. Seade loob selle ühe seose; ühest ekspordist loeme ühtlasi kanaliulatuse, Min/Max-i vaikesõnad, kõvera ja lipud ning kontrollime kõikide muude baitide säilimist. Arvuliste Min/Max-väärtuste kodeeringut siin ei mõõdeta.

## Tee nii

1. Kasuta FM3 Mk II Turbo FW13.0 ja FM3-Editi. Kui aktiivses presetis on säilitamata enda muudatusi, säilita need enne katse importi.
2. Impordi **FM3_VOL_BIND_CHECK.syx** aktiivsesse redigeerimispuhvrisse. Kontrolli nime **FM3 VOL BIND CHECK** ja **Scene 1**. Volume/Pan 1 on juba rea ${cell.row+1} veerus ${cell.col+1}, kanal A, Type VOLUME. Plokke ega ühendusi pole vaja lisada.
3. Ava **Volume/Pan 1 → Volume → Modifier** (Volume-nupu modifikaatorinupp või paremklõps sellel). See on metadata Gain ehk VOLUME_GAIN, PID 0; ära vali Level-välja. Kontrolli enne muutmist: **Source = None**. Kui see ei vasta või avaneb teise parameetri aken, peatu.
4. Vali **Source = External 1**. Kontrolli **Channels = ALL**; kui see on muu, vali ALL. Jäta Min, Max, kõver, Auto Engage, Damping ja kõik muud väljad seadme loodud vaikeolekusse. Ära lohista Min/Max-nuppe ega sisesta sinna numbreid.
5. Sulge modifikaatoriaken. Ära vaheta presetti või stseeni ega kasuta STORE-i. Ekspordi terve aktiivne preset failiks **FM3_VOL_BIND_CHECK_export.syx** ja saada see vestlusse.

Terminali, REA-d ega Ghidrat pole selle sammu jaoks vaja. Pedaali ühendamist ja heli kontrollimist ei ole vaja; väljundheli võib katse ajaks vaigistada. Globaalset External 1 määrangut ei muudeta.

## Täpne algseis ja koondtabel

Imporditava SYX-i SHA-256: **${plan.baselineSha256}**. Kõik 32 modifikaatorikirjet on failist loetud; aktiivseid seoseid on **0**. Avaldatud 0.3.16 mootor lõi SYX/TXT/spec/validation-failid ning nende ühine kontroll läbis. Need tõendavad lähtefaili struktuuri, mitte uut seadmeimporti.

| Lähtepreset | Plokk / eksemplar | Kanal | Parameeter | Algväärtus | Sihtväärtus | Sisestusviis | Ekspordifail |
|---|---|---|---|---|---|---|---|
| FM3 VOL BIND CHECK; ülal toodud räsi | Volume/Pan 1 (102), Gain PID 0 | plokk A; seos ALL | Modifier Source, MOD PID 0 | None; aktiivset seost pole | External 1 (14) | rippmenüü | FM3_VOL_BIND_CHECK_export.syx |
| sama | sama | seos ALL | Channels, MOD PID 17 | uue seose vaikevalik loetakse ekraanilt; enne loomist seos puudub | ALL (0); muuta ainult kui vaja | rippmenüü | sama fail |
| sama | sama | ALL | Min/Max ja muud 25-sõnalise kirje väljad | enne loomist seos puudub | seadme loodud vaikeolek, väärtusi ei oletata | ei muudeta; loetakse ekspordist | sama fail |

## Kontroll ja vead

Võrdleja nõuab üht uut Source 14 / effect 102 / PID 0 / ALL seost. Kirje numbrit ei oletata. Kõik 32 kirjepäist, kaadrikontrollsummad, CRC ja footer peavad läbima; uue kirje 50 sisubaidist väljaspool peab preseti keha säilima baitidentselt. Modifikaatori 25 sõna salvestatakse toorkujul. Transportpäise kohanumber ja ümberpakkimise päiseväljad raporteeritakse eraldi.

Kui katse ei vasta juhendile, peatu ja saada täpne veateade ning võimalik juba tehtud eksport. Ära korda importi või muudatusi pimesi. Katse puudutab aktiivset puhvrit; püsivat presetipesa ei määrata ja STORE/reload’i ei tehta.

Kaasas olev check-binding.mjs on ainult failivõrdleja, mida kasutame tagastatud faili analüüsil; sina ei pea seda käivitama. Genereeritud validation.json kirjeldab lähtepreseti kontrolli, mitte veel tulemata seadmetulemust. fullRangeEncodingProven=false säilib ning Wahi tulemusi Volume’ile üle ei kanta.
`;
fs.writeFileSync(path.join(out,'LOE_MIND.md'),guide);
const files=fs.readdirSync(out,{recursive:true}).filter(n=>fs.statSync(path.join(out,n)).isFile()).sort();
fs.writeFileSync(path.join(out,'SHA256SUMS'),files.map(n=>sha(fs.readFileSync(path.join(out,n)))+'  '+n).join('\n')+'\n');
console.log(JSON.stringify({directory:out,baselineSha256:plan.baselineSha256,activeModifiers:audit.summary.active,files:files.length+1,verified:true,deviceIO:false}));
