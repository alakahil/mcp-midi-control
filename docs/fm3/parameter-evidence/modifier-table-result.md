# MODE1: algataja 0x82c228 tabelirajad ja tegelik ulatus, 22.10.2026

Alus: commit `196fdfd953a2fd5e329c8ad2fa0bc2bacc835f25`, tööaruande
versioon 26 ja sama olemasolev FW13 binaar. **Tootmisplugin 0.3.13.**

## Uus tõendatud tulemus

**Neli uut abifunktsiooni on sünkroonsete MODE1 mõjude osas piiritletud.**
Kahe matemaatikalehe taastamine toimub 48-bitise tagastuse esimeses
viitekäsus. Seetõttu ei sõltu nende tõend lahtisest kompaktse tagastuse
kodeeringust. Põhialgataja `0x82c228` tervikuna jääb avatuks.

| Funktsioon | Kontrollitud MODE1 tulemus | Eeldus/piir |
|---|---|---|
| Matemaatikaleht `0x1cb5b4` | MODE1→I12 `0x1cb5c0`; SET BDCST1; CLR RND32; taastamine `0x1cb610`, pärast RTS(DB) `0x1cb60d` | Jagatud MODE1/I12 register nii SISD kui SIMD puhul; I12 puutumatus; 48-bitine tagastus |
| Matemaatikaleht `0x834632` | MODE1→I12 `0x83463a`; SET BDCST1; CLR RND32; taastamine `0x83468c`, pärast RTS(DB) `0x834689` | Sama jagatud registri ja viiteala kontroll; matemaatiliste väljundite täpsust ei tõendata |
| Tabelite algseadistaja `0x82f89e` | Seitse SIMD-tsüklit, seitse esimese matemaatikalehe kutset; kõik bitid taastuvad tagastumisel | PEYEN=0 sisenemisel; riistvaratsüklite kordus- ja väljumisservad kaasatud |
| Ümbertõstmise abifunktsioon `0x82ddb2` | Otseseid MODE1 kirjutusi ega alamkutseid pole; kõik tagastuvad rajad säilitavad MODE1 | Skalaarne ABI ja kehtiv mälu; kopeerimise tulemust ega tsüklite lõppemist ei tõendata |

Täiendavalt laiendati olemasoleva mälutäitja `0x1cbe86` MODE1-lepingut
uuele tegelikule kutsele. `0x82c234` laadib R12=`0xcafbc0` ehk
**13 302 720 baiti** ning `0x82c240` kutsub mälutäitjat pointeriga
`0x8157fb20`. Varasema `0x4c00` sisendi tõendit ei kantud üle pimesi:
uuesti kontrolliti sisendi edastust ja signed-võrdlust R12 < 4.

Sama graafi väikese sisendi haru välistamise tingimus kehtib
**4 ≤ R12 ≤ 0x7fffffff**. Kõik ülejäänud tundmatute tingimuste harud
jäävad kontrolli. See laiendus puudutab MODE1 taastumist kehtiva mälu
eeldusel; see ei tõenda suvalise suurusega mälutäitmise korrektsust või
saadaolevat mälu. Väikese sisendi seni dekodeerimata haru ei kinnitata.

## Põhialgataja sõltuvused

Algataja kontrollitud piir on **`0x82c228 .. 0x82c431`**, lõpp välistatud.
Selles on **16 tavapärast kutsekohta 12 eri funktsioonile** ning kaheksa
veakutset `0x8336c8`-sse. Viimaste mittetagastuvus kontrolliti eelmise
auditi taasesitusega. Nende järel ei minda naaberfunktsiooni `0x82c431`.
Kaheksa veakontrolli mõlemad harud on graafis; võrreldavate konstantide
võrdsust ei kasutata siin harude eemaldamiseks.

| Otsesõltuvuste seis | Funktsioonid |
|---|---|
| Selle kutse sisenditega kontrollitud, 4 | `0x1cbe86`, `0x1cb5b4`, `0x82ddb2`, `0x82f89e` |
| Alles lahtised, 8 | `0x82f428`, `0x82ddff`, `0x82e288`, `0x82c9c2`, `0x82cc33`, `0x81b2be`, `0x81107e`, `0x82be50` |

**Nende kaheksa eelduse puudumisel peab põhialgataja kontroll
ebaõnnestuma.** Eraldi tingimuslik diagnostika loetleb need kõik
`assumedCallees` väljal; `closed=false`. See ei ole lõpetatud
algatajatõend. Teine uus matemaatikaleht `0x834632` aitab järgmisi
alamradu kontrollida, kuid ei ole põhialgataja otsene kutse.

Oluline ulatusleid: `0x82be50` sisaldab **44 otsest kutsekohta 44 eri
sihtfunktsioonile**. Need koordinaadid on kontrollitud algbaitide vastu
ja salvestatud auditisse. Funktsioonis endas ei nähtud MODE1 kirjutusi,
kuid alamkutsete mõju jääb avatuks. Kataloog pole kogu rekursiivse
kutsepuu inventuur ega säilitamistõend.

