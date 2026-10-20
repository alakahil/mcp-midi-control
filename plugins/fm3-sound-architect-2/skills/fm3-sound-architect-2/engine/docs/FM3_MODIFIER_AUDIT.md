# Modifikaatorite failiaudit

0.3.6 lisab olemasoleva FM3 presetifaili modifikaatorite loetava inventuuri.
See aitab enne uue kirjutustoe kavandamist kindlaks teha, millised seosed on
failis tegelikult salvestatud. Uusi kirjutusvõimalusi ega seadmeühendust ei lisata.

## Kasutamine

MOOTOR on paketi `engine/skills/instructions` absoluutne tee.

```bash
node "$FM3_ENGINE/scripts/fm3-preset.mjs" --inspect-modifiers "/ABS/PRESET.syx"
node "$FM3_ENGINE/scripts/fm3-preset.mjs" --inspect-modifiers "/ABS/PRESET.syx" --format txt
```

Vaikimisi väljastatakse JSON, teise käsuga eestikeelne TXT. Mõlemad kirjutavad
ainult standardväljundisse; olemasolevat presetit ega neljafaililist komplekti
ei looda ega muudeta. Soovi korral salvesta väljund eraldi uude aruandefaili.
Ära suuna väljundit sisend-SYX-i ega olemasoleva presetikomplekti TXT-i peale.

Audit nõuab üht 24 680-baidist FM3 dump'i, vormingut `0x0146`, korrektseid
SysEx-kaadreid, CRC-d, footer'it ja kõiki 32 toetatud modifikaatoripäist.
Vigane struktuur põhjustab vea; edukat osalist aruannet ei väljastata.
Toetatud struktuuriga fail ei pea kuuluma koostaja seitsme kinnitatud aluse hulka.
**Lugemise õnnestumine ei anna failile kirjutusluba.** Kirjutaja aluste ja
External 1 → Wah piirangud jäävad endiseks.

## Mida aruanne näitab

- Preseti nimi, sisendi SHA-256 ja kontrollitud struktuur.
- Kõik 32 serialiseeritud kirjet, nende nullist algav indeks, allikad,
  sihtploki ID, PID, kanalikood ja kõik 25 muutmata toorsõna.
- Põhi- ja teisese allika FW13 kuvanimed; tundmatud koodid säilivad arvudena.
- Aktiivne allikas, väljalülitatud sihtseos või passiivne sidumata kirje.
- Aktiivsete kirjete kattuvad sihtparameetrid ja kanalid. Tundmatu kanal või
  puuduv sihtploki ID annab võimaliku, mitte kindla kattumise.
- Aktiivselt viidatud External-kontrollerite koondloend ja nende globaalne sõltuvus.

TXT jätab passiivsed sidumata ja probleemideta kirjed loendist välja, kuid
nende arv on kokkuvõttes. JSON säilitab kõik kirjed. TXT numbrid algavad ühest,
JSON-i `record` indeksid nullist. Kattumine ei kinnita tegelikku DSP-konflikti.

## Tõendid ja piirid

Kasutatakse olemasolevat `readModifiers` lugejat ning SHA-ga kinnitatud
`fm3-parameter-dependencies.json` FW13 allika- ja kanaliloendeid. Sihtnimed
tulevad olemasolevast parameetrisõnastikust. Faili tegelikku püsivaraversiooni
ei tuvastata: `metadataFirmware:13` ja `firmwareDetected:null` on eri väljad.
32 serialiseeritud kirjet ei tõenda seadme kasutatavate modifikaatorite mahtu.

Audit ei kinnita sihtploki olemasolu ega parameetri nähtavust selle tüübi puhul.
Kõvera, min/max vahemiku, summutuse, teisese allika ja operaatori arvulist mõju
ei tuletata. Need sõnad säilivad JSON-is. Aktiivne tähendab salvestatud
mittenullist allikat; see ei tähenda, et plokk on stseenis sees või pedaal
parajasti liigub. Globaalset pedaali/MIDI vastendust ei loeta.

`test-modifier-audit.mjs` kordab seitsme kinnitatud aluse auditit ning
kontrollib sünteetiliselt 61 põhi- ja teisese allika silti, kõikide kirjete
päisevead, kanalite kattumise, tundmatud koodid, CRC/kaadrivead, CLI sisendid
ja sisendfaili säilimise. Tundmatu fail jääb kirjutajas blokeerituks.
Need ei ole uued riistvaramõõtmised. FM3 import, pedaal, heli ja CPU jäävad
eraldi kontrollitasemeks; globaalsete skaalade arvukodeeringut ei muudeta.
