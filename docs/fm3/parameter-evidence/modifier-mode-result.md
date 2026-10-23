# MOD Min/Max: L1 matemaatikafunktsioonid ja MODE1 säilimine

**Hilisem täpsustus 22.10.2026:** [sõltumatu ADI binaari võrdlus](modifier-return-result.md)
tõendas SHARC+ tagastusjoonise vastuolu Type2c-ga ning leidis ADI
jagamisabist sama MODE1 taastamisvõtte 48-bitise tagastusega.
Kompaktse `0x0afe` tõlgendus on tugevalt toetatud, kuid lõplik sõltumatu
opcode-kinnitus jääb avatuks; allolevaid null-välju ei tõstetud true'ks.

**Tõendustaseme täpsustus 22.10.2026, op10 uurimise etapp:** allpool kirjeldatud
jagamisabifunktsiooni taastamisalgebra läbib endiselt kontrolli, kuid
`0x1cb17a` parcel'i `0x0afe` tõlgendus viivitatud RTS-ina sõltub vanemast
dekoodrist. [Kutsujate audit](modifier-caller-result.md) leidis sama kompaktse
tagastusvormi ja SHARC+ Type11c joonise vahel lahendamata kodeeringuerinevuse.
See puudutab ka siinset jagamise tõendit, mitte ainult katkestuse lõppu.
Seetõttu ei ole kogu natiivse division-tagastuse ega sellest sõltuva
paketist-salvestuseni raja sõltumatu tõend suletud. Masinloetavas auditis
on `division=null` ja `modePreservedFromEntryToStore=null` (tõendamata),
tingimusliku taastamismudeli tulemus on eraldi `true`.
See ei tõenda režiimi tegelikku rikkumist. Allpool säilib ajaloolise etapi
analüüs selle täpsustusega; üldine kirjutustugi ja 6.47 jäävad avamata.

**Järgmine tulemus:** [coreTask algne kontekst ja 6.47 piirjuht](modifier-scheduler-result.md)
lisab ülesandepõhise 32-nearest algseisu ning MODE1STK salvestus-/taastamistee.
Kogu tööaegse kutseahela invariant jääb lahtiseks; allpool säilib eelmise etapi seis.

22.10.2026. Alus: uurimiscommit `ca75217e4520cfe73b322068f5a0a48e182954e6`
ja tööaruande versioon 17. **0 uut füüsilist eksporti. Tootmisplugin 0.3.13.**
See etapp jätkab [op82 transpordi ja täpsuse analüüsi](modifier-transport-result.md).

## Tõendatud edasiminek

Varasemad kaks lahendamata kutset **0x1cb91c** ja **0x1cb13a** on leitud
SHARC1 kohalikust L1 mälust. Mõlemad muudavad arvutusrežiimi ajutiselt ja
taastavad selle enne tagastamist. Kontrollitud on mõlemad division-helper'i
tagastused, sealhulgas tagastuskäsu järel täidetav taastamiskäsk.

Valitud edukal **op82 / MOD PID1 või PID2 / WAH PID5, type3** rajal säilib
paketikäsitlejasse `0x82959a` saabunud MODE1 kuni uint16 kirjutuseni `0x823bb4`.
See on räsiga piiritletud staatiliste radade ja kutsekonventsiooni tulemus;
see **ei tõenda veel, milline MODE1 väärtus saabub töötsüklist käsitlejasse**.
Tulemus eeldab tavalist skalaarset ABI-d ning ei modelleeri väliseid katkestusi,
erandeid, rikutud objekte ega suvalist firmware'i täitmist.

## Õige aadressikaardistus