Uuriv dekodeerimine näitas lisaks avatud töökohti: `0x82c9c2` kutsub
jagamisvarianti `0x1cb18a`, milles on taas kompaktse tagastuse kandidaat;
`0x82e288` abi `0x837f8a` ning `0x81107e` sisaldavad praeguse kohaliku
dekooderi toetamata käske. Neid vaatlusi ei kasutata tõendina, et kogu
alamfunktsioon oleks ohutu. Uurivad disassemblid on töömaterjal;
auditi tõendatud ulatus piirdub kuue manifesteeritud piirkonnaga ja
taasesitatud eelmise auditi lepingutega.

## Diagnostikasildi parandus

Eelmise auditi koodis oli ühe kontrolli veateade `Temporary TRUNCATE`,
kuigi kontrollitud mask oli `0x800000`. Tootja MODE1 tabeli järgi:

| Bitiväli | Mask |
|---|---|
| BDCST1, I1 kaudu loetu edastamine mõlemale töötlusüksusele | `0x800000` |
| RND32, 32-/40-bitise arvutustäpsuse valik | `0x10000` |
| TRUNCATE, ümardusrežiim | `0x8000` |

Parandati **diagnostikasildi nimi**. Algbaite, bitimaske, varasemat
MODE1 algebrat ega audititulemusi ei muudetud; eelmise auditi taasesitus
annab endiselt täpselt sama JSON-i. See on eriti oluline, et broadcast'i
ja ümardamist edasises Min/Max analüüsis mitte segi ajada.

## Kontrollid ja piirid

- **6 uut piirkonda, 886 käsupiiri.** Matemaatikalehtede tõendid:
  34 ja 33 sümboolset olekut; tabelite algseadistus 131; ümbertõstmine 23;
  mälutäitmise uus sisendileping 49. Need pole seadmekatsete arvud.
- **8/8 uut testi** läbisid: õige 48-bitine tagastus, puuduva/vales kohas
  taastamise tõrjumine, mõlemad viitekäsud, I12 rikkumine, SIMD sisendi
  nõue, signed-suuruse piirid ja kõigi lahtiste sõltuvuste nähtavus.
- **10/10 eelmise puhvrietapi testi** korrati, sest jagatud graafiehitaja
  sai uue 48-bitise tagastuse toe. Eelmine audit jäi muutumatuks.
- Uue auditi loomine ja eraldi taasesitus läbisid. Kogu CI-d,
  tootmisgeneraatorit ega füüsilisi katseid ei korratud.

```sh
python3 tools/fm3/test-modifier-table.py
python3 tools/fm3/test-modifier-buffer.py
python3 tools/fm3/modifier_table_audit.py --firmware /path/to/fm3_dsp_rel_13p00.syx
```

[Audit](modifier-table-audit.json) · [Kontrollpunktid](modifier-table-checkpoints.json)

## Järgmine ökonoomne samm

44 konstruktorikutse leid muudab töömahtu: kogu puu järjest läbimine
võib korrata samu matemaatika- ja taastamisabide kontrolle. Järgmine
samm on **RND32/TRUNCATE-d mõjutavate MODE1 kirjutuskohtade
koondinventuur olemasolevas koodis**, alustades otsestest bitimaski
käskudest. Iga tabamuse käsupiir ja taastamine tuleb eraldi kontrollida;
paljas baidimustri tabamus ei ole tõend käsu täitmise kohta. Kaasa tuleb
võtta ka kogu MODE1 sõna kirjutused ning status-stack'i taastamisrajad.
See aitab valida lahtisest kutsepuust järgmised tegelikult olulised lõigud.

Lahtisi põhialgatajaid on endiselt **5**. Kompaktne tagastus, katkestuste
ja erandite kogu mõju ning MODE1 tegelik olek salvestushetkel jäävad
avatuks. **Uusi füüsilisi eksporte 0; uut REA dekompileerimist 0.**
Sessiooni tööriistade hulgas pole otse kutsutavat REA/Ghidra teenust;
varasemad REA tulemused on taustmaterjal, uus töö on staatiline kontroll.

Wahi lohistatud Min 2.50 / Max 7.50 / Max 5.00 raw-sõnad
**16375 / 49159 / 32784**, sendisammu kandidaadi **1000/1001** ulatus
ja **6.47 blokeering** säilivad. Täielik Min/Max teisendus ja uus
generaatori kirjutustugi pole kinnitatud. Uut eksporti ei küsita, sest
praegused lahtised küsimused puudutavad olemasoleva koodi tõlgendust.

Allikas: [SHARC+ Core Programming Reference, rev1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf),
§4–59/60, §15–17..19 ja tabel 29–19, lk 29–55;
SHA-256 `a3edf83beb75b44a77f8366cf54c0353083ab49a1c69d8179d2b727ba7ba1470`.
FW13 ja piirkondade räsid on kontrollpunktides.
