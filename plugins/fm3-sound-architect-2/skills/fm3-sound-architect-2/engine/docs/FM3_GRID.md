# Auditi punkt 5: üldine ruudustik (Claude, 2026-10-23)

`scripts/fm3-grid.mjs` kirjutab FM3 kogu 4 × 12 ruudustiku: paralleelharud, hargnemised, liitmised,
plokkide eemaldamise ja teised eksemplarid (Drive 2, Delay 2 jne). Soundi koostajas on see väli `grid`
(`layout` asemel). Kahe rea `layout` jääb alles ja töötab nagu enne.

## Ruudustiku kodeering

Preseti kehas on ruudustik baitidel 260..451. Lahter (rida r, veerg c) on `u16 id + u16 sisendmask`
nihkel `260 + c·16 + r·4`.

- **id**: ploki efekti-ID (In 1 = 37, Amp = 58, Mixer = 126, Return = 186 …), shunt = 1024 + järjenumber,
  tühi lahter = 0.
- **sisendmask**: bitt k = sisend eelmise veeru reast k. Veerus 1 sisendeid pole.
- Bitt 4 (väärtus 16) esineb 8 tehase liitmislahtris; tähendus on teadmata. Generaator seda ei kirjuta.

Tõend (`references/fm3-factory-grid-evidence.json`, `tools/fm3/factory_grid_evidence.mjs`): kõik 384
FW10 tehasepresetit, 4801 hõivatud lahtrit, 144 hargnemist, 140 liitmist. Ükski maskibitt ei osuta
tühjale lahtrile. Iga tehase ruudustik läbib planeerija (`planCells`) ja kõik 4801 maski taastuvad täpselt
lahtrinimedest ja selgetest linkidest. Read: 1 rida 275 presetis, 2 rida 81, 3 rida 26, 4 rida 2.
Faili salvestatakse ainult struktuur (arvud ja ID-d), mitte tehasepresetite väärtusi ega paigutusi.

## Spets

```json
"remove": ["send", "return"],
"duplicate": ["drive2"],
"insert": ["mixer"],
"grid": {
  "rows": [
    ["", "", "", "", "", "", "", "", "", "", "", ""],
    ["in1", "compressor", "drive", "drive2", "amp", "cab", "delay", "-", "mixer", "-", "-", "out1"],
    ["", "", "", "", "", "", "-", "reverb", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", "", ""]
  ],
  "links": [{"row": 3, "col": 7, "from": [2]}, {"row": 2, "col": 9, "from": [2, 3]}]
}
```

- `rows`: 4 rida × 12 lahtrit. `""` (või `null`, `"."`) on tühi, `"-"` shunt, muu on presetis oleva ploki nimi.
- Vaikimisi võtab lahter sisendi sama rea eelmisest veerust, kui see lahter on hõivatud. `links` annab
  lahtri sisendread selgesõnaliselt (hargnemine: `from:[2]` teises reas; liitmine: `from:[2,3]`).
  Read ja veerud on 1-põhised nagu FM3 ekraanil.
- **Link nimetab sihtlahtri; allikas on alati eelmine veerg.** Näites on Cab veerus 6, seega algab
  Cabi-järgne haru lahtrist rida 3, veerg 7. Link veergu 6 võtaks signaali veerust 5 ehk Ampist, enne
  Cabi (nii juhtus testis G02). `.txt` loetleb iga hargnemise ja liitmise allika ploki nimega ning
  hoiatab, kui Ampi väljund jõuab Out 1/Send-ini mõne haru kaudu ilma Cabita. See on hoiatus, mitte
  keeld: 20 tehasepresetis on selline haru olemas.
- Allikad: In 1, Return. Synth võib olla ilma sisendita. Väljundid: Out 1, Send.
- **Kontrollid:** iga lahter peab olema allikast väljundini viival teel (katkenud või rippuv haru lükatakse
  tagasi); iga presetis olev plokk peab ruudustikul olema täpselt korra; Send ja Return käivad paaris;
  shundid nummerdatakse 1024-st järjest; muud baidid peale ruudustiku, deklareeritud stseenide ja juhtide
  ei muutu.

## Kirjed

- `remove`: kirje eemaldatakse ja tema lahter tühjendatakse. Teised kirjed jäävad baitidentseks.
  In 1, Out 1, Amp ja Cab jäävad alles (koostaja alus); Send ja Return eemaldatakse koos.
