# Uus mitme ploki profiil (0.48.0)

Bonamassa aluse mitme ploki ja rütmi/soolo koostamiseks kasuta `jb-composer`.
Loe [koostaja juhendit](FM3_JB_COMPOSER.md). Vanad profiilid ja nende piirangud säilivad.

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

# JB Scene 6 profiil (0.32.0)

Uus piiratud haru sama generatePreset API ja CLI kaudu. Kasuta algset
JB_YDOM_RHYTHM.syx ja examples/JB_SCENE6_GENERATED.spec.json:

```bash
node skills/instructions/scripts/fm3-generate.mjs skills/instructions/examples/JB_YDOM_RHYTHM.syx skills/instructions/examples/JB_SCENE6_GENERATED.spec.json /absolute/output/JB_SCENE6
```

Spec sisaldab baseProfile="jb-ydom-rhythm", schemaVersion1, firmware13,
name="JB YDOM RHYTHM", scene6Name="JB SOLO", phaserScene6Bypass=true.
Väljund: SYX, TXT ja validation.json. Presetinimi ja valitud stseen säilivad.
Kasutada saab kumbagi uut välja eraldi. True tähendab Phaser bypass'i.
Vana Baaspreset-põhine haru töötab endisel kujul; uusi välju seal ei toetata.
Täpne ulatus, testid ja piirangud: SKILL.md ning FM3_JB_GENERATOR_TESTS.json.

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

# Ühtne FM3 generaator — 0.28.1
Kuupäev 2026-10-01. Eesmärk: üks presetikirjeldus annab omavahel kooskõlalised SYX, TXT ja kontrollraporti. Offline; ei ühenda seadet ega saada SET-käske.

## Kasutamine
```sh
node skills/instructions/scripts/fm3-generate.mjs skills/instructions/references/Baaspreset.syx skills/instructions/examples/FM3_SA_UNIFIED.spec.json /ABS/OUTPUT
```
Vajab Node.js ning kõrvalolevaid fm3-prototype.mjs / fm3-codec.mjs. Uus tee ei kutsu vanu katsewrapper'eid. Väljund .syx, .txt, .validation.json. Olemasolevate väljundite korral keeldub; ükski fail ei kirjutata üle.

Sisend: schemaVersion1, firmware13, ASCII nimi1–31 märki, vähemalt üks toetatud juhtseadis. purpose on valikuline selgitus, ei muuda heli. Tundmatud väljad ja sobimatu alus/firmware lükatakse tagasi. Skeem scripts/fm3-spec.schema.json; käsitsi antud JSON-i kontrollib ka generaator ise.

Määramata juhtseadiste raw-baidid säilivad baasist. Näiteks ainult delayMixA15 EI sea Gain5, EI lülita Delay'd sisse, EI muuda Reverbi kanalit ega Tempot. TXT näitab kõik toetatud juhtseadised koos märgendiga requested/base ning tegelikku dekodeeritud väärtust. Muude plokkide täielikku semantikat ei väideta.

## Toetatud sisend
| Võti | Piir |
|---|---|
| gainB, bassB | 4,5,6,7 |
| midB, trebleB, presenceB | 0–10 |
| levelB | −80…20 dB |
| delayMixA, reverbMixA | 0–100% |
| delayTimeMs | 50–1000 ms; nõuab delayTempoA NONE |
| delayFeedback | 0–50% |
| reverbTimeS | 0.5–5 s |
| reverbPredelayMs | 0–100 ms; nõuab reverbPredelayTempoA NONE |
| delayTempoA, reverbPredelayTempoA | ainult NONE |
| delayScene2 | true/false |
| reverbScene1 | A/B |

Piirid on sisendileping, mitte iga väärtuse riistvaratõend. Kirjutatavad kanalid Amp B, Delay/Reverb A. ReverbScene1 B valik ei muuda Reverb B parameetreid. Alus kasutab Delay A kõigis stseenides, Amp B stseenides2/6. Reverb A stseenid sõltuvad Scene1 valikust ja on TXT-s.
Valikulised ampModelB/cabScene2 lisandusid 0.28.0-s: loe [Amp/Cab valikujuhendit](FM3_AMP_CAB_SELECTION.md). Ilma nendeta mudelid/Cab/IR jäävad baasist; routing/juhtimine jääb alati baasist. ampModelB korral pärinevad määramata Amp B väärtused valitud tervest kanalimallist. Toetamata artistisoovi korral anna täpne piirang, ära nimeta seda valmis soovitud soundiks. TXT dokumenteerib kitarr/ühendus/IR teadmata osad; need tuleb tegeliku soundidisaini käigus täpsustada.

## Teostus ja kontroll
Nime ning Amp/Reverb parameetrid kirjutab senine IR-kirjutaja; Delay ja stseenid kasutavad fikseeritud baasi kontrollitud ankrut/offsette. Koondkirjutusel nõutakse täpset kogu-body võrdlust, päiste säilimist, parameetrite raw tagasilugemist ja kõiki kaadri/CRC/footer kontrolle. Üldise Delay plokikäigu viga pole parandatud.
Sisend ei saa varjatult tugineda vanade wrapper'ite vaikeväärtustele: puuduvad väljad jäetakse kirjutamata. Aja väljad nõuavad selgesõnalist TempoNONE välja.

test-generate.mjs:
- 4 varasemat genereeritud SYX-faili (G5, SCENES, TONE, TIME) täielikult baitidentsed.
- 16 isoleeritud juhtseadise puhul kõik määramata body-baidid säilivad (aja puhul ainult nõutud Tempo lisaks).
- 8 sõltumatut Gain/Bass eksporditud body't kattuvad.
- 12 vigast päringut tõrjutakse.
Käivita test references ja examples kataloogidega argumentidena. Katses muutmata kodeerijat ei ehitatud uuesti.

