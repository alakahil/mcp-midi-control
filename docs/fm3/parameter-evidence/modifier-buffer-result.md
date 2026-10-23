# MODE1: puhvrite kutsetee ja mittetagastav veaharu, 22.10.2026

Järgnev etapp: [algataja 0x82c228 tabelirajad, neli uut MODE1-lepingut
ja otseste sõltuvuste tegelik ulatus](modifier-table-result.md).

Alus: kohalik commit `8194e763060bbc0edeb0f4823d9f0c143465ac00`, tööaruande
versioon 25 ja sama FW13 binaar. **Tootmisplugin 0.3.13; uusi eksporte 0.**

## Tõendatud tulemus

**Algataja `0x82fe42` puhvrite alamkutsed on piiritletud.** Kolm allpool
toodud abirada säilitavad tavapärasel lõplikul tagastumisel siseneva MODE1
kõik bitid, kui sisenemisel on SIMD/PEYEN null ja kehtivad kontrollitud
ABI-, mälu- ning tagastuseeldused. Kogu algataja jääb avatuks: selle ainus
allesjäänud sünkroonse MODE1-tõendi sõltuvus on **jagamisabi `0x1cb13a`**.

| Abirada | Tõendi piir | MODE1 muudatus | Tagastus |
|---|---|---|---|
| `0x1cbe86` | Siin kutsutav mälutäitmine, R12=`0x4c00` baiti | SET `0x200000` → CLR `0x200000` | `0x1cbf07`, ABI kaudne hüpe ja kaks viitekäsku |
| `0x82e179` | Jaotaja, R4=`0x4c00`; eelmine abirada | Otsest MODE1 kirjutust pole | `0x82e1ae`; veaharu ei tagastu |
| `0x82c8a2` | Puhvri algseadistus; tundmatute tingimuste mõlemad harud kaasatud | SET `0x200000` → CLR `0x200000` | `0x82c8f7`; vigase joondamise haru ei tagastu |

**Skalaarse sisenemise eeldus on vajalik.** SET/CLR paar ei säilita
juba sisenemisel seatud PEYEN-bitti. Kontroll peab sellise üldistuse
tagasi lükkama; uus negatiivne test teeb seda. RND32 ja TRUNCATE bitid
kuuluvad kontrollitud MODE1 sõna hulka. See on tagastusoleku tõend,
mitte väide, et režiim ei muutu funktsiooni sees.

Algatajas on neli jaotust, igaüks **`0x4c00` = 19 456 baiti**.
Puhvri algseadistusele antakse **`0x1300` = 4864 normaalsõna**.
Kirjepointer algab `0x3167f0` ja kasvab 16 **aadressiühiku** võrra;
Sammu baidipikkust selles auditis ei määrata. Jaotaja
joondab nihke valemiga `(offset + 7) & 0xfffffff8` ja lisab
`0x83a316e0`, seega on saadud byte-space pointer 8-baidise joondamisega.
Ületäitumise puudumist, kogu mälu mahtuvust ega mälutäitmise kõigi
sisendite korrektsust ei väideta tõendatuks.

Mälutäitja väikese sisendi haru `0x1cbe94 → 0x1cbf0b` jäetakse välja
ainult kontrollitud **R12=`0x4c00` > 4** tõttu. Kontroll seob selle
võrdluse algataja mõlema R4 laadimise ja jaotaja R12 edastusega.
Väikese sisendi haru seni dekodeerimata käsku `0x1cbf14` ei kuulutata
ohutuks ega kasutata selle haru üldiseks kinnitamiseks.

## Parandatud funktsioonipiirid

Varasem uuriv CFG-jälitus eeldas kõigi kutsete tagastumist. See jätkas
veakutse järel naaberfunktsiooni sees, tekitades näilise rekursiooni ja
lisades jaotajale kõrvalise matemaatikafunktsiooni kutsed.

| Piir | Uus otsene kontroll |
|---|---|
| `0x833668` | Pärast kutset `0x83428a` hüppab L2 aadressile `0xbb80b8`; `IDLE` aadressil `0xbb80b9` ja tingimusteta tagasihüpe `0xbb80ba → 0xbb80b9` moodustavad suletud tsükli. |
| `0x8336c8` | Kutsub `0x83521e`, `0x835149` ja seejärel mittetagastavat `0x833668`; ei jätku `0x8336e4` sisse. |
| `0x82c8a2` | Veakutse `0x82c903 → 0x8336c8` ei jätku kõrvalfunktsiooni `0x82c90a`. |
| `0x82e179` | Veakutse `0x82e1c6 → 0x8336c8` ei jätku kõrvalfunktsiooni `0x82e1ce`. |

