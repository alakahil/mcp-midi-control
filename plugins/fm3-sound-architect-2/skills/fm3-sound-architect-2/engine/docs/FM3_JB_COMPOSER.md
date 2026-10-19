# Bonamassa ühine presetikoostaja ja ajalugu

**Praegune versioon 0.49.0:** kõik senised plokigeneraatorid on ühendatud
ühise `jb-composer` kirjeldusega. Toetatud on kuus kinnitatud alust nelja
plokipaigutusega, sealhulgas tasakaalustatud Bonamassa eksport.
Ajakohtane ulatus, alusfailid, piirangud, testid ja üks järgmine seadmekatse:
[ühise koostaja juhend](FM3_COMPOSER_UNIFIED.md).
Allpool0.48.x peatükid kirjeldavad arengulugu, mitte praeguse koostaja
ühe aluse või ainult Drive/Delay/Reverbiga piirdumist.

2026-10-08. Üks `jb-composer` kirjeldus ühendab olemasoleva Amp/Cab-,
Drive-, Delay-, Reverb- ja Scene 6 toe. Filter ei ole järgmine automaatne
kogumisülesanne. Esmalt kontrollitakse ühist Bonamassa rütmi- ja soolopresetit.

## Tasakaal ja viimane seadmering kinnitatud — 0.48.5, 2026-10-08

Kasutaja kinnitas pärast +1dB peenhäälestust „Nüüd sobib”. Scene2/6
kuuldav tasakaal on tema praeguses seadistuses heaks kiidetud. Lõplikku
mõõdikunäitu pole antud; seda ei arvutata varasemate näitude järgi.

`JB_RHYTHM_LEVEL_MINUS3_export.syx` kõik14 222 lahtipakitud kehabaidi
kattuvad genereeritud failiga täpselt. Amp B Level -3dB (raw50461),
Scene6, routing, kõik kanalid ja bypass, nimi ning valitud Scene2 säilivad.
Kontrollsummad, CRC ja footer läbivad. Failide erinevus on tihendatud
esituses ja CRC-s; muud päised säilivad ning lõputäide on nullidega.
Generaator taastab aktsepteeritud katse baitidentselt.
Raport `FM3_JB_RHYTHM_LEVEL_MINUS3_HARDWARE_ROUNDTRIP.json`.
Ekspordi SHA-256 `a7262b9703e23d3641be39344e13472b9b7ccd509305e08f76d3db1677cb97b3`.

Ühise preseti seadmeringi ja rütmi/soolo tasakaalu etapp on lõpetatud;
sama eksporti ega tasemekatset ei korrata. Allpool0.48.4 ootel staatus
on ajalooline. See ei kinnita kõiki generaatori kombinatsioone, CPU-d,
eraldi Delay/Reverbi sobivust ega täpsust loo salvestuse suhtes.
Järgmine laiendus valitakse konkreetse helisoovi järgi, mitte automaatse
Filteri kogumisena. Generaatori kood ja toetatud ulatus jäid samaks.

## Viimane +1 dB peenhäälestus — 0.48.4, 2026-10-08

Pärast Amp B -4dB katset teatas kasutaja Scene2 OUTPUT 1 Left/Right näidu
-3dB ning soovis veel1dB tõstet, mille järel oleks tase tema hinnangul sobiv.
Uus `JB_RHYTHM_LEVEL_MINUS3.syx` seab Amp B Leveli -3dB. Muutub ainult
Scene2 kasutatava Amp B Leveli sõna (keha4946/4947, raw49806 ->50461).
Scene6 ja ülejäänud14 220 kehabaidi säilivad. Päises muutuvad nimi, CRC
ja tihendatud pikkus4926 ->4924; faili tervikluskontrollid läbivad.
Raport `FM3_JB_RHYTHM_LEVEL_MINUS3.json`.

Kasutaja sobivushinnang on tingimuslik soovitud +1dB suhtes. Uue faili
import/kuulamine ja tagasieksport on OOTEL. Kui +1dB sobib, vali Scene2
ning saada terve `JB_RHYTHM_LEVEL_MINUS3_export.syx`. Varasemate katsete
eksporte pole vaja. Mõõdikunäit ei ole Amp Level ega kinnita uue faili
lõpptulemust. See jaotis asendab allpool vanema katse järgmise sammu.

## Rütmi teine tasemekatse — 0.48.3, 2026-10-08

