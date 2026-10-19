# FM3 parameter evidence registry

[Generated coverage report (Estonian)](coverage.md) · [Machine summary](coverage.json) · [Registry](registry.json) · [Work queue](work-queue.json)

Run from the repository root with Python 3.10+ and Node 22+; no npm installation or device connection is needed:

```sh
python3 tools/fm3/test-parameter-evidence.py
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

[Metadata reconciliation](metadata-reconciliation.md) classifies all one-sided keys, retains aliases, compares independently authored FM3 ranges and identifies unnamed writable fields and repeated enum labels. Classification is not resolution of unknown semantics. Two DynaCab R1/R2 scale conflicts remain open; no dictionary range is changed by this audit.

[Encoder matrix](encoder-matrix.json) tests every table-eligible parameter's scalar policy, fixed normalized-position anchors, all option indices/labels, invalid inputs and roundtrips. It also replays the already indexed measurements; PEQ slope values use their explicit dB/OCT option label. It runs three batched writes on every bundled base across all A-D slots, independently calculates offsets and expected raw values, and checks the complete output body for collateral changes. Batched software presets are kept in memory and are not supplied for device import.

The matrix distinguishes passed software checks from unresolved source-scale conflicts and from hardware validation. It does not establish type visibility, DSP validity, arbitrary-preset support, audio or CPU behavior. Changing the matrix or its inputs requires regeneration in the command order above.
