# FM3 arenduskandidaat: väljalase, tõendid ja laadimine

## Sisukord
- Ulatus
- Faili genereerimine
- Väljalase = commit
- Laadimise kontroll
- Järgmine etapp
- 0.3.2 avaldamisvormingu parandus

## Ulatus

0.3.3 kandidaat lisab logaritmiliste juhikute mittepositiivse sisendi tõrjumise.
Kandidaat ei ole uus avaldatud pluginaväljalase: avaldamine, täpne commit ja
käivitajajuhendi uuendus tuleb kinnitada väljalaskekviitungis. Kuue välja
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
Suite sisaldab 45 testi, sealhulgas varasemate seadmeeksportide kordusvõrdlused,
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
Kõik lähtefailid loetakse Git objektidest. Paketi sees genereeritakse ainult
`release-manifest.json`; selle erand on manifestis nimetatud. Pakett on
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
