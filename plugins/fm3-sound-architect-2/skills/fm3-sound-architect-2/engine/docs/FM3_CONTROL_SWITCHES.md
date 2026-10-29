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
- Uue faili importi ei kinnita varasemad katsed. Lülitamine on kinnitatud T14/T14b ulatuses (vt allpool).

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
- Mõlemad nõuavad, et sama Control Switch oleks `controlSwitches`-is seotud.
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
Selle uue faili importi pole eraldi kontrollitud.
