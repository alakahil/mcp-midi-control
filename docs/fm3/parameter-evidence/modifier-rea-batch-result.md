# Maci REA/Ghidra Min/Max-koondanalüüsi tulemus — 22.10.2026

> **Hilisem täpsustus:** kasutaja kinnitas Min/Max-i lohistamise ja teiste arvude
> tekstisisestuse. [300° ulatusel põhinev edasisuunaline mudel](modifier-drag-result.md)
> annab 3/3 raw-vastet. Allpool olev 655-sammu seletus on ajalooline hüpotees;
> ratta/nooleklahvi rada ei ole enam nende mõõtmiste uurimise põhisuund.

**Koondskript töötas.** Esialgne Downloads-failitee viga ei takistanud hilisemat
edukat käivitust. Uut sessiooni, editoriakent ega korduskäivitust pole selle
tulemuse kasutamiseks vaja. Tootmisplugin on **0.3.13**, uusi füüsilisi eksporte
**0**, generaatori kirjutustuge ei lisatud.

## Mis tegelikult käivitati

Kasutaja Macis toimus **uus REA 6.4.0 / Ghidra 12.1.4 analüüs**
22.10.2026 kell 07:44:54.243–07:47:03.252 UTC (129 sekundit).
See ei ole 12.10 REA tulemuse ümberjutustus ega Linuxis tehtud Capstone'i analüüs.
Darwin arm64, Node 26.7.0, Temurin JDK 21.0.12.1; Ghidra `mac_arm_64/decompile`
oli olemas. Ghidra jaoks valitud valmisolekukontroll läbis **9/9** kontrolli.
Üldise keskkonnakontrolli IDA/Codex-konfiguratsiooni märkused seda tööd ei blokeerinud.

Sisend `FM3_REA_MINMAX_20261022T074454Z_0tjO5r.zip`: 4 263 254 baiti,
SHA-256 `a27b799b40799a3d1074d4aad7af609040eff00fa95864bbfb352e271b6ea2d0`.
Sihtfaili SHA-256 enne ja pärast on sama:
`62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a`.
Kogumisskript vastab kohalikus commit'is `491b8a44de4fb62032fb946440bffc52a60beac2`
olevale skriptile. Üleslaaditud skripti siin ei käivitatud.

79 päringust **77 ok, 2 limited, 0 error**. Nende hulgas on 34 eraldi
funktsioonipäringut, 8 ristviitepäringut, 28 asukohafunktsiooni lahendust ja
5 väärtusjälitust. Tõendipaketi 86 kirjes on **45** funktsioonianalüüsi:
väärtusjälitused lisasid 11 funktsiooni. REA enda bundle-inspector luges kõik
86 kirjet; see on struktuurne kontroll, mitte tõend tööaja sisendite kohta.

| Jälituse lähtefunktsioon | Sõlmi | Funktsioone | Teadmata lülisid | Kärbitud |
| --- | ---: | ---: | ---: | --- |
| Asend `0x10017ad44` | 235 | 2 | 11 | ei |
| Tekst `0x10017afa8` | 56 | 1 | 3 | ei |
| Värskendus `0x10017a050` | 1559 | 8 | 54 | jah |
| 0…127 sisend `0x10025db54` | 2470 | 8 | 85 | jah |
| Readout-sündmus `0x10025dfc4` | 61 | 3 | 3 | ei |

Mõlemal kärbitud jälitusel on `next_offset=null`: tegemist on läbimise ja
funktsioonide arvu piiriga, mitte lihtsalt lugemata järgmise leheküljega.
Lisaks on konstruktori `0x1001faca4` sisemine väärtusgraaf kärbitud.
`unknowns: []` paketi registris ei tähenda, et native-koodi tundmatuid lülisid pole.

## Uued tõendatud tulemused

1. **Lohistamise asendi tootja on `0x10025c5fc`.** `0x10025c44c` salvestab
   hiirevajutuse algkoordinaadid ja algnurga. Plaani nimed `rotary-init` ja
   `rotary-init-extension` olid otsinguvihjed; need ei kirjelda funktsioonide
   tegelikku rolli. Need pole konstruktorid.
2. Lineaarses lohistamisrežiimis kasutatakse hiire koordinaatide vahet,
   eelmist nurka ning tundlikkust **1.5 või float32(0.1)**. Käskude
   `0x10025c6ec…0x10025c71c` arvutus on:
   `delta = oldX - oldY - newX + newY` (32-bitine täisarv) ja
   `angle = f32(oldAngle + f32(f32(sensitivity * f32(delta)) / -180))`.
   Ringlevas režiimis kasutatakse `atan2f(centeredX, -centeredY)` ning nurga
   korrigeerimist üle täispöörde piiri. Mõlemad piiratakse runtime-nurgapiiridega
   `+0x3cc/+0x3d0`.
3. Muutunud nurk läheb vtable'i pesasse `+0x230`, mille kontrollitud siht on
   `0x10025e094`: **`STR S0,[X0,#0x3c0]`**. Järgneb sündmus **4**
   (`0x10025c828`). ModifierDialog suunab sündmused 2/4 normaliseeritud
   asendi rajale, operatsioonile **82**. Ghidra pseudokood jätab ühes
   kaudses kutses float-argumendi välja; tegelik S0 argument on assembleris olemas.
4. `0x10025c870` töötleb rattalaadset delta-sisendit ja `0x10025d05c`
   klaviatuuri. Need võivad saata sündmusi **5/6/7/8**, mille ModifierDialog
   teisendab eraldi sammuoperatsioonideks. Järelikult on vähemalt kolm
   sisestusradade rühma, mitte ainult tekst ja lohistamine.
