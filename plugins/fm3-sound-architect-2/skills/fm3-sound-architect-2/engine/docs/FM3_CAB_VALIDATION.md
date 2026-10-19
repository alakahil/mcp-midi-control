# CAB kogumine45/45 lõpetatud — 0.30.7

Lõplik FM3_CAB_BATCH_20261005T135600_988941b3.zip sõltumatult kontrollitud: kõik45 selle firmware13 Dyna-Cab loendi valikut on sama kabinetiga mõlema pesa kanaliseadistustega kaetud, puudu0. Kokku12 edukat GET/SYX paari (seed +11 kogumisrühma), igaüks424/424 sõna; kaadrite/7-bit/kontrollsummade, CRC/footeri, baasi piiride ning nimede/ID-de kontrollid läbivad. ZIP-is ebaõnnestunud capture-kirjeid pole. Eelmise kumulatiivse ZIP-i kõik failid säilisid baitidentselt.

Viimane capture-20261005T135558-dfcf2b9e97: A43/43 = display44 4x12 USA Mc90; B44/44 = display45 8x10 SV Bass; C41/41 ja D42/42 säilisid. Koguja0.2.2 lõpetab tõendite alusel automaatselt. Algandmed references/cab-batch-20261005-135600/; raport docs/FM3_CAB_BATCH_20261005_135600_RESULTS.json.

Ära palu uusi CAB nelikuid ega korduskogumist. Säilita kasutaja ~/Documents/FM3_CAB_SESSION ja lõplik ZIP. 45/45 tähendab kogutud Dyna-Cab valikute tõendeid selle loendi ja sama baasi kohta; see ei hõlma Legacy/Factory/User IR-e ega tähenda kõigi mikrofonide/asendite/kombinatsioonide valideerimist.

CAB-generaatori uute kanaliseadistuste kirjutust pole veel lisatud. Järgmine arendusetapp on kogutud45 kanaliseadistuse kontrollitud import registrisse ja sidumine olemasoleva SYX/TXT generaatoriga: ainult tõendatud täielik kanaliala, range sihtbaasi/kanali kontroll, muud body-baidid säilivad, väljund tagasidekodeeritakse ja kontrollsummad kontrollitakse. Seejärel üks teadlik FM3-Editi kontrollimport ja tagasieksport; heli/CPU eraldi hinnatav. Ära väida uut kirjutust ega impordi/heli kinnitust pelgalt kogumise põhjal. Tooreid SET-käske ei kasutata. 336 Amp-malli ja senine generaator säilivad. Allpool43/45 ja viimase kogumise juhised on ajaloolised.



# CAB43/45 kinnitatud — 0.30.6

Kumulatiivne FM3_CAB_BATCH_20261005T135019_2dde6871.zip kontrollitud: 11 edukat GET/SYX paari (seed +10 nelikut), igaüks424/424, kaadrite kontrollsummad/7-bit, CRC/footer, sama baasi piirid ning nimede/ID-de vastavus korras. Ebaõnnestunud capture-kirjeid selles ZIP-is pole. Varasema kahe paari algandmed säilisid baitidentselt. 43 selle45-valikulise Dyna-Cab loendi samade pesadega kanaliseadistust kaetud, puudu2. Algandmed references/cab-batch-20261005-135019/; raport docs/FM3_CAB_BATCH_20261005_135019_RESULTS.json.

Koguja0.2.1 erandid display24 Bassguy=ID24 ja display25 Stealth=ID23 on nüüd mõlemad GET/SYX paaridega kinnitatud. Koguja0.2.2 viimane paar capture-20261005T134934-761c30e558 kinnitab A37/37 Lerxst, B40/40 Rumble EV12L, C41/41 Rumble EV12S, D42/42 Solo100; donor on kontrollitud FM3_CAB_SELECTION_011.syx-ga baitidentne. INPUT-valehäire parandus on selle päris Mac/FM3 käiguga kinnitatud. See ei ole üldise dekooderi universaalne valideerimine ega uue CAB-kirjutuse riistvaratest.

Järgmine ja viimane rühm: A44 4x12 USA Mc90 (ID43), B45 8x10 SV Bass (ID44), mõlemas kanalis mõlemad pesad sama kabinet. C ja D jäta011 seisundisse (Rumble EV12S ja Solo100), muud seaded samaks. Uus terve eksport FM3_CAB_SELECTION_012.syx. Kasuta sama koguja0.2.2, sama ~/Documents/FM3_CAB_SESSION ja kinnitatud porti /dev/cu.usbmodem211104; käsk koguja JUHEND.txt-s. Üks selgelt kinnitatud GET pärast FM3-Editi/Fractal-Boti sulgemist. Viimase paari õnnestumisel koguja lõpetab ja väljastab kumulatiivse ZIP-i automaatselt; palu see siia kontrolliks. Juhenda riistvarasamme ükshaaval, ära nõua juba kogutud valikute kordamist.

