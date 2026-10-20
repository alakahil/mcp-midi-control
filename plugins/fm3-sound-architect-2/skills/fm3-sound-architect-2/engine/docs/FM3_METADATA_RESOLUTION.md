# Kuue välja lahendus — FM3 FW13 / FM3-Edit 1.07.17

0.3.3 kandidaat kasutab kolme seni nimeta Choruse juhiku sümbolnime.
DynaCab Positioni sisend on FM3-Editi skaala 0–10. Drive Oversampling on
tuvastatud, kuid kirjutamisel blokeeritud. Uusi seadmemõõtmisi ei tehtud.

| Pere/PID | Sümbol | Kuva / vahemik | Kasutamine |
|---|---|---|---|
| CABINET:93 | CABINET_DYNACAB_R1 | Position, 0–10 | Kuvaühik, mitte protsent |
| CABINET:94 | CABINET_DYNACAB_R2 | Position, 0–10 | Kuvaühik, mitte protsent |
| CHORUS:29 | CHORUS_DELAYRANGE | Delay Range, ligikaudu 1–40 ms | FW13 Expert-leht |
| CHORUS:30 | CHORUS_BASS | Low, 0–10 | Allpool loetletud tüüpide korral |
| CHORUS:31 | CHORUS_TREBLE | High või EQ, 0–10 | Nimi sõltub tüübist |
| FUZZ:43 | FUZZ_OVERSAMPLE | Oversampling, NORMAL/HIGH | Blokeeritud, ka experimental/raw |

Choruse Low/High on FM3-Editi FW13 kirjelduses tüüpidel
2, 3, 5, 6, 7, 8, 13, 14 ja 21. Tüübil 20 kuvatakse sama CHORUS_TREBLE
parameetrit nimega EQ. Delay Range on FW13 Expert-varulehel; tüübid 15, 16 ja 17
kasutavad teist Expert-lehte. Chorus/Drive’i tabelikirjutused jõustavad nüüd
[tüübisobivuse reegleid](FM3_TYPE_APPLICABILITY.md). Kasuta neid koos vastava
kinnitatud tüübi kanaliga. Kõik mudeli- ja
kanalikombinatsioonid ei ole uue seadmeimpordiga katsetatud.

Drive Oversampling esineb FM3-Editi enda parameetritabelis PID-ga 43 ning
FW13 vahemälus valikutega NORMAL/HIGH. Kõik viis vastavat XML-juhtnuppu on
aga kommentaarides ja aktiivseid nuppe pole. Üksnes kirje olemasolu ei
õigusta selle kirjutamist. Varem sai seda nimeta PID kaudu muuta; kandidaat
tõrjub nüüd nii väärtuse kui ka otsese toorsõna kirjutuse. Olemasolevates
mallides olevat sõna säilitatakse; malle ei kirjutata ümber.

## DynaCab skaala

Sinu varem kogutud `effectDefinitions_11_13p0.cache` sisaldab mõlema
parameetri jaoks min=0, max=1 ja kuvakordajat 10. Generaatori olemasolev
valem on seega `wire = round(display / 10 * 65534)`.

Repo teise API ajalooline 0–100 protsendiesitus annab sama normaliseeritud
asendi alles pärast jagamist kümnega: 25% → 2.5 → 16384; 50% → 5 → 32767;
70% → 7 → 45874. Protsent ei ole selle generaatori otsene sisendühik.
Algse kalibreeringu märkused säilivad; nende SET/GET toorvastuseid siin ei
korratud ja nende kasutajaliidese näite ei kinnitata tagantjärele.

## Tõend ja kordamine

FM3-Edit 1.07.17 Windowsi binaar hangiti Fractal Audio ametlikust
[allalaadimisest](https://www.fractalaudio.com/fm3-edit/). Programmi ei
käivitatud. PE64 nimeviidad ja 16-baidised parameetrikirjed seovad iga
sümboli FM3 enda PID-ga. XML-i loeti sümboli järgi, mitte asukohajärjekorra
alusel. FM9 või Axe-Fx III ID-sid üle ei kantud.

FW13 vahemälu 2509 kirjet loeti uuesti ja taastati baittäpselt. Range,
kuvakordaja ja valikud klapivad kõigi kuue generaatorikirjega. Binaari,
XML-i ja cache'i räsid, tabeliasukohad ning nähtavustingimused on repo
`docs/fm3/parameter-evidence/six-field-resolution.json` failis. Avalikku
reposse ei lisatud redaktori binaari, tervet XML-i ega dekompileeritud koodi.

Repo juurest:

```bash
python3 tools/fm3/six_field_resolution.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-six-field-resolution.py
```

Ilma `--editor` argumendita kordab kontroll kaasatud algse cache'i võrdlust,
nimede/skaalade sidumist ja kirjutuspiirangut; binaari kaevandamist see siis
uuesti ei tee. GitHubi CI kasutab seda võrguühenduseta rada. Maatriks kontrollib
688 lubatud parameetrit; ühe võrra väiksem arv tuleneb peidetud Drive'i välja
blokeerimisest. Individuaalse seadmetõendiga parameetreid on jätkuvalt 85.
