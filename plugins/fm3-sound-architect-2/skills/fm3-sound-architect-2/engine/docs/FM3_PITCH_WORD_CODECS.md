# Pitchi 27 välja presetisõnade kodeering

Tabelikodeerija 0.74.10 kasutab 0.3.3 kandidaadis täpselt 27 Pitchi välja
jaoks eraldi kontrollitud teisendust. Vana 2892 kirje sõnastik jääb muutmata;
ülekirjutus kontrollib iga algkirje täpset vastavust. Staatus
`preset-word-crosschecked` tähendab FM3 failide ja metaandmete ristkontrolli,
mitte uut riistvaramõõtmist ega live MIDI SET tuge.

| Väljad | PID | Sisend ja salvestus |
|---|---|---|
| SHIFT1–4 | 15–18 | Täisarv −24…24 → märgiga 16-bitine sõna; ühik sõltub Pitchi mudelist |
| TRACKMODE | 35 | `NOTES` → 1, `CHORDS` → 2; OFF ja 0 on keelatud |
| CUSTOMNOTES | 63 | Täisarv 4…8 salvestatakse otse; ei kirjuta dünaamilisi noote |
| CUSTOMSCALE1/2 | 71–72 | Nullist algav salvestatud globaalne skaalaindeks 0…31 |
| NUMSTEPS | 73 | Täisarv 2…16 salvestatakse otse |
| NUMREPEATS | 74 | Salvestatud korduskood 1…31, mitte kinnitatud ekraanil kuvatav korduste arv |
| TEMPO | 76 | FW13 78 silti, ID 1…78: `1/64 TRIP` → 1, `1/16` → 8, `63/64` → 78 |
| STEP1–16 | 77–92 | Täisarv −24…24 → märgiga 16-bitine sõna; arpedžiaatori skaalaastmed |

Märgiga salvestuse näited: −24 → 65512, −12 → 65524, −1 → 65535,
0 → 0 ja 24 → 24. Normaliseerimist vahemikku 0…65534 ei tehta.
Raw väärtus 65535 on lubatud ainult nende 20 märgiga välja kehtiva −1-na;
muude väljade piirangut ei laiendata. Murdarv, vale tüüp või piiridest väljuv
väärtus peatab kogu kirjutusplaani enne faili muutmist.

Enum-sisendiks eelista silti. Numbriline sisend tähendab nende kahe välja
**salvestatud ID-d**, mitte loendi nullist algavat positsiooni. Pitchi teised
tempo-väljad säilitavad varasema NONE=0 kodeeringu; arpedžiaatori TEMPO-l NONE
puudub. Mudeli nähtavus, täiskanalimallid, tempo- ja modifikaatorikaitse kehtivad edasi.

## Tõendid ja kordamine

`fm3-pitch-word-codecs.json` ühendab olemasoleva FW13 cache’i sektsiooni 23,
FM3-Edit 1.07.17 natiivsed nimi/PID sidemed, 16 FW13 Pitchi kanalimalli ja
`fm3-pitch-factory-evidence.json` arvulised faktid. Mõlemad registrid on
SHA-256-ga seotud; runtime kontrollib kodeeringuregistri terviklust.
Natiivanalüüs tõendab seoseid, mitte tervet redaktori kodeerimisfunktsiooni.

Ametlik allikas: [FM3 tehasepresetid 10.0](https://www.fractalaudio.com/downloads/firmware-presets/fm3/10p0/FM3_Factory_Presets_10p0.zip).
Arhiivi SHA-256 on `4da0ebf5f641e63c9cb900741fe34b001736116ac31f4eb51effc9d72ddb1f9f`.
Registris on nelja preseti 16 kanali 432 valitud sõna, faili- ja presetiräsi,
asukoht ning vorming. Tehasefaile ega tervikpreseteid ei lisata paketti.

| Tehasepreset | Koht | Kinnitav näide |
|---|---|---|
| Satan’s Hollow FM3 | 177 | Negatiivsed arpedžiaatorisammud ning otse salvestatud loendurid |
| Arpeggiator M@ness FM3 | 225 | Negatiivsed sammud ja TEMPO=8 |
| 5-Octave Lead | 247 | SHIFT1–4: 65512, 65524, 12, 24 |
| Virtual Capo | 280 | A–D SHIFT1: 65535, 65534, 65533, 65532 |

Need vanemad FM3 tehasepresetid kasutavad vormingut 0x013e ja 113 Pitchi
sõna kanalis. Eraldi kirjutuskaitstud uurimisluger kontrollib B/C panga räsi,
MIDI-pakendit, järjestust, XOR-i, CRC-d ja valitud ploki struktuuri.
Tootmiskirjutaja lubatud FW13 vorming 0x0146 ja 114 Pitchi sõna ei muutu.
Sama deskriptoriklassi teisendus kantakse üle loetletud 20 märgiga väljale;
432 fakti ei tähenda iga võimaliku väärtuse seadmemõõtmist.

```sh
node tools/fm3/pitch_factory_evidence.mjs /path/to/unpacked-factory-banks
python3 tools/fm3/pitch_word_codecs.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-pitch-word-codecs.py
python3 tools/fm3/pitch_word_codecs.py
node plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-pitch-word-codecs.mjs
```

CI kasutab talletatud fakte, FW13 cache’i ja malle, ilma võrgu või seadmeta.
Regressioon kontrollib 1175 domeeniväärtust, 254 vigast sisendit, sõltumatut
signed-int16 oraaklit, 432 tehasesõna, raw piiranguid ja lõplikku SYX/TXT rada.

## Kuvamise ja heli piirid

[Fractali Blocks Guide](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf)
kirjeldab arpedžiaatori samme skaalaastmetena ning korduste INFINITE valikut.
Korduskoodi ja erilise kuvasildi täpne seos ei ole siin tõendatud: koodi 31
ei esitata 31 kordusena ega pakuta tõendamata INFINITE nime teisendust.
Kohandatud skaala sisend on selgelt **salvestatud indeks**, mitte tõendatud
redaktorinäit. Globaalsete skaalade sisu ei kuulu sellesse presetivalideerimisse.

NOTE2–NOTE8 dünaamilised valikud on endiselt kirjutamiseks suletud.
Arpedžiaatori kuuldav tulemus sõltub ka helistikust, skaalast, sammude arvust,
suunast, tempost ja kontrolleritest. Learn/LFO dünaamika, seadmeimport,
heli ja CPU ei ole selle muudatusega kontrollitud. FM9/III GET/SET uurimust
kasutati hüpoteesina; seda ei loeta FM3 riistvaratõendiks. Kasutaja füüsilisi
toiminguid selles etapis: 0. Paigaldatud plugin jääb 0.3.2 peale.
