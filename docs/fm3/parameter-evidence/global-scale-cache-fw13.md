# FW13 globaalse skaala arvupuhvri uurimise vahetulemus

20.10.2026. Arendustööriist ja piiratud staatiline kontroll; plugina käitusaeg,
vaatlusdekooder ning 0.3.3 väljalase ei muutu.

## Tulemus

Tuvastatud on globaalse ploki arvupuhvri algseadistus ja üks konkreetne põhjus,
miks kuvateksti korrektne uuendamine ei tõenda arvuvälja uuendamist: skaala
PID-id jäävad erikäsitluse vahemikku, mis möödub üldise parameetrikäsitleja
väljakutsest. Selles üldises käsitlejas asub arvumassiivi kirjutaja.

See **toetab uuendamata arvupuhvri hüpoteesi**, kuid ei tõenda, et arvuväli
on seadmes alati null või et muid kirjutajaid pole. Esialgne nullväärtus ja
nulli kuvamine ei erista neid olukordi.

| Seos | Piiratud kontrolli tulemus |
|---|---|
| Globaalse objekti `+0x158` | Arvumassiivi pointer `0xc2008550` |
| Objekti `+0x160` | Kuvatekstide pointer `0xc2016dd0` |
| Objekti `+0x104` | 14 880 parameetrikohta, mitte 14 880 tõendatud funktsiooni |
| Arvu ja teksti samm | Vastavalt 4 ja 32 baiti; arvumassiivi lõpp kattub tekstimassiivi algusega |
| Boot-voog | Mõlemad massiivid jäävad nulliga täidetava piirkonna sisse; see ei ole käitusaja värskuse tõend |
| Jagatud tabeli kirje 1 | Arvupointer väljal `+0x10`, tekstipointer väljal `+0x14`; klapib varasema GET-lugejaga |
| Globaalne callback | SHARC VISA aadress `0x80f751` |
| Vahemikuharu `0x80f7c2` | PID-id 134…1653 ei hüppa üldise käsitleja väljakutse juurde `0x810355` |
| Skaala PID-id | Kõik 384 PID-i 902…1285 on selle haru sees |
| Üldine käsitleja `0x8244fb` | Kirjutaja `0x8246df…0x8246e9` kasutab objekti arvupointerit ning PID-i indeksina |
| Skaala kuvamine | `0x80f7dc` loeb tekstipointeri; `0x80f9cf…0x80f9d6` annab teksti väljundi vormistajale |

SHARC aadressid on 16-bitiste VISA-pakiosade aadressid, ARM aadressid
baidiaadressid. Neid ei tohi segada. Üldise kirjutaja leidmine ei tähenda,
et iga parameeter või iga tegevuskood selle kirjutuseni jõuab.

## Mida kontroll käivitab

```bash
python3 tools/fm3/global_scale_cache.py --firmware /ABS/fm3_dsp_rel_13p00.syx
python3 tools/fm3/test-global-scale-cache.py
python3 tools/fm3/test-global-scale-cache.py --firmware /ABS/fm3_dsp_rel_13p00.syx
```

Esimene käsk nõuab täpselt varem kinnitatud FW13 faili ja kontrollib nii
SYX-i kui ka lahtipakitud boot-voo SHA-256 räsi. See seob valitud käsud
boot-plokkide ja virtuaalaadressidega, tuletab konstruktoris objekti väljade
nihked ning kontrollib vahemikuharu. Kaks lühikest ARM-jagamisfragmendi
käskujada täidetakse sünteetilise objekti- ja kaadrimäluga. SHARC-funktsioone
tervikuna ei käivitata.

Teine käsk kontrollib sünteetilisi käsuvälju, märgiga nihkeid, DAG-registripanka,
harupiire, viitkäskude lippe ning puudulike või mitmetähenduslike sisendite
tõrjumist. Kolmas lisab päris püsivara võrdluse registriga, iga vaadeldud
koodibaidi muutmiskatse ning ARM-pointeri avaldamise nelja sünteetilise
efektiindeksiga. Need pole seadmemõõtmised.

`global-scale-cache-fw13.json` sisaldab kontrollitud aadresse ja räsisid.
Täiendavaid püsivara koodilõike, täispüsivara, toormõõtmisi ega USB-metaandmeid
ei säilitata selles uurimismuudatuses. Varasem avaldatud 324-baidine saatmisraja
tõend jääb samaks. Uus kontroll ei kuulu praegu plugina 40-testilisse
väljalaskekomplekti; seda ei esitata avaliku CI läbimisena.

## Tõendi piir ja järgmine otsus

Järgmised lipud jäävad vääraks: `scaleToNumericCacheProducerTraced`,
`endToEndStaticVerified`, `nonzeroHardwareVerified`,
`newHardwareRangeValidation` ning `allRuntimeCacheWritersExcluded`.
Kontroll ei hõlma kõigi callback'i harude ja kutsujate täielikku juhtvoogu,
protsessoritevahelist ajastust, alternatiivseid pointereid ega kõiki
käitusaegseid kirjutajaid. Algseadistuse fragmente hinnatakse tavalise
lineaarse C-objekti aadressiaritmeetikaga, mitte ringpuhvri režiimis.

Leid ei anna alust kuvateksti vaikselt arvuvälja asemele tõsta ega nullist
erinevaid väärtusi SYX-i kirjutada. Generaatori ja dekoodri senised
tõrjereeglid jäävad kehtima.

Järgmine otsustav samm on varasema plaani **kahe vastasmärgilise väärtuse
kontroll**: ühe mittevajaliku skaala A = −24 ja A♯/B♭ = +24, üks selle
skaala 12 GET-päringuga lugemine ning mõlema algväärtuse taastamine.
Preseti eksporti ega 384 parameetri muutmist pole vaja. Katset ei ole
käivitatud. Täpne lugemiskäsk ja taastamisjärjekord on plugina
`engine/docs/FM3_GLOBAL_SCALE_WIRE.md` juhendis.

Võrdluses tuleb hoida eraldi toorbitid, kuvatekst ja arvu tõlgendus:

- Kooskõlalised nullist erinevad väärtused kinnitavad ainult mõõdetud punkte.
- Nulliks jäänud arv ja muutunud tekst kinnitavad selle kogumise lahknevust;
  vaatlusdekooder peab keelduma.
- Muu lahknevus suunab uurimise konkreetse vastuse juurde; seda ei parandata
  arvamise või usalduslipu tõstmisega.

## Allikad ja töövõtted

- Muutmata FM3 FW13: samad kaks päritoluräsi nagu saatmisraja tõendis.
- [Analog Devices SHARC+ Core Programming Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/sc58x-2158x-prm.pdf),
  Type 3b, 15b ja 19a diagrammid ning aadressiaritmeetika; PDF leheküljed
  321, 395 ja 406 (trükinumbrid 14–18, 16–12 ja 17–5).
- Uurimisel võrreldi ka [selache'i dekoodrit](https://github.com/js216/selache/tree/2b26d3b75c53063575bc5c820fa0d38879335187).
  Selle üldist disassembleri väljundit ei käsitleta tõendina: leiti juhud,
  kus laiuse või registrivälja heuristika vajab parandamist. Säilitatud
  tööriist kontrollib ainult nimetatud fragmente ja vajalikku käsualamhulka.
