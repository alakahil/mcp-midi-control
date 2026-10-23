# MODE1 mälusõna päritolu: frame ja kattuvad kirjutused, 22.10.2026

Alus: kohalik commit `55cca41bc2e56a509332e416090a005b7f741857`,
tööaruande versioon 30 ja sama räsidega seotud FW13 binaar.
**Tootmisplugin on endiselt 0.3.13.**

## Tulemus

**Salvestus `0x837b5a` ja laadimine `0x837bad` osutavad samale
I6−52 väljale allpool nimetatud ABI ja mälueeldustel.** Lähedus koodis
ei ole enam ainus põhjendus: leiti kolm konkreetset kutset ning loeti
üle nende ja funktsiooni alguse pinusalvestused.

Samas **ei ole veel tõendatud selle sõna rikkumata säilimine tegelikus
töös**. Salvestuse ja laadimise vahel on viis kirjutuskohta, mille
I4/I5-puhvrite tegelikud aadressid ja ulatused jäävad teadmata.
Tingimuslik säilitamissertifikaat ei muutu kinnitatud generaatori
kirjutustoeks ega Min/Max-i tööaegse ümardusrežiimi tõendiks.

## Konkreetne kutsumisraam

Kolm kutset sihtkohta `0x837b00` on aadressidel **`0x1c95ec`,
`0x1c960d` ja `0x1c962e`**. Iga kontrollitud 14-baidine lõik sisaldab:

1. Kuue baidi pikkune `CJUMP 0x837b00 (DB)`: I6 saab vana I7 väärtuse
   ning R2 vana I6 väärtuse. CJUMP ise I7-t ei vähenda.
2. Kahe baidi pikkune `DM(I7,M7)=R2`, postmodify.
3. Kuue baidi pikkune `DM(I7,M7)=tagastussõna`, postmodify.

Viitekäske on **kaks**, ehkki nende kogupikkus on neli VISA parcel'it.
Kui M7=−1 ja tegemist on lineaarse 32-bitise normal-word pinuga
baidaadressiruumis, on funktsiooni sisenemisel **I7=I6−8**.
Salvestatud tagastussõnad on vastavalt `0x1c95f2`, `0x1c9613`,
`0x1c9634`; M14=1 korral on jätkukohad ühe parcel'i võrra hilisemad.

M7=−1 ja M14=1 algseadistused kontrolliti FW13 käskudes
`0x8343a6` ja `0x8343a8`. Nende kehtivust igas tööaegses kutses ei
tuletata üksnes algseadistusest. Samuti on eelduseks SISD sisenemine,
kehtiv joondatud pinu ja selle aadressiarvutuse puuduv ringpuhvri mähkimine.

## Funktsiooni salvestused

| Salvestatud register | Salvestuskoht | Nihe I6-st baitides |
|---|---|---:|
| R5 | `0x837b06` | −8 |
| R6 | `0x837b07` | −12 |
| R9 | `0x837b08` | −16 |
| R10 | `0x837b0b` | −20 |
| R11 | `0x837b0c` | −24 |
| R13 | `0x837b0d` | −28 |
| R14 | `0x837b0e` | −32 |
| B9 | `0x837b0f` | −36 |
| I9 | `0x837b11` | −40 |
| M8 | `0x837b13` | −44 |
| R8 | `0x837b15` | −48 |
| **MODE1** | **`0x837b5a`** | **−52** |

Seega `−8 + 11 × (−4) = −52`. MODE1 salvestuse järel on I7=I6−56.
Laadimine `MODE1=DM(-13,I6)` loeb samadel mälueeldustel I6−52.
Ülevaadatud funktsioonis ei muudeta sellel rajal I6-t ega M7-t;
I7 muudatused on loetletud postmodify-salvestused. RFRAME asub alles
tagastuse viitekäsus.

Funktsiooni `0x837b00…0x837c26` 121 käsku ja kolm kutselõiku annavad
**4 räsiga seotud piirkonda, 130 käsupiiri ja 630 baiti kaetud lähtekoodi**.
Binaarfaile ei lisatud. Juhuvoog kontrollitakse eraldi native
hargnemis-, tsükli- ja tagastuskäskudest; uurimusliku SLEIGH dekoodri
vana signed24-tsüklisihti ei kasutata. Kogu funktsiooni käskude
jaotuse ning muude MODE1/pinuviida muutuste puudumise alus on
räsiga seotud käsitsi ülevaatus, mitte täielik CPU-emulaator.

## Viis lahtist mälukirjutust

| Käsk | Kirjutusoperand | Indeksimuutus |
|---|---|---|
| `0x837b7a` | `DM(I4,M7)=R4` | Postmodify |
| `0x837b80` | `DM(I4,M2)=S4` | Postmodify |
| `0x837b82` | `DM(I4,M6)=S4` | Postmodify |
| `0x837ba4` | `DM(M4,I5)=R13` | Premodify; I5 ei uuene |
| `0x837ba7` | `DM(I5,M2)=R12` | Postmodify |

