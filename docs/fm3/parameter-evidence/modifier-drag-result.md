# Wahi Min/Max: sisestusviis ja lohistamise edasisuunaline mudel

Järgnev etapp: [op82 transport ja arvutustäpsus](modifier-transport-result.md).
Ühismälupaketi rada on nüüd leitud; kolm lohistamiskandidaati sobivad kõigi
nelja uuritud arvutusrežiimiga. Tööaegse MODE1 täielik tõend jääb lahti.

22.10.2026. **Kolm olemasolevat Min/Max mõõtmist sobivad native-koodist
tuletatud lohistamismudeliga 3/3.** See on tingimuslik mudelivastavus, mitte
salvestatud hiiretrajektoori taasesitus ega kogu väärtusvahemiku kirjutustugi.
Tootmisplugin **0.3.13**, uusi füüsilisi eksporte **0**.

## Kasutaja tõend ja selle mõju

Kasutaja kinnitas Min/Max-i muutmise hiirega lohistades ja teiste arvuliste
väärtuste sisestamise klaviatuurilt. Täpne ütlus ja ulatus on failis
`modifier-input-method-evidence.json`. See seob kolm Min/Max punkti hiirega
sisestamisega ning 18 muud muudetud arvulist punkti tekstisisestusega.
Täpseid koordinaate, muuteklahve, hiirerežiimi ega juhtmepaketi float-bitte
see ei lisa. Attacki sisestatud/kuvatud arvu vastuolu jääb alles.

**655 ühiku samm ratta/nooleklahvi operatsioonidest ei ole enam nende
mõõtmiste põhjendatud seletus.** Varasem aritmeetiline kokkulangevus säilib
ajaloolises audit'is, kuid F12/F8 sammuarvutus ei ole praegu põhisuund.

Varasem „0/3 täpset lineaarset vastet” võrdles kuvatud arve 2.50/7.50/5.00
täpsete sisendväärtustena. Lohistamine saadab nupu normaliseeritud asendi.
Kuva ümardamine ei muuda seda asendit täpselt veerandiks, kolmveerandiks või
pooleks. Seetõttu **0/3 ei lükka ümber normaliseeritud sisendi lineaarset
uint16 kodeerimist**. Täpse teksti mudeli tulemust ei peideta, vaid selle
tähendus parandatakse vastavalt uuele sisestusviisi tõendile.

## Uued staatilised leiud

Kasutati eelmises etapis saadud Maci REA/Ghidra paketti ja olemasoleva
SHA-256-ga kinnitatud editori binaari täiendavat Capstone'i lugemist.
Selles etapis uut Maci REA käivitust ega firmware dekompileerimist ei tehtud.

| Lüli | Tulemus |
| --- | --- |
| FM3 factory `0x1000b48ac…0x1000b48c4` | Saadab vtable'i pesasse `+0x188` **300.0f**, bitid `0x43960000`. See konstant pärineb koodist, mitte mõõtepunktide sobitamisest. |
| Setter `0x10025d890` | Poolulatus `f32(f32(f32(degrees × 0.5) × π) / 180)`; vastandmärgiga piirid `+0x3cc/+0x3d0`. 300° korral ±2.6179940700531006. |
| Varasem 270° väärtus | Konstruktoris on ±2.356194496…, kuid factory muudab ulatust. Ainult konstruktori vaikimisi väärtus annaks vale mudeli. |
| Hiirerežiim `0x1000b48c8…0x1000b48f8` | Eelistus 1 seab režiimi 0 (lineaarne); 2 seab režiimi 1 (ringliikumine). Toonast runtime-eelistust ei ole salvestatud. |
| ModifierDialog `0x10017ba20…0x10017ba40` | PID1/2 eriharu nullib pöördnupu tekstimuutmise lipu `+0x3b0` ja readout'i lipu `+0x38a`. Tavaline Min/Max tekstimuutmine lülitatakse välja. |
| Hiirevajutuse handler `0x10025c5a0` | Tekstimuutmise avamine kontrollib sama `+0x3b0` lippu. |
| Lohistamine `0x10025c6ec…0x10025c71c` | Lineaarse tavarežiimi samm: `angle += f32(f32(1.5 × (-d)) / -180)`, kus `d = Δx − Δy`. Igal käsul float32 ümardus. |
| Sündmus ja salvestamine | Muutunud nurk → sündmus 4 → op82; `(angle-low)/(high-low)` → varem leitud FW13 `×65534 + 0.5`, TRUNC, clamp ja uint16 kirjutus. |

PID on pöördnupu juure suhtes `+0x212`: protokolli alusobjekti nihe `+0x108`
pluss PID väli `+0x10a`. Min/Max-eriharu kontrollib `(PID − 1) <= 1`.
See vähendab vajadust otsida nende mõõtmiste seletust tekstigetter'i
kordajast. Dünaamiline kuvaskaleerimine ja teised sihtparameetrid jäävad
eraldi uurimisobjektideks.

