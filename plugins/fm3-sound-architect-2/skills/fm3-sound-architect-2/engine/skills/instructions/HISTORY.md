---
name: instructions
description: FM3 Sound Architect juhised. Kasuta FM3 Mk II Turbo nõustamiseks, soovitud või artisti/loo kitarrisoundi kujundamiseks, presetite ja SYX/TXT väljundite ettevalmistamiseks ning nende valideerimiseks.
---

# FM3 Sound Architect

## REA arendustööriist — 0.73.0, 2026-10-12

Kasuta REA-d puuduvate parameetrite uurimise ja lähtekoodi kaardistamise abiks.
Loe [REA arendusjuhendit](../../docs/FM3_REA_DEVELOPMENT.md). Lukustatud
rea-agents@6.4.0 lähtekoodi import on katsetatud: 10 Filteri moodulit,
9 sisemist / 24 välist importseost, parserivigu 0; autoriteet
historical-reference, inventory_state partial. Käivitaja on
scripts/fm3-rea-dev.py; sõltuvused ja tulemused hoia plugina kaustast väljas.

Süvaanalüüs ei tööta siinses keskkonnas: REA protsessi omandi kontrolli
ps-käsk ebaõnnestub Node alamprotsessist. Native-mootor ja FM3-Editi fail
puuduvad. Ära väida, et MCP on ühendatud, FM3-Edit dekompileeritud või kõik
REA võimalused kasutusele võetud. Ära muuda protsessikontrolli möödapääsuks.

Esimene sihitud uurimus on Filteri skaalad ja Order. Eraldi arvuline võrdlus
kattis 17/17 senist punkti kandidaatvalemitega; see pole REA leid ega uue
vahemiku valideerimine. Tootmiskoodi kirjutuspiirid jäävad kehtima.
Uut kirjutustuge luba ainult kontrollitud tõenditega; mõõtmisi ära korda.
See arenduspakett sisaldab kõiki 0.72.0 parandusi ja lõpetatud Enhanceri
seadmekinnitust. Serveriversioon oli 2026-10-12 endiselt 0.71.0; avaldamist
blokeerinud arhiiviviga on eraldi probleem. Ära esita kohalikku paketti
avaldatud pluginana.

## Korrastatud pakett ja lõpetatud Enhanceri kinnitus — 0.72.0

Amp-kogumise ajaloolised kümme `references/batch-*` kausta on koondatud
`references/amp-history.json.gz` arhiivi: 990 algset faili, 164 erinevat sisu.
Kõik failid ja algsed teed säilivad täpselt taastatavana. Amp-mallide register
ning generaatori kodeering jäid muutmata; kõik 336 mudelit on alles.
`source.file` ja varasemate juhendite `batch-*` teed on arhiivi päritoluviited.
Tõendi lugemiseks/taastamiseks kasuta `scripts/fm3-evidence-archive.py`.
Ajalooliste testide jaoks taasta failid ajutisse plugina töökoopiasse, mitte
avaldatavasse paketti. Loe [pakendi juhendit](../../docs/FM3_PACKAGE_COMPACTION.md).

**Iga avaldamise eel käivita `scripts/fm3-package.py`.** Projekt lubab kuni 4000
faili+kausta+juurkausta kirjet, jättes platvormi 5000 piirini varu. Väiksem
üleslaadimise ZIP üksi ei eemalda serverist vanu faile: migratsioon vajab täpset
kustutatavate failide loendit ja nende sisu säilitavat arhiivi.

Enhanceri seadmekatse on lõpetatud: kõik 13804 sisubaiti ja 48 parameetrisõna
säilisid; kasutaja: „Suurim CPU 52.7%. Enhancer toimib”. Alloleva 0.71.1 jaotise
kinnitus ning kasutusjuhis kuuluvad sellesse paketti. Ära korda mõõtmisi.


## Enhanceri ühine seadmekatse kinnitatud — 0.71.1, 2026-10-12

**Enhancer on kogutud, generaatorisse lisatud ja ühises A–D presetis kontrollitud.**
Kasutaja tagastas `FM3_ENHANCER_ABCD_TEST_export.syx` ning kinnitas:
**„Suurim CPU 52.7%. Enhancer toimib”.** Kõik 13804 preseti sisubaiti kattuvad
muutmata genereeritud failiga, sealhulgas Enhanceri48 sõna ja kõigi teiste
plokkide seaded. Modern A/D, Classic B, Stereoizer C; aktiivsed Scene2/3/4/6;
muudes stseenides A/bypass. Valitud Scene2, nimi ja ühendused säilisid.
Failide transpordiesitus ei ole baitidentne; preseti sisus pole ühtegi muutust.

Loe [seadmeringi raportit](../../docs/FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json)
ja [koostaja juhendit](../../docs/FM3_ENHANCER_COMPOSER.md). Muutmata kasutaja
kinnitus on `references/enhancer-feedback-20261012/feedback.json`, eksport
`examples/FM3_ENHANCER_ABCD_TEST_export.syx`. Koostaja0.12.1 tuvastab selle
konkreetse sisu ning eristab täpselt sama imporditud faili, sama sisu uue nimega
ja uut kontrollimata kooslust. **CPU52,7% on selle katse suurim nähtud näit,
mitte kõigi võimalike presetite piir.** Kasutaja kinnitas toimimist; ära lisa
ise väidet iga ekraaninäidu, monoühilduvuse või täiusliku helitasakaalu kohta.

**Ära küsi uuesti koguja käivitamist, importi, eksporti ega CPU-näitu selle
preseti jaoks.** PEQ → GEQ → Enhancer kokkulepitud integratsioonietapp on
läbitud. Neid saab kasutada järgmiste soovitud soundide koostamisel koos
seniste Amp/Cab/FX-mallide ja stseenihaldusega. Uued kombinatsioonid vajavad
oma kontrolli; Scene Ignore'i kõigi stseenide käitumist ei ole eraldi testitud.
Allolevate versioonide ootel-olekud on ajaloolised ja selle jaotisega asendatud.


## Enhancer kogutud ja generaatoris — 0.71.0, 2026-10-12

**Kogumine on lõpetatud: 87 GET/SYX paari, igas 48/48 sõna.** Täiskogumise
74 edukat paari ning lõpetatud lisa13 täidavad Classicu Pan Lefti, Leveli ja
Scene Ignore'i puudujäägid. Pan Left−100…+100; 0/+40/+80 sobivad sisepunktideks.
Ära paku enam lisakogujat ega korda varasemaid mõõtmisi. Allolevad varasemate
versioonide kogumis- ja ootel-olekud on ajaloolised ning asendatud selle jaotisega.

Koostaja `jb-composer-0.12.0` toetab Enhanceri Modern/Classic/Stereoizerit ja A–D.
`enhancerChannels` nõuab igas valikus `channel`, `type`, `levelDb`; kirjutada saab
ainult selle tüübi nähtavaid juhte. PID5 ja peidetud sõnad säilivad kogutud
mallist. Bypass on stseeninupp, Bypass Mode pole toetatud ega uuesti küsitav.
Täielik juhend: [Enhanceri koostaja](../../docs/FM3_ENHANCER_COMPOSER.md).
Tõendid: `references/enhancer-full.json`, audit ja testiraport `docs/` kaustas.

**Järgmine samm on üks ühine valmis presetikatse**, `FM3_ENHANCER_ABCD_TEST.zip`.
SYX/TXT/spec/validation on `examples/FM3_ENHANCER_ABCD_TEST.*`; juhend
`examples/FM3_ENHANCER_ABCD_TEST_CHECK.txt`. Anna fail, mitte uus koguja.
Scene2=A Modern, Scene3=B Classic, Scene4=C Stereoizer, Scene6=D Modern;
muudes stseenides A/bypass. Kasutaja kontrollib neid stseene, kuulab, märgib
maksimaalse CPU, valib tagasi Scene2 ja ekspordib terve preseti
`FM3_ENHANCER_ABCD_TEST_export.syx`. Eraldi GET-i pole vaja.

87 mõõteoleku failitest ning 27 vigase päringu tõrjumine on korras. Kõik
13662 senist GEQ-preseti sisubaiti säilivad Enhanceri lisamise kõrval. V3, PEQ ja
GEQ genereeritud SYX-id jäid baitidentseks. **Uue Enhanceri koosluse
import/eksport, heli ja CPU on veel ootel.** GEQ CPU50% ei ole Enhanceri tõend.


## Enhancer: 74 paari korras, Classicu 12 punkti lisakogumisel — 0.70.2, 2026-10-12

Uus 12:25 ZIP läbis auditi:74 GET/SYX paari, igas48/48; plaanis12 vahelejäetud
punkti ja2 varasemat Bypass-tõrget. A–D koopiad/Width-katsed on olemas.
Puuduvad **ainult Classic Pan Left5, Level5 ja Scene Ignore ON/OFF2**.
Moderni/Stereoizeri Level/Scene Ignore ning Classicu Pan Right on mõõdetud;
neid ei tohi nimetada Classicu puuduvate parameetrite mõõtmisteks.

Pan Left−100 oli juba valitud ja kasutaja jättis miinimumi vahele; ülejäänud
neli jäid automaatselt vahele. **Kui näit on juba õige, ekspordi ikkagi ja tee
GET; s ei kinnita mõõtmist.** Koguja lubab muutumatut sihtväärtust. Sama nähtav
skaala Pan Rightiga ei tõenda Pan Lefti eraldi parameetri kodeeringut.

Loe [katvuse ja lisa juhendit](../../docs/FM3_ENHANCER_COVERAGE_20261012.md)
ning JSON-raportit. Anna `FM3_ENHANCER_LISA.zip`, lähtekood
`scripts/enhancer-gap-collector/`:13 sammu (Classic Type-kinnitus +12 puuduvat
punkti). Paketi ALUSTA_SIIT.syx on viimase eduka ekspordi täpne koopia;
source-session.zip säilitab kogu originaaltõendi. Uus sessioon on eraldi.
Taastada ALUSTA_SIIT.syx, Scene2 Modern A/bypass, käsk
`python3 ~/Downloads/FM3_ENHANCER_LISA/FM3_ENHANCER_LISA.py --port /dev/cu.usbmodem211104`.
Ära korda täiskogumist ega A–D katseid. Puuduvad punktid, kirjutustugi ja
ühine seadme/heli/CPU kontroll on veel ootel. Allolevad jätkupunktid on varasemad.

## Enhanceri kogumine jätkub sammust 8/86 — 0.70.1, 2026-10-12

Kasutaja tõrke-ZIP-i seitse edukat GET/SYX paari kontrolliti uuesti: kõik48/48.
Modern-algpaar, Width0/100/20/50/90% ja Depth0% on olemas. Kaheksanda sammu
kaks katset peatusid enne GET-i, sest koos Depthiga muutus Scene2 Enhancer
bypass'ist aktiivseks (sõna7488:1→0). Ära tuleta failist, mis UI-toiming selle
põhjustas. Kontroll on õige; koguja0.2.1 annab nüüd selge Bypass-veateate.

Loe [tõrke ja jätkamise juhendit](../../docs/FM3_ENHANCER_BYPASS_RECOVERY.md).
Muutmata algandmed on `references/enhancer-partial-20261012/collection.zip`;
testiraport `docs/FM3_ENHANCER_BYPASS_RECOVERY_TESTS.json`. Kasutajapakett
`FM3_ENHANCER_JATKA.zip` sisaldab senist sessiooni ning viimase eduka ekspordi
täpset koopiat `JATKA_SIIT.syx`. **Ära alusta uuesti baseline'ist ega korda
seitset edukat sammu.** Taastada JATKA_SIIT.syx, Scene2, Modern, EnhancerA
bypass; käsk `python3 ~/Downloads/FM3_ENHANCER_JATKA/FM3_ENHANCER_FULL.py --port /dev/cu.usbmodem211104`.
Järgmine katse8/86 on Depth maximum: muuta ainult Depth, eksportida ja teha
üks kinnitatud GET. Vanad failid, setup/plaan ja sessioonivorming säilivad;
lubatud baidivahemikke ei laiendatud. Kirjutustugi ning heli/CPU kontroll on
endiselt ootel. See jaotis asendab alloleva väite, et päris GET veel puudub.

## Enhanceri uus koguja: piltidelt täidetud alginfo — 0.70.0, 2026-10-11

Kasuta nüüd `scripts/enhancer-full-collector-v2/` ja anna kasutajale
`FM3_ENHANCER_FULL_V2.zip`. Kõik kolm uut pilti avanesid; nende põhjal on
algloendid ja ühikud juba `prefilled_setup.json` failis. **Ära küsi uuesti
juhtide loendeid, ühikuid, muid juhte ega neid pilte.** Classicu Invert-menüü
on Both; Left; None; Right. Pan Left, Pan Right ja Balance kuvatakse ühikuta
arvudena. Bypass on eraldi nupp, mitte Bypass Mode'i menüü; kasutaja võis selle
õigesti „muude juhtide” alla märkida. V2-s ei ole seda küsimust ega Bypass
Mode'i mõõtmist. Hoia Enhancer kogumise ajal bypass'is.

Loe [V2 juhendit](../../docs/FM3_ENHANCER_FULL_V2.md); pildid ja vaatlus on
`references/enhancer-ui-20261011/`. Uus pakett avaneb omaette kausta, vana
sessiooni ei muudeta. Alustamiseks lõpeta vana koguja q-ga, impordi UUE paketi
baseline.syx ning vali Scene 2, Modern, Enhancer A/bypass. Käsk:
`python3 ~/Downloads/FM3_ENHANCER_FULL_V2/FM3_ENHANCER_FULL.py --port /dev/cu.usbmodem211104`.
Esimene samm 1/86: Enter kasutab paketi alusfaili, uus eksport pole vajalik;
enne ühte kinnitatud GET-i sulge FM3-Edit/Fractal-Bot. Paus q, jätkamine sama
käsuga. Kõigi järgnevate mõõtmiste tegelikud ekraaninäidud sisestab kasutaja.

86 sammu sünteetiline test, jätkamine, algküsimuste puudumine, 48/48 GET/SYX
paarid ja vigade tõrjumine läbisid kontrolli: `docs/FM3_ENHANCER_V2_TESTS.json`.
**Päris Enhanceri GET on endiselt ootel.** Pildid ei tõenda vahemikke,
kodeeringuid, kuulamist ega CPU maksimumi. Koguja saadab ainult GET-e;
kirjutustugi ja ühine seadme/heli/CPU kontroll järgnevad mõõtmiste auditile.
See jaotis asendab allpool olevad juhised vanade algküsimuste täitmiseks.

## Enhanceri Bypass Mode'i eksliku küsimuse parandus — 0.69.1, 2026-10-11

Kasutaja jäi koguja algküsimuses `Bypass Mode KÕIK menüüvalikud ...` seisma
ja saatis Modern-vaate pildi14.07.15. Pilt avaneb: **selles vaates Bypass Mode
rippmenüüd ei ole**. Type all on Library; paremal all on eraldi Bypass-nupp.
Varasem soovitus otsida sealt menüüd ja vaikeloendisse lisatud Bypass Mode
olid ekslikud. Ära palu sisestada oletuslikku `Thru;Mute` ega lugeda Library
menüüd Bypass Mode'iks. Uus pilt ei tõenda Classicu/Stereoizeri juhtide loendit.

`scripts/enhancer-full-collector/` vaikeloendid on parandatud: Modern ja
Stereoizer `Scene Ignore`; Classic `Invert;Scene Ignore` (viimased kaks
vajavad endiselt tegeliku UI-ga kinnitamist). Bypass Mode jääb valikulise
võimalusena ainult siis, kui kasutaja näeb selle menüüd päriselt. Menüü
küsimusele vastused `puudub` ja `-` eemaldavad vastava juhi; neid ei salvestata
enumväärtustena. Näidisplaan ilma Bypass Mode'ita on86 sammu, nelja Invertiga.
Varasem92-sammuline täielik sünteetiline kontroll jääb ajalooliseks; uus
`test_setup_fix.py` kontrollib vaikeloendeid, puudumise mõlemat vastust,
valikulise pärismenüü säilitamist, q-d ja olemasoleva setup'i säilimist GET-ita.

**Juba avatud vanas kogujas ei tohi vastata `puudub`**, sest see versioon
käsitleks seda menüüvalikuna. Kasutaja saab jätkata olemasoleva paketiga:
praeguses algküsimuses `q`, sama käsk uuesti; Moderni arvulise loendi juures
Enter, küsimusele **Nähtavad VALIKUD/LÜLITID** sisestada ainult `Scene Ignore`.
Classic/Stereoizer puhul kirjutada samuti ainult päriselt nähtavad valikud,
Bypass Mode välja jätta, kui menüüd pole. Algküsimuste vastused küsitakse
uuesti; selles punktis GET-mõõtmisi veel ei ole. Algküsimuste järel taastada
endiselt baseline.syx. Varem salvestatud setup'i/plaani ega mõõtmisi ei muudeta.

Tõend: `references/enhancer-baseline-20261011/enhancer-modern-no-bypass-mode.png`
ja `bypass-mode-correction.json`. Selle pildi preseti nimi on FM3 ENH_SEL;
uut SYX-i ei lisatud, seega pilti ei esitata uue binaarse seadmeringi tõendina.
See jaotis tühistab allolevad Bypass Mode'i vaikimisi olemasolu eeldused.

## Enhanceri baseline kontrollitud ja terviklik koguja valmis — 0.69.0, 2026-10-11

Kasutaja tagastas `FM3_ENHANCER_BASELINE.syx` ja Type-menüüga pildi. **Mõlemad
olid loetavad**, pildi puudumise automaatteatest hoolimata. Enhancer 1 on
rea 3 / veeru 11 kohal, Reverb 1 ja Out 1 vahel, EID122; 142-baidine kirje
algab7460 ja sisaldab **12 sõna × 4 kanalit**, kokku48 sõna. Scene2 A/bypass.
Kõik 12 vana plokki säilisid baitidentselt; Enhanceri eemaldamisel ja shundi
ennistamisel taastuvad kõik13 662 varasemat kehabaidi. Uus keha13 804 baiti.
Loe [kogumisjuhendit](../../docs/FM3_ENHANCER_FULL_COLLECTION.md) ja
[alusfaili kontrolli](../../docs/FM3_ENHANCER_BASELINE_VALIDATION.json).

Pildil on **Classic, Modern, Stereoizer** Type-menüü, A–D ja firmware13.00.
Modern A näidud: Width50%, Depth50%, Low Cut100Hz, High Cut2000Hz, Level0dB.
CPU52.3% on ainult pildi hetkenäit, **mitte maksimum ega helikinnitus**.
Type-menüü varjab Bypass Mode'i ala; selle loendit ei oletata. Classicu ja
Stereoizeri nähtavad juhid kinnitab kasutaja koguja algküsimustes.
Eksport `examples/FM3_ENHANCER_BASELINE.syx`, SHA
`755c477cd39b471b1c381f82dc735ad1285f2966d258a7381e8110a8f52a6d41`;
pilt ja vaatlus `references/enhancer-baseline-20261011/`.

**Ära küsi baseline-eksporti ega Type-pilti uuesti.** Kasutajapakett
`FM3_ENHANCER_FULL.zip`, lähtekood `scripts/enhancer-full-collector/`.
See on üks jätkatav pakett koos esimese GET/SYX paariga; eraldi algGET-etappi
ei tule. Alguses kinnitatakse kõigi kolme Type tegelikud juhid, ühikud ja
kõik menüüvalikud. Type võib selleks vahetada, kuid **enne esimest GET-i
taastada paketi baseline.syx**. Esimene GET ei vaja uut eksporti.

Plaan: nähtavate arvuliste juhtide miinimum/maksimum ja kolm eri vaheväärtust,
menüüvalikud, Scene Ignore ning täpsed A→B/C/D koopiad ja Width sõltumatus.
Sammude arv sõltub kinnitatud UI-st; näidisloenditega92. Puuduvaid juhte ei
küsita; lisanduvad tuntud juhid/enumid pikendavad sama plaani. Tundmatu juht
peatab töö enne GET-i. Kandidaat-PID-de piirid ei ole kirjutustõend.

Üks kasutaja kinnitatud GET `F0 00 01 74 11 1F 7A 00 71 F7`, võrdlus48/48.
Muud plokid, stseenid ja juhtseosed säilivad; vaid kanalikatses tohib muutuda
Scene2 Enhanceri kanalivalik. Koguja ei muuda seadet; SET/SAVE/STORE ja
automaatne korduspäring puuduvad. `q` annab ZIP-i, sama käsk jätkab viimasest
edukast failist. `s` ja failed/pending/cancelled säilivad mõõtmata tõendina.

Käivitamine Macis: `python3 ~/Downloads/FM3_ENHANCER_FULL/FM3_ENHANCER_FULL.py --port /dev/cu.usbmodem211104`.
Port tuleb vajadusel asendada tegelikuga. Detailid paketi `LOE_MIND.txt`.
Pärast tagastatud ZIP-i kontrollida muutmata koguja `resume()` abil kõik
pärispaarid, auditeerida skaalad/enumid ja kanalid ning alles seejärel lisada
Enhancer koostajasse. **Enhanceri päris GET-paar ja kirjutustugi on OOTEL.**
Koostaja0.11.1 ja lõpetatud GEQ/PEQ tõendid säilivad; nende kogumist ei korrata.
See jaotis asendab0.68.0 baseline'i ootamise jätkupunkti.

## Enhancer alustatud — 0.68.0, 2026-10-11

Kasutaja nõustus pärast lõpetatud GEQ etappi Enhanceriga jätkama: **„Võtame.”**
Järgmine tegevus on üks kasutaja loodud Enhanceri baseline-eksport ja kaks
ekraani­vaadet. **GEQ audit ning CPU kuni 50% / toimimise tagasiside on valmis.**
Ära ava GEQ või PEQ kogumist uuesti. Enhanceri kirjutustugi ei ole veel valmis;
koostaja 0.11.1 ja kõik olemasolevad võimalused säilivad.

Loe [Enhanceri esimese sammu juhendit](../../docs/FM3_ENHANCER_FIRST_STEP.md).
Kasutajale on ette valmistatud `FM3_ENHANCER_FIRST_STEP.zip`, milles on
muutmata, seadmeringiga kinnitatud GEQ eksport nimega `FM3_ENHANCER_START.syx`
ning `LOE_MIND.txt`. Sisu: `examples/FM3_ENHANCER_FIRST_STEP.txt` ja
`examples/FM3_GEQ_ABCD_TEST_export.syx`. Alus SHA-256
`1663e891e6bc1a7cb89a1bc0540a48ce8d61527911267682bc3082bf06e70c3e`.

**Kasutaja samm:** Scene 2; asendada kogu ruudustiku rea 3, veeru 11 shunt
Enhancer 1-ga, Reverb 1 ja Out 1 vahel. Samad ühendused, kõik muud plokid ja
seaded säilitada. Enhancer kanal A/bypass; Type ja parameetrid algväärtustele.
Tagastada tervikpreset `FM3_ENHANCER_BASELINE.syx`, pilt avatud Type-menüüst
ja pilt põhijuhtnuppudest koos kanalinuppudega. Praegu terminali ega GET-i
ei küsita. Kui sama GEQ-testpreset on muutmata lahti, pole uut importi vaja.

Paketi 1129 SYX-failis / 578 erinevas sisus ei olnud Enhanceri kandidaatplokki.
Kohaliku codec'i EID122 ja parameetrinimed on kandidaadid, **mitte firmware 13
kirjutustõend**. Kanalite arvu ei eeldata neljaks: see loetakse päris ekspordist.
`scripts/fm3-enhancer-insertion-check.mjs` lubab ainult uut kirjet ja grid-
sõna428 muutust shunt1038 asemele; kõik 12 vana plokki ja 13 662 algbaiti
peavad taastuma täpselt. Presetinime muutus raporteeritakse. Eelkontrolli
18 positiivset / 36 tõrjutud sünteetilist katset ei ole seadmetõend.

**Pärast vastust:** kontrollida eksporti ja UI-d, seejärel anda **üks jätkatav
täiskogumispakett**, mis sisaldab ka esimest baseline GET/SYX paari. Ära tee
eraldi algGET-etappi. Tüübid, juhtnupud ja kanalite arv peavad tulema päris
vaatest; mitte oletada. Seadmes ainult GET; kasutaja teeb FM3-Editi muudatused
ja ekspordid ise. SET/SAVE/STORE keelatud. See jaotis täpsustab Enhanceri
senise jätkupunkti; allolevad lõpetatud GEQ/PEQ tõendid jäävad kehtima.


## GEQ A–D seadmering, heli ja CPU kinnitatud — 0.67.1, 2026-10-11

Kasutaja tagastas `FM3_GEQ_ABCD_TEST_export.syx` ja Scene4/GEQ C pildi ning
ütles: **„CPU oli kõige suurem 50%, GEQ toimis.”** Kõik **13 662 kehabaidi**
kattuvad saadetud presetiga täpselt, erinevusi0; normaliseerimist ei tehta.
Kõik80 GEQ sõna, A–D, Scene2=A/3=B/4=C/6=D aktiivsed ning muud bypass,
senised PEQ/V3 plokid/tasemed ja kahe rea Send/Return säilisid.
Nimi ja Scene2, kaadriprefiksid, päised, pikkused ja nulltäide säilisid;
erinevad CRC ja tihendatud esitus. GEQ eemaldamisel taastuvad13 456 PEQ
katse kehabaidi täpselt. [Seadmeringi tõend](../../docs/FM3_GEQ_ABCD_HARDWARE_ROUNDTRIP.json).

**GEQ katse on lõpetatud. Ära küsi uuesti GET-i, importi, eksporti, CPU-d,
kuulamismuljet ega esimese riba silti.** Selle koosluse suurim kasutaja
vaadeldud CPU50%; pildi hetkenäit49.4%. See pole teiste presetite CPU ülempiir.
Kasutaja kinnitas toimimise; artisti võrdlussoundiga hinnangut ei lisandu.

Pilt on avatud ja loetud. Scene4 / GEQ C / 7 Band Constant Q:
**100/200/400/800/1600/3200/6400 Hz**, Gain−1/−0.5/0/+1/+0.5/−0.5/−1 dB,
Master Q0.80, Balance0, Thru. Esimene riba on nüüd **100 Hz kinnitatud**;
varasem `python3 100` oli kogumissildi sisestusaps. Toored mõõtmised ja
register säilivad; eraldi pilditõend lahendab sildi aktiivses võimalusteregistris.
Pildil Level−0.7 dB on ühe komakohaga kuva: muutmata ekspordis oleva sõna
tegelik väärtus−0.7495346 dB vastab küsitud−0.75 dB-le. Parandust ega korduskatset
pole vaja. Teiste kanalite iga vaheväärtuse eraldi ekraanipilti ei ole antud.

Koostaja `jb-composer-0.11.1` taasesitab sama saadetud SYX-i baitidentselt.
`matchGeqDeviceBody` kinnitab ainult täpse kogu keha; uus kombinatsioon ei
päri tõendit. Sama keha uue nimega fail ei ole eraldi imporditud fail.
Eksport SHA`1663e891e6bc1a7cb89a1bc0540a48ce8d61527911267682bc3082bf06e70c3e`,
`examples/FM3_GEQ_ABCD_TEST_export.syx`; pilt ja tagasiside
`references/geq-feedback-20261011/`. `test-composer-geq-hardware.mjs`
kontrollib täielikku keha, pildiväärtusi, varasemate baitide taastamist ja
uue kombinatsiooni eksliku kinnituse tõrjumist.

**Järgmine kokkulepitud arendusetapp on Enhancer.** GEQ18 tüübi ja A–D
kasutustugi ning see ühine seadmering on valmis. Kõigi võimalike
vaheväärtuste, Scene Ignore'i ja bypass-käitumiste ammendavat kontrolli ei väideta.
See jaotis asendab alloleva0.67.0 seadmeringi/CPU/sildi OOTEL-seisu.



## Graphic EQ audit ja koostajatugi valmis — 0.67.0, 2026-10-10

Kasutaja tagastas `FM3_GEQ_FULL_20261010T194115_238458ac.zip`.
Muutmata koguja `resume()` kontrollis **184/184 edukat sammu**, igas
**80/80 GET/SYX sõna**. Kaheksa failed-katset säilivad ja on välistatud;
vahelejätmisi pole. Ära küsi kogumist, algGET-i ega baseline-eksporti uuesti.
Algandmed `references/geq-full-20261010-194115/`, register `references/geq-full.json`.
Loe [GEQ koostajajuhendit](../../docs/FM3_GEQ_COMPOSER.md).

Koostaja `jb-composer-0.11.0` toetab **18 GEQ tüüpi, A–D kanaleid ja
kõiki nähtavaid Gain-ribasid**, Master Q, Level, Balance, Bypass Mode
Thru/Mute ning Scene Ignore'i sõna. Gain−12…+12 dB, Master Q0.1…10,
Level−80…+20 dB, Balance−100…+100. 557 arvulist ja 4 enum/lülitipunkti
sobivad kodeerimisega täpselt. Kõigi tüüpide Master Q nähtavus ja punktid
on kasutaja kinnitatud. Vaheväärtused on skaalast tuletatud, mitte kõik
eraldi mõõdetud. A→B/C/D täielikud20-sõnalised koopiad ning eraldi Gain/
stseenivalikud on kontrollitud; iga parameetri A–D ristkorrutist ei mõõdetud.
Scene Ignore'i salvestumine ei tõenda kõiki käitumiskombinatsioone.

Sisend `geqChannels:[{channel:"B",type:"5 Band Mark",bands:[{band:3,gainDb:1.5}],
masterQ:1.4,levelDb:-0.5,balance:0,bypassMode:"Thru",sceneIgnore:false}]`.
Type on kohustuslik; ribad vasakult paremale1…N, sagedused Type-põhised
ja pole muudetavad. Iga kanal algab täielikust kogutud tüübimallist.
PID10/14/17/18 ja peidetud Gain-pesad säilivad mallist. NewLook lisab
GEQ1 reale2/veerg11, PEQ järel/Send'i ette; vaikimisi A/bypass kõigis
stseenides, aktivatsioon selgesõnalise `scenes` või `addedBlockScenes.geq` kaudu.

**Üks tekstisilt ootab kinnitust:** 7 Band Constant Q esimese riba nimeks
sisestati `python3 100`. Algandmeid ei parandatud; Gain/PID0 on mõõdetud,
aga ära väida sageduseks kinnitatult100 Hz. Kasuta riba1 ja küsi alloleva
katse Scene4/GEQ C vaates esimese riba tegelikku silti või pilti. GET-i pole vaja.

**Järgmine ainus seadmekatse: `FM3_GEQ_ABCD_TEST.zip`** (SYX, TXT ja
`FM3_GEQ_ABCD_CHECK.txt`; näidisfailid `examples/`). Scene2=A/3=B/4=C/6=D
aktiivsed, muud GEQ bypass. Neljal kanalil eri tüübid; täpsed väärtused juhendis.
Senised PEQ/V3 plokid, tasemed, stseenid, kaks rida ja Send/Return säilivad:
GEQ eemaldamisel taastuvad kõik13 456 vana kehabaidi täpselt. Ära nõua PEQ
korduskatset. Kasutaja impordib tööpuhvrisse, kontrollib GEQ A–D, kuulab ning
annab uue katse CPU; enne eksporti Scene2/GEQ A aktiivne. Palu terve
`FM3_GEQ_ABCD_TEST_export.syx`. Uue kombinatsiooni riistvara/heli/CPU on OOTEL;
varasem CPU47–48% käib PEQ katse kohta. Pärast kinnitust jätka Enhanceriga.

`test-composer-geq-full.mjs` võrdleb generaatori väljundit kõigi184 päris
seadmeekspordi kõigi13 662 kehabaidiga ilma normaliseerimata, kontrollib
negatiivseid sisendeid, algandmete räsi ja varasemate V3/PEQ SYX-ide säilimist.
Failikontroll ei asenda uue koosluse seadmeringi. See jaotis asendab allpool
0.66.0 GEQ-kogumise ja kirjutustoe OOTEL-seisu; kõik varasemad tõendid säilivad.


## Graphic EQ full-kogumine valmis — 0.66.0, 2026-10-09

Kasutaja tagastas GEQ alusfaili ja kaks ekraanipilti ning soovib üht full-
kogumispaketti. Mõlemad pildid on loetud; alusfail läbis lisamiskontrolli:
GEQ EID50, 4×20 sõna, kõik 13 456 varasemat kehabaidi taastuvad täpselt.
AlgGET ega GEQ kirjutustugi ei ole veel seadmega kinnitatud.

Anna üks `FM3_GEQ_FULL.zip` kataloogist `scripts/geq-full-collector/`.
Loe [täiskogumise juhendit](../../docs/FM3_GEQ_FULL_COLLECTION.md) ja paketi
`LOE_MIND.txt`. See sisaldab muutmata tegelikku baseline.syx-i, algGET-i,
kõiki18 ekraanilt loetud Type nimetust, iga tüübi nähtavate ribade nime-/Gain-/
piirikatseid, olemasolul Master Q, üldjuhte ning A–D täielikke koopiaid ja
iseseisvaid Gain/Scene2 valikukatseid. Thru/Mute korral kuni184 sammu,
puuduv Master Q jätab neli sammu GET-ita vahele. Muid menüüvalikuid ja
juhte küsitakse tegelikust UI-st; neid ei mõelda välja ega kinnitata tabeli järgi.

Algpaar on samas sessioonis: ära nõua enne eraldi GET-paketti või uut
baseline-eksporti. Kasutaja sulgeb editoreid ja kinnitab ühe GET-i iga sammu
juures; q = ZIP ja jätkatav paus, s = mõõtmata samm põhjusega. Üksnes nimi
ei tekita vana päisebaidi11 viga. Muud plokid, tasemed, stseenid ja routing
säilivad; Type seotud muutused talletatakse, ribade PID-järjekorda ei oletata.
Alg- ja parameetripaarid nõuavad80/80 sõna. Automaatseid korduspäringuid pole.

184-sammuline sünteetiline test ja pseudoterminal ei ole FM3 seadmetõend.
Pärast päris tulemuste ZIP-i auditeeri nimed, ribapesad, koodid, skaalad ja
A–D; alles siis luba GEQ kirjutamine ühises koostajas ning üks ühine seadmering.
Senine koostaja0.10.1, PEQ Blocking-parandus, tasemed ja CPU47–48% säilivad.
See jaotis asendab alloleva 0.65.0 järgmise sammu; ära küsi GEQ esimest
lisamist ega PEQ katseid uuesti. GEQ järel Enhancer.

## Graphic EQ esimene lisamiskatse valmis — 0.65.0, 2026-10-09

Kasutaja ütles Graphic EQ alustamiseks „Teeme”. Etapp on nüüd **ootab
esimest GEQ-ga eksporti**, mitte parameetrite kirjutustugi. Loe
[GEQ juhendit](../../docs/FM3_GEQ_FIRST_STEP.md). Senine koostaja0.10.1,
PEQ tugi/kinnitus ja CPU47–48% jäävad alles; nende katseid ei korrata.
932 olemasoleva SYX-i audit (414 unikaalset sisu, kõik loetavad) ei leidnud
GEQ plokiga algmaterjali. Codec'i GEQ EID/PID/Type/sageduste tabelid on
kandidaadid; ära nimeta neid firmware13 mõõdetud kirjutustoeks.

Anna `FM3_GEQ_FIRST_STEP.zip`: muutmata viimase PEQ-eksportfaili koopia
`FM3_GEQ_START.syx` ja juhend. Kui sama preset on kasutajal muutmata kujul
lahti, ei pea seda uuesti importima. Scene2, asendada PEQ1 ja Send1 vahel
olev shunt **Graphic EQ1-ga**, rida2/veerg11. Valida GEQ A/bypass, jätta
selle Type ja kõik parameetrid lisamise algolekusse. PEQ A jääb aktiivseks.
Muud plokid/tasemed/stseenid/Send-Return säilivad. Palu üks terve
`FM3_GEQ_BASELINE.syx` ning võimalusel pilt Type ja ribade sagedusnimedega.
**Selles sammus terminali, GET-i ega CPU kordusnäitu vaja ei ole.**

Alus `examples/FM3_PEQ_ABCD_TEST_export.syx`,
SHA`b4794f55fe14565029ebaca6f2e9d7cac39572b5d33bcc0a2c9802e5cc6a6c5b`.
Tagastatud faili kontrollib `scripts/fm3-geq-insertion-check.mjs`:
ainult GEQ kandidaatkirje ja selle ruudustikupesa lisanduvad; kõik 13 456
vana kehabaidi peavad taastuma. Nime 32 baiti lubatakse eraldi raporteeritult.
Sünteetilised parserikatsed ei ole GEQ seadmetõend ega genereeritud preset.
Alles tegeliku kirje kontrolli järel valmista sellele vastav üks kinnitatav
GET/SYX algpaar, siis nähtavate Type/ribade/üldjuhtide ja A–D sihitud kogumine.
Ära genereeri GEQ väärtusi enne nõutavat tõendit. GEQ järel Enhancer.
See jaotis on käimasolev järgmine töö; allpool olevad PEQ tõendid säilivad.

## PEQ A–D seadmering ja CPU kinnitatud; Blocking Q parandatud — 0.64.1, 2026-10-09

Kasutaja tagastas `FM3_PEQ_ABCD_TEST_export.syx`: **kõik 13 456 kehabaidi
kattuvad täpselt**, normaliseerimist ei tehta. Kõik132 PEQ parameetrisõna,
A–D kanalid, Scene2=A/3=B/4=C/6=D aktiivsed, muud bypass ning senised V3
plokid/tasemed, kaks rida ja Send/Return säilisid. Nimi, Scene2, kaadriprefiksid,
päised, pikkused ja nulltäide säilisid; erinevad ainult CRC/pakitud esitus.
Tõend [FM3_PEQ_ABCD_HARDWARE_ROUNDTRIP.json](../../docs/FM3_PEQ_ABCD_HARDWARE_ROUNDTRIP.json).

Kasutaja selle katse CPU: **47–48%**. Ära küsi CPU-d ega sama eksporti uuesti.
Uue katse kuulamishinnangut pole selles sõnumis sõnaselgelt antud; ära kanna
vana Band3 katse positiivset helimuljet sellele üle. Ülejäänud vaheväärtuste
ekraanikinnitust pole eraldi öeldud; baitide säilimine kinnitab imporditud
koosluse salvestumist, mitte kõiki nähtavaid skaalanäitajaid või muid kooslusi.

