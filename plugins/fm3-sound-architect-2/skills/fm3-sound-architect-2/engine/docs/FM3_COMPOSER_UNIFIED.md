# Ühine presetikoostaja — 0.56.1

## Graphic EQ ettevalmistus — plugin0.65.0

Esimese GEQ lisamiskatse pakett ja faili eelkontroll on valmis. GEQ-ga
päris eksport ning parameetripaar on ootel; koostaja0.10.1 kirjutustugi
jääb senisesse ulatusse. Jätkupunkt: [GEQ juhend](FM3_GEQ_FIRST_STEP.md).

## PEQ seadmering kinnitatud — koostaja0.10.1 / plugin0.64.1

Kõik FM3_PEQ_ABCD_TEST 13 456 sisubaiti säilisid impordil/tagasiekspordil.
CPU47–48% kinnitatud. Blocking-tüübil Q puudub: kood, skeem ja juhend
parandatud; sama SYX säilib. Korduskatset pole vaja. Järgmine plokk on
Graphic EQ, seejärel Enhancer. Uue katse helimuljet pole eraldi kinnitatud.
[Praegune PEQ juhend](FM3_PEQ_COMPOSER.md) asendab alloleva katse OOTEL-seisu.

## PEQ viis riba ja A–D — koostaja 0.10.0 / plugin 0.64.0

Ühine spec toetab PEQ A–D, viit riba, mõõdetud tüüpe/kalded ja arvulisi
skaalasid. 84 uut päris mõõtmissammu on kontrollitud. Koostaja eristab
mõõdetud punkte ja skaalast arvutatud vaheväärtusi. NewLooki rida2/veerg10
ning vaikimisi kõigis stseenides bypass säilivad; aktiveeri `scenes` abil.
Loe [PEQ juhendit](FM3_PEQ_COMPOSER.md). V3 ja vana Band3 katse SYX jäävad
baitidentseks. Vana katse import/eksport, positiivne kuulamine ja CPU47–48%
on kinnitatud. Uus `FM3_PEQ_ABCD_TEST.syx` ootab ühte väärtuste/stseenide
kontrolli, kuulamist/CPU-d ja tervikpreseti eksporti. Uut GET-kogumist pole vaja.

Ampi/Cabi uue kanalivaliku esinduslik seadmekatse on kinnitatud:
`FM3_AMP_CAB_AD_TEST_export.syx` kõik 12 804 sisubaiti kattuvad täpselt.
Scene2/6 algne sisu ning kaks rida/Send/Return säilivad. Korduskatset ei küsita.
Täpne ulatus: [A–D juhend](FM3_COMPOSER_AMP_CAB_CHANNELS.md) ja
`FM3_AMP_CAB_HARDWARE_ROUNDTRIP.json`; heli ja CPU kohta hinnangut ei lisandu.

Üks `jb-composer` kirjeldus ühendab kõik seni eraldi generaatorites olnud
plokimallid ja mõõdetud juhtseadised. Tulemus on üks SYX, sellele vastav
TXT ja kontrollraport. Koostaja kasutab seitset täpselt tuvastatud alusfaili
viie plokipaigutusega. Eelistatud alus on nüüd kasutaja kahe rea Send/Returniga
`jb-newlook`; sellel lisatakse küsitud toetatud plokid automaatselt vabadesse
kohtadesse. **Loe esmalt [NewLook-juhendit](FM3_COMPOSER_NEWLOOK.md):** seal on
täpsed kohad, `addedBlockScenes` ning eraldi Choruse, Pitchi ja Filteri lisamise seadmetõendid.
Allpool toodud kuue varasema aluse võimalused jäävad tagasiühilduvaks.

**Stseenide ühine liides on nüüd `scenes`:** kõigi kaheksa stseeni nimed,
olemasolevate ja lisatud toetatud plokkide A–D kanalid ning bypass ühes
kirjelduses. [Stseenijuhend](FM3_COMPOSER_SCENES.md) sisaldab süntaksit,
piire ja valmis Bonamassa rütmi/soolo näidist.

**Filter on nüüd samas koostajas:** 18 kogutud täiskanalimalli A–D ning
automaatne lisamine NewLookis Cab'i järele. [Filteri juhend](FM3_COMPOSER_FILTER.md)
kirjeldab tõendeid ja piire. Nelja kanali Filteri kontrollpreseti seadmeeksport
kattub kõigi 13 146 kehabaidi osas täpselt; see impordi/tagasiekspordi katse on lõpetatud.
Lisandunud on [mõõdetud Filteri juhid](FM3_FILTER_MEASURED_CONTROLS.md);
koostaja taastab ka kõigi 17 mõõtmisekspordi kogu keha täpselt.

