# FM3 Sound Architect 2 — avaldatud 0.3.15 taastamine

Privaatne USER-plugin `plugins_6accfd716e148191b0adb61e4e36f0e4`, release `pluginrel_6adb3151f998819193808162d75516b5`.
Avaldatud mootori lähtecommit on **15840e463b0d8f90ab3c46b8c0d4e6865b88a004**;
PR #16 ühenduscommit on `c5f5b65c8de695cd80aaf73d6744c6ea43880dc1`.
Hiljem lisatud varukoopia commit ei muuda mootori versiooni ega avaldatud lähtecommit'i.

## Kehtiv tõend

- `published/offline/`: selle täpse puhta lähtecommit'i 53/53 kontrolli ja logid.
- `published/receipts/`: kõik neli edukat väljalaske CI-töövoogu, macOS arm64/Linux x64 tööd, paketi- ja taastamiskontrollid ning avaldamiskviitung. Serverist tagasi laaditud paketi 3142 faili täielik nimistu ja iga faili sisu kattusid lähtepaketiga.
- `published/launcher/`: viie failiga salvestatud käivitaja; release, commit ja manifesti SHA-256 on seotud. Käivitaja Git-commit `131d094a18378968e41607d22761600b71d353db` on push'itud. Kataloog võis selles sessioonis veel kuvada 0.3.14; tegelikult salvestatud käivitaja ja kasutatud pakett on eraldi kontrollitud.
- `published/host-use/`: värske konteksti tegelik avaldatud paketi kasutus ja nelja väljundfaili kontroll. Suured JSON-väljundid on kadudeta gzip-arhiivis.
- `reports/`: uusim täielik tööaruanne (versioon 41); varasem versioon 40 on Git-ajaloos.
- [Volume pedaali järgmine uurimisküsimus](../../../../docs/fm3/parameter-evidence/volume-pedal-next-step.md) ja korduvkasutatav ainult lugemise inventuur; uusi seadmekirjutusi ega REA analüüsi ei tehtud.

`offline/` ja `publication/` juurkaustas on **superseded source 981806a** kandidaadi tõend. Need säilivad diagnostikaks; avaldatud väljalaske taastamiseks kasuta ainult `published/` andmeid. `review/`, `forward-initial/` ja `forward-final/` säilitavad arenduse vead ning kasutuskatsed. Algset kasutaja täielikku SYX-eksporti pole siia kopeeritud.

## Inventuuri kontroll

Repo juurkaustast: `python3 backups/fm3-sound-architect-2/0.3.15/verify-backup.py`.
`snapshot.json` sisaldab kõigi ülejäänud failide suurusi ja SHA-256 räsisid.

## Täpse avaldatud lähtepaketi taastamine ainult Gitist

Vaja on Git-i, Python 3 ja Node.js-i. Käivita repo juurkaustast:

```bash
FM3_BACKUP_ROOT="$PWD/backups/fm3-sound-architect-2/0.3.15"
FM3_RESTORE_ROOT="$(mktemp -d)"
git worktree add --detach "$FM3_RESTORE_ROOT/source" 15840e463b0d8f90ab3c46b8c0d4e6865b88a004
python3 "$FM3_RESTORE_ROOT/source/tools/fm3/build-release.py" \
  --commit 15840e463b0d8f90ab3c46b8c0d4e6865b88a004 \
  --tests "$FM3_BACKUP_ROOT/published/offline/summary.json" \
  --output "$FM3_RESTORE_ROOT/rebuilt"
python3 "$FM3_BACKUP_ROOT/published/launcher/scripts/prepare-runtime.py" \
  --archive "$FM3_RESTORE_ROOT/rebuilt/fm3-sound-architect-2-0.3.15.tar.gz" \
  --destination "$FM3_RESTORE_ROOT/loaded package"
node "$FM3_RESTORE_ROOT/loaded package/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/fm3-self-check.mjs" \
  15840e463b0d8f90ab3c46b8c0d4e6865b88a004
```

See kasutab algset testikviitungit ega väida uut 53/53 jooksu. Värskes detached Git-tööpuus on taastamist juba kontrollitud; arhiiv oli baithaaval identne:

- deterministlik lähtepaketi SHA-256: `79005e509f85317173b625f92b8ff5bb35ecc570ae5ba3cd70910e6212cf0507`;
- release-manifesti SHA-256: `f5c16eed79b107dd3544f81e6bf9d029e51fa0aa9ff744f1e5909fa98805a7ab`;
- serveri ümberpakitud arhiivi SHA-256: `4d722fadeca65c3ecdc9a58da37aec4f7baf4ab366bfb326f6878c44a599de2c` (pakend erineb, kõik 3142 faili on identsed).

Vana 0.3.14 varukoopia säilib muutmata kaustas `../0.3.14/`.
Min/Max tõendi ulatus, `fullRangeEncodingProven=false`, seadmeimport/heli/CPU ja STORE/reload'i piirid säilivad.
