# Pitchi kohandatud skaalad — 0.3.4-dev

## Kasutamine

NOTE2–NOTE8 PID 64–70 salvestavad täisarvulisi pooltooninihkeid toonikast
otse 16-bitiste sõnadena. Need pole normaliseeritud nupuväärtused ega
noodinimede indeksid. Esimene aste on vaikimisi 0. Lubatud mudelid on
Dual Diatonic, Quad Diatonic, Arpeggiator ja Quad Diatonic Delay.
Vali mudel täiskanalimalliga ja määra SCALE=CUSTOM.

Näide: neljaastmeline skaala intervallidega 0, 4, 7, 10:

```json
[
  {"block":"pitch","channel":"A","param":"SCALE","value":"CUSTOM"},
  {"block":"pitch","channel":"A","param":"CUSTOMNOTES","value":4},
  {"block":"pitch","channel":"A","param":"NOTE2","value":4},
  {"block":"pitch","channel":"A","param":"NOTE3","value":7},
  {"block":"pitch","channel":"A","param":"NOTE4","value":10}
]
```

Lisa see sound-speci controls-loendisse; enum-väljade jaoks säilita
`allow: ["enum-labels"]`. Note 5–8 jäävad selles näites muutmata.
Kogu lõplik aktiivne skaala peab olema rangelt kasvav ja jääma alla 12.
N noodi korral on i-nda nihke (Note i+1, i=1…N−1) piirid
**eelmine nihe + 1 … 12−N+i**. CUSTOMNOTES on 4…8.
Arvutatakse kogu plaani lõppolek: controls-loendi järjekord ei mõjuta tulemust.
Vigane aste, peidetud noodipesa või sobimatu kontekst peatab kirjutuse enne
faili muutmist. Generaator ei kopeeri püsivara hilisemate astmete automaatset
piiramist, sest see muudaks kasutaja deklareerimata väärtusi.

Tonic PID 107 on jagatud kuvakontekst. Selle kirjutamine jääb suletuks;
KEY on eraldi parameeter. Ära tuleta noodi salvestusväärtust toonika
eelvaatest ega kasuta sisendiks C/D#/jne silte. TXT kasutab ühikut
„pooltooni toonikast”.

## Globaalsed skaalad ja lugemisplaan

Custom Shifteri CUSTOMSCALE1/2 valib 32 globaalse skaala seast.
Nende sisu pole presetifailis. Lõpparuande `globalScaleDependencies`
loetleb kõigi salvestatud Custom Shifteri kanalite sõltuvused, sh kanalid,
mida praegused stseenid ei kasuta; `contentsIncluded` ja `contentsVerified`
jäävad false. Sisu ega kuuldavat tulemust ei oletata.

Püsivaras on 384 eraldi aadressi:

`PID = 902 + 12 × (skaalaNumber − 1) + noodiIndeks`

Skaalanumber on 1…32, noodiIndeks 0…11. Järjekord on A, A#/Bb, B, C,
C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab. Iga nihe on −24…24 pooltooni.
Ühe skaala jaoks kavandatakse 12 lugemist, kõigi jaoks 384.
Korduvad skaalad eemaldatakse; valijat GLOBAL_CUSTOM_SCALE ei pea selle
aadressistuse järgi muutma.

```sh
node engine/skills/instructions/scripts/fm3-pitch-custom-scales.mjs --scales 1,32
node engine/skills/instructions/scripts/fm3-pitch-custom-scales.mjs --all
```

Need käsud väljastavad JSON-plaani, ei ava MIDI-porti ega saada GET-käske.
Firmware/native aadressistuse tõend ei kinnita live GET transpordirada,
vastuse kodeeringut või seadme hetkesisu. Järgmine mõõteetapp saab kasutada
ühte piiratud automaatset lugemisseanssi: kontrollida vastuse identiteeti,
kodeeringut ja vahemikku ning alles siis siduda sisu presetisõltuvustega.
Globaalsete seadete kirjutamine pole selle etapi osa.

