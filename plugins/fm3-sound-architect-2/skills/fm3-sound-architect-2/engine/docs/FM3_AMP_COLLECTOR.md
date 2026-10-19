# Juhendatud partiirežiim 0.29.14
Mitme neliku järjest kogumiseks kasuta [uut partiijuhendit](FM3_AMP_BATCH.md). Üks ZIP partii lõpus; vana üksikpäringu käsk töötab edasi.

# FM3 Amp koguja — 0.29.8

## Uuendus 0.29.9 — 2026-10-02

Koguja päriskatsed kasutaja Mac/FM3 firmware13 ühendusel kinnitatud: Hipower (ID-d 16/13/14/15) ning capture005 (16/17/19/21). Mõlemad GET/SYX paarid kattuvad 576/576 sõna. Capture005 raport: FM3_AMP_CAPTURE_005_RESULTS.json. Python-koguja ei muutunud; offline dekooderis parandati USA MK IIC+ ID21 nimi. Vana 0.29.8 pakett loeb endiselt õigesti, kuid selle Node-import ei tunne ID21 nime; kasuta importimiseks 0.29.9 paketti. Uute genereeritud presetite heli/riistvaraimport jäävad kinnitamata. Allpool olev riistvarakatse ootel märge on ajalooline. Uue ZIP-i nimi on FM3_AMP_COLLECTOR_0.29.9.zip; sees sama FM3_AMP_COLLECTOR kaust, käskude teed ei muutu. Säilita Documents/FM3_AMP_SESSION andmekaust.

## Mida see teeb

Python 3 standardteegiga macOS koguja loeb ühe käsitsi käivitatud GET-iga kõik neli Amp-kanalit. Ei vaheta mudelit, kanalit, stseeni ega presetti; ei saada SET/Store/Save käske, ei tee korduskatseid ega vali automaatselt porti. Mudelid valid ise FM3-Editis. Sammud juhendada ükshaaval.

Iga katse salvestub eraldi `capture-...` kataloogi. Järgmine käivitus sama sessioonikaustaga jätkab varasemaid faile muutmata. Register koostatakse algandmetest uuesti, seega pole vaja parandada osaliselt kirjutatud keskset indeksit. Ctrl-C ja tavapärase vea puhul säilivad osalised andmed `capture.json`-is. Jõuga lõpetamise/voolukatkestuse korral võib alles jääda lõpetamata kataloog või `.pending` fail: see ei ole edukas lugemine, kuid varasemad katsed jäävad alles. Vana katset ei kirjutata üle ega korrata automaatselt. Hoia sessioonikaustast varukoopiat.

Täielik vastus = 1778 baiti, 5 rangelt kontrollitud kaadrit ja 576 sõna. `captured` tähendab korrektset toorvastust, MITTE valmis generaatorimalli. Vana v3 fikseeritud mudelivõrdlus on eemaldatud. Koguja kuvab A/B/C/D mudeli-ID-d; Node kontrollija lisab katalooginimed ja paariskontrolli.

## Paketi kasutamine Macis

Paki `FM3_AMP_COLLECTOR_0.29.8.zip` lahti Downloads-kausta. Paketi juurkaust on `FM3_AMP_COLLECTOR`; selle sees on `scripts`, `references`, `lookup`, `licenses` ja käesolev README. Python-koguja ei vaja Node'i ega pip-pakette. Registri kontroll/koostamine vajab Node.js-i (arenduses kontrollitud Node 24; olemasolevas kasutaja keskkonnas oli Node olemas). npm installi pole vaja.

Esmalt ainult enesetest, mis EI ava FM3 porti:

```bash
python3 ~/Downloads/FM3_AMP_COLLECTOR/scripts/FM3_AMP_COLLECTOR.py self-test
```

Lõpuks peab tulema `PASS`. See on arvutisisene test, mitte riistvarakinnitus.

### Üks uus kogumine

1. Kasuta meie sama-baasi testpresetti ja firmware 13. Säilita oma muu töö enne testpreseti avamist.
2. Vali soovitud Amp-mudelid käsitsi FM3-Editis. Ära muuda muid plokke. Ekspordi PRAEGUSE tööpuhvri preset SYX-iks arvutisse, mitte seadme presetikoha peale. Iga GET vajab oma sama seisundi eksporti.
3. Sulge FM3-Edit/Fractal-Bot. Jäta FM3 tööle, ära muuda presetti/stseeni/kanaleid/seadeid ekspordi ja GET-i vahel.
4. Käivita allolev käsk. Näites on olemasolev Hipower-fail; kasuta seda ainult siis, kui seadmes on täpselt sama seisund. Muu katse puhul asenda SYX-tee selle katse ekspordiga. Kui pordi nimi on muutunud, kinnita uus nimi enne käivitamist.

```bash
python3 ~/Downloads/FM3_AMP_COLLECTOR/scripts/FM3_AMP_COLLECTOR.py capture --session ~/Documents/FM3_AMP_SESSION --port /dev/cu.usbmodem11104 --firmware 13 --syx ~/Downloads/FM3_AMP_HIPOWER_TEST.syx
```

