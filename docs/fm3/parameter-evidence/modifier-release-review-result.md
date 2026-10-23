# FM3 0.3.14 kandidaadi väljalaskeülevaatus — 23.10.2026

Avaldatud privaatne plugin on kontrollimise hetkel 0.3.13, release ID
`pluginrel_6ad8c64cdf2c81919b518b861f836843`. GitHubi main on
`5238ebc5c4cd19c0ea412cd964e5e770c09930e7`. See ülevaatus valmistab ette
0.3.14 kandidaadi; ei avalda pluginat ega muuda kaug-repot.

## Leitud probleemid ja parandused

1. Lõppfaili täpse Min/Max-i kontroll aktsepteeris korrektse CRC-ga faili,
   mille modifikaatori teine allikas või operatsioon oli muudetud. Ainult
   nelja sihtsõna kontrollist ei piisanud. Kontroll nõuab nüüd kogu tõendatud
   seost, tervet modifikaatorikirjet, üheselt määratud sihtplokki ja ruudustikku,
   tuntud stseenikonteksti ning konkureerivate sihtide puudumist.
   Viis korrektse kontrollsummaga negatiivset katset katavad teise allika,
   operatsiooni, konkureeriva sihi, katkise kirjepäise ja puuduva ruudustikulahtri.
2. Uuemate lähtefailide tõttu aegunud registrid uuendati pärast sisuvõrdlust.
   Parameetriregistri 3223 parameetrit, 914 vaatlust ja 734 malli ei muutunud.
   Inventuur suurenes ühe pakendatud Min/Max-tabeli võrra.
   Metaandmete võrdluse ja kodeerimismaatriksi ainus muudatus on lähteräsides;
   ükski mõõtetulemus ega tõenditase ei tõusnud.
3. Mõlemad manifestid, generaatori versioon ja kasutusjuhend on 0.3.14-ga
   kooskõlas. Võimekuse staatus `bounded-exact-input` kirjeldab funktsiooni,
   mitte avaldamise olekut. Avaldamise olek kuulub väljalaskekviitungisse.
   CI kontrollib lisaks riistvaralogi taasesituse ja kandidaadi veajuhte.

## Päritolu

Eelmise töökoopia Git-viit osutas kadunud vanasse töökausta. Hilisemaid
commit-objekte ei saanud taastada. Säilinud plugina lähtepuu SHA-256
`729343192913cee6c3e59288452ea7ce744c31e26113e6f773dab8d5b546cc8f`
vastas täpselt eelmise 49/49 kontrolli lähtepuule. Git-ajalugu taastati
olemasolevast bundle'ist commit'ini `c415b95ed9a388e030c796175863b8bff21ad07e`,
faile välja kirjutamata ega nende sisu asendamata. Säilinud hilisem töö ja
ülevaatuse parandused saavad uue commit'i. Varasema `36d4392…` commit'i
identiteeti ei esitata taastatuna. Masinloetav päritolu:
[modifier-release-review-source-recovery.json](modifier-release-review-source-recovery.json).

## Piirid ja lõppkontroll

Min/Max-i tabel ei muutu: kummagi välja 1001 täpsest sisendist kuus on
riistvaral mõõdetud ja 995 põhinevad nelja mudeli kokkulangevusel.
`fullRangeEncodingProven=false`; runtime MODE1 ja genereeritud uue faili
seadmeimport, STORE/reload, pedaal, heli ning CPU jäävad kinnitamata.
Vanad hiirega valitud punktid ja nende raw-koodid säilivad eraldi lepinguna.
Uusi riistvaratoiminguid, eksporte ega REA analüüsi selles ülevaatuses ei tehta.

Käesolev fail on kandidaadi eelkontrolli osa. Lõpptulemus tuleb siduda uue
puhta commit'i 49/49 raporti, deterministliku arhiivi kviitungi, lahtipakitud
paketi enesekontrolli ja täpse Min/Max-näite nelja väljundfaili kontrolliga.
Need commit'i järel saadud tulemused talletatakse tööaruandesse; siinne tekst
ei väida veel nende läbimist. GitHub CI ja tegeliku avaldatud paketi ning
hosti laadimiskontroll jäävad hilisema avaldamisetapi kontrollideks.
