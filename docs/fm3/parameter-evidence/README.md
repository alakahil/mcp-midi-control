# FM3 parameter evidence registry

Current modifier research (2026-10-22): [MODE1 stack-slot provenance and five unresolved buffer-alias premises](modifier-frame-result.md),
[frame audit](modifier-frame-audit.json), [4 native checkpoints](modifier-frame-checkpoints.json),
[MMASK push semantics, direct MODE1 memory load and expanded context-write inventory](modifier-context-result.md),
[context audit](modifier-context-audit.json), [7 native checkpoints](modifier-context-checkpoints.json),
[MODE1 writer candidates, rejected operand hits and three additional leaf contracts](modifier-writers-result.md),
[writer audit](modifier-writers-audit.json), [3 new native checkpoints](modifier-writers-checkpoints.json),
[82c228 table-init scope, four new MODE1 helpers and a 44-call constructor catalog](modifier-table-result.md),
[table-init audit](modifier-table-audit.json), [6 native checkpoints](modifier-table-checkpoints.json),
[guarded buffer MODE1 contracts, nonreturn boundaries and one remaining 82fe42 dependency](modifier-buffer-result.md),
[buffer audit](modifier-buffer-audit.json), [7 native checkpoints](modifier-buffer-checkpoints.json),
[closed SID52 initializer, MODE1 math leaf and symbol-bound independent ADI DXE](modifier-init-result.md),
[initializer audit](modifier-init-audit.json), [native inventory and independent source](modifier-init-checkpoints.json),
[loaded SECI vector, matching registration/dispatch layout and conditional selected-task MODE1 return](modifier-interrupt-result.md),
[interrupt audit](modifier-interrupt-audit.json), [11 native checkpoints](modifier-interrupt-checkpoints.json),
[compact-return manual conflict, independent ADI binary comparison and located RTI candidate](modifier-return-result.md),
[return audit](modifier-return-audit.json), [sources and native checkpoints](modifier-return-checkpoints.json),
[PID0x3a16 op10 route and inherited return-opcode uncertainty](modifier-op10-result.md),
[specialized route audit](modifier-op10-audit.json), [route checkpoints](modifier-op10-checkpoints.json),
[two closed MODE1 caller scopes and a known timer callback](modifier-caller-result.md),
[caller audit](modifier-caller-audit.json), [source/flow checkpoints](modifier-caller-checkpoints.json),
[bounded in-memory Min/Max SYX candidate](modifier-minmax-syxdiff-result.md),
[35-case byte-diff audit](modifier-minmax-syxdiff-audit.json),
[coreTask context and the 6.47 boundary](modifier-scheduler-result.md),
[scheduler/cent-grid audit](modifier-scheduler-audit.json),
[L1 math helpers, MODE1 preservation and guarded offline candidate](modifier-mode-result.md),
[MODE1 audit](modifier-mode-audit.json), [source checkpoints](modifier-mode-checkpoints.json),
[op82 transport and arithmetic precision](modifier-transport-result.md),
[transport/precision audit](modifier-transport-audit.json),
[input methods and 3/3 conditional drag model](modifier-drag-result.md),
[drag audit](modifier-drag-audit.json), [new Mac REA/Ghidra batch findings](modifier-rea-batch-result.md),
[audit](modifier-rea-batch-audit.json), and [source/checkpoint hashes](modifier-rea-batch-checkpoints.json).
This section records the historical 0.3.13 research and identifies drag and step input paths;
it does not establish complete Min/Max encoding or enable generator writes.
Version references in older sections below describe their historical work.

[Generated coverage report (Estonian)](coverage.md) · [Machine summary](coverage.json) · [Registry](registry.json) · [Work queue](work-queue.json)

[FW13 global-scale numeric-cache research](global-scale-cache-fw13.md) records
the bounded constructor/range-gate findings and a firmware-dependent check.
It does not promote hardware confidence or change the shipped plugin runtime.

Run from the repository root with Python 3.10+ and Node 22+; no npm installation or device connection is needed:

