# Input gate / Volume-Pan — 23.10.2026 arenduskandidaat

Avaldatud privaatne plugin on endiselt **0.3.14** (`plugins_6accfd716e148191b0adb61e4e36f0e4`, release `pluginrel_6adaf28e90708191bf43faf7c8bb2115`). Avaldatud mootori lähtecommit on `43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b`; selle töö lähte-main on `af771e434cbda559e3649ab7dcc41926091d92eb`. Viimane sisaldab taastamise varukoopiat ega tähenda uut mootoriväljalaset. Siinne Input-tugi on **avaldamata kandidaat**. Volume kirjutustugi jääb suletuks.

## Tõendid ja uurimistulemus

- Taastati tööaruande versioon 37 ning 23.10 auditi edenemise PDF. Kontrolliti tegelikku main-haru, privaatse release'i arhiivi, käivitaja sidumist ja päriselt laaditud 0.3.14 mootorit. Avaldatud lähtefailide manifest (3129 sisufaili, koos manifestiga 3130 faili) ja self-check läbisid.
- Varasem register sisaldas INPUT 10 ja VOLUME 15 parameetri metadata ning olemasolevaid lineaarse/logaritmilise kõvera klasse. Kummalgi puudus avaldatud generaatoris vastav slug/kirjutustee. Nende parameetrite uute otseste seadmemõõtmiste arv on **0**.
- Uus korpuse inventuur: 789 SYX-failiteed, 632 unikaalset faili; toetatud scanner luges 622, kümme upstream-vanavormingut jäid selgelt eraldi. Kõigis toetatud Input-kirjetes on üks identne 126-baidine kirje (46 päis + 4 × 10 × 2). Toetatud koostaja alustest Volume puudub. Upstream `preset-55.syx` sisaldab 15-sõnalist ja `preset-96.syx` 14-sõnalist Volume-kirjet; need pole tõendatud praeguse FW13 doonorid.
- Uus **staatiline metadataanalüüs** sidus FW13 cache'i sektsioonid 41 (INPUT) ja 40 (VOLUME), sõnastiku, FM3-Edit 1.07.17 PE x86-64 native-deskriptorid ning manustatud XML-i juhtide nähtavusega. Koodi ei käivitatud ega kasutatud arm64 aadresse x86-64 binaaril. Allolev JSON sisaldab deskriptorite aadresse/nihkeid, cache'i nihkeid, float32 piire, loendeid ja XML-i tingimusi.
- Paigaldaja SHA-256 `f51794035954426e30753677b5b796a7fc3bebb3302366521228d94aeaab9f8f` on eraldi sisemise `FM3-Edit.exe` räsist `c06f993530057214205a64330116a823e5b31507610d1792c1f3617725d6e927`. XML SHA-256 on `0fc5f3dac1e33aa2fee6d8e1efeda6fc0f6a8782f63519d54aa973cbe67595a2`. Täisbinaari ega täis-XML-i ei lisata reposse.
- Uut REA dekompileerimisanalüüsi **ei tehtud**. Kasutati varasema REA aruande piire ning uut cache/deskriptori/XML-i analüüsi. Siin puudub otse kutsutav REA MCP. Leitud REA 6.4.0 CLI-ga tehtud `doctor --provider ghidra --format json` leidis Node 24.19.0, kuid praeguses konteineris pole `GHIDRA_INSTALL_DIR` määratud. IDA/Hopperi kõrvalhoiatused pole selle raja otsus. Maci 22.10 koondtulemus jääb kehtima: Node 26.7.0, Temurin JDK 21.0.12.1, Ghidra 12.1.4, 9/9 valmisolekut ja 77/79 päringut. Maci teid ei saa sellest sessioonist uuesti kontrollida. Uut Maci tööd ega paigaldust praegu ei küsita. SHARC firmware'i valmisolekut pole sellega tõendatud.

## Parameetrikaart

Input on **Input 1** (`effectId=37`), mitte eraldi Gate-plokk. Praeguses kirjes on A–D kanalid, iga kanali kümme little-endian uint16 sõna. Parameetri asukoht on `record.header + 46 + channelIndex*20 + pid*2`. Header sisaldab kaheksa stseeni kanali- ja bypass-valikuid; kandidaat säilitab need.

