# 21.10.2026 teine järelkatse: Damping’u paar kinnitatud

Damping Exponential → Linear kasutaja muutmispaar kinnitab sõna 24 / keha
nihke 1632: 0 → 1. Muud 14 221 sisubaiti säilisid. FW13.00 kuvatõend kinnitab
Linear’i; algse Exponential’i kinnitavad eelmine pilt ja kasutaja teade.
Kohalik 0.3.11 kandidaat lisab ainult selle seose EXPONENTIAL/LINEAR kirjutuse.
Täpne tõend on `wah-damping-evidence.json`, piirid `FM3_WAH_MODIFIER.md` failis.
Seadme ajakäitumine, heli ning min/max-, kõvera- ja Attack/Release-kodeeringud
jäävad kinnitamata. Avaldatud plugin on endiselt 0.3.10.

---

# 21.10.2026 järelkatse: Auto Engage paar kinnitatud

Kasutaja esitas ühe muudetud terve SYX-i ja OFF-ekraanipildi ning kinnitas
algväärtuse MED SPD. Võrdlus leidis täpselt ühe sisubaidi muutuse:
**kirje 0, sõna 10, keha nihe 1604: 2 → 0**. Ülejäänud 14 221 baiti,
stseenikanalid, bypass, preseti nimi ja dump-päis säilisid. Raw-päises muutus
ainult CRC; mõlema faili kaadrite/CRC/footer'i kontroll läbis.

See kinnitab paari **MED SPD=2 / OFF=0** asukoha ja kuvatähenduse olemasoleval
External 1 → Wah Control ALL seosel FW13.00-s. Lisatud on piiratud offline-
kirjutaja, skeem, tagasilugemine ja regressioonitestid 0.3.10 lähtekoodi.
Väljalaske avaldamist ja laadimist kinnitab eraldi commit’ipõhine kviitung. Pedaali/DSP käitumine, heli ja CPU pole kinnitatud.

Täpne tõend: plugina `engine/skills/instructions/references/wah-auto-engage-evidence.json`.
Juhend: `engine/docs/FM3_WAH_MODIFIER.md`. Allolev korpuseaudit ja selle JSON
on fikseeritud 0.3.9 lähtecommit'i **ajalooline lähteolukord**; selle 689 faili
ning null MOD-vaatluse tulemust ei kirjutata uue mõõtmisega tagantjärele ümber.
Muude väljade muutmispaari lüngad jäävad alles. Uut kasutajakatset selle paari
jaoks pole vaja.

---

# Modifikaatoriväljade tõendiaudit — 21.10.2026

**Otsus: uut kirjutustuge ei avata.** Olemasolevad failid kinnitavad
13 uuritud sõna struktuurse paigutuse ja muutmata sisu. Nende nimeline
sidumine tuleb MOD-deskriptorist ning järjestikuse kirje kaardistusest;
üksikvälja muutusega kinnitatud asukohatõend puudub. Failides pole nende
väljade eristavaid muudatusi koos sõltumatu FM3-Editi kuvanäiduga. Enumitabel või teistes
plokkides kinnitatud arvuklass üksi ei tõenda selle modifikaatorivälja
presetikodeeringut. Piirang on konkreetne tõendilünk, mitte väide, et pakutud
valemid kindlasti ei tööta.

Avaldatud plugin jääb **0.3.9** peale, release
`pluginrel_6ad7b13675048191a3fdfe07cdc946b8`, lähtecommit
`194833788d15db09d5ab9a774940ae84fcdebaad`. Uuring paikneb väljaspool
plugina paketti ega muuda selle generaatorit, skeemi, TXT-renderdajat või
käivitajasidumist. Globaalsete skaalade arvukodeeringut ei uuritud.

## Korratav ulatus

Käivita repo juurest `python3 tools/fm3/modifier_fields_audit.py`.
Tööriist loeb fikseeritud lähtecommit'i Git-objekte, olemasoleva FW13 vahemälu,
MOD-deskriptorit ja sõnastikku. Uuringu JSON peab vastama kordusarvutusele.
`--write` uuendab ainult uuringu JSON-i pärast sisulist ülevaatust.

| Korpus | Tulemus |
|---|---:|
| Git-is olevad SYX-failid | 785 |
| ZIP-ide ja tihendatud Amp-ajaloo SYX-asukohad | 675 |
| Kokku loetud SYX-asukohad | 1460 |
| Kordumatu sisuga SYX-failid | 699 |
| Toetatud 0x0146 vorminguga kontrollitud kordumatud failid | 689 |
| Vanema vorminguga upstream-näited, jäetud selle kaardi ulatusest välja | 10 |
| Kordumatud kogu 32-kirjelise modifikaatoriala seisud | 2 |
| Tõendiregistri MOD-parameetrid / nende mõõtepunktid | 25 / 0 |

