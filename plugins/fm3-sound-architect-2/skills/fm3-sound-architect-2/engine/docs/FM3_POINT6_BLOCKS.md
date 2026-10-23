# Auditi punkt 6: ülejäänud plokipered (Claude, 2026-10-23)

Pered: Mixer/Multiplexer, Multiband/Plex, Synth, Looper, Scene MIDI. Lisaks samast allikast
Gate, Formant, Volume/Pan, Ten-Tap, Megatap, Ring Mod, Resonator.

## Tõendid (struktuur, mitte väärtused)

`tools/fm3/factory_structure_evidence.mjs` → `references/fm3-factory-structure-evidence.json`.
Allikad on Fractali FM3 tehasepangad 10p0 (2025-06-04, formaat 0x013E, SHA-256 kinnitatud) ja üheksa
kasutaja FW13 seadme-eksporti samadest presetitest (kuvatud numbrid 155, 038, 163, 249, 288, 370, 147, 202, 259; Display Offset 1).
JSON-is on ainult efekti-ID-d, sõnade arv, kanalite arv ja muutunud sõnade indeksid. Tehasepresettide väärtusi
ega faile repos ei ole.

Teisendus FW10 → FW13 (seade teeb ise):
- Grid ja stseenid (baidid 0..4609), kirjete järjekord ja süsteemi saba (kirje 201 + järgnev) jäävad baithaaval samaks.
- Kirje päises muutub ainult sõnade arv (nihe 42).
- Sama pikkusega plokid jäävad samaks. Erand on sõna, mille FW13 vahemik muutus: seade skaleerib selle ümber
  (nt Gate Attack pid 1, Input Attack pid 3, Pitch High Cut pid 57; log-vahemiku miinimum muutus).
  Cab pid 85/86 indeksid nihkusid mõnes presetis (+3): valikuloendisse lisati vahepeale valikuid.
- Pikemaks läinud plokkidel jäävad sõnad 0..vana−1 alles, uued lisatakse iga kanali lõppu.
- FW13 kirje pikkus = sõnastiku parameetrite arv kõigil 24 plokil, millel on FW13 eksport.

Kanalid: tavaliselt 4. Send/Return ja Looper 166 on ×1 (Looper on kinnitatud FW13 ekspordiga).
Megatap 138, Ring Mod 150 ja Resonator 162 on ×2 (FW10 ja FW13 eksport).
Teised eksemplarid: eid = baas + eksemplar−1 (Delay 2 = 71, Volume 2 = 103, Filter 2 = 115, Drive 2 = 119, Comp 2 = 47),
sõnade arv on sama kui baasplokil.

| Plokk | eid | FW10 | FW13 | FW13 seade-eksport |
| --- | --- | --- | --- | --- |
| Mixer | 126 | 17×4 | 21×4 | 155 |
| Synth | 130 | 41×4 | 42×4 | 155, 163 |
| Volume/Pan | 102 | 14×4 | 15×4 | 155, 370 |
| Multiband Comp | 154 | 37×4 | 37×4 | 038 |
| Gate | 146 | 19×4 | 19×4 | 038 |
| Plex | 178 | 96×4 | 96×4 | 163 |
| Formant | 98 | 12×4 | 12×4 | 163 |
| Looper | 166 | 24×1 | 24×1 | 249 |
| Ten-Tap | 158 | 48×4 | 48×4 | 288 |
| Multiplexer | 191 | 7×4 | 7×4 | 370 |
| Megatap | 138 | 35×2 | 35×2 | 147 |
| Multitap | 74 | 121×4 | 121×4 | 147 |
| Ring Mod | 150 | 11×2 | 13×2 | 202 |
| Resonator | 162 | 40×2 | 40×2 | 259 (ka Resonator 2 = 163) |
| Scene MIDI | 190 | – | (257) | puudub tehasepankades |

## Parandus: `scanRecords` (fm3-layout.mjs)

Enne parandust peatus skaneerimine esimesel teise eksemplari kirjel (nt Delay 2) või Looperil
ja ülejäänud kirjed jäid läbipaistmatuks sabaks. Nüüd tunneb `blockOf()` eksemplarid ära ja `CHANNELS`
annab kanalite arvu ploki kaupa. Vale mõõtmetega kirje peatab skaneerimise endiselt ega loe valesti.
Test: `scripts/test-scan-records.mjs` (offline-suite).

## Järgmine

1. Scene MIDI: tühi preset enne ja pärast ploki lisamist (eksportide paar).
2. Doonorid generaatorile: kasutaja enda värsked vaikeplokid (mitte tehaseväärtused), lisamise eelkontroll
   nagu Enhanceril (`fm3-enhancer-insertion-check.mjs`), seejärel koondkatse seadmes.
Mixer ja Multiplexer on paralleelharude plokid ja nende paigutamine ootab auditi punkti 5 (vaba ruudustik).
