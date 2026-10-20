# Modifikaatorite failiaudit

0.3.6 lisas olemasoleva FM3 presetifaili modifikaatorite loetava inventuuri;
0.3.7 lisab sihtploki kirje, ruudustiku ja salvestatud stseenide konteksti.
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
- Sihtploki parameetrikirje ja ruudustikulahtri olemasolu eraldi; korduvad
  kirjed/lahtrid jäävad mitmetähenduslikuks, neid ei ühendata vaikimisi.
- Toetatud efektiploki kõigi kaheksa stseeni salvestatud kanal ja bypass,
  modifikaatori ALL/A–D kanalipiirangu sobivus ning vastavad toorkoodid.

TXT jätab passiivsed sidumata ja probleemideta kirjed loendist välja, kuid
nende arv on kokkuvõttes. JSON säilitab kõik kirjed. TXT numbrid algavad ühest,
JSON-i `record` indeksid nullist. Kattumine ei kinnita tegelikku DSP-konflikti.

## Ploki ja stseenide kontekst (0.3.7)

Vaata esmalt `contextScan.status` ja iga kirje `targetContext` välju.
Ploki olemasolu ja paigutus on eri faktid: `recordPresence` näitab
parameetrikirjet, `gridPresence` ruudustikulahtrit. Ruudustiku rida/veerg ja
stseeninumber on JSON-is ja TXT-is 1-põhised. Marsruudimask säilib toorarvuna;
ühendatud signaaliteed ega kuuldavust sellest ei järeldata.

Ploki puudumist tohib järeldada ainult täieliku toetatud kirjeloendi korral.
Lugeja kasutab olemasolevat järjestikust `scanRecords` funktsiooni ning nõuab
selle järel seitsmes kinnitatud aluses identset 3844-baidist süsteemisaba:
SHA-256 `ed7f69e7c6201a7aedda97f3ca1d188ae833bfb6dd147eceed8bd13a20b9483a`.
Süsteemisaba sisu ei dekodeerita ega kirjutata. Tundmatu plokk, katkenud loend
või erinev saba annab `contextScan.status:"unavailable"` ja
`recordPresence:"unknown"`; varasem modifikaatorite tooraudit jääb alles.
See konservatiivne piir võib jätta ka muidu korrektse välise preseti konteksti teadmata.

Stseenide tõlgendamine piirdub koostaja 17 efektipere A–D kirjepäistega.
Input/Output/Send/Return ja muud pered ei saa oletuslikku stseenitõlgendust.
Tundmatu kanali või bypass-koodi väärtus jääb `null`, toorkood nähtavaks;
mittenullist bypass-arvu ei teisendata automaatselt tõeväärtuseks.
`channelMatchedNotBypassedScenes` loetleb ainult kindlalt sobiva kanaliga ja
salvestatud bypass-välja järgi sees stseenid. Tundmatud read loendisse ei lähe.
See loend ei arvuta allikate, modifikaatori, bypass-režiimi ega plokitüübi mõju.
Ka väljalülitatud seose puhul kuvatakse sihtploki salvestatud stseenid.

Olemasolevad näited:

| Preset | Seos | Ploki kirje / ruudustik | Salvestatud Wah-stseenid |
|---|---|---|---|
| JB_RHYTHM_LEVEL_MINUS3_export.syx | External 1, aktiivne | olemas / olemas | A ja bypass kõigis 8 stseenis |
| JB_RHYTHM_LEVEL_MINUS3_NewLook.syx | NONE, väljas | puudub / puudub | pole sihtplokki, seega pole stseenijäreldust |

Aktiivne allikaviide ei tähenda automaatselt kuuldavat Wah'd. Audit ei muuda
bypass'i, kanalit, ruudustikku ega globaalset pedaalivastendust.

## Tõendid ja piirid

Kasutatakse olemasolevat `readModifiers` lugejat ning SHA-ga kinnitatud
`fm3-parameter-dependencies.json` FW13 allika- ja kanaliloendeid. Sihtnimed
tulevad olemasolevast parameetrisõnastikust. Faili tegelikku püsivaraversiooni
ei tuvastata: `metadataFirmware:13` ja `firmwareDetected:null` on eri väljad.
32 serialiseeritud kirjet ei tõenda seadme kasutatavate modifikaatorite mahtu.

Audit ei kinnita parameetri nähtavust selle plokitüübi puhul.
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

`test-modifier-context.mjs` võrdleb olemasolevate fixture'ite stseenisõnu
eraldi määratud baidiasukohtadega ning kontrollib A–D/ALL kattumist, puuduvat
sihti, korduvaid plokke/lahte, tundmatuid koode ja pooliku lugemise ohutut tulemust.
PEQ/GEQ/Enhanceri/Filteri näited kasutavad samuti juba olemasolevaid faile.
