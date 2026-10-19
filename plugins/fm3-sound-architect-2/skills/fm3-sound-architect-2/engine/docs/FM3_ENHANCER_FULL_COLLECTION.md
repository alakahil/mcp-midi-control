# Enhanceri alus kontrollitud; terviklik koguja — 0.69.0

**Parandus 0.69.1:** kasutaja hilisem avatud Modern-paneeli pilt tõendab,
et Bypass Mode menüüd selles vaates pole. Type all on Library, mitte Bypass
Mode. Vaikeloenditest on Bypass Mode eemaldatud; teiste tüüpide valikud
kinnitatakse endiselt tegeliku UI järgi. Puuduva menüü korral toetab parandatud
koguja vastuseid `puudub` ja `-`, eemaldades juhi plaanist. Vana juba käivitatud
koguja puhul lõpetada algküsimused `q`-ga, käivitada sama käsk ja vastata
Moderni küsimusele „Nähtavad VALIKUD/LÜLITID” ainult `Scene Ignore`.
Näidisplaan on nüüd86 sammu; allpool kirjeldatud92 hõlmas valikulisi Thru/Mute
samme ja selle varasem täielik tarkvaratest jääb ajalooliseks tulemuseks.
Uus `SETUP_FIX_TEST_RESULTS.json` kontrollib parandatud algküsimuste radu
ja olemasoleva setup'i säilimist. Faili/GET kontroll ning sessiooniskeem
ei muutu. Screenshot ja täpsustus on `references/enhancer-baseline-20261011/`.

Kasutaja tagastas `FM3_ENHANCER_BASELINE.syx` ja ühe ekraanipildi. Mõlemad
failid olid loetavad; vestluse automaatne pildi puudumise teade ei takistanud
tegeliku pildi avamist. Eksport ja pilt säilivad muutmata kujul.

## Tõendatud alus

- Eksport SHA-256: `755c477cd39b471b1c381f82dc735ad1285f2966d258a7381e8110a8f52a6d41`.
- Kehapikkus 13 804; kehahäsi `33e4e6f65b9284e36ca07449b8aadab9506ee56254d1fc8247a83c6116ca2e99`.
- Enhancer 1: EID 122, kirje algus 7460, pikkus 142, **12 sõna × 4 kanalit**.
  Parameetrid algavad 7506; Scene 2 kanalivalik asub 7472.
- Rida 3 / veerg 11, Reverb 1 ja Out 1 vahel; grid-sõna 428.
- Scene 2 A/bypass. Ülejäänud stseenides on uus Enhancer A/aktiivne.
  See on tegelik algolek: koguja ei vaheta stseeni ega kirjuta neid ümber.
- Kõik 12 vana plokikirjet säilisid baitidentselt. Enhanceri eemaldamine
  ja shunt 1038 ennistamine taastab kõik **13 662 GEQ katse kehabaidi**.
- Kaadrid, CRC/footer, prefiksid, päised, pikkused, nulltäide ja nimi kontrollitud.
  Raport `FM3_ENHANCER_BASELINE_VALIDATION.json`.

Pildil FM3 FW 13.00, Scene 2, kanal A ja Type **Modern**. Type-menüüs
**Classic, Modern, Stereoizer**, kanalid A–D. Moderni nähtavad näidud:
Width 50.0%, Depth 50.0%, Low Cut 100.0 Hz, High Cut 2000.0 Hz, Level 0.0 dB;
Scene Ignore ja Bypass nupud on nähtavad. Pildi CPU **52.3% on hetkenäit**,
mitte kasutaja kinnitatud maksimum ega Enhanceri heli valideerimine.
Avatud Type-menüü varjab osa vasakust paneelist; selle alt Bypass Mode'i
väärtust ega täielikku valikuloendit ei tuletata. Classicu/Stereoizeri
juhtpaneeli pilti veel ei ole; nähtavus kinnitatakse koguja algküsimustes.

Pilt: `references/enhancer-baseline-20261011/enhancer-modern-type-menu.png`.
Vaatlus: sama kausta `observation.json`. Eksport: `examples/FM3_ENHANCER_BASELINE.syx`.
Need tõendavad ploki struktuuri ja näidatud UI-d. **Päris Enhanceri GET/SYX
paar, parameetrite kirjutusseosed ning heli/CPU lõppkatse on veel OOTEL.**

## Üks terviklik pakett

`scripts/enhancer-full-collector/`, kasutajapakett `FM3_ENHANCER_FULL.zip`.
Algküsimused koguvad iga Type tegelikult nähtavad arvulised juhid, ühikud,
valikud/lülitid ja menüüde kõik nimetused. Etteantud loendid on ettepanekud,
mille kasutaja peab ekraaniga võrdlema. Puuduvad juhid eemaldatakse samast
plaanist, lisanduvad tuntud juhid ja menüüvalikud pikendavad seda. Loendiväline
juht peatab töö enne GET-i ning vajab ülevaatust.

