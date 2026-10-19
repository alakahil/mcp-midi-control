# Graphic EQ täiskogumine — plugin 0.66.0

Kasutaja soovib ühte full-paketti, millega koguda kõik vajalik järjest.
See asendab 0.65.0 esimese GEQ ekspordi ja eraldi algGET paketi tööjärjekorra.
Koostaja jääb versioonile 0.10.1. GEQ kirjutustuge pole veel lisatud.

## Päris alus ja ekraanitõend

`skills/instructions/examples/FM3_GEQ_BASELINE.syx`, SHA
`51f5f3e297bec66f9bf36e0482e1e360bea93ec35fd09f7c80b1e88c78a2470b`.
`FM3_GEQ_BASELINE_VALIDATION.json`: GEQ1 EID50, rida2/veerg11,
kirje8308–8514, parameetrid8354–8514; neli kanalit, igaühes20 sõna.
GEQ eemaldamisel ja shunt1030 ennistamisel säilivad kõik varasema preseti
13 456 kehabaidi. Uus keha13 662 baiti. Ainult Scene2 GEQ on bypass,
kõigi stseenide GEQ kanalA. Aktiivne Scene2 ja vana nimi säilisid.

Pildid `references/geq-ui-20261009/controls.png` ja `types.png` avanesid.
`references/geq-ui-20261009/evidence.json` registreerib allika ja räsid.
Vaates: 10 Band Variable Q, 31/63/125/250/500/1k/2k/4k/8k/16k,
Gain0, Master Q1.00, Level0, Balance0, Bypass ModeThru, Scene Ignore,
Zero All. Mix pole nähtav. Type menüüs18 nimetust; täpne loend `types.json`.
Menüü järjekord ei tõenda enum-koode; kõik koodid/skaalad vajavad päris paare.

## Üks pakett

`skills/instructions/scripts/geq-full-collector/` on eraldiseisev pakett.
Jaga see ZIP-is ühe `FM3_GEQ_FULL/` juurkaustana, ilma __pycache__,
sessioonide või sünteetiliste SYX-ideta. `baseline.syx` on muutmata kasutajafail.
Käivitamine ja paus on `LOE_MIND.txt` juhendis. Python3+Node, pyserialita.

Plaani alguses küsitakse tegelik Bypass Mode loend ja muud üldjuhid.
AlgGET kasutab juba saadud baseline.syx-i, uut eksporti ei nõuta.
Thru/Mute korral 184 sammu: 1 algpaar + 18×9 tüübisammu + 14 üldjuhti +
7 kanalikatset. Menüü lisavalik lisab sammu; puuduv Master Q jätab selle
tüübi neli Q-sammu GET-ita vahele. Üksikuid samme saab põhjusega vahele jätta.

Iga tüüp: ainult Type muutus; tegelikud ribanimed ja Master Q nähtavus;
eristatav Gain-muster0.5/1/1.5/…; tegelikud min/max; Zero All;
olemasolul Master Q min/max/1.4/1.0. Täiendavad nähtavad juhid talletatakse
auditiks, nende kirjutustugi ei teki pelgalt nimetamisest.
Ribade arv on Type nimetuse esialgne piir: tegeliku lahknevuse korral säilita
tõend ja märgi samm mõõtmata. Ära muuda nähtavaid nimesid tabeli sobitamiseks.

Üldjuhid 10 Band Variable Q peal: Level−6/min/max/+3/0;
Balance min/max/−25/+25/0; kõik tegelikud Bypass Mode nimed; Scene IgnoreON/OFF.
Seejärel kogu A→B/C/D20-sõnaline koopia, igas sihtkanalis vasakpoolseima
riba eraldi Gain-märgis−3/+1/+3 ning lõpuks ainult Scene2 GEQ tagasiA.

## Kontrollipiirid

Üks kasutaja kinnitatud read-only GET `f0000174111f320039f7` iga mõõtmise kohta.
Porti ei avata enne failikontrolli ja kuvakinnitust. Üks os.write; timeoutil,
osalisel kirjutusel ega vigasel vastusel kordust ei tehta. Sisendpuhver
tühjendatakse enne päringut. Toorvastus, kaadrid, ajad, dekodeering ja SYX säilivad.
Paarikontroll nõuab EID50/80 sõna ja kõigi80 väärtuse täielikku vastavust.

Alusfaili räsi on kinnistatud. Muud13662-keha osad peavad säilima; lubatud on
GEQ parameetrid ning kanalikatse Scene2 GEQ valik. Sammu võrdlus piirab
muudatust veel kitsamalt. Presetinime32 baiti lubatakse eraldi raporteeritult,
mitte kogu päist. Kaadriprefiksid, pikkused, CRC, footer ja täide kontrollitakse.

Kandidaat-PID: Gain0–9, Level11, Balance12, BypassMode13, Type15,
MasterQ16, SceneIgnore19. Mix10/GlobalMix14/spare17/18 säilivad.
Type vahetus võib kaasa muuta kõiki20 A-sõna, kuid muu muutuse korral peab
muutuma ka Type kandidaatPID15. Seotud muudatused märgitakse auditiks.
Gain-samm lubab ainult10 Gain-pesa, mitte oletatud nähtava riba PID-i;
eristatav muster ja tegelikud sildid võimaldavad ka hõreda järjekorra kaardistada.
Scene Ignore lubab ainultPID19 võimalikku peegeldumist A–D-sse.
Zero All on käsitsi UI-toiming: pseudoPID65520 funktsiooni ei saadeta.

`q` teeb tulemuste ZIP-i. `s` vajab põhjust, algpaari ei saa vahele jätta.
Jätkamisel kontrollitakse plaane, lähtefaile, vaatlusi ning kõiki varasemaid
GET/SYX paare uuesti. Failed/cancelled/katkenud tõendid säilivad ja neid ei
loeta edukaks. Enne jätkamist taastatakse viimase eduka faili olek.
Juba lõpetatud või --export-only sessioon ei saada GET-i.

## Testid ja järgmine töö

`test_full.py` ning `TEST_RESULTS.json` kontrollivad sünteetiliselt kogu
184-sammulist rada koos91. sammu pausiga, tegelikke kasutajavastuseid,
MasterQ puudumist, lisarežiimi, nimebaidi11 lubamist, piirimuutuste tõrjumist,
vigaseid paare, sõltuvusi, katkestusi, lukustust ja samast kohast jätkamist.
POSIX pseudoterminal kontrollib päris transporditsüklit: üks täpne GET,
timeout ilma korduseta ja vana sisendvastuse tühjendamine. FM3-ga neid teste
ei tehtud; sünteetilisi tulemusi ei esitata seadme mõõtmistena.

Tagastatud ZIP-i järel auditeeri mõõdetud väärtused, ribade seosed, tüübi-
ja kõrvalmuutused, skaalad ja A–D. Alles siis lisa kinnitatud GEQ tugi ühisesse
koostajasse, säilitades PEQ/V3 tasemed, kaks rida ja Send/Return. Üks ühine
impordi/tagasiekspordi/kuulamise katse, seejärel Enhancer. Varasemat PEQ
kogumist või CPU47–48% kinnitust ei küsita uuesti.
