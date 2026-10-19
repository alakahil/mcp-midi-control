# Filteri mõõdetud juhid — 2026-10-12 arenduslisa

Kohalik koostaja `jb-composer-0.13.0-dev` toetab nüüd kokku 40 mõõdetud
punkti 32 tegeliku GET/SYX-paari põhjal. Uues kogumises on 15 eksporti,
23 mõõtepunkti, 2220/2220 kattuvat sõna ning mitte ühtegi vahelejätmist.
Kaks varasemat ebaõnnestunud katset säilivad algtõendis ja on lahendatud.
Avaldatud plugin pole muutunud: selle lähtearhiivi lugemine annab endiselt
HTTP 409 „Plugin archive contains too many entries”.

| Kanal | Type | Väli | Mõõdetud sihtväärtused |
|---|---|---|---|
| A | High-Pass | `frequencyHz` | 20, 80, 120, 250, 750, 20000 |
| B | Low-Pass | `frequencyHz` | 20, 1600, 4000, 6000, 8000, 20000 |
| C | Peaking | `frequencyHz` | 20, 500, 1000, 2000, 3200, 20000 |
| C | Peaking | `q` | 0.1, 0.707, 1, 1.4, 2, 10 |
| C | Peaking | `gainDb` | -20, -10, -3, 0, 3, 20 |
| C | Peaking | `levelDb` | -80, -30, -6, 0, 3, 20 |
| A | High-Pass | `order` | "2nd", "4th" |
| B | Low-Pass | `order` | "2nd", "4th" |

Q 0.707 on nüüd mõõdetud ja kirjutatav. Order PID7 on otseenum:
2nd = 0, 4th = 1. Muude tüüpide/kanalite Order ei kuulu sellesse tõendisse.

Sageduse tegelikud näidud säilivad eraldi: B 1600→1599.9, 4000→3999.9,
6000→6000.1, 8000→7999.9; C 2000→1999.9 ja 3200→3199.9 Hz.
Sisendiks sobivad nii mõõdetud siht kui ka selle salvestatud ekraaninäit.
Kõik 40 punkti sobivad auditisse salvestatud logaritmiliste/lineaarsete
kandidaatvalemitega. Kirjutus kasutab siiski täpseid mõõdetud sõnu;
vaheväärtuste interpolatsiooni ega ülejäänud juhtide tuge ei lisatud.

Kasuta `fm3-generate.mjs --capabilities` või `getComposerCapabilities()`
kehtiva masinloetava toe küsimiseks. Lisatõend: `references/filter-rea-controls.json`
ja `references/filter-rea-20261012/`; algse 17 punkti failid säilivad muutmata.
Audit: [FM3_FILTER_REA_AUDIT_20261012.json](FM3_FILTER_REA_AUDIT_20261012.json).
Generaatori kontroll: [FM3_FILTER_REA_GENERATOR_TESTS.json](FM3_FILTER_REA_GENERATOR_TESTS.json).

Filter oli kogumisel kõigis stseenides bypass-is. See ei kinnita aktiivse
Filteri heli ega CPU-d. Täpse juba eksporditud sisuga väljundi jaoks ei ole
uut eksporti vaja. Ära paku nende lõpetatud punktide jaoks uut kogujat.

---

Allpool on algse 2026-10-08 toe ajalooline kirjeldus; ülalolev lisa asendab
selle Q 0.707 ja Orderi puudumise ning toetatud väärtuste loendi.

# Filteri mõõdetud juhid ühises koostajas — 0.55.0

17 tegelikku GET/SYX-paari kinnitasid Frequency PID1, Q PID2, Gain PID3 ja
Level PID4. Iga muudatus oli üks parameetrisõna ning igas paaris kattusid
kõik 148 sõna, kokku 2516. Algse nimevea järel kordamine õnnestus.
Q=0.707 jäeti põhjusega „väärtus juba sama” vahele; see ei ole mõõdetud
kirjutuspunkt. Seda ega lõpetatud punkte ei ole vaja praeguse toe jaoks uuesti koguda.

## Toetatud punktid

| Kanal | Tüüp | Sisendväli | Küsitavad punktid | Tegelik ekraaninäit |
|---|---|---|---|---|
| A | High-Pass | `frequencyHz` | 80, 120, 250 | samad Hz väärtused |
| B | Low-Pass | `frequencyHz` | 4000, 6000, 8000 | 3999.9, 6000.1, 7999.9 Hz |
| C | Peaking | `frequencyHz` | 500, 1000, 2000 | 500, 1000, 1999.9 Hz |
| C | Peaking | `q` | 1.4, 2 | samad väärtused |
| C | Peaking | `gainDb` | -3, 0, 3 | samad dB väärtused |
| C | Peaking | `levelDb` | -6, 0, 3 | samad dB väärtused |

