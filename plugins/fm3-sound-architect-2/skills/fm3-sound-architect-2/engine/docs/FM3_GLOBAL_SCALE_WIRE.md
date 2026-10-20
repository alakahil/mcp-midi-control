# Globaalse skaala arvuvälja saatmistee: FW13

## Kontrollitud osa

Püsivara ARM Thumb-kood pakib 32-bitise arvusõna viieks järjestikuseks
7-bitiseks baidiks, alustades madalamatest bittidest. See kinnitab olemasoleva
vaatlusdekoodri bittide järjestust ja märgibiti säilimist. Pakkija ise ei tea,
kas sisend on float32, täisarv või muu 32-bitine väärtus.

| Lüli | Aadress | Staatiline tulemus |
|---|---|---|
| GET `0x1a` haru | `0xc441c684` | Thumb-siht `0xc441c84d` |
| Puhvrist vastusesse | `0xc441c886..0xc441c8ab` | tabel `0xc1857ac0`, efekti samm `0x44`; pointer `+0x10`, väärtus `+4*PID`, vastus `context+0x424`; teisendust pole |
| Vastuse üleandmine | `0xc4454a6c..0xc4454a7f` | sõnumikoostaja saab `context+0x418`, seega arvuväli on sõnumi struktuuris `+0x0c` |
| Väljade pakkimine | `0xc4454b1c..0xc4454b87` | kolm 2-baidist välja, 5-baidine arv, kaks 2-baidist välja |
| 32-bitine pakkija | `0xc445164e..0xc4451699` | viis korda `&127`, baidikirjutus ja loogiline nihe `>>7` |

Loetava puhvri haru on tingimuslik: efekti kirje peab olema aktiivne ja PID
lubatud. See tabel ei väida kõigi muude vastuseharude või seadme ajastuse
täielikku emuleerimist. Kaadri kuue päisebaidi järel paikneb arv baitidel
12–16, nagu olemasolevas dekoodris.

## Järelejäänud lünk

**Globaalse skaala väärtuse jõudmist arvupuhvrisse ei ole lõpuni tõendatud.**
Varasem SHARC-jälg näitab globaalse salvestatud signed-int16 väärtuse lugemist
ja `FLOAT` teisendust kuvatava `semi` teksti vormistamiseks. See ei tõenda,
et sama teisendatud väärtus kirjutatakse GET-vastuse arvupuhvrisse. Ka nulliga
kattuv kuva ja arv ei erista võimalikku uuendamata puhvrit õigest väärtusest.

Seetõttu on tõendis eraldi `scaleToNumericCacheProducerTraced=false`,
`endToEndStaticVerified=false` ja `nonzeroHardwareVerified=false`.
Vaatlusdekoodri senised usalduslipud ei muutu. Arvu ja teksti lahknevus
peatab dekodeerimise; teksti ei kasutata vaikselt arvuvälja asendajana.

## Korratav kontroll

Repo juurest:

```bash
python3 tools/fm3/global_scale_wire.py
python3 tools/fm3/global_scale_wire.py --firmware /ABS/fm3_dsp_rel_13p00.syx
python3 plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-global-scale-wire.py
```

Täielik korduskontroll nõuab muutmata FW13 faili. See kontrollib algse SYX-i
ja lahtipakitud boot-voo räsisid, päiseid ning ARM virtuaalaadressi vastavust
failinihkele. Repos säilitatakse ainult kuus piiritletud koodilõiku, kokku
324 baiti, nende asukohad ja räsid. Tervet püsivara ega kasutaja uusi
toormõõtmisi ei lisata.

Piiratud testikäitur täidab pakkimisfunktsiooni tegelikke Thumb-käske
sünteetiliste sisenditega. Testid katavad kindlad bitimustrid, kõik 32 üksikut
bitti, 1024 deterministlikku juhuslikku sõna ning 49 eelduslikku float32
pooltooniväärtust −24…+24. Viimased lähevad päris vaatlusdekoodrisse. Testid
tõrjuvad vigaseid koode, tõenditõlgendusi, NaN/Inf-väärtusi ning nullist
erineva teksti ja nulliks jäänud arvuvälja paari. See on tarkvaraline
arvutuskatse, mitte FM3, USB, kogu püsivara või helitöötluse emuleerimine.

## Väikseim eristav seadmekatse

Kui puhvri tootja edasine staatiline jälgimine ei anna kindlat vastust,
piisab esimeseks eristavaks katseks **ühe skaala kahest muudatusest ja
ühest 12-noodilisest GET-kogumisest**. Kõiki 384 väärtust ei pea muutma.
Järgnev on ettevalmistatud käsitsi katseplaan; seda pole käivitatud.

1. Vali FM3-Editis skaala, mida kasutatav preset ei vaja. Pane kirja selle
   number ning A ja A♯/B♭ praegused väärtused; olemasolev vana kogumine ei
   asenda praeguse seisu kontrolli.
2. Määra A väärtuseks **−24 semi** ja A♯/B♭ väärtuseks **+24 semi**.
   Ülejäänud kümme nooti jäta muutmata.
3. Lõpeta FM3-Editi suhtlus seadmega ja käivita olemasolev ainult lugev
   koguja, valides sama skaala numbri ja uue väljundkausta:

   ```bash
   python3 FM3_GLOBAL_SCALES.py --capture --scales N --port PORT --out sign-check
   ```

   Asenda `N` valitud skaalaga ning `PORT` varem kasutatud USB-pordiga.
   Ära jätka varasemat nullväärtustega seanssi `--resume` abil: olek on muutunud.
4. Taasta FM3-Editis kohe mõlemad algsed väärtused ja kontrolli neid ekraanilt.
   Taasta need ka siis, kui kogumine katkeb. Koguja ise midagi ei kirjuta
   ega taasta. Preseti salvestamine või uus SYX-eksport pole selleks vajalik.
5. Edasta ainult uue `sign-check/results.zip` koopia. Analüüsis võrdleme
   kahe muudetud PID-i toorbaite, kuvateksti, float32 ja int32 tõlgendust
   ning ülejäänud kümmet nooti. Võimalik dekoodri keeldumine on kasulik
   katsetulemus; nõudeid ei nõrgendata selle peitmiseks.

Oodatud float32 bitid oleksid `c1c00000` ja `41c00000`, pakitud baidid
`00 00 00 0e 0c` ja `00 00 00 0e 04`. Need on hüpoteesi ennustused.
Kahe punkti edu kinnitaks neid kahte punkti, mitte kõiki 49 väärtust ega
kõiki firmware-versioone. Uue mõõtmisarhiivi avaldamine pole selle plaani osa.

## 0.3.4 väljalaske valmisolek

Praegune 0.3.4-dev kandidaat säilitab globaalse sisu suhtes senised piirid:
ainult kogumise hetke kooskõlalised näidud aruandes, globaalset sisu SYX-i ei
kirjutata. Väljalaske kviitungis ei tohi seda kirjeldada täieliku globaalse
skaala kodeeringu või seadmeimpordi kinnitusena.

Lõpliku 0.3.4 avaldamise eel tuleb lahendada ülalnimetatud lünk või otsustada
selgelt piiratud vaatlustoe ulatus. Seejärel tuleb fikseerida versioon,
läbida sama puhta commit'i täielik CI, ehitada deterministlik pakett,
uuendada privaatne plugin ja kontrollida automaatselt pakutavat käivitajat.
Staatilise pakkijakatse lisamine iseenesest uut pluginaväljalaset ei avalda.