Siin on loetletud salvestatud MODE1 sõna eluea sees olevad võimalikud
kirjutused. Tingimuslike käskude täitmist ei välistata arvuliste oletustega.
Iga koha puhul tuleb välistada kattumine **igal tsükliiteratsioonil,
kõigi aktiivsete PEx/PEy kirjutuste ja füüsiliste mälu-alias'te kaudu**.
Pelgalt lähteindeksi võrdlus I6−52-ga ei piisaks.

`0x837b5c` mask **`0x80600000`** lülitab sisse SELPE, BDCST9 ja PEYEN.
See ei muuda RND32/TRUNCATE ega I6/I7 DAG-panga valikut, kuid SIMD ja
tingimuslik PE-valik on mälukirjutuste ulatuse hindamisel olulised.
Kaks compute-väljaga Type3a kirjutust jäävad täieliku sõltumatu
opcode-kehtivuse kontrollita: käsiraamatu vigast Type3a joonist ei
kasutata täieliku dekoodri kinnitamiseks. Nende käskude ülevaatus on
seotud tegelike baitide räsiga.

## Kontrollid ja tõendi piir

Sümboolne kontroll läbib mõlemad harud, varajase tagastuse ja tsüklite
võimalikud kordused: **136 olekut**, tavaline tagastus `0x837bd8`.
Kõik lõplikud tagastused säilitavad siseneva MODE1 **eeldusel**, et
kehtivad ABI/mälu tingimused, puudub asünkroonne sekkumine ning viis
kirjutuskohta ei riku salvestatud sõna. Puhvrid ei tohi viidata ka
režiimiregistrite MMR-alias'tele ega rikkuda juhtimisraami.

Ühegi nimetatud viie koha mittekattumise eeldust ei tohi vahele jätta:
iga eelduse eraldi eemaldamisel keeldub kontroll säilitamist kinnitamast.
See on **viis negatiivset kontrolli tegeliku juhuvoo vastu**.

**9/9 uut testi läbisid**: Type3c operandieristus, CJUMP kaks viitekäsku,
raami geomeetria ja valed alternatiivid, piiratud Type3 tõenditase,
harud/tsüklid, võimalik ülekirjutus, vale/päritoluta taastamiskoht,
taastamata tagastus ja lahtised juhuvooservad. Auditi loomine ning
eraldi kordusarvutus läbisid; eelmine kontekstiaudit taasesitati muutumatult.
Jagatud kontrollimootoreid ei muudetud ja kogu CI-d ei korratud.

```sh
python3 tools/fm3/test-modifier-frame.py
python3 tools/fm3/modifier_frame_audit.py --firmware /path/to/fm3_dsp_rel_13p00.syx
```

`sameAddressUnderAbiPremises=true`, kuid
`sameUnmodifiedSavedWordProven=false`, `fullFunctionModePreservationProven=false`,
`runtimeModeAtStoreProven=false`, `fullRangeEncodingProven=false` ja
`generatorWriteSupportAdded=false`. Tsüklite lõppemist ega kogu programmi
kaetust ei väideta. Kompaktse RTI lahtine küsimus ei olnud selle funktsiooni
tagastuse tõendi eelduseks; laiem ajastaja küsimus jääb siiski avatuks.

## Järgmise uurimise piiritlemine

Ümbrisfunktsioonide esialgne prefiksiotsing samas kuues VISA piirkonnas
(pakitud ISA, kattuva laadimise ja katmata mälu välistustega) andis
13 võimalikku kutsekohta:

| Ümbrise alguse kandidaat | CJUMP prefiksi asukohad |
|---|---|
| `0x1c95d8` | `0x1c2785`, `0x1c634a`, `0x1c6361`, `0x81223d`, `0x812259`, `0xbb891f`, `0xbb8939`, `0xbb894e` |
| `0x1c95f9` | `0x1c12fa`, `0x1c1386`, `0x1c5c30`, `0x81f13d` |
| `0x1c961a` | `0x1c2773` |

Need **13 on otsinguvihjed**, mille käsupiire, saavutatavust ja task'i
kuuluvust selles etapis ei sertifitseeritud. Need ei lisa 13 kinnitatud
kutset ülal tõendatud kolmele frame'i-lõigule ega ole täielik xref-loend.

**Järgmine samm:** esmalt selgitada, kas ja millised ümbriste kutsujad
kuuluvad Min/Max salvestust mõjutavasse task'i või katkestusrada.
Seejärel jälitada asjakohaste I4/I5 puhvrite algusi ja ulatusi.
Nii ei laiendata analüüsi põhjendamatult kõigile 13 vihjele. Uus füüsiline
presetieksport neid koodiaadresse ega pinu-puhvri seoseid ei näitaks,
seetõttu seda praegu ei küsita.

**Uusi eksporte 0; uut REA dekompileerimist 0.** Sessioonis ei olnud
kutsutavat REA/Ghidra teenust; kasutati olemasolevaid baite ja tootja
käsiraamatut ning kohalikku staatilist analüüsi. Varasemad REA tulemused
ei muutu selle tõttu uueks REA analüüsiks. Wahi raw-sõnad
**16375 / 49159 / 32784**, sendisammu kandidaadi **1000/1001** ulatus
ja **6.47 blokeering** säilivad. Uut tootmisväljalaset ei loodud.
