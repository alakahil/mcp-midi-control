# REA kasutamine FM3 Sound Architecti arenduses

2026-10-12 · arenduspakett 0.73.0 · kontrollitud npm-pakett rea-agents@6.4.0.

REA on kasutusele võetud **valikulise lähtekoodi kaardistamise tööriistana**.
Selle import-reference-source käsk töötas päris Filteri lähtefailidel.
JavaScripti süvaanalüüs on selles keskkonnas blokeeritud ja FM3-Editi
binaaranalüüsi pole tehtud. Need ei ole lõpetatud integratsioonid.

## Kus sellest kasu on

| Arendustöö | Kasu ja piir |
| --- | --- |
| Generaatori kood ja sõltuvused | Toimiv lähtefailide SHA-256 kaart ja importide seosed aitavad määrata muudatuse ulatust. Selge lähtekoodi puhul jäävad vajalikuks tavaline koodi lugemine ja testid. |
| FM3-Editi parameetritabelid ja teisendused | Potentsiaalselt suurim kasu: tekstiotsing, ristviited ja dekompileeritud funktsioonid võivad näidata PID-sid, tüübitingimusi, vahemikke ja teisendusi. Vajab programmi faili ning analüüsimootorit; leiu olemasolu pole garanteeritud. |
| Tarkvaraversioonide võrdlus | Võib aidata eristada vana tabelit uuest. Iga järeldus siduda faili räsi, programmi versiooni ja FM3 firmware'iga. |
| SysEx ja mõõteandmed | SYX on andmefail. Kasuta olemasolevat FM3 dekoodrit ja paarivõrdlust; üldine native-dekompilaator ei asenda neid. |
| Soovitud või artisti sound | REA ei tõenda helilist sarnasust. Kuulamine ning tasemete ja CPU kontroll jäävad eraldi tööks. |
| Avaldamise arhiiviviga | REA seda ei paranda. Serveriversioon oli kontrollimisel endiselt 0.71.0; arhiiviviga on eraldi dokumenteeritud. |

REA pakub CLI-d ja kohalikku stdio MCP serverit. Siinne kasutus käib CLI kaudu;
REA MCP pole sellesse vestlusse ühendatud. Versioonikäsu õnnestumine ei tõenda
MCP ühendust ega native-analüüsi.

## Tegelik kontroll

- Node 24.19.0; npm-pakett 6.4.0 ja lukustatud terviklussumma.
- Filteri 10 muutmata MJS faili; kõik räside võrdlused klappisid.
- REA tagastas 9 sisemist ja 24 välist importseost, parserivigu 0.
- REA inventory_state on **partial**, autoriteet **historical-reference**.
  Säilita need tähised. See on lähtekoodiviite kaart, mitte käitumis- ega seadmetõend.
- analyze-javascript-application peatus protsessi omandi kontrollis:
  capability_unavailable; ps: fatal library error, lookup self.
  Parsitud JavaScripti faile 0, mooduleid 0. Osaline failiinventar ei ole
  õnnestunud rakendusanalüüs.
- Täpne ps käsk töötas Pythonist, kuid ebaõnnestus Node execFile kaudu.
  Põhjust pole lõplikult tuvastatud. REA protsessikontrolli ei muudeta ega
  asendata näilise õnnestumisega.
- Ghidra, Hopper ja IDA pole seadistatud; FM3-Editi programmi faili polnud.
  Süsteemi Java oli 17, Ghidra töövoog vajab sobivat täielikku JDK-d.

Koondraport: FM3_REA_PILOT.json. Toored tulemused säilivad kadudeta failis
skills/instructions/references/rea-pilot-20261012.json.gz.

## Esimene uurimisülesanne: Filteri pidevad väärtused

REA lähtekaart näitab fm3-filter-library.mjs → fm3-filter-controls.mjs ja
filter-control-collector/control-check.mjs seoseid. Praegune generaator
lubab ainult tõendatud kanali/tüübi/väärtuse kombinatsioone.

**Eraldi tehtud arvuline võrdlus, mitte REA dekompileerimise tulemus:**
kõik 17 senist mõõtepunkti kattuvad kandidaatvalemitega:
toorsõna = round(normaliseeritud_sihtväärtus × 65534).

| Juht | Kandidaatskaala | Mõõtepunktide kattumine |
| --- | --- | --- |
| Frequency | logaritmiline, 20–20000 Hz | 9/9, kolmel mõõdetud kanalil/tüübil |
| Q | logaritmiline, 0,1–10 | 2/2, Peaking C |
| Gain | lineaarne, −20…+20 dB | 3/3, Peaking C |
| Level | lineaarne, −80…+20 dB | 3/3, Peaking C |

Võrdlus kasutab targetValue väärtust. Ümardatud displayValue pole uus sama
täpsusega mõõtepunkt. Vahemike kandidaadid on olemasoleva codec'i märgistatud
eeldustes; teisendusviis on võrreldav auditeeritud PEQ lahendusega.
Kokkulangevused ei tõenda mõõtmata otspunkte, kõiki vaheväärtusi, teisi
tüüpe/kanaleid ega vahele jäänud Q=0,707 punkti.