CAB-generaatori uute valikute kirjutust pole lisatud; 336 Amp-malli ja olemasolevad piirangud säilivad. Allpool varasemad koguarvud ning011 GET-i ootamise juhis on ajaloolised.



# INPUT valehäire — 0.30.5

Koguja0.2.2 lahendab kasutaja FM3_CAB_SELECTION_011.syx eelkontrolli vea: üldise param-tüübiskanneri findHeader peab CAB A pesa2 ID37 väärtust offset6026 ekslikult INPUT effectId37 päiseks ja loeb sellest vale INPUT_TYPE65534. Tegelik INPUT/routing ei muutunud. Kontrollitud ekspordi body erineb valideeritud baasist ainult kaheksas kabineti-ID sõnas ja stseeni2 CAB-kanalis offset5820 A→D. Cab A37/37 Lerxst, B40/40 Rumble EV12L, C41/41 Rumble EV12S, D42/42 Solo100. Algfail references/cab-input-fix/FM3_CAB_SELECTION_011.syx; raport docs/FM3_CAB_INPUT_FIX.json.

Parandus ainult CAB-koguja koopias: inspectStructure säilitab faili pikkuse, kaadrite/7-bit/kontrollsummade, formaadi, CRC ja footeri kontrolli. Eelkontroll nõuab kõigi CAB-andmealast ja lubatud stseenikanalitest väljaspool olevate body-baitide täpset võrdsust üldkontrolli läbinud baasiga; kontrollib CAB paigutust, režiime ja stseenikanalite vahemikku. Üldine inspect ja presetigeneraatori kontrollid säilivad. GET/SYX424/424 kontroll ja transport muutmata. See on sama baasi piiratud koguja, mitte üldise dekooderi universaalne parandus.

Jätka sama FM3_CAB_SELECTION_011.syx ja sama seadme seisundiga. Paki uus FM3_CAB_COLLECTOR_0.2.2 kaust Downloads-kausta; käsk python3 ~/Downloads/FM3_CAB_COLLECTOR_0.2.2/FM3_CAB_BATCH.py --session ~/Documents/FM3_CAB_SESSION --port /dev/cu.usbmodem211104. Sama sessioon säilitab senised paarid; ära nõua korduskogumist. Koguja arvutab neliku kohalikust tõendusest. Kui nelik vastab, kasutaja sulgeb FM3-Editi/Fractal-Boti ja kinnitab ühe GET-i. Pärast edukat paari q ning kumulatiivne ZIP vestlusse. Riistvarasamme juhenda ükshaaval. Selle011 GET-i pole veel saadud; vahepealsete paaride koguarvu ära oleta.

Offline kontrollid: päris011 terviklus ja ID-d läbivad; kontrollsumma rike, Amp kõrvalmuudatus, vigane CAB-režiim ning stseenikanal tõrjutakse; seed424/424 ja neli varasemat vastenduse/jätkamise testi läbivad. Uue koguja Mac/FM3 katse ootab. CAB kirjutust generaatoris pole lisatud; 336 Amp-malli säilivad. Allpool olev007 taastamise juhis on ajalooline.



# Vastenduse parandus — 0.30.4

Kuvatav24 Bassguy = ID24; kuvatav25 Stealth = ID23, tõendatud kontrollitud kasutajaekspordiga. GET/SYX paarid veel puudu. Koguja0.2.1 kasutab eraldi ID-sõnastikku ja jätkab sama sessiooni. Algfailid ../skills/instructions/references/cab-id-fix/; raport FM3_CAB_ID_FIX.json. Järgmine samm: taasta D CAB1 Bassguy, uus eksport ja üks kinnitatud GET koguja0.2.1-ga. Allpool ajalugu.

# Maci-katse kinnitatud — 0.30.3

Uus paar 01–04: 424/424, kaadrid/CRC/footer korras. Kokku7 kabinetivalikut, puudu38. Sama koguja0.2.0 sobib partiikogumiseks; järgmine nelik05/06/07/08. Tõend FM3_CAB_BATCH_20261005_085919_RESULTS.json. Uut CAB kirjutust generaatoris pole; heli/import eraldi kontrollimata.

# Kogumisplaan — 0.30.2

45 Dyna-Cab valikut kasutaja kuvatõmmiselt talletatud cab-roster.json-i. Koguja 0.2.0 pakub nelikuid; esimene01/02/03/04, mõlemad pesad igas kanalis samaks. Kolm varasemat samade pesadega kanalit on tõendatud, puudu42. Pärast esimest uut paari q ja ZIP vestlusse. Maci partiikatse ootab; CAB generaatori kirjutust pole lubatud. Detailid koguja JUHEND.txt-s. Allpool ajalugu.

