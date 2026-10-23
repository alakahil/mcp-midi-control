# MODE1: kaks suletud kutsujate rada ja ajastatud callback, 22.10.2026

Alus: kohalik uurimiscommit `8e1982bbec3ee268e20b8321ff5d1198dde19c6d`
ja tööaruande versioon 20. **Tootmisplugin 0.3.13. Uusi füüsilisi eksporte 0.**

## Tulemus

Varem lahtisest seitsmest algatamisfunktsioonist ja neljast töötsükli
funktsioonist on nüüd **kahe** MODE1 mõju koos nende alamkutsetega
piiritletud staatilises analüüsis suletud. Tõend eeldab tavalist skalaarset
ABI-d ning korrektset mälu-/tagastuskäitumist; katkestuste ja erandite
välist mõju selle sisse ei loeta.

| Kutsuja | Läbi vaadatud alamkutsed | Tulemus |
|---|---|---|
| Algataja `0x825e21` | `0x833c86` → `0x833522` | Matemaatika-abifunktsioon salvestab ja taastab MODE1 kõik bitid; kontroll hõlmab tava- ja erandväärtuste harusid. |
| Töötsükkel `0x82c97d` | `0x1c0b10` | Kutsuja ja lehtfunktsioon ei kirjuta MODE1-d ega kutsu muid alamfunktsioone. |

Lisaks leiti ajastatud callback'i **konkreetne registreerimisrada** ning
kinnitati selle callback'i MODE1 säilitamine. Kõik tööajal tabelisse
võimalikult kirjutatavad viidad ei ole selle leiuga tõendatud.

**Kogu tööaja MODE1 invariant jääb lahtiseks.** Täpse sisendi 6.47
blokeering, 1000/1001 kandidaatsisendi ulatus ja tootmisgeneraator säilivad.
`runtimeModeAtStoreProven=false`, `fullRangeEncodingProven=false`,
`generatorWriteSupportAdded=false`.

## Matemaatika-abifunktsiooni taastamistõend

`0x825e21` kutsub `0x833c86` kaks korda. Selle abifunktsiooni ainus kutse on
`0x833d07` → `0x833522`; viimane on kaheksa käsuga RECIPS-arvutus, mis ei
kirjuta MODE1-d ega muuda käsitletavat tarkvaralist stack-pointer'it.

| Koht | Kontrollitud tegevus |
|---|---|
| `0x833ca8` | MODE1 kirjutatakse DM(I7,M7) kaudu stack'i; M7=-1 ja sõnalaius 4 annavad järelnihke −4 baiti. |
| `0x833caa` | MODE1-le rakendatakse ajutiselt SET `0x2000`. See ei ole RND32 ega TRUNCATE mask. |
| `0x833dab` | Tavaharu loeb salvestatud MODE1 R12-sse asukohast I7+4. |
| `0x833dd9` | Erandväärtuste epiloog loeb sama salvestatud sõna samuti R12-sse. |
| `0x833db5` | MODE1 saab R12-s oleva algse sõna. |
| `0x833db9` | Ühine ABI tagastus kahekäsulise viitealaga. |

Kontrolliti **169 käsupiiri**, kõiki funktsioonisiseseid otseseid hüppeid,
kutsutavat funktsiooni, viitealasid ja MODE1 asjakohaseid operande.
Sümboolne graaf läbis **157 olekut** ja ühe ühise tagastuse. Mõlema
tingimusharu kaasamine ei sõltu eeldusest, milline arvuline sisend haru
valib. MODE1 avaldisena jälgitakse `(sisend & keep) | force`; arvutused ja
kutse tühistavad R12 salvestatud sõna tähistuse kuni kindla uuestilugemiseni.

Tõend kontrollib MODE1 taastamise algebrat selle läbivaadatud semantilise
mudeli sees. See **ei emuleeri** matemaatika tulemust, kõiki käske, protsessorit
või katkestusi. Skalaarse ABI eeldus ei muutu väiteks, et kõik võimalikud
protsessori täitmisrežiimid on seadmel läbi proovitud.