```sh
python3 tools/fm3/test-parameter-evidence.py
python3 tools/fm3/test-six-field-resolution.py
python3 tools/fm3/six_field_resolution.py
python3 tools/fm3/test-type-applicability.py
python3 tools/fm3/type_applicability.py
python3 tools/fm3/test-parameter-dependencies.py
python3 tools/fm3/parameter_dependencies.py
python3 tools/fm3/test-delay-reverb-applicability.py
python3 tools/fm3/delay_reverb_applicability.py
python3 tools/fm3/test-modulation-dynamics-applicability.py
python3 tools/fm3/modulation_dynamics_applicability.py
python3 tools/fm3/test-pitch-word-codecs.py
python3 tools/fm3/pitch_word_codecs.py
python3 tools/fm3/test-rotary-pitch-applicability.py
python3 tools/fm3/rotary_pitch_applicability.py
python3 tools/fm3/parameter-evidence.py
python3 tools/fm3/metadata_reconciliation.py
node tools/fm3/encoder-matrix.mjs
# After reviewing changed sources:
python3 tools/fm3/parameter-evidence.py --write
python3 tools/fm3/metadata_reconciliation.py --write
node tools/fm3/encoder-matrix.mjs --write
```

The default command replays the evidence and compares every generated output. CI fails on missing or changed evidence, mismatched GET/SYX words, unconfirmed or failed point records, duplicate dictionary keys, conflicting names, or stale generated outputs. The generator only reads local files. It does not authorize MIDI SET, LOAD, save, or import.

## Separate evidence axes

- **Identity:** union of the catalog's family/PID keys and the FM3 dictionary. All catalog row indices and names survive the join. In particular, the 22 `OLD_FLANGER_*` aliases do not inflate the unique-parameter denominator. Catalog-only families are not automatically declared available on FM3.
- **Metadata:** dictionary status is retained as a source claim. `taper-class-verified` is not an individual parameter measurement; neither `enum-labels` nor a model template establishes a complete continuous scale.
- **Points:** indexed Filter, PEQ, GEQ, Enhancer, Amp Level, Drive type/control, Rotary baseline and changed-point records retain firmware, channel, model/type where recorded, value and raw word. Stored GET frames are parsed again with envelope, model, checksum, size and uint16 checks; all four channels are compared against the decompressed SYX. Fixed collector layouts are checked by block ID, word count and channel count. This is offline replay of existing evidence, not a new hardware test. Display semantics remain dependent on the operator's source confirmation.
- **Other observations:** Amp Gain/Bass, G5/TONE/TIME returns, six Drive edits and Amp C/D exports without GET stay separate from GET/SYX pairs and taper-batch screen readings. Historical requested/display values remain distinct from decoded floating-point values. Legacy exports replay the exact whole-body delta or require an isolated two-byte change, and verify the block layout, channel and model. Drive paired steps also replay the original collector comparison; failed/skipped attempts never become points. Rotary baseline readings and its carried Rate 2 state retain their different acquisition scopes. Neither contributes to the paired-point total. Excluded attempts, skipped points and invisible controls remain visible without promotion.
- **Encoder:** policy and allowed base layouts are obtained from the shipped modules. Availability requires a supported kind, accepted status, matching effect ID and in-bounds PID. Default and opt-in controls remain distinct. This does not claim every model, value or channel has been measured. Composer capabilities are copied separately from their pinned declaration; inserted-block support is not implied by table-writer base availability.
- **Templates:** a source hash resolves to a checked file or a verified member of the compressed Amp history. This proves provenance presence; it is not an individual knob measurement or newly confirmed import. Amp library templates and the composer's broader declaration have separate counts.

## Reproducibility and references

`registry.json` contains stable source IDs resolving to repository paths, byte counts and SHA-256s. Observation pointers use RFC 6901. `catalogRows` index `data.FM3_PARAMS` in `packages/fractal-midi/catalog/fm3.json`; `dictionaryRow` indexes `params` in `fm3-param-dictionary.json`. Parameter `observations` index the registry's observation array. Template `syxSha256` resolves through `templateSourceBlobs`; paths with `#` identify an Amp archive member.

Input hashes, not the current checkout's HEAD, determine the generated content. The baseline commit records the audit's starting point. This avoids a self-referential generated commit hash; a release receipt must separately bind outputs to the final tested commit. No timestamps are generated.

## Explicit scope gaps

This is an evidence-indexing baseline, not a percentage of all FM3 features. The selected older Amp/Drive/Delay/Reverb scalar evidence and Rotary baseline points are now indexed. Remaining historical reports and compressed Amp sources still need review for additional explicit observations. Zero indexed points means **not indexed**, not unmeasured or unsupported. The queue prioritizes reuse of existing evidence and automated tests before asking for new measurements. General routing, modifiers, controller assignments, CPU and audio need separate coverage models.

The earlier 0.3.3 logarithm fix is historical. The current source prepares 0.3.25; publication is established by its separate exact-commit CI and release readback. Registry and matrix outputs live in the repository; the package includes a derived, pinned parameter evidence index. Hardware import/audio/CPU results remain separate.

