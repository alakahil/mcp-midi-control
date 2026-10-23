# FM3 Sound Architect 2 0.3.17 taastamine

Privaatne plugin `plugins_6accfd716e148191b0adb61e4e36f0e4`, release `pluginrel_6adbaf0cf0d881918f7286f50ed4e36e`.
Avaldatud mootori lähtecommit **a4d142fccf35c83329163276dbdfcbf9927b0011**. PR #26 ühenduscommit `d495927f1af4d0f498c418b9a8bce7cefe161a5c`.
Hilisem varukoopia commit ei muuda pluginaversiooni ega mootori lähtecommit'i.
Salvestatud käivitaja commit `eebacc3ff8305b6daa0b3f796ae008e231b5cf9e`.

`test-summary.json`: täpse puhta lähtecommit'i 60/60 nõutud kontrolli.
`ci.json`: neli edukat ühendamiseelset töövoogu sama lähtepuuga.
`published-comparison.json`: kõigi 3185 faili baitvõrdluse ja faililoendi kontrolli kviitung.
`evidence.tar.gz`: täielikud testilogid, lähte- ja avaldatud käivitaja kasutuskatsed,
käivitaja failid, tööaruanne ning tuletatud Volume-seose tõend ja räsid.
Algset kasutaja toor-SYX-i ja täielikku Maci REA arhiivi ei ole siia lisatud.
Tööaruande ning analüüsipaketi avalikuks taastamisvarukoopiaks oli kasutaja luba.

Kontroll: `python3 backups/fm3-sound-architect-2/0.3.17/verify-backup.py`.

Taasta ainult Gitist repo juurkaustas:

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.17"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" a4d142fccf35c83329163276dbdfcbf9927b0011
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" --commit a4d142fccf35c83329163276dbdfcbf9927b0011 --tests "$FM3_BACKUP_ROOT/test-summary.json" --output "$FM3_RESTORE_ROOT/rebuilt"
```

Võrdle taastatud arhiivi SHA-256 väärtust `release-receipt.json` väljaga
`archiveSha256`. Tõendikapsli iga faili räsi on `evidence-manifest.json`-is.
Kogu kapsel on kadudeta, deterministlikult tihendatud; mootori lähtekood on Git-commit'is.

Uus tugi: `volumePedal:true`, ainult mõõdetud FW13 Ext1 → Volume/Pan 1 Gain ALL
vaikekirje. Üks uus aktiivse puhvri eksport; puudub arvuline Min/Max-skaala,
STORE/reload'i, heli või pedaali toimimise kinnitus. Uut REA jooksu selles etapis
ei tehtud. Wah Min/Max ja `fullRangeEncodingProven=false` säilivad.
