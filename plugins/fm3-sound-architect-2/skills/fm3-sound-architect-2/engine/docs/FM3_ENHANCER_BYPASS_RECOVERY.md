# Enhanceri kogumise jätkamine pärast Bypass-oleku muutust

2026-10-12 / plugin 0.70.1 / koguja 0.2.1

Kasutaja saatis `FM3_ENHANCER_FULL_V2_20261012T111636_f5c2d5c5.zip`
(Library ID `libfile_76df62396224819195ac3ebd905f390c`). Muutmata originaal
asub `skills/instructions/references/enhancer-partial-20261012/collection.zip`.

## Tõendatud seis ja tõrge

Kõik seitse edukat GET/SYX paari kontrolliti uuesti algfailidest ja toorest
GET-vastusest: igas paaris 48/48 sõna, üks kinnitatud GET. Kontrollitud on
Modern-algpaar, Width 0/100/20/50/90% ja Depth 0%. Kõik muud keha baidid
säilisid; preseti nime muutused on varasemates raportites eraldi registreeritud.

Kaheksandal sammul „Modern — Depth maximum” on kaks ebaõnnestunud katset.
Mõlema SYX-i ainsad keha sõnaerinevused viimase eduka ekspordi suhtes on:

| Asukoht | Tähendus | Enne | Pärast |
| --- | --- | --- | --- |
| 7488 | Scene 2 Enhanceri Bypass | 1 (bypass) | 0 (aktiivne) |
| 7508 | Enhancer A, Depth kandidaat PID1 | 0 | 65534 |

Samm lubab muuta ainult Depth-parameetrit. Bypass-oleku kontroll peatas
mõlemad katsed **enne GET-i**; kummalgi ei ole capture.json faili. Binaarfail
ei näita, millise kasutajaliidese toiminguga Bypass muutus. Ära väida, et Depth
ise Bypass'i muutis või et kasutaja kindlasti vajutas nuppu. Maksimumi tegelik
ekraaninäit ja GET-paar on veel kogumata; 65534 ei ole üksi selle tõend.

## Muudatus ja kontroll

V2 `full-check.mjs` annab samale lubamatule Scene 2 Bypass-erinevusele selge
eestikeelse veateate ja taastamisjuhise. Ühtegi lubatud baidivahemikku ei
laiendata. GET-transport ja 48/48 paariskontroll säilivad. Koguja käituskoodi
versioon on 0.2.1; olemasoleva session.json väärtus collector=0.2.0 kirjeldab
ühilduvat V2 sessioonivormingut ja jääb muutmata. Ka plaan/setup ja varasemad
tulemused säilivad baitidentselt. Uute GET-ide collectorVersion on enhancer-full-0.2.1.

`test_bypass_recovery.py` kasutab kasutaja originaal-ZIP-i: kontrollib seitset
paari, mõlemat tõrget, jätkamist sammult 8, q-d, eksporti ja GET-i puudumist
tõrke korral. Ainult ajutine sünteetiline koopia taastab Bypass-sõna, et
tõendada lubatud Depth-muudatuse läbimist. Seda koopiat ei väljastata ega
loeta riistvaramõõtmiseks. Viis muud kõrvalmuutust peavad endiselt tõrkuma.
Raport: `docs/FM3_ENHANCER_BYPASS_RECOVERY_TESTS.json`.

## Kasutaja jätkamispakett

`FM3_ENHANCER_JATKA.zip` sisaldab parandatud koguja käitusfaile, senist
`FM3_ENHANCER_FULL_SESSION` kausta koos seitsme eduka ja kahe ebaõnnestunud
katsega ning `JATKA_SIIT.syx`. Viimane on täpne koopia failist
`step-006-002de45c41/donor.syx`, SHA-256
`2dd97b0244aac764facd0ab52811689e6041bc65c9ae34fbd5742bf1d36194b8`.
See ei ole uus genereeritud preset ega ebaõnnestunud faili ümberkirjutus.
Taastatav olek: Scene 2, Modern, Enhancer A bypass, Width90%, Depth0%.

1. Lõpetada vana koguja q-ga, kui see veel ootab vastust.
2. Pakkida uus ZIP Downloads-kausta; tekib eraldi `FM3_ENHANCER_JATKA`.
3. Avada FM3-Editis selle `JATKA_SIIT.syx`, valida Scene 2 ja hoida Enhancer
   bypass'is (efekt välja lülitatud).
4. Käivitada `python3 ~/Downloads/FM3_ENHANCER_JATKA/FM3_ENHANCER_FULL.py --port /dev/cu.usbmodem211104`.
5. Koguja kontrollib seniseid mõõtmisi GET-ita ja jätkab **8/86: Depth maximum**.
   Muuta ainult Depth maksimumini, eksportida terve preset ja järgida küsimusi.
   Enne kinnitatud GET-i sulgeda FM3-Edit/Fractal-Bot.

Ära palu alustada baseline'ist ega esimest seitset sammu korrata. Mõõtmiste
vahel baseline'i ei taastata. Järgmine ZIP jääb nimega FM3_ENHANCER_FULL_V2_…zip.
Kogumine on pooleli: Enhanceri kirjutustugi, uue preseti import/heli/CPU
kinnitus ja ülejäänud Type/kanalite mõõtmised ei ole sellega valminud.
