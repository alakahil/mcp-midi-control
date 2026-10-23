# MODE1 kirjutuskohtade sõel ja kolm lisatõendit, 22.10.2026

Alus: commit `c3558d95a68d0529dc7fe24b64000db0840475fa`, tööaruande
versioon 27 ja olemasolev FW13 binaar. GitHubi main kontrolliti uuesti:
`5238ebc5c4cd19c0ea412cd964e5e770c09930e7`. **Tootmisplugin 0.3.13.**

## Tõendatud juurdekasv

**Kolm täiendavat matemaatikalehte taastavad kõik siseneva MODE1 bitid
kõigil kontrollitud tagasipöördumisradadel.** Igaüks salvestab MODE1
jagatud registrisse I13, muudab RND32-t ja taastab salvestatud sõna.
Nende radade tõend ei sõltu lahendamata kompaktse tagastuse kodeeringust.

| Funktsioon | Salvestus → taastamine | Tagastumiskohad | Sümboolseid olekuid |
|---|---|---|---:|
| `0x834566` | `0x83456c` → `0x8345c2` | `0x8345c0`, `0x8345c6` | 36 |
| `0x8345ca` | `0x8345d0` → `0x834629` | `0x834627`, `0x83462d` | 37 |
| `0x8349f4` | `0x8349f4` → `0x834a14` | `0x834a11` | 15 |

Esimeses kahes funktsioonis väljub üks haru **enne RND32 muutmist**.
Mõlemad harud jäid graafi. Režiimi muutnud haru taastab MODE1
kaudse ABI-tagastuse esimeses viitekäsus. Kolmandas funktsioonis on
48-bitine RTS(DB), mille esimene viitekäsk taastab MODE1. Kontroll
arvestab mõlemat viitekäsku, mitte kaht 16-bitist parcel'it.

Kolmes uues tervikpiirkonnas vaadati üle **98 käsku**: alamkutseid,
täiendavaid MODE1/I13 kirjutusi ega status-stack'i taastamist pole.
I13 token säilib kuni taastamiseni. Jagatud MODE1/I13 ülekande tõttu
on see MODE1-algebra kasutatav nii SISD kui SIMD puhul; see ei tõenda
matemaatiliste väljundite, mälupöörduste või kogu SIMD arvutuse õigsust.
Eeldusteks jäävad kehtiv ABI/mälu ning asünkroonsete katkestuste ja
ebatavaliste juhtvooüleminekute puudumine.

Need lehed aitavad alamradade uurimist; **`0x82c228` kaheksat avatud
otsesõltuvust ei loeta nende põhjal lõpetatuks**. Varasemad
algataja-auditid jäid muutmata.

## Korduvkasutatav kirjutuskohtade sõel

Uus tööriist otsib MODE1 ja MODE1STK sihtregistreid järgmistes peredes:

| Käsupere | Otsitav toime |
|---|---|
| Type18a | SET, CLR, TGL; TST ja XOR eristatakse mittekirjutavatest võrdlustest |
| Type5a/5b | Tingimuslik ja tingimusteta registrist registrisse ülekanne |
| Type17 | Vahetu konstandi kirjutamine registrisse |

**XOR ei ole siin registri XOR-kirjutus:** tootja Type18a kirjelduses
võrdleb see registrit konstandiga ja seab BTF-i. TGL muudab registrit.
RND32 mask on `0x10000`, TRUNCATE `0x8000`, BDCST1 `0x800000`.

Sõel läbis **1 082 568 baiti** kuues selgesõnaliselt kaardistatud
aadressipiirkonnas. Iga sobiva 16-bitise alguskoha juures kontrolliti
käsuprefiksit; andmeid ei nimetata automaatselt koodiks. Leiti 1508
prefiksitabamust, millest 177 võiks valitud käsupere tõlgenduse korral
kirjutada ümardusbitte või kogu režiimisõna:

| Piirikontrolli tulemus | Kandidaate | Tähendus |
|---|---:|---|
| Varasema/uue ülevaadatud käsu alguses ja sama pikkusega | 13 | Piir kinnitatud; tööajal läbitavus sellest ei järeldu |
| Ülevaadatud käsu sees | 2 | Selles käsujaotuses valepositiivne tabamus |
| Kasutatud ülevaadatud jaotistega katmata | 162 | Kontrollimata kandidaat, mitte 162 tõendatud kirjutuskohta |

