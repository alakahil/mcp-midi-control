# Filteri kogumine — 0.52.0

**Uuendus 0.53.0: kogumine on lõpetatud.** Kasutaja tulemuste ZIP sisaldab
kuut läbitud GET/SYX-paari, kõik 18 tüüpi on olemas ja 888 sõna kattuvad.
Audit `FM3_FILTER_COLLECTION_VALIDATION.json`. Kogumist ega algset Null-GET-i
ei korrata. Mallid on nüüd ühises koostajas: [Filteri juhend](FM3_COMPOSER_FILTER.md).
Alljärgnev koguja ettevalmistus ja selleaegne OOTEL-seis on ajaloolised.

Kasutaja alustas Filteri etappi 2026-10-08 ning saatis ühe NewLooki alusel
FM3-Editis eksporditud preseti ja täieliku Type-loendi pildi. Kontrollitud
alus ja koguja on valmis. Esimene tegelik Filteri GET/SYX-paar on veel ootel.
Koostaja Filteri kirjutust see väljalase ei aktiveeri.

## Aluse kontroll

Fail: `skills/instructions/scripts/filter-collector/baseline.syx`.
SHA-256: `9a254a1af26b64025cb9a281fb53845e7e7f95a6713ea2ec5d2b7e670edbfd80`.
Pilt: `skills/instructions/references/filter-20261008/type-list.png`.

Filter1 on Cab1 järel, rida2/veerg9, varasema shundi 1028 asemel. EID 114,
kirje 342 baiti: 46-baidine päis ja 4 × 37 parameetrisõna. Kirje algab 7568,
parameetrid 7614; järgmine Drive'i kirje algab 7910. Struktuur määrati
olemasolevate kirjete järjestikuste piiride järgi, mitte ülddekoodri nihke
või juhusliku päiselaadse numbrijada järgi. Keha13 146 baiti; kaadrid, CRC
ja footer läbivad. Eemaldades ainult Filteri kirje ja taastades gridi shundi,
saadakse täpselt varasema NewLooki kogu 12 804-baidine keha.

Valitud on Scene2 ja Filter A. **Filter on aluses sees**, mitte bypass'is;
kõigi 8 stseeni kanalivalik on A ja bypass-sõna 0. Pildil on valitud Null.
Kõigi kanalite esimene parameetrisõna on 0; Type pid 0 on olemasoleva kataloogi
ja pildi põhjal kandidaat, mida esimene tegelik GET/SYX-paar peab kinnitama.
Pildist ei järeldata numbrilisi skaalasid ega teiste tüüpide ID-sid.

Audit `FM3_FILTER_BASELINE_AUDIT.json`, korratav `test-filter-baseline.mjs`.

## Pildilt loetud tüübid

| Järjekord | Nimi | Järjekord | Nimi |
|---|---|---|---|
| 1 | All-Pass | 10 | Low-Pass |
| 2 | Auto-Wah | 11 | Low-Shelf |
| 3 | Band-Pass | 12 | Low-Shelf 2 |
| 4 | Envelope Filter | 13 | Notch |
| 5 | Feedback Comb | 14 | Null |
| 6 | Feedforward Comb | 15 | Peaking |
| 7 | High-Pass | 16 | Peaking 2 |
| 8 | High-Shelf | 17 | Tilt EQ |
| 9 | High-Shelf 2 | 18 | Touch-Wah |

Need numbrid on ekraaniloendi järjekord, mitte Type-ID. Registris on teiste
tüüpide binaar-ID `null`; seosed saadakse kasutaja kinnitatud valikutest ja
GET/SYX paaridest. Nulli esialgne tunnus 0 kinnitatakse esmase paariga.

## Koguja kasutamine

Koguja kaust: `skills/instructions/scripts/filter-collector`.
Allalaaditavas ZIP-is on see nimega `FM3_FILTER_COLLECTOR`.
Paki lahti Downloads-kausta. Vaja on varasematega sama Python3 ja Node'i.

```bash
python3 ~/Downloads/FM3_FILTER_COLLECTOR/FM3_FILTER_BATCH.py --port /dev/cu.usbmodem211104
```

