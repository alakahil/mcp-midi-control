# Tempo ja modifikaatorite sõltuvused — 0.3.3 kandidaat

Selgesõnaline Time/Rate kirjutus nõuab sama kanali lõplikku **Tempo NONE** olekut.
Aktiivse või ebaselge modifikaatori sihtparameetrile käsiväärtuse kirjutamine
annab vea. Mootor ei lülita kontrollerit välja ega muuda Tempot vaikimisi.
Füüsilisi mõõtmisi ega uusi seadmeeksporte selle etapi jaoks ei tehtud.

## Tempo ulatus

| Pere | Kontrollitud paarid |
|---|---|
| Chorus | Rate/Tempo, Rate2/Tempo2 |
| Delay | Time/Tempo, TimeR/TempoR, Rate1–4/LFO1–4Tempo |
| Filter | LFOFreq/Tempo |
| Flanger | Rate/Tempo; sõnastiku OLD_FLANGER nimed säilivad |
| Phaser | Rate/Tempo |
| Pitch | Delay1–4/DTempo1–4, LFOrate/LFOtempo, Splice1–2/STempo1–2 |
| Rotary | Rate/Tempo |
| Tremolo | Rate/Tempo |
| Reverb | PreDelay/PreDlyTempo |

Kokku 21 paari üheksas peres. 20 paari tulevad FM3-Edit 1.07.17 aktiivsete FW13
XML-juhikute `lock` seostest. Reverb on eraldi päritoluga: Blocks Guide'i
Pre-Delay Tempo kirjeldus ning generaatori olemasolev mõõdetud Tempo NONE juht.
Kõik nimed/PID-d seotakse FM3 enda natiivsete deskriptoritega; NONE ja tempovalikud
võrreldakse FW13 vahemälu ning sõnastikuga. Flangeri üksikdeskriptorid kontrollitakse
eraldi, sest kõrvutised pärand- ja uued tabelid ei moodusta üht pidevat peretabelit.

[FM3 Owner's Manual](https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf),
trükitud lk 92, kirjeldab Tempo ülimuslikkust Time/Rate käsiseade ja modifikaatori
suhtes. Lk 57 kirjeldab modifikaatori ühiskasutust kanalite vahel ja kanalipiirangut.
Kättesaadav käsiraamat on 7.x (juuli 2023); FW13 ID-sid sellest ei tuletata.
[Blocks Guide](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf)
kirjeldab Reverb Pre-Delay Tempo seost. BPM-põhist kõlavat aega ei arvutata.

## Modifikaatorite lugemine

Seitsme kaasatud, SHA-ga kinnitatud baasi prefiks sisaldab 32 järjestikust
96-baidist kirjet: päis 1538, payload 1584, lõpp 4610. Iga kirje ID, päise
nullväljad, 25 sõna ja üks kanal kontrollitakse enne kasutamist. See on failipaigutus,
**mitte väide 32 kasutatava modifikaatori kohta**.

FM3 native MOD tabeli 25 sidumist ja FW13 cache'i jaotis 3 kinnitavad allika,
sihtploki, sihtparameetri ning ALL/A/B/C/D kanali sõnad. Kuues olemasolevas baasis
on External 1 → Wah PID5, ALL; NewLookis on allikas NONE, kuigi siht jääb alles.
Varasem `FM3_COMPOSER_NEWLOOK.md` dokumenteerib sama allikasõna 14→0 muutuse.
NONE koos allesjäänud sihtmärgiga ei tähenda aktiivset seost.

Teisese allika operaatorite semantika pole kinnitatud: selline siht jääb
ebaselgeks ja kirjutus keelatakse. Tundmatu allikas või kanal ei ava kirjutusluba.
Kirjeldus säilib validation.json failis; ühtki modifikaatorisõna ei kirjutata.
See lugeja ei tugine vanema dekoodri 12 kirje heuristikale.

## Kirjutus ja lõppjuhend

- Mõlemad tabelikirjutajad kontrollivad kogu plaani enne body või callback'i
  muutmist. Tempo võib olla päringus enne või pärast sõltuvat juhikut.
- Sama kanali lõplik väärtus võetakse planeeritud kirjutusest või olemasolevast
  kehast. Teine kanal ei vabasta lukku. Nimi, PID ja experimental/raw ei möödu reeglist.
- Aktiivse modifikaatori sihtmärgiga seotud Tempo sünkroniseerimine lükatakse samuti tagasi.
- Legacy Delay Time, Reverb PreDelay ja Rotary Rate kontrollitakse pärast
  koostamist; soundi järgmise etapi tabelikirjutused kontrollitakse uuesti lõpus.
- Muutmata sõnad säilivad. Lõpp-JSON eristab `stored`, `tempo` ja `modifier`
  juhtimisviisi; TXT nimetab tempo või kontrolleri juhitud väärtuse salvestatud
  väärtuseks. See ei tõenda kõlavat väärtust ega välise pedaali asendit.

## Reprodutseerimine ja piirid

Repo juurest:

```sh
python3 tools/fm3/parameter_dependencies.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-parameter-dependencies.py
python3 tools/fm3/parameter_dependencies.py
```

`--write` nõuab kinnitatud editorit. Ilma binaarita kontrollib CI salvestatud
metaandmete, cache'i ja sõnastiku kooskõla, mitte uut PE-väljavõtet. Käitusmoodul
kontrollib registri SHA-256 räsi. Binaari, tervet XML-i ega toordekompilatsiooni
ei avaldata; editorit ei käivitata.

Regressioon katab 21 paari kanalitel A–D, päringu järjekorra, atomaarse tõrjumise,
toorsõnaga möödumise, lõppjuhendi ning etappidevahelise vastuolu. Kõik 32 kirjet,
kanalipiirangud ja tundmatud allikad saavad eraldi sünteetilised tarkvarakatsed.
Need pole uued riistvaratõendid. Selle etapi maatriksis jäi 688 skalaari; 21 SYX-katses oli
42 907 lubatud kirjutust, 856 tüübivälistust, 577 tempovälistust ja 72
modifikaatorivälistust. 899 ajaloolist vaatlust / 85 mõõdetud võtit ei muutu.
Kehtiva maatriksi lisapiirangud on [Delay/Reverbi juhendis](FM3_DELAY_REVERB_APPLICABILITY.md).

Muude perede tüübisobivus, ülejäänud tempo-seosed, kontrollerite loomine ja
dünaamika, GLOBAL, suvaline routing, uue faili import, heli ja CPU jäävad eraldi
tööks. Paigaldatud plugin jääb 0.3.2 peale; 0.3.3 on jätkuvalt PR-i kandidaat.
