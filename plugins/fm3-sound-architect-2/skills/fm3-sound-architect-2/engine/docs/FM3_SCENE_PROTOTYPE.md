# Stseenigeneraator — plugin 0.24.1

2026-10-01. Esimene Gain 5 import on firmware 13-ga kinnitatud. Kasutaja kinnitas stseenikombinatsiooni oodatud väärtused; tagasieksport analüüsitud. Heli pole eraldi selgesõnaliselt kinnitatud.

## Katse ja kasutamine

Fail FM3_SA_TEST_SCENES.syx sisaldab Amp B Gain 5.00 (Scene 2 ja 6), Scene 1 Reverb kanal B, Scene 2 Delay engaged. Muud presetiseadistused on baasist säilitatud. Kasuta ainult SHA-kontrollitud originaalset Baaspreset.syx-i; ära üldista nihkeid teistele presetitele.

```bash
node skills/instructions/scripts/fm3-scenes.mjs skills/instructions/references/Baaspreset.syx spec.json /absolute/output/FM3_SA_TEST_SCENES
```

Spetsifikatsioon: `{"name":"FM3 SA TEST SCENES","gainB":5,"delayScene2":true,"reverbScene1":"B"}`. delayScene2 true tähendab engaged, false bypass. reverbScene1 lubab A/B. Gain B vaikimisi 5; kasutajale näita seda alati. Amp muutmise piirid on endiselt 4/5/6/7. Tööriist väljastab SYX, TXT ja JSON rapordi; ei saada seadmele andmeid. Kasutamiseks on vaja Node'i ja failide käivitamise tuge. Näidisfailid asuvad skills/instructions/examples all.

## Tõendid ja piirid

- S2_Delay_Bypass.syx lahtipakitud sisu on Baaspreset.syx-iga identne.
- S2_Delay_Engaged.syx erineb ainult body baidil 7374: 1→0. See kontrollib Scene 2 Delay bypass-välja kasutaja sõltumatute eksportide kaudu.
- S1_Reverb_channelB.syx erineb baasist kolmes kohas: 0, 7372 ja 9528. Ainult 9528 (0→1) on Reverb Scene 1 kanal. Seda kinnitab dekoodri Reverb kirje offset 9530, esimese stseeni kanal offset-2. Ülejäänud kaks erinevust ei ole üle kantud; nende tähendust siin ei oletata.
- Lai blokidekooder jätab selles presetis Delay kirje loendist välja. Seetõttu ei väida me üldist Delay dekodeerimise tuge ega täielikku plokiloendit. Empiiriline kindla aluse 7374 välja muudatus ja kogu body kontroll on sellest sõltumatud. Dekoodri parandamine on vajalik enne laiemaid Delay parameetreid.
- Kaks Delay olekut võrreldi tervikuna sõltumatute eksportidega, normaliseerides ainult eraldi tõendatud Amp B Gain=5. Reverb kontrolliti näidisfaili vastu, eemaldades kaks kõrvalmuutust. Kombineeritud faili kogu body võrdlus läbis kontrolli. Neli toetamata sisendit lükati tagasi.
- Genereeritud faili SHA-256: 6febef6be602d7efdff33646148351aeae1fc8cf569fbbffd0bb8d21f1892696.
- Muudatused võrreldes Gain5 katsega: body 7374 ja 9528; nimi muutub päises. Kaadrikontrollsummad, CRC ja footer kehtivad.

Kordustest: `node skills/instructions/scripts/test-scenes.mjs skills/instructions/references`.

## Riistvarakatse tulemus 2026-10-01

Kasutaja: „Kõik nimetatud oodatavad tulemused vastasid tõele.” Tagasieksport läbis kaadrite kontrollsummad, preset CRC ja footer'i kontrolli. Reverb Scene 1=B, Delay Scene 2 stored bypass word=0 (engaged), Amp B Gain=5.00. Nimi ja dump-päis säilisid.

Kogu 14 222-baidises lahtipakitud sisus on ÜKS erinevus: offset 0, genereeritud 1, tagasieksport 0. Kõik ülejäänud 14 221 baiti on identsed. Sama offset 0 erinevus esines juba S1_Reverb_channelB.syx näidises. Võimalik seos stseeni valikuga on oletus, mitte kontrollitud tähendus; ära muuda seda välja ega ignoreeri seda üldises võrdlejas vaikimisi. Käesoleva katse nõutud parameetrid/stseeniseosed ja routing on säilinud, kuid kogu body ei ole baitidentsus. Püsisalvestuse, heli, tasemete ja CPU kohta pole eraldi kinnitust.

Tõendid: `FM3_SCENES_HARDWARE_ROUNDTRIP.json`, `skills/instructions/examples/FM3_SA_TEST_SCENES_export.syx`. Käesoleva kombinatsiooni import on kinnitatud firmware 13-ga; see ei kinnita kõiki muid parameetreid või firmware versioone.

## Edasine arendus

Ära palu läbitud stseenikatset korrata. Järgmine töö on laiema Delay/EQ/Level parameetritoe ettevalmistamine; enne Delay parameetrite lisamist lahenda dokumendis kirjeldatud dekoodri puuduv Delay kirje. Offset 0 tähenduse saab vajadusel eraldi kontrollida sama preseti ekspordiga eri valitud stseenides.

## Varasem kontrolljuhis (oodatud väärtuste osa täidetud)

Kasutaja säilitab senise töö ja impordib katsefaili FM3-Editis olemasolevat presetikohta üle kirjutamata. Kontrollida Scene 1 Reverb B, Scene 2 Delay aktiivne, Amp B Gain 5.00; seejärel heli ning tagasi eksporditud fail. Ära märgi stseenimuudatusi riistvaral kinnitatuks enne kasutaja vastust ja tagasifaili võrdlust. Firmware on juba kinnitatud 13; ära küsi seda uuesti.
