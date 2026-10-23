# MODE1: PID0x3a16 op10 raja kitsendamine, 22.10.2026

Alus: kohalik commit `a643472ab60af870dbdc7dc5e371836ef7d59044` ja tööaruande
versioon 21. **Tootmisplugin 0.3.13. Uusi füüsilisi eksporte 0.**

## Tulemus ja tõendi piir

`0x80ea77` annab kutsele `0x80f751` kindlad argumendid **op10 / PID0x3a16**.
Nende põhjal on suure callback-funktsiooni vaadeldav juhtvoog kitsendatud
**360 käsupiirile ja 85 kontrollitud konstantsele harutingimusele**.
Sama piiratud kontroll tehti rekursiivselt kutsutava **op9 / sama PID** jaoks.
Kuue ülejäänud haru mõlemad alternatiivid säilitati konservatiivselt.

Selles läbivaadatud callback'i käsukogumis otseseid MODE1 kirjutusi pole.
Järele jäävad kolm otsest kutsesihti:

| Kutsekoht | Siht | Tähendus selles analüüsis |
|---|---|---|
| `0x81035a` | `0x8244fb` | Üldine parameetrikäsitleja: type1 täisarvuväli, seejärel kuvanäidu vormindamine. |
| `0x810275` | `0x80f751` | Sama PID tingimuslik korduskutse, **op9 / float 1.0**. |
| `0x80ff97` | `0x80f729` | Varem uuritud ajastatud callback'i registreerimisrada. |

**See ei sulge kogu kutsuja MODE1-mõju.** Vormindaja kasutab jagamisabi,
mille üks tagastuskodeering vajab sõltumatut täpsustamist. Samuti jäävad
välise `0x80ea77` teised alamkutsed eraldi kontrollimata. Auditis on
`selectedCallbackTransitiveClosureProven=false`, `whole80ea77Proven=false`
ja `runtimeModeAtStoreProven=false`. **6.47 jääb blokeerituks.**

## Kindlad argumendid, kirjeldus ja väärtuse rada

- `0x80eadf`: R12=10; `0x80eae1`: R8=0x3a16;
  `0x80eae3`: kutse `0x80f751`.
- Callback viib PID R15-sse (`0x80f78a`) ja operatsiooni R9-sse
  (`0x80f780`, paralleelne registriülekanne).
- Staatilise kirjeldustabeli alus on `0x807d65b8`, kirje suurus 36 baiti.
  PID0x3a16 kirje asub **0x808590d0**.

| Kirjelduse väli | Kontrollitud väärtus |
|---|---|
| Objekti välja baitnihe | `0x557c` |
| Tüübi-/vormingusõna | `0x10`: type1, vormingu- ja täpsusnibble'id 0 |
| Min / Max, float32 | 0 / 65520 (`0x477ff000`) |
| Kuvaskaala | 1.0 |
| Valikulise silditabeli viit | 0 |

Üldkäsitleja type1 tabelikirje viib `0x824a2a` kaudu täisarvuabisse
**0x823785**. Selle operatsioonitabel `0x282e75b8` annab:

| Operatsioon | Valitud haru | Piiritletud tegevus |
|---|---|---|
| 10 | `0x8237f1` | `R1 = R1 + 1`, seejärel ühine MIN/MAX piiramine. |
| 9 | `0x8237aa` | `R1 = TRUNC F0`, seejärel sama piiramine. |

Kirjutus `0x8237b6` on 16-bitine. Neil kahel valitud täisarvuteel ei ole
MODE1 kirjutusi ega uusi funktsioonikutseid. See ei ole Min/Max op82
teisendus ega tõend kõigi loenduri võimalike mäluväärtuste käitumise kohta.

Pärast üldkäsitlejat loetakse `0x810260` juures objekti normaalne sõna
nihkest `0x155f × 4 = 0x557c`. `0x810266` teeb **märgita** võrdluse
`0xfff0` ehk 65520-ga. Kui sõna on sellest väiksem, hüpatakse edasi;
muul juhul valmistatakse ette **op9 / PID0x3a16 / float32 1.0**
(`0x3f800000`) ning kutsutakse `0x80f751` uuesti.

Mõlemad dünaamilise piirikontrolli alternatiivid on kaasatud. Rekursiooni
lõppemist, suvaliste rikutud mäluväärtuste käitumist ega asünkroonseid
muudatusi ei tõendata. +1 haru leidmine ei anna alust kogu väärtusvahemiku
käitumist oletada.

## Vormindaja ja varasema tõenduse täpsustus

Valitud type1 rada jõuab kuvanäidu vormindajani **0x825ebd**. Selle keha
läbivaatus ei leidnud otseseid MODE1 kirjutusi, kuid selle alamkutsed on:

