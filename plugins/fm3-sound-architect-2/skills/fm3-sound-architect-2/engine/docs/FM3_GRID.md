# Auditi punkt 5: üldine ruudustik

## Seadmevaba täiendus 0.3.25 — 25.10.2026

Olemasolevat üksikut FM3 SYX-i saab nüüd uurida seda muutmata:

```sh
node engine/skills/instructions/scripts/fm3-preset.mjs --inspect-grid PRESET.syx
node engine/skills/instructions/scripts/fm3-preset.mjs --inspect-grid PRESET.syx --format txt
```

Väljund läheb standardväljundisse; failinime/presetinime ega parameetriväärtusi
aruandesse ei lisata. Raport sisaldab siiski ruudustiku paigutust: kasutaja või
kommertspaketi raportit ei avaldata automaatselt. Toetatud sisend on üks
24680-baidine 0x0146 preset; kaadrid, CRC ja footer peavad läbima kontrolli.
Vormingusõna ei tuvasta püsivara versiooni. Pangad ja muud vormingud tõrjutakse.

| Raporti osa | Täpne tähendus |
| --- | --- |
| `grid.cells` | Kõik 48 lahtrit, 1-põhised koordinaadid, ID ja muutmata toormask |
| `raw`, `knownMask`, `unknownMask` | Algne uint16, teadaolevad bitid 0–3 ning lahendamata bitid 4–15 |
| `edges`, `paths` | Ainult eelmise veeru nähtavad kaablid ning nende kaudu leitud allika/lõpu paarid |
| `ampRoutes` | Cab-plokiga ja Cabita harud eraldi; liitmine ei varja Cabita haru |
| `violations` | Koostaja reeglite rikkumised: tühi lähtelahter, korduv ID, katkenud haru, Scene MIDI heliühendus jne |
| `unresolved` | Tundmatu mask või ploki roll; teadaolevatest kaablitest ei oletata puuduva biti tähendust |
| `recordAssociation` | Ruudustiku ID-de ja loetud kirjete seos; täielikkus nõuab kinnitatud süsteemilõpu räsi |
| `generatorEligibility` | Alati `not-evaluated`; lugemisaudit ei anna kirjutusluba |

`consistent-known-edges` tähendab ainult teadaolevate kaablite struktuurset
kooskõla. Eraldatud plokk võib olla kasutaja teadlik valik, seega koostaja
reegli rikkumine ei tähenda automaatselt seadmele vigast presetti. Osaline
kirjelugemine ei luba järeldada, et loemata plokk puudub.

Send ja Return on selles graafis eraldi lõpp ja allikas. Nendevahelist kaudset
sidet, füüsilist kaablit, USB-d ega globaalset I/O seadet ei simuleerita.
In 2/Out 2 saab lugemisel ära tunda. Out 2 kirjutamine on 0.3.32-st olemas (vt „Out 2“ allpool); In 2 kirjutamist ei lisata. Cab-ploki
olemasolu ei kinnita stseeni bypass'i, kanalit, IR-i ega kuuldavat tulemust.
Mixeri/Multiplexeri sisemised valikud ei kuulu kaabli-graafi tõendisse.

### Parandatud viga ja kontrollid

0.3.24 planeerija kirjutas heliploki kõrval oleva ühendamata Scene MIDI maskiks
õigesti 0, kuid `--verify` ootas ekslikult eelmise lahtri heliühendust. 0.3.25
kontroll käsitleb Scene MIDI-t ühendamata plokina ka selles paigutuses.
Sisend ja väljundkaabel jäävad keelatuks; rikutud mask ei läbi kontrolli ka
kehtiva CRC ning uuendatud failiräsidega.

