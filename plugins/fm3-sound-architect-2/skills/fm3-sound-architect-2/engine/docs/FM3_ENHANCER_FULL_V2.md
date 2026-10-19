# Enhanceri koguja V2 — alginfo kolmest pildist, plugin 0.70.0

Kasutaja palus uue koguja, mille algküsimuste vastused tulevad tema kolmest
FM3-Editi pildist. Kõik kolm pilti avati. Pildid on tõend juhtide nähtavuse,
menüünimede ja näidatud väärtuste kohta, mitte parameetrivahemike, SysEx
kodeeringu, uue GET/SYX paari ega heli kohta. Uut SYX-i nende piltidega ei tulnud.

Allikad `references/enhancer-ui-20261011/`: `modern.png`,
`classic-invert-menu.png`, `stereoizer.png` ja `observations.json` (räsid).
Kõigil FW13.00, Scene2, Enhancer A, presetinimi FM3 ENH_SEL. Bypass ja Scene
Ignore on nähtavad nupud; Bypass Mode'i menüüd pole üheski vaates.
Library menüüd ei käsitleta heliparameetrina. CPU52.2/50.9/51.9% on hetkenäidud.

| Type | Arvulised juhid | Valikud/lülitid |
| --- | --- | --- |
| Modern | Width %, Depth %, Low Cut Hz, High Cut Hz, Level dB | Scene Ignore |
| Classic | Width %, Pan Left, Pan Right, Balance, Level dB | Invert; Scene Ignore |
| Stereoizer | Width %, Depth %, Level dB | Scene Ignore |

Classicu Pan Left/Right ja Balance kuvatakse arvudena ilma ühikuta: −100.0,
100.0 ja0.0. Protsendimärki ei oletata. Sisemised nimetused Pan L/Pan R
säilivad kontrollija jaoks; kasutajale kuvatakse pildil olevad Pan Left/Pan Right.
Avatud Invert-menüü järjekord on **Both, Left, None, Right**, valitud None.
Menüü järjekorrast ei tuletata binaarseid enumkoode.

## Pakett ja käitumine

Kasutajapakett `FM3_ENHANCER_FULL_V2.zip` avaneb eraldi kausta
`FM3_ENHANCER_FULL_V2`. Vanemat allalaaditud paketti ega sessiooni ei kirjutata
üle. Lähtekood: `scripts/enhancer-full-collector-v2/`, koguja0.2.0.
Vanad kogujad jäävad paketti varasemate sessioonide auditeerimiseks.

`prefilled_setup.json` sisaldab ülalkirjeldatud andmeid; SHA-256
`521477571bc3fae233f33f0544dd1eadd1f260e16a4477f5d6da4fbd1df07a49`.
Koguja kontrollib räsi ning loob selle põhjal sessiooni setup'i **ilma ühegi
algküsimuseta**. Juba olemasolevat teistsugust setup'i ei muudeta; töö peatub
selge juhisega. Uue sessiooni manifest on schemaVersion2, collector0.2.0 ning
sisaldab eeltäidetud alginfo räsi. Seda faili kaasatakse ka tulemuste ZIP-i.

Koguja alustab otse katsega1/86. Esimene küsimus on Enter paketi baseline.syx
kasutamiseks või q. Sellele järgneb üks ühendatud Type/kanali/näitude ja GET-i
kinnitus. Eraldi Type-nime, juhtpaneeli loendi, ühikute ega muude juhtide
küsimusi ei esitata. Pärast tüübi vahetust kuvatakse oodatavad juhid infona;
kasutaja kinnitab jooksva Type'i ja seisu sama GET-kinnitusega.

Algus: importida **paketi baseline.syx**, Scene2, Modern, Enhancer A/bypass.
See on muutmata varasem kasutaja baseline, SHA
`755c477cd39b471b1c381f82dc735ad1285f2966d258a7381e8110a8f52a6d41`.
Praegune pildistamiseks valitud Stereoizer tuleb seega alusfailiga taastada.
Pildid ei muuda ega asenda selle faili keha.

86 sammu sisaldavad algpaari,13 Type-põhise arvulise juhi viis punkti
(65 mõõtmist),10 enum/lülitipunkti,3 Type-vahetust ning7 kanalisammu.
Arvulised punktid: tegelik miinimum, maksimum ja kolm eri kasvavat vaheväärtust.
Vahemike vastused tulevad mõõtmise ajal seadmest, sest pilt näitab vaid üht
väärtust. A→B/C/D täiskoopiad ja eraldi Width25/75/35, viimaks A valik.

Faili- ja GET-paarikontroll ning transport on eelmisest kogujast muutmata:
üks kinnitatud GET EID122, kõik48 sõna, range muu keha säilimine,
Scene2 kanalivaliku erand ainult kanalikatses, q/s, failed/pending/cancelled,
jätkamise tõendikontroll, sessioonilukk ning timeout ilma automaatse korduseta.
SET/SAVE/STORE käske ei lisata. Koostaja kirjutustuge veel ei muudeta.

Test `test_full.py` kasutab sama eeltäidetud alginfot, sünteetilisi
preseteid/vastuseid ja POSIX pseudoterminali. Lisaks kogu86-sammulisele rajale
kontrollitakse uue sessiooni algust ilma algküsimusteta, eeltäite räsikontrolli,
erineva vana setup'i muutmata tõrjumist ning q-ga lahkumist enne GET-i.
Raport `TEST_RESULTS.json` ja `docs/FM3_ENHANCER_V2_TESTS.json`.

Käsk: `python3 ~/Downloads/FM3_ENHANCER_FULL_V2/FM3_ENHANCER_FULL.py --port /dev/cu.usbmodem211104`.
Tegelik port vajadusel asendada. Paus q, jätkamine sama käsuga. Tulemused
`FM3_ENHANCER_FULL_V2_<aeg>_<tunnus>.zip`. Ära küsi algloendeid või neid kolme
pilti uuesti. Pärast ZIP-i auditeeri muutmata V2 koguja abil; kirjutustugi
ning ühine seadme/heli/CPU ring järgnevad alles päris mõõtmistele.
