---
name: fm3-sound-architect-2
description: Kujunda FM3 Sound Architect 2-ga Fractal FM3 Mk II Turbo kitarrisounde ning loo kaasasoleva kontrollitud generaatoriga SYX/TXT presetid, stseenid ja A–D kanalivalikud. Kasuta selle plugina selgesõnalisel valimisel.
---

# FM3 Sound Architect 2

Vasta eesti keeles ja anna kasutajale konkreetne järgmine samm. Kasuta kinnitatud
varasemat infot uuesti; küsi ainult soundi või faili korrektsust mõjutavat puuduvat
infot. Lähtu viiest eesmärgist: FM3 tundmine, soovitud sound, artisti/loo sound,
päris binaarne SYX ning sellele vastav allalaaditav UTF-8 TXT.

## Kehtiv seis

10.11.2026 H3 lõpliku esinemispreseti kontroll: `SATRIANI_SOAP_ON_A_ROPE_V4`
(SATCH SOAP ON A ROPE V4) on kasutaja lõplik esinemispreset. Laadimine, 8 stseeni
päris kitarriga, STORE/reload ja salvestatud keha on baittäpselt kinnitatud; CPU
46,6–62,9%. LIVE KOOSLUS V1 andmed säilisid, kuid stseenide valjus on ebaühtlane
(clean/Plexi valjem, lead vaiksem); ära esita V1-te lõppfailina. Kviitung:
`references/fm3-h3-20261110.json`.

10.11.2026 seadmekord (0.3.64 failidega): H1 ja H2 on seadmel läbitud.
H1 SC1 → Reverb Mix 10/25/40% ja H2 nelja MultiDelay tüübi import, kuva, kuulamine
ning STORE/reload on kinnitatud, salvestatud keha baittäpne. H4 luges T20 CAB_A
presetis Preamp Type None otse FM3-Editist. Tüübipõhine koond on nüüd 39 malli /
8 genereeritud importi / 8 STORE-kinnitust. Pealing Bells kasutas CPU-d ~11
punkti üle 0.2.5 hinnangu. Kviitung: `references/fm3-h1-h2-h4-20261110.json`.

0.3.65 (CPU mudel `fm3-cpu 0.2.6`): H2 nelja Multi Delay tüübimalli hind tuleb
nende mõõdetud stseenidest (Pealing Bells 17,9, Dub Echo 10,7, Mono Diffuser 5,4,
Aurora Delay 7,6 punkti). Muud 35 tüüpi kasutavad Base Type'i hinda. Vt `engine/docs/FM3_CPU.md`.

0.3.64 korrastab allpool T32/T20 aegunud piiranguid ning lisab järgmise
seadmekorra ettevalmistuse: H1 Scene Controller 1 → Reverb Mix 10–40% (ALL,
Room: Recording Studio A, stseenid 0/50/100%) ning H2 neli T36 MultiDelay tüüpi
ühes A–D presetis STORE-kontrolliks. Repo `tools/fm3/audit-next-build.mjs`
loob kontrollitud nelikud, LOAD/STORE manifestid ja seadmevaba `--preflight`
kontrolli; `docs/fm3/FM3_AUDIT_NEXT_GUIDE.txt` kirjeldab kasutamist.
Need on ettevalmistatud, mitte seadmel läbitud katsed. Tüübipõhine koond jääb
39 malli / 8 genereeritud importi / 4 STORE-kinnitust; uut sihttuge ei edutata.

0.3.63 lisab B1A/B1B/B1C/B2 avaliku generaatori lõppfailide seadmekinnituse:
import, kasutaja kinnitatud kuvanäidud ja käitumine ning STORE/reload järel
baittäpselt säilinud preseti keha. B1B tõend on õnnestunud viimane katse;
LFO 1 Rate 0,500 Hz, Depth 100,0% ja Sine on kinnitatud ka ekraanipildiga.
B1A parandatud CPU: stseenid 1–3 44,5%, stseen 4 44,5–44,6%.
Loe MOOTOR `references/fm3-b1-b2-20261110.json` ja selle algtõendeid.
Ära nõua neid katseid uuesti. Tulemused kehtivad neljale katsepresedile;
kirjutustugi ei laiene, skeem 0.8.9 ja 89 kohustuslikku mootoritesti säilivad.
LOAD/GET piirid säilivad. Uue preseti import, heli ja CPU vajavad oma kontrolli.

See versioon sisaldab varasema FM3 Sound Architecti generaatorit, mudelimallide
registreid, lähtepreseteid ja kontrolltõendeid. Kõik paiknevad selles skill-kaustas
alamkaustas `engine/`; väline repo ega seade pole failide genereerimiseks vajalik.
Vaja on Node.js-i ja failitöötlusega täitekeskkonda. Ära väida, et FM3 on ühendatud
või et MCP/REA teenus töötab: selle plugina generaator teeb offline failitöötlust.

Peamine lähtekoht on `engine/skills/instructions/`, allpool nimetatud MOOTOR.
Selle lähtekoodi versioon on `0.3.71`; ühine käivituspunkt on `fm3-preset.mjs`.
Aluskoostaja `jb-composer-0.13.0-dev` on sisemine etapp. Need identifikaatorid
ei kinnita uue preseti seadmeimporti, heli ega CPU-d.
Privaatse plugina identiteet on `plugins_6accfd716e148191b0adb61e4e36f0e4`.
Algse plugina identiteet ja vana serveriversioon jäävad eraldi; vana plugina
arhiiviviga ei tähenda, et selle uue plugina avaldamine on automaatselt blokeeritud.

Selle juhendi kehtiv seis asendab allpool viidatud ajalooliste dokumentide
vanad „järgmine kogumine” ja „OOTEL” märked. Kasuta tegeliku kirjutustoe
kontrollimiseks alati generaatori praegust capabilities-väljundit ja skeemi.

Kehtiv enum-koond alates T31-st: **227** vaikimisi `enum-labels-crosschecked`
valikut ja **121** opt-in valikut. T30 ajalooline 225/123 jaotus ei sisalda
T31 `BANK1`/`BANK2` lisandusi. Opt-in ei tühista tüübi, kanali, tempo,
modifikaatori ega nähtavuse piiranguid. Need arvud ei tähenda 227 eraldi
seadmel mõõdetud parameetrit.

T32–T42 ulatuse ja allika-/tüübipõhise seisu kontrollimiseks loe
`MOOTOR/references/fm3-current-evidence.json`. See eristab tarkvaratuge,
seadmeimporti, kuuldud käitumist ja STORE-kinnitust ning viitab algtõenditele.
„not-measured” tähendab tõendi puudumist selles ulatuses, mitte tarkvaratuge
keelavat otsust. Ära üldista ühe katse tulemust teistele allikatele või tüüpidele.

0.3.60 lisab kaks T42-l (09.11.2026) põhinevat välja; soundi skeem 0.8.9, mootori kohustuslikus
testikomplektis on 88 testi. `modifierTargets` seob External 1 või Controllers ploki allika
(LFO, ADSR, Sequencer, Envelope/Pitch Follower, Scene Controller, Manual) suvalise ploki
parameetriga, mille FM3-Editi FW13 lipp 0x0080 on null (468 nähtava nimega parameetrit,
nimekiri `fm3-preset.mjs --capabilities` → `modifierTargets`). Seadmel kinnitatud sihid on
Delay Mix, Filter Freq ja Amp Gain (kuvati, kõlasid, STORE/reload baiditäpne); lipuga siht
(Delay Low Cut) jäi FM3-s tühjaks, seega generaator keelab lipuga parameetrid. Ülejäänud sihid
on lipureegli järgi lubatud, igaüht seadmel eraldi ei kontrollitud; ütle seda kasutajale.
`tempo` (24–250 BPM) kirjutab preseti tempo kõigisse nelja Controllersi kanalisse, Tempo To
Use jääb PRESET-iks (T42: 97 ja 143 BPM näidati ja säilisid). Vaata jaotist
„Modifikaatori sihid ja preseti tempo (0.3.60, T42)”.

0.3.59 koondab seadmevabade tööde 1–6 tulemused: parandatud juhendid,
Controllersi allikate ja MultiDelay mallide tõendiseis ning nende piirid.
GitHubi arendustööriistad lisavad kolme allika STORE-katse ettevalmistuse,
automaatse tagasilugemise võrdluse ning MultiDelay ja kirjejärjekorra
piirjuhtude kontrollid. 0.3.59 avaldamisel oli K1 ettevalmistatud katse; hilisem T39 lõpetas selle STORE-osa.
Kirjutustoe ulatus ja soundi skeem 0.8.8 säilivad; kohustuslikus mootori
testikomplektis on 87 testi, välised CI-kontrollid on sellest eraldi.

0.3.37 nõuab `controlSwitchScenes[].state` ja `footswitches[].function` väärtuseks
stringi. Näiteks `"function":"latching"` on lubatud, `["latching"]` ei ole.
Vigane tüüp tõrjutakse nii genereerimisel kui ka nelja lõppfaili kontrollis;
SYX-i Latching-funktsiooni ei tohi TXT-s kirjeldada Momentary-funktsioonina.

Kehtiv modifikaatoritugi: Wah + Volume koos (0.3.30), Volume Min/Max (0.3.31),
Control Switchi `invert`/`channel` ja Out 2 (0.3.32), kõvera/aja väljad (0.3.34)
ning Control Switchi stseeniolekud ja jalglülitid (0.3.35–0.3.36).
Allpool olevad versioonipealkirjad tähistavad funktsiooni lisamise aega.
Alates 0.3.54-st on sama koostamise käigus loodud seoste eemaldamise ja
asendamise avalik sisend `modifierEdits`. Alates 0.3.55-st määrab `controllersScenes`
Controllersi kanali stseeniti ja `volumePedal.source` Volume-seose allika (External 1 või
Controllers ploki allikas). Alates 0.3.56-st valib `multidelayTypes` Multi Delay Type'i
kanali kaupa terve kanali mallina (T35). Alates 0.3.60-st seob `modifierTargets` Controllersi/External 1 allika
lipureegliga lubatud ploki parameetriga järgmistesse vabadesse kirjetesse (T42). Teisesed allikad,
kõverad uutel sihtidel ja teise ploki eksemplari sihid jäävad toetamata.

T11 (`MOOTOR/references/fm3-combo-store-20261029.json`) kinnitab viie seose ja
Out 2 säilimist STORE/reload'il ning selles katses Out 2 L tööd ja helitaset.
Out 2 stereo ning iga uue preseti heli vajavad oma kontrolli. T14/T14b kinnitavad
Latching/Momentary ja CS Per Scene käitumist. T16 kinnitab genereeritud PP#1
näitu ning kolme definitsiooni kodeeringut; kõigi 24 määrangu ega iga layout'i
seadmekatset sellest ei järeldu. Ära korda neid juba kinnitatud katseid.

## P2 kolme jalglüliti seadmetõend (0.3.38, 30.10.2026)

`MOOTOR/references/p2-three-switches-20261030/receipt.json` kinnitab 0.3.37-ga
loodud `FM3 P2 THREE SWITCHES` preseti käsitsi importi, Layout 1 lüliteid 1–3,
CS2 Latching Boost ALL, CS3 pööratud Momentary Bright ALL ning CS4 Latching
Fat kanalil D. Kasutaja kinnitas ON/OFF/LAST käitumise, Amp A Fat-i säilimise
OFF-is ning STORE → muu preset → tagasi taastumise 4. stseenis.
Ekspordi kogu 12804-baidine dekodeeritud keha vastab algfailile; ainus erinevus
on valitud stseen (bait 0: 0 → 3). Algne nelja faili komplekt ja eksport on
samasse tõendikausta säilitatud. `test-p2-three-switches` taastab algse SYX-i
praeguse generaatoriga ning kontrollib ekspordi terviklikku keha ja vigade tõrjumist.
See tõend piirdub selle preseti ja kolme määranguga; kõigi 24 määrangu, teiste
layout'ide, heli või CPU seadmekatset sellest ei järeldu. Ära nõua P2 kordamist.

## Modifikaatori sihid ja preseti tempo (0.3.60, T42)

`modifierTargets: [{"source":"LFO 1A","block":"delay","param":"DELAY_MIX","min":10,"max":60,"channel":"ALL"}]`
(1–8 seost). `source` on üks `volumePedal.source` 19 allikast; `block` on ploki lühinimi ja `param`
sõnastiku nimi. Siht peab olema presetis (esimene eksemplar) ja ruudustikul täpselt üks kord ning
ilma olemasoleva modifikaatorita. Volume/Pan Volume seo `volumePedal`-iga ja Wah Control
`composer.modifiers.external1Wah`-iga. `min`/`max` on näiduühikutes ja lubatud ainult pidevatel
sihtidel (lineaar/log/knob); muudel sihtidel ja ilma nendeta jääb täisvahemik. Kirje mall on FM3
enda salvestatud vaikemall (sama mis Control Switchil ja T42-s); kõver ja ajad on vaikimisi.
Kirjed lähevad pärast Volume- ja Control Switchi seoseid järgmistesse vabadesse kirjetesse.
Allika enda seaded (LFO kiirus, Scene Controlleri väärtused stseeniti) kirjuta väljadega
`controllers` / `controllersScenes`. `tempo: 97` kirjutab preseti tempo; tempo-sünkroniseeritud
plokid (nt `DELAY_TEMPO: "1/4"`) järgivad seda.

Alates 0.3.69-st võib igal `modifierTargets` kirjel olla valikuline `curve` samade võtmetega nagu `volumePedal.curve`
(`startPercent`, `midPercent`, `endPercent`, `slopePercent`, `scale`, `offsetPercent`, `attackMs`, `releaseMs`), näiteks
`{"source":"Envelope Follower","block":"filter","param":"FILTER_FREQ","min":300,"max":3000,"curve":{"attackMs":20,"releaseMs":250,"scale":2}}`.
Nimetamata väljad jäävad vaikimisi. Kodeering on seadmel sammhaaval kinnitatud Volume'i kirjel (T12); muul sihil on kõver
valemi järgi ja seadmel kontrollimata – ütle seda. Auto-Engage, Off Value ja teisene allikas pole toetatud. Skeem 0.8.10.

Tõend: `MOOTOR/references/fm3-t42-modifier-targets-20261109.json` (FM3 Mk II Turbo, FW13, STORE 427).
SC1 → Delay Mix, LFO 1A → Filter Freq ja External 1 → Amp Gain: Source ja Min/Max kuvati enne ja pärast
STORE-i, heli oli oodatud ja salvestatud keha oli baiditäpselt sama. Delay Low Cut (lipp 0x0080 püsti)
jäi tühjaks: FM3 nullis laadimisel Source'i ja sihi. Tempo 97/143 näidati FM3-l ja salvestati otse BPM-ina.
Lipureegel pidas 20 lubatud ja 1 keelatud sihi puhul, kuid iga parameetrit pole seadmel proovitud;
TXT märgib iga sihi juures, kas see on seadmel kinnitatud. Selle uue faili importi ja heli ei ole
kontrollitud.

## Seoste eemaldamine ja asendamine (0.3.54)

Kasuta soundi skeemi 0.8.5 välja `modifierEdits` ainult sama koostamise käigus
loodud Volume- ja Control Switchi seoste muutmiseks. Loe lepingut
[modifier-edits.md](engine/skills/instructions/references/modifier-edits.md).
Määra kirje ja oodatud allikas/sihtmärk; vale eeldus peab andma vea. `remove`
tühjendab ainult sõnad 0/8/9, `replace` kirjutab olemasoleva Control Switchi
vaikemalli sõnadesse 0–20. Kirje päis, sõnad 21–24, kõik 32 kirjet ning
järjestus säilivad. Kirjet 0, teiseseid allikaid ja suvalist alusfaili ei toetata.

Koosta `controlSwitchScenes` ja `footswitches` lõplike seoste järgi; eemaldatud
allikale ei tohi jätta seoseta määrangut. Staatilisi `controls` väärtusi hinnatakse
pärast muudatusi: eemaldatud seos võib kirjutuse vabastada, uus seos selle blokeerida.
Kõik neli lõppfaili peavad läbima tavalise `fm3-preset.mjs --verify` kontrolli.
Uus sisend taastab P3 ajaloolise SYX-i baittäpselt. Allpool kirjeldatud
D-kanali pööratud seos sai 06.11.2026 eraldi seadmekinnituse. Muud
kombinatsioonid jäävad seadmevabalt kontrollituks. P2/P3 korduskatset ära nõua. Kohustuslikus testikomplektis on 85 testi, sh `test-modifier-edits`.

Ajalooliste tõendite taasesituseks kasuta Node 22. Kohalik töövoog keeldub muu
põhiversiooniga ning valib alamprotsessidele sama Node'i. Node 24 T20 erinevus
on `Math.pow` viimastes kümnendkohtades; katse SYX jäi samaks. Tõendeid ei
kirjutata ühilduvusprobleemi varjamiseks ümber.

## D-kanali pööratud Cut-seose seadmetõend (0.3.54, 06.11.2026)

Loe `MOOTOR/references/modifier-edits-d-20261106/receipt.json`. Katse
`FM3 MOD EDITS D` kinnitab avaliku `modifierEdits` sisendiga Volume-kirje 1
asendamist pööratud Control Switch 2 → Amp Cut seosega ainult kanalil D,
ning Amp Input Boost seose eemaldamist kirjest 2. Kasutaja kinnitas impordi,
seosed, neli stseeni ja STORE → muu preset → tagasi taastumise.

Stseenide 1–4 Amp/CS2/Cut tulemused: A/OFF/OFF, D/OFF/ON, D/ON/OFF,
A/ON/OFF. Cut-modifikaator: Source = Control Switch 2, Channel = D,
Min = ON, Max = OFF. FM3-Editis ava Amp → Ideal; Cut-lüliti asub Bass-nupu
all. Ava modifikaator paremklõpsu või Macis Control-klõpsuga.

