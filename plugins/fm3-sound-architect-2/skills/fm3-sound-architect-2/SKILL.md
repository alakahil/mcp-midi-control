---
name: fm3-sound-architect-2
description: Kujunda FM3 Sound Architect 2-ga Fractal FM3 Mk II Turbo kitarrisounde ning loo kaasasoleva kontrollitud generaatoriga SYX/TXT presetid, stseenid ja A–D kanalivalikud. Kasuta selle plugina selgesõnalisel valimisel.
---

# FM3 Sound Architect 2

Vasta eesti keeles ja anna kasutajale konkreetne järgmine samm. Kasuta kinnitatud
varasemat infot uuesti; küsi ainult soundi või faili korrektsust mõjutavat puuduvat
infot. Lähtu viiest eesmärgist: FM3 tundmine, soovitud sound, artisti/loo sound,
päris binaarne SYX ning sellele vastav allalaaditav UTF-8 TXT.

## Kehtiv seis

See versioon sisaldab varasema FM3 Sound Architecti generaatorit, mudelimallide
registreid, lähtepreseteid ja kontrolltõendeid. Kõik paiknevad selles skill-kaustas
alamkaustas `engine/`; väline repo ega seade pole failide genereerimiseks vajalik.
Vaja on Node.js-i ja failitöötlusega täitekeskkonda. Ära väida, et FM3 on ühendatud
või et MCP/REA teenus töötab: selle plugina generaator teeb offline failitöötlust.

Peamine lähtekoht on `engine/skills/instructions/`, allpool nimetatud MOOTOR.
Selle lähtekoodi versioon on `0.3.11`; ühine käivituspunkt on `fm3-preset.mjs`.
Aluskoostaja `jb-composer-0.13.0-dev` on sisemine etapp. Need identifikaatorid
ei kinnita uue preseti seadmeimporti, heli ega CPU-d.
Privaatse plugina identiteet on `plugins_6accfd716e148191b0adb61e4e36f0e4`.
Algse plugina identiteet ja vana serveriversioon jäävad eraldi; vana plugina
arhiiviviga ei tähenda, et selle uue plugina avaldamine on automaatselt blokeeritud.

Selle juhendi kehtiv seis asendab allpool viidatud ajalooliste dokumentide
vanad „järgmine kogumine” ja „OOTEL” märked. Kasuta tegeliku kirjutustoe
kontrollimiseks alati generaatori praegust capabilities-väljundit ja skeemi.

## Kasutaja kinnitatud seadistus

- Seade: FM3 Mk II Turbo, firmware 13.0. Uue firmware korral kontrolli sobivust.
- Bonamassa „You Don't Own Me” senine test: Ibanez AS-120, humbucker-helipead,
  OUT1 stereo FOH-i. Teise pilli või ühenduse korral kohanda soundi teadlikult.
- Olemas on ka Fender Stratocaster. Ära eelda mõlema pilli võrdset sisendtaset.
- Kasutaja eelistab sammhaaval tööd ning valmis jätkatavaid kogujaid.
- Kohalik Mac: arm64, Python 3.9.6 ja Node olemas; versioone ja tegelikke faile
  kontrolli enne uusi Maci käske. Siinsel täitekeskkonnal pole automaatset Maci ligipääsu.

## Soundi kavandamine

1. Täpsusta ainult puuduv siht: artist/loo versioon või soovitud sound, kitarr,
   helipead, mono/stereo ning väljundseade. Kasuta vajaduse korral võrdlussalvestist.
2. Erista dokumenteeritud artistivarustus enda kuuldelisest lähendusest.
   Kontrolli firmware-spetsiifilisi FM3 fakte Fractal Audio ametlikest juhenditest.
   Ära kanna Axe-Fx III või FM9 võimalusi automaatselt FM3-le üle.
3. Kavanda Amp/Cab, vajalikud efektid ning stseenide helitugevussuhted. Lähtu
   kasutaja toimivast kahe rea Send/Returniga NewLook-alusest, kui muud ei nõuta.
4. Kontrolli iga soovitud binaarkirjutuse tuge capabilities-väljundist. Ära jäta
   toetamata nõuet vaikselt välja ega asenda mudelinime oletusliku ID-ga.
5. Erista faili korrektsus, seadme import/eksport ning heli/CPU ja artistisarnasuse
   hinnang. Kuuldelist või 100% identset artistisoundi ei saa failikontrolliga tõendada.

## SYX/TXT loomise töövoog

Lahenda MOOTOR selle SKILL.md asukohast: `engine/skills/instructions`.
Tee väljundid töökausta väljaspool skill'i/plugina lähtefaile.

