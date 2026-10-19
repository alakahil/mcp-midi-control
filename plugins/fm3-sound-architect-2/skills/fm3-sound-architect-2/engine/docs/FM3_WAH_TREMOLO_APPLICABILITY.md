# Wah ja Tremolo/Panner — FW13 sobivuskontroll

0.3.3 kandidaat lisab üheksale Wah’ ja seitsmele Tremolo/Panneri kogutud
mudelile lõpliku kanali tüübisobivuse. Mõlema pere TYPE on PID 0 ning selle
muutmine nõuab täielikku kanalimalli. Sama keeld kehtib nime, PID ja
experimental/raw kaudu, ka senise tüübi uuesti kirjutamisel. Tundmatu mudel
peatab kirjutamise. Kanalite A–D kontrollid on eraldi.

| Pere / mudel | Lubatud erijuhikud | Sellel mudelil puuduvad juhikud |
|---|---|---|
| Wah, kõik peale Paragoni | Inductor Bias, Fat, Q Tracking | — |
| Wah, Paragon (8) | Control, Frequency Min/Max, Q, Drive, Low Cut, Graphic EQ | Inductor Bias, Fat, Q Tracking |
| Panner (1) | Width, Pan Center, LFO Type, Duty Cycle | Depth, Start Phase, LFO Shape, Crossover |
| Harmonic Trem (3) | Crossover Slope/Frequency, Depth, Start Phase, LFO Type, Duty Cycle | Width, Pan Center, LFO Shape |
| Neon Trem (6) | Depth, Start Phase, LFO Phase | LFO Type, Duty Cycle, LFO Shape, Width, Pan Center, Crossover |
| VCA, Bias ja Optical Trem 1/2 (0, 2, 4, 5) | Depth, Start Phase, LFO Shape, LFO Type, Duty Cycle | Width, Pan Center, Crossover |

Tabel loetleb erisusi; ühised Level/Balance, bypass’i ja muud XML-is kinnitatud
juhikud säilivad. Tremolo MIX (6) ja GLOBALMIX (10) on kasutamata sõnad ning
neid ei saa raw kaudu kirjutatavaks muuta. Wah’ kaheksa Graphic EQ liugurit
on olemas kõigil mudelitel, sh Paragonil. EQON-i DSP-mõju ega LFO/ümbriku
tegelikku väljundit see nähtavuskontroll ei arvuta.

## Tempo ja pedaal

Tremolo RATE PID 2 nõuab sama kanali lõplikku TEMPO PID 5 väärtust NONE.
Päringu järjekord ei muuda tulemust. Aktiivse või ebaselge modifikaatori
sihtmärgile käsiväärtust ei kirjutata. Kuuel varasemal kontrollalusel juhib
External 1 Wah’ CONTROL PID 5 välja; see kaitse kehtib edasi.

NewLook-alusel on varasem Wah’ siht alles, kuid modifikaatori allikas on NONE.
Seetõttu saab sellele alusele Wah’ ploki lisamise järel Controlit selgesõnaliselt
muuta. Test kasutab olemasolevat modifikaatorita alust ega lülita kasutaja
pedaali testimise nimel välja. Täiskanalimallid ei muuda modifikaatorikirjeid.
Aktiivse pedaaliga aluste tõrjumine on eraldi regressioonis.

## Allikad ja kontroll

Kasutatakse sama kinnitatud FM3-Edit 1.07.17 / FW13 XML-i, natiivseid
nimi/PID-deskriptoreid, FW13 cache’i ning olemasolevaid GET/SYX-malle.
Lisatud on 47 natiivset sidumist: 25 Wah’ ja 22 Tremolo sõna.
Wah’ Paragoni erileht välistab Paragoni vaikimisi lehelt. Tremolo kolm erilehte
välistavad vastavad mudelid vaikimisi lehelt. Enne FW8 kehtivad lehed ei osale.
Graphic EQ liugur on lisatud kompilaatori lubatud juhikuliikide hulka;
tundmatud juhikuliigid, valijad ja kattuvad variandid põhjustavad endiselt vea.

Register on ühine Flangeri/Phaseri/Compressori omaga:
`fm3-modulation-dynamics-applicability.json`, SHA-256
`d18781685ff638cab72e8ff1ac7016b9c071781e94e91605b76d7f1b032f94e2`.
See sisaldab nüüd viit peret, 83 mudelit ja 152 natiivset sidumist.
Varasema kolme pere reeglid ei muutu. Sõnastikku ja mõõtmisi ei muudeta.

```sh
python3 tools/fm3/modulation_dynamics_applicability.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-modulation-dynamics-applicability.py
python3 tools/fm3/modulation_dynamics_applicability.py
node plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-wah-tremolo-applicability.mjs
```

Binaari ei käivitata ega avaldata. CI kontrollib salvestatud registrit koos
cache’i ja mallidega; kinnitatud binaari olemasolul saab väljavõtte korrata.
Kõiki 16 malli kontrollitakse A–D kanalitel: toorsõnade tagasilugemine,
kogu keha kõrvalmuutused, sõltumatud oodatud mudelierisused, täieliku plaani
atomaarne tõrjumine, mõlemad kirjutajad ning lõppjuhendi peidetud väljad.
Tulemus: **1260 lubatud kirjutust, 136 sobimatu juhiku tõrjumist ja 64
täiskanalimalli nõude kontrolli**. Muudetud testkehad on tarkvaralised
katseandmed, mitte uued seadmemõõtmised.

Paigaldatud plugin jääb 0.3.2 peale; tegemist on 0.3.3 kandidaadiga.
Kasutaja füüsilisi toiminguid: **0**. Seadmeimporti, heli ega CPU-d ei testitud.
Ülejäänud perede, globaalsete seadete ja dünaamiliste sõltuvuste katvus jääb
edasise töö hulka. Järgmisena saab sama meetodit rakendada Rotaryle ja Pitchile.
