# FM3 arenduskandidaat: väljalase, tõendid ja laadimine

## Sisukord
- Ulatus
- Faili genereerimine
- Väljalase = commit
- Laadimise kontroll
- Järgmine etapp
- 0.3.2 avaldamisvormingu parandus

## Ulatus

Praegune lähtekood valmistab ette 0.3.56: `multidelayTypes` valib Multi Delay Type'i kanali kaupa terve kanali mallina: kanali kõik 121 sõna saavad T35 (7.11.2026) seadmelt loetud kujutise, mis tekkis selle Type'i valimisel vaikimisi kanalil (39/39 mõõdetud, `references/fm3-t35-multidelay-presets-20261107.json`); `controls` rakenduvad malli peale, Algorithm jääb Type'i omaks ja `MULTITAP_PRESETS` jääb `controls`-is keelatuks; skeem 0.8.7, 87 testi, genereeritud väljund seadmel kontrollimata. Selle aluseks on 0.3.55: `controllersScenes` (Controllersi kanal stseeniti, päise sõnad 462+2·(stseen−1)) ja `volumePedal.source` (Volume-seose allikas: External 1 või Controllers ploki allikas, modifikaatori sõna 0); skeem 0.8.6, 86 testi. T33 (6.11.2026) kinnitas stseenid 1–4 = A–D ja LFO 1A; sama sisendiga fail on baiditäpselt FM3 salvestatud asukoht 425 (`tools/fm3/test-t33-controllers-replay.mjs`). Selle aluseks on 0.3.54: `modifierEdits` lisab piiratud eemaldamise/asendamise avaliku sisendi ja tavalise nelja faili kontrolli; skeem 0.8.5, 85 testi. P3 ajalooline SYX taastatakse baittäpselt; uut seadmekinnitust ei lisata. Juhendi ja TXT aegunud Multi Delay / Return piirangud on parandatud. Ajalooliste tõendite taasesitus kasutab Node 22. Selle aluseks on 0.3.53. T31 (5.11.2026) avab Legacy Cabi IR-i kirjutamise (FM3-Edit näitas salvestatud 17/200 kui Factory 1 # 18 / Factory 2 # 201; Bank ja # ainult Legacy-kanalil) ning lisab CPU hinnangusse Plexi, Megatapi, Ten-Tapi, Resonatori, Ring Modi, Gate'i, Synthi, Volume/Pani ja Legacy Cabi tüübipõhised hinnad (54 mõõtmist, `references/fm3-shot-t31-cab-cpu-20261105.json`). Selle aluseks on 0.3.52. T30 (5.11.2026) edutab 28 valikunuppu vaikimisi kirjutatavaks: FM3-Edit näitas EN1/EN2 presetis kõigil 25 loetud valikul (PEQ tüübid, Phaser Quantize, Multi Delay filtrid, 17 Controllersi valikut) täpselt dekodeeritud silti, lisaks T28-s loetud LFO 1/2 Type ja ADSR 1 Mode; 123 jääb teadlikult opt-in'iks (`references/fm3-shot-t30-enum-20261105.json`). Selle aluseks on 0.3.51. T29 (5.11.2026) avab Feedback Return'i kirjutamise: FM3 hoidis laaditud Return'i sõnad ja FM3-Edit näitas Return Level 80.0 %, Output Level −3.0 dB ja Balance 20.0 täpselt; Feedback Send'il pole muudetavaid parameetreid ja seade nullib selle sõnad laadimisel. `controls` lubab plokki `return` (kanal A, kolm nuppu), `send` on keelatud, soundi skeem 0.8.4 (`references/fm3-shot-t29-feedback-20261105.json`). Selle aluseks on 0.3.50. T28 (5.11.2026) avab Controllersi (Control plokk) kirjutamise: FM3 hoidis laaditud Controllersi kirje kõik 520 sõna, FM3-Edit näitas kanalil A täpselt 26 oodatud väärtust ja kanalid B/C/D kirje koopiaid B/C/D. Seega sõna n = PID n ja koopia = kanal; uus väli `controllers` kirjutab nupud ja täisarvud vaikimisi, valikud `enum-labels` loal, soundi skeem 0.8.3 (`references/fm3-shot-t28-controllers-20261105.json`). Selle aluseks on 0.3.49. T27 (5.11.2026) avab Multi Delay kirjutamise: FM3 hoidis salvestatud Base Type'i ja preseti sõna laadimisel ja kanali aktiveerimisel muutmata (5 presetti, 484/484 sõna), FM3-Editis Algorithmi muutmine muutis ainult Base Type'i, preseti valik täitis 39 sõna. Seega on Base Type ja Multi Delay parameetrid kirjutatavad FW13 nähtavuspoliitika järgi, preseti valik (`MULTITAP_PRESETS`) jääb keelatuks, soundi skeem 0.8.2 lubab `controls` plokis `multidelay` (`references/fm3-shot-t27-multidelay-side-20261105.json`). Selle aluseks on 0.3.48 skeemiparandus. Soundi skeem 0.8.1 aktsepteerib Multi Delay lisamist, mõlemat layout-rida, selgesõnalist veergu, grid-lahtrit ning stseeniseadeid. Regressioon kontrollib ka vigaste sisendite ja parameetrikirjutuse tõrjumist. SYX-kirjutusloogika ja seadmetõendid ei muutu. Selle aluseks on 0.3.47. T26 (4.11.2026) lisab Multi Delay ploki (`insert:["multidelay"]`) kasutaja oma doonoripaari põhjal: seade hoidis kõiki 484 sõna, FM3-Edit näitas plokki genereeritud kohas, ja CPU on mõõdetud Base Type'i kaupa 5,5…8 punkti (`references/fm3-shot-t26-multidelay-20261104.json`). Multi Delay parameetreid 0.3.47 ei kirjutanud (avatud 0.3.49-s). Selle aluseks on 0.3.46. T25 (3.11.2026) teeb Ten-Tapi Time 1–10 (Rhythm Tap, 0…10 s) ja Delay Time'i (Ten-Tap, 0,01…10 s, kirjutatav kuni 1000 ms) vaikimisi kirjutatavaks: 20/20 + 4/4 FM3-Edit'i näitu ja 1 esipaneeli näit täpselt (`references/fm3-shot-t25-tentap-20261103.json`). Selle aluseks on 0.3.45. T24 (3.11.2026) teeb 197 valikunuppu vaikimisi kirjutatavaks: 51/51 FM3-Edit'i ja 2/2 esipaneeli näitu täpselt 15 perest, korpus 639 keha loendite piires (`references/fm3-shot-t24-enum-20261103.json`, `fm3-enum-promotion-20261103.json`); tüübivalijad, üldseaded ja kontrollerid jäävad opt-in. Auditi D2: V3/V4 kuulamisvõrdlus on tehtud (V4 eelistatud). Selle aluseks on 0.3.44. T21–T23 (2.11.2026) teevad Mix (0x0705), Balance (0x0900) ja klassi 0x01 täisarvud vaikimisi kirjutatavaks: 27/27 FM3-Edit/esipaneeli näitu täpselt (`references/fm3-shot-t21-mix-20261102.json`, `fm3-shot-t22-int-20261102.json`); Ampi Dynamic Depth/Presence jäävad lukku, sest neil pole nuppu (`fm3-shot-t23-dyn-20261102.json`). Selle aluseks on 0.3.43. T20 (2.11.2026) lisab Cabi ploki Low/High Cut
(Preamp leht) ja Cab 1 lõigete esipaneeli näidud: 3 täpselt, Cab 1 High Cut 12499,9 Hz näitas 12499 Hz
(`references/fm3-cab-cut-t20-20261102.json`). Kirjutustugi ei muutu. Selle aluseks on 0.3.42. T19 (31.10.2026) lisab 50 tabelikirjutaja nupu
esipaneeli näidud (Cab 5, Drive 8, Chorus 8, Flanger 8, Wah 8, Rotary 13), kõik täpselt näidatud komakohtadeni,
sh kuus knob-klassi nuppu; Cabi ploki Low/High Cut jäid mõõtmata (`references/fm3-knob-read-t19-20261031.json`).
Kirjutustugi ei muutu. Selle aluseks on 0.3.41. T18 (31.10.2026) lisab 28 tabelikirjutaja nupu
esipaneeli näidud (Amp 11, Delay 8, Reverb 9): 27 võrduvad koodeki väärtusega näidatud komakohtadeni, Reverb
High Cut 6500,05 Hz näitas 6500,0 Hz (`references/fm3-knob-read-t18-20261031.json`). Kirjutustugi ei muutu.
Selle aluseks on 0.3.40. T17 (31.10.2026) lisab 23 tabelikirjutaja nupu
esipaneeli näidud (Compressor 6, Phaser 6, Tremolo 4, Pitch 7): 22 võrduvad koodeki väärtusega näidatud
komakohtadeni, Pitch High Cut 6000,07 Hz näitas 6000,0 Hz (`references/fm3-knob-read-20261031.json`).
Kirjutustugi ei muutu. Selle aluseks on 0.3.39 (P3) ja 0.3.38. P2 lisab 30.10.2026
kasutaja kinnitatud kolme jalglüliti katse, algse 0.3.37 nelja faili komplekti
ja STORE/reload-järgse ekspordi. Regressioon taastab sama SYX-i praeguse
mootoriga ja kontrollib kogu ekspordikeha; ainsana erineb valitud stseen.
D1 juhendiparandus eristab T8-ga kinnitatud V4 laadimist/CPU-näite endiselt
kinnitamata terviklikust uuest tagasilugemisest ja V3/V4 kuulamisvõrdlusest.
Kirjutustugi ja kehtiva sisendi binaarne tulemus ei muutu.
P2 seadmevaatlused on olemas; väljalaske testid on nende offline-taasesitus.

