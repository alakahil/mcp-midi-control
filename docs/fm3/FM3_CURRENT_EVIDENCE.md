# FM3 kehtiv tõendiseis

Koondatud 2026-11-12; seadmetõendid kuni 2026-11-12. Alus 0.3.65.

See on ulatusega tõendikoond, mitte kõigi FM3 võimaluste valmidusprotsent. „Mõõtmata” ei tähenda keelatud sisendit ega ebaõnnestunud katset.

Enum: 227 vaikimisi / 121 opt-in; scalarDescriptors: 2114.

## Controllersi allikad

| Allikas | Kood | Tarkvaratugi | Import / käitumine | STORE | Tõend |
|---|---:|---|---|---|---|
| External 1 | 14 | jah | jah / jah | jah | T2/T10 (2026-10-26/28); T11 STORE |
| LFO 1A | 1 | jah | jah / jah | jah | T33 (2026-11-06) |
| LFO 1B | 2 | jah | jah / jah | jah | T40A (2026-11-09) |
| LFO 2A | 3 | jah | jah / jah | jah | T40B (2026-11-09) |
| LFO 2B | 4 | jah | jah / jah | jah | T40C (2026-11-09) |
| ADSR 1 | 5 | jah | jah / jah | jah | T34D (2026-11-07); STORE T39 K1 (2026-11-09) |
| ADSR 2 | 6 | jah | jah / jah | jah | T40D (2026-11-09) |
| Sequencer | 7 | jah | jah / jah | jah | T34C (2026-11-07); STORE T39 K1 (2026-11-09) |
| Envelope Follower | 8 | jah | jah / jah | jah | T40E (2026-11-09) |
| Pitch Follower | 9 | jah | jah / jah | jah | T41I (2026-11-09) |
| Scene Controller 1 | 30 | jah | jah / jah | jah | T34B (2026-11-07); STORE T39 K1 (2026-11-09) |
| Scene Controller 2 | 31 | jah | jah / jah | jah | T41A (2026-11-09) |
| Scene Controller 3 | 32 | jah | jah / jah | jah | T41B (2026-11-09) |
| Scene Controller 4 | 33 | jah | jah / jah | jah | T41C (2026-11-09) |
| Manual 1 | 56 | jah | jah / jah | jah | T41D (2026-11-09) |
| Manual 2 | 57 | jah | jah / jah | jah | T41E (2026-11-09) |
| Manual 3 | 58 | jah | jah / jah | jah | T41F (2026-11-09) |
| Manual 4 | 59 | jah | jah / jah | jah | T41G (2026-11-09) |
| Manual 5 | 60 | jah | jah / jah | jah | T41H (2026-11-09) |

Siht: Volume/Pan 1 Volume, ALL. T39-T41 (09.11.2026) kinnitasid ülejäänud 17 allikat: õige Source, ootuspärane heli ning STORE/reload baiditäpselt, ainult katse seadetega. Controllersi kõik kaheksa stseenikanalit on T33/T34 ulatuses kinnitatud. See ei laienda tuge suvalisele sihtparameetrile.

## T42: modifikaatori sihid ja tempo

| Siht | Allikas | Min–Max | Import / kuva / heli / STORE | Ulatus |
|---|---|---|---|---|
| DELAY_MIX | Scene Controller 1 | 0–100 | kinnitatud | T42, ALL, vaikekõver |
| FILTER_FREQ | LFO 1A | 300–3000 | kinnitatud | T42, ALL, vaikekõver |
| DISTORT_DRIVE | External 1 | 2–8 | kinnitatud | T42, ALL, vaikekõver |

Delay Low Cut on keelatud: FM3 tühjendas Source ja sihtploki. 468 nimega sihti on lipureegli põhjal lubatud, mitte eraldi mõõdetud.
Preseti tempo tarkvaravahemik 24–250 BPM; T42 kinnitab 97 ja 143 BPM näidu ning STORE/reload säilimise.
B1A/B1B/B1C/B2 kinnitavad allpool nimetatud avaliku generaatori lõppfailid. Muud A–D kooslused vajavad oma katset. T42 algkviitungit ei muudeta.

## B1/B2 lõpppresetite seadmekatse — 10.11.2026

