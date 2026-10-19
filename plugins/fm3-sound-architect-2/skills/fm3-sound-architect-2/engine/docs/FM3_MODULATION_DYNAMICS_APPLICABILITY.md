# Flanger, Phaser ja Compressor — FW13 sobivuskontroll

0.3.3 kandidaat kontrollib nende kolme pere selgesõnalisi tabelikirjutusi kanali
lõpliku mudeli ning valija järgi. Mudelivahetuseks kasuta täielikku kanalimalli;
Phaseri Mode'i üksikkirjutus on samuti keelatud. Nime, PID ja experimental/raw
kaudu ei saa sellest nõudest mööduda, ka sama väärtuse kirjutamisel.

| Pere | Kogutud mudelid | Sõnastikukirjed | Mudelivalija | Nähtavuse valija |
|---|---:|---:|---|---|
| Flanger | 31 | 33 | TYPE, PID 0 | TYPE, PID 0 |
| Phaser | 17 | 35 | TYPE, PID 0 | MODE, PID 17: Normal / Vibe / Barberpole |
| Compressor | 19 | 37 | TYPE, PID 12 | TYPE, PID 12 |

Compressor ei kasuta tüübi jaoks PID 0; see on Threshold. Phaser kasutab
mudelinimest eraldi Mode-välja. Tegelik mudeli/valija paar peab vastama kogutud
mallile; tundmatu või vastuoluline paar ei anna kirjutusluba. Kanalid A–D
kontrollitakse eraldi. Muutmata peidetud sõnad säilivad.

## Flangeri praegused nimed ja vanad aliased

Sõnastiku 22 `OLD_FLANGER_*` nime säilivad täpselt samadel aadressidel.
FM3-Editi natiivsed deskriptorid kinnitavad praegused nimed; nende täielik nimi
või lühivorm on nüüd samuti sisendina lubatud. Eriti oluline on see paar:

| Praegune nimi / lühivorm | PID | Säiliv vana nimi | Lõppjuhendi silt |
|---|---:|---|---|
| FLANGER_MANUAL / MANUAL | 5 | OLD_FLANGER_DELAYTIME | Manual |
| FLANGER_DRYDELAY / DRYDELAY | 6 | OLD_FLANGER_MANUAL | Dry Delay |
| FLANGER_LPFREQ / LPFREQ | 19 | OLD_FLANGER_HICUT | High Cut |
| FLANGER_HPFREQ / HPFREQ | 21 | OLD_FLANGER_LOWCUT | Low Cut |

Seega `OLD_FLANGER_MANUAL` ei ole uue `FLANGER_MANUAL` sünonüüm. Täpse vana nime
tähendust ei muudeta. Ühe PID küsimine nii vana kui uue nimega on topeltkirjutus
ja tõrjutakse. Skalaari valemid, vahemikud ja lubatud staatused ei muutu.
Vana sõnastiku nime kõrval kasutatakse raportis XML-ist kinnitatud kuvatavat silti.

## Tüübist sõltuvad juhikud

Flangeri aktiivne FW13 XML annab kõigile 31 mudelile sama juhikute loendi.
Tüübipõhiseid lisakeelde ei oletata; Tempo ja modifikaatorite varasemad reeglid
kehtivad edasi. Kasutamata Global Mix ei muutu kirjutatavaks.

Phaseri Normal/Vibe lubab näiteks Manuali, Min/Max Frequency ja tavapärased
LFO-juhikud. Barberpole kasutab Sweep Directioni ning Filter Q-d; Manual ja
tavaline LFO-tüüp seal kirjutusluba ei saa. Tone on ka Barberpole'il Expert-lehel.

Compressori aktiivsed mudelivariandid on eraldi kontrollitud. Näited:

- Compander kasutab COMP_COMPANSIONi (kuval Ratio), COMPTIME'i (Time) ja
  COMPMATCHi (Transients), mitte tavalist COMP_RATIOt ega Attack/Release'i.
- Dynamics Processor kasutab THRESH2 ja DYNAMICS välju; tavalise Ratio kirjutus
  tõrjutakse. Sama kuvatekst ei tähenda sama PID-d.
- Econo-Dyno-Compil pole Tone'i; Dynami-Comp Modernil on Tone. Citrus Juiceril
  pole Look-Ahead Time'i. Optical/JFET ja teised variandid järgnevad FW13 lehtedele.
- Gain Monitor on mõõdik, mitte kirjutatav juht. Light Type, X/Y markerid ja
  muud kasutamata väljad jäävad suletuks ka raw kaudu.

Need on XML-i nähtavusreeglid. Automaatse Attack/Release'i, Auto Makeupi,
ümbriku- ja LFO-dünaamika tegelikke väärtusi siin ei arvutata ega kinnitata.
Salvestatud väärtus ei tõenda kõlavat väärtust. Olemasolevad
[tempo-/modifikaatoripiirangud](FM3_PARAMETER_DEPENDENCIES.md) kehtivad lisaks;
need ei hõlma kõiki FM3 sõltuvusi.

## Allikad ja korratav kontroll

Register seob FM3-Edit 1.07.17 natiivsed nimi/PID-deskriptorid, aktiivse FW13
XML-i, kasutaja FW13 cache'i ja kogutud mallide räsid. Kõik 105 natiivset
sidumist loetakse PE64 viitadest ükshaaval; Flangeri vana/uue tabeli naabrust
ei käsitleta ühe pideva peretabelina. Compressor kasutab 11 aktiivset varianti;
vanad, enne FW10 kehtinud variandid ja XML-kommentaarid ei anna kirjutusluba.
Variantide katvus peab olema täielik ja kattumisteta; lehe- ning juhikutingimused
lõigatakse variandi domeeniga. Tundmatu dünaamiline juhik peatab kompileerimise.

Repo juurest:

```sh
python3 tools/fm3/modulation_dynamics_applicability.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-modulation-dynamics-applicability.py
python3 tools/fm3/modulation_dynamics_applicability.py
```

Esimene käsk taastab registri kinnitatud binaarist; `--write` nõuab sama binaari.
[Wah’ ja Tremolo/Panneri jätkuetapp](FM3_WAH_TREMOLO_APPLICABILITY.md)
laiendab sama registrit kahe perega; allpool esitatud 67 malli arvud
kirjeldavad algset kolme pere regressiooni. Tavapärane CI kontrollib salvestatud metaandmeid, malle ja cache'i, mitte uut
PE-väljavõtet. Registri SHA-256:
`d18781685ff638cab72e8ff1ac7016b9c071781e94e91605b76d7f1b032f94e2`.
Käitusmoodul kontrollib räsi. Editorit ei käivitata, binaari ega tervet XML-i
ei avaldata. Sõnastikku ega mõõtmistõendeid ei muudeta.

Kõik **67 malli A–D kanalitel** läbisid regressiooni: **7468 lubatud kirjutust,
984 sobimatuna tõrjutud kirjutust ja 336 täismalli nõude kontrolli**.
Testid kontrollivad ka sõltumatult oodatud tüübinäiteid, native/legacy nimede
aadresse, toorsõnu, kogu keha kõrvalmuutusi, mõlemat kirjutajat, päringu järjekorda,
atomaarset tõrjumist, kanalite eraldatust ja lõppjuhendit. Koostatud täiskanalimallid
ning varasemate Delay/Reverbi ja Chorus/Drive’i reeglite regressioonid säilivad.

Kasutaja füüsilisi toiminguid: **0**. Uut seadmeimporti, heli ega CPU-d ei testitud.
Paigaldatud plugin ja käivitajajuhend jäävad 0.3.2 peale; see on 0.3.3 kandidaat.