Säilib 0.3.36 tugi: `footswitches` layout'idele 1–9 ja lülititele 1–12, kuni 24
per-preset definitsiooni; soundi skeem 0.8.0. T16 kolme definitsiooniga keha kordusvõrdlus
ning T15 asukohavaatlus ei kinnita kõigi 24 määrangu seadmekatset. Varasemate funktsioonide
kehtiv kasutus ja tõendiulatus on plugina SKILL.md-s ning vastavates juhendites.
GEQ, PEQ ja Enhanceri kolme ajaloolise mõõtesessiooni 1080 faili
pakitakse ehitamisel ühte taastatavasse arhiivi. GitHubi lähtepuu algandmed,
arendusradade nimed, generaatori kirjutustugi ja kõik varasemad tõendid säilivad.
Uut seadmekatset selles väljalaske koostamise etapis ei tehtud.
Kehtiv tõendusulatus on plugina SKILL.md-s ning vastavate katsete kviitungites.
Avaldamine, täpne commit ja käivitajajuhendi uuendus tuleb kinnitada
väljalaskekviitungis. Versiooninumber üksi ei kinnita avaldamist.

Järgnev kirjeldab varasemates etappides lisatud tuge. 0.3.3 lisas
logaritmiliste juhikute mittepositiivse sisendi tõrjumise. Kuue välja
metaandmed on [lahendatud FM3 enda allikatega](FM3_METADATA_RESOLUTION.md):
DynaCab kuvatav skaala on 0–10; kolm Choruse sümbolit on lisatud; peidetud
Drive Oversampling on blokeeritud. Lisatud on Chorus/Drive tüübisobivus ning
[21 tempo-seose ja olemasolevate modifikaatorisihtide kontroll](FM3_PARAMETER_DEPENDENCIES.md).
Delay/Reverbi [mudeli, algoritmi ja tingimuslike juhikute kontroll](FM3_DELAY_REVERB_APPLICABILITY.md)
nõuab mudelivahetuseks täielikku kanalimalli ning arvestab Spring Tank Type'i.
[Flangeri, Phaseri ja Compressori kontroll](FM3_MODULATION_DYNAMICS_APPLICABILITY.md)
lisab 67 mudeli nähtavuse, Phaseri Mode'i ning kinnitatud Flangeri nimealiased.
[Wah’ ja Tremolo/Panneri kontroll](FM3_WAH_TREMOLO_APPLICABILITY.md) lisab
16 mudeli erisused koos säilivate tempo-/pedaalipiirangutega.
[Rotary/Pitchi etapp](FM3_ROTARY_PITCH_APPLICABILITY.md) lisab Rotary juhikud ja
16 Pitchi mudeli nähtavuse. [Pitchi kodeeringuetapp](FM3_PITCH_WORD_CODECS.md)
lahendab 27 presetisõna teisendust; dünaamilised noodivalikud jäävad suletuks.
Kuvamise eriväärtused ja globaalsed skaalad on eraldi piirangud. Uusi seadmemõõtmisi ei lisatud.
Välised metaandmete ja kodeerimismaatriksi kontrollid asuvad repo
`tools/fm3/` ning `docs/fm3/parameter-evidence/` kaustades.