Kasutaja täpsustatud OUTPUT 1 Left/Right näidud pärast esimest katset:
Scene2 umbes -13dB ja Scene6 umbes +2 kuni +3dB. Viimane sõnum kinnitab
Scene2 miinusmärki. Kasutaja palus rütmi veel umbes8dB tõsta, soolo säilitada.
Need näidud ei ole Amp Level väärtused ega tõenda konkreetset dBFS skaalat.

`JB_RHYTHM_LEVEL_MINUS4.syx` määrab Amp B Leveli -4dB: +8dB võrreldes
eelmise -12dB katsega, kokku +14dB algsest -18dB väärtusest. Ainult Scene2
kasutab Amp B-d; Scene6 jääb muutmata. Võrreldes eelmise failiga muutuvad
ainult keha baidid4946/4947 (raw44563 ->49806), muud14 220 baidi säilivad.
Päises muutuvad nimi, CRC ja tihendatud pikkus4924 ->4926; uus pikkus
ja nulltäide on kontrollitud. Raport `FM3_JB_RHYTHM_LEVEL_MINUS4.json`.

Failitaseme kontroll läbis. Uue katse kuulamine ja seadmering on OOTEL.
Eelmise katse kasutamist kinnitavad kasutaja mõõdikunäidud; binaarset
tagasieksporti sellele veel pole. Lõplik tasakaal, efektide sobivus ja CPU
pole kinnitatud. Võrdle sama fraasi sama mängutugevusega ning tagasta
mõlema stseeni OUTPUT 1 Left/Right näidud ja kuulamishinnang. Kui sobib,
vali Scene2 ja ekspordi `JB_RHYTHM_LEVEL_MINUS4_export.syx`.
Vahekatsete järel eksporti ei nõuta. Allpool0.48.2 staatus on ajalooline.

## Kuulamistagasiside ja tasemekatse — 0.48.2, 2026-10-08

Kasutaja hinnangul on Scene2 võrreldes soolo Scene6 ja teiste stseenidega
liiga vaikne. Scene2 näit oli ligikaudu -19dB; mõõdiku asukohta/liiki
ja Scene6 näitu pole antud. Soolo peab olema ainult veidi valjem.
Seega ei ole kuuldav tasakaal kinnitatud, kuigi eelnev seadmering läbis.

Esimene paranduskandidaat `JB_RHYTHM_LEVEL_PLUS6.syx` tõstab Amp B Leveli
-18dB pealt -12dB peale. Seda kanalit kasutab ainult Scene2. Tõendatud
on muutus ainult ühes 16-bitises parameetrisõnas; kõik muud kehabaidid,
sealhulgas Scene6, säilivad. Raport `FM3_JB_RHYTHM_LEVEL_PLUS6.json`.
Uus nimi on JB RHYTHM LEVEL +6; uue faili kuulamine/seadmering on OOTEL.

+6dB on esimene katse, mitte Scene6 teadmata näidust arvutatud lõpptulemus.
Võrdle mõlemat stseeni sama fraasi ja sama mõõdikuga, seejärel häälesta
edasi kasutaja hinnangu järgi. Sobiva taseme järel kogu üks tagasieksport.

Fractali ametliku juhendi lk62–63 soovitab tasakaalustamiseks Amp Leveli
ning võrreldes sama mängumaterjali ja kuulamise kasutamist. Mõõdikute eri
skaalasid ei tohi segi ajada; järelasuvad dünaamilised/mitte-lineaarsed
plokid võivad nõuda eraldi kontrolli. Käesolev muutus on kuulamiskatse.
Allikas: https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf

## Seadmering kinnitatud — 0.48.1, 2026-10-08

Kasutaja näidise `JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx` kõik 14 222
lahtipakitud kehabaidi kattuvad genereeritud failiga täpselt. Amp/Cab,
Drive/Delay/Reverb/Phaser kõik kanalid, routing, stseenid, bypass,
nimi ja valitud Scene 2 säilivad. Kontrollsummad, CRC ja footer kehtivad.
Toorpäises muutusid ainult CRC baidid; tihendatud esitus erineb, mõlema
lõputäide on nullidega. Raport: `FM3_JB_COMPOSER_HARDWARE_ROUNDTRIP.json`.
Regressioon: `scripts/test-jb-composer-hardware.mjs`.

