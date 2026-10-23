# Kompaktsed tagastused: juhendivastuolu ja sõltumatu ADI binaar, 22.10.2026

Järgnev etapp: [SECI vektor ja tingimuslik MODE1 taastamisrada](modifier-interrupt-result.md)
seob laaditava vektori dispatcher'i ja registreeritud ajastajaga. Allolev
kodeeringu ebakindlus säilib; aktiivse tööaja vektori invariant pole kinnitatud.

Alus: kohalik commit `8e433862ac095f2ad2b235768354fc8a06057f9d` ja
tööaruande versioon 22. **Tootmisplugin 0.3.13; uusi füüsilisi eksporte 0.**

## Tõendatud tulemused

1. **SHARC+ juhendi Type11c joonis on sisemiselt vastuoluline.**
   Rev1.5, joonis 15–6, lk 15–22 (PDF lk 377) näitab fikseeritud baasi
   `0xc080`. Sama juhendi Type2c ja short-compute määratlused (joonised
   14–5 ja 18–2, opcode-tabel lk 18–3) määravad selle piirkonna
   täisarvulisele liitmisele. Joonist kontrolliti ka visuaalselt;
   tegemist ei ole üksnes PDF-ist teksti eraldamise veaga.
2. **ADI enda SC589 binaari ja FM3 FW13 katkestuse taastamislõpp kattuvad
   86 baiti täpselt.** ADI näites algab lõik `0x1c0427`, FM3-s
   `0x1cbbe6`. Kattuvus sisaldab PCSTK, andmeregistrite ja pointer'ite
   taastamist, parcel'it `0x0bfe` ning mõlemat järgnevat käsku.
3. **Leiti varem otsitud lõpliku RTI kandidaadi asukoht `0x1cbc0c`.**
   Ümbritsev dispatcher algab `0x1cbb7f`, kasutab olemasolevast
   registreerimisuuringust tuttavat tabelikonstanti `0x2e4b28` ning
   valmistab PCSTK-s ette jätku `0x1cbbe6`. See on täpne staatiline
   seos; aktiivset katkestusvektorit ega kõiki tööaja tabelikirjeid
   pole veel selle dispatcher'iga lõpuni seotud.
4. **ADI teise SC589 binaari jagamisabi esimesed 80 baiti kattuvad
   FM3 jagamisabiga.** FM3 algus on `0x1cb13a`, ADI algus `0x1c01fc`.
   Funktsioonide lõpud erinevad. ADI variandis on MODE1 taastamine
   **48-bitise** Type11a tagastuse esimeses viitekäsus, mis annab
   taastamiskonventsioonile sõltumatu toe.

Need on uued staatilise analüüsi tulemused. Kasutati varasema REA/Ghidra
töö tausta ning kohalikku operandianalüüsi; uut REA dekompileerimist ei
tehtud. Praeguses sessioonis puudub otse kasutatav REA tööriist, kuid see
ei tühista varasema Maci REA/Ghidra koondjooksu õnnestumist.

## Miks juhendi joonist ei saa sõna-sõnalt rakendada

| Joonise järgi saadud parcel | Sama SHARC+ juhendi Type2c tähendus |
|---|---|
| `0xc080` | `R8 = R8 + R0` |
| `0xc0be` | `R11 = R11 + R14` |
| `0xc0fe` | `R15 = R15 + R14` |

FM3 dispatcher kasutab samas piirkonnas parcel'it `0xc0c8`
aadressil `0x1cbbc3`, mis Type2c järgi liidab R12-le R8. See sobib
vahetult ümbritseva callback'i aadressi arvutusega.

