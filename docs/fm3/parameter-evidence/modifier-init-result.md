# MODE1: üks suletud algataja ja sümbolitega ADI binaar, 22.10.2026

Järgnev etapp: [puhvrite alamkutsed, parandatud mittetagastavad piirid ja
algataja 0x82fe42 allesjäänud sõltuvus](modifier-buffer-result.md).

Alus: kohalik commit `df7876d1f74298953750f2878056395e537f64d6` ja
tööaruande versioon 24. **Tootmisplugin 0.3.13; uusi füüsilisi eksporte 0.**

## Tõendatud tulemus

**Algataja `0x8304ab` sünkroonsete kutsete MODE1 mõju on nüüd piiritletud
analüüsis suletud.** Selle algataja kindel SID on **52**. Tõend katab
registreerimise, võimaliku ebaõnnestumise/tagasivõtmise, lubamise ja kõik
nende sünkroonsed alamkutsed. See ei hõlma hiljem käivituvat registreeritud
katkestuskäsitlejat ega muid väliseid katkestusi.

Lisaks on suletud matemaatika-lehtfunktsiooni **`0x1cb77a` MODE1
salvestus–taastamisrada**. Selle tagastus on 48-bitine Type11a, mistõttu
see tulemus ei sõltu lahtisest kompaktsest RTS/RTI kodeeringust.

| Ulatus | Kontrollitud seos |
|---|---|
| Algataja `0x8304ab` | Kutsub `0x830378`, `0x836a93`, `0x8369da`; vahetult enne viimaseid on R4=52. |
| SEC-i abifunktsioonid | `0x836ac8`, `0x83761c`, `0x83763a`, `0x837668`, `0x837690`; otseseid MODE1 kirjutusi ega alamkutseid pole. |
| L2 ümbrised | `0xbb816c`, `0xbb81dd`, `0xbb81bc`, `0xbb8221`; kontrollitud on registreerimise/tühistamise/lubamise kutseid ja nende viitealasid. |
| Registreerija `0x8337e2` | Kõik kontrollitud tagastusharud taastavad siseneva MODE1; nii olemasolev kirje, uus jaotus kui ka ebaõnnestumine on kaasatud. |
| Tühistaja `0x833876` | Muudab callback'i argumente ja hüppab sama registreerija algusesse; ei jäta MODE1 taastamist vahele. |
| Lubaja `0x8336e4`, SID 52 | `FEXT R4 BY 12:31` tulemus on null; SZ-haru läheb `0x833719`. Core-ID kaudse hüppe haru pole selle sisendi puhul saavutatav. |
| Matemaatikaabi `0x1cb77a` | `0x1cb77f`: I12=MODE1; `0x1cb781`: SET `0x800000`; `0x1cb7e0`: MODE1=I12; `0x1cb7e8`: 48-bitine RTS(DB). |

Registreerijal on kaks eraldi salvestuspaari:

| Rada | Salvestus | Ajutine muudatus | Taastus |
|---|---|---|---|
| SEC-i indeksitabel | `0x8337fc`, MODE1→R15 | `0x8337fe`, CLR `0x1000` | `0x83382b`, R15→MODE1 |
| Alternatiivne registriharu | `0x83385e`, MODE1→R0 | `0x833860`, CLR `0x1000` | `0x83386f`, R0→MODE1 |

Teise registriharu kaasamine ei sõltu eeldusest, et SID 52 sinna jõuaks:
registreerija enda taastamistõend kontrollib mõlemat haru. SID 52
spetsialiseerimist kasutatakse ainult lubaja `0x8336e4` kaudse hüppe
välistamiseks. Muud tundmatud tingimused jäävad kahesuunaliseks.

Audit jälgib MODE1 avaldist `(sisend & keep) | force` ning eraldi
salvestatud registreid. Kõik tagastused peavad andma siseneva MODE1
kõigi 32 biti ulatuses. Puuduv taastamine, kadunud salvestustähis,
tõendamata alamkutse või puuduv viitekäsk peatab kontrolli.
Tsüklite läbimine ei tähenda nende lõppemise tõendamist.
Algataja abi `0x830378` F1 riistvaratsükkel `0x8303ca → 0x830418`
on kaasatud nii korduse kui väljumise servaga. Vana signed24-tõlgenduse
vale sihti ei kasutata. Kontrollitud on ka coreTask'i otsene kutse
`0x82def9 → 0x8304ab`.

