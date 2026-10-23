# MODE1 mälutaastus, MMASK ja staatuspinu, 22.10.2026

Alus: commit `cc073707561e79b633dd41ce90caccf9b4e88e1a`, tööaruande
versioon 28 ja sama olemasolev FW13 binaar. **Tootmisplugin 0.3.13.**

## Uus tulemus ja selle tähendus

Algseadistuse käsk **`0x8343ef` kirjutab MMASK = `0x00e0b003`**.
Tootja käsiraamatu järgi salvestab PUSH STS kõigepealt senise MODE1
staatuspinu kirjesse ja kustutab seejärel elavast MODE1-st MMASK-is
märgitud bitid. Sama maskimismehhanism rakendub katkestusse sisenemisel.
Seega ei piisa üksnes MODE1 ja MODE1STK otseste kirjutuste otsimisest.

Selles maskis on **TRUNCATE=1 ja RND32=0**. Kui sama MMASK kehtib
salvestamise hetkel, kustutatakse elava MODE1 TRUNCATE-bitt, kuid
RND32-bitt säilib. Mask **ei lülita 40-bitist arvutust 32-bitiseks**.

| Sisenev arvutusrežiim | Staatuspinu salvestatud režiim | Elav režiim pärast PUSH-i | Pärast sama kirje POP-i |
|---|---|---|---|
| 40-bitine, lähim ümardus | 40-bitine, lähim | 40-bitine, lähim | Algne |
| 40-bitine, kärpimine | 40-bitine, kärpimine | 40-bitine, lähim | Algne |
| 32-bitine, lähim ümardus | 32-bitine, lähim | 32-bitine, lähim | Algne |
| 32-bitine, kärpimine | 32-bitine, kärpimine | 32-bitine, lähim | Algne |

Tabel on kontrollitud bitialgebra, mitte uus seadmemõõtmine.
Üldkuju on `saved = incoming; live = incoming & ~MMASK; POP: live = saved`.
Enne salvestamist kehtinud sõna säilib ka siis, kui mask kustutab
elavast sõnast kõik bitid. Tööriist kontrollib seda sümboolsete
avaldistega, mitte üksnes nelja näitesisendiga.

**MMASK-i tööaegset muutumatust ei ole tõendatud.** Kontrollitud on
algseadistuse konkreetne operand ja selle tingimuslik mõju. Startup'i
lähedal olevad MODE1 CLR/SET käsud määravad algselt 32-nearest bitid;
sellest ei tuletata automaatselt salvestuskoha `0x823bb4` tööaja režiimi.

## Mälust taastamise uus kontrollpunkt

| Koht | Kontrollitud operand | Tõendi piir |
|---|---|---|
| `0x837b5a` | `DM(I7,M7) = MODE1`, postmodify, normal word | Salvestamiskoht; frame'i kogugeomeetriat ei tõendata |
| `0x837bad` | `MODE1 = DM(-13,I6)`, Type15b, normal word | Baidaadressi korral I6−52; loetava sõna päritolu jääb avatuks |
| `0x830ae3` | `USTAT1 = DM(37,I7)`, Type15b, normal word | Valitud task'i MODE1 väli, baidaadressi korral I7+148 |
| `0x83082e` | `POP STS` | Ajastaja ettevalmistatud staatussõna rakendamine |
| `0x830c40` | `PUSH STS` | Ka elava MODE1 maskimine, mitte ainult kirje lisamine |
| `0x830c43` | `MODE1STK = USTAT1` | Valitud task'i sõna kirjutamine pinu tippu |

`0x837bad` on otsene täissõna kirjutus MODE1-sse, mida eelmise etapi
registriülekannete sõel ei hõlmanud. Lähedase salvestamiskoha olemasolu
ei tõenda veel, et loetakse sama rikkumata sõna: kontrollida tuleb
frame'i alust, I7 muutusi ja võimalikke kattuvaid mälukirjutusi.
**Selle funktsiooni MODE1 säilitamist ei kinnitata.**

Type15b lugeja eristab DM-i ja PM-i, salvestamist ja laadimist,
normal-word ja long-word lippu ning signed7 nihet. PM valiku bitiks
on 5 ja selle indeksid on DAG2-s I8–I15. Nihke byte-arvuks teisendamine
ei toimu pimesi: −52 ja +148 kehtivad siin normal-word juurdepääsu
baidaadressi korral. Muude mäluruumide ja paarisregistrite kasutust
ei muudeta sama eeldusega tõendatuks.