Algküsimustes võib kasutaja Type'i vahetada. **Enne esimest GET-i tuleb
taastada paketi baseline.syx**; esimene samm ei nõua uut eksporti. Kõik
järgmised muudatused on järjestikused ning baseline'i nende vahel ei taastata.

Iga nähtav arvuline juht: tegelik miinimum, maksimum, kolm eri vaheväärtust
madalast kõrgemani. Piire ega arvulist kodeerimist ei eeldata. Koguja salvestab
nii algse ekraaniteksti kui parsitud arvu; kHz normaliseeritakse Hz-ks,
L/R panoraam vasakul negatiivseks ja paremal positiivseks. Ühikud säilivad
plaanis. Kõik tegelikud enumvalikud, Scene Ignore ON/OFF, seejärel Modern A
täpsed 12-sõnalised koopiad B/C/D-sse, eraldi Width 25/75/35 ning A valik.
Tavapäraste juhiloendite, Thru/Mute ja nelja Invert valiku puhul **92 sammu**;
see on arvutusnäide, mitte ette kinnitatud tegelik menüüloend.

Kandidaat-PID-d failikontrolliks: Width0, Depth1, Low Cut2, High Cut3, Level4,
Bypass Mode5, Type6, Invert7, Pan L8, Pan R9, Balance10, Scene Ignore11.
Need pärinevad codec'i tabelist; **kirjutustugi ei teki selle tabeli alusel**.
Kui päris muudatus ei vasta kandidaadile, fail jääb failed-tõendiks ja GET-i
ei saadeta. Type puhul säilitatakse kõik seotud A-kanali muutused; Type6
peab sisumuutuse korral samuti muutuma. Scene Ignore võib muutuda kõigis
neljas kanalis. Kõik muud 13 804 keha baiti peavad säilima, välja arvatud
kanalikatses Scene 2 Enhanceri kanalivalik. Presetinime muutus raporteeritakse.

Üks kasutaja kinnitatud GET mõõtmise kohta:
`F0 00 01 74 11 1F 7A 00 71 F7` (EID 122). Oodatakse **48/48** sõna täpset
GET/SYX vastavust. Vastuse toorbaitidest kontrollitakse järjekorda, ümbrist,
kontrollsummasid, EID-d ja sõnade arvu. Raporti tuletatud väljad kontrollitakse
üle. Ainuke seadmesse kirjutamine on see kümnebaidine GET; SET/SAVE/STORE,
automaatne kordus, ploki/tüübi/kanali/preseti muutmise käsud puuduvad.

`q` annab ZIP-i ja pausi; sama käsk jätkab, kontrollides kõik senised paarid
failidest. `s` jätab mõõtmise koos põhjusega puuduvaks; puuduva piiri sõltuvad
punktid jäetakse GET-ita vahele. Failed/pending/cancelled säilivad, neid ei
loeta edukaks. Taastada tuleb terminalis näidatud viimase eduka donor.syx olek.
Lõpetatud plaani uuesti avamine ja `--export-only` ei saada päringut.

## Kontrollid ja jätkupunkt

`test_full.py` kontrollib sünteetiliselt kogu 92-sammulist rada, pooleli
jätmist/jätkamist, algküsimusi, muutuste piire, kaadreid, kontrollsummasid,
GET/SYX erinevusi, andmete rikkumist, faile, lukustust ja vea järel jätkamist.
POSIX pseudoterminaliga kontrollitakse päris transpordiloopi, täpselt üht
GET-i, timeout'i ja vanade vastuste eemaldamist. Test ei ühendu FM3-ga.
Tulemus `TEST_RESULTS.json` ja `docs/FM3_ENHANCER_FULL_COLLECTOR_TESTS.json`.

Pärast kasutaja ZIP-i käivitada muutmata koguja `resume()` ja auditeerida iga
edukat GET/SYX paari, tegelikke menüüloendeid, nähtavust, skaalasid ja
kanalisõltumatust. Skipped/failed ei kinnita võimalust. Vajalikud lisakatsed
valida leitud lünkade järgi. Alles siis lisada Enhancer ühisesse koostajasse
ja teha üks ühine seadme-, heli- ja CPU-katse. PEQ/GEQ kogumist ei korrata.

Planeerimise kõrvalallikas: Fractal Audio Systems, Blocks Guide (June 2023),
lk 41, https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf
(vaadatud 2026-10-11). Juhend eristab Moderni Width/Depth/lõikesagedusi,
Classicu Width/Invert/Pan/Balance ning Stereoizeri Width/Depth juhte.
See toetab algküsimuste ettepanekuid; firmware 13 tegeliku nähtavuse ja
väärtuste aluseks jäävad kasutaja UI ning mõõtmised.
