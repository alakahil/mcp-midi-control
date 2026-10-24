# Scene MIDI plokk (Claude, 24.10.2026)

Tegemist on FM3 menüü „MIDI“ plokiga: efekti-ID 190, 257 sõna, 1 kanal. Generaator lisab selle
`grid`-režiimis (`insert: ["scenemidi"]`) ja kirjutab käsud väljale `sceneMidi`. Koodi teostus on
`scripts/fm3-scene-midi.mjs`.

```json
"insert": ["scenemidi"],
"grid": {"rows": [["scenemidi", "", "", "", "", "", "", "", "", "", "", ""], "...": "ülejäänud read"]},
"sceneMidi": [
  {"scene": 1, "command": 1, "type": "PC", "channel": 2, "program": 5},
  {"scene": 2, "command": 1, "type": "CC", "channel": 1, "number": 7, "value": 100}
]
```

- **Käsk**: igas 8 stseenis on 8 käsku. `type` on PC, CC või NONE; `channel` 1–16 (vaikimisi 1).
  PC: `program` 0–127, mille FM3 näitab väljal **Value** (Number näitab PC puhul „--“).
  CC: `number` 0–127 ja `value` 0–127 (vaikimisi 0). PC-le `number`/`value` või CC-le `program` tõrjutakse.
- **Paigutus**: plokk ei kanna heli. Sellel ei tohi olla sisendit ja sellest ei tohi midagi sisendit võtta,
  seega jäta selle järel olev lahter tühjaks. Täpselt nii paigutas FM3 selle ka kasutaja ekspordis.
  Kahe rea `layout`-režiimis plokk tõrjutakse.
- **Stseenid**: lisatud plokk on kõigis 8 stseenis kanalil A ja sisse lülitatud, nagu seadme enda värske plokk.
- `.txt` loetleb kõik käsud.

## Dekodeerimine

Kviitung on failis `references/fm3-scene-midi-20261024.json` (`node tools/fm3/scene-midi-ingest.mjs`).
Mõõtepreseti koostab `tools/fm3/scene-midi-check-build.mjs`, mõõteskript on `FM3_SCENE_MIDI_CHECK.py`.

Kasutaja muutis FM3 esipaneelilt 11 korda ühe välja. Iga muudatus muutis täpselt ühte sõna ja generaatori
kodeerija taastab iga sammu ning lõpliku 257 sõna täpselt.

| Väli | Sõnad | Kodeering |
| --- | --- | --- |
| tüüp | 0–63 | 0 = puudub, 1 = CC, 2 = PC |
| kanal | 64–127 | kanal − 1 |
| number | 128–191 | CC number otse; PC ei kasuta (ekraanil „--“) |
| väärtus | 192–255 | CC väärtus või PC programm otse (väli Value) |

Käsu indeks on (stseen − 1) × 8 + (käsk − 1). Sõna 256 ei muutunud ja seda ei kirjutata.

Tüübi vahetus muudab ainult tüübisõna; teised sõnad jäävad alles. Seepärast ei kirjuta generaator PC
puhul numbrisõna.

## PC programm (järelkatse 24.10.2026)

Kviitung on `references/fm3-scene-midi-pc-20261024.json`. Esimene generaatori versioon kirjutas PC programmi
numbrisõnasse. Genereeritud preseti „SCENE MIDI GEN 2“ tagasilugemine klappis, aga FM3 näitas
„Number --, Value 0“. Järelkatses kasutaja:

1. ei saanud PC puhul Number välja muuta;
2. muutis Value väärtuseks 10, mis muutis sõna 192;
3. vahetas tüübi CC-ks, mille järel ekraan näitas alles jäänud numbrisõna („Number 1, Value 10“);
4. vahetas tüübi tagasi PC-ks.

Seega on PC programm väli Value ehk sõna 192 + k. Generaator kirjutab nüüd sinna ja kodeerija taastab
kõik 5 sammu.

Parandatud generaatori kontroll (`tools/fm3/scene-midi-verify-build.mjs`, tulemus
`references/fm3-scene-midi-verify-20261024-results.json`):

- kaks genereeritud presetti loeti redaktsioonipuhvrist tagasi ning kõik plokid ja ruudustik klappisid;
- FM3 näitas „SCENE MIDI GEN 2“ puhul Scene 1, Command 1 väärtusi „Type PC, Channel 3, Number --, Value 1“,
  nagu generaator kirjutas.

**Mõõdetud punktid**: käsud S1C1, S2C1, S2C2, S8C1, S8C7; tüübid puudub/CC/PC; kanalid 1–3;
numbrid 0, 1, 5, 20; väärtused 0, 10 ja 64.

## Kas käsud välja lähevad (24.10.2026)

Kviitung on `references/fm3-scene-midi-listen-20261024.json` (`node tools/fm3/scene-midi-listen-ingest.mjs`).
Mõõteskript on `FM3_SCENE_MIDI_LISTEN.py` ja mõõtepreseti koostab `tools/fm3/scene-midi-listen-build.mjs`.
Preset saatis igas stseenis N kanalil 3 programmivahetuse N ja CC 20 väärtusega 10 × N. Kasutaja valis
stseenid 2, 3, 8 ja 1, kuid **FM3 ei saatnud USB pordi kaudu ühtegi baiti**. Pärast laadimist tulid ainult
dumpi kinnitused. Seega ei saada FM3 Scene MIDI käske USB kaudu. MIDI OUT pesa kontrolliks on vaja
MIDI-liidest või MIDI OUT pessa ühendatud seadet.

**Mõõtmata**: muud sõnumitüübid, vahemike otsad (kanal 16, 127), kas sõnum stseeni vahetusel
tegelikult välja läheb ja kas saadetud PC võrdub näidatud väärtusega või on ühe võrra väiksem.
