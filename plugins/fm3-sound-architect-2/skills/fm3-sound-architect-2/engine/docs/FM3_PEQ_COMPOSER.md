# PEQ ühises presetikoostajas — 0.64.1

`jb-composer-0.10.1`, FM3 firmware 13. Kasuta senist SHA-kinnitatud
`JB_RHYTHM_LEVEL_MINUS3_NewLook.syx` alust ja `fm3-generate.mjs`.
PEQ1 lisatakse nõudmisel reale 2 / veerg 10, Filteri järele ja Send'i ette.
Kaks rida, Send/Return ja kõik senised plokid säilivad.

## Kinnitatud mõõtmised ja kirjutustugi

Tegelik koguja `resume()` kontrollis 84 edukat sammu; igas sammus kõik
132 GET/SYX sõna kattuvad. Neli ebaõnnestunud varasemat katset on alles,
ent ei osale registris. Mõõdetud on 46 enum-/lülitipunkti ja 82 arvulist
punkti. Kõik 82 sihtväärtust annavad leitud skaalaga täpselt mõõdetud toorsõna.

| Riba | Frequency | Type väärtused |
|---|---|---|
| 1 | 20–2000 Hz | Shelving, Peaking, Blocking, Shelving 2, Peaking 2 |
| 2 | 100–10000 Hz | Peaking, Shelving, Shelving 2, Peaking 2 |
| 3 | 100–10000 Hz | Peaking, Peaking 2 |
| 4 | 100–10000 Hz | Peaking, Shelving, Shelving 2, Peaking 2 |
| 5 | 200–20000 Hz | Shelving, Peaking, Blocking, Shelving 2, Peaking 2 |

Muude tüüpide Q 0.1–10; Gain −20…+20 dB. **Blockingul Q ja Gain puuduvad**;
see kasutab Frequency ja Slope'i: 6/12/18/24/30/36 dB/oct (ainult ribad 1 ja 5).
Level −80…+20 dB, Balance −100…+100, Bypass Mode Thru/Mute,
iga riba Solo ning kanali Scene Ignore. Viimase kahe ON/OFF sõna on
püsivalt SYX-is mõõdetud; see ei kinnita kõiki nende käitumiskombinatsioone.
PID23/24 tähendust ei oletata ning neid säilitatakse algmallist.

Frequency ja Q: `round(log(value/min)/log(max/min)*65534)`.
Gain, Level ja Balance: `round((value-min)/(max-min)*65534)`.
Mõõdetud sihid ja ekraani ümardatud aliasväärtused kasutavad alati tegelikku
mõõdetud toorsõna. Teised väärtused märgitakse raportis skaalast arvutatuks;
neid ei nimetata eraldi mõõdetuks. Balance'i vaheväärtuste lineaarsus on
esialgne järeldus −100/0/+100 punktidest ja vajab uue katse ekraanikinnitust.

A→B/C/D kopeerimisel kontrolliti kõigi 33 sõna võrdsust ja puutumata
kanalite säilimist. B/C/D Band3 Gaini eraldi muutmine ning Scene2 A→B→C→D→A
valik on mõõdetud. Koostaja alustab küsitud kanalit kogu paaritud A-algmallist
(algfailis A–D identsed), kirjutab vaid küsitud parameetrid ja säilitab
ülejäänud sõnad. Määramata kanalid säilivad sisestatud algkirjest.

