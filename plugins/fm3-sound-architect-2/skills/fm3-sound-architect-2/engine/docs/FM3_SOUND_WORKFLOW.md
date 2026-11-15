# Soundi lähteülesanne, võrdlus ja lõppfail

14.11.2026 auditi SV1–SV7 seadmevaba töövoog. Node 22.23.4; FM3 Mk II Turbo FW13.
Tarkvarakontroll ei kinnita heli, tegelikku CPU-d ega STORE-püsivust.

## SV1: hetkeseis

`fm3-preset.mjs --capabilities` algab masinloetava `currentEvidence` koondiga.
Sama koond on SKILL.md alguses. `test-evidence-summary` võrdleb arve T36/T38/H2/T49,
T45/T47/T48, T50 ja T51 kviitungitega. Ajaloolisi kviitungeid ei kirjutata ümber.

Eraldi ainult-FM3 vestluses tuleb kontrollida automaatselt pakutud käivitaja versiooni,
release'i ja lähtecommit'i, taastada pakett, teha self-check ning luua ja kontrollida
nelik `FM3 FRESH CHAT CHECK`. Selle arendusvestluse taaste ei sulge avastamiskatset.
PR #108 ega uue töö PR-i ühendamine vajab kasutaja „liida” korraldust.

## SV2: ajutine lähteülesanne

Tööalus on auditis nimetatud LIVE KOOSLUS V1.3. Uut soundivalikut pole kasutaja
selles tööetapis kinnitanud; kandidaadid on ettevalmistatud võrdlusvõimalused.
V1.3 SYX säilib lähtevariandis baittäpselt; ainult kirjelduses on ajalooline FOH
asendatud hiljem kinnitatud OUT1 aktiivkõlaritega.
Lähtevariandi SYX-räsi kattub 13.11.2026 kuulamiskviitungiga: kasutaja laadis faili
FM3-sse ja kinnitas kõigi stseenide tasakaalu. See tõend kehtib ainult muutmata
lähtefailile; arvulised nivood, CPU ja STORE/reload on endiselt kontrollimata.

| Nõue | Teostus | Kontroll ja veel vajalik info |
|---|---|---|
| Ibanez AS-120, humbucker | V1.3 alus, 4 Amp/Cab kanalit | Täpsustada valitud helipea, volume/tone, häälestus ja mediaator; sama DI kõigis variantides |
| OUT1 aktiivkõlarid | Cab jääb sisse, kasutaja kinnitatud väljundi kirjeldus | Kõlarite mudel, mono/stereo, kuulamisnivoo, globaalne EQ ja sisendpad on lahtised |
| Clean, crunch, lead, ambient, dry/push, Plexi | 8 stseeni allolevas tabelis | Iga rolli A/B ja tegelik mäng; ühist kanalit muutvad variandid mõjutavad kõiki selle kasutajaid |
| Säilitada heaks kiidetud tasakaal | Amp A/D −10,16; B −9; C −5 dB; Out1 S2 −1,5, S3/S7 +2 dB | Need on seadistused, mitte tegelikud nivoovahed; V1.3 lõppfail vajab mõõtmist |
| Sihtida bassi tihedust ja kõrgete pehmust | Kaks eraldi Cab-filtri varianti | Kuulata: gain, bassi tihedus, kesktoon, heledus, rünnak, sustain, ruum; uut artistireferentsi ei oletata |
| Efektide ajastus | Lõppfailis 120 BPM, PRESET tempo, Controllers A kõigis 8 stseenis; algsed noodijaotused säilivad | `--review` loeb need lõpp-SYX-ist; soovitud BPM ja tap'i vajadus vajavad kasutaja otsust |
| Taastatav Cab/IR | Kõik kasutatud kanalid on nimetatud DynaCab-mallid | Võrrelda dekodeeritud kanaleid; User IR-i pole nõutud ega paigaldatud |
| Pedaalid/lülitid | Uusi määranguid ei lisata | Eraldi vajadus pole kinnitatud; globaalset juhtimist fail ei tõenda |
| Vastuvõtt | Räsidega nelik + vaatlused + audioanalüüs + kogu-preseti STORE eksport | Clip/dropout puudub, rollid kasutaja heaks kiidetud; ±1 dB / +2 dB on vaid arutelu lähteettepanek, mitte kohustuslik tootjapiir |

