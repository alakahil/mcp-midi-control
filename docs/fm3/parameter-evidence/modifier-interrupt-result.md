# Katkestusvektor, registreerimine ja valitud ülesande MODE1 taastamine, 22.10.2026

Järgnev etapp: [SID52 algataja ja sümbolitega ADI binaar](modifier-init-result.md)
sulgeb ühe täiendava sünkroonse MODE1 kutseahela. Kompaktsete tagastuste
kodeering ja aktiivse katkestusraja täielik invariant jäävad endiselt lahtiseks.

Alus: kohalik commit `07c143ebf3371550b22ee48618c1ac6c1190ca84` ja
tööaruande versioon 23. **Tootmisplugin 0.3.13; uusi füüsilisi eksporte 0.**

## Tõendatud staatilised seosed

FW13 laaditava katkestustabeli **SECI kirje hüppab otse dispatcher'isse
`0x1cbb7f`**. Registreerija ja dispatcher kasutavad sama kaheastmelist
SID → indeks → callback-tabelit. Ajastaja callback'i `0x830778` sees
on leitud konteksti taastamise väljakutse ja MODE1STK kirjutus.
Lõpliku RTI-ni jõudmine on allpool kirjeldatud eeldustega tingimuslik
rada, sest kompaktsete tagastuste sõltumatu kodeeringukinnitus puudub.

| Lõik | Natiivsetest operanditest kontrollitud seos |
|---|---|
| Laaditav vektoritabel | LDR plokk `0x28240000`, 768 baiti, lipud `0xaca10002`; 128 pakitud 48-bitist ISA käsku. |
| SECI, ISA `0x9003c` | Tingimusteta `JUMP 0x1cbb7f (DB)`; viitealas ASTATX=`0x0f000008` ja NOP. |
| Käivitus | Reset-kirje → `0xbb8000`; hüpped `0xbb8002 → 0x1c0000 → 0xbb8005`; `0xbb807f` kutsub `0x834390`. |
| Registreerimine | `0x830e43` seab callback'iks `0x830778`; SID valik on 50 või 51, argument R12=0. Kutsutakse `0x8337e2`. |
| Registreerija | 16-bitine indeks aadressilt `0x2e4920 + 2×SID`; callback'i aadress `0x2e4b28 + 8×indeks`, argument +4 baiti. |
| Dispatcher | Arvutab samad aadressid; loeb callback'i PCSTK-sse, argumendi R12-sse ning valmistab ette jätku `0x1cbbe6`. |

SECI vektori 48-bitine käsk on little-endian pakitud sõna. VISA käskude
16-bitiste parcel'ite järjekorda sellele otse rakendades saadakse vale
tulemus. BFLAG_AUX on laadijapäise bit5; BCODE bits0–3 ei määra käsu
laiust. L2 käivituskoodi aadressid tõlgitakse andmelehe tabeli 5 järgi:
VISA `0xba0000..0xbbffff` vastab baitidele `0x20080000..0x200bffff`.

Käivituse F1-tsükkel `0x8343a1` kordab kaks korda, lõpuaadress on
`0x8343e6`. F1-lipp bit23 ei ole hüppenihe märgibitt. Tsükkel seab
modifikaatorid M5/M13=0, M6/M14=1 ja M7/M15=−1 mõlemas registripangas;
pärast tsüklit valitakse põhipank. Need on ülevaadatud algseadistused,
mitte garantii, et ükski hilisem kood ei riku ABI eeldusi.

Registreerimistabeli maht on 277 kirjet. Audit arvutab **552 lubatud
aadressikolmikut**: SID 50/51 ja mittenullindeksid 1..276. Need on
aadressialgebra juhud, mitte 552 vaadeldud katkestust ega tõend, et
iga indeks jõuab tegelikult kasutusse. Uue kirje otsing algab indeksist
21; jaotus võib ebaõnnestuda või kirje võib hiljem muutuda. Konkreetset
tööaja callback-kirjet ei eeldata fikseerituks.

## Tingimuslik tagastusrada

| Koht | Täpne tähendus või selgelt märgistatud eeldus |
|---|---|
| `0x83079a..0x8307a6` | Valitakse järgmise ülesande kontekst ning laaditakse selle salvestatud I7. |
| `0x8307a8..0x8307ae` | Callback'i PCSTK jätk salvestatakse; kutsutakse taastaja `0x830a1b`, tagasipöördumine `0x8307b1`. |
| `0x830a1e`, `0x830a5d` | Taastaja hoiab enda tagastusaadressi I13-s ja taastab selle PCSTK-sse pärast valitud ülesande PC-pinu laadimist. |
| `0x830ae3` | USTAT1 saab valitud ülesande salvestatud MODE1 sõna `DM(0x25,I7)` ehk +148 baidist. |
| `0x830c40`, `0x830c43` | `PUSH STS`; seejärel `MODE1STK = USTAT1`. |
| `0x830c8c → 0x8307b1` | Kompaktse RTS-i tõlgenduse korral taastaja naaseb callback'i. |
| `0x8307b1..0x8307bb → 0x1cbbe6` | Callback taastab salvestatud jätku; kompaktse RTS-i tõlgenduse korral naaseb dispatcher'isse. |
| `0x1cbc0c` | Kompaktse RTI(DB) tõlgenduse korral võetakse MODE1 staatuspinust; viitealas taastatakse I7 ja I12. |

