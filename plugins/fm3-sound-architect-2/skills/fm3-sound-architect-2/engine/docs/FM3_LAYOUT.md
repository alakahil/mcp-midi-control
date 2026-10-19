# Kahe rea vaba paigutus — 0.75.0, 2026-10-14

Kasutaja nõue: preset on alati kahel real; plokkide järjekorra ja asukoha määrab sound.

    Rida 2: In 1 (v1) → … sound otsustab … → Send (v12)
    Rida 3: Return (v1) → … sound otsustab … → Out 1 (v12)
    Read 1 ja 4 tühjad. Ühes reas kuni 10 plokki.

## Tõendid failistruktuurist

- Ruudustik on keha baitides 260–451: 12 veergu × 4 rida × 4 baiti (`u16 id`, `u16 sisendmask`).
  Rea 2 lahtrite mask on 2 ja rea 3 lahtrite mask 4; veeru 1 lahtrite mask on 0.
- Plokikirjed (4610…) ei sisalda asukohta (päis: eid, stseenikanalid 10–25, bypass 26–41, sõnad 42, kanalid 44).
  Shuntidel (ID ≥ 1024) kirjet pole. Ploki liigutamine muudab seega ainult ruudustikku.
- Shuntide ID-poliitika: shuntiks jääv lahter säilitab oma ID; vabanenud ID-d jaotatakse uutele shuntilahtritele lugemisjärjekorras.
- `scripts/test-layout.mjs`: kirjutaja taastab baidi täpsusega mõlemad kasutaja seadme ekspordid
  (`JB_RHYTHM_LEVEL_MINUS3_NewLook.syx` ja `references/layout-example-20261014.syx`).

## Koostamise järjekord (`scripts/fm3-sound.mjs`)

1. `composer` – olemasolev jb-composer jb-newlook alusel: mallid, lisatud plokid ja stseenid.
   Lisamine on seadmel kinnitatud (NewLook Insert, Filter ja Pitch eksport = genereeritud keha).
2. `layout` – `row2` ja `row3` järjestatud plokinimekirjad; vaikimisi ühtlane jaotus, valikuliselt `columns`.
   Amp peab olema Cab'i ees reas 2. Nimekirjas peavad olema täpselt need plokid, mis presetis on.
3. `blockScenes` (valikuline) – kanal ja bypass igale paigutatud plokile stseeni kaupa.
4. `controls` (valikuline) – tabelikodeerija juhid; nihked leitakse kirjete skaneerimisega, nii et need töötavad ka lisatud plokkides.

Iga samm kontrollib, et muutunud on ainult lubatud baidid, kirjete arv ja süsteemi saba on samad,
ahel on katkematu ning kaadrid, CRC ja footer on korras.

## Seadmekatse

`examples/FM3_LAYOUT_MOVE_TEST.{syx,txt,spec.json,validation.json}`: Comp, Drive ja Phaser enne Ampi,
Chorus reas 3 enne Delay't; lisatud plokid on bypassis. Ruudustiku liigutamine on seadmel OOTEL,
kuni kasutaja eksport on võrreldud. Ploki eemaldamist ei toetata.
