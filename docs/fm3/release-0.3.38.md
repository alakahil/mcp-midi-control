# FM3 Sound Architect 2 — 0.3.38

30.10.2026 tõendiväljalase lisab P2 kolme jalglüliti eduka seadmekatse ja D1
juhendiparanduse. Generaatori kirjutustugi ning kehtiva sisendi SYX ei muutu.

P2: 0.3.37-ga loodud preset imporditi käsitsi. Layout 1 lülitid 1–3 kinnitasid
CS2 Latching / Boost ALL, CS3 pööratud Momentary / Bright ALL ja CS4 Latching /
Fat D käitumise. ON/OFF/LAST ja kanalipiirang töötasid. Kasutaja kinnitas STORE,
muu preseti valimise ja naasmise 4. stseeni. Ekspordi kogu 12804-baidises kehas
muutus ainult valitud stseeni bait 0 → 3. Tõend ei laiene teistele layout'idele,
kõigile 24 määrangule, heli- ega CPU-mõõtmisele. Firmware 13 tugineb varasemale
kontekstile, mitte selle seansi uuele versioonivaatlusele.

Algne nelja faili komplekt, eksport ja eraldatud tehniline kviitung säilivad
`references/p2-three-switches-20261030/` all. Privaatseid failiteegi identifikaatoreid ei pakita.
77. kohustuslik test taastab algse SYX-i praeguse mootoriga, kontrollib kogu
salvestatud sisu ning tõrjub rikutud faile. Vana tõendi generaator jääb 0.3.37.

D1: T8 kinnitab Satriani V4 laadimist ja kaheksa stseeni CPU-näite. V4 terviklik
uus tagasilugemine ning V3/V4 kuulamisvõrdlus on eraldi kinnitamata.

Täpset commit'i, 77 testi, CI-d, avaldatud paketi tagasivõrdlust ja käivitaja
sidumist kinnitab pärast avaldamist eraldi väljalaskekviitung.
