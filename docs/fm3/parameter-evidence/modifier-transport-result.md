# MOD Min/Max: op82 transport ja arvutustäpsuse piirid

**Järgmine tulemus:** [L1 helper'ite MODE1 taastamine ja valitud op82 rada](modifier-mode-result.md)
lahendab allpool veel lahtisena kirjeldatud kahe matemaatikafunktsiooni
aadressid ja taastamisharud. Käsitlejasse saabuv tööaegne režiim jääb lahtiseks.
Allolev tekst ja selle JSON-audit säilitavad eelmise etapi ajaloolise seisu.

22.10.2026. Alus: kohalik uurimiscommit `75a2e32529207524a1657d7fe8332fb352b320c5`
ning tööaruande versioon 16. **0 uut füüsilist eksporti, tootmisplugin 0.3.13.**
See etapp jätkab [lohistamise analüüsi](modifier-drag-result.md).

## Uus tõendatud tulemus

Editor ei muuda normaliseeritud float32 väärtust MIDI-pakkimise ajal arvuliselt.
Leitud vastuvõtja taastab samad 32 bitti. ARM-i ja SHARC-i vahel on nüüd leitud
ühismälu edastustee ning selle SHARC-käsitleja: MOD-i callback saab paketi
float-välja bitid. See on kontrollitud harude ja väljade staatiline seos;
kogu programmi täitmist ega ajaloolisi MIDI-pakette pole taasesitatud.

Firmware'i käivituskood valib **32-bitise lähima esitatava väärtuseni ümardamise**.
See toetab eelmist float32 mudelit, kuid **ei tõenda veel MODE1 väärtust iga
salvestuse hetkel**. Proloogis kutsutavad välised matemaatikafunktsioonid ning
kõik võimalikud tööaegsed režiimimuutused pole lõpuni jälitatud.

## Paketi tee

| Lüli | Kontrollitud kood ja tähendus |
| --- | --- |
| ModifierDialog | `0x10017aef8…0x10017af14`: float salvestatakse paketi +8 väljale; virtual +0x1b0 kutsele antakse X3=0, W2=1. Mitte-null MOD PID kasutab varem lahendatud `0x1001796d4 → 0x1000aefe4` rada. |
| Kohene saatmine | `0x1000af2e4…0x1000af320`: op, effect, PID ja float kantakse väljadesse +0, +4, +8, +12; serializer `0x100237874`. Samanimelise ootel päringu korral säilitatakse float'i bitid ka `0x1000af158…0x1000af164` koopias, kuid ajastaja täielik rada jääb välja. |
| Float'i pakkimine | `0x100237994…0x1002379e0`: `LDR W24,[X23,#12]`, bitinihked 0/7/14/21/28 ja baidikirjutused payload +6…+10. **Puudub float→integer arvuline konversioon.** Viimane grupp sisaldab 4 kasulikku bitti. |
| SYX ümbris | `0x100237af4…0x100237b00` seab funktsiooniks 1 ning kutsub `0x100239c18`; payload kopeeritakse muutmata. Lõpus XOR-checksum &127 ning F7. |
| ARM vastuvõtja | `0xc44526b8…0xc44526cc`: SYX byte5 funktsioon 1 valib `0xc44528c8`, kust kutsutakse `0xc4454990`. See loeb op/effect/PID; `0xc44549f2` kutsub 5 grupi dekoodrit `0xc44515aa` ja kirjutab tagastatud bitid paketi +12 väljale. |
| Ühismälu saatja | `0xc441b928` proovib esmalt ARM-käsitlejat. Käsitlemata op82 tabelikirje `0xc441b99c+4×80` viib `0xc441bf38`: kopeerib 0x418 baiti aadressile **0x20084000** ja seab +0x10 oleku 2. Float +0x0c ei muutu. Seejärel ootab olekut 1. |
| SHARC tarbija | `0x82e072/0x82e07f` annab sama aadressi R4-s funktsioonile **0x82959a**. See loeb op R7, effect R9, PID R10 ja +12 float-bittide välja **R13**. |
| SHARC dispatch | Boot-tabeli `0x282e7958+4×82` kirje on `0x829624`; kehtiva objekti/PID haru jõuab `0x82968c` kaudu callback'ini. |
| MOD callback | `0x8296e8…0x8296fe`: R4=object, R12=op, R8=PID; R13 pannakse argumendina virna. Callback loetakse object+**0x14c**. Varem tõendatud MOD konstruktor seab sinna **0x813f86**; see loeb argumendi `0x813fb2` juures R10-sse. |
| uint16 salvestus | Varem tõendatud Min/Max haru jõuab `0x823ae7` juurde. Op82: `input×65534`, seejärel `+0.5`, TRUNC, clamp 0…65534 ja 16-bitine kirjutus `0x823bb4`. |

ARM-i üldine `0xc441c1d0` callback-kutse **ei ole otsene kutse SHARC-koodi**.
See kuulub ARM-i kohaliku käsitlemise rajale. Leitud ühismälutee täidab nende
protsessorite vahelise varasema lünga; tingimus on ARM-is käsitlemata päring
ning SHARC-is kehtiv MOD objekt/PID. Objekti leidmise, kutsekonventsiooni ja
paketiväljade kontroll ei võrdu kõigi scheduler'i ja veaharude emuleerimisega.

## Arvutusrežiim ja miks see loeb

Kontrollitud [Analog Devices SHARC+ Core Programming Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
§3 *Floating-Point Boundary Mode / Rounding Mode*, §20 TRUNC ning §29 MODE1/MMASK:

- MODE1 bit16 RND32=1: 24 olulist bitti, s.t float32; 0: 32 olulist bitti,
  s.t SHARC 40-bitine float. MODE1 bit15 TRUNCATE valib arvutustulemuse
  lähima paarisarvulise mantissi või nulli suunas ümardamise.
- `TRUNC` käsk lõikab tulemuse nulli suunas sõltumata MODE1.TRUNCATE-st.
  **`+0.5; TRUNC` ei tähenda, et eelnevad float-arvutused oleksid täpsed.**
- `0x8343e9 BIT CLR MODE1,0xa078` puhastab TRUNCATE; järgnev
  `0x8343ec BIT SET MODE1,0x1011800` seab RND32. Tulemuseks 32-nearest.
- `0x8343ef MMASK=0xe0b003` ei sisalda RND32 bitti; tavaline status-stack'i
  maskimine ei puhasta selle seadistusega RND32-d.
- Firmware sisaldab ajutisi režiimimuutusi. Näiteks `0x833286…0x8332b5`
  salvestab MODE1, valib 40-bitise/nulli suunas arvutuse ja taastab MODE1.
  See ei tõenda kõigi muude funktsioonide režiimisäilitust.

Kasutatud käsiraamatu SHA-256:
`a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.
Vana SLEIGH-mudeli kogu koodiruumi märksõnaotsing annab ka käsu keskele
langevaid valepositiivseid leide; seda **ei** kasutata täieliku MODE1-katvusena.

Uus uurimismudel kasutab täpseid kahendarve täisarvulise mantissi ja astmega.
Korrutamise ja liitmise järel ümardatakse **eraldi**, seejärel rakendub TRUNC.
See väldib Python double'i või ühe ühendatud arvutuse ekslikku kasutamist.
Ulatus: lõplikud mittenegatiivsed float32 sisendid [0,1]; subnormaalid nullitakse.
See ei ole üldine firmware-emulaator ega generaatori avalik kodeerija.

| Tarkvaraline kontroll | Tulemus |
| --- | ---: |
| Matemaatilisi uint16 poolesammu piire | 65 534 |
| Iga piiri lähim float32 ja kaks naabrit | **196 602 eristatavat sisendit** |
| 40-nearest erineb 32-nearest'ist | **32 640** |
| 32-zero erineb 32-nearest'ist | 32 768 |
| 40-zero erineb 32-nearest'ist | 32 768 |
| Kõik 65 535 sõnakeskpunkti taastuvad kõigis neljas režiimis | Jah |

Piiri eristav näide: float32 bitid **0x37000100** annavad 32-nearest mudelis
raw 1, ülejäänud kolmes mudelis raw 0. Täpne `floor(t×65534+0.5)` annab samuti 0.
Seetõttu ei saa kogu vahemiku täpsust tuletada üksnes sõnakeskpunktide
tagasiteisendusest. Piiriümbruse skann ei hõlma iga võimalikku float32 sisendit.

## Olemasolevad kolm mõõtmist

Sisendid allpool on eelmise ringi **tingimuslikud lohistamiskandidaadid**,
mitte salvestatud MIDI-paketid. Arvutus ei sobita neid tagantjärele raw-väärtustele.

| Mõõtmine | Kandidaadi float32 bitid | Viis pakitud andmebaiti* | Mõõdetud raw | Kõigi nelja režiimi raw |
| --- | --- | --- | ---: | ---: |
| Min 2.50 | 0x3e7fdec5 | 45 3d 7f 73 03 | 16375 | 16375 |
| Max 7.50 | 0x3f40084e | 4e 10 00 7a 03 | 49159 | 49159 |
| Max 5.00 | 0x3f0010cf | 4f 21 00 78 03 | 32784 | 32784 |

\* Arvutatud payload-fragment, mitte väljastatud SYX ega seadmelt mõõdetud pakett.

Ka eelmise auditi kõik ühesuunalised täisarvulised sündmusejaotused jäävad
kõigis neljas mudelis samasse raw-sõnasse. Kontroll kasutab täpselt leitud
nurgavahemiku äärmusi ja kvantija monotoonsust. Varasemad tingimused —
lineaarrežiim, tundlikkus 1.5, lähteoleku rekonstruktsioon, puuduv tagasiside
lohistamise kestel — jäävad jõusse. **Kolm mõõtmist ei erista arvutusrežiime.**

## Kontrollid ja piirid

- **22** uut räsiga kontrollitud piirkonda; valitud operandide, tabelite,
  serializer'i kutsete, float-välja ja MODE1/MMASK kontrollid algbinaaridel.
- **5** sisulist testi: raw-bitid koos NaN/-0 näidetega; astmeline ümardus;
  paarisarvuline mantiss vs nulli suunas; sõltumatu float32 arvutusega võrdlus
  4103 sisendil; lubatud ulatus ja ankrud.
- 34 bitivektori pakke/taaste kontroll. Grupiväljade lahusus katab kõik
  32 sisendbitti; see on tarkvaraline bitivõrduse kontroll, mitte seadmetest.
- Uurimisfailid paiknevad väljaspool avaldatud plugina mootorit. Uut native-
  binaarlõiku ei lisata; manifest sisaldab koordinaate ja räsisid.
- Maci **22.10 edukas REA/Ghidra analüüs** jääb varasemaks sisestusraja
  tõendiks. Selles etapis tehti uut Capstone'i ja SLEIGH-abiga staatilist
  analüüsi; **uut REA dekompileerimiskäivitust ei tehtud**.

```sh
python3 tools/fm3/test-modifier-transport.py
python3 tools/fm3/modifier_transport_audit.py \
  --editor /absolute/path/FM3-Edit-arm64 \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

## Järgmine samm

Sulgeda MODE1 säilimine op82 helper'i väliskutsetes **0x1cb91c** ja
**0x1cb13a** ning SHARC dispatcher'i sisendradas. Nende aadresside kaardistus
ei kasuta automaatselt praegust 0x800000 VISA akna valemit; varasemat
ebaõnnestunud 0x9cb91c oletust ei tohi käsitada tõendina.

Seejärel saab valmistada kitsalt piiritletud kanonilise normaliseeritud
väärtuse kodeerija kandidaadi ja otsustada kuvasuuruse täpse tähenduse.
Lohistamisega mõõdetud raw-sõnade säilitamine ja täpse kuvasuuruse taotlus on
eri sisendid. Op9 RECIPS ja teiste sihtparameetrite tüübid vajavad eraldi ulatust.

**Uut füüsilist eksporti praegu ei küsita.** Puuduv asjaolu on runtime-
arvutusrežiimi säilimine; olemasolev firmware on selle uurimise järgmine allikas.
Pelgalt veel üks sama kuvanäit ei fikseeriks vajalikku float-sisendit.
`generatorWriteSupportAdded=false`, `fullRangeEncodingProven=false`.