| Input PID | Väli | Kuvavahemik / loend | Skaala ja sõltuvus | Kandidaat |
|---|---|---|---|---|
| 0 | THRESH | −100…0 dB | lineaarne; OFF-äärpunkt ebaselge | arv >−100, raw 0 keelatud |
| 1 | RATIO | 1…20 :1 | log; ainult ADVANCED | kirjutatav A–D |
| 2 | RELEASE | 10…1000 ms | log; cache sekundites ×1000; mõlemad režiimid | kirjutatav A–D |
| 3 | ATTACK | 0,1…100 ms | log; cache sekundites ×1000; ADVANCED | kirjutatav A–D |
| 4 | Z | 13 impedantsiloendit ühismetadatas | FM3 FW13 XML-is vastav juht puudub | säilitatav, keelatud |
| 5 | LEVEL | −40…+40 dB | lineaarne; kogu sisendi tase | kirjutatav A–D |
| 6 | BYPASS | ENGAGED / BYPASSED | kogu Input võib muutuda shunt'iks; pole gate-off | säilitatav |
| 7 | TYPE | CLASSIC / INTELLIGENT / NOISE REDUCER | säilib; tundmatu tüüp tõrjutakse | säilitatav |
| 8 | GAINMONITOR | meter | ajutine näit, mitte seadistus | säilitatav |
| 9 | MODE | EASY / ADVANCED | määrab nähtavuse; tundmatu tõrjutakse | säilitatav |

FW13 XML-i järgi peidab EASY **Ratio ja Attack**, Release on nähtav. Vanema üldise Blocks Guide'i Easy-kirjeldus pole selle FW13 nähtavusreegli alus. Kõik seitse olemasolevat alust kasutavad Type=INTELLIGENT ja Mode=ADVANCED; teiste tuntud tüüpide/režiimide testid on sünteetilised metadatareegli testid, mitte uued seadmeeksportide tõendid.

Volume/Pan 1 on `effectId=102`, eeldatav praegune kuju 46 päisebaiti + A–D × 15 sõna. Vanade mallide pikkuserinevuse tõttu pole uut doonorit ega kirjutusõigust oletatud.

| Volume PID | Väli | Kuvavahemik / loend | Skaala / tingimus |
|---|---|---|---|
| 0 | GAIN | 0…10 | lineaarne salvestusskaala; ainult VOLUME |
| 1 | BAL | −100…+100 | lineaarne Balance |
| 2 | TAPER | LINEAR, LOG 30A, LOG 20A, LOG 15A, LOG 10A, LOG 5A, S-TAPER | enum; DSP vastus pole raw-skaala |
| 3 | BYPASS | ENGAGED / BYPASSED | enum |
| 4–5 | PANL / PANR | ligikaudu −99,9…+99,9 | lineaarne; ainult VOLUME; ei võrdu Balance piiridega |
| 6 | LEVEL | −80…+20 dB | lineaarne |
| 7 | BYPASSMODE | THRU / MUTE | enum |
| 8 | INPUTSELECT | STEREO / LEFT ONLY / RIGHT ONLY | enum |
| 9 | TYPE | VOLUME / AUTO-SWELL | nähtavuse valija |
| 10 | THRESHOLD | −80…0 dB | lineaarne; ainult AUTO-SWELL |
| 11 | ATTACK | 10…1000 ms | log, sekundid ×1000; AUTO-SWELL |
| 12 | RELEASE | 1…100 ms | log, sekundid ×1000; AUTO-SWELL |
| 13 | HYSTERESIS | 0…12 dB | lineaarne; AUTO-SWELL |
| 14 | METER | kasutamata/loetav meter | mitte kirjutatav |

Kõvera klass kasutab `raw = round(65534*n)`, kus lineaarse puhul `n=(v-min)/(max-min)`, log puhul `n=ln(v/min)/ln(max/min)` ja `v=kuvaväärtus/displayMultiplier`. Tegelikud piirid on cache'i float32 arvud; tabeli ümardatud teksti ei kasutata arvutamiseks. Metadata `step` ei tõenda kõigi klaviatuuri-/hiireliigutuste kvantimist. Need skaalad on varasema kõveraklassi tõendi **mudelipõhine üldistus**, mitte Input/Volume täisvahemiku riistvaratõend.

Presetis salvestuvad kanalite seadistussõnad ning stseenivalikud. Globaalne Noisegate Offset ja AC Line Frequency ei ole selle preseti tagatud osa. Gate'i metrinäit, pedaali hetkeasend ja DSP hetkeseis pole taastatavad heliseadistused. Pole tehtud MIDI SET-i ega STORE'i. Input/Volume modifikaatori uued sihtseosed pole lubatud; olemasolev aktiivne modifikaator blokeerib samale sihtparameetrile staatilise kirjutamise.

## Muudatus, kontrollid ja kasutus

`controls: [{block:"in1", channel:"A", param:"THRESH", value:-65}]` töötab piiratud kandidaadis koos olemasoleva sound/composer skeemiga. Viis parameetrit on lubatud; tüüp, režiim, bypass, impedants ja meter pole API kirjutusväljad. Eraldi Gate, Volume sisestamine, uued modifikaatoriseosed ning üldine 4 × 12 marsruutimine jäävad väljapoole.

