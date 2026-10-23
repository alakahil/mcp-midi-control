---
name: fm3-sound-architect-2
description: Kujunda FM3 Sound Architect 2-ga Fractal FM3 Mk II Turbo kitarrisounde ning loo kaasasoleva kontrollitud generaatoriga SYX/TXT presetid, stseenid ja A–D kanalivalikud. Kasuta selle plugina selgesõnalisel valimisel.
---

# FM3 Sound Architect 2

Vasta eesti keeles ja anna kasutajale konkreetne järgmine samm. Kasuta kinnitatud
varasemat infot uuesti; küsi ainult soundi või faili korrektsust mõjutavat puuduvat
infot. Lähtu viiest eesmärgist: FM3 tundmine, soovitud sound, artisti/loo sound,
päris binaarne SYX ning sellele vastav allalaaditav UTF-8 TXT.

## Kehtiv seis

See versioon sisaldab varasema FM3 Sound Architecti generaatorit, mudelimallide
registreid, lähtepreseteid ja kontrolltõendeid. Kõik paiknevad selles skill-kaustas
alamkaustas `engine/`; väline repo ega seade pole failide genereerimiseks vajalik.
Vaja on Node.js-i ja failitöötlusega täitekeskkonda. Ära väida, et FM3 on ühendatud
või et MCP/REA teenus töötab: selle plugina generaator teeb offline failitöötlust.

Peamine lähtekoht on `engine/skills/instructions/`, allpool nimetatud MOOTOR.
Selle lähtekoodi versioon on `0.3.17`; ühine käivituspunkt on `fm3-preset.mjs`.
Aluskoostaja `jb-composer-0.13.0-dev` on sisemine etapp. Need identifikaatorid
ei kinnita uue preseti seadmeimporti, heli ega CPU-d.
Privaatse plugina identiteet on `plugins_6accfd716e148191b0adb61e4e36f0e4`.
Algse plugina identiteet ja vana serveriversioon jäävad eraldi; vana plugina
arhiiviviga ei tähenda, et selle uue plugina avaldamine on automaatselt blokeeritud.

Selle juhendi kehtiv seis asendab allpool viidatud ajalooliste dokumentide
vanad „järgmine kogumine” ja „OOTEL” märked. Kasuta tegeliku kirjutustoe
kontrollimiseks alati generaatori praegust capabilities-väljundit ja skeemi.

## Input gate ja Volume/Pan (0.3.15)

Selles versioonis on piiratud Input 1 ja Volume/Pan 1 kirjutustugi.
Tegelik avaldamine ja laaditud commit kinnitatakse väljalaskekviitungist. Input 1 viie arvparameetri
A–D kirjutustugi säilib: THRESH, RATIO, RELEASE, ATTACK, LEVEL. Ratio/Attack
vajavad ADVANCED-režiimi. Type, Mode, Input bypass, impedants ja meter säilivad;
Threshold OFF-äärpunkti ei kirjutata. See on Input 1, mitte eraldi Gate-plokk.
Kasutaja ühe tagastatud FW13 ekspordiga kinnitati kõigi 20 valitud Input-sihtsõna
ning kogu ülejäänud Input-kirje säilimine. See ei tõenda eraldi füüsikalisi skaalasid.

Volume/Pan 1 praegune FW13 15-sõnaline A–D kirje on nüüd olemas. Sound-spec'i
`volumePan:true` lisab selle NewLook-alusele; valitud `layout` või `grid` peab sisaldama `volpan`-i.
`controls` kasutab `block:"volpan"`: GAIN, BAL, PANL, PANR ja LEVEL; eraldi
`allow:["enum-labels"]` korral ka TAPER, BYPASSMODE ja INPUTSELECT. Stseenide
kanal/bypass: `blockScenes.volpan`. Praegu toetatakse ainult VOLUME-tüüpi;
TYPE, Auto-Swell, kanali BYPASS-sõna ja meter jäävad säilitatavaks. Pedaaliseose jaoks kasuta allpool kirjeldatud `volumePedal:true` valikut. Aktiivse modifikaatori konflikt tõrjutakse.

Volume'i jäädvustatud doonor on vaikimisi **kõigis kaheksas stseenis aktiivne,
kanal A**. Uue soundi loomisel kirjuta `blockScenes.volpan`-i alati kõigi kaheksa
stseeni eksplitsiitne kanal ja bypass. Aktiveeri Volume ainult kasutaja soovitud
stseenides; määramata stseenides kasuta kanalit A ja `bypass:true`. Arvesta, et
kanali A GAIN-i muutmine mõjutab kõiki aktiivseid sama kanalit kasutavaid stseene.
Ainult jäädvustatud ekspordi täpsel taasesitamisel võib doonori stseene säilitada.

Ühe ekspordi plokimall ja Input-sõnade säilimine on seadmetõend. Uued
Volume-väärtused, asukohad ja stseenikombinatsioonid on tarkvaraliselt kontrollitud
ning skaalad tuginevad FW13 native/cache/XML-i ja kõveraklassi üldistusele.
STORE/reload, heli/CPU ja täisvahemik pole sellega tõendatud. Globaalne Noisegate
Offset / AC Line Frequency ei kuulu preseti sisusse. Wah Min/Max-i tõendusulatus
ja `fullRangeEncodingProven=false` säilivad. Selle ekspordi kordamist pole vaja.

## External 1 → Volume/Pan 1 (0.3.17)

Sound-spec'i `volumePedal:true` koos `volumePan:true` lisab **External 1 →
Volume/Pan 1 Volume (VOLUME_GAIN, PID 0), ALL** seose. Kasuta mõõdetud
vaikeolekut; Min/Max-i, kõvera, Auto Engage'i ega ajaparameetrite valikuid sellel
liidesel pole. [Juhend](engine/docs/FM3_VOLUME_PEDAL.md).
Nõutav on NewLook-aluse muutmata passiivne modifikaatoripiirkond. Aktiivne Wah
või muudetud modifikaatorid lükatakse tagasi; neid ei lülitata vaikimisi välja.
`composer.modifiers:{external1Wah:false}` võib passiivse lähteoleku selgesõnaliselt
fikseerida. Praegu ei toetata samaaegset Wah- ja Volume-pedaaliseost, muid
allikaid/kanaliulatust/eksemplare ega vaba modifikaatorikirje valimist.

Kasutaja üks 23.10.2026 FW13 eksport kinnitas 25-sõnalise vaikeoleku ning kõigi
muude sisubaitide säilimise. Generaator taastab kogu mõõdetud keha täpselt.
`--verify` võrdleb lõpp-SYX-i, TXT-i, speci ja aruannet. Selle sama sisu
korduseksporti ei küsita. Uued paigutus/stseenikombinatsioonid on kontrollitud
arvutis; pedaali toimimine, heli ja STORE/reload jäävad eraldi kontrollideks.
`fullRangeEncodingProven=false` ning Wahi Min/Max-i tõendusulatus säilivad.

