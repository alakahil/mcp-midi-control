## Drive loend vastu võetud — 0.34.2, 2026-10-06

Kasutaja täielik FM3-Editi Type kuvatõmmis sisaldab87 Drive-tüüpi.
Loend ja algpilt: references/drive-capture/drive-roster.json ja
references/drive-capture/drive-type-list.png. Kõik87 nime/kuvanumbrit on
transkribeeritud; binaryId on null kuni sõltumatu GET/SYX kinnituseni.
Ära eelda displayNumber-1 vastendust (loend on nimejärjestuses).
See EI OLE veel kogutud87 kanalimalli ega valmis Drive-koguja/kirjutustugi.

Järgmine ettevalmistav katse: kasuta viimast kinnitatud
JB_RHYTHM_SOLO_GENERATED_export.syx seisundit (kasutaja algfailinimes oli
kaks punkti enne syx-i). Drive A=01 '77 Custom OD; B=02 Angry Chuck;
C=03 BB Pre; D=04 BB Pre AT. Muuda igas kanalis ainult Type-valikut;
tüübivahetuse automaatseid parameetrimuudatusi ära taasta ega muuda käsitsi.
Muud plokid ja stseeniseaded säilita. Terve eksport FM3_DRIVE_SELECTION_001.syx.
See SYX annab esialgse paigutuse/ID-võrdluse. Valmista seejärel piiratud
ühekordse kasutaja kinnitatud GET-i tööriist ja võrdle täiskanalite andmeid.
Ainult pärast esimese paari valideerimist kasuta jätkatavat nelikute koguja
töövoogu. Drive/Tone/Level/Mix kirjutus vajab oma sõltumatuid väärtuskatseid.
Ära saada ega soovita tooreid SET-käske; esimese katse käigus pole GET-i veel
tehtud. Kasutaja kuvatõmmis üksi ei kinnita binaarseid ID-sid ega paigutust.

## JB rütm/soolo kontrollimport kinnitatud — 0.34.1, 2026-10-06

Kasutaja tagasieksport JB_RHYTHM_SOLO_GENERATED_export..syx on paketi
examples/JB_RHYTHM_SOLO_GENERATED_export.syx all (sisu muutmata).
Kõik14222 body-baiti kattuvad generaatori JB_RHYTHM_SOLO_GENERATED.syx-iga,
ka offset0. Kaadrid/7-bit/kontrollsummad/CRC/footer läbivad, dump-päis sama;
raw-päises erinevad ainult CRC-baidid4/5. Terved SYX-id ei ole baitidentsed.
Raport ../../docs/FM3_JB_HARDWARE_ROUNDTRIP.json sisaldab mõlema SHA256.
Scene2 Amp B/Reverb B/Delay bypass/Phaser bypass; Scene6 JB SOLO/Amp C/
Reverb D/Delay sees/Phaser bypass säilisid. Selle täpse kombinatsiooni
seadmeimport ja tagasieksport on kinnitatud. Ära palu sama katset korrata.
Heli, tasemed ja CPU on eraldi hindamata; soolo pole lõplikult häälestatud.
See tõendab piiratud kahe stseeni tehnilist alust, mitte üldist kõigi
stseenide/plokkide/baaside kirjutustuge. Amp C jaguneb endiselt3/6/7 vahel.

Jätka kasutaja plaani teise etapiga: Drive tüübid ja Drive/Tone/Level/Mix
GET/SYX kontrollitud kogumine. Esmalt küsi praeguse firmware13 FM3-Editi
Drive Type loendi kuvatõmmist (vajadusel loendi ülejäänud osad). Olemasolev
kontrollitud tagasieksport saab olla kogumise lähtefail, kuid Drive ploki
GET/SYX vastendus ning transpordi/paigutuse kontroll tuleb enne koguja
kasutamist ette valmistada. Ära väida Drive kogujat või kirjutustuge juba
valmis olevaks. Säilita nõue üks kasutaja kinnitatud GET; ära saada SET-i.
Seejärel plaanis Delay/Reverb tüübid ja kanaliseaded ning muud efektid.
Allpool0.34.0 selle kombinatsiooni kontrollimpordi ootamine on ajalooline.