Seadmeeksport läbis Node 22 võrdluse: modifikaatoripiirkond, valitud stseen 1,
süsteemiosa ja kõigi plokkide sisu säilisid. Ainult efektide 94 ja 102
salvestusjärjekord vahetus. Ära nimeta kogu SYX-i ega töötlemata keha
baittäpseks. Algkvartett, eksport ja kviitung säilivad samas tõendikaustas.
Kviitungi katseaegne CI-seis ei kirjelda hilisemat väljalaske staatust.
Katse ei kinnita suvalise aluspreseti muutmist, teisi kombinatsioone, heli ega
CPU-d. Ära nõua juba kinnitatud katse kordamist.

## P3 eemaldamise ja taaskasutuse seadmetõend (0.3.39, 30.10.2026)

`MOOTOR/references/p3-modifier-reuse-20261030/FM3_P3_seadmekatse_kviitung_2026-10-30.json`
kinnitab ühe fikseeritud `FM3 P3 REMOVE REUSE` katse importi, kuue Source-välja
ja Cut-modifikaatori seadeid, stseenide 1/2 Cut OFF/ON lülitumist ning
STORE → muu preset → tagasi säilimist. Kasutaja kinnitas viis sammu koondvastusega;
üksikuid arvulisi näite eraldi ei protokollitud. Ära nõua selle katse kordamist.

Kirje 2 Input Boost seos eemaldati sõnade 0/8/9 nullimisega, ülejäänud sõnad
säilisid. Kirje 1 Volume-seose koht kasutati CS2 → Amp Cut jaoks, vana kohandatud
vahemik ja kõver asendusid Cut-i vaikeväärtustega. Aktiivsed kirjed on 0, 1, 3, 4;
kirje 2 jäi vahele tühjaks. Seadmeeksport säilitab kõik 32 modifikaatorikirjet.
Kogu fail ega dekodeeritud keha pole baittäpselt sama: FM3 vahetas Wah’ ja
Volume/Pani plokkide järjekorra. Iga ploki sisu ning ülejäänud andmed vastavad
algfailile pärast ainult selle järjekorra normaliseerimist.

Algne 0.3.38 uuringukvartett ja eksport säilivad muutmata. Algfailide
`hardware_pending` märge on katsele eelnenud ajalugu; hilisemat kinnitust näitab
eraldi kviitung. `test-p3-modifier-reuse` on kohustuslik offline-test: see
kontrollib praeguse mootori alg-/doonorkvartette, algse SYX-i taastamist,
47 vigase sisendi tõrjumist ning säilitatud seadmeeksporti.
`MOOTOR/scripts/fm3-p3-modifier-reuse.mjs` on ainult selle ajaloolise katse
`build|verify|compare` tööriist; selle lõppkvartett kasutab eraldi uuringuverifikaatorit.
Ära nimeta seda tavalise `fm3-preset.mjs --verify` läbinud lõpppresetiks.
Ajalooline kordustööriist ise ei lisa avalikku sisendit ega üldist kirjete jaotajat;
0.3.54 avalik `modifierEdits` on eraldi piiratud liides. See ei lisa
suvalise aluspreseti muutmist ega FM3-Editi automaatse vaba koha valimise tõendit.
Kõigi 32 pesa kasutatavust, uusi allikaid/sihtmärke, heli ega CPU-d ei mõõdetud.

## Valikuline kohalik laadimise/tagasilugemise katse (0.3.61)

Kasutaja soovil saab seadmekatset teha kaasasolevate Python-skriptidega:
kontrollitud preset laaditakse ainult edit buffer'isse ja plokid loetakse
sõna-sõnalt tagasi. Loe enne katse ettevalmistamist või käivitamist
[laadimise ja tagasilugemise juhendit](engine/docs/FM3_LOAD_READBACK.md).
`MOOTOR/scripts/cpu-sweep-collector/FM3_SHOT_LOAD.py --load` teeb
mitteinteraktiivse laadimise/võrdluse, `FM3_SHOT_READ.py` hilisema ainult
lugemise. STORE-katsel teeb salvestamise ja presetivahetused kasutaja;
`FM3_BIND_STORE.py --verify` loeb tema nimetatud salvestuskoha.

Need on kohaliku Maci/Linuxi USB-skriptid, mitte pilvest kättesaadav MCP-teenus.
Valmista katsepakk ette ka siis, kui siin puudub kasutaja arvuti ligipääs;
ära väida, et seade on ühendatud või kontroll tehtud. Kui kohalik ligipääs
ja katse korraldus on olemas, täida lubatud sammud. Enne käivitust sulge
FM3-Edit/Fractal-Bot ja säilita vajalik salvestamata töö. Pordikontroll saadab
ainult CPU-päringu; vastuseta seadet ei laadita. Parameetri SET, STORE,
stseeni/presetivahetuse käsud ja üldseadete kirjutamine on keelatud.
Kuvanäidud, heli ja STORE/reload'i tulemus on eraldi tõendid.

0.3.61 tugevdab olemasolevate kogujate eelkontrolli, vastuse kontrolli ning
tulemuste säilitamist; generaatori binaarkirjutuse ulatus ei laiene.
Kohustuslikus offline-suite'is on 89 testi, sealhulgas simuleeritud pordi
laadimise/tagasilugemise regressioon. Uut füüsilist seadmekatset see ei kinnita.

## GitHubi Satriani V4 täiendus (0.3.29, 28.10.2026)

Lisatud on GitHubi PR #37 põhiharusse liidetud `SATRIANI_SOAP_ON_A_ROPE_V4`
nelja faili näide. V4 muudab ainult Amp C seadeid ning preseti ja 5. stseeni
nime; stseeni uus nimi on `CRUNCH FULL`. Amp C: Crunch Orange, Gain 6,
Bass 5.5, Mid 7.5, Presence 4 ja Level −10 dB; Output Scene 5 jääb +1 dB peale.
V1–V3 kuulamistagasiside on allpool. T8 kinnitab V4 laadimist CPU-katseks
ning kõigi kaheksa stseeni CPU-näite. V3/V4 kuulamisvõrdluse tegi kasutaja
privaatselt: eelistatud on V4, riff on 2. stseenil. V4 terviklik uus
tagasilugemine on endiselt eraldi kinnitamata.
Ära omista V3 seadmetõendit automaatselt V4-le.

Näidiste kontroll hõlmab 51 spetsifikatsiooni: 48 SYX-i taastuvad baittäpselt,
kolm ajaloolist uurimissisendit jäävad teadlikult avaliku sisendilepingu väliseks.
Korpuse audit aktsepteerib 633 erinevat toetatud vormingus sisu. Need arvud
sisaldavad genereeritud näiteid ega tähenda uusi sõltumatuid seadmemõõtmisi.

## Kadudeta arhiivi vähendamine (0.3.28, 27.10.2026)

Levipaketis on kolme GEQ-, PEQ- ja Enhanceri mõõtesessiooni 1080 faili ühes
`MOOTOR/references/session-history.json.gz` arhiivis. Need andmed on vajalikud
ka mootori kontrollides. Käivitaja taastab need automaatselt enne mootori tööd;
kõik generaatorid, mallid, näited, testid ja sisemised failiteed säilivad.
GitHubi lähtepuus on kõik algfailid endistel radadel. Pakkimine toimub ainult
väljalaske ehitamisel; arenduscheckout ei vaja lisasammu.
Arhiivi mahukontroll kasutab tegelikku 4000 kirje piiri; uued lähtefailid
võivad kasutada kogu vaba ruumi.

Kui kasutad paketti otse ja `session-history.json.gz` on veel olemas, käivita
**enne ühtegi mootorikäsku** järgmine ettevalmistus. Tee see ise, ära lisa
kasutajale tehnilist sammu. Vaja on Python 3 ja Node.js-i.

```bash
python3 "$FM3_ENGINE/scripts/fm3-session-archive.py" prepare --output /ABS/NEW_FM3_RUNTIME
```

Käsk kontrollib iga faili räsi ja kogu taastatud lähtepuu vastavust avaldatud
commit'ile ning tagastab `skill`, `generator` ja `selfCheck` absoluutsed teed.
Suuna kõik järgnevad engine-viited tagastatud töökoopiasse; lähtepakett jääb
muutmata. Kui käivitaja on juba taastanud runtime'i, pole uut koopiat vaja.
Käivita `selfCheck` väljalaske teadaoleva commit'iga. Taastatud runtime'is
on ka kogu algne SYX-korpus, mistõttu auditid ja arendustööriistad töötavad
senisel kujul. Puhta lähtepuu eksportimiseks saab kasutada sama skripti
`materialize --output /ABS/NEW_PLUGIN_SOURCE` käsku; see jätab levimanifesti välja.

## Controllersi kanal stseeniti ja LFO 1A allikana (T33, 06.11.2026)

Seadmel kinnitatud (STORE 425 → tagasi, salvestatud keha baiditäpselt sama): Controllersi kirje (keha nihe 452)
päises on sama paigutus kui ruudustiku plokkidel; päise sõna 5+(stseen−1) (nihe 462+2·(stseen−1)) on stseeni
Controllersi kanal (0–3 = A–D). FM3-Edit näitas stseenides 1–4 kanaleid A–D ja LFO 1 kiirus 1/2/4/8 Hz kõlas igas
stseenis kiirema tremolona. Modifikaatori allika kood on FM3-Editi MOD_CTRLID loendi indeks (61 silti; LFO 1A = 1,
External 1 = 14, Control Switch n = 49+n); LFO 1A → Volume/Pan Volume töötas sama 25-sõnalise malliga. Generaatoril
pole neile veel avalikku sisendit: koostaja väljundis kasutavad kõik stseenid Controllersi kanalit A ja allikateks
on ainult External 1 ning Control Switchid. Tõend: `references/fm3-t33-controllers-scene-20261106.json`.
(See oli 0.3.54 seis; 0.3.55 lisab sisendid, vt järgmist lõiku.)

## Controllersi stseenikanal ja Controllers-allikas Volume'ile (0.3.55)

- `controllersScenes: ["A","B","C","D"]` = Controllersi kanal stseenides 1…n (n ≤ 8, stseen 1 esimesena); loetlemata
  stseenid jäävad A-ks. Muutuvad ainult päise sõnad 462+2·(stseen−1). Kanali seaded (nt LFO 1 kiirus kanalil B)
  tulevad väljast `controllers`.
- `volumePedal: {source: "LFO 1A"}` (koos `min`/`max`/`curve`-iga) vahetab Volume-seose allika; muutub ainult
  modifikaatori sõna 0. Lubatud: External 1 (vaikimisi), LFO 1A/1B/2A/2B, ADSR 1/2, Sequencer, Envelope Follower,
  Pitch Follower, Scene Controller 1–4, Manual 1–5. Control Switch, PEDAL ja External 2–16 on keelatud.
  `modifierEdits` tuvastab Volume-seose sama allika nimega.
- Seadmel kinnitatud: stseenid 1–4 = A–D ja LFO 1A (T33). Sama sisendiga genereeritud fail on baiditäpselt sama,
  mis FM3 salvestatud asukoht 425 (`tools/fm3/test-t33-controllers-replay.mjs`). T34 (07.11.2026) kinnitas ka
  stseenid 5–8 (D, C, B, D; STORE 427 → tagasi baiditäpne) ning allikad Scene Controller 1 (30), Sequencer (7) ja
  ADSR 1 (5) redaktsioonipuhvris kuuldavalt ja FM3-Editis. T39–T41 (09.11.2026) kinnitasid kõik ülejäänud 17 allikat:
  õige Source, ootuspärane heli ning STORE/reload baiditäpselt (iga allikas oma presetis, siht Volume/Pan Volume).
  Nüüd on kõik 19 lubatud allikat seadmel kinnitatud katse seadetega; teised LFO kujud/sügavused, kõverad ja sihtmärgid
  on eraldi küsimus. Tõend: `references/fm3-t34-controllers-sources-20261107.json`,
  `references/fm3-t39-t41-controllers-store-20261109.json`.
- T34 andis veel: LIVE KOOSLUS V1 (Amp C −8 dB) Lead on teistega umbes sama vali, muuta pole vaja; Cab B Preamp
  Type NONE-iga ettevalmistatud presetis on ploki Low/High Cut (87,0 Hz / 7300 Hz) ikka Preamp-lehel näha ja Cab 1 lõiked Cabs-lehel; Type NONE väärtust ennast ei loetud tagasi.
- Skeem 0.8.6; test `scripts/test-controllers-scenes.mjs`.

## Päris kasutuspreseti koondkatse (T32, 06.11.2026)

`tools/fm3/t32-live-build.mjs` koostas preseti „T32 LIVE KOOSLUS“ (Amp A–D Deluxe Verb Normal / Class-A 30W TB /
Brit JVM OD1 Orange / Plexi 50W High 1, T808, Analog Stereo chorus, Digital Stereo delay, Room + Plate, Multi Delay
ainult Scene 4-s). FM3-l: CPU 8 stseenis 55–71 % (fm3-cpu 0.2.4 hinnang 0,4–1,4 punkti kõrgem), STORE 424 → muu
preset → tagasi säilitas kõigi 11 ploki baidid (salvestus tõstis Multi Delay kirje ettepoole), kasutaja kinnitas
heli ja Multi Delay. Amp C malli tase −14 dB oli selles koosluses ligikaudu 6 dB liiga vaikne (T32B −10 dB: „umbes
2 dB juurde veel“). Lõppversiooni „LIVE KOOSLUS V1“ −8 dB nivood kuulati hiljem T34E-s:
Lead oli teistega umbes sama vali ja kasutaja ei soovinud muudatust. See asendab T32 ajaloolise
„kuulamata“ märke; lõppfaili eraldi arvuline nivoo, CPU ja STORE jäävad mõõtmata.
Tõendid: `references/fm3-t32-live-20261106.json`, `references/fm3-t34-controllers-sources-20261107.json`.

## Lisatud ploki kirje seadme järjekorras (0.3.58)

FM3 kirjutab preseti plokkide kirjed salvestamisel ja ekspordil alati kindlas järjekorras. T38 (7.11.2026) näitas, et
generaatori lõppu lisatud Multi Delay salvestati Drive'i järele ja Input 1 ette. Kõik repo seadmeekspordid ja salvestatud
dumbid (57 faili, `references/fm3-record-order-20261107.json`, `tools/fm3/record-order-build.mjs`) on kooskõlas ühe
järjekorraga. Nüüd paneb `insert` lisatud ploki kirje samasse kohta, kui tõendid määravad selle koha kõigi teiste kirjete
suhtes. Muidu läheb kirje lõppu nagu varem, sest seade laadib ka sellise faili. Plokkide sisu ei muutu, muutub ainult
kirjete järjekord. T38 spec annab nüüd seadme salvestatud kehaga baidiidentse faili ja P6 A/B lisamised kattuvad seadme
ekspordiga. `recordOrder:"append"` hoiab vana paigutuse. Aruandes `stages.insert.recordOrder` ütleb iga ploki kohta,
kas kirje pandi seadme järjekorda või lõppu. Grid-režiim (`spec.grid`) kasutab vaikimisi endist järjekorda;
alates 0.3.70-st paneb `recordOrder:"device"` ka seal `insert`/`duplicate` kirjed seadme järjekorda (aruandes
`stages.records.recordOrder`). Uute ruudustikupresetite puhul kasuta `recordOrder:"device"`; see on tõendite järgi
ja seadmel STORE-iga kontrollimata kuni T51-ni – ütle seda.

## Synth häälte CPU (0.3.57, T37)

T37 (7.11.2026, audit H6) mõõtis Synth'i hääli 2 ja 3 (21 presetti, kalibreerimine 52,5 % alguses ja lõpus). Hääl 2 ja hääl 3
maksavad tüübiti sama palju kui hääl 1 (14/14, üks näit ühe 1 % sammu võrra kõrgem) ning hääled liituvad: plokk ise
2,5 punkti, iga hääl, mis pole OFF, lisab oma osa (SINE 1,5, TRIANGLE 5, SQUARE/SAWTOOTH 4,5, RANDOM 5, WHT NOISE 9,
PINK NOISE 11). Kaks häält ja SINE/SAWTOOTH/WHT NOISE klappisid summaga täpselt; kolm TRIANGLE häält mõõdeti 1 ja kolm
PINK NOISE häält 4 punkti summast madalamana, seega on summa ettevaatlik. `fm3-cpu 0.2.5` arvestab häälte summat (enne
kasutati häälte 2/3 korral pere maksimumi). Tõend: `references/fm3-t37-synth-cpu-20261107.json`.

## Legacy Cabi IR ja lisatud plokkide CPU (0.3.53, T31)

`controls` plokiga `cab` kirjutab nüüd Legacy-kanalil Cab 1/2 IR-i: `BANK1`/`BANK2` (FACTORY 1, FACTORY 2, USER,
LEGACY, SCRATCHPAD) ja `TYPE1`/`TYPE2` = FM3-Editi näidatud number `#` (1–1024), nt
`{"block":"cab","channel":"A","param":"TYPE1","value":18}`. T31 (5.11.2026): salvestatud 17 ja 200 näitas FM3-Edit
kui Factory 1 # 18 („1x8 Dan-O 414 A") ja Factory 2 # 201, seega # = salvestatud sõna + 1. Koostaja Cabi kanal A on
Legacy (Cab 2 on seal vaigistatud), B–D on Dyna-Cab; Dyna-Cab kanalile need sõnad ei mõju ja kirjutus keelatakse
(Dyna-Cabi valik käib `cabChannels` kaudu). IR-i nimed tulevad seadmest ja neid ei kontrollita.
REA FM3-Editi paigutusest: Ampi XFLEAKAGE, RESOLUTION, DYNDEPTH, DYNPRES ja Ten-Tapi REFTEMPO jaoks pole FM3-Editis
nuppu, need jäävad lukku. CPU: 54 lisatud ploki presetti mõõdeti (kalibreerimine 52,5 % alguses ja lõpus); CPU
hinnang (`fm3-cpu 0.2.4`) arvestab nüüd iga tüübi oma hinda: Plex 9,5–27,5 (Shimmer Verb 27,5), Megatap 9,5–10,
Ten-Tap 4,5, Resonator 7,5, Ring Mod 2,5–4, Gate 1,5–5,5, Volume/Pan 1/2,5, Synth (hääl 1, hääled 2–3 OFF) 2,5–13,5,
Legacy Cab sama kui Dyna-Cab. Tõend: `references/fm3-shot-t31-cab-cpu-20261105.json`.

