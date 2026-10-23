# FM3 0.3.15 — Input gate / Volume-Pan väljalaskeülevaatus

Lähtekandidaat on `881bb54e36a4e678e413f8b84d171f2eb53a7b4a` (PR #16).
Avaldatud privaatne plugin on ülevaatuse alguses 0.3.14. Siinne lähtekood
valmistab ette 0.3.15; avaldamine ning tegelik hostilaadimine on eraldi tulemused.

## Leitud ja parandatud kontrollilüngad

Lähtekandidaadi nelja faili kontroll võttis vastu kolm käsitsi muudetud väljundit,
mille CRC ja artifact-räsid olid uuendatud: Volume'i päise säilitatav sõna,
aktiivne Volume Gain modifikaator ning aktiivne Input Threshold modifikaator.
Generaatori kirjutaja tõrjus modifikaatorikonflikti juba varem, kuid lõppfaili
kontroll pidi seda uuesti päris SYX-i põhjal kontrollima.

- Volume kontroll võrdleb nüüd kogu 46-baidist päist jäädvustatud doonoriga,
  lubades ainult spec'is määratud stseenikanali ja bypass'i muudatused.
- Input kontroll võrdleb tervet 126-baidist kirjet räsiga kinnitatud NewLooki
  Input-kirjega, lubades ainult küsitud viit parameetrit A–D kanalites. Need
  algkirjed on kõigis toetatud koostaja alustest samad; uusi tüüpe ei lisata.
- Mõlemad kontrollivad aktiivseid või ebaselgeid modifikaatorisihtseoseid
  lõppfaili raw-kirjetest. Report'i varasem sõltuvusväide ei asenda tagasilugemist.
- Uus test tõrjub 12 korrektse CRC ja ümberarvutatud nelja faili räsidega juhtumit:
  päised, Inputi impedants/bypass/puutumata arvväli, kooskõlastatud report'iga
  sisendi stseen/tüüp ning mõlema ploki aktiivne/ebaselge modifikaator.
  Kanalita bypass'i ja bypass'ita kanali stseenimuudatused läbivad.

Mõlemad manifestid, generaatori versioon ja kasutusjuhend on 0.3.15-ga kooskõlas.
Ajutine `developmentCandidate` väljaanne eemaldati capabilities'ist; funktsioonide
piiratud tõendusulatus jääb Input/Volume kirjeldustesse, avaldamisolek kviitungisse.
Inputi tõenditekst eristab nüüd 20 sõna säilimist füüsikalise skaala mõõtmisest.

Värske kontekstiga juhendi kasutuskatse avastas eraldi juhendivea: üldjuhis lubas
uue ploki vaikimisi bypass'i, kuid Volume'i tegelik doonor on kõigis stseenides
aktiivne kanal A. Juhend nõuab nüüd uue soundi puhul kõigi kaheksa Volume-stseeni
eksplitsiitset kirjeldamist ning kasutaja määramata stseenides bypass'i. Doonor
ja ekspordi täpse taastamise tee ei muutu. Esimese kasutuskatse väljund säilitati;
parandatud juhend läbib eraldi värske konteksti kasutuskatse.

## Tõend ja piirid

Uut seadmeeksporti, MIDI SET-i, STORE'i ega REA analüüsi ei tehtud. Tagastatud
FW13 eksport tõendab endiselt ühte Input-kombinatsiooni (20 sõna) ja ühte Volume'i
vaikekirjet. Auto-Swell, uued modifikaatorisidumised, füüsikaliste skaalade
täiendav mõõtmine, heli/CPU ja STORE/reload jäävad sellest väljapoole.
Arvväärtused toetuvad samale FW13 metadatale ja kõveraklassi mudelile.

Wah Min/Max ei muutunud: kuus mõõdetud punkti välja kohta, 995 nelja mudeli
kokkulangevusel põhinevat väärtust ning `fullRangeEncodingProven=false`.
Hiirega valitud ajaloolisi punkte ei võrdsustata klaviatuurisisendiga.

52 kontrolliga lõppkomplekt tuleb siduda puhta commit'iga, mille põhjal luuakse
deterministlik arhiiv. Selle arhiivi self-check, nelja faili kasutuskatse,
GitHubi CI ning avaldatud paketi ja hosti kontroll talletatakse tööaruandesse.
See lähtefail ei asenda hilisemaid käivituskviitungeid.