## Scene 6 Amp-kanal — 0.34.0, 2026-10-06

JB-profiili uus ampScene6 toetab kinnitatud B/C valikut. Kirjutatakse ainult
body4630; Amp-kanalite sisu ei muudeta. Scene2 jääb B-le. Amp C-d kasutavad
nüüd stseenid3/6/7: kanali C hilisem häälestamine mõjutab kõiki kolme.
Kasutaja JB_SCENE6_AMP_C.syx erineb eelmisest Reverb D/Delay ON ekspordist
ainult4630:1->2. Kaadrid/CRC/footer korras, muud body-baidid säilivad.
Tõend docs/FM3_JB_AMP_SCENE_COMPARISON.json.

Näidis examples/JB_RHYTHM_SOLO_GENERATED.spec.json ja .syx/.txt/.validation.json
ühendab Scene6 nime JB SOLO, Phaser bypass'i, Reverb D, Delay sees ja Amp C.
Scene2 rütm jääb muutmata. Valitud stseen2 säilib; kogu14222 body erineb
kasutaja ekspordist ainult valikubaidil0:1 vs5. Faili ise pole veel imporditud.
Test-jb-amp-scene.mjs kinnitab võrdluse, B/C isolatsiooni,5 vigase valiku
keelu ja Amp-kanalite sisu säilimise; varasemad JB testid läbivad.
See pole veel valmis Bonamassa soolosound ega üldine kõigi stseenide tugi.

Järgmine praktiline samm: impordi JB_RHYTHM_SOLO_GENERATED.syx FM3-Editis
senist tööd/presetikohta säilitades. Kontrolli Scene2 Amp B/Reverb B/Delay
bypass ning Scene6 JB SOLO/Amp C/Reverb D/Delay sees/Phaser bypass.
Ekspordi terve preset JB_RHYTHM_SOLO_GENERATED_export.syx. Võrdle kogu body,
päiseid ja kõiki kontrollsummasid. Varasemaid käsitsi muutmise katseid ära korda.
Pärast importi jätka kasutaja plaaniga: sobivad kanalisätted, seejärel Drive
GET/SYX kogumine ning Delay/Reverb tüübid; ära märgi neid etappe lõpetatuks.

## Scene 6 Reverb/Delay tugi — 0.33.0, 2026-10-06

JB-profiil toetab nüüd reverbScene6:"A" või "D" ning delayScene6Bypass:
true=bypass, false=sees. Algne SHA-kontrollitud JB_YDOM_RHYTHM.syx alus ning
varasemad scene6Name/phaserScene6Bypass väljad säilivad. Muudetakse ainult
vastavaid välju: Reverb kanal9538, Delay bypass7382. Scene2 ja kõik määramata
seaded, sealhulgas valitud stseen2, säilivad. Reverb B/C valikut selles uues
väljas ei toetata; Delay tüüp/kanal/parameetrid pole selle katsega laiendatud.

Sõltumatu JB_SCENE6_REVERB_D_DELAY_ON.syx erineb JB_SCENE2_SELECTED-st ainult
body0:1->5 (valitud stseen),7382:1->0 (Delay sees),9538:0->3 (Reverb D).
Kaadrid/CRC/footer korras. Näidis examples/JB_SOLO_FX_GENERATED.spec.json
ja .syx/.txt/.validation.json genereerib kõik need Scene6 efektiseaded koos
JB SOLO nime ja Phaser bypass'iga. Selle body erineb sõltumatust ekspordist
ainult0: valitud stseen2 säilitatud. Tervet SYX-i ära nimeta baitidentseks.
Uut genereeritud faili pole eraldi imporditud ega heli/CPU hinnatud.

