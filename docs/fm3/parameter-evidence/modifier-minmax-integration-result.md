# Täpse Min/Max-sisendi ühendamine generaatoriga — 22.10.2026

**Ühendus on arenduskoodis valmis ja kogu 49/49 offline-kontrollskripti komplekt läbis.**
Avaldatud tootmisplugin jääb 0.3.13. GitHubi main kontrolliti selles sammus:
`5238ebc5c4cd19c0ea412cd964e5e770c09930e7` (PR #13). Push'i, PR-i ühendamist
ega pluginaväljalaset ei tehtud. Arenduse alus on kohalik commit
`de7e573d2e49e04a2f7eba3f7eebd5ef8fbf08c5`.

## Tegelik päringuliides

`fm3-preset.mjs` toetab nüüd koostaja `modifiers` sees:

```json
{
  "wahMinMaxExact": {
    "policy": "exact-wah-cent-fw13-hw1",
    "min": "2.50",
    "max": "6.47"
  }
}
```

Soundi ümbrises on asukoht `composer.modifiers.wahMinMaxExact`.
Min ja Max on eraldi valikulised; vähemalt üks tuleb esitada.
Sisend on kahe kümnendkohaga string `0.00`…`10.00`. Näide kirjutab Min=16384
ja Max=42401. Määramata väli säilib. Sama välja vana ja uue lepingu kaudu
korraga määramine tõrjutakse; eri välju võib teadlikult eri lepingutega muuta.
Min > Max ei ole keelatud: vastassuunaline vahemik on eraldi teadlik päring.

Vana `wahMin:2.5` kirjutab jätkuvalt 16375, vana `wahControls.max:5` 32784.
Hiirega saadud ajaloolisi mõõtesõnu ega tõendeid ei tõlgendata ümber.
Mõlemad teed nõuavad lõplikku External 1 → Wah1 Control ALL seost, toetatud
alusfaili ja säilitatud konfiguratsiooni. Puuduv või vale siht, konkureeriv
seos, tundmatu väli, väär firmware ja vigane väärtus lükatakse tagasi.
NewLook vajab Wah-malli ning `external1Wah:true`. Bypass ja stseenid ei muutu
vaikimisi; aktiivse modifikaatori Control-käsikirjutuse lukk säilib A–D-s.

## Tõenditase ja paketi sõltumatus

Node-only tabel `wah-minmax-exact.json` on räsiga kinnitatud ja selle
1001 väärtust välja kohta taastatakse Python-kandidaadist. Tabeli koostamine
käivitab originaalse riistvarakatse sõltumatu TX/RX ning SYX kontrolli.
Kuus väärtust välja kohta on füüsiliselt mõõdetud; 995 toetuvad nelja
arvutusmudeli kokkulangevusele. Tabel ei lisa üldist suvalise float32-sisendi
ega teiste sihtparameetrite kirjutajat.

Generaatori käivitamine vajab selle funktsiooni jaoks ainult Node.js-i;
repo uurimiskoodi, originaalset püsivara ega Pythonit ei laadita runtime'is.
Tabeli taasesitus on lisatud repo püsivasse `tools/fm3/test-offline.py`
kontrolli. Käsk `python3 tools/fm3/build-wah-exact-table.py` võrdles tabeli
kõiki kirjeid uuesti edukalt. Tabeli räsi:
`468ab4c092ccf5fae9b4dda38cacb5d3a64f35fc78b850218e70588ff0a8c54b`.

Capabilities, JSON-skeem, TXT ja validation.json kirjeldavad uut lepingut.
Iga kirjutatud välja aruanne sisaldab täpset kümnendstringi, float32-bitte,
raw-sõna ja tõenditaset. Täpse sisendi `display:null` väldib arvutatud sihi
esitamist uue ekraanivaatlusena. `fullRangeEncodingProven=false`,
`runtimeModeAtStoreProven=false` ning `deviceImportTested=false` säilivad.

## Sisulised kontrollid

- **49/49 offline-kontrollskripti** läbis ajutises paketikoopias, sealhulgas
  kõik 48 varasemat kontrolli. Algne plugina lähtepuu testidega ei muutunud.
- Uus integratsioonitest võrdles kuue riistvaraväärtuse tegeliku koostaja
  väljundi kogu keha oodatud baitidega, mitte ainult kuvanäiduga.
- Kaheksa säilitamiskatset kontrollisid, et ühe välja muutmine jätab teise
  ajaloolise raw-sõna puutumata. Vana API ja segatud, eri välju puudutav päring
  säilitasid oma tähenduse.
- Kõigi 2002 välja/sisendi päringu tõendijaotus on 12 mõõdetud ja 1990
  mudelite kokkulangevusega. See on tarkvaraline läbivaatus, mitte 2002
  riistvaramõõtmist.
- 36 vigast sisendi- või kontekstijuhtu tõrjuti enne keha muutmist ja enne
  lubatud piirkondade callback'i. Sound/NewLook ning A–D käsikirjutuslukud läbisid.
- Tegelik CLI genereeris neli faili ja eraldi `--verify` läbis. Kontroll
  tõrjus võltsitud tõenditaseme, puuduva tõendiaruande, muudetud TXT-i ja
  **6.47 vale raw 42400 ka kehtivate CRC/SYX-kontrollsummadega**.
- Python 3.9 süntaks ja `git diff --check` läbisid. Eraldi täielikku
  JSON Schema validaatorit polnud keskkonnas; skeemi struktuuri/mustrit
  kontrollib paketitest ning sisendi ja konfliktide kontrolle teeb runtime.
  Nelja GitHub Actions töövoogu selles kohalikus sammus ei käivitatud.

Masinloetav tulemus on `modifier-minmax-integration-audit.json`, sealhulgas
kõigi kontrollskriptide tulemused ja logiräsid. Selle offlineSuite lähtecommit
on muudatuste-eelne commit ja `sourceDirty:true`, sest testiti ühendamise
tööpuud enne uut commit'i. Kontrollitud plugina puu räsi seob tulemuse
konkreetsete testitud failidega.

## Lahtine ja järgmine samm

Uut füüsilist eksporti ega REA/Ghidra analüüsi selleks ühendamiseks ei tehtud.
Teiste sihttüüpide, kogu op9 arvutustee, editori sisendparseri, STORE/reload'i,
pedaali, heli ja CPU piirangud säilivad. Uut faili pole seadmesse imporditud.

Järgmine etapp on selle konkreetse muudatuse väljalaskeülevaatus ning soovi
korral avaldamine olemasoleva commit-põhise protsessi kaudu. Praeguse etapi
lõpetamiseks ei ole vaja kasutajalt uut eksporti ega käsitsi korduskatset.