| Seadmevaba kontroll | Ulatus |
| --- | --- |
| Maskid | Kõik 65536 uint16 maski eraldatakse teadaolevaks ja tundmatuks osaks; see ei tähenda, et kõik on lubatud |
| Veerupiirid | 11264 paigutuse/maski juhtu kõigil 11 veerupiiril ja kõigis neljas reas |
| Sõltumatu graafikontroll | 512 graafi võrdlus BFS-algoritmiga ning 384 ridade ümberjärjestust |
| Scene MIDI | 40 eraldatud paigutust, kaks täielikku SYX/TXT/spec/raporti katset ning muudetud maskide tõrjumine |
| Varasemad seadmevastused | 7 algse 590-baidise vastuse kaadrid/kontrollsummad ja 336 lahtri uus dekodeerimine; ingest võrdleb nüüd ka tegelikke vastusebaite |
| Tehasekorpus | Kolm algsete räsidega panka, 384 presetti, 4801 hõivatud lahtrit; bit 4 jääb kaheksas lahtris lahendamata |
| Paketi korpus | Kõik paketis olevad üksikpresetid, räsiga kordused eraldi; vigased/ajaloolised ja osaliselt loetavad failid raporteeritakse |

Tuletatud tabelid on lähterepo failides
`docs/fm3/parameter-evidence/point5-grid-audit.json` ja `point5-factory-grid.json`.
`node tools/fm3/point5-evidence.mjs` kordab tarkvaratestid ja paketi korpuse.
Tehasekorpuse kviitung on seotud koodi ning algsete pangafailide räsidega;
CI ei laadi panku võrgust. Kohalikuks taasteks kasuta
`node tools/fm3/point5-evidence.mjs --factory FACTORY_DIR --write`.
Avaldatakse koondandmed, mitte tehasepresetite failid, nimed ega paigutused.

REA/Ghidra uut jooksu ega seadmepäringut ei tehtud. Bit 4 heli mõju ja tekkimine,
suvalise aluspreseti kirjutamine, In 2/Out 2, FOH+monitor, 4CM, globaalolek,
tegelik heli/CPU ja täiendav import/STORE jäävad eraldi tõendamist vajavaks.

## Varasem kirjutustugi ja seadmetõendid (23.–24.10.2026)

`scripts/fm3-grid.mjs` kirjutab FM3 kogu 4 × 12 ruudustiku: paralleelharud, hargnemised, liitmised,
plokkide eemaldamise ja teised eksemplarid (Drive 2, Delay 2 jne). Soundi koostajas on see väli `grid`
(`layout` asemel). Kahe rea `layout` jääb alles ja töötab nagu enne.

## Ruudustiku kodeering

Preseti kehas on ruudustik baitidel 260..451. Lahter (rida r, veerg c) on `u16 id + u16 sisendmask`
nihkel `260 + c·16 + r·4`.

- **id**: ploki efekti-ID (In 1 = 37, Amp = 58, Mixer = 126, Return = 186 …), shunt = 1024 + järjenumber,
  tühi lahter = 0.
- **sisendmask**: bitt k = sisend eelmise veeru reast k. Veerus 1 sisendeid pole.
- Bitt 4 (väärtus 16) esineb 8 tehasepreseti lahtris. Kuus neist on liitmised, kaks on ühe sisendiga lahtrid
  (shunt ja Volume/Pan 2). Varasem 7/1 jaotus oli ebatäpne; 0.3.25 korduslugemine
  kinnitab 6/2 jaotuse algsetest pangafailidest. Generaator seda ei kirjuta. Seadmekatse (24.10.2026, `references/fm3-bit4-check-20261024.json`,
  `FM3_BIT4_CHECK.py`):
  - kasutaja valis FM3-l neli sellist tehasepresetti (109, 122, 83, 211);
  - fw 13 salvestatud koopiad (CRC kehtib) ja ruudustiku lugemine sisaldasid bitti 4 täpselt samades
    lahtrites nagu FW10 tehasefailid;
  - LAYOUT ekraan näitas neis lahtrites ainult bittide 0–3 tavalisi kaableid ja bitti 4 miski ei tähistanud.
  Seega pole bitil 4 seadmes nähtavat tähendust. Mõju helile pole mõõdetud.