## Uus sõltumatu binaariallikas

ADI avalikust **EV-SC594-EZKIT-Audio-Starter** repost saadi olemasolev
`is25lp512m_dpia_SC594_Core1.dxe`, commit
`45acdde8560a2783547d2e075da171539a75d9e6`:

- suurus **2 094 008 baiti**;
- SHA-256 **`6375e296042ad0371f546157a01c63262dd7d5907fdda505d59ec829519bf9df`**;
- ELF32 päis, masina tunnus `0x85`, ADI atribuut **ADSP-SC594**;
- sümbolitabelis on funktsioonide nimed, aadressid ja pikkused;
- metaandmetes on ADI linker 6.3.5.8 ning osade kompileerimisüksuste
  CCES 2.10.0 / SHARC 8.14.0.0 tootjainfo. Viimane ei ole kõigi
  lingitud funktsioonide eraldi build-kinnitus.

See on **ADI avaldatud valmisbinaari lugemine**, mitte uus kohalik
assembleri käivitus ega seadmel tehtud katse.

| ADI sümbol / koht | Leitud seos |
|---|---|
| `__dispatcher_SEC`, `0x1c069d`, 110 VISA aadressiühikut | SID-põhine dispatcher; selle lõpus `0x1c0705` parcel `0x0afe`. |
| `__dispatcher_SEC_rtn`, `0x1c072b` | SEC-i lõpetamise kirjutus enne ühist taastamislõppu. |
| `__dispatcher_rtn`, `0x1c072e` | **80 baiti kattub täpselt** FM3 lõiguga `0x1cbbe9`, arvestades failide erinevat parcel'i baidijärjekorda. |
| `0x1c0751` | Taastamislõpu parcel `0x0bfe` ja järgnevad I7/I12 taastamiskäsud. |
| `___lib_setup_c`, `0x1c0886`, 142 aadressiühikut | Funktsiooni viimane parcel aadressil `0x1c0913` on `0x0abe`; järgmine funktsioon algab `0x1c0914`. |
| `___lib_fdiv`, `0x1c02a4`, 78 aadressiühikut | Nimega seotud jagamisabi; nagu varasemas ADI audiobinaaris, taastatakse MODE1 48-bitise tagastuse viitealas. |

ELF-i little-endian päis **ei määra siin koodiosa parcel'ite baidijärjekorda**.
Selle DXE VISA koodiosa kasutab big-endian parcel'e; FM3 laadimisvaade
little-endian parcel'e. Audit teisendab ainult iga 16-bitise parcel'i
baidijärjekorra ja kontrollib kahe baidi vastavust ühele VISA aadressiühikule.
ISA vektoritabelit sama kaardistusega lugeda ei lubata.

ADI enda FreeRTOS-i `portASM.asm` kirjeldab eraldi, et SEC-i madala taseme
käsitleja käivitatakse RTS-i abil tehtud kaudse hüppega. Samas failis on
avaldatud sama registrite taastamise paigutus. See annab tähendusele
esmase lähtekooditoe, kuid **pole selle DXE või FM3 täpne lähtefaili ja
objekti vastavuspaar**.

## Mida see ei kinnita

**Kompaktsete tagastuste hinnang jääb
`strongly-corroborated-static-hypothesis`.** Nüüd on olemas nii sõltumatu
ADI binaar sümbolipiiridega kui ka tootja lähtekoodis kirjeldatud
väljakutsekonventsioon. Puudub siiski konkreetse kompaktse mnemonic'u
ja väljastatud parcel'i vahetu assembleriloend või parandatud esmane
kodeeringutabel. Uue binaari olemasolu ei märgita uueks assembleri jooksuks.

Kontrollitud avalik SHARC+ juhend on endiselt sama Type11c vastuoluga
rev1.5. Kohalikus uurimiskeskkonnas ei leitud `easm21k`/`cc21k`
assemblerit ega otse kutsutavat REA teenust. Varasema Maci REA/Ghidra
edukas jooks ja selle tulemused säilivad; selles etapis kasutati uut
staatilist analüüsi, **uut REA dekompileerimist ei tehtud**.