Sisendiks sobib ka loetletud tegelik ekraaninäit. Näiteks `frequencyHz:2000`
ja `frequencyHz:1999.9` kirjutavad C Peakingus sama mõõdetud toorväärtuse.
JSON/TXT säilitavad küsitud arvu ning tegeliku ekraaninäidu eraldi. Väärtused
1000 ja 0 ei asendu vaikimisi puudumisega. Vaheväärtusi ei interpoleerita.
Muudel kanalitel või tüüpidel, sh Peaking 2 ja Tilt EQ, neid juhte ei kirjutata.
Kõigi 18 tüübi A–D täiskanalimallide tugi jääb alles.

## Üks kirjeldus

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB WITH FILTER CONTROLS",
  "filterChannels": [
    {"channel": "A", "type": "High-Pass", "frequencyHz": 120},
    {"channel": "B", "type": "Low-Pass", "frequencyHz": 6000},
    {"channel": "C", "type": "Peaking", "frequencyHz": 1000,
     "q": 1.4, "gainDb": 3, "levelDb": 0}
  ],
  "scenes": [
    {"scene": 2, "blocks": {"filter": {"channel": "A", "bypass": true}}},
    {"scene": 6, "blocks": {"filter": {"channel": "C", "bypass": true}}}
  ]
}
```

Kasuta puhast `examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx` alust. Samasse
kirjeldusse võivad jääda Amp/Cab/Drive/Delay/Reverb juhid ning teised toetatud
plokid. Filter lisatakse Cab'i järele, rida2/veerg9. Kõigepealt kopeeritakse
kogu tüübimall, siis rakendatakse küsitud juhid. Seega määramata Filteri
parameetrid pärinevad mallist. `scenes` valib kanali ja bypass'i; plokk algab
bypass'is. Ülalolev näide on süntaksinäide, mitte eraldi seadmel kontrollitud
kooslus ega soovitus olemasoleva rütmi/soolo tasakaalu muutmiseks.

## Tõendid ja kontrollid

Algne ZIP: `FM3_FILTER_CONTROLS_20261008T165150_a72c6f32.zip`, SHA-256
`1b730717b38fa67a3dc5e3bd314a3e8917563fd240ac7d388e5b4574d651b8e7`.
Kõik 67 faili, sealhulgas ebaõnnestunud katsed ja vahelejätmine, säilivad
`references/filter-controls-20261008-165150/`. Kuus ebaõnnestunud katset
peatusid enne GET-i; neid ei loetud paarideks. Kogumise audit
`FM3_FILTER_CONTROL_VALIDATION.json` taastub `scripts/build-filter-controls.py` abil.

Kataloog `references/filter-controls.json` on SHA-kontrollitud. Valitud punktide
kasutamisel kontrollitakse uuesti lähtefailide räsid, eelneva/antud ekspordi
võrdlust, kasutaja ekraaniväärtuse kinnitust ning kõiki 148 GET/SYX sõna.
Kirjutaja `scripts/fm3-filter-controls.mjs` ei paku arvutuslikku skaalat.

`scripts/test-composer-filter-controls.mjs` kontrollib 21 üksikpunkti/alias'e
kogu keha, taastab kõik 17 päris ekspordikeha täpselt ja tõrjub 22 keelatud
sisendit. Iga taastatud kehast saab ainult Filteri eemaldamise ja ühe shundi
taastamisega tagasi kõik 12 804 NewLooki algbaiti. Säilivad Amp B Level -3dB,
Amp C Level -8dB, stseenid, teised kanalid, routing, Send/Return ja süsteem.
Raport `FM3_FILTER_CONTROL_GENERATOR_TESTS.json`. JSON-skeemi väljad, enum'id
ja tüübist/kanalist sõltuvad tingimused on lisatud; täielik skeemivalidaator
polnud keskkonnas saadaval. Runtime kontrollib kõiki piiranguid eraldi.

## Taastatud viimane preset

`examples/FM3_FILTER_CONTROLS_VERIFIED` sisaldab SYX-i, TXT-d, kirjeldust ja
raportit. Kõik 13 146 kehabaidi kattuvad viimase eduka mõõtmisekspordiga
`step-17-a076dc8f4f/donor.syx` (SHA
`5be74c3f11b097732cb276c22b7c757470b3a8087660afb0888d6d43c022fc49`).
Uue SYX-i SHA:
`de962b07755ccd0b54839dbca9817653ac40130edf7d776df1a2e70ebc3a6777`.

Filter A High-Pass250 Hz; B Low-Pass7999.9 Hz; C Peaking1999.9 Hz/Q2/
Gain0 dB/Level3 dB; D Tilt EQ. Scene2 valib B, Scene6 C, ülejäänud A.
Filter on kõikjal bypass'is. See on mõõtmiste lõppseisu koostamisnäidis,
mitte uus aktiivse Filteriga artistisound. Korduseksporti ei küsita.

`knownDeviceBody` tuvastab ainult kogu keha täpse kattuvuse tegeliku ekspordiga.
Uus nimi ja kodeering on eraldi; uut aktiivse efekti heli, kuulamishinnangut
ega CPU-kinnitust sellest ei tuletata. Uus mõõdetud väärtuste kombinatsioon
võib olla failitasemel korrektne ilma seadmekinnituseta; seda ei märgita
ekslikult kinnitatuks. Edasine töö lähtub konkreetsest soovitud soundist.