Mittetagastuvus tähendab siin **tavapärase ABI-jätku puudumist**.
Veaharude alamkutsete MODE1-mõju jääb piiramata; need võivad ka ise
mitte tagastuda. Katkestused, erandid, mitte-lokaalsed hüpped ja
vigastatud tagastusaadressid ei kuulu sellesse graafitõendisse.
`IDLE`-st ärkamine ei muuda tavapärast järgmist käsku tagastuseks:
vaadeldud jätk hüppab tagasi samasse tsüklisse.

## Matemaatikaleht SIMD kutsekohas

Varasema `0x1cb77a` tõendi salvestus–taastamissilmus kontrolliti uuesti.
Algataja kutsub seda SIMD-režiimis. MODE1 ja I12 on ühised registrid;
tingimusteta register-register ülekandel pole siin PEy variregistri
kirjutust. See lubab **MODE1-only** tõendit rakendada ka sellele
kutsekohale: I12 säilitab MODE1 sõna ja `0x1cb7e0` taastab selle enne
48-bitist tagastust `0x1cb7e8`. SIMD arvutustulemuste õigsust selle
laiendusega ei tõendata. Alus on tootja juhendi §4–59/60 ja §14–35
ning sama räsidega seotud I12 puutumatuse inventuur.

Algataja ülejäänud graaf, kolm riistvaratsüklit koos kordusservadega
ja kõik neli sünkroonset kutsekohta on kontrollis. **Ilma jagamisabi
lepinguta peab algataja kontroll ebaõnnestuma.** Eraldi diagnostika
näitab, et kui `0x1cb13a` säilitaks MODE1, säilitaks selle ka algataja.
Audit hoiab selle eelduse väljal `assumedCallees`; `closed` jääb false.
Kompaktse tagastuskodeeringu staatiliselt tugev hüpotees ei muutu
selle diagnostika tõttu sõltumatult tõendatud kodeeringuks.

## Kontrollid

- **7 uut ülevaadatud piirkonda ja 267 käsupiiri**; lisaks varasema
  matemaatikalehe kontrollpunktide taasesitus.
- Kolm puhvri MODE1 tõendit: **49, 22 ja 33 sümboolset olekut**.
  Kahe mittetagastava graafi suurused: **7 ja 6 sõlme**.
- **10/10 uut sihitud testi**: ekslikult tagastuv veaharu, lahtine lõpp,
  tõendamata kutse tagastuval rajal, vale SIMD eeldus, taastamata haru,
  puuduva tõendi märgistamine, vale tingimus/siht, viiteala ja tsükli serv.
- Auditi loomine ja eraldi taasesitus läbisid. Tootmisgeneraatorit,
  kogu CI-d ega varasemaid seadmekatseid ei korratud.

```sh
python3 tools/fm3/test-modifier-buffer.py
python3 tools/fm3/modifier_buffer_audit.py --firmware /path/to/fm3_dsp_rel_13p00.syx
```

[Audit](modifier-buffer-audit.json) · [Kontrollpunktid](modifier-buffer-checkpoints.json)

## Lahtised küsimused ja järgmine samm

Lahtisi algatajaid on endiselt **5**: `0x82c228`, `0x82fe42`,
`0x80f1ba`, `0x8289bc`, `0x1c8b15`. Selle etapi tulemus ahendab ühe
algataja sõltuvusi; see ei vähenda kunstlikult lahtiste algatajate arvu.
Töötsüklite, op86/PID0x3fad, varasemate pakettide, salvestusjärgsete
tagastuste ning kogu katkestus-/erandirežiimi küsimused säilivad.

Edasi saab olemasoleva binaariga piiritleda **algataja `0x82c228`**,
kasutades nüüd kontrollitud jaotaja/veaharu lepinguid ainult siis,
kui konkreetse kutse sisendieeldused sobivad. `0x1cb13a` kompaktse
tagastuse jaoks on endiselt vaja tootja lähte–objekti vastavust või
parandatud esmast kodeeringutabelit. Uus presetieksport nendele
koodiküsimustele ei vasta.

REA/Ghidra otsetööriista selles sessioonis pole. Kasutati olemasolevat
firmware'i, varasemaid REA tulemusi taustana ja uut staatilist
graafikontrolli; **uut REA dekompileerimist 0**. Wahi lohistatud
Min 2.50 / Max 7.50 / Max 5.00 raw-sõnad **16375 / 49159 / 32784**,
sendisammu kandidaadi **1000/1001** ulatus ja **6.47 blokeering**
jäävad samaks. Täpne täielik Min/Max teisendus, tegelik tööaja MODE1
ja generaatori uus kirjutustugi jäävad tõendamata.

Allikas: [SHARC+ Core Programming Reference, rev1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
SHA-256 `a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.
FW13 SYX/LDR räsi ning käsupiiride piirkonnaräsid on kontrollpunktides.
