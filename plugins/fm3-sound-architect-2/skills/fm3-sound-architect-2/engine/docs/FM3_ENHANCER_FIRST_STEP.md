# Enhanceri esimene lisamiskatse — plugin 0.68.0

Kasutaja nõustus Enhanceriga jätkama pärast lõpetatud GEQ auditit ja
seadmeringi. GEQ kohta kinnitas kasutaja „CPU oli kõige suurem 50%, GEQ
toimis”. Seda hinnangut ei kanta üle tulevasele Enhanceriga presetile.
Koostaja 0.11.1 jääb muutmata; Enhanceri kirjutustugi ei ole veel lisatud.

## Olemasolev materjal

Paketi 1129 SYX-faili sisaldavad 578 erinevat sisu. Kõik 578 loeti edukalt;
üheski ruudustikus ei leitud Enhanceri kandidaat-ID-sid 122–125.
Raport: `FM3_ENHANCER_EXISTING_AUDIT.json`. Audit hõlmab paketi faile,
mitte kõiki kasutaja väliseid preseteid.

Kohalik codec annab Enhancer 1 kandidaadiks EID 122. Tabelis leiduvad
Modern/Classic/Stereoizer, Width, Depth, Low Cut, High Cut, Level, Bypass,
Phase Invert, Pan L/R, Balance ja Scene Ignore on ainult kaardistuse
kandidaadid. Need ei tõenda firmware 13 parameetrinumbreid, väärtuste
kodeerimist, nähtavust ega kanaliarvu. Ühtegi neist ei kirjutata oletuse järgi.

## Kasutajale antav pakett

`FM3_ENHANCER_FIRST_STEP.zip` sisaldab ainult `FM3_ENHANCER_START.syx` ja
`LOE_MIND.txt`. Alus on **muutmata** `examples/FM3_GEQ_ABCD_TEST_export.syx`,
SHA-256 `1663e891e6bc1a7cb89a1bc0540a48ce8d61527911267682bc3082bf06e70c3e`.
See on kasutaja tagasieksport, mille kõik 13 662 kehabaidi on kinnitatud.
Pakett ei sisalda sünteesitud Enhancerit. Kui sama preset on muutmata kujul
lahti, pole uuesti importimine vajalik.

Juhend: `examples/FM3_ENHANCER_FIRST_STEP.txt`. Scene 2; asendada **rea 3,
veeru 11** shunt Enhancer 1-ga, Reverb 1 ja Out 1 vahel, samade ühendustega.
Need on kogu ruudustiku ühesed koordinaadid; tegu on alumise kasutatava reaga.
Algne shunt on 1038, grid-sõna 428, routing-sõna 430 = 4. Enhancer A/bypass,
värskelt lisatud Type ja parameetrid muutmata. Säilitada kõik PEQ/GEQ/V3
plokid, stseenid, tasemed, modifikaatorid ning mõlema rea Send/Return.

Tagastada **tervikpreset `FM3_ENHANCER_BASELINE.syx`**, pilt avatud Type-
rippmenüüst ja pilt nähtavatest põhijuhtnuppudest koos kanalinuppudega.
Ära küsi praegu GET-i, terminali, uut CPU-d ega PEQ/GEQ korduskatset.

## Tagastatud ekspordi eelkontroll

```sh
node skills/instructions/scripts/fm3-enhancer-insertion-check.mjs FM3_ENHANCER_BASELINE.syx
```

Kontrollija ainult loeb faile. Ta nõuab täpselt üht uut kandidaat-EID122
kirjet. Kirje pikkus ja kanalite arv loetakse päisest; kanaleid ei eeldata
neljaks. Lubatud struktuuripiir on 1–4 kanalit ja 1–512 sõna kanalis;
see on parseri piir, mitte seadme võimaluste väide. Stseeni kanal peab
mahtuma tegelikult loetud kanalite arvu sisse. Scene 2 peab kasutama A/bypass'i.

Kõik 12 vana plokikirjet peavad säilima baitidentselt ja samas järjekorras.
Uus kirje võib paikneda ükskõik millisel nende vahelisel piiril. Väljaspool
seda kirjet lubatakse kehas ainult ülal määratud grid-sõna muutus. Uue kirje
eemaldamine ja shundi ennistamine peab taastama **kõik 13 662 algbaiti**.
Kontrollitakse ka kaadrikontrollsummasid, preset CRC-d, footer'it, kaadrite
prefikseid, päiseid, kodeeritud pikkusi ja nulltäidet. Nime 32 baidi muutus
on lubatud ja raporteeritud. Muu erinevus peatab automaatse vastuvõtu ning
vajab analüüsi; andmeid ei normaliseerita oletuse järgi.

`test-enhancer-insertion-preflight.mjs`: 18 positiivset ja 36 tõrjutud
sünteetilist kontrolljuhtu, sh sisestuspiirid, eri kanalite arv, vana GEQ
ja teiste plokkide muutus, suunamine, stseenid, päised ja kontrollsummad.
Raport: `FM3_ENHANCER_PREFLIGHT_TESTS.json`. Katsenäidised jäävad mällu;
need pole päris Enhanceri tõend ega seadmesse saadetavad presetid.

## Järgmine etapp pärast kasutaja vastust

1. Käivitada eelkontroll ning võrrelda tegelikku kirjet ja ekraanivaadet.
   Kui struktuur erineb kandidaadist, analüüsida päris andmeid enne piiri
   muutmist. Mitte kohandada ootusi üksnes selleks, et kontroll läbi läheks.
2. Valmistada **üks jätkatav terviklik kogumispakett**, mille sees on ka
   esimene baseline GET/SYX paar. Mitte anda vahele eraldi algGET-paketti.
   Kogumisloend põhineb tegelikul Type-loendil, juhtnuppudel ja kanalite arvul.
   Katta tüübimallid, nähtavate parameetrite vajalikud punktid, enumid,
   kanalite koopiad ja sõltumatus ning stseenivalikud; peidetud sõnad säilitada.
3. Koguja tohib teha ainult GET-päringuid. FM3-Editi muudatused ja ekspordid
   teeb kasutaja ise. Ei SET/SAVE/STORE käske ega automaatseid seadmemuudatusi.
   Säilitada GET/SYX kõigi sõnade võrdlus, ranged kõrvalmuutuste kontrollid,
   jätkamine ja failed-katsete eraldi säilitamine.
4. Alles päris mõõtmiste põhjal lisada kirjutustugi, seejärel üks ühine
   import/tagasieksport ning kasutaja heli- ja CPU-tagasiside. GEQ/PEQ
   kogumist ei korrata. Praegu on Enhanceri andmed ja seadmekinnitus **OOTEL**.
