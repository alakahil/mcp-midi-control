> **Puuduv Max on nüüd kogutud ja kontrollitud.** [Kogumisringi tulemus ja
> 0.3.13 kirjutaja kandidaat](modifier-measured-points-result.md).
> Allpool olevat Maxi lõpetamise katset ei ole vaja korrata.

# Koondkatse B: üheksa uut punkti kinnitatud, Max jäi 7.50 — 21.10.2026

**B fail on korras ja üheksa välja uut punkti saab kasutada.** A-ga võrreldes
muutusid üheksa sõna 17 baiti; ülejäänud 14 205 sisubaiti säilisid.
Kõrvalmuudatusi ei leitud. Kaadrite kontrollsummad, preseti CRC, footer,
modifikaatorite struktuur, päised ja nulltäide läbisid kontrolli.
Pakitud sisu pikkus muutus 4946 → 4945 baiti.

Pilt avanes. **Release on 999.9 ms**, nagu kasutaja kirjutas; Attack on
500.0 ms. Release'i ümarduse tõttu ei ole lisakatset vaja.
**Max on nii pildil kui ka ekspordis endiselt 7.50**, plaanitud 5.00 asemel.
Seepärast on B osaliselt täidetud koondkatse; üheksa tulemust säilivad.

| Väli | B pildil | A toorkood → B toorkood | Tulemus |
| --- | --- | --- | --- |
| Max | **7.50** | 49159 → 49159 | Muutmata; 5.00 punkt puudub |
| Start | 20.0% | 6553 → 13107 | Uus punkt |
| Mid | 55.0% | 26214 → 36044 | Uus punkt |
| End | 80.0% | 58981 → 52427 | Uus punkt |
| Slope | 35.0% | 39320 → 22937 | Uus punkt |
| Attack | 500.0 ms | 655 → 3277 | Uus punkt |
| Release | 999.9 ms | 1638 → 6553 | Uus punkt |
| Scale | 0.750 | 38537 → 28673 | Uus punkt |
| Offset | +15.0% | 29490 → 37682 | Uus punkt |
| Off Value | 80.0% | 10922 → 54612 | Uus punkt |

Min 2.50 / 16375 ning kõik tabelivälised baidid säilisid. Pildil on endiselt
FW13.00, External 1, Channel All, PC Reset Off, Damping Linear, Update Rate
Slow, Auto Engage Off, Scene 2 ja Wah' bypass.

## Mida kahe koondkatsega saime

A ja B annavad **19 uut väljapunkti kahe ekspordiga**: A kümme ning B üheksa.
B Max 7.50 on korduv muutmata vaatlus, mitte uus 5.00 punkt. Need ei ole
19 sõltumatut üksikmuudatuse katset.

Täiendav arvutikontroll võrdles kõiki 20 A/B kuvanäitu (sh korduvat Maxi)
hüpoteesiga `raw / 65534`, millele rakendati cache'i lineaarset või
logaritmilist vahemikku ja kuvakordajat. Maxi puhul kasutati eraldi
Wah Control 0..10 vahemiku hüpoteesi. Kõik punktid mahuvad pildinäidu
ümardussammu poole laiuse sisse. Tulemus on failis
`modifier-batch-scaling-hypothesis.json`.

See toetab nende punktide skaalahüpoteesi, kuid ei kinnita täpset
sisestusväärtus → uint16 ümardamist ega täisvahemiku kirjutust. Näiteks
Maxi mõõdetud kood 49159 säilib; seda ei asendata ideaalse valemi väljundiga.
Uue kirjutustoe ettevalmistamisel tuleb hoida täpsed mõõdetud punktid ja
vaadeldud profiilid eraldi üldise skaala või sõltumatute kombinatsioonide
väitest. Heli, pedaali ega DSP käitumist need failid ei valideeri.

## Järgmine füüsiline samm: ainult puuduva Maxi lõpetamine

Kogu koondkatset B ei korrata. Praegune päris B fail on uus fikseeritud
algseis; uut algseisu eksporti pole vaja.

1. Jätka praegusest B seisust. Kui oled vahepeal midagi muud muutnud, säilita
   oma töö ja taasta olemasolev `FM3_MOD_BATCH_B_export.syx`.
2. Ava Wahwah 1 → Control → Modifier. Muuda **ainult Max 7.50 → 5.00** ja
   veendu enne eksporti, et väljal on tõesti **5.00**.
3. Min jääb **2.50**. Üheksa B välja jäävad ülal tabelis nähtud väärtustele,
   sealhulgas Attack 500.0 ms ja Release 999.9 ms. Säilita kõik muud
   seadistused, sisemine preseti nimi, Scene 2 ja bypass. Ära liiguta pedaali.
4. Tee **üks ekraanipilt** ja **üks eksport** välise nimega
   **FM3_MOD_MAX_5p00_export.syx**. Lisa „Muutsin ainult Maxi 7.50 → 5.00”.

See lõpetab puuduva teise Max-punkti ja annab ühtlasi eraldi Max-muutuse
kontrolli. Praegu ei küsita üheksa õnnestunud B välja korduseksporte.
Ülejäänud töö jätkub arvutis kogutud punktide ja teisenduskoodi alusel;
täiendava füüsilise katse vajadus peab tulenema konkreetsest lüngast.

## Korratav kontroll ja päritolu

- `node --test tools/fm3/test-modifier-batch.mjs`: **13/13 läbis**. Lisandusid
  päris B osalise tulemuse korduskontroll ning B algfaili ja ainult Maxi
  muutmist nõudva järelkatse kontrollid. Sünteetilised katsed ei lisa
  seadmemõõtmisi ega kinnita veel Maxi 5.00 koodi.
- B: `node tools/fm3/compare-modifier-batch.mjs --plan docs/fm3/parameter-evidence/modifier-batch-b-plan.json docs/fm3/parameter-evidence/captures/FM3_MOD_BATCH_B_export.syx`
- Max: `node tools/fm3/compare-modifier-batch.mjs --plan docs/fm3/parameter-evidence/modifier-max-5-plan.json /ABS/FM3_MOD_MAX_5p00_export.syx`
- `modifier-batch-b-comparison.json` on automaatne lugemisraport. Eraldi
  `modifier-batch-b-evidence.json` sisaldab pildi kontrollitud väärtusi,
  kasutaja Release'i kinnitust ja Maxi puuduva muudatuse selget märget.
- B SYX SHA-256: `c6d460678803699e245ac7d13e777afd6993efc0e704508e4ac1995e77fe1b63`.
- B keha SHA-256: `b72c3242f8de4f16646c703832112cf955c373128b376013cbffda2e38f889db`.
- B ekraanipildi SHA-256: `11766c0081ee2e6086757bc1c3cbd47faee77ebec68193dd1b63df91e4a34d44`.
  Algne pilt jääb kasutaja manusena alles; lähtereposse seda ei lisata.
- Uut pluginaväljalaset, avaldamist, seadmepäringut ega REA/Ghidra käivitust
  selles sammus ei tehtud. Avaldatud plugin jääb 0.3.11 ja varasem 0.3.12
  kandidaat säilib muutmata lähtefailidega.