Kasutaja täpsustas: **Type Blocking juures Q puudub.** Varasemas kontrollfailis
Q0.707 nõudmine oli juhendi viga. Koostaja0.10.1, skeem, võimalusteregister,
effektiivsete väärtuste raport ja kontrolljuhend on parandatud. Blocking
kasutab Frequency ja Slope; Q ning Gain ei ole selle tüübi juhid. Ära
paku, kirjuta ega palu seal Q-d kontrollida. Sisend `type:"Blocking",q:...`
annab vea; salvestatud mitteaktiivne Q-sõna säilib algmallist.
Teiste tüüpide Q tugi säilib. Uus korrektne spec annab **täpselt sama SYX-i**,
SHA`a94e6fe3cc4b0f76434b56b93809c15f973810ee1635cdc91f87153e604395da`.
Ära nõua paranduse pärast kordusimporti, GET-i ega ekspordikatset.

Eksport SHA`b4794f55fe14565029ebaca6f2e9d7cac39572b5d33bcc0a2c9802e5cc6a6c5b`,
`examples/FM3_PEQ_ABCD_TEST_export.syx`; tagasiside
`references/peq-abcd-feedback-20261009.json`. Algne vigase Q-ga spec ja
kontrolljuhend on ajalooliste tõenditena säilitatud `peq-abcd-original*` failides.
`matchPeqDeviceBody` kinnitab ainult selle täpse keha; uue nimega sama keha
pole eraldi imporditud fail ning uus kombinatsioon ei päri kinnitust.

PEQ peamine viie riba/A–D kasutustugi ja see ühine seadmering on valmis.
Järgmine kokkulepitud arendusetapp on **Graphic EQ, seejärel Enhancer**.
Ära kuuluta selle põhjal kõiki vaheväärtusi ja Solo/Scene Ignore käitumisi
ammendavalt valideerituks. See jaotis asendab alloleva PEQ seadmeringi ning
CPU OOTEL-seisu ja kõik Blocking Q kohta üldistavad vanad kirjeldused.

## PEQ viis riba ja A–D koostajas; ühine seadmekatse ootel — 0.64.0, 2026-10-09

84 päris kogumissammu on lõpetatud ja koguja `resume()` abil kontrollitud.
Igas sammus kattuvad kõik 132 GET/SYX sõna; 4 varasemat failed-katset on
säilitatud ja välistatud. Ära küsi kogumist uuesti. Algandmed:
`references/peq-full-20261009-152606/`, register `references/peq-full.json`.

Koostaja `jb-composer-0.10.0` toetab nüüd PEQ A–D, kõiki viit riba, nende
mõõdetud Type valikuid ja Blocking Slope 6/12/18/24/30/36, Frequency/Q/Gain,
Level/Balance, Bypass Mode Thru/Mute, Solo ning Scene Ignore sõnu.
Loe [PEQ koostajajuhendit](../../docs/FM3_PEQ_COMPOSER.md).
Frequency: Band1 20–2000 Hz, Band2–4 100–10000 Hz, Band5 200–20000 Hz;
Q0.1–10, Gain−20…+20, Level−80…+20, Balance−100…+100.
82 arvulist sihtpunkti sobivad skaaladega täpselt; 46 enum/lülitipunkti
ja A→B/C/D täielikud koopiad ning eraldi Gain/stseenivalikud on kontrollitud.
Mõõdetud punkt, skaalast arvutatud vaheväärtus ja uue koosluse seadmekinnitus
on eri tõenditasemed. Ära nimeta kõiki vaheväärtusi eraldi mõõdetuks.
Balance'i vaheväärtuste lineaarsus ning uus eri tüüpe kasutav A–D kooslus
vajavad allolevat seadmekatset. Solo/Scene Ignore salvestumine on mõõdetud;
kõiki nende käitumiskombinatsioone pole katsetatud. PID23/24 säilita.

Uus süntaks `peqChannels:[{channel:"C",bands:[{band:3,type:"Peaking 2",
frequencyHz:1400,q:1.5,gainDb:2}],levelDb:-1,balance:0,sceneIgnore:false}]`.
Vana A `band3` liides jääb täpsete vanade punktide jaoks alles. Ära sega
neid kujusid. Aktivatsioon/kanal `scenes` või `addedBlockScenes.peq` kaudu;
uus plokk vaikimisi kõigis stseenides A/bypass. Nõudmisel lisamine ja
kokkulepitud kahe rea Send/Return paigutus säilivad.

**Järgmine ainus seadmekatse on `FM3_PEQ_ABCD_TEST.syx`.** Anna koos
`FM3_PEQ_ABCD_CHECK.txt` ja genereeritud TXT-ga (paketis `FM3_PEQ_ABCD_TEST.zip`).
Scene2=A, 3=B, 4=C, 6=D aktiivsed, muud PEQ bypass. C/D Balance −10/+10
on teadlikud kontrollväärtused, mitte lõplik stereopanoraami soovitus.
Kõik V3 vanad plokid/tasemed ja 13 146 algbaiti säilivad. Kasutaja kontrollib
A–D väärtusi, stseenivahetust, kuulab ja annab selle katse CPU. Enne eksporti
Scene2, PEQ A sees; palu terve `FM3_PEQ_ABCD_TEST_export.syx`.
Koguja kordust ega uut GET-i pole vaja. Võrdle eksporti kogu algse kehaga
ilma normaliseerimata, lisaks nimi, päised, routing ja kaadriprefiksid.
Uue kombinatsiooni import/ekspordi ja kuulamise kinnitus on **OOTEL**.

Failikatsed `test-composer-peq-full.mjs` / `FM3_PEQ_FULL_VALIDATION.json`
kontrollivad päris mõõtmiste vastu ja tõrjuvad vigaseid sisendeid. V3 ja
vana Band3 SYX taasesituvad baitidentselt. Vana Band3 katse CPU47–48% ning
positiivne kuulamiskinnitus säilivad; ära palu nende kordamist. Pärast uue
katse kinnitamist jätka kokkulepitud Graphic EQ → Enhancer järjekorras.
See jaotis asendab kõiki allpool olevaid PEQ toe/kogumise OOTEL-piire.

## PEQ lõpuni: laienduse koguja valmis — 0.63.0, 2026-10-09

Kasutaja kinnitas „Teeme siis PEQ lõpuni?”. Järjekord on nüüd PEQ viie riba,
tüüpide, vajalike väärtusvahemike ning A–D/stseenivaliku toe lõpetamine,
seejärel Graphic EQ ja Enhancer. Ära küsi selle plaani luba uuesti.
Päris uus mõõtmine on **OOTEL**; koostaja 0.9.1 piiratud kirjutustugi ei muutu.

Loe [kogumisjuhendit](../../docs/FM3_PEQ_FULL_COLLECTION.md) ja
`scripts/peq-full-collector/LOE_MIND.txt`. Anna pakett `FM3_PEQ_FULL.zip`:
84 sammu neljas jätkatavas etapis (32 Type/Slope, 24 Frequency/Q/Gain,
21 üldjuhti, 7 kanalit). Kõiki samme ei pea korraga tegema.
Käsk: `python3 ~/Downloads/FM3_PEQ_FULL/FM3_PEQ_FULL.py --port /dev/cu.usbmodem211104`.
See on viimati kasutatud port; muutumisel kasuta tegelikku. Alguseks impordi
paketi muutmata `baseline.syx` tööpuhvrisse; Scene 2, PEQ A bypass. Uut algpaari
GET-i ega algfaili eksporti ei küsita. Senised mõõtmised ja CPU/kuulamine säilivad.

Koguja küsib ekraanil tegelikud miinimumid/maksimumid, sest avalikes tabelites
leidub vastuolusid. Q ja Frequency sihtnäidud sisestatakse arvuna; Hz ühik
on kohustuslik. Type-menüü ja kandidaat-PID ei anna veel generaatorikirjutust.
Solo/Scene Ignore võib olla ajutine UI olek: muutumatu SYX ei tõenda kirjutust.

`q` säilitab ZIP-i; sama käsk jätkab, `s` säilitab vahelejätmise põhjuse.
Hoia `FM3_PEQ_FULL_SESSION` alles. Jätkamisel taasta programmi näidatud
viimase eduka SYX-i olek. Tüübivahetuse sama riba kõrvalmuutused raporteeritakse;
muud plokid ja stseenid, routing ja päised peavad säilima. Nime 32 baiti on
eraldi lubatud ja raporteeritavad. Üks fikseeritud GET iga `jah` kinnituse järel;
SET/SAVE/STORE ja automaatne korduspäring puuduvad. Vea korral analüüsi algfaile,
ära nõrgesta kontrolli põhjendamatult. Ka poolikud/failinud katsed säilivad.

Tulemuste saabumisel kontrolli iga edukat sammu sama koguja `resume()` abil,
sealhulgas kõiki 132 GET/SYX sõna ja ekraaninäidu seost. Alles siis lisa
tõendatud skaala-/tüübi-/A–D tugi, selle negatiivsed kontrollid ning ühine
kontrollpreset importimiseks/tagasieksportimiseks. Vahelejätmine ei ole tõend;
84 sammu läbimine ei tähenda automaatselt täielikku valideerimist.
`TEST_RESULTS.json` kirjeldab ainult sünteetilist 84-sammulist katset.
See jaotis asendab allpool ulatuse üle arutamise jätkupunkti.

## PEQ kuulamine ja CPU kinnitatud; täistoetus puudub — 0.62.2, 2026-10-09

Kasutaja kinnitas: **„CPU 47-48. Kõlas hästi tunnetasin vahet.”** Selle katse
import/tagasieksport, kuulamine ja CPU vaatlus on lõpetatud. Ära küsi neid uuesti.
CPU 47–48% ei kinnita kõigi stseenide ülempiiri ega teisi kooslusi.
Loe [tagasisidet ja piltide registrit](references/peq-user-feedback-20261009.json).

Vasta selgelt: **kõik PEQ võimalused ja A–D kanalite kirjutustugi EI OLE
valideeritud**. Koostaja 0.9.1 toetus jääb kanalile A, Band 3 fikseeritud
Peakingule, senistele täpsetele Frequency/Q/Gain punktidele ja ploki Levelile.
Ribade 1/2/4/5 ning B/C/D olemasolevad andmed säilivad; nende säilimine või
132/132 GET/SYX kattuvus pole iseseisva muutmise ja stseenivaliku tõend.

Viis pilti loeti edukalt. Type-menüüd: ribad 1/5 Blocking, Peaking, Peaking 2,
Shelving, Shelving 2; ribad 2/4 Peaking, Peaking 2, Shelving, Shelving 2;
riba 3 Peaking, Peaking 2. Need kinnitavad nähtavaid nimetusi, mitte SYX
enum-koode, kirjutusvahemikke ega B/C/D tuge. Piltidel on PEQ A bypass ja
Band 3 2000 Hz / 0 dB; ära esita neid aktiivse 1000 Hz / +3 dB katse piltidena.

Enne Graphic EQ juurde liikumist soovita PEQ teiste ribade, tüüpide, vajalike
väärtusvahemike ja A–D/stseenivaliku toe lõpetamist. Ära väida, et laiendus
on juba tehtud või käivita ainult ulatuse küsimuse põhjal uut kogumist.
Kogu hiljem ainult puuduvaid tõendeid. See jaotis asendab selle katse
allpool oleva CPU/kuulamise OOTEL-seisu; varasemad raportid on loomisaegsed.

## PEQ kontrollpreseti seadmering kinnitatud — 0.62.1, 2026-10-09

Kasutaja tagastas `FM3_PEQ_BAND3_TEST_export.syx`. Kõik **13 456 kehabaidi**
kattuvad saadetud kontrollpresetiga, erinevusi 0. Scene 2, PEQ A sees,
Band 3 Peaking 1000 Hz / Q 1.4 / Gain +3 dB / Level 0 ja kõik muud stseenid säilisid.
Nimi, routing, Send/Return, kaadriprefiksid, pikkused ja nulltäide säilisid.
Täisfailide tihendatud esitus ja CRC erinevad; mõlema kaadrid/CRC/footer läbivad.
V3 kõigi 13 146 algbaidi taastamise kontroll läbib.

Säilita eksport `examples/FM3_PEQ_BAND3_TEST_export.syx`, SHA-256
`d4dc973e430ac37cd26be7ba92869fb514eada2e9d013bf72136f2538cfd11ab`.
Tõend `../../docs/FM3_PEQ_HARDWARE_ROUNDTRIP.json`; test
`scripts/test-composer-peq-hardware.mjs`. Koostaja 0.9.1 taasesitab algse
saadetud SYX-i baitidentselt ja märgib ainult selle täpse faili
`submittedFileConfirmed:true`. Muudetud kombinatsioon ei päriks kinnitust;
sama kehaga uus nimi saab ainult kehakattuvuse tõendi.

**Ära küsi sama eksporti ega uut PEQ GET-i.** Kontrollimport/tagasieksport
on lõpetatud. CPU ja kuulamismuljet pole kasutaja veel andnud: küsi ainult
praegune CPU ning Scene 2 PEQ sees/bypass kuulamismulje. Varasem V1 CPU ei
kinnita seda katset. Seejärel jätka kokkulepitud Graphic EQ → Enhancer
arendusega; PEQ teiste ribade laiendus sõltub konkreetsest soundivajadusest.
Kõik senised kanali A / Band3 / täpsete mõõtepunktide piirid säilivad.
See jaotis asendab allpool selle PEQ kontrollpreseti seadmeringi OOTEL-seisu.

## PEQ Band 3 ühendatud ühise koostajaga — 0.62.0, 2026-10-09

Kasutaja `FM3_PEQ_CONTROLS_20261009T121911_30a644ed.zip` läbis täieliku
kontrolli: **11 isoleeritud juhtmuudatust, kõik 132/132 GET/SYX**, ülejäänud
keha, stseenid ja kaadriprefiksid säilisid. Q0.707 jäeti põhjusega „väärtus
juba sama” vahele; ära loe seda mõõtepunktiks ega küsi lõpetatud kogumist uuesti.
Säilita algandmed `references/peq-controls-20261009-121911/`; register
`references/peq-controls.json`, audit `../../docs/FM3_PEQ_CONTROL_VALIDATION.json`.

Kasuta `jb-composer-0.9.0` PEQ tuge koos senise Amp/Cab/efektide/stseenide
toega. Loe [PEQ koostajajuhendit](../../docs/FM3_PEQ_COMPOSER.md).
NewLook-alus + `peqChannels` lisab PEQ1 reale2/veerg10, Filteri järel ja
Send'i ette, säilitades kaks rida. Kõik uue PEQ stseenid algavad A/bypass;
aktiveeri ainult selgesõnalise `scenes` või `addedBlockScenes.peq` kaudu.

Toeta ainult **PEQ kanal A, Band 3 fikseeritud Peaking**:
Frequency500 Hz (tegelik499.99; mõlemad sisendid lubatud),1000,2000 Hz;
Q1.4/2; Gain−3/0/+3 dB; ploki Level−3/0/+3 dB. Sisendinäide:
`peqChannels:[{channel:"A",band3:{type:"Peaking",frequencyHz:1000,q:1.4,gainDb:3},levelDb:0}]`.
Määramata sõnad säilita kogutud algmallist. Ära üldista teistele ribadele,
kanalitele või tüüpidele; Q0.707 ülekirjutus, interpolatsioon, muud väärtused
ja slope pole toetatud. Registri ja päris kasutatud GET/SYX tõendite kontroll
käib igal koostamisel; ära asenda täismalli pelga tüübi-ID kirjutamisega.

Failikatsed taasesitasid kõik11 päris ekspordi keha täpselt (13 456 baiti),
samuti PEQ algkeha. V3 SYX jääb baitidentseks. Uue aktiivse katse puhul
taastuvad kõik V3 13 146 algbaiti PEQ kirje eemaldamisel/shundi taastamisel.
Tõend `../../docs/FM3_PEQ_COMPOSER_TESTS.json`, skript `scripts/test-composer-peq.mjs`.
Need on failitõendid, mitte uue aktiivse kombinatsiooni kuulamis-/CPU-kinnitus.

**Järgmine ainus seadmekatse**: `examples/FM3_PEQ_BAND3_TEST.syx` ja TXT.
Scene2 PEQ A sees: Band3 Peaking1000 Hz,Q1.4,Gain+3 dB,Level0. Teistes
stseenides uus PEQ bypass. V3 vanade plokkide seaded/tasemed säilivad;
PEQ sageduskorrektsioon võib mõjutada tajutavat valjust. Kasutaja impordib
teadlikult tööpuhvrisse, kontrollib väärtusi, kuulab ja annab praeguse CPU.
Enne eksporti taastab Scene2, PEQ A **sees**. Küsi terve
`FM3_PEQ_BAND3_TEST_export.syx`, võrdle kogu keha ja päiseid ilma normaliseerimata.
Uut GET-i pole vaja. Faili SHA-256
`3869051de07add62df3e528b3f53cd70e236ef9fe5c61bb1a342879f465d0f98`.
Ära korda PEQ alg-/juhtide kogumist ega varasemaid Amp/Cab/Filteri/C-D katseid.
GEQ, Enhancer ja PEQ teised ribad/tüübid ootavad. See jaotis asendab allpool
PEQ kirjutustoe ja juhtide kogumise OOTEL-seisu, kuid uus kontrollimport on ootel.

## PEQ päris algpaar kinnitatud, juhtide kogumine valmis — 0.61.0, 2026-10-09

Kasutaja `FM3_PEQ_BASE_CHECK_20261009T114022_c66909bc.zip` läbis sõltumatu
kontrolli: **PEQ1 EID54, 132/132 GET/SYX sõna**, 33 sõna × 4 kanalit.
Üks GET `f0000174111f36003df7`, kaadrid12/406/8, sisend tühjendati enne GET-i.
Säilita algandmed `references/peq-baseline-20261009-114022/`; raport
`../../docs/FM3_PEQ_BASE_PAIR_VALIDATION.json`. Aluse SHA on endiselt
`c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be`.
**Ära korda PEQ algkontrolli ega seniseid Amp/Cab/Filteri/C-D kogumisi.**
See jaotis asendab allpool päris PEQ algpaari OOTEL-seisu.

Jätka `scripts/peq-control-collector/LOE_MIND.txt` järgi paketiga
`FM3_PEQ_CONTROLS.zip`. See küsib 12 järjestikust mõõtepunkti: PEQ A
Band 3 Frequency500/1000/2000 Hz, Q0.707/1.4/2, Gain−3/+3/0 dB ja
ploki Level−3/+3/0 dB. Hoia Scene2, PEQ A bypass, Type ja muu preset samana.
Kirjuta Band 3 Type tegelik ekraanitekst; puuduvat välja ära oleta.
Käsk: `python3 ~/Downloads/FM3_PEQ_CONTROLS/FM3_PEQ_CONTROLS.py --port /dev/cu.usbmodem211104`.
Port on kasutaja viimase päris kogumise port; muutuse korral kasuta tegelikku.
Iga ekspordi järel kontrolli ühte kandidaatsõna, muud keha ja kaadriprefiksite
säilimist; nime 32 baidi muutus raporteeri eraldi. Ekraaniväärtuse ümardus
salvesta tegeliku arvuna. Vea korral säilita failid ja analüüsi, ära lõdvenda
valideerijat ega korda GET-i automaatselt. Kandidaat-PID pole veel tõend.

Terminal küsib iga lugemise eel `jah`; SET/SAVE/STORE puuduvad. `q` väljastab
ZIP-i, `s` jätab põhjusega mõõtmata. Sama käsk jätkab, edukaid punkte ei korrata.
Poolelijäänud/failinud katsed jäävad ZIP-i ega muutu kinnitatud mõõtmisteks.
Tulemuste saabumisel käivita kogu sessiooni `resume` failikontroll, kontrolli
iga ekraaniväärtuse ja isoleeritud sõna seost, paare ja algandmete järjepidevust.
Alles siis lisa kontrollitud juhtide tugi; ära üldista Band 3-st teistele
ribadele, kanalitele, tüüpidele või tervele väärtusvahemikule.

Koostaja PEQ kirjutustugi, muud PEQ ribad/tüübid, GEQ ja Enhancer on endiselt
ootel. V3 sobiv muusikaline helitasakaal säilib lähtekohana. Kogumistööriista
sünteetilised kontrollid on `scripts/peq-control-collector/TEST_RESULTS.json`;
neid ei tohi esitada päris kontrollmõõtmiste ega uue CPU/kuulamiskinnitusena.

## PEQ alus kontrollitud, üks GET ette valmistatud — 0.60.0, 2026-10-09

Kasutaja `FM3_PEQ_BASELINE.syx` on säilitatud `examples/` kaustas.
Eksport SHA-256 `c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be`.
PEQ 1 on rida 2 / veerg 10, EID54, kirje8688, 33 sõna × 4 kanalit,
parameetrid8734..8997, lisandus310 baiti. Kõik V3 13 146 algbaiti
taastuvad täpselt PEQ eemaldamise ja selle shundi taastamisega.
Nimi, Scene 2 ja kõik vanad plokid/tasemed säilisid; kõik failikontrollid läbivad.
PEQ A on Scene 2-s bypass'is; ülejäänud seitsmes stseenis on uus PEQ aktiivne.
Kõik neli PEQ kanalit sisaldavad samu sõnu, kuid nende tähendusi/skalaarvahemikke
pole sellest järeldatud. Tõend `../../docs/FM3_PEQ_BASELINE_VALIDATION.json`.

**Ära küsi algfaili korduseksporti.** Järgmine samm on ühe kinnitatava GET-i
pakett `scripts/peq-baseline-collector/`, kasutajale `FM3_PEQ_BASE_CHECK.zip`.
ZIP sisaldab täpselt tema saadetud `baseline.syx` faili, POSIX transporti,
Node'i kontrolli ja juhendit; pip/npm paigaldust pole vaja.
Käsk: `python3 ~/Downloads/FM3_PEQ_BASE_CHECK/FM3_PEQ_BASE_CHECK.py --port /dev/cu.usbmodem211104`.
See on senine port; muutuse korral kasutaja tegelik FM3 port.
Säilita sama seadmeolek, vali Scene2, PEQ A bypass, sulge FM3-Edit/Fractal-Bot;
terminal küsib `jah` enne seadme avamist ja üht GET-i.
TX `f0000174111f36003df7`; oodatakse132 sõna. SET/SAVE/STORE puuduvad.
Sisendpuhver tühjendatakse enne GET-i, korduspäringut automaatselt ei saadeta.
Edukas korduskäivitus väljastab tulemuste ZIP-i uut GET-i saatmata.
Pooleli/malformed katsefailid säilivad ZIP-is, kuid ei muutu kinnitatud paarideks.
Säilita `FM3_PEQ_BASE_SESSION`; kasutaja tagastab tulemuste ZIP-i.

Sünteetilised ja pseudoterminali katsed läbivad (sh üks päring, timeout,
vana RX kõrvaldamine,9 vigase paari tõrjumine ja4 pooliku katse säilitamine):
`scripts/peq-baseline-collector/TEST_RESULTS.json`. Need pole seadmetõend.
**Päris PEQ GET/SYX paar on ootel; koostaja PEQ kirjutustugi puudub.**
Pärast tulemuste ZIP-i kontrolli tegelik132/132 paar, alles siis valmista
sihitud Type/Frequency/Q/Gain/Level mõõtmised. Seniseid kogumisi ei korrata.
V3 sobiv helitasakaal jääb lähtekohaks. GEQ/Enhancer ootavad.
See jaotis asendab allpool PEQ esimese lisamisekspordi OOTEL-seisu.

## PEQ esimene lisamiskatse ette valmistatud — 0.59.0, 2026-10-09

Kasutaja nõustus järjekorraga PEQ → Graphic EQ → Enhancer. Alusta PEQ-st.
Praegune staatus on **ootab esimest kasutaja PEQ eksporti**, mitte valmis
kirjutustugi. Muusikaline V3 ja koostaja 0.8.1 jäävad muutmata.
791 kaasasoleva SYX-i kontroll ei leidnud PEQ-ga lähtematerjali.

Juhenda `examples/FM3_PEQ_FIRST_STEP.txt` järgi: V3, Scene 2, Parametric EQ 1
rida 2 / veerg 10 shundi asemele, kohe Filteri järel ja enne Send'i; PEQ A,
Scene 2-s bypass, uue ploki parameetreid veel ei muudeta. Küsi **üks terve
`FM3_PEQ_BASELINE.syx`**. Esimeses sammus pole terminali ega GET-i vaja.

Ekspordi saabumisel käivita `node scripts/fm3-peq-insertion-check.mjs FAIL`.
See kontrollib struktuuri ja V3 kõigi 13 146 algbaidi taastamist. PEQ sõnade
arv loetakse tegelikust kirjest; PID-d ja väärtuste skaalad jäävad kinnitamata.
Nimevälja muutus salvestatakse eraldi, muid erinevusi ei normaliseerita.
Ka läbiv kontroll ei luba parameetrite kirjutust ega tõenda GET/SYX paari.
Hälbe korral säilita fail ja analüüsi põhjust; ära korda automaatselt päringut.

Loe `references/peq-integration-plan.json` täpse ulatuse ja jätku kohta.
Seejärel valmista tegeliku ekspordi järgi üks eraldi kinnitatav read-only
GET/SYX paar ning sihitud juhtide kogumine. Seniseid Amp/Cab/Filteri,
C/D Leveli katseid ega V3 kuulamist ei korrata. GEQ ja Enhancer ootavad.
Kontrollivahendi 13 positiivset ja 35 tõrjuvat sünteetilist katset läbivad:
`../../docs/FM3_PEQ_PREFLIGHT_TESTS.json`. Päris PEQ seadmetõend veel puudub.

## Bonamassa V3 helitasakaal sobib — 0.58.2, 2026-10-09

Kasutaja vastas pärast Scene 2/3 +2 dB parandust: **„Nüüd tundub ok”**.
V3 stseenide suhteline helitugevus on seega kasutaja kuulamise põhjal sobiv.
Kasuta edasise sounditöö võrdlusena `examples/JB_EIGHT_SCENES_V3.syx`;
selle SYX-i ja spec'i ei muudetud. Amp B Level −1 dB mõjutab Scene 2/3;
clean 1/5 varasem 3 dB langetus ning C/D muusikalised tasemed säilivad.

Tagasiside on TXT-s ja raporti `listeningApproval` väljas. See kinnitab
praeguse preseti kuuldavat helitasakaalu, mitte uusi Ampi väärtusvahemikke,
V3 binaarset tagasieksporti, uut CPU-mõõtmist ega iga efekti eraldi hindamist.
`knownDeviceBody` jääb nulliks; V3 ekspordi puudumine on raportis selge.
Varasem CPU 45,7–46,7% käib V1 kohta. Ära küsi sama kuulamiskontrolli ega
lõpetatud mõõtmiste kordamist. Jätka olemasoleva ühise koostajaga järgmise
konkreetse soundi või kasutaja soovitud muudatuse juures.
See jaotis asendab allpool V3 helitasakaalu OOTEL-seisu.

## Bonamassa V3: Scene 2 ja 3 +2 dB — 0.58.1, 2026-10-09

Kasutaja kuulas muusikalist V2-t: peaaegu kõik stseenid tunduvad omavahel
sobivas tasakaalus, kuid ta soovib **Scene 2 ja 3 mõlemad 2 dB valjemaks**.
Viimane täpsustus asendab esialgse ainult Scene 2 soovi. Need kaks stseeni
kasutavad ühist Amp B kanalit; olemasolev `levelB` muudeti −3 → −1 dB.
Ära küsi selle jaoks uut Outputi stseenitaseme mõõtmist ega GET-kogumist.

Uus muusikaline preset on **`examples/JB_EIGHT_SCENES_V3.syx`**, koos
`.spec.json`, `.txt` ja `.validation.json` failidega. Koostaja 0.8.1 jäi samaks.
V2-ga võrreldes muutusid ainult kehabaidid 4946/4947: Amp B Leveli sõna
50461 → 51772, dekodeeritud −0,999786 dB (ekraanil −1,00 dB).
Kõik teised 13 144 sisubaiti säilivad: stseenid 1/4/5/6/7/8, Gain/EQ,
efektid ja kahe rea Send/Return-paigutus. Clean 1/5 Amp A jääb −12 dB-le;
C/D kasutavad seniseid muusikalisi tasemeid, mitte −11 dB katsetasemeid.
Level on Ampi parameeter, mitte OUTPUT 1 mõõdiku sihtnäit.

V3 SYX SHA-256: `0a17b54fcee104887b6707b29ae34ea7bec6e049a341c1ec8e77ec75c7b68683`.
V2 baitidentne taasesitus, ühe sõna eraldatus, stseeniseosed, CRC, kaadrid,
footer ja kogu keha tagasilugemine läbivad. Tõend on V3 raporti
`levelRefinement` all; selle routing'u võrdlus käib V2 suhtes, üldine
koostajaraport aga Filterita NewLooki aluse suhtes.

**V3 kuulamine ning import/tagasieksport on veel kinnitamata.** V2 tõendit
ei kanta muudetud sisule üle. Järgmine samm: kasutaja laadib V3 ja kuulab,
kas Scene 2/3 tasakaal teistega nüüd sobib. CPU 45,7–46,7% on endiselt
varasem V1 vaatlus. Lõpetatud C/D mõõtmist ega V2 eksporti ei korrata.
See jaotis asendab allpool V2 taastamise ja ainult clean-stseenide kuulamise
jätkupunkti; V2 jääb varasemaks võrdlusversiooniks.

## C/D Level-punktid kinnitatud — 0.58.0, 2026-10-09

Kasutaja `FM3_AMP_CD_LEVEL_CHECK_export(1).syx` on kontrollitud ja säilib
`examples/FM3_AMP_CD_LEVEL_CHECK_export.syx` kujul. **Katse on lõpetatud;
ära küsi korduseksporti ega uut GET-i.** V2-ga võrreldes muutusid ainult
Amp C/D Leveli sõnad 5234/5522. Mõlemad on −11 dB, toorsõna 45218.
A −12, B −3, kõik stseenid, muud parameetrid, routing, Send/Return ja
süsteemiandmed säilisid. Faili terviklus ja kõik 13 146 sisubaiti läbivad.

Koostaja `jb-composer-0.8.1` lubab `ampLevels` kaudu C USA MK IV Lead Bright
(ID24) ning D Plexi 50W High 1 (ID11) **täpselt −11 dB**. A Double Verb
Vibrato −12 dB ja senine B tugi säilivad. Teised A/C/D väärtused või mudelid
annavad vea; kogu vahemikku, Gaini/EQ-d ega uusi kooslusi ei kinnitata.
Loe [Level-tuge](../../docs/FM3_COMPOSER_AMP_LEVELS.md); tõend ja test on
`../../docs/FM3_COMPOSER_AMP_CD_LEVEL_VALIDATION.json` ning
`scripts/test-composer-amp-cd-levels.mjs`. Katseplaan märgiti lõpetatuks.

**Muusikaline fail on endiselt `examples/JB_EIGHT_SCENES_V2.syx`**;
selle baidid säilivad. C/D −11 dB olid ajutised katsetasemed, mitte kasutaja
soovitud uus soolo/crunch-tasakaal. Juhenda taastama V2: C on seal senine
ligikaudu −8 dB, D −8,16 dB, clean-stseenide 1/5 Amp A −12 dB.
Järgmiseks küsi clean-stseenide tasakaalu pärast 3 dB langetamist.
Uut kuulamiskinnitust ega CPU-näitu pole saadetud. Varasem 45,7–46,7% oli V1.
See jaotis asendab allpool 0.57.0 C/D ootel-seisu ja korduseksportimise juhise.

## Bonamassa V2 ja Ampi Level-tugi — 0.57.0, 2026-10-09

Kasutaja soovis clean-stseene 1/5 3 dB vaiksemaks. Tema
`examples/JB_EIGHT_SCENES_V2_export.syx` muutis V1-ga võrreldes ainult
Amp A Leveli sõna 4658: −9 → −12 dB (46529 → 44563). Kõik muud 13 144
sisubaiti säilisid. Koostaja `jb-composer-0.8.0` taastab selle kogu keha.
Uus `examples/JB_EIGHT_SCENES_V2.syx` koos spec/TXT/raportiga on valmis;
sisemine nimi on V2, kasutaja ekspordis veel V1. Sama sisu korduseksporti
pole vaja. Scene2/6 ning ülejäänud mitte-clean stseenide seaded säilisid.
Clean-taseme sobivust pärast langetamist pole veel kinnitatud; CPU
45,7–46,7% oli varasem V1 vaatlus.

Kasuta `ampLevels:[{channel:"A",levelDb:-12}]`: A toetab praegu ainult
mõõdetud Double Verb Vibrato −12 dB punkti; teised väärtused/mudelid annavad
vea. B loendikirje kasutab senise `levelB` ulatust; mõlemad korraga on viga.
Gain/EQ üksikjuhid jäävad B-kanalile. Loe
[Level-tuge ja C/D katset](../../docs/FM3_COMPOSER_AMP_LEVELS.md).

**Kasutaja palus ka C/D Level-tuge. Nende kirjutus on OOTEL**, ühine liides
ja selged mõõtmata kanali vead on ette valmistatud. Järgmine üks katse:
V2 alusel Scene6 Amp C Level −11 dB, Scene4 Amp D Level −11 dB, seejärel
Scene2 ja terve `FM3_AMP_CD_LEVEL_CHECK_export.syx`. Täpsed sammud on
`examples/FM3_AMP_CD_LEVEL_CHECK.txt`, plaan `references/amp-level-cd-plan.json`.
Ära nõua kaht eraldi eksporti ega GET-i. Ajutised C/D testitasemed ei muuda
muusikalise V2 faili tasemeid. Lisa C/D mõõdetud kirjutus alles tegeliku
faili sõnavõrdluse järel; ära väida seda praegu valmis ega laienda Gain/EQ-le.

## Bonamassa kaheksa stseeni: seadmering ja CPU — 0.56.2, 2026-10-09

Jätka presetiga `examples/JB_EIGHT_SCENES_V1.syx` ja sama nimega
`.spec.json`, `.txt`, `.validation.json` ning `_export.syx` tõendiga.
Import/tagasieksport kinnitati 2026-10-08: kõik 13 146 sisubaiti kattuvad
täpselt, normaliseerimiseta. Kõik kaheksa stseeni, Scene2/6 senised seaded,
kahe rea Send/Return-paigutus ja ainult Scene8 aktiivne Filter säilisid.
**Ära küsi selle muutmata preseti kordusimporti, tagasieksporti ega GET-i.**

Salvesta 2026-10-09 kasutajavaatlus: **CPU 45,7–46,7%**. Stseenide katvus
ja mõõtetingimused pole täpsustatud; ära esita seda kõigi stseenide või
uute efektikoosluste ülempiiri ega koormustesti kinnitusena. SYX ei tõenda CPU-d.
Kuue uue variandi heli ja suhtelised tasemed on veel hindamata.
Järgmine samm on kuulata stseene 1/3/4/5/7/8 tuttavate 2/6 kõrval; alusta
Scene1 Clean Edge ja Scene2 Rhythm Fat võrdlusest ning küsi vajalikku
helitugevuse/kõla parandust. Senised Ibanezi humbuckerid ja stereo OUT1 FOH
jäävad lähtekohaks. Muuda seadeid kuulamistagasiside põhjal.

See kirje uuendab selle konkreetse preseti jätkupunkti. Generaator 0.7.1 ei
saanud uut kirjutusfunktsiooni ega automaatset selle näidise äratundjat:
`knownDeviceBody` näitab loomisaegset olekut; hilisem tõend on raporti
`hardwareRoundtrip` ja `cpuObservation` all. Teised kooslused ei päri kinnitust.

## Ampi/Cabi koostajakatse seadmering kinnitatud — 0.56.1, 2026-10-08

Kasutaja `examples/FM3_AMP_CAB_AD_TEST_export.syx` kattub loodud
`FM3_AMP_CAB_AD_TEST.syx` failiga kõigi **12 804 kehabaidi** osas täpselt,
ilma ühegi erinevuse normaliseerimiseta. **See import/tagasieksport on
lõpetatud; ära küsi sama katse kordamist ega uut GET-kogumist.**
Ekspordi SHA `22b6df6e5c3edf26ba3d9542179fc643ae3f6f9fabdcd3d61a7d4c57dfa33248`,
keha SHA `2336d091bf1691faa8c765ca16600b77ed57cb6e9840271823be2ad9074b9b74`.

Kinnitus hõlmab selle konkreetse NewLooki näidise Amp A Double Verb Vibrato /
D Brit JVM Crunch Orange ja Cab A 2x12 Double Verb / C 4x12 Friedman V30 /
D 4x12 Lerxst kooslust. Kõik 576 Ampi ja 424 Cabi parameetrisõna säilivad.
Amp B/C, Cab B ning Scene2 rütmi ja Scene6 soolo kogu senine sisu säilivad.
Kõik muud efektid, Input/Output, kaks rida, Send/Return, stseeniseosed,
modifierid ja süsteemiandmed säilivad. Ainult deklareeritud katseseadete
asendamine algsetega annab tagasi kõik 12 804 NewLooki algbaiti.

Preseti nimi ja valitud Scene2 säilivad. Tihendatud esitused erinevad,
mõlemal 4206 baiti; toorpäises erineb ainult CRC. Kaadrid, preset CRC,
footer, pikkused ja lõputäide läbivad. Ülejäänud mudelite/sihtkanalite
kooslusi ei nimetata selle põhjal seadmel kinnitatuks. Uute A/D soundide
kuulamishinnangut ega CPU-näitu ei saadetud.

Korratav kontroll `scripts/test-composer-amp-cab-hardware.mjs`, raport
`../../docs/FM3_AMP_CAB_HARDWARE_ROUNDTRIP.json`. Koostaja 0.7.1 tuvastab
selle tegeliku ekspordi kogu keha; täpne algne SYX märgitakse eraldi
impordituks. Uue nimega samasisuline fail saab ainult sisukattuvuse kinnituse;
teistsugune mudel ei päri seadmekinnitust. Näidise TXT/raport on uuendatud.

Edasi kasuta ühist koostajat konkreetse soundi koostamiseks. Uusi juhte
mõõda ainult siis, kui soovitud tulemus vajab praegu toetamata väärtust või
kanalit. See jaotis asendab allpool 0.56.0 selle katse OOTEL-seisu.

## Ampi ja Cabi mudelivalik A–D kanalitele — 0.56.0, 2026-10-08

Ühine `jb-composer` toetab nüüd `ampChannels:[{channel,model}]` ja
`cabChannels:[{channel,model}]`: 1–4 unikaalset A–D kanalit, 336 Amp-malli
ning 45 Dyna-Cab-malli kõigil seitsmel kinnitatud alusel. Eelista kasutaja
puhast `jb-newlook` alust. Samasse kirjeldusse lähevad senised efektid,
mõõdetud juhid ja `scenes`; uusi Amp/Cab plokke ega routing'ut see ei lisa.
Loe `../../docs/FM3_COMPOSER_AMP_CAB_CHANNELS.md`.

