# FM3 metaandmete erinevuste audit

Erinevused on liigitatud olemasolevate allikate järgi. Liigitus ei kinnita tundmatu välja tähendust ega lisa kirjutustuge. Uusi seadmetoiminguid: **0**.

| Rühm | Kirjeid |
|---|---:|
| `family-absent-from-table` | 193 |
| `global-address-gap` | 88 |
| `global-slot-without-name` | 942 |
| `high-id-editor-control` | 42 |
| `midi-row-action` | 8 |
| `midi-slot-without-scalar-definition` | 252 |
| `named-dictionary-gap` | 4 |
| `unnamed-active-descriptor` | 4 |
| `unnamed-family` | 7 |
| `unnamed-unused-slot` | 15 |

Kokku 1555 ühepoolset pere/PID kirjet. 22 vana Flangeri lisanime jäävad alles ilma parameetrite arvu suurendamata.

## Skaalad ja nimeta väljad

Kataloogi ja sõnastiku vahel on 36 erineva vahemikuga rida (36 parameetrit). Kataloogi kuvasemantika sisaldab ka teiste allikate ülekatteid; ükski erinevus ei anna automaatselt alust väärtuse muutmiseks.

Repo FM3-spetsiifilise `FM3_RANGES` allika 40 vahemiku võrdluses on lahendamata vastuolusid 0. DynaCab R1/R2 kaks kuvasüsteemi on eristatud FW13 cache’i alusel:

| Parameeter | FM3 kalibreering | Sõnastik |
|---|---|---|
| `CABINET:93` | 0 … 100 | 0.0 … 10.0 |
| `CABINET:94` | 0 … 100 | 0.0 … 10.0 |

Generaatori sisend on FM3-Editi kuvatav 0–10. Varasem 0–100 protsendiesitus teisendub jagamisel kümnega; näiteks 25% vastab 2.5-le, mitte 25-le. Varasemad kalibreerimisväited säilivad algallikas; nende toorvastuseid ei korratud. Vahemälu kuvakordaja 10 ja FM3 enda binaari nimeseosed on taasesitatud: [kuue välja tõendid](six-field-resolution.json).

Nimeta kirjutatavaid kirjeid: 0. CHORUS:29/30/31 on Delay Range, Low ja High/EQ. FUZZ:43 on Oversampling, kuid FM3-Editis välja kommenteeritud ning nüüd kirjutamisel blokeeritud ka experimental/raw režiimis. See ei ole uus seadmemõõtmine.

Valikuloendites on 5 korduva normaliseeritud nimega rühma. Numbrilised indeksid säilivad eraldi; nimega sisestus valib esimese vaste.

## Automaatne testimaatriks

[encoder-matrix.json](encoder-matrix.json) eristab arvutus-, baidi- ja olemasolevate mõõtepunktide kontrollid. Tarkvaratesti läbimine ei suurenda seadmel mõõdetud parameetrite arvu. Täpsed lähteräsid, iga erinevuse kategooria ja allikaindeksid: [metadata-reconciliation.json](metadata-reconciliation.json).
