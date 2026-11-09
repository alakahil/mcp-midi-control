# FM3 FW13: laadimine edit buffer'isse ja tagasilugemine

Sisukord: lubatud toimingud; katsepaki ettevalmistamine; transport ja laadimine;
lugemispäringud; SHOT; BIND; muudatuste kontroll.

See on valikuline kohalik seadmekatse, mitte generaatori automaatne osa.
Kasutaja võib paluda katse ette valmistada või käivitada. Kohaliku Maci/Linuxi
ligipääsu olemasolu tuleb tegelikult kontrollida; pilvekeskkond ei näe kasutaja USB-porti.
Kui lubatud kohalik täitekeskkond puudub, valmista valmis katsepakk ja anna käsk
kasutaja arvutis käivitamiseks. Ära nimeta seadmeta kontrolli seadmekatseks.

Alus: kasutaja 09.11.2026 dokument `codex-fm3-load-readback.md` ja pakendatud
`skills/instructions/scripts/cpu-sweep-collector/` skriptid. Allpool on juhis
0.3.61 jaoks, mitte väide, et kõik vanad T18–T42 pakid sisaldavad uusi kaitseid.
Vanad katsefailid ja mõõtetõendid säilivad muutmata.

## Lubatud toimingud

- LOAD: üks terviklik, manifesti SHA-256-ga kontrollitud preset ajutisse
  redaktsioonipuhvrisse (edit buffer). See asendab seal oleva salvestamata töö;
  enne katset peab kasutaja oma vajaliku töö säilitama.
- GET: ainult allolevas lubatud kujude loendis olevad lugemispäringud.
- STORE, teise preseti valimine ja tagasi tulemine on kasutaja käsitsi tehtavad
  sammud. Skript ei saada STORE-i, parameetri SET-i, preseti- ega stseenivahetust.
  Üldseadeid see töövoog ei muuda. Nende muutmiseks on vaja eraldi selgesõnalist luba.
- Kasutaja senised testikohad on 424–426, kasutatud on ka 427. Ära vali ega
  kirjuta kohta automaatselt; `--verify` küsib kasutaja tegelikult kasutatud kohta.
- Kommertspresetite sisu, dumpide hex ega neist taastatav sisu ei lähe GitHubi.
  Lähtekoodi muudatused lähevad eraldi harule ja PR-i; liida ainult kasutaja
  selgesõnalise „liida“ korralduse järel.

Selle katse lubamine ei luba suvalisi SysEx-proove. Viga peatab edasise saatmise.
Enne igat skripti sulge FM3-Edit ja Fractal-Bot. Ava FM3-Edit uuesti alles siis,
kui skript on lõppenud ja port vabastatud. Scene MIDI-ga preseti laadimine võib
käivitada presetti salvestatud Scene 1 väljundkäsud; teavita sellest enne katset.

## Katsepaki ettevalmistamine

Kasuta kontrollitud väljaande skripte koos nende kohalike sõltuvustega samas kaustas:
`FM3_CPU_SWEEP.py`, `FM3_READ_PROBE.py`, `FM3_BIND_STORE.py`,
`FM3_SHOT_LOAD.py`, `FM3_SHOT_READ.py`.

Eelista olemasoleva sihitud katse builder'it repo `tools/fm3/` kaustas
(nt `shot-t24-build.mjs`, `t42-modifier-targets-build.mjs`). Need builder'id
on arendustööriistad repos, mitte plugina käivituspaketi osa.
Uue tavalise kasutuspreseti jaoks genereeri esmalt SYX/TXT/spec/validation
kvartett ja kontrolli seda sama mootori `fm3-preset.mjs --verify` käsuga.
Uuringupaki eraldi verifikaator ei asenda tavalise lõpppreseti kontrolli.

SHOT-manifest: `kind:"fm3-shot-check"`, mittetühi `items`.
Iga item: `id`, `name`, `file`, `sha256`, mittetühi `blocks`.
Iga block: `family`, `effectId`, `words` (sõnu kanali kohta), `channels` (1/2/4),
`request` (bulk-päringu hex), `expected` (kõigi kanalite sõnad), `writes`
(valitud kontrollpunktid: `param`, `channel`, `pid`, `raw`; võib olla tühi).
Loo `expected` ja `writes` kontrollitud lõpp-SYX-i dekodeeritud plokikirjetest,
mitte küsitud näiduväärtustest. Säilita ploki tegelik kanalite arv;
Controllers, modifikaatorid ja ruudustik ei ole tavalise efektiploki bulk-võrdlus.
`allMatch` katab ainult manifestis loetletud plokke, mitte kogu presetti.

