# Rotary ja Pitch — FW13 sobivus ning kodeeringupiirangud

0.3.3 kandidaat kontrollib Rotary aktiivseid juhikuid ning kõigi 16 kogutud
Pitchi mudeli lõplikku kanali tüüpi. Pitchi TYPE PID 0 muutmiseks on vaja
terviklikku kanalimalli. Rotaryl **tüübivalijat ei ole**: PID 0 on Rate.
Mudelit ei tuletata Rotary Rate’i salvestatud väärtusest.

## Mudelierisused

| Mudel / pere | Kinnitatud erisus |
|---|---|
| Rotary | 20 aktiivset juhti; kasutamata GlobalMix PID 9 suletud |
| Dual Detune | Lühikese viite TIME1/2 PID 97/98; need pole DELAY1/2 PID 27/28 |
| Quad Detune | Neli detune-häält ning neli viidet/temposeost |
| Classic Whammy | PITCHMODE PID 1 ja UCTRL PID 3 |
| Advanced Whammy | UCTRL; Start/Stop on SHIFT1/2, mille märgiga kodeering on nüüd eraldi kontrollitud |
| Octave Divider | Level/Pan ja Detector Source, ilma tavapäraste Detune-juhikuteta |
| Crystal Echoes | Splice Time/Tempo, Diffusion, Direction ja kaks häält |
| Quad Chromatic / Quad Chromatic Delay | Tagasiside on Delay-variandil, mitte tavalisel Quad Chromaticul |
| Dual Detune Delay | FEEDBACK3/4 on häälte risttagasiside 1→2 / 2→1, mitte lisahääled |
| Arpeggiator / Custom Shifter | Mudelite nähtavus on teada; diskreetsed väljad kasutavad eraldi kodeeringut, dünaamilised noodid on suletud |

Lõppjuhend kasutab mudelile vastavaid silte. Peidetud ja keelatud sõnad
säilivad toorandmetes; neile ei kuvata vana vale skaala põhjal väärtust.
Kõik A–D kanalid kontrollitakse eraldi. Vigane kirjutus peatab terve plaani
enne faili muutmist. Nimi, PID ja legacy experimental/raw ei väldi piiranguid.

## Leitud ja seejärel lahendatud 27 metaandmevastuolu

Vana sõnastiku matemaatiline skalaari kodeerimine ei ole nende väljade puhul
kirjutusluba. FW13 cache’i tüüp 16 ja kogutud mallide väikesed täisarvsõnad
osutavad diskreetsetele väärtustele; vana pideva skaala teisendus oleks vale.
Järgnev [kodeeringuetapp](FM3_PITCH_WORD_CODECS.md) tõendab salvestuse FM3
tehasepresetite, FW13 cache’i ja olemasolevate mallidega. Uut seadmemõõtmist ei väideta.

| Väljad | PID | Vastuolu |
|---|---|---|
| Shift 1–4 | 15–18 | Diskreetsed −24…24; vana sõnastik normaliseerib pideva skaalana |
| Pitch Tracking | 35 | FW13 NOTES/CHORDS ja vahemik 1…2; vana sõnastiku OFF/NOTES ning nullist algav kodeerija ei sobi |
| Custom Notes | 63 | Diskreetne 4…8; vana pidev skaala |
| Custom Scale 1/2 | 71–72 | Diskreetne skaalaindeks 0…31; globaalsete skaalade sisu pole selles presetis kinnitatud |
| Steps / Repeats | 73–74 | Diskreetsed 2…16 / 1…31; vana pidev skaala |
| Arpeggiator Tempo | 76 | FW13 valikud algavad 1-st, mitte nullist; erineb LFO/Delay Tempo väljadest |
| Step 1–16 Shift | 77–92 | Diskreetsed −24…24; vana pidev skaala |

Need 27 välja on nüüd lubatud täpselt piiritletud presetisõna teisenduse,
lõpliku mudeli nähtavuse ja seniste sõltuvuskontrollide alusel. Vana
normaliseeritud teisendust ei kasutata; raw sisend ei väldi domeenikontrolli.

Lisaks on Note 2–8 PID 64–70 FW13 XML-is `dynamicParamInfo=true`; need 28
juhikuesinemist neljas variandis on registris eraldi talletatud ja kirjutamiseks
suletud. Tonic PID 107 on fikseeritud 0…0 redaktoriväli, mitte skalaari juht.
Formant/GlobalMix ja teised kasutamata või aktiivses XML-is puuduvad juhikud
on samuti suletud. Muud tundmatud dünaamilised atribuudid peatavad kompilaatori.

Järgmine töö puudutab dünaamilisi noote, globaalseid skaalasid, korduste
eriväärtuste kuvasilte ning Learn-, LFO- ja kontrolleridünaamikat. Salvestatud
kodeeringu tõend ei kinnita arpedžiaatori kuuldavat tulemust.

## Tempo, mallid ja allikad

Senised 21 tempo-seost ning modifikaatorisihtide kaitse kehtivad edasi,
sealhulgas Rotary Rate ja Pitchi Delay/Splice/LFO Rate. Käsiväärtus nõuab
vastava kanali lõplikku Tempo NONE olekut; plaani järjekord pole oluline.
Aktiivse või ebaselge modifikaatori sihtmärki käsiväärtusega ei asendata.

Uus register seob **135 natiivset nimi/PID-deskriptorit** (21 Rotary + 114 Pitch),
FM3-Edit 1.07.17 aktiivse FW13 XML-i, olemasoleva FW13 cache’i ja 16 Pitchi malli.
Rotary varasem mõõteregister kinnitab tüübi puudumist; A-kanali vanad
mõõtepunktid ei muutu uueks A–D riistvaratõendiks. Registri SHA-256:
`0e35b472aba506e0ae6e296eeec7dafbf0fd6ff06fca1a0954fe924776e119a2`.
Sõnastikku ega mõõtmisi ei muudeta. Binaari ei käivitata ega avaldata.

```sh
python3 tools/fm3/rotary_pitch_applicability.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-rotary-pitch-applicability.py
python3 tools/fm3/rotary_pitch_applicability.py
node plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-rotary-pitch-applicability.mjs
```

Kontroll: **16 Pitchi malli A–D, 2152 lubatud kirjutust, 4440 sobimatu
kirjutuse tõrjumist ja 64 täismalli nõuet**. Rotaryl läbis
**80 kirjutust** (20 juhikut × 4 kanalit). Lisaks **80 dünaamilise/fikseeritud välja raw tõrjumist**,
sõltumatud mudelierisused, tundmatud tüübid, tempo/modifikaatorid, atomaarne
veakäsitlus, kõrvalmuutused ning lõppjuhendi ja täismalli sõnade säilimine.
Muudetud testkehad on tarkvaralised katseandmed, mitte uued mõõtmised.

Kokku on nähtavusreeglid seotud 11 efektiperega; tüüpi omavates peredes on
319 kogutud malli. See ei ole kogu FM3 parameetrite ega DSP valideerimine.
Paigaldatud plugin jääb 0.3.2 peale. Kasutaja füüsilisi toiminguid: **0**.
Uut FM3 importi, heli ega CPU-d ei testitud.