Kasutaja soovitud `FM3_NEWLOOK_PITCH_TEST` ühendas kuus perekonda uuel alusel
ja lisas ainult Pitchi. Selle seadmeeksport kattub nüüd kõigi 13 762 kehabaidi
osas täpselt: katse on lõpetatud. Tõend ja ulatus on NewLook-juhendi lõpus.
Varasem kümne plokiga `FM3_COMPOSER_PITCH_TEST` on asendatud, seda ei nõuta.

**Ampi ja Cabi mudelivalik A–D:** `ampChannels` ja `cabChannels` ühendavad
336 Amp- ning 45 Cab-malli kõigi stseenidega. Valimata kanalid säilivad.
Täiskanalimall asendab ka valitud kanali tasemeid; Ampi üksikjuhid jäävad
B-kanalile. [A–D juhend ja seadmekatse](FM3_COMPOSER_AMP_CAB_CHANNELS.md).

## Ühendatud võimalused

| Võimalus | Ühises koostajas |
|---|---|
| Amp | 336 täiskanalimalli A–D; senised Gain/Bass/EQ/Level juhid kanalile B |
| Cab | 45 Dyna-Cab täiskanalimalli A–D |
| Drive | 87 tüüpi A–D; senised mõõdetud tüübi/kanali/väärtuse kombinatsioonid |
| Delay | 27 tüüpi A–D; Mix/Time/Feedback/Tempo ainult A, Deluxe Mind Guy ID14 |
| Reverb | 79 tüüpi A–D; Mix/Time/Pre-Delay/Tempo ainult A, Large Room ID2 |
| Compressor | 19 täiskanalimalli A–D |
| Chorus | 27 täiskanalimalli A–D |
| Flanger | 31 täiskanalimalli A–D, Flangeriga alusel või NewLookis lisatuna |
| Phaser | 17 täiskanalimalli A–D |
| Wah | 9 täiskanalimalli A–D |
| Tremolo/Panner | 7 täiskanalimalli A–D, Tremologa alusel või NewLookis lisatuna |
| Rotary | A-kanali senised mõõdetud Rate/Mix/Level/HiDepth/LowDepth punktid |
| Pitch | 16 täiskanalimalli A–D, Pitchiga alusel või NewLookis lisatuna |
| Filter | 18 täiskanalimalli A–D, NewLookis automaatselt Cab'i järel; A High-Pass / B Low-Pass Frequency ning C Peaking Frequency/Q/Gain/Level mõõdetud punktid |
| Stseenid | `scenes`: nimed, A–D kanalid ja bypass kõigis kaheksas stseenis, kõigil olemasolevatel või selgesõnaliselt lisatud toetatud efektiplokkidel; senised väljad jäävad alles |

Näiteks `compressorChannels`, `chorusChannels`, `flangerChannels`,
`phaserChannels`, `wahChannels`, `tremoloChannels`, `pitchChannels` ja `filterChannels`
on samasugused `{channel,type}` loendid nagu Delay/Reverb. Rotary kasutab
`rotaryA` objekti. Need võtmed saab samasse kirjeldusse panna Amp/Cab,
Drive'i, parameetrite ja olemasolevate stseeniväljadega.

Malli valik kopeerib kogu kogutud kanali. See ei lülita efekti sisse ega
muuda stseeni kanalivalikut. TXT ja JSON näitavad eraldi kanalit kasutavaid
stseene ja stseene, kus efekt on sees. Määramata parameetrid säilivad
valitud alusest. Mallid pole tingimata tehasevaikeväärtused.

## Sobiva aluse valimine

Kuuel varasemal alusel on Amp, Cab, Drive, Delay, Reverb, Compressor, Chorus,
Phaser ja Wah. Ülejäänud kogutud plokk sõltub alusest:

| Aluse ID | Fail `skills/instructions` suhtes | Lisaplokk |
|---|---|---|
| `jb-newlook` | `examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx` | kaks rida, Send/Return; lisaplokk küsitakse vajadusel |
| `jb-original` | `examples/JB_YDOM_RHYTHM.syx` | Flanger |
| `jb-balanced` | `examples/JB_RHYTHM_LEVEL_MINUS3.syx` | Flanger |
| `jb-balanced-export` | `examples/JB_RHYTHM_LEVEL_MINUS3_export.syx` | Flanger |
| `jb-tremolo` | `examples/FM3_TREMOLO_ABCD_TEST_export.syx` | Tremolo |
| `jb-rotary` | `examples/FM3_ROTARY_A_TEST_export.syx` | Rotary |
| `jb-pitch` | `examples/FM3_PITCH_ABCD_TEST_export.syx` | Pitch |

