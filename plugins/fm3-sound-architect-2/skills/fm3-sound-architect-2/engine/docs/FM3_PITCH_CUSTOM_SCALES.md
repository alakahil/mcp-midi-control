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