Testid: test-jb-reverb-delay.mjs (võrdlus,4 isolatsiooni- ja8 vigast juhtu),
test-jb-scenes.mjs ja vana test-generate.mjs läbivad. Võrdlusraport
../../docs/FM3_JB_REVERB_DELAY_COMPARISON.json. Varasemad märkmed ainult kahe
JB-juhtseadise kohta on ajaloolised; vana Baaspreset-haru ei laiene.

Järgmine esimese etapi kontroll: sama kasutaja JB_SCENE6_REVERB_D_DELAY_ON.syx,
Scene6 Amp kanal B->C, muu säilita; terve eksport JB_SCENE6_AMP_C.syx.
See eraldab soolo võimendikanali rütmi Scene2 kanalist B. Olemasolev C sound
on katse, mitte veel soovitud Bonamassa sooloks häälestatud. Ära nõua juba
läbitud Reverb/Delay või stseenivaliku katse kordamist. Seejärel kontrolli
kogu body erinevusi enne Amp stseenikanali kirjutuse lisamist.

# JB generaator lisatud — 0.32.0

## JB Scene 6 kirjutustugi — 0.32.0, 2026-10-06

Kasuta `scripts/fm3-generate.mjs` uut profiili `baseProfile: "jb-ydom-rhythm"`
ainult muutmata `examples/JB_YDOM_RHYTHM.syx` failiga. SHA256 peab olema
bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca.
Spec: schemaVersion1, firmware13, name="JB YDOM RHYTHM" ning vähemalt üks
väljadest scene6Name või phaserScene6Bypass. Nimi:1–31 prinditavat ASCII märki,
äärmiste tühikuteta; phaserScene6Bypass:true tähendab bypass, false sees.
Muudetakse ainult Scene6 nime31-baidist ala (164–194, null195 säilib) ja/või
Phaser Scene6 bypass'i (9228). Valitud Scene2, presetinimi, Phaser kanal D ning
muud baidid säilivad. JB-profiil ei aktsepteeri Amp/CAB/muid juhte ega suvalist
alusfaili. Baaspreset-põhine vana generaator ja selle piirangud säilivad.

Näidis: examples/JB_SCENE6_GENERATED.spec.json ja .syx/.txt/.validation.json.
Genereeritud JB SOLO + bypass kogu14222-baidine body kattub sõltumatu
JB_SCENE2_SELECTED.syx seadmeekspordiga; JB_SCENE6_TEST suhtes erineb ainult
valitud stseeni bait0 (1 vs5). Terved SYX-failid pole baitidentsed: pakkimine
ja kontrollsummad võivad erineda. Kaadrid/CRC/footer, kõrvalbaitide säilimine,
5 isolatsiooni/piirjuhtu ja20 vigast sisendit läbivad; vana generaatori4 faili
baitidentsed,16 juhtseadise isolatsioon,8 sõltumatut eksporti ja12 vigast
sisendit läbivad. Tõendid docs/FM3_JB_GENERATOR_TESTS.json; test-jb-scenes.mjs.

Ära nõua varasemate katsete kordamist. Selle uue genereeritud faili importi
pole eraldi tehtud; body-võrdsus on failitaseme tõend. Muud nimed on offline
kontrollitud, mitte igaüks riistvaral testitud; heli/tasemed/CPU eraldi.
Allpool ja vanades raportites olev JB kirjutustoe puudumise märkus on ajalooline.

# JB Scene 6 katse lõpetatud — 0.31.4, 2026-10-06

Uus sõltumatu kasutaja eksport skills/instructions/examples/JB_SCENE2_SELECTED.syx
on võrreldud JB_SCENE6_TEST.syx-iga. Raport:
docs/FM3_JB_SCENE_SELECTION_CONFIRMED.json.
Ainus body-erinevus on offset0:5->1. Ülejäänud14221 baiti täpselt samad.
Mõlema faili kaadrid, 7-bit andmed, kontrollsummad, CRC ja footer korras.
Raw-päises ainult CRC-baidid4/5 erinevad; dump-päis säilib.
Kasutaja tegi ainult Scene6->Scene2 valiku. Selle preseti töövoos kinnitatud
valitud stseeni väli offset0: Scene6=5, Scene2=1. Teisi väärtusi pole eraldi
katsetatud. Scene6 nimi JB SOLO ja Phaser Scene6 bypass=true säilisid.

