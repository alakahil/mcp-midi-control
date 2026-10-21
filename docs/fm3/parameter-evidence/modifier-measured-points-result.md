# Modifikaatorite kogumisring lõpetatud; 0.3.13 kirjutaja kandidaat

21.10.2026 viimane Max 7.50 → 5.00 katse läbis. Muutus ainult sõna 2,
**49159 → 32784**; ülejäänud **14 220 sisubaiti** säilisid. Pildil on
Max 5.00, Min 2.50, Attack 500.0 ms ja Release 999.9 ms. Üheksa B-välja,
allikas/kanal, Damping, Auto Engage, stseenid ja ülejäänud preset jäid samaks.
Kaadrite kontrollsummad, CRC, footer, päised ning nulltäide on korras.

Maxi tõend: `modifier-max-5-evidence.json` ja automaatne võrdlus
`modifier-max-5-comparison.json`. Pildi SHA-256:
`f4e11e731e36cfef2c373875d59caeaa8827d89be3e8dca77f9a2854ef8c295c`.
SYX SHA-256: `f4f632c005540a3f759a3960837aef70dc1e562bdb060e7671e8ebe3d1ea285f`.
Keha SHA-256: `80c4abc7c49f3995539016b19f5d085545e0aba059de5ee79bce4823f2adfdc6`.

## Mis on arendatud

Kohalik **0.3.13 kandidaat** ühendab varasema Min-toe ja kümne välja
piiratud `wahControls` kirjutuse. Punktid on täpsed ekspordist mõõdetud
koodid; suvalisi vaheväärtusi ei interpoleerita. Lubatud sisendid on:

| Väli | Lubatud väärtused |
| --- | --- |
| Max | 5.00, 7.50, 10.00 |
| Start | 0%, 10%, 20% |
| Mid | 40%, 50%, 55% |
| End | 80%, 90%, 100% |
| Slope | 35%, 50%, 60% |
| Attack | 10.1, 99.9, 500 ms; 100 sisestussiht annab 99.9 ms |
| Release | 0, 249.9, 999.9 ms; 250/1000 sisestussiht annab 249.9/999.9 ms |
| Scale | 0.750, 1.000, 1.500 |
| Offset | −10%, 0%, +15% |
| Off Value | 5%, 20%, 80% |
| Min (varasem eraldi `wahMin`) | 0.00, 2.50 |

Väärtuse puudumine säilitab selle. Vead tõrjutakse enne sisubaidi muutmist.
Nõutav on lõplik External 1 → Wah 1 Control ALL seos ja olemasolev Wah 1;
NewLookil lisatakse vajalik Wah-mall selgesõnaliselt. Aktiivse seose korral
Wah Control'i käsiväärtuse A–D lukud säilivad. Muud sihid, uued kirjed,
sekundaarsed allikad, kontrolleriseadistus ja üldine täisvahemik ei avane.

TXT ja lõpparuande näidud vastavad kontrollitud lõppsisule, sealhulgas
99.9/249.9/999.9 ms ümardustele. B Max 7.50 ning A Attacki tekstis/pildil
erinev näit säilivad tõendites; neid ei parandatud tagantjärele oletustega.

## Kontrollitase

- A, B ja Max 5.00 kõigi kolme preseti kogu lahtipakitud sisu taastatakse
  kinnitatud koostajaalusest baittäpselt. Need ekspordid ei muutu vabalt
  kasutatavateks uuteks koostajaalusteks.
- Uus sihttest: 3 terviklikku taastet, 198 tarkvaralist punktikirjutust,
  136 vigase sisendi tõrjumist, tegelike kuvanäitude ja nelja A–D luku kontroll.
- Väline failivõrdleja: **14/14 testi läbisid**, sh päris Maxi eraldatud muutus.
- 48. test on lisatud kohustuslikku offline-suite'i; kogu puhta commit'i suite,
  pakend ja kohalik kasutuskatse kinnitatakse väljalaskekviitungis ning
  töötulemuse uusimas kokkuvõttes. Nende läbimist ei järeldata sihttestist.
- Kaks koondkatset ja üks eraldatud Max-katse andsid **20 uut proovipunkti
  kolme ekspordiga**. See ei ole 20 sõltumatut riistvarakatset. Uued lubatud
  punktide kombinatsioonid on ainult tarkvaraliselt kontrollitud.
- Täisvahemiku kodeering, füüsiline sõltumatus, pedaali/DSP/heli käitumine
  ja CPU uute kooslustega jäävad eraldi piiranguteks.

## Järgmine töö

1. Lõpetada puhta kandidaadi täistest, deterministlik pakend ja kohalik
   kasutuskatse. Uut A/B/Max korduseksporti selleks ei küsita.
2. Avaldamisvalmis kandidaadi jaoks küsida projekti väljalaskejuhendi järgi
   uue Min/A/B/Max tõendi avalikku reposse viimise sisupõhine luba. Varasemad
   Auto Engage/Damping load ei kata uut sisu; originaalpilte ei avaldata.
3. Loa järel kinnitada repo commit ja CI, uuendada sama privaatset pluginat,
   võrrelda serveripakett ning kontrollida värske hosti tegelikku laadimist.
4. Edasine kodeeringutöö kasutab kogutud punkte ja olemasolevaid native-allikaid.
   Füüsiline järelkatse tellitakse ainult konkreetse lahendamata lünga jaoks.
   Pedaali/heli jaoks saab hiljem kasutada üht esinduslikku koondkontrolli.

Avaldatud plugin on seni 0.3.11. 0.3.13 on kohalik kandidaat; väljalaset,
seadmeühendust ega uut REA/Ghidra käivitust selles kirjes ei kinnitata.
