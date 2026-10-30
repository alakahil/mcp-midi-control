# FM3 Sound Architect 2 — 0.3.39

30.10.2026 tõendiväljalase viib PR #51 lõpetatud P3 katse pluginasse.
Üks fikseeritud genereeritud preset kinnitab Input Boost seose eemaldamist
(kirje 2, sõnad 0/8/9), Volume-kirje 1 taaskasutamist CS2 → Amp Cut jaoks,
Cut OFF/ON lülitumist stseenides 1/2 ning STORE → muu preset → tagasi säilimist.
Kasutaja kinnitas kõik viis juhendi sammu koondvastusega.

Kõik 32 modifikaatorikirjet säilivad seadmeekspordis baittäpselt. Kogu SYX ega
dekodeeritud keha pole algfailiga sama: FM3 vahetas Wah ja Volume/Pan plokkide
järjekorra. Ainult selle järjekorra normaliseerimise järel vastavad plokkide
terviklik sisu, modifikaatorid, stseeniandmed ja süsteemisaba algfailile.

Kuus avaldamiseks lubatud tõendifaili säilivad algkujul kaustas
`references/p3-modifier-reuse-20261030/`. Algne uuringukvartett kannab jätkuvalt
0.3.38 ja katsele eelnenud hardware_pending märget; hilisem eraldi kviitung
kinnitab lõpetatud seadmekatset. Uus 78. kohustuslik test kontrollib praeguse
mootori alg-/doonorkvartette, taastab ajaloolise SYX-i, tõrjub 47 vigast sisendit
ja võrdleb säilitatud seadmeeksporti. Repo test nõuab tõendikoopiate vastavust.

Fikseeritud uuringutööriist on nüüd mootoris ning repo CLI suunab samale
teostusele. See ei lisa generaatori avalikku eemaldamise/taaskasutuse sisendit
ega üldist kirjete jaotajat. Suvaliste presetite muutmine, FM3-Editi automaatne
vaba koha valik, kõigi 32 pesa kasutatavus, uued allika-/sihtmärgipered, heli ja
CPU jäävad selle katse piiridest välja. Kehtiva tavapreseti SYX-kirjutus ei muutu.

Korpuses on nüüd 800 failiteed, 643 erinevat sisu ja 633 toetatud sisu; 10
ajaloolise faili vorming jääb eraldi. Registrid ja sõltuvad räsid uuendatakse.
Avaldatud versiooni commit'i, 78 testi, paketi tagasivõrdlust ja käivitajajuhendi
sidumist kinnitab eraldi väljalaskekviitung.
