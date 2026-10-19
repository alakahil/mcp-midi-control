# EQ / Level / Mix arenduskatse — 0.25.1
Kuupäev 2026-10-01. Ainult kasutaja muutmata Baaspreset.syx, sama SHA-kontroll kui senisel generaatoril. Kasutaja kinnitas kõik selle katse oodatud väärtused firmware 13-ga. Firmware siht 13.

## Käivitamine
Node.js, offline:
```sh
node skills/instructions/scripts/fm3-tone.mjs skills/instructions/references/Baaspreset.syx skills/instructions/examples/FM3_SA_TEST_TONE.spec.json /ABS/OUTPUT
```
Väljundid .syx, .txt ja .validation.json; olemasolevaid faile ei kirjutata üle. Nimi ja vähemalt üks kuuest väljast nõutud. Tundmatud väljad/baas ning sobimatud väärtused lükatakse tagasi.

| Väli | Plokk/kanal | PID | Body u16 offset | Vahemik | Katses |
|---|---|---:|---:|---|---|
| midB | Amp B | 9 | 4962 | 0–10 | 5 |
| trebleB | Amp B | 10 | 4964 | 0–10 | 4 |
| presenceB | Amp B | 26 | 4996 | 0–10 | 2 |
| levelB | Amp B | 1 | 4946 | −80…20 dB | −18 dB |
| delayMixA | Delay A | 0 | 7392 | 0–100% | 15% |
| reverbMixA | Reverb A | 13 | 9590 | 0–100% | 12% |

Vahemikud on tarkvaraline sisendileping, mitte kogu vahemiku riistvaratõend. Teisendus: round((value-min)/(max-min)*65534). Allikas pinned forgefx-midi 0.4.3 commit 553d24b7409302908d5c7e46a71b45e07dffdc05, FM3 parameetrikataloog ja cache-vahemikud; katsetabeli kuue väärtuse semantika on nüüd kasutaja seadmel kinnitatud; muid väärtusi ei üldistata automaatselt.

Lisaseaded rakendatakse alati: Amp B Gain 5; Scene 2 Delay engaged; Scene 1 Reverb A. Aluse Bass jääb 1.8. Amp B kasutatakse Scene 2/6; Delay A kõigis stseenides; Reverb A stseenides 1,3,4,6,7,8. Eelmise stseenikatse Scene 1 Reverb B asemel valitakse nüüd A, et kontrollida kanali A Mixi.

## Delay aadressi leidmine
Grid: Delay 1 effect ID 70. ID+nullide ankur 7346; stseeni 2 bypass word 7374 on sõltumatute eksportide ja riistvaratestiga kinnitatud. Parameetrimassiivi algus 7346+46=7392. Kanalite 8 sõna on kõik 0 (A). ID-ankrud Amp=4610 (58), Reverb=9518 (66); generaator nõuab nende täpset kattumist.
Üldine geomeetriapõhine plokikäik jätab Delay välja ja võib teisi plokke valesti nimetada. Seda ülddekodeerijat pole parandatud. Amp ja Reverb kirjutatakse senise IR-kirjutajaga; Delay A Mix ainult fikseeritud aluse kontrollitud asukohale. Kõik muud body baidid peavad säilima.
Delay Time jäeti välja: params.ts ja cache-vahemikud annavad erineva vahemiku (0–8000 versus 1–16000 ms). Ei üldistata Mixi tõendit ajale ega Feedbackile.

## Kontrollid
Kõik checksum/CRC/footer kontrollid, täpne kogu-body võrdlus, param ID põhine raw tagasilugemine, päiste säilimine. test-tone.mjs: eraldi oodatud sõnade loend ja kogu keha võrdlus, muutmata grid, Reverb A seos, 31 vigase päringu/baasi tõrjumist.
Pärast bundle'i kahe lisaekspordi lisamist läbisid senised 8 Gain/Bass võrdlust sõltumatute eksportidega, 16 kombinatsiooni ning stseenitestid uuesti. Upstream koodi ei muudetud, lisatud ekspordid readBlockParamsForModel/findBlockHeader.
Need kontrollid tõendavad kirjutuse sisemist kooskõla ja kõrvalmuudatuste puudumist, mitte uusi väärtusi FM3 ekraanil.

## Läbitud riistvarakatse (algne kontrolljuhis)
Anna kasutajale FM3_SA_TEST_TONE.syx ja sama spec-i põhjal loodud TXT. Esmalt impordib kasutaja FM3-Editis senist tööd säilitades. Seejärel juhenda ükshaaval: Scene 2 Amp B (Gain5/Mid5/Treble4/Presence2/Level−18), Delay A Mix15%; Scene 1 Reverb A Mix12%. Küsi lõpuks eksport võrdluseks. Kuulamine ja CPU on eraldi tõendid.
Ära palu kuut eraldi eksporti. Ära käivita täielikku GET-auditit ega saada SET-käske. Tagasieksporti võrreldes raporteeri kõik body erinevused, sh varasema stseenikatse teadmata offset0; seda ei tohi vaikselt ignoreerida.


## Tulemus 2026-10-01
Kasutaja: „Kõik oodatavad väärtused vastasid tõele”. Tagasieksport: `skills/instructions/examples/FM3_SA_TEST_TONE_export.syx`. Raport: `docs/FM3_TONE_HARDWARE_ROUNDTRIP.json`.

Kõik seitse tabelis/kandidaadis küsitud väärtust (sh Gain5) säilisid täpselt raw-parameetrite tasemel. Kaadrikontrollsummad, preset CRC ja footer läbisid kontrolli, nimi ja dump-päis säilisid. Lahtipakitud 14 222-baidises body's on üks erinevus: offset0, 1→0. Ülejäänud 14 221 baiti on identsed. Sama erinevus ilmnes varasemas stseenikatses; selle tähendust pole tõendatud ja seda ei ignoreerita vaikimisi.

Seega on konkreetne EQ/Level/Mix kombinatsioon riistvaral kinnitatud. See pole kogu väärtusvahemiku, teiste kanalite, uute Amp mudelite ega artistisoundi tõend. Heli/CPU on eraldi kinnitamata. Järgmisel sammul saab jätkata Delay aja/Feedbacki ja Reverbi ajaseadete sihitud kontrolliga; kuut kinnitatud parameetrit pole vaja uuesti eraldi eksportida.

