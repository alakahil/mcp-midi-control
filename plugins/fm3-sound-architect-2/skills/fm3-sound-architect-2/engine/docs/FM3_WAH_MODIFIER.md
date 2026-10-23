> **Uuem kohalik kandidaat 0.3.13:** kümne välja täpsed mõõtepunktid on
> kirjeldatud dokumendi lõpus. Need asendavad varasemate versioonide
> Max-i/kõvera/ajaväljade täieliku kirjutuskeelu ainult loetletud punktides.
> Avaldamist kinnitab eraldi väljalaskekviitung.

# External 1 → Wah: piiratud presetifaili kirjutus

## Sisukord
- Sisend
- Olemasolevate tõendite audit
- Kirjutuse piirid
- Auto Engage kahevalikuline kirjutus
- Damping’u režiimi kahevalikuline kirjutus
- Min-i kaks mõõdetud punkti

0.3.5 lisas olemasoleva tõendatud modifikaatoriseose sisse- ja
väljalülitamise. 0.3.10 lisab allpool kirjeldatud kahevalikulise
Auto Engage kirjutuse; 0.3.11 lisab Damping’u režiimi EXPONENTIAL/LINEAR; 0.3.12 lisab Min-i mõõdetud punktid 0.00 ja 2.50. Avaldamist ja hostilaadimist kinnitab eraldi väljalaskekviitung. See on offline-failitöötlus; seadmele päringuid ei saadeta.

## Sisend

