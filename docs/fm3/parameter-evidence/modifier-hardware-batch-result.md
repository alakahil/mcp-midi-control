# Min/Max koondkatse valmis: 22.10.2026

Kasutaja soovis kiiremat kompleksset riistvarakatset ning kinnitas selle
ettevalmistamise sõnadega „teeme selle ära”. Valmis on käivitatav, iseseisev
Mac-pakett **FM3_MOD_HW_BATCH 0.1.0**. Riistvarakatse ise on veel tegemata.

## Konkreetne tulemus

- **44 automaatset SET-sammu**, 92 sõltumatut GET-päringut eduka täisringi
  korral, üks käivitamine ja kuni üks lõplik käsitsi SYX-eksport.
- Alus on olemasolev `FM3_MOD_MIN_2p50_export.syx`, SHA-256
  `11fcb7084d099429f845d7ef27b31d6bd74fa3883cfd5dec27424d771a5cdf13`.
  Pakis on see muutmata baitidega nimega `BASELINE.syx`.
- MOD record 0, juhtmeobjekt **3**, siht **Wah 1 (94), Control PID5**,
  Source=14/External1. Wahi kanal A, Scene 2 „Rhythm Fat”, bypass sees.
  **MOD_CHANNEL=0 tähendab ALL, mitte A.** Seda seost ei muudeta.
- Esmalt võrreldakse päris seadme 25 MOD-sõna ning Wah A–D 100 sõna
  alusfailiga; MOD loetakse stabiilsuse kontrolliks uuesti. Vale või puudulik
  vastus peatab enne esimest SET-i. Täieliku preseti live-algseisu automaatset
  kontrolli ei väideta; kasutaja impordib täpselt tuvastatud alusfaili.
- SET saadab täpsed float32-bitid op82 või op9 kaudu. Toorväärtuse eelnev
  SYX-i kirjutamine ei asenda teisenduse mõõtmist. Iga sammu järel loetakse
  MOD kaks korda sõltumatu GET-iga; kajavastus ei ole raw-tõend.
- Muutuda võib ainult selle sammu PID. Guard-nullimised teevad 6.47
  kriitiliste punktide võimaliku tulemuse eelmisest seisust eristatavaks.
  Muutuseta sammu ei märgita SET-i täitmise tõendiks.
- Koondatakse Min/Max üheksa normaliseeritud punkti kummalegi väljale,
  kuus op9 võrdlust, Starti normaliseeritud piirpunktid ning üheksa uut
  tavaväljade op9 sisendit. Varasemaid 18 tavapunkti ei mõõdeta uuesti.
- Lõppeksport `FM3_MOD_HW_FINAL_export.syx` võrreldakse viimase raw-lugemisega
  ja kogu preseti kehaga. Ainult kavandatud 11 välja võivad olla muutunud;
  kontrollitakse kaadreid, CRC-d, footer'it ja muutmata päisebaite.
- TX-intent, kirjutatud baitide arv, RX-baite sisaldav ajastatud logi ning
  iga sammu tulemused talletatakse jooksvalt. Vea korral pole automaatset
  kordus- ega taastuskirjutust. `--finish` lisab lõppeksporti ja `--pack-only`
  pakib olemasolevad logid seadmega ühendust võtmata.

## Transpordi alus ja selle piir

Varem kontrollitud MOD konstruktor seob indeksi+3 ning 25 parameetrit;
editori/FW13 op82 tee säilitab float32 bitid viies 7-bitises grupis. Käesolev
uus piiratud ARM-lugemine kinnitas:

| Koht | Vaadeldud tulemus |
|---|---|
| `0xc4452744` | SysEx fn31 tabelikirje → `0xc445296c` |
| `0xc445296e` | Kutse GET-handler'ile `0xc4456676` |
| `0xc4456676…66c2` | Effect ID loetakse kahest LE 7-bitisest grupist; lubatud 1…201; küsitakse vektorit |
| `0xc443bbc6…bc1a` | Sisemine päring operatsiooniga 148; ARM fallback `0xc441bf39`, SHARC dispatch `0x82a0c0` |
| `0xc4456904…696e` | Vastuse andmeallikast loetakse `LDRH` abil uint16 ning pakitakse kolme 7-bitisesse gruppi |

