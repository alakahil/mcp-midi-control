# Enhanceri täiskogumise katvus ja Classicu lisakogumine

Plugin 0.70.2, 2026-10-12.

Allikas `FM3_ENHANCER_FULL_V2_20261012T122507_d6a6235f.zip`,
Library ID `libfile_f40d76c070008191922ec5e212052db7`, SHA-256
`98c35922cf15ced5b2c843aabc7534b9860f084cdc0528a3ecc4966e5d7c780b`.
Muutmata ZIP on `skills/instructions/scripts/enhancer-gap-collector/source-session.zip`.

## Kontrollitud tulemus

V2 muutmata faili- ja GET-paarikontrolliga auditeeriti kogu 86-sammuline
sessioon uuesti: **74 edukat paari, 12 mõõtmata sammu**, lisaks kaks varasemat
ebaõnnestunud Bypass-katset. Kõigi edukate paaride 48 sõna kattuvad toore
GET-vastusega. Ka kõik stseenide, teiste plokkide ja routing'u kontrollid läbisid.
Kogumiskava lõppu jõudmine ei tähenda, et vahele jäetud mõõtmised oleks tehtud.

| Osa | Olemas | Puudu |
| --- | --- | --- |
| Modern | Algpaar; Width, Depth, Low Cut, High Cut, Level viis punkti; Scene Ignore ON/OFF | — |
| Classic | Type; Width, Pan Right, Balance viis punkti; Invert kõik neli valikut | Pan Left viis punkti; Level viis punkti; Scene Ignore ON/OFF |
| Stereoizer | Type; Width, Depth, Level viis punkti; Scene Ignore ON/OFF | — |
| A–D | Täielikud 12-sõnalised A→B/C/D koopiad, Width25/75/35 eraldi, tagasi A | — |

Pan Lefti miinimum jäeti käsitsi vahele põhjusega „oli juba miinimumis -100”.
Seejärel jättis koguja neli järgmist Pan Lefti punkti automaatselt vahele, sest
miinimumi mõõtmise tõend puudus. Pan Righti samad nähtavad piirid ei tõenda
eraldi Pan Lefti parameetri aadressi ja kodeeringut. Classicu Level ja Scene
Ignore jäeti vahele põhjusega „juba mõõdetud”; olemasolevad mõõtmised kuuluvad
Modernile ja Stereoizerile. Neid ei märgita Classicu mõõtmisteks ümber.

**Kui näit on juba sihtväärtusel, eksportida ikkagi terve preset ja teha GET.**
`allowUnchanged=true` lubab seda juba olemasolevas V2 kogujas. `s` tähistab
puuduvat mõõtmist. Algne juhis ei selgitanud seda piisavalt; nii vana V2 kui
uue lisakoguja juhistes on see nüüd selgesõnaliselt kirjas. Plaani ega seniseid
74 tulemust ümber ei kirjutata.

Täheldatud Type-koodid: Modern0, Classic1, Stereoizer2; Invert None0,
Right1, Left2, Both3. Tagasivahetus Stereoizer→Modern muutis lisaks Type'ile
Balance-sõna58981→32767; säilita see Type'iga seotud muutuse tõendina.
Mõõdetud väärtused on eraldi JSON-raportis; need ei lülita kirjutustuge sisse.

## Puuduvate mõõtmiste lisakoguja

Kood `scripts/enhancer-gap-collector/`, kasutajapakett `FM3_ENHANCER_LISA.zip`.
13 sammu: Type Classic, Pan Left5, Level5, Scene Ignore2. Kõik muud juba
kogutud juhid ja kanalikatsed jäetakse sellest plaanist välja.

`ALUSTA_SIIT.syx` on senine viimane edukas `step-085-4ce1514d33/donor.syx`,
täpselt muutmata, SHA-256
`355898b615b52f9bff56f39c4b24ac8bbe9f081e94188ee7764f157c0e158d96`.
Algseis Modern, Enhancer A, Scene2 bypass. Uus Type-kinnitus on esimene GET;
uut eraldi Modern-algGET-i ei nõuta, sest lähteoleku paar on juba olemas.

Lisakogujal on oma `FM3_ENHANCER_LISA_SESSION`, kind FM3_ENHANCER_GAPS,
sourceZipSha256 ja startSha256. Tulemuste ZIP kaasab muutmata originaalsessiooni,
aluse ja lisamõõtmised. Täiskogumise raportid ja vahelejätmised jäävad alles.
GET-transport ja kõik binaarsed lubatud baidivahemikud on V2-ga identsed.

Kontroll: 13 sünteetilist järjestikust GET/SYX paari, q ja jätkamine pärast
kuut sammu, muutumatu Pan Left−100 korrektne vastuvõtt, allika räsikaitse ja
eksport ilma GET-ita. Need testid ei asenda kasutaja 12 lisamõõtmist.

Käsk: `python3 ~/Downloads/FM3_ENHANCER_LISA/FM3_ENHANCER_LISA.py --port /dev/cu.usbmodem211104`.
Taastada ALUSTA_SIIT.syx, Scene2 Modern A/bypass; siis järgida Classicu valiku
ja ülejäänud sammude juhiseid. Paluda järgmine FM3_ENHANCER_LISA_…zip.
Pärast lisa-ZIP-i kontrolli jätkata kodeeringute auditi ja kirjutustoega;
ühine import/tagasieksport/heli/CPU kontroll on veel tegemata.
