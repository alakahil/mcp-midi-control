> **Koondkatse A on 21.10.2026 tehtud ja üle vaadatud.** Kõik kümme välja
> muutusid kõrvalmuudatusteta. [Tulemus ja järgmine koondkatse B](modifier-batch-a-result.md).
> Allpool säilib A algne katseplaan; seda ei ole vaja korrata.

# Vähem füüsilisi ekspordikordi: modifikaatorite koondkatse

21.10.2026 kasutaja soov: mitu parameetrikontrolli ühe ekspordiga. See plaan
asendab eraldi Max 10.00 → 7.50 ekspordi juhise. Avaldatud plugin jääb 0.3.11;
varasem 0.3.12 kandidaat `551602329585dffe12cd8d9c549f411d931f5cf2` säilib.

## Järeldus ja alus

Kümne allesjäänud välja esimese uue punkti saab koguda **ühe SYX-ekspordi**
ja ühe loetava modifikaatori ekraanipildiga. Täieliku skaala jaoks võib vaja
minna teist erinevate väärtustega koondkatset ning ainult ebaselgete väljade
üksikkatseid. Ekspordikordade lõpparvu ei saa enne tulemusi garanteerida.
Kümme koos muudetud välja ei ole kümme sõltumatut üksikmuudatuse katset.

Väljad on eraldi 16-bitistes sõnades. Kordasin tegelikust FM3-Edit 1.07.17
Windows PE64 binaarist kõigi **25 MOD-välja** nimede/PID-de vastenduse lugemist:
ainulaadsed sümboliviidad, 16-baidised deskriptorid ja kogu tabel kattuvad
varem kinnitatud poliitikaga. Binaari SHA-256 on
`c06f993530057214205a64330116a823e5b31507610d1792c1f3617725d6e927`.
See oli olemasoleva `six_field_resolution.py` parseri tegelik staatiline töö,
mitte uus REA/Ghidra käivitus, üldise arvukodeeringu tõend ega seadmekatse.
Masinloetav plaan ja päritolu: `modifier-batch-plan.json`.

## Esimene koondkatse

Jätka kasutaja viimase Min-ekspordi seisust:
`FM3_MOD_MIN_2p50_export..syx`, SHA-256
`11fcb7084d099429f845d7ef27b31d6bd74fa3883cfd5dec27424d771a5cdf13`.
Uut algseisu eksporti pole vaja. Kui seadistus on muutunud, säilita oma töö ja
impordi see olemasolev fail tööpuhvrisse. Ava Wahwah 1 → Control → Modifier.

| Väli | Algseis | Katse siht | Sõna / keha nihe |
| --- | --- | --- | --- |
| Max | 10.00 | 7.50 | 2 / 1588 |
| Start | 0.0% | 10.0% | 3 / 1590 |
| Mid | 50.0% | 40.0% | 4 / 1592 |
| End | 100.0% | 90.0% | 5 / 1594 |
| Slope | 50.0% | 60.0% | 6 / 1596 |
| Attack | 10.1 ms | 100.0 ms | 7 / 1598 |
| Release | 0.0 ms | 250.0 ms | 15 / 1614 |
| Scale | 1.000 | 1.500 | 13 / 1610 |
| Offset | 0.0% | −10.0% | 14 / 1612 |
| Off Value | 5.0% | 20.0% | 12 / 1608 |

- Muuda ainult tabeli kümmet välja. Min jääb **2.50**, Source **External 1**,
  Channel **All**, Auto Engage **Off**, Damping **Linear**, PC Reset **Off**,
  Update Rate **Slow**. Säilita nimi `JB RHYTHM LEVEL -3`, Scene 2 ja bypass.
- Kasuta arvulist sisestust, kui redaktor seda võimaldab. Kui näit ümardub,
  nt 100.0 asemel 100.1 ms, säilita tegelik näit ja kirjelda seda; ära tee
  ümarduserinevuse tõttu eraldi eksporti. Kui väli on lukus, jäta see muutmata
  ja märgi ära; selle avamiseks ära muuda lisavälju.
- Ära liiguta pedaali ega lohista graafikut. Kõvera kuju ja võimalik klippimine
  võivad väärtustega muutuda; neid ei käsitleta kõrvalise seadistusmuudatusena.
- Pärast kõiki muudatusi tee **üks loetav ekraanipilt** kõigist väärtustest.
  Kui need ei mahu ühele pildile, võib pilte olla mitu; SYX-ekspordist piisab ühest.