`jb-composer` kirjeldus olemasoleva Wah-plokiga kinnitatud aluse jaoks:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "WAH EXTERNAL 1",
  "modifiers": {"external1Wah": true}
}
```

`false` valib NONE. Välja puudumine säilitab algse allika. Soundi ümbrises
asub `modifiers` selle sama `composer` objekti sees, mitte ümbrise juurtasemel.
NewLooki alus ei sisalda Wah-plokki: sisselülitamiseks lisa näiteks
`"wahChannels":[{"channel":"A","type":"FAS Wah"}]`.
Soundi `layout` peab siis loetlema Wah-ploki. Uus plokk jääb bypass'i, kuni
kasutaja palub vastava stseeni aktiveerida. Modifikaatori lüliti bypass'i ei muuda.

Ühine käsk `fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM` loob SYX, TXT,
spec JSON-i ja validation JSON-i; `--verify OUTPUT_STEM` kontrollib komplekti.
Tundmatuid alusfaile ei aktsepteerita. Uue väljundi uuesti aluseks andmine
ei laienda kinnitatud aluste loendit; mõlemad variandid koosta samast alusest.

## Olemasolevate tõendite audit

Auditi seitse alust ja nende SHA-256 on `fm3-composer-bases.mjs` failis.
Kuues aluses on esimese modifikaatorikirje allikas 14; NewLookis 0.
Kõik ülejäänud 24 sõna kattuvad nendes seitsmes aluses täpselt. Varasem seadmeekspordipaar
`JB_RHYTHM_LEVEL_MINUS3_export.syx` → `JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`
ning `FM3_NEWLOOK_SOURCE_AUDIT.json` kinnitavad eemaldatud Wah-seose
allikasõna 14→0. Presetid erinevad ka plokkide ja ruudustiku poolest;
neid ei nimetata ainult ühe parameetri mõõtmispaariks.

| Väli | Tõendatud väärtus |
|---|---|
| Kirje | indeks 0, päis 1538, 25-sõnaline sisu algab 1584 |
| Allikas, MOD_CTRLID | sõna 0; NONE=0, External 1=14 |
| Sihtplokk, MOD_EFFECTID | sõna 8; Wah 1=94 |
| Sihtparameeter, MOD_PARAM | sõna 9; WAH_CONTROL=5 |
| Kanal, MOD_CHANNEL | sõna 17; ALL=0 |
| Teisene allikas / operaator | sõnad 20/23; mõlemad 0 |

Natiivne 25-väljaline MOD-deskriptor ja FW13 cache'i allika/kanali enumid on
SHA-ga kinnitatud `fm3-parameter-dependencies.json` failis. Test ristkontrollib
nimed, enumid, seitsme aluse räsid ja kõik kirjesõnad. Muutmata kõvera või
summutuse arvulist tähendust ei ole selle töö jaoks vaja oletada.

## Kirjutuse piirid

- Allikapäring muudab ainult allikasõna 0↔14; selle paari puhul erineb üks sisubait, 1584.
  SYX-i tihendus, CRC ja kaadrite kontrollsummad arvutatakse uuesti.
- Siht, kanal, teisene allikas, operaator ja kõik kõverasõnad peavad vastama
  tõendatud kirjele. Erinev konfiguratsioon tõrjutakse, seda ei normaliseerita.
- Sisselülitamine nõuab olemasolevat korrektses vormingus nelja kanaliga Wah1.
  Puuduva Wah korral on lubatud ainult NONE säilitamine või seose väljalülitus.
- Teist sama sihtmärgiga kirjet või ebaselget konkureerivat sihti ei muudeta;
  selline päring tõrjutakse. Kõigi 32 serialiseeritud kirje päist kontrollitakse.
- Muid kirjeid ei looda ega kopeerita. Kõik vead tuvastatakse enne selle
  kirjutaja keha muutmist ja lubatud-baitide callback'i.
- Lülitus rakendub koostajas enne soundi tabelijuhte. `true` korral on
  Wah Control'i käsikirjutus kõigil A–D kanalitel keelatud; `false` korral
  kehtivad tavalised parameetri- ja tüübipiirangud. Staatilist väärtust ei muudeta
  automaatselt. Malli valik, seose olek ja stseeni bypass on eraldi taotlused.

## TXT ja kontrollitase

TXT näitab lõppfaili allikat, sihti ja ALL ulatust, eristades seost stseeni
bypass'ist. External 1 globaalne pedaali/MIDI vastendus peab seadmes juba sobima;
generaator seda ei loe ega kirjuta. Pedaali hetkeasendit ei saa presetist järeldada.

`test-wah-modifier.mjs` kontrollib sisse/välja kordust, idempotentsust,
ülejäänud kogu keha säilimist, vigase kirje atomaarset tõrjumist, A–D lukku,
NewLooki lisamise integratsiooni ja nelja väljundfaili. Need on olemasolevate
tõendite korduskontrollid ning sünteetilised tarkvaratestid.
Uut FM3 importi, pedaali toimimise katset, heli ega CPU-d pole kinnitatud.
Globaalsete skaalade arvukodeering ja kirjutamine jäävad eraldi uurimisteemaks.


## Auto Engage kahevalikuline kirjutus

Minimaalne päring alusele `JB_RHYTHM_LEVEL_MINUS3_export.syx`:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB RHYTHM LEVEL -3",
  "modifiers": {"wahAutoEngage": "OFF"}
}
```

Teine lubatud silt on `MED SPD`. Arvulisi koode ega muid silte sisendina ei
aktsepteerita. Välja puudumine säilitab olemasoleva Auto Engage'i väärtuse.
`external1Wah` on eraldi valikuline väli: ainult Auto Engage'i päring säilitab
allika. Kui mõlemad on määratud, peab lõppallikas olema External 1.
`external1Wah:false` koos Auto Engage'i päringuga tõrjutakse enne kirjutamist.
NewLook nõuab Wah-ploki lisamist ja `external1Wah:true`; uus plokikooslus on
sünteetiliselt kontrollitud, mitte selle mõõtmispaari uus seadmekinnitus.

| Tõenditase | Kinnitatud ulatus |
|---|---|
| Baidiasukoht | Esimese kirje sõna 10, dekodeeritud keha nihe 1604, uint16 little-endian |
| Arvukodeering | Täpselt MED SPD=2 ja OFF=0; muid enumiväärtusi ei avata |
| Kuva | Algne MED SPD kasutaja kinnitusest; OFF, External 1, All ja Wahwah 1 Control ekraanipildilt; FW13.00 |
| Failivõrdlus | 14 222 sisubaidist muutus ainult 1604: 2→0; muud 14 221 baiti säilisid |
| Päised/kontrollsummad | Dump-päis ja preseti nimi säilisid; raw-päises muutus ainult CRC; kaadrid, CRC ja footer kehtivad |
| Tegelik käitumine | Pedaali liikumine, automaatne bypass, heli ja CPU pole selle katsega valideeritud |

