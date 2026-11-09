# 09.11.2026 auditi A1–A5 järeltegevused

Alus: FM3_Audit_ja_tegevusaruanne_2026-11-09_0.3.60. Töö alustamisel oli
avaldatud 0.3.61; hoolduse kandidaat on 0.3.62. Uut seadmekatset ei tehtud.

| Töö | Tulemus ja tõendi piir |
|---|---|
| A1 macOS | 0.3.60 native-matrix 42630164475 / macos-arm64 129362096378: success; arhitektuur, ehitus, typecheck, native, loopback ja suite läbivad. :49 kordus peatatud. 0.3.61 jooks 42643592547 / 129317391432 samuti success; selle kordus oli juba peatatud. |
| A2 käivitumine | Selle uue vestluse alguses automaatselt pakutud käivitaja oli 0.3.61. Pakett taastati, 3368 faili kontrolliti, enesekontroll ja FM3 FRESH CHAT CHECK neliku --verify läbisid. 0.3.60 ajaloolist automaatset leidmist ei väideta; kehtiva 0.3.61 kontroll asendab vana plaanietapi. 0.3.62 vajab oma värske vestluse katset pärast avaldamist; otsene taastamine on eraldi. |
| A3 koond | Eraldatud 0.3.59/87, 0.3.60/88 ning praegune 89 testi. T42 kolm sihti, keelatud Delay Low Cut ja 97/143 BPM on ühises koondis. 468 sihti jäävad lipureegli järelduseks; ajaloolisi kviitungeid ei muudetud. |
| A4 katsepakk | B1A–B1C ja B2: neli avaliku generaatori nelikut, eraldi SHOT/BIND manifestid, 97/143 BPM, B2 D-kanali piir. Eelkontroll ei ava porti. 19 negatiivset/sünteetilist juhtumit; füüsiline katse ootel. |
| A5 väljalase | Versioon 0.3.62, muutumatu skeem 0.8.9 ja kirjutusulatus. Täpse puhta commit’i täissuite, pakend ja serveri/käivitaja järelkontroll märgitakse välises avaldamiskviitungis; käesolev lähtefail ise ei kinnita avaldamist. |

## Käivituskatse identiteet

- Automaatselt pakutud allikas: personaalse FM3 Sound Architect 2 käivitaja SKILL.md,
  loetud enne teiste FM3 põhijuhendite otsimist. Kasutaja ei andnud käsitsi juhenditeed ega release’i.
- Avaldatud versioon 0.3.61, release pluginrel_6af1e85a674c8191a7ea8e11e91e7871.
- Commit 0c72a3231e29effdc31e51600e856a191e661085.
- Node 22.23.4, preset SYX SHA-256 707c6df01f24864e416ed8bb216ab4f12046db7343f56e691192ae6fbde9760a.
- Esialgne ainult nimega sisend tõrjuti korrektselt (vähemalt üks seadistus nõutud);
  lõppnäites on üks stseeninimi CHECK DEFAULT, heliparameetrid säilivad alusest.

## Seadmekatse ettevalmistus

`node tools/fm3/audit-targets-build.mjs EMPTY_DIRECTORY` loob katsepaki ja
käivitab selle pordivaba eelkontrolli. Juhend: [FM3_AUDIT_TARGETS_GUIDE.txt](FM3_AUDIT_TARGETS_GUIDE.txt).

`node tools/fm3/audit-targets-compare.mjs PACK SESSION` kontrollib hiljem täit
salvestatud presetti. Lubatud erinevused on valitud stseeni bait, tervete
plokikirjete järjekord ja sihtkoha SYX-päis. Kuvanäidud, kuulamine ning CPU
jäävad eraldi ülevaatuseks. Sünteetilist katset ei aktsepteerita seadmetõendina.

B3–B5 jäävad auditi järgi vajaduspõhiseks: uus siht, üks valitud MultiDelay tüüp
või esinemispreset ning üks konkreetne Out 2/Hold/CPU/Looper/Cab küsimus.
P2/P3, K1/K2 ja kõik 19 Volume-allikat on juba tõendatud ulatuses suletud.

## Muudatuste piir

Päris FM3/USB-d, MIDI-ühendust ega REA/Ghidrat selles töös ei kasutatud.
Kogumisskriptid on 0.3.61 kaitstud versioonidest muutmata; lisatud käivitus
kutsub ainult nende LOAD/GET funktsioone. STORE, stseenid ja presetivahetused
jäävad kasutajale. PR-i liitmine nõuab eraldi „liida“ korraldust.