0.3.2 sisaldab 0.3.1 ühendatud arendust. 0.3.1 ühendas GitHubi 0.3.0 tabeli/paigutuse ja avaldatud privaatse 0.2.2
Amp Leveli tõendid. See ei tähenda kõigi FM3 plokkide, globaalsete seadete,
modifikaatorite, tempo sõltuvuste ega suvalise neljarealise ruudustiku tuge.
Seadmega suhtlemist siin etapis ei lisata. Kasutaja füüsilist osalemist pole vaja.

Esimese etapi parandused:
- kanal peab olema täpselt A, B, C või D; vigased/tundmatud väljad lükatakse tagasi;
- Filteri mõõdetud 2nd order aktsepteeritakse, tundmatu 3rd keeldutakse;
- lõpliku soundi TXT ja põhiraport loetakse kõigi teisenduste järel SYX-ist;
- vahekoostaja raport jääb eraldi `stages.composer` alla;
- üks käivituspunkt annab neli kontrollitavat faili;
- kõik vajalikud offline-testid on nimeliselt loetletud; puuduv test ebaõnnestub.

`references/evidence-index.json` sisaldab references/examples-failide räsipõhist
inventuuri. Sama sisuga kordused viitavad ühele sisule. See pole veel kõikide
parameetrite firmware/tüübi/kanali/vahemiku täielik tõendiregister. Mõõteulatuse
kohta jäävad määravaks vastavad registrid ja testides olevad väited.