`GAIN` käsiväärtus on seose korral kõigil A–D kanalitel blokeeritud. `LEVEL`,
teised lubatud Volume-juhid ja stseenide bypass on eraldi seaded. Määra uue
soundi kaheksa stseeni kanal/bypass eespool kirjeldatud viisil. External 1 peab
seadme globaalsetes seadetes olema kasutaja pedaali/MIDI kontrolleriga seotud;
SYX seda ei seadista ning pedaali hetkeasendit ei tõenda.

## Kasutaja kinnitatud seadistus

- Seade: FM3 Mk II Turbo, firmware 13.0. Uue firmware korral kontrolli sobivust.
- Bonamassa „You Don't Own Me” senine test: Ibanez AS-120, humbucker-helipead,
  OUT1 stereo FOH-i. Teise pilli või ühenduse korral kohanda soundi teadlikult.
- Olemas on ka Fender Stratocaster. Ära eelda mõlema pilli võrdset sisendtaset.
- Kasutaja eelistab sammhaaval tööd ning valmis jätkatavaid kogujaid.
- Kohalik Mac: arm64, Python 3.9.6 ja Node olemas; versioone ja tegelikke faile
  kontrolli enne uusi Maci käske. Siinsel täitekeskkonnal pole automaatset Maci ligipääsu.

## Soundi kavandamine

1. Täpsusta ainult puuduv siht: artist/loo versioon või soovitud sound, kitarr,
   helipead, mono/stereo ning väljundseade. Kasuta vajaduse korral võrdlussalvestist.
2. Erista dokumenteeritud artistivarustus enda kuuldelisest lähendusest.
   Kontrolli firmware-spetsiifilisi FM3 fakte Fractal Audio ametlikest juhenditest.
   Ära kanna Axe-Fx III või FM9 võimalusi automaatselt FM3-le üle.
3. Kavanda Amp/Cab, vajalikud efektid ning stseenide helitugevussuhted. Lähtu
   kasutaja toimivast kahe rea Send/Returniga NewLook-alusest, kui muud ei nõuta.
4. Kontrolli iga soovitud binaarkirjutuse tuge capabilities-väljundist. Ära jäta
   toetamata nõuet vaikselt välja ega asenda mudelinime oletusliku ID-ga.
5. Erista faili korrektsus, seadme import/eksport ning heli/CPU ja artistisarnasuse
   hinnang. Kuuldelist või 100% identset artistisoundi ei saa failikontrolliga tõendada.

## SYX/TXT loomise töövoog

Lahenda MOOTOR selle SKILL.md asukohast: `engine/skills/instructions`.
Tee väljundid töökausta väljaspool skill'i/plugina lähtefaile.

1. Loe [koostaja juhendit](engine/docs/FM3_COMPOSER_UNIFIED.md) ning
   [NewLooki paigutust](engine/docs/FM3_COMPOSER_NEWLOOK.md). Nende vanad
   etapimärked alluvad selle juhendi kehtivale seisule.
2. Küsi kirjutustugi ja toetatud alusfailid:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" --capabilities "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx"
   ```

   `$FM3_ENGINE` peab olema enne määratud MOOTORi tegelikuks absoluutseks teeks.
3. Mallidel põhineva preseti jaoks koosta JSON skeemi
   [fm3-spec.schema.json](engine/skills/instructions/scripts/fm3-spec.schema.json)
   järgi: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-composer"`, nimi,
   vajalikud mallid/juhid ning `scenes`. Paigutuse või tabelijuhtide jaoks kasuta
   [soundi skeemi](engine/skills/instructions/scripts/fm3-sound.schema.json):
   eelmine kirjeldus läheb väljale `composer`; lisa `layout` (kaks jadarida) või `grid` (üldine
   4 × 12 ruudustik, vt allpool) ning vajadusel `insert`, `controls`, `blockScenes`, `selectedScene`, `purpose`, `context`. Alusta toimivast
   `examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json` näitest, kui siht seda eeldab.
   `context` väljad on `guitar`, `pickups`, `output`; ära mõtle kasutajainfot välja.
   Loe soovitud efektipere juhendit allpool.
4. Kasuta kontrollitud alusfaili. Eelistatud NewLook-alus on
   `MOOTOR/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`. Ära sööda tundmatut
   kasutaja presetit automaatselt sellesse piiratud kirjutajasse.