Uut porti ei skaneerita. Koguja võtab eksklusiivse pordi, kasutab v3-ga sama nonblocking select/read transpordiviisi ning taastab pordiseaded sulgemisel. Kui port juba saab andmeid, katkestab enne GET-i. Kui näed ebaõnnestumist, ära muuda faile ega korda pimesi; saada raport analüüsiks.

`--syx` võib kogumisel puududa. Hiljem saab eksporti lisada ilma ühegi seadmekäsuta (asenda näidis-ID tegeliku katalooginimega):

```bash
python3 ~/Downloads/FM3_AMP_COLLECTOR/scripts/FM3_AMP_COLLECTOR.py pair --session ~/Documents/FM3_AMP_SESSION --id capture-TEGELIK_ID --syx ~/Downloads/SAMA_SEISUND.syx
```

`pair` salvestab koopia ega kirjuta olemasolevat paari üle; ei väida veel sisulist vastavust. Kasuta ainult ekspordi ja GET-i sama seisundit. Kui lisasid vale faili, jäta katse alles ja aruta eraldi korrigeerimist; automaatset üle kirjutamist ega kustutamist pole.

### Ülevaade ja kontroll

Ilma seadmeühenduseta transpordi ülevaade:

```bash
python3 ~/Downloads/FM3_AMP_COLLECTOR/scripts/FM3_AMP_COLLECTOR.py status --session ~/Documents/FM3_AMP_SESSION
```

Täielik SYX-paariskontroll ja nimed:

```bash
node ~/Downloads/FM3_AMP_COLLECTOR/scripts/fm3-amp-session.mjs status ~/Documents/FM3_AMP_SESSION ~/Downloads/FM3_AMP_COLLECTOR/references/Baaspreset.syx
```

Uue eraldi registrifaili koostamine:

```bash
node ~/Downloads/FM3_AMP_COLLECTOR/scripts/fm3-amp-session.mjs build ~/Documents/FM3_AMP_SESSION ~/Downloads/FM3_AMP_COLLECTOR/references/Baaspreset.syx ~/Documents/FM3_AMP_LIBRARY.json
```

Olemasolevat väljundit ei kirjutata üle. Järgmise koostamise puhul vali uus nimi, nt `FM3_AMP_LIBRARY_002.json`. Registri saab anda plugina generaatorile neljanda argumendina; see ei muuda vaikimisi kaasasolevat teeki. Võid ka sessioonikausta Finderis ZIP-iks pakkida ja siia saata; Node-kontrolli saab teha siin.

## Kordused, konfliktid ja olekud

- `paired-verified`: toorGET ja sama-baasi SYX läbisid kontrolli, kõik 576 sõna kattuvad.
- `awaiting-syx`: vastus korras, SYX puudu; registrisse ei lähe.
- `failed` / `interrupted`: ebaõnnestunud/lõpetamata katse säilib, registrisse ei lähe.
- `rejected`: vigane või sobimatu paar; registri koostamine peatub ja näitab põhjust.
- Sama nime/ID ja identsete 288 baidiga kordused liidetakse; kõik algsed allikaviited säilivad `sources` all.
- Sama mudeli erinevad seadistused on konflikt, ka ühe lugemise eri kanalites. Ühtki varianti ei valita automaatselt; registrit ei väljastata enne eraldi otsust. See ei pruugi olla viga — võib olla tahtlik erinev seadistus.
- Konfliktide võrdlus toimub sessiooni sees. Välise registri selgesõnaline kasutamine generaatoris annab sellele senise teostuse järgi eelisjärjekorra kaasasoleva sama mudeli ees.

Tööfailide nimed, kontrollsummad ja allika SHA-d ei tõenda autentsust ega firmware'i. Firmware 13 on kasutaja kinnitus. Amp lugemine ei tõenda mitte-Amp sõltuvuste puudumist; sama-baasi SYX nõue jääb jõusse. Osaliselt kogutud sessiooni eksport sisaldab ainult kontrollitud paare ja loetleb muud katsed; see pole kogu kataloogi valmis tugi.

## Testitud ja testimata

- Simuleeritud POSIX-port: killustatud vastus, üks GET, timeout koos toorandmete säilimisega, vigane vastus, Ctrl-C raporti salvestamine.
- Sessiooni jätkamine, kordused/päritolu, pooleli/puuduvate paaride eristamine, konflikt ja vale paar peatavad ekspordi, olemasolevaid faile ei kirjutata üle, sümbollinke ei impordita.
- Mõlemad varasemad päris GET/SYX paarid, viis eri mudelit sessioonis, täpne Hipower kanali genereerimine; 0.29.7 importija regressioonid.
- Uus koguja pole veel kasutaja Mac/FM3-ga käivitatud. Varasem v3 transport oli seal kinnitatud; uus sessioonikoguja vajab üht sihitud katset enne suurema kogumise alustamist. Uusi mudeliandmeid see arendus ei lisanud.

Järgmine kasutajasamm: paki alla laaditud ZIP lahti ning käivita ainult `self-test`; siis üks olemasoleva teadaoleva seisundi lugemine. Ära alusta automaatselt kõigi puuduvate mudelite käsitsi kogumist ega automaatset mudelivahetust.
