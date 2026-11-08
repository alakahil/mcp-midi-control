# Controllersi järgmised tõendilüngad

## Esimene voor: ainult puuduv STORE-kinnitus

Scene Controller 1, Sequencer ja ADSR 1 on juba kuuldavalt kinnitatud. Järgmine pakett kordab nende kolme säilimist pärast STORE-i ja taaslaadimist. Üks sõltumatu sidumine ühes presetis; kolm tulemust saab saata koos.

| Allikas | Puudu | Järgmine kontroll |
|---|---|---|
| ADSR 1 | store-reload | Määra paisumine; mängi eraldi noote, kontrolli Source nime, retrigger-käitumist ja STORE järel kordumist. |
| Sequencer | store-reload | Kontrolli rütmilist helikatkestust enne ja pärast STORE; kasuta sama T34 neljaastmelist jada. |
| Scene Controller 1 | store-reload | Määra neljale stseenile selgelt erinevad väärtused; kontrolli järjest kasvavat Volume taset ja STORE järel säilimist. |
| LFO 1B | device-import, audible-behavior, store-reload | Määra valitud LFO-le aeglane ja kiire sagedus; kuula Volume pulsseerimist, kontrolli Source nime ja STORE järel kordumist. |
| LFO 2A | device-import, audible-behavior, store-reload | Määra valitud LFO-le aeglane ja kiire sagedus; kuula Volume pulsseerimist, kontrolli Source nime ja STORE järel kordumist. |
| LFO 2B | device-import, audible-behavior, store-reload | Määra valitud LFO-le aeglane ja kiire sagedus; kuula Volume pulsseerimist, kontrolli Source nime ja STORE järel kordumist. |
| ADSR 2 | device-import, audible-behavior, store-reload | Määra paisumine; mängi eraldi noote, kontrolli Source nime, retrigger-käitumist ja STORE järel kordumist. |
| Envelope Follower | device-import, audible-behavior, store-reload | Mängi nõrku ja tugevaid noote; ootus määratakse kinnitatud envelope-seadistuse järgi, kontrolli Volume reaktsiooni ja STORE järel kordumist. |
| Pitch Follower | device-import, audible-behavior, store-reload | Mängi etteantud madalaid ja kõrgeid üksiknoote; kontrolli õiget Source nime, ootuspärast Volume muutust ja STORE järel kordumist. |
| Scene Controller 2 | device-import, audible-behavior, store-reload | Määra neljale stseenile selgelt erinevad väärtused; kontrolli järjest kasvavat Volume taset ja STORE järel säilimist. |
| Scene Controller 3 | device-import, audible-behavior, store-reload | Määra neljale stseenile selgelt erinevad väärtused; kontrolli järjest kasvavat Volume taset ja STORE järel säilimist. |
| Scene Controller 4 | device-import, audible-behavior, store-reload | Määra neljale stseenile selgelt erinevad väärtused; kontrolli järjest kasvavat Volume taset ja STORE järel säilimist. |
| Manual 1 | device-import, audible-behavior, store-reload | Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist. |
| Manual 2 | device-import, audible-behavior, store-reload | Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist. |
| Manual 3 | device-import, audible-behavior, store-reload | Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist. |
| Manual 4 | device-import, audible-behavior, store-reload | Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist. |
| Manual 5 | device-import, audible-behavior, store-reload | Muuda valitud Manual väärtust kahes kontrollitud punktis; kontrolli Volume reaktsiooni, õiget Source nime ja salvestatud väärtuse säilimist. |

## Piirid

Ülejäänud 14 allika katse on vajaduspõhine. See plaan ei ava uusi allikaid ega sihtparameetreid. Kõigi allikate siht on Volume/Pan Volume, ALL. Erinevad LFO-kujud, sügavused ja modifikaatorikõverad vajavad oma kontrollitud ootust.

Masinloetav plaan: [controllers-gap-plan.json](parameter-evidence/controllers-gap-plan.json). Tõendibaas: [FM3_CURRENT_EVIDENCE.md](FM3_CURRENT_EVIDENCE.md).
Taasesitus: `node tools/fm3/controllers-gap-plan.mjs`; uuendamine: lisa `--write`. Uusi seadmemõõtmisi pole tehtud.

## T39-T41 paketid (ette valmistatud 08.11.2026)

- T39 = K1 (`tools/fm3/controllers-store-build.mjs`): Scene Controller 1, Sequencer, ADSR 1 STORE/taaslaadimine.
- T40 (`tools/fm3/t40-controllers-sources-build.mjs`): LFO 1B, LFO 2A, LFO 2B, ADSR 2, Envelope Follower.
- T41 (sama ehitaja): Scene Controller 2-4, Manual 1-5, Pitch Follower.
- Igas presetis üks allikas, vastandseaded teeb vale sidumise kuuldavaks (nt LFO 1 = 5 Hz, LFO 2 = 1 Hz; teised Scene Controllerid kahanevad, teised Manualid 0 %).
- FM3-Edit 1.07.17 stringides on Pitch Followeril ainult `CONTROLLERS_PITCH_SOURCE`; noodivahemikku ei kirjutata, T41I kontrollib ainult suunda.
- Võrdlus: `node tools/fm3/controllers-store-compare.mjs PAKI_KAUST SESSION_KAUST` (vahele jäetud osa märgitakse `skipped`). Seadmetulemusi veel pole.