## Korratav tõend

`fm3-pitch-custom-scales.json` talletab kitsad koodilõigud, deskriptorid,
aadressid ja kontrollsummad. `tools/fm3/pitch_custom_scales.py` kontrollib
täpsed operatsioonid ja tuletatud reeglid. Runtime seob registri SHA-256-ga.
Täielikku püsivara ega redaktoribinaari paketti ei lisata.

| Tõend | Asukoht / tulemus |
|---|---|
| NOTE-dispetš | 0x81a2a5; PID−63 annab astme indeksi |
| Piirid | 0x819862; eelmine aste+1 ning 12−nootideArv+indeks |
| Täisarvukirjutaja | 0x823785; short-word lugemine/kirjutamine, eraldi runtime-sõna |
| CUSTOM allikas | 0x8192da; SCALE=17 valib kanalisisese massiivi |
| Tonic kuvakontekst | 0x81a3f7; jagatud aadress 0x809221f0 |
| Globaalne aadressistus | 0x80f989; PID 902…1285, jagatis/jääk 12-ga, skaala samm 24 baiti |
| Natiivsidemed | GLOBAL_CUSTOM_SCALE=96; GLOBAL_CUSTOM_SHIFT_BEGIN=902 |
| Varasemad kanalimallid | 16 × 7 = 112 sõna; vaikeväärtused 1…7, uut mõõtmist pole |

FM3 FW13 SYX SHA-256:
`239fd73a2a39eb02789632b9f2dc47a88c174f5dd7fd8946b4ce60097a11ee8d`.
Lahtipakitud LDR SHA-256:
`a12e2be85f0e7dbb29255e04d0ec86381d4a4ac6cd308d3c5650a187d6d905c3`.
FM3-Edit 1.07.17 SHA-256:
`c06f993530057214205a64330116a823e5b31507610d1792c1f3617725d6e927`.
VISA koodiaadresside vastendus: failibaas 0x3c4500 + 2 × (aadress−0x800000).

```sh
python3 tools/fm3/pitch_custom_scales.py --firmware /path/fm3_dsp_rel_13p00.syx --editor /path/FM3-Edit.exe
python3 tools/fm3/test-pitch-custom-scales.py
node plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-pitch-custom-scales.mjs
```

Kontroll hõlmab kõiki 1749 võimalikku rangelt kasvavat 4…8-astmelist
skaalat, vigaste lõppolekute atomaarset tõrjumist, A–D lõplikku SYX/TXT rada,
peidetud sõnade säilimist ja 384 globaalse aadressi plaani.
See on staatiline analüüs ja tarkvaratest, mitte püsivara käivitamine,
seadmeimport, heli- või CPU-test. Kasutaja füüsilisi toiminguid: 0.

Allikad:

- [Fractali ametlik FM3 FW13](https://www.fractalaudio.com/downloads/firmware-presets/fm3/13p0/fm3_dsp_rel_13p0.zip)
- [Fractal Blocks Guide](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf), Pitch: Custom Scale ning Custom Shifter.
- [Analog Devices SHARC+ Core Programming Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/sc58x-2158x-prm.pdf), VISA Type 3 ning short-word/normal-word valikud.
- [Selache, commit 2b26d3b](https://github.com/js216/selache/tree/2b26d3b75c53063575bc5c820fa0d38879335187): uurimise ristkontroll; dekooderit ei kopeerita runtime'i. Osalise disassembleri väljundit kontrolliti protsessori juhendi ja täpsete opcode'ide vastu.

## Jätkatav toorvastuste koguja

`global-scale-collector/FM3_GLOBAL_SCALES.py` kogub ainult vajalike skaalade
parameetriinfo toorvastused. Python 3.9+ standardteek; macOS/Linux USB-serial.
Node, mido ja pyserial pole vajalikud. Kõik seadmesse saadetavad sõnumid on
23-baidised `fn=01 / sub=1A / effect=1 / PID=902…1285` päringud, väärtuse,
modifier'i ja tail'i väljad nullis. Port tuleb valida teadlikult; üldine
`usbmodem` nimi üksi ei tõenda, et tegemist on FM3-ga.

Sulge FM3-Edit ja muud sama porti kasutavad rakendused. Ühenda FM3 USB kaudu.
Skaalasid, parameetreid, kanaleid ega presetti ei pea muutma; eksporti pole vaja.
Käivita kataloogis `engine/skills/instructions/scripts/global-scale-collector`:

```sh
python3 FM3_GLOBAL_SCALES.py --list-ports
python3 FM3_GLOBAL_SCALES.py --dry-run --scales 1,32
python3 FM3_GLOBAL_SCALES.py --capture --scales 1,32 --port /dev/cu.usbmodemFM3 --out fm3-scales
```

Asenda näidisport oma FM3 pordiga. Asenda näidisskaalad preseti
`globalScaleDependencies.readPlan.scales` loendiga. Soovi korral kasuta
`--plan read-plan.json`: see peab olema `fm3-pitch-custom-scales.mjs` otsene
JSON-väljund. Kontrollitakse tõendiräsi ning kõiki aadresse; failist ei võeta
saadetavaid käske. `--all` kogub kõik 384 aadressi ainult teadliku valiku korral.
Vaikimisi puudub automaatne kõigi skaalade lugemine.

Esimene vastus läbib samad ranged kontrollid nagu iga järgmine: FM3 mudel,
alamkäsk, effect/PID, üks vastus, 60-baidine kuju, 32-baidise tail'i pikkus,
7-bitised andmed, kanooniline padding ja XOR-kontrollsumma. Sobimatu kuju,
aegumine, topeltvastus või poolik saatmine peatab seansi kohe. Puudub
automaatne korduskatse või üleminek mõnele teisele käsule. Tundmatu kuju võib
olla teise püsivara normaalne vastus; toorandmed tuleb enne parseri laiendamist
üle vaadata. Kolmekümne kahe baidi sisu jääb selles etapis tõlgendamata.

Katkestuse järel korda sama capture-käsku lisaga `--resume`. Koguja kontrollib
manifesti, oma lähtekoodi räsi ja varasemaid toorfaile ning loeb kõik varem
õnnestunud aadressid uuesti. Alles nende baittäpse vastavuse järel jätkub
puuduvate aadresside kogumine. Muutunud vastus peatab seansi; alusta siis uues
`--out` kaustas. See lisab automaatseid lugemisi, kuid hoiab ära erinevate
hetkede andmete vaikse kokkuliitmise. Järjestikune lugemine ei ole atomaarne
seadme hetktõmmis; seansi ajal ära muuda seadistusi.

```sh
python3 FM3_GLOBAL_SCALES.py --audit fm3-scales
```

Tagasta automaatselt loodud `fm3-scales/results.zip`. Arhiiv tekib ka
katkestatud seansi korral ning sisaldab kõiki selleks hetkeks salvestatud katseid. `session.json` talletab plaani, pordi,
platvormi ja skriptiräsi; iga `attempt-*.json` sisaldab täpset TX-i, toor-RX-i,
RX-räsi, saabumisaegu ja võimalikku viga. Salvestatakse ka enne päringut
saabunud liiklus. `summary.json` eristab kogumise lõppu sisulisest kinnitusest.
Koguja ei laadi andmeid võrku. Pordi metaandmed ja FM3 toorvastused jäävad
kohalikku tulemuskausta; neid ei avaldata automaatselt GitHubis.

**`captureComplete` ei kinnita skaalade väärtusi.** `contentsVerified` ja
`liveGetEncodingVerified` jäävad kogujas alati false. Koguja ise ei tee
ujukoma- ega signed-int tõlgendust: ka usutav null võib olla kirjeldusvälja vaikimisi väärtus.
Samuti ei tuvastata selle päringuga seadme seerianumbrit ega püsivara versiooni.
Olemasolevate vastuste teksti ja arvuvälja ristkontrolliks kasuta allpool
kirjeldatud eraldi offline-dekoodrit. Üldine live-vahemiku kinnitus jääb eraldi.

### Transpordi tõendid ja piirid

- [ForgeFX gen3.ts, commit c22862a5](https://github.com/sKuhLight/ForgeFX/blob/c22862a5b2f2078f3cb92a2735e51f94c39a0062/server/src/drivers/gen3.ts):
  `readRange` kasutab `fn=01/sub=1A`, aadressivälju ja nullandmeid.
  `readParams` hoiatab, et vana `buildGetParameter` saadab SET-typed `09 00`
  ja kirjutab nulli. Sealt ei kanta üle FC skaalade ega väärtuste tõlgendust.
- Repos `gen3-sub01-block-definition-response.md` tõendab, et `sub=01`
  vastus võib olla ploki kirjeldus ning selle value32 välja ei tohi pidada
  parameetri väärtuseks. Seetõttu koguja ei kasuta `readParams`-i `01 00` rada.
- `gen3-editor-sync-read-surface.md` dokumenteerib `sub=1A` 60-baidise vastuse
  ja aadressi kajastamise FM9 salvestustes. See on FM3 vastuse **esialgne
  vastuvõetav profiil**, mitte uue FM3 riistvaratesti tulemus.
- FM3-Edit 1.07.17 (ülaltoodud SHA-256), emitter `0x1401e6ab0…0x1401e6b53`:
  mudelibaitide 0x10/0x11/0x12 korral action=0x1A; effect ja PID liiguvad
  sõnumi +4/+8 väljadele; tailCount=0; serializer `0x14033c9a0`.
  Teine päringurada `0x1402123f0` kasutab sama action'it. Need leiti PE
  exception-function piiride, emitteri call-viidete ja x86-64 dekodeerimisega.
  Toores disassembly ja redaktoribinaar ei kuulu pluginasse.
- Native PID=902…1285 aadressistuse tõend on eelnevas jaotises. Üldise
  lugemisemitteri olemasolu ei tõenda nende PID-de live vastuste tähendust.

Tarkvaratestid kasutavad sünteetilisi vastuseid ja päris POSIX pseudo-terminali.
Need katavad pordi saatmisraja, tükeldatud liikluse, vale mudeli/aadressi,
kontrollsumma, dubletid, ajalõpu, osalise saatmise, katkestuse/jätkamise ja
muutunud andmete tõrjumise. Need pole FM3 seadmemõõtmised.

## Kogutud skaalade dekodeerimine ja preseti aruanne

`FM3_DECODE_SCALES.py` töötleb olemasolevat koguja ZIP-i ilma seadet avamata.
Vaja on Python 3.9+. Koguja fail säilib muutmata ja dekooder nõuab selle
fikseeritud SHA-256 versiooni; vana seansi jätkamine töötab endiselt.

```sh
python3 "$FM3_ENGINE/scripts/global-scale-collector/FM3_DECODE_SCALES.py" \
  --zip /ABS/results.zip --out /ABS/observations.json
node "$FM3_ENGINE/scripts/fm3-preset.mjs" \
  "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx" \
  /ABS/preset.spec.json /ABS/PRESET --global-scales /ABS/observations.json
node "$FM3_ENGINE/scripts/fm3-preset.mjs" --verify /ABS/PRESET
```

`FM3_ENGINE` on selle paketi `engine/skills/instructions` absoluutne tee.
Väljundite teed peavad olema uued ja väljaspool pluginat. Kui preseti soovitud
skaalade seanss on juba piisav, ära korda seadet lugemist. Dekodeerida saab
ka ainult osa skaalasid sisaldava täielikult lõppenud seansi. Preseti lisandina
nõutakse kõiki selle salvestatud Custom Shifteri A–D kanalite kasutatavaid
skaalasid, kaasa arvatud stseenides parajasti mitteaktiivsed kanalid.

Dekooder kontrollib arhiivi liikmeid, CRC-sid, suurusepiire, JSON-väljade
kordumatust, algset koguja auditit, lõpetatust ja unikaalseid aadresse.
Jätkamise identsed korduslugemised on lubatud ainult `resume-recheck` kujul.
Poolik seanss, puuduva noodiga skaala ja vastuoluline vastus põhjustavad vea.

Vastuse 32-baidine tekstiväli peab sisaldama täisarvu ja ühikut `semi`.
Väärtus peab jääma −24…+24 vahele ning kattuma viiest 7-bitisest osast
rekonstrueeritud float32 arvuga. NaN/Infinity, teine ühik, tundmatud lipud,
vigane padding või arvuvälja/teksti erinevus lükatakse tagasi. See kontroll
kinnitab kooskõla konkreetses säilitatud vastuses, mitte riistvara üldist vahemikku.

| Aruande väli | Tähendus |
|---|---|
| `globalScaleObservations` | Kaadrid, neist taastatud näidud, lähtearhiivi räsi ja kogumise aeg |
| `globalScaleDependencies.uses` | Tegelikust lõpp-SYX-ist loetud kanalite skaalavalikud |
| `observedScales` | Nende valikute jaoks olemasolevad vaatlusandmed |
| `observationsIncluded:true` | Vaatlused on TXT/JSON-aruandes |
| `contentsIncluded:false` | Globaalne skaala ei kuulu presetifaili |
| `contentsVerified:false`, `liveGetEncodingVerified:false` | Üldist seadme- ega väärtusvahemiku kinnitust ei anta |

`--verify` valideerib säilitatud vaatluskaadrid uuesti, võrdleb kogu sõltuvusosa
tegeliku SYX-iga ning kontrollib TXT-i vaatluslõiku. Algset ZIP-i ega selle
failiteed pole selle kontrolli jaoks vaja; vaja on Python 3.9+ ja nelja
väljundfaili. ZIP-i räsi on päritoluviide, mitte digitaalallkiri või seadme
identiteedi tõend. Pordi nime ega muud pordimetaandmestikku aruandesse ei kopeerita.
Ilma valikulise `--global-scales` argumendita säilib senine töövoog.

### Staatilise kodeeringukontrolli alus

FM3-Edit 1.07.17 parseri `0x14033c824…0x14033c85d` arvutusfragment paneb
vastuse baidid 12–16 kokku 32-bitise sõnana, vähim 7-bitine osa ees.
57-baidise fragmendi SHA-256 on
`b6f6b8606e17071c13de90d8cfc28af557f79abb5962092da101b3d3c8ca5d5b`.
FW13 globaalne getter teisendab väärtuse ujukomaks aadressil `0x80f9c9`;
vorminduse ühiku viit `0x80861c08` osutab tekstile `semi` lahtipakitud faili
nihkel `0x3576c8`. Binaaride räsid ja aadressistuse alus on eespool.
See ei tõenda üksinda tervet saatmisteed seadmes. Pakitud väärtuse näited:
−24 = `00 00 00 0e 0c`, −1 = `00 00 00 7c 0b`,
+1 = `00 00 00 7c 03`, +24 = `00 00 00 0e 04`.
Uued testsisendid on sünteetilised; kasutaja toorandmeid ei pakita lähtekoodi.

## Arvuvälja saatmistee

[Püsivara ARM-pakkija kontroll](FM3_GLOBAL_SCALE_WIRE.md) kinnitab arvusõna
viieks 7-bitiseks baidiks pakkimist. Skaalast arvupuhvri täitmiseni jääv
lünk ja kahe väärtusega eristav seadmekatse on samas dokumendis.
Staatiline test ei suurenda vaatlusandmete riistvaralist kinnitust.
