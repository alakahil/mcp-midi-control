# Auditi punkt 3: parameetrikaart

0.3.24, 25.10.2026. Võrdlusalus on auditi etapp 3 „Parameetrikaart”,
mitte 24.10 aruande kolmas peatükk Scene MIDI kohta. Eesmärk on kasutada
olemasolevat kaarti ja tõendeid õigesti; uusi seadmemõõtmisi ei tehta.

## Küsi tegelikku skaalat

Käsud on ainult lugemiseks ja väljastavad JSON-i standardväljundisse:

```sh
node engine/skills/instructions/scripts/fm3-preset.mjs --parameter-map
node engine/skills/instructions/scripts/fm3-preset.mjs --parameter-map chorus VOICES
node engine/skills/instructions/scripts/fm3-preset.mjs --parameter-map cab 93
node engine/skills/instructions/scripts/fm3-preset.mjs --parameter-map pitch TEMPO
node engine/skills/instructions/scripts/fm3-preset.mjs --parameter-map --all
```

Pere võib olla generaatori plokinimi (`amp`, `chorus`, `volpan`) või täpne
pere nimi (`DISTORT`, `CHORUS`, `VOLUME`). Parameeter võib olla PID, täielik
nimi või generaatori tunnustatud lühinimi. Nimepäring kasutab sama lahendajat
kui kirjutaja: `FLANGER_MANUAL` on PID 5, `OLD_FLANGER_MANUAL` on PID 6.
`catalogNames` säilitab algsed katalooginimed; need ei ole automaatselt
aktiivse redaktori samatähenduslikud nimed. Tundmatu/mitmetähenduslik päring
ebaõnnestub, aadressi ei oletata.

| Kaardi väli | Tähendus |
|---|---|
| `dictionary` | Ajaloolise sõnastiku algne kõveraklass ja tõendistaatus |
| `effective.scale` | Praeguse kodeerija sisendvahemik, täisarvu kordaja, loendisildid ja tegelikud salvestuskoodid |
| `authoring` | Vaikimisi/opt-in/blokeeritud skalaarpoliitika, alusfailid, täismalli nõue, kanalid ja teadaolevad temposõltuvused |
| `evidence.observations` | Konkreetne varasem mõõtepunkt, eksport, kuvalugemine või loendisildi kontroll koos ulatusega |
| `evidence.sources` | Vastavate lähtefailide rajad ja SHA-256 räsid; vaatlus sisaldab JSON Pointerit |
| `catalogRangeDifferences` | Säilitatud erinev allikaväide, mitte automaatne uus skaala |

Kaart sisaldab 3223 unikaalset pere/PID võtit: 2892 sõnastikukirjet ning
331 ainult kataloogis olevat võtit. Viimased ei saa dekoodrit ega kirjutusluba.
Pere olemasolu kaardis ei tõenda selle kasutatavust FM3 presetis. Globaalolek,
modifikaatorid, kasutajaliidese tegevused ja nimeta väljad jäävad eraldi.

`tableScalarEligible` tähendab ainult olemasoleva alusfaili skalaarvärava
läbimist. Lõpptüüp, Inputi režiim, mudelimall, ploki olemasolu, Tempo NONE,
modifikaator, kohalik Pitchi skaala ja tegelik kanalite arv otsustatakse alles
tervikpreseti koostamisel. `--parameter-map delay2` küsib pere metadatat,
mitte teise eksemplari olemasolu või selle kirjutamise kinnitust.

## Parandatud dekodeerimine

0.3.23 ülddekooder võis negatiivsest või stringina antud salvestussõnast
arvu arvutada, normaliseeritud sõna 65535 üle maksimumi ekstrapoleerida,
Chorus Voices'i sõna 65535 kuvada kui 131070 ning tundmatut Ten-Tapi kõverat
lineaarseks pidada. 0.3.24 tagastab sellistel juhtudel `undefined`: väärtust
ei ole tõendatud. Vigast sisendit ei clamp'ita ega kirjutata ümber.
Loendisildi kirjutamisel aktsepteeritakse ainult arvu või stringi; objektist
või boole'ist ei tehta vaikimisi silti.