Mudelivalik kopeerib terve 144-sõnalise Amp- või 106-sõnalise Cab-kanali,
sealhulgas tasemed. Valimata kanalid säilivad. **Ära luba, et uue mudeli
valimine säilitab valitud kanali varasema Leveli või kuuldava valjuse.**
Olemasoleva sobiva kanali säilitamiseks jäta see mudeliloendist välja.
Ampi üksikjuhid jäävad senisele B-kanalile; A/C/D Gain/EQ/Level arvulisi
juhte see laiendus ei lisa. Cab-mall määrab mõlemad sama Dyna-Cabi pesad
koos kõigi kogutud mikrofoni-, segu-, filtri- ja tasemesätetega.

Senised `ampModelB` ja `cabModelB` toimivad sama SYX-väljundiga. Vana
B-valiku ja uue loendi B-kirje samaaegne määramine annab vea, ka sama
mudeli korral. Vana B koos uue A/C/D-ga on lubatud. Mudelinimed tulevad
`--capabilities` loendist; Amp/Cab kasutab võtit `model`, efektid `type`.
Mudelivalik ei muuda stseenikanaleid ega bypass'i. `scenes` määrab need
vajadusel; TXT/JSON näitavad iga lõpliku kanali kasutavaid ja aktiivseid stseene.

Koostaja `jb-composer-0.7.0` kontrollid: kõik 1344 Amp- ja 180 Cab-malli
sihtkanaliülekannet, 56 üksikkanali eraldatuse juhtu seitsmel alusel, kõik
kaheksa stseeni seitsmel alusel, 28 tagasiühilduvuse juhtu ja 45 vigast
sisendit. Kooskasutus Filteri lisamisega läbib; kinnitatud Bonamassa
12 804-baidine keha taastub täpselt. Test `scripts/test-composer-amp-cab.mjs`,
raport `../../docs/FM3_AMP_CAB_CHANNEL_TESTS.json`. Senised koostaja,
kooskasutuse ja stseenide kontrollid läbivad. Koostaja skeemi mudeliloend
sisaldab nüüd kõiki 336 tegelikku nime; teisi profiile ei muudetud.
Failikontroll ei tähenda kõigi uute koosluste seadme-, heli- ega CPU-kinnitust.

Üks valmis esinduslik seadmekatse: `examples/FM3_AMP_CAB_AD_TEST.syx`
koos TXT/spec/raportiga. Amp A Double Verb Vibrato; Amp D Brit JVM Crunch
Orange; Cab A 2x12 Double Verb, C 4x12 Friedman V30, D 4x12 Lerxst.
Scene1 valib A/A, Scene4 D/D ning saab katsenime. **Amp B ja C ning Cab B
kõik baidid, Scene2 rütmi ja Scene6 soolo kogu sisu säilivad**, sealhulgas
Amp B Level -3dB / C Level -8dB. Need pole OUTPUT1 mõõdiku näidud.
Kaks rida, Send/Return ja kõik muud efektid säilivad; keha 12 804 baiti.
Muudetud kanaleid kasutavad teised stseenid võivad kõlada teisiti.
SYX SHA `e9132d54e04e9806af8506af7eb234ec9be6ec7fad01d6fcb6920446409e6493`.

Selle uue kombinatsiooni seadmering on **OOTEL**. Kasutaja impordib faili
FM3-Editi tööpuhvrisse ja ekspordib muutmata terve preseti, valitud Scene2,
nimega `FM3_AMP_CAB_AD_TEST_export.syx`. Ära palu kanaleid läbi klõpsida;
võrdle tagasiekspordis kõiki kehabaite ja päiseid ilma normaliseerimiseta.
Uut GET-kogumist ega lõpetatud Filteri/Pitchi katsete kordamist ei küsita.
See jaotis asendab allpool väite, et ühise koostaja Amp/Cab mudelivalik
on piiratud B-kanaliga; üksikparameetrite ja muude profiilide piirid säilivad.

## Filteri mõõdetud juhid ühises koostajas — 0.55.0, 2026-10-08

Kasutaja `FM3_FILTER_CONTROLS_20261008T165150_a72c6f32.zip` on kontrollitud:
18 plaanisammu, 17 edukat GET/SYX-paari, igas 148/148 sõna, kokku 2516.
Q=0.707 jäeti põhjusega „väärtus juba sama” vahele; see pole mõõdetud punkt
ja sellele ei lisatud kirjutusõigust. Kuus ebaõnnestunud katset jäid enne GET-i;
nimeparanduse järel tehtud kogumine õnnestus. **Ära nõua tehtud kogumise kordamist.**
Tõendid `references/filter-controls-20261008-165150/`, punktid
`references/filter-controls.json`, audit `../../docs/FM3_FILTER_CONTROL_VALIDATION.json`.

`filterChannels` lubab nüüd järgmisi valikulisi juhte koos `channel` ja `type`:
- A High-Pass: `frequencyHz` 80, 120, 250.
- B Low-Pass: `frequencyHz` 4000, 6000, 8000.
- C Peaking: `frequencyHz` 500, 1000, 2000; `q` 1.4 või 2;
  `gainDb` -3, 0, 3; `levelDb` -6, 0, 3.
Need on täpsed mõõdetud punktid neil tüüpidel/kanalitel, mitte pidevad vahemikud.
Ka salvestatud ekraaniarvud sobivad sisendiks: C 2000→1999.9 Hz;
B 4000→3999.9, 6000→6000.1, 8000→7999.9 Hz. Nominaali küsimisel kirjutatakse
sama mõõdetud toorväärtus ja JSON/TXT näitavad tegelikku ekraaniarvu.
Ära ümarda seda tõendis varjatult. Frequency PID1, Q PID2, Gain PID3, Level PID4.

Kõigi 18 tüübi A–D täiskanalimallide tugi säilib. Üksikjuhtide lisamine teistele
kanalitele või tüüpidele pole selle versiooni ulatus; kinnitamata väärtus,
Q=0.707, Order jm annavad selge vea. Malli valik kopeerib kogu kanali ning
seejärel rakenduvad küsitud juhid; määramata juhid pärinevad kogutud mallist.
Kanalivaliku ja bypass'i määrab `scenes`; juhid üksi ei aktiveeri efekti.

Koostaja taastab kõik 17 tegelikku ekspordikeha täpselt, ilma ühegi baidi
normaliseerimiseta. Iga näidise Filteri eemaldamine/shundi taastamine annab
kõik 12 804 algset NewLooki baiti: kaks rida, Send/Return, senised tasemed ja
stseenid säilivad. Amp B -3dB ja C -8dB on parameetrid, mitte OUTPUT1 mõõdik.
21 üksikpunkti/ekraani-alias'e kontrolli ja 22 keelatud sisendi tõrjumist läbivad;
varasemad Filteri mallide ja stseenide kontrollid säilivad.
Korratav test `scripts/test-composer-filter-controls.mjs`, raport
`../../docs/FM3_FILTER_CONTROL_GENERATOR_TESTS.json`.

Valmis `examples/FM3_FILTER_CONTROLS_VERIFIED.syx` + TXT/spec/raport
vastab viimase kogutud faili kõigile 13 146 kehabaidile: Filter A High-Pass250,
B Low-Pass7999.9, C Peaking1999.9/Q2/Gain0/Level3, D Tilt EQ; Scene2 B,
Scene6 C, teised A; Filter kõikjal bypass'is. `knownDeviceBody` tunnistab
ainult täielikku kehakattuvust tegeliku ekspordiga. **Selle sisu kordusimporti/
tagasieksporti ei küsita.** Uut nime/tihendust pole eraldi seadmesse imporditud.
See pole uus aktiivse Filteriga sound; efekti heli ja CPU jäid hindamata.

Loe `../../docs/FM3_FILTER_MEASURED_CONTROLS.md`. Edasi kasuta olemasolevat
ühtset koostajat konkreetse soundi jaoks; lisakogumine ainult puuduva juhi või
väärtuse vajadusel. See jaotis asendab allpool 0.54.x mõõtmiste OOTEL-seisu
ning üldise väite, et Filteri üksikjuhid pole kirjutatavad.


## Filteri koguja nimevälja parandus — 0.54.1, 2026-10-08

Kasutaja koguja peatus teatega `Preset header/name changed at 11`.
See bait on preseti 32-baidises nimeväljas (8..39), mitte Filteri parameetrites.
Põhjus oli koguja liiga range nimekontroll; kasutaja SYX-i pole veel saadetud
ning muid võimalikke erinevusi ei ole väidetud kontrollituks. Selles katses
GET-i ei saadetud: viga tekkis failikontrollis enne kinnitust ja seadme avamist.

Koguja 0.1.1 lubab ainult nimevälja muutust ja salvestab `presetNameChange`
alla nimed ning mõlema kogu 32-baidise välja toorandmed. Terminal näitab
nime muutust enne GET-i. Kõik ülejäänud päise-, keha-, tüübi-, bypass- ja
GET/SYX kontrollid säilivad. Pelk nimevahetus ei loe parameetrimõõtmiseks.
Plaan, alus ja sessiooniversioon jäävad samaks; muutmata nimega võrdlusraport
kattub 0.1.0 väljundiga, seega senised edukad sammud ei vaja kordamist.

Kasutajale antav `FM3_FILTER_CONTROLS_NAME_FIX.zip` sisaldab kahte faili:
`control-check.mjs` ja `FM3_FILTER_CONTROLS.py`. Need tuleb kopeerida olemasoleva
Downloads/FM3_FILTER_CONTROLS kausta samanimeliste asemele. Ära asenda ega
kustuta kogu kausta või FM3_FILTER_CONTROLS_SESSIONit. Käivita sama käsk ning
anna sama varem tõrjutud SYX uuesti, kui FM3 olek vastab endiselt ekspordile.
Uut eksporti pelgalt nimevea tõttu ei nõuta. Mõõtmised ja generaatori
parameetriskaalad on endiselt kinnitamata kuni tegelike tulemuste analüüsini.


## Filteri üksikjuhtide koguja valmis — 0.54.0, 2026-10-08

Kasutaja nõustus Frequency/Q/Gain/Level mõõtmisega. Valmis on
`scripts/filter-control-collector/FM3_FILTER_CONTROLS.py`, kaasas tööjuhend,
18-sammuline `plan.json` ja kinnitatud viimase tagasiekspordi `baseline.syx`.
Loe `../../docs/FM3_FILTER_CONTROLS.md`. Esimene samm: Scene2, Filter C Peaking,
ainult Frequency 500 Hz; Filter jääb bypass'i. Tüübi- ega muutmata aluse
korduskogumist ei küsita. Senine nelja kanali seadmering on lõpetatud.

Plaan: C Peaking Frequency 500/1000/2000 Hz, Q 0.707/1.4/2.0,
Gain -3/+3/0 dB, Level -6/0/+3 dB; A High-Pass Frequency 80/120/250 Hz;
B Low-Pass Frequency 4000/6000/8000 Hz. Muudatused on järjestikused,
úks juht korraga. Kanalit võib valida ülesande järgi ainult Scene2-s;
Type, Order, bypass, muud plokid/stseenid ja expression jäävad samaks.
Terminal kinnitab ekraaniväärtuse (võimaldab ümarduse täpsustamist), seejärel
üks selgesõnaliselt lubatud GET ja 148/148 GET/SYX kontroll.
PID-d ja skaalad pole ette määratud; seotud sõnade muutus vajab eraldi analüüsi.

ZIP lahti Downloads-kausta `FM3_FILTER_CONTROLS`, käivitus:
`python3 ~/Downloads/FM3_FILTER_CONTROLS/FM3_FILTER_CONTROLS.py --port /dev/cu.usbmodem211104`.
Port on kasutaja varasem; muutumise korral tegelik FM3 port. `q` teeb tulemuste
ZIP-i ja lõpetab; sama käsk jätkab viimase eduka faili seisundist. `s` jätab
punkti mõõtmata ja salvestab põhjuse. Säilitada koguja koos sessioonikaustaga
ning tulemuste ZIP. Vigu ei korrata automaatselt. SET/SAVE/Store ei saadeta.

Kõik 18 sammu ning pausi/jätkamise/veaolukorrad läbivad sünteetilise testi
`test_controls.py`, raport `../../docs/FM3_FILTER_CONTROL_COLLECTOR_TESTS.json`.
Filter GET transport on senise seadmel kasutatud koguja koodiga baitidentne.
**Päris juhtide kogumine on ootel; generaator neid juhte veel ei kirjuta.**
Pärast tulemuste ZIP-i kinnita ainult tegelikult mõõdetud punktid ja tähendused;
ära nimeta neid automaatselt kogu vahemiku ega teiste tüüpide kinnituseks.


## NewLooki Filteri koostajakatse seadmering kinnitatud — 0.53.1, 2026-10-08

Kasutaja `examples/FM3_NEWLOOK_FILTER_TEST_export.syx` kattub loodud
`FM3_NEWLOOK_FILTER_TEST.syx` failiga kõigi 13 146 kehabaidi osas täpselt,
ilma normaliseerimiseta. **Filteri automaatse lisamise ja nelja kanali
koostajakatse on lõpetatud; ära küsi selle kordusimporti ega tagasieksporti.**

Filter1 on Cab'i järel rida2/veerg9. Kõik 148 parameetrisõna säilivad:
A High-Pass, B Low-Pass, C Peaking, D Tilt EQ. Scene2 A, Scene6 C,
teised A; Filter kõigis kaheksas stseenis bypass'is. Kogu routing, kaks rida,
Send/Return, algsete plokkide kõik kanalid ja stseenid, modifierid ning
süsteemiandmed säilivad. Ainult Filteri 342-baidise kirje eemaldamine ja
shundi taastamine annab ka seadmeekspordist täpselt kõik 12 804 NewLooki
algkeha baiti. Sobivaks tunnistatud rütmi/soolo seaded, Amp B Level -3dB
ja Amp C Level -8dB, on säilinud; need pole OUTPUT1 mõõdiku näidud.

Generaator taastab algse SYX-i baitidentselt. Tihendatud esitus erineb,
mõlemal 4373 baiti; päistes erineb ainult CRC. Kaadrid, preset CRC, footer,
kodeeritud pikkused ja nulltäide läbivad. Ekspordi SHA-256:
`b3d406ce0bf847dadd20ba4b36553e8a54cc4939fe4808ee7e389e40d63ae2a3`.
Korratav tõend `scripts/test-composer-newlook-filter-hardware.mjs`, raport
`../../docs/FM3_NEWLOOK_FILTER_HARDWARE_ROUNDTRIP.json`.

Kinnitus kehtib sellele Amp/Cab/Drive/Delay/Reverb/Filteri näidisele.
Filter oli bypass'is: aktiivse efekti heli ega selle preseti CPU-d ei hinnatud.
Kõigi üheksa lisaploki koosluse, sh Filteri ja Flangeri ühise järjestuse,
seadmekinnitust sellest ei tuletata. Puhta `jb-newlook` aluse eelistus säilib;
ära lisa test-Filterit vaikimisi igale soundile. Frequency, Q, Gain, Level ja
Order vajavad endiselt sihitud mõõtmisi; tüübi kogumist ei korrata.
Järgmine praktiline laiendus vali konkreetse soundi vajalikest juhtseadistest.
See jaotis asendab allpool 0.53.0 selle katse OOTEL-seisu ja kordusekspordi juhise.


## Filteri 18 tüüpi kogutud ja ühises koostajas — 0.53.0, 2026-10-08

Kasutaja ZIP `FM3_FILTER_BATCH_20261008T132133_59e6acea.zip` läbib kõik
kontrollid: 6 tegelikku GET/SYX-paari, igas 148/148 sõna, kokku 888; kõik
18 tüüpi ja 18 unikaalset binaar-ID-d. Algse Nulli ja viie rühma kogumine
on lõpetatud. **Ära küsi Filteri kogumise ega algkontrolli kordamist.**
Tegelik vastus koosnes kaadritest 12/454/8 baiti; üks täielik GET iga paari
kohta. Nulli ID0 ja Type pid0 on nüüd tegeliku paariga kinnitatud.
Tõendid `references/filter-batch-20261008-132133/`, kataloog
`references/filter-library.json`, audit `../../docs/FM3_FILTER_COLLECTION_VALIDATION.json`.

`jb-composer` toetab `filterChannels:[{channel:"A",type:"High-Pass"}, ...]`:
1–4 unikaalset A–D kanalit, kõik 18 pildilt kinnitatud nime. Iga valik
kopeerib kogu vastava 37-sõnalise kanalimalli ja kontrollib selle GET/SYX
päritolu. Need pole tingimata tehasevaikeväärtused. `Frequency`, `Q`, `Gain`,
`Level`, `Order` ja muud üksikjuhid EI OLE veel mõõdetud ega kirjutatavad;
nende küsimine annab vea. Eraldi Filteri profiili pole vaja: kasuta ühist
koostajat ja puhast `jb-newlook` alust. Kogumisalus pole uus koostamisalus.

Filter1 lisatakse ainult vajadusel rida2/veerg9, Cab'i järel enne Send'i,
asendades shundi 1028. Kaks rida, Send/Return, algsed plokid ja süsteemiandmed
säilivad. Uus Filter algab A/bypass kõigis stseenides; doonori aktiivset
Null-olekut ei kopeerita. `scenes` juhib kanalivalikuid ja bypass'i, ka vana
`addedBlockScenes.filter` jääb toetatuks. Aktiveerimiseks tuleb vastava kanali
mall samas kirjelduses küsida. Vanadel alustel annab Filteri puudumine vea.

72 tüübi/sihtkanali täiskeha võrdlust läbivad. Kõik kuus kasutaja eksporditud
keha taastuvad täpselt ilma normaliseerimiseta, kui kirjeldada nende tegelikud
Filteri kanalid ja stseeniseaded. Kõigi üheksa lisaploki koos kirjutuse
täiskeha kontroll läbib failitasemel; see pole nende koosluse seadme- ega
CPU-kinnitus. Senised koostaja katsed säilivad. Vaata
`../../docs/FM3_FILTER_GENERATOR_TESTS.json`, `scripts/test-composer-filter.mjs`
ja `../../docs/FM3_COMPOSER_FILTER.md`.

Järgmine sihitud fail on `examples/FM3_NEWLOOK_FILTER_TEST.syx` koos TXT,
spec'i ja raportiga: Filter A High-Pass (3), B Low-Pass (1), C Peaking (6),
D Tilt EQ (8); Scene2 A, Scene6 C, teised A, **kõigis stseenides bypass**.
Üks kirjeldus ühendab senised Amp/Cab/Drive/Delay/Reverb seaded ja Filteri.
Ainult Filteri kirje eemaldamine ja shundi taastamine annab täpselt kõik
12 804 algse NewLooki kehabaidi; sobivaks tunnistatud tasemed ja stseenid
säilivad. Väljundkeha 13 146 baiti; SYX SHA-256
`63d7a9a4381bbe7bcc40179f0e79be0c7e5a6c4ebe66f475380bd1e24f0264cf`.

Selle uue nelja kanali koosluse ja automaatse lisamise väljundi import
on OOTEL. Kasutaja impordib FM3-Editi tööpuhvrisse ja kontrollib asukohta
ning bypass'i. Jätab Scene2 ja parameetrid muutmata; kanaleid pole vaja läbi
klõpsida. Ekspordib terve `FM3_NEWLOOK_FILTER_TEST_export.syx` ning saadab
võrdluseks. Võrdle kõiki kehabaite ja päiseid ilma normaliseerimiseta.
See jaotis asendab allpool 0.52.0 kogumise/algse GET-i ootel seisu ning
Filteri generaatoritoe puudumise. Kuulamishinnang ja uue faili CPU on eraldi.

## Filteri alus kontrollitud ja koguja valmis — 0.52.0, 2026-10-08

Kasutaja valis järgmise etapina Filteri ja saatis `FM3_FILTER_BASELINE.syx`
ning Type-loendi pildi. Koguja `scripts/filter-collector/FM3_FILTER_BATCH.py`
kasutab senist käsitsi A–D valimise, terve SYX-ekspordi ja ühe GET-päringu
töövõtet. Pildilt on kinnitatud 18 nime; järjekorrast ei tuletata binaar-ID-sid.
Algseisundi pildil on Null, A-kanali kandidaattunnus 0; esimene päris GET/SYX
paar on OOTEL. Kogumist ega Filteri generaatorituge ei tohi veel valmis nimetada.

Alus on kogujaga kaasas `scripts/filter-collector/baseline.syx`, SHA-256
`9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80`.
Scene2, sisemine nimi `JB NEWLOOK RHYTHM SOLO`, Filter1 EID 114, rida2/veerg9
Cab'i järel. Filteri kirje 7568..7909, parameetrid 7614..7909, 37 sõna kanalis,
kokku 148; keha 13 146 baiti. Filteri eemaldamine ja shundi taastamine annab
täpselt kasutaja NewLooki kõik 12 804 kehabaidi: varasemad tasemed, plokid,
stseenid, Send/Return, modifierid ja süsteemisaba säilivad.

**Saadetud aluses on Filter aktiivne kõigis stseenides**, kõik kanalivalikud A.
Ära väida seda bypass'iks. Algse GET-i eel säilitab kasutaja täpselt ekspordi
seisundi (A Null, Scene2, aktiivne Filter). Alles pärast PASS-tulemust lülitab
ta Filter1 Scene2-s bypass'i ja kogub tüüpe. Koguja lubab lisaks Filteri
parameetritele ainult Scene2 Filteri kanali- ja bypass-sõna muutumist;
tüübirühmade ekspordid peavad olema bypass'is. Eraldi ainult bypass'i pärast
uut alusfaili pole vaja. Ülejäänud sisu muutumine peatab töö enne GET-i.

Koguja loeb ühe Filter1 GET-iga kõik 148 sõna ja võrdleb iga sõna SYX-iga.
Päring `f0000174111f720079f7`; ei saadeta SET/SAVE/Store, kanali-/presetivalikut
ega automaatset korduspäringut. Algkontroll katab Nulli; seejärel 17 puuduvat
tüüpi viie rühmaga 4+4+4+4+1. Esimene rühm A All-Pass, B Auto-Wah,
C Band-Pass, D Envelope Filter. q väljastab ZIP-i, sama käsk jätkab
kontrollitud tulemustest. Kausta ja FM3_FILTER_SESSIONit tuleb säilitada.

Järgmine kasutajasamm: koguja ZIP lahti Downloads-kausta, algfaili seisund
seadmes, FM3-Edit kinni ning
`python3 ~/Downloads/FM3_FILTER_COLLECTOR/FM3_FILTER_BATCH.py --port /dev/cu.usbmodem211104`.
Port on varasem kasutaja port; kui muutunud, tuleb kasutada tegelikku FM3 porti.
Pärast esimest PASS-i järgida terminali juhiseid. Lõpuks üks tulemuste ZIP siia.

Tõendid `../../docs/FM3_FILTER_BASELINE_AUDIT.json` ja
`../../docs/FM3_FILTER_COLLECTOR_TESTS.json`, tööjuhend
`../../docs/FM3_FILTER_COLLECTION.md`. Sünteetilised kontrollid läbivad:
148-sõnaline protokoll, kontrollsummad, vigased failid/vastused, kordus-GET
tõke, alg- ja esimese rühma kogumine, jätkamine/q/ZIP ning rikutud tõendite
tõrjumine. Päris FM3-ga pole seda kogujat veel käivitatud.
Frequency/Q/Gain/Level skaalad ja Order jäävad kinnitamata. Pärast tegelikku
kogumist valideeri GET/SYX paarid, siis lisa täiskanalimallid ja Filteri
automaatne lisamine ühisesse koostajasse. Vajalikud parameetrid mõõda eraldi.

## Ühine rütmi/soolo ja kõigi stseenide koostamine — 0.51.0, 2026-10-08

Kasutaja palus jätkata tervikliku presetikoostaja plaaniga. `jb-composer`
toetab nüüd `scenes` loendit: iga stseeni 1–8 nimi ning olemasolevate või
selgesõnaliselt lisatud toetatud efektiplokkide kanal A–D ja `bypass`.
Uue töö jaoks eelista seda liidest. Määramata väljad säilivad; sama välja
määramine vanas ja uues liideses annab vea. Stseenides pole uusi tasemevälju:
kanali parameetreid jagavad kõik seda kanalit kasutavad stseenid.
Input/Output/Send/Returni stseenikirjutust, expression'it ja suvalist routing'ut
see laiendus ei lisa. Uue ploki aktiveerimiseks küsi samas kirjelduses selle
kanalimall; ainult stseenis puuduvast plokist rääkimine seda ei lisa.

Valmis `examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json` ühendab senised
Amp/Cab/Drive/Delay/Reverb juhid ning rütmi Scene2 ja soolo Scene6.
Alus on kasutaja puhas kahe rea `JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`.
Kõik 12 804 kehabaidi kattuvad selle seadmeekspordiga täpselt: säilivad
sobivaks tunnistatud tasakaal, Amp B Level -3dB ja Amp C Level -8dB,
stseenid ning Send/Return-paigutus. Need dB-d on Ampi parameetrid, mitte
OUTPUT1 mõõdiku näidud. Lisaplokke ei lisandu. Uue faili nimi on
`JB NEWLOOK RHYTHM SOLO`; uue nimega faili pole eraldi seadmesse imporditud.
**Ära küsi selle muutmata sisu kordusimporti/tagasieksporti.** Näidise SYX,
TXT ja kontrollraport on samas examples-kaustas. `knownDeviceBody` näitab
täielikku kattuvust kinnitatud alusfailiga, mitte uut helilist/CPU-hinnangut.

Loe `../../docs/FM3_COMPOSER_SCENES.md` ja ühise koostaja/NewLooki juhendeid.
Korratav kontroll `scripts/test-composer-scenes.mjs`, tulemused
`../../docs/FM3_COMPOSER_SCENE_TESTS.json`: kõik 8 stseeni seitsmel alusel,
osamuudatuste eraldatus, uue ploki aktiveerimine ja 40 vigast sisendit.
Uue liidesega taastuvad täpselt ka varasem tasakaalustatud Bonamassa ning
kinnitatud NewLooki Chorus- ja Pitch-katse. Uued stseeniplaanid ei saa sellest
automaatselt seadme-, kuulamis- ega CPU-kinnitust.

Edasised laiendused vali konkreetse soundi vajaduse järgi. Ära alusta
samade katsete kordamist ega uusi mõõtmisi ilma puuduva tõendita. Varasemad
kitsad stseeniväljad ja `addedBlockScenes` jäävad tagasiühilduvaks, kuid
allpool leiduvad väited, et stseenijuhtimine piirdub nendega, on asendatud.

## NewLooki Pitchi koostajakatse seadmering kinnitatud — 0.50.3, 2026-10-08

Kasutaja `examples/FM3_NEWLOOK_PITCH_TEST_export.syx` kattub loodud
`FM3_NEWLOOK_PITCH_TEST.syx` failiga kõigi13 762 kehabaidi osas täpselt,
ilma normaliseerimiseta. Kasutaja soovitud pooleli jäänud Pitchi koostajakatse
on lõpetatud. Ära küsi selle faili kordusimporti/tagasieksporti ega suuna tagasi
asendatud `FM3_COMPOSER_PITCH_TEST` faili juurde.

Üks kirjeldus koostab Amp/Cabi, Drive'i, Delay, Reverbi ja lisatava Pitchi.
Pitch rida3/veerg2 (Returni järel), B Virtual Capo, C Dual Detune. Scene2 B,
Scene6 C, teised A; Pitch kõigis stseenides bypass'is. Kõik456 Pitchi
parameetrisõna, kaks rida ja routing, Send/Return, teiste plokkide kõik kanalid,
stseenid, modifierid ja süsteemiandmed ning preseti nimi ja valitud Scene2
säilivad. Ainult Pitchi kirje eemaldamine ja ühe shundi ID taastamine annab ka
seadmeekspordist täpselt kasutaja NewLooki kogu12 804-baidise algkeha.
Seega senised soundiseaded ja Amp B -3dB / Amp C -8dB on säilinud.

Generaator taastab esitatud SYX-i baitidentselt. Tihendatud esitus erineb,
mõlema pikkus4525; päised erinevad ainult CRC-s. Kaadrid, CRC, footer,
kodeeritud pikkused ja nulltäide läbivad. Ekspordi SHA-256:
`d8ab1f7915e6d06990692b78b8a29b76035ed9216f528891ae88b864b653e437`.
Tõend `../../docs/FM3_NEWLOOK_PITCH_HARDWARE_ROUNDTRIP.json`, korratav kontroll
`scripts/test-composer-newlook-pitch-hardware.mjs`.

See kinnitab kuue perekonna koostamise ja automaatse Pitchi-lisamise seda
näidist. Lisaks on eraldi kinnitatud NewLooki Choruse-lisamise näidis; ülejäänud
perekondade/koosluste failitaseme teste ei nimetata automaatselt seadmeringideks.
Pitch oli bypass'is; uut kuulamishinnangut, efekti aktiivset heli ega CPU-näitu
ei antud. Rütmi/soolo varasem tasakaalukinnitus säilib eraldi.

Edasi lähtu konkreetsest soundist ning kasuta puhast `jb-newlook` alust.
Ära lisa test-Pitchi/Chorust vaikimisi ega alusta uut tüübi-/tasemekogumist
või järjestikuseid impordikatseid ilma konkreetse vajaduseta. Uusi parameetreid,
stseenivälju või signaaliahela muudatusi lisa järgmise muusikalise ülesande
ja olemasolevate tõendite järgi. See jaotis asendab allpool0.50.2 selle katse
OOTEL-staatuse ning impordi/ekspordi juhise. Koostaja funktsionaalsus ei muutu.


## Kasutaja jätkab Pitchi koostajakatsega — 0.50.2, 2026-10-08

Pärast Choruse-lisamise kinnitust küsis kasutaja: „Kas nüüd jätkame pooleli
jäänud Pich testist?” Jätkame seda tema valikul uue kahe rea NewLook-alusega.
Praegune fail on `examples/FM3_NEWLOOK_PITCH_TEST.syx` koos TXT/spec/raportiga;
see asendab järgmise katse rollis vana `FM3_COMPOSER_PITCH_TEST` faili.

Üks kirjeldus ühendab Ampi senised Gain/Bass/EQ/Level juhid, Cab B Rumble,
Drive B T808 mõõdetud juhid, Delay A senised aja/mixi/tagasiside väärtused,
Reverb D Medium Roomi ja senised Scene6 väljad ning Pitch B Virtual Capo /
C Dual Detune. Kasutaja eemaldatud Compressor/Chorus/Phaser/Wah ei lisandu.
Ainus uus plokk on Pitch rida3/veerg2, kohe Returni järel. Scene2 valib B,
Scene6 C, kõik teised A; Pitch on kõigis stseenides bypass'is. See on
koostamise ja impordi kontroll, mitte uus Pitchiga muusikaline sound.

Kontroll: eemaldades väljundist ainult uue958-baidise Pitchi kirje ja taastades
ühe shundi ID, saadakse täpselt kasutaja NewLooki kõik12 804 kehabaidi.
Seega kõik olemasolevad seaded, tasemed, stseenid, Send/Return, modifierid ja
süsteemiandmed säilivad. B/C kumbki114 parameetrisõna kattub kogutud malliga.
Väljundkeha13 762 baiti. Raport `../../docs/FM3_NEWLOOK_PITCH_TEST_CHECKS.json`.
SYX SHA-256 `7cd158293247cc80083f316eb4916b31d37563f150d92a2dc257370bf4b0c3a2`.

Kasutaja impordib tööpuhvrisse ja kontrollib, et Pitch on alumisel real kohe
Returni järel ning bypass'is. Ekspordib parameetreid/kanalivalikuid muutmata,
valitud Scene2-ga `FM3_NEWLOOK_PITCH_TEST_export.syx`. Ära palu Pitchi kanaleid
läbi klõpsida ega expression'it liigutada. Võrdle seejärel kogu keha ilma
normaliseerimiseta. Selle konkreetse uue kombinatsiooni seadmering OOTEL.
Varasem Pitchi tüübikogumine ja ABCD-katse ning NewLooki Choruse-lisamise
kinnitus jäävad eraldi kehtima; neid ei korrata. Koostaja kood ei muutu.


## NewLooki automaatse Choruse-lisamise seadmering kinnitatud — 0.50.1, 2026-10-08

Kasutaja `examples/FM3_NEWLOOK_INSERT_TEST_export.syx` kattub meie loodud
`FM3_NEWLOOK_INSERT_TEST.syx` failiga kõigi13 106 kehabaidi osas täpselt,
ilma normaliseerimiseta. Automaatse Choruse-lisamise katse import/tagasieksport
on lõpetatud. Ära küsi selle faili kordusimporti, eksporti ega sama katset uuesti.

Chorus asub rida3/veerg3, kõik A–D kanalid säilivad (128 parameetrisõna),
Scene6 valib B4-Voice Analog, kõigis stseenides on Chorus bypass'is. Kahe rea
routing, Send/Returni tervikkirjed, ülejäänud plokid, kõik stseenikanalid/bypass,
modifierid ja süsteemiandmed, preseti nimi ning valitud Scene2 säilivad.
Amp B Level -3dB ja Amp C -8dB ei muutunud. Kaadrid, CRC, footer, pikkused ja
nulltäide läbivad. Tihendatud esitus erineb; mõlema pikkus4337, päistes erineb
ainult CRC. Generaator taastab esitatud SYX-i baitidentselt.

Ekspordi SHA-256:
`c258a4b6952687acc693a400b2a2d0310db6301d2daae01b363077034d28c381`.
Tõend `../../docs/FM3_NEWLOOK_HARDWARE_ROUNDTRIP.json`, regressioon
`scripts/test-composer-newlook-hardware.mjs`. See kinnitab seda üht
Choruse lisamise näidist; teiste lisaplokkide/koosluste seniseid failiteste ei
nimetata automaatselt seadmekatseteks. Chorus oli bypass'is, uut kuulamishinnangut
ja selle faili CPU-näitu ei antud. Varasem rütmi/soolo tasakaalu kinnitus säilib.

Jätka tervikliku presetikoostajaga kasutaja eelistatud puhtal kahe rea
`jb-newlook` alusel. Ära võta bypass'is test-Chorusega faili vaikimisi
muusikaliseks aluseks ega lisa efekte ilma soundi vajaduseta. Uus seadmekatse
lähtub konkreetsest järgmisest soundist või uuest kirjutusvõimalusest;
varasemat Pitchi tehnilist katset ega uut tüübikogumist ei nõuta automaatselt.
See jaotis asendab allpool0.50.0 selle täpse katse OOTEL-staatuse ja järgmise
impordi/ekspordi nõude. Koostaja funktsionaalsus selles paranduses ei muutu.


## Kasutaja kahe rea paigutus ja vajaduspõhised plokid — 0.50.0, 2026-10-08

Edaspidi eelista kasutaja `examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`
alust (`jb-newlook`). Loe [NewLook-juhendit](../../docs/FM3_COMPOSER_NEWLOOK.md)
ja seejärel ühise koostaja juhendit. Tegelikud gridiread2/3: In1 → Drive →
Amp → Cab → Send; Return → Delay → Reverb → Out1. Muud kohad jäävad
ühendavateks shuntideks, read1/4 tühjaks. Kasutaja soov on jätta nähtavale
vajalikud plokid ja lisada efekte ainult soundi vajaduse järgi.

SYX on kasutaja FM3 firmware13 eksport, SHA-256
`afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c`.
Viis säilinud efektiplokki ning Input/Output kattuvad eelmise kinnitatud
alusega kõigi kanali- ja stseenibaitide osas. Amp B -3dB ja Amp C -8dB
säilivad. Eemaldatud on Compressor/Wah/Phaser/Chorus/Flanger; varasema Wah
modifieri allikas on kasutaja ekspordis välja lülitatud. Ära taasta eemaldatud
plokke või expression-seost lihtsalt seetõttu, et need olid vanas aluses.
Pildil Scene2 CPU44.6%; see on üks hetkenäit, mitte kõigi stseenide või uue
laienduse CPU-kinnitus. Heli pole uue paigutuse järel eraldi hinnatud.

Üks `jb-composer` kirjeldus töötab nüüd seitsmel alusel. NewLooki puhul
lisatakse küsitud toetatud perekond fikseeritud vabasse shundikohta koos
kinnitatud doonori terve plokikirjega; siis rakenduvad küsitud kanalid,
parameetrid ja stseenid. Kohti ning piiranguid vaata juhendist. Küsitud
Compressor, Wah, Phaser, Pitch, Chorus, Flanger, Rotary ja Tremolo võivad
koos esineda. Puuduvat Filter/PEQ kirjutust, suvalist ahelat ega automaatset
plokieemaldust ei väideta. Vanade aluste routing ja piirangud säilivad.

Uued plokid algavad kõigis stseenides A/bypass; ära kopeeri doonori aktiivseid
stseene. `addedBlockScenes` määrab ainult äsja lisatud plokkide kanali ja
bypass'i ning nõuab samas kirjelduses küsitud kanalimalli. Soundi jaoks
aktiveeri efekt soovitud stseenides selgesõnaliselt selle välja kaudu.
Tüübivalik üksi ei lülita efekti sisse. Olemasolevate plokkide jaoks säilivad
senised stseeniväljad; eemaldatud Phaseri Scene6 bypass-väli üksi ei lisa plokki.

10 sõltumatut kogu keha lisamiskatset (sh kõik8 koos), vana→NewLook täpne
rekonstruktsioon, muutmata NewLooki kogu keha säilimine,13 vigast sisendit
ja vanad koostajatestid läbivad. Genereeritud lisapaigutuse riistvararing on
OOTEL; ära nimeta automaatset plokilisamist veel FM3-l kinnitatuks.
Raportid `FM3_NEWLOOK_SOURCE_AUDIT.json` ja `FM3_NEWLOOK_TESTS.json`.

Järgmine sihitud katse on `examples/FM3_NEWLOOK_INSERT_TEST.syx` koos TXT,
speci ja raportiga. Ainult Chorus lisatakse rida3/veerg3; B4-Voice Analog,
Scene6 valib B, kuid Chorus jääb kõigis stseenides bypass'i. See on ploki
lisamise tehniline katse, mitte uus Bonamassa efektisoov. Impordi tööpuhvrisse
ja ekspordi muutmata seadetega ning valitud Scene2-ga
`FM3_NEWLOOK_INSERT_TEST_export.syx`; võrdle kogu13 106-baidist keha.
Varasem Pitchi koostaja katse on ootel ja madalama prioriteediga. Ära nõua
seda enne NewLooki katset ega küsi kasutajalt uuesti tüübi- või tasemekogumist.
See jaotis asendab allpool0.49.0 eelistatud aluse, automaatse lisamise puudumise
ja järgmise seadmekatse juhised; varasemad tõendid jäävad ajalooliselt kehtima.


