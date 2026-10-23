# ModifierDialog → FW13 väärtusetee: 22.10.2026

**Jätk:** [teine uurimisring](modifier-sharc-result.md) seob MOD-i SHARC
callback'i, sihtdefinitsiooni, uint16 salvestuse ja editori 0x52 asendiraja.
Allpool säilib esimese ringi tööseis; selle lahtised küsimused pole kõik enam lahti.

**Uus tulemus on getter'i ja metadata-pakkuja staatiline lahendamine ning
FW13 üldise operatsioon-9 callback'i lokaliseerimine. Min/Max-i täpne uint16
teisendus on endiselt tõendamata. 0 uut füüsilist eksporti.**

Alus on main `5238ebc5c4cd19c0ea412cd964e5e770c09930e7` (ühendatud PR #13)
ning tööaruande `FM3_0.3.1_TOOTULEMUS_2026-10-19-2-2.md` versioon 10.
Avaldatud tootmisplugin on 0.3.13; PR #13 ei olnud uus pluginaväljalase.
Uurimiskood ei muuda generaatorit ega lisa toetatud kirjutusväärtusi.

## REA tegelik kasutatavus

Ühendatud tööriistade hulgas REA teenust ei olnud. Repos oleva lukustatud
arenduspaigaldaja kaudu paigaldati eraldatud töökausta **rea-agents 6.4.0**.
`rea --help`, `rea doctor --format json` ja päris
`rea function <FM3-Edit-arm64> 0x10023c220 --provider ghidra --format json`
käivitati. Viimane andis **provider_unavailable**:

- Ghidra install ja decompiler puuduvad; Java 17 runtime ei täida nõutud
  vähemalt 21. versiooni täis-JDK tingimust.
- Hopper käivitatav fail puudub.
- IDA MCP provider pole seadistatud; töötavat IDA ühendust ei tuvastatud.

See on **uus REA kasutatavuse kontroll ja ebaõnnestunud analüüsikatse**,
mitte uus REA dekompileerimistulemus. Säilitati katse struktureeritud vastus
failis `modifier-rea-availability-20261022.json`. Varasema REA/Ghidra
serializer'i analüüsi kasutati alusmaterjalina. Uus õnnestunud analüüs
tehti Capstone 5.0.6, Mach-O tabelite ja FW13 boot-plokkide staatilise lugemisega.
Editorit ega püsivara ei käivitatud, MIDI-liidest ei kasutatud.

## Tõendatud staatilised kontrollpunktid

| Lüli | Tulemus ja tõendi piir |
| --- | --- |
| Rotary getter `0x10025e9d0` | Sekundaarse liidese `+0x290` viitab täisobjekti `+0x398` readout'ile; kasutatakse virtuaalpesa `+0x188`. |
| Readout'i loomine `0x10025d610` | Kutsub konstruktorit `0x10023e0c8`, seejärel salvestab objekti rotary `+0x398` väljale. Konstruktor seab vtable'i `0x100db84c8`; RTTI nimi on `12AxeFxReadout`. |
| Readout getter `0x10023c220` | Vtable `+0x188` seob selle funktsiooni. Teksti getter `+0x190` on `0x10023c494`, mis loeb objekti stringivälja `+0x2f0`. |
| Tekst → arv | `0x10023c3cc` kutsub parserit `0x10002e0fc`; selle lõpu kutse `0x10002f208` siht on `0x100510a84`. Mach-O symbol/indirect-symbol tabelid lahendavad impordiks `_strtod_l`. `0x10023c414` teisendab tulemuse double'ist float32-ks. |
| ModifierDialog'i kordaja | Varem tõendatud `0x10017afa8` jagab getter'i väärtuse definitsiooni `+0x10` float-kordajaga ainult siis, kui definitsioon ja nullist erinev kordaja on olemas. See ei ole uint16 kodeerimine. |
| Metadata-pakkuja | Dialog `+0x460` saab teenuste objekti `+0x20` väärtuse. Vtable `0x100dcb4b8`, RTTI `16FM3EffectManager`, pesa `+0x18` → `0x10029ba78` → `0x10007c544`. |
| MOD pere lookup | Tabel algab `0x100539358` paaridega **(pere, effect ID)**. Pere 3 effect ID-d on **3…34**. Pide 1/2 ei remapita erijuhtudeks, mida lookup kasutab effect ID-de 1/199/200 puhul. Konkreetse ajaloolise sündmuse ID-d pole logitud. |
| Näiv piiride kandidaat | Rotary `+0x3cc/+0x3d0` on **nurgapiirid radiaanides**. Setter `0x10025d890` arvutab poolkaare: kraadid × 0.5 × π / 180, piirab vahemikku 0…π ning kirjutab negatiivse/positiivse otspunkti. Need pole Min/Max-i sihtparameetri arvupiirid. |
| FW13 üldine lugemisvärav | `0xc441c590` ei töötle op 9 väärtust: switch'i op-9 pesa suunab vaikeharusse `0xc441cad6`, mis tagastab staatuse 1. Seda ei saa nimetada op-9 kvantijaks. |
| FW13 üldine dispatcher | `0xc441bfa4` jätkab; op-9 põhiswitch'i siht on `0xc441c0ea`. `0xc441c180` haru jõuab callback'i väljani `object+0x14c`. Kutsel `0xc441c1d0` on `r0=object`, `r1=pid`, `r2=operation`, `s0=float32 value`. |

Oluline firmware piirang: üldise callback'i leidmine **ei tõenda**, et just
MOD objekt selle ARM-haru kaudu salvestatakse. MOD-spetsiifiline callback'i
sidumine, võimalik edastus teisele tuumale ning normaliseerimine ja uint16
salvestus on veel lahti. Leitud kohalik konstruktor effect ID-ga 199 ei ole
MOD-objekti tõend.

FW13 mälu rekonstrueerimisel arvestatakse iga 16-baidise boot-header'i,
täiteploki (`flags & 0x100`) ning plokipiiridega. Täiteploki sisu tuleb
header'i 32-bitisest argumendist, mitte järgnevast failisisust. Switch'i
täitekirje või plokipiiri käsitlemine tavalise faililõiguna annaks valed
aadressid; lõplikud kontrollpunktid loeti uuesti õigest mälukujutisest.

## Kontroll kolme olemasoleva Min/Max-punktiga

| Sisendi siht | float32 bitid (LE) | Lihtne 0…10 → 0…65534 nearest | Mõõdetud raw | Erinevus |
| --- | --- | ---: | ---: | ---: |
| Min 2.50 | `00002040` | 16384 | 16375 | −9 |
| Max 7.50 | `0000f040` | 49151 | 49159 | +8 |
| Max 5.00 | `0000a040` | 32767 | 32784 | +17 |

2.5, 7.5 ja 5.0 on binaarselt täpsed nii float64 kui ka float32 kujul.
**Kui** getter'i tekst on just vastav arv, ei selgita ainult double → float32
ümardamine neid raw-erinevusi. See on arvuline järeldus leitud getter'i kohta,
mitte tõend ajalooliselt sisestatud teksti või tegelikult saadetud paketi kohta.
Korpusel puudub klahvivajutuste, kasutatud UI-sündmuse ja juhtmepaketi logi.

Varasem korpus mängiti failidest uuesti läbi: 18/18 tavapunkti sobivad nearest
hüpoteesiga, Min/Max 0/3. Kõigi punktide kuvanäidud sobivad varasema
kuvamudeliga, kuid see ei määra täpset koodi. Attacki vastuolu (plaan 100 ms,
kasutaja tekst 9.99 ms, pildil 99.9 ms, raw 655) säilib muutmata.

MOD PID 1/2 cache'i neli arvuvälja on nullid (typecode 240). Staatilise
definitsioonipakkuja leidmine ei tõenda, et tööajal kasutatav definitsioon
oli samuti muutmata, ega anna sihtparameetri dünaamilisi piire. Nuppe
värskendav vastuvõtutee kasutab eraldi teksti ja normaliseeritud asendit;
kuvateksti, pöördenurka ja salvestatavat toorväärtust ei tohi samastada.

## Korratav kontroll

```sh
python3 tools/fm3/test-modifier-value-path.py
python3 tools/fm3/modifier_value_path_audit.py \
  --editor /absolute/path/FM3-Edit-arm64 \
  --firmware /absolute/path/fm3_dsp_rel_13p00.syx
python3 tools/fm3/modifier_quantization_audit.py
```

Uus kontroll läbis **23 staatilist kontrollpunkti**, õige algbinaari ja FW13
räsid, 6405 boot-ploki rekonstruktsiooni ning olemasoleva 21-punktilise korpuse.
**5/5 uut kontrolltesti** katavad andme-/täiteplokkide piiri, joondamata täite
faasi, puuduva/kattuva/kärbitud mälu tagasilükkamise, BL märgilaienduse ja vale
algbinaari tagasilükkamise. Vana kvantimisaudit läbis muutmata. Need on
uurimistöö kohalikud kontrollid, mitte uus serveri CI ega uus 48/48 release-run.

`modifier-value-path-checkpoints.json` sisaldab ainult asukohti, pikkusi ja
räsisid. Uusi originaalbinaari või firmware väljavõttebaite ei lisatud;
varasem 426-baidine tõend säilib muutmata. Peamine masinloetav tulemus on
`modifier-value-path-audit.json`; selle `generatorWriteSupport` on `false`.

## Lahtised küsimused ja järgmine samm

1. Siduda **MOD effect ID 3…34** konkreetse FW13 objektikonstruktori ja
   operation-9 callback'iga. Eristada ARM-dispatch ja võimalik DSP/SHARC tee.
2. Jälitada sihtparameetri dünaamilise metadata/piiride vastust, selle mõju
   definitsiooni `+0x10` kordajale ning callback'i normaliseerimisele.
3. Jõuda esimese tegeliku uint16 salvestuseni, tõendada clamp, skaleerimine,
   täpsus ja ümardamine; seejärel võrrelda kõigi kolme olemasoleva punktiga.
4. Alles pärast seda kaaluda generaatori muudatust koos eristavate piirjuhtude
   kontrollidega. Praegu ei ole ühtki uut täpselt põhjendatud kirjutusvalemit.

**Uut seadmekatset praegu ei küsita.** Praegune auk on kooditee sidumises;
veel üks kuvanäidu ja ekspordi paar seda iseenesest ei lahenda. Järgmine
uurimissamm kasutab juba olemasolevat firmware't. Kui jääb konkreetne
seadmes eristatav hüpotees, koostatakse üks koondkatse täpselt tuvastatud
lähte-SYX-i, ploki/kanali, alg-/sihtväärtuste ja ühe ekspordinimega.