Alus tuvastatakse faili SHA-256 järgi, mitte nime või kasutaja antud ID järgi.
Bonamassa edasiseks muutmiseks eelista kasutaja uut `jb-newlook` alust. Sellel on kasutaja heaks kiidetud Scene2 Amp B Level -3dB ja säilinud
Scene6. Tremolo/Rotary/Pitch alused on varasemad tehnilised kontrollpresetid;
neid ei nimetata tasakaalustatud Bonamassa variatsioonideks.

Kuuel varasemal alusel annab puuduva ploki küsimine endiselt vea.
`jb-newlook` alusel on nende perekondade koos lisamine failitasemel toetatud;
seadmekinnituse ulatus on NewLook-juhendis. Plokkide suvalist asendamist,
eemaldamist ega routing'ut see laiendus ei paku.

## Kasutamine

Plugina `skills/instructions` kaustast:

```bash
node scripts/fm3-generate.mjs --capabilities
node scripts/fm3-generate.mjs --capabilities examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx
node scripts/fm3-generate.mjs examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx spec.json /absolute/output-stem
```

`--capabilities` annab toetatud alused, nende plokid/väljad, täpsed
mudelinimed ja parameetripiirid. Failiaruanne on ka
`FM3_COMPOSER_CAPABILITIES.json`. Sisendskeem on
`skills/instructions/scripts/fm3-spec.schema.json`.

