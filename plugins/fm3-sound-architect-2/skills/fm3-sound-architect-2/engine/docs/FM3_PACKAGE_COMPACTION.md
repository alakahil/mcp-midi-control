# Paketi korrastamine — 0.72.0

2026-10-12. Sisaldab ka lõpetatud Enhanceri seadmekatse kinnitust: kõik 13804
sisubaiti säilisid, Enhancer toimib, suurim kasutaja nähtud CPU 52,7%.

## Miks pakend muutus

Serverisse salvestatud 0.71.0 arhiivis oli 5042 kirjet: 3844 faili ja 1198 kausta.
Faililoendi lugemine ja ka 17-failine 0.71.1 uuendus peatusid veaga
`Plugin archive contains too many entries`. Avaldamise seis tuleb kontrollida
eraldi; selle dokumendi olemasolu kohalikus paketis ei tõenda avaldamist.

Dokumenteeritud platvormipiir on 5000 arhiivikirjet:
https://developers.openai.com/plugins/deploy/submission-errors

Korrastamisel ei muudetud heligeneraatori kodeeringut, Amp-malle, mudelinimesid,
stseenide koostamist ega mõõteandmeid. Eemaldati ainult Amp-kogumise kümne
ajaloolise sessioonikausta lahtipakitud koopiad. Iga algne fail säilib
taastatavana ning iga erinev baidijada on arhiivis üks kord.

## Kuidas tõendid säilivad

- `skills/instructions/references/amp-history.json.gz`: 990 algse failitee kaart
  ja 164 erinevat failisisu; 826 korduva sisu koopiat pole enam eraldi failid.
- `amp-history-manifest.json`: arhiivi SHA-256, mahud, lähteversioon ja kaustad.
- `scripts/fm3-evidence-archive.py`: kontrollib, loetleb, väljastab ühe faili või
  taastab kõik algsed teed. Kasutab ainult Pythoni standardteeki; ei vaja võrku
  ega seadet.
- `lookup/amp-library.json`: täpselt muutmata. Kõik 336 mudelit jäävad toetatuks.
  `source.file`, `source.get.file` ja `sources` säilitavad algse päritolu;
  arhiivis on neile vastav vana failitee koos pluginasisese prefiksiga.

Kontrollimine plugina juurkaustast:

```bash
python3 skills/instructions/scripts/fm3-evidence-archive.py verify
python3 skills/instructions/scripts/fm3-evidence-archive.py list
```

Ajaloolise testi või sessiooniauditi jaoks tee plugina ajutine töökoopia ja
taasta arhiiv **selle koopia juurkausta**, näiteks:

```bash
python3 skills/instructions/scripts/fm3-evidence-archive.py materialize --output /tmp/fm3-history-audit
```

Failid tekivad `skills/instructions/references/batch-...` algsetele radadele.
Kui ajutisse juurkausta on kopeeritud ka ülejäänud plugin, töötavad sealsed
vanad `test-batch-*.mjs` testid muutmata. Ära paki taastatud töökoopiat
väljalaskena: see lisaks korduvad ajalookoopiad tagasi. Erinevat olemasolevat
faili ega sümbollinki taastaja üle ei kirjuta; identsed olemasolevad failid
on lubatud. Üksikfaili jaoks kasuta `read ALGNE_PLUGINASISENE_TEE --output UUS_FAIL`.

Kordumatu sisu tuvastati SHA-256 abil ja 990 taastatud faili võrreldi lisaks
otse serverist allalaaditud 0.71.0 arhiivi failidega. Uusi GET-e ei tehtud.

## Iga järgmise väljalaske kontroll

```bash
python3 skills/instructions/scripts/fm3-package.py /path/to/plugin
python3 skills/instructions/scripts/fm3-package.py /path/to/plugin /path/to/new-plugin.zip
```

Pakendaja loendab failid, kõik vajalikud kaustad ja ühe juurkausta ka siis,
kui ZIP ei salvesta kaustu eraldi kirjetena. See arvestab serveri võimalikku
ümberpakendamist. **Projekti avaldamise eelarve on 4000 kirjet**, et 5000 piirini
jääks vähemalt 1000 kirjet varu. Taastatud ajaloo lisandumine tõrjutakse enne
avaldamist. Pakendaja kontrollib ka manifestide identiteedi/versiooni kooskõla,
sümbollinke, kogumahtu ja ZIP-i terviklust ning välistab ajutised Python-failid.

Olemasoleva plugina uuendamisel tuleb kasutada täpseid `delete_paths` väärtusi
koos uue arhiivi ja viidetega. Faili väljajätmine ZIP-ist üksi serveris vana
faili ei eemalda. Kõik eemaldatavad teed peavad olema kinnitatud praeguse
väljalaske inventarist. Ärge looge teist pluginat ega muutke jagamist kasutaja
eraldi otsuseta. Kui server keeldub juba vanast arhiivist, on vaja serveripoolset
taastamist/asendamist; väiksem kohalik fail ei tõenda, et see tõrge on kadunud.