Kõigi nelja preseti import, kuvanäidud, kasutaja kinnitatud käitumine ja STORE/reload on kinnitatud. Salvestatud keha on igal juhul baittäpne.
- B1A: SC1 → Delay Mix 0–100%, ALL, 97 BPM. CPU stseenid 1–3 44,5%; stseen 4 44,5–44,6%.
- B1B: LFO 1A → Filter Freq 300–3000 Hz, ALL. Sine, Rate 0,500 Hz ja Depth 100,0% kinnitatud kasutaja ning ekraanipildiga. CPU stseen 1 46,4%.
- B1C: External 1 → Amp Gain 2–8, ALL. CPU stseen 1 44,5–44,6%.
- B2: SC1 → Delay Mix 10–60% ja CS2 → Amp Cut, mõlemad D-kanalil, 143 BPM; nelja stseeni käitumine kinnitatud. CPU 44,4/44,4/44,5/44,6%.
Algtõendid ja räsidega kviitung: MOOTOR references/fm3-b1-b2-20261110.json. LFO juhikud: Controllers → LFO 1 + 2 → ülemine LFO 1 rida. CPU-parandusel pole eraldi enne/pärast faasimäärangut. Need tulemused ei kinnita iga uut presetit.

## H1/H2/H4 seadmekatse — 10.11.2026

H1 ja H2 import, FM3-Editi kuvanäidud, kasutaja kuulamine ja STORE/reload on kinnitatud. Salvestatud keha on mõlemal baittäpne.
- H1: SC1 → Reverb Mix 10–40%, ALL, vaikekõver, Room: Recording Studio A. Stseenid 1/2/3 Mix 10/25/40% enne ja pärast STORE-i; CPU 44,4–44,6%.
- H2: MultiDelay A–D Pealing Bells / Dub Echo / Mono Diffuser / Aurora Delay säilivad STORE järel; nende nelja T36 tüübi STORE on nüüd kinnitatud. CPU 62,5/55,3/50,0/52,2%; Pealing Bells on CPU mudeli hinnangust 51,1% ~11 punkti kõrgem (mudel muutmata).
- H4: T20 CAB_A Cab B Preamp lehel Preamp Type None ja ploki lõiked 87,0 Hz / 7300 Hz (FM3-Edit).
Kviitung: MOOTOR references/fm3-h1-h2-h4-20261110.json. Heli on kasutaja kuulamishinnang; H2 heli kuulati enne STORE-i.

## H3 lõpliku esinemispreseti kontroll — 10.11.2026

Mõlemad kandidaadid laaditi, loeti tagasi, mängiti päris kitarriga läbi kõigis 8 stseenis, salvestati kohta 427 ja loeti pärast tagasitulekut uuesti.
- V4 SATCH SOAP ON A ROPE V4 on lõplik esinemispreset: salvestatud keha baittäpne, klippimist pole, heli ja valjus sobivad kõigis stseenides, vahetus plõksuta. CPU 47.1/46.6/62.8/62.9/47/47.1/47.1/62.9%.
- V1 LIVE KOOSLUS V1: 11 ploki andmed säilisid (FM3 salvestusjärjekord), klippimist pole; stseenide valjus ebaühtlane (lead kõige vaiksem), lõppfailiks ei sobi. CPU 70.9/55/55/71.2/55.1/55.3/55.2/55.1%.
Kõik 16 CPU näitu on 0.2.5 hinnangust 1 punkti ja enne/pärast STORE-i 0,5 punkti piires. Stseene valiti M-Wave MIDI lülitiga (1–4).
Kviitung: MOOTOR references/fm3-h3-20261110.json.

## H5/H5B/T43/T44 seadmekatse — 11.11.2026

Kõik neli presetti laaditi, kuulati päris kitarriga, salvestati kohta 427 ja loeti tagasi; andmesõnad vastavad failile.
- H5 LIVE KOOSLUS V1.1: Amp A/D −10,2 dB, C −7,0 dB säilivad STORE-i järel (FM3 salvestusjärjekord). Kasutaja: lead võiks veel ~2 dB valjem olla.
- H5B: Out 1 Scene Level 1–8 −2/0/+1/−2/−2/0/+1/−2 dB enne ja pärast STORE-i — OUTPUT_SCENE1..8 esimene seadmekinnitus.
- T43: Amp Level, Drive Drive, Delay Feedback, Reverb Time, Chorus Depth, Out 1 Level ja Chorus Bypass modifikaatori sihid salvestuvad baittäpselt; Chorus Bypass SC2 0% = sees, 50%/100% = bypass. CPU 49,7–49,8% (hinnang 50,4%).
- T44: per-preset lüliti kategooria 4 = Effect, 3 = Scene; Bypass/Select funktsioon 0; Effect param on ploki indeks (Drive 1 = 9, Delay 1 = 7, Reverb 1 = 51), Scene param = stseeni number. Värv ja Mini-Display silt ei salvestu kehasse.
Kviitung: MOOTOR references/fm3-h5-t43-20261111.json. Modifikaatori dialooge ei avatud; seosed tuletatud näidatud väärtustest ja baittäpsest salvestisest.