`test-input-gate.mjs` kontrollib seitset alust, 140 kirjutust A–D kanalitesse, eksplitsiitseid raw-mudelpunkte, sõltumatu dekoodri A-kanali raw lugemist, kõigi A–D sõnade lugemist ja kõigi kõrvaliste body-baitide säilimist. Lisaks 15 vigast sisendit, korduvsiht, tundmatu tüüp/režiim, 30 nähtavusjuhtu, modifikaatorikonflikt ning SYX/TXT/spec/validation kooskõla ja võltsimise tõrjumine ka ümberarvutatud räsiga spec'i puhul. Täis offline-sarja lisandus 50. kontroll.

`test-input-volume-comparison.mjs` testib üht sünteetilist 15-sõnalist lisakirjet ja seitset vigast tulemust. Sünteetilist kirjet ei anta seadmele ega kasutata doonorina. Võrdleja säilitab ka ebaõnnestumise aruande ning kontrollib Input-kirjet, kõiki endisi plokke, ainukest lubatud grid-muudatust, ülejäänud prefiksit, süsteemisaba ja kontrollsummasid. Editoripoolne normaliseerimine võib range võrdluse peatada: siis uurime täpset erinevust, katset ei korrata pimesi.

Taasesitus repo juurest:

```sh
python3 tools/fm3/input_volume_evidence.py
node tools/fm3/input-volume-audit.mjs
node tools/fm3/test-input-volume-comparison.mjs
python3 tools/fm3/test-offline.py --output /absolute/output/path
node tools/fm3/compare-input-volume.mjs source.syx exported.syx result.json
```

## Ühe ekspordiga järgmine tõend

Puuduv seadmest sõltuv asjaolu: kas FW13 säilitab kandidaadi Input 1 20 määratud A–D sõna ning milline on FM3-Editis praegu lisatud Volume/Pan 1 täielik A–D kirje. Vanad Volume-mallid ja identne Input-baaskirje seda ei tõenda. Vaja on ühte importi, Volume/Pan 1 lisamist olemasoleva shunt'i asemele real 3 veerus 2 ja ühte lõppeksporti. Uus Volume jäetakse vaikeväärtustele; gate'i väärtusi pole vaja käsitsi tippida. Preseti import on aktiivse puhvri katse; **STORE/reload'i ei kasutata ega tõendata**.

Kogumisspec on `input-volume-check.spec.json`. Kasutaja ZIP sisaldab täpset SYX-i, TXT-i, spec'i, validation-aruannet, ühte kõigi lähte- ja sihtväärtustega tabelit ning SHA256SUMS-i. Tagastatav fail: `FM3_INPUT_VOL_CHECK_export.syx`. Faili saab analüüsida ilma uut Maci tööriista või REA skripti käivitamata. Tõrke puhul säilitatakse eksport/veateade ning edasised muudatused peatuvad.

See kontroll ei tõenda automaatselt kuvanäidu ja raw vahelist füüsikalist skaalat, heli/CPU-d, globaalseid seadistusi ega STORE'i. Kui saadud tõendist ei piisa konkreetse välja jaoks, kavandatakse alles siis üks põhjendatud ühe-välja-muudatuste ja sõltumatute raw-tagasilugemistega koondkatse.

## Wah Min/Max jääb eraldi

`wahMinMaxExact` jääb täpselt FW13 Ext1 → Wah1 Control sihile: kahe kümnendkohaga 0.00–10.00, samm 0.01; kuus riistvaral mõõdetud väärtust välja kohta ja 995 nelja mudeli kooskõlal põhinevat väärtust. `fullRangeEncodingProven=false`. Ajaloolised hiirega valitud punktid jäävad eraldi klaviatuurilt sisestatutest; sama kuvanäit ei tõenda sama sisendit ega baite. Lõpetatud füüsilisi Min/Max-katseid ei korratud ning nende tulemust ei kasutata Volume/Input modifikaatori kodeerimise tõendina.

## Allikad

- [Masinloetav Input/Volume tõend](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-input-volume-evidence.json), [korpuse inventuur](input-volume-corpus.json), [varasema REA koondtulemus](modifier-rea-batch-result.md).
- [Fractal Audio Blocks Guide](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf), Input ja Volume/Pan peatükid; füüsikalise tähenduse taust, FW13 XML-i ei asenda.
- [FM3 allalaadimised](https://www.fractalaudio.com/fm3-downloads/) ja [FM3-Edit](https://www.fractalaudio.com/fm3-edit/); analüüsitava binaari identiteet on eespool räsiga fikseeritud.
