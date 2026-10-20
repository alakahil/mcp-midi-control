# Kahe rea NewLook-paigutus — 0.56.1

Ampi/Cabi uue kanalivaliku esinduslik seadmekatse on kinnitatud:
`FM3_AMP_CAB_AD_TEST_export.syx` kõik 12 804 sisubaiti kattuvad täpselt.
Scene2/6 algne sisu ning kaks rida/Send/Return säilivad. Korduskatset ei küsita.
Täpne ulatus: [A–D juhend](FM3_COMPOSER_AMP_CAB_CHANNELS.md) ja
`FM3_AMP_CAB_HARDWARE_ROUNDTRIP.json`; heli ja CPU kohta hinnangut ei lisandu.

Kasutaja eelistus alates 2026-10-08: edaspidi puhas kahe rea paigutus,
ainult konkreetse soundi jaoks vajalikud plokid, ridade vahel Send/Return.
Uue preseti eelistatud alus on `examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`
(`jb-newlook`). CLI vajab endiselt konkreetset alusfaili; agent valib vaikimisi
selle aluse. `defaultBase` võimaluste loendis väljendab seda eelistust.

Kasutaja FM3-Editi paigutus (füüsilised read/veerud on siin 1-põhised):

| Rida | Plokkide asukohad |
|---|---|
| 2 | In 1:1; Drive:4; Amp:6; Cab:8; Send:12 |
| 3 | Return:1; Delay:9; Reverb:10; Out 1:12 |

Muudes kasutatud ridade kohtades on ühendavad shundid. Read 1 ja 4 jäävad tühjaks.
Send 1 ja Return 1 tervikkirjed säilivad muutmata, samuti olemasolevad ühenduslipud.
TXT esitab read eraldi tegelikus signaali järjekorras, jättes shundid nimeloendist välja.

## Mida uus alus tõendab

Kasutaja SYX SHA-256:
`afacded0a3c3a30cfbf48b4e3daa08c0639482f0f1973e429763150ff7e9372c`.
Keha on 12 804 baiti. Amp, Cab, Drive, Delay, Reverb ning Input 1 ja Output 1
tervikkirjed kattuvad viimase tasakaalustatud seadmeekspordiga bait-baidilt:
kõik A–D kanalid, stseenikanalid ja bypass. Amp B Level jääb -3dB, Amp C -8dB.
See ei ole OUTPUT 1 mõõdiku näit ega uus heliline kinnitus.

Eemaldatud on Compressor, Wah, Phaser, Chorus ja Flanger. Väljaspool gridi
ning muutunud plokijada erineb fikseeritud eesosa ainult baidil1584 (14→0):
varasema Wah-modifieri allikas on editori ekspordis välja lülitatud. Seda
säilitatakse. Kaks süsteemikirjet ja lõputäide kattuvad nihke arvestamisel täpselt.
Kõik stseeninimed säilivad, sealhulgas ajalooline “Clean Comp Chorus”; eemaldatud
plokke kasutanud muude stseenide helilist samasust ei väideta.
Pilt `references/newlook-20261008/layout.png` näitab Scene2 ja CPU44.6%; see pole
kõigi stseenide maksimum ega lisaplokkidega preseti CPU-kinnitus.
Audit: `FM3_NEWLOOK_SOURCE_AUDIT.json`.

## Ampi ja Cabi kanalid

Alates 0.56.0 valivad `ampChannels` ja `cabChannels` olemasolevas Amp1/Cab1
plokis mudelid A–D kanalitele. Kogu valitud kanalimall, sealhulgas tasemed,
asendatakse; valimata kanalid säilivad. See ei lisa plokke ega muuda gridi.
Stseenid määratakse sama kirjelduse `scenes`-loendis.
Loe [A–D juhendit](FM3_COMPOSER_AMP_CAB_CHANNELS.md).

## Vajaduspõhine lisamine

Kui sama `jb-composer` kirjeldus küsib puuduvat toetatud perekonda, lisatakse
`jb-newlook` alusel selle terviklik plokikirje koos nelja kanaliga. Soovitud
kanalimallid/parameetrid rakendatakse seejärel nagu varem. Lisatakse ainult
küsitud perekonnad; olemasolevat Drive'i/Delayd/Reverbi ega muid plokke
koostaja ise ei eemalda. See versioon ei ole suvalise signaaliahela autor.

