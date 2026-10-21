> **Uusim seis, 21.10.2026:** Max 7.50 → 5.00 on kontrollitud; ainult sõna 2
> muutus 49159 → 32784. Kogumisring lõpetatud: 20 uut punkti kolme ekspordiga.
> [0.3.13 kandidaat](modifier-measured-points-result.md) lisab kümne välja
> piiratud punktikirjutuse; A/B/Max kogu sisu taastatakse baittäpselt.
> Järgneb täistest, pakend ja avaldamisluba; uusi korduseksporte ei küsita.
>
> **Varasem tulemus, 21.10.2026:** koondkatse B üheksa uut punkti on üle vaadatud.
> Release 999.9 ms klapib; Max jäi 7.50. Kõrvalmuudatusi pole. A+B annavad
> 19 uut väljapunkti kahe koondfailiga. Järgmine füüsiline samm on
> [ainult Max 7.50 → 5.00](modifier-batch-b-result.md); B üheksat välja ei korrata.
> Täisvahemiku, sõltumatuse ega kirjutustoe laiendust sellest ei järeldatud.
>
> **Varasem tulemus, 21.10.2026:** koondkatse A läbis. Kümne välja 20 baiti
> muutusid, ülejäänud 14 202 säilisid. Pildil Attack 99.9 ms; kasutaja tekstis
> 9.99 ms säilib vastuoluna. Release 249.9 ms. Järgmine samm on
> [koondkatse B ühe ekspordiga](modifier-batch-a-result.md), mitte A kordus.
> Täisvahemiku ega uue kirjutustoe kinnitust sellest ei järeldatud.
>
> **Ajalooline plaan allpool, 21.10.2026:** kasutaja soovib vähem füüsilisi ekspordikordi.
> Eraldi Max-katse asendab [10 välja ühe ekspordiga koondkatse](modifier-batch-plan.md).
> Min-i kinnitatud tõend ja 0.3.12 kandidaat säilivad; uusi kirjutusõigusi ei lisatud.

# Uuem seis: Min-paar kinnitatud, 0.3.12 kohalik kandidaat

21.10.2026 uus kasutajatõend kinnitab Min 0.00 → 2.50; ainult sõna 1 muutus
0 → 16375. Muud 14 220 sisubaiti säilisid. Esialgne 16383/16384 hüpotees
lükkus selle ekspordi puhul ümber. Kuvatõend ja kasutaja algseisu kinnitus
on salvestatud `wah-min-evidence.json` kirjes.

0.3.12 lähtekood lisab ainult `wahMin: 0 | 2.5` mõõdetud punkti kirjutuse
External 1 → Wah 1 Control ALL seosele. Täisvahemik ja Max jäävad lahendamata.
Sihttest läbis 12 taastet, 48 sünteetilist kombinatsiooni, 69 tõrjumist ja
4 A–D lukukontrolli. Täieliku 47-testilise suite'i ning pakendi tulemus
seotakse eraldi kohaliku puhta commit'i kviitungiga; seda ei eeldata ette.

PR #12 tipu `14387684d0d0e10b6c02e6301f8922879e27b136` kõik neli CI-käivitust
on edukad. Need kontrollid kuuluvad eelmisele uurimissammule, mitte uuele
0.3.12 kandidaadile. Avaldatud plugin on endiselt 0.3.11 / `f0a99bc`.
Uue SYX-i ja kuvatõendi teksti avalikuks lähtereposse lisamiseks on vaja
selle uue sisu avaldamisluba. Algset ekraanipilti ei avaldata.

Järgmine üksikmuudatus: sellest samast Min 2.50 seisust **Max 10.00 → 7.50**.
Täpne juhis on `modifier-min-plan.md` alguses. Min-katset ei korrata.
Allpool olev korpuse audit kirjeldab selgesõnaliselt avaldatud 0.3.11 alust;
selle loendureid ei tõlgendata uue kandidaadi või uute sõltumatute mõõtmistena.

---

# FM3 Sound Architect 2: seis ja järgmine töö, 21.10.2026

Kontrollitud avaldatud lähtepunkt on **0.3.11**, commit
`f0a99bc190fcbe3a63284335c68fad66e9f9a36c`. Käesolev arendusharu lisab
uurimisvahendid ja plaani, mitte uue tootmisväljalaske.