## Ajastaja tagastuse mudel

Varasem katkestusaudit taasesitati algse firmware'i vastu ja andis
**täpselt sama tulemuse**. Uus mudel täiendab seda PUSH-i ajal toimuva
elava MODE1 muutusega:

1. PUSH salvestab siseneva sõna ja maskib elava MODE1.
2. MODE1STK kirjutus asendab pinu tipus oleva sõna valitud task'i sõnaga.
3. Kaks RTS-i jätavad staatuspinu puutumata.
4. **Eeldatud RTI semantika korral** rakendatakse valitud task'i sõna.

RTI kandidaat **`0x1cbc0c`** on endiselt kompaktse kodeeringu hüpotees.
Käsupiiri kinnitamine ei kinnita iseenesest selle opcode'i semantikat.
Mudel tõendab oma eelduste korral valitud task'i sõna rakendamise ning
välise staatuspinu säilimise; see ei tõenda katkestatud task'i ja
valitud task'i sõnade võrdsust. Kehtiv frame/pinu, korrektne vektor,
registreerimine ning segavate pesastatud katkestuste puudumine on
endiselt eeldused. See ei ole CPU ega pipeline'i emulatsioon.

## Sõela laiendus ja kontrollimata osa

Uus audit lisab varasemale otsingule Type14a/15a/15b mälulaadimised,
Type3 mälukäsu prefiksid, MMASK registrikirjutused, piiratud Type20a
PUSH/POP ning RTI prefiksid. Säilivad eelmise etapi kuus aadressipiirkonda
ja samad selged välistused: pakitud ISA vektorid, kaardistamata augud
ja mitmekordselt laaditud piirkond. Uus otsing ei pikenda poolikut
käsku puuduvate baitide võrra.

Leiti **154 kandidaati**: 69 Type14a, 63 Type15a, 1 Type15b,
3 Type3a-prefiksit, 11 MMASK prefiksit, 4 Type20a ning
3 kompaktse RTI hüpoteesi. See on täiendava sõela tulemus, mitte
154 kinnitatud kirjutuskohta ega varasema 177 kandidaadi asendus.

**Viis kandidaati** asuvad kasutatud ülevaadatud käsupiiridel:
MMASK algseadistus, kaks ajastaja PUSH/POP käsku, otsene mälutaastus
ja RTI hüpotees. Viimase semantika jääb avatuks. **149 kandidaati**
jäävad kasutatud käsupiiride inventuuriga kontrollimata.

Lisati **7 räsiga seotud piirkonda ja 110 ülevaadatud käsupiiri**;
koos varasemate manifestidega kasutatakse 1993 eri käsupiiri.
Üksnes prefiksi tõttu ei kinnitata Type3 compute-/laiusvälja kehtivust.
Käsiraamatu Type3a joonisel on Type1a väljade kordus; seda ei kasutata
tõendina täielikule Type3a dekoodrile. Samuti ei ole ammendavalt kaetud
registripaari kaudsed kirjutused, kõik muud mälukäsupered, režiimiregistrite
memory-mapped alias'ed ega tingimuslikud RTI variandid.

## Testid, piirangud ja järgmine samm

**10/10 uut testi** läbisid: signed-nihe, PM/DAG2 valik, store/load
eristus, MMASK sihtregister, poolik käsk, piiratud Type3 tõenditase,
vastuoluliste staatuskäskude tõrjumine, RTS/RTI eristus, algse sõna
salvestamine enne maskimist, valitud task'i sõna rakendamine, pesastatud
pinu ning puuduva/rikutud kirje tõrjumine. Auditi loomine ja eraldi
kordusarvutus läbisid. Jagatud kontrollimootoreid ei muudetud; kogu CI-d
ja varasemaid seadmekatseid ei korratud.

```sh
python3 tools/fm3/test-modifier-context.py
python3 tools/fm3/modifier_context_audit.py --firmware /path/to/fm3_dsp_rel_13p00.syx
```

