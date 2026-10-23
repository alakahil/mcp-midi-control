> **22.10.2026 täpsustus:** kasutaja kinnitas Min/Max-i hiirega lohistamise ja teiste arvude tekstisisestuse. [Uus lohistamismudel](modifier-drag-result.md) ennustab kolm Min/Max sõna tingimuslikult 3/3. Allpool olev 0/3 võrdlus kasutab kuvanäitu täpse sisendina ega lükka ümber tegeliku normaliseeritud sisendi lineaarset kodeeringut.

# Modifikaatori vaheväärtuste uurimine — 21.10.2026

22.10 jätkuanalüüs: [getter, metadata-pakkuja ja FW13 dispatch](modifier-value-path-result.md).
Allolev 21.10 tulemus ja selle avaldamise ajalugu on säilitatud muutmata.

**Uurimisring on tehtud olemasolevate failidega: 0 uut füüsilist eksporti.**
Avaldatud plugin on endiselt **0.3.13**. Tootmiskoodi ega toetatud väärtuste
hulka see uurimismuudatus ei laienda.

## Arvuline tulemus

Kontrolliti A/B/Max-i 20 muutunud väljapunkti ning varasema Min-katse üht
muutunud punkti. Need on 21 punkti neljast varem kogutud ekspordist,
mitte 21 sõltumatut riistvarakatset. Nullpunktide ja muude algväärtuste
kuvanäite ei loetud tagantjärele täpselt sisestatud arvudeks.

| Kontroll | Tulemus | Järeldus |
| --- | --- | --- |
| Start, Mid, End, Slope, Attack, Release, Scale, Offset, Off Value: 18 A/B sihtväärtust | Lähima täisarvuni ümardamise mudel sobib 18/18; nii float64 kui ka eraldi float32 astmetega | Sobiv hüpotees mõõdetud punktides; täisvahemik ja ümardamise piirjuhud pole tõendatud. Scale'i mudel on logaritmiline, ülejäänutel lineaarne. |
| Samad 18 punkti, alla ümardamine | Sobib 10/18 | Üldine alla ümardamise hüpotees ei sobi. |
| Min/Max, otsene 0…10 → 0…65534 lähima täisarvuni ümardamine | Sobib 0/3 | Seda valemit Min/Max-i kirjutamiseks kasutada ei saa. Float32 vaheastmed tulemust ei paranda. |
| Salvestatud sõna → ümardatud kuvanäit | Kõik 21 punkti sobivad katsetatud kuvamudeliga | Kuvanäidu sobivus ei tuvasta täpset sisestusvalemit. |

Min/Max-i konkreetsed vastunäited:

| Väli ja kasutaja muudatus | Lihtsa valemi ennustus | Ekspordis | Erinevus |
| --- | ---: | ---: | ---: |
| Min 0.00 → 2.50 | 16384 | 16375 | −9 |
| Max 10.00 → 7.50 | 49151 | 49159 | +8 |
| Max 7.50 → 5.00 | 32767 | 32784 | +17 |

Näiteks kuvanäiduga **5.00** sobib selle kuvamudeli korral **65 eri raw-koodi**
(32735…32799), sealhulgas nii lihtsa valemi 32767 kui ka tegelik 32784.
Seetõttu ei saa ekraanil õiget arvu näitavat teisendust veel baittäpseks
kirjutusvalemiks kuulutada. Attack/Release'i uuritud kuvanäitudele sobib
sama mudeli all üks raw-kood, kuid ka see ei tõenda teiste sisendite kvantimist.

Sisestusmudel kasutab üle vaadatud katseplaani sihtväärtusi. Klahvivajutuste
ega käsupakettide salvestust pole. A-katse Attacki vastuolu säilib:
plaanis 100 ms, kasutaja tekstis kuvanäit 9.99 ms, pildil 99.9 ms, failis
655. Mudel ennustab sisendi 100 puhul 655 ja sisendi 9.99 puhul 65;
see aitab vastuolu lokaliseerida, kuid ei asenda kasutaja ütlust.
B-katse muutumata Max 7.50 jäeti uue sisendipunktina välja.

## Uus FM3-Editi masinkoodi leid

Algne kasutaja FM3-Edit.app.zip taastati ning ARM64 osa räsi klapib
varasema REA/Ghidra auditi subjektiga:
`62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a`.
Uus analüüs tehti lokaalse Capstone 5.0.6 staatilise lugemisega. REA ühendust
ega uut Ghidra käivitust selles ringis ei kasutatud; varasemad REA tõendid
olid alusmaterjal. Rakendust ja püsivara ei käivitatud.

