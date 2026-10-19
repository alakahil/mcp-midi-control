# Offline SYX prototüüp 0.1.0 / plugin 0.23.1

Kuupäev: 2026-10-01. Riistvaratesti tulemus: esimene Gain B 5.00 import ja väärtus kinnitatud kasutaja poolt firmware 13-ga; tagasieksport failitasemel võrreldud. Ära nimeta seda üldotstarbeliseks või laval valideeritud generaatoriks.

## Mis töötab

`skills/instructions/scripts/fm3-prototype.mjs` genereerib tegeliku SYX-i, UTF-8 TXT-i ning JSON-kontrollraporti. See kasutab kõrvalolevat iseseisvat `fm3-codec.mjs` paketti; npm installi, internetti ega MIDI/serial-ühendust pole käivitamisel vaja. Kontrollitud käituskeskkond Node 24.19.0.

Lubatud alus on ainult kaasasolev `Baaspreset.syx`, SHA-256 `fecac6a61d3a33c547a12e69b5056fd8750f9ded789e44672744d2e32e29c2c4`. Toetatud muudatused: preseti ASCII nimi ja Amp 1 kanal B Gain/Bass, väärtused 4, 5, 6, 7 skaalal 0–10. Teised kanalid/parameetrid, uued alusfailid ja mudelivahetus lükatakse tagasi. Laienda toetust alles vastava tõendi/testi lisamisel; ära möödu prototüübi kontrollidest kutsudes otse üldist kodeerijat.

Amp B kasutatakse selle aluspreseti stseenides 2 ja 6. Muudatus mõjutab mõlemat — Scene 2 ei oma eraldi Gain-väärtust.

## Kasutamine täitekeskkonnas

Loo spetsifikatsioon, näiteks `{"name":"FM3 SA TEST G5","gainB":5}`. Asenda allpool teed tegelike paketi- ja väljunditeedega; väljundifailid peavad olema uued, olemasolevaid ei kirjutata üle.

```bash
node skills/instructions/scripts/fm3-prototype.mjs skills/instructions/references/Baaspreset.syx spec.json /absolute/output/FM3_SA_TEST_G5
```

Täitekeskkonnas tagasta loodud `.syx` ja `.txt` failid kasutajale allalaaditavalt. Kui keskkond ei saa skripti käivitada või failid pole kättesaadavad, ütle seda; ära leiuta linki. Näidistulemus on `skills/instructions/examples/FM3_SA_TEST_G5.syx` ja samanimeline TXT/JSON. See näidis ei ole suvalise uue soundisoovi täitmine.

## Kontrollitud tõendid

- Kõik 17 olemasolevat eksporti läbisid kaadrite kontrollsummad, preset CRC, footer XOR-i ja dekoodri struktuurikontrolli.
- Kõigi 17 faili kaadrite parse→serialize oli bait-baidilt identne. Huffman decode→encode→decode säilitas iga lahtipakitud baidi ja tekitas korrektse CRC-ga faili.
- Baaspresetist genereeritud Gain B 4/5/6/7 ning Bass B 4/5/6/7 (8 katset) andsid kogu lahtipakitud sisu osas täpse vaste kasutaja sõltumatutele ekspordifailidele. Ainult presetinimi muudeti võrdluses eraldi.
- Gain B väärtus asub selle aluse lahtipakitud body baitides 4958–4959, Bass B 4960–4961; little-endian raw = round(value / 10 × 65534). Need nihked kehtivad ainult kinnitatud alusele. Kontrollskript nõuab kogu ülejäänud body identsust.
- 16 Gain/Bass kombinatsiooni läbisid kõrvalmuudatuste puudumise kontrolli; nende kombinatsioonide kohta pole sõltumatuid riistvaraeksporte.
- 7 vigast/toetamata sisendit lükati tagasi (sh võõras/rikutud alus, mittetoetatud väljad ja väärtused).
- Fail `FM3 SA TEST G5` on 24 680 baiti, Amp B = USA MK IV Rhythm 2, Gain 5.00; output SHA-256 `22cc6e0f6643c32386920d94851eced7201f14ea349af3f8cc711441686e0388`.
- Täielikud 17 faili kontrolltulemused: `FM3_SYX_FIXTURE_RESULTS.json`.

Kordustest:
```bash
node skills/instructions/scripts/test-prototype.mjs skills/instructions/references
```

## Esimese riistvarakatse tulemus

2026-10-01 kasutaja kinnitas: „Õnnestus, Firmware 13, gain oli 5, nagu pidi”. Tagastatud `FM3 SA TEST G5_export.syx` läbis kõik kontrollid. Genereeritud faili ja tagasieksporti võrreldes: 0 erinevat baiti kogu lahtipakitud sisus (14 222 baiti), sama presetinimi ja sama dump-päis. Binaarfailis erineb 2635 baiti; raw_patch erinevused piirduvad CRC ja pakitud andmetega. Seega erinev pakkimine ei muutnud presetisisu. Eraldi heli/CPU/tasemete kinnitust veel pole. Tõendfail ja masinloetav raport on pakendis `skills/instructions/examples/FM3_SA_TEST_G5_export.syx` ning `docs/FM3_SYX_HARDWARE_ROUNDTRIP.json`.

## Varasema katse juhis (täidetud impordi ja Gain kontrolli osas)

Kasutaja impordib `FM3_SA_TEST_G5.syx` FM3-Editis teadlikult, säilitades senise töö ja kirjutamata olemasolevat presetikohta üle. Kontroll: Scene 2, Amp B, Gain 5.00 ning normaalne helisignaal. Küsi tegelik FM3 firmware versioon ja seejärel FM3-Editist tagasi eksporditud SYX. Võrdle tagasieksporti semantiliselt; erinev pakkimine/presetikoht ei tähenda automaatselt viga. Ära väida importi tehtuks enne kasutaja kinnitust.

Mootori põhitee ja parameetrite väärtuste tõendid on nüüd olemas. Pärast riistvaratesti laienda vajalikule EQ/Level, Delay/Reverb, Cab/IR ja stseenide ulatusele konkreetsete kontrollide alusel. Kasutaja kohaliku `mcp-midi-control` repo ega FM3 seadet ei muudetud.

## Järgmine arendussamm

Ära palu esimese Gain-katse kordamist. Laienda kontrollitavalt vajalikke parameetreid; olemasolevad Bass-eksportide failitõendid on olemas, kuid uue Bass-i kandidaadi riistvarakatse on eraldi. Delay bypass ja Reverb kanalivahetuse ekspordipaarid on järgmised võimalikud failianalüüsi alused. Enne uut seadmepõhist testi valmista kandidaat ja oodatud väärtused ette. Üldotstarbelist soundigeneraatorit pole veel valideeritud.

## Päritolu

Puhas offline kood: https://github.com/sKuhLight/forgefx-midi , versioon 0.4.3, commit `553d24b7409302908d5c7e46a71b45e07dffdc05`. `fm3-codec.mjs` on valitud moodulite esbuild-koondfail (mitte käsitsi muudetud upstream loogika); wrapper ja tests on FM3 Sound Architecti kohandused. Täielikud litsents/NOTICE failid asuvad `skills/instructions/licenses/`. Koodi uuendamisel säilita need ning korda näidisteste. Prototüüp ei ava ühtki seadmeporti.