## Kogutud võimaluste ühine koostaja — 0.49.0, 2026-10-08

Kasutaja jätkueesmärk on olemasolevate võimaluste KOOSKASUTUS. Koostaja
on nüüd laiendatud kõigile senistele plokiperekondadele. Loe enne koostamist
[ühise koostaja ajakohast juhendit](../../docs/FM3_COMPOSER_UNIFIED.md).
Kasuta üht `baseProfile:"jb-composer"` kirjeldust; ära suuna mitme ploki
soovi enam eraldi generaatorite katsete jadaks. Kõik senised eraldi
profiilid ja nende sisendipiirangud jäävad tagasiühilduvaks.

Samas kirjelduses: Amp/Cab B, Drive/Delay/Reverb A–D ning nüüd ka
`compressorChannels`, `chorusChannels`, `flangerChannels`, `phaserChannels`,
`wahChannels`, `tremoloChannels`, `pitchChannels` ja `rotaryA`.
Tüübimallid, senised skalaarjuhid ning olemasolevad stseeniväljad on
ühendatavad. Uusi skalaarvahemikke ega üldist stseenide/bypass'i kirjutust
ei lisatud. Nimed, arvu- ja tüübipiirid saab käsuga
`node scripts/fm3-generate.mjs --capabilities [BASE.syx]`; loend ka
`../../docs/FM3_COMPOSER_CAPABILITIES.json`.

Kuus räsi järgi lubatud alust nelja plokipaigutusega: algne JB,
tasakaalustatud JB genereeritud fail ja selle kinnitatud eksport,
Tremolo/Rotary/Pitchi kinnitatud seadmeekspordid. Bonamassa edasiseks
muutmiseks eelista `examples/JB_RHYTHM_LEVEL_MINUS3_export.syx`, mis
säilitab kasutaja heaks kiidetud tasemed. Kõigil alustel on Amp/Cab,
Drive, Delay, Reverb, Compressor, Chorus, Phaser ja Wah; lisaks vastavalt
Flanger, Tremolo, Rotary või Pitch. Puuduv plokk annab selge vea.
Uusi plokke ega routing'ut ei lisata; nende nelja lisaploki samaaegset
kooskasutust ei toetata. Tehnilisi alternatiivaluseid ei esitata
tasakaalustatud Bonamassa soundidena.

Komponentide tõendid ja vana kirjutustoe piirangud säilivad. Koostaja
kasutab õigeid alusspetsiifilisi asukohti; teise aluse offset'e ei kopeerita
pimesi. Ainult küsitud kanalid/parameetrid kanduvad doonorist üle.
TXT ja raport näitavad kõiki stseene, tegelikke kanalikasutajaid ja
stseene, kus efekt on sees. Tüübi määramine ei aktiveeri efekti ega
määra stseenile kanalit. Eksportimisjuhendi nimi lähtub loodud presetist.

Offline testid: kuue aluse kogu keha võrdlus sõltumatu oodatud sisuga,
188 kanali ülekannet, 18 isoleeritud parameetri/stseenijuhtu, 30 uute
plokkide kombinatsiooni ja 94 vigase sisendi tõrjet. Senised31 koostaja
kombinatsiooni ja põhigeneraatori4 tervikfaili/8 ekspordikeha läbivad.
Lisaks kontrolliti viit algset Amp-malli kõigil kuuel alusel (30 juhtu):
need lahendatakse õigest algsest Amp-doonorist, mitte JB muudetud kanalitest.
Kinnitatud Bonamassa SYX taastub baitidentselt. Raport
`../../docs/FM3_COMPOSER_INTEGRATION_TESTS.json`. Täielikku JSON Schema
validaatorit polnud; skeemi struktuur/väljad ja käitusaja kontrollid läbivad.

Järgmine sihitud seadmekatse on `examples/FM3_COMPOSER_PITCH_TEST.syx`
koos TXT/spec/raportiga. Üks fail ühendab10 plokki Pitchi nihkunud
plokiasukohtadega alusel. Muutus169 kehabaidis; SHA-256
`ffaa49e4143bba873055cbb6f32b1058be3403f3d801905dea2058b6ba9f2073`.
Kasutaja impordib tööpuhvrisse ning ekspordib muutmata seadetega ja valitud
Scene2-ga `FM3_COMPOSER_PITCH_TEST_export.syx`. Ära palu kanaleid läbi
klõpsida ega expression'it liigutada. Võrdle kogu14 870-baidist keha.
See uus kooslus on failitasemel kontrollitud; seadmering ja heli OOTEL.
Varasema tasakaalustatud Bonamassa kinnitus säilib eraldi. Uusi
tüübikogumisi ega vana Bonamassa korduskatset ei nõuta.
See jaotis asendab vanema koostaja ühe aluse ja kolme efektiperekonna
piirangu; teiste eraldi generaatorite ajaloolisi lubatud aluseid ei muudetud.


## Ühise preseti tasakaal ja seadmering kinnitatud — 0.48.5, 2026-10-08

Pärast viimast +1dB katset kinnitas kasutaja „Nüüd sobib”. Rütmi Scene2
ja soolo Scene6 tasakaal on tema praeguses seadistuses kuulamisega
heaks kiidetud. Lõplikku OUTPUT 1 Left/Right numbrilist näitu ei antud;
ära tuleta seda varasematest näitudest ega Amp Levelist.

Kasutaja `examples/JB_RHYTHM_LEVEL_MINUS3_export.syx` kattub loodud
`JB_RHYTHM_LEVEL_MINUS3.syx` failiga kõigi14 222 kehabaidi osas täpselt.
Amp B Level -3dB (raw50461), Scene6 seaded, routing, kõik kanalid/bypass,
preseti nimi JB RHYTHM LEVEL -3 ja valitud Scene2 säilisid.
Amp576, Cab424, Drive176, Delay356, Reverb284 ja Phaser140 sõna kattuvad
kõigil neljal kanalil. Kaadrid, CRC, footer ja nulltäide läbivad.
Täisfailide erinevus on tihendatud esituses ja CRC-s; muud päisebaidid
säilivad. Mõlema tihendatud pikkus4924. Generaator taastab lähte-SYX-i
baitidentselt. Tagasiekspordi SHA-256:
`a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3`.
Raport `../../docs/FM3_JB_RHYTHM_LEVEL_MINUS3_HARDWARE_ROUNDTRIP.json`.

Ühise Bonamassa preseti import/tagasieksport ja kasutaja tasakaaluhinnang
on lõpetatud. Ära küsi sama importi, eksporti ega tasememõõtmist uuesti.
See jaotis asendab allpool0.48.4 selle faili ootel ja tingimusliku hinnangu
staatuse. Kinnitus puudutab seda näidist; ei laiene kõigile kombinatsioonidele.
Delay/Reverbi eraldi sobivushinnang, sõltumatu võrdlus loo salvestusega
ning CPU-näit puuduvad. Generaatori piirangud ja kood ei muutu.
Edasine parameetri- või efektitugi lähtub järgmisest konkreetsest
muusikalisest soovist. Filteri kogumist ei alustata automaatselt.


## Rütmi viimane +1 dB peenhäälestus — 0.48.4, 2026-10-08

Kasutaja teatas pärast Amp B -4dB katset: Scene2 OUTPUT 1 Left/Right
ligikaudu -3dB; veel1dB tõstejärel oleks tema hinnangul sobiv. See on
tingimuslik sobivushinnang, mitte uue faili kuulamise kinnitus. Scene6
uut näitu ei antud; varasem oli +2 kuni +3dB. Mõõdikunäite ja Amp Leveli
ei tohi samastada. Varasemaid katseid ega nende eksporte ei korrata.

`examples/JB_RHYTHM_LEVEL_MINUS3.syx` (+TXT/spec/validation) seab Amp B
Leveli -4 -> -3dB: veel +1dB, kokku +15dB algsest -18dB väärtusest.
Ainult Scene2 kasutab Amp B-d. Scene6 ja kõik muud heliparameetrid säilivad.
Võrreldes eelmise failiga muutuvad keha baidid4946/4947, raw49806 ->50461;
ülejäänud14 220 kehabaidi säilivad. Kaadrid, CRC, footer ja nulltäide
läbivad; päises muutuvad nimi, CRC ja tihendatud pikkus4926 ->4924.
Raport `../../docs/FM3_JB_RHYTHM_LEVEL_MINUS3.json`.
SYX SHA-256 `7df04a541f45ef0d73e08de3583f0cd8a34f061392a28aa6691875689563b902`.

Järgmine samm: kasutaja impordib ja kuulab +1dB parandust. Kui sobib,
valib Scene2 ning saadab terve `JB_RHYTHM_LEVEL_MINUS3_export.syx`.
Võrdle siis kogu keha ja päiseid täpselt. Uue faili seadmering ja
kuulamise kinnitus on OOTEL; Delay/Reverbi sobivus ja CPU hindamata.
See jaotis asendab0.48.3 järgmise sammu ja katse kuulamise ootel staatuse.
Generaatori kood, kirjutusulatus ja lähtealused jäävad samaks.


## Rütmi teine tasemekatse, Amp B -4 dB — 0.48.3, 2026-10-08

Kasutaja täpsustas pärast +6dB katset: mõõdik on OUTPUT 1 Left/Right;
Scene2 ligikaudu -13dB, Scene6 ligikaudu +2 kuni +3dB. Viimane sõnum
parandas Scene2 näidu selgesõnaliselt negatiivseks. Need on mõõdikunäidud,
mitte Amp Level ega automaatselt dBFS. Mõlema mõõdiku eraldi näite pole.
Kasutaja soovib Scene2 veel umbes8dB tõsta ja soolo seniseks jätta.
Eelmise katse kasutamine ja mõõdikuhinnang on nüüd kasutaja kinnitatud;
selle täpset binaarset tagasieksporti pole saadetud. Lõplik tasakaal,
Delay/Reverbi sobivus ja CPU jäävad hindamata.

Uus `examples/JB_RHYTHM_LEVEL_MINUS4.syx` (+TXT/spec/validation):
Amp B Level -12 -> -4dB ehk +8dB võrreldes eelmise katsega, kokku +14dB
algsest -18dB väärtusest. Presetinimi JB RHYTHM LEVEL -4.
Kanalit B kasutab ainult Scene2. Amp C ja Scene6 jäävad seniseks.
Võrreldes +6dB failiga muutuvad ainult keha baidid4946/4947, raw44563 ->
49806; ülejäänud14 220 kehabaidi säilivad. Kaadrid, CRC ja footer läbivad.
Päises muutuvad nimi, CRC ja tihendatud pikkus4924 ->4926; lahtipakitud
pikkus14 222 ning nulltäide on kontrollitud. Need pikkusebaidid pole
heliparameetrid. Raport `../../docs/FM3_JB_RHYTHM_LEVEL_MINUS4.json`.
SYX SHA-256 `c17103edba82c66476a592efa13279c0d5843cb6aeac8b95bdddeebe6a0b89de`.

See on kasutaja soovitud järgmine kuulamiskatse; selle seadmering ja
kuulamine on OOTEL. Ära kinnita lõplikku väljundnäitu ega tasakaalu
seadistusväärtuste järgi. Järgmine samm: sama fraas ja mängutugevus,
Scene2/6 OUTPUT 1 Left/Right näidud ning kuuldava tasakaalu hinnang.
Sobiva tasakaalu korral vali Scene2 ja küsi terve eksport
`JB_RHYTHM_LEVEL_MINUS4_export.syx`. Vahepealset eksporti ega uut
parameetrikogumist pole vaja. Generaatori kood ja toetatud ulatus säilivad.
See jaotis asendab allpool0.48.2 teadmata mõõdiku/Scene6 näidu ning
esimese katse kuulamise ootel staatuse; vanemad jaotised on ajalugu.


## Kuulamistagasiside ja rütmi +6 dB katse — 0.48.2, 2026-10-08

Kasutaja teatas: Scene2 on Scene6 ja teiste stseenidega võrreldes liiga
vaikne; mõõdikul ligikaudu -19dB. Soolo peab olema ainult veidi valjem,
praegune vahe on liiga suur. Scene6 mõõdikunäit ja mõõdiku täpne
liik/asukoht pole teada. -19dB on kasutaja mõõdikunäit, mitte Amp Level.
Delay/Reverbi sobivuse hinnangut ei antud. See asendab varasema märkuse,
et kuulamistagasiside täielikult puudub; helitasakaal EI OLE kinnitatud.

Kontrollitud ekspordis Amp B Level -18dB (raw40631), Amp C -8dB.
Amp B-d kasutab ainult Scene2; Amp C-d Scene3/6/7. Seadistusväärtuste
10dB erinevus ei tõenda väljundmõõdiku 10dB erinevust.
Olemasoleva `jb-composer` toega loodud esimene tasakaalukatse:
`examples/JB_RHYTHM_LEVEL_PLUS6.syx` (+TXT/spec/validation).
Ainult `levelB` muutus -18 -> -12dB ehk +6dB, raw44563.
Võrreldes kasutaja kinnitatud ekspordiga muutusid keha baidid4946/4947;
ülejäänud 14 220 kehabaidi, sealhulgas Scene6, säilisid. Presetinimi on
JB RHYTHM LEVEL +6. Kaadrid, CRC ja footer korras.
SHA-256 `2035c0da1c8d04cc39d8d4b7e7308d7efcbce9d642047cc636f0c4bf154c5b2e`.
Raport `../../docs/FM3_JB_RHYTHM_LEVEL_PLUS6.json`.

See on esialgne +6dB kuulamiskatse, mitte mõõtmistest arvutatud lõplik
lahendus. Uue näidise import/tagasieksport ja kuulamine OOTEL.
Järgmine kasutajasamm: võrdle sama fraasi sama mängutugevusega Scene2/6,
anna mõlema näit samal mõõdikul ning kuuldav vahe. Ära oleta mõõdiku
-13dB lõpptulemust, 4dB väljundivahet ega kinnita helitasakaalu ainult
Level väärtuste põhjal. Kui tasakaal sobib, küsi terve eksport
`JB_RHYTHM_LEVEL_PLUS6_export.syx` pärast Scene2 valimist. Iga vahepealne
Level muutus ei vaja uut kogumist. Generaatorit, lähtealuste loendit
ja kirjutustoe ulatust selles versioonis ei muudetud.


## Ühise Bonamassa näidise seadmering kinnitatud — 0.48.1, 2026-10-08

Kasutaja `examples/JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx` kattub loodud
katsega kõigi 14 222 lahtipakitud kehabaidi osas normaliseerimiseta.
Amp 576, Cab 424, Drive 176, Delay 356, Reverb 284 ja Phaser 140 sõna
säilisid kõigil neljal kanalil. Routing, kõik stseenide kanalivalikud ja
bypass, presetinimi JB UNIFIED R-S TEST ning valitud Scene2 säilisid.
Kaadrikontrollsummad, CRC ja footer kehtivad. Tervikfailide erinevus
tuleneb 4924-baidise tihendatud esituse ja CRC erinevusest; lõputäide
on mõlemas nullidega. Toorpäises muutusid ainult CRC baidid4/5.
Tagasiekspordi SHA-256
`0838937628b863e253c64c170ab96ae2bde6d3c0f9d4d3083382e4967ce5fc68`.

Raport `../../docs/FM3_JB_COMPOSER_HARDWARE_ROUNDTRIP.json` ja regressioon
`scripts/test-jb-composer-hardware.mjs`. Praegune generaator taastab
imporditud lähtefaili baitidentselt. See kinnitab ühe mitme ploki
kombinatsiooni importi/tagasieksporti; ei kinnita kõiki üldkombinatsioone.
Toetatud aluseid, parameetrivahemikke ja kanaleid ei laiendatud.
Allpool0.48.0 selle näidise seadmeimpordi OOTEL staatus on nüüd täidetud.
Sama eksporti või importi ei korrata.

Kuulamishinnangut kasutaja veel ei andnud. Järgmine samm on rütmi/soolo
tajutava taseme ja Delay/Reverbi sobivuse hinnang; vajaduse järgi vali
järgmine sihitud parameetrilaiendus. Heli, tasakaalu ega CPU-d ei loeta
failivõrdluse põhjal kinnitatuks. Filter ei muutu automaatselt järgmiseks.


## Ühine Bonamassa koostaja — 0.48.0, 2026-10-08

Jätkuplaan muutus: enne Filteri kogumist ühendame olemasoleva Amp/Cab,
Drive, Delay, Reverbi ja rütmi/soolostseeni toe. See samm on nüüd teostatud.
Loe [ühise koostaja juhendit](../../docs/FM3_JB_COMPOSER.md) enne selle
kasutamist; profiil `jb-composer` töötab ühise `scripts/fm3-generate.mjs`
kaudu. Üks kirjeldus loob SYX/TXT/raporti ainult algsest
`examples/JB_YDOM_RHYTHM.syx` failist. Mallid → mõõdetud parameetrid →
olemasolevad stseenivalikud; määramata baidid ja routing säilivad.
Amp/Cab B, Drive/Delay/Reverb A–D mallid ning senised stseeniväljad on
ühendatavad. Delay A scalar-toe tüüp on ainult Deluxe Mind Guy ID14;
Reverb A-l Room: Large Room ID2. Drive piirangud jäävad tüüp/kanal/väärtus
põhiseks. Toetamata valikud annavad vea. Ära eelda Amp C scalar-toe,
soolotõste, uue routing'u või modifierite kirjutust. Täpne ulatus on juhendis.

Varasem JB rütmi/soolofail taastub baitidentselt; ka selle kinnitatud
seadmeekspordi kõik 14 222 kehabaidi kattuvad. Uue koostaja offline testid:
31 komponentide kombinatsiooni, 16 üksikjuhti, 3 mall+juht juhtumit,
Cab päiseotsingu konflikt, 37 vigase sisendi/aluse tõrjet.
Raport `../../docs/FM3_JB_COMPOSER_TESTS.json`. Senise põhigeneraatori
4 näidisfaili jäid baitidentsed ning 8 sõltumatut Gain/Bass võrdlust läbivad.

UUS katse `examples/JB_UNIFIED_RHYTHM_SOLO_TEST.syx` koos TXT/spec/raportiga.
SHA-256 `19953730a62fb5a5c59f7069d99320030457e9ea4f200d5800e70eb457b2d6a3`.
Rütmi Scene2 Amp B Brit Silver ja Cab B Rumble EV12L säilivad täpselt.
Scene6 JB SOLO: säilinud Amp C, Drive B T808 OD 2/7/2/25%, Delay A
400 ms (kodeeritud ligikaudu399.91), Feedback25%, Mix15%, TempoNONE,
Reverb D Medium Roomi kogutud mall, Phaser bypass. Uue kombinatsiooni
seadmeimport, heli, tasemed ja CPU on OOTEL; varasema näidise kinnitus
sellele ei laiene. Täiendavat soolotõstet ei lisatud.

Järgmine kasutajasamm: kontrollimport tööpuhvrisse, Scene2/6 kontroll ja
kuulamine, tagasi Scene2 ning terve eksport
`JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx`. Võrdle kogu keha ja päised,
raporteeri stseenivaliku või muu erinevus eraldi. Ära küsi tehtud Pitchi
või teiste plokkide kogumist uuesti. Pärast ühist seadmeringi järgivad
vajalikud parameetrid kuulamisvajadust; Filter on järgmine hilisem etapp.
See jaotis asendab allpool oleva Filteri automaatse alustamise juhise.


## Pitch A–D seadmering kinnitatud — 0.47.1, 2026-10-07

Kasutaja `examples/FM3_PITCH_ABCD_TEST_export.syx` kattub loodud testiga
kõigi 14 870 lahtipakitud body-baidi osas normaliseerimiseta. Kõik 456 Pitchi
sõna säilisid: A Advanced Whammy ID9, B Virtual Capo ID14,
C Crystal Echoes ID8, D Dual Detune ID0. Routing, stseenid (kõik A),
bypass ja teiste plokkide parameetrid säilisid täpselt.
Kaadrikontrollsummad, CRC ja footer kehtivad. Sisemine nimi
FM3_ROTARY_A_TEST_export säilis. Failide erinevus tuleneb tihendatud
esitusest ja CRC-st. Tagasiekspordi SHA-256:
`1b7ffc02a8e56749677a24fc55b192b0cb414dc960c3af408c17e3d78fc918a8`.
Raport `../../docs/FM3_PITCH_HARDWARE_ROUNDTRIP.json`.
See kinnitab ühe A–D näidise seadmeringi; kõik 64 tüübi/kanali kombinatsiooni
on kontrollitud offline. Heli/CPU hindamata. Generaatori piirangud ja
lubatud baasfailid ei muutu. See jaotis asendab selle näidise seadmeimpordi
OOTEL staatuse. Kogumist ega kontrollimporti ei korrata.
Järgmine kavandatud plokk: Filter. Kasutaja asendab Pitchi Filteriga,
saadab Type-loendi pildi ja terve preseti FM3_FILTER_BASELINE.syx.


## Pitch täiskanalimallide generaator — 0.47.0, 2026-10-07

Ühise generaatori profiil `jb-pitch-multi` toetab kõiki16 kogutud tüüpi
kanalitel A–D. Spec: `schemaVersion:1`, `firmware:13`,
`baseProfile:"jb-pitch-multi"`, `pitchChannels:[{channel:"A",type:"Advanced Whammy"}]`.
Lubatud1–4 kordumatut kanalit ja registri täpsed nimed. Kopeeritakse kogu
114-sõnaline mall; üksikparameetrite ülekirjutusi ei toetata.
Rakendus `scripts/fm3-pitch-multi.mjs` kontrollib registri räsi ja iga
kasutatava malli GET/SYX tõendipaari. Lubatud ainult Pitchi baseline ning
viimane kogutud donor (SHA-ga piiratud, body14870). Vana JB alus ei sobi.
Muutuvad ainult küsitud kanaliparameetrid; muud body-baidid, routing,
stseenid, bypass ja päised (v.a CRC) säilivad.

Testid:64 tüübi/kanali kombinatsiooni,5 sõltumatu ekspordi body taastamist
(ainult Pitch stseenikanalid võetakse selgesõnaliselt alusfailist),1 lisabaas,
18 vigase sisendi tõrjet. Üldgeneraatori regressioon läbitud.
Raport `../../docs/FM3_PITCH_GENERATOR_TESTS.json`.
Näidis `examples/FM3_PITCH_ABCD_TEST.syx` ja `.txt`: A Advanced Whammy9,
B Virtual Capo14, C Crystal Echoes8, D Dual Detune0. SHA-256:
`cda3b89a08155c6ede7d2a26d938f1125a74a88357c8f4ce52056dc5cfbb5a01`.
Seadmeimport ja heli OOTEL. Kasutaja vaatab Pitch1 A–D Type-valikuid,
ei muuda seadeid ega liiguta expression-pedaali ning ekspordib terve
preseti `FM3_PITCH_ABCD_TEST_export.syx`. Võrdle456 Pitch-sõna ja kogu body;
kanalite vaatamisest tekkinud stseenimuutused raporteeri eraldi.
See jaotis asendab varasema Pitch generaatori puudumise staatuse.


## Pitch kõik16 tüüpi kogutud — 0.46.2, 2026-10-07

Viis GET/SYX paari kattuvad2280/2280 sõna ulatuses. Kõik16 kasutaja
Type-loendi nime on seotud unikaalsete binaarsete ID-dega0–15.
Advanced Whammy9, Arpeggiator10, Classic Whammy6, Crystal Echoes8,
Custom Shifter11, Dual Chromatic2, Dual Detune0, Dual Detune Delay15,
Dual Diatonic4, Octave Divider7, Quad Chromatic3, Quad Chromatic Delay12,
Quad Detune1, Quad Diatonic5, Quad Diatonic Delay13, Virtual Capo14.
Nimed põhinevad kasutaja pildil ja koguja kinnitatud valikutel.

Register `references/pitch-library.json`, SHA-256
`4817534c8265e22be7ade32ae974278710f0f84357d008742eb09dd4130a4584`.
Tõendid `references/pitch-batch-20261007-153634`, koguja
`scripts/pitch-collector`, raport `../../docs/FM3_PITCH_COLLECTION_VALIDATION.json`.
114 sõna kanali kohta, Type pid0, effectId110. Kasutaja asendas Rotary
Pitchiga: uus body14870 baiti. Header8882, scenes8892–8907,
bypass8908–8923, size8924=114, count8926=4, parameters8928–9839,
stride228. GET f0000174111f6e0065f7; vastusekaadrid12/778/610/8.
Aluse SHA a7ba0f77b53d542902561e051d15256b041e71e652264e319309f9154ba2d1d2.
Algse GET-i donor vastab alusele bait-baidilt. Kontrollsummad, CRC ja
footer kehtivad. Muutused piirduvad Pitch-parameetrite ja stseenikanalitega;
igal sammul nimetamata kanalite parameetrid säilisid.
Kogumine on lõpetatud; ära nõua kordamist. Järgmine etapp: Pitchi
kanalimallide ühendamine SYX/TXT generaatoriga ja kontrollimport.
Pitch generaator, genereeritud preseti seadmering ja heli on veel tegemata.


## Rotary A seadmering kinnitatud — 0.46.1, 2026-10-07

Kasutaja `examples/FM3_ROTARY_A_TEST_export.syx` kattub loodud testiga
kõigi14 126 lahtipakitud body-baidi osas normaliseerimiseta. Kõik84 Rotary
sõna säilisid; A Rate5Hz, Mix25%, Level-6dB, HiDepth50%, LowDepth50%,
TempoNone. B–D, routing, stseenid (kõik A), bypass ja muud plokid säilisid.
Kaadrikontrollsummad, CRC ja footer kehtivad. Sisemine nimi
FM3_ROTARY_BASELINE säilis. Failide erinevus tuleneb tihendatud esitusest
ja CRC-st. Tagasiekspordi SHA-256:
`4eda4d22b89fb843ce47ab011bf01290a2cdbaabb9fe0219038faa5f5f0e7095`.
Raport `../../docs/FM3_ROTARY_HARDWARE_ROUNDTRIP.json`.
See kinnitab ühe Rotary A testpreseti seadmeringi;72 väärtusekombinatsiooni
on kontrollitud offline. Heli/CPU hindamata. Mõõdetud punktide, ainult A
kanali ja lubatud baasfailide piirangud jäävad kehtima. See jaotis asendab
selle näidise seadmeimpordi OOTEL staatuse. Kogumist ega importi ei korrata.
Järgmine kavandatud kogumisplokk on Pitch, seejärel Filter; kasutaja
asendab Rotary Pitchiga ja saadab Type-loendi pildi ning uue täis-SYX aluse.


## Rotary A mõõtepunktide generaator — 0.46.0, 2026-10-07

Ühine generaator toetab profiili `jb-rotary-controls`.
Spec: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-rotary-controls"`,
`rotaryA:{rateHz:5,mixPercent:25,levelDb:-6,hiDepthPercent:50,lowDepthPercent:50}`.
Lubatud vähemalt üks nendest viiest väljast. Rate ainult2/5/6.5Hz;
Mix25/50/75%; Level-6/0dB; Hi/Low Depth25/50%. Ainult kanal A;
B–D muudatused, muud võtmed ja mõõtmata väärtused tõkestatakse.
Puuduvad väljad säilivad alusfailist. Tempo None säilib.

Rakendus `scripts/fm3-rotary-controls.mjs` kasutab räsi järgi kinnitatud
registrit ja GET/SYX tõendeid. Aluseks sobivad ainult Rotary kogumise
baseline/start/donor täisfailid. Muutuvad ainult küsitud A parameetribaidid;
B–D, muud plokid, routing, stseenid, bypass ja päised (v.a CRC) säilivad.
Testid ja piirangud: `../../docs/FM3_ROTARY_GENERATOR_TESTS.json`.
Näidis `examples/FM3_ROTARY_A_TEST.syx` ja `.txt`: A Rate5Hz, Mix25%,
Level-6dB, HiDepth50%, LowDepth50%. See on uus mõõdetud väärtuste kombinatsioon.
Seadmeimport/tagasieksport ja heli OOTEL; kasutaja kontrollib Rotary1 A
väärtused ja ekspordib terve preseti `FM3_ROTARY_A_TEST_export.syx`.
See jaotis asendab varasema Rotary generaatori puudumise staatuse.


## Rotary parameetrite esimene partii kinnitatud — 0.45.2, 2026-10-07

Rotaryl puudub Type-valik; pid0 on Rate, mitte tüüp. Kasutaja asendas
Tremolo Rotaryga. Uue alusfaili body on 14 126 baiti; varasemaid Tremolo/JB
offsete ei tohi sellele pimesi rakendada. EffectId86, 21 sõna kanali kohta,
4 kanalit. Header9822, scenes9832–9847, bypass9848–9863, size9864=21,
count9866=4, parameters9868–10035, stride42. GET f0000174111f56005df7,
vastuse kaadrid12/262/8. Aluse GET/SYX kattub84/84.

Kaheksa juhendatud ühe parameetri katset läbisid GET/SYX kontrolli672/672
sõna ulatuses. Igal sammul muutus ainult üks A parameetrisõna; teiste
kanalite parameetrid ja muu body säilisid, Rotary stseenikanalid on
preflight'is eraldi lubatud ala. Mix ja Level taastusid täpselt.
Kinnitatud A mõõtepunktid (display → raw): Rate pid0:2Hz→13107,
5Hz→32767,6.5Hz→42597; Mix pid5:25%→16384,50%→32767,75%→49151;
Level pid6:-6dB→48495,0dB→52427; Hi Depth pid2 ja Low Depth pid1:
25%→16384,50%→32767. Algväärtuste kuvanimed lähtuvad kasutaja
Rotary ekraanipildist; muudatuste nimed/väärtused koguja ekraanikinnitusest.

Register `references/rotary-controls.json`; algtõendid
`references/rotary-batch-20261007-151451`; koguja `scripts/rotary-collector`;
raport `../../docs/FM3_ROTARY_COLLECTION_VALIDATION.json`.
Koguja kontrollitud algseis on Rate2Hz eksport; kõik8 sammu on lõpetatud,
ära nõua nende kordamist. Järgmine etapp on mõõdetud diskreetsete punktidega
piiratud offline generaatori lisamine ja loodud preseti seadmering.
Rotary generaator, B–D parameetriülekanded, pidevad skaalad ja heli ei ole
veel kinnitatud. Ära üldista mõõtepunkte suvalistele vaheväärtustele.


## Tremolo/Panner A–D seadmeimport kinnitatud — 0.45.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_TREMOLO_ABCD_TEST_export.syx` kattub
loodud testiga kõigi 14 134 lahtipakitud body-baidi osas normaliseerimiseta.
Kõik 88 Tremolo-sõna säilisid: A Bias Trem ID2, B Optical Trem 2 ID5,
C Neon Trem ID6, D Panner ID1. Stseenikanalid A,D,A,A,A,A,A,A,
bypass, routing ja teiste plokkide parameetrid säilisid täpselt.
Kaadrikontrollsummad, CRC ja footer kehtivad. Tervikfailide erinevus tuleneb
tihendatud esitusest ja CRC-st; sisemine nimi FM3_WAH_ABCD_TEST_export säilis.
Tagasiekspordi SHA-256:
`de7dfc12cbcd2ad517f10f13d392f8b859aee75e94286152d14b80fe9d1596f1`.
Raport `../../docs/FM3_TREMOLO_HARDWARE_ROUNDTRIP.json`.
See kinnitab ühe ABCD testpreseti seadmeringi; kõik 28 tüübi/kanali
kombinatsiooni on kontrollitud offline. Heli, tasemeid ja CPU-d pole hinnatud.
See jaotis asendab varasema selle testpreseti impordi ootel staatuse;
generaatori mallivalik ja lubatud alusfailid ei muutu.

## Tremolo/Panner generaator lisatud — 0.45.0, 2026-10-07

Profiil `jb-tremolo-multi` toetab kõiki 7 kogutud tüüpi kanalitel A–D.
Sisend: `schemaVersion: 1`, `firmware: 13`, `baseProfile: "jb-tremolo-multi"`,
`tremoloChannels: [{"channel":"A","type":"Bias Trem"}]`.
Lubatud 1–4 eri kanalit, täpsed registrinimed; kopeeritakse kogu 22-sõnaline
kogutud mall. Üksikparameetrite ülekirjutamist ei toetata.
Rakendus `scripts/fm3-tremolo-multi.mjs` kontrollib registri räsi ja mallide
GET/SYX tõendeid. Lubatud alused on ainult Tremolo kogu esimene ja viimane
donor (Flanger asendatud Tremologa, body 14 134 baiti). Vana JB alus ei sobi.
Muutuvad ainult valitud Tremolo kanaliparameetrid; teised body-baidid,
päised (v.a CRC), routing, stseenid ja bypass säilivad.
Testid: 28 tüübi/kanali kombinatsiooni, 2 sõltumatu ekspordi body taastamist
(ainult Tremolo stseenikanalid võetakse selgesõnaliselt alusfailist),
1 lisabaas, 18 vigase sisendi/alusfaili tõrjet; üldgeneraatori regressioon läbitud.
Raport `../../docs/FM3_TREMOLO_GENERATOR_TESTS.json`.
Test `examples/FM3_TREMOLO_ABCD_TEST.syx`: A Bias Trem ID2,
B Optical Trem 2 ID5, C Neon Trem ID6, D Panner ID1. SHA-256:
`bef7d082b6e79751a8a2f14f92516941965ac6f0b35b1178db3afad4ecd5880c`.
Seadmeimport ja heli OOTEL. Kasutaja impordib FM3-Editis ning ekspordib
terve preseti tagasi. See jaotis asendab varasema generaatori ootel staatuse.

## Tremolo/Panner kõik tüübid kogutud — 0.44.2, 2026-10-07

Kõik 7 tüüpi on kinnitatud kahe GET/SYX paariga (176/176 sõna).
Nimed ja ID-d: Bias Trem 2, Harmonic Trem 3, Neon Trem 6, Optical Trem 1 4,
Optical Trem 2 5, Panner 1, VCA Trem 0. Iga kanalimall 22 sõna;
effectId 106, Type parameterId 0. Register `references/tremolo-library.json`,
SHA-256 `f67ea2bededced0e34dc457cb35b214afa9abe205bc0eadd0192829b9f58ebf7`.
Tõendid `references/tremolo-batch-20261007-143642`, koguja `scripts/tremolo-collector`,
raport `../../docs/FM3_TREMOLO_COLLECTION_VALIDATION.json`.
Kasutaja asendas Flangeri Tremolo/Panneriga: uus baseline on 14 134 body-baiti.
Header 9822, scenes 9832–9847, bypass 9848–9863, size 9864=22,
count 9866=4, parameters 9868–10043, stride 44. Vanu plokioffsete ei tohi
sellele alusfailile rakendada. GET `f0000174111f6a0061f7`, kaadrid 12/274/8.
Esimene tõendipaar säilis bait-baidilt; viimases grupis muutusid ainult
lubatud Tremolo piirkonnad. Kogumine valmis; generaatorisse ühendamine ja
loodud preseti seadmeimport veel tegemata.

## Wah A–D seadmeimport kinnitatud — 0.44.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_WAH_ABCD_TEST_export.syx` kattub
loodud testiga kõigi 14 222 lahtipakitud body-baidi osas normaliseerimiseta.
Kõik 100 Wah-sõna säilisid: A Clyde ID1, B Paragon ID8, C Cry Babe ID2,
D Vx846 ID3. Stseenikanalid A,D,A,A,A,A,A,A, bypass, routing ja teiste
plokkide parameetrid säilisid täpselt. Kaadrikontrollsummad, CRC ja footer
kehtivad. Tervikfailide erinevus tuleneb tihendatud esitusest ja CRC-st;
presetinimi säilis. Tagasiekspordi SHA-256:
`8e5dfddfe0ef6d20032cafd5e697d602b550005041588075d12a21dbf60a633a`.
Raport `../../docs/FM3_WAH_HARDWARE_ROUNDTRIP.json`.
See kinnitab ühe ABCD testpreseti seadmeringi; kõik 36 tüübi/kanali
kombinatsiooni on kontrollitud offline. Heli, tasemeid ja CPU-d pole hinnatud.
See jaotis asendab varasema selle testpreseti impordi ootel staatuse;
generaatori mallivalik ja lubatud alusfailid ei muutu.

## Wah generaator lisatud — 0.44.0, 2026-10-07

Profiil `jb-wah-multi` toetab kõiki 9 kogutud tüüpi kanalitel A–D.
Sisend: `schemaVersion: 1`, `firmware: 13`, `baseProfile: "jb-wah-multi"`,
`wahChannels: [{"channel":"A","type":"Clyde"}]`.
Lubatud on 1–4 eri kanalit ja registri täpsed tüübinimed. Kopeeritakse kogu
25-sõnaline kogutud mall; üksikparameetrite ülekirjutamist ei toetata.
Rakendus `scripts/fm3-wah-multi.mjs` kontrollib registri räsi ja mallide
GET/SYX tõendeid. Lubatud alused: `examples/JB_YDOM_RHYTHM.syx`, Wah kogu
esimene ja viimane donor. Muutuvad ainult valitud Wah-kanalite parameetrid;
muud body-baidid, päised (välja arvatud CRC), stseenid ja bypass säilivad.
Testid: 36 tüübi/kanali kombinatsiooni, 3 sõltumatu seadmeekspordi body
 taastamist (Wah stseenikanalid võetakse selgesõnaliselt alusfailist),
2 lisabaasi ja 17 vigase sisendi tõrjet. Olemasoleva generaatori regressioon
läbitud. Raport `../../docs/FM3_WAH_GENERATOR_TESTS.json`.
Test `examples/FM3_WAH_ABCD_TEST.syx`: A Clyde ID1, B Paragon ID8,
C Cry Babe ID2, D Vx846 ID3. SYX SHA-256:
`16372f21a74abd572be434f9567f4d5559c1b0015c981dcd1b3e03fc9a5a913b`.
Seadmeimport ja heli on OOTEL; kasutaja impordib FM3-Editis ja ekspordib
terve preseti tagasi. Enne eksporti ei muudeta seadeid ega liigutata
expression-pedaali. See jaotis asendab varasema generaatori ootel staatuse.

## Wah' kõik tüübid kogutud — 0.43.2, 2026-10-07