| Stseen | Roll | Amp/Cab | Aktiivne lisatöötlus |
|---:|---|---|---|
| 1 | CLEAN | A: Deluxe Verb Normal / 1x12 Deluxe Verb | Chorus A, Reverb B |
| 2 | CRUNCH | B: Class-A 30W TB / 2x12 Class-A 30W | Reverb A |
| 3 | LEAD | C: Brit JVM OD1 Orange / 4x12 Friedman GB | Drive A, Delay A, Reverb A |
| 4 | AMBIENT | A | Chorus A, Multi Delay A, Reverb B |
| 5 | CLEAN DRY | A | Lisad bypass'is |
| 6 | CRUNCH PUSH | B | Drive A, Reverb A |
| 7 | LEAD DRY | C | Drive A |
| 8 | PLEXI | D: Plexi 50W High 1 / 4x12 1960TV | Reverb A |

## SV3: kuni kolm võrreldavat kandidaati

Taastatud mootori skriptiga (MOOTOR = engine/skills/instructions):

```bash
node MOOTOR/scripts/fm3-sound-candidates.mjs /ABS/UUS_TUHI_KAUST
```

- `BASELINE_V13`: V1.3 SYX on muutmata.
- `CAB_LOW80`: ainult Cab A–D ploki Low Cut 20 → 80 Hz. Ootus: vähem sügavat bassi.
- `CAB_HIGH6500`: ainult Cab A–D ploki High Cut ligikaudu 10000 → 6500 Hz. Ootus: pehmemad kõrged.

Filtrid asuvad Cab → Preamp → Filters lehel; need pole Cab 1 eraldi filtrid.
TXT üldise „FM3-Editi skaala” asemel on nende kahe parameetri füüsiline ühik Hz.
TXT pealkiri „LÕPLIK PRESET” tähendab väljastatud faili lõppseisu; kandidaadi kuulamise
ja seadmevastuvõtu staatus on eraldi review- ja acceptance-pending-failides.

Mõlemat võrreldakse lähtevariandiga, neid ei kombineerita selles ringis. Muutub ainult
Cab-filtrite rühm ja variantide nimed; stseeninivood ning Amp/Drive/efektid säilivad.
Test kontrollib kõiki lubatud muutusbaite. Kõik 12 põhifaili läbivad `--verify`.
Need pole kuulamisel vastu võetud uued presetid. Järgmise rühmani jõutakse alles valiku järel.

## SV4: olemasolevate WAV-failide analüüs

Vaja on Python 3, numpy, scipy, ffmpeg ja ffprobe. Tööriist ei salvesta heli ega ava
heliseadet/MIDI-porti. Sisend on sama DI-ga loodud mono- või stereopaari kadudeta WAV;
neljakanalilisest failist ekspordi soovitud märg või kuiv paar eraldi.

Loo WAV-ide kõrvale näiteks `session.json`:

```json
{
  "version": 1,
  "syntheticOnly": false,
  "recordingChain": {
    "guitar": "täida", "pickupAndPots": "täida", "output": "täida",
    "inputPadAndGlobalEQ": "täida", "presetSha256s": ["täida kõigi võrreldud SYX-ide räsid"]
  },
  "commonDiFile": "DI.wav",
  "takes": [
    {"id": "baseline", "file": "baseline.wav"},
    {"id": "candidate", "file": "candidate.wav"}
  ]
}
```

```bash
python3 MOOTOR/scripts/fm3-audio-session.py /ABS/session.json /ABS/UUS_ANALUUS
```

Algfailide räsid ja algnivood säilivad. Analüüs sisaldab algse ja ühise lõigu LUFS-i,
RMS-i, sample/true peak'i, crest factor'it, 50 ms dünaamikajaotust ja spektriribasid.
Joondus kasutab stereo energiaümbrist kuni 1 ms sammuga; see vajab kuulamisel ülevaatust,
ei tõenda täpset faasijoondust. Ebaselge vaste keeldutakse. Vajadusel määra kandidaadile
DAW-ist teada `offsetSamples`: positiivne tähendab, et kandidaat hilineb lähtefaili suhtes.
Eri diskreetimissagedusi/kanalite arve automaatselt ümber ei tehta.

