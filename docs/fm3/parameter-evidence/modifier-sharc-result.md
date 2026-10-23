# MOD Min/Max: SHARC kirjutustee ja kaks editori sisestusteed

22.10.2026, teine uurimisring. Alus: main `5238ebc5c4cd19c0ea412cd964e5e770c09930e7`,
kohalik esimene uurimiscommit `338845ca50c19b3e6e0247b67ca940e9c618e567`, tööaruande versioon 11.
**0 uut füüsilist eksporti; tootmisplugin 0.3.13; uut generaatori kirjutustuge ei lisata.**

## Tulemus

MOD-i enda callback ja tegelik uint16 kirjutus on nüüd leitud. Wah Control'i
Min/Max kasutab sihtparameetri definitsiooni: **0…1, kuvakordaja 10, samm 0.001**.
Editoris on aga kaks eraldi rada: tekstiväärtus → operatsioon 9 ja rotary
normaliseeritud asend → operatsioon `0x52` (82). Kuvanäidust ei saa tuletada,
kumb rada oli varasema mõõtmise ajal kasutusel ega milline float saadeti.

Täpsete tekstide 2.50/7.50/5.00 ja jagaja 10 eeldusel saadud sõnad ei vasta
kolmele ekspordile. **See võrdlus ei kinnita kogu Min/Max-i kirjutusvalemit**;
lahtine küsimus on täpsemalt sisendsündmuse, kordaja ja juhtmepaketi päritolus.
Leitud kood ei tõenda, et kasutaja neid väärtusi rotary'ga muutis.

## Staatiliselt seotud lülid

SHARC koodiaadressid on 16-bitiste VISA parcel'ite aadressid, objekti nihked
allolevas tabelis on baidid. Firmware boot-mälu loetakse koos päiste ja täiteplokkidega.

| Lüli | Kontrollitud tulemus |
| --- | --- |
| MOD konstruktor `0x813dfa…0x813e82` | Nimi `MOD`, pere 3, effect ID indeks + 3, 25 parameetrit; tabel `0x8090c290`. Callback `0x813f86` kirjutatakse välja `object+0x14c`. |
| Konstruktoris kasutatud indeks | `I5 += 0x135`, seejärel ühebaidine postmodify-kirjutus M7=-1 annab `I5=object+0x134`. Järgnev nihe +24 on seega +0x14c. Startup'i fragment `0x8343a6` seab M7=-1, M6=1, M5=0, M13=0, M14=1. |
| MOD callback `0x813f86` | PID R8 → R11; operatsioon R12 → R9; float-sisend loetakse virnast R10-sse. Üldhandler `0x8244fb` saab MOD tabeli, mille Min/Max-kirjed on staatilised tühiväljad. |
| Dünaamiline definitsioon | `object+0x1fc` on sihtparameetri definitsioon. PID9 haru `0x8142c3…0x8142fd` valib selle sihtefekti jagatud registri definitsioonitabelist sammuga **36 baiti × target PID**. Registrikirje samm on 68 baiti. |
| Min/Max-haru | PID1 → `0x8141fa`; PID2 → `0x814256`. Sihtdefinitsiooni tüübi kõrge nibble 3 valib vastavalt `0x81420e` ja `0x81426a`. Mõlemad kutsuvad `0x823ae7`. |
| Dünaamilised argumendid | Helper saab sihtdefinitsiooni low (+8), high (+12), step (+24), sisend-float'i, raw-pesa `object.raw + 2×PID` ning float-cache'i +0x268 / +0x26c. Kuvamisel kasutatakse sama definitsiooni kordajat (+20). |
| Wah Control | Konstruktor `0x822c6c` seob pere 20, effect ID-d 94…97, tabeli `0x809aa530`. PID5 kirje `0x809aa5e4`: type 0x32, low=0, high=1, multiplier=10, step=float32(0.001). See on firmware tabeli leid, mitte üksnes editori cache'i eeldus. |
| Operatsiooni 9 switch | Boot-koordinaadi `0x282e75f8` esimene kirje viib `0x823b88` juurde. **`0x823bf8` on delayed JUMP:** enne sihtkohta täidetakse `0x823bfa R2=M6` ja `0x823bfc R0=DM(M6,I6)`. Seega R2=1 ja R0 on sisend; teisendus ei jää vahele. |
| Tegelik sõnakirjutus | `0x823b8d…0x823ba4`: range'i RECIPS, kaks Newtoni täpsustust, `(input-low) × reciprocal × 65534 + 0.5`, TRUNC. Clamp 0…65534, seejärel `0x823bb4 DM(M5,I5)=R2 (sw)`. See on **16-bitine** kirjutus. |
| Operatsioon 0x52 | `0x823b7c…0x823b86` kasutab normaliseeritud sisendit otse: `input × 65534 + 0.5`, TRUNC, sama clamp ja kirjutus. |

