# FM3 Sound Architect 2 — kontrollitud 0.3.15 kandidaadi taastamine

**Avaldamine on ootel.** Privaatne plugin ja hostikäivitaja on endiselt 0.3.14.
See varukoopia säilitab 0.3.15 lähtecommit'i `981806a528934d2196a3f29f98fb38328693f705`
53/53 offline-testi, paketikontrollid ja tööaruande versiooni 40.
PR #16 on valmis ülevaatuseks, kuid ühendamata. Kolm CI-töövoogu läbisid.
`native-matrix` Linux x64 läbis; macOS arm64 jäi GitHubi käivitusjärjekorda,
esimene töö tühistati ilma runner'i ja ühegi testisammuta. Üks põhjendatud
korduskatse on ootel. Täpne seis ja töö ID-d on `publication/ci-checkpoint.json`.

## Sisu

- `offline/`: puhta täpse lähtecommit'i 53/53 raport ja kõik logid.
- `publication/`: kandidaadi pakett, käivitus, PR-puu samasus, Gitist taastamine
  ning CI seis; siin ei ole 0.3.15 avaldamiskviitungit.
- `forward-initial/`, `forward-final/`: mõlemad värske agendikonteksti
  kasutuskatsed, sh esimese juhendivea tulemus ja parandatud juhend.
- `review/`: muudetud lõppfailide katsed, tühikutega failitee viga, katkestatud
  ning varasema commit'i kontrollid. Need ei asenda lõplikku 53/53 kviitungit.
- `reports/`: täielik tööaruanne, versioon 40 koos muutmata varasema ajalooga.
- `snapshot.json`, `verify-backup.py`: täielik failinimekiri, suurused ja räsid.

Algset kasutaja koondeksporti ei lisata avalikku reposse. Varem jäädvustatud
Volume'i 166-baidine doonor ja selle tõendid on generaatori lähtecommit'is.
Varukoopia ei muuda mootori versiooni ega tõendi ulatust. Absoluutsed teed
vanades logides tähistavad käivitamise kohta; taastamisel pole neid vaja.

## Kontroll

Repo juurkaustast:

```bash
python3 backups/fm3-sound-architect-2/0.3.15/verify-backup.py
```

## Täpse kandidaadi taastamine ainult Gitist

Vaja on Git-i, Python 3 ja Node.js-i. Käivita repo juurkaustast:

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.15"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" 981806a528934d2196a3f29f98fb38328693f705
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" \
  --commit 981806a528934d2196a3f29f98fb38328693f705 \
  --tests "$FM3_BACKUP_ROOT/offline/summary.json" \
  --output "$FM3_RESTORE_ROOT/rebuilt"
tar -xzf "$FM3_RESTORE_ROOT/rebuilt/fm3-sound-architect-2-0.3.15.tar.gz" \
  -C "$FM3_RESTORE_ROOT/rebuilt"
node "$FM3_RESTORE_ROOT/rebuilt/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-self-check.mjs" \
  981806a528934d2196a3f29f98fb38328693f705
```

See kasutab algset testikviitungit; see ei väida uut 53/53 testikäivitust.
Arhiivi SHA-256 peab olema
`2da1c745246df270e7b69eb1da6c35f2f417838e11443f0232c45ed8e2ac0dc6`.
Manifesti SHA-256:
`0e0c2adca5e57ec531b31550dfe97547c025763006e79b7573d5fea0992a5bff`.
Enesekontroll peab kinnitama 0.3.15, lähtecommit'i ja 3141 lähtefaili
(kokku manifestiga 3142). Arhiivi baitidentne taastamine on juba kontrollitud.

## Jätkamise järjekord

Kontrolli macOS CI korduskatset. Edu korral ühenda PR #16, avalda täpne
kontrollitud kandidaat sama privaatse plugina uue release'ina, võrdle avaldatud
arhiivi kõiki faile ning uuenda alles seejärel hostikäivitaja release-sidumist.
Hostikäivitaja 0.3.14 varukoopia jääb kausta `../0.3.14/launcher/`.
Uut seadmeeksporti, SET-i, STORE'i ega Maci REA analüüsi selleks vaja pole.