Kõigil toetatud failidel kontrolliti SysEx-kaadreid, CRC-d, footer'it,
32 kirjepäist ning lugeja vastavust eraldi määratud baidiasukohtadele.
Räsid, failiasukohad, arhiveeritud liikmed, välistamispõhjused ja mõlemad
modifikaatoriprofiilid on failis `modifier-fields-audit.json`.
Korpus sisaldab nii seadmeeksporte kui genereeritud variante ja korduvaid
koopiaid; **1460 asukohta ei tähenda 1460 sõltumatut mõõtmist**.
Failivormingust ei tuvastata tegelikku püsivaraversiooni.

Mõlemas profiilis on sama esimene Wah 1 Control ALL-kirje. Ainus erinevus on
allikas 14 või 0. Kõik ülejäänud 24 sõna on võrdsed. Ka arhiivid ei lisanud
uuritud juhtide uusi väärtusi. Järgmine sidumata kirje ja tühjad kirjed ei
tõenda Auto Engage OFF-i või teise summutusrežiimi toimimist seotud Wah'l.

## Neli eraldi tõenditaset

Asukohad on **dekodeeritud presetikehas**, mitte tihendatud SYX-faili
baidinumbrid. Kirje `r` sõna `p` algus on `1584 + 96*r + 2*p`;
iga sõna on kaks baiti little-endian järjekorras. Tabel näitab kirjet 0.

| Väli | Sõna / keha nihe | Salvestatud toorsõna | FW13 kuvatähenduse allikas | Arvukodeeringu ja seadmekäitumise piir |
|---|---|---|---|---|
| Min / Max | 1, 2 / 1586, 1588 | 0 / 65534 | Nimed native-deskriptoris; vahemälus nullidega kohatäitjad | Puudub sihtparameetri skaalaga sidumise tõend. Neid ei tohi nimetada üldisteks protsentideks. |
| Start / Mid / End / Slope | 3–6 / 1590–1596 | 0 / 32767 / 65534 / 32767 | Vahemälu 0–100% | Normaliseeritud lineaarne uint16 on klassipõhine kandidaat; puudub muudetud juhiku kuvatõend. |
| Attack / Release | 7, 15 / 1598, 1614 | 66 / 0 | Vahemälu 0–10 s, kuvakordaja 1000 ehk 0–10000 ms | Näiteks 66-st valemiga saadud ligikaudne 10,07 ms pole mõõdetud kuvanäit. Puudub ajakonstandi salvestuse ja mõju katse. |
| Auto Engage | 10 / 1604 | 2 | Seitse nimetatud valikut: OFF, SLOW/MED/FAST SPD, SLOW/MED/FAST POS | Loendi indeks ennustab 2=MED SPD; puudub seotud Wah-kirje kuvanäiduga muutmispaar. |
| Off Value | 12 / 1608 | 0 | Vahemälu ligikaudu 5–95% | Raw 0 ei tähenda automaatselt kuvatavat 0%; üldine tabelivalem ennustab alumist piiri. Puudub piiripunkti kuvatõend. |
| Scale / Offset | 13, 14 / 1610, 1612 | 32767 / 32767 | Vahemälu 0,1–10 logaritmiliselt / −100…100% | Keskväärtused ühilduvad kandidaatidega, ent ei kinnita vaheväärtusi, ümardust ega kõvera DSP-arvutust. |
| Damping | 24 / 1632 | 0 | EXPONENTIAL / LINEAR | Ainult esimene enumikood esineb seotud kirjes; režiimi vahetuse tõend puudub. |

Vahemälu algsed float32 väärtused säilivad JSON-is ümardamata. Sõnastiku
`taper-class-verified` kirjeldab olemasolevat skalaarklassi; see ei muutu siin
MOD-välja uueks seadmemõõtmiseks. Min/Max-i `unused`/`n/a` kirjed on puuduliku
staatilise metadata tähis: olemasolevas presetis on need sõnad alles ja neil
on nimed. Sellest ei järeldu, et seade neid ei kasuta.

