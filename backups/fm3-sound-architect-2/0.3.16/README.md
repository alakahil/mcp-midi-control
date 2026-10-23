# FM3 Sound Architect 2 0.3.16 taastamine

Privaatne plugin `plugins_6accfd716e148191b0adb61e4e36f0e4`, release `pluginrel_6adb8d341ba48191996d947712c344cf`.
Avaldatud mootori lähtecommit: **a11d8e44d0df339411d7e45ad6bea126b0bf89d5**. PR #23 ühenduscommit: `a584a51258e25b010e2c12051fcfa4b8730d90c7`.
Hilisem varukoopia commit ei muuda avaldatud versiooni ega mootori lähtecommit'i.
Salvestatud käivitaja commit: `34e13ab7c219d457e7786e5a214ae1720c625487`.

`test-summary.json` tõendab täpse puhta lähtecommit'i 59/59 nõutud kontrolli. `ci.json` seob neli edukat ühendamiseelset CI-töövoogu sama lähtepuuga. `published-comparison.json` võrdleb avaldatud paketi kõiki faile lähtepaketiga.

`evidence.tar.gz` sisaldab täielikke testilogisid, juhendi ja tegeliku avaldatud käivitaja kasutuskatseid, käivitaja viit faili, tööaruannet, räsidega kviitungeid ning eraldi superseded-katsete diagnostikat. `evidence-manifest.json` loetleb kõik sisefailid. Avaldatud mootori allikas on Git-commit'is, mitte arhiveeritud katseväljundites. Tihendus on kadudeta ja deterministlik.

Kontroll: `python3 backups/fm3-sound-architect-2/0.3.16/verify-backup.py`.

Taasta ainult Gitist (repo juurkaustas):

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.16"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" a11d8e44d0df339411d7e45ad6bea126b0bf89d5
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" --commit a11d8e44d0df339411d7e45ad6bea126b0bf89d5 --tests "$FM3_BACKUP_ROOT/test-summary.json" --output "$FM3_RESTORE_ROOT/rebuilt"
```

Võrdle taastatud arhiivi SHA-256 väärtust `release-receipt.json` väärtusega `archiveSha256`. Paketi sisu ja laadimise kontrollid on kviitungites; selle sessiooni käigus ei tehtud uusi FM3 kirjutusi, ekspordikatseid ega REA/Ghidra analüüsi. Wah Min/Max-i kuus mõõtepunkti välja kohta ja `fullRangeEncodingProven=false` säilivad.