Algse JB_YDOM_RHYTHM.syx ja JB_SCENE6_TEST.syx katse on nüüd selgitatud:
Scene6 nime muutus Rhythm FX->JB SOLO (body164–195), Phaser S6 bypass0->1
(offset9228, kanal D säilis) ning valitud stseeni muutus offset0:1->5.
Kõik ülejäänud body-baidid säilisid. Ära ignoreeri offset0 vaikimisi:
raporteeri valitud stseeni muutus eraldi. Ära palu neid katseid korrata.

Generaator on endiselt muutmata; uut stseeninime ega Phaser bypass'i kirjutust
pole veel lisatud. Järgmine arendusetapp on nende kahe tõendatud välja
piiratud kirjutustugi, algse JB-faili SHA-kontrolli ning olemasolevate
sõltumatute eksportidega võrdluse alusel. Valitud stseeni säilita vaikimisi.
Ära üldista tõendit kõigile stseenidele/plokkidele/baasidele ilma testita.
Heli, tasemed ja CPU pole selle failikatsega hinnatud.
Allpool0.31.3 ja0.31.2 puudujäägid/ootavad sammud on ajaloolised ja lahendatud.

# JB Scene 6 võrdlus — 0.31.3, 2026-10-06

Algne JB_YDOM_RHYTHM.syx on nüüd olemas examples/ kaustas koos
JB_SCENE6_TEST.syx-iga (täisteed skills/instructions/examples/ all).
Tõendid: docs/FM3_JB_SCENE6_COMPARISON.json.
Mõlema faili kaadrid, 7-bit andmed, kontrollsummad, CRC ja footer läbivad.
14222 body-baidist muutus 11: Scene 6 nimealas 164–195 üheksa baiti
(Rhythm FX -> JB SOLO), Phaser S6 bypass-sõnas offset9228 üks bait 0->1,
ning offset0 üks bait 1->5. Phaser kanal D säilis. Kõik muud body-baidid
säilisid täpselt; raw-päises erinevad ainult CRC-baidid4/5, dump-päis sama.
Ära väida, et muutusid AINULT nimi ja bypass: offset0 tähendus on seni
valimata stseeni indeksi hüpotees, mida varasem katse samuti ei kinnitanud.
Generaator ja olemasolevad kirjutuspiirangud muutmata.

Järgmine üks riistvarasamm: laadi JB_SCENE6_TEST.syx, vali Scene 2,
ära muuda ühtegi seadistust ning ekspordi terve preset
JB_SCENE2_SELECTED.syx. Võrdle JB_SCENE6_TEST failiga: eesmärk on eristada
pelga stseenivaliku mõju (oodatav kandidaat offset0 5->1). JB SOLO nimi
ja Phaser S6 bypass peavad säilima. Ära palu juba tehtud muutmiskatset korrata.
Allpool0.31.2 algfaili puudumise märkus on ajalooline, puudujääk lahendatud.

# JB Scene 6 katse — 0.31.2, 2026-10-06

Kasutaja tagasieksport on `skills/instructions/examples/JB_SCENE6_TEST.syx`.
Kontrolliraport: `docs/FM3_JB_SCENE6_INSPECTION.json`.
24680 baidi kaadrid, 7-bit andmed, kaadrikontrollsummad, CRC ja footer korras.
Dekooder loeb presetinimeks JB YDOM RHYTHM, Scene 6 nimeks JB SOLO ning
Phaser Scene 6 kanaliks D, bypass=true. Need on selle faili lugemistulemused.
Algne JB_YDOM_RHYTHM.syx puudub nii praegusest paketist kui tehtud failiotsingu
vastustest. Seetõttu pole enne/pärast võrdlust, kõrvalmuudatuste puudumise
kinnitust ega uue kirjutusfunktsiooni valideerimist. Generaator muutmata.
Järgmine samm: palu kasutajal lisada algne JB_YDOM_RHYTHM.syx, ilma seda
uuesti muutmata. Ära palu JB_SCENE6_TEST katset korrata. Võrdle kogu body ja
päised, loetle kõik erinevused; alles siis otsusta kirjutustoe lisamine.