## Valikunupud edutatud (0.3.52, T30)

T30 (5.11.2026) laadis kaks generaatori presetit: EN1 (PEQ bändide 1–5 tüübid, Phaser LFO Quantize, Multi Delay
EQ Type ja Comb Filters Filter Type) ja EN2 (17 Controllersi valikut: LFO Tempo/Quantize/Run, ADSR Type/Mode/
Retrigger/Source, Envelope ja Pitch Source, Sequencer Run/Tempo). FM3 hoidis kõik sõnad ja FM3-Edit näitas kõigil
25-l täpselt dekodeeritud silti (Phaser Quantize: loend algab OFF, OFF, 2, 3, salvestatud 3 näitab 3). Need 25 ning
T28-s loetud LFO 1/2 Type ja ADSR 1 Mode (kokku 28) on nüüd `enum-labels-crosschecked`, st kirjutatavad ilma
`allow`-ta; T30 hetkel oli kokku 225 vaikimisi kirjutatavat valikut ja 123 opt-in valikut
(`allow:["enum-labels"]`). T31 lisas `BANK1`/`BANK2`: kehtiv jaotus on 227/121.
T30 ajalooliste opt-in rühmade hulgas olid:
üldseaded (75, neid ei kirjutata), modifikaatorite seaded (6), Mixer/Multiplexer/Feedback Return/Output/Input/
Volume marsruutimise ja bypassi sõnad, kanali tüübi/mudeli valijad (vajavad täit kanalimalli), learn/preset/IR-panga
valijad, `MULTITAP_PRESETS` ja Controllersi Tempo To Use (kirjutaja keelab). Heli ja STORE/reload'i ei mõõdetud.
Tõend: `references/fm3-shot-t30-enum-20261105.json`.

## Feedback Return kirjutatav (0.3.51, T29)

Iga koostaja preset ühendab rea 2 reaga 3 Feedback Send (rida 2 veerg 12) ja Feedback Return (rida 3 veerg 1)
plokiga. `controls` lubab nüüd plokki `return` (ainult kanal A): Return Level (`RETLEVEL`, 0–100 %), Output Level
(`LEVEL`, dB) ja Balance (`PAN`, −100…100), nt `{"block":"return","channel":"A","param":"LEVEL","value":-3}`.
T29 (5.11.2026): FM3 hoidis laadimisel kõik Return'i sõnad ja FM3-Edit näitas 80.0 %, −3.0 dB ja 20.0 täpselt nagu
dekodeeritud. Feedback Send'il pole FM3-Editis ühtki muudetavat parameetrit ning seade nullib selle kaks sõna laadimisel,
seega `send` on keelatud. Return'i Bypass Mode ja Bypass jäävad lukku (nähtud ainult Thru / mitte möödas). Soundi skeem
on 0.8.4. Tõend: `references/fm3-shot-t29-feedback-20261105.json`.

## Controllers kirjutatav (0.3.50, T28)

Uus väli `controllers` kirjutab Control ploki (LFO 1–2, ADSR 1–2, Envelope, Sequencer, Scene Controllers 1–4,
Manual 1–5) väärtusi: `[{"channel":"A","param":"LFO1FREQ","value":2.5}]`. `param` on nimi (`LFO1FREQ` või
`CONTROLLERS_LFO1FREQ`) või PID 0–129, väärtus on FM3-Editi näit. Kirje asub preseti algusosas (keha nihe 452,
130 sõna × 4 kanalit). T28 (5.11.2026): FM3 hoidis laadimisel kõik 520 sõna ja FM3-Edit näitas kanalil A täpselt
26 oodatud väärtust (LFO, ADSR 1, Sequencer, Envelope/Manual, Scene Ctrl 1+2). Kanalivalija B/C/D näitas
11/12/13 %, seega on neli koopiat Controllersi kanalid A–D. Kirjutamisel kehtib tavaline staatuspiirang:
nupud, täisarvud ja (alates 0.3.52, T28/T30) kõik valikud peale Tempo To Use vaikimisi.
Tempo To Use, ADSR X/Y märgid ja Envelope Gain Monitor on keelatud; Tempo kirjutab alates 0.3.60-st ainult väli
`tempo` (kõik neli kanalit). T28 ajal polnud Controllersi
stseenikanali valik veel dekodeeritud ja koostaja kasutas kanalit A. Alates 0.3.55-st
kirjutab `controllersScenes` kõik kaheksa stseenikanalit (T33/T34); Volume-seose
allika valib `volumePedal.source`. Allika sidumine ja Controllersi väärtused on eraldi toimingud.
T28-aegne soundi skeem oli 0.8.3. Tõend:
`references/fm3-shot-t28-controllers-20261105.json`.

## Multi Delay presetid: analüüs ilma seadmeta (O4, 07.11.2026)

Algorithm (`MULTITAP_BASETYPE`, pid 0) on tavaline valija. Preseti sõna (`MULTITAP_PRESETS`, pid 114, 39 valikut) on
ainult silt. Preset tähendab terve kanali kujutist, mitte ühe valija kirjutamist. Ainus mõõdetud täide on T27-st:
Pealing Bells vaikimisi kanalil muutis 39 sõna. Algorithm sai väärtuseks Quad Series Delay, Tempo 1/2 said 1/8 ja 1/4.
Muudetud olid veel Pan 1–3, LFO, Diffusion Time, Feedback 73 %, neli aega, Ring Mod ja nelja tapi Ring/Mod väärtused.
Neist 33 näitab FM3-Edit valitud Algorithmil. Kuus jäävad peidetuks: Feedback 1–4, Feedback Send ja preseti silt.
Kasutaja 03.11 eksport (`fm3-multidelay-types-20261103.syx`) hoiab seadmel valitud presette 1–3 (Quad Parallel,
Quad Series, Quad Diffusor). Need muutsid vastavalt 3, 11 ja 11 sõna; algolek pole teada. Ülejäänud 34 preseti täidet
repos ei ole. Preseti valik jääb keelatuks, kuni täide on mõõdetud (vt `deviceSweep`).
Tõend: `references/fm3-o4-multidelay-presets-20261107.json`, tööriist `tools/fm3/o4-multidelay-presets.mjs`.

**T35 (07.11.2026) mõõtis kõik 39 Type'i.** Iga valik tehti seadme vaikimisi Multi Delay kanalil A ja plokk loeti
tagasi (fn=0x1F). Iga Type on mõõdetud 121-sõnaline kanali kujutis ja muudab 0–44 sõna. Kanalid B–D jäid muutmata.
Kontrollid olid baiditäpsed:
- Pealing Bells kordus T27 tulemusega;
- Type'id 1–3 kattusid 03.11 ekspordiga;
- Type 0 on vaikimisi kanal.
0.3.56-st rakendab generaator Type'i terve kanali mallina (`multidelayTypes`, vt järgmist lõiku).
Tõend: `references/fm3-t35-multidelay-presets-20261107.json`, ingest `tools/fm3/t35-multidelay-presets-ingest.mjs`.

## Multi Delay Type terve kanali mallina (0.3.56, T35)

`multidelayTypes: [{channel:"A", type:"Pealing Bells"}, ...]` (1–4 kirjet, üks kanali kohta; 39 FM3-Edit'i
Type'i nime, suurtähed pole olulised). Selleks peab presetis olema Multi Delay plokk (`insert:["multidelay"]` või
grid). Kanali kõik 121 sõna asendatakse T35 seadmelugemisega, mis tekkis selle Type'i valimisel vaikimisi kanalil.
Seega saab kanal ka Type'i Algorithmi, tempod ja peidetud sõnad (nt Feedback 1–4). Mall rakendub enne paigutust ja
`controls`-i, nii et `controls` saavad Type'i peal üksikuid nuppe muuta (nt `MULTITAP_MIX`). Algorithmi
(`MULTITAP_BASETYPE`) sama kanali Type'i järel muuta ei saa, ja `MULTITAP_PRESETS` jääb `controls`-is keelatuks.
Lõpukontroll nõuab, et Type'i sõna ja Algorithm oleksid malli omad. TXT-s on lõik „MULTI DELAY TYPE“.
T36 (07.11.2026) laadis `multidelayTypes` preseti (A Pealing Bells + Mix 30 %, B Dub Echo, C Mono Diffuser, D Aurora
Delay): seade hoidis 484/484 sõna, FM3-Edit näitas nelja Type'i ja heli vastas kirjeldusele
(`references/fm3-t36-multidelay-types-20261107.json`). T38 (07.11.2026) salvestas teise preseti (A Ya-Ya Delay + Mix 30 %,
B Space Tape, C L-C-R-C, D Centaurus X-3) STORE-iga ja laadis uuesti: kõigi plokkide kanalite andmed (Multi Delay 484/484
sõna) ja stseenikanalid jäid samaks, Type'id ja heli samuti. FM3 paigutab salvestamisel ainult plokkide kirjed oma
järjekorda (lisatud Multi Delay Sendi järele), seega fail pole baidiidentne, sisu on (`references/fm3-t38-multidelay-store-20261107.json`). T49 (13.11.2026) laadis ülejäänud 31 Type'i (kaheksa presetti, igas neli kanalit): seade hoidis kõik sõnad, FM3-Edit näitas iga Type'i nime ja heli vastas nimele (`references/fm3-t49-multidelay-types-20261113.json`); kõik 39 Type'i on seega laadimisel kinnitatud, STORE 8-l. Iga uue faili heli ja nende 31 STORE jäävad kontrollimata. Skeem 0.8.7; test
`scripts/test-multidelay-types.mjs` (kõik 39 Type'i = T35 kujutis, ainult selle kanali sõnad muutuvad).

## Multi Delay parameetrid kirjutatavad (0.3.49, T27)

`controls` lubab nüüd plokki `multidelay`: Base Type (`MULTITAP_BASETYPE`, FM3-Editis „Algorithm“) ja
Multi Delay parameetrid kirjutatakse tavalise FW13 nähtavuspoliitika ja staatuste järgi (nt Ring Freq ainult
tüüpidel, mille FM3-Edit seda näitab). Multi Delay preseti sõna (`MULTITAP_PRESETS`, FM3-Editis „Type“, 39 valikut)
jääb keelatuks. T27 (5.11.2026): FM3 hoidis laadimisel ja kanali aktiveerimisel kõik salvestatud sõnad muutmata
(5 presetti, 484/484), Algorithmi muutmine FM3-Editis muutis ainult ühte sõna, aga preseti valik (Pealing Bells)
täitis 39 sõna. Salvestatud preseti sõna ise täidet ei käivita, seega selle kirjutamine annaks vale sildi.
Time 1–4, LFO 1–2 Rate ja Filter Rate on FW13 XML-i järgi tempo-lukus: kirjutus nõuab sama kanali
Tempo = NONE (seadme vaikimisi Tempo 1 = 1/4). Feedback Send/Return jäid 0.3.49-s lukku (Return avatud 0.3.51-s). Soundi skeem on 0.8.2.
Tõend `references/fm3-shot-t27-multidelay-side-20261105.json`.

## Multi Delay sisendiskeemi kooskõla (0.3.48)

Soundi skeem 0.8.1 aktsepteerib `multidelay` väärtust `insert`-is, mõlemas
`layout` reas ja `layout.columns`-is, `grid` lahtris ning `blockScenes` võtmena.
0.3.47 generaator toetas neid juba, kuid skeemi loendid olid täiendamata.
`test-sound-schema` kontrollib nüüd mõlemat paigutusrežiimi ning vigase kanali,
veeru ja korduva lisamise tõrjumist. Multi Delay parameetrikirjutus jäi
0.3.48-s keelatuks (avatud 0.3.49-s); generaatori SYX-kirjutusloogika ja olemasolevad seadmetõendid ei muutu.

## Multi Delay lisatav (0.3.47, T26)

`insert:["multidelay"]` lisab Multi Delay ploki (MULTITAP, eid 74, üks eksemplar, 121 sõna × 4 kanalit) kasutaja
FW13 doonoripaarist (`references/fm3-multidelay-{empty,fresh}-20261103.syx`) seadme vaikeväärtustega (Quad-Tap Delay).
4.11.2026 hoidis FM3 kõiki 484 sõna ja FM3-Edit näitas plokki genereeritud kohas (rida 3, veerg 7), stseenis 1 sees.
CPU on mõõdetud Base Type'i kaupa: Quad-Tap Delay, Diffusor ja Quad-Tap Band Delay 5,5, Quad Series Delay 6,5,
Quad Parallel Delay 7,0, Quad Tape Delay 8,0 punkti; FM3-Editis valitud tüübid andsid sama tulemuse. Multi Delay
parameetreid 0.3.47 veel ei kirjutanud (avatud 0.3.49-s, preseti valik jääb lukku); `blockScenes` töötab. Tõend
`references/fm3-shot-t26-multidelay-20261104.json`.

## Ten-Tapi ajad vaikimisi kasutatavad (0.3.46, T25)

3.11.2026 laaditi T25-s kaks Ten-Tapi presetit. Rhythm Tap Delay Time 1–10 (20 väärtust 11,7…9000 ms) näitas
FM3-Edit täpselt (lineaarne 0…10 s, täis-ms). Ten-Tap Delay'i Delay Time on lineaarne 0,01…10 s, mitte sõnastiku
0,001…2 s: toorsõnad 650/1950/3214/5200 näitasid 109/307/500/803 ms, esipaneel 803 ms, ja seadme ise tuletatud
Time-sõnad vastasid täpselt. 10 tapiga piiras seade Delay Time'i 1000 ms-ga. `scripts/fm3-tentap-times.mjs` tõstab
11 sõna staatusse `measured`: Time 1–10 ainult tüübis Rhythm Tap Delay (Ten-Tap Delay arvutab need ise ümber) ja
Delay Time ainult tüübis Ten-Tap Delay, kirjutatav 10…1000 ms. Tõend `references/fm3-shot-t25-tentap-20261103.json`.

## Valikunupud vaikimisi kasutatavad (0.3.45, T24)

3.11.2026 laaditi T24-s viis genereeritud presetit (Pitch, Tremolo, Phaser, Wah, Cab, Gate, Multiband,
Plex, Looper, Synth, Ring Mod, Resonator, Formant, Ten-Tap, Megatap). 51 valikunuppu kirjutati algsest
erinevale valikule. Plokkide tagasilugemine (fn=0x1F) klappis sõna-sõnalt ja FM3-Edit näitas kõigil 51-l
täpselt oodatud silti. Esipaneeli foto kinnitas Megatapi Time/Amplitude Shape'i (2/2). Nullist või ühest
algava loenduse nihet ei olnud. Lisaks on 639 jälgitava preseti kehas iga kandidaadi salvestatud väärtus
oma loendi piires. `scripts/fm3-enum-promotion.mjs` tõstab 197 valikut staatusse
`enum-labels-crosschecked` (vaikimisi kirjutatav, `allow` pole vaja): 50 seadmel loetud, 108 sama
sildiloendiga kui juba kinnitatud valik ning 39 T24-s loetud perede unikaalset loendit. 151 jääb opt-in:
kanali tüübi/mudeli valijad (vajavad täit kanalimalli ja *Channels-välja), üldseaded, kontrollerid,
modifikaatorid ja marsruutimine, learn/preset/IR-panga valijad, PEQ/Multitapi unikaalsed loendid ja
PHASER_LFOQUANTIZE. Lõpliku tüübi, tempo ja modifikaatorite piirangud kehtivad endiselt. See ei ole heli
ega STORE/reload'i kinnitus (`MOOTOR/references/fm3-shot-t24-enum-20261103.json`,
`fm3-enum-promotion-20261103.json`).

## Mix, Balance ja täisarvud vaikimisi kasutatavad (0.3.44, T21–T23)

2.11.2026 kasutati T21-s kolme, T22-s üht ja T23-s üht genereeritud presetit.
T21/T22 näidud loeti FM3-Edit'ist ning valitud punktid ka esipaneelilt; T23 väljadele nähtavat nuppu ei leitud.
T21: Mix (lipud 0x0705, 0…100 %, üks komakoht) ja Balance (0x0900, -100…100) 17/17 täpselt üheteistkümnes
plokis; T22: klassi 0x01 täisarvud (bitisügavus, vedrude arv, häälte arv ×2, märgiga nihe -5 jne) 10/10 täpselt.
Need kolm klassi (Mix 17, Balance 29, täisarvud 552 parameetrit) on nüüd vaikimisi kirjutatavad
(`taper-class-verified`, `scripts/fm3-display-classes.mjs`), `allow` pole enam vaja.
27 mõõdetud parameetri põhjal rakendatakse klassireeglit 598 sõnastikukirjele; see ei tähenda
598 parameetri eraldi seadmemõõtmist ega kõigi tüüpide, vahemike, heli või STORE/reload'i kinnitust.
Lõpliku tüübi, tempo ja modifikaatorite piirangud kehtivad endiselt. Enhancer/Formant Balance
(lipud 0x0980) jääb opt-in. T23: Ampi `DISTORT_DYNDEPTH` / `DISTORT_DYNPRES` salvestuvad täpselt, aga neil pole
FM3-Edit'is ega esipaneelil nuppu; need jäävad lukku (`MOOTOR/references/fm3-shot-t2{1,2,3}-*-20261102.json`).

