# Auditi punkt 7: CPU hinnang (Claude, 2026-10-23)

`scripts/fm3-cpu.mjs` arvutab iga stseeni CPU alampiiri. Andmed on failis
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
  Plate: Medium Plate, Digital Stereo, DS1 Distortion Mod ja Ampi kanal D. Kui mõni plokk kasutab mõõtmata tüüpi,
  esitatakse hinnang alampiirina ja vastav tüüp nimetatakse.
- Ohutu piir on 80 %. Üle selle vaigistab seade heli ja kuvab hoiatuse.

## Järgmine

Mõõta generaatori tüüpide kulud: reverb 79, drive 87, delay 27, compressor 19, phaser 17 ja teised.
CPU lugemine on dekodeeritud (`fn=0x01 sub=0x2E`, CPU = 32 + f[37] × 0,5; ForgeFX FM3 fw12, FM9-l ristkontrollitud),
nii et tüüpide läbimine saaks olla automaatne. See aga nõuab tüübi kirjutamist seadme redaktsioonipuhvrisse.