- `duplicate`: teine eksemplar on eelmise eksemplari koopia oma efekti-ID-ga (alus + n − 1), kõigis
  8 stseenis kanal A ja bypass. Tõend: 8 tehasepaari, kus eksemplari kirje erineb esimesest ainult
  efekti-ID poolest. Lubatud on ainult tehasepresetites nähtud eksemplarid: compressor2, geq2, peq2,
  delay2, chorus2, flanger2, phaser2, wah2, formant2, volpan2, tremolo2, filter2–4, drive2, enhancer2,
  resonator2.
- `insert`: punkti 6 plokid ning Mixer (126) ja Multiplexer (191) sama vaikeplokkide doonori kirjetest
  (kõik kanalid identsed = seadme vaikeväärtused), A + bypass. Kahe rea `layout`-režiimis lükatakse
  Mixer ja Multiplexer endiselt tagasi.
- `controls` ja `blockScenes` töötavad ka eksemplaridega (`drive2`) ja Mixeriga (`MIXER_GAIN1..6`, %).
  Multiplexer Input Select on `enum-labels` ja vajab `allow`.

## Seadme kontroll (kinnitatud 2026-10-23)

Kõik 7 testpresetti lugesid seadmest tagasi täpselt sellised, nagu generaator need kirjutas: 48/48 lahtrit
igas, sh ID-d üle 127 (Send 182, Return 186, Synth 130, Multiplexer 191) ja shundid. FM3 ekraanil oli G02
haru täpselt seal, kuhu link selle kodeeris (Ampi järel, enne Cabi). Testi küsimus ütles ekslikult
„pärast Cabi“; generaator kirjeldab nüüd allikaid ploki nimega. Kviitung:
`references/fm3-grid-check-20261023.json` (kontroll: `node tools/fm3/grid-check-ingest.mjs`).

CPU: G01 53 / hinnang 53,4; G02 60 / 61,3; G03 63 / 63,9; G04 60 / 61,3; G05 62 / 60,9; G06 41,5 / 44,3;
G07 67 / 71,3 %. Mixer ja Multiplexer ei lisa selle täpsusega mõõdetavat koormust.

`tools/fm3/grid-check-build.mjs` koostab 7 testpresetti (G01–G07) tootmisteel (`composeSound`).
`scripts/cpu-sweep-collector/FM3_GRID_CHECK.py` saadab igaühe FM3 redaktsioonipuhvrisse (päis
`7F 00 00 40 00`, SHA-256 kontroll), loeb ruudustiku tagasi `fn=0x01 sub=0x2E` vastusest ja võrdleb kõiki
48 lahtrit kirjutatuga. Ka CPU loetakse. Midagi ei salvestata.

Elava ruudustiku lugemine: piirkond on vastuse viimased 226 baiti enne kontrollsummat; lahter on 32 bitti
alates bitist 45 + c·128 + r·32 (MSB-first 7-bitistes baitides), täpselt preseti keha lahtrisõna
(u16 id + u16 mask). See lugemine taastab 2026-06-12 FM3 kogukonna salvestuse (In 1 → Amp 1 → Out 1,
maskid 0/2/2). fractal-midi `parseGen3GridLayout` loeb samu bitte ühe võrra hiljem (7-bitine id,
mask × 2), mis kehtib ainult id < 128 korral. Seadme kontroll kinnitas: see lugeja loeb iga ID üle 127
valesti (Send 182 → 54, Return 186 → 58, Plex 178 → 50, Multiplexer 191 → 63, Synth 130 → 2).

| Test | Mida tõestab |
| --- | --- |
| G01 | kahe rea paigutus üldise planeerija kaudu (kontroll) |
| G02 | hargnemine Ampi järel (enne Cabi), Delay ‖ Reverb, liitmine Mixeris, Drive 2 |
| G03 | kõik 4 rida, nelja sisendiga liitmine (mask 15) |
| G04 | Multiplexer Drive ‖ Drive 2 ridade vahel |
| G05 | Synth ilma sisendita reas 4, Send/Return alles |
| G06 | eemaldamine ja üks rida |
| G07 | Compressor 2, Drive 2, Delay 2 järjest |

## Piirangud

- Heli pole kontrollitud (kuulamine jääb järgmisse nädalasse). Ruudustiku kuju on seadmel kinnitatud.
- Mixeri/Multiplexeri bypass-käitumine heli seisukohalt pole mõõdetud; testides on need Scene 1-s sisse lülitatud.
- In 2 / Out 2 ja Feedback Send/Return pole toetatud. Mixer 2+ eksemplare ei lubata (tehases ainult üks
  kahtlane ID 129).