Käituseeldused on kehtiv skalaarne ABI, korrektne pinumälu ja tagastused,
ülevaadatud SID edasikandumine ning sekkuvate katkestuste/erandite puudumine.
Salvestatud token'ite puutumatuse ja MODE1-kirjutuste puudumise inventuur
on seotud läbivaadatud baitide räsidega; see ei ole universaalne ISA
emulaator ega tundmatu käsu automaatne ohutuks kuulutamine.

SYSCTL aadressi `0x30024` jaoks saadi uus samasugune ADI käivitusmuster,
kuid täpset SHARC+ tootja registriaadressi definitsiooni ei leitud.
Vana SHARC-i aadressitabelit ei kasutatud selle lünga formaalseks sulgemiseks.

## Kontrollid ja allesjäänud töö

Uus [audit](modifier-init-audit.json) ja
[kontrollpunktid](modifier-init-checkpoints.json): **17 ülevaadatud
funktsioonipiirkonda, 632 unikaalset käsupiiri, 17 funktsiooni tõendit
ja kokku 603 sümboolset olekut**. Funktsioonipiirkonnad võivad kattuda;
603 ei ole unikaalsete protsessoriseisundite ega seadmekatsete arv.

**8/8 uut sihitud testi läbisid; auditi loomine ja eraldi taasesitus
läbisid.** Testid katavad taastamata haru, salvestuse rikkumise,
tõendamata kutse, puuduva sihi/viiteala, vale SID-eelduse ning ELF/VISA
baidijärjekorra ja aadressipiirid. Tootmisgeneraatorit ega kogu CI-d
ei käivitatud selle uurimismuudatuse kinnituseks.

```sh
python3 tools/fm3/test-modifier-init.py
python3 tools/fm3/modifier_init_audit.py \
  --firmware /path/to/fm3_dsp_rel_13p00.syx \
  --adi-dxe /path/to/is25lp512m_dpia_SC594_Core1.dxe
```

Lahtiste algatajate arv vähenes **6 → 5**:
`0x82c228`, `0x82fe42`, `0x80f1ba`, `0x8289bc`, `0x1c8b15`.
Töötsükli lahtised ulatused on endiselt `0x82b193` väljaspool teadaolevat
callback'i, `0x811a83` ja `0x80ea77` väljaspool analüüsitud op10 lõiget.
Lisaks jäävad ploki kaudne op86/PID0x3fad, varasemate pakettide toime,
salvestusele järgnev tagastus ning katkestuste/erandite kogu mõju.

**Järgmine piiritletud samm:** võtta `0x82fe42` ülejäänud kutsed.
Selle `0x1cb77a` leht on nüüd suletud; alles on `0x82c8a2` kopeerimisrada,
`0x82e179` ja selle alamkutsed ning juba teadaolev `0x1cb13a` tagastusküsimus.
Uurimises nähtud `0x8336c8` ei tohi nime põhjal tavaliseks säilitavaks
abifunktsiooniks lugeda: selle ulatus võib sisaldada mittetagastavat
vearada ja naaberfunktsiooni; piirid vajavad eraldi kontrolli.

Uus presetieksport nendele koodi- ja käsukodeeringu küsimustele ei vasta.
Wahi Min 2.50 / Max 7.50 / Max 5.00 lohistatud raw-sõnad
**16375 / 49159 / 32784** jäävad samaks. Sendisammu kandidaadi
**1000/1001** ulatus ja **6.47 blokeering** säilivad. Terve tööaja MODE1,
kogu Min/Max väärtusvahemik ja generaatori uus kirjutustugi jäävad
tõendamata; vastavad auditi lipud on false.

## Allikad

- [ADI SC594 projekt ja valmis DXE, täpne commit](https://github.com/analogdevicesinc/EV-SC594-EZKIT-Audio-Starter/tree/45acdde8560a2783547d2e075da171539a75d9e6), `build/is25lp512m_dpia_SC594_Core1.dxe`; allika URL ja räsi manifestis.
- [ADI FreeRTOS SHARC+ portASM.asm, täpne commit](https://github.com/analogdevicesinc/sharc-reusable-components/blob/f0916a8c0d69fecd79c6f8dec0f2f7c35bb38f67/oss-services/FreeRTOSv10.4.3-LTS-SHARC/src/portable/CCES/SHARC_215xx/portASM.asm).
- [SHARC+ Core Programming Reference, rev1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf), MODE1, Type11a/11c ja varasemates auditites viidatud operandivormid.
