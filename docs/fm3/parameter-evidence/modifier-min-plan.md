# Wah Min: järgmine üksikmuudatuse katse, 21.10.2026

Lähtepunkt on avaldatud **0.3.11** / `f0a99bc190fcbe3a63284335c68fad66e9f9a36c`.
Tööriist ja plaan on arendusharus; tootmiskirjutajat, pluginapaketti ega
käivitajasidumist ei muudeta. Globaalsete skaalade arvukodeering jääb eraldi.

## Miks see katse?

Korratav [jääkväljade audit](modifier-remaining-audit.json) ühendab varasema
korpuse kahe uue, juba avaldatud ekspordiga. Kõik varasema korpuse
SYX/ZIP/amp-history Git-objektid säilisid. Tulemuseks on 1462 asukohta,
701 kordumatut SYX-i, 691 toetatud faili, 10 ajaloolist välistust ja
4 modifikaatoriala profiili. Asukohad ja genereeritud variandid ei ole
sõltumatute seadmemõõtmiste arv.

13 auditeeritud väljast on Auto Engage ja Damping'u kaks valikut kinnitatud.
Ülejäänud 11 väljal pole üksikmuudatuse ekspordipaari. Linear-katse
kuvatõendi varem salvestatud tekst annab nüüd ka nende ühe muutmata
algseisu näidud: Min 0, Max 10, Attack 10.1 ms, Release 0 ms, Start 0%,
Mid 50%, End 100%, Slope 50%, Scale 1, Offset 0%, Off Value 5%.
Siin ei vaadatud algset ekraanipilti uuesti; kasutati avaldatud tõendikirjet.
Üks muutmata näit ei tõenda vahemiku kodeeringut ega DSP käitumist.

Min/Max määravad sihtparameetri ulatuse. Wah Control'i puhul on see 0–10;
seda ei tohi üldistada teiste sihtide protsendiskaalaks. **Min 0 → 2.50**
annab esimese uue mõõtepunkti ja kontrollib välja asukohta. Käesolev plaan
ei väida, et see üks punkt kinnitaks kogu skaalat, Max-välja või teisi efekte.

## Kasutaja üks tegevusvoor

1. Kui eelmise Linear-katse seis on alles, jätka sellest. Kui oled vahepeal
   presetit muutnud, säilita pooleliolev töö ja impordi muutmata
   `FM3_MOD_DAMPING_LINEAR_export.syx` FM3-Editi tööpuhvrisse.
   Uut algseisu eksporti ei ole vaja. Ära ühtlusta teisi väärtusi käsitsi.
2. Ava **Wahwah 1 → Control → Modifier** ja kontrolli:
   **External 1**, **All**, **Auto Engage Off**, **Damping Linear**,
   **Min 0.00**, **Max 10.00**, **FW13.00**. Preseti sisemine nimi on
   **JB RHYTHM LEVEL -3**, valitud stseen 2.
   Erineva algseisu korral saada esmalt pilt ja ära jätka muudatusega.
3. Muuda **ainult Min väärtuseks 2.50**. Max ja kõik muud väljad jäävad
   muutmata. Ära liiguta pedaali, vaheta stseeni ega muuda ploki bypass'i.
   Kui täpset väärtust pole võimalik valida, saada kuvatud väärtus;
   seda ei käsitleta vaikimisi 2.50-na.
4. Tee modifikaatori aknast ekraanipilt, kus on nähtavad Min, Max,
   siht, Source, All, Auto Engage ja Damping; võimalusel ka FW13.00.
5. Ekspordi terve preset faili **FM3_MOD_MIN_2p50_export.syx**.
   See on failinimi, preseti sisemist nime ära muuda.
6. Saada SYX ja pilt ning kinnita: **„Algseisus oli Min 0.00;
   muutsin ainult Min väärtuseks 2.50.”**

See voor ei nõua uut GET-lugemist, seadme mälupessa salvestamist ega
helikatset. Kaasasolev alus on varasem päris eksport, mitte oletusliku
kodeeringuga katsepresett.

## Faili kontroll saabumise järel

```sh
python3 tools/fm3/modifier_remaining_audit.py
node --test tools/fm3/test-modifier-min.mjs
node tools/fm3/compare-modifier-min.mjs /ABS/FM3_MOD_MIN_2p50_export.syx
```

Võrdleja lukustab algfaili SHA-256-le
`f2d59758cbe24ef1bd38453968d2b2f974e3da64424fae23cedb190f2162fc5d`.
Lubatud uurimisvahemik on ainult kirje 0 sõna 1, keha baidid **1586–1587**.
Kontrollitakse kaadreid, CRC-d, footer'it, tervet keha, modifikaatori sihti,
stseene, nime, dump/raw-päist ning nulltäidet. Tuletatud CRC ja tihendatud
pikkus võivad muutuda; ülejäänud kõrvalmuudatused peatavad katse.

Lineaarse normaliseeritud uint16 kandidaadi järgi oleks 2.50 toorsõna
16383 või 16384 sõltuvalt kärpimisest/ümardamisest. Mõlemad on **hüpoteesid**.
Muu eraldatud väärtus säilib aruandes vaatlusena ja vajab analüüsi.
Väljumiskood 0 tähendab ainult eraldatud muutust ühe kandidaatkoodi suunas;
2 tähendab puuduvat muutust, kõrvalmuudatust, vigast faili või ootamatut koodi.
Mõlema korral jäävad kirjutusluba, ekraaninäidu kinnitus, kogu skaala
kodeering, seadmekäitumine ja heli kinnitamata. Tööriist väljastab ainult
JSON-i, ei kirjuta presetit ega ava ühendust.

Kui ekspordipaar, kuvatõend ja kasutaja kinnitus nõustuvad, saab järgmises
etapis hinnata ainult tõendatud Min-punkti piiratud kirjutustuge ning
valida Max-i või lisapunkti katse. Täisvahemiku üldistamisele peab eelnema
eraldi piisav tõend. Kõik sünteetilised kontrollväärtused jäävad testideks.