## Sisend

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "PEQ EXAMPLE",
  "peqChannels": [{
    "channel": "C",
    "bands": [
      {"band": 1, "type": "Blocking", "frequencyHz": 85, "slopeDbPerOct": 12},
      {"band": 3, "type": "Peaking 2", "frequencyHz": 1400, "q": 1.5, "gainDb": 2}
    ],
    "levelDb": -1,
    "balance": 0,
    "bypassMode": "Thru",
    "sceneIgnore": false
  }],
  "scenes": [{"scene": 2, "blocks": {"peq": {"channel": "C", "bypass": false}}}]
}
```

1–4 erinevat kanalit, igas 1–5 erinevat riba või `bands` välja puudumine.
Uus plokk algab kõikides stseenides A/bypass; aktiveerimine ja kanalivalik
nõuab vastava kanalimalli selgesõnalist küsimist. Stseenide nimed/valikud/bypass
kasutavad senist ühist kirjutajat. Scene Ignore ja Solo jäta tavapresettides
välja või false, kui neid pole muusikalise ülesande jaoks vaja.

Vana `band3` kuju jääb ainult A täpsete vanade mõõtepunktide liideseks.
Ära sega `band3` ja `bands` kuju. Uued võimalused käivad `bands` kaudu.
Runtime tõrjub tundmatud väljad, duplikaadid, piiridest väljas väärtused,
vale tüübi/kallaku kombinatsiooni ja konfigureerimata kanali aktiveerimise.

## Tõendid ja kontroll

Algandmed: `references/peq-full-20261009-152606/`; register `peq-full.json`.
`fm3-peq-full.mjs` kontrollib kõigi 264 algfaili räsisid igal kasutusel,
seejärel kontrollib/mälupuhverdab kõik 84 tegelikku võrdlust ja paari.
`test-composer-peq-full.mjs` võrdleb uut kirjutajat kõigi 84 päris kehaga.
Mitteaktiivsete Slope-sõnade erinevused on eraldi lubatud ainult seal,
kus koostaja säilitab algmalli ning seade eelneva Blocking-katse kalde.
Algkehasid ei normaliseerita ega muudeta; täpse kattuvuse arv on raportis.
Kõik muud baidid peavad kattuma. Negatiivsed sisendid ja rikutud tõend
lükatakse tagasi. `FM3_PEQ_FULL_VALIDATION.json` on failikatse tulemus.

V3 ning kinnitatud `FM3_PEQ_BAND3_TEST.syx` taasesituvad baitidentselt.
Vana Band3 katse import/eksport ja kasutaja tagasiside CPU47–48%,
„Kõlas hästi tunnetasin vahet.” jäävad kinnitatuks. Ära korda seda katset.

## Ühine A–D seadmekatse kinnitatud

`examples/FM3_PEQ_ABCD_TEST.syx`, TXT ja `FM3_PEQ_ABCD_CHECK.txt`.
Scene2 PEQ A, Scene3 B, Scene4 C, Scene6 D sees; ülejäänud stseenides bypass.
Kõik algsed V3 13 146 baiti taastuvad PEQ kirje eemaldamisel ja shundi
ennistamisel. Test kontrollib uut kombinatsiooni, tüüpe ja arvutatud
vaheväärtusi. See pole veel valmis lõplik EQ häälestus.

Kasutaja tagastas `FM3_PEQ_ABCD_TEST_export.syx`: kõik 13 456 kehabaidi
kattuvad täpselt, erinevusi 0; samuti kõik 132 PEQ sõna ja stseenivalikud.
CPU47–48% on selle katse kohta kinnitatud. Raport
`FM3_PEQ_ABCD_HARDWARE_ROUNDTRIP.json`; kordusekspordi ega GET-i vajadust pole.

Kasutaja leidis juhendivea: Blockingul pole Q-d. Korrigeeritud spec, TXT,
kontrolljuhend ja kood ei paku Q-d. Mõlema Blocking-riba vana Q0.707 oli
algmalli väärtus; selle kirjeldusest eemaldamine jätab SYX-i baitidentseks.
Uut importi pole vaja. Algne kirjeldus/juhend on references-kaustas alles.

Selles sõnumis pole uue koosluse helimuljet ega teiste vaheväärtuste
tegelikke ekraaninäite sõnaselgelt kinnitatud. Ära asenda puuduvaid
kasutajahinnanguid baidivõrdlusega. Põhiline PEQ tugi on nüüd kasutatav;
järgmine kokkulepitud arendusetapp on Graphic EQ → Enhancer.
