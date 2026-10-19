# Enhancer: kogumine lõpetatud ja koostajasse lisatud

Plugin 0.71.1; generaator `jb-composer-0.12.1`; 2026-10-12.

**Seadmekatse on nüüd kinnitatud.** Tagasieksport säilitas kõik13804 sisubaiti
ja Enhanceri48 sõna. Kasutaja: „Suurim CPU 52.7%. Enhancer toimib”.
Raport: [FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json](FM3_ENHANCER_ABCD_HARDWARE_ROUNDTRIP.json).
See konkreetne kooslus on valmis; korduskatset ega uut kogumist ei küsita.
Järgnev kirjeldab kirjutusliidest ja tehtud katset.

74 varasemat edukat paari ja 13 lõpetatud lisamõõtmist annavad **87 GET/SYX
paari, igas 48/48 sõna**. Classicu Pan Left, Level ja Scene Ignore puudujäägid
on täidetud. 12 algset vahelejätmist ja kaks enne GET-i peatatud Bypass-tõrget
säilivad ajaloos; need ei ole edukate mõõtmiste hulka arvatud.
Ära anna uuesti kogujat ega korda Leveli, Scene Ignore'i või Pan Lefti katseid.

Pan Lefti ühikuta vahemik on −100…+100. Mõõtepunktid −100, +100, 0, +40 ja
+80 sobivad: kolm sisemist väärtust peavad olema erinevad, kuid ei pea asuma
nimetatud kolmandikus. Muutumatu −100 miinimumi uus eksport/GET on edukas paar.

## Tõendid ja kodeering

- Täiskogumise ZIP SHA-256: `98c35922cf15ced5b2c843aabc7534b9860f084cdc0528a3ecc4966e5d7c780b`.
- Lõpetatud lisa ZIP SHA-256: `e4d18021ce6f67f7c012259d5d50c0889edcda23d602b37e0b0d3f12a3797993`.
- Muutmata sessioonid: `skills/instructions/references/enhancer-full-20261012-122507/`
  ja `enhancer-lisa-20261012-125350/`. Lisa säilitab ka täiskogumise originaal-ZIP-i.
- Lõpetatud lisa originaal: `skills/instructions/references/enhancer-archives-20261012/completed-supplement.zip`.
- Tuletatud, räsiga seotud register: `skills/instructions/references/enhancer-full.json`.
- Audit: `FM3_ENHANCER_FULL_AUDIT.json`; testid: `FM3_ENHANCER_COMPOSER_VALIDATION.json`.

| Parameeter | PID | Ulatus / väärtused |
|---|---:|---|
| Width | 0 | 0…100% |
| Depth | 1 | 0…100% |
| Low Cut | 2 | 20…2000 Hz; logaritmiline |
| High Cut | 3 | 200…20000 Hz; logaritmiline |
| Level | 4 | −80…+20 dB |
| Tundmatu sõna | 5 | säilitada; kasutajale ei avata |
| Type | 6 | Modern=0, Classic=1, Stereoizer=2 |
| Invert | 7 | None=0, Right=1, Left=2, Both=3 |
| Pan Left | 8 | −100…+100, ühikuta |
| Pan Right | 9 | −100…+100, ühikuta |
| Balance | 10 | −100…+100, ühikuta |
| Scene Ignore | 11 | OFF=0, ON=1 |

68 arvulist ankrut ja 10 enum-ankrut klapivad täpselt. Lineaarskaala kasutab
`round((v-min)/(max-min)*65534)`, sagedused
`round(log(v/min)/log(max/min)*65534)`. Mõõdetud punkt ja skaalast tuletatud
väärtus eristatakse raportis; iga vaheväärtus ei ole eraldi ekraanilt kinnitatud.

Modern: Width, Depth, Low Cut, High Cut, Level, Scene Ignore.
Classic: Width, Pan Left, Pan Right, Balance, Level, Invert, Scene Ignore.
Stereoizer: Width, Depth, Level, Scene Ignore.

**Bypass on eraldi stseeninupp.** Bypass Mode'i menüüd pole nähtud ja seda
kirjutusliideses ei ole. Bypass-nupu märkimine lisajuhina oli korrektne.

Ühes salvestatud Stereoizer→Modern üleminekus muutus ka Balance 58981→32767.
See tõendab selle ülemineku sidestust, mitte kõikide üleminekute üldist reeglit.
Koostaja kasutab tervet vastava tüübi 12-sõnalist kogutud malli ning muudab
ainult nähtavaid küsitud parameetreid. PID5 ja tüübi peidetud parameetrid
säilivad mallist. **Need mallid ei ole tehasevaikeväärtused.**

## Koostamine