## Edasisuunaline kontroll

Mudel võtab olemasolevast tõendist **algse raw-sõna ja soovitud kuvanäidu**.
Siis otsib ta −800…800 täisarvulise koordinaadimuutuse hulgast sellise,
mille tulemus mahub vastava kahe komakohaga kuvanäidu vahemikku.
Mõõdetud lõppsõna ei kasutata liikumise valimiseks; seda võrreldakse alles
pärast kandidaadi leidmist. Iga sihi jaoks leidus mudelis täpselt üks kandidaat.

| Katse | Tõendatud algsõna | Mudeli `Δx−Δy` | Ennustatud raw | Mõõdetud raw | uint16 LE baidid |
| --- | ---: | ---: | ---: | ---: | --- |
| Min 0.00 → 2.50 | 0 | +157 | **16375** | **16375** | `f7 3f` |
| Max 10.00 → 7.50 | 65534 | −157 | **49159** | **49159** | `07 c0` |
| Max 7.50 → 5.00 | 49159 | −157 | **32784** | **32784** | `10 80` |

157 tähendab editori hiirekoordinaatide kombineeritud muutust. See ei tõenda,
et füüsilise hiire või ekraanikursori liikumine oli täpselt 157 pikslit.
HiDPI, koordinaadisüsteem, ringrežiim ja muuteklahvid on eraldi asjaolud.
Tegelik ajalooline sündmuste jada pole teada.

Mõõdetud sõnad vastavad lineaarsel tagasiteisendusel ligikaudu väärtustele
**2.498702963**, **7.501297037** ja **5.002594073**, mis sobivad kuvanäitudega
2.50, 7.50 ja 5.00. Mudeli üksik-sündmuse floatid on vastavalt
`0x3e7fdec5`, `0x3f40084e`, `0x3f0010cf`; need on **arvutatud kandidaadid**,
mitte salvestatud MIDI/USB sisendid.

Kontroll hõlmab ka **kõiki ühesuunalisi täisarvulisi jaotusi**, millega sama
157-ühikuline liikumine võib jaguneda mitmeks sündmuseks. Dünaamiline
programmeerimine leiab float32 nurga vähima ja suurima saavutatava väärtuse;
mõlemad annavad iga mõõtmise puhul sama õige raw-sõna. See ei hõlma
suunamuutusi, vahepealset seadmetagasisidet ega režiimi vahetamist.

Mudel eeldab 300° ulatust, lineaarset hiirerežiimi, tundlikkust 1.5,
algoleku float32 normaliseeritud tagasilugemist ning tavapärast kahe
komakohani kuvamist. Mitte kõik need runtime-tingimused pole ajaloolise
katse kohta salvestatud. Järeldus on **3/3 tingimuslik edasisuunaline vastavus**,
mitte ainuvõimaliku ajaloolise sisendi tõestus.

## Kontrollid, piirid ja järgmine samm

- 12 uut räsiga kinnitatud koodi-/tabelipiirkonda; uut native-binaari ei levitata.
- 4 mudelitesti: kuvanäidust liikumise leidmine; 270°/300° eristamine;
  jaotuste äärmuste võrdlus kõigi väikese juhu kompositsioonidega; tundlikkus ja clamp.
- 65 535 raw-koodi keskpunkti normaliseerimine ja tagasiteisendus läbib
  tarkvaramudelis. See on **mudeli kontroll, mitte 65 535 seadmemõõtmist**.
- 21 olemasoleva mõõtepunkti audit ning varasemad 23 väärtusetee ja 19 SHARC
  kontrollpiirkonda läbivad. Tavaparameetrite 18/18 sobivus säilib.

```sh
python3 tools/fm3/test-modifier-drag.py
python3 tools/fm3/modifier_drag_audit.py --editor /absolute/path/FM3-Edit-arm64
```

**Järgmine samm:** lõpetada op82 float-paketi transpordi ja SHARC
arvutustäpsuse kontroll. Seejärel saab valmistada eraldi piiratud kandidaadi
kanonilise soovitud väärtuse kodeerimiseks, säilitades seniste mõõtepunktide
täpsed sõnad. Täpselt 2.50 taotlemine ja hiirega kuvanäiduni 2.50 jõudmine
ei pea andma sama sõna; API peab seda eristust üheselt kirjeldama.

Uut eksporti praegu ei küsita. Generaatori uut kirjutustuge ei lisatud;
`fullRangeEncodingProven=false`. Leid ei üldistu teistele modifikaatori
sihtidele ega logaritmilistele vahemikele.
