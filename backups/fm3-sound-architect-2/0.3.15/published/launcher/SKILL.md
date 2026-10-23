---
name: fm3-sound-architect-2
description: Kujunda FM3 Sound Architect 2-ga Fractal FM3 Mk II Turbo kitarrisounde ning loo kontrollitud 0.3.15 generaatoriga SYX/TXT presetid, stseenid ja A–D kanalivalikud. Kasuta selle plugina selgesõnalisel valimisel; laadi allpool viidatud avaldatud pakett ja selle kehtiv juhend.
---

# FM3 Sound Architect 2 — avaldatud mootori käivitamine

Vasta eesti keeles. Kasuta kinnitatud varasemat infot; küsi ainult soundi või
faili korrektsust mõjutavat puuduvat infot. Kasuta seda eraldi salvestatud
oskust käivitajana: **0.3.15 generaator on avaldatud pluginas olemas**.
Ära tõlgenda kohaliku engine-kausta puudumist generaatori puudumisena pluginast.

## Õige juhendi ja mootori laadimine

Kasuta [väljalaske sidumist](references/release.json): sama privaatne plugin,
versioon 0.3.15, release `pluginrel_6adb3151f998819193808162d75516b5`, commit
`15840e463b0d8f90ab3c46b8c0d4e6865b88a004`. Ära asenda seda teadmata versiooniga.
Vaja on Python 3 ja Node.js-i. Seadet ega MIDI-ühendust pole vaja.

1. Kui selles vestluses on 0.3.15 paketi tegelik absoluutne tee juba teada,
   kontrolli seda `scripts/prepare-runtime.py --directory PAKETI_JUUR` abil.
   Ära otsi kogu kasutaja failipuud ega eelda varasema vestluse töökausta säilimist.
2. Kui pakett pole kohal, kasuta Plugin Creatori `get_owned_plugin_archive`
   toimingut plugin ID-ga `plugins_6accfd716e148191b0adb61e4e36f0e4` ja eespool
   nimetatud release ID-ga. Vajadusel leia selle tööriist olemasolevast
   tööriistakataloogist. Kontrolli vastuse `plugin.plugin_id`,
   `release.release_id` ja `release.version`. Laadi tagastatud ajutine URL kohe
   alla vestluse töökausta. Ära avalda URL-i ega salvesta seda skill'i.
   See on olemasoleva väljalaske lugemine; ära kutsu create/update_plugin.
3. Käivita `python3 SKILLI_JUUR/scripts/prepare-runtime.py --archive ARHIIV.tar.gz --destination UUS_PAKETIKAUST`.
   Kasuta absoluutseid teid. Skript kontrollib enne lahtipakkimist kinnitatud
   manifesti räsi, commit'i, versiooni ja kõigi failide räsisid.
   Väljund peab jääma väljapoole seda skill-kausta.
   Kui lugemine või kontroll on blokeeritud, teata konkreetsest takistusest;
   ära käivita kontrollimata koodi ega väida, et mootor puudub serveris.
4. Loe skripti tagastatud absoluutse `skill` tee **SKILL.md tervikuna** ja järgi
   selle soundi-, kontrolli- ning failitöövoogu. Lahenda kõik selle juhendi
   engine-viited avaldatud paketi skill-kausta suhtes.
5. Käivita tagastatud `selfCheck` tee Node.js-iga, argumendiks eespool nimetatud
   täielik commit. Ära muuda avaldatud paketi lähtefaile. Väljundpresetid loo
   eraldi töökausta ja kontrolli nelja faili `fm3-preset.mjs --verify` abil.

Skripti kõik teed pärinevad kontrollitud paketist. See käivitaja ei sisalda
teist mootorit ega väida, et platvorm monteerib kogu plugina automaatselt.
Erista salvestatud käivitajajuhend, kontrollitud paketi käivitamine ja uues
vestluses tegelikult pakutava oskuse kontroll. Uue väljalaske korral uuenda
sidumist alles selle commit'i ja manifesti kinnitamise järel.

## Soundi ja seadme piirid

- Lähtu kasutaja soovitud loost/artistist, pillist, helipeadest ja väljundist.
  Senine testiseade on FM3 Mk II Turbo firmware 13.0; Ibanez AS-120 humbucker,
  OUT1 stereo FOH. Kasutajal on ka Fender Stratocaster.
- Kasuta tegelikku capabilities-väljundit ning kontrollitud mudeli- ja
  parameetrikaarte. Kõigi FM3 funktsioonide tuge pole veel tõendatud.
- Erista SYX/TXT struktuurikontroll, FM3 kontrollimport ning heli/CPU hinnang.
  Artistisound on kuuldelise võrdluseta põhjendatud lähendus.
- Ära kirjuta seadmesse ega saada tundmatuid SysEx-pakette laadimiskontrolliks.
  Kasuta riistvara ainult kasutaja lubatud toiminguteks.