Seitse räsiga kontrollpunkti ja viis valitud operandikontrolli on failis
`modifier-hardware-transport-checkpoints.json` ning taasesitatavad
`tools/fm3/modifier-hardware-batch/audit_transport.py` abil. Uusi firmware-
ega editoribaite ei jagata. Kogu mailbox'i ja vektori tootja dünaamilist
teed ei emuleeritud. Seetõttu on **MOD0 live-preflight kohustuslik**.
Wahi fn31/100-sõnalise vastuse formaat taasesitati varasemast päris logifailist.
Uus MOD0 live GET/SET-ring pole veel seadmel kinnitatud.

REA-nimelisi või Ghidra/Reverse Engineering tööriistu ühendatud registris
ei olnud. Uut REA dekompileerimist ei toimunud. Kasutati varasema eduka
Maci REA/Ghidra töö tulemusi ja varem kontrollitud staatilist rada; uus kitsas
ARM-uuring tehti Capstone'i ja räsiga seotud boot-mälu põhjal.

## Eristatavad tulemused

Min/Max täpsed normaliseeritud .25/.5/.75 kandidaadid annavad mudelites
16384/32767/49151; ajaloolised hiirega saadud 16375/32784/49159 säilivad
eraldi tõendina. Need ei ole uues katses vead ega parandatavad alusandmed.

`0x3f25a1cb` annab 32-nearest mudelis 42401, teistes kolmes praeguses mudelis
42400. Naabrid annavad vastavalt 42400 ja 42401. `0x37000100` annab vastavalt
1 või 0. Tegelikud vastused peavad tulema seadme raw-lugemisest.
Ühegi mudeli välistamist ei tehta enne mõõtmist. Kui vastus jääb väljapoole
mudelite hulka, säilitatakse see ja peatatakse katse; seda ei nimetata
automaatselt seadme veaks.

Op9 saadetakse sisemise arvulise float-sisendina. See ei läbi editori
klaviatuuriparserit ega kordajaga jagamist, mistõttu otsest op9 tulemust
ei saa automaatselt nimetada klaviatuurisisestuse täielikuks taasesituseks.

## Kontrollid

**14/14 Python-testi ja 3/3 Node-testi läbivad.** Kontrollitud on täpsed
saadetavad bitid, päris Wahi logi, tükeldatud kaadrid/realtime, vigased
kontrollsummad, vale plokk ja pikkus, algseisu mittevastavus, kõrvalmuudatus,
ebastabiilne lugemine, timeout, osaline kirjutus ja korduskatse puudumine.
POSIX I/O rada läbib kohaliku virtuaalse jadapordi katse; see ei ole FM3 test.
Node-kontroll katab raw/SYX lahknevuse ja kõrvalmuudatuste tõrjumise.

Kontrolliti Python 3.9 süntaksit ning iseseisva ZIP-i lahtipakkimist,
failiräsisid ja `.command --offline` käivitamist teises, tühikutega kaustas.
Maci tegelikku käivitamist ei väideta. Paketis on Python, Node-lugeja,
olemasolev alus-SYX, litsentsid, täpne JSON-plaan ja eestikeelne alg-/sihttabel.
Täielikku CI-d ei korratud; tootmisgeneraatorit ei muudeta.

## Lahtine ja järgmine samm

Järgmine samm on kasutaja üks Maci käivitus ning tulemuste ZIP-i analüüs.
Kui preflight peatub, tuleb uurida juba kogutud vastust; kogu katset ei paluta
pimesi korrata. Uus eksport on vajalik eduka katse lõppseisu sõltumatuks
serialiseerimiskontrolliks. Olemasolevad eksportfailid ei sisalda uute täpsete
sisendbittide vastuseid ega järjestikuste piirpunktide tulemusi.

STORE-käsku, presetikoha üle kirjutamist ega voolukatkestuse püsimiskatset
see ring ei tee. Teised Min/Max sihttüübid, täielik op9 RECIPS-vahemik ja
kogu MODE1/interrupt-muutumatuse tõend jäävad avatuks. Tööaruande eelmised
frame'i alias'e ning RTI piirangud säilivad. **Uusi füüsilisi mõõtmisi 0;
fullRangeEncodingProven=false; generatorWriteSupportAdded=false;
tootmisplugin 0.3.13.**