| Küsitud väli | Automaatne koht | Signaali asukoht |
|---|---|---|
| `compressorChannels` | rida2, veerg2 | enne Drive'i |
| `wahChannels` | rida2, veerg3 | enne Drive'i |
| `phaserChannels` | rida2, veerg5 | Drive'i järel, enne Ampi |
| `pitchChannels` | rida3, veerg2 | Returni järel |
| `chorusChannels` | rida3, veerg3 | enne Delayd |
| `flangerChannels` | rida3, veerg4 | enne Delayd |
| `rotaryA` | rida3, veerg5 | enne Delayd |
| `tremoloChannels` | rida3, veerg6 | enne Delayd |
| `filterChannels` | rida2, veerg9 | Cab'i järel, enne Send'i |

Need on selle versiooni fikseeritud kohad. Kui sound vajab teistsugust järjekorda,
paralleelahelat, PEQ-d või mõnd toetamata plokki, ära väida seda toetatuks
ja ära paiguta efekti vaikimisi valesse rolli. Vali vajadusest lähtuv järgmine
kitsas laiendus. Kõigil vanadel alustel säilib senine puuduvate plokkide veateade.

Filter lisandus versioonis 0.53.0: 18 tegelike GET/SYX-paaridega kinnitatud
37-sõnalist malli. Selle doonor on kasutaja Filteri algne eksport; uus Filter
alustab nagu teisedki bypass'is. Versioon 0.55.0 lisab [mõõdetud juhtide punktid](FM3_FILTER_MEASURED_CONTROLS.md); pidevaid skaalasid ei eeldata.
Kõigi üheksa lisaploki kooslus on võrreldud failitasemel; Filteri ja Flangeri
omavaheline järjestus faili plokikirjetes on seni kontrollimata seadmel
(gridi asukohad on ülal täpselt määratud). Ainult Filteri lisamise nelja kanali
näidise 13 146 kehabaidi kattuvus on nüüd seadmeekspordiga kinnitatud. Täpne ulatus: [Filteri juhend](FM3_COMPOSER_FILTER.md).

