# FM3 parameetrite tõendite katvus

Automaatselt korratav audit avaldatud firmware 13 andmetest. Arvud näitavad allikate seoseid ja indekseeritud tõendeid; need ei ole FM3 kõigi võimaluste valmimisprotsent.

| Kontroll | Tulemus |
| --- | ---: |
| Kataloogi read / erinevad pere–PID paarid | 2021 / 1999 |
| Lisanimega read | 22 |
| Parameetrisõnastiku kirjed | 2892 |
| Kataloogi ja sõnastiku ühised paarid | 1668 |
| Ainult kataloogis / ainult sõnastikus | 331 / 1224 |
| GET/SYX-ga uuesti võrreldud mõõtmispunktid | 869 |
| Erinevad uuesti kontrollitud GET/SYX paarid | 354 |
| Vähemalt ühe sellise punktiga parameetrid | 72 |
| Eraldi arvestatud ekraaninäidud | 15 |
| Ekspordi abil kontrollitud punktid ilma GET-ita | 30 |
| Vähemalt ühe paaristatud või ekspordipunktiga parameetrid | 85 |
| Vahele jäetud või välistatud lähtekirjed | 36 |

Üks GET/SYX paar võib tõendada mitut punkti. Terve kanali mall ei tõenda kõigi nuppude skaalasid. Sõnastiku `measured` ja `taper-class-verified` on lähteallika väited; need ei suurenda automaatselt mõõdetud punktide arvu.

Tabelikirjutaja tugi on loetud töötavast mootorist: sobiv olek, kodeerimisliik ja parameetri asukoht tuntud alusfailis. See ei laiene suvalisele presetile. Composeri lisatavate plokkide tugi on eraldi `registry.json` failis; allolev null ei tähenda, et composer plokki ei toeta.

| Pere | Kataloogi PID-d | Sõnastiku PID-d | Paaristatud punktiga PID-d | Tabelikirjutaja vaikimisi / eraldi lubamisel |
| --- | ---: | ---: | ---: | ---: |
| Nimetu | 0 | 7 | 0 | 0 / 0 |
| CABINET | 105 | 106 | 0 | 34 / 27 |
| CHORUS | 29 | 32 | 0 | 28 / 3 |
| COMP | 37 | 37 | 0 | 33 / 0 |
| CONTROLLERS | 141 | 130 | 0 | 0 / 0 |
| CROSSOVER | 15 | 0 | 0 | 0 / 0 |
| DELAY | 88 | 89 | 0 | 80 / 3 |
| DISTORT | 143 | 144 | 1 | 131 / 1 |
| ENHANCER | 12 | 12 | 10 | 0 / 0 |
| FC | 28 | 0 | 0 | 0 / 0 |
| FDBKRET | 6 | 6 | 0 | 0 / 0 |
| FDBKSEND | 2 | 2 | 0 | 0 / 0 |
| FILTER | 37 | 37 | 5 | 0 / 0 |
| FLANGER | 33 | 33 | 0 | 30 / 2 |
| FORMANT | 12 | 12 | 0 | 0 / 0 |
| FUZZ | 43 | 44 | 5 | 40 / 4 |
| GATE | 19 | 19 | 0 | 0 / 0 |
| GEQ | 21 | 20 | 15 | 0 / 0 |
| GLOBAL | 173 | 1024 | 0 | 0 / 0 |
| INPUT | 10 | 10 | 0 | 0 / 0 |
| IRCAPTURE | 3 | 0 | 0 | 0 / 0 |
| IRPLAYER | 13 | 0 | 0 | 0 / 0 |
| LOOPER | 24 | 24 | 0 | 0 / 0 |
| MEGATAP | 35 | 35 | 0 | 0 / 0 |
| MIDIBLOCK | 13 | 257 | 0 | 0 / 0 |
| MIXER | 17 | 21 | 0 | 0 / 0 |
| MOD | 25 | 25 | 0 | 0 / 0 |
| MULTICOMP | 37 | 37 | 0 | 0 / 0 |
| MULTIPLEXER | 7 | 7 | 0 | 0 / 0 |
| MULTITAP | 121 | 121 | 0 | 0 / 0 |
| OUTPUT | 26 | 26 | 0 | 0 / 0 |
| PEQ | 33 | 33 | 31 | 0 / 0 |
| PHASER | 35 | 35 | 0 | 18 / 16 |
| PITCH | 114 | 114 | 0 | 44 / 60 |
| PLEX | 95 | 96 | 0 | 0 / 0 |
| PRESET | 51 | 0 | 0 | 0 / 0 |
| RESONATOR | 40 | 40 | 0 | 0 / 0 |
| REVERB | 71 | 71 | 0 | 62 / 8 |
| RINGMOD | 13 | 13 | 0 | 0 / 0 |
| ROTARY | 21 | 21 | 5 | 13 / 7 |
| RTA | 6 | 0 | 0 | 0 / 0 |
| SYNTH | 42 | 42 | 0 | 0 / 0 |
| TENTAP | 49 | 48 | 0 | 0 / 0 |
| TONEMATCH | 25 | 0 | 0 | 0 / 0 |
| TREMOLO | 22 | 22 | 0 | 12 / 8 |
| VOCODER | 67 | 0 | 0 | 0 / 0 |
| VOLUME | 15 | 15 | 0 | 0 / 0 |
| WAH | 25 | 25 | 0 | 18 / 7 |

## Järgmised tööd kasutaja ajakulu vähendamiseks

1. Valitud vanemad Amp/Drive/Delay/Reverb mõõtmised ja Rotary algseis on registris. Jätkata ülejäänud ajalooliste tagasieksportide ja Ampi arhiivi läbivaatust; mallis leiduvat väärtust ei loeta automaatselt mõõdetud nupuväärtuseks.
2. Lahendada kataloogi ja sõnastiku erinevused olemasoleva FM3 metaandmestiku ning pöördprojekteerimise tulemuste põhjal. Teise seadme ID-d ei asenda FM3 tõendit.
3. Koostada automaatne piirväärtuste, valikute ja kõrvalmuudatuste testimaatriks ning laiendada kontrollitud plokipaigutusi.
4. Alles allesjäänud ebaselguste jaoks koostada ühine mõõtepakett: üks laadimine, võimalikult vähe ekraanikontrolle ja eksport ainult seal, kus seda tõesti vaja on.
5. Järgmine väljalase seotakse täpse commit’iga; pakett, käivitajajuhend ja värske vestluse laadimiskontroll peavad ühtima.

Masinloetavad ülesanded ja mõjutatud parameetri-ID-d: [work-queue.json](work-queue.json). Täielik register: [registry.json](registry.json). Koondarvud: [coverage.json](coverage.json).

See audit ei muuda pluginat ega saada seadmesse käske. Seadmeimport, heli, CPU, suvaline routing, modifier’id ja kõik võimalikud mudeli/kanali kombinatsioonid ei ole selle tabeliga tõendatud.
