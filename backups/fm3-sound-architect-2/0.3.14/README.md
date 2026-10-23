# FM3 Sound Architect 2 — 0.3.14 taastamise varukoopia

See 23.10.2026 varukoopia koondab avaldamisjärgsed tõendid, täieliku tööaruande
ja eraldi salvestatud ChatGPT käivitaja. Generaatori lähtekood ning varasemad
analüüsid ja riistvaratõendid on juba samas repos. See lisandus ei avalda uut
pluginaversiooni ega muuda 0.3.14 mootori lähtekoodi.

## Kindel lähtepunkt

- Plugin: `plugins_6accfd716e148191b0adb61e4e36f0e4`, versioon **0.3.14**, PRIVATE.
- Avaldatud release: `pluginrel_6adaf28e90708191bf43faf7c8bb2115`.
- Mootori lähtecommit: `43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b`.
- [PR #14](https://github.com/alakahil/mcp-midi-control/pull/14) ühenduscommit:
  `537035ef401b79dbd179ecc7b85bbb52da06b50e`.
- Käivitaja päritolucommit eraldi oskuste hoidlas:
  `08625c290346c5ba8643eab2725e3452a09edb9f`.

Hilisem dokumentatsiooni commit võib main-haru edasi viia. Avaldatud mootori
identiteediks jääb eespool nimetatud lähtecommit, mitte main-haru uus tipp.

## Sisu

| Kaust või fail | Otstarve |
|---|---|
| `reports/FM3_0.3.1_TOOTULEMUS_2026-10-19-2-2.md` | Täielik tööaruanne, versiooni 37 muutmata hetktõmmis; sisaldab ka ajaloolisi vaheolekuid |
| `publication/` | Avaldamiskinnitus, lõppaudit, paketi tagasivõrdlus, enesekontroll, pakendamise ja CLI kontrollid |
| `offline/` | Avaldatud lähtecommit'i 49/49 testiraport koos kõigi kontrollide logidega |
| `host-use/` | Värske agendikonteksti laadimis- ja kasutuskatse, säilimise võrdlus ning neli väljundfaili |
| `launcher/` | Salvestatud käivitaja kõik viis faili, sealhulgas juhend, release-sidumine, kontrollskript, nähtav kirjeldus ja ikoon |
| `reconstruction.json` | Selle varukoopia failidega tehtud paketi taastamise kontroll |
| `snapshot.json` | Failide täpne nimekiri, suurused ja SHA-256 räsid; manifest ise on nimekirjast välja jäetud |

Aruannetes olevad absoluutsed töökaustateed kirjeldavad katse toimumise kohta.
Need ei ole taastamiseks vajalikud; kasuta allolevaid suhtelisi teid.
Kõik algsed aruanded on säilitatud muutmata baitidega. Privaatse plugina
identifikaator ei anna ligipääsu selle kontole. Varukoopia ei sisalda
ligipääsutunnuseid ega ajutisi allalaadimislinke.

## Varukoopia kontroll

Käivita repo juurkaustas (Python 3):

```bash
python3 backups/fm3-sound-architect-2/0.3.14/verify-backup.py
```

See kontrollib täpset failinimekirja, suurusi ja räsisid. SHA-256 nimekiri
tuvastab failide muutumise; usaldusankur on üle vaadatud Git-commit.

## Mootori taastamine ainult Git-repost

Vaja on Git-i, Python 3 ja Node.js-i. Järgmised käsud sobivad macOS-i/Linuxi
terminali ning käivitatakse repo juurkaustas. Väljund tekib uude ajutisse
kausta. Salvestatud testiraport tõendab algset avaldamiseelset kontrolli;
seda ei esitata uue testikäivitusena.

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.14"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" 43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" \
  --commit 43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b \
  --tests "$FM3_BACKUP_ROOT/offline/summary.json" \
  --output "$FM3_RESTORE_ROOT/rebuilt"
python3 "$FM3_BACKUP_ROOT/launcher/scripts/prepare-runtime.py" \
  --archive "$FM3_RESTORE_ROOT/rebuilt/fm3-sound-architect-2-0.3.14.tar.gz" \
  --destination "$FM3_RESTORE_ROOT/runtime"
node "$FM3_RESTORE_ROOT/runtime/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-self-check.mjs" \
  43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b
```

Kui kasutad ainult viimase commit'i madalat klooni, too esmalt vajalik commit:
`git fetch origin 43debb6fb7f3a2cc0baf14f3b3b3debe93a0a04b`.

Taastatud arhiivi SHA-256 peab olema
`0a1b959f518db91d622943bf91f625141d0bdec5a0314745b61318968eeac5f2`.
Käivitaja kontrollib lisaks manifesti räsi
`007b538bd979986e96d99b631e2d4d6f49d82e7ff5ff537054680ffd077122b8`
ja kõiki 3129 lähtefaili. Enesekontroll peab kinnitama versiooni 0.3.14 ning
ülalnimetatud commit'i. Serverist varem alla laaditud arhiivi tihendusbaidid
olid erinevad, kuid kõik selle 3130 lahtipakitud faili kattusid kandidaadiga.

## ChatGPT käivitaja taastamine

Taastamisel kasuta `launcher/` kogu sisu ühe oskuse paketina. Säilita
alamkaustad `agents`, `assets`, `references` ja `scripts`. Seejärel salvesta
pakett kasutatava hosti toetatud oskuste paigaldamise töövooga. Pelgalt kausta
olemasolu GitHubis ei tähenda, et ChatGPT on oskuse automaatselt laadinud.

Käivitaja saab kasutada ülal taastatud mootorit `--directory` kontrolliga.
Omaniku autentitud Plugin Creatori ligipääsu olemasolul oskab see lugeda ka
sama avaldatud privaatset release'i. Uut pluginat ega väljalaset ei pea selleks
looma. Pärast taastamist kontrolli eraldi, millist oskust värske vestlus pakub,
milline release laaditakse ja millise commit'i enesekontroll tegelikult käivitus.

## Tõendi piirid

Min/Max-i kogu väärtusvahemiku kodeering ja runtime MODE1 pole tõendatud.
Avaldamisjärgne kasutuskatse oli offline: uue väljundfaili seadmeimport,
STORE/reload, pedaal, heli ja CPU ei olnud selle katse osa. Varukoopia ei
suurenda generaatori tõendatud kirjutustoe ulatust ega nõua uut seadmeeksporti.
