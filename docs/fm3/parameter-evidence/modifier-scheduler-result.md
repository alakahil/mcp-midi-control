# MOD Min/Max: coreTask algseis, kontekst ja 6.47 piirjuht

22.10.2026. Alus: uurimiscommit `f9376d70f6c0d7fb458b45ee737e5701dfcd133d`
ja tööaruande versioon 18. **Tootmisplugin 0.3.13; uusi füüsilisi eksporte 0.**
Jätk [L1 helper'ite analüüsile](modifier-mode-result.md).

## Tõendatud tulemus ja selle piir

Paketikäsitlejat käivitava **coreTask** ülesande algne kontekst valib
**32-nearest ja skalaarse täitmise**, sõltumata looja ümardusrežiimist.
See on varasemast üldise käivituskoodi leiust täpsem tõend.

Leitud kontekstivahetuse rada salvestab algse MODE1 sõna eraldi ajutisest
scheduler'i režiimist ning kirjutab selle taastamisel tagasi **MODE1STK-sse**.
See registrinimi ja semantika on SHARC+ puhul oluline: vana SLEIGH-mudel
näitab samas kohas eksitavat `LRPTL` nime.

**Ülesande algse konteksti väärtus ei tõenda veel MODE1-d igal op82 salvestusel.**
Ülesande sees toimuvad muud kutseid sisaldavad tegevused ning erinevad
paketioperatsioonid. Nende transitiivne mõju pole tervikuna suletud. Samuti
pole kogu interrupt-wrapper'i tagastustee selles etapis tõendatud.
Audit ei väida režiimileket leidnuks; nimetab täpselt kontrollimata ulatuse.

## Ülesande loomine ja algseis

| Tõend | Leitud seos |
| --- | --- |
| 0x82e14d…0x82e156 | R12=0x82ded0, R8=0x809ce680, R4=0x809cc940; kutse 0x83254e. String aadressil 0x809ce680 on `coreTask`. |
| 0x8325ff | Ülesande loomine kutsub stack-builder'it 0x830d26. |
| 0x830d90…0x830d9b | Loeb looja MODE1, rakendab AND 0xff1f1b00 ja OR 0x01010000. |
| 0x830da5 | Salvestab saadud MODE1 ülesande algsesse kontekstiraami. |
| 0x832612 | Stack-builder'i tagastatud R0 kirjutatakse task-control-block'i salvestatud stack-pointer'i väljale. |

Algse sõna avaldis on
`(creator_MODE1 & 0xff1f1b00) | 0x01010000`.
See seab RND32 biti, puhastab TRUNCATE ja PEYEN bitid. Järeldus puudutab
algset kontekstisõna; ülejäänud MODE1 bitid ei ole kõik konstantsed.

Stack-builder'i MODE1 asukoht ja taastaja lugemiskoht kattuvad sõltumatute
koordinaadiarvutuste järgi: algse salvestatud stack-pointer'i suhtes **+344
baiti ehk +0x158**. Builder'i I3=I4−96, kuus −4 postmodifikatsiooni,
viimane +35×4, salvestus −57×4 ja tagastatud I5=I4−552 annavad +344.
Taastaja tühjade loop/PC-stack'ide ja täisraami rada annab sama aadressi:
4 + 3×4 + 45×4 + 37×4. Vahemäluregistrite ja sõna/bait-nihke segiajamist
kontrollitakse eraldi testiga. Kõiki scheduler'i raame ei emuleerita.

## MODE1STK ja kontekstivahetus

Allikas: [Analog Devices SHARC+ Core Programming Reference, rev 1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
§4–9, §4–75, §27–12 ja §27–16. SHARC+ SYSREG kood 13 / UREG 0x7d viitab
status-stack'i ülemise kirje MODE1-le. See erineb elavast MODE1 registrist,
mille UREG kood on 0x72. POP STS ja katkestusest naasmine taastavad status'e
vastavalt protsessori reeglitele. Kogu konkreetset interrupt-wrapper'it
pole nende reeglite alusel veel kontrollitud.

| Aadress | Kontrollitud toime |
| --- | --- |
| 0x83081d | USTAT1 saab algse MODE1STK sõna. |
| 0x83081f / 0x830822 | Ajutisele MODE1STK-le rakendatakse CLR 0x00e0f4ff / SET 0x01010000; järgnev POP STS valib scheduler'ile 32-nearest skalaarrežiimi. |
| 0x83083e | Algne USTAT1 kirjutatakse kontekstiraami I7+148 baiti. |
| 0x830ae3 | Taastamisel loetakse sama välja USTAT1-sse. |
| 0x830c40 / 0x830c43 | PUSH STS järel kirjutatakse algne USTAT1 tagasi MODE1STK-sse. See pole veel otsene elava MODE1 kirjutus. |

Taastaja käsitleb eraldi 32- ja 40-bitise registrisisu harusid; MODE1 sõna
välja lugemine toimub enne neid ja MODE1STK taastamine pärast nende ühinemist.
Ajutist scheduler'i 32-nearest režiimi ei kirjutata algse sõna asemele.
Uus dekooder kontrollib lisaks valitud SHARC+ Type14d baidilugemisi/-kirjutusi,
mida kasutatud vana SLEIGH-mudel ei tundnud. Muid laiusi ei oletata samaks.

## Kaks paketikäsitleja kutset ja allesjäänud ulatus

| Rada | Kutse |
| --- | --- |
| Algse gate-loop'i ajal, 0x20085808 lipp on null | 0x82e082 → 0x82959a |
| Tavaline töötsükkel pärast 0x82c78a abifunktsiooni | 0x82e075 → 0x82959a |

Mõlemad annavad sama ühismälu `0x20084000`. Vahetu polling'u-eelne
abifunktsioon **0x82c78a** säilitab MODE1: tema ainsad kutsutavad funktsioonid
on varem kontrollitud ajaloendur 0x1c8aa2 ja lühike arvutus-/kirjutusfunktsioon
0x82c6e4, mis MODE1-d ei muuda.

Töötsükli enda nähtavas koodis pole otsest MODE1 kirjutust, kuid sellest
ei järeldu kutsutavate funktsioonide säilitamine. Kontrollimata ulatus on:

- Enne tsüklit: 0x82c228, 0x82fe42, 0x80f1ba, 0x8289bc, 0x825e21,
  0x8304ab ja 0x1c8b15 koos nende alamkutsetega.
- Tsüklis: 0x82b193, 0x811a83, 0x80ea77 ja 0x82c97d koos alamkutsetega.
- Kaudne ploki callback 0x82e05a, object+0x14c kaudu, op86/PID0x3fad.
- Varasemate pakettide muud operatsioonid ja pärast uuritud raw-kirjutust
  toimuv tagastustee; kõigi katkestuste täielik mõju.

Seetõttu jääb `runtimeModeAtStoreProven=false` jõusse. See on täpsem,
kontrollitavate aadressidega lahtiste küsimuste loetelu, mitte üldine oletus,
et scheduler muudaks ümardusrežiimi juhuslikult.

## Kas kitsam sisendileping väldiks režiimiküsimust?

Kontrolliti **kandidaatreeglit**: täpne kümnendväärtus 0.00…10.00 sammuga
0.01, jagamine 10-ga, lähim paarisarvulise mantissiga float32 ning olemasolev
op82 astmeline arvutusmudel. See on tulevase generaatori võimalik leping,
**mitte tõendatud klaviatuuri- või hiiretee**. Täpne ratsionaalarvuline
võrdlus kahe naaber-float32-ga kinnitab kõigi 1001 sisendi teisenduse.

| Kontroll | Tulemus |
| --- | ---: |
| Vahemiku punktid | 1001 |
| Kõik neli arvutusrežiimi nõustuvad | **1000** |
| Lahknev punkt | **6.47** |
| 6.47 normaliseeritud float32 bitid | **0x3f25a1cb** |
| 32-nearest raw | **42401** |
| 40-nearest, 32-zero ja 40-zero raw | **42400** |

Põhjus on vahetehte ümardus. Valitud float32 sisend on ligikaudu
0.6470000147819519. Täpne korrutis 65534-ga on ligikaudu
**42400.498968720436**. 32-nearest korrutamise tulemus ümardub **42400.5**-ks;
eraldi +0.5 ja TRUNC annavad 42401. Teised kolm mudelit annavad 42400.
See erinevus läbis ka sõltumatu Python float32 vahetehte kontrolli.

Ideaalse raw/65534×10 tagasiteisenduse näidud oleksid ligikaudu 6.469924 ja
6.470077: mõlemad ümarduvad sajandikeni **6.47**. See illustratsioon ei ole
FW op9 kogu kuva-/RECIPS-raja uus tõend. **6.47 hiirega paika lohistamine
ei fikseeriks testi jaoks vajalikku sisendbitimustrit.**

Olemasolev kandidaat blokeerib 0x3f25a1cb juba praegu. Avaldatud generaatorisse
ei lisatud uut sisendireeglit ega kirjutustuge. Kõik kolm varasemat
lohistamiskandidaati ja nende mõõdetud raw-d jäävad eraldi tõenditeks.

## Kontrollid, REA ja järgmine samm

**12** räsiga piiritletud firmware'i piirkonda, valitud operandide ja
raamikoordinaatide kontrollid; manifestis pole native-binaare.
**7 uut testi** katavad algse režiimi, vigased sisendid, raamikoordinaadid,
MODE1/MODE1STK eristuse, Type14d piirangu, kõik 1001 kandidaatsisendit ning
6.47 vahetehte. Varasemad 9 MODE1/kandidaadi ja 5 transpordi testi säilivad.

```sh
python3 tools/fm3/test-modifier-scheduler.py
python3 tools/fm3/test-modifier-mode.py
python3 tools/fm3/test-modifier-transport.py
python3 tools/fm3/modifier_scheduler_audit.py \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

See on uus staatiline analüüs olemasoleva firmware'i põhjal. Macis tehtud
edukas REA/Ghidra analüüs jääb varasemaks sisestusraja tõendiks;
**uut REA dekompileerimist selles etapis ei tehtud**.

Kõige väiksema lisatööga järgmine samm on valmistada **uurimiskandidaadi
mälus tehtav SYX-baidivõrdlus** nende täpselt määratud sisendite jaoks,
mille puhul kõik režiimid nõustuvad. 6.47 jääb blokeerituks ning
normaliseerimisreegel peab olema sisendilepingus sõnaselge. See võimaldab
kontrollida generaatori muudatuse ulatust olemasolevatel presetitel, jätmata
edasist ettevalmistust sõltuma kogu töötsükli transitiivsest analüüsist.
Mõõdetud lohistamise raw-sõnu ei asendata kanoniliste kuvaväärtuste raw-dega.
See etapp valmistab ette kandidaati, mitte kinnitatud seadmekirjutustuge.

Kui vaja on toetada ka režiimitundlikku 6.47 sisendit, tuleb sulgeda MODE1
invariant või valmistada üks täpse float32 sisendiga koondkatse.
Võimaliku seadmekatse teadmata asjaolu
on **milline raw tekib teadaolevast 0x3f25a1cb op82 sisendist tegelikul
tööajal**. Senised kolm eksporti ei erista režiime ja nende ajaloolisi
MIDI-sisendbitte pole salvestatud. Uus katse peaks saatma kontrollitud bitid,
fikseerima lähtepreseti/ploki/kanali ning kontrollima raw-sõna; ainult
kuvanäidust ei piisa. Üks mõõtmine ei tõendaks automaatselt kõiki tööaja olekuid.

**Praegu uut eksporti ei küsita ega MIDI-kirjutust ei tehta.** Järgmise
seadmekatse ettepanek peab tulema valmis tabeli ja korratava lähteolekuga,
eelistatult mitu eristatavat kontrolli ühes ekspordis. Üksikute muutujate
eksporte ega varem tehtud katseid ei korrata.
`generatorWriteSupportAdded=false`, `fullRangeEncodingProven=false`.