BIND-manifest: `kind:"fm3-bind-store"`, `preset:{file,sha256}`, `confirmName`
ja `checks:[{id,text}]`. Ilma STORE-ita vaatluspakil on `kind:"fm3-bind-check"`.
SHOT ja BIND kasutavad erinevaid manifeste; ära käivita neid sama manifesti
vastu ega nimeta üht lihtsalt ümber. Katsepaki SHA-256 seob tulemused selle
manifesti versiooniga. Räsi kinnitab faili kooskõla, mitte päritolu/autentsust.

ID ja `--label`: 1–80 ladina tähte, numbrit, alakriipsu või sidekriipsu;
esimene märk on täht või number. Kasuta iga uue katse jaoks uut sessioonikausta.

## Kohalik transport ja laadimine

Python 3, POSIX serial, macOS/Linux; pyserial pole vajalik. Port avatakse
`O_RDWR|O_NOCTTY|O_NONBLOCK`, `TIOCEXCL`, raw-režiim, 115200, `CLOCAL|CREAD`.
Automaattuvastus nõuab täpselt üht `/dev/cu.usbmodem*` või `/dev/ttyACM*` porti;
muul juhul määra tegelik `--port`. Kirjutamise ajalimiit on 5 sekundit.
Framer kogub F0…F7 kaadrid, eirab MIDI realtime baite ≥ F8 ja katkestab
kaadri muu staatusebaidi korral.

Enne laadimist või järgnevaid lugemisi nõutakse vastust CPU/grid päringule
2 sekundi jooksul. Vastuse puudumisel on saadetud ainult see lugemispäring;
presetit ei laadita. Vastus ei tuvasta eraldi firmware'i versiooni.

`dump_frames()` ja `send_preset()` nõuavad enne esimese dump-kaadri saatmist:

1. 24 680 baiti, täpselt 10 kaadrit: 77, kaheksa korda 78, 79.
2. FM3 päis `F0 00 01 74 11`, 7-bitised sisubaidid, korrektne XOR-kontrollsumma
   (`XOR(F0 … viimane payload-bait) & 7F`), lõpp F7 ja puuduvad kõrvalbaidid.
3. 77 päise payload `7F 00 00 40 00`. Salvestatud asukoha päis on keelatud.
4. Faili SHA-256 peab vastama manifestile. Kõik ette teada lugemispäringud
   kontrollitakse enne ühenduse avamist ja uuesti enne nende saatmist.

Kaadrite vahele jääb 30 ms, vastuste tühjendamiseks 0,2 s.
Laadimise järel oodatakse BIND-is 1,0 s, SHOT-is 1,2 s ja READ_PROBE-is 1,5 s.
BIND ja vanemad interaktiivsed kogujad küsivad nähtud nime kinnitust.
SHOT kinnitab laadimise manifesti plokkide sõnahaaval tagasilugemisega.
Ükski skript ei salvesta presetikohta. Teise preseti käsitsi valimine tühistab puhvri.

## Lubatud lugemispäringud

Kõik päringud läbivad `FM3_READ_PROBE.read_only_shape()` kontrolli;
`None`, vale kontrollsumma või vale kuju peatab saatmise.

| Liik | Funktsioon ja payload | Otstarve |
| --- | --- | --- |
| grid | fn 01, `2E` + **14 nullbaiti** | Pordikontroll / CPU, kogu kaader 23 baiti |
| bulk | fn 1F, `eid_lo eid_hi` | Ploki kõik salvestatud sõnad kõigis kanalites |
| storedDump | fn 03, `index_hi index_lo 00`, indeks 0…511 | Kasutaja salvestatud koha lugemine |
| editBufferDump | fn 43, tühi payload | Ainult uurimisproov; sisemine kujutis pole tavaline SYX-keha |
| display | fn 01, sub `1F 00`, eid/pid, nullväärtus | Ajalooline proov; nuppude praegust näiduteksti ei anna |
| label / labelInt | Sama sub `1F 00`, täisarvu indeks 1…4095 | Päringus antud indeksi silt; mitte hetkeväärtus |

Loendisiltide tegelik kasutatav kodeering on `labelInt` (14-bitine täisarv).
Float32 `label` kuju on ajaloolise proovi lubatud kuju, mitte kinnitatud
sildilugemise viis. Ära küsi üle parameetri teadaoleva loendipiiri.
Parameetri SET `09 00` / `52 00`, STORE sub 26 ja muud kujud on keelatud.
CPU = vastuse `frame[37]`: raw < 64 korral 32 + raw/2, muidu raw protsenti.
`settle()` otsib kolme järjest võrdset näitu, kuni 8 s; see ei kinnita kõigi
stseenide CPU-d. Algdokumendi CPU näites oli üks nullbait puudu: rakendus
ja whitelist kasutavad 14 nullbaiti, mitte 13.

## SHOT: laadimine ja hilisem korduslugemine

Katsepaki kaustas:

```bash
python3 FM3_SHOT_LOAD.py --preflight --pack . --preset ID
python3 FM3_SHOT_LOAD.py --self-test
python3 FM3_SHOT_LOAD.py --check-port
python3 FM3_SHOT_LOAD.py --load --pack . --session ../SESSION_X --preset ID
```

