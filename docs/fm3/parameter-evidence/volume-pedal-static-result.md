# Volume’i pedaaliseos: korpuse sulgemine ja loomistee, 23.10.2026

**Uurimisetapp on tehtud; generaatorisse uut seosekirjutajat veel ei lisata.**
Avaldatud privaatne plugin jääb 0.3.16-ks, release
`pluginrel_6adb8d341ba48191996d947712c344cf`, mootori lähtecommit
`a11d8e44d0df339411d7e45ad6bea126b0bf89d5`. Selle analüüsi repo alus on
`b57e01cfdfd43a77db5c1162d6ea51ad28692bb3`; hilisem uurimiskood ei ole uus väljalase.

## Mis sai täiendavalt kontrollitud

| Kontroll | Tulemus | Tõendi liik |
|---|---|---|
| Värske 0.3.16 korpus | 795 teed, 638 unikaalset SYX-i; 628 tavalugejaga loetavat faili | Uus kohalik staatiline analüüs |
| 628 faili modifikaatoritabelid | Mitte ühtegi effectId 102 sihtkirjet | Kogu olemasoleva toetatud korpuse lugemine |
| Varem lugemata 10 faili | 9 vorminguga 0x013e, 1 vorminguga 0x0143; kõik kaadrikontrollsummad, CRC, footer ja 32 kirjepäist korras | Eraldi ainult lugemise tööriist; tootmisparserit ei laiendatud |
| Vanema korpuse leid | preset-96: kirje 2, source 3, effectId 102, PID 1, channel 0 | Toorsõnad tõendatud; tänases registris LFO 2A → Volume/Pan 1 Balance ALL |
| Ext1 → Volume/Pan 1 Gain | Ühtegi source 14 / effect 102 / PID 0 doonorseost ei leitud | Puudumise järeldus piirdub nende 638 failiga |
| Varasem REA ZIP | Kõik 91 kontrollpunktidega faili vastavad; 45 funktsioonianalüüsi kasutatavad | 22.10 REA tõendi taaskasutus, mitte uus REA |
| Uus editori analüüs | 8 lühikest kontrollitud koodipiirkonda ning 8 uue plaanitud funktsiooni räsi | Kohalik Capstone 5.0.6 + Mach-O LC_FUNCTION_STARTS |
| Uued tööriistakontrollid | 15/15: 5 lugeja- ja 10 koguja testi; 19 päringut vastavad varasematele REA 6.4.0 skeemidele | Offline; eraldi avaldatud mootori 59 testist |

Korpuse räsid ja inventuur: [volume-pedal-0316-corpus.json](volume-pedal-0316-corpus.json).
Vanade failide kõik toorsõnad: [volume-pedal-legacy.json](volume-pedal-legacy.json).
Leitud Volume’i 25 sõna on:
`[3,6600,61893,0,32767,65534,32767,66,102,1,0,0,0,32767,32767,66,2,0,0,0,0,0,0,0,0]`.
See ei ole FW13 Gain’i doonor ega alus Min/Max-i kodeeringu ülekandmiseks.

## Konkreetne uus staatiline leid

Originaalse `FM3-Edit.app.zip` Info.plist kinnitab versiooni 1.07.17.
Eraldatud arm64 Mach-O on 15 224 432 baiti ja SHA-256
`62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a`.
See vastab varasema REA sihtbinaarile. Rakendust ei käivitatud.

| Funktsioon / piirkond | Binaarist kontrollitud käitumine | Järelduse piir |
|---|---|---|
| `0x10017b200` | W2/W3 salvestatakse sihtväljadele +0x4f4/+0x4f6; modifikaatori ID +0x4f8 ja ootel päring nullitakse | Konkreetne effect 102 / PID 0 käivitav kutsuja vajab sidumist |
| `0x1001796d4` | PID 0 jaoks on eriharu; olemasoleva ID puudumisel kasutatakse sisemist serialiseerijakoodi 0x3a ja sihtvälju | See ei ole veel uus riistvaral kontrollitud MIDI-käsk |
| `0x10017982c` | Algne Source’i muutmise pakett säilitatakse +0x4e8/+0x4f0 väljadele | Säilitamine on tõendatud, lõplik seadmevastus pole selles sessioonis mõõdetud |
| `0x1001795f8` | Vastuvõetud W3 saab modifikaatori ID-ks; seejärel antakse ootel pakett tavalisele saatjale | Toetab loomise → ID määramise → Source’i seadmise rada; firmware’i vaikekirje pole tõendatud |
| `0x10017b290…0x10017b2c4` | Sihtploki andmeid küsitakse funktsioonist 0x1000ca538; MOD PID17 definitsiooni väljal +0xc kasutatakse tagastatud arvu | Kanalite metadata sõltub sihtplokist; ALL/A–D serialiseeritud loomiskontekst vajab kinnitamist |

