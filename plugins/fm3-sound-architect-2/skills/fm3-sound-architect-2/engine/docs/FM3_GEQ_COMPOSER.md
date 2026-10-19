# Graphic EQ koostajatugi — 0.67.1 / jb-composer-0.11.1

Kasutaja 2026-10-10 täiskogumine on lõpetatud. Muutmata koguja `resume()`
kontrollis 184/184 sammu. Kõigis 184 paaris kattuvad 80/80 GET/SYX sõna;
8 ebaõnnestunud katset säilivad ja on tõenditest välistatud. Ära küsi kogumist,
algGET-i ega GEQ baseline'i uuesti.

Algandmed: `skills/instructions/references/geq-full-20261010-194115/`.
Register: `skills/instructions/references/geq-full.json`.
Audit: `FM3_GEQ_FULL_AUDIT.json`; generaatorikatse: `FM3_GEQ_COMPOSER_VALIDATION.json`.

## Lubatud kasutus

Ühine `fm3-generate.mjs`, profiil `jb-composer`, firmware 13, NewLook-alus.
Uus `geqChannels` lisab Graphic EQ1 reale 2 / veergu 11, PEQ järel ja Send'i
ette. Vanad plokid, tasemed ning kahe rea Send/Return ahel säilivad.
Uus plokk on algul kõigis stseenides A/bypass; aktiveerimiseks määra `scenes`
või `addedBlockScenes.geq`, kasutades selgesõnaliselt koostatud kanalit.

```json
{
  "geqChannels": [{
    "channel": "B",
    "type": "5 Band Mark",
    "bands": [{"band": 3, "gainDb": 1.5}],
    "masterQ": 1.4,
    "levelDb": -0.5,
    "balance": 0,
    "bypassMode": "Thru",
    "sceneIgnore": false
  }],
  "scenes": [{"scene": 3, "blocks": {"geq": {"channel": "B", "bypass": false}}}]
}
```

18 Type valikut ja ribade järjekord on registris. Ribad on vasakult paremale,
number alates 1; sagedus sõltub tüübist ja pole kirjutatav parameeter.
Gain −12…+12 dB, Master Q 0.1…10 (log), Level −80…+20 dB,
Balance −100…+100, Bypass Mode Thru/Mute, Scene Ignore boolean.
Master Q nähtavus ja neli punkti on kasutaja kinnitatud kõigil 18 tüübil.
557 arvulist ning 4 enum/lülitipunkti vastavad kodeerimisele täpselt.
Type muutusel selles sessioonis kaasmuutusi ei esinenud.

Iga valik algab selle tüübi täielikust paariskinnitatud 20-sõnalisest
A-kanalimallist; küsitud väärtused lisatakse sellele. Need on kogutud
neutraalsed mallid, mitte väide tehasevaikeväärtuste kohta. B/C/D kirjutamise
aluseks on täielikud 20-sõnalised koopiad ning eraldi Gain/stseenivaliku
katsed. Kõiki parameetreid ei mõõdetud igas kanalis eraldi.
PID10/14/17/18 ning nähtamatute ribade sõnad säilivad mallist.
Zero All ei ole toore käsuna toetatud; nullimiseks kirjuta nähtavate ribade
Gain 0. Modifierite ja suvalise routing'u tuge ei lisandu.

Mõõdetud punkt, skaalast tuletatud vaheväärtus ja uue koosluse seadmekinnitus
on eri tasemed. Scene Ignore'i sõna salvestumine on kinnitatud kanalil A;
kõik selle ja bypass'i helilised/stseenikäitumise kombinatsioonid pole uuritud.

## Pildilt kinnitatud silt — 2026-10-11

7 Band Constant Q esimene silt on nüüd pildilt **100 Hz kinnitatud**.
Algandmete `python3 100` säilib ajaloolise sisestusapsuna. Aktiivses
võimalusteregistris rakendatakse eraldi pilditõendit, toorest kogumisregistrit
ümber ei kirjutata. Pilt ja kasutajateade: `references/geq-feedback-20261011/`.
Sildi jaoks uut GET-i, pilti ega vastust ei küsita.

## Lõpetatud ühine seadmering — 2026-10-11

`examples/FM3_GEQ_ABCD_TEST.syx` koos `.txt`, `.spec.json`,
`.validation.json` ja `FM3_GEQ_ABCD_CHECK.txt` failidega.
Üks kasutajale antav `FM3_GEQ_ABCD_TEST.zip`.

Scene2=A (10 Band Variable Q), Scene3=B (5 Band Mark),
Scene4=C (7 Band Constant Q), Scene6=D (3 Band Console) aktiivsed;
muudes stseenides GEQ bypass. Kõik senise PEQ katse 13 456 kehabaidi
taastuvad GEQ eemaldamisel täpselt. Senist PEQ kontrolli ei korrata.
Kasutaja tagasieksport kattub kõigi **13 662 kehabaidi** ulatuses täpselt.
Nimi, Scene2, päised, kaadriprefiksid, pikkused ja täide säilivad; erinevad
ainult CRC ning tihendatud esitus. Seadmeringi raport:
`FM3_GEQ_ABCD_HARDWARE_ROUNDTRIP.json`.

Kasutaja kinnitas „CPU oli kõige suurem 50%, GEQ toimis”. Pildi hetkenäit
49.4%; see kinnitus puudutab katsetatud kooslust. Pilt kinnitab Scene4 / GEQ C
seitset Gain-väärtust, Q0.80, Balance0, Thru ja ribasildid100…6400 Hz.
Leveli pildinäit−0.7 dB on ühe komakohaga kuva: muutmata sõna dekodeerub
−0.7495346 dB-ks, mis vastab küsitud−0.75 dB-le. Viga puudub.
Teiste kanalite kõigi vaheväärtuste eraldi ekraanipilte pole antud.

`matchGeqDeviceBody` kinnitab ainult täpse kogu keha; uus nimi pole eraldi
imporditud fail ja uus kooslus ei saa automaatselt seadmekinnitust.
Ära nõua sama katse kordusimporti, eksporti, GET-i, CPU-d ega sildi kinnitust.
Järgmine kokkulepitud arendusetapp on **Enhancer**.
