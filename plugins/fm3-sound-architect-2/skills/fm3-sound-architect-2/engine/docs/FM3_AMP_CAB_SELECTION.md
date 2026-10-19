# CAB Bassguy kontrollimport kinnitatud — 0.31.1

Kasutaja kinnitas Scene2 CAB B mõlemad24: 2x12 65 Bassguy. Tagasieksport säilitab kogu14222-baidise body, sealhulgas106-sõnalise CAB B; kõik kaadri/CRC/footer kontrollid läbivad. Terve SYX pole baitidentne. Raport [FM3_CAB_BASSGUY_HARDWARE_ROUNDTRIP.json](FM3_CAB_BASSGUY_HARDWARE_ROUNDTRIP.json). Kinnitus kehtib sellele katsele; ülejäänud44 valiku genereerimine on offline kontrollitud. Heli/tasemed/CPU pole hinnatud. Integratsiooni ja ühe kontrollimpordi etapp on lõpetatud, korduskogumist pole vaja. Allpool katse-eelsed ootejuhised on ajaloolised.

# CAB B täiskanalite generaator — 0.31.0

Uus valikuline spec-võti cabModelB: täpne kabinetinimi lookup/cab-library.json 45 mallist. Näide: {"schemaVersion":1,"firmware":13,"name":"FM3 SA TEST CAB BASSGUY","cabModelB":"2x12 65 Bassguy"}.

Ainult algne Baaspreset.syx. Kopeeritakse kogu212-baidine/106-sõnaline CAB B; mõlemad pesad sama kabinet, koos allika mikrofonide/segu/filtrite/tasemetega. Allika stseenikanaleid kaasa ei kopeerita. CAB B kasutavad2/4/6/8; A/C/D ja stseeniseosed säilivad. Muud toetuspiirid ei laiene. cabModelB ja cabScene2 koos on keelatud.

Registri ehitamine: node skills/instructions/scripts/build-cab-library.mjs skills/instructions/references/cab-batch-20261005-135600 /ABS/NEW_CAB_LIBRARY.json. See kontrollib kõiki GET/SYX paare ja nõuab45 unikaalset tõendatud malli; olemasolevat väljundit ei kirjuta üle. Käitus kasutab SHA-pinnitud kaasasolevat registrit, mitte kasutaja juhuslikku välisregistrit.

Genereerimine: node skills/instructions/scripts/fm3-generate.mjs skills/instructions/references/Baaspreset.syx skills/instructions/examples/FM3_SA_TEST_CAB_BASSGUY.spec.json /ABS/NEW_OUTPUT. Väljund SYX/TXT/validation.json. Amp-registri valikuline argument jääb samaks.

Kontrollid: tegeliku SYX-i kaadrid/7-bit/CRC/footer, kogu oodatav body, päiste säilimine ning tervikkanali identne tagasilugemine. ID37 vale INPUT vaste vältimiseks validaator kontrollib mitte-CAB muudatusi koopial, kus CAB B taastatakse baasist; tegelik CAB B peab võrduma täismahus SHA-pinnitud paaritõendiga malliga. See pole üldotstarbeline dekooderiparandus. Väljundis midagi vaikselt ei parandata.

45 CAB-only ja45 kombineeritud Amp/CAB testi läbivad, vanad regressioonitestid säilivad. Uue kirjutuse seadmeimport/tagasieksport ning heli/CPU veel kinnitamata. Näidis on arenduskatse: Scene2/CAB B mõlemad24 Bassguy; enne importi säilita töö, ära kirjuta presetikohta üle. Kontrolli valikuid, ära muuda neid käsitsi, ekspordi FM3_SA_TEST_CAB_BASSGUY_export.syx tagasi kogu body võrdluseks.

Allpool ajalooline dokumentatsioon.

# Amp-mallide kogumine lõpetatud — 0.29.28

Capture084 Deluxe Tweed Normal (ID331) GET/SYX paar kattub 576/576 sõna, kontrollsummad korras. Kogu kumulatiivses sessioonis 81 kinnitatud paari ja üks varasem ebaõnnestunud katse; konflikte ega tagasilükatud paare pole. Kõik 336 tuvastatud kataloogimudelit ID0–335 on nüüd tervikkanalimallidega kaetud, sealhulgas viis firmware13 uut mudelit. Uue malli genereerimine Amp B-sse kontrollitud offline: täiskanal baitidentne, muud body-baidid säilivad. Uut genereeritud kombinatsiooni pole seadmel imporditud ega kuulatud. Amp-mallide kogumine on lõpetatud: ära palu uusi nelikuid ega sama andmestiku korduskogumist. Järgmine etapp on kasutaja soovitud praktilise preseti koostamine toetatud generaatori piires ja selle FM3-Editi impordi/heli kontroll. Cab/IR binaarvaliku, routing’u ja teiste toetamata funktsioonide piirangud säilivad. Hoia kogumissessioon ja lõplik ZIP alles. [Raport](FM3_AMP_BATCH_20261004_153604_RESULTS.json). Allpool ajaloolised seisud.

