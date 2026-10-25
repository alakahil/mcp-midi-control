# Modifikaatorite failiaudit

0.3.6 lisas olemasoleva FM3 presetifaili modifikaatorite loetava inventuuri;
0.3.7 lisas sihtploki kirje, ruudustiku ja salvestatud stseenide konteksti;
0.3.8 lisab sihtparameetri FW13 tüübisobivuse lugemise A–D kanalites.
0.3.20 laiendab sama tüübisobivuse auditit viiele 0.3.19-s lisatud perele.
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

Audit võrdleb parameetrit allpool kirjeldatud FW13 koostamisreeglitega.
See ei käivita FM3-Editi ega kinnita tegelikku modifikaatorituge.
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

## Sihtparameetri tüübisobivus (0.3.8–0.3.20)

JSON-i `typePolicy` loetleb kuus SHA-256-ga kinnitatud reeglifaili ning kaetud
16 efektiperet: Chorus, Drive (FUZZ), Delay, Reverb, Flanger, Phaser,
Compressor (COMP), Wah, Tremolo, Rotary, Pitch, PlexDelay, Gate/Expander,
TenTapDelay, Synth ja Multiband Compressor. Muude perede tüübisobivus
jääb teadmata. Need on olemasolevad FW13 koostamisreeglid, mitte uued mõõtmised.

Iga seotud kirje `targetApplicability` kirjeldab nelja salvestatud kanalit.

| JSON-i kanali staatus | TXT | Tähendus |
|---|---|---|
| `available` | sobib | Parameeter läbib selle kanali olemasoleva FW13 tüübireegli. |
| `excluded` | välistatud | Teadaolev tüübireegel välistab parameetri või selle välja kirjutamise. |
| `unknown` | teadmata | Mudeli/valija või kohaliku noodi kontekst pole tuntud. |

`selectorWords` säilitab loetud valijasõnad; mudelinime ei teisendata oletuslikuks
algoritmiks. Delay mudel ja sisemine Type ning Reverb Type/Base Type on eraldi.
Rotaryl puudub Type: PID 0 on Rate ja seda ei loeta tüübi valijana.
Vigane lisavalija annab konservatiivselt teadmata tulemuse ka siis, kui
konkreetne leht seda valijat ei kasuta. Puuduv, korduv või mitteloetav sihtkirje
ning katmata efektipere annavad `status:"unresolved"`, põhjuse ja tühja kanaliloendi.
Sidumata kirjel on `targetApplicability:null`.

Kõik A–D kanalid kuvatakse ka ühe kanali seose korral. `inModifierScope` märgib
ALL/A–D ulatuse; tundmatu modifikaatorikanali korral on väärtus `null`.
`scopedExcludedChannels` ja `scopedUnknownChannels` koondavad ainult kindlalt
seose ulatusse kuuluvaid kanaleid. Tüübimärkused ei muuda stseenide varasemat
kanali/bypass-kokkuvõtet: need on eraldi kontrollid.

Näiteks BB Pre välistab Drive Tone'i, Paragon välistab Wah Biasi ning
vedrukaja Scattering sõltub salvestatud Tank Type'ist. Pitchi NOTE2…NOTE8
kontrollib tüüpi, SCALE=CUSTOM ja aktiivse astme konteksti; terve skaala
järjestust või noodiväärtusi siin ei valideerita. Globaalsed skaalad jäävad eraldi.
`templateOnly` märgib olemasolevat täiskanalimalli nõuet; see pole
modifikaatoriga seostamise luba. `blockedReason` säilitab metaandmete piirangu.

**Sobiv tüübireegel ei tõenda, et parameeter toetab modifikaatorit.**
Kõigi tulemuste juures on `modifierSupportVerified:false`; audit ei lisa
kirjutusluba ega hinda allika väärtust, kõverat, tempot, DSP-d või kuuldavust.

`test-modifier-types.mjs` kasutab olemasolevaid kanalimallide sõnu ja eraldi
määratud fixture'i baidiasukohti. Test katab 20 varasemat ja 15 uut sisulist
A–D juhtumit kõigis 16 peres, teadmata olekud, ulatuse eristamise ning seitsme aluse säilimise.
Sünteetilised seosed on tarkvaratestid, mitte uued seadmetõendid.

Plex Shift 1 sobib Plex Shift-tüübiga, Gate Ratio ainult Expander-tüüpidega
ning TenTap Feedback Rhythm Tap Delayga. Plexi presetivalik, TenTap Learn
ja mõõdikud on autoriseeritud skalaarjuhikute poliitikas välistatud. See ei
ole eraldi tõend nende tegeliku modifikaatoritoe kohta.
Synthil ja Multibandil pole ühist plokitüübi valijat: nende PID 0 väärtust
ei tõlgendata tüübina. Üksikute ostsillaatorite või Auto Att/Rel DSP mõju
ei arvutata. Tundmatu Plexi/Gate'i/TenTapi tüüp annab endiselt `unknown`.

## Wah ja Volume koos: kirjepesade eeltöö (0.3.20)

Lähterepo `tools/fm3/modifier_slot_readiness.mjs` kordab olemasolevaid tõendeid;
tulemus on `docs/fm3/parameter-evidence/modifier-slot-readiness.json`.
CI kontrollib nii selle värskust kui ka tõendite omavahelist kooskõla.

- Bonamassa lähteekspordis on esimene kirje External 1 → Wah 1 Control ALL.
- NewLookis on samas kirjes säilinud Wah-siht, kuid allikas on NONE.
  See on passiivne seos, mitte sihtandmeteta kirje.
- Mõlemas näites on ülejäänud 31 serialiseeritud kirjet passiivsed ja sidumata.
  See ei tõenda seadme kasutatavat mahtu ega vaba kirje jaotamise reeglit.
- Volume'i olemasolev FW13 doonor asendab sama esimest kirjet. Selle eelseis
  kattub NewLooki 25 sõnaga; muutuvad ainult sõnad 0, 8, 9, 10 ja 15.
- Mõlemad piiratud kirjutajad kasutavad seega indeksit 0 / wire effect 3 /
  keha nihet 1584. Doonori nihutamine teise kirjesse ei ole kummagi olemasoleva
  kogu keha võrdlusega tõendatud.

Varasem native-analüüs näitab editori loomispäringut, vastuses määratud ID-d
ning ootel Source-muudatuse edasisaatmist. Püsivara teise kirje jaotamine,
lähtestamine ja eemaldamise järel taaskasutamine jäävad uuritavaks.
Järgmine täpne offline-küsimus on selle püsivarapoolse tee leidmine olemasolevast
analüüsist, säilitades esimese aktiivse seose. Sama editori jooksu kordamine
ilma uue küsimuseta ei lisa tõendit.

Uut REA/Ghidra jooksu, seadmetoimingut ega presetikirjutust see eeltöö ei tee.
Samaaegne Wah/Volume, vaba kirjepesa jaotamine ja globaalsed pedaalimäärangud
ei saa 0.3.20-ga uut kirjutustuge. Kahe sihi ühine External 1 allikas oleks
ühine juhtsignaal; eraldi pedaalide määrangut ei tohi sellest oletada.
