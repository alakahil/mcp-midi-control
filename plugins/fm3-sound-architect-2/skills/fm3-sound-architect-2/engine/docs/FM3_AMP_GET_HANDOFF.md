# Amp GET import — 0.29.7, 2026-10-02

Uuem jätkupunkt: [0.29.8 koguja](FM3_AMP_COLLECTOR.md). Siinsed kahe päriskatse tõendid jäävad kehtima; allpool kirjeldatud koguja arendus on nüüd teostatud. Mac/FM3 uue koguja proov on veel ootel.

## Kinnitatud tulemus

Kaks firmware 13 kasutajakatset on sõltumatult toorbaitidest kontrollitud:

| Katse | A/B/C/D mudeli-ID | GET/SYX võrdlus | GET JSON SHA-256 |
|---|---|---|---|
| Capture004 parandus | 12 / 13 / 14 / 15 | 576/576, 0 erinevust | 8c944367b390f6c8b72a6cc2757dbfa6bc1f03e2f9ba7bd5b19632c4f3a631ce |
| Hipower Normal | 16 / 13 / 14 / 15 | 576/576, 0 erinevust | 90207b91631edbedfcabba82ee8ebb9fea1afc74146ac3854752bd662344da1a |

Mõlemal: üks TX `f0000174111f3a0031f7`, 1778 RX-baiti, kaadrid 0x74/0x75/0x75/0x75/0x76 pikkustega 12/778/778/202/8. Kõik XOR-kontrollsummad ja 7-bit andmed korras; kehaosades 256+256+64 uint16 väärtust. Üks kanal = 144 sõna = 288 baiti. GET-väärtused vastavad SYX body vahemikule [4656,5808).

SYX SHA-256: capture004 `7bfadae01975d70b00c675d2ed07c68574061f0a49406178272015f29db39e86`; Hipower `5844c2c960a439baeec3f858c0f85952d40bc13ba04b22e73f3f39d304668f8b`. Mõlema kaadrid, sisemine CRC, footer ja vorming 0x0146 kontrollitud.

Hipower mudelivahetus muutis A-kanalis 37 sõna / 69 baiti. B–D säilisid. Väljaspool nelja Amp-kanalit muutus ainult body offset 4622: Scene 2 Amp-kanal C→A. See valik EI kuulu kanalimalle ega kopeeru generaatorisse. GET ei tõenda stseeniseoseid või muude plokkide sõltuvuste puudumist.

Python v3 raportid näitavad vastuse valmimist enne pordi sulgemist (viimane tükk 2.755 ms / 2.264 ms). Need on kogujaskripti raporteeritud ajad, mitte sõltumatult mõõdetud latentsusgarantii. Varasemad Node v1/v2 katsed jäid poolikuks (1020 / 256 RX-baiti); täpne põhjus ei ole tõestatud. Nende raportid säilivad negatiivsete testidena.

## Uus tarkvara

`skills/instructions/scripts/fm3-amp-get.mjs` on offline importija, mitte MIDI/serial-ühendus. Ei saada GET/SET-käske. Toetab ainult senistes firmware13 katsetes nähtud Amp1 576-sõnalist kaadripaigutust; muu kuju lükatakse tagasi.

- `decode CAPTURE.json 13`: kontrollib toorvastust ning eraldab kõik neli kanalit koos mudelinimede, baitide ja SHA-dega. Tulemus on `amp-get-capture`, MITTE generaatori register.
- `import BASE.syx CAPTURE.json SAME_STATE.syx OUTPUT.json 13`: nõuab sama seisundi täielikku SYX-i, kontrollib olemasoleva importijaga sama-baasi piiranguid ja kõigi 576 sõna täpset võrdsust. Alles siis väljastab generaatoriga ühilduva registri. Olemasolevat faili ei kirjutata üle.

Käsud käivita plugina juurest:

```bash
node skills/instructions/scripts/test-amp-get.mjs
node skills/instructions/scripts/fm3-amp-get.mjs import skills/instructions/references/Baaspreset.syx skills/instructions/references/FM3_AMP_GET_hipower.json skills/instructions/references/FM3_AMP_HIPOWER_TEST.syx HIPOWER_LIBRARY.json 13
```

Väljastatud registri saab anda `fm3-generate.mjs` neljandaks argumendiks. Hipower Normal on selle paariskontrollitud registri kaudu kasutatav, kuid pole lisatud vaikimisi `amp-library.json`-i. Kaasasolevate vaikemallide arv jääb 22/331; selle eraldi registriga lisandub Hipower Normal (kokku 23, puudu 308). Ei väida, et kõik kataloogimudelid on seadmel saadaval või toetatud.

Koguja vana `status`, `referenceSha256` ja võrdlusmudel pole impordi otsustusalus. Impordis dekodeeritakse `rawRxHex` uuesti; olemasolevate `frames` ja `decoded.values` vastuolud lükatakse tagasi. Firmware13 on kasutaja kinnitus, mitte baitidest tuvastatud versioon. Korrektne checksum ei ole allika autentsuse garantii.

## Testid ja piirid

Automaatne test: kaks päris GET/SYX paari; kaheksa tervikkanali genereerimine Amp B-sse, baitidentne donoriga, muud body-baidid säilivad; 19 negatiivset kontrolli (sh mõlemad poolikud päriskatsed, vale checksum, vale seade/plokk/kuju/loendur, vigane uint16, tundmatu mudel, vale firmware, sobimatu SYX ja kõrvalmuudatus). Testi täpne valik on lähtekoodis. Uusi genereeritud Hipower kombinatsioone pole seadmele imporditud ega kuulatud.

## Jätkupunkt

Üldine toor-GET dekodeerimine ja SYX-iga paariskontrollitud import on valmis. Mahukas käsitsi nelikute kogumine jääb ootele. Järgmine tarkvaratöö: mudelist sõltumatu koguja ja mitme kogumise registrisse liitmine koos konfliktide/päritolu kontrolliga. SYX-nõudest loobumine vajab eraldi tõendeid mitte-Amp sõltuvuste kohta; seda ei tohi teha ainult kahe õnnestunud katse põhjal. Seadmel jääb audit GET-only; mudelivahetused kasutaja teadliku FM3-Editi toiminguna. Ära käivita automaatset SET-i ega presetikoha salvestamist.

Algne v3 kogujaskript on säilitatud `scripts/FM3_AMP_GET_v3.py`; selle sisse kirjutatud vana võrdlus muudab uue mudeli korral staatuse `comparison-needed`, mis ei tähenda puudulikku vastust. Seda skripti pole selle uuendusega muudetud.
