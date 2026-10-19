# Tüübist sõltuvad tabelijuhid — 0.3.3 kandidaat

Choruse ja Drive’i selgesõnalised tabelikirjutused kontrollitakse nüüd kanali
**lõpliku** tüübi järgi. Käsitöö ja uue ekspordi asemel kasutab kontroll olemasolevat
FM3-Edit 1.07.17 kirjeldust, FW13 vahemälu ning kogutud täiskanalimalle.
See on offline-kirjutusreegel, mitte uus seadme- või helikatse.

| Pere | Tüübid | Parameetrikirjed | Tüübiga piiratud kirjed |
|---|---:|---:|---:|
| Chorus | 27 | 32 | 16 |
| Drive | 87 | 44 | 16 |

Viimane veerg sisaldab ka aktiivse juhita kirjeid. Skalaari kodeerimisoskus,
kirjutusstaatus ja tüübisobivus on eraldi tingimused: ühe läbimine ei anna luba
teistest mööduda. 688 skalaari olemasolev maatriks ei tähenda 688 universaalset
juhikut kõigil tüüpidel. Drive Oversampling jääb blokeerituks.

## Käitumine

- `writeTableControls` ja soundi `applyTableControls` koostavad esmalt täieliku
  kirjutusplaani. Kontroll ebaõnnestub enne body muutmist või muutuslubade callback'i.
- Tüübisõna leitakse samast A–D kanalist pärast kõiki planeeritud kirjutusi.
  TYPE võib päringus olla enne või pärast sõltuvat parameetrit. Soundi puhul on
  eelnevalt rakendatud ka koostaja täiskanalimallid.
- Nimi, PID ja experimental/raw läbivad sama tüübisobivuse kontrolli.
  Tundmatut toortüüpi ei lubata. Raw ei tühista peidetud juhiku keeldu.
- Tüübiga sobimatu selgesõnaline väärtus tekitab vea; seda ei jäeta vaikselt välja.
  Muutmata, peidetud sõnad säilivad mallis ning `channels[].words` toorloendis.
- Lõplik TXT/`parameters` näitab nende kahe pere puhul ainult poliitikaga sobivaid
  juhte. Näiteks CHORUS_TREBLE kuvanimi on tüübil 20 **EQ**; BB Pre puhul ei kuvata
  ega kirjutata üldist FUZZ_TONE juhikut.

Chorus Low on tüüpidel 2, 3, 5, 6, 7, 8, 13, 14, 21; High lisaks nendele EQ-na
tüübil 20. Delay Range puudub tüüpidel 15, 16, 17, mille Expert-leht asendab
vaikelehe. Seega ei tähenda selle parameetri olemasolu FW13 tabelis universaalset luba.

## Allikas ja valikureegel

`references/fm3-type-applicability.json` säilitab kontrollsummad, FM3 enda PE64
deskriptoritabelite asukohad ja kõik 76 nime/PID sidumist, väikesed aktiivsete
lehtede metaandmed ning neist arvutatud tüübiloendid. Tüübinimed võrreldakse
FW13 cache'iga. ID-sid ei võeta teise seadme tabelist ega XML-i järjekorrast.

Kompileerija rakendab `version_lt` / `version_gtet` tingimusi esivanematele ja
juhikutele ning jätab XML-kommentaarid välja. Sama `pageNum` selgesõnalised
tüübiloendid piiravad selle lehe tühja `value` varuvarianti. Tingimuseta leht kehtib
kõigile tüüpidele. Kattuvate lehtede parameetriloendid peavad ühtima. Tundmatu
tingimus, dünaamiline juhipredikaat või segane variant katkestab kompileerimise.

Varulehe käsitlus on XML-i alternatiividest tuletatud konservatiivne
autoripoliitika. Redaktori natiivset lehevaliku koodi ei käivitatud ega kinnitata
selle raportiga. Seda eristust ei tohi esitada uue riistvaratõendina.

Repo juurest:

```bash
python3 tools/fm3/type_applicability.py --editor /path/to/FM3-Edit.exe
python3 tools/fm3/test-type-applicability.py
```

`--write` koos kinnitatud binaariga taastab registri. Ilma `--editor` argumendita
kontrollib CI kaasatud metaandmete, kompileeritud reeglite, sõnastiku ja FW13
cache'i kooskõla; binaari väljavõtet siis ei korrata. Käitusmoodul kontrollib
registri SHA-256 räsi enne kasutamist. Vendor-binaari ega tervet XML-i ei lisata.

## Kontrollid ja allesjäänud töö

Uus regressioon kasutab kõiki 114 olemasolevat tüübimalli kanalitel A–D:
15 428 lubatud kirjutust ning 2 884 tagasi lükatud kirjutust. Kontrollitakse ka
kanalite eraldatust, käskude järjekorda, toorsõnaga möödumise keeldu, veaga
päringu atomaarset tõrjumist, koostaja lõplikku tüüpi ja juhendi filtreerimist.
Tüübietapi tabelimaatriksis oli 43 556 lubatud kirjutust ning 856 tüübi tõttu
välistatud kandidaati. Järgnev sõltuvuskontroll eristab neist veel 577 tempo-
ja 72 modifikaatorivälistust; praegu jääb 21 SYX-katses 42 907 lubatud kirjutust.

Tempo NONE ja modifikaatorite järgnev etapp on kirjeldatud
[eraldi juhendis](FM3_PARAMETER_DEPENDENCIES.md). Muude efektiperede üldise
tabelikirjutaja tüübisobivus ning katmata sõltuvused vajavad jätkutööd. Spetsiifiliste PEQ/Enhanceri koostajate
varasemad piirangud jäävad eraldi. GLOBAL, muud kataloogilüngad, import, heli ja
CPU ei saa sellest kontrollist uut kinnitust. Kasutaja füüsilisi toiminguid: **0**.
