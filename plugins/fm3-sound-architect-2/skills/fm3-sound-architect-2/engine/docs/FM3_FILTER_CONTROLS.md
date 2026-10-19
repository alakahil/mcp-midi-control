# Filteri juhtide sihitud kogumine — 0.55.0

**Kogumine lõpetatud.** 17 GET/SYX-paari läbisid (2516/2516 sõna);
Q=0.707 jäeti põhjusega vahele. Koostajas on mõõdetud punktide tugi.
[Mõõdetud juhtide kasutamine](FM3_FILTER_MEASURED_CONTROLS.md).
Allpool on tehtud kogumise metoodika; samme ei korrata automaatselt.

18 tüübi kogumine ning nelja kanali koostaja import/tagasieksport on lõpetatud.
Uus koguja mõõdab üksikjuhte; see ei korda algkontrolli ega tüübi kogumist.
Koguja kaust: `skills/instructions/scripts/filter-control-collector/`.
Käivitaja `FM3_FILTER_CONTROLS.py`, tööjuhend `LOE_MIND.txt`.

Alus on kasutaja kinnitatud `FM3_NEWLOOK_FILTER_TEST_export.syx`, kaasas nimega
`baseline.syx`, SHA-256:
`b3d406ce0bf847dadd20ba4b36553e8a54cc4939fe4808ee7e389e40d63ae2a3`.
Filter A High-Pass (3), B Low-Pass (1), C Peaking (6), D Tilt EQ (8).
Valitud Scene2, Filter bypass kõigis stseenides; muud plokid ja stseenid jäävad.

## Piiratud plaan

| Kanal ja tüüp | Juht | Kogutavad punktid |
|---|---|---|
| C Peaking | Frequency | 500, 1000, 2000 Hz |
| C Peaking | Q | 0.707, 1.4, 2.0 |
| C Peaking | Gain | -3, +3, 0 dB |
| C Peaking | Level | -6, 0, +3 dB |
| A High-Pass | Frequency | 80, 120, 250 Hz |
| B Low-Pass | Frequency | 4000, 6000, 8000 Hz |

See on 18 järjestikust ühe juhi muudatust; väärtusi sammude vahel ei nullita.
Peaking katab neli soovitud põhijuhti. High-/Low-Passi kolm sageduspunkti on
vajalikud nende tüüpide praktilise lõikesageduse kirjutuse ettevalmistuseks;
Peakingu tulemust ei laiendata automaatselt neile. Order jääb muutmata.