## Cabi ploki Low/High Cut asukoht (0.3.43, T20)

2.11.2026 loeti Cab B (DynaCab, Preamp Type Tube) lõikenupud: `CABINET_LOCUT` / `CABINET_HICUT` (pid 38/39) on
Preamp lehe "Filters" Low Cut / High Cut (koos Low/High Cut Slope'iga), `CABINET_LOCUT1` / `HICUT1` on Cab lehe
Cab 1 lõiked. Näidud 87,0 Hz / 7300 Hz / 33,0 Hz on täpsed, Cab 1 High Cut 12499,9 Hz näitas 12499 Hz. Preamp Type
NONE variant jäi T20-s tegemata (`MOOTOR/references/fm3-cab-cut-t20-20261102.json`).
Hilisem T34F kinnitas lõigete nähtavuse NONE-iga ettevalmistatud presetis; Preamp Type väärtust
NONE ennast ei loetud tagasi. See asendab T20 vana nähtavuse-lahtist küsimust, kuid ei kinnita
Type väärtuse tagasilugemist (`references/fm3-t34-controllers-sources-20261107.json`).

## Cabi, Drive'i, Chorus'e, Flangeri, Wah ja Rotary nuppude näidud (0.3.42, T19)

31.10.2026 loeti FM3 esipaneelilt 50 tabelikirjutaja nuppu: Cab B (DynaCab: Level, Cab 1 Level, Pan, DynaCab,
Distance), Drive B (T808 OD: Low Cut, High Cut, Bias, Slew Rate, Bass, Mid, Mid Frequency, Treble), Chorus D
(Japan CE-2: Rate, Depth, Mix, Minimum Delay, High Cut, Low Cut, Drive, Level), Flanger A (Analog Stereo: Rate,
Depth, Feedback, Manual, Mix, High Cut, Drive, Level), Wah C (Cry Babe: Frequency Min/Max, Resonance Q, Q Tracking,
Drive, Fat, Low Cut, Level) ja Rotary A (13 nuppu). Kõik 50 võrduvad kodeerija väärtusega näidatud komakohtadeni,
sh kuus knob-klassi nuppu (display = n · kordaja). Chorus/Flanger/Rotary Mix (`linear-by-structure`, vajab
`allow`) said esimese seadme näidu; kirjutusõigus ei muutu. Cabi ploki Low Cut / High Cut (pid 38/39) jäid
mõõtmata: DynaCab lehel on Cab 1 enda lõiked (`MOOTOR/references/fm3-knob-read-t19-20261031.json`).

## Ampi, Delay ja Reverbi nuppude näidud (0.3.41, T18)

31.10.2026 loeti FM3 esipaneelilt veel 28 tabelikirjutaja nuppu: Amp A (USA MK IV Rhythm 1: Gain, Bass, Mid,
Treble, Master Volume, Presence, Depth, Level, Low Cut, High Cut, Input Trim), Delay B (2290 w/ Modulation: Time,
Feedback, Mix, Level, High Cut, Low Cut, LFO 1 Rate, LFO 1 Depth) ja Reverb C (Large Plate: Time, Size, Pre-Delay,
High Cut, Low Cut, Mix, Level, High Decay, Depth). Kõik näidud on kodeerija väärtusest ühe näidusammu piires;
27 täpselt, Reverb High Cut 6500,05 Hz näitas 6500,0 Hz. Delay ja Reverbi Mix (`linear-by-structure`, vajab
`allow`) said esimese seadme näidu; kirjutusõigus ei muutu. Sõnastiku "Amp1 Level" on FM3-s lihtsalt "Level"
(`MOOTOR/references/fm3-knob-read-t18-20261031.json`).

## Nuppude esipaneeli näidud (0.3.40, T17)

31.10.2026 loeti FM3 esipaneelilt 23 tabelikirjutaja nuppu, mille väärtuse oli kirjutanud generaator:
Compressor C (JFET Studio: Threshold, Ratio, Attack, Release, Level, Mix), Phaser B (Modern Vibe: Rate, Depth,
Feedback, Min/Max Frequency, Tone), Tremolo A (Bias Trem: Rate, Depth, Duty Cycle, Level) ja Pitch C (Crystal
Echoes: Shift 1, Detune 1, Level 1, Delay 1, Feedback 1, High Cut, Low Cut). Kõik näidud vastasid kodeerija
väärtusele (lineaarne/logaritmiline skaala ja kordaja); 22 täpselt näidatud komakohtadeni, Pitch High Cut 6000,07 Hz
näitas 6000,0 Hz. Need nupud võid nendel tüüpidel nimetada seadmel kinnitatuks; teised nupud ja tüübid jäävad
FW13 kirjeldaja järgi kirjutatuks (`MOOTOR/references/fm3-knob-read-20261031.json`).

## GitHubi seadmetõendite koondamine (0.3.26, 27.10.2026)

See väljalase toob pluginasse GitHubi põhiharusse commit'iga
`7dd70a5a2fc3145b03177c9913e8bd458166565f` liidetud 26.10.2026 katsed.
Kasuta allolevaid uusi tõendeid varasemate „mõõtmata” märkuste täpsustamiseks;
ajaloolisi toorandmeid ei muudeta ega samu katseid uuesti nõuta.

- **T1 Scene MIDI:** Helix kinnitas kanalil 1 MIDI OUT pesa PC/CC käsud,
  käsupesa 8 ning kahe käsu saatmise. PC bait vastab FM3 Value väljale.
  Preseti laadimine redaktsioonipuhvrisse saatis katses Scene 1 käsud:
  teavita sellest kasutajat enne sellise preseti kontrollimporti. USB väljundit
  nendes katsetes ei täheldatud. Muud kanalid, vastuvõtjad ja vahemike otsad
  jäävad eraldi. Loe [Scene MIDI juhendit](engine/docs/FM3_SCENE_MIDI.md).
- **T2 Volume-pedaal:** kand 0.00 ja varvas 10.00 ning seos säilisid pärast
  kasutaja STORE/reload'i. Salvestatud 6485 sõna erinesid genereeritust ainult
  valitud stseeni sõna poolest. Heli ja täpne pedaalikõver on mõõtmata.
  Loe [Volume-pedaali juhendit](engine/docs/FM3_VOLUME_PEDAL.md).
- **T3 Pitchi loendipiirid:** TRACKMODE word 2 = CHORDS ja TEMPO word 78 =
  63/64 on seadmel kinnitatud; mõlema loendi kõik 80 sõnastikus olevat silti
  klapivad. Tõend: `MOOTOR/references/fm3-label-boundary-20261026.json`.
- **T6 CPU:** kaheksa preseti salvestatud stseenides oli näit 40,5–76 %.
  Esimene koguja ei valinud soovitud suurima kuluga stseeni; ära nimeta seda
  kõigi stseenide kontrolliks. Ühe preseti eraldi kaheksa stseeni katses oli
  maksimum 82 % ja hinnang 80,5 %. Hinnang pole täpne piirgarantii.
  Loe [CPU juhendit](engine/docs/FM3_CPU.md).
- **T8 CPU (28.10.2026):** Satriani V4 kõigi 8 stseeni hinnang klappis näiduga 0,4 punkti
  piires. Out 2 ploki eemaldamine langetas näitu 1 punkti, shundid 0 punkti.
  `fm3-cpu 0.2.2` arvestab Out 2 kuluks 1 punkti. Tõend: `MOOTOR/references/fm3-cpu-t8-20261028.json`.
- **T7 modifikaatorinäidud (28.10.2026):** FM3 näitab allika numbrit kujul kood + 1
  (51 → „52 Control Switch 2“). Lüliti Min/Max 0/65534 = OFF/ON; sõna 17 = 4 → CHAN D;
  sõna 10 = 5 → Auto-Engage MED POS; sõnad 7/15 väärtusega 66 → 10,1 ms, väärtusega 65 → 9,9 ms.
  Korduskatse T7b: pidevate sihtmärkide Min/Max on sihtparameetri enda salvestussõna (Rotary Rate 0,503/6,424 Hz,
  Ampi graafilise EQ 3. riba 0,03/3,98, Wah Control 0/10). Mid ja Slope = sõna/65534 %, Scale ≈ 10^((sõna−32767)/32767).
  Tõend: `MOOTOR/references/fm3-modifier-display-20261028.json`.
- **Volume pedaali Min/Max (0.3.31):** `volumePedal:{min:0..10, max:0..10}` kirjutab sõnadesse 1/2 VOLUME_GAIN-i
  kodeeringu (näiteks 2.5 → 16384). Teised sõnad jäävad ekspordi vaikeolekusse. Kodeering on seadme näiduga
  kinnitatud kolmel teisel sihtmärgil ja Volume'il endal (T10: Modify leht Min 2.50 / Max 7.50, pedaal kannas 2.50 → varbas 7.50,
  `MOOTOR/references/fm3-volume-range-20261028.json`). `true` tähendab 0/10.
- **T9 seoste STORE (28.10.2026):** Wah (External 1, kirje 0), Volume (External 1, kirje 1),
  CS2 → Input Boost ja CS3 → Bright jäid pärast STORE-i ja uuesti laadimist alles. Modifikaatorikirjed
  klappisid sõna-sõnalt ja pedaal liigutas nii Wahi kui Volume'i. Wahi Scene 1 bypass salvestus
  sisselülitatuna, sest Auto-Engage lülitas Wahi pedaali liigutamisel sisse. FM3 salvestab hetkeoleku.
  Control Switchi lülitamist ei kontrollitud. Tõend: `MOOTOR/references/fm3-bind-store-20261028.json`.

Kommertspaketi presetid ei kuulu pluginasse. Uut seadmekatset selles
väljalaske koostamise etapis ei tehtud. Kirjutustoe ulatus ja kaitsed säilivad.

## 5. punkti ruudustikuaudit (0.3.25, 25.10.2026)

Olemasoleva SYX-i marsruutimise uurimiseks kasuta `node MOOTOR/scripts/fm3-preset.mjs
--inspect-grid PRESET.syx`; tekstiks lisa `--format txt`. Loe
[ruudustikuauditi ulatust](engine/docs/FM3_GRID.md). Käsk ainult loeb faili.
Kontrolli kõiki 48 lahtrit, `raw`/`knownMask`/`unknownMask` eristust, allikaid,
lõppe, katkenud harusid ja kirjete täielikku lugemist. Bitt 4 ei ole viies rida
ega tõendatud heliühendus. Tundmatuid bitte ära eemalda ega tõlgenda.

`consistent-known-edges` ei kinnita heli, bypass'i, IR-i, Mixeri/Multiplexeri
sisemist valikut ega kirjutusluba. Send/Return on auditis eraldi lõpp ja allikas;
audit ei lisa nende vahele oletuslikku kaablit. Out 2 kirjutamine on olemas (`duplicate:["out2"]`, 0.3.32);
In 2 tuvastamine ei ava kirjutustuge. FOH+monitori ega 4CM-i töövoogu see ei kinnita. Osaline
kirjelugemine ei tõenda puuduvat plokki; eraldatud plokk võib olla tahtlik.
Generaator kasutab endiselt ainult toetatud alusfaile ja tervikpreseti kontrolle.

Scene MIDI jääb ühendamata ka heliploki kõrval; 0.3.25 lõppkontroll arvestab
seda õigesti. Sisend Scene MIDI-sse või heli võtmine selle väljundist jääb
keelatuks. Tarkvaratestid ei ole uued seadme tagasilugemised.

## 3. punkti parameetrikaart (0.3.24, 25.10.2026)

Enne parameetri skaala või toe oletamist küsi `node MOOTOR/scripts/fm3-preset.mjs
--parameter-map PERE PID_VÕI_NIMI`, näiteks `chorus VOICES`, `cab 93` või
`pitch TEMPO`. Ilma pere argumendita saad koondi; `--all` väljastab kogu kaardi.
Kasuta [parameetrikaardi juhendit ja tõenditasemete selgitust](engine/docs/FM3_POINT3_PARAMETERS.md).
Kaart ühendab 3223 pere/PID võtit, 2892 sõnastikukirjet ja 1298 varasemat
vaatlust. See on ainult lugemine. `tableScalarEligible` ei anna kirjutusluba:
tervikpreset kontrollib lõpptüüpi, kanalit, paigutust, tempot ja modifikaatoreid.
Erista algset `dictionary` väidet, `effective.scale` sisendit ning `evidence`
mõõteulatust. Tundmatut kõverat või vigast salvestussõna ära kuva arvuna.
Chorus Voices kasutab näite 2/4/6/8; Plex Number of Delays 4/6/8; Cab R1/R2
0..10. Pitchi globaalskaala vali sildiga `SCALE 1`…`SCALE 32`.
Korduva loendisildi puhul valib string esimese vaste; teise jaoks kasuta kaardi
arvulist `word` väärtust. Kahe 1-põhise Pitch-loendi viimased sildid on 26.10.2026 seadmel kontrollitud:
TRACKMODE word 2 = CHORDS ja TEMPO word 78 = 63/64. Tõend on
`MOOTOR/references/fm3-label-boundary-20261026.json`; see ei tõenda nuppude skaalasid.

## 2. punkti lõppfailide kontroll (0.3.23, 25.10.2026)

Kasuta [nelja faili kontrolli ulatust ja näidiste seisundit](engine/docs/FM3_POINT2_OUTPUTS.md).
`--verify OUTPUT_STEM` kontrollib räside kõrval kogu SYX-i, TXT-i ja raporti
vastavust spetsifikatsioonist ning räsi järgi leitud paketi alusfailist uuesti
koostatud tulemusele. See kehtib nii `layout`/`grid` kui ka toetatud vanade
koostajaprofiilide kohta. Muudetud Amp/Cab-mallipäring, stseen, säilitatav sõna,
vahearuande sisu või kontrolliväide ei tohi uuendatud räsiga kontrolli läbida.
Ära eemalda ebaõnnestuvat kontrolli ega arvuta räsi ümber selle peitmiseks.

Kontrolli ajaloolist nelja faili komplekti sama kontrollitud mootoriversiooniga,
mis selle lõi. Uue mootori raport/poliitika võib erineda ka muutmata SYX-i korral.
Vanad `examples`-failid on tõendite ajalugu: 48 näidet taastuvad baittäpselt,
kahel neist lisab test mälus puuduva schemaVersion/firmware päise ning kahel
taastab täieliku päringu olemasoleva ajaloolise regressioonitesti põhjal.
P6 A/B vanad sisendid ja eksperimentaalne Taper-test ei ole praeguse avaliku
sisendilepingu näidised; ära lõdvenda nende pärast Volume/Ten-Tap/raw kaitseid.
Failikontroll on tarkvaraline kooskõla, mitte autentsusallkiri ega seadme-,
heli- või CPU-kinnitus. Kontrollitud globaalvaatlused jäävad kogumisaja tõendiks.

## 6. punkti seadmevaba kontroll (0.3.22, 25.10.2026)

Kasuta [6. punkti katvuse ja piirangute tabelit](engine/docs/FM3_POINT6_BLOCKS.md).
FW13 XML-poliitika katab nüüd 13 peret ja 515 PID-i. Lisanduvad Mixer,
Multiplexer, Formant, Megatap, RingMod, Resonator, Looper ning ainult loetava
MultiDelay (0.3.49-st kirjutatav, preseti valik lukus). Kirjutamisel kontrolli lõplikku tüüpi ja tegelikku
kanalite arvu: Looper A; Megatap/RingMod/Resonator A–B; teised A–D.
Resonatori Manual/Chordal juhikud erinevad. Synthi, Megatapi ja RingModi
PID 0 või peidetud TYPE ei tähenda kasutajale valitavat plokitüüpi.

Mixeri `DELAY1`…`DELAY4` nimed seotakse PID-idega 17…20 kinnitatud
FM3-Edit ARM64 kirjeldustabeli ja FW13 vahemälu alusel. Ajaloolise sõnastiku
skaalad ja tõendistaatused ei muutu. Delay 5/6 ei ole toetatud.
Looperi Record/Play/Once/Reverse/Undo/Dub on käivituskäsud, mitte lubatud
skalaarseadistused. Feedback Send jääb blokeerituks; Multi Delay Type ainult `multidelayTypes` mallina (0.3.56).
Feedback Returni kolm juhikut kanalil A on kirjutatavad alates 0.3.51-st
(plokk Multi Delay on lisatav 0.3.47-st, parameetrid kirjutatavad 0.3.49-st).
`--inspect-modifiers` kasutab 24 pere poliitikaid ning kontrollib ka 1/2-kanalilisi
kirjeid. Puuduv kanal ja tundmatu seis jäävad teadmata; nähtavus ei tõenda
modifikaatori tuge ega luba uut seost kirjutada.

Kasutaja presetikausta inventeerimiseks käivita MOOTOR-i
`scripts/fm3-corpus-audit.mjs --input DIRECTORY --output NEW_REPORT.json`.
See loeb kohalikke `.syx` faile, ei ava MIDI-t ega võrku ning ei muuda preseteid.
Raport sisaldab räsi- ja struktuuriandmeid; failinimesid, presetinimesid ja
parameetriväärtusi ei väljastata. Kommertspaketi presetifaile ära avalda.
Kui nimetatud kaust pole selles keskkonnas kättesaadav, ütle seda; ära väida,
et selle sisu on kontrollitud. Seadme import/STORE, heli, CPU ja Scene MIDI
tegelik väljund ei ole nende tarkvaratestidega kinnitatud.