5. Käivita generaator:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx" "/ABS/PRESET.spec.json" "/ABS/PRESET"
   ```

   Asenda näidisteed tegelike uute väljundite absoluutsete teedega.
6. Käivita `node "$FM3_ENGINE/scripts/fm3-preset.mjs" --verify "/ABS/PRESET"`.
   Edukas käivitus väljastab `.syx`, `.txt`, `.spec.json`, `.validation.json`;
   olemasolevat samanimelist väljundit ei kirjutata üle. Puuduv raport või räside
   erinevus tähendab poolikut või muudetud komplekti. Kontrolli raportit ning nõutud mudelite, väärtuste,
   stseenide, kanalite ja bypass'i vastavust. Põhiraport ja TXT kirjeldavad soundi
   lõplikku SYX-i; `stages.composer` on vahetulemus, mitte lõplik seadistus.
   Generaator dekodeerib faili tagasi,
   kontrollib kaadreid, CRC/footer'it ja ainult lubatud sisumuudatusi; veast ei minda üle.
7. Anna päriselt loodud `.syx` ja `.txt` failid, vajadusel spec ja raport.
   TXT peab kirjeldama eesmärki, seadet/firmware'i, pilli ja ühendust, signaaliahelat,
   mudeleid/IR-sõltuvusi, ühikuid, stseene/kanaleid ning tegelikku kontrollitaset.
   Salvesta kasutajale antavad väljundid vastavalt keskkonna failide salvestamise juhistele.

Täiskanalimalli valik asendab valitud kanali kõigi kogutud sõnadega, sealhulgas
selle tasemed; siis rakendatakse selgesõnalised juhid. Määramata kanalid/seaded
säilivad alusest. Ploki lisamine, kanalivalik ja bypass on eri toimingud:
Koostaja tavapärased uued efektiplokid algavad bypass'is ning aktiveeritakse
`scenes` kaudu. Volume/Pan-i jäädvustatud aktiivne vaikeseis on erand: määra selle
kõik kaheksa stseeni eespool kirjeldatud `blockScenes.volpan` kaudu.
Ajaparameetri muutmisel kasuta nõutud selgesõnalist Tempo NONE väärtust.
Genereerimine ei salvesta midagi FM3 presetikohta ega paigalda User IR-i.

Choruse ja Drive’i tabelijuhid kontrollitakse lõpliku kanali tüübi järgi;
sobimatu väärtus põhjustab vea ka PID või experimental/raw kaudu.
[Tüübisobivuse juhend](engine/docs/FM3_TYPE_APPLICABILITY.md) kirjeldab
FW13 reegleid ja piire. Eelista mudelivahetuseks täiskanalimalle.
[Delay/Reverbi juhend](engine/docs/FM3_DELAY_REVERB_APPLICABILITY.md) eristab
mudelit ja sisemist algoritmi: nende valijate muutmine nõuab täiskanalimalli.
Üksik nime-, PID- või raw-kirjutus ei ole lubatud. Muud juhid kontrollitakse
kanali lõpliku mudeli/algoritmi paari järgi; vedrukaja Scattering nõuab lõplikku
Tank Type SERIES-PARALLEL olekut, sõltumata päringu järjekorrast.
[Flangeri, Phaseri ja Compressori juhend](engine/docs/FM3_MODULATION_DYNAMICS_APPLICABILITY.md)
katab veel 67 mudelit. Nende mudelivahetus ja Phaseri Mode nõuavad täiskanalimalli.
Flangeri praegune MANUAL on PID 5; DRYDELAY on PID 6. Vana täpne nimi
OLD_FLANGER_MANUAL jääb PID 6 ehk Dry Delay juurde. Kasuta uusi nimesid;
vanade nimede aadresse ära tõlgenda ümber. Compressori Type on PID 12;
Companderi Ratio/Time/Transients kasutab eraldi välju. Automaatne
kompressoriajastus ja -võimendus ei ole selle nähtavuskontrolliga valideeritud.
[Wah’ ja Tremolo/Panneri juhend](engine/docs/FM3_WAH_TREMOLO_APPLICABILITY.md)
lisab 16 mudeli erisused ja nõuab nende TYPE-vahetuseks täiskanalimalli.
Paragonil puuduvad Bias/Fat/Q Tracking; Panner, Harmonic Trem ja Neon Trem
kasutavad eri juhikuid. Wah’ Control jääb aktiivse pedaalimodifikaatori korral
käsikirjutuseks suletuks; Tremolo Rate nõuab lõplikku Tempo NONE olekut.
[Rotary ja Pitchi juhend](engine/docs/FM3_ROTARY_PITCH_APPLICABILITY.md)
eristab Rotary Rate PID 0 tüübi valijast: Rotaryl Type puudub. Pitchi 16
mudelit kontrollitakse lõpliku tüübi järgi; TYPE nõuab täiskanalimalli.
[Pitchi presetisõnade kodeering](engine/docs/FM3_PITCH_WORD_CODECS.md) lahendab
34 välja: 20 märgiga täisarvu, viis otse salvestatud täisarvu, seitse
kontekstist sõltuvat noodinihet ja kaks enumit algus-ID-ga 1.
Enumites eelista silte; arv tähendab salvestatud ID-d.
CUSTOMSCALE1/2 jaoks eelista silte SCALE 1…SCALE 32; arvuline sisend on endiselt
nullist algav indeks 0…31. NUMREPEATS kood 31 kuvab INFINITE; eelista seda silti.
Staatus preset-word-crosschecked ei tähenda uut riistvaramõõtmist ega live MIDI SET tuge.

Kohaliku kohandatud skaala jaoks loe
[Pitchi kohandatud skaalad](engine/docs/FM3_PITCH_CUSTOM_SCALES.md).
Vali täiskanalimalliga Dual Diatonic, Quad Diatonic, Arpeggiator või
Quad Diatonic Delay ning määra SCALE väärtuseks CUSTOM.
Määra CUSTOMNOTES vahemikus 4…8 ja NOTE2…NOTE8 aktiivsetele astmetele
täisarvulised pooltooninihked toonikast. Esimene aste on alati 0; ülejäänud
aktiivsed nihked peavad rangelt kasvama ja jääma alla 12. Esita terve soovitud
skaala ühes controls-loendis; generaator kontrollib lõppolekut järjekorrast
sõltumatult. Ära kirjuta peidetud astmeid ega TONIC kuvaseadet.
Globaalsete skaalade sisu ei ole presetis. Kasuta validation.json sõltuvusloendit
ja readPlan-i; eraldi lugemisplaani jaoks käivita
node engine/skills/instructions/scripts/fm3-pitch-custom-scales.mjs --scales 1,32
või --all. See väljastab ainult plaani, ei loo seadmeühendust ega loe sisu.
[Tempo- ja modifikaatorijuhend](engine/docs/FM3_PARAMETER_DEPENDENCIES.md) kirjeldab
21 tempo-seost ning olemasolevate modifikaatorite lugemist. Time/Rate kirjutus
nõuab lõpliku kanali Tempo NONE olekut; aktiivse modifikaatori sihtmärgile
käsiväärtust ei kirjutata. Ära lülita modifikaatorit vaikimisi välja. TXT eristab
salvestatud väärtust tempo või kontrolleri juhitud väärtusest. Muude perede
tüübisobivus ja katmata sõltuvused jäävad piiranguks; skalaari olemasolu ei anna
universaalset kirjutusluba.

## Toetatud põhivõimalused

Kasuta järgnevat ülevaatena; täpsed sisendipiirid tulevad koodist ja skeemist.

| Valdkond | Tugi ja juhend |
|---|---|
| Amp/Cab | 336 Amp- ja 45 Dyna-Cab täiskanalimalli A–D; [kanalijuhend](engine/docs/FM3_COMPOSER_AMP_CAB_CHANNELS.md). Üksikjuhid on piiratud mõõdetud kanalite/vahemikega; [Amp Level](engine/docs/FM3_COMPOSER_AMP_LEVELS.md). |
| Muud efektid | Drive, Delay, Reverb, Compressor, Chorus, Flanger, Phaser, Wah, Tremolo/Panner, Rotary ja Pitch: kogutud mallid ning capabilities'is loetletud juhid. Kõigi parameetrite vaba muutmist sellest ei järeldu. |
| Stseenid | Kõigi 8 stseeni nimed, toetatud plokkide kanalid/bypass; [stseenijuhend](engine/docs/FM3_COMPOSER_SCENES.md). Kanaliseade mõjutab kõiki seda kanalit kasutavaid stseene. |
| PEQ | Viis riba, A–D, mõõdetud tüübid/kalded ja arvulised skaalad; [PEQ](engine/docs/FM3_PEQ_COMPOSER.md). Blocking-tüübil pole Q/Gaini kirjutust. |
| GEQ | Kogutud ja koostajas; [GEQ](engine/docs/FM3_GEQ_COMPOSER.md). |
| Enhancer | Modern/Classic/Stereoizer A–D; [Enhancer](engine/docs/FM3_ENHANCER_COMPOSER.md). Nõua `channel`, `type`, `levelDb`; kirjuta ainult tüübi nähtavaid juhte. Bypass on stseeninupp; Bypass Mode'i menüüd ei küsita. |
| Filter | 18 täiskanalimalli A–D ning allpool loetletud 40 täpset mõõtepunkti; [Filter](engine/docs/FM3_FILTER_MEASURED_CONTROLS.md). |

## Lõpetatud kontrollid — ära korda kogumist

- PEQ, GEQ ja Enhanceri kokkulepitud integratsioonietapp on lõpetatud.
  PEQ testidel CPU 47–48%; GEQ suurim kasutaja nähtud CPU 50% ja toimimine kinnitatud.
- Enhancer: 87 GET/SYX-paari, 48/48 sõna igas paaris. Ühise A–D katse kõik
  13804 sisubaiti säilisid. Kasutaja kinnitas: „Suurim CPU 52.7%. Enhancer toimib”.
  [Seadmering](engine/docs/FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json).
  Ära küsi sama preseti importi, eksporti, CPU-d ega Classic Pan Lefti mõõtmisi uuesti.
- Filter: 32 GET/SYX-paari, 40 mõõdetud punkti, 4736 kattuvat sõna. Viimane
  lisa andis 15 paari ja 23 punkti; kaks varast tõrget lahendati korduskatsetega.
  Kõik 32 mõõteoleku sisud taastati generaatoriga täpselt. Q 0.707 on mõõdetud.
  [Audit](engine/docs/FM3_FILTER_REA_AUDIT_20261012.json),
  [generaatori test](engine/docs/FM3_FILTER_REA_GENERATOR_TESTS.json).
  Filter oli bypass'is: aktiivse Filteri heli ja CPU pole selle auditiga kinnitatud.

CPU-näidud kehtivad vastavate testpresetite kohta, mitte iga uue kombinatsiooni
kohta. Kui raport tuvastab varasema seadmeekspordiga täpselt sama kogu sisu,
ära nõua selle korduseksporti. Uue kombinatsiooni puhul märgi kontrollimata osa ausalt.

### Filteri täpsed kirjutuspunktid

| Kanal / Type | Väli | Mõõdetud sihid |
|---|---|---|
| A High-Pass | `frequencyHz` | 20, 80, 120, 250, 750, 20000 |
| B Low-Pass | `frequencyHz` | 20, 1600, 4000, 6000, 8000, 20000 |
| C Peaking | `frequencyHz` | 20, 500, 1000, 2000, 3200, 20000 |
| C Peaking | `q` | 0.1, 0.707, 1, 1.4, 2, 10 |
| C Peaking | `gainDb` | -20, -10, -3, 0, 3, 20 |
| C Peaking | `levelDb` | -80, -30, -6, 0, 3, 20 |
| A High-Pass ja B Low-Pass | `order` | "2nd", "4th" |

Arvesta registris salvestatud ekraaniümardusi: näiteks B 1600→1599.9 ja
C 3200→3199.9 Hz. Nii siht kui ka registreeritud ekraaninäit on toetatud sisendid.
Order PID7: 2nd=0, 4th=1. Ära interpoleeri Filteri suvalisi vaheväärtusi ega laienda
neid juhte mõõtmata tüüpidele/kanalitele. Kandidaatvalemite sobimine ei ava ise kirjutustuge.

## REA ja arenduse jätkamine

REA on uurimisvahend; presetisõna kodeering vajab eraldi tõendit. Macis on
varem seadistatud JDK21, Ghidra12.1.4 ning REA6.4.0 ja FM3-Edit1.07.17 arm64 fail.
Ära alusta nende paigaldamist ega edukat analüüsi uuesti ainult vana dokumendi
„puudub” märkuse tõttu. Kontrolli tegelikke kohalikke teid enne Maci kasutusjuhist.

Viimased kontrollitud uurimistulemused on kaasas:
- [FM3-Editi cache-audit](engine/research/FM3_CACHE_AUDIT_20261012.zip):
  45 sektsiooni, 2509 kirjet, Filteri 37 parameetri metadata ja 11 enumloendit.
- [Native-audit](engine/research/FM3_REA_NATIVE_AUDIT_20261012.zip):
  UI sündmuse, dispatcheri ja parameetripaketi analüüs. Normaliseeritud float'i
  pakkimine ei tõenda automaatselt kõigi presetiparameetrite uint16 teisendust.

Loe arhiive ajutises analüüsikaustas; ära lisa välispakettide sõltuvusi,
FM3-Editi rakendust ega Ghidra projekte plugina paketti. [REA arendusjuhendi](engine/docs/FM3_REA_DEVELOPMENT.md)
varasemad keskkonnatakistused on ajaloolised. Ära muuda kaitse- ega protsessikontrolle.

## Ühendatud generaator — tabelikodeerija, paigutus ja soundid

Säilita 0.3.0 paigutus/tabeliarendus ja 0.2.2 Amp Leveli lisatõendid koos. Kõik teed on MOOTORIS
(`engine/skills/instructions/`) või `engine/docs/`. Detailid: `engine/docs/FM3_TABLE_ENCODER.md`,
`engine/docs/FM3_LAYOUT.md`.

- **Tabelikodeerija** `scripts/fm3-table-encoder.mjs` + `references/fm3-param-dictionary.json`
  (FracTool 3.87 FM3 tabel, 2892 parameetrit, 488 valikuloendit). Väärtused antakse FM3-Edit'i näiduna.
  Kõverad: lineaarne, logaritmiline, nupp (klass 0x5: näit = n × 10), lineaarne dB (0x6).
  Tõendid: 280/280 seadmepunkti, 15/15 partiikatse näitu (`references/taper-batch-20261013.json`),
  12/12 senist juhti. Vaikimisi kirjutatakse measured / taper-class-verified / enum-labels-crosschecked;
  linear-by-structure ja enum-labels vajavad `allow`; unverified-taper (36 kirjet) mitte kunagi.
- **Kahe rea paigutus** `scripts/fm3-layout.mjs`: rida 2 In 1 → … → Send, rida 3 Return → … → Out 1,
  read 1/4 tühjad; plokkide järjekorra määrab sound. Ruudustiku liigutamine on **seadmel kinnitatud**
  (`examples/FM3_LAYOUT_MOVE_TEST_export.syx` keha identne).
- **Soundi koostaja** `scripts/fm3-sound.mjs` (jb-newlook): `composer` → `layout` → `blockScenes` →
  `controls` → `selectedScene`. Output Scene Level 1–8 (−20…+20 dB) on seadmel kinnitatud.
- **Plokkide lisamine (auditi punkt 6)** `scripts/fm3-insert-blocks.mjs`, väli `insert`: plex, multiband, synth,
  looper, gate, formant, tentap, megatap, ringmod, resonator (Volume/Pan: Codexi `volumePan`). Doonor on kasutaja enda FW13 eksport
  värsketest vaikeplokkidest (`references/fm3-default-blocks-20261023.syx`). Lisatud plokk on kõigis
  8 stseenis kanalil A ja bypassis; sisse lülita `blockScenes` abil. Looperil on 1 kanal, Megatap/Ring Mod/
  Resonatoril 2 (A/B). Plexi TIME1–8 ja LFO Rate kirjutamine nõuab samas spetsis vastava TEMPO = NONE
  (FM3-Edit'i paigutuse lukud, `references/fm3-insert-tempo-locks.json`). Mixer ja Multiplexer lisanduvad
  ainult `grid`-režiimis (punkt 5); Scene MIDI väljad on dekodeerimata — see lükatakse tagasi. Mix-juhid
  vajavad `allow: ["linear-by-structure"]`, valikuloendid `enum-labels`. Seadmel kinnitatud on kirjete
  kuju ja genereeritud lisamise import/eksport (`examples/FM3_P6_INSERT_{A,B}*`; seade normaliseerib kirjete
  järjekorra, sisu sama). Kuus CPU-raskemat plokki korraga ületasid CPU piiri: hoia lisatud plokkide arv mõõdukas.
  Klassi 0x01 juhid (nt Shift, Number of Taps) on täisarvud.
  Detailid: `engine/docs/FM3_POINT6_BLOCKS.md`.
- **Üldine ruudustik (auditi punkt 5)** `scripts/fm3-grid.mjs`, väli `grid` (`layout` asemel):
  `rows` = 4 rida × 12 lahtrit (`""` tühi, `"-"` shunt, muidu ploki nimi: in1, out1, send, return, amp,
  drive2, mixer …); `links` = `[{row, col, from:[read]}]` (1-põhine) hargnemiseks ja liitmiseks, muidu võtab
  lahter sisendi sama rea eelmisest veerust. Link nimetab SIHTlahtri, allikas on eelmine veerg: Cabi-järgne haru
  algab Cabist ühe veeru võrra paremal (muidu tuleb signaal Ampist). Kontrolli `.txt` hargnemiste loendit
  ja HOIATUS-ridu. Iga plokk peab olema In 1/Return/Synth'ist Out 1/Send'ini
  ühendatud; iga presetis olev plokk peab ruudustikul olema. `remove` eemaldab plokke (mitte In 1/Out 1/
  Amp/Cab; Send+Return koos), `duplicate` lisab teise eksemplari (drive2, delay2, compressor2, filter2–4 jt,
  ainult tehasepresetites nähtud), `insert` lisab ka mixer/multiplexer. Uued plokid: A, bypass; lülita
  sisse `blockScenes` abil. Tõend: kõik 384 tehase ruudustikku läbivad planeerija ja 4801/4801 sisendmaski
  taastuvad (`references/fm3-factory-grid-evidence.json`). **Seadmel kinnitatud** 2026-10-23: 7 testruudustikku
  (hargnemised, liitmised, 4 rida, Mixer, Multiplexer, Synth, eksemplarid, eemaldamine) lugesid tagasi 48/48
  lahtrit (`references/fm3-grid-check-20261023.json`). Ära küsi seda uuesti; heli on veel kuulamata.
  Teiste eksemplaride nimed (`drive2`, `volpan2` jne), kanalid ja bypass kajastuvad lõppfailidest loetud TXT-s ja aruandes.
  `--verify` kontrollib ruudustikku, eksemplare ja CPU aruannet ka uuendatud failiräside korral.
  Koguja peatub vale või ebastabiilse tagasilugemise järel ning säilitab saadetud kaadrid, vastuse ja vea.
  Ebaõnnestunud seanssi ei jätkata automaatselt.
  Detailid: `engine/docs/FM3_GRID.md`.
- **Seadmest tagasilugemine (2026-10-23)**: 7 genereeritud presetti (kõik pered, eksemplarid, Mixer/Multiplexer,
  Volume pedaaliseosega, Satriani V3) loeti redaktsioonipuhvrist tagasi; kõik 16 756 väärtust ja ruudustik klappisid.
  Kohta 436 salvestatud preset (kasutaja STORE) ja selle uuesti laadimine säilitasid sisu; seade järjestab kirjed
  efekti-ID järgi. Ära küsi neid uuesti. Detailid: `engine/docs/FM3_DEVICE_READS.md`.
- **CPU hinnang (auditi punkt 7)** `scripts/fm3-cpu.mjs`: iga stseeni CPU aktiivse kanali tüübi järgi
  (342 seadmes mõõdetud tüüpi + reverbi kvaliteet; piir 80 %, hoiatus üle 72 %).
  Mõõdetud üksikkulud ei taga kombineeritud preseti veapiiri: G06 hinnang 44,3 %, mõõdetud 41,5 %.
  Mõõtmata tüüp kasutab olemasolevat pere maksimumi või mõõdetud võrdlustüüpi; teadmata pered jäävad summast välja ja nimetatakse. Amp/Delay tuuma ei näe. Ütle kasutajale hinnang; vali raskete tüüpide (Plate/Spring
  reverb, Pitch Quad, High/Ultra-High kvaliteet) puhul kergem alternatiiv, kui stseen läheneb piirile.
  Detailid: `engine/docs/FM3_CPU.md`.
- **Satriani "Soap On A Rope"** `examples/SATRIANI_SOAP_ON_A_ROPE{,_V2,_V3}.*`: V1/V2 kuulatud, V3 (tämber
  eraldatud originaali kitarriraja järgi) ootab kuulamist. Kõik kolm on SA2 koostajaga baitidentsed.
- **Helivõrdlus** `scripts/fm3-audio-compare.py REF FM3`: kolmandikoktaavi tämber ja stereolaius
  (eelista eraldatud kitarrirada). Efektide tuvastamine EI ole valideeritud — ära väida helianalüüsi
  põhjal phaserit/delay'd.
- Käivita vajadusel `node scripts/test-sound-release.mjs` ja `node scripts/test-upstream-fm3.mjs`.
  Täielik offline-komplekt on `references/offline-suite.json`; ajaloolised testid
  käivita ajutises koopias, sest osa kirjutab tulemusi fixture-kaustadesse.
  Filteri aegunud negatiivne test on parandatud: mõõdetud 2nd order peab õnnestuma,
  tundmatu 3rd peab ebaõnnestuma.
- Loe [väljalaske ja laadimise töövoogu](engine/docs/FM3_RELEASE_WORKFLOW.md).
  Uus test ei muuda klassi/struktuuri põhjal tuletatud parameetrit seadmepunktina mõõdetuks.

## Tõendite säilitamine ja avaldamine

Algne mootor on hoitud alamkaustas `engine`, säilitades selle sisemised failiteed,
impordid ja mõõteandmete kontrollsummad. Varasem pikk juhiste ajalugu paikneb
[HISTORY.md](engine/skills/instructions/HISTORY.md) failis. Loe sealt ainult
vajalikku ajaloolist lõiku; ära käsitle vana „järgmist sammu” kehtiva ülesandena.

Amp-kogumise 990 ajaloolist faili on koondatud 164 kordumatu sisuga taastatavasse
`MOOTOR/references/amp-history.json.gz` arhiivi. Kontrolli vajadusel:

```bash
python3 "$FM3_ENGINE/scripts/fm3-evidence-archive.py" verify
```

Taasta vanad `skills/instructions/references/batch-*` teed ainult ajutisse mootori
töökoopiasse. Algne kataloog, mallid ja lähteandmed peavad säilima kontrollitavana.
Ära paki taastatud ajalugu tagasi avaldatavasse pluginasse. Väljalase peab vastama ühele puhtale Git commit'ile. Kasuta repo
`tools/fm3/test-offline.py` ja `tools/fm3/build-release.py` töövoogu; vana
`fm3-package.py` sobib inventuuriks, mitte commit'iga sidumata väljalaskeks. Eelarve on 4000
faili/kausta/juurkausta kirjet. Kopeeri ainult selle oskuse failid, säilita uue
plugina identiteet ja privaatsus ning uuenda olemasolevat pluginat, mitte ära loo kolmandat.

Riistvaraaudit on ainult kasutaja kinnitatud GET/read-only päringud. Ära saada
tooreid SET-käske ega salvesta automaatselt FM3 presetikohtadele. Kontrollimpordi
teeb kasutaja FM3-Editis teadlikult, säilitades oma töö; see muudab tööpuhvrit.

## Laadimise kontroll

Enne avaldatud väljalaske kasutusvalmis kinnitamist kontrolli päriselt laaditud
plugina teed, manifesti, versiooni ja eeldatavat täispikka commit-räsi:

```bash
node "$FM3_ENGINE/scripts/fm3-self-check.mjs" EXPECTED_COMMIT_SHA
```

Kasuta väljalaskekviitungist teada olevat commit'i; ära vali väärtust kontrollitava
faili enda põhjal. Skript kontrollib kogu paketi faililoendit ja räsisid ning
teeb teadaoleva preseti kordusgenereerimise. Värskelt lahtipakitud arhiivi kontroll
ei tõenda automaatselt hosti avastust/laadimist. Kui sessioon näeb vana oskust,
puuduvaid engine-faile või erinevat versiooni, märgi laadimine kinnitamata.
Ära kirjuta hosti hallatud skill-kausta käsitsi üle, et kontroll näiliselt läbiks.
Väikese kasutusülesande offline-genereerimine ja failide kontroll lõpetavad
laadimise kontrolli; heli, FM3 import ja CPU on eraldi tõendid.

0.3.3 parandab logaritmilise juhiku null- ja negatiivsete sisendite kontrolli.
DynaCab R1/R2 sisend on **0–10**, mitte protsent. Choruse Delay Range,
Low ning High/EQ on nüüd nimeliselt leitavad; järgi nende FW13 tüübipiire.
Drive Oversampling on redaktoris peidetud ja kirjutamisel blokeeritud.
Vaata [kuue välja lahendust](engine/docs/FM3_METADATA_RESOLUTION.md).
Kontrolli avaldatud versiooni eraldi väljalaskekviitungist; lähtekoodis olev
versiooninumber üksi ei kinnita avaldamist.

## Pitchi kuvasildid

Kasuta lõputute arpeggiatori korduste jaoks `NUMREPEATS: "INFINITE"`.
Vali globaalskaala selgesõnalise sildiga, nt `CUSTOMSCALE1: "SCALE 32"`.
Arvuline sisend säilitab vana salvestuskoodi tähenduse: skaala indeks 0–31.
Kuvasildid on FW13 püsivara põhjal ristkontrollitud, mitte uus seadmemõõtmine.
Globaalsete skaalade sisu ei sisaldu presetis; ära luba selle ülekandmist.

## Globaalsete skaalade toorvastuste kogumine

Kasuta kasutaja kinnitatud lugemisseansi jaoks
`engine/skills/instructions/scripts/global-scale-collector/FM3_GLOBAL_SCALES.py`.
Loe [Pitchi skaalade juhendi koguja osa](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#jätkatav-toorvastuste-koguja).
Koguja piirab saatmise fn=01 / sub=1A / effect=1 / PID=902…1285 päringutega.
`captureComplete` kinnitab ainult toorvastuste kogumist. Kasuta olemasoleva
ZIP-i tõlgendamiseks allpool nimetatud dekoodrit; ära muuda `contentsVerified`
või `liveGetEncodingVerified` tõeseks. `sub=01` on kirjelduspäring; vana
`buildGetParameter` kasutab kirjutavat `sub=09` käsku ja on keelatud.

## Globaalsete skaalade vaatlusandmete lisamine presetile

Kui kasutaja on andnud koguja `results.zip` faili, järgi
[skaalade dekodeerimise juhendit](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#kogutud-skaalade-dekodeerimine-ja-preseti-aruanne).
Käivita `FM3_DECODE_SCALES.py --zip /ABS/results.zip --out /ABS/observations.json`
eelmainitud `global-scale-collector` kaustast. See vajab Python 3.9+ ja töötab
seadmeühenduseta. Algset ZIP-i ei muudeta. Vigast või poolikut kogumist ei aktsepteerita.

Tekstipõhise skaala vaatluse jaoks lisa dekodeerimiskäsule selgesõnaliselt
`--display-only`. Skeem 2 säilitab arvuvälja diagnostika ja märgib TXT-is
lahknevused. Vaikimisi skeem 1 nõuab teksti/arvu kooskõla. Ära käsitle
tekstipõhist tulemust arvukodeeringu kinnitusena ega vaheta režiimi vaikselt.

Lisa ühise generaatori käsu lõppu `--global-scales /ABS/observations.json`.
Generaator nõuab lõpp-preseti kõigi salvestatud Custom Shifteri kanalite
kasutatavate skaalade andmeid. TXT näitab nootide nihkeid, kogumise aega ja
algarhiivi räsi; validation.json säilitab ka dekodeerimise aluseks olevad kaadrid.
Käivita tavapärane `--verify`, mis kontrollib ka vaatlusandmeid ja nende seost
lõpliku SYX-iga. Selle valikulise funktsiooni genereerimine ja kontroll vajavad Python 3.9+.

Erista `observationsIncluded:true` ja `contentsIncluded:false`: andmed on
aruandes, globaalse skaala sisu pole SYX-is ega kandu selle impordiga üle.
Mõlema režiimi tulemus on kogumise aja vaatlus, mitte seadme praeguse
oleku või kogu väärtusvahemiku riistvarakinnitus. Seadme identiteeti/püsivara
see päring ei tuvasta. Ära nõua juba piisava kogumise kordamist.

## External 1 → Wah piiratud kirjutustugi (0.3.5)

Kasuta `jb-composer` kirjelduses `"modifiers":{"external1Wah":true}` või
`false`; soundi ümbrises pane see `composer` sisse. Välja puudumine säilitab
algse seose. Loe [piiratud modifikaatorikirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md).
Kirjutatakse olemasoleva esimese kirje allikas NONE ↔ External 1.
Siht Wah 1 Control, ALL ja muud sõnad peavad vastama tõendatud kirjele;
Auto Engage ja Damping’u režiimi sõnadel on kummalgi kaks allpool kirjeldatud lubatud väärtust.
NewLookil puudub Wah: sisselülitamiseks küsi ka `wahChannels` täiskanalimall.
Seos ei muuda stseenide bypass'i ega seadista globaalset pedaali/MIDI vastendust.
Aktiivse seose puhul lükatakse tabeli Wah Control kirjutus tagasi kõigil A–D
kanalitel. Ära lülita seost välja ilma selgesõnalise soovita. Kõvera vabade väärtuste, muude
allikate, uute kirjete ja globaalsete skaalade kirjutamine jääb toetamata.
0.3.13 piiratud mõõtepunktid on kirjeldatud allpool.

0.3.9 ühtlustab JSON-skeemi generaatoriga: ainult `modifiers.external1Wah`
muutev koostajapäring on lubatud ka skeemi järgi. Muid seadeid pole vaja lisada.

## Modifikaatorite failiaudit (0.3.8)

Olemasoleva preseti seoste uurimiseks kasuta
`node "$FM3_ENGINE/scripts/fm3-preset.mjs" --inspect-modifiers "/ABS/PRESET.syx"`.
Lisa `--format txt` loetava eestikeelse aruande saamiseks; vaikimisi väljastatakse
JSON. Käsk loeb faili ja kirjutab ainult standardväljundisse. See ei genereeri
uut SYX-i ega ühendu seadmega. Loe [auditi juhendit](engine/docs/FM3_MODIFIER_AUDIT.md).

Audit aktsepteerib toetatud struktuuriga faili ka väljaspool kinnitatud
koostajaaluseid. See ei anna sellele failile kirjutusluba. Erista 32
serialiseeritud kirjet seadme kasutatavast mahust, aktiivset allikaviidet
stseeni bypass'ist ja kõlavast väärtusest ning FW13 metaandmeid faili tegelikust
püsivarast. Tundmatud allikad/kanalid ja toorsõnad jäävad nähtavaks; teiseste
allikate või kõverate DSP-mõju ei arvutata. Kirjutustugi järgib piiratud Wah-juhendit; audit ise midagi ei kirjuta.

Vaata ka `contextScan` ja `targetContext`: parameetrikirje, ruudustikulahter
ning toetatud ploki kaheksa salvestatud stseeni kanal/bypass on eri faktid.
Tundmatu kirjeloendi või süsteemisaba korral on ploki olemasolu teadmata;
ära nimeta seda puuduvaks. Stseenide kanalikatvus ja bypass ei kinnita seose
toimimist ega kuuldavust. Eksporditud Bonamassa aluses on External 1 aktiivne,
kuid Wah kõigis stseenides bypass'is; NewLookis on sihtseos väljas ja plokk puudub.

Vaata `targetApplicability`: 11 kaetud efektipere A–D kanalite FW13 tüübireegel
annab sobiva, välistatud või teadmata tulemuse. Tundmatu mudeli/valija ega
puuduva või korduva sihtkirje puhul ära järelda sobivust. Kõik kanalid kuvatakse;
`inModifierScope` eristab seose ALL/A–D ulatust. Tüübireegli läbimine ei kinnita
parameetri modifikaatorituge, DSP mõju ega kirjutusluba. Rotary PID 0 on Rate,
mitte Type. Pitchi kohaliku noodi kontekst ei valideeri terve skaala sisu.

## Auto Engage kahevalikuline tugi (0.3.10)

Kasuta `"modifiers":{"wahAutoEngage":"OFF"}` või `"MED SPD"`; soundi
ümbrises pane see `composer` sisse. Välja puudumine säilitab väärtuse.
Kirjutaja nõuab lõppseoses External 1 → Wah 1 Control ALL ning täpset
säilitatud konfiguratsiooni. NewLookil lisa Wah-mall ja selgesõnaline
`external1Wah:true`. OFF ei eemalda modifikaatoriseost ega muuda stseeni bypass'i.
Loe [piiratud Wah-juhendi Auto Engage osa](engine/docs/FM3_WAH_MODIFIER.md#auto-engage-kahevalikuline-kirjutus).
Sõna 10 / keha nihe 1604: OFF=0, MED SPD=2. Ainult see paar on kasutaja
21.10.2026 FW13 ekspordi, OFF-ekraanipildi ja algväärtuse kinnitusega tõendatud.
Ära kasuta muid Auto Engage enumikoode. Min-i kaks mõõdetud punkti ning
0.3.13 Maxi, kõvera ja Attack/Release piiratud punktid on kirjeldatud allpool.
Täpselt sama kogu sisu tuvastamisel ära küsi uut korduseksporti.
Seadme käitumine ja heli jäävad eraldi. Väljalaske avaldamine ja hostilaadimine
kinnitatakse eraldi commit’ipõhise kviitungiga.

## Damping’u režiimi kahevalikuline tugi (0.3.11)

Kasuta `"modifiers":{"wahDamping":"LINEAR"}` või `"EXPONENTIAL"`; soundi
ümbrises pane see `composer` sisse. Väärtused on täpselt suurtähtedes.
Välja puudumine säilitab režiimi; ainult Damping’u päring säilitab Auto Engage’i.
Nõutav lõppseos on External 1 → Wah 1 Control ALL. NewLookil lisa Wah-mall
ja `external1Wah:true`. Damping koos `external1Wah:false` ei ole lubatud.
Sõna 24 / keha nihe 1632: EXPONENTIAL=0, LINEAR=1, kinnitatud 21.10.2026
kasutaja ühe muudatuse ekspordi, kuvatõendi ning algseisu kinnitusega.
Loe [Damping’u piiratud kirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md#dampingu-režiimi-kahevalikuline-kirjutus).
Ainult Damping’u päringus jäävad Attack/Release ajad, Min/Max, kõver ja stseenide bypass muutmata.
Auto Engage OFF + LINEAR täpne kogu keha kattub kasutaja järelkatse ekspordiga;
sama sisu uut korduseksporti ei nõuta. MED SPD + LINEAR ja muud kooslused on
eraldi sünteetiliselt kontrollitud kombinatsioonid, mitte selle katse seadmekinnitus.
Damping’u tegelik ajakäitumine, uue faili import, heli ja CPU jäävad eraldi.
Lähtekoodi versioon ei kinnita avaldamist ega hostilaadimist.

## Min-i kaks mõõdetud punkti (0.3.12)

Kasuta `"modifiers":{"wahMin":0}` või `{"wahMin":2.5}`; soundi ümbrises
pane see `composer` sisse. Välja puudumine säilitab Min-i. Ära aktsepteeri
muid arve ega stringsisendeid. Kogu skaala valem ja interpolatsioon on kinnitamata.
Kirjutaja kasutab täpselt ekspordist mõõdetud sõnu 0 ja 16375 (nihe 1586),
mitte esialgse lineaarhüpoteesi 16383/16384. Nõutav on lõppseos External 1 →
Wah 1 Control ALL; 0.3.12 tõendis oli Max-kood 65534, 0.3.13 lubab ka
allpool toodud mõõdetud Maxi koode. NewLook vajab Wah-malli ja
`external1Wah:true`. Max-i ega muid modifikaatorisihtmärke selle paari põhjal ei avata.
Loe [Min-i kirjutusjuhendit](engine/docs/FM3_WAH_MODIFIER.md#min-i-kaks-mõõdetud-punkti)
ja tõendit `engine/skills/instructions/references/wah-min-evidence.json`.
21.10.2026 kasutaja ekspordipaar, ekraanipilt ja kinnitus tõendavad Min 0.00 → 2.50.
Täpselt sama kogu keha taastamisel ära küsi uut korduseksporti; uus fail ei ole
sellega eraldi seadmesse imporditud. Pedaal, DSP, heli ja CPU jäävad eraldi kontrollideks.

## Modifikaatori kümne välja mõõdetud punktid (0.3.13 kandidaat)

`modifiers.wahControls` lisab Max, Start/Mid/End/Slope, Attack/Release,
Scale/Offset ja Off Value täpsed mõõtepunktid. Soundi ümbrises kasuta
`composer.modifiers.wahControls`. Vaata capabilities'i `modifiers.controls`
ja [mõõtepunktide juhendit](engine/docs/FM3_WAH_MODIFIER.md#kümne-välja-mõõdetud-punktid-0313-kandidaat).
Ära interpoleeri ega paku suvalist vaheväärtust toetatuna. `wahMin` jääb eraldi.

Näiteks `{"wahMin":2.5,"wahControls":{"max":5,"attackMs":500,"releaseMs":1000}}`
kirjutab täpsed mõõdetud koodid; Release'i lõppnäit on 999.9 ms. Täielik B+Max
profiil on juhendis. Välja puudumine säilitab selle väärtuse. Nõutav on lõplik
External 1 → Wah 1 Control ALL seos ja olemasolev Wah 1. NewLookil lisa Wah-mall
ning `external1Wah:true`. Ära muuda bypass'i või lülita seost välja vaikimisi.

A ja B on kaks koondkatset; Max 7.50 → 5.00 on eraldi ühe välja katse.
Koos saadi 20 uut proovipunkti kolme ekspordiga. A Attack on pildil 99.9 ms,
kuigi kasutaja tekstis oli 9.99 ms; vastuolu säilib tõendis. B Max jäi 7.50
ja parandati alles eraldi ekspordis. Ära nimeta koondkatseid sõltumatuteks
üksikmõõtmisteks ega väida täisvahemiku, sõltumatuse, pedaali või heli kinnitust.
Uued punktide kombinatsioonid on kontrollitud arvutis.

Generaator tuvastab kolme kogutud faili täpse kogu keha vaste; sellise vaste
korral ei küsita sama sisu korduseksporti. Tootmisväljalase, avaldamisluba,
CI ja hostilaadimine jäävad eraldi väravateks; kohalik kandidaat ei ole
automaatselt avaldatud plugin. Kodeeringu uus piiratud liides on järgmises osas;
kogu väärtusvahemiku, pedaali ja heli kinnitus on endiselt eraldi.

## Täpne Wah Min/Max (0.3.14)

Kasuta täpse väärtuse jaoks `modifiers.wahMinMaxExact` või soundi ümbrises
`composer.modifiers.wahMinMaxExact`, näiteks
`{"policy":"exact-wah-cent-fw13-hw1","min":"2.50","max":"6.47"}`.
Nõua kahe kümnendkohaga stringi `0.00`…`10.00`; piisab ühest väljast.
Määramata raw-sõna säilib. Nõua lõplikku External 1 → Wah1 Control ALL seost;
NewLookil lisa Wah-mall ja `external1Wah:true`. Säilita stseenide bypass,
kui kasutaja pole selle muutmist palunud. Ära määra sama välja kahe lepinguga.
Vana `wahMin:2.5` jääb hiiremõõtepunktiks 16375; täpne `"min":"2.50"` annab
16384. Vana `wahControls.max:5` annab 32784; täpne `"max":"5.00"` 32767.
Vaata [täpse sisendi juhendit](engine/docs/FM3_WAH_MODIFIER.md#täpse-minmax-sisendi-arenduskandidaat-22102026)
ja capabilities'i `exactMinMax` välja. Erista iga väärtuse tõenditaset:
kuus väärtust välja kohta on riistvaral mõõdetud, 995 põhinevad nelja mudeli
kokkulangevusel. Ära nimeta neid kõiki mõõdetuks ega kogu vahemikku tõendatuks.
Kasuta ühise generaatori nelja faili ja `--verify` kontrolli; uut eksporti
küsi vaid konkreetse lahtise küsimuse jaoks. Seadmeimport, heli ja CPU on eraldi.
