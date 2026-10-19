# Ampi Level kanalite kaupa — plugin 0.2.2

Koostaja väli `ampLevels` määrab kanali ja `levelDb` väärtuse. Algne tugi
lisandus koostajas `jb-composer-0.8.1`; praegune mõõtepunktide revisjon on
`amp-level-points-2026-10-13`.
See käsitleb ainult Levelit, mitte Gaini, EQ-d, Master Volume'i ega stseeni
väljundtaset. Mudelivalik rakendub enne Levelit. Ühine kanal mõjutab kõiki
seda kasutavaid stseene. Olemasolevate profiilide `levelB` säilib.

| Kanal | Praegu kirjutatav | Tõend |
| --- | --- | --- |
| A | Double Verb Vibrato: −80, −30, −12, −6, 0, +20 dB | Varasem −12 dB eksport ja viis uut GET/SYX paari |
| B | −80…20 dB, senise `levelB` toega sama ulatus | Brit Silveril on uutes paarides kinnitatud −80, −30, −6, 0, +20 dB; kogu vahemik ja teised mudelid ei saa sellest uut seadmekinnitust |
| C | USA MK IV Lead Bright: −80, −30, −11, −6, 0, +20 dB | Varasem −11 dB eksport ja viis uut GET/SYX paari |
| D | Plexi 50W High 1: −80, −30, −11, −6, 0, +20 dB | Varasem −11 dB eksport ja viis uut GET/SYX paari |

Näide: `"ampLevels":[{"channel":"A","levelDb":-12}]`. B võib kasutada
vana `levelB` välja või loendit; mõlemad korraga samas kirjelduses annavad
vea ka sama väärtuse korral. Duplikaatkanalid, lisaväljad ja mõõtmata A
mudel/väärtus lükatakse tagasi. A/C/D töötavad tabelis loetletud mudelite
täpsetel väärtustel. Teiste mudelite või väärtuste küsimine annab vea;
interpolatsiooni ei lisatud. Uute punktide tõendid ja kogu sisu taasesituse
kontroll on kirjas `FM3_AMP_LEVEL_ABCD_VALIDATION.json` failis.

## A-kanali tõend ja Bonamassa V2

`skills/instructions/examples/JB_EIGHT_SCENES_V2_export.syx` SHA-256:
`db508e85b3e0ef015dce6b562699f16e20e5179917069d52de8ac22caf5da32d`.
V1 ekspordist erinevad ainult kehabaidid 4658 ja 4659: Amp A PID1,
toorsõna 46529 → 44563, ekraanil −9 → −12 dB. Mudel on Double Verb Vibrato
(ID4). Kõik muud 13 144 kehabaidi, stseenid, paigutus ja päise nimi säilivad.
Kõik kaadri-, preset CRC-, footer-kontrollid läbivad. Üks mõõtepunkt ei anna
õigust teiste A väärtuste/mudelite või C/D kontrollimatuks kirjutamiseks.

Uus `JB_EIGHT_SCENES_V2.syx` taastub ühest `.spec.json` kirjeldusest. Kõik
13 146 sisubaiti kattuvad sõltumatu kasutaja ekspordiga. Nimi muudeti V2-ks;
kasutaja ekspordis oli sisemine nimi V1. `knownDeviceBody` tuvastab täpselt
kogu ekspordikeha, kuid uue nimega fail ei saa vale impordikinnitust.
Stseenid 1/5 on 3 dB vaiksemad, teised kuus säilivad. Uue taseme kuuldav
sobivus on ootel. CPU 45,7–46,7% oli varasem V1 vaatlus, mitte V2 uus mõõtmine.

Kontroll: `scripts/test-composer-amp-levels.mjs`, raport
`FM3_COMPOSER_AMP_LEVEL_TESTS.json`: tegeliku ekspordi täiskeha, ühe sõna
eraldatus kõigil seitsmel alusel, B tagasiühilduvus, vigaste/toetamata
sisendite tõrjumine ning vale seadmekinnituse vältimine.

## C ja D: mõõdetud ja rakendatud

