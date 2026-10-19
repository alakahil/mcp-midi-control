# FM3 0.3.3 kandidaat: väljalase, tõendid ja laadimine

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
Uusi seadmemõõtmisi ei lisatud.
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
Suite sisaldab 32 testi, sealhulgas varasemate seadmeeksportide kordusvõrdlused,
Amp ABCD mõõtmised, Satriani V3 baittäpne taaste, sisendivead, väljundifailide
kokkupõrge/rikkumine, upstream-korpus ja tihendatud ajaloo kontroll.
Testi nimes olev `hardware` tähendab siin olemasoleva ekspordi offline-võrdlust.

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
