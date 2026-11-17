# Dust and Bone: loo ja kitarristemmi analüüs (17.11.2026)

Allikad: Jani üleslaaditud `Dust and Bone.mp3` (kogu lugu) ja Logic Pro kitarristemm
`Dust and Bone_Guitar.mp3` (mõlemad 48 kHz, 160 kb/s, 4:09). Helifaile repos pole.
Mõõdetud numpy/scipy ja ffmpeg ebur128-ga; kõik on valemi järgi, mitte seadmel kinnitatud.

## Põhiandmed
- Helistik G-moll (Krumhansli profiil r = 0,64; G domineerib, D ja F#/F kõrval).
- Tempo ~92 BPM (onset-autokorrelatsioon 92,2 / 90,7; 184 = topelt).
- Valjus: lugu −11,1 LUFS, LRA 4,8 LU; kitarristemm −16,0 LUFS, LRA 13,7 LU.
- Kitarristemm on stereo, L/R korrelatsioon 0,54 → kaks erinevat kitarrirada (topeltrajad).

## Stemmi sageduskadu
- Intro (0:00–0:08) on soolokitarr: seal on stemm ja kogu lugu korrelatsiooniga 0,997
  ning vahe on kõigil sagedustel ühtlaselt +1,7 dB. Seega introst kuuldav toon on
  allika enda toon, mitte stemmimise kadu.
- Tihedates osades (salmid, refräänid) näitab stemm tunduvalt tumedamat ja õhemat
  kitarri (keskmine tsentroid 350–650 Hz vs intros ~1200 Hz). Osaliselt on see mängitav
  madal riff, osaliselt stemmi eraldamise kadu (ühised kesk- ja kõrgsagedused vokaali ja
  trummidega jäävad stemmist välja). Seepärast ei kopeeri preset salmide tumedust.
- Allika enda ülaots langeb järsult üle ~5 kHz (1 kHz suhtes: 5 kHz −10 dB, 6,3 kHz −18 dB,
  10 kHz −31 dB). Seepärast Cab High Cut 6,5 kHz ja Low Cut 80 Hz (madalaim põhitoon G2 ≈ 98 Hz).
- Intro spekter (1 kHz suhtes): 100 Hz +14, 200 Hz +10, 315 Hz +6, 1,6 kHz −12 (nõgu),
  2,5–4 kHz −5…−7 (kohalolu kühm). Sobib 4x12 Greenback/V30 tüüpi kõlariga.
- Spektri lamedus 200–5000 Hz intros ja refräänis 0,4–0,5 → selgelt moonutatud (crunch/drive).

## Sektsioonid (kitarristemmi valjuse ja tsentroidi järgi)
| aeg | osa | kitarr | stseen |
|---|---|---|---|
| 0:00–0:11 | intro | soolokitarr, crunch, hele | 1 INTRO RIFF |
| 0:12–0:31 | bänd sisse + riff | riff 0:24 valjult | 1 / 2 |
| 0:32–0:51 | salm 1 | madal G2 riff, palm mute | 2 VERSE |
| 0:52–0:59 | vahelick | | 8 FILLS |
| 1:00–1:27 | salm 2 | madal riff | 2 VERSE |
| 1:28–1:43 | eelrefrään | kitarr peaaegu vait | 2 (või maha keeratud) |
| 1:44–2:11 | refrään | valjem, hele, noodid G4 ümber | 3 CHORUS (+8 lickideks) |
| 2:12–2:39 | salm 3 | madal riff | 2 VERSE |
| 2:44–2:59 | breakdown | peaaegu vait | 5 BREAKDOWN |
| 3:00–3:07 | build | | 6 BUILD |
| 3:08–3:51 | soolo / lõpurefrään | valjeim, D–G–A noodid | 4 SOLO |
| 3:52–4:09 | outro | madal riff, lõpuakord | 7 OUTRO |

Ajad on 4 s akende järgi, ±2 s.