GitHubi forgefx-midi FM3 korpusest on kaasatud kümme SYX-i ja nende oodatud
parameetrid koos lähtecommit'i ning litsentsiteabega. Need kontrollivad dekoodri
regressioone. Ühine koodekipäritolu ega teise firmware'i fixture ei tõenda
sõltumatult FW13 parameetriskaalat või uue preseti tegelikku laadimist.

## Faili genereerimine

Kasuta `scripts/fm3-preset.mjs BASE.syx SPEC.json OUTPUT_STEM`.
Vanad koostaja sisendid toimivad; paigutuse ja tabelijuhtide puhul kasuta
`scripts/fm3-sound.schema.json` ümbrist. Ühine capabilities sisaldab nii
`composer` tuge kui ka paigutuse/tabeli piiranguid.

Käsk loob `.syx`, `.txt`, `.spec.json`, `.validation.json`. Raport sisaldab
kolme esimese faili SHA-256 ja pikkust. `--verify OUTPUT_STEM` kontrollib neid.
Raport kirjutatakse viimasena; olemasolevat faili ei kirjutata üle.
Käsitletud kirjutusvea korral eemaldatakse ainult selle käivituse loodud failid.
Protsessi või toite katkemisel võib jääda poolik komplekt: puuduv raport või
räside erinevus peab selle kasutamise peatama. Mitme faili kirjutamine ei ole
operatsioonisüsteemi tasemel üks atomaarne toiming.

TXT eristab sisendi sihti ja lõplikust failist dekodeeritud väärtust. Kui
parameetri ühiku tähendus pole kinnitatud, on märge „FM3-Editi skaala”.
Täielikum dekodeeritud parameetrite loend ja toorsõnad on raportis. Tüübi nähtavus
pole kõigil tabeliparameetritel kinnitatud; mudelit vaheta kogutud malliga.
IR-sisu ei paigaldata ning pärandatud User IR-i sõltuvust ei tohi peita.