USTAT1-le ei kirjutata ülevaadatud harudes uut väärtust lugemise
`0x830ae3` ja MODE1STK kirjutuse vahel. Viimasele kirjutusele järgnevas
taastaja lõpus ei muudeta enam MODE1/MODE1STK-d ega staatuspinu.
USTAT1 enda varasem väärtus taastatakse hiljem `0x830c84`; MODE1STK-sse
kopeeritud väärtus sellest ei muutu. Selle negatiivse inventuuri ulatus
on räsiga seotud ülevaadatud lõik, mitte kogu firmware'i automaatne CFG-tõend.

**Taastatakse valitud ülesande MODE1, mitte tingimata katkestatud
ülesande MODE1.** Ülesande vahetus võib neid õiguspäraselt eristada.
Audit modelleerib staatuspinu lõppu: PUSH → valitud MODE1 kirjutus →
RTS → RTS → RTI. Mudel säilitab välise staatuspinu ja rakendab valitud
režiimi alles RTI korral. Puuduv PUSH, vahepealne ülekirjutus või
RTI asendamine RTS-iga lükatakse tagasi. Mudel ei emuleeri kogu CPU-d,
PC-pinu ega ajastaja ülesandevalikut.

## Alles jäävad piirangud

- **Aktiivne vektor:** laaditav tabel on seotud dispatcher'iga. Käivituses
  loetakse `DM(0x30024)`, seatakse bit2 ja kirjutatakse sõna tagasi.
  Selle seostamine SYSCTL.IIVT-ga on käivitusmustri ja ADI kirjeldatud
  vaikekäivituse põhjal tehtud järeldus. Täpset tootja registriaadressi
  definitsiooni `0x30024` jaoks ei saadud. Kõiki hilisemaid vektorivaliku
  kirjutusi ja tegelikku lubatud katkestust ei ole tõendatud.
- **Tagastuskodeering:** `0x0abe/0x0afe/0x0bfe` pärivad varasema
  [tagastusuuringu](modifier-return-result.md) hinnangu
  `strongly-corroborated-static-hypothesis`. Uus vektoriseos ei muuda
  seda sõltumatult kinnitatud SHARC+ opcode-tabeliks.
- **Dünaamika:** vajalikud on edukas vastav registreerimine, kehtiv
  valitud ülesande kaader ja PC-pinu, ABI modifikaatorid ning välise
  rikkumise ja sekkuva pesastatud katkestuse/erandi puudumine.
- **Min/Max:** terve `coreTask` kutseahela režiimiinvariant ja täpne
  režiim salvestamise hetkel ei ole suletud. `wholeInterruptReturnPathProven`,
  `runtimeModeAtStoreProven`, `fullRangeEncodingProven` ning
  `generatorWriteSupportAdded` jäävad **false**. Varasema MODE1 auditi
  `division` ja `modePreservedFromEntryToStore` jäävad **null**.

Wahi hiirega lohistatud Min 2.50 / Max 7.50 / Max 5.00 toorsõnad
**16375 / 49159 / 32784** jäävad samaks. Täpse klaviatuuriväärtuse
mudelit ei võrdsustata lohistamisega. Sendisammu kandidaadi varasem
**1000/1001** ulatus ja **6.47 blokeering** ei muutu.

## Korratav kontroll ja järgmine samm

[Audit](modifier-interrupt-audit.json) kontrollib tervikallikaid,
[11 räsiga seotud piirkonda](modifier-interrupt-checkpoints.json),
vektori/registreerija/dispatcher'i native-operande ning tingimuslikku
staatusmudelit. Natiivseid binaarfaile reposse ei lisatud.

```sh
python3 tools/fm3/test-modifier-interrupt.py
python3 tools/fm3/modifier_interrupt_audit.py \
  --firmware /path/to/fm3_dsp_rel_13p00.syx
```

**6/6 uut sihitud testi läbisid; auditi loomine ja eraldi taasesitus
läbisid.** Kontrollid hõlmavad aadressiruumi lõpu ületamist, ISA/VISA
baidijärjekorra segiajamist, F1 märgibiti viga, tabeli piire ning
katkestatud staatuspinu taastamist. Varasemaid seadmekatseid ega täielikku
CI-komplekti ei korratud.

Järgmine ökonoomne samm on siduda sõltumatu SHARC+ assembleri või
parandatud esmase kodeeringuallika abil kompaktsed tagastused ning
piiritleda veel avatud `coreTask` väljakutsete MODE1 mõju. Käivitusraja
SYSCTL aadressi täpne tootjadefinitsioon on eraldi väike tõendilünk.
Uus presetieksport ei vasta neile küsimustele; kasutajalt ei ole vaja
praegu ühtegi ploki- ega parameetrimuudatust.

Kasutati varasema REA/Ghidra töö tulemusi ja uut kohalikku staatilist
operandianalüüsi. Uut REA dekompileerimist **ei tehtud**; otse kutsutav
REA tööriist puudub selles sessioonis. Varasem edukas Maci REA/Ghidra
koondjooks säilib eraldi tõendina. Generaator ja avaldatud plugin ei muutu.

## Esmased allikad

- [SHARC+ Core Programming Reference, rev1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf), lk 4–73..75, 15–24 ja 30–11.
- [SC58x/2158x Hardware Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-hrm.pdf), tabel 53–21.
- [SC58x/2158x andmeleht, revC](https://www.analog.com/media/en/technical-documentation/data-sheets/ADSP-SC582_583_584_587_589_ADSP-21583_584_587.pdf), tabelid 4–6.
- [ADI: SHARC+ vaikimisi IVT ja selle ümberpaigutamine](https://ez.analog.com/dsp/sharc-processors/adsp-sc5xxadsp-215xx/a/documents/DO9759/where-is-the-default-ivt-of-sharc-core-located-can-it-be-changed).