Kasuta seda porti ainult siis, kui see on endiselt kasutaja FM3 tegelik port.
Koguja ei otsi ega proovi muid porte automaatselt.

1. Jäta seadmesse saadetud alusfaili täpne seisund: Scene2, Filter A Null,
   Filter aktiivne. Kui seadeid muudeti, impordi kaasasolev `baseline.syx`
   tööpuhvrisse. Sulge FM3-Edit/Fractal-Bot ja kinnita terminalis üks GET.
2. Esimene kontroll peab võrdlema kõik 148 sõna. Pärast PASS-i ava FM3-Edit,
   lülita Filter1 Scene2-s bypass'i ning vali terminali küsitud A–D tüübid.
   Esimene nelik: All-Pass, Auto-Wah, Band-Pass, Envelope Filter.
3. Hoia Scene2 ja Filter bypass'is. Muuda ainult küsitud kanalite Type'i;
   Type'iga automaatselt muutunud parameetrid jäta selliseks. Ekspordi terve
   preset, lohista terminali, kinnita nimed, sulge FM3-Edit ja kinnita üks GET.
4. Korda viit rühma: 4+4+4+4+1, sest Null on algkontrollist olemas.
   Ülejäänud plokid ja expression säilivad. Viimase rühma nimetamata kanalid
   jäävad samaks. Lõpuks saada üks `FM3_FILTER_BATCH_*.zip`.

q lõpetab koos seniste tulemustega ZIP-iga. Sama käsk jätkab kinnitatud
tulemustest. `--export-only` teeb ZIP-i ilma seadet avamata. Kausta koos
`FM3_FILTER_SESSION` alamkaustaga tuleb säilitada. Vea järel automaatset
korduspäringut ei tehta; sama käsk käivitatakse pärast põhjuse parandamist.

## Kontroll ja piirid

Seadmele kirjutatakse ainult kinnitatud üks päring
`F0 00 01 74 11 1F 72 00 79 F7`. Ühendus on POSIX macOS/Linux;
SET, SAVE/Store, handshake, kanali/preseti valik ja automaatne retry puuduvad.
Toorvastus, kaadrid, sõnad, paariline SYX ja kasutaja kinnitatud nimed säilivad.
Koguja kontrollib ühte täielikku saatmist, identifikaatorit 114, koguarvu 148,
kaadrite järjekorda, kontrollsummasid ning iga sõna vastavust SYX-ile.
Andmekaadrite jaotus võib olla üks või mitu korrektselt loendatud lõiku;
esimene päris vastus annab tegeliku jaotuse tõendi.

SYX-i kogu keha peab alusega kattuma väljaspool Filteri parameetreid ning
Scene2 Filteri kanali/bypass'i kahte sõna. Tüübirühma fail nõuab bypass'i;
algkontroll võrdleb muutmata aktiivset Null-alust. Muudatused muudes plokkides,
routing'us, stseenivalikus, nimedes ja süsteemiandmetes peatavad töö enne GET-i.
Preseti päise nimi võib ekspordis erineda; stseeninimed on kehaga fikseeritud.

`test_filter.py` kasutab sünteetilisi vastuseid ja mock-seadet. See kontrollib
alg- ning esimese rühma täielikku töövoogu, osadeks saabuvat vastust, vigaseid
kaadreid, GET/SYX erinevusi, kõrvalmuudatusi, aktiivse rühma tõrjet, jätkamist,
ZIP-i, kordus-GET tõket ja rikutud salvestatud tõendeid. Tulemused
`FM3_FILTER_COLLECTOR_TESTS.json`; need pole päris seadmekatse.

Järgmised väravad: tegelike paaride kontroll ja tüüpide täielikkus, mallide
lisamine ühisesse koostajasse koos uue plokikoha ja stseenidega, seejärel
vajalike Frequency/Q/Gain/Level punktide mõõtmine ning üks loodud näidise
import/tagasieksport. Orderi vastuolu jääb kuni sihitud mõõtmiseni lahtiseks.
