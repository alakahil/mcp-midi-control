# External 1 → Wah: piiratud presetifaili kirjutus

## Sisukord
- Sisend
- Olemasolevate tõendite audit
- Kirjutuse piirid
- Auto Engage kahevalikuline kirjutus
- Damping’u režiimi kahevalikuline kirjutus

0.3.5 lisas olemasoleva tõendatud modifikaatoriseose sisse- ja
väljalülitamise. 0.3.10 lisab allpool kirjeldatud kahevalikulise
Auto Engage kirjutuse; 0.3.11 lisab Damping’u režiimi EXPONENTIAL/LINEAR. Avaldamist ja hostilaadimist kinnitab eraldi väljalaskekviitung. See on offline-failitöötlus; seadmele päringuid ei saadeta.

## Sisend

`jb-composer` kirjeldus olemasoleva Wah-plokiga kinnitatud aluse jaoks:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "WAH EXTERNAL 1",
  "modifiers": {"external1Wah": true}
}
```

`false` valib NONE. Välja puudumine säilitab algse allika. Soundi ümbrises
asub `modifiers` selle sama `composer` objekti sees, mitte ümbrise juurtasemel.
NewLooki alus ei sisalda Wah-plokki: sisselülitamiseks lisa näiteks
`"wahChannels":[{"channel":"A","type":"FAS Wah"}]`.
Soundi `layout` peab siis loetlema Wah-ploki. Uus plokk jääb bypass'i, kuni
kasutaja palub vastava stseeni aktiveerida. Modifikaatori lüliti bypass'i ei muuda.

Ühine käsk `fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM` loob SYX, TXT,
spec JSON-i ja validation JSON-i; `--verify OUTPUT_STEM` kontrollib komplekti.
Tundmatuid alusfaile ei aktsepteerita. Uue väljundi uuesti aluseks andmine
ei laienda kinnitatud aluste loendit; mõlemad variandid koosta samast alusest.

## Olemasolevate tõendite audit

Auditi seitse alust ja nende SHA-256 on `fm3-composer-bases.mjs` failis.
Kuues aluses on esimese modifikaatorikirje allikas 14; NewLookis 0.
Kõik ülejäänud 24 sõna kattuvad nendes seitsmes aluses täpselt. Varasem seadmeekspordipaar
`JB_RHYTHM_LEVEL_MINUS3_export.syx` → `JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`
ning `FM3_NEWLOOK_SOURCE_AUDIT.json` kinnitavad eemaldatud Wah-seose
allikasõna 14→0. Presetid erinevad ka plokkide ja ruudustiku poolest;
neid ei nimetata ainult ühe parameetri mõõtmispaariks.

| Väli | Tõendatud väärtus |
|---|---|
| Kirje | indeks 0, päis 1538, 25-sõnaline sisu algab 1584 |
| Allikas, MOD_CTRLID | sõna 0; NONE=0, External 1=14 |
| Sihtplokk, MOD_EFFECTID | sõna 8; Wah 1=94 |
| Sihtparameeter, MOD_PARAM | sõna 9; WAH_CONTROL=5 |
| Kanal, MOD_CHANNEL | sõna 17; ALL=0 |
| Teisene allikas / operaator | sõnad 20/23; mõlemad 0 |

Natiivne 25-väljaline MOD-deskriptor ja FW13 cache'i allika/kanali enumid on
SHA-ga kinnitatud `fm3-parameter-dependencies.json` failis. Test ristkontrollib
nimed, enumid, seitsme aluse räsid ja kõik kirjesõnad. Muutmata kõvera või
summutuse arvulist tähendust ei ole selle töö jaoks vaja oletada.

## Kirjutuse piirid

- Allikapäring muudab ainult allikasõna 0↔14; selle paari puhul erineb üks sisubait, 1584.
  SYX-i tihendus, CRC ja kaadrite kontrollsummad arvutatakse uuesti.
- Siht, kanal, teisene allikas, operaator ja kõik kõverasõnad peavad vastama
  tõendatud kirjele. Erinev konfiguratsioon tõrjutakse, seda ei normaliseerita.
- Sisselülitamine nõuab olemasolevat korrektses vormingus nelja kanaliga Wah1.
  Puuduva Wah korral on lubatud ainult NONE säilitamine või seose väljalülitus.
- Teist sama sihtmärgiga kirjet või ebaselget konkureerivat sihti ei muudeta;
  selline päring tõrjutakse. Kõigi 32 serialiseeritud kirje päist kontrollitakse.
- Muid kirjeid ei looda ega kopeerita. Kõik vead tuvastatakse enne selle
  kirjutaja keha muutmist ja lubatud-baitide callback'i.
- Lülitus rakendub koostajas enne soundi tabelijuhte. `true` korral on
  Wah Control'i käsikirjutus kõigil A–D kanalitel keelatud; `false` korral
  kehtivad tavalised parameetri- ja tüübipiirangud. Staatilist väärtust ei muudeta
  automaatselt. Malli valik, seose olek ja stseeni bypass on eraldi taotlused.

## TXT ja kontrollitase

TXT näitab lõppfaili allikat, sihti ja ALL ulatust, eristades seost stseeni
bypass'ist. External 1 globaalne pedaali/MIDI vastendus peab seadmes juba sobima;
generaator seda ei loe ega kirjuta. Pedaali hetkeasendit ei saa presetist järeldada.

`test-wah-modifier.mjs` kontrollib sisse/välja kordust, idempotentsust,
ülejäänud kogu keha säilimist, vigase kirje atomaarset tõrjumist, A–D lukku,
NewLooki lisamise integratsiooni ja nelja väljundfaili. Need on olemasolevate
tõendite korduskontrollid ning sünteetilised tarkvaratestid.
Uut FM3 importi, pedaali toimimise katset, heli ega CPU-d pole kinnitatud.
Globaalsete skaalade arvukodeering ja kirjutamine jäävad eraldi uurimisteemaks.


## Auto Engage kahevalikuline kirjutus

Minimaalne päring alusele `JB_RHYTHM_LEVEL_MINUS3_export.syx`:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB RHYTHM LEVEL -3",
  "modifiers": {"wahAutoEngage": "OFF"}
}
```

