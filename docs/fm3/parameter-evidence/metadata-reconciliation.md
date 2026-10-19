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
| `unnamed-active-descriptor` | 8 |
| `unnamed-family` | 7 |
| `unnamed-unused-slot` | 15 |

Kokku 1555 ühepoolset pere/PID kirjet. 22 vana Flangeri lisanime jäävad alles ilma parameetrite arvu suurendamata.

## Skaalad ja nimeta väljad

Kataloogi ja sõnastiku vahel on 36 erineva vahemikuga rida (36 parameetrit). Kataloogi kuvasemantika sisaldab ka teiste allikate ülekatteid; ükski erinevus ei anna automaatselt alust väärtuse muutmiseks.

Repo FM3-spetsiifilise `FM3_RANGES` allika 40 vahemikust erinevad sõnastikuga 2:

| Parameeter | FM3 kalibreering | Sõnastik |
|---|---|---|
| `CABINET:93` | 0 … 100 | 0.0 … 10.0 |
| `CABINET:94` | 0 … 100 | 0.0 … 10.0 |

Need on lahendamata allikavastuolud. Enne generaatori skaala muutmist tuleb siduda vastava firmware’i juht, ühik ja algne kalibreering või redaktori cache. Selle auditi käigus ajaloolisi kalibreerimise toorvastuseid uuesti ei kontrollitud.

Tabelikirjutaja lubab tehniliselt ka nimeta kirjeid: `CHORUS:29`, `CHORUS:30`, `CHORUS:31`, `FUZZ:43`. Nende tähendus vajab eraldi kontrolli; arvutus- ja baiditest ei anna neile nime ega seadmekinnitust.

Valikuloendites on 5 korduva normaliseeritud nimega rühma. Numbrilised indeksid säilivad eraldi; nimega sisestus valib esimese vaste.

## Automaatne testimaatriks

[encoder-matrix.json](encoder-matrix.json) eristab arvutus-, baidi- ja olemasolevate mõõtepunktide kontrollid. Tarkvaratesti läbimine ei suurenda seadmel mõõdetud parameetrite arvu. Täpsed lähteräsid, iga erinevuse kategooria ja allikaindeksid: [metadata-reconciliation.json](metadata-reconciliation.json).
