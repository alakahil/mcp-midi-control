# PEQ laienduse puuduvate tõendite kogumine

2026-10-09: **kogumine lõpetatud, 84/84 sammu kontrollitud**. Nelja varasemat
ebaõnnestunud katset ei kasutata tõendina. Plugin0.64.0 / koostaja0.10.0
ühendab mõõdetud võimalused; järgmine on üks ühine A–D kontrollpreset.
Loe [kehtivat PEQ juhendit](FM3_PEQ_COMPOSER.md). Ära korda allolevat
kogumist. Järgnev säilib koguja0.1.0 ajaloolise tööjuhendina.

Kasutaja kinnitas 2026-10-09 PEQ lõpetamise enne Graphic EQ/Enhancerit.
Aluseks on varem kinnitatud algpaar: `FM3_PEQ_BASELINE.syx`, SHA-256
`c1a706b9078793dd3c8db4873e329f06d2a5f96a1f4be201a4501477821277be`.
Algpaari, vana A/Band 3 kogumise ega kuuldud kontrollpreseti kordust ei nõuta.
CPU 47–48% ning positiivne kuulamine jäävad selle eelmise kontrollpreseti tõendiks.

## Ulatus ja lõpetamise tunnused

| Osa | Uus tõend | Rakendamise tingimus |
|---|---|---|
| Type 1–5 | Iga pildil nähtav valik, 20 üleminekut | Ekraaninimi ja tegelik kood; seotud muudatused eraldi |
| Slope 1/5 | Blocking korral 6/12/18/24/30/36 dB/oct | Tegelikult saadaval valikud ja salvestuv sõna |
| Frequency/Q/Gain | Uute ribade üksikankrud, viie riba miinimum/maksimum ja 2 vahepunkti | Monotoonsus, skaala ja ühikud kontrollitud; puuduvat ei interpoleerita oletusena |
| Level/Balance | Piirväärtused, vahepunkt ja neutraali taastamine | Võimalik Leveli −∞ eraldi, mitte arvuline interpolatsioon |
| Bypass Mode | Mute ja Thru kandidaat | Tegelik menüü, kood ja sama seisundi paar |
| Solo/Scene Ignore | ON/OFF | Erista presetti salvestuvat ja ajutist UI olekut |
| A–D | 33-sõnaline A→B/C/D koopia, sõltumatu Gain ning Scene 2 kanalivalik | Allika ja teiste kanalite puutumatus |

Kokku 84 kavandatud sammu: 32 tüüpi/Slope, 24 arvulist, 21 üldjuhti, 7 kanalit.
Rühmamõõtmised toimuvad alles plaanis olevate üksikankrute järel; vahelejäänud
ankur jätab vastava tõendi puudulikuks ega anna rühmapunktidele automaatselt
isoleeritud semantika kinnitust. Kõik vahelejätmised säilivad.

## Koguja piirid

`skills/instructions/scripts/peq-full-collector/` sisaldab juhendit, plaani,
algfaili, olemasolevat muutmata POSIX transporti ja kontrollitud koodekit.
Kasutaja paketis on juurkaust `FM3_PEQ_FULL/`.

Iga eksport läbib enne seadme avamist kogu 13 456-baidise keha, päiste,
kontrollsummade, pikkuste, täite ja kaadriprefiksite kontrolli. Lubatud on
ainult sammu nimetatud PEQ sõnad; kanali kopeerimisel täpne 33-sõnaline koopia
ning Scene 2 PEQ kanalivalik. Type-vahetusel lubatakse raporteeritavad sama
riba Frequency/Q/Gain/Slope kõrvalmuutused, mitte suvaline terve ploki muutus.
32 nimebaidi muutus raporteeritakse eraldi. Muud stseenid, routing ja plokid
säilivad. Iga päringu eel eraldi `jah`; üks GET, puhastatud RX ja 132/132 paar.
Sama sessiooni paralleelkäivitus blokeeritakse. Failinud/poolikud tõendid
säilivad, kuid ei lähe edukate hulka. Jätkamine kontrollib varasemaid faile uuesti.

Uue koguja katsed on sünteetilised ja asuvad `TEST_RESULTS.json` failis.
Transport on varasemast päris kogumisest muutmata. See ei ole uute PID-de,
vahemike, tüüpide või kanalite firmware 13 valideerimine.

## Pärast tulemuste ZIP-i

1. Kontrolli iga edukat sammu uuesti sama versiooni `resume()` abil ning
   võrdle iga ekraaninäitu tegeliku muutuse ja 132-sõnalise paariga.
2. Koosta tõendipõhine register. Erista üksikankrud, rühmapunktid, Type'i
   seotud muudatused, salvestumata UI nupud ja puuduvad katsed. Üksikpunkt
   ei kinnita tervet skaalat. Avalik kooditabel ei asenda neid mõõtmisi.
3. Lisa viie riba ja A–D ühine sisend, tüübisõltuv Gain/Slope, Level/Balance,
   kinnitatud ühised lülitid ja stseenide kanalivalik. Tõrju tõendita valikud.
   Hoia kahe rea Send/Return paigutus ning V3 teiste plokkide tasemed.
4. Kontrolli skaala järgi kodeerimist ka sõltumatute uute vaheväärtustega
   loodud A–D presetis: import, ekraaniväärtused, tagasieksport, stseenivahetus.
   Alles läbimise järel nimeta laiendatud tugi valmis. Heli/CPU on eraldi vaatlus.
5. Graphic EQ ja Enhancer tulevad pärast PEQ kokkulepitud ulatuse lõpetamist.

## Uurimisallikad

- Kasutaja viis FM3-Editi Type-menüü pilti: `peq-user-feedback-20261009.json`.
- Kaasasolev forgefx-midi commit `553d24b7409302908d5c7e46a71b45e07dffdc05`:
  koodeki PEQ PID-/parameetritabelid on kogumise kandidaadid, mitte seadmetõend.
- [Tootja Blocks Guide, PEQ lk 63](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf)
  kirjeldab viit riba, Blocking/Slope ning ühiseid juhte. Juhendi Gain ±12 dB
  ja kooditabeli ±20 dB erinevuse tõttu küsitakse tegelikud ekraanipiirid.
  See 2023. aasta juhend ei kinnita üksinda firmware 13 binaarvormingut.
