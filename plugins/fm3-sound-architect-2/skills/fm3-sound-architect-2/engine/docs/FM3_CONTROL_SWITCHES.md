# Control Switchi seosed Ampi lülititele — 0.3.30

Sound-spec'i `controlSwitches` seob FM3 Control Switchi 1..6 Ampi lülitiga. Toetatud sihtmärgid on ainult
`amp` plokis: `DISTORT_BOOST` (Input Boost), `DISTORT_BRIGHT` (Bright), `DISTORT_CUT` (Cut), `DISTORT_FAT` (Fat)
ja `DISTORT_SATSWITCH` (Saturation Switch). Vaikimisi on kanalid ALL ja Min/Max OFF/ON;
`invert` ja `channel` lisavalikud on kirjeldatud allpool.

```json
{
  "composer": {"schemaVersion": 1, "firmware": 13, "baseProfile": "jb-composer", "name": "AMP SWITCHES",
               "modifiers": {"external1Wah": false}},
  "layout": {"row2": ["drive", "amp", "cab"], "row3": ["delay", "reverb"]},
  "controlSwitches": [
    {"switch": 2, "block": "amp", "param": "DISTORT_BOOST"},
    {"switch": 3, "block": "amp", "param": "DISTORT_BRIGHT"}
  ]
}
```

## Lisavalikud (0.3.32)

- `invert:true` kirjutab Min 65534 ja Max 0. FM3 näitab Min ON ja Max OFF (T7), nii et lüliti vajutamine lülitab
  sihtmärgi välja. Tonepackis on sellist pööratud seost 164 korral.
- `channel:"A"|"B"|"C"|"D"` kirjutab sõnasse 17 väärtuse 1..4 (vaikimisi ALL = 0). T7-s näitas FM3 väärtusele 4 CHAN D.
  Teiste kanalite staatiline `controls` kirjutus samale lülitile on lubatud; seotud kanali oma tõrjutakse.

## Kirje ja paigutus

- Kirjutaja kasutab FM3 enda vaikemalli: `[allikas, 0, 65534, 0, 32767, 65534, 32767, 66, 58, PID, 0, 0, 0,
  32767, 32767, 66, 0, 0, 0, 0, 0, 65534, 65534, 0, 0]` (Control Switch n = allikas 49+n).
- Seosed lähevad järjestikustesse kirjetesse alates kirjest 1, sest kirje 0 on Wahi kirje. Kui Volume-seos on
  Wahi kõrval kirjes 1, algavad Control Switchid kirjest 2. Kirjutada tohib ainult kirjeid, mis on veel aluse
  olekus. Kirje 1 puhul on see passiivne vaikekirje, teiste puhul kasutamata kirje. Muutuda võivad ainult
  valitud kirjete sõnad 0..20.
- Sama sihtmärgi kahekordne seos, juba aktiivne modifikaator ja sama parameetri staatiline `controls` kirjutus
  tõrjutakse.
- `--verify` kontrollib lõppfailist iga seose 25 sõna, allikat, kirjet, aktiivsete kirjete loendit (Wah,
  Volume ja Control Switchid), etapiaruannet ja TXT-d.

## Tõend

`references/fm3-control-switch-evidence-20261028.json` on koondkviitung. Selles on ainult struktuur ja arvud:
presetifaile ja -nimesid ei ole. Kasutaja FW13 tonepackis on 384 presetti. Neist 328-s on Control Switch → Amp
seosed, kokku 1610 kirjet. 1401 kirjet on täpselt see mall. Ülejäänutel on pööratud või osaline Min/Max või
kanalipiirang. T7 kinnitas pööratud Min/Max-i ja kanalinäidu; nende kirjutus on alates 0.3.32-st toetatud.
Osalist Min/Max-i see liides ei paku. Kasutaja enda FM3-s loodud
External 1 → Volume seos kasutab samu mallisõnu.

## Mida see ei tee

- Control Switchi olek stseeni kaupa ja jalglüliti määrang ei ole seose osa, vaid eraldi väljad
  `controlSwitchScenes` ja `footswitches` (0.3.35, vt allpool „Stseeniolek ja jalglüliti“).
- Osalist Min/Max-i ega muid allikaid ja sihtmärke ei kirjutata; pööratud täisvahemik ja kanalipiirang on toetatud.
- Uue faili importi ei kinnita varasemad katsed. Lülitamine on kinnitatud T14/T14b ja P2 ulatuses (vt allpool).

## Seadmekatsed (28.10.2026)

