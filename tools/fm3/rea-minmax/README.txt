FM3 REA Min/Max — üks koondkäivitus Macis
Versioon 1.0.0, 22.10.2026

KÄIVITAMINE

1. Paki FM3_REA_MINMAX_2026-10-22.zip lahti Downloads-kausta.
   Tekib kaust FM3_REA_MINMAX.
2. Ava Terminal ja käivita üks käsk:

   bash "$HOME/Downloads/FM3_REA_MINMAX/FM3_REA_MINMAX.command"

   Kui kaust on mujal: kirjuta Terminali «bash » (koos lõputühikuga),
   lohista FM3_REA_MINMAX.command terminaliaknasse ja vajuta Enter.
3. Jäta Terminal lahti. Esimene Ghidra import võib võtta mitu minutit.
   Pikema päringu ajal näidatakse edenemisteadet iga 30 sekundi järel.
4. Laadi samasse vestlusse töölauale loodud
   FM3_REA_MINMAX_<kuupäev_kellaaeg>_<juhuslik>.zip.
   Täpne failitee kuvatakse lõpus. Saada ZIP ka siis, kui olek on
   «partial» või «blocked» — seal on alles diagnostika ja saadud tulemused.

FM3 seade ei pea olema ühendatud. FM3-Editi ega Ghidra graafilist akent
ei pea avama. Uut presetit ega SYX-eksporti ei küsita.
REA, Ghidra, Java ja Node peavad olema juba paigaldatud; skript ei installi
ega uuenda neid. Terminalis ei ole vaja «sudo» käsku.

MIDA SKRIPT TEEB

- Otsib 12.10 kontrollis kasutatud REA 6.4.0 paigalduse kaustast
  ~/FM3_REA_TOOLS ning Ghidra kaustast ~/ghidra_12.1.4_PUBLIC.
- Valib olemasoleva täis-JDK 21 või uuema; muudab keskkonnamuutujaid
  ainult oma alamprotsesside jaoks, mitte shell'i seadistusfailides.
- Kontrollib «doctor --provider ghidra». Hopperi/IDA või agendiregistreeringu
  puudumist ei nõuta selle staatilise CLI/MCP töövoo jaoks parandada.
- Otsib esmalt ~/FM3_REA_NATIVE/FM3-Edit-arm64; seejärel /Applications
  või ~/Applications FM3-Edit.app paketi binaari. Vajadusel eraldab
  universaalsest Mach-O failist arm64 osa ainult ajutisse kausta.
- Nõuab täpset SHA-256:
  62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a.
  Vale versioon peatab töö enne aadressipõhist analüüsi.
- Kasutab üht kohalikku REA stdio MCP seanssi ja üht Ghidra sihtfaili.
  Uut agendiregistreeringut, võrguporti ega kaugühendust pole vaja.
- Kogub 23 sihitud funktsiooni, 8 ristviitepäringut, kuni 32 viite
  asukohafunktsiooni, kuni 16 täiendavat funktsiooni ja 5 piiratud
  väärtuste liikumise analüüsi. Täpsed eesmärgid on plan.json failis.
- Väärtuste jälitus on piiratud: sügavus 2, kuni 8 funktsiooni, 4000
  sõlme ja 8000 serva päringu kohta. Piirangud säilitatakse tulemustes.
- Iga vastus salvestatakse kohe. Kolm järjestikust päringuviga peatavad
  edasise kogumise. Esimese päris funktsioonianalüüsi viga peatab kohe.
- Ekspordib lõpus REA kogutud tõendid, sulgeb analüüsiseansi ja loob ZIP-i.
  Algset editorit, firmware'i, Ghidra paigaldust ega node_modules kausta
  tulemuste ZIP-i ei lisata. Tulemused sisaldavad analüüsikoodi ja kohalikke
  failiteid; automaatset üleslaadimist või GitHubi avaldamist ei toimu.

KATKESTAMINE JA TÕRKED

Ctrl+C esimene vajutus palub peatuda pärast käimasolevat päringut ning
pakib saadud tulemused. Teine Ctrl+C või Terminali sulgemine võib pakendamise
katkestada; juba kirjutatud JSON-failid jäävad töölaua tulemuste kausta.
Ghidra esmakäivitusel on kuni 15-minutiline käivituspiir, päringul kuni
20 minutit. Skript ei korda ebaõnnestunud analüüsi automaatselt.
Kui midagi puudub, saada diagnostika; ära hakka tööriistu uuesti installima.
Node puudumisel kuvatakse lühike viga enne tulemuste kausta loomist.
Iga uus käivitus loob uue kausta ja ei kirjuta vana tulemust üle.

VALIKULISED TEED (ainult kui olemasolev paigaldus on teises kohas)

FM3_REA_LAUNCHER   rea-agents/scripts/rea.mjs absoluutne tee
FM3_REA_TARGET     editori Mach-O fail, mitte APP-kaust ega SYX
FM3_REA_NODE       Node käivitatava faili absoluutne tee
GHIDRA_INSTALL_DIR olemasolev Ghidra juurkaust
JAVA_HOME         olemasolev sobiv täis-JDK
FM3_REA_OUTPUT_PARENT tulemuste vanemkaust (vaikimisi Desktop)

MIDA TULEMUS VEEL EI TÕENDA

See on staatilise tõendi kogumine. Edukas kogumine ei tõenda iseseisvalt
Min/Max-i täpset kodeeringut ega luba generaatori kirjutustuge laiendada.
Varem saadud raw-väärtused: Min 2.50 = 16375; Max 7.50 = 49159;
Max 5.00 = 32784. Puudub ajaloolise sisestussündmuse ja saadetud float'i logi.
Kontrollida tuleb, kas tekstisisestuse op9 ja pöördnupu op82 erinevus
selgitab mõõtmisi; raw-st sobitatud mudel pole sõltumatu kinnitus.
Siin ei käivitata SHARC püsivara analüüsi ega korrata tõendatud serializer'it.

PAKETI KONTROLL

5/5 sünteetilist testi läbisid. Päris REA 6.4.0 stdio ühendus ja
binary_session päring töötasid Linuxi kontrollkeskkonnas; 41 kavandatud
päringu sisend vastas päris MCP kataloogi skeemidele. Maci Ghidra täielikku
käivitust selles keskkonnas teha ei saanud. See toimub kasutaja Macis.
validation.json eristab need kontrollid uuest native-analüüsist.
Skriptide korduvkontroll arendusmasinas:
  node --test test-minmax-batch.mjs

Uurimuse alus: c415b95ed9a388e030c796175863b8bff21ad07e.
Tootmisplugin jääb versioonile 0.3.13.