FW13 cache'i SHA-256:
`7b8463963d03c3ae9bae54ddd7ff5981ee461fb61f54bd7d248a9b2411123ec4`.
Native MOD 25-väljaline tabel on varasemas
`fm3-parameter-dependencies.json` tõendis (FM3-Edit 1.07.17 Windowsi binaar,
SHA-256 `c06f993530057214205a64330116a823e5b31507610d1792c1f3617725d6e927`).
Selles uuringus kontrolliti selle seost sõnastikuga; binaari ei analüüsitud uuesti.

Olemasolev `FM3_REA_NATIVE_AUDIT_20261012.zip` tõendab teise, arm64-redaktori
juhtimissõnumi float32 pakkimist. See ei sisalda MOD-väljade
kuvanäit → presetisõna serializer'i tõendit. Nende kahe binaari räsid ja
tõendiülesanded jäävad lahus.

[FM3 juhendi](https://www.fractalaudio.com/downloads/manuals/FM3/FM3-Owners-Manual.pdf)
trükitud lk 70–72 kirjeldavad Min/Max-i sihtväärtuste ulatust, kõvera kuju,
Attack/Release'i silumist ning Auto Engage'i seost Off Value'ga ja bypass'iga.
Allikas on FW7.x juhend, mitte FW13 salvestusvormingu tõend. Juhend ei anna
nende väljade presetisõnade kodeeringut. Tegelikku pedaaliliikumist, viivitust,
bypass'i lülitumist, heli ega CPU-d siin ei mõõdetud.

## Väikseim järgmine lisakatse

Esmalt tasub kinnitada ainult **Auto Engage MED SPD ↔ OFF**. See avaks
kasuliku kahevalikulise muudatuse olemasoleval seosel ilma uute numbriskaaladeta.
Allolev on tulevase kasutajakatse plaan; agent ei saatnud ühtegi käsku seadmele.

1. Kasuta muutmata faili `JB_RHYTHM_LEVEL_MINUS3_export.syx` paketi
   `engine/skills/instructions/examples` kaustast. Hoia oma pooleliolev töö
   alles ning laadi see FM3-Editis tööpuhvrisse; presetikohta salvestada pole vaja.
2. Ava Wah 1 Control'i modifikaator. Kontrolli **Source=External 1**,
   **Channel=ALL**, **Auto Engage=MED SPD**. Kui näit erineb, ära muuda seda:
   saada esmalt kuvatõend. Ära liiguta pedaali ega vaheta stseeni/kanalit.
3. Muuda **ainult Auto Engage → OFF**. Tee modifikaatori aknast ekraanipilt,
   nii et siht, allikas ja uus valik on tuvastatavad. Ekspordi terve preset
   faili `FM3_MOD_AUTOENGAGE_OFF_export.syx`; ära muuda preseti sisemist nime.
4. Saada see üks SYX ja ekraanipilt ning kinnita, et algne valik oli MED SPD.
   Algset SYX-i pole vaja uuesti saata. Uut GET-lugemist ei ole selleks vaja.

Katsehüpotees: kirje 0 sõna 10 muutub **2 → 0**, keha nihe **1604**.
See on kontrollitav ennustus, mitte lubatud kirjutus ega juba saadud tulemus.
Võrdlus peab kontrollima tervet keha, kõiki teisi modifikaatorisõnu,
stseenikanaleid ja bypass'i, CRC-d, footer'it ning header'i muudatusi eraldi.
SYX-i tihenduse, pikkuse ja kontrollsummade muutust ei loeta iseenesest
seademuudatuseks. Kui ilmneb muu normaliseerimine, analüüsime seda esmalt;
ainult vajadusel tuleb lisada muutmata algseisu eksport samast seadmest.

Edu tõendaks kõigepealt selle paari asukohta, salvestuskoodi ja kuvatähendust
sellel Wah-seosel. See ei kinnita kõiki seitset Auto Engage'i valikut,
POS-režiimi lävendit, ajalist käitumist ega uue generaatori väljundi importi.
Järgmise piiratud kirjutaja juurde kuuluvad seejärel vale aluse ja sisendi
tõrjumine, lubatud baidimuutuse kontroll ning lõpp-SYX-i tagasilugemine.

Muude väljade järgmised eristavad katsed jäävad eraldi: Min/Max vajab kindla
sihtparameetri näite; kõver vajab keskpunktidest erinevat väärtust; Attack ja
Release vajavad eraldi ajaväärtusi; Damping vajab LINEAR-i kuvatõendiga
muutmispaari. Neid ei koguta enne, kui vastav järgmine kirjutusulatus on valitud.
