# FM3 Sound Architect 2 - 0.3.25

25.10.2026 avaldatud privaatne plugin ja 26.10.2026 main-harusse ühendamiseks
koondatud arendusliin. See koondamine toob main-harusse seni eraldi harudes
olnud 0.3.18-0.3.25 lähtekoodi, testid ja tuletatud tõenditabelid.

## Avaldatud mootori identiteet

| Väli | Kinnitatud väärtus |
| --- | --- |
| Plugin | FM3 Sound Architect 2 / 0.3.25 / USER / PRIVATE |
| Release | `pluginrel_6ade605c31288191b4df36fe42804890` |
| Mootori lähtecommit | `0e531150092cdf0aa06b25fdeec49ffd3e8f8c01` |
| Manifesti SHA-256 | `5540d8937437a56aaf53a65b4b5e8b11ab3b3cb30aabbfd8fd7b776ad5f2647f` |
| Algse väljalaske CI | [40227730662](https://github.com/alakahil/mcp-midi-control/actions/runs/40227730662) |
| Kontrollid | 70/70 kohustuslikku offline-testi; CI lisakontrollid; deterministlik pakett |
| Serveripaketi võrdlus | 3247 faili vastavad testitud paketile |
| Käivitaja commit | `dcfc2e84c29840c201a759fe9af56ecb94bb23ee` |

Main-haru ühendamiscommit ja ülaltoodud avaldatud mootori lähtecommit on eri
rollides. Ühendamine säilitab algse lähtecommit'i ajaloos; avaldatud paketi
manifesti ega käivitaja sidumist ühendamise tõttu ümber ei kirjutata.
Mootori faile see dokumentatsioonilisand ei muuda ega avalda uut pluginaversiooni.

## Auditi punktide 2-6 tulemus

- **2. SYX/TXT/spec/raport:** täielik deterministlik taasesitus, sisuliste
  rikkumiste tõrjumine uuendatud räsidega, kirjutusvigade kaitsed ning
  47 ajaloolise SYX-i baittäpne taastamine.
- **3. Parameetrikaart:** `--parameter-map`, 3223 pere/PID võtit, eraldi
  efektiivne skaala ja ajalooline tõend, rangem dekooder ning
  67 515 216 lubatud salvestussõna tarkvarakontroll.
- **4. Igapäevane juhtimine:** modifikaatori elutsükli staatiline analüüs,
  allikate ja kirjepesade inventuur ning globaalsete sõltuvuste selgem eristus.
  Üldine jaotaja ega samaaegse Wah/Volume seose kirjutaja ei ole lisatud.
- **5. Ruudustik:** `--inspect-grid`, ühendamata Scene MIDI kontrolliparandus,
  seitsme algse vastuse / 336 lahtri taasesitus, 65 536 maski ja
  11 264 ühendusjuhtu; 384 tehasepreseti kohalik korduslugemine.
- **6. Ülejäänud pered:** 13 pere / 515 PID-i tüübireeglid, kanalipiiride,
  tervikfailide ja vigaste sisendite kontrollid; 24 576 Scene MIDI tarkvarajuhtu.
  MultiDelay metaandmed on ainult lugemiseks.

Täpsed ulatused, allikaräsid ja taasesitamise käsud on
[tõendiregistris](parameter-evidence/README.md) ning
[punkt 2](parameter-evidence/point2-output-replay.json),
[punkt 3](parameter-evidence/point3-parameter-map.json),
[punkt 5](parameter-evidence/point5-grid-audit.json) ja
[punkt 6](parameter-evidence/point6-offline.json) tabelites.
Punkti 4 elutsükli tõend on
[eraldi analüüsis](parameter-evidence/modifier-lifecycle-result.md).

## Võrdlusaruanne ja allesjäänud katsed

[FM3 auditi edenemisaruanne 25.10.2026 (PDF, 10 lk)](audits/FM3_Auditi_edenemisaruanne_2026-10-25.pdf)
võrdleb 24.10 aruande 0.3.18 seisu versiooniga 0.3.25. See kirjeldab täiendusi,
kuut järelkatset T1-T6, lõpetamistingimusi, vähemate eksportide tööplaani ja
edasisi seadmevaba analüüsi võimalusi.

PDF on 25.10.2026 hetkeseis: selle väide, et arendusliin ei ole veel main'i
ühendatud, kirjeldab aruande koostamise aega. Jooksvat ühendamisolekut näitab
käesoleva arendusliini GitHubi PR. PDF-i ei muudeta tagantjärele.
Avaldatud PDF-i SHA-256:
`dd4b38ea990595542b16e5d39088e641f3cbf984904bdd46c3333bc645c95238`.

Lahtiseks jäävad DIN MIDI väljund, Volume-pedaali täpsed näidud/heli ja
STORE/reload, uute kombinatsioonide import ja säilimine, bit 4 tähendus,
füüsilised I/O töövood ning tegelik heli/CPU. Üldine modifikaatorikirjutaja,
tundmatud skaalad ja dünaamilised väljad vajavad veel sihitud analüüsi.
Uusi riistvaramõõtmisi ega REA/Ghidra teenusejooksu 0.3.19-0.3.25 tööpaketid
ei lisanud. Tehasepresetite ja kommertspakettide originaalsisu ei lisata.