Uus plokk algab kõigis stseenides kanalil A ja bypass'is. Doonori stseenide
aktiveeringut ei kopeerita. Ühine `scenes` määrab nii lisatud kui olemasolevate
toetatud efektiplokkide kanalid ja bypass'i ning stseeninimed. Varasem
`addedBlockScenes` jääb lisatud plokkide jaoks tagasiühilduvaks; sama välja
määramine mõlemas liideses annab vea. Aktiveerimiseks peab valitud kanalimall olema samas kirjelduses
selgesõnaliselt küsitud (Rotary puhul A). Soundi koostamisel lisa vajalikud
stseeniseaded koos efektisooviga; ära jäta soovitud kuuldavat efekti ekslikult
bypass'i ega nimeta pelka tüübivalikut efektide aktiveerimiseks.

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB NEWLOOK CHORUS",
  "chorusChannels": [{"channel":"B","type":"4-Voice Analog"}],
  "scenes": [{"scene":6,"blocks":{"chorus":{"channel":"B","bypass":false}}}]
}
```

Kogu ploki A–D lähtekanalid on nimetatud kinnitatud doonorist; küsitud kanalid
asendatakse kogutud mallidega. Puuduvatel kanalitel ei väideta tehasevaikeväärtusi.
Wah' lisamine üksi ei taasta eemaldatud expression-seost. Alates 0.3.5 saab
olemasoleva seose selgesõnaliselt sisse lülitada `modifiers.external1Wah:true`
abil; vt [piiratud kirjutus](FM3_WAH_MODIFIER.md). Muud seosed säilivad. Raport näitab doonorit, uut kohta,
vahetatud shunti, stseeniseadeid ja komponendi kanalimõju.

Täielik [stseenijuhend](FM3_COMPOSER_SCENES.md). Valmis
`JB_NEWLOOK_RHYTHM_SOLO.spec.json` koostab puhtal NewLook-alusel rütmi ja soolo
koos seniste parameetritega. Kõik 12 804 sisubaiti kattuvad aluse seadmeekspordiga;
Amp B -3dB ja Amp C -8dB ning kaks rida säilivad. Selle näidise jaoks ei küsita
korduseksporti. Uue nimega faili pole eraldi seadmesse imporditud.

## Kontrolli ulatus ja kinnitatud seadmekatse

Uue aluse olemasolevate plokkide kirjutus ning automaatne plokilisamine on
failitasemel testitud. Automaatse Choruse lisamise ning eraldi Pitchi ja Filteri lisamise kuue perekonna
näidised on nüüd läbinud FM3 impordi/tagasiekspordi täpse sisukattuvusega. Muud perekonnad ja kooslused
säilitavad senise failitaseme tõendi; neile ei laiendata selle näidise seadmekinnitust.
Uut kuulamishinnangut ega selle faili CPU-näitu ei antud.

`test-composer-newlook.mjs` võrdleb kogu keha sõltumatu viitega: kaheksa üksikut
lisaploki juhtu, üks kahe ploki kooslus ja kõik kaheksa korraga; igas testis ka
Amp Level, Delay Mix ja Scene6 nime muudatus, et kontrollida nihkunud asukohti.
Kontrollitud on sisendite säilimine, uute stseenide algolek, 13 vigast sisendit,
olemasolevad plokikirjed, Send/Return, gridi lipud, modifieri eesosa ja süsteemisaba.
Lisaks taastab sõltumatu vana→NewLook rekonstruktsioon täpselt kasutaja kogu
12 804-baidise keha. Muutmata parameetritega koostamine säilitab sama keha.
Vanad koostaja integratsiooni- ja regressioonitestid läbivad.
`FM3_NEWLOOK_TESTS.json` sisaldab tulemusi. JSON Schema uus väli on struktuurselt
kontrollitud, täielikku skeemivalidaatorit ei kasutatud.

Raporti `changedBodyOffsets` ja `allowedBodyOffsets` on lisamise järel koostatud
keha koordinaatides; `insertions` kirjeldab eraldi lisatud kirjeid ja gridi kohti.
`routingPreserved:false` on lisamise puhul oodatud; `onlyDeclaredSlotInsertions`
kinnitab, et muudetud on üksnes ette nähtud shundi efektitunnus. Uus toorkeha
pikkus, tihendus, CRC, kaadrid, footer ja nulltäide loetakse tagasi.

Katse `examples/FM3_NEWLOOK_INSERT_TEST.syx` koos TXT/spec/raportiga on
lõpetatud: lisab ainult Choruse rida3/veerg3, kanal B 4-Voice Analog; Scene6
valib B, kuid kõigis stseenides jääb Chorus bypass'i. Kasutaja tagasieksport
`examples/FM3_NEWLOOK_INSERT_TEST_export.syx` kattub kõigi 13 106 kehabaidi
osas täpselt, ilma normaliseerimiseta. Säilivad kogu grid, Send/Return, kõik
plokikirjed, stseenikanalid/bypass, nimi FM3 NEWLOOK INSERT TEST ja valitud
Scene2. Amp B Level -3dB ja Amp C -8dB ei muutunud. Generaator taastab algse
SYX-i baitidentselt. Mõlema tihendatud pikkus4337; tihendatud esitus erineb,
päise erinevus on ainult CRC. Kaadrid, CRC, footer ja nulltäide läbivad.

Ekspordi SHA-256:
`c258a4b6952687acc693a400b2a2d0310db6301d2daae01b363077034d28c381`.
Tõend `FM3_NEWLOOK_HARDWARE_ROUNDTRIP.json`, korratav kontroll
`test-composer-newlook-hardware.mjs`. Ära nõua selle katse kordamist.

See on ühe automaatse plokilisamise tehniline kinnitus; Chorus oli bypass'is.
Ära nimeta faili uueks heaks kiidetud artistisoundiks ega vali seda vaikimisi
puhta kasutaja NewLook-aluse asemel. Jätka ühise koostajaga ja lisa plokke
muusikalise vajaduse järgi. Järgmine seadmekatse lähtub konkreetsest uuest
kooslusest või kirjutusvõimalusest; vanemat Pitchi tehnilist katset ega uut
tüübi-/tasemekogumist ei nõuta automaatselt.

## Kasutaja valitud Pitchi katse on kinnitatud

Kasutaja palus pärast Choruse-lisamise kinnitust jätkata pooleli jäänud
Pitchi koostajakatsega. Uus `examples/FM3_NEWLOOK_PITCH_TEST.syx` kasutab
puhast NewLooki ja asendab järgmise katse rollis vana `FM3_COMPOSER_PITCH_TEST`.
Üks kirjeldus ühendab Amp/Cab, Drive, Delay, Reverb ja Pitchi. Olemasolevad
seaded rakendatakse uuesti samade väärtustega ning jäävad baitidentselt alles.
Ainus lisanduv plokk on Pitch rida3/veerg2, Returni järel: B Virtual Capo,
C Dual Detune. Scene2 valib B ja Scene6 C; Pitch jääb kõigis stseenides bypass'i.

Sõltumatu kontroll taastas täpselt kogu12 804-baidise algkeha, eemaldades
väljundist958-baidise Pitchi kirje ja taastades ühe shundi ID. Kummagi küsitud
kanali kõik114 sõna kattuvad kogutud malliga. Uus keha13 762 baiti; SYX SHA-256
`7cd158293247cc80083f316eb4916b31d37563f150d92a2dc257370bf4b0c3a2`.
Kontrollaruanne `FM3_NEWLOOK_PITCH_TEST_CHECKS.json`.

Kasutaja `examples/FM3_NEWLOOK_PITCH_TEST_export.syx` kinnitab kogu13 762-baidise
keha täpse säilimise. Kõik456 Pitchi parameetrisõna, stseenikanalid/bypass,
kahe rea grid, Send/Return, teised plokid, nimi ja valitud Scene2 kattuvad.
Seadmeekspordist taastub ainult Pitchi eemaldamise ning shundi ID taastamisega
täpselt algne12 804-baidine NewLook: kõik senised soundiseaded ja tasemed säilivad.
Generaator taastab esitatud faili baitidentselt. Tihendatud esitus erineb,
mõlema pikkus4525; päistes erineb ainult CRC. Kaadrid, CRC, footer ja nulltäide läbivad.

Ekspordi SHA-256:
`d8ab1f7915e6d06990692b78b8a29b76035ed9216f528891ae88b864b653e437`.
Tõend `FM3_NEWLOOK_PITCH_HARDWARE_ROUNDTRIP.json`; korratav kontroll
`test-composer-newlook-pitch-hardware.mjs`. See katse on lõpetatud; ära nõua
kordusimporti, tagasieksporti ega vana asendatud Pitchi koostajakatset.

Kuue perekonna koostamise ja automaatse Pitchi-lisamise selle näidise seadmering
on kinnitatud. See ei tähenda kõigi võimalike koosluste seadmekinnitust. Pitch
oli bypass'is; uut kuulamishinnangut, aktiivse Pitchi heli ega CPU-näitu ei antud.
Jätka puhtal NewLook-alusel järgmise konkreetse soundi vajadusest lähtudes.

## Filteri lisamise katse on kinnitatud — 0.53.1

`FM3_NEWLOOK_FILTER_TEST_export.syx` kattub kõigi 13 146 kehabaidi osas
loodud presetiga. Filter rida2/veerg9, A High-Pass / B Low-Pass / C Peaking /
D Tilt EQ, Scene2 A ja Scene6 C, kõik stseenid bypass'is. Kõik algsed
12 804 baiti on taastatavad ainult Filteri eemaldamise ja shundi taastamisega.
Seega säilivad sobivaks tunnistatud tasemed, stseenid ja Send/Return-paigutus.
Tõend `FM3_NEWLOOK_FILTER_HARDWARE_ROUNDTRIP.json`; täpne ulatus
[Filteri juhendis](FM3_COMPOSER_FILTER.md). Seda katset ei korrata.
Aktiivse Filteri heli ja CPU jäid hindamata. Hilisemad üksikjuhtide punktid
on eraldi mõõdetud ning kirjeldatud Filteri juhtide juhendis.
