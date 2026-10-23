# Volume’i pedaaliseos: uus Maci REA tulemus, 23.10.2026

**Maci koondjooks õnnestus. Uut REA jooksu ei ole vaja korrata.**
See on uus kasutaja Macis tehtud REA/Ghidra analüüs, mitte varasema Min/Max-i
tõendi taaskasutus ega ChatGPT keskkonnas käivitatud Ghidra.

| Kontroll | Tulemus |
|---|---|
| Tagastatud ZIP | `FM3_REA_VOLUME_PEDAL_20261023T175341Z_G3eREA.zip`, 2 863 758 baiti |
| SHA-256 | `872db78e6a487a97247e7acf9d94392696bd1099cbf481a8ed442507e1a41b7d` |
| Aeg | 17:53:41.899–17:55:54.838 UTC, umbes 133 sekundit |
| Keskkond | Apple Silicon / arm64; Node 26.7.0; REA 6.4.0; Ghidra 12.1.4; Temurin täis-JDK 21.0.12.1 |
| Ghidra eelkontroll | 9/9; analyzeHeadless ja native arm64 dekompilaator korras |
| Siht | FM3-Edit 1.07.17 arm64; binaari räsi enne ja pärast sama |
| Failid | Kõik 42 lahtipakitud faili võrreldi originaalarhiivi baitidega |
| Päringud | 30 vastust: 27 `ok`, 3 `limited`, 0 viga |
| Funktsioonid | 8 plaanitud funktsiooni + 2 lühikest thunk'i; kõigi 10 pseudokood ja lokaalne native value flow olemas, ilma truncation'ita |
| Täiendavad viited | 10 viitekohta uuritud; 5 funktsiooni leitud, neist 3 juba plaanis, 2 thunk'i lisaks |
| Tõendikogu | 35 kirjet; päringute evidence_id-ga tulemused vastavad ekspordi kirjetele |

Sihtbinaari SHA-256 on
`62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a`.
Koguja ja plaan on baitidentsed väljastatud paketiga; kõik kaheksa funktsiooni
kontrollpunkti vastavad. Masinloetav inventuur ja päringute piirangud on failis
[volume-pedal-rea-result.json](volume-pedal-rea-result.json).

`environment_healthy=false` tuleb kõrvalistest IDA registreeringu ja Codexi
registreeringu teadetest. Ghidra jaoks küsitud `healthy=true` ning 9/9
scope_checks läbisid. Need teated ei nõua toimiva Ghidra paigalduse muutmist.
SHARC sihtmudelit selles jooksus ei kontrollitud.

## Uus sisuline tõend

| Küsimus | REA tõend | Järelduse piir |
|---|---|---|
| Millal luuakse seos? | `003`, `0x1001796d4`: MOD PID0 mitte-null Source + puuduv ID käivitab sisemise serialiseerija 0x3a ploki/PID sihtväljadega; olemasoleva ID korral kasutatakse tavalist muutmisrada | Sisemine kood ei ole iseseisvalt uus kontrollitud wire-käsk |
| Kuidas Source kohale jõuab? | `003` säilitab algse 12-baidise muutmispaketi; `004`, `0x1001795f8`, kirjutab saadud ID paketi algusse, saadab selle tavalisele saatjale ja märgib ootel PID-i 0xffff-ks | Ei tõenda firmware’i algse serialiseeritud kirje kõiki 25 sõna |
| Kust tulevad siht-ID-d? | `006–008` annavad dialoogile ploki ja parameetri ID-d dünaamiliselt; `008` kasutab juhtobjekti PID-i ja plokikonteksti ID-d | Need kutsujad ei lisa kõvakodeeritud effect102/PID0 erandit; Volume identiteet jääb olemasoleva metadata tõendiks |
| Kanalite metadata | `005`, `0x10017b200`, küsib `009`, `0x1000ca538`, kaudu sihtploki kirje; tagastatud struktuuri +0x18 arv läheb MOD PID17 definitsiooni float-väljale +0xc | Selle konkreetse FW13 seose ALL-väärtus ja vaikeolek ootavad serialiseeritud doonorit |
| Min/Max-i kasutajaliides | `005` keelab MOD PID1/2 otsesisestuse ning seob nupu ulatuse muudetava parameetriga | See ei võrdsusta sama kuvanäitu sama sisendfloat’i ega raw-sõnaga; Wahi kooditulemust Volume’ile ei kanta |
| Saatmisjärjekord | `010`, `0x1000b0744`, lisab serialiseeritud päringu saatmisjärjekorda | Saatmisjärjekord ei ole vastuse, raw-sõnade, heli ega STORE/reload’i tõend |

