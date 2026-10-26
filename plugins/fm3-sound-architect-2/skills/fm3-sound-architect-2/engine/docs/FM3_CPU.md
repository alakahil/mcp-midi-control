# Auditi punkt 7: CPU hinnang (Claude, 2026-10-23)

`scripts/fm3-cpu.mjs` arvutab iga stseeni CPU hinnangu. Andmed on failis
`references/fm3-cpu-measurements-20261023.json`. Soundi koostaja lisab hinnangu `.txt` ja
`.validation.json` faili (`report.cpu`).

## Mõõtmine

Kasutaja luges FM3-Editi CPU näitu Scene 1 juures ja asendas plokke ükshaaval shundiga. Fractali wiki järgi kulutab
bypassis plokk sama palju CPU-d kui sisselülitatud plokk, seega loeb ainult see, kas plokk on presetis olemas.
Kontrollrida B6 = 52,9 % ja A5 = 52,8 % sama plokikomplektiga.

| Plokk (mõõdetud tüüp) | CPU % |
| --- | --- |
| Alus (In/Out, Send/Return, shundid) | 18,3 |
| Reverb (Room: Large Room, Economy) | 13,2 |
| Multiband Comp (vaikimisi) | 11,0 |
| Plex Delay (vaikimisi) | 10,5 |
| Megatap (vaikimisi) | 9,1 |
| Compressor (Optical) | 8,2 |
| Drive (Full OD) | 7,9 |
| Resonator (vaikimisi) | 7,6 |
| Ten-Tap (vaikimisi) | 4,2 |
| Gate (Classic Expander) | 3,7 |
| Looper | 3,3 |
| Cab (DYNA-CAB) | 2,9 |
| Ring Mod | 2,6 |
| Formant | 1,9 |
| Volume/Pan | 1,2 |
| Delay (Deluxe Mind Guy) | 1,2 |
| Amp | 1,1 |
| Synth | mõõtmata (B0 ületas piiri) |

## Piirangud

- Amp ja Delay töötavad eraldi tuumal (Fractali wiki). FM3-Editi näit seda tuuma praktiliselt ei näita ja
  hinnang ei näe seda.
- Kulu sõltub tüübist. Satriani V1 Scene 4 juures mõõdeti 61 %, perekulude summa annab aga 44,6 %. Erinevad tüübid:
  Plate: Medium Plate, Digital Stereo, DS1 Distortion Mod ja Ampi kanal D. See kirjeldab varasemat ainult üksikutele tüüpidele tuginevat mudelit; allolev tüübipõhine mudel asendab selle.
- Ohutu piir on 80 %. Üle selle vaigistab seade heli ja kuvab hoiatuse.

## Automaatne mõõtmine (2026-10-23)

`tools/fm3/cpu-sweep-build.mjs` koostab mõõtepaki: 356 presetti NewLook-alusel, igas üks tüüp, Scene 1,
päis `7F 00 00 40 00`. `scripts/cpu-sweep-collector/FM3_CPU_SWEEP.py` saadab need FM3 redaktsioonipuhvrisse
ja loeb CPU `fn=0x01 sub=0x2E` vastusest. Midagi ei salvestata.
`tools/fm3/cpu-sweep-ingest.mjs` teeb tulemustest `references/fm3-cpu-types-20261023.json`
(toorandmed on failis `references/fm3-cpu-sweep-20261023-results.jsonl`).

- **Redaktsioonipuhvrisse laadimine on FM3-l kinnitatud.** Päisega 7F 00 dump laaditakse redaktsioonipuhvrisse;
  kasutaja nägi ekraanil nime.
- **CPU baidi dekodeering** (`f[37]`): raw < 64 → 32 + raw/2, raw ≥ 64 → raw. Kontrollitud 12 käsitsi näidu vastu,
  suurim viga ±0,5 % (`references/fm3-cpu-calibration-20261023.json`). ForgeFX-i valem 32 + raw × 0,5 kehtib
  ainult alla 64 %.
- 342 tüüpi 16 perest. Suurimad kulud: Spring: Lush Spring 42,7; plate-reverbid ~28,7; Pitch Quad ~17;
  Synth 7,5; 8-Voice Chorus ~10; Compander/Optical Comp ~9; drive 1,9–8,9. Kõik delayd 1,2–1,7 (Ampi tuum).
- Reverbi kvaliteet (lisa Economy suhtes): Large Room +2,5/+9/+11,5, Large Hall +4/+10,5/+13,
  Medium Plate +1/+1/+2 (Normal/High/Ultra-High). Teistele algoritmidele võetakse sama kategooria suurim lisa.
- Kontroll: Satriani V1 Scene 4 hinnang 60,1 %, mõõdetud 61 %. P6 A hinnang 83,1 %, mõõdetud 82,5 %.
  P6 B hinnang 86,3 %, seadmes „CPU LIMIT EXCEEDED".

`fm3-cpu.mjs` 0.2.1 arvutab iga stseeni CPU aktiivse kanali tüübi järgi. Mõõtmata tüübi korral kasutab see
olemasolevat pere maksimumi või mõõdetud võrdlustüüpi ja nimetab selle; teadmata pere jäetakse summast välja. Hoiatus antakse üle 72 %-st; üle 80 % on ohutu piir ületatud.

## Järgmine

- Mõõtmata on veel point-6 perede teised tüübid (Plex, Megatap jt), Cab LEGACY ja Amp (Ampi tuum).
- Sama mõõtjaga saab tulevikus mõõta iga uue perekonna või püsivara (käivita builder, siis FM3_CPU_SWEEP.py).

## 0.3.16 täpsustus

Mõõdetud tüübi olemasolu ei tõenda kogu preseti ±1 protsendipunkti täpsust. G06 mõõdetud 41,5% ja hinnang 44,3% erinevad 2,8 protsendipunkti; G07 erinevus on 4,3 protsendipunkti. Kaheksa ostetud fw13 tonepacki presetti (26.10.2026, `references/fm3-cpu-check-20261026.json`, failid repos puuduvad) mõõdeti 40,5–76 %; hinnang oli keskmiselt 2,6 punkti kaugusel, kuni 1,8 punkti madalam ja kuni 4,9 punkti kõrgem. Mõõturi kalibreerimise ±0,5 protsendipunkti ei ole koondmudeli veapiir. `measuredTypeCoverageAllScenes` tähistab mõõdetud komponentide katvust. Ühilduvuse jaoks alles jäetud `exactAllScenes`/`scenes[].exact` on sama katvuse ajaloolised nimed, mitte täpsusgarantii. Uut seadmemõõtmist ei tehtud.