Vanem ADI SHARC-i juhend, rev2.4, Type11c lk 10–18, annab baasi
`0x0a80`. Selle väljade järgi on `0x0abe` RTS, `0x0afe` RTS(DB) ja
`0x0bfe` RTI(DB). **Parandus `0xc080 → 0x0a80` on tugevalt toetatud
ettepanek, mitte ADI kinnitatud erratum.** ADI enda ühilduvusmärkus
hoiatab, et SHARC-i ja SHARC+ assembly ühilduvus ei taga binaarset
ühilduvust. Seetõttu ei loeta vanemat juhendit ega sama juhendit
kasutavat SLEIGH dekoodrit kaheks sõltumatuks kinnituseks.

## Täpsed tagastus- ja viitekohad

Allolevad nimetused kasutavad selgelt märgistatud legacy-Type11c
tõlgendust. Kontrollitakse terviklikke kontekste ja käsupiire;
juhuslikku `fe0a` baidileidu käsu sees ei loeta tagastuseks.

| Binaar ja aadress | Parcel / tõlgendus | Järgnevad viitekäsud |
|---|---|---|
| FM3 `0x1cb17a` | `0x0afe`, RTS(DB) | `0x1cb17b`: MODE1=R1 koos ümardamisega; `0x1cb17e`: NOP |
| FM3 `0x8307bb`, `0x830c8c` | `0x0abe`, RTS | Viiteala puudub; need pole selle tõlgenduse järgi lõplik RTI. |
| FM3 `0x1cbbe0` | `0x0afe`, RTS(DB) | `0x1cbbe1`: callback'i argument R12-sse; `0x1cbbe3`: R8 nihe |
| FM3 `0x1cbc0c` | `0x0bfe`, RTI(DB) | `0x1cbc0d`: I7 taastamine; `0x1cbc0f`: I12 taastamine |
| ADI LED `0x1c03b9` | `0x0afe`, RTS(DB) | Kaks callback'i ettevalmistavat käsku. |
| ADI LED `0x1c05af` | `0x0abe`, RTS | Viiteala puudub. |
| ADI LED `0x1c044d` | `0x0bfe`, RTI(DB) | Sama I7/I12 taastamine kui FM3-s; kogu 86-baidine lõpp kattub. |

Viiteala tähendab **kahte käsku**, mitte kahte 16-bitist parcel'it.
FM3 jagamisabi esimene viitekäsk on 6 baiti ja teine 2 baiti.

ADI audiobinaari jagamisabi eristab vajalikku tõendustaset:

| Aadress | Kontrollitud operand või tegevus |
|---|---|
| `0x1c01fc`, `0x1c01ff` | MODE1 RND32 test ja ajutine kustutamine |
| `0x1c0233` | Kustutatud MODE1 salvestus R1-sse |
| `0x1c0236` | R8 saab R1 koos taastatud bitiga 16 |
| `0x1c0239` | 48-bitine RTS(DB), compute'iga; opcode `0x0a3e04081424` |
| `0x1c023c` | Esimeses viitekäsus MODE1=R8 |

See kinnitab ADI binaaris sama taastamisvõtet **erineva tagastuskodeeringu
korral**. Sellest ei järeldu üksinda, et FM3 kompaktse tagastuse
kodeering on lõplikult tõendatud.

## Auditi ulatus ja lahtised küsimused

Uus [audit](modifier-return-audit.json) kontrollib kahe sõltumatu ADI
LDR-faili tervikräsi, FM3 allikaid, kaheksat natiivset piirkonda,
kaheksat valitud tagastuskohta, kahe binaaripaari täielikku võrdluslõiku
ning dispatcher'i ja MODE1 konkreetseid operande.
[Manifest](modifier-return-checkpoints.json) sisaldab lähte-URL-e,
räsisid ja piirkondi. Natiivseid binaarfaile reposse ei lisata.

**Praegune hinnang: `strongly-corroborated-static-hypothesis`.**
Puudub sõltumatu SHARC+ assembleri väljastus, usaldusväärne parandatud
opcode-tabel või vaadeldud täitmistõend, mis seoks just kompaktsed
parcel'id nende tähendusega. ADI binaari konteksti uurimine on oluliselt
tugevam kui üksnes sama dekoodri korduv kasutamine, kuid ei ole
automaatselt sõltumatu ISA tõlgendaja.

