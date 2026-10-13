# FM3 Sound Architect 2 — varukoopia 0.2.0

Avaldatud plugina lähtekoodi, lähtepresetite, mudelimallide ja kontrolltõendite täielik koopia, seisuga **13.10.2026**. Paketis on **2946 faili**.

- Plugin: `plugins_6accfd716e148191b0adb61e4e36f0e4`
- Väljalase: `pluginrel_6acde49fd8c88191b58701d49cf34af7`
- Generaator: `jb-composer-0.13.0-dev`, FM3 firmware 13.0.
- Kasutaja andis 13.10.2026 nõusoleku selle lähtekoodi ja mõõtmistõendite salvestamiseks avalikku `alakahil/mcp-midi-control` reposse. Plugina enda privaatsus ja versioon jäävad muutmata.

## Taastamine

Laadi alla või klooni repo. Käivita sellest kaustast Python 3.9 või uuemaga:

```bash
python3 restore.py /absoluutne/tee/uue/fm3-restored-kaustani
```

Sihtkaust ei tohi juba olemas olla. Skript ühendab arhiivi osad, kontrollib iga osa ja kogu arhiivi SHA-256 räsi ning taastab kõik failid. Seejärel võrdleb ta iga taastatud faili kontrollsummat lähtepaketi manifestiga. Skript ei vaja võrku ega FM3 ühendust.

Arhiiv on jagatud väikesteks binaarosadeks, et vältida üleslaadimisel mahukat päringut. XZ-arhiivi lahtipakitud TAR on algse plugina TAR-iga baitidentne; ükski lähtefail pole muudetud. `snapshot.json` kirjeldab arhiivi, osi ja päritolu; `files.sha256.json` sisaldab kõigi 2946 faili kontrollsummasid.

Taastatud mootor paikneb `skills/fm3-sound-architect-2/engine/skills/instructions/`. Sellest kaustast:

```bash
node scripts/fm3-generate.mjs --capabilities examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx
python3 scripts/fm3-evidence-archive.py verify
```

Põhijuhend on taastatud `skills/fm3-sound-architect-2/SKILL.md`. Vanad dokumendid sisaldavad ajaloolisi „ootel” märkusi; kehtivat tuge kontrollib generaatori `--capabilities` väljund.

## Kontrollitud seis

- 336 Amp- ja 45 Cab-malli; A–D mudelivalik ning kaheksa stseeni nimed/kanalid/bypass.
- PEQ, GEQ ja Enhanceri kokkulepitud integratsioonietapid on varasemate tõendite järgi lõpetatud.
- Filter: 18 tüübi mallid, 40 täpset kirjutuspunkti 32 GET/SYX-paari põhjal. Aktiivse Filteri heli ja CPU jäävad kontrollimata.
- 13.10.2026 käivitus generaator, Ampi tihendatud tõendiajalugu läbis kontrolli ning Filteri REA lisatest läbis 15 täieliku seadmeekspordi taastamise ja 16 vigase sisendi tõrjumise kontrollid. Uusi riistvarakatseid ei tehtud.

Järgmine arendusettepanek on auditeerida Ampi A–D Leveli seniseid tõendeid ning laiendada kirjutustuge ainult puuduvate vastenduste valideerimise järel. See varukoopia ei lisa uusi kirjutusvõimalusi.

See kaust on taastatav versioonikoopia. Repo olemasolevat MIDI-serveri lähtekoodi ega käitumist selle lisamisega ei muudeta. Kaasatud kolmandate osapoolte litsentsid ja teatised säilivad originaalpaketis.
