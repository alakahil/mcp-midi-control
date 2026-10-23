# Min/Max koondkatse: mõõtmised kinnitatud, 22.10.2026

**Kogu 44-sammuline katse õnnestus. Uut riistvarakatset praegu ei küsita.**
Üks eksport andis 37 erinevat (PID, operatsioon, täpsed sisendbitid) punkti.
Koos lähtestustega tehti 44 SET-i ja 92 GET-i; automaatne osa kestis 65.591 s.

Alus on kohalik commit `30ac4cd1a6be2c92b72cf3ddce85f9aa8b07f817` ja
tööaruande versioon 32. Kasutaja tulemuste ZIP algusega 22.10.2026 kell
17:42:40 Eesti aja järgi on säilitatud muutmata:
`captures/FM3_MOD_HW_RESULTS_20261022T144240Z_583c0f.zip`.
SHA-256: `f99bdfdcdb695b80e6059a772f6095e9f2a2a385628a1a7bd1804c53049ea44e`.

## Sõltumatult kontrollitud tõend

Uus `modifier_hw_replay.py` **ei kasuta koguja jadapordi/parseri koodi**.
See ei usalda raporti PASS-lippu ega selles olevaid mudeli ennustusi.

- Originaalarhiivi neli faili, kinnitatud plaan ja lähte-SYX on räsiga seotud.
- Kõik 136 TX-päringut dekodeeriti: järjestus, operatsioon, objekt, PID,
  täpsed 32 sisendbitti, pikkus, kontrollsumma ja täielik kirjutus klapivad.
- 320 RX-kaadrit dekodeeriti uuesti, arvestades tükeldatud vastuseid.
  SET-i 60-baidist kajavastust ei kasutata sõltumatu raw-tõendina.
- Alguses kattusid 25 MOD- ja 100 Wah-sõna lähtefailiga. MOD korduslugemine
  kattus. Juhtmeobjekt 3 on MOD record 0; sihtobjekt on Wah1/94, Control/5,
  Source=External1/14, MOD_CHANNEL=ALL/0. A on Wahi plokikanal.
- **Kõik 44 sammu muutsid täpselt üht kavandatud MOD-välja** ja iga sammu
  kaks järgnenud raw-lugemist kattusid. Muutuseta sammu ei olnud.
- Lõpus olid Wahi kõik 100 sõna säilinud. Lõppeksport klapib viimaste
  25 MOD-sõnaga. **Kogu preseti keha ülejäänud baidid säilisid**; lubatud
  lõppmuudatused on Min/Max ja üheksa kavandatud tavavälja.
- SYX kaadrite kontrollsummad, preseti CRC, footer ja päisekontrollid
  läbivad. Ka dump'i transpordipäis on sama. Muutusid ainult CRC ja
  pakkimispikkusega seotud raw-päise positsioonid 4, 5 ja 74.

Lõppeksport:
`c938c04bc7b522d914641eea96ee170b134d65e7c50b0036a5fd002b8e7f0c21`.
Preseti keha:
`30459edf365307445f8e250abd774508e6846775e0f15c9b7474dab754e4d9ed`.

## Täpsed Min/Max sisendid ja tegelikud sõnad

Kuvanäidu asemel on siin **saadetud float32 sisendi** tähendus. Uusi ekraanipilte
ei kogutud; sisendist arvutatud nominaalne kuvasuurus ei ole ekraanivaatlus.

| Op82 sisend / nominaalne Wah Control | Float32 bitid | Min raw | Max raw |
|---|---|---:|---:|
| 0.00 | `0x00000000` | 0 | 0 |
| täpne 2.50 | `0x3e800000` | **16384** | **16384** |
| täpne 5.00 | `0x3f000000` | **32767** | **32767** |
| täpne 7.50 | `0x3f400000` | **49151** | **49151** |
| 6.47 alumine float-naaber | `0x3f25a1ca` | 42400 | 42400 |
| 6.47 kanooniline float-sisend | `0x3f25a1cb` | **42401** | **42401** |
| 6.47 ülemine float-naaber | `0x3f25a1cc` | 42401 | 42401 |
| väga väike poole-sõna piirpunkt | `0x37000100` | **1** | **1** |
| 10.00 | `0x3f800000` | 65534 | 65534 |

Min/Max kuus **op9** võrdlust andsid samadel valitud sisendbittidel samad
sõnad nagu op82: Min 5.00/6.47/2.50 ning Max 5.00/6.47/7.50.
Starti op82 kolm 6.47 normaliseeritud float-naabrit andsid samuti
42400 / 42401 / 42401. Starti nominaalne kuvasuurus on sel juhul umbes 64.70%.

| Võrreldud op82 arvutusmudel | Sobivaid vaatlusi 29-st |
|---|---:|
| **32-nearest** | **29** |
| 40-nearest | 24 |
| 32-zero | 24 |
| 40-zero | 24 |

Viis eristavat vaatlust on Min/Max/Start kanooniline piirpunkt ja Min/Max
väike piirpunkt. Null-lähtestused välistavad nende tulemuste seletamise
lihtsalt eelneva sõna säilimisega. See eristab **neis mõõdetud juhtudes**
nelja auditeeritud mudelit. See ei tõenda MODE1 registri olekut kõigis
katkestustes ega välista kõiki mõeldavaid alternatiivseid algoritme.

