# FM3 SYX: eesmärgid ja lühem valideerimistee

Otsus 2026-10-01: presetite loomine on põhieesmärk. Kõigi FM3 parameetrite read-only audit ei ole esimese töötava SYX-generaatori eeltingimus. CABINET_LENGTH4 audit jääb säilitatud kõrvalharuks, mitte automaatseks järgmiseks tegevuseks.

## Uus seis 0.23.0

Esimene offline prototüüp on teostatud ning näidisfailidega kontrollitud. Käivitamine, toetatud ulatus ja järgmine riistvaratest: `FM3_SYX_PROTOTYPE.md`. Alljärgnevad 0.21.6/0.22.0 märkmed kirjeldavad eelmist etappi; esimese faili import ja tagasieksport on versioonis 0.23.1 kinnitatud firmware 13-ga. Täpne ulatus on prototüübi dokumendis.

## Varasema ülevaatuse seis

Plugin 0.21.6 oli juhiste/näidisfailide pakett, ilma käivitatava generaatori või MCP-ühenduseta. 0.22.0 täpsustab eesmärke ja tööjärjekorda; see ei teosta veel üldotstarbelist SYX genereerimist. Kasutaja kohalikku repot või FM3 seadet siin ei avatud ega muudetud.

Paketi 17 SYX-faili tegelik kontroll 2026-10-01:
- Kõik on 24 680 baiti, mudelibait 0x11, kümme SysEx-kaadrit: 0x77, kaheksa 0x78, 0x79.
- Kõigi 170 kaadri 7-bit andmebaidid ja XOR & 0x7F kaadrikontrollsummad läbisid kontrolli.
- `Baaspreset.syx` ja `Baaspreset_InenticalExport.syx`: 0 erinevat baiti.
- `Test_3_AmpGain5_1.syx` ja `Test_3_AmpGain5_2_IdenticalTo1.syx`: 0 erinevat baiti.
- Gain 4→5: 4165 erinevat baiti; Gain 5→6: 4517; Bass 4→5: 4186; Delay Bypass→Engaged: 2403.
- Baaspreseti kaadritest kokku pandud raw_patch on 16 384 baiti, vormingusõna 0x0146, magic 0xAA55, nimi `USA Mk IV`, päises body suurused 14 222 / 4929 baiti. Need on selle näidise vaatlused, mitte kogu FM3 universaalsed konstandid. Vormingusõna ei ole seadme firmware versioon.

See kontroll ei dekodeerinud plokkide semantikat, ei kontrollinud sisemist preset CRC-d/footer'i ega teinud importi/kuulamist. Failinimed ei tõesta, millist kanalit või stseeni tegelikult muudeti. Kokkusurutud andmete otsevõrdlus ei anna parameetri asukohta; võrrelda tuleb dekodeeritud sisu.

## Olemasolevad võimalused

1. **Eelistatud tehniline kandidaat: `forgefx-midi` offline authoring.** Kontrollitud avalik lähtepuu `sKuhLight/forgefx-midi`, commit `553d24b7409302908d5c7e46a71b45e07dffdc05`, sisaldab `src/devices/gen3/presetAuthor.ts`, `presetAuthorIr.ts`, `presetSynth.ts`, `presetValidate.ts` ning FM3 näidiseid/teste. Teostus pakub olemasoleva faili muutmist ja uuesti kodeerimist ning eraldi mallipõhist sünteesi. Kirjutusraportis võivad olla vahele jäetud väljad; meie adapter peab nõutud välja vahelejätmisel keelduma valmis preseti väljastamisest. Sünteesi kommentaarides on Cab IR valiku ja Amp B/C/D kanalite kohta piiranguid ning vananenud ulatuskirjeldusi: kontrolli tegelikku koodi ja teste, ära eelda täielikku tuge. Üldine round-trip ei asenda riistvaratesti. LICENSE fail algab Apache 2.0 tekstiga; integreerimisel kontrolli kogu litsents/NOTICE ja kaasatud mallide päritolu.
2. **Axis/ForgeFX kui kontrolli- ja teostuskandidaat.** Axis 0.9.22-beta väljalaskemärkmed kirjeldavad FM3 eksporti ja arendaja tehtud plokkide/ühenduste riistvaratesti. See on väline tõend, mitte meie seadmel tehtud kontroll. ForgeFX-i kontrollitud puu `c22862a5b2f2078f3cb92a2735e51f94c39a0062` kasutab eraldi `forgefx-midi` sõltuvust; serveri pelgast kloonimisest ei piisa (`file:../../forgefx-midi`). Eelista failimootori eraldamist; täit serverit või riistvarakirjutusi pole offline genereerimiseks vaja.
3. **FM3-Editi mallid ja Block Library.** Tootja ametlikult toetatud viis seadistamise kiirendamiseks. Sobib kontrollpreseti loomiseks ja tulemuse importimiseks/eksportimiseks. Kasutaja käsitsi seadistamine + eksport on ajutine abitee, mitte plugina automaatse SYX-väljundi eesmärgi täitmine.
4. **Senine `mcp-midi-control`.** Avalik projekt kirjeldab gen-3 dekodeerimist ja seadme presetieksporti. Seadmest dump'i eksportimine ei võrdu soovikirjeldusest uue faili sünteesimisega. Kohaliku haru võimekust tuleb eraldi lugeda; ära asenda kasutaja muudatusi avaliku haruga. FracTooli puhul ei kinnitatud selle ülevaatusega meie jaoks sobivat automaatset FM3 kirjutusliidest.