## Väljalase = commit

Repo juurkaustast, uue väljundkaustaga väljaspool repot:

```bash
python3 tools/fm3/evidence-index.py
python3 tools/fm3/test-offline.py --output /ABS/tests
python3 tools/fm3/build-release.py --commit HEAD --tests /ABS/tests/summary.json --output /ABS/release
```

Esimene käsk kontrollib tõendite inventuuri. Uuenda seda `--write` abil ainult
pärast teadlikku lähteandmete muudatust, mitte ebaõnnestunud kontrolli varjamiseks.
Testirunner teeb ajutise koopia: ajaloolised testid ei muuda väljalaske lähtefaile.
Kohustuslik testiloend on `references/offline-suite.json` (0.3.53: 84 testi), sealhulgas varasemate seadmeeksportide kordusvõrdlused,
Amp ABCD mõõtmised, Satriani V3 baittäpne taaste, sisendivead, väljundifailide
kokkupõrge/rikkumine, upstream-korpus ja tihendatud ajaloo kontroll.
Testi nimes olev `hardware` tähendab siin olemasoleva ekspordi offline-võrdlust.

0.3.4 lisab Pitchi kuvasildid, kohalikud kohandatud noodid, globaalsete
skaalade koguja ja eraldi vaatlusandmete dekoodri. Valikuline
`fm3-preset.mjs --global-scales OBSERVATIONS.json` lisab kogumise hetke
skaalanäidud aruandesse ning nõuab Python 3.9+ ka `--verify` jaoks.
SYX ei sisalda globaalset sisu. Sünteetilised testid ja kuva/arvu kooskõla
ei muuda globaalset väärtusvahemikku riistvaras kinnitatuks.
[ARM-saatmistee kontroll](FM3_GLOBAL_SCALE_WIRE.md) lisab tegeliku pakkijakoodi
piiratud korduskontrolli; skaala arvupuhvri tootja jääb veel tõendamata.

Builder nõuab puhast checkout'i ja sama commit'i täieliku suite'i edukat raportit.
Kõik lähtefailid loetakse Git objektidest. Paketi sees genereeritakse
`release-manifest.json` ja `references/session-history.json.gz`; mõlemad on
manifesti `generatedFiles` loendis. `packaging` nimetab täpse teisenduse ja
1080 algfaili. Manifesti `files` kontrollib levipakendit ning
`sourcePluginTreeSha256` kontrollib täielikult taastatud Git lähtepuud.
`fm3-session-archive.py materialize --output NEW_PLUGIN_SOURCE` taastab kogu
lähtepuu baittäpselt uude kausta; juhendi ajaloolised failiteed töötavad seal.
Enne täieliku SYX-korpuse auditit taasta see koopia. GitHubis pole lisasammu.
Käivitaja kontrollib levipakendit ja taastab automaatselt kõik failid enne
mootori käivitamist. Otse paketi kasutamisel teeb sama `fm3-session-archive.py
prepare --output NEW_RUNTIME`; saadud runtime sisaldab muutmata levimanifesti.
Enesekontroll võrdleb runtime'i täielikku lähtepuuräsi. Testirunner kontrollib
pakkimise/taaste negatiivseid juhte ja käivitab kõik testiloendi mootoritestid pakitud ning
seejärel taastatud ajutises koopias. Pakett on
deterministlik: sama commit annab sama arhiivi. Väline `release-receipt.json`
seob commit'i, arhiivi räsi ja testiraporti räsi. Paketis pole kviitungit,
mis väldib enesele viitavat arhiiviräsi.

Enne avaldamist peab commit olema kinnitatud püsivas lähterepos. Privaatsete
lisatõendite viimine avalikku reposse vajab selle sisu avaldamise luba.
Avalda olemasolevasse privaatsesse pluginasse, säilita identiteet ja õigused,
kasuta kontrollitud eelmist release ID-d ning salvesta saadud uus release ID
kviitungi avaldamislogisse. Ära nimeta kohalikku kandidaati avaldatud väljalaskeks.

