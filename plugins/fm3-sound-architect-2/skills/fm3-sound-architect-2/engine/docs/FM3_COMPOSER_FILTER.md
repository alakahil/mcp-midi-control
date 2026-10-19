# Filter ühises koostajas — 0.55.0

Filteri kogumine on valmis: kasutaja kuus tegelikku GET/SYX-paari sisaldavad
kõiki 18 tüüpi ning igas paaris kattuvad 148 parameetrisõna. Kaadrid 12/454/8,
EID 114, üks täielik GET paaris, CRC-d ja footer'id läbivad. Scene2 Filteri
kanali/bypass'i väljad olid lubatud muudatused; muud plokid ja süsteem säilisid.
Tulemused `FM3_FILTER_COLLECTION_VALIDATION.json`, korratav
`skills/instructions/scripts/build-filter-library.mjs`.

Kataloog `skills/instructions/references/filter-library.json` sisaldab iga
tüübi kõiki 37 sõna, allikakanalit, capture-kausta ning SYX-i/toor-RX räsi.
Kataloogi SHA-256:
`283b85c5c4c5121a754b0f70157c8d54c6c83c53bed9236e878eb81e396f3997`.
Iga kasutus kontrollib kataloogi räsi ja valitud mallide täielikke GET/SYX-paare.

| Tüüp | Binaar-ID | Tüüp | Binaar-ID |
|---|---|---|---|
| All-Pass | 14 | Low-Pass | 1 |
| Auto-Wah | 16 | Low-Shelf | 4 |
| Band-Pass | 2 | Low-Shelf 2 | 9 |
| Envelope Filter | 15 | Notch | 7 |
| Feedback Comb | 13 | Null | 0 |
| Feedforward Comb | 12 | Peaking | 6 |
| High-Pass | 3 | Peaking 2 | 11 |
| High-Shelf | 5 | Tilt EQ | 8 |
| High-Shelf 2 | 10 | Touch-Wah | 17 |