5. Värskendusfunktsioon `0x10017a050` võtab tekstilise kuvanäidu ja
   normaliseeritud asendi eraldi paketi väljadest. Õige kuvanäit ei tõenda
   sama float-sisendit ega sama SYX-sõna.

| Editorisündmus | Operatsioon | Tähendus vaadeldud rajal |
| --- | ---: | --- |
| 2 või 4 | 82 | normaliseeritud nurgapositsioon |
| 10 | 9 | loetud tekstiväärtus / metadata kordaja |
| 5 | 10 | sammu suurendamine |
| 7 | 11 | sammu vähendamine |
| 6 | 12 | kümnekordse sammu suurendamine |
| 8 | 13 | kümnekordse sammu vähendamine |
| 9 | 15 | lähtestamise rada |

Lisaks kontrolliti olemasoleva binaari pealt Capstone'iga sekundaarset vtable'i
kirjet `0x100db3d58 → 0x100042ad8`. See funktsioon salvestab sündmuse numbri
`+0xbc` väljale ja edastab teavituse. See on **uus kohalik staatiline kontroll**,
mitte uus REA päring. Kogu asünkroonset kuulajate ja seadmetranspordi ahelat
ei ole selles ringis lõplikult taasesitatud.

Varasemad metadata kandidaadid ei lahendanud kordaja tootjat:
`0x10017ab3c` eemaldab juhtelemente, `0x10017a214` küsib kanalite andmeid,
`0x100179ee8` uuendab kanalilipukesi ning `0x10004272c` koostab
ligipääsetavuse kirjeldust. Neid ei nimetata Min/Max skaleerimise tootjateks.

## Firmware'i sammurajad ja kolme mõõtmise uus hüpotees

Olemasoleva FW13 helper'i `0x823ae7` uuel staatilisel lugemisel selgus:

| Operatsioon | SHARC aadress | Järgmise füüsilise väärtuse kandidaat |
| --- | --- | --- |
| 10 | `0x823bfe` | `F12 + F8` |
| 11 | `0x823c03` | `F12 - F8` |
| 12 | `0x823c08` | `F12 + 10 × F8` |
| 13 | `0x823c12` | `F12 - 10 × F8` |

Need harud lähevad varem leitud füüsilise väärtuse teisendusse ja uint16
salvestusse. **Kood ei lisa siin otse raw-sõnale 655.** F12 ja F8 tekivad
enne switch'i step'i, jooksva väärtuse, globaalse oleku ja matemaatikakutsete
abil; nende täielik arvutusahel ja täpsusrežiim jäävad lahti. Selles ringis
kasutati sama eraldatud SHARC SLEIGH/pypcode töövahendit nagu eelmises audit'is,
mitte REA/Ghidra firmware-analüüsi.

Kolm mõõdetud arvu annavad uue täpse **aritmeetilise sobivuse**:

| Olemasolev mõõtmine | Mõõdetud raw | Täpse teksti /10 mudel | Hüpoteetiline konstantne raw-samm |
| --- | ---: | ---: | --- |
| Min 2.50 | 16375 | 16384 | `0 + 25 × 655 = 16375` |
| Max 7.50 | 49159 | 49151 | `65534 − 25 × 655 = 49159` |
| Max 5.00 | 32784 | 32767 | `65534 − 50 × 655 = 32784` |

`round(65534 × 0.01) = 655` annab võimaliku seose kümnekordse
`0.001` sammuga Wah Control'i 0…1 vahemikus. See on **uurimissuund**:
algsõnad, sündmuste arv, ajalooline sisestusviis ning konstantse raw-sammu
püsimine ei ole sõltumatult tõendatud. Tegelik firmware võib vahepeal väärtust
ümardada, kiirendada või uuesti skaleerida. Seetõttu ei esitata 3/3 sobivust
kirjutustoe, seadmetaasesituse ega täpse üldise valemina. Täpse sihtteksti
mudeli **0/3** tulemus jääb endiselt nähtavaks.

## Kontrollid, piirid ja järgmine samm

`tools/fm3/modifier_rea_batch_audit.py` kontrollib 91 sisendfaili räsi,
79 päringu kooskõla, 86 tõendikirje sihtfaili ja Ghidra/upstream-profiili,
15 native-koodi/tabeli piirkonna räsi, valitud käske, importi ja vtable'i
seoseid. Manifest ja JSON-audit sisaldavad koordinaate/räsisid, mitte uut
native-binaari. Tõendite originaalpakett on kasutaja üleslaaditud failis.

```sh
python3 tools/fm3/modifier_rea_batch_audit.py \
  --batch /absolute/path/extracted-batch \
  --editor /absolute/path/FM3-Edit-arm64 \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

Järgmine kitsas töö on helper'i **F12/F8 tootja** lahendamine, sealhulgas
matemaatikakutsed ja runtime-sammutegur. Seejärel tuleb leitud valemit
kontrollida olemasolevate kolme raw-sõna vastu, tegemata ajalooliste sisendite
kohta tõendamata oletusi. Paralleelne lahtine lüli on editori dünaamilise
Min/Max-kordaja tootja ja operatsiooni/float'i kogu transport.

**Uut eksporti ei küsita.** Olemasolev materjal võimaldab veel staatilist tööd.
Kui hiljem jääb seadmekatset nõudev eristus, tuleb fikseerida algväärtused ja
sisestusviis ning ühendada eristatavad muudatused ühte eksporti.
18/18 tavapunkti sobivus ei ole kogu väärtusvahemiku tõend; Attacki
varasem plaani/teksti/pildi vastuolu on alles. `generatorWriteSupport=false`,
`fullRangeEncodingProven=false`, `constantWordStepProven=false`.