# Praegune seis 0.29.24 — 2026-10-04

Partii 073–082 lisas 37 uut mudelit ID293–330, välja arvatud varem olemas olnud ID314. Kõik 10 uut GET/SYX paari kattuvad 576/576 sõna; sessioonis 79 kinnitatud paari ja üks varasem ebaõnnestunud katse. Praeguse kataloogi kõik 331 mudelit on mallidega kaetud. Kõigi 37 uue täiskanali genereerimine on offline kontrollitud, muud body-baidid säilivad. Uusi kombinatsioone seadmel ei imporditud ega kuulatud. Järgmist nelikut praeguses kogumisplaanis pole. See ei tähenda firmware 13 täielikku mudelituge: varem ekspordis nähtud ID331 ja firmware 13 uuemate mudelite nime/ID vastendus ning GET/SYX mallid vajavad eraldi kinnitamist. Järgmine etapp on firmware 13 mudeliloendi täielikkuse kontroll, seejärel puuduvate mudelite sihitud kogumine. Ära korda juba kinnitatud kogumist. [Raport](FM3_AMP_BATCH_20261004_151539_RESULTS.json).

# Praegune seis 0.29.23 — 2026-10-04

294 malli kaasas, praeguse 331-kirjelise kataloogi järgi 37 puudu. Partii 062–072 lisas 44 mudelit ID249–292; kõik 11 GET/SYX paari kattuvad 576/576 sõna. Sessioonis 69 kontrollitud paari ja üks varasem ebaõnnestunud katse. Kõigi uute täiskanalite genereerimine kontrollitud offline; uusi kombinatsioone seadmel ei imporditud ega kuulatud. ID283 õige firmware 13 nimi on Deluxe Tweed Bright. Vana koguja 0.29.17 kasutab selle kohta nime Deluxe Tweed ja sobib praeguse kogumisplaani jätkamiseks. ID331 on tuvastatud varasemas C-kanali ekspordis, kuid selle nime ja GET/SYX paari pole kinnitatud ning malli pole lisatud. 331 kirjet ei tõenda firmware 13 kõigi mudelite täielikku loendit; uuemate mudelite audit on veel vajalik. Järgmine nelik: A JMPre-1 Clean1 (293), B JMPre-1 Clean1 Bass Shift (294), C JMPre-1 Clean2 (295), D JMPre-1 Clean2 Bass Shift (296). [Raport](FM3_AMP_BATCH_20261004_095554_RESULTS.json).

# Praegune seis 0.29.22 — 2026-10-04

250 malli kaasas, 81 puudu. Partii 051–061 lisas 44 mudelit ID205–248; GET/SYX paarid kontrollitud. Järgmine nelik ID249–252. Koguja 0.29.17 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261004_092114_RESULTS.json). Allpool varasem ajalugu ja tehnilised juhised.

# Praegune seis 0.29.21 — 2026-10-04

206 malli kaasas, 125 puudu. Partii 031–050 lisas 80 mudelit ID125–204; GET/SYX paarid kontrollitud. Järgmine nelik ID205–208. Koguja 0.29.17 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261004_085736_RESULTS.json). Allpool varasem ajalugu ja tehnilised juhised.

# Praegune seis 0.29.20 — 2026-10-04

126 malli kaasas, 205 puudu. Partii 021–030 lisas 40 mudelit ID85–124; GET/SYX paarid kontrollitud. Järgmine nelik ID125–128. Koguja 0.29.17 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261003_232027_RESULTS.json). Allpool varasem ajalugu ja tehnilised juhised.

# Praegune seis 0.29.19 — 2026-10-03

86 malli kaasas, 245 puudu. Partii 017–020 lisas 16 mudelit ID68–84 (ID77 oli juba olemas); GET/SYX paarid kontrollitud. Järgmine nelik ID85–88. Koguja 0.29.17 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261003_225630_RESULTS.json). Allpool varasem ajalugu ja tehnilised juhised.

# Praegune seis 0.29.18 — 2026-10-03

70 malli kaasas, 261 puudu. Partii 013–016 lisas ID52–67; GET/SYX paarid kontrollitud. Järgmine nelik ID68–71. Koguja 0.29.17 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261003_224026_RESULTS.json). Allpool varasem ajalugu ja tehnilised juhised.

# Praegune seis 0.29.16 — 2026-10-03

54 malli kaasas, 277 puudu. Partii 010–012 lisas ID40–51; GET/SYX paarid kontrollitud. Järgmine nelik ID52–55. Koguja 0.29.15 sobib edasi. [Partii raport](FM3_AMP_BATCH_20261003_RESULTS.json). Allpool on varasem ajalugu ja tehnilised juhised.