1. Loe [koostaja juhendit](engine/docs/FM3_COMPOSER_UNIFIED.md) ning
   [NewLooki paigutust](engine/docs/FM3_COMPOSER_NEWLOOK.md). Nende vanad
   etapimärked alluvad selle juhendi kehtivale seisule.
2. Küsi kirjutustugi ja toetatud alusfailid:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" --capabilities "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx"
   ```

   `$FM3_ENGINE` peab olema enne määratud MOOTORi tegelikuks absoluutseks teeks.
3. Mallidel põhineva preseti jaoks koosta JSON skeemi
   [fm3-spec.schema.json](engine/skills/instructions/scripts/fm3-spec.schema.json)
   järgi: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-composer"`, nimi,
   vajalikud mallid/juhid ning `scenes`. Paigutuse või tabelijuhtide jaoks kasuta
   [soundi skeemi](engine/skills/instructions/scripts/fm3-sound.schema.json):
   eelmine kirjeldus läheb väljale `composer`; lisa `layout` ning vajadusel
   `controls`, `blockScenes`, `selectedScene`, `purpose`, `context`. Alusta toimivast
   `examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json` näitest, kui siht seda eeldab.
   `context` väljad on `guitar`, `pickups`, `output`; ära mõtle kasutajainfot välja.
   Loe soovitud efektipere juhendit allpool.
4. Kasuta kontrollitud alusfaili. Eelistatud NewLook-alus on
   `MOOTOR/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`. Ära sööda tundmatut
   kasutaja presetit automaatselt sellesse piiratud kirjutajasse.