| Auditi etapp | Seis | Allesjääv töö |
| --- | --- | --- |
| 0. Arendusliinide ühendamine | Valmis | Säilitada ühendatud tõendid ja regressioonid. |
| 1. Ühtne sisend ja võimekused | Põhirada valmis; täielik katvus osaline | Ühine fm3-preset, skeem ja tõrjuv sisendikontroll on olemas. Kõik FW13 pered, eksemplarid ja sõltuvused pole ühes täielikus registris. |
| 2. Lõplik SYX/TXT/spec/raport | Valmis toetatud rajal | Säilitada lõpp-SYX-ist tuletatud neljafaililine tulemus. |
| 3. Parameetrikaardistus | Suur osa tehtud, jätkub | Tõendiregister, tüübi/tempo reeglid ja Pitchi parandused on olemas. Kõik väljad ja skaalad pole kinnitatud; globaalskaalade arvuväli on eraldi lahendamata. |
| 4. Igapäevane juhtimine | Praegune põhietapp | Wah' allikalülitus, kaks Auto Engage ja kaks Damping valikut on olemas. Min/Max, kõver, Attack/Release, laiemad Controllers ja Volume/Pan vajavad tööd. |
| 5. Üldine graaf ja plokkide elutsükkel | Osaline alus | Kahe rea paigutus ja toetatud plokkide lisamine olemas. Täielik 4×12 graaf, eemaldamine, korduvad plokid, Input2/Output2 ja 4CM on veel ees. |
| 6. Ülejäänud plokipered | Suures osas ees | Mixer/Multiplexer, Volume/Pan, gate, Multiband, Multi-Delay/Plex ja muud auditis nimetatud pered. |
| 7. Heli, CPU ja loo lähendus | Presetipõhiselt osaline | Varasemad kinnitused säilivad. Uute koosluste pedaal, heli, CPU ja üleminekud vajavad oma kontrolli. |
| 8. Pakendamine, CI ja laadimine | 0.3.11 väljalaskel läbitud | Iga järgmise tootmisväljalaske kohustuslik värav. |

Üht üldist valmisolekuprotsenti ei anta: kõigi sihtfirmware funktsioonide
nimetaja ja võrreldavad katvustasemed pole veel terviklikult määratud.

## Järjekord

1. **Nüüd:** modifikaatorite allesjäänud väljade tõendiaudit ja üks Min-katse.
   Valminud on korratav korpuse täiendkontroll ning muutmata andmeid kaitsev
   lugemisvõrdleja. [Katsejuhend](modifier-min-plan.md).
2. **Pärast Min-tõendit:** otsustada täpne piiratud kirjutusulatus; seejärel
   Max-i ja vajadusel lisapunktide katse. Järgmiseks kõvera Start/Mid/End/Slope,
   Scale/Offset ning Attack/Release ja Off Value. Kasutada seniseid algnäite,
   rühmitada katsed alles siis, kui asukohad ja sõltumatus on kinnitatud.
3. **Praktiline juhtimine:** Volume/Pan ja sisend-gate, laiemad
   kontrolleriseosed ja presetist eraldi pedaali/MIDI juhis; üks esinduslik
   päris pedaali käitumiskontroll pärast sobiva kirjutustoe valmimist.
4. **Cab ja eksemplarid:** IR-režiim/pesa/sõltuvused, seejärel korduvad plokid
   ja üldisem graaf; alles pärast seda suuremad puuduvad efektipered.
5. **Muusikaline kontroll:** sama DI-lõigu võrdlus, stseenitasemed,
   üleminekud, efektisabad ja CPU uutele kombinatsioonidele.

Globaalsete skaalade arvukodeering on eraldi uurimisharu. Olemasolev
tekstipõhine vaatlusrežiim jääb kasutatavaks ja selle töö pärast ei korrata
kõigi 32 skaala kogumist. PEQ, GEQ, Enhanceri, Auto Engage'i ega Damping'u
valmis kogumisi ei alustata otsast.

## Selle sammu kontrollitav tulemus

- Avaldatud paketi kontroll: 3117 lähtefaili räsid ja runtime enesekontroll
  vastavad kinnitatud 0.3.11 commit'ile. Varasema 46/46 suite'i ja
  avaldamisjärgse hostikatse kviitungid on varasemas töötulemuses; neid ei
  esitata selle uurimissammu uute riistvarakatsetena.
- 13 valitud väljast kaks on tõendatud enumipaarid; 11-l puudub
  üksikmuudatuse ekspordipaar. Muutmata näidud on siiski olemas.
- 701 kordumatut SYX-i; 691 toetatud, 10 ajaloolist välistust,
  4 modifikaatoriala profiili. Detailid ja kordusarvutus:
  `modifier-remaining-audit.json`, `tools/fm3/modifier_remaining_audit.py`.
- Min-võrdleja kontrollib ainult üht sõna; vale alus, vigane fail, nime,
  stseeni, teiste sõnade ja kaugete kehaosade muudatused tõrjutakse.
- Ühtegi uut kirjutusvõimekust, seadmeühendust ega oletusliku Min-koodiga
  kasutajapresetit ei loodud. Min-katse tulemus on veel ootel.
