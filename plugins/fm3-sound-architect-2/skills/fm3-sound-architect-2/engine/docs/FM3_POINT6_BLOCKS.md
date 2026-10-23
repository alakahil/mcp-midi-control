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

## Vaikeplokid ja Scene MIDI (kasutaja eksport, 2026-10-23)

`references/fm3-empty-preset-20261023.syx` (`<EMPTY>` preset) ja `references/fm3-default-blocks-20261023.syx`
(sama preset pärast 14 ploki lisamist FM3-Editis, parameetreid muutmata):
- Erinevad ainult 14 ruudustiku sõna ja lõppu lisatud 14 kirjet; süsteemi saba on sama. Kirjete eemaldamine
  taastab tühja preseti baithaaval.
- Igas kirjes on kanalid A–D omavahel identsed, seega on need seadme vaikeväärtused. Need dekodeeruvad
  sõnastiku järgi usutavateks näitudeks (Plex Time 1–8 = 300…1000 ms, Mix 10 %, Gate Threshold −40 dB,
  Synth Freq 500 Hz, Megatap Time 2000 ms, Looper Max Time 120 s).
- **Stseeniväljad ei ole vaikimisi:** värskelt lisatud ploki stseenid 2–8 pärinevad viimasest presetist,
  milles see plokk oli (nt Gate = tehasepreset 038). Seade lähtestab ainult aktiivse stseeni. Lisaja kirjutab
  seetõttu alati kõik 8 stseeni (kanal A, bypass).
- Scene MIDI (menüüs „MIDI Block") on eid 190, 257×1, kõik sõnad 0. Väljade tähendus on dekodeerimata.

## Lisamine generaatoris (`scripts/fm3-insert-blocks.mjs`, väli `insert`)

- Lisatavad: plex, multiband, synth, looper, gate, formant, volume, tentap, megatap, ringmod, resonator.
- Kirje kopeeritakse doonorist, pannakse viimase kirje järele (nagu seade doonoris tegi) ja plokk võtab
  ridade 2/3 esimese vaba järjestikuse shundi; veeru otsustab seejärel `layout`.
- Kontrollid: olemasolevad kirjed ja saba baithaaval samad, eelosas muutuvad ainult valitud ruudustiku sõnad,
  maskid samad, lisatud kirjete eemaldamine taastab aluse, kaadrid/CRC/footer/tagasilugemine.
- Tempo lukud: `tools/fm3/insert_tempo_locks.py` loeb FM3-Edit 1.07.17 paigutuse XML-i (macOS binaari mõlemas
  viilus identne ja võrdne juba kinnitatud SHA `0fc5f3…`-ga). Plex TIME1–8 ↔ TEMPO1–8, LFO Rate ↔ LFO Tempo,
  Ten-Tap Time ↔ Rhythm Tempo; sildid on võrreldud FW13 editori cache'iga (sektsioonid 15 ja 38). Lukustatud
  sihti kirjutatakse ainult siis, kui lõplik Tempo on NONE.
- Keeldutakse: Mixer ja Multiplexer (paralleelharud, punkt 5), Scene MIDI (dekodeerimata), sama pere kaks korda.
- Seadmekatse: `examples/FM3_P6_INSERT_A.*` (Gate, Multiband, Plex, Looper, Volume) ja `_B.*` (Synth, Ten-Tap,
  Megatap, Ring Mod, Resonator, Formant).

### Seadmekatse tulemus 2026-10-23

- Import ja paigutus: mõlemad korras (kasutaja kinnitus FM3-Editis).
- Eksport (`examples/FM3_P6_INSERT_{A,B}_export.syx`): eelosa (ruudustik, stseenid) ja süsteemi saba on
  baithaaval samad ning iga kirje on baithaaval sama. **Seade normaliseerib kirjete järjekorra**; sisu ei muutu.
- Näidud: Synth Frequency 800.01 Hz (oodatud 800.0084), Resonator Frequency 1 499.99 Hz (oodatud 499.9947).
- Ten-Tap Feedback ei ole tüübil „Ten-Tap Delay" nähtav (sõna salvestub, aga editor seda ei kuva).
  Lisatud perede tüübipõhine nähtavus on valideerimata, nagu aruanne ütleb.
- CPU: A 82,5 %, B „CPU LIMIT EXCEEDED". Koormuse hindamine on auditi punkt 7.
- Klass 0x01 (578 kirjet) on salvestatud täisarvud, mitte normaliseeritud väärtused: FM3-Edit näitab Ten-Tap
  Number of Taps toorväärtust 6 kui 6 ning kõik 57 korpuses esinevat klassi 0x01 parameetrit on vahemikku jäävad
  märgiga täisarvud. Kodeerija kohtleb neid nüüd täisarvudena (endiselt `allow: linear-by-structure`);
  kordajaga 2 (Plex Number of Delays, Chorus Voices) jäävad lukku, kuni näit on kinnitatud.