Allikad (loetud 2026-10-01):
- https://www.fractalaudio.com/fm3-edit/
- https://github.com/sKuhLight/Axis/blob/main/CHANGELOG.md
- https://github.com/sKuhLight/ForgeFX/blob/main/docs/preset-grid-codec.md
- https://github.com/sKuhLight/ForgeFX/blob/c22862a5b2f2078f3cb92a2735e51f94c39a0062/docs/PRESET-CONVERT-ENDPOINT.md
- https://github.com/sKuhLight/forgefx-midi/tree/553d24b7409302908d5c7e46a71b45e07dffdc05
- https://github.com/TheAndrewStaker/mcp-midi-control

## Tööjärjekord ja vastuvõtukriteeriumid

1. Võta eraldatud töökeskkonnas fikseeritud versiooniga offline kodeerija/dekodeerija; kontrolli sõltuvusi, litsentsi ja eksportide tegelikku API-t. Ära ühenda MIDI/serial-porti. Järgmine arendussamm on selle mootori katse 17 olemasoleva SYX-iga, mitte uus CABINET_LENGTH4 päring. Kasutajalt pole nende failide uuesti eksportimist vaja küsida.
2. Kontrolli muutmata faili decode→encode→decode: presetinimi, plokid, routing, kõik kanalid/stseenid ja tundmatud andmeväljad peavad säilima. Huffman-pakkimise erinev baitkuju ei pruugi olla viga; nõua dekodeeritud sisu võrdsust ja eraldi korrektseid kontrollsummasid. Identne läbiv kodeerimine ilma muutusteta ei tõesta parameetrikirjutust.
3. Võrdle Gain/Bass 4–7 näidiseid pärast lahtipakkimist. Kontrolli ühikute teisendust, aktiivset ja sihtkanalit, firmware sobivust ning kõrvalmuutusi. Kasuta üht näidist sõltumatu oodatud tulemusena. Tee esimene genereeritud muudatus olemasolevale struktuurile; säilita Amp mudel ja Cab. Ära üldista ühe kontrollitud parameetri põhjal kogu kataloogile.
4. Väike esmane toetatud funktsioonide kogum: üks teadaolev Amp/Cab ahel, Gain/EQ/Level, Delay/Reverb põhinäitajad ning vajalikud stseenide kanalid/bypass. Lisa iga funktsioon ainult tõendatud kirjutus-/lugemistestiga. Toetamata väärtus või vahele jäetud nõutud väli tähendab selget keeldumist või kasutajaga kokkulepitud kitsamat presetit, mitte vaikset asendust.
5. Minimaalne riistvaratest kasutaja FM3-Editis: impordi esimene kandidaat säilitades varasema töö, kontrolli soovitud väärtusi, kanaleid/stseene ja helisignaali; ekspordi tulemus tagasi ning võrdle semantiliselt. Kasutaja otsustab eraldi, kas ja kuhu ta selle püsivalt salvestab. See import on teadlik kirjutav kasutajatoiming, mitte GET-audit. Kogu kataloogi pole vaja testida; testi kasutatavaid funktsioone ja nende olulisi kombinatsioone.
6. Ühenda kontrollitud mootor pluginaga käivitatava failitööriista või sobiva teenuse kaudu. Sama presetikirjeldus peab juhtima SYX-i, TXT-d ja järelkontrolli. Vestlus peab saama päris failibaidid ja toimivad allalaadimislingid. Salvestamisvõimalus ja kasutatav tööriist ei teki pelgalt juhiste muutmisega.
7. Laienda malle muusikalise vajaduse järgi (clean, crunch, high-gain, lead jne). Tee kontrollitud parameetrite testid automaatseks; riistvaral korda kontrolli uue vormingu, firmware, plokiperekonna või olulise kombinatsiooni korral. Artistisoundi lähedust hinda eraldi kuulamisega: õige failistruktuur ei mõõda helilist sarnasust.

## Valmisoleku mõõt

Edu: soov → täpsustatud sound ja masinloetav kirjeldus → tegelik SYX + TXT → soovidega kattuv tagasidekodeerimine → FM3 import ja väärtuste kinnitus → kuulamishinnang. Pelgalt juhiste uuendamine, GET-audit või korrektne kaadrikontrollsumma ei täida viimaseid etappe.