5. Käivita generaator:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx" "/ABS/PRESET.spec.json" "/ABS/PRESET"
   ```

   Asenda näidisteed tegelike uute väljundite absoluutsete teedega.
6. Käivita `node "$FM3_ENGINE/scripts/fm3-preset.mjs" --verify "/ABS/PRESET"`.
   Edukas käivitus väljastab `.syx`, `.txt`, `.spec.json`, `.validation.json`;
   olemasolevat samanimelist väljundit ei kirjutata üle. Puuduv raport või räside
   erinevus tähendab poolikut või muudetud komplekti. Kontrolli raportit ning nõutud mudelite, väärtuste,
   stseenide, kanalite ja bypass'i vastavust. Põhiraport ja TXT kirjeldavad soundi
   lõplikku SYX-i; `stages.composer` on vahetulemus, mitte lõplik seadistus.
   Generaator dekodeerib faili tagasi,
   kontrollib kaadreid, CRC/footer'it ja ainult lubatud sisumuudatusi; veast ei minda üle.
7. Anna päriselt loodud `.syx` ja `.txt` failid, vajadusel spec ja raport.
   TXT peab kirjeldama eesmärki, seadet/firmware'i, pilli ja ühendust, signaaliahelat,
   mudeleid/IR-sõltuvusi, ühikuid, stseene/kanaleid ning tegelikku kontrollitaset.
   Salvesta kasutajale antavad väljundid vastavalt keskkonna failide salvestamise juhistele.

Täiskanalimalli valik asendab valitud kanali kõigi kogutud sõnadega, sealhulgas
selle tasemed; siis rakendatakse selgesõnalised juhid. Määramata kanalid/seaded
säilivad alusest. Ploki lisamine, kanalivalik ja bypass on eri toimingud:
uued plokid algavad bypass'is ning aktiveeritakse `scenes` kaudu.
Ajaparameetri muutmisel kasuta nõutud selgesõnalist Tempo NONE väärtust.
Genereerimine ei salvesta midagi FM3 presetikohta ega paigalda User IR-i.

Choruse ja Drive’i tabelijuhid kontrollitakse lõpliku kanali tüübi järgi;
sobimatu väärtus põhjustab vea ka PID või experimental/raw kaudu.
[Tüübisobivuse juhend](engine/docs/FM3_TYPE_APPLICABILITY.md) kirjeldab
FW13 reegleid ja piire. Eelista mudelivahetuseks täiskanalimalle.
[Delay/Reverbi juhend](engine/docs/FM3_DELAY_REVERB_APPLICABILITY.md) eristab
mudelit ja sisemist algoritmi: nende valijate muutmine nõuab täiskanalimalli.
Üksik nime-, PID- või raw-kirjutus ei ole lubatud. Muud juhid kontrollitakse
kanali lõpliku mudeli/algoritmi paari järgi; vedrukaja Scattering nõuab lõplikku
Tank Type SERIES-PARALLEL olekut, sõltumata päringu järjekorrast.
[Flangeri, Phaseri ja Compressori juhend](engine/docs/FM3_MODULATION_DYNAMICS_APPLICABILITY.md)
katab veel 67 mudelit. Nende mudelivahetus ja Phaseri Mode nõuavad täiskanalimalli.
Flangeri praegune MANUAL on PID 5; DRYDELAY on PID 6. Vana täpne nimi
OLD_FLANGER_MANUAL jääb PID 6 ehk Dry Delay juurde. Kasuta uusi nimesid;
vanade nimede aadresse ära tõlgenda ümber. Compressori Type on PID 12;
Companderi Ratio/Time/Transients kasutab eraldi välju. Automaatne
kompressoriajastus ja -võimendus ei ole selle nähtavuskontrolliga valideeritud.
[Wah’ ja Tremolo/Panneri juhend](engine/docs/FM3_WAH_TREMOLO_APPLICABILITY.md)
lisab 16 mudeli erisused ja nõuab nende TYPE-vahetuseks täiskanalimalli.
Paragonil puuduvad Bias/Fat/Q Tracking; Panner, Harmonic Trem ja Neon Trem
kasutavad eri juhikuid. Wah’ Control jääb aktiivse pedaalimodifikaatori korral
käsikirjutuseks suletuks; Tremolo Rate nõuab lõplikku Tempo NONE olekut.
[Rotary ja Pitchi juhend](engine/docs/FM3_ROTARY_PITCH_APPLICABILITY.md)
eristab Rotary Rate PID 0 tüübi valijast: Rotaryl Type puudub. Pitchi 16
mudelit kontrollitakse lõpliku tüübi järgi; TYPE nõuab täiskanalimalli.
[Pitchi presetisõnade kodeering](engine/docs/FM3_PITCH_WORD_CODECS.md) lahendab
34 välja: 20 märgiga täisarvu, viis otse salvestatud täisarvu, seitse
kontekstist sõltuvat noodinihet ja kaks enumit algus-ID-ga 1.
Enumites eelista silte; arv tähendab salvestatud ID-d.
CUSTOMSCALE1/2 jaoks eelista silte SCALE 1…SCALE 32; arvuline sisend on endiselt
nullist algav indeks 0…31. NUMREPEATS kood 31 kuvab INFINITE; eelista seda silti.
Staatus preset-word-crosschecked ei tähenda uut riistvaramõõtmist ega live MIDI SET tuge.

Kohaliku kohandatud skaala jaoks loe
[Pitchi kohandatud skaalad](engine/docs/FM3_PITCH_CUSTOM_SCALES.md).
Vali täiskanalimalliga Dual Diatonic, Quad Diatonic, Arpeggiator või
Quad Diatonic Delay ning määra SCALE väärtuseks CUSTOM.
Määra CUSTOMNOTES vahemikus 4…8 ja NOTE2…NOTE8 aktiivsetele astmetele
täisarvulised pooltooninihked toonikast. Esimene aste on alati 0; ülejäänud
aktiivsed nihked peavad rangelt kasvama ja jääma alla 12. Esita terve soovitud
skaala ühes controls-loendis; generaator kontrollib lõppolekut järjekorrast
sõltumatult. Ära kirjuta peidetud astmeid ega TONIC kuvaseadet.
Globaalsete skaalade sisu ei ole presetis. Kasuta validation.json sõltuvusloendit
ja readPlan-i; eraldi lugemisplaani jaoks käivita
node engine/skills/instructions/scripts/fm3-pitch-custom-scales.mjs --scales 1,32
või --all. See väljastab ainult plaani, ei loo seadmeühendust ega loe sisu.
[Tempo- ja modifikaatorijuhend](engine/docs/FM3_PARAMETER_DEPENDENCIES.md) kirjeldab
21 tempo-seost ning olemasolevate modifikaatorite lugemist. Time/Rate kirjutus
nõuab lõpliku kanali Tempo NONE olekut; aktiivse modifikaatori sihtmärgile
käsiväärtust ei kirjutata. Ära lülita modifikaatorit vaikimisi välja. TXT eristab
salvestatud väärtust tempo või kontrolleri juhitud väärtusest. Muude perede
tüübisobivus ja katmata sõltuvused jäävad piiranguks; skalaari olemasolu ei anna
universaalset kirjutusluba.

## Toetatud põhivõimalused

Kasuta järgnevat ülevaatena; täpsed sisendipiirid tulevad koodist ja skeemist.

| Valdkond | Tugi ja juhend |
|---|---|
| Amp/Cab | 336 Amp- ja 45 Dyna-Cab täiskanalimalli A–D; [kanalijuhend](engine/docs/FM3_COMPOSER_AMP_CAB_CHANNELS.md). Üksikjuhid on piiratud mõõdetud kanalite/vahemikega; [Amp Level](engine/docs/FM3_COMPOSER_AMP_LEVELS.md). |
| Muud efektid | Drive, Delay, Reverb, Compressor, Chorus, Flanger, Phaser, Wah, Tremolo/Panner, Rotary ja Pitch: kogutud mallid ning capabilities'is loetletud juhid. Kõigi parameetrite vaba muutmist sellest ei järeldu. |
| Stseenid | Kõigi 8 stseeni nimed, toetatud plokkide kanalid/bypass; [stseenijuhend](engine/docs/FM3_COMPOSER_SCENES.md). Kanaliseade mõjutab kõiki seda kanalit kasutavaid stseene. |
| PEQ | Viis riba, A–D, mõõdetud tüübid/kalded ja arvulised skaalad; [PEQ](engine/docs/FM3_PEQ_COMPOSER.md). Blocking-tüübil pole Q/Gaini kirjutust. |
| GEQ | Kogutud ja koostajas; [GEQ](engine/docs/FM3_GEQ_COMPOSER.md). |
| Enhancer | Modern/Classic/Stereoizer A–D; [Enhancer](engine/docs/FM3_ENHANCER_COMPOSER.md). Nõua `channel`, `type`, `levelDb`; kirjuta ainult tüübi nähtavaid juhte. Bypass on stseeninupp; Bypass Mode'i menüüd ei küsita. |
| Filter | 18 täiskanalimalli A–D ning allpool loetletud 40 täpset mõõtepunkti; [Filter](engine/docs/FM3_FILTER_MEASURED_CONTROLS.md). |

## Lõpetatud kontrollid — ära korda kogumist

- PEQ, GEQ ja Enhanceri kokkulepitud integratsioonietapp on lõpetatud.
  PEQ testidel CPU 47–48%; GEQ suurim kasutaja nähtud CPU 50% ja toimimine kinnitatud.
- Enhancer: 87 GET/SYX-paari, 48/48 sõna igas paaris. Ühise A–D katse kõik
  13804 sisubaiti säilisid. Kasutaja kinnitas: „Suurim CPU 52.7%. Enhancer toimib”.
  [Seadmering](engine/docs/FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json).
  Ära küsi sama preseti importi, eksporti, CPU-d ega Classic Pan Lefti mõõtmisi uuesti.
- Filter: 32 GET/SYX-paari, 40 mõõdetud punkti, 4736 kattuvat sõna. Viimane
  lisa andis 15 paari ja 23 punkti; kaks varast tõrget lahendati korduskatsetega.
  Kõik 32 mõõteoleku sisud taastati generaatoriga täpselt. Q 0.707 on mõõdetud.
  [Audit](engine/docs/FM3_FILTER_REA_AUDIT_20261012.json),
  [generaatori test](engine/docs/FM3_FILTER_REA_GENERATOR_TESTS.json).
  Filter oli bypass'is: aktiivse Filteri heli ja CPU pole selle auditiga kinnitatud.

CPU-näidud kehtivad vastavate testpresetite kohta, mitte iga uue kombinatsiooni
kohta. Kui raport tuvastab varasema seadmeekspordiga täpselt sama kogu sisu,
ära nõua selle korduseksporti. Uue kombinatsiooni puhul märgi kontrollimata osa ausalt.

### Filteri täpsed kirjutuspunktid

| Kanal / Type | Väli | Mõõdetud sihid |
|---|---|---|
| A High-Pass | `frequencyHz` | 20, 80, 120, 250, 750, 20000 |
| B Low-Pass | `frequencyHz` | 20, 1600, 4000, 6000, 8000, 20000 |
| C Peaking | `frequencyHz` | 20, 500, 1000, 2000, 3200, 20000 |
| C Peaking | `q` | 0.1, 0.707, 1, 1.4, 2, 10 |
| C Peaking | `gainDb` | -20, -10, -3, 0, 3, 20 |
| C Peaking | `levelDb` | -80, -30, -6, 0, 3, 20 |
| A High-Pass ja B Low-Pass | `order` | "2nd", "4th" |

Arvesta registris salvestatud ekraaniümardusi: näiteks B 1600→1599.9 ja
C 3200→3199.9 Hz. Nii siht kui ka registreeritud ekraaninäit on toetatud sisendid.
Order PID7: 2nd=0, 4th=1. Ära interpoleeri Filteri suvalisi vaheväärtusi ega laienda
neid juhte mõõtmata tüüpidele/kanalitele. Kandidaatvalemite sobimine ei ava ise kirjutustuge.

## REA ja arenduse jätkamine

REA on uurimisvahend; presetisõna kodeering vajab eraldi tõendit. Macis on
varem seadistatud JDK21, Ghidra12.1.4 ning REA6.4.0 ja FM3-Edit1.07.17 arm64 fail.
Ära alusta nende paigaldamist ega edukat analüüsi uuesti ainult vana dokumendi
„puudub” märkuse tõttu. Kontrolli tegelikke kohalikke teid enne Maci kasutusjuhist.

Viimased kontrollitud uurimistulemused on kaasas:
- [FM3-Editi cache-audit](engine/research/FM3_CACHE_AUDIT_20261012.zip):
  45 sektsiooni, 2509 kirjet, Filteri 37 parameetri metadata ja 11 enumloendit.
- [Native-audit](engine/research/FM3_REA_NATIVE_AUDIT_20261012.zip):
  UI sündmuse, dispatcheri ja parameetripaketi analüüs. Normaliseeritud float'i
  pakkimine ei tõenda automaatselt kõigi presetiparameetrite uint16 teisendust.

Loe arhiive ajutises analüüsikaustas; ära lisa välispakettide sõltuvusi,
FM3-Editi rakendust ega Ghidra projekte plugina paketti. [REA arendusjuhendi](engine/docs/FM3_REA_DEVELOPMENT.md)
varasemad keskkonnatakistused on ajaloolised. Ära muuda kaitse- ega protsessikontrolle.

## Ühendatud generaator — tabelikodeerija, paigutus ja soundid

Säilita 0.3.0 paigutus/tabeliarendus ja 0.2.2 Amp Leveli lisatõendid koos. Kõik teed on MOOTORIS
(`engine/skills/instructions/`) või `engine/docs/`. Detailid: `engine/docs/FM3_TABLE_ENCODER.md`,
`engine/docs/FM3_LAYOUT.md`.

- **Tabelikodeerija** `scripts/fm3-table-encoder.mjs` + `references/fm3-param-dictionary.json`
  (FracTool 3.87 FM3 tabel, 2892 parameetrit, 488 valikuloendit). Väärtused antakse FM3-Edit'i näiduna.
  Kõverad: lineaarne, logaritmiline, nupp (klass 0x5: näit = n × 10), lineaarne dB (0x6).
  Tõendid: 280/280 seadmepunkti, 15/15 partiikatse näitu (`references/taper-batch-20261013.json`),
  12/12 senist juhti. Vaikimisi kirjutatakse measured / taper-class-verified / enum-labels-crosschecked;
  linear-by-structure ja enum-labels vajavad `allow`; unverified-taper (36 kirjet) mitte kunagi.
- **Kahe rea paigutus** `scripts/fm3-layout.mjs`: rida 2 In 1 → … → Send, rida 3 Return → … → Out 1,
  read 1/4 tühjad; plokkide järjekorra määrab sound. Ruudustiku liigutamine on **seadmel kinnitatud**
  (`examples/FM3_LAYOUT_MOVE_TEST_export.syx` keha identne).
- **Soundi koostaja** `scripts/fm3-sound.mjs` (jb-newlook): `composer` → `layout` → `blockScenes` →
  `controls` → `selectedScene`. Output Scene Level 1–8 (−20…+20 dB) on seadmel kinnitatud.
- **Satriani "Soap On A Rope"** `examples/SATRIANI_SOAP_ON_A_ROPE{,_V2,_V3}.*`: V1/V2 kuulatud, V3 (tämber
  eraldatud originaali kitarriraja järgi) ootab kuulamist. Kõik kolm on SA2 koostajaga baitidentsed.
- **Helivõrdlus** `scripts/fm3-audio-compare.py REF FM3`: kolmandikoktaavi tämber ja stereolaius
  (eelista eraldatud kitarrirada). Efektide tuvastamine EI ole valideeritud — ära väida helianalüüsi
  põhjal phaserit/delay'd.
- Käivita vajadusel `node scripts/test-sound-release.mjs` ja `node scripts/test-upstream-fm3.mjs`.
  Täielik offline-komplekt on `references/offline-suite.json`; ajaloolised testid
  käivita ajutises koopias, sest osa kirjutab tulemusi fixture-kaustadesse.
  Filteri aegunud negatiivne test on parandatud: mõõdetud 2nd order peab õnnestuma,
  tundmatu 3rd peab ebaõnnestuma.
- Loe [väljalaske ja laadimise töövoogu](engine/docs/FM3_RELEASE_WORKFLOW.md).
  Uus test ei muuda klassi/struktuuri põhjal tuletatud parameetrit seadmepunktina mõõdetuks.

## Tõendite säilitamine ja avaldamine

Algne mootor on hoitud alamkaustas `engine`, säilitades selle sisemised failiteed,
impordid ja mõõteandmete kontrollsummad. Varasem pikk juhiste ajalugu paikneb
[HISTORY.md](engine/skills/instructions/HISTORY.md) failis. Loe sealt ainult
vajalikku ajaloolist lõiku; ära käsitle vana „järgmist sammu” kehtiva ülesandena.

Amp-kogumise 990 ajaloolist faili on koondatud 164 kordumatu sisuga taastatavasse
`MOOTOR/references/amp-history.json.gz` arhiivi. Kontrolli vajadusel:

```bash
python3 "$FM3_ENGINE/scripts/fm3-evidence-archive.py" verify
```

Taasta vanad `skills/instructions/references/batch-*` teed ainult ajutisse mootori
töökoopiasse. Algne kataloog, mallid ja lähteandmed peavad säilima kontrollitavana.
Ära paki taastatud ajalugu tagasi avaldatavasse pluginasse. Väljalase peab vastama ühele puhtale Git commit'ile. Kasuta repo
`tools/fm3/test-offline.py` ja `tools/fm3/build-release.py` töövoogu; vana
`fm3-package.py` sobib inventuuriks, mitte commit'iga sidumata väljalaskeks. Eelarve on 4000
faili/kausta/juurkausta kirjet. Kopeeri ainult selle oskuse failid, säilita uue
plugina identiteet ja privaatsus ning uuenda olemasolevat pluginat, mitte ära loo kolmandat.

Riistvaraaudit on ainult kasutaja kinnitatud GET/read-only päringud. Ära saada
tooreid SET-käske ega salvesta automaatselt FM3 presetikohtadele. Kontrollimpordi
teeb kasutaja FM3-Editis teadlikult, säilitades oma töö; see muudab tööpuhvrit.

## Laadimise kontroll

Enne avaldatud väljalaske kasutusvalmis kinnitamist kontrolli päriselt laaditud
plugina teed, manifesti, versiooni ja eeldatavat täispikka commit-räsi:

```bash
node "$FM3_ENGINE/scripts/fm3-self-check.mjs" EXPECTED_COMMIT_SHA
```

Kasuta väljalaskekviitungist teada olevat commit'i; ära vali väärtust kontrollitava
faili enda põhjal. Skript kontrollib kogu paketi faililoendit ja räsisid ning
teeb teadaoleva preseti kordusgenereerimise. Värskelt lahtipakitud arhiivi kontroll
ei tõenda automaatselt hosti avastust/laadimist. Kui sessioon näeb vana oskust,
puuduvaid engine-faile või erinevat versiooni, märgi laadimine kinnitamata.
Ära kirjuta hosti hallatud skill-kausta käsitsi üle, et kontroll näiliselt läbiks.
Väikese kasutusülesande offline-genereerimine ja failide kontroll lõpetavad
laadimise kontrolli; heli, FM3 import ja CPU on eraldi tõendid.

0.3.2 säilitab 0.3.1 generaatori käitumise ning kirjutab ühilduvusmanifesti
platvormi kinnitatud ASCII-paokoodidega JSON-vormingus. Nii jäävad avaldatud
failide räsid commit’ist ehitatud paketi manifestiga täpselt vastavusse.


0.3.3 parandab logaritmilise juhiku null- ja negatiivsete sisendite kontrolli.
DynaCab R1/R2 sisend on **0–10**, mitte protsent. Choruse Delay Range,
Low ning High/EQ on nüüd nimeliselt leitavad; järgi nende FW13 tüübipiire.
Drive Oversampling on redaktoris peidetud ja kirjutamisel blokeeritud.
Vaata [kuue välja lahendust](engine/docs/FM3_METADATA_RESOLUTION.md).
Kontrolli avaldatud versiooni eraldi väljalaskekviitungist; lähtekoodis olev
versiooninumber üksi ei kinnita avaldamist.

## Pitchi kuvasildid

Kasuta lõputute arpeggiatori korduste jaoks `NUMREPEATS: "INFINITE"`.
Vali globaalskaala selgesõnalise sildiga, nt `CUSTOMSCALE1: "SCALE 32"`.
Arvuline sisend säilitab vana salvestuskoodi tähenduse: skaala indeks 0–31.
Kuvasildid on FW13 püsivara põhjal ristkontrollitud, mitte uus seadmemõõtmine.
Globaalsete skaalade sisu ei sisaldu presetis; ära luba selle ülekandmist.

## Globaalsete skaalade toorvastuste kogumine

Kasuta kasutaja kinnitatud lugemisseansi jaoks
`engine/skills/instructions/scripts/global-scale-collector/FM3_GLOBAL_SCALES.py`.
Loe [Pitchi skaalade juhendi koguja osa](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#jätkatav-toorvastuste-koguja).
Koguja piirab saatmise fn=01 / sub=1A / effect=1 / PID=902…1285 päringutega.
`captureComplete` kinnitab ainult toorvastuste kogumist. Kasuta olemasoleva
ZIP-i tõlgendamiseks allpool nimetatud dekoodrit; ära muuda `contentsVerified`
või `liveGetEncodingVerified` tõeseks. `sub=01` on kirjelduspäring; vana
`buildGetParameter` kasutab kirjutavat `sub=09` käsku ja on keelatud.

## Globaalsete skaalade vaatlusandmete lisamine presetile

Kui kasutaja on andnud koguja `results.zip` faili, järgi
[skaalade dekodeerimise juhendit](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#kogutud-skaalade-dekodeerimine-ja-preseti-aruanne).
Käivita `FM3_DECODE_SCALES.py --zip /ABS/results.zip --out /ABS/observations.json`
eelmainitud `global-scale-collector` kaustast. See vajab Python 3.9+ ja töötab
seadmeühenduseta. Algset ZIP-i ei muudeta. Vigast või poolikut kogumist ei aktsepteerita.

Tekstipõhise skaala vaatluse jaoks lisa dekodeerimiskäsule selgesõnaliselt
`--display-only`. Skeem 2 säilitab arvuvälja diagnostika ja märgib TXT-is
lahknevused. Vaikimisi skeem 1 nõuab teksti/arvu kooskõla. Ära käsitle
tekstipõhist tulemust arvukodeeringu kinnitusena ega vaheta režiimi vaikselt.

Lisa ühise generaatori käsu lõppu `--global-scales /ABS/observations.json`.
Generaator nõuab lõpp-preseti kõigi salvestatud Custom Shifteri kanalite
kasutatavate skaalade andmeid. TXT näitab nootide nihkeid, kogumise aega ja
algarhiivi räsi; validation.json säilitab ka dekodeerimise aluseks olevad kaadrid.
Käivita tavapärane `--verify`, mis kontrollib ka vaatlusandmeid ja nende seost
lõpliku SYX-iga. Selle valikulise funktsiooni genereerimine ja kontroll vajavad Python 3.9+.

Erista `observationsIncluded:true` ja `contentsIncluded:false`: andmed on
aruandes, globaalse skaala sisu pole SYX-is ega kandu selle impordiga üle.
Mõlema režiimi tulemus on kogumise aja vaatlus, mitte seadme praeguse
oleku või kogu väärtusvahemiku riistvarakinnitus. Seadme identiteeti/püsivara
see päring ei tuvasta. Ära nõua juba piisava kogumise kordamist.


## External 1 → Wah piiratud kirjutustugi (0.3.5)

Kasuta `jb-composer` kirjelduses `"modifiers":{"external1Wah":true}` või
`false`; soundi ümbrises pane see `composer` sisse. Välja puudumine säilitab
algse seose. Loe [piiratud modifikaatorikirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md).
Kirjutatakse olemasoleva esimese kirje allikas NONE ↔ External 1.
Siht Wah 1 Control, ALL ja muud sõnad peavad vastama tõendatud kirjele;
Auto Engage ja Damping’u režiimi sõnadel on kummalgi kaks allpool kirjeldatud lubatud väärtust.
NewLookil puudub Wah: sisselülitamiseks küsi ka `wahChannels` täiskanalimall.
Seos ei muuda stseenide bypass'i ega seadista globaalset pedaali/MIDI vastendust.
Aktiivse seose puhul lükatakse tabeli Wah Control kirjutus tagasi kõigil A–D
kanalitel. Ära lülita seost välja ilma selgesõnalise soovita. Kõvera, muude
allikate, uute kirjete ja globaalsete skaalade kirjutamine jääb toetamata.

0.3.9 ühtlustab JSON-skeemi generaatoriga: ainult `modifiers.external1Wah`
muutev koostajapäring on lubatud ka skeemi järgi. Muid seadeid pole vaja lisada.

## Modifikaatorite failiaudit (0.3.8)

Olemasoleva preseti seoste uurimiseks kasuta
`node "$FM3_ENGINE/scripts/fm3-preset.mjs" --inspect-modifiers "/ABS/PRESET.syx"`.
Lisa `--format txt` loetava eestikeelse aruande saamiseks; vaikimisi väljastatakse
JSON. Käsk loeb faili ja kirjutab ainult standardväljundisse. See ei genereeri
uut SYX-i ega ühendu seadmega. Loe [auditi juhendit](engine/docs/FM3_MODIFIER_AUDIT.md).

Audit aktsepteerib toetatud struktuuriga faili ka väljaspool kinnitatud
koostajaaluseid. See ei anna sellele failile kirjutusluba. Erista 32
serialiseeritud kirjet seadme kasutatavast mahust, aktiivset allikaviidet
stseeni bypass'ist ja kõlavast väärtusest ning FW13 metaandmeid faili tegelikust
püsivarast. Tundmatud allikad/kanalid ja toorsõnad jäävad nähtavaks; teiseste
allikate või kõverate DSP-mõju ei arvutata. Kirjutustugi järgib piiratud Wah-juhendit; audit ise midagi ei kirjuta.

Vaata ka `contextScan` ja `targetContext`: parameetrikirje, ruudustikulahter
ning toetatud ploki kaheksa salvestatud stseeni kanal/bypass on eri faktid.
Tundmatu kirjeloendi või süsteemisaba korral on ploki olemasolu teadmata;
ära nimeta seda puuduvaks. Stseenide kanalikatvus ja bypass ei kinnita seose
toimimist ega kuuldavust. Eksporditud Bonamassa aluses on External 1 aktiivne,
kuid Wah kõigis stseenides bypass'is; NewLookis on sihtseos väljas ja plokk puudub.


Vaata `targetApplicability`: 11 kaetud efektipere A–D kanalite FW13 tüübireegel
annab sobiva, välistatud või teadmata tulemuse. Tundmatu mudeli/valija ega
puuduva või korduva sihtkirje puhul ära järelda sobivust. Kõik kanalid kuvatakse;
`inModifierScope` eristab seose ALL/A–D ulatust. Tüübireegli läbimine ei kinnita
parameetri modifikaatorituge, DSP mõju ega kirjutusluba. Rotary PID 0 on Rate,
mitte Type. Pitchi kohaliku noodi kontekst ei valideeri terve skaala sisu.


## Auto Engage kahevalikuline tugi (0.3.10)

Kasuta `"modifiers":{"wahAutoEngage":"OFF"}` või `"MED SPD"`; soundi
ümbrises pane see `composer` sisse. Välja puudumine säilitab väärtuse.
Kirjutaja nõuab lõppseoses External 1 → Wah 1 Control ALL ning täpset
säilitatud konfiguratsiooni. NewLookil lisa Wah-mall ja selgesõnaline
`external1Wah:true`. OFF ei eemalda modifikaatoriseost ega muuda stseeni bypass'i.
Loe [piiratud Wah-juhendi Auto Engage osa](engine/docs/FM3_WAH_MODIFIER.md#auto-engage-kahevalikuline-kirjutus).
Sõna 10 / keha nihe 1604: OFF=0, MED SPD=2. Ainult see paar on kasutaja
21.10.2026 FW13 ekspordi, OFF-ekraanipildi ja algväärtuse kinnitusega tõendatud.
Ära kasuta muid Auto Engage enumikoode, min/max-i, kõverat ega Attack/Release aegade kirjutusi.
Täpselt sama kogu sisu tuvastamisel ära küsi uut korduseksporti.
Seadme käitumine ja heli jäävad eraldi. Väljalaske avaldamine ja hostilaadimine
kinnitatakse eraldi commit’ipõhise kviitungiga.


## Damping’u režiimi kahevalikuline tugi (0.3.11)

Kasuta `"modifiers":{"wahDamping":"LINEAR"}` või `"EXPONENTIAL"`; soundi
ümbrises pane see `composer` sisse. Väärtused on täpselt suurtähtedes.
Välja puudumine säilitab režiimi; ainult Damping’u päring säilitab Auto Engage’i.
Nõutav lõppseos on External 1 → Wah 1 Control ALL. NewLookil lisa Wah-mall
ja `external1Wah:true`. Damping koos `external1Wah:false` ei ole lubatud.
Sõna 24 / keha nihe 1632: EXPONENTIAL=0, LINEAR=1, kinnitatud 21.10.2026
kasutaja ühe muudatuse ekspordi, kuvatõendi ning algseisu kinnitusega.
Loe [Damping’u piiratud kirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md#dampingu-režiimi-kahevalikuline-kirjutus).
Attack/Release ajad, min/max, kõver ja stseenide bypass jäävad muutmata.
Auto Engage OFF + LINEAR täpne kogu keha kattub kasutaja järelkatse ekspordiga;
sama sisu uut korduseksporti ei nõuta. MED SPD + LINEAR ja muud kooslused on
eraldi sünteetiliselt kontrollitud kombinatsioonid, mitte selle katse seadmekinnitus.
Damping’u tegelik ajakäitumine, uue faili import, heli ja CPU jäävad eraldi.
Lähtekoodi versioon ei kinnita avaldamist ega hostilaadimist.
