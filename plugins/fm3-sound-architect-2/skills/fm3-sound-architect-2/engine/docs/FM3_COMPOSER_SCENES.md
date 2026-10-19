# Ühine stseenikirjeldus — 0.56.0

Üks `jb-composer` kirjeldus ühendab mudelid, mõõdetud parameetrid, vajalikud
NewLooki lisaplokid ja kõigi kaheksa stseeni seaded. `scenes` toetab nimesid,
toetatud efektiplokkide kanalivalikut ning bypass'i kõigil seitsmel kinnitatud
alusel. Uute presetite vaikimisi alus on kasutaja kahe rea `jb-newlook`.

## Süntaks

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB SCENE EXAMPLE",
  "scenes": [
    {"scene": 2, "name": "Rhythm Fat", "blocks": {
      "amp": {"channel": "B", "bypass": false},
      "drive": {"bypass": true},
      "delay": {"bypass": true}
    }},
    {"scene": 6, "name": "JB SOLO", "blocks": {
      "amp": {"channel": "C", "bypass": false},
      "drive": {"channel": "B", "bypass": false},
      "delay": {"channel": "A", "bypass": false},
      "reverb": {"channel": "D", "bypass": false}
    }}
  ]
}
```

`bypass:false` tähendab efekt sees; `bypass:true` tähendab bypass.
Määramata nimi, kanal või bypass säilib. Stseeniloendis peab olema 1–8
unikaalse numbriga kirjet. Iga kirje vajab nime või vähemalt üht plokivälja.
Nimi on 1–31 prinditavat ASCII märki, ilma algus-/lõputühikuteta.
Tundmatud väljad, korduvad stseeninumbrid ja tühjad määrangud annavad vea.

Toetatud perekonnanimed: `amp`, `cab`, `drive`, `delay`, `reverb`,
`compressor`, `chorus`, `flanger`, `phaser`, `wah`, `tremolo`, `pitch`,
`rotary`, `filter` (alates 0.53.0). Plokk peab olema valitud aluses olemas või lisatud sama kirjelduse
vastava kanalimalli/Rotary taotlusega. Pelk `scenes.blocks` kirje seda ei lisa.
Input/Output/Send/Returni stseeniseadeid see liides ei kirjuta.

## Kanalimallid, lisamine ja tasemed

Ampi ja Cabi mudelid on alates 0.56.0 valitavad A–D kanalitel väljadega
`ampChannels:[{channel,model}]` ja `cabChannels:[{channel,model}]`. Seejärel
valib `scenes` iga stseeni jaoks soovitud kanali. Valimata kanalid säilivad;
valitud täiskanalimall asendab ka selle kanali tasemed. Ampi arvuliste
üksikjuhtide senine B-kanali piir jääb alles.
[A–D juhend](FM3_COMPOSER_AMP_CAB_CHANNELS.md) sisaldab süntaksit ja katset.

Mudelid ja mõõdetud parameetrid rakendatakse enne stseeniplaani. Täiskanalimall
ei lülita ise efekti sisse. NewLooki uus plokk algab A/bypass kõigis stseenides.
Uue ploki kanalivalik või aktiveerimine nõuab sama kirjelduse kaudu küsitud
kanalimalli; Rotary puhul on toetatud mõõdetud A. Ainult bypass'i määramine
võib jätta uue ploki seadistamata A-kanalile. Kõik asukohad jäävad
[NewLooki juhendis](FM3_COMPOSER_NEWLOOK.md) kirjeldatud kohtadesse.

Kanali Level ja muud parameetrid on ühised kõigile seda kanalit valivatele
stseenidele. `scenes` ei lisa stseenipõhist Level-välja ega Outputi võimendust.
Kasuta olemasolevaid mõõdetud Ampi/parameetrivälju ja eraldi kanaleid seal,
kus neid on juba toetatud. Raport ja TXT näitavad lõplikke kanaleid, bypass'i
ning kanalimuudatusi kasutavaid ja aktiivseid stseene. `sceneEdits` loendab
küsitud väljad, baidialad ning selle, kas väärtus tegelikult muutus.

Senised `scene6Name`, `ampScene6`, `reverbScene6`, `phaserScene6Bypass`,
`delayScene6Bypass`, `delayScene2`, `reverbScene1` ja `addedBlockScenes`
jäävad alles. Kui need ja `scenes` määravad sama stseeni sama välja, annab
koostaja selge vea ka võrdsete väärtuste korral. Eri välju võib kombineerida.
Kogu stseenitaotlus valideeritakse enne stseenibaidide kirjutamist.

## Valmis Bonamassa rütm ja soolo

`skills/instructions/examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json` kasutab seniseid
Amp/Cab/Drive/Delay/Reverb mudeleid ja juhte koos kahe stseeni täieliku
kirjeldusega. Alus on `JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`.

| Plokk | Scene2 — Rhythm Fat | Scene6 — JB SOLO |
|---|---|---|
| Amp | B, sees; Level -3dB | C, sees; Level -8dB |
| Cab | B, sees | B, sees |
| Drive | A, bypass | B, sees |
| Delay | A, bypass | A, sees |
| Reverb | B, sees | D, sees |

Ampi Level numbrid ei ole OUTPUT1 mõõdiku näidud ega kahe soundi kuuldava
tugevuse vahe. Kasutaja kinnitatud tasakaal säilib. Kõik 12 804 kehabaidi
kattuvad kasutaja ekspordiga täpselt, sealhulgas muud stseenid, valitud Scene2,
Send/Return, kaks rida, kanalimallid, modifierid ja süsteemiandmed. Lisaplokke
ei lisandu. Ainult preseti nimi on uus: `JB NEWLOOK RHYTHM SOLO`.

Uue nimega fail ei ole eraldi seadmesse imporditud, kuid selle muutmata sisu
korduseksporti ei nõuta. Raporti `knownDeviceBody` sisaldab kattuva alusfaili
nime ja SHA-256 räsi. Uut helilist ega CPU-hinnangut sellest ei järeldata.

Genereerimine plugina `skills/instructions` kaustast:

```bash
node scripts/fm3-generate.mjs examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx examples/JB_NEWLOOK_RHYTHM_SOLO.spec.json /absolute/JB_NEWLOOK_RHYTHM_SOLO
```

Väljundid on SYX, TXT ja `.validation.json`; sama nimega faile CLI üle ei kirjuta.

## Kontrollitud ulatus

`scripts/test-composer-scenes.mjs` võrdleb terveid kehasid eraldi määratud
fixture'i-asukohtadega. Kõigil seitsmel alusel kontrollitakse kõiki kaheksat
stseeni, kokku 1096 nime/kanali/bypass'i välja. Lisaks osaliste muudatuste
eraldatus, ühe lisatud Choruse aktiveerimine, lõplik aruandlus, sisendite
säilimine ning 40 vigase või vastuolulise sisendi tagasilükkamist.

Uue liidese kaudu taastuvad baitidentselt kolm varasemat SYX-i: kinnitatud
tasakaalustatud Bonamassa, NewLooki Chorus ja NewLooki Pitch. Viimaste kogu
keha võrreldakse ka vastavate kasutaja seadmeeksportidega. Rütmi/soolo näidis
kattub NewLooki kogu algkehaga. Varasemad koostaja integratsiooni- ja
lisamiskatsed läbivad. Tulemused `FM3_COMPOSER_SCENE_TESTS.json`.

See kinnitab uue liidese toimimise olemasolevatel tõenditel. Suvalised uued
stseeniplaanid ja aktiivsed efektikooslused on failitasemel kontrollitud;
neile ei laiendata automaatselt seadme-, kuulamis- ega CPU-kinnitust.
JSON-skeemi struktuur ja väljade katvus on kontrollitud, täielikku
Draft2020-12 validaatorit ei kasutatud. Tööriist ei ühenda FM3 seadet ega
saada MIDI/SET/SAVE käske.