Tõendipaar ja räsidega kuvatõendi kirjeldus on
`skills/instructions/references/wah-auto-engage-evidence.json` failis.
Eksporditud OFF-fail on `skills/instructions/examples/FM3_MOD_AUTOENGAGE_OFF_export.syx`.
Algne ekraanipilt säilib kasutaja manuses; seda ei pakita pluginasse.

0.3.12 kirjutaja lubab kirjes allika 0/14, Auto Engage’i 0/2, Damping’u režiimi 0/1 ja Min-i 0/16375;
ülejäänud 21 sõna peavad vastama säilitatud konfiguratsioonile. Sihtplokk,
konkureerivad kirjed, kõik kirjepäised ja lõppallikas kontrollitakse enne
ühegi baidi muutmist. Allikapäring säilitab ka juba OFF-is oleva kirje.
Auto Engage OFF **ei vabasta** Wah Control'i käsikirjutuslukku: allikas on
endiselt External 1. Stseenikanalid ja bypass säilivad.

`test-wah-auto-engage.mjs` võrdleb päris ekspordipaari, taastab OFF-i kogu keha,
kontrollib mõlemat silti kuuel Wah'ga kinnitatud alusel, idempotentsust,
tagasisuunalist sünteetilist taastet, kõrvalmuudatuste puudumist, vigase sisendi
atomaarset tõrjumist, A–D kirjutuskaitset, NewLooki kooslust ja nelja väljundfaili.
Kogu keha vastavus varasemale seadmeekspordile ei tähenda, et uus genereeritud
SYX oleks eraldi uuesti imporditud. Sama sisu korduseksporti pole vaja.

Pildilt saab lisaks kirja panna muutmata min/max 0.00/10.00, Attack 10.1 ms,
Release 0.0 ms, Damping Exponential, Start/Mid/End 0/50/100%, Slope 50%,
Scale 1.000, Offset 0% ja Off Value 5%. Need on üksikud kuvanäidud ning
**ei kinnita nende väljade vaheväärtuste kodeeringut ega uut kirjutustuge**.


## Damping’u režiimi kahevalikuline kirjutus

0.3.11 lähtekood lisab `"modifiers":{"wahDamping":"EXPONENTIAL"}` või
`"LINEAR"`. Ainult režiimi valik ei muuda Attack/Release aegu ega Auto Engage’i.
Nõutav on sama kinnitatud External 1 → Wah 1 Control ALL seos. Arvulised
sisendid, valed sildid, tundmatud väljad ja toorkoodid tõrjutakse enne muutmist.
NewLook vajab Wah-malli ning selgesõnalist `external1Wah:true`.

| Tõenditase | Kinnitatud ulatus |
| --- | --- |
| Baidiasukoht | Kirje 0, sõna 24, keha nihe 1632, uint16 little-endian |
| Arvukodeering | EXPONENTIAL=0, LINEAR=1 |
| Kuva | Eelmise OFF-katse pildil Exponential; järelkatse pildil Linear, External 1, All, Auto Engage Off ja FW13.00 |
| Failivõrdlus | 14 222 sisubaidist ainult 1632: 0→1; ülejäänud 14 221 baiti säilisid |
| Päised | CRC ja tihendatud pikkus 4923→4924 muutusid; muud päisebaidid, nimi ja dump-päis säilisid; nulltäide kehtib |
| Seadmekäitumine | Režiimi ajakäitumine, pedaali mõju, heli ja CPU ei ole kinnitatud |

Tõend: `references/wah-damping-evidence.json` ja kasutaja ekspordi muutmata
koopia `examples/FM3_MOD_DAMPING_LINEAR_export.syx`. Algset ekraanipilti
ei pakita pluginasse; tekstikirjeldus ja räsi on tõendikirjes.