RECIPS ja kaks Newtoni sammu kirjeldavad vaadeldud käskude rada. Uurimistöö
Python-mudel kasutab float32 jagamist, mitte suvalise vahemiku SHARC RECIPS-i
või 40-bitise arvutusrežiimi täielikku emulatsiooni. Kolme võrreldud täpse
sisendi korral on sihtvahemik 0…1; see ei üldistu kõigile teistele sihtparameetritele.
Logaritmilised ja teised tüübi-harud jäävad eraldi uurimisobjektideks.

## Editor saadab vähemalt kahte erinevat väärtusliiki

`ModifierDialog` sündmusetabel `0x100536a00` suunab sündmused 2 ja 4
funktsiooni `0x10017ad44`; sündmuse 10 funktsiooni `0x10017afa8`.

- **Rotary haru `0x10017ae0c…0x10017ae34`:** seab op=0x52 ja arvutab float32
  `(angle[+0x3c0] - lower[+0x3cc]) / (upper[+0x3d0] - lower[+0x3cc])`.
  Väärtus läheb paketi float-väljale. Need piirid on nurgad, nagu esimeses
  uurimisringis leiti; siin on nende õige roll normaliseeritud asendi arvutamine.
- **Tekstiharu `0x10017afa8`:** op=9, AxeFxReadout getter, tekst → double →
  float32, tingimuslik jagamine editori definitsiooni nullist erineva kordajaga.
  Editoris tööajal kehtiva Min/Max-definitsiooni kordaja tootja on endiselt lahti.

Sündmuse numbri sidumine konkreetse ajaloolise hiire-/klaviatuuritoiminguga
pole tõendatud. Samuti pole kogu ARM → SHARC transporti selles ringis
taasesitatud. Callback'i ja salvestaja leid on nendest piiridest eraldi tulemus.

## Kolm olemasolevat mõõtmist

| Mõõtmine | Mõõdetud raw | Täpne tekst / 10 → mudeli raw | Raw-st tagasituletatud kuvasuurus | Sama 0.01 kuvavahemiku raw-kandidaate* |
| --- | ---: | ---: | ---: | ---: |
| Min 2.50 | 16375 | 16384 | 2.498702963 | 66 |
| Max 7.50 | 49159 | 49151 | 7.501297037 | 66 |
| Max 5.00 | 32784 | 32767 | 5.002594073 | 65 |

\* Ideaalne kahe komakohani ümardamise vahemik, mitte native formatter'i
täielik taasesitus. Vahemikud vastavalt 16351…16416, 49118…49183 ja 32735…32799.

Raw-st tagasituletatud normaliseeritud sisendid on 0.2498702963,
0.7501297037 ja 0.5002594073. Need sobivad leitud 0x52 raja väärtusliigiga,
**kuid raw pöördteisendus ei ole sõltumatu kinnitus ajaloolisele sisendile**.
Ei kasutata kolmele punktile sobitatud parandustegurit. 0/3 täpse sihtteksti
võrdlust jääb nähtavaks. Varasema 18/18 tavapunkti hüpotees ega Attacki
plaani/teksti/pildi vastuolu ei muutu.