**Järgmine samm:** siduda `0x837bad` loetav frame'i sõna selle tegeliku
salvestusega ja kontrollida ülejäänud MMASK kandidaate. Kompaktse RTI
semantika ning kogu coreTask'i MODE1 invariant jäävad eraldi lahtiseks.
Uut presetieksporti nende koodiküsimuste lahendamiseks pole vaja.

**Uusi eksporte 0; uut REA dekompileerimist 0.** Kutsutavat REA/Ghidra
teenust sessiooni tööriistakataloogis ei olnud; kasutati olemasolevaid
baite, tootja käsiraamatut ja kohalikku staatilist analüüsi.

Wahi lohistamise mõõtmised **16375 / 49159 / 32784**, sendisammu
kandidaadi **1000/1001** ulatus ja **6.47 blokeering** säilivad.
`completeWriterInventory=false`, `runtimeModeAtStoreProven=false`,
`fullRangeEncodingProven=false`, `generatorWriteSupportAdded=false`.
Uut tootmisväljalaset ega imporditavat SYX-i selle etapiga ei loodud.

## Järelkontroll ja Type15b parandus, 22.10.2026

Kasutaja „kontrolli” alusel vaadati üle etapp commit'is
`0e95e6d158bdc1462fd319b2404562c90734bbbe`. Esialgsed 10 testi ja
auditi taasesitus läbisid, kuid tootja joonisega võrdlemine leidis
ühe operandilugeja puuduse: **Type15b käsu bitid 15 ja 14 peavad mõlemad
olema nullid**. Allikas on SHARC+ Core Programming Reference rev1.5,
joonis 16-4, trükitud lk 16–12 (PDF lk 395), sama räsiga käsiraamat,
mis on auditi JSON-is. Joonist kontrolliti ka visuaalselt.

Uus `memory_operand` ja selle kandidaatide sõel kontrollisid ainult
bitti 15. Vanem `global_scale_cache.dm7` ei kontrollinud kumbagi.
Näiteks tegeliku taastamiskäsu `089c7339` muutmine kujule `089c7379`
(bitt 14 = 1) andis varem sama MODE1 operandi, kuigi see ei vasta
kasutatud Type15b kodeeringule. Mõlemas lugejas ja sõelas kontrollitakse
nüüd `q & 0xc000 == 0`. See ei ole täieliku käsukehtivuse dekooder.

Lisati **kaks regressioonitesti**. Enne parandust ebaõnnestus neist
esimeses 4 ning teises 6 alajuhtu. Pärast parandust läbivad kõik
**11 kontekstitesti ja 9 cache-lugeja testi**. Testid tõrjuvad mõlemat
keelatud bitti eraldi ja koos ning kontrollivad DM/PM, LW ja store
operandivariantide tõrjumist; varasemad õigete operandide testid säilivad.

Jagatud `dm7` muudatuse mõju kontrollimiseks arvutati uuesti selle
kasutajate tulemused algsete räsidega sisenditest. **Üheksa salvestatud
JSON-tulemust jäid sisuliselt täpselt samaks:** global-scale-cache,
modifier-sharc, modifier-transport, modifier-caller, modifier-scheduler,
modifier-op10, modifier-init, modifier-interrupt ja modifier-context.
Katkestusauditi võrdlus toimub kontekstiauditi sees. JSON-i andmeid
ei kirjutatud võrdluse sobitamiseks ümber. Kogu projekti CI-d ei käivitatud.

Seega jäävad kehtima **154 kandidaati, 5 ülevaadatud käsupiiri ja 149
kontrollimata kandidaati**, samuti MMASK-i tingimuslik bitialgebra.
Parandus ei muuda olemasolevate FW13 baitide kohta tehtud järeldusi;
see takistab vigaste sisendite samaväärseks lugemist tulevases analüüsis.

`0x837bad` loetava sõna päritolu, MMASK-i tööaegne muutumatus ja kompaktse
RTI semantika jäävad avatuks. **6.47 blokeering ning generaatori
kirjutustoe piirang säilivad.** Järgmine uurimissamm on endiselt
I6/I7 frame'i ja võimalike kattuvate kirjutuste analüüs. Uut eksporti
selleks ei küsita. Tootmisplugin on **0.3.13**; uusi eksporte ja uut
REA dekompileerimist on selles järelkontrollis **0**.