## Varasemate hiiremõõtmiste tähendus

Vana Min 2.50 raw **16375**, Max 7.50 raw **49159** ja Max 5.00 raw **32784**
jäävad muutmata tõendiks. Need ei ole sama sisendi mõõtmised nagu uued
täpsed .25/.75/.5 float32-paketid. Sama kahe kümnendkohaga kuvanäit ei määra
sisendbitte. Uus katse kinnitab täpse sisendi tee ja näitab, miks vanadele
kuvanäitudele ei tule sobitada üldist parandustegurit. Ajaloolisi hiirepakette
tagantjärele teada ei saada.

## Üheksa uut op9 punkti

Need on otse firmware'ile saadetud sisemistes ühikutes float32 väärtused;
editori tekstiparserit ja kordajaga jagamist see tee ei läbi.

| Väli | Nominaalne sisend | Tegelik raw |
|---|---:|---:|
| Start | 6.47% | 4240 |
| Mid | 33.33% | 21842 |
| End | 87.65% | 57441 |
| Slope | 52.35% | 34307 |
| Attack | 123.4 ms | 809 |
| Release | 678.9 ms | 4449 |
| Scale | 1.23 | 35713 |
| Offset | −12.3% | 28737 |
| Off Value | 37.2% | 23447 |

Kõik üheksa sobivad nii float64-nearest kui etapiviisilise float32-nearest
võrdlusmudeliga. See lisab üheksa täpse sisendiga vaatlust; ei tõenda kogu
RECIPS/logaritmi teostust ega lahenda vana Attacki kuvanäidu vastuolu.

## Valmis avaldamata generaatorikandidaat

`modifier_minmax_hw_candidate.py` lisab eraldi päringulepingu
**`exact-wah-cent-fw13-hw1`**. See ei muuda tootmisliidese ajalooliste
kuvapunktide tähendust ega vana `exact-wah-cent-v1` poliitikat.

- Päring on täpne kümnendstring `0.00`…`10.00`, samm 0.01. Normaliseerimine
  on täpne ratsionaalarv, millest valitakse lähim even float32.
- 6.47 kasutatakse ainult seetõttu, et **sama PID ja samad sisendbitid** on
  raw-jadast kinnitatud: Min samm 07, Max samm 22 → 42401.
- Kandidaat taasesitab enne mõõtmistabeli kasutamist tegeliku TX/RX ja
  lõpp-SYX auditi. Kõiki teisi mode-sõltuvaid sisendeid üldiselt ei avata.
- Mõlema välja 1001 sendisammu päringut läbib kandidaadi kontrolli. Neist
  **6 väärtust välja kohta on päriselt mõõdetud**, 995 toetuvad nelja
  arvutusmudeli kokkulangevusele. See ei ole 1001 füüsilise mõõtmise väide.
- Ainult soovitud Min/Max sõnad muutuvad. Viie varasema lähte-SYX-i 10
  mälus kodeerimise/võrdlemise juhtu läbivad; lisaks kontrolliti kahe välja
  ühist 6.47 päringut, vale raw 42400 ja kõrvalmuudatuse tõrjumist.
- Vana poliitika blokeerib jätkuvalt 6.47; olemasolevad mõõdetud hiirekoodid
  säilivad, kui neid pole uues täpse päringu lepingus muudetud.

See on **piiratud ettevalmistatud koodikandidaat**, mitte uus pluginaväljalase.
Kandidaadi SYX-i ei antud seadmesse ega salvestatud uue riistvaratõendina.
Tootmisgeneraator jääb 0.3.13 ning `publishedGeneratorSupport=false`.

## Kontrollid, piirid ja järgmine samm

**29/29 asjakohast testi läbis:** 7 sõltumatu logitaasesituse, 5 uue
kandidaadi, 6 vana täpse päringu ning 11 uut/varasemat SYX-võrdluse testi.
Neist 15 on uued ja 14 regressioonikontrollid. Täielikku release-CI-d ei käivitatud.
Võltsitud PASS, õige kontrollsummaga vale sisend, vigane kaader, vale ajastus/
seos, osaline kirjutus, vale 6.47 sõna ja kõrvalmuudatus tõrjutakse.

FW13.00 on kasutaja deklareeritud versioon, mitte automaatselt tuvastatud.
Uut REA/Ghidra analüüsi ei tehtud; varasem native-teekond on mõõtmiste alus.
Teised Min/Max sihttüübid, kogu op9 RECIPS-vahemik, klaviatuuriparseri
ümardused ja üleprogrammilised MODE1/RTI/puhvri-alias'e küsimused säilivad.
STORE/reload/power-cycle, heli, pedaali käitumist ja CPU-d see ring ei testi.

**Järgmine samm on tarkvaraline:** ühendada eraldi täpse väärtuse kandidaat
generaatori tegelikku päringuliidesesse koos samade sihtkontrollide ja
tõenditasemega; valmistada ülevaadatav muudatus. Avaldamise ja võimaliku
kontrollimpordi vajadus otsustada selle konkreetse muudatuse põhjal.
Käesolevat 44-sammulist katset ega lõppeksporti pole vaja korrata.