- `0x1cbc4a`: arvutusabi; vaadeldud käsud ei kirjuta MODE1-d;
- `0x833c86`: eelmises etapis uuritud MODE1 salvestav/taastav abi;
- `0x1cb13a`: jagamisabi, mille taastamisalgebra oli varem kontrollitud;
- `0x833650`: stringipikkuse abi; vaadeldud käsud ei kirjuta MODE1-d.

Üldkäsitleja valikuline sildikopeerimine `0x833632` on selle staatilise
kirjelduse korral välistatud: kirje +28 sõna on 0, `0x824943` teeb
LEFTZ(0), tulemus 32 seab SV ja `0x824945 IF SV` hüppab epiloogi.
See ei toetu ainult vanema dekoodri puudulikule p-code'i lipumudelile.
SHARC+ juhendi §24–14 ja ASTATX.SV kirjeldus toetavad nulli kontrolli.

**Oluline parandatud ebakindlus:** eelmise etapi kompaktse tagastuse
kodeeringuküsimus puudutab ka jagamisabi `0x1cb13a`, mitte ainult
katkestuse lõppu. Parcel **0x0afe aadressil 0x1cb17a** on vanema dekoodri
järgi RTS(DB); järgnevas viitealas asub MODE1 taastamine. Selle vormi
vastavus SHARC+ Type11c joonisele ei ole veel sõltumatult lahendatud.

Seetõttu täpsustati ka varasemat `modifier-mode-audit.json`-i:

| Väli | Nüüdne tähendus |
|---|---|
| `helperPreservation.division` | `null`: natiivse tagastuse terviktõend lahtine; ei tähenda leitud rikkumist. |
| `divisionRestorationAlgebra` | `true`: kirjeldatud taastamistoimingute algebra läbib kontrolli. |
| `divisionNativeReturnSemanticsProven` | `false` |
| `modePreservedFromEntryToStore` | `null`: sõltub sama jagamisabi tagastusest. |
| `conditionalRestorationModelPreservesMode` | `true` |

Varasema aruande tugevamat säilimisväidet tuleb lugeda selle parandusega.
Matemaatilist kandidaati ega mõõdetud raw-sõnu ei muudetud. Tegu on
**tõendustaseme paranduse**, mitte avastatud FM3 seadmeveaga.

## Taasesitus ja kontrollid

Uus uurimiskood `tools/fm3/modifier_op10_audit.py` kontrollib:

- 11 räsiga piiritletud firmware'i koodi-/andmepiirkonda;
- kindlaid argumente, kirjelduskirjet, tabelisihte ja valitud kriitilisi operande;
- kõiki valitud callback'i otseseid hüppeid/kutseid ja kahekäsulisi viitealasid;
- 85 haruvõrdlust nii op10 kui op9 korral, sõltumatute operandilugejatega;
- tundmatute tingimuste mõlemat haru ning puuduva sihi/viiteala tagasilükkamist.

Registrite elusolek, tavaline skalaarne ABI, korrektne mälu ning
mitte-juhtkäskude MODE1 kirjutuste puudumine põhinevad räsiga seotud
käsitsi läbivaatusel. See pole kõigi käskude semantiline emulaator.
Väljaspool PID0x3a16 ja operatsioone 9/10 sisendid lükatakse tagasi.

Läbis **7 uut testi**, **8 kutsujate testi**, **9 MODE1 testi** ja
**6 Min/Max-taotluse testi** — kokku **30 testi**. Uue auditi loomine ja
sõltumatu taasesituskäik läbisid; täpsustatud MODE1 audit loodi uuesti.
See ei ole uus täielik CI ega eelmiste SYX- või seadmekatsete kordus.

```sh
python3 tools/fm3/test-modifier-op10.py
python3 tools/fm3/modifier_op10_audit.py --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

Allikad: olemasolev FW13 SYX/LDR (täisräsid checkpoint-failis), varasemad
REA/Ghidra tulemused taustaks ning
[Analog Devices SHARC+ Core Programming Reference, rev 1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf).
Juhendi SHA-256:
`a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.
See oli **uus staatiline analüüs; uut REA dekompileerimist 0**.

## Järgmine samm

Suurima mõjuga järgmine töö on **kompaktse tagastuse kodeeringu sõltumatu
lahendamine**, hõlmates `0x0abe`, `0x0afe` ja jagamisabi viiteala.
Sama küsimus mõjutab nii kuvanäidu vormindajat kui ka varasemat
paketist-salvestuseni tõendit. Kasutada esmalt olemasolevat firmware'i,
SHARC+ käsuformaate ja võrreldavaid tagastuskohti.

Alles jäävad ka `0x80ea77` teised alamkutsed `0x833a5c`, `0x824d84`,
`0x82b744`, `0x1cb1d6`, teised coreTask'i funktsioonid ja katkestuse lõplik
wrapper. Selle sammu jätkamiseks **uut füüsilist eksporti ei ole põhjendatud**.
`fullRangeEncodingProven=false`, `generatorWriteSupportAdded=false`.