Valikulised `startSeconds`/`endSeconds` piiravad võrdluslõiku lähtefaili ajateljel.
`tailStartSeconds` märgib mängu lõppu **ühise analüüsilõigu algusest**, mitte algfailist.
Selle järel näidatakse saba 50 ms energiaümbrist; tööriist ei nimeta seda RT60-ks ega
tuvasta automaatselt efekti. Ühest mängufailist ei järeldata kindlat delay-tüüpi.

`*-aligned.wav` hoiab ühise lõigu algnivood; ainult `*-AB.wav` on LUFS-i järgi
ühtlustatud. Kõigile koopiatele rakendatakse vajadusel sama lisavaigistus true peak'i
varu jaoks. `abWithinHalfDb` kontrollib tegelikku tulemust. Algset rütmi/soolo nivood
hinnatakse muutmata salvestustest. DI räsi seob võrdluse sisendiga, kuid väide, et kõik
võtted kasutavad seda DI-d, on salvestaja kinnitus. Sünteetilised testid jäävad testideks.

## SV5: tervik- ja nivooriski kontroll

```bash
node MOOTOR/scripts/fm3-preset.mjs --review /ABS/PRESET
```

Kontroll käivitab esmalt neliku täieliku taasesitusvõrdluse. Väljund seob failiräsid,
nõutud juhid ja mudelid, lõppfaili stseenid, bypass'i, aktiivsed modifikaatorid,
tempo/noodijaotused, IR-i valikud ja jagatud kanalid. Puuduv või muudetud nelik keeldutakse.

Mitme sisendiga lahter tekitab paralleelharude nivooriski. Unity-tasemel koherentsete
võrdsete sisendite teoreetiline summa ei ole mõõdetud võimendus. Multiplexeri valik
jääb eraldi teadmata; automaatset Mixer-trimmi ei tehta. Bypass, faas, tegelikud tasemed
ja plokkide sisemine töö vajavad SK3 katset. CPU on alati märgistatud hinnanguna.

## SV6: vajaduspõhine laiendus

Praegune V1.3/Cab-filtri võrdlus ei nõua Plexi täismalle, Holdi ega uut eksemplari.
Seetõttu uut kirjutajat ei avata. 45 Plexi mõõtepilti ei võrdu generaatori toega.
Kui järgmine kinnitatud lähteülesanne seda nõuab, tuleb eraldi teha kirjutaja,
skeem, muutumatute baitide testid, vigaste sisendite tõrjumine ja SK6 katsekaart.

## SV7: tulemuse sidumine täpse lõppfailiga

Iga kandidaadi kõrval on `*.acceptance-pending.json`, kus on neliku räsi ja 8 stseeni
tühjad vaatlused. Täida see alles SK1–SK4 järel. Vaja on kasutaja valikut koos põhjusega,
salvestusahelat, iga stseeni mõõdetud CPU-d/nivoovahet, clip'i/katkestuste ja üleminekute
tulemust, käsitsi STORE/reload'i kinnitust, järelkuulamist ning ühte lõplikku SYX-eksporti.
`measurements.audioAnalysisFile` viitab SV4 analüüsile; selle `recordingChain.presetSha256s`
peab sisaldama vastuvõetava faili räsi. Lähtefaili muutes senine kinnitus ei kehti.

```bash
node MOOTOR/scripts/fm3-sound-acceptance.mjs /ABS/PRESET /ABS/TAIDETUD_VAATLUSED.json
```

STORE-võrdlus lubab ainult asukohapäist, valitud stseeni baiti 0 ja tervete kirjete
järjekorda. Kõik nimed, gridi-, Controllersi-, modifikaatori- ja plokisõnad peavad säilima;
parameetrimuutust ei normaliseerita ära. Tööriist keeldub tühjadest, vale räsiga ja
sünteetiliseks märgitud tulemustest. Kuulamise kinnitus jääb kasutaja hinnanguks.
Need seadmetulemused puuduvad praeguses seadmevabas tööetapis.
