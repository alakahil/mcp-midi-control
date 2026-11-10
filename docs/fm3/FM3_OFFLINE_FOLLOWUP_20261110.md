# Auditi 10.11.2026 seadmevabad järeltööd

Alus: avaldatud 0.3.63, lähtecommit `afcf2504ac42bb1746af666bfaec3efe9eed3ee7`,
main `7e2bd2293d4041755372b373d8132c4f98d06206`. Järgmine kandidaat on 0.3.64.
Seadmega ei suhelda. Avaldamist, CI-d ja tegelikku hostikäivitust kinnitavad
välised väljalaskekviitungid; käesolev fail üksi neid ei tõenda.

| Auditi töö | Selle muudatuse sisu | Kontroll |
|---|---|---|
| N1 | Väljalaskejuhendi kehtiv ulatus; T32 lõppnivoo kuulamise ja T20 Cab-lõigete T34 täpsustused | Algkviitungid säilivad muutmata; käivitaja tempo välja algusversioon on 0.3.60 |
| N2 | Uus tavaline hostivestlus pärast avaldamist | Automaatne juhend leitakse enne alternatiive; taaste, enesekontroll, nelik ja `--verify`; välise katse tulemus eraldi |
| N3 | H1 SC1 → Reverb Mix, ALL, 10–40%, fikseeritud Room: Recording Studio A | Avaliku generaatori nelik, LOAD/STORE manifestid, kolm stseeni, preflight, tervikvõrdlus |
| N4 | H2 T36 Pealing Bells / Dub Echo / Mono Diffuser / Aurora Delay ühes A–D presetis | Nelik, kanali kõik 121 sõna, neli stseeni, CPU hinnang ja STORE vaatlusleht |
| N5 | Versiooni ja testiootuste 0.3.64 kooskõla, senise tõendiahela uuendus, uus pakkide regressioon CI-s | 89 mootoritesti ja töövoo 131 kontrollkäsku; puhas commit, CI, deterministlik pakett ja serverifailide võrdlus |

## Täpsed katsefailid

`node tools/fm3/audit-next-build.mjs /ABS/EMPTY_OUT` loob mõlemad pakid.
Juhend: [FM3_AUDIT_NEXT_GUIDE.txt](FM3_AUDIT_NEXT_GUIDE.txt).

| Katse | SYX SHA-256 | CPU tarkvarahinnang |
|---|---|---|
| H1 AUDIT SC1 REVERB MIX | `2898378cc5419ec61e2d30de75d4d3d6df5d6cd2472a3636b3d4f73d99577971` | S1–S3 44,6% |
| H2 AUDIT T36 MD STORE | `85638fe8996c43b998e17ef78d643a5cb8d7cefcaac12d4d049c3a8c51969873` | S1 51,1%; S2 52,6%; S3 50,1%; S4 51,6% |

CPU on mudeli `fm3-cpu 0.2.5` hinnang; uue koosluse tegelik koormus ja
veapiir pole mõõdetud. H1 stseenid 1/2/3 määravad SC1 väärtused 0/50/100%;
oodatud Reverb Mix on 10/25/40%. H2 valib MultiDelay kanalid A/B/C/D,
ainult A malli Mix muudetakse 30%-le. H2 on uus fikseeritud lõppfail,
varasem T36 kinnitas nende nelja tüübi importi ja heli, kuid mitte STORE-i.

## Kontroll ja tõendipiir

Mõlemad SYX-id taastati ka avaldatud 0.3.63 mootoriga: H1 ja H2 binaarfailid
on 0.3.64 kandidaadi väljundiga baittäpselt samad. Versioonimuudatus ei muuda
nende kahe fikseeritud sisendi kirjutustulemust.

`test-audit-next.mjs` loob kaks päris avaliku generaatori nelikut ja sünteetilise
salvestusseansi. See kontrollib 20 tõrjumist: vigased räsid, puudulikud kaadrid,
vale salvestuskoht, vigane bulk-vastus, keelatud siht, aktiivse seosega vastuolus
olev staatiline kirjutus, rikutud pakk ning
olemasolev väljundkaust. Sünteetiline seanss ei muutu seadmetõendiks ja puuduvad
vaatlused jäävad ülevaatamist ootama. Puuduv STORE on pooleli, mitte läbitud.

`audit-next-compare.mjs` kontrollib kogu preseti sisu. Lubatud on üksnes
valitud stseeni bait, tervete plokikirjete järjekord ja SysEx-sihtkoha päis.
Koguja ei tee SET-i, automaatset STORE-i, presetivahetust, stseenivahetust ega
üldseadete kirjutusi. `--preflight` lõpeb enne pordi valimist või avamist.

Uusi riistvaratõendeid ei lisandu: 19 Controllersi allika STORE-kinnitust,
39 MultiDelay malli, 8 genereeritud importi ja 4 STORE-kinnitust säilivad.
Reverb Mixi sihti ei lisata seadmel kinnitatud sihtide loendisse.
Skeem 0.8.9, 227 vaikimisi / 121 opt-in valikut ja 468 lipureegliga lubatud
modifikaatorisihti säilivad. B1/B2, P2/P3 ja T38 on tehtud ning ei vaja kordust.

## Järgmine seadmekord

H1 ja H2: kasutaja vaatab-kuulab kasutatud stseene, märgib CPU, teeb käsitsi
STORE → teine preset → tagasi ning kordab vaatlusi. Üks terviklugemine iga
fikseeritud preseti kohta; eraldi parameetrieksporte pole vaja. Mõlema katse
üldine vastuvõtuotsus sünnib alles tegelike andmete ja vaatluste ülevaatusel.
H3 lõplik esinemispreset ja H4 üks vajaduspõhine eriküsimus jäävad eraldi
seadmetöödeks; N4-s valiti aruande lubatud H2 haru.