Tootja [Blocks Guide](https://www.fractalaudio.com/downloads/manuals/fas-guides/Fractal-Audio-Blocks-Guide.pdf),
Filteri peatükk (juuni 2023, trükitud lk 42), kirjeldab neid juhte ning Gain'i
kasutust Peakingu ja shelving-tüüpidega. See on katse valiku alus, mitte
firmware 13 binaar-ID-de, skaalade ega vahemike tõend. Tegelikku ekraaniväärtust
kinnitab kasutaja; ümarduse korral saab sisestada nähtava arvu samas ühikus.

## Koguja käitumine

- Kasutaja muudab FM3-Editis üht juhti, ekspordib terve SYX-i ja annab faili.
- Enne seadme avamist kontrollitakse kogu keha ning päiseid. Lubatud on ainult
  nimetatud kanali parameetrisõnad ja Scene2 Filteri kanalivalik.
- Kõik neli Type-väärtust, kõik bypass-olekud, muud stseenid/plokid, routing,
  Send/Return, modifierid ja süsteemisaba on lukustatud. Alates 0.1.1 võib
  preseti nimi muutuda: ainult päise baidid 8..39; nimed ja toorväljad
  salvestatakse `presetNameChange` alla ning näidatakse enne GET-i.
- Kasutaja kinnitab ekraaniväärtuse ja sulgeb FM3-Editi/Fractal-Boti. Alles
  selgesõnaline `jah` saadab ühe GET-i `f0000174111f720079f7`.
- `filter_transport.py` on eelmise tegeliku Filteri kogumisega baitidentne.
  Pole SET/SAVE/Store, kanali-/presetivaliku käske ega automaatset korduspäringut.
- GET/SYX peab kattuma 148/148 sõna. Iga muutunud sõna PID ja toorväärtused
  salvestatakse. Ühtegi PID-d ega teisendusvalemit ei eeldata.
- Mitme seotud sõna muutus salvestatakse eraldi analüüsi vajavana. Sama juhi
  korduskatse üksiku PID vahetumine või eri juhtide üksiku PID kattumine
  peatab töö; see ei tõesta veel parameetri tähendust või skaalat.
- `q` väljastab ZIP-i. Sama käsk jätkab, kontrollides uuesti kõiki vastu võetud
  paare ja sammude ahelat. Viimane edukas fail on jätkamise lähteolek.
- `s` salvestab põhjuse ja jätab punkti mõõtmata; see ei muutu valideeritud
  väärtuseks. Ebaõnnestunud/kinnitamata katsed säilitatakse, neid ei loeta tehtuks.

Sessioon asub vaikimisi koguja kaustas `FM3_FILTER_CONTROLS_SESSION`.
Tulemuste ZIP tekib koguja kausta. Säilitada koguja, sessioon ja viimane ZIP.

## Kontrollid ja järgmine samm

`test_controls.py` läbib kõik 18 sammu sünteetiliste väärtuste/GET-vastustega,
kontrollib jätkamist, q/s/tühistamist, ekspordi vigade peatamist enne GET-i,
vastuste kaadreid/checksum'e, valede paaride tõrjumist ning tõendite terviklust.
Raport: `FM3_FILTER_CONTROL_COLLECTOR_TESTS.json`. Testides kasutatud PID-d ja
arvud on suvalised testandmed, mitte firmware mõõtmised. Päris kogumine on läbitud; tõend `FM3_FILTER_CONTROL_VALIDATION.json`.

Tehtud kogumise käivitus: ZIP lahti Downloads-kausta, kinnitatud lähteolek FM3-s,
siis `python3 ~/Downloads/FM3_FILTER_CONTROLS/FM3_FILTER_CONTROLS.py --port /dev/cu.usbmodem211104`.
Esimene muudatus: Scene2, Filter C Peaking, ainult Frequency 500 Hz, Filter bypass.
Järgida terminali; lõpuks saata üks tulemuste ZIP.

Pärast päris tulemusi kinnita GET/SYX, juhinimed, PID-d ja mõõdetud punktid.
Lisa koostajasse ainult tõendatud tüüp/kanal/parameeter/väärtus või piisavalt
kontrollitud skaala. Kolm punkti ei tõenda automaatselt kogu vahemikku.
Praegu on loetletud mõõdetud punktid toetatud; Order ja muud väärtused lükatakse tagasi.

## Nimevälja parandus — koguja 0.1.1

Kasutaja tõrge `Preset header/name changed at 11` tuli liiga rangest
nimekontrollist enne GET-i. Nüüd lubatakse ainult 32-baidist nimevälja;
kõik teised mitte-CRC päiseväljad jäävad kontrolli alla. Nimevahetus üksi
pole mõõtmine. Muutmata nime puhul võrdlusraporti kuju ei muutu:
varasemad edukad sessioonikirjed kehtivad ning neid ei korrata.

Paranduspakist kopeeritakse ainult `control-check.mjs` ja
`FM3_FILTER_CONTROLS.py` olemasolevasse koguja kausta. Sessioon, plaan,
alus ja kogutud failid säilitatakse. Sama SYX-i võib uuesti anda, kui
seadme hetkeseis vastab sellele; korduseksporti ainult nime tõttu ei nõuta.
Sünteetiline regressioon katab nimevälja raporteerimise, nimemuutusega
jätkamise, nimevälja kõrval olevate päisebaitide tõrjumise ja selle,
et ka nimemuudatusega failis kõrvalise Amp-muutuse kontroll jääb jõusse.
Tegelik 0.1.0 ja 0.1.1 võrdlusväljund muutmata nime puhul kattus täpselt.