Need leiud kinnitavad ja täpsustavad eelmist kohalikku Capstone-analüüsi.
Editor taotleb seadmes seose loomist; üksnes Wah-kirje sihtväljade
ümbernimetamise piisavust ei ole tõendatud.

## Kolm piiratud andmevoojälge

| Päring | Sõlmed | Servad | Dekompileerimisi | Piir |
|---|---:|---:|---:|---|
| `026 source-create-remove` | 1727 | 2039 | 6 | kutsete sügavus/dekompileerimiste arv; lahendamata kutsed ja argumendid |
| `027 assigned-id-and-pending-source` | 1100 | 1357 | 6 | dekompileerimiste arv; lahendamata kutsed ja argumendid |
| `028 target-dialog-setup` | 3000 | 4184 | 4 | sõlmede piir; lahendamata virtuaalkutsed ja argumendid |

Kõigil on `truncated=true`; need ei ole kolm ebaõnnestunud päringut ega
tõend kogu programmi kohta. Nende laiendamine ei taga firmware’i vaikekirje
leidmist editori binaarist. Praegu uut Maci jooksu ei küsita.

## Järgmine samm: üks FW13 doonorieksport

Puuduv tõend on seadme loodud **Ext1 → Volume/Pan 1 Gain ALL** terviklik
25-sõnaline kirje. Kõik 638 olemasolevat SYX-i on juba läbi vaadatud ning
seda doonorit pole. Üks uus eksport kogub korraga kanaliulatuse, Min/Max-i
vaikesõnad, kõvera, lipud ja sõltumatu preseti baitide säilimise kontrolli.

`tools/fm3/rea-volume-pedal/prepare-binding.mjs` valmistab avaldatud 0.3.16
mootoriga **FM3 VOL BIND CHECK** lähtepreseti ja SYX/TXT/spec/validation-väljundid.
Volume/Pan 1 on **rea 3 veerus 3**, kanal A, Type VOLUME; aktiivseid
modifikaatoreid on 0. SYX SHA-256:
`8cf3b5e27b9d2b8d5f5489cb930b4dff733c41ece1be85d027aef16e0d2145c3`.
Editoris on PID0 kuvatav nimi **Volume**, metadata nimi **VOLUME_GAIN**;
Level-välja ei valita.

Paketi `LOE_MIND.md` sisaldab täpset tabelit ning kasutusjuhist. Kasutaja
valib Volume-nupu modifikaatoris Source=External 1 ja Channels=ALL,
jätab ülejäänud vaikeväljad puutumata ning ekspordib terve aktiivse preseti
failina **FM3_VOL_BIND_CHECK_export.syx**. Terminali, REA-d, püsivat STORE-i,
pedaaliühendust ega heli kontrolli pole vaja. Sisendi gate'i ega eraldi
Gate-plokki siin ei muudeta.

Võrdleja lubab ühe uue kirje sõltumata selle asukohast 32-kirjelises tabelis;
kõik ülejäänud preseti keha baidid peavad säilima. Seitse sünteetilist
kontrolli hõlmavad kolme võimalikku kirjepesa, valesid ID-sid/kanalit/allikat,
lisaseost, kõrvalmuudatusi kehtiva CRC-ga, vigast kaadrikontrollsummat ning
iseseisvat paketti keerulises failitees. Sünteetilised kirjed ei ole FW13
vaikeoleku tõendid.

## Säilivad piirid

Privaatne plugin on 0.3.16, mootori lähtecommit
`a11d8e44d0df339411d7e45ad6bea126b0bf89d5`. Uut generaatorikirjutajat ega
väljalaset pole. Füüsilisi ekspordikordi selles analüüsis: 0; järgmine
ettevalmistatud katse vajab üht eksporti. Toortulemuste algne ZIP on säilinud
kasutaja saadetud failina; avalik dokument sisaldab räsi ja kontrolltulemust,
mitte kasutaja kohalikke teid või kogu dekompileeritud koodi.

Wah `wahMinMaxExact`, kuus mõõdetud punkti välja kohta, 995 mudelipõhist
väärtust, ajalooliste hiirepunktide eristus ja `fullRangeEncodingProven=false`
jäävad samaks. Globaalne pedaali/CC määrang, pedaali hetkeseis, heli ja
STORE/reload vajavad eraldi tõendit.