See eraldab loomise olemasoleva modifikaatori muutmisest. Üksnes Wah-kirje
effect/PID ümberkirjutamise piisavust ei ole tõendatud. Varasemas REA paketis
olid peamiselt sisestuse, värskenduse ja pöördnupu rajad; need kaheksa uut
fikseeritud funktsiooni ei korda varasema paketi 45 funktsioonianalüüsi.

Räsid ja vaatlused: [volume-pedal-native-checkpoints.json](volume-pedal-native-checkpoints.json).
Taasesitatav koondtulemus: [volume-pedal-static-audit.json](volume-pedal-static-audit.json).
Algseid editori/firmware’i binaare ega kogu dekompileeritud koodi reposse ei lisatud.

## Järgmine konkreetne samm

Valmis on `tools/fm3/rea-volume-pedal/`: eraldi Volume’i plaan, iseseisev
käivitaja, koguja, README ja testid. See kohandab varem Macis töötanud
koondskripti. Kuni 44 päringut hõlmavad 8 uut funktsiooni, 3 xref-i,
piiratud kutsujate järelanalüüsi ja 3 piiratud andmevoogu. Varem analüüsitud
45 funktsiooni jäetakse xref-lisapäringutest välja; jälje sees võivad need
vajalike sõltuvustena siiski esineda.

Uue jooksu küsimus on: **kuidas valitakse Volume Gain’i siht, luuakse seos,
määratakse selle ID ja saadakse kanali/sihtparameetri metadata?** Tulemuse
abil saab eristada editoris teada olevaid välju firmware’i algväärtustest
ja valmistada ette võimalikult väikese sõltumatute tagasilugemistega
seadmekatse, kui doonor on pärast seda endiselt vajalik.

Praeguses ChatGPT sessioonis otse kutsutavat REA/Ghidra tööriista ei ole.
Maci praegust paigaldust pole selles sessioonis käivitatud ega diagnoositud.
22.10 edukas 9/9 Ghidra kontroll jääb kehtivaks ajalooliseks tõendiks.
Uus pakett kontrollib Macis tegelikud teed, Node’i, täis-JDK-d,
analyzeHeadless-i, sobivat dekompilaatorit, sihtbinaari identiteeti ja
funktsiooniräsisid. IDA/Hopperi/agendiregistreeringu kõrvalised teated ei
muuda Ghidra tulemust. SHARC rada ei kasutata.

Paketi ZIP-i lahtipakkimine, kaasfailid ja käivitamine tühikute, `%`, `#`
ning Unicode’iga teest on kontrollitud. Linuxis kontrolliti oodatud
platvormipiiri koos diagnostika säilimisega; see ei ole Maci pärisjooks.
Puuduva kaasfaili korral säilib konkreetne käivitusvea teade. Iga REA vastus,
ka viga ja osaline tulemus, säilitatakse; pimedat kordamist ei ole.

Kasutaja käivitamisjuhis: **kirjuta Terminali `bash `, lohista lahtipakitud
olemasolev `FM3_REA_VOLUME_PEDAL.command` sinna ja vajuta Enter.**
FM3 ühendamist, FM3-Editi ega Ghidra graafilist akent ei ole vaja.
Tagasi on vaja üht skripti loodud tulemuste ZIP-i, ka ebaõnnestumise korral.

## Muutmata piirid

- Uut REA jooksu ega riistvaramõõtmist selles etapis ei tehtud. Uusi füüsilisi ekspordikordi: **0**.
- Uus Ext1 → Volume Gain generaatorikirjutaja, selle kõigi sõnade vaikekirje ja Volume’i Min/Max kodeering on endiselt avatud.
- Globaalne External 1 pedaali/CC määrang, pedaali hetkeasend, tegelik helivastus ja STORE/reload on eri tõendid.
- Input gate ja eraldi Gate-plokk on eri asjad; uut gate’i kirjutustuge siin ei muudeta.
- Wah `wahMinMaxExact`: 6 riistvarapunkti välja kohta, 995 mudelipõhist väärtust; `fullRangeEncodingProven=false`. Ajaloolised hiirepunktid jäävad eraldi.

## Taasesitamine

```sh
node tools/fm3/volume-pedal-audit.mjs --output /ABS/new-corpus.json
node tools/fm3/volume-pedal-legacy-audit.mjs /ABS/new-corpus.json /ABS/new-legacy.json
node --test tools/fm3/test-volume-pedal-legacy.mjs tools/fm3/rea-volume-pedal/test-volume-pedal-batch.mjs
python3 tools/fm3/volume_pedal_static_audit.py --editor /ABS/FM3-Edit-arm64 --batch /ABS/extracted-prior-REA --output /ABS/new-static-audit.json
```

Kirjutamine piirdub uute uurimistulemustega; olemasolevat väljundit ei kirjutata üle.
