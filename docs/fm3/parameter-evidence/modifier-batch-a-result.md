> **Uuem seis:** B on üle vaadatud; üheksa uut punkti korras, Max jäi 7.50.
> [B tulemus ja ainult Maxi lõpetamise juhis](modifier-batch-b-result.md).
> Allpool olevat B kümne välja katset tervikuna ei korrata.

# Koondkatse A tulemus ja järgmine koondkatse B — 21.10.2026

**Üks eksport andis kümne välja uue vaatluspunkti.** Võrdlus Min 2.50
algfailiga läbis: muutusid ainult kümne valitud sõna 20 baiti; ülejäänud
14 202 sisubaiti säilisid. Kaadrite kontrollsummad, preseti CRC, footer,
modifikaatorite struktuur, päised ja nulltäide on korras. CRC ning pakitud
sisu pikkus muutusid ootuspäraselt (4928 → 4946 baiti).

Ekraanipilt avanes ja kõik kümme näitu kontrolliti visuaalselt.
**Attack on pildil 99.9 ms**, kasutaja sõnumis oli 9.99 ms. Auditis säilivad
mõlemad; vaatluspunkt kasutab pilti. Võimalikku kirjaviga ei märgita kasutaja
kinnitatud paranduseks. Release on pildil ja sõnumis 249.9 ms.
Selle tekstierinevuse ega ümarduse pärast pole eraldi eksporti vaja.

| Väli | Pildil nähtud väärtus | Varasem toorkood → uus toorkood |
| --- | --- | --- |
| Max | 7.50 | 65534 → 49159 |
| Start | 10.0% | 0 → 6553 |
| Mid | 40.0% | 32767 → 26214 |
| End | 90.0% | 65534 → 58981 |
| Slope | 60.0% | 32767 → 39320 |
| Attack | 99.9 ms | 66 → 655 |
| Release | 249.9 ms | 0 → 1638 |
| Scale | 1.500 | 32767 → 38537 |
| Offset | −10.0% | 32767 → 29490 |
| Off Value | 20.0% | 0 → 10922 |

Min jäi 2.50 / 16375. External 1, Channel All, Auto Engage Off,
Damping Linear, PC Reset Off, Update Rate Slow, preseti nimi, Scene 2,
Wah' bypass ja ülejäänud preset säilisid. Pilt on FW13.00 redaktorist.

See on **üks kümne väljaga koondvaatlus**, mitte kümme isoleeritud katset.
Väljade asukohti toetab varasem binaarist kontrollitud nimede/PID-de tabel.
Koondvaatlus ei tõenda väljade täielikku sõltumatust, täisvahemiku teisendusi
ega pedaali/heli käitumist. Täpsed mõõdetud toorkoodid säilivad; näiteks Max
49159 ei asendata ideaalse lineaarvalemi tulemusega. Pluginaväljalase ja
kirjutusvõimekused sellest uurimissammust ei muutu.

## Järgmine füüsiline samm: koondkatse B

Jätka **praegusest koondkatse A seisust**. Uut algseisu eksporti pole vaja.
Kui oled vahepeal midagi muud muutnud, säilita oma töö ja taasta olemasolev
`FM3_MOD_BATCH_A_export.syx`. Ava Wahwah 1 → Control → Modifier.

| Väli | Praegune A-näit | B-katse sisestus |
| --- | --- | --- |
| Max | 7.50 | **5.00** |
| Start | 10.0% | **20.0%** |
| Mid | 40.0% | **55.0%** |
| End | 90.0% | **80.0%** |
| Slope | 60.0% | **35.0%** |
| Attack | 99.9 ms | **500 ms** |
| Release | 249.9 ms | **1000 ms** |
| Scale | 1.500 | **0.750** |
| Offset | −10.0% | **+15.0%** |
| Off Value | 20.0% | **80.0%** |

Need annavad teised proovipunktid: Scale alla ühe, Offset positiivne,
Off Value vahemiku ülemises pooles ning uued ajad ja kõvera väärtused.
Need aitavad võrrelda teisendushüpoteese; teine koondkatse üksi ei tõenda
veel iga väärtuse jaoks üldist valemit.

1. Muuda ainult tabeli kümmet välja, võimalusel arvulise sisestusega.
   Min jääb **2.50**, External 1 / All / Off / Linear / PC Reset Off /
   Update Rate Slow ja ülejäänud seadistus jäävad samaks. Säilita preseti
   sisemine nimi, Scene 2 ja bypass. Ära liiguta pedaali ega lohista graafikut.
2. Kui näit ümardub, jäta tegelik näit alles. Kui väli on lukus, jäta see
   muutmata ja ütle, milline; ära muuda avamiseks lisavälju.
3. Tee kõigi väärtustega **üks loetav ekraanipilt** ja ekspordi **üks SYX**
   välise failinimega **FM3_MOD_BATCH_B_export.syx**. Kui väärtused ei mahu
   ühele pildile, võib pilte olla mitu; eksporti pole vaja korrata.

Pärast B faili kontrollitakse kõiki muutusi ja tegelikke kuvanäite ning
otsustatakse piiratud kirjutustoe või täpse sihitud järelkontrolli vajadus.
Üksikekspordid jäävad ainult konkreetse lahendamata vastuolu jaoks.

## Korratav kontroll ja päritolu

- `node --test tools/fm3/test-modifier-batch.mjs`: **11/11 läbis**. Sisaldab
  tegeliku A faili kordusvõrdlust, vastuolulise kasutajateksti säilitamist,
  B õige algfaili kontrolli ning sünteetilisi kõrvalmuudatuste tõrjumise teste.
  Sünteetiline B test ei ole uus seadmetõend; B päris eksport on veel ootel.
- A võrdlus: `node tools/fm3/compare-modifier-batch.mjs docs/fm3/parameter-evidence/captures/FM3_MOD_BATCH_A_export.syx`
- B võrdlus: `node tools/fm3/compare-modifier-batch.mjs --plan docs/fm3/parameter-evidence/modifier-batch-b-plan.json /ABS/FM3_MOD_BATCH_B_export.syx`
- `modifier-batch-a-comparison.json` on automaatne, kuvanäite veel kinnitamata
  lugemisraport. `modifier-batch-a-evidence.json` lisab eraldi visuaalse
  ülevaatuse, kasutaja algse lause ja Attacki vastuolu.
- A SYX SHA-256: `7377e1494af98b181fc0557f3d66e57c532693bc2332a2212a2cbe4feb730ecb`.
- A lahtipakitud keha SHA-256: `06c3ba9920c8e3d26186cb0e4cec42f11011b7a9cd00e4366b84578809ef0ea8`.
- Ekraanipildi SHA-256: `91bac3fe7d6cafc24476d72912f5b025f8804867d9e181a41d9fa84dc57eeef8`.
  Algne pilt on säilitatud kasutaja manusena; seda lähtereposse ei lisatud.
- Seadmega ühendust, MIDI-käske, uut REA/Ghidra käivitust ega avaldamist selles
  sammus ei tehtud. Avaldatud plugin on endiselt 0.3.11; varasem 0.3.12
  kandidaat jääb eraldi, olemasoleva testikviitungiga.