Teine lubatud silt on `MED SPD`. Arvulisi koode ega muid silte sisendina ei
aktsepteerita. Välja puudumine säilitab olemasoleva Auto Engage'i väärtuse.
`external1Wah` on eraldi valikuline väli: ainult Auto Engage'i päring säilitab
allika. Kui mõlemad on määratud, peab lõppallikas olema External 1.
`external1Wah:false` koos Auto Engage'i päringuga tõrjutakse enne kirjutamist.
NewLook nõuab Wah-ploki lisamist ja `external1Wah:true`; uus plokikooslus on
sünteetiliselt kontrollitud, mitte selle mõõtmispaari uus seadmekinnitus.

| Tõenditase | Kinnitatud ulatus |
|---|---|
| Baidiasukoht | Esimese kirje sõna 10, dekodeeritud keha nihe 1604, uint16 little-endian |
| Arvukodeering | Täpselt MED SPD=2 ja OFF=0; muid enumiväärtusi ei avata |
| Kuva | Algne MED SPD kasutaja kinnitusest; OFF, External 1, All ja Wahwah 1 Control ekraanipildilt; FW13.00 |
| Failivõrdlus | 14 222 sisubaidist muutus ainult 1604: 2→0; muud 14 221 baiti säilisid |
| Päised/kontrollsummad | Dump-päis ja preseti nimi säilisid; raw-päises muutus ainult CRC; kaadrid, CRC ja footer kehtivad |
| Tegelik käitumine | Pedaali liikumine, automaatne bypass, heli ja CPU pole selle katsega valideeritud |

Tõendipaar ja räsidega kuvatõendi kirjeldus on
`skills/instructions/references/wah-auto-engage-evidence.json` failis.
Eksporditud OFF-fail on `skills/instructions/examples/FM3_MOD_AUTOENGAGE_OFF_export.syx`.
Algne ekraanipilt säilib kasutaja manuses; seda ei pakita pluginasse.

0.3.11 kirjutaja lubab kirjes allika 0/14, Auto Engage’i 0/2 ja Damping’u režiimi 0/1;
ülejäänud 22 sõna peavad vastama säilitatud konfiguratsioonile. Sihtplokk,
konkureerivad kirjed, kõik kirjepäised ja lõppallikas kontrollitakse enne
ühegi baidi muutmist. Allikapäring säilitab ka juba OFF-is oleva kirje.
Auto Engage OFF **ei vabasta** Wah Control'i käsikirjutuslukku: allikas on
endiselt External 1. Stseenikanalid ja bypass säilivad.