Kõik 9 FM3 firmware 13 Wah-tüüpi on kogutud ja kinnitatud kolme GET/SYX
paariga (300/300 sõna). Iga kanalimall sisaldab 25 sõna; effectId 94,
Type parameterId 0. Nimed põhinevad kasutaja ekraanipildil ja kinnitatud
valikutel: Clyde ID1, Color-Tone ID4, Cry Babe ID2, FAS Wah ID0,
Funk Wah ID5, Mortal ID6, Paragon ID8, Vx845 ID7, Vx846 ID3.
Register `references/wah-library.json`, SHA-256 `7a3c2057784c5737318706b6e47363ce36558483470c4dda3f62eb44ca27cf07`.
Tõendid `references/wah-batch-20261007-140115`; koguja `scripts/wah-collector`;
raport `../../docs/FM3_WAH_COLLECTION_VALIDATION.json`.
Esimese neliku tõendifailid säilisid bait-baidilt. Kontrollsummad ja CRC
kehtivad; lubatud on ainult Wah parameetrite ja Wah stseenikanalite muutused.
Struktuur: header 10132, scenes 10142–10157, bypass 10158–10173,
size 10174=25, count 10176=4, parameetrid 10178–10377, stride 50.
GET `f0000174111f5e0055f7`; vastuse kaadrid 12/310/8 baiti.
Kogumine on valmis. Wah generaatorisse ühendamine ja loodud preseti
seadmeimport on veel tegemata; ära esita neid kinnitatuna.

## Choruse A–D seadmeimport kinnitatud — 0.43.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_CHORUS_ABCD_TEST_export.syx` kattub
loodud testiga kõigi 14 222 lahtipakitud body-baidi osas normaliseerimiseta.
Kõik 128 Choruse sõna säilisid: A 4-Voice Analog ID13, B Mx134 Stereo ID26,
C Japan CE-2 ID4, D Warm Stereo ID5. Stseenikanalid A,D,A,A,C,A,A,C,
bypass, routing ja teiste plokkide parameetrid säilisid täpselt.
Kaadrikontrollsummad, CRC ja footer kehtivad. Tervikfailide erinevus tuleneb
tihendatud esitusest ja kontrollsummadest. Sisemine nimi jäi
FM3_FLANGER_ABCD_TEST_export. Tagasiekspordi SHA-256:
`8ecff27b3da708c0a1f84febab7d6c2059022fec1c01e10a4b383f79718ecb69`.
Raport: `../../docs/FM3_CHORUS_HARDWARE_ROUNDTRIP.json`.
Üleslaaditud failinime topeltpunkt on pakitud tõendifailis ühtlustatud;
faili baidid on muutmata.

See kinnitab ühe ABCD testpreseti seadmeringi; kõik 108 tüübi/kanali
kombinatsiooni on kontrollitud offline. Heli, tasemeid ja CPU-d pole hinnatud.
See jaotis asendab varasema selle testpreseti impordi ootel staatuse;
generaatori mallivalik ja lubatud alusfailid ei muutu.

## Choruse generaator lisatud — 0.43.0, 2026-10-07

Profiil `jb-chorus-multi` toetab kõiki 27 kogutud tüüpi kanalitel A–D.
Sisend: `schemaVersion: 1`, `firmware: 13`, `baseProfile: "jb-chorus-multi"`,
`chorusChannels: [{"channel":"A","type":"4-Voice Analog"}]`.
Lubatud on 1–4 eri kanalit ja registri täpsed tüübinimed. Kopeeritakse kogu
32-sõnaline kogutud mall; üksikparameetrite ülekirjutamist ei toetata.

Rakendus `scripts/fm3-chorus-multi.mjs` kontrollib registri räsi ja kasutatud
mallide GET/SYX tõendeid. Kolm lubatud alust: `examples/JB_YDOM_RHYTHM.syx`,
Choruse kogu esimene donor ning viimase kogumisgrupi donor.
Muutuvad ainult valitud Choruse kanalite parameetrid; muud body-baidid,
päised (välja arvatud CRC), stseenid ja bypass säilivad.
Testid: 108 tüübi/kanali kombinatsiooni, 7 sõltumatu seadmeekspordi body
 taastamist (ainult Choruse stseenikanalid võetakse selgesõnaliselt alusfailist),
2 lisabaasi ja 17 vigase sisendi tõrjet. Raport:
`../../docs/FM3_CHORUS_GENERATOR_TESTS.json`.

Kontrollimport: `examples/FM3_CHORUS_ABCD_TEST.syx` ja samanimeline TXT.
A 4-Voice Analog ID13, B Mx134 Stereo ID26, C Japan CE-2 ID4,
D Warm Stereo ID5. Aluseks on esimene Choruse donor; sisemine nimi säilib.
**Genereeritud Choruse preseti seadmeimport ja helikontroll on veel ootel.**
See jaotis asendab varasema märkuse generaatori puudumise kohta.

## Choruse tüübikogu valmis — 0.42.2, 2026-10-07

Kõik 27 kasutaja valitud Choruse tüüpi on kogutud täielike 32-sõnaliste
kanalimallidena. Seitse täis-SYX/ühekordse GET-i paari kattuvad 896/896
sõna ulatuses; binaarsed Type ID-d katavad 0–26, Type parameeter 0,
ploki ID 78. Ekraani järjekorranumbrid ei ole binaarsed ID-d.
Register: `references/chorus-library.json`; algandmed:
`references/chorus-batch-20261007-134057`; kontrollraport:
`../../docs/FM3_CHORUS_COLLECTION_VALIDATION.json`.

Kontroll hõlmab SYX-kaadreid, kontrollsummasid, CRC-d, footerit, GET-vastuse
struktuuri ja kõiki nelja kanali väärtusi. Võrreldes Choruse seemneekspordiga
piirduvad muutused Choruse parameetrite ja stseenikanalitega; varasemad kaks
kogumispaari säilisid baiditäpselt. Kogumisskript: `scripts/chorus-collector/`.
Choruse seemneekspordis oli võrreldes Flangeri kontrolltagasiekspordiga lisaks
Chorusele muutunud Flangeri teise stseeni kanal A → D; see on uue kogumise
alusfaili osa, mitte hiljem normaliseeritud erinevus.
**Choruse mallid ei ole veel SYX/TXT generaatorisse integreeritud.**
Genereeritud Choruse preseti seadmeimporti ega heli pole kontrollitud.

## Flangeri A–D seadmeimport kinnitatud — 0.42.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_FLANGER_ABCD_TEST_export.syx` kattub
loodud testiga kõigi 14 222 lahtipakitud body-baidi osas normaliseerimiseta.
Kõik 132 Flangeri sõna säilisid: A 80's Rack Flanger ID24, B Vowel Flanger
ID30, C MXF-117 ID8, D Zero Flanger ID6. Stseenikanalid A,A,A,A,B,A,A,A,
bypass, routing ja teiste plokkide parameetrid säilisid täpselt.
Kaadrikontrollsummad, CRC ja footer kehtivad. Tervikfailide erinevus tuleneb
tihendatud esitusest ja kontrollsummadest. Sisemine nimi jäi
FM3_COMPRESSOR_ABCD_TEST_export. Tagasiekspordi SHA-256:
`9a63a591fc3f95232771b95eceb8a322bd0be45ffce006b80543c8c24cedce4c`.
Raport: `../../docs/FM3_FLANGER_HARDWARE_ROUNDTRIP.json`.

See kinnitab ühe ABCD testpreseti seadmeringi; kõik 124 tüübi/kanali
kombinatsiooni on kontrollitud offline. Heli, tasemeid ja CPU-d pole hinnatud.
See jaotis asendab varasema selle testpreseti impordi ootel staatuse;
generaatori mallivalik ja lubatud alusfailid ei muutu.

## Flangeri generaator lisatud — 0.42.0, 2026-10-07

Profiil `jb-flanger-multi` toetab kõiki 31 kogutud tüüpi kanalitel A–D.
Sisend: `schemaVersion: 1`, `firmware: 13`, `baseProfile: "jb-flanger-multi"`,
`flangerChannels: [{"channel":"A","type":"80's Rack Flanger"}]`.
Lubatud on 1–4 eri kanalit ja registri täpsed tüübinimed. Üksikparameetrite
ülekirjutamist ei toetata; kopeeritakse kogu 33-sõnaline kogutud mall.

Rakendus `scripts/fm3-flanger-multi.mjs` kontrollib registri räsi ja iga
kasutatud malli GET/SYX tõendit. Kolm lubatud alusfaili on
`examples/JB_YDOM_RHYTHM.syx`, `examples/FM3_PHASER_ABCD_TEST_export.syx`
ja viimase Flangeri kogumisgrupi donor. Muutuvad ainult valitud Flangeri
kanalite parameetrid; muud body-baidid, päised (välja arvatud CRC),
stseenid ja bypass säilivad. Testid: 124 tüübi/kanali kombinatsiooni,
8 sõltumatu seadmeekspordi body taastamist (ainult stseenikanalite valikud
võetakse selgesõnaliselt alusfailist), 2 lisabaasi ja 17 vigase sisendi tõrjet.
Raport: `../../docs/FM3_FLANGER_GENERATOR_TESTS.json`.

Kontrollimport: `examples/FM3_FLANGER_ABCD_TEST.syx` ja samanimeline TXT.
A 80's Rack Flanger ID24, B Vowel Flanger ID30, C MXF-117 ID8,
D Zero Flanger ID6. Sisemine presetinimi säilib alusfailist.
**Genereeritud Flangeri preseti seadmeimport ja helikontroll on veel ootel.**
See jaotis asendab varasema märkuse generaatori puudumise kohta.

## Flangeri tüübikogu valmis — 0.41.2, 2026-10-07

Kõik 31 kasutaja valitud Flangeri tüüpi on kogutud täielike 33-sõnaliste
kanalimallidena. Kaheksa täis-SYX/ühekordse GET-i paari kattuvad 1056/1056
sõna ulatuses; binaarsed Type ID-d katavad 0–30, Type parameeter on 0,
ploki ID 82. Ekraani järjekorranumbrid ei ole binaarsed ID-d.
Register: `references/flanger-library.json`; algandmed:
`references/flanger-batch-20261007-125456`; kontrollraport:
`../../docs/FM3_FLANGER_COLLECTION_VALIDATION.json`.

Kontroll hõlmab SYX-kaadreid, kontrollsummasid, CRC-d, footerit, GET-vastuse
struktuuri ja kõiki nelja kanali väärtusi. Muutused piirduvad Flangeri
parameetrite ja stseenikanalitega; varasemad kaks kogumispaari säilisid
baiditäpselt. Kogumisskript: `scripts/flanger-collector/`.
**Flangeri mallid ei ole veel SYX/TXT generaatorisse integreeritud.**
Uue genereeritud Flangeri preseti seadmeimporti ega heli pole kontrollitud.

## Phaser A–D seadmeimport kinnitatud — 0.41.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_PHASER_ABCD_TEST_export.syx` kattub
loodud ABCD testiga kõigi 14 222 lahtipakitud body-baidi osas, ilma
normaliseerimiseta. Kõik 140 Phaseri sõna säilisid täpselt: A Barber Pole ID7,
B Modern Vibe ID16, C Script 90 ID3, D Virtuoso Phaser ID12.
Stseenikanalid A,A,A,A,A,D,A,A ning bypass, routing ja kõik muud plokid säilisid.
Kaadrikontrollsummad, CRC ja footer kehtivad. Raport
`../../docs/FM3_PHASER_HARDWARE_ROUNDTRIP.json`.

Preseti sisemine nimi FM3_COMPRESSOR_ABCD_TEST_export ei muutunud.
Tervikfailid erinevad tihendatud esituse ja kontrollsummade poolest;
tihendatud pikkus mõlemal 4927 baiti, lõputäide nullidega.
Tagasiekspordi SHA-256:
`51da4b0e1ba43bef27f39c8dec08571bcfd49f452559e7869c18398c0d639eb3`.
Kasutaja failinimes oli enne syx-laiendit topeltpunkt; pakitud tõendifaili
nimi on ühtlustatud, baidid on muutmata.

Selle ABCD näidise import/tagasieksport on kinnitatud. Kõik 68 üldist
kanali/tüübi kombinatsiooni on kontrollitud offline, mitte kõik seadmel.
Heli, tasemed ja CPU hindamata. Ära korda sama kogumist ega kontrollimporti.
Generaatori lubatud alusfailide loendit selle tõendiga ei laiendatud.
Allpool selle ABCD näidise seadmeimpordi OOTEL märkused on ajaloolised.


## Phaser täiskanalimallide generaator — 0.41.0, 2026-10-07

Profiil `jb-phaser-multi` ühises `scripts/fm3-generate.mjs` generaatoris.
Spec: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-phaser-multi"`,
`phaserChannels:[{"channel":"A","type":"Barber Pole"}]`.
Lubatud 1–4 kordumatut A–D kanalit ja kõik 17 nime registrist
`references/phaser-library.json`. Kopeeritakse terve 35-sõnaline kinnitatud
kanalimall; üksikparameetrite muutmist ei toetata. Need on kogutud seaded,
mitte kinnitatud tehaseseaded. Iga genereerimine kontrollib lähte-GET/SYX paari,
registri räsi, täpseid sõnu, väljundi terviklust ja muude andmete säilimist.

Lubatud SHA-ga piiratud alusfailid: `examples/JB_YDOM_RHYTHM.syx`,
`examples/FM3_COMPRESSOR_ABCD_TEST_export.syx` ning Phaseri täieliku kogumise
`references/phaser-batch-20261007-122802/capture-20261007T122800-3b6eb73afe/donor.syx`.
Stseenikanalid, bypass, routing, muud plokid ja preseti sisemine nimi säilivad.
Uued failid ei saada seadmele käske.

`test-phaser-multi.mjs`: 68 tüübi/kanali kombinatsiooni; viis sõltumatut terve
body võrdlust (ainult Phaseri stseenikanalid viidud selgelt alusfaili valikutele),
kaks täiendavat lubatud baasi, 17 vigase päringu tõkestust. Raport
`../../docs/FM3_PHASER_GENERATOR_TESTS.json`. Senise ühise generaatori regressioon
läbis: 4 täpset faili, 16 juhtparameetrit, 8 sõltumatut body-võrdlust, 12 tõkestust.

Seadmekontrolli failid: `examples/FM3_PHASER_ABCD_TEST.syx` ja `.txt`,
spetsifikatsioon `.spec.json`, raport `.validation.json`.
A Barber Pole ID7; B Modern Vibe ID16; C Script 90 ID3; D Virtuoso Phaser ID12.
Alus on Compressori kinnitatud tagasieksport; sisemine nimi jääb
FM3_COMPRESSOR_ABCD_TEST_export. Kasutaja impordib tööpuhvrisse, kontrollib
Phaser1 A–D tüüpe ja ekspordib terve preseti nimega
FM3_PHASER_ABCD_TEST_export.syx. Võrdle kõiki 140 Phaseri sõna ja ülejäänud body't;
kanali vaatamisel tekkinud stseenikanalimuutus raporteeri eraldi.
Seadmeimport/tagasieksport OOTEL. Heli, tasemed ja CPU hindamata.
Allpool generaatorisse lisamise OOTEL märkused on ajaloolised.


## Phaser tüüpide kogumine lõpetatud — 0.40.2, 2026-10-07

Kõik 17/17 kasutaja FM3-Editi nimekirja tüüpi on kinnitatud sõltumatute
GET/SYX paaridega. Viis salvestust, igas 140/140 sõna võrdsed; binaar-ID-d
0–16 täpselt üks kord. Kaks varasemat salvestust säilisid baitidentsetena.
Register `references/phaser-library.json`; tõendid
`references/phaser-batch-20261007-122802`; raport
`../../docs/FM3_PHASER_COLLECTION_VALIDATION.json`.
Nimed pärinevad kasutaja kuvatõmmiselt `references/phaser-types-20261007.png`
ja koguja kinnitatud kanalivalikutest; nimekirja järjekorranumber pole binaar-ID.

Phaser1 effectId90, Type pid0, 35 sõna kanalis, neli kanalit. Body pikkus14222,
ploki päis9192, stseenikanalid9202..9217, sõnade arv9234, kanalite arv9236,
parameetrid9238..9517, kanali samm70 baiti. Ülddekoodri raporteeritud offset
on12 baiti nihkes: kasuta kontrollitud struktuurseid kohti.
GET `f0000174111f5a0051f7`; vastuse funktsioonid116,117,118 ning pikkused12,430,8.
Koguja `scripts/phaser-collector` kontrollib enne üht kasutaja kinnitatud GET-i
terve SYX-i terviklust ja piirab body erinevused Phaseri parameetrite ning
stseenikanalitega. SET/SAVE, automaatseid korduspäringuid ega automaatset
pordivalikut ei ole. Viimane üksik tüüp koguti A-kanalisse; B/C/D jäid samaks.

Kogumist ei ole vaja korrata. Järgmine etapp on nende 17 täiskanalimalli
lisamine SYX/TXT generaatorisse ning ühe loodud ABCD preseti seadmeimport ja
tagasieksport. Phaseri generaatorituge selles versioonis veel ei lisatud;
heli, tasemeid ja CPU koormust ei hinnatud. Senised generaatorid säilivad.


## Compressor A–D seadmeimport kinnitatud — 0.40.1, 2026-10-07

Kasutaja tagasieksport `examples/FM3_COMPRESSOR_ABCD_TEST_export.syx`
kattub genereeritud testiga kõigi14 222 lahtipakitud body-baidi osas, ilma
normaliseerimiseta. Kõik148 Compressor-sõna säilisid täpselt:
A Citrus Juicer18, B Dynami-Comp Soft17, C JFET Studio Compressor8,
D Optical Compressor4. Stseenikanalid A,A,A,A,A,A,B,A ning bypass ja muud
plokid säilisid. Kaadrikontrollsummad, CRC ja footer korras.
Raport `../../docs/FM3_COMPRESSOR_HARDWARE_ROUNDTRIP.json`.

Tervikfailid erinevad: presetinimi FM3_DELAY_ABCD_TEST_export →
FM3_COMPRESSOR_ABCD_TEST_export; tihendatud esitus ja kontrollsummad erinevad.
Tihendatud pikkus mõlemal4926 baiti; lahtipakitud sisu baitidentne;
mõlema rawPatch lõputäide nullidega. Muud päiseväljad säilivad.
Tagasiekspordi SHA-256:
`06a137c4002e61b1139fc47a90319dd7d8a644b2f1b39c0c25896bf049c1a2e6`.

Selle nelja kanaliga näidise import/tagasieksport kinnitatud firmware13
senises testikontekstis. Kõik19×4 kombinatsiooni on failitasemel kontrollitud,
mitte kõik seadmel imporditud. Heli, tasemed ja CPU hindamata.
Ära küsi sama kontrollimporti ega tüüpide kogumist uuesti. Generaatori
lubatud alusfailide loendit tõendi talletamisega ei laiendatud.
Allpool selle näidise seadmeimpordi OOTEL märkused on ajaloolised.

## Compressor täiskanalimallide generaator — 0.40.0, 2026-10-07

Uus profiil `jb-compressor-multi` ühises `scripts/fm3-generate.mjs` generaatoris.
Spec: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-compressor-multi"`,
`compressorChannels:[{"channel":"A","type":"Citrus Juicer"}]`.
Lubatud1–4 kordumatut kanalit A–D ja kõik19 täpset nime registrist.
Iga valik kopeerib kogu37-sõnalise kanali. Üksikparameetrite muutmine selles
profiilis pole toetatud; kogutud väärtusi ei nimetata tehaseseadeteks.

SHA-256-ga kinnitatud alused: `examples/JB_YDOM_RHYTHM.syx`,
`examples/FM3_REVERB_ABCD_TEST_export.syx` ja
`references/compressor-batch-20261007-120337/capture-20261007T120335-cba8c1eb81/donor.syx`.
Registri räsi ja iga valitud malli toor-GET/SYX kontrollitakse igal käivitamisel.
Muud plokid, routing, stseenikanalid, bypass ja määramata kanalid säilivad.
Päised säilivad peale CRC; struktuursed offsetid on autoriteetsed.

Failitestid:76 tüübi/kanali kombinatsiooni,5 sõltumatut kogutud preseti kogu
body võrdlust (stseenikanalid võetakse selgesõnaliselt alusfailist),2 lisa-alust,
17 vigase sisendi tõrjumist. Senise põhigeneraatori testid läbivad;
Drive/Delay/Reverb näidisväljundid säilivad baitidentselt.
Raport `../../docs/FM3_COMPRESSOR_GENERATOR_TESTS.json`.
Näidis `examples/FM3_COMPRESSOR_ABCD_TEST.syx`, kaasas TXT/spec/validation:
A Citrus Juicer18, B Dynami-Comp Soft17, C JFET Studio Compressor8,
D Optical Compressor4. Aluseks kinnitatud Reverb testpreseti tagasieksport.

Järgmine kasutajasamm: impordi näidis FM3-Editi tööpuhvrisse oma tööd
säilitades, kontrolli Compressor1 A–D tüüpe ja ekspordi terve preset nimega
`FM3_COMPRESSOR_ABCD_TEST_export.syx`. Võrdle kõiki148 kanaliväärtust ja
kõiki body-baite, stseenivalikuid ning päiseid; raporteeri iga erinevus.
Selle näidise seadmeimport, heli, tasemed ja CPU on OOTEL.
SET/SAVE/Store ei saadeta. Allpool0.39.6 kirjutustoe ootus on täidetud.

## Compressor tüüpide kogumine valmis: 19/19 — 0.39.6, 2026-10-07

Täielik tõend `references/compressor-batch-20261007-120337` ja register
`references/compressor-library.json`: kõik19 kasutaja kinnitatud nime,
binaar-ID-d0–18 ning37-sõnalised täiskanalimallid. Kõik5 toor-GET/SYX paari
sõltumatult kontrollitud, igas148/148 sõna, kaadrid ja kontrollsummad korras,
kõrvalised body-baidid säilinud. Varasema2 capture'i kõik failid baitidentsed.
Raport `../../docs/FM3_COMPRESSOR_BATCH_120337.json`.

Kogumist ei korrata. Säilita viimane ZIP ja ~/Documents/FM3_COMPRESSOR_SESSION.
Viimane seisund capture-20261007T120335-cba8c1eb81/donor.syx:
A VCA Bus Compressor10, B VCA FB Sustainer11, C VCA FF Sustainer9,
D säilinud Vari-Mu Tube Compressor5. SYX SHA-256
`e36dd5005dcc2a7b496e99a70c2d12ad4a7b15ba4375dfe1a2c110f5d25eac79`.

Järgmine etapp on täiskanalimallide lisamine SYX/TXT generaatorisse:
range alusfaili SHA-256 ja struktuuri kontroll; kogu37 sõna kopeerimine;
muude plokkide, stseenikanalite, bypass'i ja päiste säilimine;
valitud mallide sõltumatu GET/SYX kontroll igal genereerimisel.
Testi19×4 kombinatsiooni ning kogu body võrdlused, seejärel valmista üks
A–D kontrollpreset kasutaja impordiks ja tagasiekspordiks.
Tüübi pid12, kanalisamm74 baiti; parameetrid7050–7345, stseenid7014–7029.
Ülddekoodri12-baidine offset/stseeninihe ei ole autoriteetne.
Generaatori kirjutustuge selles versioonis veel ei lisatud. Üksikparameetrite
skaalasid, seadmeimporti, heli ega CPU-d kogumise põhjal ei kinnitata.
Allpool8/19 ja kogumise jätkamise märkused on ajaloolised.

## Compressor batch Macis kinnitatud: 8/19 — 0.39.5, 2026-10-07

Uusim tõend `references/compressor-batch-20261007-115810`.
Mõlemad GET/SYX paarid kontrollitud sõltumatult: kummaski148/148 sõna,
kaadrid, kontrollsummad ja kõrvaliste body-baitide säilimine korras.
Esimene seed-paar säilis baitidentselt. Lisandusid Compander ID12,
Dynami-Comp Classic7, Dynami-Comp Modern2, Dynami-Comp Soft17.
Registris `references/compressor-library.json` nüüd8 täielikku37-sõnalist
kanalimalli. Raport `../../docs/FM3_COMPRESSOR_BATCH_115810.json`.

Kasutaja võib sama koguja ja sama ~/Documents/FM3_COMPRESSOR_SESSION
kaustaga koguda kõik11 ülejäänud tüüpi järjest (4+4+3), lõpus saata ZIP.
Käivita sama käsk; esimese uue neliku järel q peatuse nõue on nüüd täidetud.
Järgmine nelik A09 Dynamics Processor, B10 Econo-Dyno-Comp,
C11 JFET Pedal Compressor, D12 JFET Studio Compressor.
Seejärel A13 Modern VCA Compressor, B14 Optical Compressor,
C15 Rockguy Compressor, D16 Vari-Mu Tube Compressor.
Viimati A17 VCA Bus Compressor, B18 VCA FB Sustainer, C19 VCA FF Sustainer;
D jäta siis muutmata. Üks kasutaja kinnitatud GET rühma kohta.
Ära korda juba kogutud8 tüüpi ega muuda teisi plokke.

Jätkamise seadmebaas on viimase eduka capture-20261007T115807-d0cfbbdf4a
seisund, vajadusel impordi selle donor.syx tööpuhvrisse. Koguja ise määrab
järgmise puuduva rühma. q ekspordib vahepealse ZIP-i; lõpus ZIP automaatselt.
Generaatori Compressori tüübimallide kirjutust pole veel lisatud.

## Compressor GET/SYX kinnitatud ja batch-koguja — 0.39.4, 2026-10-07

Esimene päris GET/SYX paar kontrollitud sõltumatult toorvastusest:
148/148 sõna, kaadrid12/454/8, checksum'id, eid46, txCalls1, txBytesWritten10.
A Analog Compressor ID6, B Analog Sustainer14, C Citrus Juicer18,
D Classic VCA Compressor13. Kogutud4/19, puudu15.
Raport `../../docs/FM3_COMPRESSOR_SEED_VERIFIED.json`, toortõend
`references/compressor-seed-result`, osaline kogu `references/compressor-library.json`.
See on täiskanalimallide kogumine, mitte uus generaatori kirjutustugi.

Jätkatav koguja `scripts/compressor-collector/FM3_COMPRESSOR_BATCH.py`:
`python3 ~/Downloads/FM3_COMPRESSOR_COLLECTOR/FM3_COMPRESSOR_BATCH.py --session ~/Documents/FM3_COMPRESSOR_SESSION --port /dev/cu.usbmodem211104`
Esimesed4 tüüpi paigaldatakse uude sessiooni kinnitatud paarina, neid ei koguta uuesti.
Järgmine nelik A05 Compander, B06 Dynami-Comp Classic,
C07 Dynami-Comp Modern, D08 Dynami-Comp Soft.
Iga kord ainult nimetatud kanalite Type-valikud, terve SYX eksport, sulge
FM3-Edit ja kinnita jah ühe GET-i jaoks. Esimese uue neliku järel q ja ZIP siia.
Sama käsk jätkab; q teeb ZIP-i Documents-kausta. Säilita sessioon ja viimane ZIP.

Tõendatud struktuur: 37 sõna/kanal, pid12, parameetrid7050–7345,
stseenikanalid7014–7029. Kõik muud body-baidid peavad kattuma Reverb
kontrollimpordi baasiga; stseenikanali vahetus on lubatud ja dokumenteeritav.
Tüübinimed põhinevad kasutaja kinnitatud valikutel; ID-d kontrollitakse
kattuvuse ja konfliktide vastu. Viimases rühmas3 tüüpi, neljas kanal säilib.

Offline kontrollid: päris148-sõnaline paar, kõrvalmuudatuse tõrjumine,
vigase RX ja korduva GET tõrjumine, sessiooni loomine, seed-paigaldus,
15 puudu, õige järgmine nelik, resume ja q ZIP. Batch-koguja Maci-katse
on veel ootel. SET/SAVE/Store ja automaatne retry puuduvad.
Allpool olev esimese GET-i ootus on täidetud; ära korda seed-katset.

## Compressor esimene SYX ja ühe GET kontrollpakett — 0.39.3, 2026-10-07

Kasutaja `FM3_COMPRESSOR_SELECTION_001.syx` struktuur ja kontrollsummad korras.
Raport `../../docs/FM3_COMPRESSOR_SEED_INSPECTION.json`.
Compressor1 eid46, päis7004, stseenikanalid7014–7029,
kanalisuurus37 sõna (7046), kanaleid4 (7048), parameetrid7050–7345,
tüüp pid12. Esialgsed kasutaja valikute/SYX ID-d:
A Analog Compressor6, B Analog Sustainer14, C Citrus Juicer18,
D Classic VCA Compressor13. Nende GET/SYX kinnitus on OOTEL.
Muud body-muudatused puuduvad peale Compressor-kanalite ja Scene2
Compressori kanali A→D. Ülddekoodri offset/stseenid on siin12 baidi võrra
nihkes; kasuta struktuurset päist ja otseseid sõnavõrdlusi, mitte neid välju.

Pakett `scripts/compressor-seed` sisaldab kasutaja SYX-i, 148 oodatavat sõna,
Python3 käivitajat ja POSIX transporti. GET `f0000174111f2e0025f7`, ainult üks
kasutaja kinnitatud os.write; puuduvad SET/SAVE/Store, handshake ja retry.
Sünteetiliselt kontrollitud148-sõnaline vastus, kaadripikkused12/454/8,
kontrollsumma, vigased vastused, korduva GET tõkestus ja ZIP väljund.
Päris seadme GET pole veel toimunud; sünteetiline test pole riistvaratõend.

Järgmine kasutajasamm: hoia sama ekspordi seisund (vajadusel impordi
kaasasolev SYX tööpuhvrisse), sulge FM3-Edit ning käivita:
`python3 ~/Downloads/FM3_COMPRESSOR_SEED/FM3_COMPRESSOR_SEED.py /dev/cu.usbmodem211104`.
Port on eelneva sessiooni oma: kui muutunud, kasuta programmi näidatud
tegelikku porti; automaatset portivalikut ei tehta. Kinnita sõnaga GET.
Saada tekkinud `FM3_COMPRESSOR_SEED_RESULT_...zip` vestlusse.
Seejärel kontrolli toorvastust sõltumatult, kõiki148 väärtust SYX vastu,
kõiki kaadreid ja checksum'e, txCalls1 ning txBytesWritten10. Edu korral
loo ülejäänud15 tüübi jätkatav batch-koguja. Ära küsi esimest nelikut uuesti.

## Compressor tüübinimekiri ja esimene nelik — 0.39.2, 2026-10-06

Kasutaja FM3-Editi kuvatõmmisel 19 tüüpi; täpsed nimed ja 5 kogumisrühma
`references/compressor-roster.json`, tõend `references/compressor-types-20261006.png`.
Pildil valitud Rockguy Compressor. Nimekirja järjekord ei ole binaar-ID.
GET/SYX vastendus ja täiskanalimallid veel kogumata; generaatori tuge ei lisatud.

Järgmine kasutajasamm: praeguses kontrollitud Reverb testpreseti seisundis
vali ainult Compressor1 kanalite tüübid: A Analog Compressor, B Analog Sustainer,
C Citrus Juicer, D Classic VCA Compressor. Muud seaded jäävad tüübivahetuse
määratud väärtustele; ära kohanda neid käsitsi ega muuda muid plokke.
Ekspordi TERVE preset `FM3_COMPRESSOR_SELECTION_001.syx` ja saada siia.
Alus võrdluseks `examples/FM3_REVERB_ABCD_TEST_export.syx`, SHA-256
`d7813ce6c5d352da180e659e73fee0e5fe114b96eab8da1beb34570d9aa8f76a`.

Seejärel kontrolli SYX struktuuri, kanalimõõte ja kõikide kõrvaliste baitide
säilimist; stseenikanali valiku muutus raporteeri eraldi. Alles seejärel
valmista üks kasutaja kinnitatud Compressor GET seed-koguja, kasutades senist
transporditeostust. Ära esita oletuslikku ID-vastendust kinnitatuna.
GET/SYX seed-paari järel saab teha ülejäänud 15 tüübi jätkatava batch-koguja.
Viimases rühmas on kolm tüüpi, neljas kanal säilib. SET/SAVE/Store puudub.

## Reverb A–D seadmeimport ja tagasieksport kinnitatud — 0.39.1, 2026-10-06

Kasutaja tagastas `examples/FM3_REVERB_ABCD_TEST_export.syx`.
Raport `../../docs/FM3_REVERB_HARDWARE_ROUNDTRIP.json`:
kõik 14 222 lahtipakitud body-baiti kattuvad genereeritud näidisega täpselt,
ilma normaliseerimiseta. Kõik 284 Reverb-sõna säilisid; A Chamber: Deep Chamber
(ID 33), B Cloud: Cirrocumulus (47), C Plate: Large Plate (11),
D Spring: Vibra-King Custom (78). Stseenikanalid A,B,A,A,C,A,A,A ja bypass
ning kõik muud plokid säilisid. Kaadrikontrollsummad, CRC ja footer korras.

Tervikfailid pole baitidentsed: sama pikkusega (4929 baiti) tihendatud
esitus erineb; vastavalt erinevad kontrollsummad. Lahtipakitud sisu on identne,
mõlema rawPatch lõputäide nullidega, päises muutuvad ainult CRC baidid.
Presetinimi jäi `FM3_DELAY_ABCD_TEST_export`, sest generaator säilitab alusnime;
Reverb testfaili nimi on sellest sõltumatu. Tagasiekspordi SHA-256:
`d7813ce6c5d352da180e659e73fee0e5fe114b96eab8da1beb34570d9aa8f76a`.

See kinnitab selle nelja kanali näidise importi/tagasieksporti firmware 13
senises testikontekstis. Kõik 79 tüüpi × 4 kanalit on failitasemel testitud,
mitte kõik seadmel imporditud. Heli, tasemed ja CPU jäävad hindamata.
Ära küsi sama näidise importi ega kogumist uuesti. Allpool olevad selle
näidise seadmeimpordi OOTEL märkused on ajaloolised; üldiste väljundite
kontrollipiirangud kehtivad edasi. Generaatori lubatud alusfailide loendit
selle tõendi talletamisega ei laiendatud.

## Reverb täiskanalimallide generaator — 0.39.0, 2026-10-06

Uus profiil `jb-reverb-multi` töötab ühise `scripts/fm3-generate.mjs` kaudu.
Spec: `schemaVersion: 1`, `firmware: 13`, `baseProfile: "jb-reverb-multi"`,
`reverbChannels: [{"channel":"A","type":"Chamber: Deep Chamber"}]`.
Lubatud 1–4 kordumatut kanalit A–D ja kõik 79 täpset nime registrist
`references/reverb-library.json`. Iga valik kopeerib kogu 71-sõnalise kanali,
mitte ainult tüübi-ID. Selle profiili üksikparameetrite muutmine pole toetatud.

Lubatud SHA-256-ga kinnitatud alused: `examples/JB_YDOM_RHYTHM.syx`,
`examples/FM3_DELAY_ABCD_TEST_export.syx` ja
`references/reverb-batch-20261006-181951/capture-20261006T181944-6bb74fb981/donor.syx`.
Mallikogu räsi ning valitud mudelite toor-GET/SYX tõendid kontrollitakse igal
käivitamisel. Säilivad muud plokid, routing, stseenide kanalivalikud, bypass,
määramata kanalid ja päised (välja arvatud uus CRC). Kogutud seaded ei ole
kinnitatud tehasevaikeväärtused. Muud alusfailid lükatakse tagasi.

Kontrollitud: 316 tüübi/kanali kombinatsiooni, 20 sõltumatut kogu body
võrdlust (ainult Reverb stseenikanalid võetakse selgesõnaliselt alusfailist),
kaks täiendavat alusfaili ning 17 vigase sisendi tagasilükkamist.
Raport `../../docs/FM3_REVERB_GENERATOR_TESTS.json`.
Näidis `examples/FM3_REVERB_ABCD_TEST.syx` ja kaasnev TXT/spec/validation:
A Chamber: Deep Chamber (33), B Cloud: Cirrocumulus (47),
C Plate: Large Plate (11), D Spring: Vibra-King Custom (78).

Järgmine samm: kasutaja impordib näidise FM3-Editi tööpuhvrisse, kontrollib
Reverb1 A–D tüüpe ja ekspordib terve preseti `FM3_REVERB_ABCD_TEST_export.syx`.
Võrdle kõiki body-baite, nelja kanali 284 sõna, stseenivalikuid ja päiseid;
raporteeri iga erinevus. Seadmeimport, heli ja CPU on OOTEL, neid ei tohi
nimetada kinnitatuks enne tagasisidet. MIDI SET/SAVE/Store puudub.
Allpool olev 0.38.6 generaatori lisamise plaan on täidetud; kogumise tõendid
ja ohutuspiirid kehtivad edasi.

## Reverb tüüpide kogumine lõpetatud: 79/79 — 0.38.6, 2026-10-06

Uusim täielik tõendikogu references/reverb-batch-20261006-181951.
Kasutaja kaks ZIP-i (163055 ja181951) võrreldud: uuem sisaldab kõiki varasema
10 capture-kausta faile baitidentselt. Kõik20 unikaalset GET/SYX paari on
sõltumatult toorvastustest uuesti kontrollitud: igas284/284 sõna, kaadrid,
CRC/footer ning mitte-Reverb body säilimine korras. Kõik79 kinnitatud
nimevastendust on kordumatud; binaar-ID-d katavad0–78.
references/reverb-library.json sisaldab iga tüübi71-sõnalist täiskanalimalli,
lähtekanalit, capture-teed ja SYX SHA-256. Nimed lähtuvad kasutaja kinnitatud
FM3-Editi valikutest, mitte GET-i tekstist. Kogutud väärtusi ei nimetata
tehaseseadeteks. Raport ../../docs/FM3_REVERB_BATCH_181951.json.

Ära küsi Reverb tüüpide kogumist ega GET-i uuesti. Viimane edukas seisund:
capture-20261006T181944-6bb74fb981/donor.syx; A Spring: Tube Spring ID66,
B Spring: Vibra-King ID68, C Spring: Vibra-King Custom ID78; D säilis ID67.
Säilita kasutaja viimane ZIP ja ~/Documents/FM3_REVERB_SESSION.

Järgmine arendusetapp on kogutud Reverb täiskanalimallide lisamine SYX/TXT
generaatorisse: range alusfaili/struktuuri kontroll, kogu71-sõnalise kanali
kopeerimine, muude plokkide/stseenide/bypass'i/päiste säilimine ja täpne
väljundi tagasilugemine. Lähtu olemasolevast Delay mitme kanali teostusest;
tüübi-ID üksi muutmine ei piisa. Testi79×4 kombinatsiooni offline ning valmista
seejärel üks arendustest kasutaja teadlikuks FM3-Editi kontrollimpordiks ja
tagasiekspordiks. Uut Reverb tüübimallide kirjutustuge selles versioonis VEEL
EI LISATUD. Üldine põhiseadete kirjutus, kõikide kombinatsioonide seadmeimport,
heli ja CPU pole kogumisega kinnitatud. SET/SAVE/Store käske ei kasutata.
Allpool olevad8/79 ning kogumise jätkamise märkused on ajaloolised.