`.github/workflows/fm3-plugin-offline.yml` käivitab suite'i, ehitab commit'i ja
kontrollib lahtipakitud paketti. CI tulemust saab kinnitada alles pärast GitHubis
tegelikult lõppenud töövoogu. Testiraamistik ei asenda hosti laadimiskontrolli.

## Laadimise kontroll

1. Kontrolli Plugin Creatori avaldamisvastuses komponente, versiooni ja release ID-d.
2. Võta avaldatud pakett tagasi ja võrdle manifesti ning faile kandidaadiga.
3. Tuvasta uues hostis päriselt kasutatav skill ja engine'i absoluutne tee.
   Käivitaja peab enne mootorikäsku olema tihendatud sessioonid automaatselt
   taastanud. Otse paketi kasutamisel käivita `fm3-session-archive.py prepare`.
4. Käivita seal `scripts/fm3-self-check.mjs EXPECTED_COMMIT_SHA`; kasuta kviitungist
   teadaolevat commit'i. Skript kontrollib faililoendit, räsisid, versiooni,
   capabilities't ning tuntud preseti taastebaiti.
5. Genereeri väike kasutusnäide hosti tegeliku käivituspunktiga ja kontrolli
   nelja väljundfaili. Salvesta kontrolli tee, versioon, commit ja tulemus.

Kui hosti versioon on vana või failid puuduvad, jääb staatus „laadimine
kinnitamata”. Ärge muutke hallatud hostifaile käsitsi ega nimetage eraldi
lahtipakitud arhiivi testi hosti laadimiseks. Hosti tehtud failimuudatused vajavad
tegeliku erinevuse uurimist, mitte automaatset räside erandit.

## Järgmine etapp

Ehita täielik tõendiregister (firmware, plokk, tüüp, kanal, parameeter, vahemik,
GET/SYX-paar, kontrollitase), tüübi/tempo sõltuvused ja katvuse raport.
Kasuta olemasolevat FM3-Editi cache'i ja REA tõendeid esmalt puuduva metadata
leidmiseks. Tuletatud metadata ei muuda ise kirjutustuge kinnitatuks.
Seejärel kavanda jätkatav kohalik koguja, mis loeb ainult katmata punkte.
Automaatne SET/LOAD või presetikohta salvestamine vajab eraldi kontrollitud
töövoogu; praegune luba hõlmab GET/read-only päringuid.
Eelista tulevikus üht koondatud importi ja automatiseeritud lugemist paljudele
käsitsi nupumuutustele. Aktiivse tööpuhvri ja salvestatud presetikoha lugemist
tuleb tõendada eraldi. Heli/CPU hinnang jääb sihitud viimaseks kontrolliks.

## 0.3.2 avaldamisvormingu parandus

0.3.1 avaldamise tagasivõrdlus tuvastas, et platvorm kirjutab
`.codex-plugin/plugin.json` täpitähed ASCII Unicode’i paokoodidena. JSON-i
andmed jäid samaks, kuid ranged failiräsid erinesid. 0.3.2 lähtefail kasutab
sama kinnitatud vormingut. Pakendaja kontrollib seda enne arhiivi loomist.
Ühtegi kontrollsummade erandit ei lisata. 0.3.1 jääb ajalooliseks väljalaskeks;
parandus saab uue commit’i ja versiooni.


## 0.3.5 piiratud modifikaatorikirjutus

[External 1 → Wah](FM3_WAH_MODIFIER.md) lisab ühe allikasõna 0 ↔ 14
kirjutuse olemasolevas tõendatud kirjes. Kõik 24 ülejäänud sõna peavad
vastama seitsmes aluses säilinud kujule. `test-wah-modifier` kuulub kohustuslikku
41-testilisse komplekti. Uusi seadmemõõtmisi ega privaatseid toorandmeid ei lisata.
Väljalase vajab endiselt täpse puhta commit’i testi, paketi tagasivõrdlust,
käivitaja sidumise uuendust ja värske konteksti laadimiskontrolli.

