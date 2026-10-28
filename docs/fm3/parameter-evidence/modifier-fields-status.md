# Modifikaatori kirje väljad, seis 28.10.2026

Allikad: `docs/fm3/parameter-evidence/modifier-fields-audit.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-modifier-display-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-volume-range-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-bind-store-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-control-switch-evidence-20261028.json`, `plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/references/fm3-modifier-removal-20261028.json`. Uut seadmekatset selle koondi jaoks ei tehtud.

| Sõna | Väli | Näit / dekodeering | Seis | Kirjutaja |
|---|---|---|---|---|
| 0 | Source | code + 1 is the FM3 list number (51 -> "52 Control Switch 2", 14 -> "15 External 1") | decoded | controlSwitches (Control Switch 1..6), volumePedal (External 1), Wah toggle |
| 1 | MOD_MIN | target stored word: Rotary Rate 3299 -> 0.503 Hz; Amp GEQ band 32854 -> 0.03; Volume 16384 -> 2.50 (T10); switch 0 -> OFF, 65534 -> ON | decoded, device-confirmed on Volume | volumePedal {min,max}; controlSwitches invert |
| 2 | MOD_MAX | target stored word: Rotary Rate 42097 -> 6.424 Hz; Amp GEQ band 43630 -> 3.98; Volume 49151 -> 7.50 (T10) | decoded, device-confirmed on Volume | volumePedal {min,max}; controlSwitches invert |
| 3 | MOD_STARTPT | 0 -> 0.0% | default only | template value |
| 4 | MOD_MIDPT | 32767 -> 50%; 30368 -> 46.3% (word / 65534) | decoded (2 points) | template value |
| 5 | MOD_ENDPT | 65534 -> 100% | default only | template value |
| 6 | MOD_SLOPE | 32767 -> 50%; 39651 -> 60.5% (word / 65534) | decoded (2 points) | template value |
| 7 | MOD_ATTACK | 66 -> 10.1 ms; 65 -> 9.9 ms | two points | template value |
| 8 | Target effect ID | - | structural | all writers |
| 9 | Target PID | - | structural | all writers |
| 10 | MOD_AUTOENGAGE | 0 -> OFF; 5 -> MED POS | two labels (plus the existing Wah OFF / MED SPD pair) | Wah modifier (existing) |
| 12 | MOD_OFFVAL | 0 and 65534 both displayed 5.0% | unresolved (readings do not discriminate) | template value |
| 13 | MOD_SCALE | 32767 -> 1.000; 39366 -> 1.590 (10^((w - 32767) / 32767) fits) | one non-default point | template value |
| 14 | MOD_OFFSET | 32767 -> 0.0% | default only | template value |
| 15 | MOD_RELEASE | 66 -> 10.1 ms; 65 -> 9.9 ms | two points | template value |
| 17 | Channel | 0 -> ALL; 4 -> CHAN D; 1 -> CHAN A | decoded | controlSwitches channel |
| 20 | Secondary source | 0 in every written record | not written | - |
| 24 | MOD_DAMPING | template value -> EXPONENTIAL | default only (plus the existing Wah Damping pair) | Wah modifier (existing) |

Sõna indeks = modifikaatori PID (The Codex field audit maps native MOD descriptor PIDs to record words 1:1 (MOD_AUTOENGAGE PID 10 = body offset 1604 = word 10).)

Eemaldamine: words 0, 8 and 9 -> 0, other words kept, no compaction (references/fm3-modifier-removal-20261028.json).

STORE: Wah + Volume + two Control Switch records stored and reloaded unchanged (T9, references/fm3-bind-store-20261028.json).

Endiselt lahti: Start / End / Offset away from their defaults; Off Value (word 12); Scale beyond one point; Attack / Release scale beyond 65 / 66; curve writing (Mid, Slope, Scale).