Näidis FM3_SA_UNIFIED.syx on nimega FM3 SA TEST TIME ja täpselt baitidentne varem kinnitatud TIME katse genereeritud failiga (SHA256 81f5f2cecbc0cbd3facf4039124e82366d4f49bf63dd8339ea7bc7f6174f1b53). Seetõttu pole selle refaktoreerimise kinnitamiseks vaja uut riistvaraimporti. Näidis ei ole uus artistisound. TXT/spec on nüüd ühtse generaatori vormingus, kus kõik soovitud muudatused on nähtavad.

## Tõendi piir
Kasutaja kinnitas kõigi nelja katse oodatud väärtused firmware13-ga. Tagasieksportide parameetribaidid säilisid; G5 body täielikult identne, teistel kolmelt üks erinevus offset0 (1→0). See teadmata bait on raportites alles, mitte normaliseeritud. Uue firmware/aluse/kirjutusfunktsiooni või sisuliselt uue kombinatsiooni korral sihitud kontroll; sama kombinatsiooni tarkvaraline ümberkorraldamine ei nõua automaatselt uut importi.
Heliline täpsus, CPU, Cab/IR sõltuvuste täielik ülevaatus ja lavakasutus ei ole selle tõendi osa.

## Amp/Cab laiendus 0.28.0
Viis Amp B kanalimalli ja kolm Scene 2 Dyna-Cab kanalivalikut on rakendatud. Üksnes ID muutmise asemel kopeeritakse kogu Amp-kanal. Täpne leping, tõendid, User IR piirang ja järgmine riistvarakatse on [valikujuhendis](FM3_AMP_CAB_SELECTION.md).

## MODEL CAB riistvarakinnitus
2026-10-01 kinnitas kasutaja USA MK IV Lead + Scene 2 RECTO STRAIGHT näidise impordi ja oodatud väärtused. Tagasieksport säilitab kogu 14222-baidise body; täielik SYX erineb. [Raport](FM3_MODEL_CAB_HARDWARE_ROUNDTRIP.json). Muud mudelikombinatsioonid ning heli/CPU on kinnitamata. Algsete katsefailide staatust tõlgenda koos selle hilisema raportiga.

## 0.29.0 üldine Amp-malliregister
Generaatori valikuline neljas CLI argument on fm3-amp-library.mjs loodud register. ampModelB kataloogis on 331 nime; ainult tervikliku malliga nimed on kirjutatavad. Viis malli on kaasas, 326 vajavad allikandmeid. Loe [kõigi mudelite juhendit](FM3_ALL_AMPS.md).

## 0.29.1
Lisatud neli capture001 malli vaikimisi registrisse; kokku 9 malli, 322 puuduvad. Vt [katvuse ja impordi juhendit](FM3_ALL_AMPS.md). Esialgset 5 malli loendit ei tohi käsitleda praeguse täieliku loendina.


## Delay täiskanalimallid — 0.38.0

Profiil `jb-delay-multi` toetab kõiki 27 kogutud tüüpi kanalites A–D.
Sisend: `{"schemaVersion":1,"firmware":13,"baseProfile":"jb-delay-multi","delayChannels":[{"channel":"A","type":"Digital Stereo"}]}`.
Lubatud kolm SHA-piiratud alusfaili ja piirangud on `skills/instructions/scripts/fm3-delay-multi.mjs` ning oskuse jooksvas jätkupunktis.
Kopeeritakse täielik 89-sõnaline kanalimall; iga valik kontrollitakse GET/SYX algtõendiga.
Põhiseadete ülekirjutamist ega profiilide liitmist ei toetata. Määramata andmed säilivad.
108 eraldi tüübi/kanali katset ja seitse sõltumatut eksporditaastamist läbisid offline kontrolli.
Konkreetse `examples/FM3_DELAY_ABCD_TEST.syx` kontrollimport ja tagasieksport on kinnitatud: kogu 14222-baidine body säilib; ainult päisenimi ja CRC muutuvad. Vt `FM3_DELAY_HARDWARE_ROUNDTRIP.json`. Teiste kombinatsioonide riistvarakinnitus on eraldi.


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



## Phaser: jb-phaser-multi (0.41.0)

`phaserChannels` accepts 1–4 unique A–D entries with exact `type` names from
phaser-library.json. Copies all 35 words from independently paired GET/SYX
evidence. No control overrides; other blocks, routing, scenes, bypass and name
are preserved. Bases: JB_YDOM_RHYTHM.syx, FM3_COMPRESSOR_ABCD_TEST_export.syx,
and final Phaser donor capture-20261007T122800-3b6eb73afe (all SHA pinned).
68 channel/type combinations, five independent donor body replays, two
additional bases, 17 rejection checks passed. Hardware import remains pending.
Test fixture: FM3_PHASER_ABCD_TEST.syx/.txt; A Barber Pole, B Modern Vibe,
C Script 90, D Virtuoso Phaser. Export back as FM3_PHASER_ABCD_TEST_export.syx.


### Phaser hardware roundtrip (0.41.1)

FM3_PHASER_ABCD_TEST_export.syx preserves all 140 Phaser words and all 14222
decompressed body bytes exactly, without normalization. Scene channels and
bypass are unchanged. The internal preset name is unchanged; compressed
representation and checksums differ. This ABCD specimen is hardware verified;
68 general combinations remain offline-only tests. Audio/CPU not assessed.
See FM3_PHASER_HARDWARE_ROUNDTRIP.json. Base allowlist is unchanged.