## 0.3.6 modifikaatorite failiaudit

[Failiaudit](FM3_MODIFIER_AUDIT.md) lisab ühisesse käivituspunkti
`--inspect-modifiers` JSON/TXT lugemisrežiimi. See kasutab olemasolevat
32-kirjelist lugejat, märgib tundmatud koodid ning kattuvad sihtmärgid ja
ei ava uusi kirjutusi. `test-modifier-audit` kuulub 42 kohustusliku testi hulka.
Väljalaske täpse commit'i, paketi ja tegeliku laadimise kontroll jääb samaks.

## 0.3.7 modifikaatori sihtplokk ja stseenid

Failiaudit lisab sihtploki parameetrikirje, ruudustikulahtri ja salvestatud
stseenide kanal/bypass-konteksti. Tundmatu kirjeloend või süsteemisaba ei anna
puudumise väidet. `test-modifier-context` on 43. kohustuslik test; kirjutustugi
ei laiene. Uusi seadmemõõtmisi ega privaatseid toorandmeid ei lisata.


## 0.3.8 modifikaatori sihtparameetri tüübisobivus

Failiaudit võrdleb sihtparameetrit 11 efektipere olemasolevate FW13 reeglitega
A–D kanalites. Tundmatud mudelid/valijad jäävad teadmata; audit ei kinnita
modifikaatorituge ega ava kirjutusi. `test-modifier-types` on 44. kohustuslik
test. Täpse commit'i, avaldatud paketi ja värske konteksti kontroll jääb nõutuks.


## 0.3.9 ainult modifikaatorit muutva päringu skeem

0.3.8 värske konteksti kasutuskatse leidis, et `modifiers` oli skeemi omadustes,
kuid puudus koostaja vähemalt ühe muudatuse nõudest. Runtime toetas sama
päringut juba 0.3.5-st. Skeemi nõuete loend sisaldab nüüd ka `modifiers`;
olemasolev Wah-test kontrollib kõigi 13 minimaalse päringu vastuvõttu ning
tühja muudatuspäringu jätkuvat tõrjumist. Kirjutuse binaarulatus ei muutu.
Kohustuslik suite sisaldab endiselt 44 testi; väljalase vajab uut täpset commit'i
ja kõiki varasemaid avaldamis- ning laadimiskontrolle.


## 0.3.10 Auto Engage

Lisatud on kasutaja FW13 muutmispaari põhjal ainult `wahAutoEngage: OFF | MED SPD`.
45-testiline offline-suite hõlmab päris ekspordi kogu keha taastamist, ebasobiva
sisendi tõrjumist ja lõppfaili tagasilugemist. Versiooninumber ei kinnita avaldamist; järgi sama commit’i kontrollikviitungit.
Uue kasutajaekspordi avalikku lähtereposse viimiseks kontrolli selle konkreetse
lisatõendi avaldamisluba. Avaldamise korral jäävad täpse commit'i, CI,
serveripaketi ja värske hostikonteksti kontrollid kohustuslikuks.

21.10.2026 andis kasutaja selgesõnalise loa kandidaadi `d04b51a` lähtekoodi,
testide, juhendite, uue SYX-faili ja kuvatõendi tekstikirjelduse avaldamiseks
repos `alakahil/mcp-midi-control`. Selle sisu avaldamisluba on olemas;
sama tõendi jaoks uut kinnitust ei küsita.


## 0.3.11 Damping’u režiim

`wahDamping: EXPONENTIAL | LINEAR` põhineb kasutaja eraldatud FW13 ekspordil
ja Linear-kuvatõendil. 46. offline-test kontrollib päris paari, kogu keha
taastamist, vigase sisendi muutuseta tõrjumist ning tagasilugemist.
Damping’u ajakäitumise, heli või CPU kinnitust ei lisandu.

