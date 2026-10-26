# 4. punkti seadmevaba koondtöö — 0.3.21

25.10.2026 koondmuudatus lõpetab allpool piiritletud seadmevaba tööpaketi.
4. punkti kogu funktsionaalsus ei ole valmis. Olemasolevaid mõõtmisi ei korratud;
uued tulemused on staatiline analüüs, failikorpuse inventuur ja auditi täiendused.
See ei tähenda, et edasine seadmevaba uurimine oleks võimatu.

| Teema | Selles paketis valmis | Täpne allesjääv piir |
|---|---|---|
| Input ja Volume igapäevased juhid | Olemasolevate lubatud väljade, A–D tüübireeglite ja lõppfaili kontrollid säilivad | Input Type/Mode, impedants ja mõõdikud ei saa uut kirjutustuge; Volume mõõdik ja kanali BYPASS-sõna säilivad |
| Seoste inventuur | 32 kirjepäist, 25 toorsõna, allikad, sihid, kanalid, stseenikontekst ja 16 pere tüübireeglid | Auditi õnnestumine ega `available` ei tõenda sihi modifikaatorituge |
| Kirjepesa valik | FW13 esimese nullise Source-puhvriväljaga objekti otsing on leitud; 32 objekti, 712-baidine samm | Runtime-puhvri seos iga imporditud presetiga pole täielikult tõendatud; sidumata kirje ei saa automaatselt kirjutusluba |
| Loomine ja algväärtused | Sihtploki/PID seadmine ja 21 välja vaikimisi väärtuste järjekord on leitud | Callback-teisenduste kõik harud, PID18/19 ning täielik serialiseeritud lähtestus pole tõendatud |
| Väljalülitamine, eemaldamine, taaskasutus | Audit eristab Source NONE, sidumata kirjet ja ainult teisese allikaga aktiivset kirjet; eemaldamise haru on jälitatud | Source NONE ei võrdu eemaldamisega. Teise seose ja olemasoleva aktiivse seose säilimine taaskasutusel pole täielikult tõendatud |
| Wah ja Volume koos | Mõlema senise kirjutaja sama esimene kirje ning kogu korpuse piirid on dokumenteeritud | Teise kirje kirjutamist ei lubata; toetatud korpuses puudub kahe aktiivse seose näide |
| Muud allikad, sihid ja kanalid | Nimed, toorkoodid, kattumised ja tundmatused on loetavad | Lugemine ei laienda kirjutaja senist External 1 / sihtmärgi / ALL-kanali ulatust |
| Volume Min/Max | Vaike-doonori ja füüsikaliste callback-sisendite erinevus on selgitatud | Suvaliste Volume Min/Max väärtuste täielik koodek jääb lahti; Wahi tõendeid ei kanta üle |
| Globaalsed pedaali/MIDI määrangud | Iga External 1–16 viide näitab kirjet ja põhi-/teisese allika rolli | Praegune pedaali/CC vastendus, väärtus ja globaalne Noisegate Offset ei selgu sellest presetiauditist; eraldi globaalset olekut ei ole kontrollitud |

Masinloetav kokkuvõte on
[fm3-modifier-lifecycle-evidence.json](../skills/instructions/references/fm3-modifier-lifecycle-evidence.json).
See seob püsivara, editori, varasema REA kviitungi ja tuletatud tabelid räsidega.
Uus kohalik taasesitus kontrollis 14 püsivara-/andmelõiku ja kahte editori
funktsioonikeha. Uut REA teenusekäivitust ei tehtud; kasutati olemasolevat
23.10.2026 REA eksporti ning uut kohalikku staatilist analüüsi.

Korpuses on 795 failiteed ja 638 erinevat sisu. Neist 628 sobib kaasaegse
`0x0146` auditi jaoks ning 10 vanema vormingu faili jäävad eraldi pärandanalüüsi.
Kõik 220 aktiivset kaasaegset kirjet asuvad esimeses pesas; üheski toetatud
failis ei ole kahte aktiivset seost. Genereeritud näited ja failikordused ei ole
uued seadmevaatlused ega üldise seadmevõimekuse tõend.

`--inspect-modifiers` JSON-i `lifecycle` väljad loetlevad salvestatud nullise
põhiallikaga, teisese allikaga, väljalülitatud seotud ja passiivsed sidumata
kirjed. Need on vaatlused, mitte vabade pesade jaotamisjuhis.
`externalControllers[].references` seob globaalse sõltuvuse konkreetse kirjega.
TXT kasutab 1-põhiseid numbreid, JSON nullist algavaid `record` indekseid.

Järgmine võimalik seadmevaba uurimissuund on target-callback'ide ning impordi
ja runtime-puhvri täielik taasesitus. Olemasolev globaalsete seadete varukoopia
võimaldaks eraldi lugemisuuringut. Kumbagi tulemust ei eeldata selles versioonis.
Seadme import, STORE/reload, heli ja uue jaotaja tegelik käitumine jäävad eraldi
kontrollitasemeks. Generaator ei teosta selles tööpaketis seadmetoiminguid.
