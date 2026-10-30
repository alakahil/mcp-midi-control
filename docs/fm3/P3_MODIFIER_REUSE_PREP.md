# P3: bounded modifier removal and reuse — completed device test

Status: completed on 2026-10-30. The user confirmed all five device steps; the
retained export passes the full record comparison.
The test used engine 0.3.38; release 0.3.39 packages its evidence and regression.
This research tool adds no public generator field and enables no general allocator
or arbitrary-base editing.

The bounded removal/reuse device test used one generated preset and one
user export. The fixture is derived from two ordinary 0.3.38 presets, both of
whose quartets pass the unchanged public verifier. The final research quartet
has its own explicit verifier and must not be labelled as passing the public
`fm3-preset.mjs --verify` interface.

| Record | Original binding | Candidate |
| --- | --- | --- |
| 0 | External 1 → Wah Control | Preserved |
| 1 | External 1 → Volume, range 2.5–7.5, Mid 25%, Attack 500 ms | Removed, then reused for CS2 → Amp Cut, normal full range, ALL channels, default curve |
| 2 | CS2 → Amp Input Boost, inverted, CHAN D | Removed; words 0, 8 and 9 cleared; all remaining words preserved |
| 3 | CS3 → Amp Bright, inverted, ALL | Preserved at record 3 |
| 4 | CS4 → Amp Fat, normal, CHAN D | Preserved at record 4 |

Record 2 remains a hole between active records. Reuse of record 1 writes only
words 0–20 from the exact generated Cut donor; its header and words 21–24 remain
unchanged. The final body differs from the generated seed in exactly 13 bytes.
The replacement resets nondefault range/curve values instead of carrying Volume
settings into a switch target. The fixed preimage guard rejects every other
body, occupied/secondary-source records, duplicate targets, unknown headers,
reserved-word changes and unapproved replacement templates.

Evidence: `fm3-modifier-removal-20261028.json` describes 652 initialized inactive
records, including 265 interior holes. T12 (`fm3-mod-steps-20261029.json`) confirms
Source NONE on Volume clears words 0 and 8 while preserving the others; its PID
word 9 was already zero. Thus T12 alone does not prove nonzero-PID clearing. This
candidate additionally exercises clearing the Input Boost PID 42. Firmware
runtime free-object search is not treated as serialized-slot allocation proof.

## Reproduce offline

Run from the repository root; use a new output stem outside the source tree:

```bash
node tools/fm3/test-p3-modifier-reuse.mjs
node tools/fm3/p3-modifier-reuse.mjs build /ABS/OUTPUT/FM3_P3_REMOVE_REUSE
node tools/fm3/p3-modifier-reuse.mjs verify /ABS/OUTPUT/FM3_P3_REMOVE_REUSE
node tools/fm3/p3-modifier-reuse.mjs compare /ABS/USER_EXPORT.syx
```

The comparator requires every modifier byte, gap, block byte, scene word and
system byte to match. It can normalize block order by unique effect ID only;
it does not ignore bypass changes or unknown-byte differences. Comparison alone
does not certify the user's import, STORE/reload or observations. Synthetic
exports in the tests are explicitly software evidence only.

## Completed device test protocol

Import `FM3_P3_REMOVE_REUSE.syx` to a spare user-selected location. This is a
structural/controller test; guitar audio is not needed. Leave the expression
pedal still, so Wah auto-engage does not change a stored bypass state.

1. Confirm the preset name and scene 1, `CUT OFF`. Read the modifier sources:
   Wah Control = External 1; Volume = NONE; Input Boost = NONE; Cut = Control
   Switch 2; Bright = Control Switch 3; Fat = Control Switch 4.
2. On Cut's Modify page confirm Min OFF, Max ON, Channel ALL, Mid 50.0%, Attack
   about 10.1 ms. The removed Volume range and custom curve must not remain.
3. Select scene 2, `CUT ON`: Amp channel A Cut should be ON. Return to scene 1:
   Cut should be OFF. This uses CS per scene; no footswitch assignment is needed.
4. STORE in scene 1, select another preset and return. Repeat source, Cut
   range/curve and scene checks, then return to scene 1 and STORE.
5. Export that stored preset once as `FM3_P3_REMOVE_REUSE_export.syx`, and provide
   it with the UI/STORE confirmation. Do not clear or recreate bindings manually.

If a field differs, retain that observation and export for analysis instead of
editing it to match. This successful test establishes the fixed generated
removal/reuse case; it does not prove FM3-Edit's own automatic slot allocation,
all 32 slots, other source/target families, audio, CPU or a general public API.


## Retained result

The [six evidence files](hardware-results/2026-10-30/p3-modifier-reuse/) contain
an unchanged original research quartet, the user export, and the completed
[receipt](hardware-results/2026-10-30/p3-modifier-reuse/FM3_P3_seadmekatse_kviitung_2026-10-30.json).
The original TXT/validation still say hardware pending because they describe the
pre-test state; the separate completed receipt records the later observation.

All 32 modifier records match byte for byte. Active records remain 0, 1, 3, 4;
record 2 remains an interior inactive hole. Source, effect and nonzero PID 42
were cleared in that removed Input Boost record, with every other word kept.
Record 1 retains the new CS2 → Cut binding, including its reset range and curve.

The 13,216-byte bodies differ only in block ordering: the FM3 placed Volume/Pan
(effect 102) before Wah (effect 94), exchanging block indices 9 and 10. Every
block byte, prefix, scene word and system-tail byte is preserved after this
ordering normalization. The raw SYX files and raw bodies are not byte-identical.
The user supplied a grouped confirmation of all five steps, rather than
separately transcribed numeric measurements. No audio or CPU result is inferred.

The existing test now replays the retained hardware export and checks the receipt
as well as the 47 synthetic rejection cases. Public distribution of these P3
files was explicitly authorized on 2026-10-30.

## 0.3.39 pakendatud regressioon

P3 fikseeritud kordustööriist asub nüüd mootoris
`engine/skills/instructions/scripts/fm3-p3-modifier-reuse.mjs`; repo CLI säilib
õhukese suunajana. Kuus tõendifaili on pakendatud muutmata kausta
`references/p3-modifier-reuse-20261030/`. Repo kontroll nõuab mõlema koopia
baittäpset vastavust. Katsele eelnenud 0.3.38 metaandmed säilivad ajaloolistena;
0.3.39 mootor kontrollib värskeid alg-/doonorkvartette ja taastab sama SYX-i.
Pakendatud `test-p3-modifier-reuse` kuulub 78 kohustusliku offline-testi hulka.
Avalik eemaldamise/taaskasutuse API jääb väljapoole selle väljalaske ulatust.