- **T7 näidud** (`references/fm3-modifier-display-20261028.json`): vaikemalli seos näitab vaikimisi
  Modify lehte: Min OFF, Max ON, Start 0 %, Mid 50 %, End 100 %, Slope 50 %, Scale 1.000, Offset 0 %,
  Damping EXPONENTIAL, Attack ja Release 10,1 ms, Auto-Engage OFF, PC Reset OFF, Update Rate SLOW.
  Source loendi number on salvestatud kood + 1 (51 → „52 Control Switch 2“). Pööratud seos 65534/0
  näitab Min ON ja Max OFF; Max 1707 näitab lülitil OFF. Sõna 17 = 4 näitab CHAN D.
- **T9 STORE ja uuesti laadimine** (`references/fm3-bind-store-20261028.json`): CS2 → Input Boost ja
  CS3 → Bright (kirjed 2 ja 3, Wahi ja Volume'i kõrval) jäid alles. Salvestatud preseti 32
  modifikaatorikirjet klappisid genereeritud failiga sõna-sõnalt.

## Stseeniolek ja jalglüliti (0.3.35)

FM3 hoiab mõlemat **presetis** (FC PER-PRESET menüü), mitte üldseadetes. Kodeering on `scripts/fm3-cs-preset.mjs`.

- `controlSwitchScenes: [{switch: 1..6, scene: 1..8, state: "ON" | "OFF" | "LAST"}]` – Control Switchi olek stseeni
  valimisel (FC PER-PRESET → CS Per Scene). Loetlemata olekud jäävad OFF-iks. LAST jätab eelmise stseeni oleku.
- `footswitches: [{layout: 1..9, switch: 1..12, function: "latching" | "momentary", controlSwitch: 1..6}]` – kuni 24
  preseti-põhist lülitidefinitsiooni (Per-Preset FC, PP#1… loendi järjekorras) ja nende asendused (Overrides). Asendussõna on
  12 × (layout − 1) + (lüliti − 1) (0.3.36: T15 asukohad Overrides lehel, T16 FM3 enda salvestatud asendused). FM3 esipaneeli
  lülitid on layout'i lülitid 1–3. Asendus kehtib ainult siis, kui FM3 on selles layout'is.
- Control Switchi kirjed nõuavad, et sama Control Switch oleks `controlSwitches`-is seotud.
- 0.3.66: `footswitches` kirje võib olla ka `{layout, switch, effect: "drive1" | "delay1" | "reverb1"}` (Effect, Bypass)
  või `{layout, switch, scene: 1..8}` (Scene, Select). Plokk peab presetis olema. Sõnad: kategooria 4 = Effect,
  3 = Scene; funktsioon 0; Effect param = FM3 efekti indeks (Drive 1 = 9, Delay 1 = 7, Reverb 1 = 51), Scene param =
  stseeni number. Loendussõna (count) loeb ainult Control Switchi definitsioone. Tõend: H5/T44 11.11.2026, FM3-Editis
  tehtud määrangud salvestati ja loeti sõna-sõnalt tagasi (`references/fm3-h5-t43-20261111.json`). Värv ja Mini-Display
  silt ei salvestu.
- 0.3.71 (T48A–F 13.11.2026, `references/fm3-t48-20261113.json`): ülejäänud 17 plokki (Cab 1, Phaser 1, Wah 1, Filter 1,
  GEQ 1, PEQ 1, Enhance 1, Vol/Pan 1, Gate 1, MultDly 1, Megatap 1, Ten-Tap 1, Plex 1, RingMod 1, Reso 1, MultCmp 1, Looper)
  näitusid FM3 ekraanil õigesti, salvestusid baiditäpselt ja lülitusid FM3 jalglülititel enne ja pärast STORE-i. FM3-Edit FW13
  näitab PP#1 kaardil indeksite 11/17/37/38/48 puhul valesti "Amp 1" (kuvaviga). Hold: FM3-Editis määratud PP#1 Hold Scene
  Select Scene 2 salvestus Tap paigutusest 432 baiti eespool (kategooria 3052−432−2k, param 3052−144−432−12k lõpust); pikk
  vajutus valis stseeni 2. Generaator Holdi ei kirjuta.
- 0.3.68 (T47A–C 12.11.2026, `references/fm3-t47-20261112.json`): generaatori kirjutatud Effect Bypass Comp 1, Chorus 1,
  TremPan 1, Pitch 1, Flanger 1, Synth 1, Rotary 1 ja Reverb 1 näitusid FM3-Editis õigesti, salvestusid baiditäpselt ja lülitusid FM3
  jalglülititel enne ja pärast STORE-i.
- 0.3.67 (T45/T46 12.11.2026, `references/fm3-h6-t45-20261112.json`): generaatori kirjutatud Drive 1 / Delay 1 / Scene 3
  lülitid imporditi, FM3-Edit näitas neid õigesti, FM3 jalglülitid 1–3 lülitasid Drive'i ja Delay sisse/välja ning valisid
  stseeni 3 enne ja pärast STORE-i; salvestatud keha oli baiditäpne. T46 näitas FM3-Editis indeksite 0..71 nimed:
  indeks on FM3-Editi plokinimekirja järjekord koos aukudega (puuduvaid plokke näitab FM3-Edit eelmise nimega,
  alates 63 on väli tühi). `effect` võib nüüd olla 27 ploki esimene eksemplar + `resonator2` (`cab1`, `chorus1`,
  `compressor1`, `delay1`, `drive1`, `enhancer1`, `filter1`, `flanger1`, `gate1`, `geq1`, `looper1`, `megatap1`,
  `multiband1`, `multidelay1`, `peq1`, `phaser1`, `pitch1`, `plex1`, `resonator1`, `resonator2`, `reverb1`, `ringmod1`,
  `rotary1`, `synth1`, `tentap1`, `tremolo1`, `volpan1`, `wah1`). Jalglülitil kinnitatud: Drive 1, Delay 1 (T45) ning 0.3.68-st Comp 1, Chorus 1, TremPan 1, Pitch 1,
  Flanger 1, Synth 1, Rotary 1, Reverb 1 (T47, 12.11.2026: FM3-Editi kuva, baiditäpne STORE, lülitid enne ja pärast STORE-i) ja
  0.3.71-st ülejäänud 17 plokki (T48, 13.11.2026). Kontrollimata on ainult `resonator2`. Välja jäetud: Amp 1 (indeks 0 = ka FM3-Editi vaikekuva), Formant (23 ja 24 näitasid mõlemad
  Formant 1), teised eksemplarid (efekti ID mõõtmata), In/Out/FB Rtn.
- `state` ja `function` peavad olema stringid. 0.3.37 tõrjub ka üheelemendilised ja pesastatud massiivid;
  vigase tüübi tõrjumine kehtib generaatoris ning `--verify` kontrollis.

Näide: Boost CS 2 peal, Scene 2-s sees, jalglüliti 1 lülitab:
```json
{"controlSwitches":[{"switch":2,"block":"amp","param":"DISTORT_BOOST"}],
 "controlSwitchScenes":[{"switch":2,"scene":2,"state":"ON"}],
 "footswitches":[{"layout":1,"switch":1,"function":"latching","controlSwitch":2}]}
```

Tõend (29.10.2026): katsetes T14 ja T14B muudeti iga välja FM3-l ükshaaval, salvestati ja loeti sõna-sõnalt tagasi
(`references/fm3-cs-steps-20261029.json`, `references/fm3-cs-steps-b-20261029.json`). Generaatori tulemus võrdub FM3 enda
salvestatud kehaga sõna-sõnalt (`tools/fm3/test-cs-preset-replay.mjs`, 5 juhtumit, sh T16 kolme lülitiga). T16 näitas, et iga
definitsiooni parameetrid on 6 sõna (12 baiti) ja definitsioonide loendur on asenduste järel (`references/fm3-pp-steps-20261029.json`). Seadmel: Latching lülitab vajutusega
sisse/välja ja LED järgib; Momentary on sees ainult hoidmise ajal; CS Per Scene rakendub stseeni valikul; tavaline,
pööratud ja CHAN D seos käituvad nii, nagu kirjas. Kui per-preset override on FM3 üldseadetes keelatud, asendus ei rakendu.
Iga uue väljundfaili import vajab oma kinnitust; allpool kirjeldatud P2 on eraldi katsetatud.


## P2: genereeritud kolme lüliti koondkatse (30.10.2026, lisatud 0.3.38)

Tõend: `references/p2-three-switches-20261030/receipt.json`, algne 0.3.37
nelja faili komplekt ja kasutaja STORE/reload-järgne eksport samas kaustas.

| Layout 1 lüliti | Määrang | Kinnitatud käitumine |
| --- | --- | --- |
| 1 / PP#1 | CS2 Latching → Boost ALL | Vajutus ON, järgmine OFF |
| 2 / PP#2 | CS3 Momentary → Bright ALL, invert | Hoides OFF, vabastades ON |
| 3 / PP#3 | CS4 Latching → Fat D | Mõjutab D kanalit; Amp A Fat jääb OFF |

Scene 2 ON ning Scene 3 LAST säilitasid CS2/CS4 käsitsi valitud OFF- ja ON-oleku.
Kasutaja kinnitas STORE → muu preset → tagasi ning avanemise Scene 4-s.
Ekspordi 12804 kehabaidist erineb genereeritust ainult valitud stseen (0 → 3).
Kõik modifikaatorid, definitsioonid, 108 asendust ja 48 stseeniolekut säilisid.
Füüsiline toiming põhineb kasutaja kinnitusel; fail kinnitab salvestatud sisu.
Firmware 13 on senine lähtealus, seda ei küsitud selles katses uuesti.
Katses ei mõõdetud heli, CPU-d, teisi layout'e ega kõiki 24 definitsiooni.
