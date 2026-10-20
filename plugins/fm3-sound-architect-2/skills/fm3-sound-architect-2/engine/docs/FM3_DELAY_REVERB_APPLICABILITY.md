# Delay ja Reverb: mudel, algoritm ja tingimuslikud juhikud

0.3.3 kandidaat kontrollib Delay/Reverbi selgesõnalisi tabelikirjutusi kanali
lõpliku mudeli, sisemise algoritmi ja tingimuslike juhikute järgi. Mudelit või
peamist algoritmi saab muuta **täiskanalimalliga**. Üksik PID-, nime- või
experimental/raw-kirjutus nendele valijatele annab vea ka sama väärtuse korral.
Nii ei jää uue mudeli juurde eelmise mudeli varjatud seadistused.

| Pere | Mudelivalija | Sisemine algoritm | Kogutud mudelid |
|---|---|---|---:|
| Delay | DELAY_MODEL, PID 6 | DELAY_TYPE, PID 7; 0–7 | 27 |
| Reverb | REVERB_TYPE, PID 0 | REVERB_BASETYPE, PID 45; FW13 vahemik 0–8 | 79 |

Need on eri väljad. Näiteks Stereo Tape on Delay mudel 5, kuid algoritm 1
(Stereo), mitte 6 (Tape). Room: Ambience on Reverb mudel 21, kuid baastüüp 3.
Autoripoliitika nõuab tegeliku kanali mudeli/algoritmi paari vastavust kogutud
mallile; nime järgi algoritmi ei tuletata. Tundmatu või vastuoluline paar annab
kirjutamisel vea. Kanalid A–D kontrollitakse eraldi.

## Tingimused ja lõppjuhend

Delay Spread on nähtav algoritmidel 1, 2, 3, 5, 6 ja 7; Time R ainult Dualil
(3), Speed Tape'il (6), Run Reverse'il (4) ning Rate 3 Sweep'il (5).
Feed LR on Dualil ja Surroundil (7); Surroundi kuvatav nimi on Rotation.
Need on näited; täielikud lehe- ja juhikutingimused on räsiga kinnitatud registris.

Vedrukaja Scattering kasutab Reverb Diffusioni sõna (PID 4), kuid on nähtav
ainult lõpliku Tank Type'i SERIES-PARALLEL (PID 66 = 1) korral. Tank Type jääb
eraldi muudetavaks enum-juhikuks. Päringu järjekord ei loe: Tank Type võib olla
enne või pärast Scatteringut. PARALLEL korral Scatteringu kirjutamine tõrjutakse.
Teisel kanalil tehtud muudatus luba ei anna.

Springi Quality, Pitch Position, Depth ja Spread ei ilmu lõpp-TXT-sse tavaliste
aktiivsete juhikutena. Plate'i Diffusioni nimi on Plate Diffusion, teiste
mittespring-tüüpide oma Wall Diffusion. Lõppseis loetakse genereeritud SYX-ist.
Muutmata peidetud sõnad säilivad; sobimatu selgesõnaline kirjutus annab vea.
Mõlemad tabelikirjutajad kontrollivad kogu plaani enne faili keha muutmist.
[Tempo ja modifikaatorite reeglid](FM3_PARAMETER_DEPENDENCIES.md) kehtivad lisaks.

## Allikad ja tuletuse piirid

`fm3-delay-reverb-applicability.json` seob FM3-Edit 1.07.17 natiivsed
nimi/PID-deskriptorid, aktiivse FW13 XML-i, FW13 cache'i ja olemasolevad
täiskanalimallid. Delay 89 ning Reverb 71 sõnastikukirje sidumine säilib.

- Reverb BASETYPE on cache'is enum (typecode 16), kuigi sildid puuduvad ja vana
  sõnastik nimetab seda lineaarseks. Seda loetakse toorvalijana ning üldkirjutus
  on keelatud; 0–8 ei kodeerita pideva skaalana. Sõnastikku selle etapiga ei muudeta.
- XML-is leiduvad Reverb baastüübid 9/10 jäävad väljapoole FW13 cache'i domeeni
  ja kogutud malle. Neid ei toetata. Domeeni kuulumine üksi ei tõenda mudelipaari.
- Delay PID 88 natiivne sümbol on DRYDIFFUSE, kuid cache'i ja sõnastiku kirje on
  kasutamata. Seda ei nimetata ümber ega lisata kirjutatavate juhikute hulka.
- Reverb TONETYPE PID 67 kohta puudub aktiivne FW13 juhik; üldkirjutus tõrjutakse.
- Sama leheküljenumbri selgesõnaline tüübivariant on ülimuslik tühja või
  tingimuseta varuvariandi suhtes. Juhiku tingimus lõigatakse lehe nähtavusega.
  Delay Sweep/Stacki tingimuseta varuvariandi käsitlus on XML-ist tuletatud
  autoripoliitika, mitte käivitatud natiivse kasutajaliidese vaatlus.
- Spring Tank Type on teisene tingimus. Toetamata dünaamiline XML, ebaselged
  kattuvad lehed ja tundmatud juhikuvalijad peatavad kompileerimise.

Editorit ei käivitata. Binaari, tervet XML-i ega toordekompilatsiooni ei avaldata.
Registri SHA-256 on `5f062f0cca465c8576b8857260af693a03563bb6b8672257e4bda533b4605b21`;
käitusmoodul kontrollib seda enne kasutamist.

## Reprodutseerimine ja kontroll

Repo juurest:

```sh
python3 tools/fm3/delay_reverb_applicability.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-delay-reverb-applicability.py
python3 tools/fm3/delay_reverb_applicability.py
```

Esimene käsk kordab väljavõtet kinnitatud binaarist. Ilma binaarita kontrollib CI
salvestatud lehti, sidumisi, mallide räsi ja FW13 cache'i kooskõla; see ei ole uus
PE-väljavõte. `--write` nõuab kinnitatud editorit.

Kõik 106 kogutud Delay/Reverbi malli läbisid A–D regressiooni: 24 484 lubatud
kirjutust, 5752 sobimatuna tõrjutud kirjutust ja 848 täiskanalimalli nõude kontrolli.
Test kontrollib toorsõnu ja kogu keha muutusi, päringu järjekorda, vale kanali
kasutamist, tundmatut/mittesobivat algoritmi ning lõppjuhendi nähtavust.

Selle etapi seitsme baasi / 21 SYX-katse maatriksis oli 39 869 lubatud kirjutust,
3676 tüübi/algoritmi-, 459 tempo-, 72 modifikaatori- ja 336 täiskanalimalli nõude
tõttu välistatud kandidaati. Väljajätud ei ole läbitud kirjutuskatsed. 688 skalaari
kodeerimispoliitika ning 899 ajaloolist vaatlust / 85 mõõdetud võtit ei muutu.
Järgmine [Flangeri/Phaseri/Compressori etapp](FM3_MODULATION_DYNAMICS_APPLICABILITY.md)
lisab maatriksile nende perede piirangud; kehtivad arvud on repo encoder-matrix.json failis.

Kasutaja füüsilisi toiminguid: **0**. Uusi mõõtmisi, seadmeimporti, heli ega CPU-d
ei testitud. Muu tüübisobivus, kontrollerite dünaamika, üldine routing ja GLOBAL
jäävad edasiseks tööks. Paigaldatud privaatne plugin jääb 0.3.2 peale; see on
0.3.3 lähtekoodi kandidaat PR-is.
