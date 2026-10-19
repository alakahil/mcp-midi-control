# FM3 parameter evidence registry

[Generated coverage report (Estonian)](coverage.md) · [Machine summary](coverage.json) · [Registry](registry.json) · [Work queue](work-queue.json)

Run from the repository root with Python 3.10+ and Node 22+; no npm installation or device connection is needed:

```sh
python3 tools/fm3/test-parameter-evidence.py
python3 tools/fm3/test-six-field-resolution.py
python3 tools/fm3/six_field_resolution.py
python3 tools/fm3/test-type-applicability.py
python3 tools/fm3/type_applicability.py
python3 tools/fm3/test-parameter-dependencies.py
python3 tools/fm3/parameter_dependencies.py
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

The installed private plugin remains at 0.3.2. The PR now includes a 0.3.3 source candidate fixing rejection of nonpositive logarithmic inputs; it is not a published release. Registry and matrix outputs live outside the plugin package. A future release still requires exact-commit packaging, the offline suite, package self-check and fresh-chat launcher validation; hardware import/audio/CPU results must remain separate.

## Metadata reconciliation and software matrix

[Metadata reconciliation](metadata-reconciliation.md) classifies all one-sided keys, retains aliases, compares independently authored FM3 ranges and identifies unnamed writable fields and repeated enum labels. Classification is not resolution of unknown semantics. The two DynaCab scale representations are now reconciled against the original FW13 cache: the generator uses 0..10 display units, while the historical 0..100 source is preserved as normalized-percent evidence. Four missing symbols are resolved from FM3-Edit 1.07.17 itself. Drive Oversampling is present in descriptors/cache but all five UI controls are comments, so scalar and experimental raw writes are blocked. See [six-field-resolution.json](six-field-resolution.json) and the packaged [explanation](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_METADATA_RESOLUTION.md).

[Encoder matrix](encoder-matrix.json) tests every table-eligible parameter's scalar policy, fixed normalized-position anchors, all option indices/labels, invalid inputs and roundtrips. It also replays the already indexed measurements; PEQ slope values use their explicit dB/OCT option label. It runs three batched writes on every bundled base across all A-D slots, independently calculates offsets and expected raw values, and checks the complete output body for collateral changes. Batched software presets are kept in memory and are not supplied for device import.

The matrix distinguishes passed software checks from unresolved source-scale conflicts and from hardware validation. Chorus/Drive batch writes now follow the FW13 final-channel type policy: incompatible candidates are counted as exclusions, not successful writes. Scalar conformance remains separate. The 21 tempo dependencies and existing modifier targets now gate explicit writes too: 577 tempo and 72 modifier exclusions are separate from 856 type exclusions, leaving 42,907 accepted writes. Effective BPM/controller evaluation, other-family visibility, arbitrary presets, audio and CPU remain outside this matrix. Changing the matrix or its inputs requires regeneration in the command order above.

The bounded type policy is documented in the packaged `engine/docs/FM3_TYPE_APPLICABILITY.md`. Reproduce extraction with `python3 tools/fm3/type_applicability.py --editor /path/to/FM3-Edit.exe`; without `--editor`, verify the committed receipt against its pages, native name/PID bindings, dictionary and FW13 cache. `test-type-applicability.py` covers compiler failures, and the packaged Node regression reuses all 114 captured Chorus/Drive type templates on A–D. No new hardware measurements are inferred from either check.

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
