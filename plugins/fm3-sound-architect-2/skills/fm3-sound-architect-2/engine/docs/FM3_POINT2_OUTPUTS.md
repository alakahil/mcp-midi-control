# Auditi punkt 2: SYX, TXT, spetsifikatsioon ja raport

Algne etapp 0.3.23, 25.10.2026; näidiste ja regressioonide loendus uuendatud
versioonile 0.3.29, 28.10.2026. Alus: `FM3_Auditi_edenemisaruanne_2026-10-24`,
auditi etapp 2 „SYX / TXT / raport”, mitte aruande teise peatüki seadmekatsed.
Algne hinnang oli „Valmis toetatud ulatuses”. See töö täpsustab failikontrolli
ulatust ja sulgeb tuvastatud tarkvaralised lüngad. Uusi seadmemõõtmisi ei tehta.

## Muudetud käitumine

`fm3-preset.mjs --verify OUTPUT_STEM` loeb iga nelja faili üks kord.
SHA-256 ja baitide arvu järel käivitab see olemasolevad sõltumatud
struktuuri-/väljakontrollid ning taastab kogu preseti spetsifikatsioonist ja
paketti kuuluva alusfaili räsi järgi. Võrreldakse kogu SYX-i bait-baidilt,
TXT-i täpselt ning raporti kõiki välju, sealhulgas vaheetappe ja tõendiväiteid.

Alusfaili teed ei võeta kasutaja raportist. Võimalikud failid leitakse paketi
inventuurist, piiratakse paketi juurega ja kontrollitakse uuesti SHA-256 abil.
Algne kirjutaja rakendab jätkuvalt oma profiili alusfaili- ja parameetripiiranguid.
Inventuuri kuulumine ei anna presetile uut kirjutusluba. Kontroll ei ava võrku,
MIDI-t, FM3-Editi, REA-d ega Ghidrat.

| 0.3.22-s taasesitatud lünk | 0.3.23 kaitse |
|---|---|
| Vanema koostajaprofiili TXT-i muudatus võis uuendatud räsiga läbida | Taasesitatud TXT peab täpselt kattuma |
| Vanema profiili spetsifikatsioon võis väljundist erineda | Spetsifikatsioonist taastatud SYX peab täpselt kattuma |
| Soundi Amp-mallipäring võis pärast genereerimist muutuda | Taasesitatakse ka mallivalik, kanalid ja kõik koostamise etapid |
| Raporti kontrolli- või riistvaraväide võis muutuda | Võrreldakse kogu raportit; puuduvaid ja lisatud välju ei lubata |

Värske konteksti kasutuskatse leidis lisaks lihtsa `jb-composer` TXT-is
Input 1 tüübi kohal `undefined`. See on parandatud selgesõnaliseks
„seaded alusfailist” kuvaks; puuduvat tüüpi ei oletata. Eraldi testid nõuavad
kõigilt siin genereeritud juhenditelt loetavat tulemust ilma `undefined`/`NaN`-ta.
SYX-baidid ei muutu. Lihtsa juhendi parameetriloend eristab salvestatud
kanaliväärtusi aktiivsest soundist ning uut seadmeeksporti soovitatakse ainult
konkreetse lahtise küsimuse jaoks, mitte offline-kontrolli eeltingimusena.

Täiendavad failikaitsed: vigane UTF-8 tõrjutakse; artefaktide manifestis on täpselt
kolm nõutud andmefaili ning nende räsi/pikkus. Käsitletud kirjutusvea järel
kustutatakse ainult selle käivituse enda loodud failid, kontrollides failitüüpi,
seadme- ja inode-numbrit. Teise kirjutaja asendusfaili või sümbollinki ei eemaldata.
Valideerimisraport avaldatakse viimasena, kuid ainult edukas `--verify` kinnitab komplekti.

## Seadmevabad kontrollid

Masinloetav ja uuesti toodetav tõend asub lähterepo failis
`docs/fm3/parameter-evidence/point2-output-replay.json`.