Kasutaja `FM3_AMP_CD_LEVEL_CHECK_export(1).syx` on pakendis kujul
`skills/instructions/examples/FM3_AMP_CD_LEVEL_CHECK_export.syx`.
SHA-256 `aac60417ad82db7be996bbc1dd6026a2ff9a5a246bdf4966c116ab33cd87c237`.
V2-ga võrreldes muutusid ainult Amp C Level (5234, 47184 → 45218) ning
Amp D Level (5522, 47080 → 45218). Mõlemad on ekraanil −11,00 dB.
Keha SHA `2dd66a505053273fd72dd9400458e6a45f805672aa92ff418fa5ebf21b6b07e4`.

A −12 dB ja B −3 dB säilivad. Kõik teised sisubaidid, kaheksa stseeni,
Send/Return, routing ja süsteemiandmed säilivad. Kasutaja lähtus V2 nimega
preseti seisundist; võrreldes varasema A mõõtmise ekspordiga muutus nimi V1
→ V2, kuid võrreldes väljastatud muusikalise V2-ga nimi säilis. CRC ja
pakitud pikkus muutuvad vastavalt uuele pakitud esitusele; kõik kontrollid läbivad.

Koostaja taastab ühe kirjeldusega kõik 13 146 tegeliku ekspordi sisubaiti:
`ampLevels:[{channel:"A",levelDb:-12},{channel:"C",levelDb:-11},{channel:"D",levelDb:-11}]`.
Tehniline näidis on `examples/FM3_AMP_CD_LEVEL_CHECK.*`; see ei asenda
muusikalist V2-t. Uus nimi/tihendus ei saa eraldi impordikinnitust; tegeliku
sisu kattuvust kontrollitakse kogu keha järgi. Ainult C või teistsugune
muu parameeter ei päri C/D ühiskatse seadmekinnitust.

Kontroll `scripts/test-composer-amp-cd-levels.mjs`, raport
`FM3_COMPOSER_AMP_CD_LEVEL_VALIDATION.json`: iga C/D kanali eraldatus kõigil
seitsmel alusel, mõlema kooskasutus, kõigi A/B/C/D Levelite ühiskasutus,
varasema muusikalise V2 täpne baitidentne taasesitus ja vigaste sisendite tõrjumine.
Sama eksporti ega GET-i pole vaja korrata. See kinnitus ei laiene teistele
C/D mudelitele, väärtustele, Gainile ega EQ-le.

Muusikaline `JB_EIGHT_SCENES_V2.syx` säilitab C varasema −8 dB ning D
ligikaudu −8,16 dB. C/D −11 dB olid ajutised mõõtepunktid. Taasta V2 ning
jätka clean-stseenide 1/5 taseme kuulamisega. Kuulamise järel sobivuse
kinnitust ega uut CPU-mõõtmist pole selle ekspordiga lisandunud.

## Mõõtmised integreeritud — plugin 0.2.2

Viiesammuline kogumine on lõpetatud. Kõigis viies paaris kattuvad 576 Amp-sõna
ning säilivad kõik muud presetikeha baidid. Generaator taastab iga ekspordi
kogu 13 146-baidise keha. Kokku lisandus 20 mõõtepunkti: A/C/D jaoks 15 uut
kirjutatavat punkti ja B viiele varasemale väärtusele uus mudelipõhine tõend.

| Kinnitatud näit | Toorsõna kõigil neljal mõõdetud kanalil |
| --- | --- |
| −80 dB | 0 |
| −30 dB | 32767 |
| −6 dB | 48495 |
| 0 dB | 52427 |
| +20 dB | 65534 |

Allikas `skills/instructions/references/amp-level-20261013/` säilitab originaalse
ZIP-i, kõik ekspordid, päringuvastused ning räsiga seotud indeksi. Failide räsid
kontrollitakse igal tõendi kasutusel; muutmata sisu lahtipakkimist võib korrata
mälus hoitava tulemuse kaudu. Muudetud või osaline preset ei päri kogu faili
seadmekinnitust. Uus nimi/tihendus ei saa eraldi impordikinnitust.

Vt `FM3_AMP_LEVEL_ABCD_DEVELOPMENT.md`. Sama kogumist ei ole vaja korrata.
Kuulamist ega CPU-d selles vaigistatud tasemekatses ei hinnatud; muusikaline
V2 ja selle varasem balanss säilivad.
