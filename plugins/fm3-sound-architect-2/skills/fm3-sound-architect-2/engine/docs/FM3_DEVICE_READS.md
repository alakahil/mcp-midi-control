# FM3 seadmest lugemine ja väärtuste kontroll (Claude, 2026-10-23)

Tulemused on failis `references/fm3-read-value-check-20261023.json`. Toorandmed on samas kaustas:
`fm3-read-probe-20261023-results.json` ja `fm3-value-check-20261023-results.json`. CI kontrollib neid
käsuga `node tools/fm3/read-value-ingest.mjs`.

Seadmesse saadeti ainult redaktsioonipuhvri dumpe (`7F 00`) ja lugemispäringuid
(`FM3_READ_PROBE.py`, `FM3_VALUE_CHECK.py`). Kohta 436 salvestas kasutaja esipaneelilt. Skriptid ei
salvesta kunagi.

## Lugemisteed (FM3 Mk II Turbo, fw 13)

| Päring | Tulemus | Kasutatav |
| --- | --- | --- |
| `fn=0x1F eid` ploki koondlugemine | Tagastab ploki kõik salvestatud sõnad kõigis kanalites. Lugemisproovis klappis 2752/2752. | jah |
| `fn=0x03` salvestatud koha dump | Tavaline 0x77/0x78/0x79 dump, mida meie lugeja avab (CRC kehtib). | jah |
| `fn=0x01 sub=0x2E` ruudustik + CPU | 48 lahtrit ja CPU (punkt 5). | jah |
| `fn=0x43` redaktsioonipuhvri dump | 0x51 + 64 × 0x52 + 0x53: 128 KB sisemine kujutis, mitte preseti keha. Dekodeerimata. | ei |
| `fn=0x01 sub=0x1F` näidutekst | Nuppude kohta teksti ei anna. Tüübiparameetrite puhul annab päringus oleva väärtuse (0) nime, mitte praeguse tüübi nime: kõik 6 juhtu klappisid sõnastiku indeksi 0 nimega, kuigi salvestatud tüüp oli muu. | ei |

`sub=0x1F` tulemus tähendab, et fractal-midi/fractal-gen3 „current type name“ lugemine näitab
esimest tüübinime. Ka varasem FM9 tõend oli samade indeks-0 nimedega. Parandus on eraldi töö.

## Väärtuste kontroll (punktid 3, 4, 6)

Seitse genereeritud presetti laaditi redaktsioonipuhvrisse ja loeti tagasi. Iga ploki kõik sõnad kõigis
kanalites ning kõik 48 ruudustiku lahtrit klappisid failiga, kokku 16 756 väärtust.

| Preset | Sisu |
| --- | --- |
| V01 | koostaja plokid + Drive 2, Mixer, Plex eristatavate juhtväärtustega |
| V02 | Gate, Looper (1 kanal), Ring Mod (2), Formant, Volume/Pan |
| V03 | Synth, Megatap (2) |
| V07 | Ten-Tap, Resonator (2), Multiband |
| V04 | Multiplexer, Compressor 2 / Drive 2 / Delay 2, paralleelread |
| V05 | Satriani Soap On A Rope V3 |
| V06 | Volume/Pan 0.3.17 pedaaliseosega (ploki sõnad; modifikaator ise pole ploki kirje) |

## STORE/reload

V04 salvestati esipaneelilt kohta 436 ja loeti `fn=0x03` päringuga tagasi.

- Keha on sama pikkusega, CRC kehtib, eesosa (ruudustik, stseenid) ja süsteemisaba on baitidentsed ning
  kirjed on baitidentsed hulgana.
- Seade järjestab kirjed efekti-ID järgi. Generaator lisab uued kirjed lõppu.
- Pärast teise preseti valimist ja 436 uuesti laadimist klappisid kõik väärtused ja ruudustik uuesti.

## Piirid

- See tõendab, et seade hoiab kirjutatud väärtusi. Uute skaalade tähendust (nt dB ja ms näidud) see ei
  tõenda, sest FM3 ei anna nuppude näiduteksti.
- Heli, pedaali füüsiline liikumine ja Scene MIDI on eraldi katsed.