## Vahendid ja korratavus

REA CLI 6.4.0 eelmise ringi päris katse andis `provider_unavailable`:
Ghidra/decompiler puudus, Java 17 polnud nõutud JDK21+, Hopper puudus ja
IDA ühendus polnud seadistatud. Sama ebaõnnestunud katset ei korratud.
**Uut edukat REA analüüsi ei toimunud.** Vana REA serializer'i tulemus säilib alusena.

Uus edukas staatiline uurimine kasutas Capstone'i ning eraldatud **pypcode 4.0.1**
ja [roblg/ghidra-sharc](https://github.com/roblg/ghidra-sharc) SLEIGH mudelit,
commit `f4ebdfa7865241249dc8c918291ee55ea4af5a13` (Apache-2.0).
Mudel kompileeriti pypcode'i kaasasoleva `sleigh` abil. Seda ei käivitatud
REA/Ghidra projektina. Vana 214xx mudeli SHARC+ lüngad tähendavad, et seda
kasutati ainult lugemise abivahendina: (sw)/(bw) ja scaled MODIFY kontrolliti
eraldi; vanema mudeli loop-aadressi väljundit ei loetud tõendiks.

Olulised käsud kontrolliti [Analog Devices SHARC+ Core Programming Reference'i](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf)
järgi: Delayed Branches §4, Type3b joonis 14-7 ja BH/BHSE tabelid,
Type9b joonis 15-3, Type19 joonis 17-2, LEFTZ lipud. Auditi kitsad
operandide dekoodrid ei sõltu pypcode'ist ega kolmanda osapoole SLEIGH mudelist.
Need ei ole üldotstarbeline SHARC-emulaator. Normal-word jump-tabelite boot-
koordinaadid on konkreetselt kontrollitud; üldist aadressialiaste mudelit ei väideta.

```sh
python3 tools/fm3/test-modifier-sharc.py
python3 tools/fm3/modifier_sharc_audit.py \
  --editor /absolute/path/FM3-Edit-arm64 \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
```

19 uut räsiga kontrollitud koodi-/tabelipiirkonda ja valitud semantilised
operandikontrollid läbivad algbinaaridel. Viis sünteetilist testi eristavad
delayed/non-delayed haru, call/condition'i tõrjumist, ühe-/kahe-/neljabaidist
liigutust, postmodify/sign-extension'i ning mudeli vigaseid sisendeid.
Viis varasema väärtusetee testi läbivad samuti. Need ei ole seadmetestid.
Manifest sisaldab aadresse, pikkusi ja räsisid, mitte uusi native-baite;
varasem 426-baidine tõend jääb muutmata.

## Järgmine samm

1. Jälitada rotary `+0x3c0` asendi tootjat ja sündmuste 2/4/10 tähendust ning
   editori dünaamilise Min/Max-definitsiooni kordaja uuendamist. Alustada
   nüüd leitud `0x10017ad44` 0x52 harust, mitte korrata getter'i lahendamist.
2. Sulgeda ARM → SHARC operatsiooni ja float-paketi edastuse ahel; kontrollida,
   kas olemasolevates varasemates logides leidub mõõtmiste tegelikke sisendeid.
3. Alles sisendi ja arvutusrežiimi piisava tõenduse järel valmistada piiratud
   generaatorimuudatus. Seni `generatorWriteSupport=false` ja
   `fullRangeEncodingProven=false`.

**Uut eksporti ei küsita.** Puuduv asjaolu on ajalooline sündmus ja saadetud
float; veel üks sama kuvanäiduga SYX ei eristaks kaht leitud sisestusteed.
Kui staatilise analüüsi järel jääb seadmes eristatav küsimus, peab katse
fikseerima sisestusviisi ja lähteoleku ning võimalusel koondama muudatused
ühte eksporti. Praegu pole sellist uut katset veel põhjendatud.
