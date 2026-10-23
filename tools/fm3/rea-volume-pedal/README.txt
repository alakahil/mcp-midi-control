FM3 Volume’i pedaaliseose staatiline REA/Ghidra koondanalüüs — 1.1.0

EESMÄRK
Uurida Ext1 -> Volume/Pan 1 Gain seose loomist, määratud modifikaatori ID
tagastamist ning sihtparameetri ja kanalite metadatat. See ei korda vana
Wahi Min/Max-plaani ega luba uut generaatori kirjutustuge.

KÄIVITAMINE
1. Paki kogu ZIP lahti. Hoia .command, .mjs ja plan.json samas kaustas.
2. Kirjuta Terminali bash ja üks tühik, lohista olemasolev
   FM3_REA_VOLUME_PEDAL.command terminaliaknasse ning vajuta Enter.
3. Kui töö lõpeb, saada vestlusse Terminalis näidatud üks tulemuste ZIP.

FM3 seadet ei ole vaja ühendada. FM3-Editi ega Ghidra graafilist akent
ei ole vaja avada. Skript ei ava neid ega kasuta MIDI/SET/STORE käske.
Midagi ei paigaldata ega uuendata. sudo pole vajalik.

MIDA KONTROLLITAKSE
- Apple Silicon Mac; sobiv Node (22.19+, 24.11+ või 26+).
- Tegelik REA 6.4.0 käivitaja ja selle olemasolevad MCP sõltuvused.
- Ghidra analyzeHeadless, täis-JDK 21+ ning ainult Ghidra jaoks
  doctor --provider ghidra --format json. Nõutud on kõik üheksa
  scope_checks kontrolli, sealhulgas arm64 dekompilaator ja JDK.
- FM3-Edit 1.07.17 arm64 Mach-O identiteet:
  62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a
  Versioon on seotud algse rakenduse Info.plist’i ja täpse binaariräsiga.
- Kõigi kaheksa plaanitud funktsiooni eraldi baitide räsid enne päringuid.
Teise versiooni aadresse ei kasutata. IDA/Hopperi või agendi seadistuse
hoiatused ei blokeeri korras Ghidra-rada. SHARC valmisolekut ei eeldata.

OTSIMISKOHAD JA VALIKULISED TÄPSED TEED
Need on kontrollitavad lähtekohad, mitte paigalduse olemasolu lubadus:
  ~/FM3_REA_TOOLS/node_modules/rea-agents/scripts/rea.mjs
  ~/ghidra_12.1.4_PUBLIC
  ~/FM3_REA_NATIVE/FM3-Edit-arm64
Kui arm64 faili pole, otsitakse /Applications/FM3-Edit.app või
~/Applications/FM3-Edit.app; universaalsest failist eraldatakse ajutine
arm64 koopia. Algset faili ei muudeta.
Teada oleva erineva asukoha saab anda keskkonnamuutujaga:
  FM3_REA_LAUNCHER, FM3_REA_TARGET, FM3_REA_NODE,
  GHIDRA_INSTALL_DIR, JAVA_HOME, FM3_REA_OUTPUT_PARENT.
Vaikimisi läheb uus tulemuste kaust ja ZIP töölauale.

ULATUS JA PEATUMINE
Üks REA stdio-seanss, üks Ghidra sihtbinaar. Kaheksa uut funktsiooni,
kolm xref-päringut, kuni 18 viite omanikku, kuni kaheksa lisafunktsiooni
ja kolm piiratud andmevoolupäringut: maksimaalselt 44 MCP-päringut
koos avamise, seisu, tõendi ekspordi ja sulgemisega.
45 varem analüüsitud funktsiooni jäetakse xref-lisapäringutest välja.
Andmevoolu sees võib vajalik varasem funktsioon siiski olla sõltuvus.
Kolm jälge: sügavus 2, kuni 6 funktsiooni, 3000 sõlme, 6000 serva.
Piiratud tulemust ei esitata täieliku tõendina.

Iga päringu sisend, vastus ja hinnang salvestuvad kohe; edenemine
salvestub progress.log faili. Esimese funktsioonipäringu viga või kolm
järjestikust hilisemat viga peatab edasise analüüsi. Automaatset kordust
ei ole. Juba kogutud tulemused eksporditakse ja pakitakse ka vea korral.
Ctrl+C järel oodatakse käimasolev päring ära ja säilitatakse tulemused.
Kui eelkontroll ebaõnnestub, saada sama diagnostika ZIP; ära käivita
pimesi uuesti. Uurime esmalt konkreetset veateadet.

Ghidra esimene import võib võtta mitu minutit. Käivituse piir on
15 minutit ja päringu piir 20 minutit; päringu ajal ilmub iga 30 sekundi
järel edenemisteade. Piir ei tähenda, et jooks tavaliselt nii kaua kestab.

TULEMUSTE PIIR
See on staatiline editorianalüüs. See ei tõenda automaatselt FW13
modifikaatorikirje kõiki vaikimisi sõnu, Volume’i Min/Max teisendust,
globaalse pedaali määrangut, pedaali tegelikku vastust ega heli.
Wah wahMinMaxExact ja fullRangeEncodingProven=false jäävad muutmata.

DIAGNOSTIKA
ZIP sisaldab plaani, käivitatud skripti, päringuid, osatulemusi,
valmisolekukontrolli ja edenemislogi. Binaari, firmware’i, tööriistade
paigaldust ega node_modules kausta ei pakita. Diagnostikas võib olla
kohalikke failiteid ja dekompileeritud koodi. Automaatset üleslaadimist
ei toimu. Selles paketis pole veel sinu Maci uut jooksutulemust.

Pakendi SHA256SUMS ja validation.json on ettevalmistuse kontrollid.
test-volume-pedal-batch.mjs on offline-test; selle käivitamine on valikuline.