Tõend (`references/fm3-factory-grid-evidence.json`, `tools/fm3/factory_grid_evidence.mjs`): kõik 384
FW10 tehasepresetit, 4801 hõivatud lahtrit, 144 hargnemist, 140 liitmist. Ükski maskibitt ei osuta
tühjale lahtrile. Iga tehase ruudustik läbib planeerija (`planCells`) ja kõik 4801 maski taastuvad täpselt
lahtrinimedest ja selgetest linkidest **bittide 0–3 osas**, bit 4 välja arvatud. Read: 1 rida 275 presetis, 2 rida 81, 3 rida 26, 4 rida 2.
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

Kollektorit ennast kontrollib offline-testikomplekt simuleeritud FM3-ga (`scripts/test-grid-check-collector.mjs`,
`fake_fm3.py`): saadetakse ainult redaktsioonipuhvri dumpe ja lugemispäringuid, vale lahter leitakse,
katkestuse järel jätkatakse ilma uuesti saatmata ning muudetud või salvestuskoha päisega fail lükatakse
tagasi enne esimest kirjutust. CI kontrollib ka CPU tüübikulude ülearvutust (`tools/fm3/cpu-sweep-ingest.mjs`).

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

## Out 2 (0.3.32)

Grid-režiimis `duplicate:["out2"]` lisab Out 2 ploki (efekti ID 43). Selle kirje on aluse Out 1 kirje ID-ga 43
ja see tuleb kirjete järjekorras kohe Out 1 järel. Ruudustikus on `out2` väljund nagu Out 1. FM3 presetid
panevad selle Out 1 alla samasse veergu ja toidavad seda samast reast:

```json
"grid": {"rows": [[...], [...rida 2...], [..., "out1"], ["", "", "", "", "", "", "", "", "", "", "", "out2"]],
         "links": [{"row": 4, "col": 12, "from": [3]}]},
"duplicate": ["out2"]
```

Tõend on `references/fm3-out2-evidence-20261028.json`. Kasutaja FW13 tonepackis on Out 2 332 presetis. Kõigis on
Out 2 kirje sama mis preseti enda Out 1 kirje ja ka jb-newlook aluse Out 1 kirje (efekti ID-st alates). Kõigis tuleb
see kirjete järjekorras kohe Out 1 järel. 327 presetis toidetakse Out 2 samast reast kui Out 1. Out 2 stseeninivood
jäävad Out 1 malli vaikeväärtusele (0 dB) ega ole kirjutatavad. CPU-kulu on umbes 1 punkt
(`references/fm3-cpu-t8-20261028.json`). Signaali Out 2 pesadest ja FOH/monitori jaotust ei ole seadmes
kontrollitud. Tonepacki rea 4 surnud eel-Cabi shunte (312 presetti) ei kirjutata.

## Bit 4 FW13 presetites (28.10.2026)

`references/fm3-grid-bit4-fw13-20261028.json`: FM3-ga salvestatud FW13 tonepackis ei kasuta ükski 8463 hõivatud
lahtrist maski bitti 4 ega kõrgemaid bitte, kuigi seal on 22 liitmist ja 679 hargnemist. FW13 liitmiste ja
hargnemiste kirjeldamiseks piisab bittidest 0–3. Tehasekorpuse kaheksa bit 4 lahtrit pärinevad FW10 pankadest ja
FM3 säilitab biti STORE-il (24.10.2026). Biti tähendus on endiselt teadmata. Generaator kirjutab edasi ainult bitte 0–3.

## Piirangud

- Heli pole kontrollitud (kuulamine jääb järgmisse nädalasse). Ruudustiku kuju on seadmel kinnitatud.
- Mixeri/Multiplexeri bypass-käitumine heli seisukohalt pole mõõdetud; testides on need Scene 1-s sisse lülitatud.
- In 2 kirjutamine ja uue suvalise Feedback Send/Return seose lisamine pole toetatud. Out 2 on toetatud, vt allpool;
  olemasoleva aluse ID-de 182/186 säilitamine või paarina eemaldamine on eespool kirjeldatud ulatuses olemas. Mixer 2+ eksemplare ei lubata (tehases ainult üks
  kahtlane ID 129).
