# Ampi ja Cabi mudelivalik A–D kanalitele — 0.56.1

Ühine `jb-composer` toetab 336 olemasolevat Amp-malli ja 45 Dyna-Cab-malli
kõigil A–D kanalitel, kõigil seitsmel kinnitatud alusel. Uue töö eelistatud
alus on kasutaja puhas kahe rea `jb-newlook`. Lisaplokke see laiendus ei lisa.

## Kirjeldus ja stseenid

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "RHYTHM SOLO MODELS",
  "ampChannels": [
    {"channel": "B", "model": "Brit Silver"},
    {"channel": "C", "model": "USA MK IV Lead Bright"}
  ],
  "cabChannels": [
    {"channel": "B", "model": "4x12 Rumble EV12L"},
    {"channel": "C", "model": "4x12 Friedman V30"}
  ],
  "scenes": [
    {"scene": 2, "blocks": {"amp": {"channel": "B"}, "cab": {"channel": "B"}}},
    {"scene": 6, "blocks": {"amp": {"channel": "C"}, "cab": {"channel": "C"}}}
  ]
}
```

See on liidese näide, mitte tasakaalustatud ega seadmel kinnitatud sound.
Ühte loendisse läheb 1–4 unikaalset `{channel, model}` kirjet. Mudelinimed on
täpselt võimaluste loendist. Tundmatu nimi, korduv kanal, tühi loend, vale
kanal või lisaväli annab vea. Mõlema loendi võib ühendada seniste efektide,
mõõdetud parameetrite ja `scenes`-kirjeldusega.

`ampModelB` ja `cabModelB` jäävad tagasiühilduvaks: nende väljundbaidid ei
muutu. Vana B-välja võib kombineerida sama perekonna A/C/D loendikirjetega.
Vana B-välja ja sama perekonna uue B-kirje koos määramine annab vea, ka sama
mudeli korral. Uutel Amp/Cab kirjetel on `model`, efektimallidel endiselt `type`.

Malli valik ei muuda kanali stseenikasutust ega bypass'i. Selle määrab
`scenes`; määramata väljad säilivad. TXT ja JSON kirjeldavad iga kanali
tegelikke kasutavaid ja aktiivseid stseene pärast kõigi muudatuste tegemist.

## Mis kandub malliga üle

- Amp: kõik 144 sõna, sealhulgas Gain/EQ/Level ja muud kanali seaded.
- Cab: kõik 106 sõna, mõlemad sama Dyna-Cabi pesad, mikrofonid, segu,
  filtrid, tasemed ja muud kogutud kanali seaded.
- Valimata kanalid, plokipäised, stseenid, routing ja süsteemiandmed säilivad,
  kui kirjeldus neid eraldi toetatud väljaga ei muuda.

Mudelivalik ei säilita automaatselt valitud kanali varasemaid üksikparameetreid.
Amp B olemasolevad üksikjuhid rakenduvad pärast malli. A/C/D arvulisi
Gain/EQ/Level juhte see laiendus ei lisa; seal kasutatakse tervet kogutud
malli. Need mallid pole tingimata tehasevaikeväärtused. Sama Level ei tähenda
eri mudelitel sama kuuldavat valjust.

Olemasoleva sobiva soundi kanal jäta kirjeldusest välja, kui selle sisu peab
säilima. Uut tüübi-ID-d üksi ei kirjutata, vanu piiratud generaatoreid ega
GET-kogujaid ei muudeta. Väliste IR-ide tugi ei lisandu.

## Kontrollid

`scripts/test-composer-amp-cab.mjs` võrdleb kogu väljundkeha sõltumatu
ootusega: kanalite asukohad on testis vaadeldud püsiaadressid ja eeldatavad
baidid pärinevad kataloogidest ning algsetest doonoritest, mitte uuest kirjutajast.

- 336 Amp-malli × 4 sihtkanalit = 1344 täielikku kanaliülekannet.
- 45 Cab-malli × 4 sihtkanalit = 180 täielikku kanaliülekannet.
- 56 ühe kanali eraldatuse kontrolli seitsmel alusel.
- Kõigi kaheksa stseeni kooskasutus seitsmel alusel ning tegelike kasutajate,
  aktiivsete stseenide ja TXT/JSON mudelinimede kontroll.
- Vana B-liidese sama SYX, vana/uue liidese lubatud kooskasutus, vigased
  sisendid ja rikutud väline Amp-mall.
- Kooskasutus Filteri automaatse lisamisega ja senise sobivaks tunnistatud
  Bonamassa kogu keha täpne taastootmine.

Raport: `FM3_AMP_CAB_CHANNEL_TESTS.json`. Koostaja versioon `jb-composer-0.7.0`.
Koostaja JSON-skeemi Amp-loend viidi vastavusse 336 tegeliku nimega, sh
firmware13 viis lisandust ja `Deluxe Tweed Bright`; vanas skeemis oli 331 nime
ja aegunud `Deluxe Tweed`. Teised profiilid jäid muutmata.

Need on failitaseme kontrollid. Need ei kinnita kõiki uusi kombinatsioone
seadmel ega nende heli või CPU-kasutust.

## Üks uus seadmekatse

`skills/instructions/examples/FM3_AMP_CAB_AD_TEST` sisaldab SYX/TXT-d,
kirjeldust ja kontrollraportit. Aluseks on puhas `jb-newlook`.

| Plokk | Muudetud kanal | Mudel |
|---|---|---|
| Amp | A | Double Verb Vibrato |
| Amp | D | Brit JVM Crunch Orange |
| Cab | A | 2x12 Double Verb |
| Cab | C | 4x12 Friedman V30 |
| Cab | D | 4x12 Lerxst |

Scene1 kasutab Amp A/Cab A, Scene4 Amp D/Cab D. Mõlemale antakse katsenimi.
Kõigi muude stseenide nimed, kanalivalikud ja bypass säilivad. Amp B ja C
ning Cab B kõik baidid säilivad; Scene2 rütmi ja Scene6 soolo kogu sisu ning
senised Amp B Level -3dB / Amp C Level -8dB säilivad. Muud muudetud
kanaleid kasutavad stseenid võivad kõlada teisiti. Need Level-arvud pole
OUTPUT1 mõõdiku näidud. Kõik Drive/Delay/Reverb ja süsteemiandmed säilivad;
keha on endiselt 12 804 baiti, kaks rida koos Send/Returniga.

## Seadmering kinnitatud 2026-10-08

Kasutaja `examples/FM3_AMP_CAB_AD_TEST_export.syx` kõik 12 804 kehabaidi
kattuvad loodud failiga täpselt. Preseti nimi ja valitud Scene2 säilivad.
Tihendatud esitused erinevad (mõlemad 4206 baiti); toorpäises muutub ainult
CRC. Kõik kaadrid, CRC, footer, pikkused ja nulltäide läbivad. Erinevusi ei
normaliseeritud. Kõik 576 Ampi ja 424 Cabi sõna ning eelkirjeldatud Scene2/6
algne sisu on tagasiekspordis kinnitatud. Kaks rida ja Send/Return säilivad.

Ekspordi SHA-256:
`22b6df6e5c3edf26ba3d9542179fc643ae3f6f9fabdcd3d61a7d4c57dfa33248`.
Täpsed kontrollid: `scripts/test-composer-amp-cab-hardware.mjs`, raport
`FM3_AMP_CAB_HARDWARE_ROUNDTRIP.json`. Koostaja 0.7.1 tunneb selle kogu
keha ära ning täpse algse SYX-i märgib impordituks. Teistsugune mudel ei
päri kinnitust; uue nimega failil eristatakse keha ja faili impordikinnitust.

**See katse on lõpetatud. Kordusimporti/tagasieksporti ega uut GET-kogumist
sama sisu jaoks ei küsita.** Kinnitus puudutab esinduslikku Amp A/D ja
Cab A/C/D kooslust, mitte kõiki 381 malli kõigil sihtkanalitel. Uute kanalite
kuulamishinnangut ja CPU-näitu pole saadetud. Jätka konkreetse soundiga,
kasutades toetatud mudelivalikuid ning vajadusel sihitud puuduvaid juhte.