## Ajastatud callback'i konkreetne rada

Töötsükli funktsioon `0x82b193` sisaldab kaudset kutset `0x82b1ed`.
Selle tabel on **0x809cb110**, neli **28-baidist** kirjet. Callback'i
funktsiooniviit on kirje suhtes **+24 baiti**.

- `0x82b1c4` loeb baidi ja nihutab I5 järgmise kirje algusse +28;
  `0x82b1cb` loeb seejärel normaalsõna I5−4 ehk algse kirje +24.
- Registreerija `0x82b116` alustab I5=kirje+24, nihutab +28 ja
  kirjutab callback'i asukohta I5−28; tulemus on samuti kirje+24.
- `0x80f729` annab registrifunktsioonile R4-s **0x80f710**. See
  callback kutsub tühistajat `0x82b0dc`, mis nullib kirje callback'i.
- Registreerimise, tuvastatud callback'i ja tühistamise vaadeldud
  radadel pole MODE1 kirjutusi. Registreerija kasutab varem läbi
  vaadatud ajaloendurit `0x1c8aa2`.

Firmware'i algne tabel on nullidega, kuid nullidega algseis **ei tõenda**
kõiki hilisemaid kirjutajaid, kaudseid registreerijaid ega tööaja sihte.
Seetõttu on `knownCallbackRouteModePreserving=true`, kuid
`allRuntimeRegistrationsProven=false`. Kogu `0x82b193` mõju ei märgita
tingimusteta suletuks.

## Dekoodri täpsustused ja katkestuse tagastus

Lisati eraldi kontrollitavad SHARC+ Type4b BW/SW ja Type14d BW/SW
operandilugejad. Need lahendavad konkreetsed 8-/16-bitise mälupöörduse
dekodeerimislüngad; ei tõlgenda tundmatut compute-käsku samaks mälukäsuks.
Suund, tingimus, märgiga nihe, laiused ja välistatud variandid on testitud.

Puhvri nullija `0x1c0b10` tsükkel vajas eraldi Type12a_ureg kontrolli:
`0x1c0b20` kasutab R12 loendurit ja **F1-režiimi**. SHARC+ bit23 on
režiim, nihke märgibitt on bit22. Seetõttu on nihe **+6** ja tsükli
lõpp **0x1c0b26**; tsüklisse jäävad kahe puhvri kirjutused `0x1c0b23`
ja `0x1c0b26`. Vanema SLEIGH 24-bitine märgitõlgendus andis eksliku
kaugel asuva sihi. Uus piiratud lugeja kontrollib seda eristust nii
positiivse kui negatiivse nihke korral ja lükkab tundmatud vormid tagasi.

Exploratoorse SLEIGH väljundi loop-aadresse ja dekodeerimata compute-käske
ei kasutata täieliku juhtvoo tõendina. Tundmatu käsk ei võrdu MODE1 säilitamisega.

Valitud neli otsest MODE1 kirjutust algatajas `0x82c228`
(`0x82c2b7`, `0x82c2eb`, `0x82c30c`, `0x82c315`) kasutavad maski
`0x200000` ehk PEYEN/SIMD. See ei muuda otseselt RND32/TRUNCATE bitte,
kuid ei tõenda kogu algataja ega tema alamkutsete säilitamist.

Konteksti taastamise lõigus kirjutatakse `0x830c43` juures MODE1STK.
`0x830c8c` juures on 16-bitine parcel **0x0abe**. Scheduler'i käsitleja
`0x830778` kutsub taastajat `0x830a1b` ja jõuab samuti parcel'ini
**0x0abe** aadressil `0x8307bb`.

