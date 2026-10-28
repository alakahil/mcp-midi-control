# Control Switchi seosed Ampi lülititele — 0.3.30

Sound-spec'i `controlSwitches` seob FM3 Control Switchi 1..6 Ampi lülitiga. Toetatud sihtmärgid on ainult
`amp` plokis: `DISTORT_BOOST` (Input Boost), `DISTORT_BRIGHT` (Bright), `DISTORT_CUT` (Cut), `DISTORT_FAT` (Fat)
ja `DISTORT_SATSWITCH` (Saturation Switch). Kanalid on alati ALL ja Min/Max täisvahemik.

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
kanalipiirang. Neid vorme ei kirjutata, sest nende näitu kontrollib alles katse T7. Kasutaja enda FM3-s loodud
External 1 → Volume seos kasutab samu mallisõnu.

## Mida see ei tee

- Control Switchi tüüp (latching/momentary), algolek ja jalglüliti määrang ei ole seose osa. Need määratakse
  FM3-l Controllers- või FC-menüüs.
- Pööratud või osalist Min/Max-i, kanalipiirangut ega muid allikaid ja sihtmärke ei kirjutata.
- Control Switchi lülitamist ja selle uue faili importi ei ole seadmes kontrollitud.

## Seadmekatsed (28.10.2026)

- **T7 näidud** (`references/fm3-modifier-display-20261028.json`): vaikemalli seos näitab vaikimisi
  Modify lehte: Min OFF, Max ON, Start 0 %, Mid 50 %, End 100 %, Slope 50 %, Scale 1.000, Offset 0 %,
  Damping EXPONENTIAL, Attack ja Release 10,1 ms, Auto-Engage OFF, PC Reset OFF, Update Rate SLOW.
  Source loendi number on salvestatud kood + 1 (51 → „52 Control Switch 2“). Pööratud seos 65534/0
  näitab Min ON ja Max OFF; Max 1707 näitab lülitil OFF. Sõna 17 = 4 näitab CHAN D.
- **T9 STORE ja uuesti laadimine** (`references/fm3-bind-store-20261028.json`): CS2 → Input Boost ja
  CS3 → Bright (kirjed 2 ja 3, Wahi ja Volume'i kõrval) jäid alles. Salvestatud preseti 32
  modifikaatorikirjet klappisid genereeritud failiga sõna-sõnalt.