## 4. punkti seadmevaba koondtöö (0.3.21, 25.10.2026)

Kasuta [4. punkti tõendi- ja piirangutabelit](engine/docs/FM3_POINT4_OFFLINE.md).
0.3.21 staatiline analüüs leidis FW13 kirjepesa otsingu ning loomise/eemaldamise
harud. Tookord ei olnud teise kirje lähtestus tõendatud. Hilisem piiratud
Wah + Volume kirjutaja kasutab kirjeid 0 ja 1; Volume Min/Max on toetatud.
Üldist jaotajat ei ole. Alates 0.3.54-st toetab `modifierEdits` sama koostamise
käigus loodud seoste piiratud eemaldamist ja asendamist (vt eespool).

`--inspect-modifiers` eristab põhi- ja teisese allika aktiivsust, Source NONE-i,
väljalülitatud sihtseost ja sidumata kirjet. External-kontrolleri sõltuvused
näitavad iga viite kirjet ja rolli; globaalne pedaali/CC vastendus ning hetkeväärtus
jäävad teadmata. TXT ja JSON lähtuvad samast 16 pere tüübipoliitikast.
0.3.21 ajal tehtud paketiinventuur ei leidnud kahe aktiivse seose näidet;
hilisemad T9 ja T11 tõendid kinnitavad piiratud mitme seose kirjutust.
Ära nimeta sidumata või Source NONE kirjet üldiselt tõendatult vabaks pesaks.
Uut REA teenusekäivitust ega seadmemõõtmist ei tehtud; varasem REA eksport ja
uued kohalikud staatilised kontrollid on eraldi tõendikihid.

## Modifikaatorite auditi laiendus (0.3.20, 25.10.2026)

`--inspect-modifiers` kontrollib nüüd 16 pere salvestatud A–D tüübisobivust:
varasemale 11 perele lisanduvad PlexDelay, Gate/Expander, TenTapDelay, Synth
ja Multiband Compressor. Kasutatakse samu räsi järgi kinnitatud FW13 reegleid
nagu generaatoris. Tundmatu tüüp jääb teadmata; Synthi ja Multibandi PID 0
ei ole plokitüübi valija. `available` ei kinnita modifikaatori tuge, DSP mõju
ega kirjuta seost presetisse.