- Ekspordi terve preset välise failinimega **FM3_MOD_BATCH_A_export.syx**.
  Preseti sisemist nime ära muuda. Lisa „Muutsin ainult koondkatse tabeli välju”
  ning võimalikud tegelikud kõrvalekalduvad või muutmata näidud.

## Tulemuse kontrollimine

`node tools/fm3/compare-modifier-batch.mjs /ABS/FM3_MOD_BATCH_A_export.syx`

Võrdleja kontrollib kinnitatud algfaili räsi, kaadreid, CRC-d, footer'it,
päiseid, nulltäidet ja tervet lahtipakitud sisu. Lubatud muutused on ainult
kümne valitud sõna 20 baidis; siht, allikas, Min, stseenid ja ülejäänud keha
peavad säilima. Iga välja toorsõnad ja muutuse puudumine esitatakse eraldi.
Oodatud kuvanäit ei muutu automaatselt vaadeldud väärtuseks; `actualDisplay`
on enne inimese/pildi kontrolli null. Kõrvalmuudatuse või ebaselge seose
korral säilib kogu tõend ning järelkatse tehakse ainult vajalikule alamhulgale.

Väljumiskood 0 tähendab ainult valitud aladega piirduvat muutust. Ka osaline
koondkatse võib anda selle koodi; puuduolevad muudatused loetletakse.
Täisvahemiku valemit, sõltumatust, DSP-d ega kirjutusluba võrdleja ei kinnita.
Sünteetiline 8-testiline kontroll hõlmab kümmet välja koos ja eraldi,
muutmata/vigast faili, kõrvalmuudatusi, toorkoodide äärmusi ning failide säilimist.

## REA ja muud võimalused

- **REA/Ghidra:** olemasolev 12.10 native-audit sisaldab kasutajaliidese väärtuse
  teisendamise ning MIDI-paketi koostamise jälgi. See ei tõenda kogu
  modifier-väärtus → preseti uint16 teisendust. Min/Max on FW13 cache'is
  sihtparameetrist sõltuvad kohatäited; nende tabelis olevad nullid pole nullvahemik.
  Sihitud järgmine uurimine on Wah Control'i Min/Max teisendus, sisestuse ja nupu
  erinevus, ümardamine, ajaväljade ühikud ning Scale'i klass. Uurimine saab
  vähendada vajalike proovipunktide arvu, kuid koodi/mõõtmise lahknevus jääb nähtavaks.
- **A–D korraga:** sobib sõltumatutele plokiparameetritele, nagu varasemad Amp/Cab/FX
  kogumised. Praegune modifikaator on **ALL**; nelja kanali vahetamine ei anna
  nelja sõltumatut modifikaatoriseadistust. Uute seoste loomine oleks eraldi töö.
- **Automaatne kohalik lugemine:** tulevikus saab käsitsi eksportimist vähendada
  kohaliku koguja abil. Olemasolev GET/read-only rada tuleb modifikaatorite jaoks
  eraldi kinnitada; MIDI vastuse vorming ei ole sama mis presetisõna. Automaatset
  dump-kogujat ega kasutaja Maci GUI-automaatikat selles sammus ei käivitatud.
- **Tarkvaratestid:** teadaolevad koodid, kombinatsioonid, piirangud, pakendamine
  ja tagasilugemine kontrollitakse arvutis. Need ei vaja uut füüsilist eksporti
  ning neid ei loeta uuteks seadmemõõtmisteks.

REA ametlikud juhendid kontrollitud 21.10.2026:
https://github.com/morluto/rea
https://github.com/morluto/rea/blob/main/docs/native-investigation.md
Native-analüüs kasutab Ghidrat, Hopperit või IDA-t; saada on ka staatilisi tööriistu.
REA MCP-tööriistu siinses vestluses ei pakuta ning CLI/native-mootorit ei leitud
kontrollitud käivitusrajal. Pluginaotsing ei leidnud sobivat REA ühendust.
Uut REA paigaldust ega mudeli/hosti seadistust pole selle koondkatse jaoks vaja.

Fractali ametlik käsiraamat kirjeldab nende väljade funktsioone ja
modifikaatori jagamist kanalite vahel (FW7.x juhendi käitumiskirjeldus;
FW13 asukohad kontrolliti eraldi):
https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf
