# Amp Level A–D arendus — 2026-10-13 / plugin 0.2.2

## Praegune seis: mõõtmised kontrollitud ja integreeritud

Kasutaja `FM3_AMP_LEVEL_session_TULEMUSED.zip` sisaldab viit edukat GET/SYX
paari ja 20 kinnitatud kandidaati, mis on nüüd auditeeritud. Kõik 576 Amp-sõna
kattuvad igas paaris, kõik muud presetiparameetrid säilivad ning A/B/C/D
mudelid on vastavalt ID4/103/24/11. Mõõdetud dB/toorsõna vasted:
−80→0, −30→32767, −6→48495, 0→52427, +20→65534.

Plugin 0.2.2 lisab A/C/D täpsed viis väärtust senistele −12/−11 punktidele.
B senine skaala säilib; viis uut punkti kinnitavad seda ainult Brit Silveri
puhul. Moodul `fm3-amp-level-measurements.mjs` kontrollib räsitud lähtefaile,
GET-paare ja kogu presetikeha. `fm3-composer-amp-levels.mjs` rakendab ainult
lubatud kanal/mudel/väärtus kombinatsioone. Generaatori üldine dev-versioon
säilib; täpne uus revisjon on `amp-level-points-2026-10-13` ning plugina
pakendiversioon on 0.2.2.

Testid: viis ekspordikeha taastuvad tervikuna, 140 üksikpunkti kontrolli seitsmel
alusel, seitse nelja kanali ühiskontrolli, seitse senise B-välja samaväärsuse
kontrolli ning 54 vigase sisendi tõrjumist. Ka varasemad A ja C/D regressioonid
läbisid. Bonamassa V2 fail säilis baitidentne. Uus kuulamis- ja CPU-hinnang
puudub; sama riistvarakogumist ei korrata. Täpne raport:
`FM3_AMP_LEVEL_ABCD_VALIDATION.json`.

Allikad koos algse ZIP-iga on `skills/instructions/references/amp-level-20261013/`.
Järgmine arendusvõimalus on Leveli teisendusfunktsiooni audit FM3-Editi juba
kogutud andmetest. Viis punkti ei anna veel luba A/C/D vaheväärtuste või teiste
mudelite üldistamiseks. +20 dB mõõtepresette ei kasutata muusikaliste presetitena.

## Koguri loomise seis — plugin 0.2.1 (ajalooline)

Lisatud iseseisev jätkatav kogur `skills/instructions/scripts/amp-level-collector/`.
Generaatori `jb-composer-0.13.0-dev` kirjutustuge ei laiendatud: uus seadmetõend on ootel.

## Auditi järeldus

- A: Double Verb Vibrato (ID4), ainult täpne −12 dB punkt (raw 44563).
- B: senine −80…20 dB kirjutustugi säilib; see ei tõenda kogu skaala seadmekinnitust.
- C: USA MK IV Lead Bright (ID24), ainult −11 dB (raw 45218).
- D: Plexi 50W High 1 (ID11), ainult −11 dB (raw 45218).

Allikad: `FM3_COMPOSER_AMP_LEVELS.md`, `FM3_COMPOSER_AMP_CD_LEVEL_VALIDATION.json`,
kirjutaja `scripts/fm3-composer-amp-levels.mjs` ja tegelikud eksportfailid.
Amp PID1 asub sisukeha offsetidel 4658, 4946, 5234 ja 5522. Kanalil on 144
uint16 sõna; kõik 576 Amp-sõna võrreldakse bulk GET-vastusega.

## Valminud järgmine samm

Viis uut presetieksporti ning viis kasutaja kinnitatud GET-i koguvad kõigil
neljal kanalil −80, −30, −6, 0 ja +20 dB punktid. Nihutatud väärtused vähendavad
kanalite segiajamist. Olemasolevat algmõõtmist ei korrata. Alus on byte-for-byte
`examples/FM3_AMP_CD_LEVEL_CHECK_export.syx`, SHA-256
`aac60417ad82db7be996bbc1dd6026a2ff9a5a246bdf4966c116ab33cd87c237`.

Kogur kontrollib enne GET-i kogu presetikeha kõrvalmuudatusi, stseene, mudeleid,
kaadreid, CRC-d ja päiseid. Nime muutus on eraldi raporteeritud erand.
Kasutaja kinnitab nelja näidu dB-sildid; toorandmetest neid ei oletata.
Igas katses on ainult üks Amp GET (`f0000174111f3a0031f7`), ilma automaatse
korduspäringuta. Pooleli/ebaõnnestunud katsed säilivad. Jätkamisel kontrollitakse
edukad ekspordid ja GET-paarid uuesti; sessiooni lukustus väldib paralleelset tööd.

Paketis on algpreset, varasema muusikalise V2 taastamisfail, Python 3.9+
kogur, Node.js 18+ offline-kontroll, olemasolev codec koos litsentsiga,
eestikeelne juhend ning sünteetilised testid. Füüsiline kuulamisahel tuleb
vaigistada, sest mõnes etapis on +20 dB.

## Valideerimise piir

Sünteetilised testid kontrollivad viit järjestikust sammu, pausi/jätkamist,
vigase ekspordi tõrjumist enne GET-i, vastuolulist vastust, katseandmete
muutmist, ühte GET-i virtuaalse serial-pordi kaudu ja pooliku kirjutuse
kordamise keeldu. Vt koguri `TEST_RESULTS.json`.

Uue koguri Maci/FМ3 riistvarakatse, 20 tegelikku mõõtepunkti ning uue
Level-skaala kirjutustugi on **ootel**. Need viis punkti ei anna automaatselt
interpolatsiooni ega kinnitust teistele Amp-mudelitele. Riistvaraandmete järel
auditeerida: exact raw/dB vasted, kanali ja mudeli ulatus, ümardus ning
piirväärtused; lisada ainult tõendatud kirjutused ja nende tagasilugemise kontroll.

Versiooni 0.2.0 avalik varukoopia on GitHubi `alakahil/mcp-midi-control`
main-harus commit'is `cd504fc1af0537a43f4d5b5f99b83ea860917b55`,
teel `backups/fm3-sound-architect-2/0.2.0`. See varukoopia ei sisalda käesolevat
0.2.1 arendust. Plugina privaatne identiteet ja jagamisseaded säilivad.