21.10.2026 andis kasutaja selgesõnalise loa kandidaadi `b03fe5d` lähtekoodi,
testide ja juhendite avaldamiseks repos `alakahil/mcp-midi-control` koos uue
LINEAR-SYX-i ning 13.48.11 kuvatõendi tekstikirjeldusega. Selle sisu
avaldamisluba on olemas; sama tõendi jaoks uut kinnitust ei küsita.
Originaalset kuvatõendi pildifaili avalikku reposse ei lisata.
Uue väljalaske korral kehtivad täpse commit’i, CI, serveripaketi
tagasivõrdluse ning värske hostikonteksti nõuded.


## 0.3.12 Min-i kaks mõõdetud punkti — kandidaat

`wahMin: 0 | 2.5` kasutab täpselt mõõdetud koode 0 ja 16375, ainult säilitatud
External 1 → Wah 1 Control ALL seosel ning Max-koodiga 65534. Algne
16383/16384 hüpotees ei täitunud; täisvahemiku valemit ei järeldata.
47. kohustuslik offline-test kontrollib päris ekspordipaari, kogu keha taastet,
piiratud väärtusi, kõrvalmuudatuste puudumist ja lõppfaili vastavust.

Uus `FM3_MOD_MIN_2p50_export.syx` ja 15.05.00 kuvatõendi tekstikirjeldus
on uus kasutajatõend. Varasemad d04b51a/b03fe5d sisupõhised avaldamisload
ei kata neid automaatselt. Enne avalikku lähtereposse viimist on vaja selle
konkreetse uue sisu luba; algset pildifaili reposse ega pluginasse ei pakita.
Kohalik kandidaat ei muuda serveris avaldatud 0.3.11 pluginat ega käivitajat.
Pärast avaldamisluba kehtivad täpse commit’i puhas täistest, CI, deterministlik
pakend, serveri tagasivõrdlus ja värske hostikonteksti kasutuskatse.


## 0.3.13 mõõdetud modifikaatoripunktid — kandidaat

Lisab kümne välja piiratud `wahControls` kirjutuse koos 48. kohustusliku
offline-testiga. Kolm kogutud profiili taastatakse baittäpselt; täisvahemiku,
väljade sõltumatuse ja uute kombinatsioonide seadmekinnitust ei järeldata.
A/B on koondkatsed ning viimane Max on ühe välja katse. Min 0.3.12 säilib.

Uued A/B/Max SYX-id, Min-i varasem uus SYX ja nende kuvatõendi tekstikirjeldused
ei kuulu d04b51a/b03fe5d varasemate sisupõhiste avaldamislubade alla. Selle
konkreetse kandidaadi avalikuks lähtereposse viimiseks on vaja nende sisu
luba. Originaalpilte ei avaldata. Enne loa küsimist valmista ette puhas
commit, täielik testitulemus, deterministlik pakend ja kohalik kasutuskatse.
Pärast luba kehtivad endiselt GitHub CI, serveripaketi tagasivõrdlus ja
värske hosti laadimiskontroll; praegust kandidaati ei nimetata avaldatuks.


## 0.3.14 täpse Wah Min/Max-sisendi kandidaat

Täpne päring `wahMinMaxExact` kasutab eraldi lepingut
`exact-wah-cent-fw13-hw1`; ajalooliste hiirepunktide tähendus säilib.
Mõõdetud ja nelja mudeli kokkulangevusest tuletatud sisendid on aruandes
selgelt eristatud. Ükski avaldamise samm ei muuda `fullRangeEncodingProven`
väärtust tõeseks. Lõppfaili kontroll kontrollib lisaks sõnadele tervet
modifikaatoriseost ja sihtploki konteksti.

Tabeli päritolu ja originaalse riistvaralogi taasesitus on osa repo
`test-offline.py` käivitusest; pakendatud generaator vajab ainult Node.js-i.
Nõua puhta commit'i 49/49 offline-raportit, deterministlikku arhiivi,
lahtipakitud paketi enesekontrolli ja ühe täpse Min/Max-näite nelja faili.
Avalikku reposse lisanduva 22.10.2026 mõõte-ZIP-i avaldamisluba, tegelik
GitHub CI ning pärast avaldamist paketi tagasivõrdlus ja hostilaadimine
on eraldi kinnitatavad sammud. Väljalaskeülevaatus ise ei avalda pluginat.