Varasemast kinnitatud `JB_RHYTHM_LEVEL_MINUS3_export.syx` alusest saab täpse
vaadeldud keha taastada päringuga:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB RHYTHM LEVEL -3",
  "modifiers": {"wahAutoEngage": "OFF", "wahDamping": "LINEAR"}
}
```

Uut LINEAR-eksporti ei lisata üldiseks koostajaaluseks. Kogu keha kattuvus
ei tähenda uue kodeeritud SYX-faili eraldi seadmeimporti. Sama sisu
korduseksporti pole vaja. MED SPD + LINEAR on toetatud väljade uus kombinatsioon;
see ei saa OFF + LINEAR mõõtmispaari kogu-keha seadmekinnitust.

`test-wah-damping.mjs` kontrollib päris paari, kogu keha taastamist, mõlemat
silti kuuel alusel, säilivaid sõnu, allika/Auto Engage’i koostoimet, idempotentsust,
vigaste sisendite muutuseta tõrjumist, lõppfaili tagasilugemist ja A–D käsijuhtimise
lukku. TXT näitab lõppfaili Damping’u silti, koodi ja muutmise/säilitamise olekut.
Kirjutamata väljad ning tõendamata ajaline ja heliline käitumine on eraldi märgitud.


## Min-i kaks mõõdetud punkti

`modifiers.wahMin` lubab ainult arve `0` ja `2.5`. Välja puudumine säilitab Min-i.
Tõendatud siht on sama External 1 → Wah 1 Control ALL, Max-koodiga 65534.
NewLook vajab Wah-ploki lisamist ja `external1Wah:true`; `false` koos Min-i
kirjutusega on keelatud. Kirjutaja kontrollib kõiki tingimusi enne muutmist.

| Tõend | Tulemus |
| --- | --- |
| Asukoht | Kirje 0, MOD_MIN sõna 1, keha nihe 1586, uint16 little-endian |
| Mõõdetud paar | Min 0.00 = 0; Min 2.50 = **16375** (0x3ff7) |
| Erinevus | 1586: 0→247 ja 1587: 0→63; muud 14 220 sisubaiti muutmata |
| Päised | Ainult CRC ja tihendatud pikkus 4924→4928; dump-päis, nimi ning stseenikontekst säilisid |
| Kuvatõend | FW13.00, Wahwah 1 Control, External 1, All, Min 2.50, Max 10.00, OFF ja Linear |
| Piir | Täpne vaadeldud punkt; kogu skaala kodeeringut, Max-i või teist sihti ei üldistata |

Algne hüpotees 16383/16384 ei vastanud ekspordile. Kuvaväärtuse ümardamine
võib anda samale kuvale mitu toorkoodi; seda võimalikku seletust ei käsitleta
kodeeringu tõendina. Kirjutaja taastab täpselt kasutaja mõõdetud koodi 16375.
Muid Min-väärtusi, toorkoode, stringsisendeid ja tundmatuid säilitatud sõnu tõrjutakse.

Tõend on `references/wah-min-evidence.json`; ekspordi muutmata koopia on
`examples/FM3_MOD_MIN_2p50_export.syx`. Originaalnimi sisaldas kaht punkti enne
laiendit; faili sisu ei muudetud. Ekraanipilti paketti ei lisata.

Täpset kogu keha saab taastada kinnitatud `JB_RHYTHM_LEVEL_MINUS3_export.syx`
alusest nimega `JB RHYTHM LEVEL -3` ja päringuga:

```json
{"wahAutoEngage":"OFF", "wahDamping":"LINEAR", "wahMin":2.5}
```

Pane see objekt koostaja `modifiers` väljale. Uut eksporti ei lisata üldiseks
koostajaaluseks. Täpne kehavaste ei kinnita genereeritud faili uut seadmeimporti,
pedaali/DSP mõju, heli ega CPU-d. Sama sisu korduseksporti pole vaja.
Muud toetatud väljade kombinatsioonid on sünteetilised tarkvarakontrollid.

`test-wah-min.mjs` kontrollib päris paari, täpset kogu keha taastet, mõlemat
punkti kuuel alusel, tagasipööret, idempotentsust, säilimist, atomaarset tõrjumist,
NewLooki kooslust, A–D käsijuhtimise lukku ja nelja lõppfaili vastavust.


## Kümne välja mõõdetud punktid (0.3.13 kandidaat)

Põhineb FW13 koondkatsetel A/B ja eraldatud Max 7.50 → 5.00 muutusel.
`references/wah-measured-controls.json` säilitab nimed/PID-d, kõik mõõdetud
toorkoodid, lähtefailide ja piltide räsid, tegelikud näidud ning vastuolud.
Pilte ei pakita. Kõik kolm täisbody't taastatakse olemasolevast kinnitatud
koostajaalusest, uut üldist alusfaili lubamata.

| `wahControls` väli | Lubatud kuvanäidud / sisendid | Ühik |
| --- | --- | --- |
| `max` | 5.00, 7.50, 10.00 | Wah Control 0–10 |
| `startPercent` | 0, 10, 20 | % |
| `midPercent` | 40, 50, 55 | % |
| `endPercent` | 80, 90, 100 | % |
| `slopePercent` | 35, 50, 60 | % |
| `attackMs` | 10.1, 99.9, 500; sisestus 100 annab 99.9 | ms |
| `releaseMs` | 0, 249.9, 999.9; sisestused 250 ja 1000 annavad 249.9 ja 999.9 | ms |
| `scale` | 0.750, 1.000, 1.500 | kordaja |
| `offsetPercent` | −10, 0, +15 | % |
| `offValuePercent` | 5, 20, 80 | % |

Puuduv väli säilib. Tundmatu, tühi või mittetäielikult korrektne päring
tõrjutakse enne sisubaidi muutmist. Min jääb `wahMin: 0 | 2.5` juurde.
Kõik lubatud Max-id on neist Min-idest suuremad; pööratud vahemikku ei lisata.
Retained olekus lubatakse ainult tõendatud koodid; muud sihid, allikad,
kanalipiirangud, sekundaarsed kontrollerid ja uued kirjed ei avane.

Näide viimase tervikliku mõõdetud seisundi taastamiseks:

```json
{"modifiers":{"wahAutoEngage":"OFF","wahDamping":"LINEAR","wahMin":2.5,"wahControls":{"max":5,"startPercent":20,"midPercent":55,"endPercent":80,"slopePercent":35,"attackMs":500,"releaseMs":1000,"scale":0.75,"offsetPercent":15,"offValuePercent":80}}}
```

See on koostajakirjelduse katkend. Kasuta tavapärast kinnitatud alusfaili ja
ühist `fm3-preset.mjs` käsku. Soundi ümbrises läheb katkend `composer` sisse.
NewLook nõuab lisaks Wah täiskanalimalli ja `external1Wah:true`.

Max 5.00 tegelik kood on **32784**, mitte ideaalse lineaarvalemi 32767.
A Attacki kood 655 kuulub pildi 99.9 ms näidule; tekstiline 9.99 ms jääb
vastuoluna alles ning ei ole selle koodi lubatud sisend. B Release 999.9 ms
on kood 6553. TXT ja raport näitavad lõppsisust kontrollitud tegelikku näitu.

Koondkatsete kaudu saadud punktide ja natiivsete väljanimeviidete alusel
avatakse täpne punktikirjutus. See ei kinnita täisvahemiku kodeeringut ega
väljade füüsilist sõltumatust. Suvaline lubatud punktide uus kombinatsioon
on uus, ainult arvutis kontrollitud kooslus. Kogu keha vaste mõnele kolmest
kasutajaekspordist märgitakse eraldi; genereeritud faili uut importi, heli,
pedaali, DSP-d või CPU-d see ei tõenda.

`test-wah-measured-controls.mjs` kontrollib kolme täpset kogu keha taastet,
198 eraldi tarkvaralist punktikirjutust, 136 vigase sisendi tõrjumist,
ümardatud sisendialiaste tegelikke väljundnäite ja nelja A–D lukku. Need
arvud ei ole täiendavate seadmekatsete arvud. 48. kohustuslik offline-test.


## Täpse Min/Max-sisendi arenduskandidaat (22.10.2026)

Liides lisandub **0.3.14** lähtekoodi. Avaldamise kinnituse annab eraldi
väljalaskekviitung; kontrollimport ja heli jäävad eraldi tõenditeks. Vana `wahMin:2.5` kirjutab endiselt ajaloolise hiirekoodi
16375; vana `wahControls.max:5` kirjutab endiselt 32784.

Uue täpse sisendi jaoks kasuta koostaja `modifiers` objekti:

```json
{
  "wahMinMaxExact": {
    "policy": "exact-wah-cent-fw13-hw1",
    "min": "2.50",
    "max": "6.47"
  }
}
```

Soundi kirjelduses asub sama objekt `composer.modifiers` all. Võib määrata
ainult Min-i või ainult Max-i; teine raw-sõna säilib. Väärtus peab olema
**string kahe kümnendkohaga**, vahemik `0.00`…`10.00`, samm `0.01`.
Sama välja määramine vana ja uue lepingu kaudu korraga põhjustab vea.
Eri välju võib teadlikult määrata eri lepingutega. Päring ei tõlgenda
vana kuvanäitu ümber ega püüa taastada hiire/klaviatuuri sisendit.

Nõutav on lõplik External 1 → Wah1 Control ALL seos (record 0, effect 94,
PID 5, Source 14, channel 0) ning olemasolev Wah1. NewLook vajab Wah-malli ja
`external1Wah:true`. Kinnitatud alusfailide, säilitatud konfiguratsiooni ja
konkureerivate sihtide kontrollid kehtivad edasi. Vaikimisi bypass ei muutu.
Aktiivse modifikaatori Control-välja käsikirjutus jääb blokeerituks A–D kanalitel.
Muid Min/Max-sihttüüpe ega üldist modifikaatorikirjutust ei lisata.

| Täpne sisestussiht | Min/Max sõna | Tõend |
|---|---:|---|
| 0.00 | 0 | täpne sisend mõõdetud |
| 2.50 | 16384 | täpne sisend mõõdetud |
| 5.00 | 32767 | täpne sisend mõõdetud |
| 6.47 | 42401 | täpne sisend mõõdetud |
| 7.50 | 49151 | täpne sisend mõõdetud |
| 10.00 | 65534 | täpne sisend mõõdetud |
| ülejäänud 995 sendisammu | piiratud tabelis | nelja mudeli kokkulangevus; mõõtmata |

Tabel `references/wah-minmax-exact.json` luuakse repo käsuga
`python3 tools/fm3/build-wah-exact-table.py --write`. Vaikimisi kontrollib sama
käsk tabelit. Enne koostamist taasesitatakse algne TX/RX ja SYX audit; iga
sisendi kohta kasutatakse eraldi täpset Python-kandidaati. Mootor loeb
räsiga kinnitatud tabelit, vajades ainult Node.js-i. See ei ava suvaliste
float32-bittide või kõigi mode-sõltuvate väärtuste kirjutamist.

`capabilities.modifiers.exactMinMax` näitab lepingut, sihti ja tõendi jaotust.
`validation.json.modifierEdit.exactMinMax` salvestab iga välja täpse
kümnendstringi, float32-bitid, raw-sõna, tõenditaseme ja mõõtesammud.
Täpse välja `display` on `null`: katse ei sisaldanud uut ekraanivaatlust.
TXT eristab sisestussihti mõõdetud kuvaväärtusest. `fullRangeEncodingProven`
ja `runtimeModeAtStoreProven` jäävad vääraks. Genereeritud faili import,
pedaal, heli, CPU ning STORE/reload on eraldi kinnitamata.

Ühine `fm3-preset.mjs` loob `.syx`, `.txt`, `.spec.json` ja `.validation.json`.
`--verify` võrdleb lisaks komplekti räsidele täpset päringut tabeli, raporti,
TXT tõenditeksti ning lõpliku SYX-i tegelike Min/Max-sõnadega. Kontroll hõlmab
ka tervet sihtseost, sekundaarset allikat, operatsiooni, konkureerivaid seoseid
ning sihtploki olemasolu ja stseenikonteksti.
Vale 6.47 raw 42400 tõrjutakse ka uuesti arvutatud kehtivate kontrollsummadega.
Uut füüsilist eksporti selle tarkvaralise ühendamise jaoks ei nõuta.
