# Tabelipõhine kodeerija — 0.74.0, 2026-10-13

`scripts/fm3-table-encoder.mjs` kodeerib iga FM3 parameetri FM3-Editis kuvatavast
väärtusest 16-bitiseks sõnaks. Toorväärtusi pole vaja eraldi mõõta. Allikas on
`references/fm3-param-dictionary.json` (SHA-256 `4a31bb55…f9d449f`): FracTool 3.87
sisseehitatud FM3 tabel (model 0x11, vorming 0x0146; 2892 parameetrit, 488 valikuloendit)
koos forgefx-midi FM3 nimedega. Analüüsiaruanne:
`../claude-analysis-20261013/FM3_PARAMEETRITE_ANALUUS_20261013.md`.

## Valem

    n = (v/mult − min)/(max − min)        lineaarne
    n = ln((v/mult)/min)/ln(max/min)      logaritmiline (flags kõrgema baidi nibble 0x4)
    wire = round(n × 65534)

Nihe presetis: `block.start + kanal × words × 2 + pid × 2`. `block.start` tuleb
olemasolevast `fm3-composer-bases.mjs` paigutusest.

## Tõendid (`scripts/test-table-encoder.mjs`)

- 280/280 seadmel mõõdetud punkti (Filter, PEQ, Drive, GEQ) klapivad ±1 LSB täpsusega.
- 12/12 olemasolevat käsitsi kalibreeritud juhti (`fm3-controls.mjs`) annavad sama nihke ja sama toorväärtuse.
- Kirjutusrada: kaadrid, CRC, footer, kehabaitide tagasilugemine, kõrvalmuudatuste puudumine ja päis.
- Kontrollimata klassi kirjutamisest keeldutakse.

## Kontrollitasemed

| Staatus | Vaikimisi kirjutatav |
| --- | --- |
| measured, taper-class-verified, enum-labels-crosschecked | jah |
| linear-by-structure, enum-labels | ainult `--allow=…` võtmega |
| unverified-taper (klassid 0x0/0x2/0x5/0x6/0xF) | ei; ainult `--experimental` partiikatses |

Seadme import ja heli on uute väärtuste puhul katsetamata. Ühtki varasemat mõõtmist ega kinnitatud presetikatset ei korrata ega muudeta.

## Kasutus

    node scripts/fm3-table-encoder.mjs examples/JB_RHYTHM_LEVEL_MINUS3.syx spec.json OUT
    spec: {"name":"MY TONE","controls":[{"block":"amp","channel":"B","param":"DISTORT_MID","value":6.5}]}

`param` võib olla FM3-Edit'i sümbolnimi (`DISTORT_MID`) või PID. Valikuloendi väärtuse võib anda nimena.

## Partiikatse: FM3_TAPER_BATCH_TEST

`scripts/fm3-taper-batch.mjs` → `examples/FM3_TAPER_BATCH_TEST.{syx,txt,spec.json,validation.json}`.
Standardalusel on 19 klassi 0x05/0x06 parameetrit kanalis D toorväärtusel 16384 (n = 0,25).
Kasutaja impordib faili ühe korra ja loeb FM3-Editist 19 näitu. Eksporti ega kuulamist pole vaja.
Tabelis on iga parameetri kohta lineaarse, logaritmilise ja 0–10 nupuskaala ennustus.
Kui tulemus selgub, tõstetakse klass vastavale kontrolltasemele ja kodeerija lubab selle kirjutamise.