Väike kirjeldus tasakaalustatud Bonamassa alusel:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB WITH CHORUS",
  "chorusChannels": [{"channel": "D", "type": "4-Voice Analog"}],
  "compressorChannels": [{"channel": "C", "type": "Analog Compressor"}]
}
```

NewLook-alusel lisab see Choruse ja Compressori ning nende kogutud mallid
kanalitesse D ja C, säilitades olemasolevad Bonamassa rütmi/soolo
muud seaded. Uued plokid on vaikimisi bypass'is. Kuuldava efekti jaoks lisa
`scenes`, nagu stseeni- ja NewLook-juhendis. Ka olemasolevate plokkide
stseeniseaded käivad sama liidese kaudu. `addedBlockScenes` jääb tagasiühilduvaks.

Valmis `examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json` ühendab senised
Amp/Cab/Drive/Delay/Reverb seaded ning Scene2/Scene6 uue liidese kaudu.
Selle väljundi kõik 12 804 kehabaidi kattuvad kasutaja kinnitatud NewLooki
ekspordiga; lisaplokke ei lisandu. Uus preseti nimi on `JB NEWLOOK RHYTHM SOLO`.
Sama sisu korduseksporti pole vaja.

## Kontroll ja piirangud

Senised komponendid töötavad oma algsel kontrollitud doonoril; seejärel kantakse
ainult soovitud terve kanal või Rotary üksik parameetrisõna valitud alusesse.
Filteri adapter võtab 37 sõna otse kinnitatud GET/SYX-paarist ning kontrollib
kataloogi ja mõlema lähtefaili tõendit enne iga kasutust.
Vanade generaatorite lubatud alusfailide loendeid ei laiendatud.
Viie algse USA MK IV Amp-malli allikas parandati: need võetakse algsest
Amp-doonorist, mitte Bonamassa aluse muudetud kanalitest. Mudeli-ID loetakse
pärast valikut tagasi. Kataloogi336 valikut koosnevad331 imporditud mallist
ja neist viiest algsest mallist.
Plokipaigutused on kinnitatud iga aluse struktuuri ja räsi järgi, mitte
ülddekoodri võimaliku nihkega `params_offset` või parameetrite seest leitud
päiselaadsete numbrite põhjal. Mallid rakendatakse enne üksikparameetreid,
stseeniväljad viimasena. Aruannetes kajastuvad lõplikud kanaliseosed.

Kontrollitakse kogu väljundkeha, lubatud muudatusalasid, ainult deklareeritud
NewLook-shuntide asendusi (muudel alustel routing'u säilimist), valitud stseeni, kaadreid, CRC-d, footer'it, kodeeritud pikkusi ja nulltäidet.
Tüübiga seotud parameetripiirangud, tempo selgesõnaline määramine ja Rotary
mõõdetud punktid säilivad. Puuduvad väljad ei saa vaikeväärtusi doonorist.

`test-composer-integration.mjs` ja `FM3_COMPOSER_INTEGRATION_TESTS.json`:

- 6 aluse kogu sisu võrdlus sõltumatute oodatud baitidega; 4 plokipaigutust.
- 188 täiskanalimalli ülekannet kõigi komponentide kooskasutuse juhtumites.
- Kõik viis algset Amp-malli kuuel alusel: 30 sõltumatut täiskeha võrdlust.
- 18 parameetri/stseenivälja isolatsioonikatset, 30 uute plokkide alamkombinatsiooni.
- 94 vigase sisendi, puuduva ploki või tundmatu aluse tõrjumist.
- Kanalite kasutajate, aktiivsete stseenide, TXT ja võimaluste loendi kontroll.
- Kinnitatud Bonamassa SYX taastub baitidentselt; selle tagasiekspordi muutmata
  parameetritega alus säilitab kogu kinnitatud sisu.

Senise koostaja 31 kombinatsiooni, 16 üksikjuhi, mall+juht ja vigaste sisendite
testid läbivad. Senise põhigeneraatori 4 tervikfaili jäävad baitidentseks ning
8 sõltumatut Gain/Bass ekspordikeha kattuvad. Algne ühine seadmeeksport kattub
endiselt kogu keha ulatuses. JSON-skeemi struktuuri ja väljade katvust
kontrolliti; täielikku Draft 2020-12 validaatorit selles keskkonnas pole.

Need on uue kooskasutuse failitaseme kontrollid. Uusi kombinatsioone ei loeta
automaatselt seadmel, heliliselt ega CPU osas kinnitatuks.

Versiooni 0.51.0 stseeniliidest kontrollib `test-composer-scenes.mjs`, tulemused
`FM3_COMPOSER_SCENE_TESTS.json`: kõigi kaheksa stseeni 1096 nime/kanali/bypass'i
välja seitsmel alusel, osaliste muudatuste eraldatus, uue ploki aktiveerimine
ja aruande lõppseis ning 40 vigase või vastuolulise sisendi tõrjumist.
Uue liidese kaudu taastuvad täpselt kolm varasemat kinnitatud näidist:
tasakaalustatud Bonamassa ning NewLooki Chorus ja Pitch. Uue muusikalise
rütmi/soolo näidise kogu keha kattub NewLooki seadmeekspordiga. See ei laienda
seadmekinnitust suvalisele uuele stseeniplaanile ega kinnita aktiivse Choruse heli.

## Varasem asendatud katse (ajalooline)

NewLooki Choruse- ja Pitchi-lisamise eraldi seadmeringid on kinnitatud.
Alljärgnev varasem Pitchi katse on asendatud ja jääb ajalooliseks näidiseks;
seda ei nõuta.

`examples/FM3_COMPOSER_PITCH_TEST.syx` koos TXT/spec/raportiga ühendab kõik
10 Pitchiga alusel olemas olevat toetatud plokki. Muu hulgas on seal
Amp B Brit Silver, Cab B Rumble EV12L, Drive B T808, Delay A Deluxe Mind Guy,
Reverb A Large Room/D Medium Room, Compressor C Analog Compressor,
Chorus D 4-Voice Analog, Phaser B Classic Vibe, Wah C Clyde ning
Pitch B Virtual Capo/C Dual Detune. Osa neist on teadlikult kasutamata kanalites;
katse kontrollib täielike parameetripankade säilimist ka ilma efekti aktiveerimata.

SYX SHA-256 `ffaa49e4143bba873055cbb6f32b1058be3403f3d801905dea2058b6ba9f2073`.
Võrreldes Pitchi alusega169 muutunud kehabaidi. Tegemist on tehnilise katsega,
mitte uue heaks kiidetud Bonamassa soundiga. Kasutaja säilitab oma praeguse
preseti, impordib selle faili tööpuhvrisse ning ekspordib muutmata seadetega
ja valitud Scene2-ga terve `FM3_COMPOSER_PITCH_TEST_export.syx`.
Ära palu kanaleid läbi klõpsida: see võib muuta stseeni kanalivalikut.
Võrdle seejärel kõiki14 870 kehabaite ja päiseid ilma normaliseerimiseta.
Uusi tüübikogumisi ega varem kinnitatud Bonamassa korduskatset pole vaja.