**Täpsustus:** vanem SHARC214xx SLEIGH nimetab 0x0abe käsuks `RTS`.
SHARC+ juhendi Type11c joonise fikseeritud bitid ei ühti selle dekoodri
vormiga; vastavust ei õnnestunud selles etapis sõltumatult sulgeda.
Seega varasem töövaheline lause „lõpeb RTS-iga” tähistab siin dekoodri
tõlgendust, **mitte uut iseseisvat käsukodeeringu tõendit**. Auditis on
`compactReturnEncodingIndependentlyReconciled=false`.

Leiti käsitlejate registreerimiskohad:

- `0x830e43` määrab R8=0x830778 ja `0x830e4b` kutsub `0x8337e2`.
- `0x830e13` määrab R8=0x830cb4 ja `0x830e1a` kutsub sama registreerijat.

Selle etapi lõpus jäi lõplik katkestuse dispatch/return-wrapper tuvastamata.
**Hilisem [ADI binaariga võrdlus](modifier-return-result.md) leidis kandidaadi
`0x1cbb7f → 0x1cbbe6 → 0x1cbc0c`**, mille 86-baidine taastamislõpp
kattub ADI SC589 näitega. Aktiivse vektori ja kogu callback'i raja
seostamine jääb lahtiseks. MODE1STK kirjutust ei tõlgendata automaatselt
elava MODE1 taastamisena.
`wholeInterruptReturnPathProven=false`.

Operandiformaatide allikas: [Analog Devices SHARC+ Core Programming Reference,
rev 1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
§14–31/32, §15–24/25, §16–5/6; tagastuste semantika §4–10/11 ja Type11c joonis §15–22.
Kohaliku juhendi SHA-256:
`a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.

## Kontrollid ja allesjäänud ulatus

**20 räsiga piiritletud firmware'i piirkonda**, 169 käsupiiri, 157
sümboolset olekut. Läbisid **8 uut testi**, 9 varasemat MODE1 testi,
7 scheduler'i testi ja 6 täpse Min/Max-taotluse testi — **30 testi**.
Firmware-põhine auditi taasesitus läbis. See pole uus täielik CI-jooks.

```sh
python3 tools/fm3/test-modifier-caller.py
python3 tools/fm3/test-modifier-mode.py
python3 tools/fm3/test-modifier-scheduler.py
python3 tools/fm3/test-modifier-minmax-plan.py
python3 tools/fm3/modifier_caller_audit.py --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

Kood, [masinloetav audit](modifier-caller-audit.json) ja
[räsid/käsupiiride tõend](modifier-caller-checkpoints.json) asuvad
tootmispluginast eraldi. Native-binaarikatkeid ei lisatud.
See on **uus staatiline analüüs**, mis kasutab varasema REA/Ghidra töö
tausta; **uut REA dekompileerimist ei tehtud**.

Lahti jäävad:

- Kuus algatajat `0x82c228`, `0x82fe42`, `0x80f1ba`, `0x8289bc`,
  `0x8304ab`, `0x1c8b15` koos kontrollimata alamkutsetega.
- Kolm töötsükli funktsiooni `0x82b193` (välja arvatud kirjeldatud
  konkreetne callback-rada), `0x811a83` ja `0x80ea77`.
- Ploki kaudne callback `0x82e05a`, object+0x14c, op86/PID0x3fad.
- Varasemate pakettide teised operatsioonid, raw-kirjutusele järgnev
  tagastustee ning katkestuste wrapper ja ülalnimetatud kodeeringuerinevus.

**Järgmine ökonoomne samm:** eristada `0x80ea77` → `0x80f751` kutse
kindel **op10 / PID0x3a16** rada ülejäänud suurest callback-funktsioonist
ning lahendada katkestuse tagastuskäsu kodeering. Kindlate argumentidega
raja uurimine piirab analüüsi mahtu. Jätkata saab olemasolevate failidega;
uut füüsilist eksporti ei ole selle sammu jaoks põhjendatud. **6.47 tuge
ei avata** ja seniseid mõõdetud raw-sõnu ei muudeta.
