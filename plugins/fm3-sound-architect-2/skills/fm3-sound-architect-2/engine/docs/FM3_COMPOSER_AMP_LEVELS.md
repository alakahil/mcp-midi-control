# Ampi Level kanalite kaupa — 0.58.0

Koostaja `jb-composer-0.8.1` lisab välja `ampLevels` (kanal ja `levelDb`).
See käsitleb ainult Levelit, mitte Gaini, EQ-d, Master Volume'i ega stseeni
väljundtaset. Mudelivalik rakendub enne Levelit. Ühine kanal mõjutab kõiki
seda kasutavaid stseene. Olemasolevate profiilide `levelB` säilib.

| Kanal | Praegu kirjutatav | Tõend |
| --- | --- | --- |
| A | Double Verb Vibrato, täpselt −12 dB | V1/V2 kasutaja eksportide üksiksõna muutus |
| B | −80…20 dB, senise `levelB` toega sama ulatus | Olemasolev kood ja varasemad B katsed; see ei kinnita kogu vahemikku seadmel |
| C | USA MK IV Lead Bright, täpselt −11 dB | Ühine C/D eksport, ainult vastavad Level-sõnad muutusid |
| D | Plexi 50W High 1, täpselt −11 dB | Ühine C/D eksport, ainult vastavad Level-sõnad muutusid |

Näide: `"ampLevels":[{"channel":"A","levelDb":-12}]`. B võib kasutada
vana `levelB` välja või loendit; mõlemad korraga samas kirjelduses annavad
vea ka sama väärtuse korral. Duplikaatkanalid, lisaväljad ja mõõtmata A
mudel/väärtus lükatakse tagasi. C/D töötavad loetletud mudelite täpsetel −11 dB punktidel. Teiste mudelite või väärtuste küsimine annab vea; interpolatsiooni ei lisatud.

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