Kaks selget valepositiivset tabamust on `0x82be72` ja `0x82c212`:
need asuvad 4-baidiste käskude sees, mille algused on vastavalt
`0x82be71` ja `0x82c211`. Paljas `Type17 MODE1STK` prefiks oleks neid
ekslikult kirjutusteks pidanud. Piirivõrdlus kasutab kokku **1883 eri
ülevaadatud käsupiiri** neljast hash-kontrollitud manifestist.

Varasem algatajamanifest sisaldab ka harupiiranguga fragmente ja
ülevaatamata vahesid. Sõel jätab need vahed kontrollimatuks; tervet
hash'iga kaitstud baitiulatust ei võrdsustata ülevaadatud koodiga.
Uued kolm lehte on terviklikud jaotised.

Boot-kattuvusi ei peideta: `0x20084000..0x200858dc` kuulub kolme
laadimiskirje alla ja jäeti sõelast välja. Samuti välistati pakitud
ISA vektoripiirkond `0x28240000..0x28240300`, mida ei tohi VISA
parcel-järjekorras tõlgendada. Kaardistamata augud ja kõik välistused
on JSON-is. Kõrvuti asuvaid üheselt loetavaid plokke võib ühendada;
käsuprefikseid ei pikendata üle augu ega puuduvaid lõpubaiti nullidega.

## Piirid ja järgmine konkreetne samm

See on **valitud kodeeringuperede sõel**, mitte täielik kirjutuskohtade
inventuur. Lisaks jäävad kontrollida mälust MODE1/MODE1STK-sse
laadimine, POP STS, RTI, MMASK seadistus ning muud konteksti taastamise
teed. Ka Type5 kandidaadi compute-välja täielikku käsuseaduslikkust
see prefiksilugeja ei tõenda. Kõik 177 koordinaati ja nende liigitus
on salvestatud, et edasises töös samu kohti uuesti ei otsitaks.

Järgmine ökonoomne samm on **laiendada sama sõela mälust režiimiregistrisse
laadimise ja status-stack'i taastamise käskudele**, alustades juba
leitud scheduler'i MODE1STK kirjutusest `0x830c43` ning valitud
task'i tagastusteest. Alles seejärel saab hinnata, kas kõiki olulisi
režiimimuutusi katab sama invariant. Kompaktse jagamis-tagastuse
kodeering ja katkestuste mõju jäävad endiselt eraldi tõendikohustusteks.
44 konstruktori kutse rekursiivset läbimist selles etapis ei korratud.

Wahi lohistatud Min 2.50 / Max 7.50 / Max 5.00 väärtused
**16375 / 49159 / 32784** säilivad varasemate mõõtepunktidena.
Sendisammu kandidaadi **1000/1001** ulatus ja **6.47 blokeering** ei
muutunud. Kolm uut MODE1-tõendit ei anna neile mõõtmistele uut
sisendiväärtuse tõendit ega kinnita kogu Min/Max kodeeringut.

**Uusi füüsilisi eksporte 0. Uut REA dekompileerimist 0.** Sessiooni
tööriistakataloogis ei olnud kutsutavat REA/Ghidra teenust. Kasutati
olemasolevat firmware'i, uurivat kohalikku dekoodrit, tootja käsiraamatut
ja uusi sõltumatuid käsuoperandite kontrollijaid. Varasemat REA
analüüsi ei esitata selle etapi uue REA tulemusena.

## Kontrollid ja taasesitus

- **10/10 uut testi** läbisid: TGL vs XOR/TST, õige režiimiregister ja
  bitimask, tingimuslikud ülekanded, puuduv lõpubait, kattuvad boot-kirjed,
  formaatide eraldamine, käsusisesed tabamused, ülevaatamata augud,
  hash'i muutus ja ebaõige varajase tagastuse tõrjumine.
- Auditi loomine ja eraldi kordusarvutus algse firmware'i vastu läbisid.
- Jagatud kontrollimootoreid ega tootmisgeneraatorit ei muudetud.
  Kogu CI-d ja varasemaid riistvarapunkte ei korratud.

```sh
python3 tools/fm3/test-modifier-writers.py
python3 tools/fm3/modifier_writers_audit.py --firmware /path/to/fm3_dsp_rel_13p00.syx
```

`completeWriterInventory=false`, `runtimeModeAtStoreProven=false`,
`fullRangeEncodingProven=false`, `generatorWriteSupportAdded=false`.
Tööriist ei saada MIDI-t ega loo imporditavat presetifaili.