See kinnitus asendab allpool selle konkreetse katse impordi/tagasiekspordi
ootamise. Sama katset ei korrata. Üldkombinatsioonide, heli, tasemete
ning CPU kohta sellest lisakinnitust ei teki. Kasutaja pole veel
kuulamishinnangut saatnud; järgmine samm on rütmi/soolo tasakaalu ja
Delay/Reverbi sobivuse hindamine. Generaatori sisendipiirangud säilivad.

## Käivitamine

Plugina `skills/instructions` kaustast:

```bash
node scripts/fm3-generate.mjs examples/JB_YDOM_RHYTHM.syx examples/JB_UNIFIED_RHYTHM_SOLO_TEST.spec.json /absolute/new/output-stem
```

Väljundid: `.syx`, `.txt`, `.validation.json`. Sama nimega väljundite
ülekirjutamine on keelatud. Sisendiskeem `scripts/fm3-spec.schema.json`.
Skript ei suhtle FM3-ga. Alus on ainult täpse SHA-256-ga
`bffe9dd559b443ebe3822532e951a27cb0a827600cb929d52dfccd3228d611ca`
fail `JB_YDOM_RHYTHM.syx`, firmware 13.

## Toetatud väljad

Ühised: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-composer"`,
`name` (1–31 prinditavat ASCII märki), valikuline `purpose`.

| Valik | Ulatus |
|---|---|
| `ampModelB` | Olemasoleva kataloogi täielik Amp B kanalimall; malliräsi kontroll. |
| `cabModelB` | 45 kinnitatud täielikku Dyna-Cab B malli. Täpsed nimed olemasolevast skeemist. |
| `driveChannels` | 1–4 kordumatut A–D kanalit, 87 täismalli; olemasolevad mõõdetud type/channel/value juhtseadiste kombinatsioonid. |
| `delayChannels` | 1–4 kordumatut A–D kanalit, 27 täismalli. |
| `reverbChannels` | 1–4 kordumatut A–D kanalit, 79 täismalli. |
| Amp B väärtused | `gainB`, `bassB` ainult 4/5/6/7; `midB`, `trebleB`, `presenceB` 0–10; `levelB` −80…20 dB. Varasema kirjutustoe ulatus. |
| Delay A väärtused | `delayMixA` 0–100%, `delayTimeMs` 50–1000 ms, `delayFeedback` 0–50%, `delayTempoA:"NONE"`. Ainult Deluxe Mind Guy (ID14), ka pärast tüübimalli valikut. |
| Reverb A väärtused | `reverbMixA` 0–100%, `reverbTimeS` 0.5–5 s, `reverbPredelayMs` 0–100 ms, `reverbPredelayTempoA:"NONE"`. Ainult Room: Large Room (ID2). |
| Olemasolevad stseeniväljad | `scene6Name`, `phaserScene6Bypass`, `ampScene6` B/C, `reverbScene6` A/D, `delayScene6Bypass`; lisaks `delayScene2` (true = sees), `reverbScene1` A/B. |

Aja muutmisel peab vastav Tempo NONE olema samas kirjelduses selgesõnaline.
Delay/Reverbi teiste tüüpide skaalaülekirjutused tõrjutakse; tüübimalli
olemasolu ei tõenda üksikparameetrite tähendust. `cabScene2` pole uues
profiilis toetatud: vana profiili nimepõhine valik eeldas vana aluse
kanalinimesid, kuid JB B-kanalis on Rumble EV12L. Kasuta `cabModelB`.

Määramata seaded säilivad alusfailist. Täismallid rakendatakse enne
üksikparameetreid ja stseenivalikuid. Sama kanalit kasutavate teiste
stseenide heli võib muutuda; TXT ja raport loetlevad tegelikud kasutajad.
Amp/Cab B ja kõigi kanalite valikute tuge ei laiendata automaatselt
teistele aluspresetitele. Amp C scalar-kirjutust ega eraldi soolotõstet
ei ole lisatud; Amp C senine Level ja seadistus säilivad.

## Teostus ja tõendid

`scripts/fm3-jb-composer.mjs` kasutab olemasolevaid Amp/Cab lahendajaid,
kolme efektigeneraatorit ning JB stseenigeneraatorit. Iga efektigeneraator
saab algse lubatud aluse; ühisesse kehasse kopeeritakse terve küsitud
kanali piirkond. Vahefaili räsi ei lisata lubatud aluste hulka ja vanu
generaatorite piiranguid ei eemaldata. Uus koostaja kontrollib ka Drive
registri räsi ning kasutatud toor-GET/SYX paare; Delay/Reverb kontrollib
neid juba olemasolevas moodulis. Amp/Cab kasutavad senist mallide
kontrollimist, Amp vaikeregister on lisaks SHA-ga piiratud.