# Võimendimudeli ning Cab/IR-valiku tugi — 0.28.1

## Soundi valimine
Loe seda juhendit enne mudeli/Cab-soovitust või nende kirjutamist. Erista heliline soovitus ja generaatori lubatud valik. Kasuta kasutaja teadaolevat firmware'i, kitarri/helipeasid, väljundit ja mono/stereot; küsi ainult valikut muutvat puuduvat infot. Artistipäringul tuvasta loo versioon ja osa ning erista allikaga kinnitatud algseadmeid oma lähendusest.

1. Kirjelda sihtheli: puhas või murdepiiril, rütm või soolo, gain, alumise otsa tihedus, kesksagedused ja atakk.
2. Vali üks peamine võimendiperekond ja üks põhjendatud alternatiiv. Näiteks Ameerika clean/tweed, Briti chime/Plexi või high-gain/Mark on otsingu suunad, mitte garanteeritud FM3 mudelinimed. Kontrolli täpne mudelinimi kasutaja firmware'i FM3-Editist või ametlikust dokumentatsioonist. Ära mõtle mudeli-ID-sid välja.
3. Vali kabinet, valjuhääldi iseloom ning mikrofon/segu sihtheli järgi. Ära eelda, et sama kabinetinimi tähendab sama IR-i või sama helitulemust. Võrdle sarnasel tajutud helitugevusel; kohanda esmalt Amp/Cab põhivalikut ja alles seejärel EQ-d.
4. FOH/FRFR puhul planeeri kabinetisimulatsioon signaaliteele; päris kitarrikabineti puhul täpsusta eraldi väljunditee. Ära genereeri toetamata bypass/routing-muudatust. Selgita kasutajale puuduvat funktsiooni.
5. Esita valik koos põhjenduse, täpse kanali/stseenimõju, sõltuvuste ning olekuga: soovitus / failitasemel kontrollitud / seadmel kontrollitud / kuulatud. Ükski siin pakutud kombinatsioon ei ole automaatselt artisti originaalsound.

## Laiendus 0.29.0
Kõigi 331 kodeerijakataloogi nimede ja välise kanalimalliregistri töövoog on [kõigi mudelite juhendis](FM3_ALL_AMPS.md). Alljärgnev tabel kirjeldab viit kaasasolevat malli; teised nimed nõuavad eelnevalt imporditud sobivat tervikkanalit.

## Käivitatav valik
Kasuta endiselt `scripts/fm3-generate.mjs` ja sama schemaVersion 1, firmware 13. Uued võtmed on valikulised; ka mudeli- või Cab-valik üksi on kehtiv päring. Baas peab vastama senisele SHA-le.

| Võti | Lubatud väärtused | Tegelik tegevus |
|---|---|---|
| ampModelB | USA MK IV Rhythm 1; USA MK IV Rhythm 2; USA MK IV Lead Bright; USA MK IV Lead Mid; USA MK IV Lead | Kogu 144-parameetrise Amp-kanali koopia Amp B-sse; seejärel rakendatakse spec-i Gain/EQ/Level. Mõjub stseenidele 2 ja 6. |
| cabScene2 | 4x12 RECTO SLANT; 4x12 RECTO STRAIGHT; 2x12 CHIEFMAN | Scene 2 valib olemasoleva Cab B/C/D kanali. Kanalite sisu ega teisi stseene ei muudeta. |

Amp-mall on salvestatud kanali kogu seadistus, mitte ainult mudelinimi ega universaalne tehase lähteseadistus. Rhythm 1/2 ja Lead Bright/Mid tulevad Baaspresetist; Lead tuleb SHA-kontrollitud S2_AmpModelLead.syx ekspordist. Lead-ekspordi kõik erinevused paiknevad Amp B 288 baidi sees. Ülejäänud kanalid säilivad. Cab-valikuga tulevad vastava olemasoleva kanali mõlemad Dyna-Cab pesad, mikrofoni-, segu- ja muud seaded. See ei ole uue kabineti/IR-ID kirjutus.

Puuduv ampModelB säilitab senise käitumise; määratud ampModelB asendab Amp B kogu malli. TXT märgib selliste määramata üksikparameetrite allikaks Amp-malli. Raportis on tegelik mudel, Cab-kanal, valikute päritolu ja täpsed muutunud baidid.

