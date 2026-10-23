# Volume/Pan pedaalijuhtimine — olemasoleva tõendi piir, 23.10.2026

> **Hilisem jätk 23.10.2026:** [korpuse ja loomistee uus tulemus](volume-pedal-static-result.md).
> 0.3.16 korpuse kõik 638 unikaalset faili on nüüd loetud; 10 vana vormingu
> eraldi lugeja leidis ühe effect 102 / PID 1 seose, kuid mitte Ext1 → Gain’i.
> 91 varasemat REA faili ja originaalbinaar kontrolliti; valmis on eraldi
> `tools/fm3/rea-volume-pedal/` Maci koondpakett. Allpool säilib 0.3.15 lähteolukord.

0.3.15 on avaldatud privaatse release'ina `pluginrel_6adb3151f998819193808162d75516b5`, mootori lähtecommit `15840e463b0d8f90ab3c46b8c0d4e6865b88a004`. Staatiline Volume/Pan ja Input gate on olemas; uus pedaalisidumine ei kuulu sellesse väljalaskesse.

## Uus ainult faile lugev inventuur

`tools/fm3/volume-pedal-audit.mjs` kasutas olemasolevat struktuuri- ja modifikaatorilugejat. 789 SYX-failiteed andsid 632 unikaalset sisu. 622 toetatud faili 32-kirjelistes modifikaatoritabelites ei leidunud sihti effectId 102, ei aktiivset ega mitteaktiivset. Kümme vana vorminguga faili jäid lugemata, mitte tõendatult seoseta. Eraldi kontrollitud tagastatud FW13 Volume-doonoriekspordis puuduvad aktiivsed seosed ja Volume-sihtkirjed. Tulemused ja iga sisendi räsi: [volume-pedal-corpus.json](volume-pedal-corpus.json).

See on uus kohalik staatiline failianalüüs, **mitte uus REA/Ghidra ega seadmeanalüüs**. Algset kasutaja eksporti ei lisatud avalikku reposse; tulemuses on selle SHA-256. Skript on korduvkasutatav: `node tools/fm3/volume-pedal-audit.mjs --output /ABS/uus-tulemus.json [--capture /ABS/olemasolev.syx]`. Olemasolevat väljundit ei kirjutata üle.

## Mida juba teame

| Asjaolu | Tõend / piir |
|---|---|
| Volume/Pan 1 ja Gain | effectId 102, PID 0, A–D; staatilise GAIN-i kuvavahemik 0…10 ja VOLUME-tüüp |
| Volume Gain'i salvestamine | Tavaline kanaliparameeter, mitte pedaali hetkeasend; staatilise skaala mudel ei tõenda modifikaatori Min/Max-i teisendust |
| Modifikaatori üldine lugemine | 25 uint16 sõna; source 0, target effect 8, target PID 9, channel 17, secondary source 20, operation 23 |
| External 1 identifikaator | Olemasolevas tõendatud Wah-seoses source 14; globaalse pedaali/CC määrang pole sellega seadistatud |
| Praegune kirjutaja | Esimene olemasolev Ext1 → Wah1 Control ALL kirje; ei loo uusi kirjeid ega kirjuta Volume-sihti |

## Täpne teadmislünk ja järgmine uurimisküsimus

Puudub praeguse FW13 **Ext1 → Volume/Pan 1 Gain** terviklik serialiseeritud doonorseos koos kanaliulatuse, vaikekõvera, lipukeste ja Min/Max-väljade kontekstiga. Effect/PID väljade üldine asukoht ei tõenda, et Wah-kirje sihtväljade ümbernimetamine looks korrektse Volume-seose. Samuti ei tõenda sama 0…10 kuvanäit sama modifikaatoriskaalat.

Järgmine kitsas staatiline küsimus: kuidas FM3-Editi modifikaatori lisamise/sihtvaliku rada seab Volume Gain'i sihtkirje ja selle Min/Max metadata? Enne uut Maci jooksu tuleb uurida 22.10 REA paketi juba saadud funktsioone ning vanade vormingute eraldi lugeja võimalust; neid kümmet faili ei tohi sundida FW13 parserisse. Kui olemasolev analüüs ei kata sihtvaliku rada, kohanda olemasolevat koondskripti ainult selle küsimuse jaoks. Vana Min/Max-plaani ei käivitata uuesti.

Selles sessioonis pole otse kutsutavat REA/Ghidra tööriista. Varasem selle Linux-keskkonna `doctor --provider ghidra` leidis seadistamata Ghidra; see ei puuduta kasutaja Maci. Macis 22.10 läbis Ghidra kontroll 9/9 ja 79 päringust 77 õnnestus, kaks olid piiratud. Uut ligipääsu Macile ega tänast paigalduskontrolli pole tehtud. Enne uut aadressipõhist jooksu tuleb kontrollida tegelikud teed, Node, täis-JDK, analyzeHeadless, arhitektuuri dekompilaator ning binaari versioon/arhitektuur/SHA-256. Arm64 editori tõendit ei kasutata SHARC valmisolekuna.

Seadmekatset veel ei küsita: kõigepealt tuleb eelmine staatiline lünk täpsustada. Kui vaja on doonorseost seadmes kinnitada, peab üks koondkatse alustama räsiga määratud presetist ja eristama iga välja sisendit ning sõltumatut raw/SYX-tagasilugemist; üks lõppeksport võib koondada mitut kontrolli. STORE/reload, pedaali tegelik vastus ja heli on eri tõendid.

Wah `wahMinMaxExact`, kuus mõõdetud väärtust välja kohta, 995 mudelipõhist väärtust ning `fullRangeEncodingProven=false` säilivad. Ajaloolisi hiirepunkte ei tõlgendata ümber ega kanta Volume'ile üle.