`test-wah-auto-engage.mjs` võrdleb päris ekspordipaari, taastab OFF-i kogu keha,
kontrollib mõlemat silti kuuel Wah'ga kinnitatud alusel, idempotentsust,
tagasisuunalist sünteetilist taastet, kõrvalmuudatuste puudumist, vigase sisendi
atomaarset tõrjumist, A–D kirjutuskaitset, NewLooki kooslust ja nelja väljundfaili.
Kogu keha vastavus varasemale seadmeekspordile ei tähenda, et uus genereeritud
SYX oleks eraldi uuesti imporditud. Sama sisu korduseksporti pole vaja.

Pildilt saab lisaks kirja panna muutmata min/max 0.00/10.00, Attack 10.1 ms,
Release 0.0 ms, Damping Exponential, Start/Mid/End 0/50/100%, Slope 50%,
Scale 1.000, Offset 0% ja Off Value 5%. Need on üksikud kuvanäidud ning
**ei kinnita nende väljade vaheväärtuste kodeeringut ega uut kirjutustuge**.


## Damping’u režiimi kahevalikuline kirjutus

0.3.11 lähtekood lisab `"modifiers":{"wahDamping":"EXPONENTIAL"}` või
`"LINEAR"`. Ainult režiimi valik ei muuda Attack/Release aegu ega Auto Engage’i.
Nõutav on sama kinnitatud External 1 → Wah 1 Control ALL seos. Arvulised
sisendid, valed sildid, tundmatud väljad ja toorkoodid tõrjutakse enne muutmist.
NewLook vajab Wah-malli ning selgesõnalist `external1Wah:true`.

| Tõenditase | Kinnitatud ulatus |
| --- | --- |
| Baidiasukoht | Kirje 0, sõna 24, keha nihe 1632, uint16 little-endian |
| Arvukodeering | EXPONENTIAL=0, LINEAR=1 |
| Kuva | Eelmise OFF-katse pildil Exponential; järelkatse pildil Linear, External 1, All, Auto Engage Off ja FW13.00 |
| Failivõrdlus | 14 222 sisubaidist ainult 1632: 0→1; ülejäänud 14 221 baiti säilisid |
| Päised | CRC ja tihendatud pikkus 4923→4924 muutusid; muud päisebaidid, nimi ja dump-päis säilisid; nulltäide kehtib |
| Seadmekäitumine | Režiimi ajakäitumine, pedaali mõju, heli ja CPU ei ole kinnitatud |

Tõend: `references/wah-damping-evidence.json` ja kasutaja ekspordi muutmata
koopia `examples/FM3_MOD_DAMPING_LINEAR_export.syx`. Algset ekraanipilti
ei pakita pluginasse; tekstikirjeldus ja räsi on tõendikirjes.

Varasemast kinnitatud `JB_RHYTHM_LEVEL_MINUS3_export.syx` alusest saab täpse
vaadeldud keha taastada päringuga:

```json
{
  "schemaVersion": 1,
  "firmware": 13,
  "baseProfile": "jb-composer",
  "name": "JB RHYTHM LEVEL -3",
  "modifiers": {"wahAutoEngage": "OFF", "wahDamping": "LINEAR"}
}
```

Uut LINEAR-eksporti ei lisata üldiseks koostajaaluseks. Kogu keha kattuvus
ei tähenda uue kodeeritud SYX-faili eraldi seadmeimporti. Sama sisu
korduseksporti pole vaja. MED SPD + LINEAR on toetatud väljade uus kombinatsioon;
see ei saa OFF + LINEAR mõõtmispaari kogu-keha seadmekinnitust.

`test-wah-damping.mjs` kontrollib päris paari, kogu keha taastamist, mõlemat
silti kuuel alusel, säilivaid sõnu, allika/Auto Engage’i koostoimet, idempotentsust,
vigaste sisendite muutuseta tõrjumist, lõppfaili tagasilugemist ja A–D käsijuhtimise
lukku. TXT näitab lõppfaili Damping’u silti, koodi ja muutmise/säilitamise olekut.
Kirjutamata väljad ning tõendamata ajaline ja heliline käitumine on eraldi märgitud.