`enhancerChannels` sisaldab 1…4 unikaalset kanalit A–D. Igas valikus on
kohustuslikud `channel`, `type`, `levelDb`; nii ei pärandu kogumises kasutatud
+10 dB juhuslikult. Muud võtmed on `width`, `depth`, `lowCutHz`, `highCutHz`,
`panLeft`, `panRight`, `balance`, `invert`, `sceneIgnore`, ainult vastava tüübi
nähtavuse piires. Tundmatud, peidetud, vale tüübi või ulatusest väljas väärtused
lükatakse tagasi. Kasuta kinnitatud `jb-newlook` alusfaili.

Enhancer 1 asendab shundi1038 reas3/veerus11, pärast Reverb1 ja enne Out1.
Lisatakse terve 142-baidine plokk, ühenduse sõna säilib. Uus plokk algab kõigis
stseenides A/bypass. Aktiveerimine toimub `scenes[].blocks.enhancer` kaudu ning
nõuab sõnaselgelt määratud kanalimalli. A–D ülekannet toetavad kolm terviklikku
kanalikoopiat ning B/C/D eraldi Width-mõõtmised. Scene Ignore'i püsisõna mõõdeti
kõigi kolme tüübi A-kanalil; kõigi stseenide käitumist ei testitud eraldi.

Failitestid taastavad 78 juhtmuudatust ühise kodeerijaga, viis kogutud
tüübiseisundit, kolm kanalikoopiat ja ühe kanalivaliku. Kõigil 87 juhul kattuvad
kõik 13804 algse seadmeekspordi sisubaiti, normaliseerimata. See ei ole väide
87 tervikpreseti genereerimise kohta avaliku koostamisliidese kaudu.
Lisaks taastuvad 12 tüübi/kanali kombinatsiooni täpsed mallid; 27 vigast päringut,
muudetud tõend, toetamata alus ja määramata kanal lükatakse tagasi.

## Lõpetatud ühine seadmekatse

Katseks anti `FM3_ENHANCER_ABCD_TEST.zip`: SYX, TXT, spec, kontrolliraport ja CHECK.txt.
See lisab Enhanceri senisele GEQ A–D katsele. Enhanceri eemaldamisel ja shundi
taastamisel kattuvad kõik **13662 varasema GEQ-preseti sisubaiti**; V3, PEQ ja
GEQ generaatoriväljundid on baitidentsed varasematega.

| Scene | Kanal | Type | Põhiseaded |
|---:|---|---|---|
| 2 | A | Modern | Width20, Depth20, Low Cut100 Hz, High Cut2000 Hz, Level−1 dB |
| 3 | B | Classic | Width50, Pan L−80, Pan R+80, Balance0, InvertNone, Level−1 dB |
| 4 | C | Stereoizer | Width20, Depth20, Level−1 dB |
| 6 | D | Modern | Width35, Depth50, Low Cut200 Hz, High Cut5000 Hz, Level−0.5 dB |

Scene Ignore on kõigis kanalites OFF. Muudes stseenides on Enhancer A/bypass.
Kasutaja impordib tööpuhvrisse, vaatab üle need neli stseeni, kuulab ja märgib
suurima nähtud CPU. Tagasi Scene2, terve preseti eksport
`FM3_ENHANCER_ABCD_TEST_export.syx`. Eraldi GET-i ei nõuta. Ära muuda enne
eksporti parameetreid; kui muudatus tehti, lisa kirjeldus.

Selle täpse koosluse import/eksport on kinnitatud. Kõik 13804 sisubaiti kattuvad
normaliseerimata; valitud Scene2, nimi, ühendused ja kõik varasemad seaded
säilisid. Ekspordi SHA-256:
`463aaf84ce2bafc4f531f03b6d1af6c441ec98028bc5a1767d90111062f32edf`.
Kasutaja kinnitas Enhanceri toimimist ning suurimaks nähtud CPU-ks52,7%.
See on selle katse vaatlus, mitte üldine maksimum. GEQ varasem50% jääb eraldi
GEQ katse tõendiks. Kõiki üksikuid ekraaninäite ega Scene Ignore'i kõigi
stseenide käitumist ei ole eraldi kinnitatud.

`fm3-enhancer-hardware.mjs` seob kinnituse kogu sisu räsiga. Muudetud kooslus
jääb kontrollimata; sama sisu uue nimega ei ole automaatselt täpselt sama
imporditud fail. Koostaja säilitab algse SYX-väljundi baitidentselt ning
raporteerib tõendi TXT/validation/capabilities kaudu. Uusi GET-e või SET/SAVE/
STORE-käske ei saadetud. PEQ, GEQ ja Enhanceri kokkulepitud etapp on lõpetatud.