## Metadata reconciliation and software matrix

[Metadata reconciliation](metadata-reconciliation.md) classifies all one-sided keys, retains aliases, compares independently authored FM3 ranges and identifies unnamed writable fields and repeated enum labels. Classification is not resolution of unknown semantics. The two DynaCab scale representations are now reconciled against the original FW13 cache: the generator uses 0..10 display units, while the historical 0..100 source is preserved as normalized-percent evidence. Four missing symbols are resolved from FM3-Edit 1.07.17 itself. Drive Oversampling is present in descriptors/cache but all five UI controls are comments, so scalar and experimental raw writes are blocked. See [six-field-resolution.json](six-field-resolution.json) and the packaged [explanation](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_METADATA_RESOLUTION.md).

[Encoder matrix](encoder-matrix.json) tests every table-eligible parameter's scalar policy, fixed normalized-position anchors, all option indices/labels, invalid inputs and roundtrips. It also replays the already indexed measurements; PEQ slope values use their explicit dB/OCT option label. It runs three batched writes on every bundled base across all A-D slots, independently calculates offsets and expected raw values, and checks the complete output body for collateral changes. Batched software presets are kept in memory and are not supplied for device import.

The matrix distinguishes passed software checks from unresolved source-scale conflicts and from hardware validation. Chorus/Drive, Delay/Reverb and Flanger/Phaser/Compressor/Wah/Tremolo batch writes follow the FW13 final-channel type/algorithm policy: incompatible candidates are counted as exclusions, not successful writes. Scalar conformance remains separate. The 21 tempo dependencies and existing modifier targets gate explicit writes too. The current counts are recorded in `encoder-matrix.json.summary`; they are regenerated from the actual runtime. Model/internal-selector exclusions require full templates. The type/authoring count includes dynamic/fixed slots as well as visibility. Effective BPM/controller evaluation, other-family visibility, arbitrary presets, audio and CPU remain outside this matrix. Changing the matrix or its inputs requires regeneration in the command order above.

The bounded type policy is documented in the packaged `engine/docs/FM3_TYPE_APPLICABILITY.md`. Reproduce extraction with `python3 tools/fm3/type_applicability.py --editor /path/to/FM3-Edit.exe`; without `--editor`, verify the committed receipt against its pages, native name/PID bindings, dictionary and FW13 cache. `test-type-applicability.py` covers compiler failures, and the packaged Node regression reuses all 114 captured Chorus/Drive type templates on A–D. No new hardware measurements are inferred from either check.

The separate `engine/docs/FM3_DELAY_REVERB_APPLICABILITY.md` documents model/internal-selector bindings and Spring Tank Type conditions. Reproduce with `python3 tools/fm3/delay_reverb_applicability.py --editor /path/to/FM3-Edit.exe`; normal CI verifies the pinned receipt/cache/templates. The new regression covers all 106 captured Delay/Reverb templates on A–D: 24,484 accepted writes, 5,752 inapplicable writes rejected and 848 full-template requirements checked. Model/internal-selector scalar or raw writes are rejected. The XML-derived unqualified-page fallback is an explicit authoring policy, not execution of native UI logic; XML-only Reverb IDs 9/10 remain unsupported. No dictionary scale or hardware evidence is promoted.

The next `engine/docs/FM3_MODULATION_DYNAMICS_APPLICABILITY.md` adds 31 Flanger, 17 Phaser and 19 Compressor models, checked through 105 individual native descriptors. Reproduce with `python3 tools/fm3/modulation_dynamics_applicability.py --editor /path/to/FM3-Edit.exe`. Its 67 templates on A–D pass 7,468 accepted / 984 rejected writes and 336 full-template requirements. Phaser visibility uses Mode PID 17; Compressor Type is PID 12. Current Flanger names resolve to native PIDs while preserving exact old names: current MANUAL is PID 5, whereas OLD_FLANGER_MANUAL remains PID 6 (Dry Delay). Full templates are required for those models and Phaser Mode. Read-only meters and unused fields remain blocked; automatic compressor timing/makeup and DSP dynamics remain separate work.

The six-field check replays the already bundled FW13 cache without network access.
To repeat direct PE64 descriptor mining and XML comment/condition analysis, obtain
the pinned official FM3-Edit 1.07.17 executable and run:

```sh
python3 tools/fm3/six_field_resolution.py --editor /path/to/FM3-Edit.exe
```

