# FM3 Sound Architect 2 — 0.3.26

27.10.2026 väljalaskekandidaat koondab pluginasse põhiharusse commit'iga
`7dd70a5a2fc3145b03177c9913e8bd458166565f` liidetud T1/T2/T3/T6 tulemused.
Varasem avaldatud plugin oli 0.3.25, commit
`0e531150092cdf0aa06b25fdeec49ffd3e8f8c01`.

- T1: Scene MIDI PC/CC jõudis FM3 MIDI OUT pesast Helixisse kanalil 1.
  PC bait võrdus Value väljaga. Käsupesa 8 ja ühe stseeni kaks käsku töötasid.
  Scene 1 käsud väljusid ka redaktsioonipuhvrisse laadimisel.
- T2: Volume-pedaali näidud 0.00–10.00 ja External 1 seos säilisid
  kasutaja STORE/reload'i järel. 6485 salvestatud sõnast erines ainult valitud stseen.
- T3: Pitch TRACKMODE viimase sõna CHORDS ja TEMPO viimase sõna 63/64
  seadmekontroll sulgeb varasema loendisiltide katvuse lünga.
- T6: kaheksa kommertspaketi preseti salvestatud stseenide CPU mõõtmised
  ning ühe preseti kõik kaheksa stseeni täpsustavad hinnangu piiranguid.
  Esimese kogumise stseenivaliku viga on tõendis säilitatud; seda ei nimetata
  suurima CPU-ga stseenide mõõtmiseks. Ühe preseti stseen 5: 82 %, hinnang 80,5 %.

Juhendi vanad lahtised väited on uute tõenditega kooskõlla viidud.
Mootori ja mõlema manifesti versioon on 0.3.26. Identiteet, privaatsus,
vaikepäring ja kirjutamise kaitsed säilivad. Kommertspaketi presette ei pakita.
Uut riistvaraseanssi ega helihindamist selle koondamise ajal ei tehta.
Satriani V4 avatud PR #37 ei kuulu selle väljalaske lähtealusesse.

Täpset avaldatud commit'i, paketi ja manifesti räsisid ning release ID-d
kinnitab eraldi avaldamiskviitung pärast kontrollide lõppu. Kontrollida tuleb
70-testi offline-komplekti, GitHubi CI-d, paketi tagasivõrdlust ja käivitaja
sidumist. Ainult versiooninumber ei kinnita avaldamist ega hostilaadimist.