Järgmine sihitud native-uurimine:

1. Fikseeri FM3-Editi tegelik versioon, failiformaat, arhitektuur ja SHA-256.
   Ära eelda, et EXE tähendab .NET-i või APP Electroni.
2. Otsi FILTER_FREQ, FILTER_Q, FILTER_ORDER ning nähtavaid Filteri silte.
   Stringi puudumine ei tõenda funktsiooni puudumist.
3. Jälgi ristviiteid ja teisendusfunktsioone. Säilita aadressid, pseudokoodi
   tõendid, lähtefaili räsi ja lahendamata küsimused.
4. Võrdle tulemust senise 17 mõõtepunktiga. Kontrolli eraldi Orderit,
   tüübi järgi peidetud juhte ja A–D kanalite struktuuri.
5. Koosta täpne puuduvate tõendite loend. Juba tehtud mõõtmisi ei korrata.
   Uue kirjutustoe jaoks on vaja auditit, regressiooni ning sobivat FM3
   import/eksport- ja helikatset. REA oletus üksi ei luba kirjutustuge laiendada.

Järgmised suunad sõltuvad soovitud soundist: Ampi skalaarsete juhtide ja
efektiparameetrite laiendamine, modifier'id ning vabam ruudustiku koostamine.
Need pole REA lisamisega valmis. PEQ, GEQ ja Enhanceri lõpetatud kogumist
ning kinnitatud presetikatseid ei avata uuesti.

## Käivitamine macOS-is või Linuxis

Tööriistad ja tulemused peavad jääma **plugina kaustast väljapoole**.
node_modules lisamine pluginasse tooks arhiivipiirangu kiiresti tagasi.
Skript ei suhtle MIDI/USB-ga ega käivita uuritavat FM3 lähtekoodi.

Vajalik: Python 3, npm ja Node 22.19+ harus 22, 24.11+ harus 24 või 26+.
Sõltuvused on lukustatud scripts/rea-dev/package-lock.json failis.
Näide lahtipakitud plugina juurkaustast:

    python3 skills/instructions/scripts/fm3-rea-dev.py --install --toolchain "$HOME/FM3_REA_TOOLS" --output "$HOME/FM3_REA_RESULTS_001"

--install loob uue tööriistakausta ja käivitab lukustatud npm ci ilma
installiskriptideta. Olemasoleva paigaldusega jäta --install ära ja kasuta
iga auditi jaoks uut tulemuste kausta. Kasutaja Macis pole töövoogu veel katsetatud.

Süvaanalüüsi lisakatse toimivas keskkonnas:

    python3 skills/instructions/scripts/fm3-rea-dev.py --toolchain "$HOME/FM3_REA_TOOLS" --output "$HOME/FM3_REA_RESULTS_002" --deep

REA väljund ja vead säilivad. Kui süvaanalüüs ebaõnnestub, lõpeb skript
veakoodiga ka siis, kui lähtekaart õnnestus. Tulemusi üle ei kirjutata.

## FM3-Editi native-analüüsi ettevalmistus

Tasuta analüüsimootori võimalus on Ghidra. REA dokumenteerib Ghidra 12.1.x ja
selle paigalduse nõuetele vastava täieliku JDK; kontrollitud kombinatsioon
on Ghidra 12.1.4 ja JDK 21. Meie skript mootoreid ega JDK-d ei paigalda.
FM3-Editi APP/käivitatav fail tuleb võtta tegelikust paigaldusest või ametlikust
paketist; versioon tuleb fikseerida. Preseti SYX ei ole see fail.

Pärast mootori seadistamist:

    node "$HOME/FM3_REA_TOOLS/node_modules/rea-agents/scripts/rea.mjs" doctor --provider ghidra --format json
    node "$HOME/FM3_REA_TOOLS/node_modules/rea-agents/scripts/rea.mjs" analyze "/tegelik/tee/FM3-Edit.app" --provider ghidra --format json

Need native-käsud on dokumenteeritud, kuid siin FM3-Editiga katsetamata.
Tulevane MCP ühendamine käib vastava kohaliku agendi REA setup'i kaudu.
Pelga skill'i lisamine ei paigalda mootorit ega ühenda MCP serverit.

## Allikad ja versioonieristus

- https://github.com/morluto/rea
- https://github.com/morluto/rea/blob/main/docs/installation.md
- https://github.com/morluto/rea/blob/main/docs/cli.md
- https://github.com/morluto/rea/blob/main/docs/javascript-artifact-reconstruction.md
- https://github.com/morluto/rea/blob/main/docs/native-investigation.md
- Uuritud main-haru commit: fe4b94a661054cef7603a3f07aae71f1df0a701a.
- Tegelik paigaldus: npm rea-agents@6.4.0, mitte main-haru ehitus.
- Main-juhendi --source-path lipp puudus paigaldatud 6.4.0 CLI abist;
  töövoog kasutab täpselt valitud algfailide koopiaid.

REA enda kood on MIT litsentsiga, välised mootorid on eraldi sõltuvused.
Pluginas on meie käivitaja, sõltuvuste lukk ja auditi tulemused; REA koodi,
mootoreid ega node_modules kausta sinna ei kopeerita.