[Analog Devices ADSP-SC58x/2158x andmeleht, Rev C, lk 11, tabelid 4 ja 6](https://www.analog.com/media/en/technical-documentation/data-sheets/ADSP-SC582_583_584_587_589_ADSP-21583_584_587.pdf)
annab L1 block3 private VISA short-word vahemiku `0x001c0000…0x001cffff` ning
SHARC1 multiprocessor byte vahemiku `0x28380000…0x2839ffff`. Nende tabelite
põhjal on selles blokis teisendus **byte = 0x28000000 + 2 × VISA**.

| Funktsiooni VISA aadress | SHARC1 bait-aadress | Leitud ülesanne |
| --- | --- | --- |
| 0x1cb91c | 0x28397238 | FIX/FLOAT-põhine float'i täisosa helper; salvestab ja taastab kogu MODE1 |
| 0x1cb13a | 0x28396274 | RECIPS ja täpsustamistega jagamisharud; säilitab algse RND32 biti |
| 0x1c8aa2 | 0x28391544 | Paketikäsitleja ajaloendur; ei kirjuta MODE1-d |

Kaks matemaatikafunktsiooni asuvad boot-plokis algusega `0x28395f44`, pikkus
`0x20b4`, andmed LDR-faili nihkest `0x14c5ec`. See seob leitud koodi tegeliku
FW13 laadimisandmestikuga. Varasem oletus `0x9cb91c` kohta ei olnud õige
L1 alias; sellest ei tulene, et funktsioon puuduks firmware'ist.

Audit lubab ainult dokumenteeritud L1 piirkondi ning varem räsiga kinnitatud
välist koodiakent. L1 vahemike vahelised augud, piirkonna lõppu ületavad
lugemised ja teise tuuma aadressid lükatakse tagasi.

## Tagastusharude kontroll

Käsusemantika alus on [SHARC+ Core Programming Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
Type5a registriülekanne, Type9a haru, Type18a süsteemiregistri bititoiming,
viivitatud tagastus ning ASTATX.BTF ja MODE1 kirjeldused.
Käsiraamatu SHA-256 on
`a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.

| Helper ja rada | MODE1 säilimise põhjus |
| --- | --- |
| 0x1cb91c, ainus tagastus 0x1cb92d | 0x1cb91c salvestab MODE1 R2-sse; 0x1cb91f seab TRUNCATE; 0x1cb924 taastab MODE1 R2-st. Järgnevad AV/TF tingimused muudavad arvutustulemust, mitte taastatud MODE1-d. |
| 0x1cb13a, saabudes RND32=0 | 0x1cb13a jätab algse biti BTF-i; 0x1cb13d puhastab juba nullise RND32. NOT TF haru viib 0x1cb17f kaudu tagastuseni 0x1cb181. Muid MODE1 bitte ei muudeta. |
| 0x1cb13a, saabudes RND32=1 | Sama puhastus valib ajutiselt 40-bitise täpsuse. 0x1cb162 salvestab puhastatud MODE1 R1-sse, 0x1cb174 seab R1 bit16 tagasi. 0x1cb17a RTS(DB) täidab enne tagastust ka **0x1cb17b MODE1=R1** ning 0x1cb17e NOP-i. |

Esimene NE tingimus `0x1cb143` valib tavalise või erijuhu arvutuse; mõlemad
ühinevad `0x1cb15b` juures enne MODE1 salvestamist. Kummaski harus pole teist
funktsioonikutset, MODE1 kirjutust ega BTF-i ülekirjutust. Arithmetic status'e
muud lipud võivad muutuda; **BTF** säilib kuni `0x1cb16b IF NOT TF` haruni.

Uus kontroll lahutab kaks asja:

- Algse firmware'i piirkondade räsid ning sõltumatult dekodeeritud kriitilised
  operandid kinnitavad kontrollitud koodi, salvestusregistrid, bitimaskid,
  harutingimused, sihtkohad ja tagastuste viivitatud kuju.
- Sümboolne `(sisenev MODE1 & keep) | force` kontroll kinnitab käsitsi üle
  vaadatud MODE1-toimingute taastamisalgebra iga vastava bititingimusega
  sisendi jaoks. See ei emuleeri funktsioonide kõiki ujukomaarvutusi.

Sertifikaadis on üks täisosa-helper'i rada ja neli jagamis-helper'i kombinatsiooni
(NE kaks haru × algse RND32 kaks väärtust). Arvutuse täpset teegisümbolit ega
jagamise kõiki eriväärtuste numbrilisi tulemusi ei väideta tuvastatuks.
Varasema auditi abifunktsiooni dokumendimärgend `Type24a` parandati `Type18a`-ks;
bititoimingu dekodeerimise tulemus ei muutunud.

## Paketikäsitlejast salvestuseni

| Lüli | Piiritletud kontroll |
| --- | --- |
| 0x82959a paketikäsitleja | Op82 õnnestuv rada, objektiotsing 0x8232dc, PID-kontroll 0x823892 ja ajaloendur 0x1c8aa2 ei kirjuta MODE1-d. Objektiotsingu tsükkel ei lisa teisi kutseid. |
| MOD 0x813f86 → üldkäsitleja 0x8244fb | MOD Min/Max staatilise kirjelduse tüüp on 0. Op82 rada valib tabeli `0x282e76c0[0] = 0x824638`: otse registrite taastamise/tagastamise ossa. See rada ei kutsu üldkäsitleja teisi arvutusfunktsioone. |
| MOD PID1/PID2 ja WAH type3 | PID tabel valib 0x8141fa / 0x814256; type3 tabelikirjed viivad 0x81420e / 0x81426a. Need kutsuvad 0x823ae7. WAH descriptor'i type-väli on 0x32, kõrge nibble 3. |
| 0x823ae7 proloog | Kaks kutset 0x1cb91c-le ja üks suhteline CALL 0x1cb13a-le. Kõigi MODE1 säilimine on nüüd kontrollitud. |
| Op82 salvestusharu | Täpse normaliseeritud sisendi korrutamine 65534-ga, eraldi +0.5, TRUNC, clamp ja 16-bitine kirjutus 0x823bb4. Sellel lõigul MODE1 ei muutu. |

Pärast raw-salvestust kutsutav vormindaja `0x825ebd` ei kuulu salvestusele
eelneva režiimi tõendisse. Teiste target-type'ide või operatsioonide harusid
sellest tulemusest automaatselt ei järeldata.

## Piiratud kodeerija kandidaat

`tools/fm3/modifier_op82_candidate.py` on **eraldi võrgu- ja seadmesuhtluseta
uurimismoodul**. See pole avaldatud generaatorisse ühendatud, ei väljasta
SYX-faile ega kirjuta presetisse. Sisendiks on täpne normaliseeritud float32
bitimuster [0,1], mitte kasutaja ümardatud kuvanäit.

Kandidaat arvutab olemasoleva täpse astmelise mudeliga kõik neli varianti:
32-nearest, 40-nearest, 32-zero ja 40-zero. Raw-kandidaat tagastatakse ainult
ühehäälse tulemuse korral; lahknevuse korral saadakse `ModeDependentValue`.
See väldib teadmata režiimi vaikimisi asendamist käivituskoodi seadistusega.
Üksmeel nelja mudeli vahel ei ole iseseisev tõend seadme täitmise kohta.

| Sisendi päritolu | Normaliseeritud float32 | Raw-kandidaat kõigis neljas mudelis |
| --- | --- | ---: |
| Min 2.50 mõõtmise tingimuslik lohistamiskandidaat | 0x3e7fdec5 | 16375 |
| Max 7.50 mõõtmise tingimuslik lohistamiskandidaat | 0x3f40084e | 49159 |
| Max 5.00 mõõtmise tingimuslik lohistamiskandidaat | 0x3f0010cf | 32784 |
| Täpne normaliseeritud 0.25 | 0x3e800000 | 16384 |
| Täpne normaliseeritud 0.75 | 0x3f400000 | 49151 |
| Täpne normaliseeritud 0.50 | 0x3f000000 | 32767 |

Esimese kolme rea ajaloolised sisendbitid pole mõõdetud MIDI-sõnumid. Need
säilitavad [lohistamismudeli](modifier-drag-result.md) varasemad tingimused.
Viimased kolm rida on **teistsugused täpsed sisendid**, mille raw-d ei tohi
kasutada olemasolevate lohistamistõendite asendamiseks.

Piirjuht **0x37000100** annab 32-nearest korral raw 1, kolmes teises variandis
raw 0; kandidaat lükkab selle tagasi. Kõik **65 535 raw-sõna keskpunkti**
taastuvad kandidaadiga. See katab koodide keskpunktid, mitte kõik float32
sisendid ega kõik kuvaväärtused.

## Kontrollid ja talletamine

- **20** räsiga piiritletud firmware'i piirkonda, sh mõlemad terviklikud
  matemaatikafunktsioonid ja ajaloendur; manifestis pole native-binaarfaile.
- **9 uut testi**: L1 alias ja vigaste vahemike tõrje; operandide dekodeerimine;
  märgiga suhteline haru; tagastusradade algebra; puuduva viivitatud taastuse,
  vale registri ja BTF-i kadumise mõjud; mõõdetud/kanoniliste sisendite eristus;
  režiimitundliku väärtuse blokeerimine; kõik sõnakeskpunktid; sisendipiirangud.
- Eelmise transpordi/arvutustäpsuse **5 testi** jäävad jõusse.
- Uus analüüs kasutab olemasolevat firmware'i ja SLEIGH-abiga staatilist
  lugemist ning sõltumatuid operandikontrolle. Macis 22.10 tehtud edukas
  REA/Ghidra töö jääb varasemaks tõendiks. **Uut REA dekompileerimist ei tehtud.**
- Uurimisharu muutus on kohalik. Avaldamist, PR-i ühendamist ega plugina
  väljalaset selle etapiga ei tehta.

```sh
python3 tools/fm3/test-modifier-mode.py
python3 tools/fm3/test-modifier-transport.py
python3 tools/fm3/modifier_mode_audit.py \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

## Lahtine küsimus ja järgmine samm

Järgmine firmware'i ülesanne on **kutsuva töötsükli MODE1 invariant enne
0x82959a sisenemist**, alates ühismälukutsest `0x82e082` ja selle eelnevatest
harudest/kutsetest. Varasem boot-seadistus 32-nearest ning nüüd lahendatud
helper'ite taastamine on kaks eraldi tõendit; nende vahel pole veel kogu
tööaegset teed suletud. Katkestuste mõju ei ole selle auditi ulatuses.

Op9 normaliseerimise RECIPS-täpsus, teiste sihtparameetrite tüübid ja
kasutaja täpse kuvaväärtuse normaliseerimisreegel jäävad eraldi küsimusteks.
Avaldatud generaatori muudatus vajab nende jaoks selgelt piiritletud lepingut
ja tõendeid. Praegune kandidaat käsitleb ainult täpseid op82 sisendbitte.

**Uut seadmeeksporti ei küsita.** Olemasolev firmware võimaldab jätkata
kutsuva töötsükli uurimist; uus sama kuvanäiduga SYX ei määraks algset
float-sisendit ega salvestuse hetke MODE1-d.
`fullRangeEncodingProven=false`, `generatorWriteSupportAdded=false`.