`--preflight` kontrollib valitud preseti räsi, kaadreid ja manifesti ilma porti
avamata. `--self-test` on dekoodri seadmevaba enesekontroll. `--check-port` avab päris ühenduse ja saadab CPU
lugemispäringu. `--load` on teadlik edit-buffer'i asendamine.

Bulk-vastus: 74 päis (effectId, sõnade arv), 75 kehad, 76 lõpp.
Iga 16-bitine sõna: `b0 | b1<<7 | b2<<14`, kolmas septett 0…3.
Nõutakse korras kaadreid, õiget efekt-ID-d, päis/keha/lõpp järjekorda ja
päisega sama sõnade arvu. Kogumine lõpeb 0,3 s vaikuse järel (max 4 s),
kuni kolm katset 0,4 s pausiga.

Võrdlus kontrollib iga oodatud sõna. Erinevused esitatakse kujul
`{channel,pid,expected,device}`, valitud `writes`-punktid eraldi.
`shot-load-ID.json` annab `allMatch`; erinevus väljub koodiga 2.
Ebaõnnestunud lugemine säilitab `allMatch:false` ja vea. Ära jätka
kuvatõendite kogumist, kui laadimise kontroll ei läbinud.

Pärast skripti lõppu ava FM3-Edit, kontrolli kanaleid ja näite ning tee pildid
ilma Save'ita. Kontrolli eraldi ka preseti nime, ruudustikku, stseene ja bypass-olekuid;
samade parameetrisõnadega teine preset võib samuti bulk-võrdluse läbida. Nupu kuvatähendus (näiteks 6500 Hz), heli ja pedaali käitumine
vajavad vaatlust või kuulamist; võrdne toorsõna ei tõenda neid.
Pärast FM3-Editi sulgemist saab ainult uuesti lugeda:

```bash
python3 FM3_SHOT_READ.py --pack . --session ../SESSION_X --preset ID --label after-edit
```

See teeb CPU-kontrolli ja bulk-lugemise, ei laadi. Väljund on
`shot-read-ID-after-edit.json`, sh `allMatch`, erinevused ja loetud sõnad.
Erinevus väljub koodiga 2. Olemasolevat tulemust ei kirjutata üle.

## BIND: kasutaja STORE ja salvestise lugemine

Eraldi BIND-paki kaustas:

```bash
python3 FM3_BIND_STORE.py --load --pack . --session ../SESSION_Y
# Kasutaja kontrollib/kuulab, teeb STORE, valib teise preseti ja tuleb tagasi.
python3 FM3_BIND_STORE.py --verify --pack . --session ../SESSION_Y
```

`--load` küsib nime kinnitust ja loob `bind-store-load.json`.
`--verify` küsib enne/pärast tähelepanekuid ning tegelikku kohta 1…512.
Display Offset 1 korral nähtav N → indeks N−1. Lugemine on fn 03,
0,4 s vaikust, kuni 6 s. Kaadrid säilivad hexina `bind-store-results.json`-is;
mittetäielik, vigane või vale koha vastus ei ole edukas lugemine.
Vastuse struktuurikontroll ei võrdu algpresetiga sisulise võrdlusega.

Võrdle saadetud ja loetud presetti **offline**, näiteks repo
`tools/fm3/controllers-store-compare.mjs` eksporditud `compareStoredPreset`
funktsiooniga või katse enda ingest-tööriistaga. Kontrolli täielikku keha,
CRC-d, plokke, modifikaatoreid, stseene ja süsteemisaba. Teata täpselt,
kas erineb ainult valitud stseen või kirjete järjekord; ära nimeta sellist
faili baittäpselt samaks. Kasutaja tähelepanekud ja binaarne võrdlus on eri tõendid.

`--record` on fm3-bind-check paki vaatlusrežiim, ei ava porti ja loob
`bind-check-results.json`. READ_PROBE loob `probe-results.json`.
CPU_SWEEP kasutab jätkatavat `results.jsonl` faili: lisab mõõtmata kirjeid,
ei asenda varasemaid ridu. Teised tulemused ei kirjuta olemasolevat faili üle.

## Muudatuste kontroll

`python3 -B skills/instructions/scripts/test-device-load-readback.py`
(engine-kaustast) kontrollib simuleeritud pordiga saatmise järjekorda,
keelatud päringute/vigaste dumpide tõrjumist, vastuse puudumist, võrdlust,
rikkis vastuseid ja tulemuste säilitamist. Test on kohustuslikus offline-suite'is.
Uusi kujusid lisades lisa nii lubatud kui ka keelatud juht. Ära lisa SET-i,
STORE-i, stseeni/presetivahetust ega üldseadete kirjutust isegi katsetamiseks.
See kontroll ei ole uue koodi füüsilise USB-ühenduse ega firmware'i katse.