## Dyna-Cab, Factory/Legacy IR ja User IR
- Dyna-Cab: kasuta generaatoris praegu ainult ülaltoodud kolme olemasolevat kanalit. Seadme õige Dyna-Cab teek tuleb kontrollida; presetifaili olemasolu ei tõenda teegi paigaldust.
- Factory/Legacy IR: soovita täpset nime alles kontrollitud kataloogi/ekraanikuva alusel. Pank, number ja firmware peavad klappima. Kirjutus pole selles versioonis toetatud.
- User IR: küsi tootja/paki nimi, täpne fail, variant/mikrofon, sihtseadme kasutajapank ja kuvatav pesa ning kas IR on sinna juba paigaldatud. Võimalusel salvesta faili SHA-256. Kasutaja kuvatavat pesanumbrit ei tohi samastada kontrollimata binaarse indeksiga.
- Preseti väljastamine ei paigalda User IR-i. Ära väida, et IR on presetis kaasas, ega asenda puuduvat tasulist IR-i märkamatult. Paku põhjendatud olemasolevat Dyna-Cab alternatiivi ja nimeta heliline kompromiss. Kui kasutaja soov nõuab välist IR-i, anna käsitsi teostatav valikujuhis ning ütle, et vastav SYX-kirjutus on veel toetamata; ära anna muutmata Cab-ga faili soovile vastava valmis presetina.

## Tõendid ja järgnev kontroll
`test-generate.mjs` säilitab 4 varasemat SYX-i baitidentselt ning varasemad isoleeritud katsed. `test-models.mjs` kontrollib 15 Amp/Cab kombinatsiooni, kõrvalbaitide säilimist, terve kanali kopeerimist, parameetrite prioriteeti ning vigaste valikute tõrjumist. Lead mudelivaliku kogu body kattub sõltumatu S2_AmpModelLead.syx ekspordiga. Cab-valiku kontroll on struktuurne/dekodeerimispõhine; Scene 2 RECTO STRAIGHT valikul on all kirjeldatud sõltumatu tagasieksport, teistel valikutel mitte. Kodeerija ja dekodeerija kokkulangevus üksi ei tõenda seadmel toimimist.

Näidis `examples/FM3_SA_TEST_MODEL_CAB.spec.json` koos SYX/TXT/raportiga loodi algselt arenduskatsena. 2026-10-01 kinnitas kasutaja impordi ja kõik oodatud Scene 2 väärtused sõnadega „Kõik oli nii nagu soovitud”. Tagasieksport `examples/FM3_SA_TEST_MODEL_CAB_export.syx` säilitab kõik 14222 lahtipakitud body-baiti täpselt, kaasa arvatud offset 0. Kõik kaadri-, CRC- ja footer-kontrollid läbivad. Täisfail erineb tihendatud esituse ja päise kontrollsumma poolest; ära nimeta SYX-faile baitidentseks. Tõend: [riistvararaport](FM3_MODEL_CAB_HARDWARE_ROUNDTRIP.json).

Kinnitatud kombinatsioon: Scene 2 Amp B = USA MK IV Lead, Gain 3, Bass/Mid/Treble/Presence 5; Cab C mõlemad pesad = 4x12 RECTO STRAIGHT. Tagasieksport näitab ka Scene 6 Amp B / Cab B säilimist, kuid kasutajalt ei küsitud selle stseeni eraldi ekraanikinnitust. Firmware 13 pärineb sama sessiooni varasemast kinnitusest. Heliline täpsus, tasemed ja CPU ei ole eraldi kinnitatud. Teised 14 tarkvaraliselt kontrollitud kombinatsiooni jäävad ilma riistvarakinnituseta. Algne TXT/validation säilib katse-eelse ajaloolise artefaktina; selle näidise hilisem staatus tuleb siinsest raportist.

User IR kirjutuse järgmine tõend: sama firmware'i sama preseti kaks eksporti, millest teises muudab kasutaja FM3-Editis ainult ühe Cab-kanali ühe IR-pesa valikut; pane kirja enne/pärast pank, kuvatav pesa ja täpne IR-nimi. Analüüsi tegelikku diffi ning malli/enum-vormingut enne kirjutuse lubamist. Ära saada tooreid SET-käske ega alusta kogu kataloogi auditit.

## Ametlikud allikad
Kontrollitud 2026-10-01. Täpsete parameetrite/firmware sõltuvuste puhul loe kehtivat allikat; vana põhijuhendi mälumaht ei pruugi kehtida firmware 13 puhul.
- https://www.fractalaudio.com/fm3-downloads/ — firmware 13 ja Dyna-Cab teegi nõue.
- https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf — Amp/Cab parameetrid; FM3 Cabis kaks IR-i.
- https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf — User Cab eraldi laadimine ning panga/pesa valik. Ära kanna vana juhendi pesade arvu uuemale firmware'ile üle.

## 0.29.1
Lisatud neli capture001 malli vaikimisi registrisse; kokku 9 malli, 322 puuduvad. Vt [katvuse ja impordi juhendit](FM3_ALL_AMPS.md). Esialgset 5 malli loendit ei tohi käsitleda praeguse täieliku loendina.