## Reverb koguja Macis kinnitatud: 8/79 — 0.38.5, 2026-10-06

Uusim jätkupunkt references/reverb-batch-20261006-151235.
Mõlemad GET/SYX paarid on toorvastustest uuesti kontrollitud: kummaski284/284
sõna, terviklus korras, mitte-Reverb body säilinud, nime/ID vastendused kordumatud.
Uus nelik A Cloud: Cirrocumulus ID47, B Cloud: Cumulonimbus ID48,
C Cloud: Nimbostratus ID49, D Cloud: Stratocumulus ID50.
Raport ../../docs/FM3_REVERB_BATCH_151235.json. Kogutud8/79, puudu71.
See kinnitab partiikoguja tegeliku Maci-töövoo; uut Reverb genereerimist ei kinnita.

Jätka sama Downloads/FM3_REVERB_COLLECTOR/FM3_REVERB_BATCH.py koguja ja
~/Documents/FM3_REVERB_SESSION sessiooniga; uut allalaadimist pole vaja.
Hoia FM3-s viimase eduka capture-20261006T151228-65854467e6/donor.syx seisund.
Järgmine nelik: A09 Echo: Echo Hall, B10 Echo: Echo Pitch Plate,
C11 Echo: Echo Plate, D12 Echo: Echo Room. Kasutaja võib ülejäänud nelikud
järjest koguda ja lõpus ühe ZIP-i saata. q teeb vahepealse ZIP-i ja lõpetab;
sama käsk jätkab. Iga nelik nõuab sama seisundi tervet SYX-i ning üht
kasutaja kinnitatud GET-i; SET/SAVE/automaatne retry puuduvad.
Ära korda seed'i või Cloud-nelikut. Allpool olevad Maci-kinnitust ootavad
ja4/79 seisud on ajaloolised.

## Reverb GET kinnitatud ja koguja valmis — 0.38.4, 2026-10-06

references/reverb-seed-result sisaldab päris Reverb GET-vastust ja tervet SYX-i.
Toorvastus on sõltumatult dekodeeritud: üks f0000174111f420049f7 päring,
kaadrid116/117/117/118 pikkustega12/778/94/8; kõik284/284 sõna kattuvad.
RawRX SHA b31ae719b3c8c4ae624de0406c078d4da48b7a246b6d6ae153b2f0789e7d73fd.
Type on pid0: A Chamber: Deep Chamber ID33, B Chamber: Large Chamber ID8,
C Chamber: Medium Chamber ID7, D Chamber: Small Chamber ID6.
Raport ../../docs/FM3_REVERB_SEED_VERIFIED.json. Esimesed4/79 tüüpi kinnitatud,
75 puudu. Allpool Reverb GET ootamise märkused on ajaloolised.

scripts/reverb-collector/FM3_REVERB_BATCH.py on jätkatav79 tüübi koguja.
Kaasas seed/capture-001 algne GET/SYX paar ja kontrollitud4 tüübi nimed/ID-d.
Seanss ~/Documents/FM3_REVERB_SESSION, mitte Delay ega Drive kaust.
Järgmine nelik: A05 Cloud: Cirrocumulus, B06 Cloud: Cumulonimbus,
C07 Cloud: Nimbostratus, D08 Cloud: Stratocumulus. Muuda ainult Reverb1 Type;
ekspordi terve SYX, kontrolli nimed, sulge Edit ja kinnita üks GET sõnaga jah.
Iga paar kontrollib284 sõna, CRC/footerit, mitte-Reverb body säilimist ja nimede/ID-de kordumatust.
q loob tulemuse ZIP-i; sama käsk jätkab. Jätkamisel hoia viimase eduka kogumise
FM3 seisundit või impordi sessiooni viimane edukas donor.syx. SET/SAVE/retry puuduvad.
Esimese uue neliku järel q ning ZIP tagasi Maci-töövoo kinnitamiseks.

Offline testid: päris284-sõnaline paar, kõrvalmuudatuse/rikutud RX/korduva GET-i
tõkestus, sessiooni loomine, seed paigaldus,75 puudu, õige järgmine nelik,
jätkamine ja q ZIP ilma seadmega ühendumata. Reverb seed transport päris Macis
kinnitatud; uue partiikoguja täielik Maci-töövoog veel ootel. Reverb uut
kirjutustuge ega täielikku79 tüübi kogu pole veel valmis.

## Reverb seed SYX kontrollitud — 0.38.3, 2026-10-06

references/reverb-capture/FM3_REVERB_SELECTION_001.syx on kontrollitud terve preset.
Võrreldes FM3_DELAY_ABCD_TEST_export.syx-iga muutuvad ainult Reverb-kanalite
parameetrid ning Scene2 Reverb-kanal B→D (body9530:1→3); kokku146 body-baiti.
Päises ainult CRC muutus. Kaadrid, CRC/footer ning muud plokid on korras.
Reverb1 eid66, header9518, wordsPerChannel offset9560=71, count9562=4,
params9564..10131, kanalisamm142 baiti, kokku284 uint16.
Type kandidaat pid0 annab A33/B8/C7/D6; see pole veel GET/SYX paariga kinnitatud.
Kasutaja valikud: A Chamber: Deep Chamber, B Chamber: Large Chamber,
C Chamber: Medium Chamber, D Chamber: Small Chamber.
Raport ../../docs/FM3_REVERB_SEED_INSPECTION.json.

scripts/reverb-seed/FM3_REVERB_SEED.py koos reverb_transport.py, expected.json
ja seed SYX-iga küsib GET kinnituse, saadab ühe f0000174111f420049f7 ning
võrdleb284 väärtust. Kasutab eelnevalt tõendatud macOS POSIX transporti,
pyserial ega Node pole vajalik. Port peab olema selgesõnaliselt antud.
SET/SAVE/Store/automaatne retry puuduvad; tõrke korral säilivad vastus ja raport.
Offline test: sünteetiline284-sõnaline vastus (kaadrid12/778/94/8), GET checksum,
viis vigast vastust, korduva GET-i tõke ja simuleeritud kinnitatud ZIP töövoog.
Reverb seadme GET ja transpordi tegelikud vastusekaadrid on VEEL OOTEL.

Järgmine kasutaja samm: hoia seed SYX ekspordi seisund, sulge FM3-Edit ja
käivita Downloads/FM3_REVERB_SEED/FM3_REVERB_SEED.py kinnitatud pordiga
(/dev/cu.usbmodem211104 kui see on endiselt leitud port). Kinnita GET ning
saada FM3_REVERB_SEED_RESULT_*.zip. Alles selle toorvastuse iseseisva
paariskontrolli järel lisa esimene nelik registrisse ja valmista jätkatav79 tüübi
koguja. Ära palu SYX-i uuesti eksportida ilma konkreetse põhjuseta.

## Reverb tüübinimekiri talletatud — 0.38.2, 2026-10-06

references/reverb-capture/reverb-roster.json sisaldab kasutaja FM3-Editi
kuvatõmmiselt loetud 79 Reverb-tüüpi; algpilt reverb-type-list.png samas kaustas.
Nimed koos kategooria eesliitega on säilitatud. Kuvanumbrid 1–79 EI OLE
binaarsed tüübi-ID-d; kõik binaryId väärtused on null. Midagi pole veel kogutud
GET/SYX paarina ja uut Reverb generaatorituge pole lisatud.

Järgmine kasutaja samm: kasuta viimast kontrollitud
examples/FM3_DELAY_ABCD_TEST_export.syx seisundit ja muuda ainult Reverb1
Type-valikuid: A Chamber: Deep Chamber, B Chamber: Large Chamber,
C Chamber: Medium Chamber, D Chamber: Small Chamber.
Tüübi valikuga automaatselt muutunud parameetrid jäta alles; muud plokid,
stseen ja seaded säilita. Ekspordi TERVE preset FM3_REVERB_SELECTION_001.syx.
Kanali vaatamisega kaasnevad Reverb stseenikanali muutused tuleb võrdluses
selgelt raporteerida. Terminali/GET-i veel pole vaja. Pärast SYX saamist
kontrolli tegelikku plokipaigutust, terviklust ja kõrvalmuudatusi; valmista
üks kasutaja kinnitatud GET ning võrdle selle toorvastust terve SYX-iga.
Ära tuleta Reverb parameetri-ID-d Delay pid6-st ega oletatud enum-järjestusest.
Alles pärast esimese paari kinnitust koosta jätkatav 79 tüübi koguja.
SET/SAVE/Store ja automaatne korduspäring on keelatud. Delay kogu ja
konkreetse ABCD preseti kontrollimport on lõpetatud; ära neid korda.

## Delay A–D kontrollimport kinnitatud — 0.38.1, 2026-10-06

examples/FM3_DELAY_ABCD_TEST_export.syx on kasutaja FM3 tagasieksport.
Kõik 14222 lahtipakitud body-baiti on loodud testpresetiga identsed, ilma
normaliseerimiseta. Kõik 356 Delay-sõna säilivad: A Digital Stereo ID1,
B 2290 w/ Modulation ID12, C Mono Tape ID4, D Ping-Pong ID6.
Stseenid, kanalivalikud, bypass ning muud plokid säilivad täpselt.
Failid tervikuna ei ole baitidentsed: raw-päises on nimevälja muudatus
JB YDOM RHYTHM → FM3_DELAY_ABCD_TEST_export ning CRC muutus. Nimevälja täpsed
baidid ja kõik päise erinevused on raportis; neid ei normaliseeritud ära.
Kaadrite kontrollsummad, CRC/footer ja dump-päis on korras.
Raport ../../docs/FM3_DELAY_HARDWARE_ROUNDTRIP.json;
regressioon scripts/test-delay-hardware.mjs.

Ära küsi selle testpreseti kontrollimporti ega Delay tüüpe uuesti.
See kinnitab konkreetse nelja kanali testpreseti seadme kaudu tagasieksporti,
mitte kõigi 108 kombinatsiooni individuaalset importi, põhiseadete üldist
kirjutustuge või helilist kvaliteeti. Time/Feedback/Mix/Tempo jäävad selle
profiili puhul kogutud malli väärtustele. Uute väljundite riistvarakinnitus
on endiselt eraldi hinnatav; generaatori üldine pending märge ei tühista
selle konkreetse näidise siin talletatud kinnitust.
Järgmised võimalikud tööd: Reverb tüübinimekirja ja GET/SYX mallide kogumine
või Delay põhiseadete eraldatud katsed vastavalt kasutaja soovile.
Reverbi puhul alusta FM3-Editi nähtavast tüübinimekirjast; ära oleta ID-sid.
Allpool olevad selle Delay testpreseti impordi ootamise märkused on ajaloolised.

## Delay generaator lisatud — 0.38.0, 2026-10-06

scripts/fm3-delay-multi.mjs on seotud generatePreset'i ja fm3-spec.schema.json-iga:
{schemaVersion:1,firmware:13,baseProfile:"jb-delay-multi",delayChannels:[{channel:"A",type:"Digital Stereo"}]}.
Toetatud 1–4 kordumatut A–D kanalit ja kõik 27 kogutud tüüpi. Valik kopeerib
terve 89-sõnalise malli, kontrollides seda käivitamisel algse GET/SYX paariga.
Lubatud SHA-piiratud alused: examples/JB_YDOM_RHYTHM.syx,
examples/FM3_DRIVE_ABCD_TEST_export.syx ja viimase Delay-kogumise donor
references/delay-batch-20261006-134023/capture-20261006T134020-bced7c845b/donor.syx.
Kõik muud plokid, stseenid, bypass, määramata kanalid ja päised säilivad.
Time/Feedback/Mix/Tempo käsitsi määramist see profiil veel ei luba; need
pärinevad kogutud mallist ega pruugi olla tehaseseaded. Teisi profiile ei saa
selle profiiliga samas spec-is kokku panna. Toetamata väljad tõkestatakse.

Offline test: kõik 108 tüübi/kanali kombinatsiooni eraldi koos kõigi muude
body-baitide säilimisega; seitse sõltumatut seadmeekspordi body-taastamist
(stseenikanalid selgelt alusfailist säilitatud), kaks lisaalusfaili ning
17 sobimatu sisendi tõkestust. Kaadrid, CRC/footer ja kogu body tagasilugemine
kontrollitud. Senine generaator ning Drive ABCD annavad endise väljundi.
Raport: ../../docs/FM3_DELAY_GENERATOR_TESTS.json.

examples/FM3_DELAY_ABCD_TEST.syx (+txt/spec/validation) on valmis arenduskatse,
aluseks kasutaja kinnitatud Drive ABCD tagasieksport. Delay1 valikud:
A Digital Stereo (ID1), B 2290 w/ Modulation (ID12), C Mono Tape (ID4),
D Ping-Pong (ID6). SEADMEIMPORT OOTEL. Palu säilitada praegune töö,
importida FM3-Editis, vaadata kanalite A–D tüübinimesid ja eksportida terve
FM3_DELAY_ABCD_TEST_export.syx. Ära palu enne eksporti tüüpe käsitsi parandada.
Kanali vaatamine võib muuta aktiivse stseeni Delay-kanalit: raporteeri tegelik
erinevus eraldi, ära normaliseeri seda vaikselt. Võrdle tagasiekspordi kogu body,
kanalisõnu, päiseid, stseene ning kontrollsummasid. Heli/CPU eraldi hinnatav.
Kogumist enam ei korrata. Pärast kontrollimporti jätka Delay põhiseadete
vajalike üksikkatsete või Reverb tüüpide kogumisega vastavalt kasutaja soovile.
Allpool kirjutustoe puudumist kirjeldavad märkused on ajaloolised.

## Delay tüüpide kogumine lõpetatud: 27/27 — 0.37.6, 2026-10-06

Uusim tõendikogu: references/delay-batch-20261006-134023.
Kõik seitse GET/SYX paari kontrollitud uuesti toorvastustest: igas 356/356
sõna; SysEx kontrollsummad, CRC/footer ning mitte-Delay body säilimine korras.
27 kasutaja kinnitatud tüübinime vastavad kordumatutele binaar-ID-dele 0–26.
Masinloetav references/delay-library.json sisaldab kõigi 27 tüübi täielikku
89-sõnalist kanalimalli, lähtekanalit, capture-teed ja SYX SHA-256 tõendit.
Raport: ../../docs/FM3_DELAY_BATCH_134023.json. Toorandmed säilivad muutmata.

Ära küsi Delay tüüpide kogumist uuesti. Kasutaja viimane seisund on
capture-20261006T134020-bced7c845b/donor.syx: A Vintage Digital ID11,
B Wandering Delays ID24, C Worn Tape ID21, D Sweep Delay ID9.
Järgmine arendusetapp: lisa kogutud täiskanalimallide kontrollitud kopeerimine
olemasolevasse SYX/TXT generaatorisse, säilitades muud plokid, stseenid ja bypass.
Esmalt offline kontroll kõigile mallidele ja sihtkanalitele, seejärel üks
selgelt arenduskatseks märgitud kontrollpreset ning kasutaja FM3-Editi
kontrollimport/tagasieksport. Loe enne arendust SYX tegevuskava ja olemasolevat
Drive mitme kanali teostust; ära kirjuta üksnes tüübi-ID-d.
Põhiseadete üldine kirjutustugi vajab eraldi tõendeid; kogutud väärtusi ei tohi
nimetada tehaseseadeteks. Uut Delay generaatorituge selles versioonis ei lisatud.
Heli/CPU ja kõikide tüüpide seadmeimport pole selle kogumisega kinnitatud.
Tooreid SET/SAVE-käske ei kasutata. Varasemad 8/27 jätkupunktid on ajaloolised.

## Delay koguja Macis kinnitatud: 8/27 — 0.37.5, 2026-10-06

Uusim Delay jätkupunkt: references/delay-batch-20261006-125751.
Mõlemad GET/SYX paarid kontrollitud sõltumatult, kummaski356/356 sõna;
8 tüüpi kogutud,19 veel puudu. Uus nelik: A Deluxe Mind Guy ID14,
B Digital Mono ID0,C Digital Stereo ID1,D DM-Two Delay ID20.
Nimed pärinevad kasutaja kinnitatud valikutest; ID-d pid6 GET/SYX paarist.
Raport: ../../docs/FM3_DELAY_BATCH_125751.json. Toorvastused ja täis-SYX-id säilivad.
See kinnitab koguja tegeliku Maci töövoo; Delay genereerimist ega põhiseadete
kirjutamist see veel ei kinnita.

Jätka olemasoleva koguja ja ~/Documents/FM3_DELAY_SESSION sessiooniga;
uut allalaadimist pole vaja. Säilita viimase eduka kogumise FM3 seisund.
Järgmine nelik: A09 Dual Delay, B10 Dual Head Tape, C11 Ducking Delay,
D12 Graphite Copy Delay. Kasutaja võib kõik ülejäänud nelikud järjest teha
ja lõpus ühe ZIP-i saata. Iga nelik nõuab sama seisundi täis-SYX-i ning
üht kasutaja kinnitatud GET-i; SET/SAVE ja automaatne korduspäring puuduvad.
Allpool olevad varasemad Delay jätkupunktid on ajaloolised.

## Delay GET kinnitatud ja koguja valmis — 0.37.4, 2026-10-06

references/delay-seed-result sisaldab kasutaja päris GET vastust ja SYX-i.
Üks GET f0000174111f46004df7, funktsioonid116/117/117/118,
kaadripikkused12/778/310/8,356/356 väärtust kattuvad. RawRX SHA
1dcd2ad6023b543b31b7b8dbd0894a63a94b9d9854119070e6f639a2da02a13d.
Type on pid6 (mitte pid0 ega routing pid7). A2290 w/ Modulation ID12,
B Ambient Stereo ID13,C Analog Mono ID2,D Analog Stereo ID3.

scripts/delay-collector/FM3_DELAY_BATCH.py on jätkatav27 tüübi koguja;
seed/capture-001 sisaldab kinnitatud esimest nelikut. Alguses puudu23.
Järgmine nelik A05 Deluxe Mind Guy,B06 Digital Mono,C07 Digital Stereo,
D08 DM-Two Delay. Kasutaja muudab ainult Type-valikuid, ekspordib terve SYX,
sulgeb Editi ja kinnitab ühe GET-i. Kontrollitakse356 väärtust, CRC/footer,
mitte-Delay body säilimist ning nimede/ID-de kordumatust. q annab ZIP-i.
Sessioon ~/Documents/FM3_DELAY_SESSION, mitte Drive sessioon. Jätkamisel
kasuta viimase eduka kogumise seisundit. Esimese uue neliku ZIP tagasi
kontrollimiseks; koguja Maci terviklik töövoog veel ootel (seed transport kinnitatud).
Offline testid: päris seed paar, kõrvalmuudatuse/rikutudRX/korduvaGET tõkestus,
sessiooni loomine, jätkamine, järgmisest nelikust alustamine ja ZIP eksport.

## Delay seed SYX kontrollitud — 0.37.3, 2026-10-06

Kasutaja FM3_DELAY_SELECTION_001..syx talletatud normaliseeritud nimega
references/delay-capture/FM3_DELAY_SELECTION_001.syx. Täielik SYX terviklus
korras; võrreldes FM3_DRIVE_ABCD_TEST_export.syx muutuvad ainult Delay
kanaliparameetrid ja stseeni Delay-kanalivalik. Header7346, eid70,
wordsPerChannel offset7388=89, count7390=4, parameetrid7392..8103,
kanalite samm178 baiti, kokku356 uint16. Raport ../../docs/FM3_DELAY_SEED_INSPECTION.json.
Kasutaja valitud nimed: A2290 w/ Modulation,B Ambient Stereo,C Analog Mono,
D Analog Stereo. Binaarse tüübi parameetri vastendus veel GET-iga kinnitamata.
scripts/delay-seed/FM3_DELAY_SEED.py küsib kasutajalt GET kinnituse, saadab
ühe f0000174111f46004df7 päringu ja võrdleb356 väärtust expected.json-iga.
Transport varasemast tõendatud Drive töövoost; Delay dekooder offline
sünteetilise356-sõnalise vastusega testitud, vale plokk tõkestatud. Seadme
Delay GET tulemus OOTEL. SET/Save/Store/automaatne retry puudub; vastus ja
vead jäävad ZIP-i. Palu selle ZIP tagastada, seejärel koosta jätkatav koguja.

## Delay tüübinimekiri talletatud — 0.37.2, 2026-10-06

references/delay-capture/delay-roster.json sisaldab kasutaja FM3-Editi
kuvatõmmiselt loetud27 tüüpi; originaal delay-type-list.png samas kaustas.
Kuvanumbrid1..27 EI OLE binaarsed tüübi-ID-d; kõik binaryId on veel null.
Järgmine kasutaja samm: impordi viimane FM3_DRIVE_ABCD_TEST_export.syx,
vali Delay1 A 2290 w/ Modulation, B Ambient Stereo, C Analog Mono,
D Analog Stereo. Muuda kanalites ainult Type-valikut; jäta automaatsed
seaded alles. Ekspordi terve FM3_DELAY_SELECTION_001.syx.
Pärast selle saamist kontrolli ploki paigutust, valmista üks kasutaja kinnitatud
Delay GET ning valideeri vastus ekspordiga. Seejärel loo jätkatav koguja27
mudelile (kuni4 tüüpi korraga). Drive kogumine ja kontrollimport on valmis.

## Drive A–D kontrollimport kinnitatud — 0.37.1, 2026-10-06

examples/FM3_DRIVE_ABCD_TEST_export.syx on kasutaja seadme tagasieksport.
Kõik14222 lahtipakitud body-baiti on loodud testiga identsed; normaliseerimata.
Kõik176 Drive-sõna (4×44) säilivad: A BB Pre, B T808 OD, C Rat Distortion,
D Zen Master koos määratud põhiseadetega. Stseenivalik, Drive kanaliseosed,
bypass ja kõik muud plokid säilivad samuti; päistes ainult CRC muutus.
Terviklus (kaadrid, CRC, footer) korras. Failid tervikuna pole baithaaval samad.
Raport ../../docs/FM3_DRIVE_ABCD_HARDWARE_ROUNDTRIP.json;
regressioon scripts/test-drive-abcd-hardware.mjs.
See tõendab konkreetse nelja kanali testpreseti riistvara kaudu tagasieksporti,
mitte iga348 tüübi/kanali kombinatsiooni individuaalset importi ega heli kvaliteeti.
Kontrollimporti ja Drive kogumist ära uuesti küsi. Generaatori tüübipõhised
põhiseadete piirangud säilivad. Järgmisena jätka algset Delay/Reverb plaani:
olemasoleva baasploki kontroll, nähtav tüübinimede nimekiri, üks kinnitatud GET
koos terve SYX-iga, seejärel jätkatav koguja. Ära tuleta uusi parameetri-ID-sid
või tüüpide loendit oletusest. Allpool ootel märkused kirjeldavad varasemat seisu.

## Drive A–D generaator ja kontrollpreset — 0.37.0, 2026-10-06

scripts/fm3-drive-multi.mjs on generatePreset'i ja fm3-spec.schema.json kaudu
kasutatav profiilina jb-drive-multi: {schemaVersion:1,firmware:13,
baseProfile:"jb-drive-multi",driveChannels:[{channel:"A",type:"BB Pre",drive:2,
level:2,mix:25}, ...]}.1..4 kordumatut kanalit; ainult kaks varem lubatud
alusfaili (originaal JB ja viimane Drive-kogumise donor). Type kopeerib87 tüübi
kogust täieliku44-sõnalise kanali valitud A/B/C/D kanalisse. Määramata seaded
jäävad kogutud malli väärtustele; need ei ole tingimata tehaseseaded.

Põhiseadete kirjutamise lubatud kombinatsioonid:
A BB Pre: Drive2,Level2,Mix25; B T808 OD: Drive2,Tone7,Level2,Mix25;
C Rat Distortion: Level2,Mix25; D Zen Master: Drive2,Tone7,Level2,Mix25;
C Zen Master: varasem Drive2/8,Tone3/7,Level2/5,Mix25/100.
Teistele tüüpidele/kanalitele saab kopeerida ainult täieliku kogutud malli,
mitte määrata veel kinnitamata põhiseadeid. BB Pre ja Rat Distortion Tone
on keelatud; C Rat Drive2 kirjutamine pole eraldatud katsena tõendatud.
Stseenid, bypass, muud plokid ja päised säilivad alusfailist.

scripts/test-drive-multi.mjs: kõik87 malli kõigis4 kanalis (348 kombinatsiooni)
läbivad offline kirjutamise ja täpse sõnavõrdluse;13 sõltumatu riistvarakatse
põhiseademuudatust taastuvad kogu body ulatuses;10 keelatud sisendit tõkestatud.
Vanem ülddekooder ei tunne mõnda Drive tüüpi (nt ID86); multi kasutab pärast
kirjutamist olemasolevat drive-collector/inspectStructure kontrolli (kaadrid,
7-bit,checksum,CRC,footer) ning täpset kogu body võrdlust tuntud malliga.
Seda ei tohi nimetada kõigi nimede ülddekooderi kontrolliks ega kõigi348
kombinatsiooni seadmeimpordi kinnituseks. Vana Zen Master C profiil säilib.

examples/FM3_DRIVE_ABCD_TEST.syx (+txt/spec/validation) on valmis test,
originaalse JB põhjal A BB Pre Drive2 Level2 Mix25, B T808 OD Drive2 Tone7
Level2 Mix25, C Rat Distortion Level2 Mix25 (Drive mallist), D Zen Master
Drive2 Tone7 Level2 Mix25. MITME KANALI KONTROLLIMPORT OOTEL.
Palu importida, kontrollida A–D väärtused ja eksportida terve
FM3_DRIVE_ABCD_TEST_export.syx. Kanalite vaatamine võib muuta aktiivse stseeni
Drive-kanali D-ks; raporteeri see tegelik erinevus eraldi, ära normaliseeri ära.
Kogujat uuesti pole vaja. Pärast edukat tagasieksporti jätka Delay/Reverb plaani.

## Drive kontrollsessioon lõpetatud — 0.36.4, 2026-10-06

references/drive-controls-20261006-123230: kõik21 kavandatud sammu lõpetatud.
18 sõltumatult uuesti kontrollitud GET/SYX paari (igaühes176/176 sõna),
13 eraldatud põhiseade muudatust. Neli tüübi/kanali katset: A BB Pre (ID19),
B T808 OD (ID6), C Rat Distortion (ID0), D Zen Master (ID26).
Kõigil paaridel terviklus korras; ainult kavandatud body-muudatused, nimemuutused
eraldi raportis. Varasem failed A-type on ajalooline nimemuutuse tõke enne GET-i,
mitte uus viga; õnnestunud kordus on olemas.

Kolm vahelejätmist: A BB Pre Tone puudub; C Rat Distortion Tone puudub;
C Drive oli juba2.00. Kasutaja kinnitatud puuduvat Tone'i ei tohi asendada
Bassi/Treble'i/Filteriga ega toore pid2 kirjutamisega. Rat Drive'i samaks
jätmine ei ole eraldatud muudatuse tõend.

Tõendatud sihtväärtused: Drive2 raw13107 A/B/D, Tone7 raw45874 B/D,
Level2 raw13107 A/B/C/D, Mix25 raw16384 A/B/C/D. Kõik13 vastavad
round(value/10*65534) või Mixil round(percent/100*65534). See ei kinnita kogu
pidevat väärtusvahemikku ega sama UI-parameetrit kõigil87 tüübil.
Raport ../../docs/FM3_DRIVE_CONTROL_SESSION_123230.json;
regressioon scripts/test-drive-control-session.mjs.
Kogujat pole vaja uuesti läbi teha. Järgmine töö on olemasoleva87 tüübi kogu
ja selle sessiooni tõendite rakendamine tüübipõhiste piirangutega generaatoris,
seejärel mitme kanali loodud testpreseti kontrollimport. Praegune generaator
on endiselt piiratud Zen Master C-ga; see väljaanne salvestab tõendid ega
väida uut üldist kirjutustuge. Delay/Reverb järgneb Drive kirjutustoe etapile.

## Kontrollkoguja nimemuutuse parandus — 0.36.3, 2026-10-06

Esimene Maci sessioon references/drive-controls-20261006-120225:
algseis GET/SYX176/176 kinnitatud, kogu body säilib. A BB Pre katse SYX
terve; ainult17 Drive A body-baiti muutusid. Preseti päisenimi muutus
JB YDOM RHYTHM → 00_BASELINE; vana koguja peatus enne GET-i. Seega A BB Pre
katse ei ole veel GET/SYX paarina kinnitatud ja seda peab jätkamisel kordama.
Koguja0.1.1 raporteerib ainult nimebaidid8..38 eraldi presetNameChange väljal,
sealhulgas mõlemad täpsed hex-jadad; ülejäänud päis peab säilima (CRC erand).
Body kõrvalmuudatuste piirang ei muutunud. Plaan ja sessiooniversioon säilivad;
olemasoleva sessiooni edukat algseisu ei korrata. Täisparandatud pakett asendab
Downloads/FM3_DRIVE_CONTROLS kausta sisu, Documents sessioon tuleb alles hoida.

## Jätkatav Drive kontrollkoguja — 0.36.2, 2026-10-06

scripts/drive-control-collector/FM3_DRIVE_CONTROLS.py juhendab21 sammu:
algseis, A BB Pre / B T808 OD / C Rat Distortion / D Zen Master ning igaühel
eraldi Drive2,Tone7,Level2,Mix25. Kasutaja muudab FM3-Editis, ekspordib terve
SYX ja kinnitab ühe GET-i pärast Editi sulgemist. SET/Save/Store pole olemas.
Koguja võrdleb iga muudatust eelmise eduka katsega, kontrollib täielikku
SYX terviklust ning kõigi176 Drive-sõna vastavust GET-vastusele.
Tüübivalikul on lubatud ainult sihtkanali44 sõna ja aktiivse stseeni Drive-kanal;
põhiseadmel ainult selle üks uint16. Kõik tegelikud erinevused raporteeritakse.
Kontrollväärtuse teisendus on hüpotees: vastavus raporteeritakse, mitte ei
muudeta erinevat tulemust automaatselt õigeks. Ekraaniväärtus on kasutaja kinnitus.
q annab ZIP-i; jätkamine kontrollib edukaid paare uuesti. s koos põhjendusega
lubab puuduva/juba-sama põhiseade vahele jätta, kuid ei lisa valideeritud tõendit.
Andmed ~/Documents/FM3_DRIVE_CONTROLS_SESSION. Jätkamisel impordi viimane
edukas SYX, mille skript näitab. Ka ebaõnnestunud katsed säilivad ZIP-is.
LOE_MIND.txt sisaldab käivitamist. Offline testid:21 sammu, kõrvalmuudatuste ja
muutuseta katse tõkestus, sünteetiline176-sõnaline paar, korduva GET-i tõkestus,
uue sessiooni loomine/jätkamine/q ZIP. Uue koguja Maci töövoog veel kontrollimata.
Ära väida selle põhjal kõigi87 tüübi või kõigi põhiseadete kirjutustuge.

## Drive kontrollimport kinnitatud — 0.36.1, 2026-10-06

Kasutaja FM3_DRIVE_GENERATED_TEST_export.syx läbib täieliku tervikluskontrolli.
Kõik 14222 lahtipakitud body-baiti on genereeritud testiga identsed, ilma
normaliseerimiseta. Drive1 C kõik44 sõna säilivad: Zen Master, Drive2.00,
Tone7.00, Level2.00, Mix25%. Ka stseenid, kanalivalikud ja bypass säilivad.
Tõend examples/FM3_DRIVE_GENERATED_TEST_export.syx; raport
../../docs/FM3_DRIVE_HARDWARE_ROUNDTRIP.json; test scripts/test-drive-hardware.mjs.
See kinnitab konkreetse Zen Master C testpreseti seadme kaudu tagasiekspordi.
Heli pole hinnatud; kõigi87 tüübi ja kõigi kanalite kirjutustuge see ei tõenda.
Seda kontrollimporti ei ole vaja korrata. Järgmisena laienda Drive'i tüübi- ja
kanalituge olemasoleva87 tüübi GET/SYX kogu põhjal, seejärel Delay/Reverb.
Allpool olevad importi ootavad märkused kirjeldavad eelmist versiooni.

## Mix kontrollitud ja piiratud Drive generaator — 0.36.0, 2026-10-06

FM3_DRIVE_C_MIX_25.syx: ainult8644/8645 muutuvad, raw65534→16384.
Kõik muu säilib. Mix100% kuvatõmmisega ja25% üksikkatsega kinnitatud;
round(percent/100*65534) sobib. Raport ../../docs/FM3_DRIVE_MIX_25.json.
Drive/Tone/Level/Mix tõendid on references/drive-controls.87 tüübi kogu valmis.

scripts/fm3-drive.mjs on ühendatud generatePreset'i ja skeemiga profiilina
jb-drive-c. Praegu AINULT Zen Master kanal C; Drive2/8,Tone3/7,Level2/5,
Mix25/100. Lubatud originaalne JB_YDOM_RHYTHM.syx või viimane kogutud donor
SHA9515045ce201c745fba804c8d3d4f191bd1ea69967ab9a4e187ec1e06c825e12.
Type-valik kopeerib täieliku44-sõnalise kogutud kanali; määramata põhiseaded
jäävad selle malli väärtustele, mitte eelmise tüübi omadele. Muud kanalid,
stseenid,bypass ja päised säilivad. Teiste86 tüübi kirjutustuge ei lubata veel.
Testid: sõltumatu Mix25 ekspordi KOGU body täpne taastamine; tüübi asendamine
algse JB C kanalis;9 keelatud sisendit; senise generaatori regressioonid läbivad.

examples/FM3_DRIVE_GENERATED_TEST.syx (+txt/spec/validation) on loodud
algse JB preseti põhjal: Drive1 C Zen Master,Drive2.00,Tone7.00,Level2.00,
Mix25%. Valitud stseen ja bypass säilivad; kasutaja peab vaatamiseks valima
Drive1 kanali C. See UI-valik võib muuta praeguse stseeni Drive-kanalit;
tagasiekspordis raporteeri seda eraldi, ära normaliseeri seda vaikimisi ära.
SEADMEIMPORT OOTEL. Palu importida testpreset, kontrollida need5 välja ning
eksportida terve FM3_DRIVE_GENERATED_TEST_export.syx siia. Helikatse pole
selle tehnilise kontrolli eesmärk. Ära väida Drive-etappi täielikult valmis
enne kontrollimporti. Seejärel laienda tõendipõhiselt tüübi/kanalituge ning
jätka algset Delay/Reverb plaani. Allpool Mixi ootamine on ajalooline.

## Level2.00 kontrollitud — 0.35.5, 2026-10-06

FM3_DRIVE_C_LEVEL_2.syx võrreldes Tone3.00 failiga: ainult body8642/8643
muutuvad; C parameeter3 uint16 32767→13107. Drive8.00,Tone3.00,Mix100%
ja kõik muud body-baidid säilivad. Mõlemad terved presetid läbivad inspect.
Level5.00 on eelneva kuvatõmmisega kinnitatud, Level2.00 käesoleva üksikkatsega;
mõlemad vastavad round(value/10*65534). Ühikut ei kuvata; ära märgi dB.
Tõend references/drive-controls/FM3_DRIVE_C_LEVEL_2.syx; raport
../../docs/FM3_DRIVE_LEVEL_2.json; test scripts/test-drive-controls.mjs.

Järgmine üksik katse: sama Drive1 C Zen Master, muuda ainult Mix100%→25%.
Drive8.00,Tone3.00,Level2.00 ja muu säilita. Terve eksport
FM3_DRIVE_C_MIX_25.syx siia; Terminali pole vaja. Mix100% on kuvatõmmise
ja lähte-SYX raw65534 kaudu kinnitatud. Pärast Mixi kontrolli valmista
piiratud generaatoritugi ning kontrollimport/tagasieksport. Ära korda
Leveli punkte ilma uue konkreetse põhjuseta;5.00 ja2.00 on olemas.
Kirjutustugi pole veel lisatud. Allpool Level2.00 ootamine on ajalooline.

## Tone3.00 ja Leveli ekraaninäit kontrollitud — 0.35.4, 2026-10-06

FM3_DRIVE_C_TONE_3.syx muudab Tone7.00 failiga võrreldes ainult8640/8641:
45874→19660. Tone punktid7.00 ja3.00 sobivad round(value/10*65534) valemiga.
Kõik muud body-baidid säilivad; terved presetid läbivad inspect.
Kasutaja kuvatõmmis zen-master-tone3-level5.png kinnitab Drive1 C Zen Master:
Drive8.00,Voice5.00,Tone3.00,Mix100.0%,Level5.00 (ühikut ei kuvata),Balance0.0.
Ära nimeta Level5.00 väärtust dB-ks. Leveli uint16 on32767; muutmiskatse on ootel.
Tõendid references/drive-controls; raport ../../docs/FM3_DRIVE_TONE_3.json;
kõik kontrollid scripts/test-drive-controls.mjs. Pilt taastati manuse file_id kaudu.

Järgmine üksik katse: sama Drive1 C Zen Master, muuda ainult Level5.00→2.00.
Drive8.00,Tone3.00,Mix100.0% ja muu säilita. Terve eksport
FM3_DRIVE_C_LEVEL_2.syx siia; Terminali kogujat ei kasutata. Seejärel kinnita
Level teise punktiga ja Mix eraldi. Generaatori Drive-kirjutustugi on endiselt
lisamata; mudelikogu87/87 on valmis. Allpool Tone3.00 ja Leveli pildi ootamine
on ajalooline.

## Drive C Tone7.00 kontrollitud — 0.35.3, 2026-10-06

FM3_DRIVE_C_TONE_7.syx võrdlus Drive8.00 failiga: ainult body8640/8641
muutuvad, C parameeter2 uint16 32767→45874. Drive8.00 raw52427 ja kõik muud
body-baidid säilivad. Terved presetid läbivad inspect. Tone7.00 sobib
round(value/10*65534) valemiga; üks määratud Tone-punkt on kinnitatud.
Tõend references/drive-controls/FM3_DRIVE_C_TONE_7.syx; raport
../../docs/FM3_DRIVE_TONE_7.json; test scripts/test-drive-controls.mjs.
Järgmine: sama Drive1 C Zen Master, Drive8.00 säilib; muuda ainult
Tone7.00→3.00 ja ekspordi terve FM3_DRIVE_C_TONE_3.syx. Palu kirjutada ka
praegune Leveli ekraaninäit koos ühikuga (või kuvatõmmis), Levelit veel
muutmata, et järgmine Level-katse oleks õige skaalaga. Terminali pole vaja.
Level/Mix ja generaatori kirjutustugi on endiselt kontrollimata.
Allpool Tone7.00 ootamine on ajalooline.

