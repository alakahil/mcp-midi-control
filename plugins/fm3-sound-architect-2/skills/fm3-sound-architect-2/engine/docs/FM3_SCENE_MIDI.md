# Scene MIDI plokk (Claude, 24.10.2026)

Tegemist on FM3 menüü „MIDI“ plokiga: efekti-ID 190, 257 sõna, 1 kanal. Generaator lisab selle
`grid`-režiimis (`insert: ["scenemidi"]`) ja kirjutab käsud väljale `sceneMidi`. Koodi teostus on
`scripts/fm3-scene-midi.mjs`.

```json
"insert": ["scenemidi"],
"grid": {"rows": [["scenemidi", "", "", "", "", "", "", "", "", "", "", ""], "...": "ülejäänud read"]},
"sceneMidi": [
  {"scene": 1, "command": 1, "type": "PC", "channel": 2, "number": 5},
  {"scene": 2, "command": 1, "type": "CC", "channel": 1, "number": 7, "value": 100}
]
```

- **Käsk**: igas 8 stseenis on 8 käsku. `type` on PC, CC või NONE; `channel` 1–16 (vaikimisi 1);
  `number` 0–127 (PC programm või CC number); `value` 0–127 ainult CC jaoks (vaikimisi 0).
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
| number | 128–191 | otse |
| väärtus | 192–255 | otse (PC-le vahetamisel jääb alles) |

Käsu indeks on (stseen − 1) × 8 + (käsk − 1). Sõna 256 ei muutunud ja seda ei kirjutata.

**Mõõdetud punktid**: käsud S1C1, S2C1, S2C2, S8C1, S8C7; tüübid puudub/CC/PC; kanalid 1 ja 2;
numbrid 0, 5, 20; väärtused 0 ja 64.

**Mõõtmata**: muud sõnumitüübid, vahemike otsad (kanal 16, 127) ja see, kas sõnum stseeni vahetusel
tegelikult välja läheb.
