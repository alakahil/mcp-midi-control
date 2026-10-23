# Tabelipõhine kodeerija — 0.74.10, 2026-10-19

`scripts/fm3-table-encoder.mjs` kodeerib iga FM3 parameetri FM3-Editis kuvatavast
väärtusest 16-bitiseks sõnaks. Toorväärtusi pole vaja eraldi mõõta. Allikas on
`references/fm3-param-dictionary.json` (SHA-256 `a54e0ba2…a664d730`): FracTool 3.87
sisseehitatud FM3 tabel (model 0x11, vorming 0x0146; 2892 parameetrit, 488 valikuloendit)
koos forgefx-midi FM3 nimedega. Analüüsiaruanne:
`../claude-analysis-20261013/FM3_PARAMEETRITE_ANALUUS_20261013.md`.

## Valem

    n = (v/mult − min)/(max − min)        lineaarne
    n = ln((v/mult)/min)/ln(max/min)      logaritmiline (flags kõrgema baidi nibble 0x4)
    n = v/mult                            nupp (klass 0x5: FM3-Edit näitab 0–10; sisemine min/max on DSP vahemik)
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
| unverified-taper (klassid 0x0/0x2/0xF; 36 kirjet, presetides praktiliselt kasutamata: monitorid, TenTap, Pitchi noodid, globaalsed) | ei; ainult `--experimental` |

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

### Tulemus 2026-10-13 (0.74.1)

Kasutaja impordis faili ühe korra ja luges FM3-Editist näidud: `references/taper-batch-20261013.json`.

- **Klass 0x05 = nupp.** Näit = n × 10. Kõik 10 nähtavat parameetrit näitasid 2.50. Lineaarne ja logaritmiline ennustus olid valed.
- **Klass 0x06 = lineaarne dB.** Kinnitavad Cab Level 1/2 −30.00 ja Delay Compander −80 kanalil D ning Reverb Early/Late Level −3.00/0.00.
  Reverbi kaks näitu loeti Scene 2 kanalilt B; need vastavad aluse toorväärtustele 48495/52427 ja on samuti kehtivad punktid.
- Ei kuvatud: Delay Q (Digital Mono), Reverb Drive (Medium Room), Compressor Threshold 1/2 (Econo-Dyno-Comp). Need kuuluvad samadesse klassidesse.
- Klassid 0x05 (17 parameetrit) ja 0x06 (29 parameetrit) on nüüd staatusega taper-class-verified ja vaikimisi kirjutatavad.


## 0.74.2 sisendikontroll

Logaritmilise juhiku kuvatav väärtus peab olema positiivne ka siis, kui
ujuvkomatolerants lubaks väga väikest nulli või negatiivset sisendit. Regressioon
kontrollib Amp Master Vol Cap nulli ja väikest negatiivset väärtust nii üksiku
kodeerimise kui ka tervikliku kirjutuse kaudu; korrektne alampiir jääb lubatuks.

## 0.74.3 metaandmete lahendus

FM3-Edit 1.07.17 enda binaari ja FW13 vahemälu järgi lisati nimed
CHORUS_DELAYRANGE, CHORUS_BASS ja CHORUS_TREBLE. FUZZ_OVERSAMPLE
on tuvastatud, kuid redaktoris peidetud ning kirjutamisel blokeeritud ka
experimental/raw režiimis. DynaCab R1/R2 sisend jääb kuvatavale 0–10 skaalale;
0–100 protsendiesitus ei ole otsene sisend. [Tõendid ja piirid](FM3_METADATA_RESOLUTION.md).

## 0.74.4 tüübisobivus

Choruse ja Drive’i selgesõnalised kirjutused kontrollitakse lõpliku kanali tüübi järgi enne muutmist. Nime/PID/raw teed järgivad sama reeglit. Täpne ulatus, varulehtede käsitlus ja allesjäänud sõltuvused: [tüübisobivuse juhend](FM3_TYPE_APPLICABILITY.md). Skalaari kodeerimisoskus ei tähenda universaalset kirjutusluba.

## 0.74.10 Pitchi presetisõnad

[27 välja eraldi teisendus](FM3_PITCH_WORD_CODECS.md) korrigeerib vana
pideva skaala ja nullist algava enumi eeldused, muutmata algset sõnastikku.
`preset-word-crosschecked` lubab täisarvu/signed-int16 ja 1-st algavate enumite
kirjutamist ainult vastava mudeli ja sõltuvuste korral. See on failide ning
metaandmete ristkontroll, mitte uus FM3 mõõtmine või live MIDI SET.
NUMREPEATS on salvestatud kood; CUSTOMSCALE1/2 on nullist algav indeks.
Dünaamilised noodid, eriväärtuste kuvasildid ja globaalsete skaalade sisu
on eraldi piirangud. 65535 on lubatud ainult 20 kinnitatud märgiga välja −1-na.

## Klass 0x01 = salvestatud täisarv (2026-10-23)

Klassi 0x01 mitte-valikuloendi sõnad (578 kirjet) ei ole normaliseeritud 0…65534 väärtused, vaid märgiga
täisarvud (negatiivne kahe täiendina). Tõend: kõik 57 klassi 0x01 parameetrit, mis esinevad 574 erinevas kehas,
on vahemikku jäävad täisarvud (Pitch Shift −12 = 65524, Reverb Springs 3/4/6); FM3-Edit näitab Ten-Tap Number
of Taps toorväärtust 6 kui 6. `loadDictionary` annab neile `kind: integer`; staatus ei muutu (vajab endiselt
`allow: linear-by-structure`). Kordaja korral näit = toorväärtus × kordaja (Plex Number of Delays: toorväärtus 2 = 4);
kirjutatav väärtus peab olema kordaja kordne. Kordaja 0 (GLOBAL_CUSTOM_SCALE) on lukus.