## Kasutamine

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB WITH FILTER",
  "filterChannels": [{"channel": "C", "type": "Peaking"}],
  "scenes": [{"scene": 6, "blocks": {
    "filter": {"channel": "C", "bypass": true}
  }}]
}
```

Alus: `examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`. `filterChannels`
sisaldab 1–4 unikaalset A–D kanalit ja täpseid katalooginimesid. Kopeeritakse
terve kogutud kanal. Need pole tingimata tehasevaikeväärtused. Puuduv Filter1
lisatakse Cab'i järele rida2/veerg9, shundi 1028 asemele. Doonori aktiivsust
ei kopeerita: algolek kõigis stseenides A/bypass. Selgesõnaline `scenes`
või senine `addedBlockScenes.filter` võib määrata küsitud kanali ja bypass'i.
Väärtus false aktiveerib efekti; see ei tähenda helilist sobivuskinnitust.

Kirjeldus võib samal ajal valida olemasolevad Amp/Cab/Drive/Delay/Reverb
seaded ja teised toetatud lisaplokid. Suvalist routing'ut ega muud Filteri
asukohta see versioon ei paku. Teistel kuuel alusel Filterit ei lisata;
kogumisalust ei lisatud sobivate koostamisaluste loendisse.

**Frequency, Q, Gain ja Level on nüüd toetatud täpsetel mõõdetud punktidel:**
A High-Passi sagedused 80/120/250 Hz; B Low-Passi sagedused 4000/6000/8000 Hz;
C Peakingu sagedused 500/1000/2000 Hz, Q 1.4/2, Gain -3/0/+3 dB ja
Level -6/0/+3 dB. [Mõõdetud juhtide juhend](FM3_FILTER_MEASURED_CONTROLS.md)
annab süntaksi ning tegelikud ekraani ümardused. Suvalised vaheväärtused,
muud tüübi/kanali kombinatsioonid, vahele jäetud Q=0.707 ja Order annavad vea.
Tüübi täiskanalimall rakendub enne küsitud juhte; määramata juhid jäävad mallist.

## Kontrollid ja kinnitatud seadmekatse

`test-composer-filter.mjs` võrdleb kõigi 18 tüübi kõiki 4 sihtkanalit täielike
oodatud kehadega: 72 kombinatsiooni. Lisaks taastab koostaja kõigi 6 kasutaja
eksporditud preseti kehade iga baidi täpselt, ilma normaliseerimiseta, koos
nende tegelike stseeniseadetega. Kõigi üheksa lisaploki koosluse täielik keha,
sisendite säilimine, stseeniraport ja 19 vigast sisendit on kontrollitud.
Vanad NewLooki, stseenide ja kuue aluse integratsioonikatsed läbivad.
Tulemused `FM3_FILTER_GENERATOR_TESTS.json`.

Koosluse plokikirjete järjekorras on Filter Send'i ja Flangeri/Drive'i vahel;
Filteri asukoht enne Drive'i on tegelikust alusest, Filteri ja Flangeri ühine
järjestus on seni failitaseme valik. Seda kooslust ei nimetata seadmel kinnitatuks.
Ka JSON-skeemi väljade ja enum'ide kontroll pole täielik skeemivalidaator.

Näidis `examples/FM3_NEWLOOK_FILTER_TEST.syx` koos TXT/spec/raportiga ühendab
senised rütmi/soolo seaded ja lisab ainult Filteri:

| Kanal | Tüüp | Stseenivalik |
|---|---|---|
| A | High-Pass | Scene2 ja muud stseenid peale 6 |
| B | Low-Pass | säilitatud kanal, stseenides valimata |
| C | Peaking | Scene6 |
| D | Tilt EQ | säilitatud kanal, stseenides valimata |

Filter on kõigis kaheksas stseenis bypass'is. Väljundkeha 13 146 baiti;
eemaldades Filteri 342-baidise kirje ja taastades shundi, kattuvad täpselt
kõik 12 804 NewLooki algbaiti. Amp B Level -3dB, Amp C -8dB, kõik muud
kanalid ja stseenid, kaks rida, Send/Return, modifierid ja süsteemisaba säilivad.
SYX SHA-256: `63d7a9a4381bbe7bcc40179f0e79be0c7e5a6c4ebe66f475380bd1e24f0264cf`.

Kasutaja `examples/FM3_NEWLOOK_FILTER_TEST_export.syx` kinnitab selle
konkreetse A–D koosluse ja automaatse Filteri lisamise FM3 impordi/tagasiekspordi:
kõik 13 146 kehabaidi kattuvad täpselt, ilma normaliseerimiseta. Kõik neli
37-sõnalist malli, stseenikanalid, bypass, nimi ja valitud Scene2 säilivad.
Ka seadmeekspordist saab taastada täpselt kõik 12 804 NewLooki algbaiti.

Generaator taastab esitatud SYX-i baitidentselt. Tihendatud esitus erineb,
pikkus mõlemal 4373; päises erineb ainult CRC. Kaadrid, preset CRC, footer,
kodeeritud pikkused ja nulltäide läbivad. Ekspordi SHA-256:
`b3d406ce0bf847dadd20ba4b36553e8a54cc4939fe4808ee7e389e40d63ae2a3`.
Tõend `FM3_NEWLOOK_FILTER_HARDWARE_ROUNDTRIP.json`, korratav kontroll
`skills/instructions/scripts/test-composer-newlook-filter-hardware.mjs`.

See katse on lõpetatud; kordusimporti/tagasieksporti ei küsita. Filter oli
bypass'is: aktiivse efekti heli ja CPU jäävad hindamata. Muude koosluste
seadmekinnitust sellest ei tuletata. Jätka puhta NewLooki ja konkreetse soundi
vajalike juhtseadistega; Order ja loetlemata väärtused on endiselt mõõtmata.
Seniseid kogumisi ega Bonamassa, Choruse või Pitchi lõpetatud katseid ei korrata.


Versioon 0.55.0 taastab ka kõik 17 juhtide mõõtmisel saadud ekspordikeha
täpselt. `examples/FM3_FILTER_CONTROLS_VERIFIED` (SYX/TXT/spec/raport) vastab
viimase mõõtmise kogu kehale; seda ei nõuta uuesti ekspordiks. Kõigi üheksa
lisaploki koosluse ega aktiivse Filteri heli kinnitust sellest ei tuletata.
