# Volume’i piiratud pedaaliseos — 0.3.17

`volumePedal:true` on sound-spec'i selgesõnaline valik. See nõuab `volumePan:true`, NewLook-alust ja mõõdetud passiivset modifikaatoripiirkonda. Seos on External 1 (14) → Volume/Pan 1 (102) Volume / VOLUME_GAIN (PID 0), Channels ALL (0). See ei ole LEVEL. Ploki tüüp peab olema VOLUME kõigil A–D kanalitel.

```json
{
  "composer": {
    "schemaVersion": 1, "firmware": 13, "baseProfile": "jb-composer",
    "name": "VOLUME PEDAL", "modifiers": {"external1Wah": false}
  },
  "volumePan": true,
  "volumePedal": true,
  "layout": {"row2": ["drive", "amp", "cab"], "row3": ["volpan", "delay", "reverb"]},
  "blockScenes": {"volpan": [
    {"scene": 1, "channel": "A", "bypass": false},
    {"scene": 2, "channel": "A", "bypass": true},
    {"scene": 3, "channel": "A", "bypass": true},
    {"scene": 4, "channel": "A", "bypass": true},
    {"scene": 5, "channel": "A", "bypass": true},
    {"scene": 6, "channel": "A", "bypass": true},
    {"scene": 7, "channel": "A", "bypass": true},
    {"scene": 8, "channel": "A", "bypass": true}
  ]}
```

Seos rakendub enne tabelijuhtide kirjutamist: GAIN-i käsiväärtus tõrjutakse kõigil neljal kanalil. LEVEL, muud toetatud Volume-juhid ja stseeni bypass jäävad eraldi. Muude eksemplaride staatiline GAIN ei muutu selle seose sihtmärgiks. `grid` töötab samuti, kuid Volume/Pan 1 peab lõppfailis alles olema.

## Min/Max (0.3.31)

`volumePedal:{min:2.5, max:7.5}` seab pedaali vahemiku Volume skaalas 0..10 (`true` = 0/10). Modifikaatori
sõnad 1 ja 2 hoiavad sihtparameetri salvestussõna. See dekodeeriti 28.10.2026 katsetes T7/T7b kolmel pideval
sihtmärgil (Rotary Rate, Ampi graafilise EQ riba, Wah Control) sihtkodeekiga
(`references/fm3-modifier-display-20261028.json`). VOLUME_GAIN-i kodeering (0 / 2.5 / 7.5 → 0 / 16384 / 49151)
on 24.10.2026 esipaneeli katsest. Muutuvad ainult sõnad 1 ja 2, pööratud vahemik (min > max) on lubatud.
Volume'i muud kui 0/10 vahemikku ei ole seadmes kontrollitud. Kõverat (Mid, Slope, Scale) ei kirjutata.

## Tõend

[Masinloetav tõend](../skills/instructions/references/fm3-volume-binding-evidence.json) sisaldab lähte-speci, lähte- ja ekspordifaili räsisid, 25 sõna, kogu keha ja modifikaatoripiirkonna räsisid. Toor-SYX on kasutaja algne tagastatud fail; seda ei ole selles lähtekoodimuudatuses avalikku reposse kopeeritud. Tõend sisaldab ainult vajalikku tuletatud kirjet ja kontrollandmeid.

23.10.2026 üks füüsiline eksport, SHA-256 `1eb2fe164824a4caffac6b101c3d16be912c64344f08f68ad2e5ae6483035493`, taaskasutas esimest mitteaktiivset kirjet (wire effect 3, body 1584). Muutusid sõnad 0, 8, 9, 10 ja 15. Kõik ülejäänud keha baidid säilisid. Kõik 32 kirjepäist, kaadrikontrollsummad, CRC ja footer läbisid. Transportpäis säilis; raw-päises muutusid tihenduspikkuse baidid 4 ja 5.

Kirjutaja kopeerib täpse 25-sõnalise kirje. See **ei arvuta** uusi Min/Max-, kõvera- või ajaväärtusi ega kasuta Wahi skaalat. Sõnad 1/2 on vaikekoodid 0/65534, mitte selles katses klaviatuurilt sisestatud arvude mõõtmised. Samuti ei tõenda toorsõna 15 väärtus 66 eraldi füüsikalist Release-skaalat.

## Kontroll ja piirid

0.3.21 [elutsükli analüüs ja 4. punkti tabel](FM3_POINT4_OFFLINE.md) täpsustavad
loomist, eemaldamist ja algväärtusi. See ei laienda selle piiratud kirjutaja tuge.

