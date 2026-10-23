# FM3 modifikaatorite koondkatse 0.1.0

**Üks käivitamine, 44 automaatset muudatust ja kuni üks käsitsi eksport.**
See on FW13.00 uurimiskatse. Skripti on kontrollitud failide, sünteetiliste
vastuste ja kohaliku virtuaalse jadapordiga; seda uut koondkatset pole veel FM3-l
läbi viidud. Tootmisplugin jääb versioonile 0.3.13.

## Käivitamine Macis

1. Paki **kogu ZIP** lahti. Jäta failid samasse `FM3_MOD_HW_BATCH` kausta.
   Vajalikud on Python 3.9+ ja Node 18+; sinu varem kinnitatud versioonid sobivad.
2. Säilita oma pooleliolev preset. Ava ühendatud FM3-Editis kaasasolev
   **`BASELINE.syx` edit bufferisse**. See on varasem Min 2.50 eksport muutmata
   baitidega, mitte uus genereeritud preset. Ära kirjuta sellega oma salvestatud
   presetikohta üle. Vali **Scene 2 „Rhythm Fat”, Wah 1 kanal A, bypass sees**.
   Source peab olema External 1. Modifikaatori Channel jääb **ALL**.
3. Sulge FM3-Edit, Fractal-Bot ja teised FM3 pordi kasutajad. Katse ajal ära
   liiguta pedaali ega muuda seadet. Selleks mõõtmiseks pole heli vaja.
4. Käivita `FM3_MOD_HW_BATCH.command`. Skript küsib FW versiooni ja ühe
   käivituskinnituse; ühe USB-modem-pordi korral leiab selle ise. Seejärel
   kogub ta kõik vahetulemused automaatselt. Planeeri ligikaudu 1–3 minutit.
5. Kui skript palub lõppeksporti, on port juba suletud. Ava FM3-Edit, lase
   editoril lugeda **seadme praegune edit buffer**, ära impordi lähtefaili uuesti
   ega vaheta presetti. Ekspordi kogu preset nimega
   **`FM3_MOD_HW_FINAL_export.syx`**, lohista fail Terminali viibale ja Enter.
   Skript võrdleb eksporti viimase raw-lugemise ja kogu lähtepreseti kehaga.
6. Lisa vestlusse skripti väljastatud **`FM3_MOD_HW_RESULTS_….zip`**.
   ZIP sisaldab TX/RX-bitte, kõiki vahetulemusi, katseplaani ja lõppeksporti.

Kui topeltklõps ei käivita faili, ava Terminal, kirjuta `bash `, lohista
**tegelik `.command` fail** Terminali ja Enter. Kindlat Downloads-kausta rada
ei eeldata. Kui macOS kuvab turvateate, kasuta faili Finderi „Open” toimingut;
skript ei muuda arvuti turvaseadeid.

## Alg- ja sihtseis: midagi pole vaja käsitsi ümber keerata

Kõik read puudutavad **Wah 1 → Control → olemasolevat modifikaatorit 0**,
Wahi kanalit **A**, modifikaatori kanaliseost **ALL** ja allikat **External 1**.
Juhtme-SET läheb MOD objektile **3**, mitte Wah objektile 94. Teisi
modifikaatoreid, kanaleid ega plokitüüpe skript ei vali.

„Siht” tähendab ette antud arvulist sisendit. Ekraani ümardatud teksti pole
ette kinnitatud. Piirpunktide vahel on automaatsed null-lähtestused, et järgmine tulemus
ei saaks olla lihtsalt eelmise sõna säilimine. Täpsed float32-bitid ja iga vahepunkt on `plan.json` failis.

| Väli (MOD PID) | Algseis / raw | Automaatne katse | Lõppsiht | Ekspordifail |
|---|---|---|---|---|
| Min (1) | 2.50 / **16375** | Op82: 0; 2.50; 5.00; 7.50; kolm 6.47 naabersisendit; väike piirpunkt; 10. Op9: 5.00; 6.47; 2.50. Max-sarja eel Min=0. | 2.50, täpse .25 sisendi kandidaatsõna **16384** | `FM3_MOD_HW_FINAL_export.syx` |
| Max (2) | 10.00 / **65534** | Sama üheksa op82-punkti; op9: 5.00; 6.47; 7.50. | 7.50, täpse .75 sisendi kandidaatsõna **49151** | sama fail |
| Start (3) | 0% / 0 | Kolm op82 piirpunkti umbes 64.70%; siis op9 sisend .0647. | 6.47% | sama fail |
| Mid (4) | 50% / 32767 | Op9 sisend .3333. | 33.33% | sama fail |
| End (5) | 100% / 65534 | Op9 sisend .8765. | 87.65% | sama fail |
| Slope (6) | 50% / 32767 | Op9 sisend .5235. | 52.35% | sama fail |
| Attack (7) | varasema plaani järgi 10.1 ms / **66** | Op9 sisend .1234 sekundit. | 123.4 ms | sama fail |
| Release (15) | 0 ms / 0 | Op9 sisend .6789 sekundit. | 678.9 ms | sama fail |
| Scale (13) | 1.00 / 32767 | Op9 sisend 1.23. | 1.23 | sama fail |
| Offset (14) | 0% / 32767 | Op9 sisend −.123. | −12.3% | sama fail |
| Off Value (12) | 5% / 0 | Op9 sisend .372. | 37.2% | sama fail |