| Kontroll | Ulatus |
|---|---|
| Uus tervikkomplekti test | 25 korrektset komplekti; 23 nimetatud sisendivarianti, sh kõik 15 generaatori põhiharu, seitse koostajaalust ning layout/grid |
| Sisulised rikkumised | 96 tõrjutud juhtu uuendatud räsidega; seitse SYX-i muutust ka korrektse CRC-ga |
| Failivorming ja manifest | 17 puudumise, kärpimise, UTF-8, vigase sisu või manifesti riket |
| Kirjutamise vead | 15 kokkupõrke, iga nelja etapi kirjutus-/linkimisvea ja asendusfaili juhtumit |
| Ajaloolised näited | 51 spetsifikatsiooni; 48 SYX-i taastuvad baittäpselt ja värsked neli faili läbivad kontrolli |
| Ülejäänud regressioonid | Täielik 70 kohustusliku testi komplekt, sh globaalvaatlused, modifikaatorid, tüübi-/tempo-piirid, Input/Volume, grid, Scene MIDI ja kolitav käivituskaust |

Kahele varasele näitele (`FM3_SA_TEST_G5`, `FM3_SA_TEST_SCENES`) lisab test
ainult mälus `schemaVersion:1` ja `firmware:13`. `FM3_SA_TEST_TIME` ja
`FM3_SA_TEST_TONE` salvestatud sisendid on osalised; nende täielikud päringud
võetakse olemasoleva `test-generate.mjs` regressioonilepingust, sh selgesõnalised
Tempo NONE valikud. Need kaks on päringu rekonstruktsioonid, mitte muutmata
spetsifikatsiooni edu. Ajaloolisi faile ei muudeta.

Kolm näidet jäävad teadlikult praeguse avaliku sisendilepingu väliseks:

| Näide | Põhjus |
|---|---|
| `FM3_P6_INSERT_A` | Vana `volume` alias ja üldine lisaja; praegu kasutatakse `volumePan:true` ja `volpan`-poliitikat |
| `FM3_P6_INSERT_B` | Ten-Tapi salvestatud Feedback on selle lõpptüübi puhul redaktoris peidetud |
| `FM3_TAPER_BATCH_TEST` | Eksperimentaalne toorsõnade uurimissisend, mitte avaliku preseti koostaja sisend |

Neid kolme tõrget ei loeta edukaks genereerimiseks ega lahendata kaitsete
lõdvendamisega. Nende vanad SYX-id ja seadmetõendid säilivad ajaloona.

## Kontrolli piir ja ajalooline ühilduvus

Taasesitus kinnitab tarkvaralist kooskõla. See kasutab sama generaatorit ega ole
sõltumatu FM3 DSP-mudel. Varasemad sõltumatud toorsõnade, mõõdetud doonorite ja
kogu keha regressioonid jäävad eraldi kontrollikihiks. Räsid ja taasesitus ei ole
krüptograafiline autentsusallkiri: teadlikult ümber koostatud uus kooskõlaline
preset võib olla korrektne uus komplekt.

Kontrolli varem loodud nelja faili sama kontrollitud mootoriversiooniga.
Uue versiooni raport, kuvatud poliitika või TXT võib erineda ka muutmata SYX-i
korral. Ära muuda vana raporti versiooni või räsi pelgalt kontrolli läbimiseks.
48 ajaloolise SYX-i baittäpne taaste ei tähenda nende ajalooliste raportite
ümberkirjutamist ega tagantjärele riistvarakinnituse lisamist.

Globaalvaatlused jäävad kogumisaja tõendiks; nende sisu ei kandu SYX-iga seadmesse.
Presetifailide import/STORE, heli, tegelik CPU ning MIDI-väljundi käitumine
vajavad konkreetse väljundi jaoks eraldi tõendit. Kõigi võimalike sisendite,
operatsioonisüsteemide, toitekatkestuste või FM3 funktsioonide ammendavat katvust
need loendatud tarkvaratestid ei väida.

Mitme faili avaldamine ei ole operatsioonisüsteemi tasemel üks atomaarne toiming.
Protsessi või toite katkemisel võib jääda poolik komplekt: ära kasuta seda enne,
kui kõik neli faili läbivad `--verify` kontrolli. Versioon ja siin loetletud
kontrollid ei kinnita ise serverisse avaldamist; selle kinnitavad konkreetse
commit'i CI, deterministlik pakett ja avaldatud paketi tagasivõrdlus.