0.3.20 [kirjepesade eeltöö](FM3_MODIFIER_AUDIT.md#wah-ja-volume-koos-kirjepesade-eeltöö-0320)
kinnitab, et praegused Wah- ja Volume-kirjutajad kasutavad sama esimest kirjet.
Ülejäänud sidumata kirjete loend ei anna neile veel üldist kirjutusluba.

- Sisendit ei muudeta kohapeal. Enne kirjutamist kontrollitakse kogu 32-kirjelise lähtepiirkonna räsi, sihtplokki ja A–D VOLUME-tüüpi. Ainult esimese kirje 50-baidine sisu võib muutuda. Täpne lõpppiirkond loetakse uuesti lõplikust SYX-ist.
- Avalik `fm3-preset.mjs --verify` kontrollib kõiki 25 sõna, modifikaatoripiirkonda, sihtplokki, TXT/spec/aruande kooskõla. Uuendatud CRC ja artefaktiräsid ei peida lepinguvälist muudatust.
- Generaator taastab seadmeekspordi kogu 12970-baidise keha räsiga `f01f233b8e5195d8ef4e8d3253c85a1ce14649859838eed3c5cf65e760a8eb5e`. Täpselt sama keha ei vaja uut korduseksporti. Uut kodeeritud faili ei ole eraldi tagasi imporditud.
- Kirje 0 passiivse lähteoleku korral. **Wah + Volume (0.3.30):** kui `composer.modifiers.external1Wah:true` on kirjes 0 aktiivne, läheb sama 25-sõnaline Volume-kirje kirjesse 1. Enne kirjutamist peavad kirjed 1..31 võrduma mõõdetud lähteolekuga (räsi kirje 0 väljadeta). Kirjes 1 muutuvad sõnad 0, 8 ja 15. FM3 ise paigutab järgmised seosed järjestikustesse kirjetesse (`references/fm3-control-switch-evidence-20261028.json`, Control Switchi seosed kirjetes 1..7). Mõlemad seosed järgivad External 1 pedaali. 28.10.2026 katses T9 (`references/fm3-bind-store-20261028.json`) jäid mõlemad seosed pärast STORE-i ja uuesti laadimist alles ning pedaal liigutas nii Wahi kui Volume'i. Salvestatud modifikaatorikirjed klappisid sõna-sõnalt. Wahi Scene 1 bypass salvestus sisselülitatuna, sest Auto-Engage lülitas Wahi pedaali liigutamisel sisse.
- Muid allikaid/sihtmärke/kanaleid, vaba kirje üldist jaotamist ega modifikaatori eemaldamist ei lisata. Aktiivset seost ei lülitata vaikimisi välja. Control Switchi seosed: [FM3_CONTROL_SWITCHES.md](FM3_CONTROL_SWITCHES.md).
- Globaalne External 1 määrang, live SET/GET ja heli on eraldi; STORE/reload on kontrollitud 26.10.2026 (vt allpool). See on aktiivse puhvri eksporditõend. `fullRangeEncodingProven=false` jääb kehtima.
- Uut REA/Ghidra analüüsi selles etapis ei tehtud. Varasema Maci analüüsi loomise → ID → Source tee oli katse põhjendus; presetisõnade tõend tuleb nüüd eraldi seadmeekspordist. Wahi kuus mõõdetud Min/Max punkti ja 995 mudelipõhist väärtust välja kohta ning ajaloolised hiirepunktid jäävad muutmata.

## Pedaali käitumine (24.10.2026)

Katse 4a. Kviitung on failis [references/fm3-pedal-check-20261024.json](../skills/instructions/references/fm3-pedal-check-20261024.json),
mida kontrollib `node tools/fm3/pedal-check-ingest.mjs`. Mõõtepaki koostab `tools/fm3/pedal-check-build.mjs`,
mõõteskript on `FM3_PEDAL_CHECK.py`. Mõlemad presetid laaditi ainult redaktsioonipuhvrisse.

- **P1 (`volumePedal:true`)**: FM3-Editis on Volume nupul modifikaatori märk, allikas on External 1 ja nupp
  järgib Valeton mini pedaali kannast varbani.
- **P0 (sama preset ilma seoseta)**: modifikaatorit pole ja Volume jääb 10.00 peale.
- **Masinloetavus**: ploki koondlugemine (`fn=0x1F`) tagastab igas pedaaliasendis salvestatud sõna 65534 (10.00).
  FM3 ei saada pedaali liigutamise ajal ise kaadreid, seega seda väärtust praeguste lugemisteedega skriptiga ei loe.
- **Mõõtmata**: täpsed kanna/varba numbrid, kõver (taper) ja heli.

## Salvestamine ja uuesti laadimine (T2, 26.10.2026)

Kviitung on [references/fm3-pedal-store-20261026.json](../skills/instructions/references/fm3-pedal-store-20261026.json)
(`node tools/fm3/pedal-store-ingest.mjs`; pakk `tools/fm3/pedal-store-build.mjs`, skript `FM3_PEDAL_STORE.py`).
Skript laadis „PEDAL T2 STORE“ redaktsioonipuhvrisse; kasutaja salvestas selle ise asukohta 423 ja laadis uuesti.

- FM3-Edit-is Volume (0..10): kand 0.00, umbes veerand 1.94, pool 5.00, kolmveerand 7.85, varvas 10.00;
  pärast salvestamist ja uuesti laadimist täpselt samad väärtused ja modifikaatori märk alles.
- Salvestatud asukoha lugemine (`fn=0x03`): keha klapib genereeritud failiga sõna sõnalt, välja arvatud sõna 0
  (valitud stseen), mille FM3 salvestab salvestamise hetkel aktiivse stseenina.
- Vahepealsed pedaaliasendid on hinnangulised, seega kõverat (taper) see ei määra. Heli on mõõtmata.
- FM3 esipaneelil avatakse ploki leht ruudustikust EDIT-nupuga. ENTER ja VALUE valivad lahtrisse uue ploki.

## Esipaneeli skaalakontroll (24.10.2026)

Kviitung on `references/fm3-step-diff-input-volume-20261024.json` (`node tools/fm3/step-diff-ingest.mjs`).
Kasutaja muutis FM3 esipaneelil ühe välja korraga. Pärast iga sammu luges `FM3_STEP_DIFF.py` Input 1 ja
Volume/Pan 1 ploki. Iga näit klappis generaatori kodeeringuga sõna-sõnalt:

- Volume 0.00 / 2.50 / 7.50 → sõnad 0 / 16384 / 49151. See on lineaarne 0–10 näiduskaala, mitte dB.
- Level −10 dB ja Balance −67 klappisid samuti.
- Input Threshold −40 dB ja −80 dB ning Output Level +6 dB klappisid.
- Input Threshold miinimum näitab **OFF** ja salvestub sõnana 0, mis vastab −100 dB-le. Generaator
  kirjutab nüüd −100 dB OFF-ina.

## TYPE ja Auto-Swell (24.10.2026)

Kviitung on `references/fm3-step-diff-volume-type-20261024.json`.

- **TYPE**: VOLUME ↔ AUTO-SWELL on üks sõna (`VOLUME_TYPE`, 0 = VOLUME, 1 = AUTO-SWELL). Pärast tagasi
  vahetamist näitas Volume endiselt 10.00, seega teisi sõnu tüübivahetus ei muuda.
- **Auto-Swell väljad**:
  - Threshold −40 dB klappis kodeeringuga sõna-sõnalt.
  - Attack 100 ms ja Hysteresis 6.00 dB olid juba vaikimisi seatud ning nende salvestatud sõnad
    võrduvad nende väärtuste kodeeringuga.
  - Release'iks lasi FM3 valida 19,999 ms (sõna 42623). Generaator loeb selle sõna 19,989 ms-ina ja
    kirjutaks 20 ms sõnana 42631, mis on 0,05 % erinevus. **Parandus (katse 6):** Input Release kasutab sama
    100:1 logaritmilist kõverat. Seal näitas sama sõna 42623 täpselt generaatori väärtust (199,89 ms) ja
    genereeritud 20 ms näitas 20,000. Seega oli 19,999 tõenäoliselt valesti loetud 19,989. Algne märkus: logaritmiline kõver on lähedane, aga selles
    punktis mitte sõna-täpne.
- **Generaator** kirjutab nüüd ka TYPE-i (`VOLUME` / `AUTO-SWELL`, `allow:["enum-labels"]`) ja Auto-Swelli
  väljad Threshold, Attack, Release ja Hysteresis (`fm3-volume-policy.mjs`). Iga välja kontrollitakse kanali
  lõpliku tüübi järgi ja lõplikus tüübis peidetud väli tõrjutakse. `volumePedal` AUTO-SWELL-iga tõrjutakse.

Seadmekontroll (`references/fm3-auto-swell-verify-20261024.json`, `tools/fm3/auto-swell-verify-build.mjs`): generaatori
preset oli kanalil A AUTO-SWELL (Threshold −40 dB, Attack 250 ms, Release 20 ms, Hysteresis 3 dB) ja kanalil B
VOLUME 7.5. Kõik plokid ja ruudustik loeti redaktsioonipuhvrist tagasi täpselt. FM3 näitas Attack'i 249,99 ms-ina ja
Release'i 20,000 ms-ina. Ülejäänud väärtused klappisid täpselt.

## Input Ratio / Attack / Release ja Volume Pan (katse 6, 24.10.2026)

Kviitung on `references/fm3-step-diff-gate-pan-20261024.json`. Kõik 6 näitu võrdusid generaatori dekodeeringuga
FM3 näidu täpsusega:

- Ratio 4,00 ja 10,00;
- Attack 10,03 ms;
- Release 199,89 ms;
- Pan Left −50,0 ja Pan Right 50,0. Pan-i sõnad võrduvad kodeeringuga täpselt.

Attack'i ja Release'i nupp ei jõudnud täpselt küsitud väärtuseni, sest FM3 pakkus naaberastmeid (9,96/10,03 ja
199,89/200,79). Generaator kirjutab siiski täpse küsitud väärtuse.