Attacki ajalooline kuvanäit ei ole selle katse algseisu kontrolli alus: kontroll
kasutab kõiki **25 raw-sõna**, sh Attack=66. Auto Engage=OFF, PC Reset=OFF,
Update Rate=SLOW, Damping=LINEAR ja ülejäänud väljad säilivad.

## Mida see katse lahendab

Varasemad hiirega valitud Min/Max näidud 2.50 / 7.50 / 5.00 andsid raw
16375 / 49159 / 32784. Need ei määra saadetud float32-bitte. Siin on sisend
enne saatmist määratud ja logitud; raw saadakse eraldi GET-käsuga.

| Op82 sisendbitid | 32-nearest mudel | Ülejäänud kolm praegust mudelit |
|---|---:|---:|
| `0x3f25a1ca` (6.47 alumine float-naaber) | 42400 | 42400 |
| `0x3f25a1cb` (6.47 kandidaat) | **42401** | **42400** |
| `0x3f25a1cc` (6.47 ülemine float-naaber) | 42401 | 42401 |
| `0x37000100` (väike piirpunkt) | **1** | **0** |

See eristab nendes punktides 32-nearest mudelit teistest. See ei erista
tingimata ülejäänud kolme omavahel ega tõenda kogu programmi MODE1 olekut.
Min/Max kontrollpunktide osaline kordus on põhjendatud: täpse sisendi ja
kahe erineva operatsiooni kontroll on uus teadmine, mida vanades eksportides pole.
Op9 sisendid saadetakse otse firmware’ile. See ei läbi editori klaviatuuriparserit
ega selle kordajaga jagamist; nende ümardamine jääb eraldi küsimuseks.
Üheksa muud op9-punkti on uued; vanu 18 tavaparameetri mõõtmist ei korrata.

## Peatumine ja jätkamine ilma korduskatseta

Esimese SET-i eel peavad MOD 25 sõna ning Wah A–D kokku 100 sõna kattuma
lähtefailiga; MOD-i lugemine peab ka kordamisel püsima. Iga SET-i järel peab
kaks uut GET-lugemist andma sama tulemuse ning kõik teised MOD-väljad säilima.
SET-i kajavastust ei loeta raw-tõendiks. Muutuseta sammu ei loeta tõendiks,
et SET tegelikult täideti. Tundmatu vastus, kontrollsumma viga, timeout,
osaline kirjutus või kõrvalmuudatus peatab katse; kirjutust ei korrata.

**PEATATUD korral saada olemasolev ZIP ja ära käivita kogu katset uuesti.**
Ka null-SET preflight'i logi aitab lahendada täpse transporditakistuse.
Katkenud SET-i järel võib edit buffer olla osaliselt muudetud. Skript ei saada
pimedat taastuskirjutust. Pärast tõendite kogumist saad lähtefaili uuesti
importida või valida oma varasema salvestatud preseti; STORE-käsku ei saadeta.

Kui ainult lõppeksport jäi lisamata, saab jätkata seadmesse kirjutamata:

```sh
python3 FM3_MOD_HW_BATCH.py --finish /täpne/tee/FM3_MOD_HW_RESULTS_...
```

Kui Terminal suleti ootamatult, on iga sammu ja iga TX/RX logi juba kaustas.
Selle pakkimiseks ilma seadmega ühendust võtmata:

```sh
python3 FM3_MOD_HW_BATCH.py --pack-only /täpne/tee/FM3_MOD_HW_RESULTS_...
```

## Tõendi piirid

- FW13.00 küsitakse kasutajalt; firmware versiooni automaatset tuvastust ei väideta.
- Uus MOD0 GET/SET seanss vajab esimest päris riistvarakinnitust. Enne kirjutamist
  kontrollitakse selle tegelikku raw-lugemist lähtefailiga; puuduliku vastusega
  katse edasi ei lähe. Täieliku preseti algseisu ei loeta jadapordist automaatselt.
- Lõppeksport kontrollib kogu preseti keha, kõiki muutmata sõnu, CRC-d ja kaadreid.
  Transpordipäise võimalik kohanumber raporteeritakse eraldi.
- Lõppeksport kontrollib edit bufferi serialiseerimist; STORE, uuesti laadimise
  ja voolukatkestuse järel püsimist see ring ei testi.
- Teised dünaamilised Min/Max sihttüübid, kogu op9 RECIPS-vahemik ja täielik
  MODE1/interrupt proof jäävad avatuks. Katse ei lisa generaatori kirjutustuge.
- Uut REA dekompileerimist siin ei tehtud. Kasutatakse varasema REA analüüsi
  tulemusi ning uut piiratud staatilist FW13 transpordikontrolli.