[Kirjepesade eeltöö](engine/docs/FM3_MODIFIER_AUDIT.md#wah-ja-volume-koos-kirjepesade-eeltöö-0320)
eristab passiivset Wah-seost ja sidumata kirjeid. 0.3.20 kirjutajad kasutasid
mõlemad esimest kirjet. Alates 0.3.30-st kasutab samaaegne Volume-seos kirjet 1;
vaba pesa üldist jaotamist ei toetata. See ajalooline eeltöö ei olnud seadmekatse.

## Auditi offline-täiendused (0.3.19, 25.10.2026)

Kasuta PlexDelay, Gate/Expander, TenTapDelay, Synth ja Multiband Compressori
kirjutamisel lõpliku kanali tüübipoliitikat (`references/fm3-insert-applicability.json`):
242 parameetri nähtavus pärineb sama FM3-Edit 1.07.17 FW13 paigutusest.
Peidetud väljad, mõõdikud, TenTap Learn/Reset ja Plexi presetivalik ei ole lubatud
skalaarseadistused. Synthi ostsillaatorite ja Multibandi Auto Att/Rel dünaamikat
see XML-kontroll ei tõenda. Tundmatute skaalade kirjutamine jääb blokeerituks.
Plexi/TenTapi/Multi Delay 17 tempo-seost (Multi Delay 7: Time 1–4, LFO 1–2 Rate, Filter Rate; vaikimisi Tempo 1 = 1/4, seega kirjuta Time koos Tempo NONE-ga) kuvatakse ka lõpparuandes; aktiivse modifikaatori
siht ja tempo ei tohi sattuda vastuollu.

Käivita `--verify OUTPUT_STEM` kõigi nelja väljundfaili kontrolliks. Kontroll loeb
SYX-i uuesti, rakendab spetsifikatsiooni kontrollid muutmata koopiale ning võrdleb
kanalisõnu, nähtavaid parameetreid, sõltuvusi, raportit ja TXT väärtusi nii `layout`
kui ka `grid` režiimis. Räsid üksi ei kinnita sisulist kooskõla.

Lähterepo `docs/fm3/parameter-evidence/registry.json` loeb efektiivsed skaalad ja kirjutamispoliitika töötavast mootorist.
23.–24.10 valikunimed, paneelinäidud, muutmata algväärtused, vaieldav Release'i näit
ja 16 756 salvestatud sõna on eraldi tõendiliigid. Ära käsitle neid täieliku
skaala, kõigi kombinatsioonide, heli ega uue seadmekatse kinnitusena.

## GitHubi andmete koondamine (0.3.18, 24.10.2026)

0.3.18 sisaldab GitHubi põhiharu `93811dc6c4b9579fdd1076910443aba99773ab84`
uusi andmeid: Scene MIDI PC/CC, Volume/Pan AUTO-SWELL, Input Threshold OFF,
23.–24.10 seadme tagasilugemised, loendinimed, skaalapunktid ja pedaali vaatlus.
Väljalaske enda täpne commit tuleb avaldamiskviitungist ja release-manifest.json-ist.
Järgnevad kehtivad kokkuvõtted asendavad ajalooliste kviitungite „notMeasured”
märked ainult konkreetselt lisandunud tõendi ulatuses. Varasemaid toorandmeid ei muudeta.
Riistvarakinnitus puudutab nimetatud katsepresette ja punkte; uus kombinatsioon,
täisvahemik, heli ja MIDI OUT-i tegelikud sõnumid vajavad eraldi tõendit.

## Input gate ja Volume/Pan (0.3.15–0.3.18)

Selles versioonis on piiratud Input 1 ja Volume/Pan 1 kirjutustugi.
Tegelik avaldamine ja laaditud commit kinnitatakse väljalaskekviitungist. Input 1 viie arvparameetri
A–D kirjutustugi säilib: THRESH, RATIO, RELEASE, ATTACK, LEVEL. Ratio/Attack
vajavad ADVANCED-režiimi. Type, Mode, Input bypass, impedants ja meter säilivad;
Threshold −100 dB on FM3-l „OFF“ (salvestatud sõna 0). See on Input 1, mitte eraldi Gate-plokk.
Kasutaja ühe tagastatud FW13 ekspordiga kinnitati kõigi 20 valitud Input-sihtsõna
ning kogu ülejäänud Input-kirje säilimine.
Esipaneeli kontroll (24.10.2026, `references/fm3-step-diff-input-volume-20261024.json`): kõik 9 näitu
klappisid generaatori kodeeringuga sõna-sõnalt. Mõõdeti:
- Input Threshold −40 dB, OFF ja −80 dB ning Level +6 dB;
- Volume 0 / 2,5 / 7,5, Level −10 dB ja Balance −67.
Katse 6 (`references/fm3-step-diff-gate-pan-20261024.json`) mõõtis Input Ratio 4,00/10,00, Attack 10,03 ms,
Release 199,89 ms ning Volume Pan L −50 ja Pan R 50. Kõik klappisid FM3 näidu täpsusega, Pan-i sõnad täpselt.

Volume/Pan 1 praegune FW13 15-sõnaline A–D kirje on nüüd olemas. Sound-spec'i
`volumePan:true` lisab selle NewLook-alusele; valitud `layout` või `grid` peab sisaldama `volpan`-i.
`controls` kasutab `block:"volpan"`: GAIN, BAL, PANL, PANR ja LEVEL; eraldi
`allow:["enum-labels"]` korral ka TAPER, BYPASSMODE ja INPUTSELECT. Stseenide
kanal/bypass: `blockScenes.volpan`.

**Tüübid**: `TYPE` on `VOLUME` või `AUTO-SWELL` ja vajab `allow:["enum-labels"]`.
- AUTO-SWELL-is on `THRESHOLD`, `ATTACK`, `RELEASE` ja `HYSTERESIS`, lisaks BAL, LEVEL, TAPER, BYPASSMODE ja INPUTSELECT.
- VOLUME-is on GAIN, BAL, PANL, PANR, LEVEL ja enum-väljad.
- Iga välja kontrollitakse kanali lõpliku tüübi järgi. Lõplikus tüübis peidetud väli tõrjutakse, näiteks GAIN AUTO-SWELL-is.
- Kanali BYPASS-sõna ja meter jäävad säilitatavaks.
- `volumePedal` seob Volume'i ja AUTO-SWELL-iga see tõrjutakse.

Pedaaliseose jaoks kasuta allpool kirjeldatud `volumePedal:true` valikut. Aktiivse modifikaatori konflikt tõrjutakse.
Esipaneeli kontroll (24.10.2026, `references/fm3-step-diff-volume-type-20261024.json`):
- TYPE VOLUME ↔ AUTO-SWELL muudab ainult ühte sõna ja teisi väärtusi ei puuduta.
- Auto-Swell Threshold, Attack ja Hysteresis klappisid kodeeringuga.
- Release'i näit 19,999 ms oli tõenäoliselt lugemisviga. Sama sõna andis Input Release'il täpselt
  generaatori väärtuse ja genereeritud 20 ms näitas 20,000.
Generaatori AUTO-SWELL preset kontrolliti seadmel (`references/fm3-auto-swell-verify-20261024.json`):
- kõik plokid ja ruudustik loeti tagasi täpselt sellisena, nagu generaator need kirjutas;
- ekraan näitas küsitud väärtusi: Attack 250 ms kui 249,99 ms ja Release 20 ms kui 20,000 ms.

Volume'i jäädvustatud doonor on vaikimisi **kõigis kaheksas stseenis aktiivne,
kanal A**. Uue soundi loomisel kirjuta `blockScenes.volpan`-i alati kõigi kaheksa
stseeni eksplitsiitne kanal ja bypass. Aktiveeri Volume ainult kasutaja soovitud
stseenides; määramata stseenides kasuta kanalit A ja `bypass:true`. Arvesta, et
kanali A GAIN-i muutmine mõjutab kõiki aktiivseid sama kanalit kasutavaid stseene.
Ainult jäädvustatud ekspordi täpsel taasesitamisel võib doonori stseene säilitada.

Ühe ekspordi plokimall ja Input-sõnade säilimine on seadmetõend. Uued
Volume-väärtused ja skaalad tuginevad FW13 native/cache/XML-i kõveraklassidele ning
eespool loetletud 24.10 mõõtepunktidele. Uued asukohad ja stseenikombinatsioonid
vajavad oma kontrolli. V04 STORE/reload on tõendatud allpool kirjeldatud katses;
see ei tõenda kõigi uute presetite salvestamist, heli/CPU-d ega täisvahemikku. Globaalne Noisegate
Offset / AC Line Frequency ei kuulu preseti sisusse. Wah Min/Max-i tõendusulatus
ja `fullRangeEncodingProven=false` säilivad. Selle ekspordi kordamist pole vaja.

## Control Switch → Amp lülitid ja Wah + Volume (0.3.30, 28.10.2026)

`controlSwitches:[{switch:1..6, block:"amp", param:"DISTORT_BOOST"|"DISTORT_BRIGHT"|"DISTORT_CUT"|"DISTORT_FAT"|"DISTORT_SATSWITCH"}]`
lisab FM3 vaikemalliga seose kanalitega ALL ja täisvahemikus Min/Max. Seosed lähevad kirjetesse alates kirjest 1,
Wahi ja Volume'i kõrval kirjest 2. Mall tuleb FM3 enda salvestatud presetitest (1401 kirjet). STORE ja uuesti laadimine
on kinnitatud T9 ja T11 katsetes. Lülitamist kinnitavad T14/T14b; jalglüliti saab määrata
allpool kirjeldatud `footswitches` väljaga. [Juhend](engine/docs/FM3_CONTROL_SWITCHES.md).
0.3.32: `invert:true` (Min ON, Max OFF) ja `channel:"A".."D"` (sõna 17) on lisavalikud. Kuvamine on kinnitatud T7-s.

## Control Switchi stseeniolek ja jalglüliti (0.3.35)

`controlSwitchScenes: [{switch, scene, state: ON|OFF|LAST}]` seab Control Switchi oleku stseeni valikul ja
`footswitches: [{layout 1–9, switch 1–12, function: latching|momentary, controlSwitch}]` (0.3.36: kuni 24, iga kirje saab oma
PP#-i loendi järjekorras) paneb valitud layout'i lüliti selles presetis Control Switchi juhtima. FM3 esipaneeli lülitid on
layout'i lülitid 1–3; asendus kehtib ainult siis, kui FM3 on selles layout'is. Mõlemad salvestuvad presetti (FC PER-PRESET), üldseadeid ei muudeta, ja mõlemad vajavad sama
CS-i seost `controlSwitches`-is. Ilma nendeta on iga CS igas stseenis OFF. Kodeering on seadmel kinnitatud (T14/T14B) ja
generaatori tulemus võrdub FM3 enda salvestatud kehaga (T14/T14B/T16; asukohad T15). Kui kasutaja on FM3 üldseadetes
per-preset override'i keelanud, asendus ei rakendu – ütle seda. [Juhend](engine/docs/FM3_CONTROL_SWITCHES.md#stseeniolek-ja-jalglüliti-0335).

0.3.66: `footswitches` kirje võib olla ka **efekti bypass** `{layout, switch, effect: "drive1"|"delay1"|"reverb1"}` või
**stseeni valik** `{layout, switch, scene: 1–8}`; neil pole `controlSwitches`-seost vaja. Plokk peab presetis olemas
olema. Kodeering (kategooria 4 = Effect, 3 = Scene; Effect param = FM3 efekti indeks: Drive 1 = 9, Delay 1 = 7,
Reverb 1 = 51) on H5/T44 (11.11.2026) FM3-Editi salvestatud kehast sõna-sõnalt; generaatori kirjutatud lüliti import ja
jalglüliti käitumine on veel kontrollimata – ütle seda. Teisi plokke ei kirjuta (indeks mõõtmata). Lüliti värv ja
Mini-Display silt presetti ei salvestu.

0.3.67 (T45/T46, 12.11.2026): generaatori kirjutatud Drive 1 / Delay 1 / Scene 3 lülitid töötasid FM3 jalglülititel enne ja
pärast STORE-i (salvestatud keha baiditäpne). `effect` võib nüüd olla 27 ploki esimene eksemplar + `resonator2`
(võtmed `getSoundCapabilities().csPreset.effects`-ist); indeksid on FM3-Editi kuvalt (T46). Drive 1 / Delay 1 on
lülitil kinnitatud (0.3.68: T47 lisas Comp 1, Chorus 1, TremPan 1, Pitch 1, Flanger 1, Synth 1, Rotary 1, Reverb 1; 0.3.71: T48 ülejäänud 17 plokki). Kontrollimata on ainult `resonator2`, selle puhul ütle seda. FM3-Edit FW13 võib PP#1 kaardil näidata valesti "Amp 1" (Enhance 1, Filter 1, MultCmp 1, MultDly 1, Plex 1); FM3 ise näitab ja lülitab õigesti. Hold-funktsiooni generaator ei kirjuta. Amp 1, Formant, teised eksemplarid ja
In/Out/FB Rtn pole toetatud. [Juhend](engine/docs/FM3_CONTROL_SWITCHES.md#stseeniolek-ja-jalglüliti-0335).

## Skeem ja sisendikontroll (0.3.37)

`scripts/fm3-sound.schema.json` (0.8.0) tunneb nüüd `controlSwitches`-it (sh `invert`, `channel`), `controlSwitchScenes`, `footswitches`, `volumePedal` kujul
`true` või `{min, max, curve}` ning `out2` ruudustikulahtris ja `duplicate`-is. `test-sound-schema.mjs` kontrollib, et skeem ja
generaator otsustavad uute väljade ja kõigi praeguste näidete puhul sama. Skeemis väljendamatud reeglid (näiteks
min = max, sama sihtmärk kaks korda, Out 2 ilma lingita) kontrollib ainult generaator.

## Out 2, bit 4 ja modifikaatori eemaldamine (0.3.32, offline)

- **Out 2:** grid-režiimis `duplicate:["out2"]` ja `out2` lahter (tavaliselt Out 1 all, link samast reast). Kirje on
  aluse Out 1 kirje ID-ga 43, nagu 332/332 FM3 salvestatud tonepacki presetis. T11 kinnitab STORE/reload'i
  ning Out 2 L heli selles katses. Stereo ja üldine FOH/monitori töövoog jäävad kinnitamata.
  [Ruudustiku juhend](engine/docs/FM3_GRID.md#out-2-0332).
- **Bit 4:** FW13 tonepacki 8463 lahtrist mitte ükski ei kasuta bitti 4 (`MOOTOR/references/fm3-grid-bit4-fw13-20261028.json`).
  Generaator kirjutab edasi ainult bitte 0–3. Biti tähendus on teadmata.
- **Eemaldamine:** FM3 jätab eemaldatud seose kirjesse allika, sihtploki ja PID-i nulliks ning ülejäänud sõnad alles.
  Kirjeid ei nihutata (652/652 kirjet, `MOOTOR/references/fm3-modifier-removal-20261028.json`). `fm3-modifier-removal.mjs`
  oskab seda kirjutada, aga generaator ei vaja seda veel, sest iga preset algab aluselt, millel seda seost pole.
- **Väljade seis:** `docs/fm3/parameter-evidence/modifier-fields-status.md` (GitHub) koondab kõigi 25 sõna dekodeeringu.

## External 1 → Volume/Pan 1 (0.3.17)

Sound-spec'i `volumePedal:true` koos `volumePan:true` lisab **External 1 →
Volume/Pan 1 Volume (VOLUME_GAIN, PID 0), ALL** seose. Vaikimisi on Min 0 ja Max 10;
`volumePedal:{min, max}` seab vahemiku (0.3.31). `volumePedal.curve` (0.3.34) seab Modify-lehe kõvera ja ajad:
`startPercent`, `midPercent`, `endPercent`, `slopePercent` (0–100), `scale` (0.1–10), `offsetPercent` (−100…100),
`attackMs`, `releaseMs` (0–10000). Näiteks `{"min":0,"max":10,"curve":{"startPercent":10,"slopePercent":65}}`.
Puuduv väli jääb ekspordi vaikeolekusse. Kodeering on FM3 natiivne vahemik; iga väli on 29.10.2026 (T12) seadmel ükshaaval
läbi astutud ja valem kordab kõiki 77 seadmenäitu. Mõõdetud punktide vahelised väärtused on seadmel kontrollimata, ütle seda
kasutajale. Kuvanäit võib erineda 0.1 ms võrra (50 ms → 50.1 ms), sest FM3 salvestab sõna. Auto Engage'i ja Off Value'i
valikuid sellel liidesel pole. [Juhend](engine/docs/FM3_VOLUME_PEDAL.md).
Pedaali käitumine on **seadmel kinnitatud** 24.10.2026: FM3-Editis on Volume nupul External 1 modifikaator
ja nupp järgib pedaali kannast varbani; ilma seoseta preset jääb 10.00 peale. 26.10.2026 (T2): kand 0.00, varvas
10.00; kasutaja salvestas preseti ja laadis uuesti, seos ja väärtused jäid samaks ning salvestatud keha klappis
genereerituga peale valitud stseeni (`references/fm3-pedal-store-20261026.json`). Heli ja kõver on mõõtmata.
Ära küsi seda uuesti.
Nõutav on NewLook-aluse muutmata passiivne modifikaatoripiirkond. Muudetud modifikaatorid lükatakse tagasi;
neid ei lülitata vaikimisi välja. `composer.modifiers:{external1Wah:false}` võib passiivse lähteoleku
selgesõnaliselt fikseerida. **Wah + Volume (0.3.30):** `external1Wah:true` korral läheb Volume-seos kirjesse 1.
Mõlemad seosed järgivad sama External 1 pedaali; STORE ja uuesti laadimine on kinnitatud (T9). Muid allikaid,
kanaliulatust, eksemplare ega vaba modifikaatorikirje valimist ei toetata.

Kasutaja üks 23.10.2026 FW13 eksport kinnitas 25-sõnalise vaikeoleku ning kõigi
muude sisubaitide säilimise. Generaator taastab kogu mõõdetud keha täpselt.
`--verify` võrdleb lõpp-SYX-i, TXT-i, speci ja aruannet. Selle sama sisu
korduseksporti ei küsita. Uued paigutus/stseenikombinatsioonid on kontrollitud
arvutis; P1 pedaali järgimine on kinnitatud eespool nimetatud FM3-Editi vaatlusega.
Kanna/varba arvud ja STORE/reload on kinnitatud T2/T10 ning seoste säilimine T9/T11 katsetes.
Pedaali täielik DSP-kõver ja heli mõju ei ole nende arvunäitudega kinnitatud.
`fullRangeEncodingProven=false` ning Wahi Min/Max-i tõendusulatus säilivad.

`GAIN` käsiväärtus on seose korral kõigil A–D kanalitel blokeeritud. `LEVEL`,
teised lubatud Volume-juhid ja stseenide bypass on eraldi seaded. Määra uue
soundi kaheksa stseeni kanal/bypass eespool kirjeldatud viisil. External 1 peab
seadme globaalsetes seadetes olema kasutaja pedaali/MIDI kontrolleriga seotud;
SYX seda ei seadista ning pedaali hetkeasendit ei tõenda.

## Kasutaja kinnitatud seadistus

- Seade: FM3 Mk II Turbo, firmware 13.0. Uue firmware korral kontrolli sobivust.
- Bonamassa „You Don't Own Me” senine test: Ibanez AS-120, humbucker-helipead,
  OUT1 stereo FOH-i. Teise pilli või ühenduse korral kohanda soundi teadlikult.
- Olemas on ka Fender Stratocaster. Ära eelda mõlema pilli võrdset sisendtaset.
- Kasutaja eelistab sammhaaval tööd ning valmis jätkatavaid kogujaid.
- Kohalik Mac: arm64, Python 3.9.6 ja Node olemas; versioone ja tegelikke faile
  kontrolli enne uusi Maci käske. Siinsel täitekeskkonnal pole automaatset Maci ligipääsu.

## Soundi kavandamine

1. Täpsusta ainult puuduv siht: artist/loo versioon või soovitud sound, kitarr,
   helipead, mono/stereo ning väljundseade. Kasuta vajaduse korral võrdlussalvestist.
2. Erista dokumenteeritud artistivarustus enda kuuldelisest lähendusest.
   Kontrolli firmware-spetsiifilisi FM3 fakte Fractal Audio ametlikest juhenditest.
   Ära kanna Axe-Fx III või FM9 võimalusi automaatselt FM3-le üle.
3. Kavanda Amp/Cab, vajalikud efektid ning stseenide helitugevussuhted. Lähtu
   kasutaja toimivast kahe rea Send/Returniga NewLook-alusest, kui muud ei nõuta.
4. Kontrolli iga soovitud binaarkirjutuse tuge capabilities-väljundist. Ära jäta
   toetamata nõuet vaikselt välja ega asenda mudelinime oletusliku ID-ga.
5. Erista faili korrektsus, seadme import/eksport ning heli/CPU ja artistisarnasuse
   hinnang. Kuuldelist või 100% identset artistisoundi ei saa failikontrolliga tõendada.

## SYX/TXT loomise töövoog

Lahenda MOOTOR selle SKILL.md asukohast: `engine/skills/instructions`.
Tee väljundid töökausta väljaspool skill'i/plugina lähtefaile.

1. Loe [koostaja juhendit](engine/docs/FM3_COMPOSER_UNIFIED.md) ning
   [NewLooki paigutust](engine/docs/FM3_COMPOSER_NEWLOOK.md). Nende vanad
   etapimärked alluvad selle juhendi kehtivale seisule.
2. Küsi kirjutustugi ja toetatud alusfailid:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" --capabilities "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx"
   ```

   `$FM3_ENGINE` peab olema enne määratud MOOTORi tegelikuks absoluutseks teeks.
3. Mallidel põhineva preseti jaoks koosta JSON skeemi
   [fm3-spec.schema.json](engine/skills/instructions/scripts/fm3-spec.schema.json)
   järgi: `schemaVersion:1`, `firmware:13`, `baseProfile:"jb-composer"`, nimi,
   vajalikud mallid/juhid ning `scenes`. Paigutuse või tabelijuhtide jaoks kasuta
   [soundi skeemi](engine/skills/instructions/scripts/fm3-sound.schema.json):
   eelmine kirjeldus läheb väljale `composer`; lisa `layout` (kaks jadarida) või `grid` (üldine
   4 × 12 ruudustik, vt allpool) ning vajadusel `insert`, `controls`, `blockScenes`, `selectedScene`, `purpose`, `context`. Alusta toimivast
   `examples/SATRIANI_SOAP_ON_A_ROPE_V3.spec.json` näitest, kui siht seda eeldab.
   `context` väljad on `guitar`, `pickups`, `output`; ära mõtle kasutajainfot välja.
   Loe soovitud efektipere juhendit allpool.
4. Kasuta kontrollitud alusfaili. Eelistatud NewLook-alus on
   `MOOTOR/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx`. Ära sööda tundmatut
   kasutaja presetit automaatselt sellesse piiratud kirjutajasse.
5. Käivita generaator:

   ```bash
   node "$FM3_ENGINE/scripts/fm3-preset.mjs" "$FM3_ENGINE/examples/JB_RHYTHM_LEVEL_MINUS3_NewLook.syx" "/ABS/PRESET.input.json" "/ABS/PRESET"
   ```

   Asenda näidisteed tegelike absoluutsete teedega. Hoia sisend eraldi nimega
   (`.input.json`), sest `.spec.json` on üks neljast uuest väljundfailist.
6. Käivita `node "$FM3_ENGINE/scripts/fm3-preset.mjs" --verify "/ABS/PRESET"`.
   Edukas käivitus väljastab `.syx`, `.txt`, `.spec.json`, `.validation.json`;
   olemasolevat samanimelist väljundit ei kirjutata üle. Puuduv raport või räside
   erinevus tähendab poolikut või muudetud komplekti. Kontrolli raportit ning nõutud mudelite, väärtuste,
   stseenide, kanalite ja bypass'i vastavust. Põhiraport ja TXT kirjeldavad soundi
   lõplikku SYX-i; `stages.composer` on vahetulemus, mitte lõplik seadistus.
   Generaator dekodeerib faili tagasi,
   kontrollib kaadreid, CRC/footer'it ja ainult lubatud sisumuudatusi; veast ei minda üle.
7. Anna päriselt loodud `.syx` ja `.txt` failid, vajadusel spec ja raport.
   TXT peab kirjeldama eesmärki, seadet/firmware'i, pilli ja ühendust, signaaliahelat,
   mudeleid/IR-sõltuvusi, ühikuid, stseene/kanaleid ning tegelikku kontrollitaset.
   Salvesta kasutajale antavad väljundid vastavalt keskkonna failide salvestamise juhistele.

Täiskanalimalli valik asendab valitud kanali kõigi kogutud sõnadega, sealhulgas
selle tasemed; siis rakendatakse selgesõnalised juhid. Määramata kanalid/seaded
säilivad alusest. Ploki lisamine, kanalivalik ja bypass on eri toimingud:
Koostaja tavapärased uued efektiplokid algavad bypass'is ning aktiveeritakse
`scenes` kaudu. Volume/Pan-i jäädvustatud aktiivne vaikeseis on erand: määra selle
kõik kaheksa stseeni eespool kirjeldatud `blockScenes.volpan` kaudu.
Ajaparameetri muutmisel kasuta nõutud selgesõnalist Tempo NONE väärtust.
Genereerimine ei salvesta midagi FM3 presetikohta ega paigalda User IR-i.

Choruse ja Drive’i tabelijuhid kontrollitakse lõpliku kanali tüübi järgi;
sobimatu väärtus põhjustab vea ka PID või experimental/raw kaudu.
[Tüübisobivuse juhend](engine/docs/FM3_TYPE_APPLICABILITY.md) kirjeldab
FW13 reegleid ja piire. Eelista mudelivahetuseks täiskanalimalle.
[Delay/Reverbi juhend](engine/docs/FM3_DELAY_REVERB_APPLICABILITY.md) eristab
mudelit ja sisemist algoritmi: nende valijate muutmine nõuab täiskanalimalli.
Üksik nime-, PID- või raw-kirjutus ei ole lubatud. Muud juhid kontrollitakse
kanali lõpliku mudeli/algoritmi paari järgi; vedrukaja Scattering nõuab lõplikku
Tank Type SERIES-PARALLEL olekut, sõltumata päringu järjekorrast.
[Flangeri, Phaseri ja Compressori juhend](engine/docs/FM3_MODULATION_DYNAMICS_APPLICABILITY.md)
katab veel 67 mudelit. Nende mudelivahetus ja Phaseri Mode nõuavad täiskanalimalli.
Flangeri praegune MANUAL on PID 5; DRYDELAY on PID 6. Vana täpne nimi
OLD_FLANGER_MANUAL jääb PID 6 ehk Dry Delay juurde. Kasuta uusi nimesid;
vanade nimede aadresse ära tõlgenda ümber. Compressori Type on PID 12;
Companderi Ratio/Time/Transients kasutab eraldi välju. Automaatne
kompressoriajastus ja -võimendus ei ole selle nähtavuskontrolliga valideeritud.
[Wah’ ja Tremolo/Panneri juhend](engine/docs/FM3_WAH_TREMOLO_APPLICABILITY.md)
lisab 16 mudeli erisused ja nõuab nende TYPE-vahetuseks täiskanalimalli.
Paragonil puuduvad Bias/Fat/Q Tracking; Panner, Harmonic Trem ja Neon Trem
kasutavad eri juhikuid. Wah’ Control jääb aktiivse pedaalimodifikaatori korral
käsikirjutuseks suletuks; Tremolo Rate nõuab lõplikku Tempo NONE olekut.
[Rotary ja Pitchi juhend](engine/docs/FM3_ROTARY_PITCH_APPLICABILITY.md)
eristab Rotary Rate PID 0 tüübi valijast: Rotaryl Type puudub. Pitchi 16
mudelit kontrollitakse lõpliku tüübi järgi; TYPE nõuab täiskanalimalli.
[Pitchi presetisõnade kodeering](engine/docs/FM3_PITCH_WORD_CODECS.md) lahendab
34 välja: 20 märgiga täisarvu, viis otse salvestatud täisarvu, seitse
kontekstist sõltuvat noodinihet ja kaks enumit algus-ID-ga 1.
Enumites eelista silte; arv tähendab salvestatud ID-d.
CUSTOMSCALE1/2 jaoks eelista silte SCALE 1…SCALE 32; arvuline sisend on endiselt
nullist algav indeks 0…31. NUMREPEATS kood 31 kuvab INFINITE; eelista seda silti.
Staatus preset-word-crosschecked ei tähenda uut riistvaramõõtmist ega live MIDI SET tuge.

Kohaliku kohandatud skaala jaoks loe
[Pitchi kohandatud skaalad](engine/docs/FM3_PITCH_CUSTOM_SCALES.md).
Vali täiskanalimalliga Dual Diatonic, Quad Diatonic, Arpeggiator või
Quad Diatonic Delay ning määra SCALE väärtuseks CUSTOM.
Määra CUSTOMNOTES vahemikus 4…8 ja NOTE2…NOTE8 aktiivsetele astmetele
täisarvulised pooltooninihked toonikast. Esimene aste on alati 0; ülejäänud
aktiivsed nihked peavad rangelt kasvama ja jääma alla 12. Esita terve soovitud
skaala ühes controls-loendis; generaator kontrollib lõppolekut järjekorrast
sõltumatult. Ära kirjuta peidetud astmeid ega TONIC kuvaseadet.
Globaalsete skaalade sisu ei ole presetis. Kasuta validation.json sõltuvusloendit
ja readPlan-i; eraldi lugemisplaani jaoks käivita
node engine/skills/instructions/scripts/fm3-pitch-custom-scales.mjs --scales 1,32
või --all. See väljastab ainult plaani, ei loo seadmeühendust ega loe sisu.
[Tempo- ja modifikaatorijuhend](engine/docs/FM3_PARAMETER_DEPENDENCIES.md) kirjeldab
21 tempo-seost ning olemasolevate modifikaatorite lugemist. Time/Rate kirjutus
nõuab lõpliku kanali Tempo NONE olekut; aktiivse modifikaatori sihtmärgile
käsiväärtust ei kirjutata. Ära lülita modifikaatorit vaikimisi välja. TXT eristab
salvestatud väärtust tempo või kontrolleri juhitud väärtusest. Muude perede
tüübisobivus ja katmata sõltuvused jäävad piiranguks; skalaari olemasolu ei anna
universaalset kirjutusluba.

## Toetatud põhivõimalused

Kasuta järgnevat ülevaatena; täpsed sisendipiirid tulevad koodist ja skeemist.

| Valdkond | Tugi ja juhend |
|---|---|
| Amp/Cab | 336 Amp- ja 45 Dyna-Cab täiskanalimalli A–D; [kanalijuhend](engine/docs/FM3_COMPOSER_AMP_CAB_CHANNELS.md). Üksikjuhid on piiratud mõõdetud kanalite/vahemikega; [Amp Level](engine/docs/FM3_COMPOSER_AMP_LEVELS.md). |
| Muud efektid | Drive, Delay, Reverb, Compressor, Chorus, Flanger, Phaser, Wah, Tremolo/Panner, Rotary ja Pitch: kogutud mallid ning capabilities'is loetletud juhid. Kõigi parameetrite vaba muutmist sellest ei järeldu. |
| Stseenid | Kõigi 8 stseeni nimed, toetatud plokkide kanalid/bypass; [stseenijuhend](engine/docs/FM3_COMPOSER_SCENES.md). Kanaliseade mõjutab kõiki seda kanalit kasutavaid stseene. |
| PEQ | Viis riba, A–D, mõõdetud tüübid/kalded ja arvulised skaalad; [PEQ](engine/docs/FM3_PEQ_COMPOSER.md). Blocking-tüübil pole Q/Gaini kirjutust. |
| GEQ | Kogutud ja koostajas; [GEQ](engine/docs/FM3_GEQ_COMPOSER.md). |
| Enhancer | Modern/Classic/Stereoizer A–D; [Enhancer](engine/docs/FM3_ENHANCER_COMPOSER.md). Nõua `channel`, `type`, `levelDb`; kirjuta ainult tüübi nähtavaid juhte. Bypass on stseeninupp; Bypass Mode'i menüüd ei küsita. |
| Filter | 18 täiskanalimalli A–D ning allpool loetletud 40 täpset mõõtepunkti; [Filter](engine/docs/FM3_FILTER_MEASURED_CONTROLS.md). |

## Lõpetatud kontrollid — ära korda kogumist

- PEQ, GEQ ja Enhanceri kokkulepitud integratsioonietapp on lõpetatud.
  PEQ testidel CPU 47–48%; GEQ suurim kasutaja nähtud CPU 50% ja toimimine kinnitatud.
- Enhancer: 87 GET/SYX-paari, 48/48 sõna igas paaris. Ühise A–D katse kõik
  13804 sisubaiti säilisid. Kasutaja kinnitas: „Suurim CPU 52.7%. Enhancer toimib”.
  [Seadmering](engine/docs/FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json).
  Ära küsi sama preseti importi, eksporti, CPU-d ega Classic Pan Lefti mõõtmisi uuesti.
- Filter: 32 GET/SYX-paari, 40 mõõdetud punkti, 4736 kattuvat sõna. Viimane
  lisa andis 15 paari ja 23 punkti; kaks varast tõrget lahendati korduskatsetega.
  Kõik 32 mõõteoleku sisud taastati generaatoriga täpselt. Q 0.707 on mõõdetud.
  [Audit](engine/docs/FM3_FILTER_REA_AUDIT_20261012.json),
  [generaatori test](engine/docs/FM3_FILTER_REA_GENERATOR_TESTS.json).
  Filter oli bypass'is: aktiivse Filteri heli ja CPU pole selle auditiga kinnitatud.

CPU-näidud kehtivad vastavate testpresetite kohta, mitte iga uue kombinatsiooni
kohta. Kui raport tuvastab varasema seadmeekspordiga täpselt sama kogu sisu,
ära nõua selle korduseksporti. Uue kombinatsiooni puhul märgi kontrollimata osa ausalt.

### Filteri täpsed kirjutuspunktid

| Kanal / Type | Väli | Mõõdetud sihid |
|---|---|---|
| A High-Pass | `frequencyHz` | 20, 80, 120, 250, 750, 20000 |
| B Low-Pass | `frequencyHz` | 20, 1600, 4000, 6000, 8000, 20000 |
| C Peaking | `frequencyHz` | 20, 500, 1000, 2000, 3200, 20000 |
| C Peaking | `q` | 0.1, 0.707, 1, 1.4, 2, 10 |
| C Peaking | `gainDb` | -20, -10, -3, 0, 3, 20 |
| C Peaking | `levelDb` | -80, -30, -6, 0, 3, 20 |
| A High-Pass ja B Low-Pass | `order` | "2nd", "4th" |

Arvesta registris salvestatud ekraaniümardusi: näiteks B 1600→1599.9 ja
C 3200→3199.9 Hz. Nii siht kui ka registreeritud ekraaninäit on toetatud sisendid.
Order PID7: 2nd=0, 4th=1. Ära interpoleeri Filteri suvalisi vaheväärtusi ega laienda
neid juhte mõõtmata tüüpidele/kanalitele. Kandidaatvalemite sobimine ei ava ise kirjutustuge.

## REA ja arenduse jätkamine

REA on uurimisvahend; presetisõna kodeering vajab eraldi tõendit. Macis on
varem seadistatud JDK21, Ghidra12.1.4 ning REA6.4.0 ja FM3-Edit1.07.17 arm64 fail.
Ära alusta nende paigaldamist ega edukat analüüsi uuesti ainult vana dokumendi
„puudub” märkuse tõttu. Kontrolli tegelikke kohalikke teid enne Maci kasutusjuhist.

Viimased kontrollitud uurimistulemused on kaasas:
- [FM3-Editi cache-audit](engine/research/FM3_CACHE_AUDIT_20261012.zip):
  45 sektsiooni, 2509 kirjet, Filteri 37 parameetri metadata ja 11 enumloendit.
- [Native-audit](engine/research/FM3_REA_NATIVE_AUDIT_20261012.zip):
  UI sündmuse, dispatcheri ja parameetripaketi analüüs. Normaliseeritud float'i
  pakkimine ei tõenda automaatselt kõigi presetiparameetrite uint16 teisendust.

Loe arhiive ajutises analüüsikaustas; ära lisa välispakettide sõltuvusi,
FM3-Editi rakendust ega Ghidra projekte plugina paketti. [REA arendusjuhendi](engine/docs/FM3_REA_DEVELOPMENT.md)
varasemad keskkonnatakistused on ajaloolised. Ära muuda kaitse- ega protsessikontrolle.

## Ühendatud generaator — tabelikodeerija, paigutus ja soundid

Säilita 0.3.0 paigutus/tabeliarendus ja 0.2.2 Amp Leveli lisatõendid koos. Kõik teed on MOOTORIS
(`engine/skills/instructions/`) või `engine/docs/`. Detailid: `engine/docs/FM3_TABLE_ENCODER.md`,
`engine/docs/FM3_LAYOUT.md`.

- **Tabelikodeerija** `scripts/fm3-table-encoder.mjs` + `references/fm3-param-dictionary.json`
  (FracTool 3.87 FM3 tabel, 2892 parameetrit, 488 valikuloendit). Väärtused antakse FM3-Edit'i näiduna.
  Kõverad: lineaarne, logaritmiline, nupp (klass 0x5: näit = n × 10), lineaarne dB (0x6).
  Tõendid: 280/280 seadmepunkti, 15/15 partiikatse näitu (`references/taper-batch-20261013.json`),
  12/12 senist juhti. Vaikimisi kirjutatakse measured / taper-class-verified / enum-labels-crosschecked;
  linear-by-structure ja enum-labels vajavad `allow` (0.3.45: 197 valikut on T24 järel enum-labels-crosschecked); unverified-taper (36 kirjet) mitte kunagi.
- **Kahe rea paigutus** `scripts/fm3-layout.mjs`: rida 2 In 1 → … → Send, rida 3 Return → … → Out 1,
  read 1/4 tühjad; plokkide järjekorra määrab sound. Ruudustiku liigutamine on **seadmel kinnitatud**
  (`examples/FM3_LAYOUT_MOVE_TEST_export.syx` keha identne).
- **Soundi koostaja** `scripts/fm3-sound.mjs` (jb-newlook): `composer` → `layout` → `blockScenes` →
  `controls` → `selectedScene` → `controllers` (Control plokk, 0.3.50). Output Scene Level 1–8 (−20…+20 dB) on seadmel kinnitatud.
- **Plokkide lisamine (auditi punkt 6)** `scripts/fm3-insert-blocks.mjs`, väli `insert`: plex, multiband, synth,
  looper, gate, formant, tentap, megatap, ringmod, resonator, multidelay (0.3.47; parameetrid 0.3.49-st, preseti valik lukus) (Volume/Pan: Codexi `volumePan`). Doonor on kasutaja enda FW13 eksport
  värsketest vaikeplokkidest (`references/fm3-default-blocks-20261023.syx`; Multi Delay `fm3-multidelay-fresh-20261103.syx`). Lisatud plokk on kõigis
  8 stseenis kanalil A ja bypassis; sisse lülita `blockScenes` abil. Looperil on 1 kanal, Megatap/Ring Mod/
  Resonatoril 2 (A/B). Plexi TIME1–8 ja LFO Rate kirjutamine nõuab samas spetsis vastava TEMPO = NONE
  (FM3-Edit'i paigutuse lukud, `references/fm3-insert-tempo-locks.json`). Mixer ja Multiplexer lisanduvad
  ainult `grid`-režiimis (punkt 5); Scene MIDI lisandub samuti ainult `grid`-režiimis (vt allpool); kahe rea paigutuses lükatakse see tagasi. Mix-juhid
  kasutavad 0.3.44-s eespool kirjeldatud klassipoliitikat: 0x0705 Mix ei vaja `allow`-d;
  ülejäänud `linear-by-structure` juhid ja alates 0.3.45 opt-in'i jäänud `enum-labels` valikuloendid (tüübivalijad jms) vajavad vastavat `allow`-d. Seadmel kinnitatud on kirjete
  kuju ja genereeritud lisamise import/eksport (`examples/FM3_P6_INSERT_{A,B}*`; seade normaliseerib kirjete
  järjekorra, sisu sama). Kuus CPU-raskemat plokki korraga ületasid CPU piiri: hoia lisatud plokkide arv mõõdukas.
  Klassi 0x01 juhid (nt Shift, Number of Taps) on täisarvud.
  Detailid: `engine/docs/FM3_POINT6_BLOCKS.md`.
- **Üldine ruudustik (auditi punkt 5)** `scripts/fm3-grid.mjs`, väli `grid` (`layout` asemel):
  `rows` = 4 rida × 12 lahtrit (`""` tühi, `"-"` shunt, muidu ploki nimi: in1, out1, send, return, amp,
  drive2, mixer …); `links` = `[{row, col, from:[read]}]` (1-põhine) hargnemiseks ja liitmiseks, muidu võtab
  lahter sisendi sama rea eelmisest veerust. Link nimetab SIHTlahtri, allikas on eelmine veerg: Cabi-järgne haru
  algab Cabist ühe veeru võrra paremal (muidu tuleb signaal Ampist). Kontrolli `.txt` hargnemiste loendit
  ja HOIATUS-ridu. Iga plokk peab olema In 1/Return/Synth'ist Out 1/Send'ini
  ühendatud; iga presetis olev plokk peab ruudustikul olema. `remove` eemaldab plokke (mitte In 1/Out 1/
  Amp/Cab; Send+Return koos), `duplicate` lisab teise eksemplari (drive2, delay2, compressor2, filter2–4 jt,
  ainult tehasepresetites nähtud), `insert` lisab ka mixer/multiplexer ja scenemidi. Uued heliplokid: A, bypass; lülita
  sisse `blockScenes` abil. Tõend: kõik 384 tehase ruudustikku läbivad planeerija ja 4801/4801 sisendmaski
  taastuvad bittide 0–3 osas; bit 4 jääb eraldi tundmatuks (`references/fm3-factory-grid-evidence.json`). **Seadmel kinnitatud** 2026-10-23: 7 testruudustikku
  (hargnemised, liitmised, 4 rida, Mixer, Multiplexer, Synth, eksemplarid, eemaldamine) lugesid tagasi 48/48
  lahtrit (`references/fm3-grid-check-20261023.json`). Ära küsi seda uuesti; heli on veel kuulamata.
  Teiste eksemplaride nimed (`drive2`, `volpan2` jne), kanalid ja bypass kajastuvad lõppfailidest loetud TXT-s ja aruandes.
  `--verify` kontrollib ruudustikku, eksemplare ja CPU aruannet ka uuendatud failiräside korral.
  Koguja peatub vale või ebastabiilse tagasilugemise järel ning säilitab saadetud kaadrid, vastuse ja vea.
  Ebaõnnestunud seanssi ei jätkata automaatselt.
  Maski bitt 4 (mõnes tehasepresetis) ei ole FM3 LAYOUT ekraanil nähtav ja generaator seda ei kirjuta
  (seadmekatse 24.10.2026, `references/fm3-bit4-check-20261024.json`).
  Detailid: `engine/docs/FM3_GRID.md`.
- **Seadmest tagasilugemine (2026-10-23)**: 7 genereeritud presetti (kõik pered, eksemplarid, Mixer/Multiplexer,
  Volume pedaaliseosega, Satriani V3) loeti redaktsioonipuhvrist tagasi; kõik 16 756 väärtust ja ruudustik klappisid.
  Kohta 436 salvestatud preset (kasutaja STORE) ja selle uuesti laadimine säilitasid sisu; seade järjestab kirjed
  efekti-ID järgi. Ära küsi neid uuesti. Detailid: `engine/docs/FM3_DEVICE_READS.md`.
- **Loendite nimed seadmest (auditi punkt 3, 2026-10-24)**: kõigi 32 pere 363 loendiparameetri 5275 nime
  küsiti FM3-lt ja kõik vastasid sõnastikule salvestatud sõna kaupa (41 erinesid ainult lõputühiku poolest).
  Tüübi- ja režiiminimesid ei pea seadmes uuesti kontrollima. Nuppude skaalasid see ei tõenda.
  Kviitung: `references/fm3-label-sweep-20261024.json`.
  Kaks küsimata jäänud viimast nime (Pitch Track Mode „CHORDS“, Tempo „63/64“) kontrolliti 26.10.2026; ka need
  klappisid (`references/fm3-label-boundary-20261026.json`).
- **Scene MIDI (auditi punkt 6)** `scripts/fm3-scene-midi.mjs`, `grid`-režiimis `insert:["scenemidi"]` ja
  `sceneMidi:[{scene, command, type:"PC"|"CC"|"NONE", channel, program (PC) | number, value (CC)}]` (8 stseeni × 8 käsku).
  PC programm on FM3 väli Value (Number näitab PC puhul „--“). Plokk paigutatakse ühendamata lahtrisse (järgmine
  lahter tühi). Paigutus dekodeeriti seadmel 24.10.2026: 11 esipaneeli muudatust, igaüks üks sõna, pluss PC järelkatse
  (`references/fm3-scene-midi-20261024.json`, `references/fm3-scene-midi-pc-20261024.json`). Käsud lähevad MIDI OUT
  pesast välja stseeni vahetusel ja preseti laadimisel (Scene 1); PC bait on täpselt väli Value (Helix, kanal 1,
  26.10.2026: `references/fm3-scene-midi-din-20261026.json`). USB kaudu neid katsetes ei täheldatud
  (`references/fm3-scene-midi-listen-20261024.json`). Ütle kasutajale, et preseti laadimine saadab Scene 1 käsud.
  Detailid: `engine/docs/FM3_SCENE_MIDI.md`.
- **CPU hinnang (auditi punkt 7)** `scripts/fm3-cpu.mjs`: iga stseeni CPU aktiivse kanali tüübi järgi
  (342 seadmes mõõdetud tüüpi + reverbi kvaliteet; piir 80 %, hoiatus üle 72 %).
  Mõõdetud üksikkulud ei taga kombineeritud preseti veapiiri: G06 hinnang 44,3 %, mõõdetud 41,5 %.
  Mõõtmata tüüp kasutab olemasolevat pere maksimumi või mõõdetud võrdlustüüpi; teadmata pered jäävad summast välja ja nimetatakse. Amp/Delay tuuma ei näe. Ütle kasutajale hinnang; vali raskete tüüpide (Plate/Spring
  reverb, Pitch Quad, High/Ultra-High kvaliteet) puhul kergem alternatiiv, kui stseen läheneb piirile.
  Detailid: `engine/docs/FM3_CPU.md`.
- **Satriani "Soap On A Rope"** `examples/SATRIANI_SOAP_ON_A_ROPE{,_V2,_V3,_V4}.*`: V1–V3 kuulatud (V3 26.10.2026:
  Scene 2 RIFF PUSH, Scene 4 SOLO JS410 ja Scene 8 meeldisid; Scene 5 Crunch liiga lahja ja puhas). V4 = V3 + täidlasem
  Scene 5 (ainult Amp C: Crunch Orange, Gain 6, Bass 5.5, Mid 7.5, Presence 4, Level −10 dB). V3/V4 kuulatud
  privaatselt: eelistatud V4, riff 2. stseenil.
  Kõik on SA2 koostajaga baitidentsed.
- **Helivõrdlus** `scripts/fm3-audio-compare.py REF FM3`: kolmandikoktaavi tämber ja stereolaius
  (eelista eraldatud kitarrirada). Efektide tuvastamine EI ole valideeritud — ära väida helianalüüsi
  põhjal phaserit/delay'd.
- Käivita vajadusel `node scripts/test-sound-release.mjs` ja `node scripts/test-upstream-fm3.mjs`.
  Täielik offline-komplekt on `references/offline-suite.json`; ajaloolised testid
  käivita ajutises koopias, sest osa kirjutab tulemusi fixture-kaustadesse.
  Filteri aegunud negatiivne test on parandatud: mõõdetud 2nd order peab õnnestuma,
  tundmatu 3rd peab ebaõnnestuma.
- Loe [väljalaske ja laadimise töövoogu](engine/docs/FM3_RELEASE_WORKFLOW.md).
  Uus test ei muuda klassi/struktuuri põhjal tuletatud parameetrit seadmepunktina mõõdetuks.

## Tõendite säilitamine ja avaldamine

Algne mootor on hoitud alamkaustas `engine`, säilitades selle sisemised failiteed,
impordid ja mõõteandmete kontrollsummad. Varasem pikk juhiste ajalugu paikneb
[HISTORY.md](engine/skills/instructions/HISTORY.md) failis. Loe sealt ainult
vajalikku ajaloolist lõiku; ära käsitle vana „järgmist sammu” kehtiva ülesandena.

Amp-kogumise 990 ajaloolist faili on koondatud 164 kordumatu sisuga taastatavasse
`MOOTOR/references/amp-history.json.gz` arhiivi. Kontrolli vajadusel:

```bash
python3 "$FM3_ENGINE/scripts/fm3-evidence-archive.py" verify
```

Taasta vanad `skills/instructions/references/batch-*` teed ainult ajutisse mootori
töökoopiasse. Algne kataloog, mallid ja lähteandmed peavad säilima kontrollitavana.
Ära paki taastatud ajalugu tagasi avaldatavasse pluginasse. Väljalase peab vastama ühele puhtale Git commit'ile. Kasuta repo
`tools/fm3/test-offline.py` ja `tools/fm3/build-release.py` töövoogu; vana
`fm3-package.py` sobib inventuuriks, mitte commit'iga sidumata väljalaskeks. Eelarve on 4000
faili/kausta/juurkausta kirjet. Kopeeri ainult selle oskuse failid, säilita uue
plugina identiteet ja privaatsus ning uuenda olemasolevat pluginat, mitte ära loo kolmandat.

Riistvaraaudit kasutab kasutaja tellitud lugemist ja eespool kirjeldatud
valikulist tervikpreseti edit-buffer-laadimist. Kontrollimport võib toimuda
FM3-Editis või kontrollitud LOAD/GET skriptidega; mõlemad asendavad tööpuhvri.
Ära saada parameetri SET-i, STORE-i, stseeni/presetivahetust ega üldseadete
kirjutust. STORE jääb kasutajale. Muudatused tee eraldi harul ja PR-is;
liida ainult kasutaja selgesõnalise „liida“ korralduse järel.

## Laadimise kontroll

Enne avaldatud väljalaske kasutusvalmis kinnitamist kontrolli päriselt laaditud
plugina teed, manifesti, versiooni ja eeldatavat täispikka commit-räsi:

```bash
node "$FM3_ENGINE/scripts/fm3-self-check.mjs" EXPECTED_COMMIT_SHA
```

Kasuta väljalaskekviitungist teada olevat commit'i; ära vali väärtust kontrollitava
faili enda põhjal. Skript kontrollib kogu paketi faililoendit ja räsisid ning
teeb teadaoleva preseti kordusgenereerimise. Värskelt lahtipakitud arhiivi kontroll
ei tõenda automaatselt hosti avastust/laadimist. Kui sessioon näeb vana oskust,
puuduvaid engine-faile või erinevat versiooni, märgi laadimine kinnitamata.
Ära kirjuta hosti hallatud skill-kausta käsitsi üle, et kontroll näiliselt läbiks.
Väikese kasutusülesande offline-genereerimine ja failide kontroll lõpetavad
laadimise kontrolli; heli, FM3 import ja CPU on eraldi tõendid.

0.3.3 parandab logaritmilise juhiku null- ja negatiivsete sisendite kontrolli.
DynaCab R1/R2 sisend on **0–10**, mitte protsent. Choruse Delay Range,
Low ning High/EQ on nüüd nimeliselt leitavad; järgi nende FW13 tüübipiire.
Drive Oversampling on redaktoris peidetud ja kirjutamisel blokeeritud.
Vaata [kuue välja lahendust](engine/docs/FM3_METADATA_RESOLUTION.md).
Kontrolli avaldatud versiooni eraldi väljalaskekviitungist; lähtekoodis olev
versiooninumber üksi ei kinnita avaldamist.

## Pitchi kuvasildid

Kasuta lõputute arpeggiatori korduste jaoks `NUMREPEATS: "INFINITE"`.
Vali globaalskaala selgesõnalise sildiga, nt `CUSTOMSCALE1: "SCALE 32"`.
Arvuline sisend säilitab vana salvestuskoodi tähenduse: skaala indeks 0–31.
Kuvasildid on FW13 püsivara põhjal ristkontrollitud, mitte uus seadmemõõtmine.
Globaalsete skaalade sisu ei sisaldu presetis; ära luba selle ülekandmist.

## Globaalsete skaalade toorvastuste kogumine

Kasuta kasutaja kinnitatud lugemisseansi jaoks
`engine/skills/instructions/scripts/global-scale-collector/FM3_GLOBAL_SCALES.py`.
Loe [Pitchi skaalade juhendi koguja osa](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#jätkatav-toorvastuste-koguja).
Koguja piirab saatmise fn=01 / sub=1A / effect=1 / PID=902…1285 päringutega.
`captureComplete` kinnitab ainult toorvastuste kogumist. Kasuta olemasoleva
ZIP-i tõlgendamiseks allpool nimetatud dekoodrit; ära muuda `contentsVerified`
või `liveGetEncodingVerified` tõeseks. `sub=01` on kirjelduspäring; vana
`buildGetParameter` kasutab kirjutavat `sub=09` käsku ja on keelatud.

## Globaalsete skaalade vaatlusandmete lisamine presetile

Kui kasutaja on andnud koguja `results.zip` faili, järgi
[skaalade dekodeerimise juhendit](engine/docs/FM3_PITCH_CUSTOM_SCALES.md#kogutud-skaalade-dekodeerimine-ja-preseti-aruanne).
Käivita `FM3_DECODE_SCALES.py --zip /ABS/results.zip --out /ABS/observations.json`
eelmainitud `global-scale-collector` kaustast. See vajab Python 3.9+ ja töötab
seadmeühenduseta. Algset ZIP-i ei muudeta. Vigast või poolikut kogumist ei aktsepteerita.

Tekstipõhise skaala vaatluse jaoks lisa dekodeerimiskäsule selgesõnaliselt
`--display-only`. Skeem 2 säilitab arvuvälja diagnostika ja märgib TXT-is
lahknevused. Vaikimisi skeem 1 nõuab teksti/arvu kooskõla. Ära käsitle
tekstipõhist tulemust arvukodeeringu kinnitusena ega vaheta režiimi vaikselt.

Lisa ühise generaatori käsu lõppu `--global-scales /ABS/observations.json`.
Generaator nõuab lõpp-preseti kõigi salvestatud Custom Shifteri kanalite
kasutatavate skaalade andmeid. TXT näitab nootide nihkeid, kogumise aega ja
algarhiivi räsi; validation.json säilitab ka dekodeerimise aluseks olevad kaadrid.
Käivita tavapärane `--verify`, mis kontrollib ka vaatlusandmeid ja nende seost
lõpliku SYX-iga. Selle valikulise funktsiooni genereerimine ja kontroll vajavad Python 3.9+.

Erista `observationsIncluded:true` ja `contentsIncluded:false`: andmed on
aruandes, globaalse skaala sisu pole SYX-is ega kandu selle impordiga üle.
Mõlema režiimi tulemus on kogumise aja vaatlus, mitte seadme praeguse
oleku või kogu väärtusvahemiku riistvarakinnitus. Seadme identiteeti/püsivara
see päring ei tuvasta. Ära nõua juba piisava kogumise kordamist.

## External 1 → Wah piiratud kirjutustugi (0.3.5)

Kasuta `jb-composer` kirjelduses `"modifiers":{"external1Wah":true}` või
`false`; soundi ümbrises pane see `composer` sisse. Välja puudumine säilitab
algse seose. Loe [piiratud modifikaatorikirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md).
Kirjutatakse olemasoleva esimese kirje allikas NONE ↔ External 1.
Siht Wah 1 Control, ALL ja muud sõnad peavad vastama tõendatud kirjele;
Auto Engage ja Damping’u režiimi sõnadel on kummalgi kaks allpool kirjeldatud lubatud väärtust.
NewLookil puudub Wah: sisselülitamiseks küsi ka `wahChannels` täiskanalimall.
Seos ei muuda stseenide bypass'i ega seadista globaalset pedaali/MIDI vastendust.
Aktiivse seose puhul lükatakse tabeli Wah Control kirjutus tagasi kõigil A–D
kanalitel. Ära lülita seost välja ilma selgesõnalise soovita. Kõvera/aja väljade
tugi on alates 0.3.34-st kirjeldatud allpool. Suvaliste allikate, üldise kirjepesade
jaotaja ja globaalsete skaalade kirjutamine jääb toetamata; Volume ja Control Switch
kasutavad eespool kirjeldatud eraldi piiratud kirjutajaid.
0.3.13 piiratud mõõtepunktid on kirjeldatud allpool.

0.3.9 ühtlustab JSON-skeemi generaatoriga: ainult `modifiers.external1Wah`
muutev koostajapäring on lubatud ka skeemi järgi. Muid seadeid pole vaja lisada.

## Modifikaatorite failiaudit (0.3.8)

Olemasoleva preseti seoste uurimiseks kasuta
`node "$FM3_ENGINE/scripts/fm3-preset.mjs" --inspect-modifiers "/ABS/PRESET.syx"`.
Lisa `--format txt` loetava eestikeelse aruande saamiseks; vaikimisi väljastatakse
JSON. Käsk loeb faili ja kirjutab ainult standardväljundisse. See ei genereeri
uut SYX-i ega ühendu seadmega. Loe [auditi juhendit](engine/docs/FM3_MODIFIER_AUDIT.md).

Audit aktsepteerib toetatud struktuuriga faili ka väljaspool kinnitatud
koostajaaluseid. See ei anna sellele failile kirjutusluba. Erista 32
serialiseeritud kirjet seadme kasutatavast mahust, aktiivset allikaviidet
stseeni bypass'ist ja kõlavast väärtusest ning FW13 metaandmeid faili tegelikust
püsivarast. Tundmatud allikad/kanalid ja toorsõnad jäävad nähtavaks; teiseste
allikate või kõverate DSP-mõju ei arvutata. Kirjutustugi järgib piiratud Wah-juhendit; audit ise midagi ei kirjuta.

Vaata ka `contextScan` ja `targetContext`: parameetrikirje, ruudustikulahter
ning toetatud ploki kaheksa salvestatud stseeni kanal/bypass on eri faktid.
Tundmatu kirjeloendi või süsteemisaba korral on ploki olemasolu teadmata;
ära nimeta seda puuduvaks. Stseenide kanalikatvus ja bypass ei kinnita seose
toimimist ega kuuldavust. Eksporditud Bonamassa aluses on External 1 aktiivne,
kuid Wah kõigis stseenides bypass'is; NewLookis on sihtseos väljas ja plokk puudub.

Vaata `targetApplicability`: 16 kaetud efektipere A–D kanalite FW13 tüübireegel
annab sobiva, välistatud või teadmata tulemuse. Tundmatu mudeli/valija ega
puuduva või korduva sihtkirje puhul ära järelda sobivust. Kõik kanalid kuvatakse;
`inModifierScope` eristab seose ALL/A–D ulatust. Tüübireegli läbimine ei kinnita
parameetri modifikaatorituge, DSP mõju ega kirjutusluba. Rotary PID 0 on Rate,
mitte Type. Pitchi kohaliku noodi kontekst ei valideeri terve skaala sisu.

## Auto Engage kahevalikuline tugi (0.3.10)

Kasuta `"modifiers":{"wahAutoEngage":"OFF"}` või `"MED SPD"`; soundi
ümbrises pane see `composer` sisse. Välja puudumine säilitab väärtuse.
Kirjutaja nõuab lõppseoses External 1 → Wah 1 Control ALL ning täpset
säilitatud konfiguratsiooni. NewLookil lisa Wah-mall ja selgesõnaline
`external1Wah:true`. OFF ei eemalda modifikaatoriseost ega muuda stseeni bypass'i.
Loe [piiratud Wah-juhendi Auto Engage osa](engine/docs/FM3_WAH_MODIFIER.md#auto-engage-kahevalikuline-kirjutus).
Sõna 10 / keha nihe 1604: OFF=0, MED SPD=2. Ainult see paar on kasutaja
21.10.2026 FW13 ekspordi, OFF-ekraanipildi ja algväärtuse kinnitusega tõendatud.
Ära kasuta muid Auto Engage enumikoode. Min-i kaks mõõdetud punkti ning
0.3.13 Maxi, kõvera ja Attack/Release piiratud punktid on kirjeldatud allpool.
Täpselt sama kogu sisu tuvastamisel ära küsi uut korduseksporti.
Seadme käitumine ja heli jäävad eraldi. Väljalaske avaldamine ja hostilaadimine
kinnitatakse eraldi commit’ipõhise kviitungiga.

## Damping’u režiimi kahevalikuline tugi (0.3.11)

Kasuta `"modifiers":{"wahDamping":"LINEAR"}` või `"EXPONENTIAL"`; soundi
ümbrises pane see `composer` sisse. Väärtused on täpselt suurtähtedes.
Välja puudumine säilitab režiimi; ainult Damping’u päring säilitab Auto Engage’i.
Nõutav lõppseos on External 1 → Wah 1 Control ALL. NewLookil lisa Wah-mall
ja `external1Wah:true`. Damping koos `external1Wah:false` ei ole lubatud.
Sõna 24 / keha nihe 1632: EXPONENTIAL=0, LINEAR=1, kinnitatud 21.10.2026
kasutaja ühe muudatuse ekspordi, kuvatõendi ning algseisu kinnitusega.
Loe [Damping’u piiratud kirjutuse juhendit](engine/docs/FM3_WAH_MODIFIER.md#dampingu-režiimi-kahevalikuline-kirjutus).
Ainult Damping’u päringus jäävad Attack/Release ajad, Min/Max, kõver ja stseenide bypass muutmata.
Auto Engage OFF + LINEAR täpne kogu keha kattub kasutaja järelkatse ekspordiga;
sama sisu uut korduseksporti ei nõuta. MED SPD + LINEAR ja muud kooslused on
eraldi sünteetiliselt kontrollitud kombinatsioonid, mitte selle katse seadmekinnitus.
Damping’u tegelik ajakäitumine, uue faili import, heli ja CPU jäävad eraldi.
Lähtekoodi versioon ei kinnita avaldamist ega hostilaadimist.

## Min-i kaks mõõdetud punkti (0.3.12)

Kasuta `"modifiers":{"wahMin":0}` või `{"wahMin":2.5}`; soundi ümbrises
pane see `composer` sisse. Välja puudumine säilitab Min-i. Ära aktsepteeri
muid arve ega stringsisendeid. Kogu skaala valem ja interpolatsioon on kinnitamata.
Kirjutaja kasutab täpselt ekspordist mõõdetud sõnu 0 ja 16375 (nihe 1586),
mitte esialgse lineaarhüpoteesi 16383/16384. Nõutav on lõppseos External 1 →
Wah 1 Control ALL; 0.3.12 tõendis oli Max-kood 65534, 0.3.13 lubab ka
allpool toodud mõõdetud Maxi koode. NewLook vajab Wah-malli ja
`external1Wah:true`. Max-i ega muid modifikaatorisihtmärke selle paari põhjal ei avata.
Loe [Min-i kirjutusjuhendit](engine/docs/FM3_WAH_MODIFIER.md#min-i-kaks-mõõdetud-punkti)
ja tõendit `engine/skills/instructions/references/wah-min-evidence.json`.
21.10.2026 kasutaja ekspordipaar, ekraanipilt ja kinnitus tõendavad Min 0.00 → 2.50.
Täpselt sama kogu keha taastamisel ära küsi uut korduseksporti; uus fail ei ole
sellega eraldi seadmesse imporditud. Pedaal, DSP, heli ja CPU jäävad eraldi kontrollideks.

## Modifikaatori kümne välja mõõdetud punktid (0.3.13 kandidaat)

`modifiers.wahControls` lisab Max-i täpsed mõõtepunktid ning Start/Mid/End/Slope, Attack/Release,
Scale/Offset ja Off Value suvalise väärtuse FM3 vahemikus (0.3.34: natiivse kirjeldaja valem, mis kordab kõiki
mõõtepunkte ja T12 katset; Off Value 5–95 %). Soundi ümbrises kasuta
`composer.modifiers.wahControls`. Vaata capabilities'i `modifiers.controls`
ja [mõõtepunktide juhendit](engine/docs/FM3_WAH_MODIFIER.md#kümne-välja-mõõdetud-punktid-0313-kandidaat).
Max-i ei interpoleerita. Kõvera/aja välja vahepealne väärtus on valemi järgi ja seadmel kontrollimata; aruanne märgib selle (`basis`). `wahMin` jääb eraldi.

Näiteks `{"wahMin":2.5,"wahControls":{"max":5,"attackMs":500,"releaseMs":1000}}`
kirjutab täpsed mõõdetud koodid; Release'i lõppnäit on 999.9 ms. Täielik B+Max
profiil on juhendis. Välja puudumine säilitab selle väärtuse. Nõutav on lõplik
External 1 → Wah 1 Control ALL seos ja olemasolev Wah 1. NewLookil lisa Wah-mall
ning `external1Wah:true`. Ära muuda bypass'i või lülita seost välja vaikimisi.

A ja B on kaks koondkatset; Max 7.50 → 5.00 on eraldi ühe välja katse.
Koos saadi 20 uut proovipunkti kolme ekspordiga. A Attack on pildil 99.9 ms,
kuigi kasutaja tekstis oli 9.99 ms; vastuolu säilib tõendis. B Max jäi 7.50
ja parandati alles eraldi ekspordis. Ära nimeta koondkatseid sõltumatuteks
üksikmõõtmisteks ega väida täisvahemiku, sõltumatuse, pedaali või heli kinnitust.
Uued punktide kombinatsioonid on kontrollitud arvutis.

Generaator tuvastab kolme kogutud faili täpse kogu keha vaste; sellise vaste
korral ei küsita sama sisu korduseksporti. Tootmisväljalase, avaldamisluba,
CI ja hostilaadimine jäävad eraldi väravateks; kohalik kandidaat ei ole
automaatselt avaldatud plugin. Kodeeringu uus piiratud liides on järgmises osas;
kogu väärtusvahemiku, pedaali ja heli kinnitus on endiselt eraldi.

## Täpne Wah Min/Max (0.3.14)

Kasuta täpse väärtuse jaoks `modifiers.wahMinMaxExact` või soundi ümbrises
`composer.modifiers.wahMinMaxExact`, näiteks
`{"policy":"exact-wah-cent-fw13-hw1","min":"2.50","max":"6.47"}`.
Nõua kahe kümnendkohaga stringi `0.00`…`10.00`; piisab ühest väljast.
Määramata raw-sõna säilib. Nõua lõplikku External 1 → Wah1 Control ALL seost;
NewLookil lisa Wah-mall ja `external1Wah:true`. Säilita stseenide bypass,
kui kasutaja pole selle muutmist palunud. Ära määra sama välja kahe lepinguga.
Vana `wahMin:2.5` jääb hiiremõõtepunktiks 16375; täpne `"min":"2.50"` annab
16384. Vana `wahControls.max:5` annab 32784; täpne `"max":"5.00"` 32767.
Vaata [täpse sisendi juhendit](engine/docs/FM3_WAH_MODIFIER.md#täpse-minmax-sisendi-arenduskandidaat-22102026)
ja capabilities'i `exactMinMax` välja. Erista iga väärtuse tõenditaset:
kuus väärtust välja kohta on riistvaral mõõdetud, 995 põhinevad nelja mudeli
kokkulangevusel. Ära nimeta neid kõiki mõõdetuks ega kogu vahemikku tõendatuks.
Kasuta ühise generaatori nelja faili ja `--verify` kontrolli; uut eksporti
küsi vaid konkreetse lahtise küsimuse jaoks. Seadmeimport, heli ja CPU on eraldi.