Seetõttu jäävad varasema MODE1 auditi `division` ja
`modePreservedFromEntryToStore` **null**. Taastamisalgebra edukaid
tulemusi säilitatakse, ent native-return kinnitust true'ks ei tõsteta.
Samuti jäävad false:

- `divisionNativeReturnSemanticsProven`;
- `wholeInterruptReturnPathProven` ja `runtimeModeAtStoreProven`;
- `fullRangeEncodingProven` ja `generatorWriteSupportAdded`.

Wahi ajaloolised hiirega lohistatud Min 2.50 / Max 7.50 / Max 5.00
toorväärtused **16375 / 49159 / 32784** säilivad. Neid ei asendata
täpse kümnendsisendi kandidaadi väärtustega. Sisendi 6.47 blokeering ja
1000/1001 täpse sendisammu kandidaadi ulatus ei muutu.

## Järgmine samm

Kõige ökonoomsem jätk olemasoleva FW13 peal on siduda katkestusvektor
dispatcher'iga `0x1cbb7f`, seejärel selle callback'i tabeli kaudu varem
leitud `0x830778` / MODE1STK taastamisrajaga. Nüüd on lõpliku tagastuse
kandidaat ja selle kontekst teada. See väldib kogu firmware'i pimedat
skannimist. Eraldi täpne compact-opcode kinnitus jääb assembleri või
parandatud esmase kodeeringuallika ülesandeks.

Uus presetieksport ei vastaks nendele ISA ja katkestusraja küsimustele,
seega praegu seadmekatset ega käsitsi muudatusi ei küsita.

## Taasesitus

```sh
python3 tools/fm3/test-modifier-return.py
python3 tools/fm3/modifier_return_audit.py \
  --firmware /path/to/fm3_dsp_rel_13p00.syx \
  --adi-led /path/to/LED_SC589_EZKIT_Core1.ldr \
  --adi-audio /path/to/Audio_passthrough_I2S_Core1_SC589.ldr
```

Valitud piiride ja allikate muutmine nõuab uut läbivaatust; `--write`
ainult salvestab selle ülevaadatud auditi. Skript ei laadi võrguandmeid,
ei käivita firmware'i ega loo seadmesse imporditavaid faile.

**Kontroll: 6/6 uut testi läbisid**, sealhulgas vale prefix'i,
muudetud võrdlusbaidi, pooliku võrdluslõigu ja puuduliku viiteala
tagasilükkamine. Auditi loomine ning eraldi taasesitus läbisid.
Varasemaid seadmekatseid, kogu offline-testikomplekti ega CI-d ei korratud.

## Esmased allikad

- [SHARC+ Core Programming Reference, rev1.5](https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf).
- [SHARC Processor Programming Reference, rev2.4](https://www.analog.com/media/en/dsp-documentation/processor-manuals/adsp-2136x_2137x_214xx_pgr_rev2.4.pdf).
- [ADI SHARC/SHARC+ assembly ja binaarse ühilduvuse eristus](https://ez.analog.com/dsp/sharc-processors/adsp-sc5xxadsp-215xx/a/documents/c/adsp-sc58x-faq/DO9658/can-the-existing-sharc-assembly-codes-be-re-used-as-it-is-with-sharc-core).
- [ADI runtime-sharc-loader, commit bbb85bb59b203f4219a831814a721f7646f27498](https://github.com/analogdevicesinc/runtime-sharc-loader/tree/bbb85bb59b203f4219a831814a721f7646f27498).
  Kasutatud `SharcLoader/LED_SC589_EZKIT_Core1.ldr` ja
  `SharcLoader/Audio_passthrough_I2S_Core1_SC589.ldr`; tervikräsid manifestis.