# Kinnitatud jätkupunkt — 0.30.1

Cab GET/SYX 424/424 kinnitatud, frame lengths 12/778/514/8, body start5854, kanalistride106. Üks valikumuutus offset6024 0→1: Cab A pesa1 Tweed → Princetone. Täpne raport: ../skills/instructions/scripts/cab-collector/CAB_VALIDATION.json. Koguja samas kaustas, käivitus ja piirangud JUHEND.txt-s. Järgmine samm on Dyna-Cab valikuloendi kuvatõmmised; automaatne nelikute plaan ootab nimede kinnitust. Uut binaarkirjutust pole toetatuks kuulutatud. Allpool algne ettevalmistus.

# CAB valiku valideerimine

Seis 2026-10-05: ettevalmistus, uus CAB näidis veel saamata. See dokument ei kinnita uut kirjutusfunktsiooni.

## Olemasolev tõend

- Generaatori cabScene2 valib olemasoleva Cab B/C/D kanali; kanalisisese uue kabineti või IR-i valiku kirjutamine pole toetatud.
- Varasem Cab 1 bulk GET: effectId 62, 424 väärtust, kandidaatjaotus 4 × 106. See ei kinnita sama paigutust presetifailis ega kõigi indeksite tähendust.
- CABINET_LENGTH4 nimi ei tõenda neljandat FM3 IR-pesa; ära jätka selle enum-auditit automaatselt.
- 336 Amp-malli ja nende tõendid säilivad puutumata.

## Ühe näite tööjärjekord

1. Tuvasta kasutaja FM3-Editi kuvatõmmiselt Cab 1 kanal A, valikurežiim ning mõlemad kabineti/IR-pesad. Lähtu senisest firmware 13 sessioonist; kui versioon on muutunud, dokumenteeri see enne võrdlust.
2. Saa praeguse seisundi täielik presetieksport FM3_CAB_BASELINE.syx. Kontrolli kaadreid, CRC/footerit, presetistruktuuri ja Cab-kanaleid olemasoleva offline mootoriga.
3. Vali ekraanil kinnitatud loendist üks teine kabinet sama režiimi ühe kanali ühes pesas. Kasutaja muudab ainult seda valikut; fikseeri enne/pärast nimi, pank/number kui nähtav, pesa ja kanal. Ekspordi FM3_CAB_SELECTION_001.syx.
4. Võrdle lahtipakitud body't ja kõiki plokke/kanaleid. Erista valikumuudatusega kaasnenud parameetreid, kasutajaliidese kanalivaliku kõrvalmõju ja seletamata erinevusi. Ära eelda, et ainult ID muutub või et Amp stride sobib Cabile.
5. Valmista sama seisundi jaoks vajadusel üks selgelt kinnitatud Cab GET pärast FM3-Editi sulgemist, kasutades üle vaadatud olemasolevat read-only transpordikoodi. Kontrolli õiget porti, effectId-d, vastuse terviklikkust ja päris sõnade arvu; ebaõnnestumisel peatu, säilita tõendid, ära korda automaatselt.
6. Seo GET ja SYX tõendatult: nõua täieliku võrreldava andmeala kattuvust. Arvuta pikkus tegelikest Cab-andmetest; ära kasuta Amp 576-sõnalist kontrolli.
7. Alles seejärel otsusta kogumise ühik: Dyna-Cab kanaliseadistus või Factory/User IR valiku vastendus. Režiime ei ühendata kontrollimata üheks kataloogiks. IR-valiku viide ei sisalda IR-helifaili ega tõenda kasutajapesa sisu teisel seadmel.
8. Koosta ja testi CAB-koguja offline, seejärel üks kasutaja juhitud päriskatse. Säilita eraldi FM3_CAB_SESSION, algsed SYX/GET failid, valikute nimed, hashid ja kontrolliraportid; jätkamine põhinegu tõenditel, lõpetamisel ZIP. Amp-sessiooni ei muudeta.

## Uue kirjutusfunktsiooni vastuvõtt

Nõua sõltumatu ekspordiga kattuvat kabinetivalikut, seletatud kõrvalmuudatusi, määramata andmete säilimist ja kontrollsummade läbimist. Seejärel teadlik FM3-Editi kontrollimport, kuvatavate valikute kontroll ja tagasieksport. Helikontroll on eraldi. Enne seda ära nimeta uut CAB-valikut toetatuks ega koguja riistvarakäitumist valideerituks. Tooreid SET-käske ei kasutata.