RTTI ja virtuaaltabel seovad leitud tee konkreetselt **ModifierDialog**-iga:

| Koht | Binaarist kontrollitud käitumine |
| --- | --- |
| `0x100179918`, hüppetabel `0x100536a00` | Sündmus 10 jõuab arvulise sisestuse harusse `0x10017afa8`. |
| `0x10017afa8` | Võtab juhtvälja getter'ist ujukomaarvu, seab operatsiooniks 9 ning jagab väärtuse definitsiooni kuvakordajaga, kui definitsioon ja nullist erinev kordaja on olemas. |
| ModifierDialog virtuaaltabeli pesa `+0x1b0` | Viib funktsiooni `0x1001796d4`; nullist erinev MOD PID suunatakse edasi `0x1000aefe4`. |
| `0x1000af2e4`…`0x1000af314` | Otsene saatmistee kopeerib väärtuse float32 kujul serializer'i struktuuri. |
| Varasema REA auditi `0x100237874` | Pakib sama 32-bitise väärtuse viieks 7-bitiseks osaks; see pole float'i arvuline teisendus preseti uint16 sõnaks. |
| Rotary getter `0x10025e9d0` | Delegeerib veel järgmise objekti virtuaalsesse getter'isse; täielik tekstist arvuks parsimine jääb lahti. |

See täiendab varasemat üldise PerformCtrl-i analüüsi just Modifier-akna
rajaga. **Ei tõendata**, et kogu teisendus toimub püsivaras: konkreetne
getter, tööajal saadav Min/Max-i sihtparameetri metadata ning seadme
operatsioon-9 töötlus ja preseti salvestus pole otsast lõpuni jälitatud.
Ka ajalooliste katsete tegelikku sündmuste rada pole salvestatud.

Säilitatud on ainult **426 baiti** piiritletud tõendilõike, nende aadressid,
räsid ja lühike disassambleering. Algset programmi ei lisatud reposse.

## Kordamine ja järgmine samm

```sh
python3 tools/fm3/modifier_quantization_audit.py
python3 tools/fm3/modifier_quantization_audit.py --editor /absolute/path/FM3-Edit-arm64
```

Esimene käsk kontrollib olemasolevate SYX-ide räsisid, parsib päris failid,
võrdleb MOD-sõnu tõendikirjetega, loeb FW13 metadata ning kordab mudelite
võrdluse. Samuti kontrollib see native-lõike ja võrdleb tulemust salvestatud
auditiga. Teine kontrollib kõiki 426 tõendibaiti lisaks õige räsiga
originaalbinaari vastu. Kumbki ei loo presetit ega suhtle seadmega.
Audit lisati kohaliku kandidaadi GitHubi FM3 offline töövoogu. Selle kandidaadi
serveripoolset CI-käivitust ei tehtud: automaatne heakskiidukontroll peatas
uue uurimissisu avalikku reposse üleslaadimise, sest praegune uurimisluba
ei kata selle sisu avaldamist. Kohalik korduskontroll ja originaalbinaari
ristkontroll läbisid; vale räsiga binaari tõrjumine kontrolliti eraldi.

1. **Järgmine uurimiskoht on täpsustatud:** lahendada getter'i `+0x188`
   konkreetne siht ja ModifierDialog-i definitsioonipakkuja `+0x460 / +0x18`,
   eriti MOD_MIN/MOD_MAX-i dünaamiline metadata. Seejärel jälitada FW13
   operatsiooni 9 normaliseerimine ja preseti uint16 salvestus.
2. Võrrelda leitud algoritmi olemasoleva **21-punktilise** korpusega ja
   eraldi uurida ümardamise piire. Min/Max-i ebatavaliste arvude jaoks ei
   konstrueerita pelgalt kolme punkti läbivat lähendusvalemit.
3. Alles juhul, kui jääb konkreetne riistvaras eristatav hüpotees, valmistada
   ette **üks koondkatse** mitme sõltumatu välja ja ühe ekspordiga. Praegu
   uut eksporti ega varasemate katsete kordamist ei küsita.

Masinloetavad tulemused: [arvuline audit](modifier-quantization-audit.json),
[native-tõend](modifier-native-entry.json),
[piiritletud disassambleering](modifier-native-entry.asm).