# Prioriteedi uuendus 2026-10-01

Audit on säilitatud kõrvalharuna. Ära jätka seda automaatselt: presetigeneraatori eesmärkide ja kiirema valideerimistee jaoks loe `FM3_SYX_STRATEGY.md`. Alljärgnev on 2026-09-25 auditiseis; uus prioriteet ei muuda selle tõendite staatust.

# FM3 auditi jätkupunkt

Repo: /Users/multimeedia/Documents/Projects/mcp-midi-control
Branch: main

## Viimane lõpetatud audit enne LENGTH4 tööd

CABINET_LENGTH3, paramId 72  
Commit: 7fee7f4  
FM3 Cab 1: effectId 62  
GET vastus: kind=set_echo, value=0  
Aadress ja lugemine valideeritud.  
Enum mapping/count: unverified.

## CABINET_LENGTH4 / paramId 73 – senine tööseis

Repo tõendid:
- `CABINET_LENGTH4` on `packages/fractal-midi/src/gen3/fm3/params.ts`-is olemas.
- Git-ajalugu näitas lisamist commit'is `12e3bb7` (`0.4.0`); kommentaar ütleb ainult, et üksus on tuletatud AxeEdit III XML-i controlType'ist.
- `ranges.ts`-ist parameetri 73 kirjet ei leitud.
- FM9 ranges-andmetes on 70 ja 71 enum-count 2, kuid 72 ja 73 on tühjad/float-tüüpi kirjed; see ei kinnita FM3 tähendust.
- FM3 kataloogis on 73 nimetusega `CABINET_LENGTH4`, kuvamärgendiga `IR Length`, kuid see on kataloogi-/XML-põhine määratlus.

Riistvaralugemine 2026-09-25:
- FM3 port: `/dev/cu.usbmodem11104`
- Saadetud ainult read-only fn=0x1F Cab bulk GET:
  `F0 00 01 74 11 1F 3E 00 35 F7`
- Vastus: Cab effectId 62, itemCount 424, dekodeeritud väärtusi 424, kokku 4 frame'i.
- Kandidaatindeksid, kasutades stride 106:
  - kanal A: indeks 73, raw=0
  - kanal B: indeks 179, raw=0
  - kanal C: indeks 285, raw=0
  - kanal D: indeks 391, raw=0
- Bulk-lugemine ja ploki vastuse kuju valideerusid.
- ParamId 73 sidumine neljanda IR-pesaga, enum-count ja väärtuste tähendus jäid valideerimata.
- Toorväljundi terminali koopia salvestati faili:
  `samples/captured/fm3-cab-length4-bulk-20260925-ey6khx`

## Järgmine samm

Ära saada uut riistvarapäringut enne repo tõendite ülevaatamist. Jätka käsuga:

```bash
sed -n '495,545p' /Users/multimeedia/Documents/Projects/mcp-midi-control/packages/fractal-midi/catalog/fm3.json 2>&1 | tee /dev/tty | pbcopy
```

Seejärel kontrolli, kas kataloogi metadata sisaldab paramId 73 kohta range'i, enum-count'i või ainult XML-ist tuletatud nimetust.

## Reeglid

- Ainult GET/read-only audit.
- Ära kasuta ega soovita SET-käske.
- Üks tehniline samm korraga.
- Vasta eesti keeles.
- Ära väida otsest ligipääsu kohalikule repole ega FM3-le.

Node24:
`/opt/homebrew/Cellar/node@24/24.19.0/bin/node`

