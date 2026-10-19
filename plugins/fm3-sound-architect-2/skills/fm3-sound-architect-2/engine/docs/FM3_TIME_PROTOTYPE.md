# Time/Feedback arenduskatse — 0.26.1
2026-10-01. Firmware siht 13. Kasutaja kinnitas kõik selle aja/Feedback/Tempo katse oodatud väärtused.
Alus ja sõltuvused: sama SHA-kontrollitud Baaspreset.syx; Node.js; offline fm3-time.mjs → fm3-tone.mjs → fm3-scenes.mjs → fm3-prototype.mjs ja fm3-codec.mjs. Võrgu ega seadme ühendust ei kasutata.

## Kasutamine
```sh
node skills/instructions/scripts/fm3-time.mjs skills/instructions/references/Baaspreset.syx skills/instructions/examples/FM3_SA_TEST_TIME.spec.json /ABS/OUTPUT
```
Nimi ja kõik neli arvulist välja on nõutud. Väljund SYX, TXT ja validation.json; wx väldib ülekirjutamist.

| Väli | PID | Body offset | FM3 teisendusvahemik | Lubatud katsevahemik | Katses |
|---|---:|---:|---|---|---|
| delayTimeMs | 8 | 7408 | 1–16000 ms | 50–1000 ms | 400 ms |
| delayFeedback | 10 | 7412 | −100…100% | 0–50% | 25% |
| reverbTimeS | 1 | 9566 | 0.1–100 s | 0.5–5 s | 2.5 s |
| reverbPredelayMs | 9 | 9582 | 0–1000 ms | 0–100 ms | 40 ms |

Teisendus round((v−min)/(max−min)*65534). Eeldatavad raw väärtused 1634,40959,1574,2621; dekodeeritud arvud 399.913 ms,25.0008%,2.4994 s,39.9945 ms. Kasutaja kinnitas oodatud ekraaniväärtused; täpset ekraanil näidatud komakohtade arvu eraldi ei dokumenteeritud.

## Allikas ja piirangud
Pinned forgefx-midi commit 553d24b7409302908d5c7e46a71b45e07dffdc05: src/devices/gen3/catalog.ts resolveCalibration eelistab seadme cache'i float-vahemikke üldkataloogi tuletatud piiridele. FM3_BLOCK_PARAM_TABLES ranges annab ülaltoodud vahemikud. params.ts sisaldab vastuolulisi AM4-st tuletatud piire Delay 0–8000 ning Reverb Pre-Delay 0–250; neid ei kasutata. Valikut toetavad nüüd selle konkreetse katse kasutajakinnitus ja tagasieksport; kogu vahemiku toetust see ei tõenda.
Delay ID70 ankur7346 +46 +2*PID; Reverb ID66 ankur9518 +46 +2*PID. SHA ja ankrud nõutud. Delay kirjutab fikseeritud asukohti; Reverb kasutab olemasolevat IR-kirjutajat. Ülddekodeerija Delay puudujääk pole parandatud.

Delay A Tempo PID15 offset7422: algne raw14 (1/4) → raw0 (NONE). Reverb A Pre-Delay Tempo PID62 offset9688 raw0 (NONE) säilib. Eesmärk vältida millisekiundi väärtuse allumist nooditempole. Teisi tempovälju, Time R, master time'i ega mudelit ei muudeta. Kuuldava kestuse täpsust need failikontrollid ei tõenda.

## Kaasnevad seaded
Sama mis TONE katses: Amp B Gain5/Mid5/Treble4/Presence2/Level−18 dB; Delay A Mix15%; Reverb A Mix12%; Scene2 Delay sees, Scene1 Reverb A. Amp B stseenid2/6; Delay A kõik; Reverb A 1/3/4/6/7/8. Cab, mudelid, routing, muud kanalid/juhtimine jäävad baasist.

## Failikontroll ja läbitud katse juhis
Kaadrid, CRC, footer, kogu body võrdlus, päiste säilimine ja raw tagasilugemine läbitud. test-time.mjs kontrollib eraldi kuue oodatud sõna loendiga kogu body't ning muutmata grid'i; 8 vigast sisendit tõrjutud. Varasemaid mooduleid selles versioonis ei muudetud.
Anna üks SYX/TXT paar. Kasutaja impordib oma tööd säilitades; kontrollib Scene2 Delay A Time≈400ms/Feedback25/TempoNONE ning Scene1 Reverb A Time2.5s/Pre-Delay≈40ms/TempoNONE. Küsi tegelikud väärtused ja üks tagasieksport; erinevuste korral palu enne eksporti mitte käsitsi parandada. Raporteeri kõik erinevad baidid, sh teadmata offset0. Heli ja CPU eraldi kinnitamata.


## Riistvaratulemus 2026-10-01
Kasutaja: „Kõik oodatavad väärtused olid õiged”. Lisatud `skills/instructions/examples/FM3_SA_TEST_TIME_export.syx` ja `docs/FM3_TIME_HARDWARE_ROUNDTRIP.json`.

Kõik kuus kontrollitud Time/Feedback/Tempo raw-väärtust säilisid täpselt. Nimi ja dump-päis säilisid; kõik kaadrikontrollsummad, CRC ja footer läbisid kontrolli. 14 222-baidises lahtipakitud body's on täpselt üks erinevus: offset0 genereeritud1 → eksporditud0. Ülejäänud 14 221 baiti kattuvad. Erinevuse tähendus jääb tõendamata, seda ei ignoreerita vaikimisi. Kuuldav tulemus/CPU ei ole eraldi kinnitatud.

Kinnitatud on see väärtuste kombinatsioon sama baasi ja firmware13-ga. Üldotstarbeline generaator, mudelivahetus, Cab/IR valik, uued plokid/routing ja teiste kanalite täielik kirjutamine on endiselt arendamisel. Järgmine praktiline arendusetapp: koonda kinnitatud juhtseaded ühtseks presetikirjelduseks, mille SYX ja TXT vastavad samadele väärtustele ning puuduvad varjatud katsevaikeväärtused. Uute kirjutusfunktsioonide lisamisel säilita sihitud valideerimine.

