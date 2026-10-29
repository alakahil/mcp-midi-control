# Modifikaatori kirje väljad, seis 29.10.2026

Allikad: `docs/fm3/parameter-evidence/modifier-fields-audit.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-modifier-display-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-volume-range-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-bind-store-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-control-switch-evidence-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-modifier-removal-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-combo-store-20261029.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-mod-steps-20261029.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-switch-direct-20261029.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-cs-steps-20261029.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-cs-steps-b-20261029.json`. Uut seadmekatset selle koondi jaoks ei tehtud.

| Sõna | Väli | Näit / dekodeering | Seis | Kirjutaja |
|---|---|---|---|---|
| 0 | Source | code + 1 is the FM3 list number (51 -> "52 Control Switch 2", 14 -> "15 External 1", 13 -> "14 PEDAL 2 (SW RING)" (T13)) | decoded | controlSwitches (Control Switch 1..6), volumePedal (External 1), Wah toggle |
| 1 | MOD_MIN | target stored word: Rotary Rate 3299 -> 0.503 Hz; Amp GEQ band 32854 -> 0.03; Volume 16384 -> 2.50 (T10); switch 0 -> OFF, 65534 -> ON | decoded, device-confirmed on Volume | volumePedal {min,max}; controlSwitches invert |
| 2 | MOD_MAX | target stored word: Rotary Rate 42097 -> 6.424 Hz; Amp GEQ band 43630 -> 3.98; Volume 49151 -> 7.50 (T10) | decoded, device-confirmed on Volume | volumePedal {min,max}; controlSwitches invert |
| 3 | MOD_STARTPT | word / 65534 x 100 %: 0 -> 0.0%; 13107 -> 20.0% | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 4 | MOD_MIDPT | word / 65534 x 100 %: 16384 -> 25.0%; 32767 -> 50%; 30368 -> 46.3% | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 5 | MOD_ENDPT | word / 65534 x 100 %: 52427 -> 80.0%; 65534 -> 100% | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 6 | MOD_SLOPE | word / 65534 x 100 %: 32767 -> 50%; 49151 -> 75.0%; 39651 -> 60.5% | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 7 | MOD_ATTACK | word x 10000 / 65534 ms (0..10000 ms), shown to 0.1 ms: 65 -> 9.9 ms; 66 -> 10.1 ms; 655 -> 99.9 ms | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 8 | Target effect ID | - | structural | all writers |
| 9 | Target PID | - | structural | all writers |
| 10 | MOD_AUTOENGAGE | 0 -> OFF; 1 -> SLOW SPD (T12); 5 -> MED POS | three labels (plus the existing Wah OFF / MED SPD pair) | Wah modifier (existing) |
| 11 | PC Reset | 0 -> OFF; 1 -> ON | decoded (T12) | template value |
| 12 | MOD_OFFVAL | 5 + 90 x word / 65534 % (native descriptor 5..95 %): 0 -> 5.0%; 32767 -> 50.0%; 65534 -> 95.0% (T14) | decoded, device-confirmed at 5 / 50 / 95 % (T7, T12, T14); the T7 reading of 65534 as 5.0% was a misreading | wahControls offValuePercent |
| 13 | MOD_SCALE | 10^((word - 32767) / 32767), 0.100..10.000: 22911 -> 0.500; 32767 -> 1.000; 42623 -> 1.999; 39366 -> 1.590 | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 14 | MOD_OFFSET | (word - 32767) / 32767 x 100 %: 32767 -> 0.0%; 36044 -> 10.0% | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 15 | MOD_RELEASE | same scale as Attack: 66 -> 10.1 ms; 3277 -> 500.0 ms | decoded, device-stepped (T12) | volumePedal.curve; wahControls (0.3.34, fm3-modifier-curve.mjs) |
| 16 | Update Rate | 0 -> SLOW; 1 -> MEDIUM | decoded (T12) | template value |
| 17 | Channel | 0 -> ALL; 4 -> CHAN D; 1 -> CHAN A | decoded | controlSwitches channel |
| 20 | Secondary source | 0 in every written record | not written | - |
| 24 | MOD_DAMPING | 0 -> EXPONENTIAL; 1 -> LINEAR | decoded (T12, plus the existing Wah Damping pair) | Wah modifier (existing) |

Sõna indeks = modifikaatori PID (The Codex field audit maps native MOD descriptor PIDs to record words 1:1 (MOD_AUTOENGAGE PID 10 = body offset 1604 = word 10).)

Eemaldamine: words 0, 8 and 9 -> 0, other words kept, no compaction (references/fm3-modifier-removal-20261028.json; stored by the FM3 itself in T12).

STORE: Wah + Volume + two Control Switch records stored and reloaded unchanged (T9); Wah + Volume 2.50..7.50 + three Control Switch records (normal, inverted, CHAN D) + Out 2 stored and reloaded unchanged (T11).

Lülitus: Inverted and CHAN D records behave as written on the device: PEDAL 2 ring switch (T13, momentary) and per-preset Control Switch: Latching and Momentary footswitches (T14/T14b, stored in the preset, no global setting); CS Per Scene ON/OFF/LAST applied on scene change (T14b).

Control Switchi preset-andmed: CS Per Scene: 482 bytes before the body end, 6 CS x 8 scenes, ON 0 / OFF 1 / LAST 2; per-preset definitions 3052 bytes before the end (category 7 = Control Switch, function 1 Latching / 0 Momentary, parameter CS number - 1); overrides 1920 bytes after (references/fm3-cs-steps-b-20261029.json).

Endiselt lahti: generator fields for CS Per Scene and per-preset Control Switch footswitches; per-preset Hold functions.