## H6/T45/T46 seadmekatse — 12.11.2026

- H6 LIVE KOOSLUS V1.2: Amp C (lead) −5 dB, A/D −10,2, B −9 säilivad STORE-i järel. Kasutaja: leadid veidi valjemad, teised ühtlased. CPU S1 71,2 / S2 55,3 / S3 55,9 / S4 71,8 %.
- T45: generaatori kirjutatud PP#1 Drive 1, PP#2 Delay 1 (Effect Bypass), PP#3 Scene 3, PP#4 Reverb 1 — FM3-Edit näitas õigesti, FM3 lülitid 1–3 töötasid enne ja pärast STORE-i, salvestatud keha baiditäpne.
- T46A–C: Effect-indeks on FM3-Editi tähestikulise plokinimekirja järjekord aukudega; 0..62 = Amp 1 … Wah 2, 63..71 tühi. Plugin lubab 28 üheselt kaardistatud plokki; peale Drive 1 / Delay 1 / Reverb 1 on lülitikäitumine kontrollimata.
Kviitung: MOOTOR references/fm3-h6-t45-20261112.json.

## MultiDelay Type mallid

| Tüüp | Mõõdetud sõnu | Generaatori import | Heli | STORE | Tõend |
|---|---:|---|---|---|---|
| Quad-Tap Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Parallel Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Series Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Diffusor | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Tape Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Tap Band Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Ambient Quad Tape | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Ambient Tape Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Circular Delays | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Comb Filter Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Filtered Mod Band Delay | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Quad Chorus | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Pealing Bells | 121 | jah | jah | jah | T35, T36, H2 |
| Rhythmic Bands | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| MD Chorus | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Mono Diffuser | 121 | jah | jah | jah | T35, T36, H2 |
| 1210 | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Aerosol | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| PCM Circular | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| PCM Pan | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Clean Short | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Clean Long | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Lead Short | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Lead Long | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Swell Short | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| A.H. Swell Long | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Ya-Ya Delay | 121 | jah | jah | jah | T35, T38 |
| L-C-R-C | 121 | jah | jah | jah | T35, T38 |
| Space Tape | 121 | jah | jah | jah | T35, T38 |
| Shadows Taps | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Stereo Shadows | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Swing Ping | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Dub Echo | 121 | jah | jah | jah | T35, T36, H2 |
| Aurora Delay | 121 | jah | jah | jah | T35, T36, H2 |
| Kilimanjaro | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Camera Obscura | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Strange Things | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Matterhorn | 121 | mõõtmata | mõõtmata | mõõtmata | T35 |
| Centaurus X-3 | 121 | jah | jah | jah | T35, T38 |

39 malli, 8 generaatori importi, 8 STORE-kinnitust (T38 ja H2). Mall asendab kogu kanali enne controls-muudatusi; üksik Type sõna ei täida kanalit.

## Muud T32-T41 tulemused

- T32: 8 stseeni CPU 55-71%, 11 ploki andmed säilisid STORE järel. T34E kinnitab lõpliku -8 dB lead-nivoo kuulamist; H3 mõõtis lõppfaili CPU ja STORE-i, stseenide valjus vajab sättimist.
- T37: Synthi häälte 2/3 mõõdetud tüübid on CPU mudelis 0.2.5; muud parameetrid vajavad oma tõendit.
- T34F: Cab lõiked nähtavad; H4 luges Preamp Type None otse FM3-Editist tagasi.
- T38: sama spec taastab 0.3.58 device-järjekorras salvestatud keha; see ei kinnita kõigi presetite ega grid-režiimi baittäpsust.

## Allikad ja piirid

Masinloetav koond koos iga sisendi SHA-256-ga: [fm3-current-evidence.json](../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-current-evidence.json).
Ajaloolised kviitungid säilivad muutmata. Koondi kontroll: `node tools/fm3/current-evidence.mjs`; uuendus: lisa `--write` ja vaata muutused üle.
Üldine modifikaatorijaotaja, suvaline baaspreset, Hold/teised paigutused, Out 2 stereo/4CM ja iga uue preseti heli/CPU/STORE jäävad eraldi ulatuseks. Uusi seadmemõõtmisi selle koondiga ei tehtud.