Only the reviewed metadata, offsets, hashes and reproduction code are stored;
the vendor executable, full layout XML and raw decompile listings are not added.
The editor is read as bytes and never executed. The no-editor CI path replays
the cache and checks the recorded bindings against the dictionary; it does not
claim to repeat PE extraction without the binary.

The packaged `engine/docs/FM3_PARAMETER_DEPENDENCIES.md` records the nine-family tempo scope and read-only modifier profile. Reproduce the receipt with `python3 tools/fm3/parameter_dependencies.py --editor /path/to/FM3-Edit.exe`; normal CI checks the pinned receipt/cache/dictionary without redistributing or executing the editor. The 32 serialized records do not imply 32 usable modifiers. Synthetic tests are not new device evidence.

`engine/docs/FM3_WAH_TREMOLO_APPLICABILITY.md` extends that shared receipt to 9 Wah and 7 Tremolo/Panner models, with 47 additional native bindings. Paragon excludes Bias/Fat/Q Tracking; Panner, Harmonic and Neon use distinct pages. All model changes require full templates. Existing Wah pedal and Tremolo tempo guards remain active; no new measurements are required.
The additional 16-template A–D regression passes 1,260 accepted writes, 136 visibility refusals and 64 full-template requirements. The combined policies now cover nine families and 303 captured templates; this remains bounded authoring coverage, not full FM3 or DSP validation.

`engine/docs/FM3_ROTARY_PITCH_APPLICABILITY.md` covers type-free Rotary (PID 0 is Rate) and 16 Pitch templates, using 135 native bindings. Pitch TYPE requires full templates. **27 discrete/enum conflicts now use a pinned preset-word overlay**: 20 signed integers, five direct integers and two enums starting at ID 1. Seven dynamic note selectors and fixed/unused slots stay blocked. `openScaleConflicts` is the separate metadata-reconciliation report, not a complete unresolved-semantics inventory. Current policies cover 11 families and 319 captured templates, excluding model-free Rotary.
The updated regression passes 2,152 accepted Pitch writes / 4,440 authoring refusals / 64 template requirements across 16 models A–D, plus 80 Rotary writes and 80 dynamic/fixed raw refusals. `engine/docs/FM3_PITCH_WORD_CODECS.md` records the exact overlay, official factory source hashes, older-format read-only adapter, 432 selected factory words and FW13 metadata/native bindings. Original dictionary claims and 899 historical observations remain unchanged; `effectiveKind` and `effectiveStatus` record encoder policy separately. Global scales, dynamic notes, repeat-code display labels and controller dynamics remain separate work. The 1,175-value codec regression and 254 rejected inputs do not imply new hardware measurements. No user actions are needed.

## Audit point 3 — 0.3.24

The [parameter map](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_POINT3_PARAMETERS.md) exposes effective scales, authoring gates and historical observations through `fm3-preset.mjs --parameter-map`. The 3223-key union preserves catalog-only gaps. A query never grants write permission. `dictionary` and `effective` remain distinct, and the two unrequested Pitch labels are explicit.

[Point-3 evidence](point3-parameter-map.json) records exhaustive finite-word codec checks, malformed word refusals, all named lookups and source hashes. Regenerate in this order after reviewed source changes: evidence-index, parameter-evidence, metadata_reconciliation, point3-index; update the derived index pin in fm3-parameter-map.mjs, then run point3-evidence. The derived index is in engine/docs so the source evidence inventory does not recursively include its own derivative.

## Audit point 5 — 0.3.25

[Grid inspection](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_GRID.md) adds `fm3-preset.mjs --inspect-grid PRESET.syx [--format json|txt]`. The report preserves all raw mask bits, traces known previous-column cables and distinguishes incomplete record scans. It does not infer physical/global routing or enable arbitrary preset writes. The output verifier now accepts a correctly isolated Scene MIDI cell next to an audio cell.

[Point-5 evidence](point5-grid-audit.json) binds exhaustive masks/adjacent-column cases, independent graph traversal, original seven wire replies, malformed input and refreshed-hash cases, and the bundled preset corpus. [Factory replay](point5-factory-grid.json) repeats all 384 pinned factory grids locally, retaining aggregates only. Its code/source hashes are checked in CI; the factory banks are not downloaded by CI or redistributed. Eight cells retain unknown bit 4 (six merges, two single-input cells).

Run `node tools/fm3/point5-evidence.mjs` to check the derived report; use `--factory FACTORY_DIR --write` after reviewing changes to the factory replay's source bindings. No new device, REA/Ghidra, audio/CPU, In 2/Out 2 authoring, FOH+monitor, 4CM or global I/O result is claimed.
