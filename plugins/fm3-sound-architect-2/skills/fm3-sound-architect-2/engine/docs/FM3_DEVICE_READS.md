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
| `fn=0x01 sub=0x1F` näidutekst | Nuppude kohta teksti ei anna. Loendiparameetrite puhul annab päringu väärtusväljal oleva indeksi nime, mitte praeguse väärtuse nime. Indeks peab olema täisarv (14 bitti); float32 kujul nime ei tule. | jah, loendite nimede kontrolliks |

Seega näitab fractal-midi/fractal-gen3 „current type name“ lugemine nullväärtusega alati esimest
tüübinime. Ka varasem FM9 tõend oli samade indeks-0 nimedega. Parandus on eraldi töö.

## Loendite nimed seadmest (auditi punkt 3, 2026-10-24)

Kviitung on `references/fm3-label-sweep-20261024.json` (`node tools/fm3/label-sweep-ingest.mjs`).
Toorandmed on `fm3-label-probe-20261024-results.json` ja `fm3-label-sweep-20261024-results.json`.
Kogujad on `FM3_LABEL_PROBE.py` ja `FM3_LABEL_SWEEP.py`.

- **Päringu kuju**: `fn=0x01 sub=0x1F 00`, ploki ID, parameetri ID ja loendi indeks täisarvuna.
  Vastuses on selle indeksi nimi. Lühike täpsustuskatse proovis 7 kuju ja selgitas selle välja.
- **Tulemus**: küsiti kõigi 32 generaatori pere 363 loendiparameetri kõik sõnastikus olevad sõnad,
  kokku 5275 nime. Kõik vastasid sõnastikule salvestatud sõna kaupa (sõna w = `enum[w − enumBase]`):
  - 5234 nime klappisid täpselt;
  - 41 nime erinesid ainult lõputühiku poolest. Vastuse tekstist eemaldatakse lõputühikud, seega
    seadme võimalikku lõputühikut ei näe.
- **Seadme lisasõnad**: kahe Pitch-loendi (`PITCH_TRACKMODE`, `PITCH_TEMPO`, `enumBase` 1) sõna 0 on
  seadmes „OFF“ / „NONE“. Generaator seda sõna ei kirjuta. Nende loendite viimast sõna ei küsitud.
- **Plokid väljaspool presetti** vastasid samuti, seega nimede küsimiseks ei pea plokk presetis olema.
- **Ohutus**: kirjutati ainult redaktsioonipuhvrisse. Ruudustik ja preseti kõik plokid loeti pärast
  esimest päringut ja iga ploki järel üle ning need ei muutunud.
- **Hangumine**: üks katse küsis iga loendi lõpust kaks sõna üle ja saatis päringuid ilma pausita. See
  hangutas FM3 pärast Amp-plokki ja kasutaja pidi selle välja ja sisse lülitama. Õnnestunud katse küsis
  ainult sõnastiku vahemikku, tegi päringute vahel 20 ms pausi ja kontrollis iga 50 päringu järel, kas
  FM3 vastab. Kumb muudatus hangumise ära hoidis, pole teada. **Ära küsi sõnu üle loendi lõpu.**

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
- Heli on mõõtmata. Pedaali järgimise ja Scene MIDI hilisemad katsed on kirjeldatud failides
  `FM3_VOLUME_PEDAL.md` ja `FM3_SCENE_MIDI.md`; käesolev tagasilugemiskatse neid ei tõenda.
