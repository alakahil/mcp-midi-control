# Graphic EQ esimene lisamiskatse — plugin0.65.0

Kasutaja nõustus Graphic EQ alustamisega pärast PEQ A–D seadmeringi.
Koostaja0.10.1 ning kõik senised võimalused säilivad. GEQ automaatset
sisestus- ega parameetrite kirjutustuge praegu ei lisata.

## Olemasoleva materjali audit

932 SYX-faili, 414 erineva räsiga sisu: kõik loeti edukalt; ühegi ruudustikus
polnud Gen3 GEQ kandidaatplokke EID50–53. Raport
`FM3_GEQ_EXISTING_AUDIT.json`. See pole väide kõigi kasutaja väliste failide
kohta. Kohalik codec nimetab GEQ1 kandidaadiks EID50, kuid selle tabeli
sagedusnimetused sõltuvad tüübist ega ole firmware13 ekraanitõend.

## Kasutajale antav pakett

`FM3_GEQ_FIRST_STEP.zip` sisaldab ainult `FM3_GEQ_START.syx` ja
`LOE_MIND.txt`. Alus on muutmata, juba impordiga kontrollitud
`examples/FM3_PEQ_ABCD_TEST_export.syx`, SHA
`b4794f55fe14565029ebaca6f2e9d7cac39572b5d33bcc0a2c9802e5cc6a6c5b`.
See ei sisalda meie sünteesitud GEQ-d. Kui kasutajal on sama preset muutmata
kujul lahti, pole alust vaja uuesti importida.

Juhend `examples/FM3_GEQ_FIRST_STEP.txt`: Scene2, lisada GEQ1 PEQ ja Send'i
vahelise shundi asemele, rida2/veerg11. Vaba shunt1030, grid-sõna424 ja
routing-sõna426=2. Jätta GEQ A/bypass ning kõik selle algparameetrid muutmata;
PEQ A jääb aktiivseks. Muud plokid, sealhulgas C/D test-Balance, säilitada.
Tagastada tervikpreset `FM3_GEQ_BASELINE.syx`; võimalusel pilt tegelikust
Type/ribade vaatest. Esimeses sammus GET-i, terminali ega uut CPU-d ei küsita.

## Tagastatud faili kontroll

```sh
node scripts/fm3-geq-insertion-check.mjs USER_GEQ_BASELINE.syx
```

Kontrollija on ainult faililugeja. Ta otsib täpselt ühe uue kandidaat-EID50
kirje, loeb pikkuse tegelikust päisest ja kontrollib nelja kanali ning
stseeniväljade kuju. Kui tegelik kirje erineb nendest struktuuripiiridest,
vajab see analüüsi; eelkontroll ei kohenda neid vaikselt.
Kõik 11 vana plokikirjet peavad säilima baitidentselt ja samas järjekorras.
Uue GEQ kirje asukohta plokkide jadas ei arvata ette. Väljaspool uut kirjet
lubatakse ainult nimetatud grid-sõna muutus. GEQ eemaldamine ja selle shundi
ennistamine peab taastama kõik 13 456 algbaiti, sealhulgas stseenid, modifierid,
Send/Return ja süsteemiosa. Kaadriprefiksid, CRC/footer, pikkused ja nulltäide
kontrollitakse. Presetinime 32 baiti raporteeritakse eraldi; üksnes nime
muutus ei katkesta kontrolli. Valitud peab olema Scene2, GEQ A/bypass.

`test-geq-insertion-preflight.mjs` läbib 14 positiivset ja 35 negatiivset
sünteetilist kontrolli; raport `FM3_GEQ_PREFLIGHT_TESTS.json`. Need on
mälus loodud parserikatsed, mitte päris GEQ mall ega seadmesse saadetav SYX.
Päris GEQ kirje/GET-paar ja kõik kirjutusparameetrid on **OOTEL**.

Pärast tegelikku eksporti kontrollida kirje ja ekraanivaate seosed, seejärel
valmistada sellele täpselt vastav, eraldi kasutaja kinnitusega üks GET.
Alles tegelik GET/SYX paar saab olla aluseks tüüpide, nähtavate sagedusribade,
vajalike väärtusvahemike ning A–D/stseenivaliku sihitud kogumisele. Säilitada
senine jätkatav mõõtmismetoodika, ranged kõrvalmuutuste kontrollid ja failed
katsed; uusi päringuid ei tehta automaatselt. PEQ kogumist ei korrata.
Pärast GEQ kirjutustoe lisamist üks ühine import/tagasieksport ja kuulamine;
seejärel Enhancer. GEQ parameetrite kogumisloend koosta päris vaate põhjal.
