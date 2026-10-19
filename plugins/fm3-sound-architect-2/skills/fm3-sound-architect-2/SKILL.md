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
Koostaja versioon on `jb-composer-0.13.0-dev`; see on kaasatud ja kontrollitud
generaatori identifikaator, mitte väide uue preseti seadme- või helikontrolli kohta.
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
   node "$FM3_ENGINE/scripts/fm3-generate.mjs" --capabilities "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx"
   ```

   `$FM3_ENGINE` peab olema enne määratud MOOTORi tegelikuks absoluutseks teeks.
3. Koosta üks JSON-kirjeldus skeemi
   [fm3-spec.schema.json](engine/skills/instructions/scripts/fm3-spec.schema.json)
   järgi: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-composer"`, nimi,
   vajalikud mallid/juhid ning `scenes`. Loe soovitud efektipere juhendit allpool.
4. Kasuta kontrollitud alusfaili. Eelistatud NewLook-alus on
   `MOOTOR/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`. Ära sööda tundmatut
   kasutaja presetit automaatselt sellesse piiratud kirjutajasse.
5. Käivita generaator:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-generate.mjs" "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx" "/ABS/PRESET.spec.json" "/ABS/PRESET"
   ```

   Asenda näidisteed tegelike uute väljundite absoluutsete teedega.
6. Kontrolli loodud `.validation.json` raportit ning nõutud mudelite, väärtuste,
   stseenide, kanalite ja bypass'i vastavust. Generaator dekodeerib faili tagasi,
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

## Claude'i arendus 0.3.0 — tabelikodeerija, vaba paigutus, soundid

Lisatud teise AI-platvormi SA2 v0.2.0 peale; ükski olemasolev fail pole muudetud. Kõik teed on MOOTORIS
(`engine/skills/instructions/`) või `engine/docs/`. Detailid: `engine/docs/FM3_TABLE_ENCODER.md`,
`engine/docs/FM3_LAYOUT.md`.

- **Tabelikodeerija** `scripts/fm3-table-encoder.mjs` + `references/fm3-param-dictionary.json`
  (FracTool 3.87 FM3 tabel, 2892 parameetrit, 488 valikuloendit). Väärtused antakse FM3-Edit'i näiduna.
  Kõverad: lineaarne, logaritmiline, nupp (klass 0x5: näit = n × 10), lineaarne dB (0x6).
  Tõendid: 280/280 seadmepunkti, 15/15 partiikatse näitu (`references/taper-batch-20261013.json`),
  12/12 senist juhti. Vaikimisi kirjutatakse measured / taper-class-verified / enum-labels-crosschecked;
  linear-by-structure ja enum-labels vajavad `allow`; unverified-taper (36 kirjet) mitte kunagi.
- **Kahe rea vaba paigutus** `scripts/fm3-layout.mjs`: rida 2 In 1 → … → Send, rida 3 Return → … → Out 1,
  read 1/4 tühjad; plokkide järjekorra määrab sound. Ruudustiku liigutamine on **seadmel kinnitatud**
  (`examples/FM3_LAYOUT_MOVE_TEST_export.syx` keha identne).
- **Soundi koostaja** `scripts/fm3-sound.mjs` (jb-newlook): `composer` → `layout` → `blockScenes` →
  `controls` → `selectedScene`. Output Scene Level 1–8 (−20…+20 dB) on seadmel kinnitatud.
- **Satriani "Soap On A Rope"** `examples/SATRIANI_SOAP_ON_A_ROPE{,_V2,_V3}.*`: V1/V2 kuulatud, V3 (tämber
  eraldatud originaali kitarriraja järgi) ootab kuulamist. Kõik kolm on SA2 koostajaga baitidentsed.
- **Helivõrdlus** `scripts/fm3-audio-compare.py REF FM3`: kolmandikoktaavi tämber ja stereolaius
  (eelista eraldatud kitarrirada). Efektide tuvastamine EI ole valideeritud — ära väida helianalüüsi
  põhjal phaserit/delay'd.
- Testid: `node scripts/test-table-encoder.mjs`, `node scripts/test-layout.mjs`.
  Teadaolev SA2 eelne probleem: `scripts/test-composer-filter.mjs` kukub läbi ka puhtas v0.2.0-s
  (aegunud ootus Filteri juhtide keelamisele pärast REA laiendust); pole selle muudatusega seotud.

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
Ära paki taastatud ajalugu tagasi avaldatavasse pluginasse. Enne väljalaset käivita
`MOOTOR/scripts/fm3-package.py` tegeliku plugina juurkaustaga; eelarve on 4000
faili/kausta/juurkausta kirjet. Kopeeri ainult selle oskuse failid, säilita uue
plugina identiteet ja privaatsus ning uuenda olemasolevat pluginat, mitte ära loo kolmandat.

Riistvaraaudit on ainult kasutaja kinnitatud GET/read-only päringud. Ära saada
tooreid SET-käske ega salvesta automaatselt FM3 presetikohtadele. Kontrollimpordi
teeb kasutaja FM3-Editis teadlikult, säilitades oma töö; see muudab tööpuhvrit.