## Drive C väärtused2.00 ja8.00 kontrollitud — 0.35.2, 2026-10-06

FM3_DRIVE_C_DRIVE_8.syx võrdlus Drive2.00 failiga: ainult body8638/8639
muutuvad, uint16 13107→52427. Mõlemad punktid vastavad valemile
round(value/10*65534). Ülejäänud14220 body-baiti säilivad, mõlemad terved
presetid läbivad inspect. Katse on Zen Master kanal C kohta; teiste
mudelite/kanalite ja genereeritud preseti seadmeimport on veel katsetamata.
Tõend references/drive-controls/FM3_DRIVE_C_DRIVE_8.syx; raport
../../docs/FM3_DRIVE_CONTROL_8.json; test scripts/test-drive-controls.mjs.
Järgmine katse: sama preset, Drive1 C Zen Master; jäta Drive8.00 ning
muuda ainult Tone7.00. Ekspordi terve FM3_DRIVE_C_TONE_7.syx ja saada siia.
Level/Mix/Type ja muu säilita; Terminali kogujat ei kasutata.
Drive generaatori kirjutustuge pole veel lisatud. Allpool8.00 ootamine on ajalooline.

## Drive C väärtus2.00 kontrollitud — 0.35.1, 2026-10-06

FM3_DRIVE_C_DRIVE_2.syx võrdlus viimase kogutud donoriga: muutuvad ainult
body-baidid8638/8639 (C parameeter1), uint16 32767→13107. Kõik muud14220
body-baiti, sealhulgas stseenivalikud ja Type26 Zen Master, säilivad.
Mõlemad terved presetid läbivad inspect-kontrolli. Tõend
references/drive-controls/FM3_DRIVE_C_DRIVE_2.syx; raport
../../docs/FM3_DRIVE_CONTROL_2.json; test scripts/test-drive-controls.mjs.
Üks kasutaja määratud väärtus2.00 on tõendatud. Skaala täielik vastendus
ja generaatori seadmeimport pole veel kinnitatud; ära väida kirjutustuge valmis.
Järgmine üksik katse: praegune sama preset, Drive1 C Zen Master, muuda
ainult Drive2.00→8.00; ekspordi terve FM3_DRIVE_C_DRIVE_8.syx ja saada siia.
Ära muuda Type,Tone,Level,Mix ega muid sätteid. Terminali kogujat pole vaja.
Pärast teist Drive-punkti jätka Tone/Level/Mix sõltumatute katsetega.
Allpool esimese Drive2.00 katse ootamine on ajalooline.

## Drive tüüpide kogumine valmis — 0.35.0, 2026-10-06

FM3_DRIVE_BATCH_20261006T112254_3e25f6e2.zip:22 GET/SYX paari, igas176/176
sõna kattuvad;87/87 kasutaja kinnitatud Type-nime ja87 unikaalset binaarset
ID-d. Vigaseid katseid pole. Kõigi donorite mitte-Drive body on säilinud.
Kogutud täielikud44-sõnalised kanaliseadistused references/drive-library.json;
allikad references/drive-batch-20261006-112254; raport
../../docs/FM3_DRIVE_BATCH_20261006_112254.json. Taastatav ehitaja
scripts/build-drive-library.mjs kontrollib toorvastused ja donorid uuesti.
Need on kogutud kanaliseadistused, mitte tõendatud tehasevaikeväärtused.
Ära palu tüüpe uuesti koguda. Koguja muutmist või uut allalaadimist pole vaja.

Järgmine töö: kontrollitud Drive/Tone/Level/Mix muutmine, seejärel generaatori
Drive-tüübi ja kanalite tugi ning seadmeimport/tagasieksport. Praegu Drive'i
kirjutustuge generaatorisse EI lisatud. Eriti Leveli skaalat/ühikut ära tuleta
kataloogi üldisest0–10 tõlgendusest; vaja sõltumatuid FM3-Editi väärtuskatseid.

Esimene väärtuskatse kasutab viimase kogutud preseti seisundit:
capture-20261006T112247-72000d0f64/donor.syx, SHA256
9515045ce201c745fba804c8d3d4f191bd1ea69967ab9a4e187ec1e06c825e12.
Drive1 kanal C = Zen Master (ID26), esimese viie sõna väärtused
[26,32767,32767,32767,65534]. Palu muuta ainult C Drive väärtuseks2.00,
jätta Type/Tone/Level/Mix ja muu samaks, eksportida TERVE preset
FM3_DRIVE_C_DRIVE_2.syx ning saata siia. Ära kasuta tüüpide koguja programmi
selle parameetrikatse jaoks; SYX võrdlus on järgmine samm. Kanali valimisega
kaasnev stseeni Drive-kanali valik tuleb raporteerida eraldi. Tooreid SET-e ei saadeta.
Pärast Drive'i katseid kinnita Tone,Level,Mix eraldi, ühe parameetri kaupa.
Seejärel jätka algset plaani Delay/Reverb, hiljem Compressor/Chorus/Phaser/Flanger.
Allpool osalise kogumise edenemise märkmed on ajaloolised.

## Drive koguja Maci-katse kinnitatud — 0.34.5, 2026-10-06

FM3_DRIVE_BATCH_20261006T110109_9c628a88.zip sisaldab kahte kehtivat
GET/SYX paari:8/87 tüüpi kinnitatud,79 kogumata. Teine nelik kattub176/176,
mitte-Drive body säilib. Nimevalikud on kasutaja kinnitatud:
05 Bender Fuzz ID18;06 Bit Crusher ID22;07 Blackglass 7K ID36;08 Blues OD ID15.
Raport docs/FM3_DRIVE_BATCH_20261006_110109.json ja tõendid
references/drive-batch-20261006-110109. Koguja esimene uus Maci nelik läbis.
Kasutaja võib sama koguja ja ~/Documents/FM3_DRIVE_SESSION kaustaga
järjest jätkata; uut paketti pole vaja. Järgmine A09 Bosom Boost,
B10 Box o' Crunch,C11 Colortone Booster,D12 Colortone OD. Iga neliku järel
176/176 kontroll; q ekspordib senise seansi. ZIP võib saata pausi ajal või
lõpus, iga neliku järel pole tarvis. Säilita seansi kaust. Drive parameetrite
kirjutustugi vajab endiselt eraldi katseid. Allpool4/87 ja esimese Maci
katse ootamine on ajaloolised. Varasem105923 ZIP sisaldas ainult seed'i.

## Drive esimene GET/SYX paar kinnitatud — 0.34.4, 2026-10-06

Kasutaja FM3_DRIVE_SEED_RESULT_20261006_075214_455734.zip toorvastus
on sõltumatult dekodeeritud: üks GET, 176/176 sõna kattuvad tervikliku
SYX-iga; kaadrite kontrollsummad korras. Drive1 effectId118, 4×44 sõna.
A='77 Custom OD ID78; B=Angry Chuck ID79; C=BB Pre ID19; D=BB Pre AT ID61.
Tõendid scripts/drive-collector/seed/capture-001; raport docs/FM3_DRIVE_SEED_VERIFIED.json.

Jätkatav koguja scripts/drive-collector/FM3_DRIVE_BATCH.py kasutab kinnitatud
nelikut algseisuna. 87 nimest on4 kinnitatud,83 veel kogumata. Järgmine
nelik A05 Bender Fuzz / B06 Bit Crusher / C07 Blackglass 7K / D08 Blues OD.
Kohalikud paari, vigaste andmete ja jätkamise testid läbisid. Uue koguja
esimene Maci nelik on OOTEL: palu selle järel q ja tulemus-ZIP vestlusse.
Ära küsi seed-GET-i ega esimese neliku SYX-i uuesti. Koguja muudab ainult
kohalikke faile; iga GET nõuab kasutaja kinnitust ja FM3-Editi sulgemist.
Uute nimede/ID seos põhineb kasutaja kinnitatud Type-valikutel; kuvanumber
pole ID. Täielikud GET/SYX kanalid peavad kattuma ning mitte-Drive body
peab säilima. Scene Drive-kanali valik registreeritakse, seda ei kanta
kanalimallidesse. Seansi kausta säilitatakse ja jätkatakse sama käsuga.
Drive/Tone/Level/Mix kirjutus ja muud tüübid pole veel valideeritud.
Allpool olev esimese GET-i ootamise märge on ajalooline.

## Drive esimese neliku SYX kontroll — 0.34.3, 2026-10-06

FM3_DRIVE_SELECTION_001.syx läbis kontrolli. 54 erinevat body-baiti
piirduvad Drive-plokiga: Scene2 Drive-kanal D ning nelja kanali parameetrid.
Esialgne SYX-paigutus: effectId118, header8414, andmed8460, 4×44 uint16.
A/B/C/D Type ID kandidaadid78/79/19/61. Need pole veel GET-iga kinnitatud.
Ühekordne kontrollpakett scripts/drive-seed: kasutaja kinnitab GET; üks
päring, ei SET/SAVE-käske ega automaatset kordust. Tulemus-ZIP sisaldab
toorest vastust, kontrollraportit ja lähte-SYX-i ka vea korral. Kohalikud
sünteetilised dekodeerimis- ja pseudoterminalitestid läbivad; füüsiline
Drive GET on OOTEL. Järgmine samm: kasutaja käivitab paketi ning saadab
FM3_DRIVE_SEED_RESULT_*.zip. Ära küsi uuesti Type-kuvatõmmist ega sama
neliku eksporti. Alles eduka GET/SYX paari järel arenda jätkatav koguja.
Drive/Tone/Level/Mix kirjutustugi on endiselt kinnitamata.

## Drive loend vastu võetud — 0.34.2, 2026-10-06

Kasutaja täielik FM3-Editi Type kuvatõmmis sisaldab87 Drive-tüüpi.
Loend ja algpilt: references/drive-capture/drive-roster.json ja
references/drive-capture/drive-type-list.png. Kõik87 nime/kuvanumbrit on
transkribeeritud; binaryId on null kuni sõltumatu GET/SYX kinnituseni.
Ära eelda displayNumber-1 vastendust (loend on nimejärjestuses).
See EI OLE veel kogutud87 kanalimalli ega valmis Drive-koguja/kirjutustugi.

Järgmine ettevalmistav katse: kasuta viimast kinnitatud
JB_RHYTHM_SOLO_GENERATED_export.syx seisundit (kasutaja algfailinimes oli
kaks punkti enne syx-i). Drive A=01 '77 Custom OD; B=02 Angry Chuck;
C=03 BB Pre; D=04 BB Pre AT. Muuda igas kanalis ainult Type-valikut;
tüübivahetuse automaatseid parameetrimuudatusi ära taasta ega muuda käsitsi.
Muud plokid ja stseeniseaded säilita. Terve eksport FM3_DRIVE_SELECTION_001.syx.
See SYX annab esialgse paigutuse/ID-võrdluse. Valmista seejärel piiratud
ühekordse kasutaja kinnitatud GET-i tööriist ja võrdle täiskanalite andmeid.
Ainult pärast esimese paari valideerimist kasuta jätkatavat nelikute koguja
töövoogu. Drive/Tone/Level/Mix kirjutus vajab oma sõltumatuid väärtuskatseid.
Ära saada ega soovita tooreid SET-käske; esimese katse käigus pole GET-i veel
tehtud. Kasutaja kuvatõmmis üksi ei kinnita binaarseid ID-sid ega paigutust.


## JB rütm/soolo kontrollimport kinnitatud — 0.34.1, 2026-10-06

Kasutaja tagasieksport JB_RHYTHM_SOLO_GENERATED_export..syx on paketi
examples/JB_RHYTHM_SOLO_GENERATED_export.syx all (sisu muutmata).
Kõik14222 body-baiti kattuvad generaatori JB_RHYTHM_SOLO_GENERATED.syx-iga,
ka offset0. Kaadrid/7-bit/kontrollsummad/CRC/footer läbivad, dump-päis sama;
raw-päises erinevad ainult CRC-baidid4/5. Terved SYX-id ei ole baitidentsed.
Raport ../../docs/FM3_JB_HARDWARE_ROUNDTRIP.json sisaldab mõlema SHA256.
Scene2 Amp B/Reverb B/Delay bypass/Phaser bypass; Scene6 JB SOLO/Amp C/
Reverb D/Delay sees/Phaser bypass säilisid. Selle täpse kombinatsiooni
seadmeimport ja tagasieksport on kinnitatud. Ära palu sama katset korrata.
Heli, tasemed ja CPU on eraldi hindamata; soolo pole lõplikult häälestatud.
See tõendab piiratud kahe stseeni tehnilist alust, mitte üldist kõigi
stseenide/plokkide/baaside kirjutustuge. Amp C jaguneb endiselt3/6/7 vahel.

Jätka kasutaja plaani teise etapiga: Drive tüübid ja Drive/Tone/Level/Mix
GET/SYX kontrollitud kogumine. Esmalt küsi praeguse firmware13 FM3-Editi
Drive Type loendi kuvatõmmist (vajadusel loendi ülejäänud osad). Olemasolev
kontrollitud tagasieksport saab olla kogumise lähtefail, kuid Drive ploki
GET/SYX vastendus ning transpordi/paigutuse kontroll tuleb enne koguja
kasutamist ette valmistada. Ära väida Drive kogujat või kirjutustuge juba
valmis olevaks. Säilita nõue üks kasutaja kinnitatud GET; ära saada SET-i.
Seejärel plaanis Delay/Reverb tüübid ja kanaliseaded ning muud efektid.
Allpool0.34.0 selle kombinatsiooni kontrollimpordi ootamine on ajalooline.


## Scene 6 Amp-kanal — 0.34.0, 2026-10-06

JB-profiili uus ampScene6 toetab kinnitatud B/C valikut. Kirjutatakse ainult
body4630; Amp-kanalite sisu ei muudeta. Scene2 jääb B-le. Amp C-d kasutavad
nüüd stseenid3/6/7: kanali C hilisem häälestamine mõjutab kõiki kolme.
Kasutaja JB_SCENE6_AMP_C.syx erineb eelmisest Reverb D/Delay ON ekspordist
ainult4630:1->2. Kaadrid/CRC/footer korras, muud body-baidid säilivad.
Tõend docs/FM3_JB_AMP_SCENE_COMPARISON.json.

Näidis examples/JB_RHYTHM_SOLO_GENERATED.spec.json ja .syx/.txt/.validation.json
ühendab Scene6 nime JB SOLO, Phaser bypass'i, Reverb D, Delay sees ja Amp C.
Scene2 rütm jääb muutmata. Valitud stseen2 säilib; kogu14222 body erineb
kasutaja ekspordist ainult valikubaidil0:1 vs5. Faili ise pole veel imporditud.
Test-jb-amp-scene.mjs kinnitab võrdluse, B/C isolatsiooni,5 vigase valiku
keelu ja Amp-kanalite sisu säilimise; varasemad JB testid läbivad.
See pole veel valmis Bonamassa soolosound ega üldine kõigi stseenide tugi.

Järgmine praktiline samm: impordi JB_RHYTHM_SOLO_GENERATED.syx FM3-Editis
senist tööd/presetikohta säilitades. Kontrolli Scene2 Amp B/Reverb B/Delay
bypass ning Scene6 JB SOLO/Amp C/Reverb D/Delay sees/Phaser bypass.
Ekspordi terve preset JB_RHYTHM_SOLO_GENERATED_export.syx. Võrdle kogu body,
päiseid ja kõiki kontrollsummasid. Varasemaid käsitsi muutmise katseid ära korda.
Pärast importi jätka kasutaja plaaniga: sobivad kanalisätted, seejärel Drive
GET/SYX kogumine ning Delay/Reverb tüübid; ära märgi neid etappe lõpetatuks.


## Scene 6 Reverb/Delay tugi — 0.33.0, 2026-10-06

JB-profiil toetab nüüd reverbScene6:"A" või "D" ning delayScene6Bypass:
true=bypass, false=sees. Algne SHA-kontrollitud JB_YDOM_RHYTHM.syx alus ning
varasemad scene6Name/phaserScene6Bypass väljad säilivad. Muudetakse ainult
vastavaid välju: Reverb kanal9538, Delay bypass7382. Scene2 ja kõik määramata
seaded, sealhulgas valitud stseen2, säilivad. Reverb B/C valikut selles uues
väljas ei toetata; Delay tüüp/kanal/parameetrid pole selle katsega laiendatud.

Sõltumatu JB_SCENE6_REVERB_D_DELAY_ON.syx erineb JB_SCENE2_SELECTED-st ainult
body0:1->5 (valitud stseen),7382:1->0 (Delay sees),9538:0->3 (Reverb D).
Kaadrid/CRC/footer korras. Näidis examples/JB_SOLO_FX_GENERATED.spec.json
ja .syx/.txt/.validation.json genereerib kõik need Scene6 efektiseaded koos
JB SOLO nime ja Phaser bypass'iga. Selle body erineb sõltumatust ekspordist
ainult0: valitud stseen2 säilitatud. Tervet SYX-i ära nimeta baitidentseks.
Uut genereeritud faili pole eraldi imporditud ega heli/CPU hinnatud.

Testid: test-jb-reverb-delay.mjs (võrdlus,4 isolatsiooni- ja8 vigast juhtu),
test-jb-scenes.mjs ja vana test-generate.mjs läbivad. Võrdlusraport
../../docs/FM3_JB_REVERB_DELAY_COMPARISON.json. Varasemad märkmed ainult kahe
JB-juhtseadise kohta on ajaloolised; vana Baaspreset-haru ei laiene.

Järgmine esimese etapi kontroll: sama kasutaja JB_SCENE6_REVERB_D_DELAY_ON.syx,
Scene6 Amp kanal B->C, muu säilita; terve eksport JB_SCENE6_AMP_C.syx.
See eraldab soolo võimendikanali rütmi Scene2 kanalist B. Olemasolev C sound
on katse, mitte veel soovitud Bonamassa sooloks häälestatud. Ära nõua juba
läbitud Reverb/Delay või stseenivaliku katse kordamist. Seejärel kontrolli
kogu body erinevusi enne Amp stseenikanali kirjutuse lisamist.


## JB Scene 6 kirjutustugi — 0.32.0, 2026-10-06

Kasuta `scripts/fm3-generate.mjs` uut profiili `baseProfile: "jb-ydom-rhythm"`
ainult muutmata `examples/JB_YDOM_RHYTHM.syx` failiga. SHA256 peab olema
bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca.
Spec: schemaVersion1, firmware13, name="JB YDOM RHYTHM" ning vähemalt üks
väljadest scene6Name või phaserScene6Bypass. Nimi:1–31 prinditavat ASCII märki,
äärmiste tühikuteta; phaserScene6Bypass:true tähendab bypass, false sees.
Muudetakse ainult Scene6 nime31-baidist ala (164–194, null195 säilib) ja/või
Phaser Scene6 bypass'i (9228). Valitud Scene2, presetinimi, Phaser kanal D ning
muud baidid säilivad. JB-profiil ei aktsepteeri Amp/CAB/muid juhte ega suvalist
alusfaili. Baaspreset-põhine vana generaator ja selle piirangud säilivad.

Näidis: examples/JB_SCENE6_GENERATED.spec.json ja .syx/.txt/.validation.json.
Genereeritud JB SOLO + bypass kogu14222-baidine body kattub sõltumatu
JB_SCENE2_SELECTED.syx seadmeekspordiga; JB_SCENE6_TEST suhtes erineb ainult
valitud stseeni bait0 (1 vs5). Terved SYX-failid pole baitidentsed: pakkimine
ja kontrollsummad võivad erineda. Kaadrid/CRC/footer, kõrvalbaitide säilimine,
5 isolatsiooni/piirjuhtu ja20 vigast sisendit läbivad; vana generaatori4 faili
baitidentsed,16 juhtseadise isolatsioon,8 sõltumatut eksporti ja12 vigast
sisendit läbivad. Tõendid docs/FM3_JB_GENERATOR_TESTS.json; test-jb-scenes.mjs.

Ära nõua varasemate katsete kordamist. Selle uue genereeritud faili importi
pole eraldi tehtud; body-võrdsus on failitaseme tõend. Muud nimed on offline
kontrollitud, mitte igaüks riistvaral testitud; heli/tasemed/CPU eraldi.
Allpool ja vanades raportites olev JB kirjutustoe puudumise märkus on ajalooline.


## CAB B Bassguy riistvarakinnitus — 0.31.1, 2026-10-05

Kasutaja importis FM3_SA_TEST_CAB_BASSGUY.syx FM3-Editi kaudu FM3-sse ja kinnitas Scene2 CAB B mõlemas pesas24: 2x12 65 Bassguy („Klapivad”). Kasutaja tagasieksport FM3 SA TEST CAB BASSGUY_export.syx säilitab kõik14222 lahtipakitud body-baiti täpselt; erinevusi0, sealhulgas offset0. CAB B kõik106 sõna säilivad, pesa-ID-d24/24, stseenikanalid D/B/C/B/D/B/C/B säilivad. Mõlema faili kaadri-, CRC- ja footer-kontrollid läbivad. Terved SYX-failid ei ole baitidentsed; ära nimeta neid identseks.

Tõendid: examples/FM3_SA_TEST_CAB_BASSGUY_export.syx ja docs/FM3_CAB_BASSGUY_HARDWARE_ROUNDTRIP.json. Genereeritud SHA256 ff2a8877a2849c1260f9254648e19015762b2a47ea88ed2afeff59d5ddf34126; tagasieksport33ed3f078a1b7cf9830d0fca67e3d7c0a45d8a0c4126ef36a9651611137f1b37. Algne katse-eelne TXT/validation säilib ajaloolise artefaktina; selle konkreetse väljundi praegune staatus tuleb siinsest raportist.

CAB-generaatori integreerimise ja ühe kontrollimpordi etapp on lõpetatud. 45 malliga CAB B kirjutus on offline kontrollitud; selle Bassguy kombinatsiooni seadmeimport, küsitud valikud ja täielik tagasieksport on kinnitatud. See ei tõenda kõigi45 loodud kabinetikombinatsiooni riistvarakatset ega heli/tasemete/CPU sobivust. Neid pole hinnatud. Ära palu sama katse kordamist ega uut kogumist. Järgmine praktiline etapp on kasutaja soovitud preseti koostamine toetatud336 Amp- ja45 CAB-malli piires ning heliline kontroll; küsi soundi/loo, kitarri ja ühenduse kohta ainult olulist puuduvat infot. Piiratud alus, CAB B stseenimõju2/4/6/8, User IR/routing ja muud kirjutuspiirangud säilivad. Allpool0.31.0 kontrollimpordi ootamise juhis on ajalooline.


## CAB-generaator lisatud — 0.31.0, 2026-10-05

scripts/fm3-generate.mjs toetab nüüd valikulist cabModelB täpset nime 45-kirjelisest lookup/cab-library.json registrist. Üks spec juhib SYX/TXT/raportit. Kopeeritakse terve GET/SYX424/424 kinnitatud 106-sõnaline kanal CAB B-sse (body6066–6277), sealhulgas mõlemad pesad, mikrofonid, segu, filtrid ja tasemed. See pole pelk ID kirjutus ega universaalne tehase vaikeväärtus. Baas on endiselt SHA-kontrollitud Baaspreset.syx; firmware13. CAB B mõjutab selle baasi stseene2/4/6/8; stseeniseoseid ega CAB A/C/D sisu ei muudeta. cabModelB ja vana cabScene2 on teadlikult vastastikku välistavad. User/Legacy/Factory IR, erinevate kabinetidega pesapaarid ning eraldi mikrofoni/asendi muutmine jäävad toetamata.

Registri koostab scripts/build-cab-library.mjs lõplikust kogumissessioonist; iga allikapaari kontroll, nimed/ID-d ja päritolu on säilitatud. Generaator kontrollib registri SHA256, valitud kanali SHA256, pikkust/režiimi/pesa-ID-sid, sihtpaigutust, tervikkanali täpset tagasilugemist ning kogu body vastavust oodatule. Lerxsti ID37 üldskanneri valehäire korral ei ignoreerita suvalist veateadet: tegeliku väljundi kaadrid/CRC/footer kontrollitakse struktuurselt; CAB B peab võrduma kogu kinnitatud malliga; muude väljade tüübikontrolliks kontrollitakse eraldi koopiat algse CAB B-ga. Väljastatavaid baite ei normaliseerita. Vana inspect ja ilma cabModelB-ta tee säilivad.

Offline testid läbisid:45 sõltumatult eksporditud kanali kopeerimine CAB B-sse,45 CAB-only väljundi kõigi kõrvalbaitide säilimine,45 Amp/CAB kombinatsiooni;6 vigast uut spec-i, rikutud CAB-mall, kontrollsumma ja vale alus tõrjutakse. Vanad4 näidis-SYX-i baitidentsed;16 juhtseadise isolatsioon,8 sõltumatut Gain/Bass eksporti,12 vigast sisendit ja15 vana Amp/Cab kombinatsiooni läbivad. Testscripts test-cabs.mjs, test-generate.mjs ja test-models.mjs. Raport docs/FM3_CAB_GENERATOR_TESTS.json. Need on failitaseme tõendid, mitte riistvarakinnitus.

Järgmine samm on üks kontrollimport: examples/FM3_SA_TEST_CAB_BASSGUY.syx koos .txt, .spec.json ja .validation.json. Nimi FM3 SA TEST CAB BASSGUY; Scene2 CAB B mõlemad pesad24: 2x12 65 Bassguy, binaar-ID24. Terve mall pärineb capture-20261005T133541-cc529ee779 kanalistD. Algse baasiga võrreldes23 muutunud body-baiti, kõik CAB B-s; Amp ja muud plokid säilivad. Faili SHA256 ff2a8877a2849c1260f9254648e19015762b2a47ea88ed2afeff59d5ddf34126. See on arenduskatse, mitte uus artistisound ega valmis lavapreset.

Riistvarasamme juhenda ükshaaval: kasutaja säilitab praeguse töö, impordib FM3-Editis test-SYX-i ilma presetikohta üle kirjutamata, kontrollib Scene2 CAB B mõlemat valikut. Ära palu kabinetivalikuid käsitsi parandada enne tagasieksporti. Seejärel palu terve tagasieksport FM3_SA_TEST_CAB_BASSGUY_export.syx; võrdle kogu body, kaadreid/CRC/footerit ja raporteeri kõik erinevused, ka offset0. Heli/tasemed/CPU tuleb eraldi hinnata. Generaator ei saada MIDI/SET-käske. 336 Amp-malli säilivad. Kogumine on lõpetatud; allpool CAB kirjutuse puudumise märkmed on ajaloolised.


## CAB kogumine lõpetatud — 0.30.7, 2026-10-05

Lõplik FM3_CAB_BATCH_20261005T135600_988941b3.zip sõltumatult kontrollitud: kõik45 selle firmware13 Dyna-Cab loendi valikut on sama kabinetiga mõlema pesa kanaliseadistustega kaetud, puudu0. Kokku12 edukat GET/SYX paari (seed +11 kogumisrühma), igaüks424/424 sõna; kaadrite/7-bit/kontrollsummade, CRC/footeri, baasi piiride ning nimede/ID-de kontrollid läbivad. ZIP-is ebaõnnestunud capture-kirjeid pole. Eelmise kumulatiivse ZIP-i kõik failid säilisid baitidentselt.

Viimane capture-20261005T135558-dfcf2b9e97: A43/43 = display44 4x12 USA Mc90; B44/44 = display45 8x10 SV Bass; C41/41 ja D42/42 säilisid. Koguja0.2.2 lõpetab tõendite alusel automaatselt. Algandmed references/cab-batch-20261005-135600/; raport docs/FM3_CAB_BATCH_20261005_135600_RESULTS.json.

Ära palu uusi CAB nelikuid ega korduskogumist. Säilita kasutaja ~/Documents/FM3_CAB_SESSION ja lõplik ZIP. 45/45 tähendab kogutud Dyna-Cab valikute tõendeid selle loendi ja sama baasi kohta; see ei hõlma Legacy/Factory/User IR-e ega tähenda kõigi mikrofonide/asendite/kombinatsioonide valideerimist.

CAB-generaatori uute kanaliseadistuste kirjutust pole veel lisatud. Järgmine arendusetapp on kogutud45 kanaliseadistuse kontrollitud import registrisse ja sidumine olemasoleva SYX/TXT generaatoriga: ainult tõendatud täielik kanaliala, range sihtbaasi/kanali kontroll, muud body-baidid säilivad, väljund tagasidekodeeritakse ja kontrollsummad kontrollitakse. Seejärel üks teadlik FM3-Editi kontrollimport ja tagasieksport; heli/CPU eraldi hinnatav. Ära väida uut kirjutust ega impordi/heli kinnitust pelgalt kogumise põhjal. Tooreid SET-käske ei kasutata. 336 Amp-malli ja senine generaator säilivad. Allpool43/45 ja viimase kogumise juhised on ajaloolised.


## CAB 43/45 ja koguja0.2.2 päriskatse kinnitatud — 0.30.6

Kumulatiivne FM3_CAB_BATCH_20261005T135019_2dde6871.zip kontrollitud: 11 edukat GET/SYX paari (seed +10 nelikut), igaüks424/424, kaadrite kontrollsummad/7-bit, CRC/footer, sama baasi piirid ning nimede/ID-de vastavus korras. Ebaõnnestunud capture-kirjeid selles ZIP-is pole. Varasema kahe paari algandmed säilisid baitidentselt. 43 selle45-valikulise Dyna-Cab loendi samade pesadega kanaliseadistust kaetud, puudu2. Algandmed references/cab-batch-20261005-135019/; raport docs/FM3_CAB_BATCH_20261005_135019_RESULTS.json.

Koguja0.2.1 erandid display24 Bassguy=ID24 ja display25 Stealth=ID23 on nüüd mõlemad GET/SYX paaridega kinnitatud. Koguja0.2.2 viimane paar capture-20261005T134934-761c30e558 kinnitab A37/37 Lerxst, B40/40 Rumble EV12L, C41/41 Rumble EV12S, D42/42 Solo100; donor on kontrollitud FM3_CAB_SELECTION_011.syx-ga baitidentne. INPUT-valehäire parandus on selle päris Mac/FM3 käiguga kinnitatud. See ei ole üldise dekooderi universaalne valideerimine ega uue CAB-kirjutuse riistvaratest.

Järgmine ja viimane rühm: A44 4x12 USA Mc90 (ID43), B45 8x10 SV Bass (ID44), mõlemas kanalis mõlemad pesad sama kabinet. C ja D jäta011 seisundisse (Rumble EV12S ja Solo100), muud seaded samaks. Uus terve eksport FM3_CAB_SELECTION_012.syx. Kasuta sama koguja0.2.2, sama ~/Documents/FM3_CAB_SESSION ja kinnitatud porti /dev/cu.usbmodem211104; käsk koguja JUHEND.txt-s. Üks selgelt kinnitatud GET pärast FM3-Editi/Fractal-Boti sulgemist. Viimase paari õnnestumisel koguja lõpetab ja väljastab kumulatiivse ZIP-i automaatselt; palu see siia kontrolliks. Juhenda riistvarasamme ükshaaval, ära nõua juba kogutud valikute kordamist.

CAB-generaatori uute valikute kirjutust pole lisatud; 336 Amp-malli ja olemasolevad piirangud säilivad. Allpool varasemad koguarvud ning011 GET-i ootamise juhis on ajaloolised.


## CAB INPUT-valehäire parandus — 0.30.5

Koguja0.2.2 lahendab kasutaja FM3_CAB_SELECTION_011.syx eelkontrolli vea: üldise param-tüübiskanneri findHeader peab CAB A pesa2 ID37 väärtust offset6026 ekslikult INPUT effectId37 päiseks ja loeb sellest vale INPUT_TYPE65534. Tegelik INPUT/routing ei muutunud. Kontrollitud ekspordi body erineb valideeritud baasist ainult kaheksas kabineti-ID sõnas ja stseeni2 CAB-kanalis offset5820 A→D. Cab A37/37 Lerxst, B40/40 Rumble EV12L, C41/41 Rumble EV12S, D42/42 Solo100. Algfail references/cab-input-fix/FM3_CAB_SELECTION_011.syx; raport docs/FM3_CAB_INPUT_FIX.json.

Parandus ainult CAB-koguja koopias: inspectStructure säilitab faili pikkuse, kaadrite/7-bit/kontrollsummade, formaadi, CRC ja footeri kontrolli. Eelkontroll nõuab kõigi CAB-andmealast ja lubatud stseenikanalitest väljaspool olevate body-baitide täpset võrdsust üldkontrolli läbinud baasiga; kontrollib CAB paigutust, režiime ja stseenikanalite vahemikku. Üldine inspect ja presetigeneraatori kontrollid säilivad. GET/SYX424/424 kontroll ja transport muutmata. See on sama baasi piiratud koguja, mitte üldise dekooderi universaalne parandus.

Jätka sama FM3_CAB_SELECTION_011.syx ja sama seadme seisundiga. Paki uus FM3_CAB_COLLECTOR_0.2.2 kaust Downloads-kausta; käsk python3 ~/Downloads/FM3_CAB_COLLECTOR_0.2.2/FM3_CAB_BATCH.py --session ~/Documents/FM3_CAB_SESSION --port /dev/cu.usbmodem211104. Sama sessioon säilitab senised paarid; ära nõua korduskogumist. Koguja arvutab neliku kohalikust tõendusest. Kui nelik vastab, kasutaja sulgeb FM3-Editi/Fractal-Boti ja kinnitab ühe GET-i. Pärast edukat paari q ning kumulatiivne ZIP vestlusse. Riistvarasamme juhenda ükshaaval. Selle011 GET-i pole veel saadud; vahepealsete paaride koguarvu ära oleta.

Offline kontrollid: päris011 terviklus ja ID-d läbivad; kontrollsumma rike, Amp kõrvalmuudatus, vigane CAB-režiim ning stseenikanal tõrjutakse; seed424/424 ja neli varasemat vastenduse/jätkamise testi läbivad. Uue koguja Mac/FM3 katse ootab. CAB kirjutust generaatoris pole lisatud; 336 Amp-malli säilivad. Allpool olev007 taastamise juhis on ajalooline.


## CAB vastenduse parandus — 0.30.4

Koguja 0.2.1 parandab kaks erandit: kuvatav 24 2x12 65 Bassguy = binaar-ID24; kuvatav 25 2x12 5153 Stealth = ID23. Ära eelda nende puhul number−1 vastendust. Kasutaja FM3_CAB_SELECTION_007.syx-is on A20/20, B21/21, C22/22, D24/24; ekraanil D mõlemad 24 Bassguy. Kontrollitud ühe pesa katse FM3_CAB_ID_CHECK.syx muudab D CAB1 valiku 25 Stealth-iks: D23/24. Body erineb ainult offset6660 (24→23) ja lubatud stseeni2 CAB-kanalis offset5820 (A→D). Algfailid references/cab-id-fix/; raport docs/FM3_CAB_ID_FIX.json. Need ekspordid tõendavad vastendust, mitte veel uusi GET/SYX paare ega generaatori CAB kirjutust.

Jätka koguja0.2.1 ja SAMA ~/Documents/FM3_CAB_SESSION kaustaga. ID-põhine nimekontroll ei kasuta enam loendi indeksit ID-na. Varasemaid paare ei muudeta ega küsita uuesti. Kasutaja kohalik kogumine jõudis nelikuni21–24, kuid vahepealseid paare pole siia laaditud: ära väida nende kontrollimist ega uuendatud koguarvu. Siin kinnitatud andmestikus endiselt7 valikut. Neliku007 tõrge oli eelkontrollis enne GET-i.

Järgmine riistvarasamm ükshaaval: taasta D CAB1 valikuks24 Bassguy (CAB2 juba24); muud seaded säilita. Seejärel uus terve eksport FM3_CAB_SELECTION_007_fixed.syx, uus koguja kaust ~/Downloads/FM3_CAB_COLLECTOR_0.2.1 ja sama sessioon/port /dev/cu.usbmodem211104. Käsk ja juhised scripts/cab-collector/JUHEND.txt. Kontrolli pakutud nelikut, sulge FM3-Edit/Fractal-Bot, üks kasutaja kinnitatud GET. Pärast esimest parandatud paari424/424 palu q ja kumulatiivne ZIP kontrolliks. Ära sisesta SYX teed eraldi shelli käsuna.

Neli offline-testi läbivad: ID-de ühesus/erandid, päris007 vastuvõtt ja segapaari keeld, varasema pärissessiooni jätkamine, mõlema erand-ID jätkamise/nimekonflikti ühiktest simuleeritud paaritõendiga. Transpordi SHA256 muutmata. Koguja0.2.1 uus Maci/riistvarakatse ootab. 336 Amp-malli ja senised piirangud säilivad. Allpool0.30.3 jätkamiskäsk on ajalooline.


Vasta eesti keeles, selgelt ja praktiliselt. Riistvaraga tehtavaid tehnilisi samme juhenda ükshaaval. Põhieesmärk on kasutaja soovile vastav kasutatav kitarripreset; audit teenib seda eesmärki.

## CAB-koguja Maci-katse kinnitatud — 0.30.3

Kasutaja parandas kanali C vale kabinetivaliku. ZIP FM3_CAB_BATCH_20261005T085919_6dfba380.zip sisaldab varasemat seed-paari ja ühte uut edukat paari capture-20261005T085910-d82850c9cc. Mõlemad sõltumatult kontrollitud: toorvastuse kaadrid/kontrollsummad, 424/424 sõna, SYX CRC/footer ja lubatud muutuste piirid korras. Uues paaris A0/0, B1/1, C2/2, D3/3; nimed kasutaja kinnitatud plaani järgi 01 Tweed, 02 Princetone, 03 BF Princetone, 04 Metro Blues. Üks 10-baidine GET, vastus enne pordi sulgemist, port /dev/cu.usbmodem211104. Koguja 0.2.0 tegelik Mac/FM3 töövoog on selle paariga kinnitatud. Eelkontrolli varasem tõrge ei olnud transpordi- ega vastendusviga.

Kogutud 7 selle 45-valikulise Dyna-Cab loendi sama kabinetiga kanaliseadistust (ID0/1/2/3/25/38/39), puudu38. See ei ole veel generaatori uute CAB-valikute kirjutustugi. Algandmed: references/cab-batch-20261005-085919/; sõltumatu raport docs/FM3_CAB_BATCH_20261005_085919_RESULTS.json plugina juurest.