Struktuurne kontroll kasutab tõendatud plokipäiseid. Ülddekoodri nihkes
`params_offset` välju ei kasutata kirjutusaadressina. Terve väljundkeha
peab vastama koostatud oodatud kehale; lubatud piirkondadest väljaspool
peavad säilima kõik baidid, sealhulgas routing ja algne valitud stseen 2.
Nimeväljale ja CRC-le lisaks ei muudeta toorpäiseid. Kontrollitakse ka
SysEx-kaadrite kontrollsummasid, CRC-d ja footer'it.

Senised skalaaride definitsioonid eraldati muutmata kujul
`scripts/fm3-controls.mjs` faili, mida kasutavad mõlemad generaatorid.
Kõik neli varasemat põhigeneraatori näidisfaili jäid baitidentsed;
8 sõltumatu Gain/Bass ekspordi kehavõrdlused ja 16 isolatsioonikatset läbivad.

Ühise koostaja test `scripts/test-jb-composer.mjs`, raport
`FM3_JB_COMPOSER_TESTS.json`:

- Varasema `JB_RHYTHM_SOLO_GENERATED.syx` täpne baitidentne taastamine.
- Selle varasema seadme tagasiekspordiga kõik 14 222 kehabaidi kattuvad.
- Uue näidise võrdlus sõltumatult koostatud oodatud kehaga, kõikide
  soovimatute kõrvalmuudatuste puudumine ja rütmi Amp/Cab säilimine.
- 31 komponentide kombinatsiooni, 16 isoleeritud juhtseadist,
  3 mall+parameeter juhtumit, üks päiseotsingu konfliktne Cab-tüüp,
  37 vigase sisendi/alusfaili tõrjumist ning sisendobjektide säilimine.

GitHubi kontrollitud kood:
https://github.com/sKuhLight/forgefx-midi/blob/553d24b7409302908d5c7e46a71b45e07dffdc05/src/devices/gen3/presetAuthor.ts
Kasutatakse senist kaasasolevat kodeerijat ja litsentsifaile. Selle mooduli
`swapBlockType` muudab ainult tüübi-ID-d; seda ei kasutata täismallide
asemel. GitHubi väidet võimalikust seadmekõlblikkusest ei loeta meie
uue kombinatsiooni riistvaratõendiks. Välissõltuvuse versiooni ei uuendatud.

## Kasutajale antav näidis ja järgmine samm

`examples/JB_UNIFIED_RHYTHM_SOLO_TEST.syx` ja kaasnev TXT/spec/raport.
SYX SHA-256 `19953730a62fb5a5c59f7069d99320030457e9ea4f200d5800e70eb457b2d6a3`.
Nimi `JB UNIFIED R-S TEST`; võrreldes JB alusega 59 muutunud kehabaidi.

Scene 2 rütm säilitab Brit Silveri Amp B kõik baidid ja Rumble EV12L
Cab B kõik baidid, Delay ja Drive on bypass. Scene 6 `JB SOLO` kasutab
säilinud Amp C USA MK IV Lead Bright, Drive B T808 OD (2/7/2/25%),
Delay A Deluxe Mind Guy (soov 400 ms, tegelik kodeeritud tagasilugemine
399.91 ms; Feedback 25%, Mix 15%, Tempo NONE), Reverb D Medium Roomi
kogutud täismalli ning Phaser bypass'i. See pole uus valmis heliline
Bonamassa lähendus: uue kombinatsiooni heli, tasemed ja CPU on OOTEL.

Kasutaja impordib tööpuhvrisse, kontrollib Scene 2 ja 6, kuulab, valib
tagasi Scene 2 ja ekspordib terve preseti
`JB_UNIFIED_RHYTHM_SOLO_TEST_export.syx`. Võrdle kõiki kehabaite, päiseid,
stseene, kanalivalikuid, bypass'i ning kontrollsummasid. Ära normaliseeri
erinevusi vaikselt. Algne valitud stseen on body offset 0; kui see muutub,
raporteeri eraldi. Pärast seadmeringi vali järgmised parameetrilaiendused
kuulamishinnangu järgi, seejärel Filter. Varasemat kogumist ei korrata.