Kehtivate skaalade, PID-ide, loendisõnade ja presetikirjutuse leping säilib.
Täisarvude puhul kontrollitakse märgiga salvestust ja loogilist vahemikku.
Normalizeeritud kõveratel on lubatud sõnad 0..65534. Täisarvu -1 sõna 65535
on lubatud ainult seda vahemikku toetavas märgiga täisarvukodeeringus.
`unverified-taper` ja `n/a` ei saa oletuslikku kuvatõlgendust.

| Näide | Praeguse generaatori sisend |
|---|---|
| Chorus Voices | 2, 4, 6, 8; salvestatud täisarv × 2 |
| Plex Number of Delays | 4, 6, 8; salvestatud täisarv × 2 |
| DynaCab R1/R2 | 0..10 kuvaühikut; vana 0..100 on normaliseeritud protsendiskaala |
| Pitch Custom Scale | Selgesõnaline `SCALE 1`…`SCALE 32`; vana arvusisend jääb 0..31 salvestusindeksiks |
| Pitch Repeats | 1..30 või `INFINITE` (salvestuskood 31) |
| Input Threshold | -100 dB vastab OFF-ile ja sõnale 0 |

Viis korduvate loendisiltide rühma jäävad nähtavaks. String valib esimese
vaste; teist sama nimega valikut saab eristada arvulise salvestussõnaga.
Loendi väärtusi ei liideta ega nummerdata ümber.

## Seadmevaba tõend

| Kontroll | Ulatus |
|---|---|
| Täielik skalaarne sõnadomeen | 2101 olemasolevat skalaarkirjeldust; 67 515 216 lubatud sõna, sh 67 501 050 normaliseeritud sõna, 5194 täisarvusõna ja 8972 loendisõna |
| Dekoodri veajuhud | Kõigi 2892 kirje vigased tüübid, negatiivsed/murdarvulised sõnad, uint16 ülevool; kõigi toetatud täisarvude ülejäänud uint16 sõnad; tundmatud kõverad |
| Parameetrikaart | Kõik 3223 võtit; nimelahendus, kordajad, 1-põhised enumid, korduvad sildid, kanalipiirid, täismallid, temposõltuvused ja andmete muutumatus |
| Varasemad vaatlused | 1298 indekseeritud vaatlust; 363 loendiparameetri 5275 võrreldud silti, kaks küsimata lõppsõna ja üks vaidlustatud kuvalugemine eraldi |
| Regressioonid | Varasemad 66 kohustuslikku testi ja kaks uut testi; SYX/TXT/spec/raporti taasesitus ning ajaloolised baitvõrdlused |

2101 sisaldab ka globaal- ja metadata-kirjeid, millel pole avalikku
presetikirjutajat. Kõigi sõnade läbimine kontrollib tarkvaralist teisendust,
mitte nende väärtuste FM3 ekraani, heli või DSP käitumist. Kaardi
`fullRangeHardwareProven:false` ei muutu suurtest testiarvudest hoolimata.

Tõendiindeks luuakse lähterepo kontrollitud registrist ja allikavahemike
võrdlusest; käivitamisel kontrollitakse indeksi, sõnastiku ja kodeerija sidumist.
Lähterepos: `python3 tools/fm3/point3-index.py` kontrollib tuletise värskust,
`node tools/fm3/point3-evidence.mjs` kordab kaks uut testi. Tulemused on failis
`docs/fm3/parameter-evidence/point3-parameter-map.json`.

Taaskasutatakse varasemat REA/native/cache/XML-i analüüsi, mõõtepaare ja
loendikontrolli. REA-d ega Ghidrat uuesti ei käivitata. 36 kataloogi ja
kuvavahemiku erinevust säilivad eraldi allikaväidetena; 30 tundmatu või
toetamata skaalaga kirjet ei saa uut kirjutustuge. Kahe 1-põhise Pitch-loendi
viimast sõna pole seadmes küsitud. Uut ohtlikku loendipiiri päringut ei tehta.
Import, STORE, live SET, heli, tegelik CPU ja kogu FM3 funktsioonide katvus
vajavad endiselt nende endi tõendeid.