Jätka sama koguja0.2.0 ja sama FM3_CAB_SESSION kaustaga. Järgmine nelik: A05 1x10 SF Princetone, B06 1x12 AC20, C07 1x12 Black Magick, D08 1x12 Car Ambler. Igas kanalis mõlemad pesad samaks; muud seaded säilita. Esimese Maci-katse eraldi peatamine on nüüd lõpetatud: kasutaja võib koguda mitu nelikut järjest, q teeb kumulatiivse ZIP-i. Iga neliku SYX, eelkontroll, selge GET-kinnitus ja 424/424 paariskontroll on endiselt kohustuslikud. Ära nõua vestlusse faili ega plugina uuendust iga neliku järel. Vea korral peatu, säilita tõendid, ära korda automaatselt päringut. Allpool varasemad jätkupunktid on ajaloolised.

## Dyna-Cab loend ja juhendatud koguja — 0.30.2

Kasutaja 2026-10-05 08.44.26 kuvatõmmisel on 45 valikut 01–45. Täpsed nimed ja allikas: scripts/cab-collector/cab-roster.json. Eeldatavat ID = kuvatav number − 1 vastendust kontrollitakse iga ekspordi ja GET/SYX paariga; nimeloend üksi ei tõenda iga ID-d. Esimese kinnitatud paari B/C/D mõlema pesa kabinetid 26 Chiefman, 39 Recto Slant, 40 Recto Straight on tõendatud; A Princetone/Tweed segapaar ei ole sama kabinetiga täiskanalimall. Puudu 42 valikut, 11 nelikut.

Koguja scripts/cab-collector/FM3_CAB_BATCH.py versioon 0.2.0 pakub puuduvad nelikud, nõuab iga nimetatud kanali MÕLEMAS pesas sama kabinetti, kontrollib oodatavaid ID-sid enne GET-i, küsib nimede ja FM3-Editi sulgemise kinnitust ning saadab ühe GET-i. Nimed pole enam vabatekstina vaja igal korral sisestada. CAB stseenikanali valikud on lähteekspordis lubatud ja kontrollitud vahemikus 0–3, kuid neid ei käsitleta kanalimalli osana. Muud plokid/routing peavad säilima. Nime/ID vastuolu korral peatu ja analüüsi SYX-i; ära kirjuta kinnitamata vastendust vaikselt ümber.

Järgmine samm: kasutaja paki FM3_CAB_COLLECTOR_0.2.0.zip lahti ja käivita python3 ~/Downloads/FM3_CAB_COLLECTOR/FM3_CAB_BATCH.py --session ~/Documents/FM3_CAB_SESSION --port /dev/cu.usbmodem211104 (port selles sessioonis kasutaja kinnitatud). Esimene nelik A01 1x8 5F1 Tweed; B02 1x8 Princetone; C03 1x10 BF Princetone; D04 1x10 Metro Blues. Mõlemad pesad samaks; ülejäänud parameetreid ära muuda. Pärast esimese uue paari 424/424 kontrolli q ja ZIP vestlusse. See on uue partiiliidese esimene Maci-katse, mitte kogu töövoo juba tehtud riistvarakinnitus.

Offline testid: algse päris paari 424/424, puudu42 ja esimene nelik0/1/2/3, vale teise pesa eelkontrollist tagasilükkamine, CAB stseenikanali valiku lubamine ja kõrvalise Amp-muudatuse tõrjumine. Varasem simuleeritud transport, resume, ZIP ja kontrollsumma testid säilivad. Uut CAB kirjutust generaatorisse pole lisatud. Allpool 0.30.1 järgmise sammu nimekirjapäring on lõpetatud.

## CAB esimene paar kinnitatud — 0.30.1, 2026-10-05

Kasutaja firmware 13.00 Cab A pesa 1 muutus 01: 1x8 5F1 Tweed → 02: 1x8 Princetone. Baas- ja valikuekspordi body erineb ainult offset6024 väärtusega 0→1. Sõltumatult kontrollitud Cab GET: effectId62, 424 sõna, neli kaadrit pikkustega 12/778/514/8; kõik sõnad kattuvad valiku-SYX body alaga 5854–6701. Kanali stride on selles näites 106 sõna; Dyna-Cab pesaindeksid täiskanalist 85/86, režiim31. Dekooderi params_offset5866 ei ole GET andmeala algus. Kõik kaadri-, CRC- ja footer-kontrollid läbisid. Tõend ja algfailid: scripts/cab-collector/CAB_VALIDATION.json ning seed/capture-001 selle kõrval; baseline.syx on samas koguja kaustas.

Järgmine kasutajasamm: ava FM3-Editis CAB 1 kabinetivaliku rippmenüü ja saada kogu Dyna-Cab nimekirja kuvatõmmised (vajadusel kerides). Ära muuda valikut. Selle põhjal kinnita nimed ja kuvatavad numbrid, seejärel valmista nelikute kogumisjärjekord. Ära eelda kõigi nimede/ID-de vastendust ühe näite põhjal. Esimest paari pole vaja uuesti koguda.

scripts/cab-collector/FM3_CAB_BATCH.py on ette valmistatud kogumismootor: käsitsi valikud ja täis-SYX, range eelkontroll, üks kinnitatud GET, 424/424 kontroll, jätkatav eraldi FM3_CAB_SESSION ja ZIP. Kaasas kinnitatud seed. Offline ja pseudo-terminali katse läbis; kasutaja Maci partiikatse ning täieliku kataloogi automaatne järjekord on veel tegemata. Uut CAB kirjutust generaatoris ei ole. Senised 336 Amp-malli, generaator ja piirangud säilivad. Allpool 0.30.0 ettevalmistus on ajalooline.

## CAB-ploki valideerimise algus — 0.30.0, 2026-10-05

Kasutaja valis järgmiseks CAB-ploki: kontrolli esmalt ühe näitega andmevormingut ja kabinetivalikut, seejärel valmista sobiv kogumistöövoog. See on praegune jätkupunkt ning asendab allpool ajaloolise 0.29.28 soovituse kohe praktilise presetiga jätkata. Amp-kogumine on lõpetatud ja 336 malli säilivad.

Esimene kasutajasamm: palu avada senine kogumispreset FM3-Editis, Cab 1 kanal A ning saata kabinetivaliku lehe kuvatõmmis. Esmalt tuvasta Dyna-Cab või Legacy/Factory/User IR režiim, mõlema pesa valik ja nähtavad nimed; ära määra kontrollimata kabinetinime, ID-d ega režiimilülitust. Juhenda riistvarasamme ükshaaval. Seejärel kogu sama seisundi täielik presetieksport nimega FM3_CAB_BASELINE.syx. Järgmises sammus muudetakse ainult ühe kanali üht kabinetivalikut ja eksporditakse FM3_CAB_SELECTION_001.syx; täpsed enne/pärast nimed ning pesa ja kanal dokumenteeritakse. Säilita muu töö ning ära nõua presetikoha ülekirjutamist.

Loe [CAB valideerimise töövoogu](../../docs/FM3_CAB_VALIDATION.md). Uut CAB-valiku kirjutust ega käivitatavat CAB partiikogujat pole selle juhiseuuendusega lisatud. Senine generaatori ulatus säilib. Ära käivita Amp-kogujat Cab-andmete jaoks; ära alusta kõigi IR-ide kogumist ega vana LENGTH4 auditit.

## Amp-mallide kogumine lõpetatud — 0.29.28

Capture084 Deluxe Tweed Normal (ID331) GET/SYX paar kattub 576/576 sõna, kontrollsummad korras. Kogu kumulatiivses sessioonis 81 kinnitatud paari ja üks varasem ebaõnnestunud katse; konflikte ega tagasilükatud paare pole. Kõik 336 tuvastatud kataloogimudelit ID0–335 on nüüd tervikkanalimallidega kaetud, sealhulgas viis firmware13 uut mudelit. Uue malli genereerimine Amp B-sse kontrollitud offline: täiskanal baitidentne, muud body-baidid säilivad. Uut genereeritud kombinatsiooni pole seadmel imporditud ega kuulatud. Amp-mallide kogumine on lõpetatud: ära palu uusi nelikuid ega sama andmestiku korduskogumist. Järgmine etapp on kasutaja soovitud praktilise preseti koostamine toetatud generaatori piires ja selle FM3-Editi impordi/heli kontroll. Cab/IR binaarvaliku, routing’u ja teiste toetamata funktsioonide piirangud säilivad. Hoia kogumissessioon ja lõplik ZIP alles. [Raport](../../docs/FM3_AMP_BATCH_20261004_153604_RESULTS.json). Kõik allpool olevad kogumise jätkupunktid on ajaloolised.

## Varasem capture084 eelkontroll ja koguja — 0.29.27

Capture084 kinnitab kasutaja valiku põhjal D-kanalis Deluxe Tweed Normal ID331; A/B/C on Brit JVM Crunch Green/Orange/Red ID333/334/335. Kõik SYX tervikluse ja sama baasi kontrollid läbivad. Kataloogis 336 tuvastatud mudelit (ID0–335), kaasas 335 täiskanalimalli; ID331 mall ootab GET/SYX 576/576 kinnitust. Koguja 0.29.27 pakub puuduvast ühest mudelist hoolimata nelikut A333/B334/C335/D331, et kasutaja ei peaks ekspordi kanalijärjekorda muutma. Puudu loendur on 1, kolm JVM kanalit on juba olemas. Kasuta sama sessioonikausta, muutmata capture084 seisundit, sulge FM3-Edit ja kinnita üks GET. Automaatset korduspäringut pole; koguja lõpetab ja teeb ZIP-i pärast edukat paari. Toore SET-i ega uusi malle üksnes SYX põhjal ei lisata. [Raport](../../docs/FM3_CAPTURE084_PREFLIGHT.json).

## Varasem capture083 paariskinnitus — 0.29.26

Capture083 uus nelik on nüüd GET/SYX 576/576 kinnitatud: Brit JVM Crunch Green (333), Orange (334), Red (335), PVH 6160 Block Clean (332). Sessioonis 80 kinnitatud paari ja üks varasem ebaõnnestunud katse. Kokku 335 tuvastatud mudeli täiskanalimalli. Kõigi nelja uue malli genereerimine kontrollitud offline, muud body-baidid säilivad; uusi kombinatsioone seadmel ei imporditud ega kuulatud. Koguja 0.29.25 lõpetab praeguse kataloogi valmimisel automaatselt ja teeb ZIP-i. Järgmine samm: jäta capture083 A/B/C mudelid samaks, vali D-kanalil Deluxe Tweed Normal, ekspordi FM3_AMP_CAPTURE_084.syx ja kontrolli nime/ID vastendust enne koguja täiendamist ning uut GET-i. ID331 nime ei kinnitata ainult oletuse põhjal. Kõigi firmware13 mudelite täielikku tuge veel ei väideta. [Raport](../../docs/FM3_AMP_BATCH_20261004_152722_RESULTS.json).

## Varasem firmware 13 koguja täiendus — 0.29.25

Capture083 tuvastab A Brit JVM Crunch Green (333), B Brit JVM Crunch Orange (334), C Brit JVM Crunch Red (335), D PVH 6160 Block Clean (332). Uus koguja 0.29.25 pakub just seda järjekorda. SYX eelkontroll läbib, kuid GET/SYX pole veel esitatud: neid nelja täiskanalimalli pole kaasasolevasse registrisse lisatud. 335 tuvastatud kataloogikirjet, endiselt 331 malli, 4 kinnitatud ID-ga malli puudu. ID331 nime ei oletata; Deluxe Tweed Normal kogutakse eraldi pärast seda nelikut. Kasuta sama FM3_AMP_SESSION kausta; üks kasutaja kinnitatud GET pärast FM3-Editi sulgemist. Transpordikood muutmata. Vanad ajaloolised 331/331 ja järgmise neliku puudumise märkused ei kehti laiendatud kataloogile.

## Varasem partii — 073–082, versioon 0.29.24

Partii 073–082 lisas 37 uut mudelit ID293–330, välja arvatud varem olemas olnud ID314. Kõik 10 uut GET/SYX paari kattuvad 576/576 sõna; sessioonis 79 kinnitatud paari ja üks varasem ebaõnnestunud katse. Praeguse kataloogi kõik 331 mudelit on mallidega kaetud. Kõigi 37 uue täiskanali genereerimine on offline kontrollitud, muud body-baidid säilivad. Uusi kombinatsioone seadmel ei imporditud ega kuulatud. Järgmist nelikut praeguses kogumisplaanis pole. See ei tähenda firmware 13 täielikku mudelituge: varem ekspordis nähtud ID331 ja firmware 13 uuemate mudelite nime/ID vastendus ning GET/SYX mallid vajavad eraldi kinnitamist. Järgmine etapp on firmware 13 mudeliloendi täielikkuse kontroll, seejärel puuduvate mudelite sihitud kogumine. Ära korda juba kinnitatud kogumist. [Raport](../../docs/FM3_AMP_BATCH_20261004_151539_RESULTS.json).

## Varasem partii — 062–072, versioon 0.29.23

294 malli kaasas, praeguse 331-kirjelise kataloogi järgi 37 puudu. Partii 062–072 lisas 44 mudelit ID249–292; kõik 11 GET/SYX paari kattuvad 576/576 sõna. Sessioonis 69 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi uute täiskanalite genereerimine kontrollitud offline; uusi kombinatsioone seadmel ei imporditud ega kuulatud. ID283 õige firmware 13 nimi on Deluxe Tweed Bright. Vana koguja 0.29.17 kasutab selle kohta nime Deluxe Tweed ja sobib praeguse kogumisplaani jätkamiseks. ID331 on tuvastatud varasemas C-kanali ekspordis, kuid selle nime ja GET/SYX paari pole kinnitatud ning malli pole lisatud. 331 kirjet ei tõenda firmware 13 kõigi mudelite täielikku loendit; uuemate mudelite audit on veel vajalik. Järgmine nelik: A JMPre-1 Clean1 (293), B JMPre-1 Clean1 Bass Shift (294), C JMPre-1 Clean2 (295), D JMPre-1 Clean2 Bass Shift (296). [Raport](../../docs/FM3_AMP_BATCH_20261004_095554_RESULTS.json).

## Varasem partii — 051–061, versioon 0.29.22

2026-10-04 kell 09:21 partii lisas 44 mudelit ID205–248. Kokku 250 kaasasolevat malli, 81 puudu. Kõik 11 uut GET/SYX paari kattuvad 576/576 sõna ulatuses; kogu sessioonis 58 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi 44 täiskanali genereerimine Amp B-sse kontrollitud offline, muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261004_092114_RESULTS.json). Koguja 0.29.17 sobib edasi sama sessioonikaustaga. Järgmine nelik: A Legend 100 II (249), B Capt Hook 2B (250), C Capt Hook 3B (251), D Capt Hook 2A (252). Allpool olevad seisud on ajaloolised.

## Varasem partii — 031–050, versioon 0.29.21

2026-10-04 kell 08:57 partii lisas 80 mudelit ID125–204. Kokku 206 kaasasolevat malli, 125 puudu. Kõik 20 uut GET/SYX paari kattuvad 576/576 sõna ulatuses; kogu sessioonis 47 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi 80 täiskanali genereerimine Amp B-sse kontrollitud offline, muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261004_085736_RESULTS.json). Koguja 0.29.17 sobib edasi sama sessioonikaustaga. Järgmine nelik: A Carol-Ann Tucana Clean (205), B Brit JVM OD1 Red (206), C Brit JVM OD2 Red (207), D Cameron CCV 1B (208). Allpool olevad seisud on ajaloolised.

## Varasem partii — 021–030, versioon 0.29.20

2026-10-04 kontrollitud 2026-10-03 kell 23:20 partii lisas 40 mudelit ID85–124. Kokku 126 kaasasolevat malli, 205 puudu. Kõik kümme uut GET/SYX paari kattuvad 576/576 sõna ulatuses; kogu sessioonis 27 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi 40 täiskanali genereerimine Amp B-sse kontrollitud offline, muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261003_232027_RESULTS.json). Koguja 0.29.17 sobib edasi sama sessioonikaustaga. Järgmine nelik: A Bludojai Lead PAB (125), B Plexi 100W High (126), C Plexi 100W Normal (127), D Ruby Rocket Bright (128). Allpool olevad seisud on ajaloolised.

## Varasem partii — 017–020, versioon 0.29.19

2026-10-03 kell 22:56 saadetud partii lisas 16 mudelit ID68–84, v.a juba olemasolev ID77. Kokku 86 kaasasolevat malli, 245 puudu. Kõik neli uut GET/SYX paari kattuvad 576/576 sõna ulatuses; kogu sessioonis 17 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi 16 täiskanali genereerimine Amp B-sse kontrollitud offline, muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261003_225630_RESULTS.json). Koguja 0.29.17 sobib edasi sama sessioonikaustaga. Järgmine nelik: A Div/13 CJ (85), B Herbie CH2- (86), C Herbie CH2+ (87), D Herbie CH3 (88). Allpool olevad seisud on ajaloolised.

## Varasem partii — 013–016, versioon 0.29.18

2026-10-03 kell 22:40 saadetud partii lisas 16 mudelit ID52–67. Kokku 70 kaasasolevat malli, 261 puudu. Kõik neli uut GET/SYX paari kattuvad 576/576 sõna ulatuses; kogu sessioonis 13 kontrollitud paari, üks varasem vale pordiga ebaõnnestunud katse säilitatud ja arvestusest väljas. Kõigi 16 täiskanali genereerimine Amp B-sse kontrollitud offline, muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261003_224026_RESULTS.json). Koguja 0.29.17 sobib edasi sama sessioonikaustaga; capture016 ja ID65/67 paariskontroll on nüüd kinnitatud. Järgmine nelik: A Big Hair (68), B Solo 99 Lead (69), C Supertweed (70), D Texas Star Lead (71). Allpool olevad seisud on ajaloolised.

## Dekooderi parandus 0.29.17 — koguja

Kasutaja kogumine jõudis capture016-ni; SYX mudelid 64/65/66/67. ID65 ja 67 nimetabelist puudusid. Taastatud kokku 44 puuduvat nimetabeli kirjet olemasoleva AMP_ROSTER-i ja kataloogi üksmeelse vastenduse järgi; 331/331 nimed kontrollitud offline. [Parandusraport](../../docs/FM3_AMP_DECODER_CATALOG_FIX.json). Kasuta kohalikuks kogumiseks versiooni 0.29.17 sama sessioonikaustaga. Capture016 GET/SYX paar ja partiid 013–016 pole veel siia saadetud; neid malle ei tohi lugeda lisatuks. Kaasas endiselt 54 malli, 277 puudu. Transpordi- ja valideerimisnõuded säilivad.

## Viimane vastu võetud partii — 010–012, versioon 0.29.16

2026-10-03 partii lisas 12 mudelit ID40–51. Kokku 54 kaasasolevat malli, 277 puudu. Kõik kolm uut GET/SYX paari kattuvad 576/576 sõna ulatuses; varasemad kuus paari valideeriti uuesti, üks vale pordiga ebaõnnestunud katse säilitati ja jäeti arvestusest välja. Iga uue täiskanali genereerimine Amp B-sse on kontrollitud offline ning muud body-baidid säilivad. Genereeritud kombinatsioonide riistvara/heli/CPU kinnitust pole. [Partii raport](../../docs/FM3_AMP_BATCH_20261003_RESULTS.json). Järgmine nelik: A ODS-100 Clean (52), B ODS-100 HRM (53), C FAS Rhythm (54), D FAS Lead 1 (55). Kasutaja koguja 0.29.15 sobib edasi sama FM3_AMP_SESSION kaustaga; mudeli 46 dekooderiparandus on Macil paariskontrolliga kinnitatud. Viimati töötas port /dev/cu.usbmodem211104, kuid see võib muutuda. Allpool olevad varasemad jätkupunktid on ajaloolised.

## Viis eesmärki

1. Tunne põhjalikult Fractal FM3 Mk II Turbo Amp Modeler/FX Processori tööpõhimõtet ja võimalusi: signaaliahel, Amp/Cab/efektid, kanalid, stseenid, modifikaatorid, juhtimine, ühendused ja ressursipiirangud. Kontrolli firmware'ist sõltuvaid fakte ametlikust FM3 juhendist, Blocks Guide'ist ja väljalaskemärkmetest. Ära kanna Axe-Fx III/FM9 võimalusi automaatselt FM3-le üle.
2. Kujunda etteantud soovile võimalikult täpne sound, selgitades olulisi mudeli-, kabineti- ja efektivalikuid.
3. Kujunda etteantud artisti või loo võimalikult täpne kitarrisound. Erista salvestus/stuudio/live ja loo osad; kasuta vajadusel võrdlussalvestist ning allikakontrolli. Erista tõendatud algseadmeid oma lähendusest. Ära luba kuulamata või võrdlemata 100% identset tulemust.
4. Loo soovitusele vastav päris binaarne FM3 presetifail `.syx` ning anna toimiv allalaadimislink, kui kasutatav generaator ja selle vajalikud funktsioonid on kontrollitud. Eesmärk on FM3-Editi kaudu FM3 Mk II Turbosse imporditav ja kasutatav preset.
5. Anna presetiga koos allalaaditav UTF-8 `.txt`: eesmärk, sihtseade/firmware, kitarr ja ühendused, signaaliahel, mudelid/IR-id, olulised väärtused ühikutega, stseenid/kanalid, lülitid/expression, importimisjuhis, sõltuvused ning tegelik kontrollituse tase.

## Tegelik võimekus ja väljastamise nõuded

Seisuga 2026-10-05 on põhisisend versiooni 0.31.0 `scripts/fm3-generate.mjs`. Loe [ühtse generaatori juhend](../../docs/FM3_UNIFIED_GENERATOR.md); sisendis kasuta `scripts/fm3-spec.schema.json`. Üks selgesõnaline spec juhib SYX/TXT/raportit. Määramata seaded säilivad kaasasolevast Baaspreset.syx-ist, välja arvatud selgesõnaline ampModelB, mis asendab terve Amp B kanali malliga enne üksikparameetreid; peidetud Gain5 või katse-EQ vaikeväärtusi ei lisata. Vana `fm3-prototype/scenes/tone/time.mjs` jääb ajalooliste katsete taasesituseks, mitte uute presetite vaikimisi töövooks.

Amp/Cab-valiku puhul loe [valikujuhendit](../../docs/FM3_AMP_CAB_SELECTION.md): `ampModelB` tunneb 336 kataloogi nime, kuid kirjutuseks nõuab terviklikku kanalimalli (kaasas 336 malli: viis USA MK IV ning 331 capture001–084 ja paranduse mudelit); `cabScene2` valib ühe kolmest olemasolevast Dyna-Cab kanalist. Konkreetne näidis FM3 SA TEST MODEL CAB (Amp B USA MK IV Lead + Scene 2 Cab C RECTO STRAIGHT) on kasutaja poolt firmware 13 sessioonis imporditud ja oodatud väärtused kinnitatud; tagasieksport säilitab kõik 14222 body-baiti. Loe [riistvararaportit](../../docs/FM3_MODEL_CAB_HARDWARE_ROUNDTRIP.json). See kinnitus ei laiene teistele mudelitele/kombinatsioonidele; heli/CPU pole eraldi kinnitatud. User/Factory IR valiku nõustamine on olemas; nende pesade binaarkirjutus pole toetatud.

Kõigi võimendite laiendamisel loe [kogu kataloogi ja hulgiimpordi juhendit](../../docs/FM3_ALL_AMPS.md). Uus `scripts/fm3-amp-library.mjs` impordib sama baasi firmware 13 kanalimallid üksikfailidest või pankadest; generaatori neljas CLI argument on selle loodud register. Praegu laiendatud kataloogi 336 kirjest 336 kaasas ja 0 mallita; viis firmware 13 lisamudelit on kaasatud; ära nimeta seda kõigi mudelite valmis toeks. Mudeliloend ja täielikud mudeliseaded on eri tõendid. Tootja 384 vana tehasepreseti audit ei anna õigust neid otse uude vormingusse kopeerida.

Varasem toetatud ulatus: ainult SHA-kontrollitud Baaspreset.syx; Amp B Gain/Bass väärtused4/5/6/7, Mid/Treble/Presence/Level; Delay A Mix/Time/Feedback/TempoNONE; Reverb A Mix/Time/Pre-Delay/Pre-DelayTempoNONE; Scene2 Delay sisse-välja; Scene1 Reverb A/B. Täpsed sisendipiirid on skeemis. Aja muutmisel nõua spec-is vastava TempoNONE selgesõnalist määramist, mitte automaatset lisamist. Kõik kuuluvad firmware13 piiratud profiili.

Neli varasemat katset (G5, SCENES, TONE, TIME) on ühtse generaatoriga täielikult baitidentselt taasesitatud; 8 Gain/Bass sõltumatu ekspordi body-võrdlust läbivad samuti. 16 juhtseadise isoleeritud katsed tõendavad määramata baitide säilimist. Firmware13 kasutajakinnitused ja tagasieksportide raportid on varasemates prototüübidokumentides. See ei tõenda kõiki väärtusi/kombinatsioone ega kogu vahemikku. G5 tagasieksport oli kogu body osas identne; teistel kolmel erines ainult offset0 (1→0), tähendus endiselt kinnitamata. Seda ei tohi vaikselt ignoreerida.

Tööriist vajab Node'i ja failitöötlusega täitekeskkonda; see ei ole MCP-ühendus ega anna ligipääsu FM3-le. Kõigi Amp-mudelite täielik iseseisev genereerimine, CAB B mallidest väljapoole jäävate Cab/IR-pesade kirjutamine, plokkide lisamine/routing, teised kanalid ja üldotstarbelised artistipresetid ei ole veel toetatud. Heli, tasemed, CPU ja heliline sarnasus pole eraldi kinnitatud. Ära esita failikontrolli nende tõendina.

Loe enne SYX-arendust ja valideerimise jätkamist [SYX tegevuskava](../../docs/FM3_SYX_STRATEGY.md). Ära jätka automaatselt kogu parameetrikataloogi lugemisauditit. Esmalt hinda olemasolevat offline kodeerijat/dekodeerijat ja kasuta kaasasolevaid näidisfaile. Juhuslik baitide muutmine, tekstifaili ümbernimetamine SYX-iks ning muutmata baaspreseti esitamine uue soundina on keelatud.

Genereerimisel:
- Koosta üks masinloetav presetikirjeldus, millest lähtuvad nii SYX kui TXT. Küsi ainult olulist puuduvat infot: firmware, kitarr/helipead, ühendus/mono-stereo ning loo versioon või soundi eesmärk. Kinnitatud varasem seadistus kasuta uuesti; märgi oletused.
- Eelista tuntud FM3 aluspreseteid ja kontrollitud parameetrite kirjutamist. Kontrolli seadmeprofiili, firmware/formaatide sobivust, mudeli-ID-sid, väärtusvahemikke, ühikuid, kanaleid, stseene, routing'ut ja IR-sõltuvusi. Amp mudelivahetus võib vajada uusi vaikeväärtusi; üksnes mudeli-ID vahetamine ei tõenda täielikku korrektsust.
- Genereeri fail, dekodeeri tulemus tagasi ning võrdle nõutud seadistustega. Kontrolli kaadrite terviklust, SysEx checksum'e, preset CRC-d ja footer'it. Muutmata andmed säilita; ühtegi nõutud plokki/parameetrit ei tohi vaikselt vahele jätta.
- Erista: failitasemel kontrollitud; FM3-le imporditud ja väärtused kontrollitud; kuulatud ning võrdlussoundiga hinnatud. Failikontroll ei tõenda riistvaral töötamist ega helilist täpsust. Märgi katsetamata fail arenduskatseks, mitte valmis lavapresetiks.
- Kontrolli ressursikasutust ja tasemeid tegelikul seadmel, kui ligipääs on olemas; ära mõtle CPU-näitu välja. Väline User IR tuleb täpselt nimetada ja selle olemasolu kontrollida; preset ei pruugi IR-andmeid sisaldada.
- Väljasta ainult päriselt loodud failide toimivad lingid. Kui generaator puudub või nõutud funktsioon pole toetatud, ütle konkreetne puudujääk ja anna soundi kirjeldus/teostatav järgmine samm, väitmata et valmis SYX on loodud.

## Auditi eraldi töövoog

Senine audit on säilitatud [auditi jätkupunktis](../../docs/FM3_AUDIT_HANDOFF.md). Ava see ainult siis, kui konkreetne presetifunktsioon vajab neid tõendeid või kasutaja palub auditit jätkata. Vanad juhised on ajaloolise kontekstina failis `docs/FM3_LEGACY_INSTRUCTIONS_0.21.6.md`; need ei asenda praeguseid eesmärke ega määra automaatset järgmist sammu.

Riistvaraaudit jääb ainult GET/read-only; ära kasuta ega soovita tooreid SET-käske. Offline failide loomine on eraldi töövoog. Preseti importimine muudab seadme tööpuhvrit ning seda ei tohi nimetada read-only auditiks. Kasutaja teeb kontrollimpordi FM3-Editis teadlikult, säilitades oma töö; ära salvesta automaatselt kasutaja presetikohtade peale. Praegune eesmärkide ülevaatus ei anna luba seadme automaatseks muutmiseks.

Kasutaja kohaliku auditi repo on `/Users/multimeedia/Documents/Projects/mcp-midi-control`, branch `main`; ajalooline Node tee on `/opt/homebrew/Cellar/node@24/24.19.0/bin/node`. Kontrolli nende olemasolu/versiooni enne kasutamist. Kohalikku repot ära vaheta ega uuenda automaatselt välise projekti versiooni vastu. GET-aadressi leidmine ei tõenda presetifaili kirjutusvormingut või enum-tähendust.



## Varasemad katsed
Tõendusdokumendid: [Gain/Bass](../../docs/FM3_SYX_PROTOTYPE.md), [stseenid](../../docs/FM3_SCENE_PROTOTYPE.md), [EQ/Level/Mix](../../docs/FM3_TONE_PROTOTYPE.md), [Time/Feedback/Tempo](../../docs/FM3_TIME_PROTOTYPE.md). Nende ajaloolised vaikeväärtused ei kehti ühtse generaatori sisendile.


Capture001 lisas 59 Bassguy Bright, 65 Bassguy Normal, Vibrato Verb ja Deluxe Verb Vibrato. `lookup/amp-library.json` laetakse vaikimisi; generaatori eraldi registri argument pole nende jaoks vajalik. [Tõend](../../docs/FM3_AMP_CAPTURE_001_RESULTS.json). Donori Amp-stseenivalikud registreeritakse, kuid neid kanalimalle kopeerides kaasa ei võeta; muud kõrvalmuutused on endiselt keelatud.

## Bassguy riistvarakinnitus — 2026-10-01
Kasutaja kinnitas FM3 SA TEST BASSGUY impordi ja kõik küsitud väärtused („Kõik klapib”). Tagasieksport säilitab kõik 14222 body-baiti; kõik kaadri/CRC/footer kontrollid läbivad. Täisfail pole baitidentne. Kinnitus kehtib sellele konkreetsele 59 Bassguy Bright Amp B näidisele, mitte teistele kolmele capture001 mudelile ega kõigile kombinatsioonidele. Heli/CPU pole eraldi hinnatud. Tõend: docs/FM3_BASSGUY_HARDWARE_ROUNDTRIP.json plugina juurest. Järgmine kogumisrühm on 002: A Double Verb Vibrato, B JR Blues, C Class-A 15W TB, D Class-A 30W. Alusta algsest Baaspreset.syx-ist.

## Capture002 — praegune jätkupunkt
Lisatud Double Verb Vibrato, JR Blues, Class-A 15W TB ja Class-A 30W. Kõik neli tervikkanalit kopeeruvad Amp B-sse baitidentselt; kõik muud body-baidid säilivad. Tõend: [capture002 raport](../../docs/FM3_AMP_CAPTURE_002_RESULTS.json). Järgmine rühm on 003: A Class-A 30W TB, B Brit JM45, C Plexi 50W Normal, D Plexi 50W High 1. Kogumise ajal ei nõuta iga neliku järel uut sama kopeerimismehhanismi riistvarakatset; failikontrolli ja lähteekspordi olemasolu ei tohi siiski nimetada iga genereeritud kombinatsiooni riistvarakinnituseks. Uus vorming, kirjutusfunktsioon või kahtlane erinevus vajab sihitud kontrolli.

## Capture003 — varasem jätkupunkt (0.29.4)
Lisatud Class-A 30W TB, Brit JM45, Plexi 50W Normal ja Plexi 50W High 1. Kõik neli täiskanalit kirjutatakse Amp B-sse baitidentselt; muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_003_RESULTS.json). Järgmine rühm on 004: A 1987X Normal, B 1987X Treble, C Brit 800 2204 High, D Brit Super. Varasemad jätkupunktid on ajaloolised.

## Capture004 — varasem jätkupunkt (0.29.5)
Lisatud 1987X Normal (12), 1987X Treble (13), Brit 800 2203 High (314) ja Brit Super (15). Kanalis C oli 2203, mitte kavandatud 2204 High (14); 2204 jääb puudu ja võtab kogumisplaanis üle mudeli 314 hilisema koha. Kõik neli täiskanalit kopeeruvad Amp B-sse baitidentselt; muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_004_RESULTS.json). Dekooderi puuduva ID 12 nimi täiendati olemasoleva AMP_ROSTER kirje järgi. Import kinnitab nii ID kui nime ning hülgamisel ei jäta osalisi malle registrisse. Järgmine rühm 005: A Hipower Normal, B Hipower Brilliant, C USA Pre Clean, D USA MK IIC+. Genereeritud kombinatsioonide riistvarakatset pole tehtud.

## Capture004 parandus — varasem jätkupunkt (0.29.6)
Uues ekspordis on C-kanalil kavandatud Brit 800 2204 High (14). Lisatud selle täiskanalimall; eelmisest failist säilib ka Brit 800 2203 High (314). Kokku 22 malli, puudu 309. Mõlemad failid ja nende päritolu säilivad eraldi. Paranduse kõik neli kanalit kontrollitud failitasemel; genereeritud kombinatsioonid ei ole eraldi seadmel kinnitatud. [Raport](../../docs/FM3_AMP_CAPTURE_004_CORRECTED_RESULTS.json). Järgmine rühm 005: A Hipower Normal, B Hipower Brilliant, C USA Pre Clean, D USA MK IIC+. Mudeli 314 hilisem kogumiskoht jäetakse vahele, kuna nii 14 kui 314 on olemas.

## Capture005 — varasem jätkupunkt (0.29.9)
Lisatud Hipower Normal (16), Hipower Brilliant (17), USA Pre Clean (19), USA MK IIC+ (21). GET/SYX kattub 576/576 sõna; kõigi nelja kanali kopeerimine kontrollitud offline, muud body-baidid säilivad. Dekooderi ID21 nimi parandatud. [Raport](../../docs/FM3_AMP_CAPTURE_005_RESULTS.json). Kokku 26 kaasasolevat malli, 305 puudu. Uus koguja on kasutaja Mac/FM3-ga kontrollitud Hipower- ja capture005 seisundis. Genereeritud kombinatsioonid pole seadmel kinnitatud. Järgmine rühm 006: A USA MK IIC+ Bright, B Recto2 Orange Vintage, C Recto2 Orange Modern, D Recto2 Red Vintage. Juhenda üks riistvarasamm korraga; uus koguja ei vabasta sama seisundi SYX-ekspordist.

## Capture006 — varasem jätkupunkt (0.29.10)
Lisatud USA MK IIC+ Bright (22), Recto2 Orange Vintage (25), Recto2 Orange Modern (26), Recto2 Red Vintage (27). GET/SYX kattub 576/576 sõna ja kontrollsummad läbivad. Kõigi nelja täiskanali genereerimine on baitidentne, muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_006_RESULTS.json). Kokku 30 malli, 301 puudu. Genereeritud kombinatsioonid pole seadmel kinnitatud. Järgmine rühm 007: A Recto2 Red Modern, B Euro Blue, C Euro Red, D Shiver Clean. Koguja 0.29.9 sobib edasi; riistvarasammud ükshaaval.

## Capture007 — varasem jätkupunkt (0.29.11)
Lisatud Recto2 Red Modern (28), Euro Blue (29), Euro Red (30), Shiver Clean (31). GET/SYX kattub 576/576 sõna ja kontrollsummad läbivad. Kõigi nelja täiskanali genereerimine on baitidentne, muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_007_RESULTS.json). Kokku 34 malli, 297 puudu. Genereeritud kombinatsioonid pole seadmel kinnitatud. Järgmine rühm 008: A Shiver Lead, B Euro Uber, C Solo 99 Clean, D Solo 100 Rhythm. Koguja 0.29.9 sobib edasi; riistvarasammud ükshaaval.

## Capture008 — varasem jätkupunkt (0.29.12)
Lisatud Shiver Lead (32), Euro Uber (33), Solo 99 Clean (34), Solo 100 Rhythm (35). GET/SYX kattub 576/576 sõna ja kontrollsummad läbivad. Kõigi nelja täiskanali genereerimine on baitidentne, muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_008_RESULTS.json). Kokku 38 malli, 293 puudu. Genereeritud kombinatsioonid pole seadmel kinnitatud. Järgmine rühm 009: A Solo 100 Lead, B Friedman BE V1, C Friedman HBE V1, D PVH 6160 Block Lead. Koguja 0.29.9 sobib edasi; riistvarasammud ükshaaval.

## Capture009 — uusim jätkupunkt (0.29.13)
Lisatud Solo 100 Lead (36), Friedman BE V1 (37), Friedman HBE V1 (38), PVH 6160 Block Lead (39). GET/SYX kattub 576/576 sõna ja kontrollsummad läbivad. Kõigi nelja täiskanali genereerimine on baitidentne, muud body-baidid säilivad. [Raport](../../docs/FM3_AMP_CAPTURE_009_RESULTS.json). Kokku 42 malli, 289 puudu. Genereeritud kombinatsioonid pole seadmel kinnitatud. Järgmine rühm 010: A Mr Z MZ-38, B CA3+ Rhythm, C CA3+ Lead, D Wrecker Rocket. Koguja 0.29.9 sobib edasi; riistvarasammud ükshaaval.

## Kogumise optimeerimine — 0.29.14
Kasutaja valis juhendatud partiikogumise. Kasuta `scripts/FM3_AMP_BATCH.py`: SYX preflight, üks selgelt kinnitatud GET neliku kohta, kohene 576/576 paariskontroll, jätkamine tõendite põhjal ja üks ZIP lõpetamisel. Loe [partiijuhendit](../../docs/FM3_AMP_BATCH.md). Enam ei nõuta iga neliku järel vestluses kinnitamist, üleslaadimist ega plugina uuendamist. Mudelivalik ja sama seisundi SYX eksport on käsitsi; ainult SYX töövoogu pole aktiveeritud. Kaasas endiselt 42 malli, 289 puudu; järgmine nelik 40/41/42/43. Uut partiiliidest testiti offline ja simuleeritud kogumisega; kasutaja Maci katse on järgmine samm. GET transpordikood jäi muutmata.
