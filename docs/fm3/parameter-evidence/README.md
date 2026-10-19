# FM3 parameter evidence registry

[Generated coverage report (Estonian)](coverage.md) · [Machine summary](coverage.json) · [Registry](registry.json) · [Work queue](work-queue.json)

Run from the repository root with Python 3.10+ and Node 22+; no npm installation or device connection is needed:

```sh
python3 tools/fm3/test-parameter-evidence.py
python3 tools/fm3/parameter-evidence.py
# After reviewing changed sources:
python3 tools/fm3/parameter-evidence.py --write
```

The default command replays the evidence and compares every generated output. CI fails on missing or changed evidence, mismatched GET/SYX words, unconfirmed or failed point records, duplicate dictionary keys, conflicting names, or stale generated outputs. The generator only reads local files. It does not authorize MIDI SET, LOAD, save, or import.

## Separate evidence axes

- **Identity:** union of the catalog's family/PID keys and the FM3 dictionary. All catalog row indices and names survive the join. In particular, the 22 `OLD_FLANGER_*` aliases do not inflate the unique-parameter denominator. Catalog-only families are not automatically declared available on FM3.
- **Metadata:** dictionary status is retained as a source claim. `taper-class-verified` is not an individual parameter measurement; neither `enum-labels` nor a model template establishes a complete continuous scale.
- **Points:** indexed Filter, PEQ, GEQ, Enhancer, Amp Level and Rotary changed-point records retain firmware, channel, model/type where recorded, value and raw word. Stored GET frames are parsed again with envelope, model, checksum, size and uint16 checks; all four channels are compared against the decompressed SYX. Fixed collector layouts are checked by block ID, word count and channel count. This is offline replay of existing evidence, not a new hardware test. Display semantics remain dependent on the operator's source confirmation.
- **Other observations:** Amp C/D exports without GET and taper-batch screen readings are distinct categories. Neither contributes to the paired-point total. Excluded attempts, skipped points and invisible controls remain visible without promotion.
- **Encoder:** policy and allowed base layouts are obtained from the shipped modules. Availability requires a supported kind, accepted status, matching effect ID and in-bounds PID. Default and opt-in controls remain distinct. This does not claim every model, value or channel has been measured. Composer capabilities are copied separately from their pinned declaration; inserted-block support is not implied by table-writer base availability.
- **Templates:** a source hash resolves to a checked file or a verified member of the compressed Amp history. This proves provenance presence; it is not an individual knob measurement or newly confirmed import. Amp library templates and the composer's broader declaration have separate counts.

## Reproducibility and references

`registry.json` contains stable source IDs resolving to repository paths, byte counts and SHA-256s. Observation pointers use RFC 6901. `catalogRows` index `data.FM3_PARAMS` in `packages/fractal-midi/catalog/fm3.json`; `dictionaryRow` indexes `params` in `fm3-param-dictionary.json`. Parameter `observations` index the registry's observation array. Template `syxSha256` resolves through `templateSourceBlobs`; paths with `#` identify an Amp archive member.

Input hashes, not the current checkout's HEAD, determine the generated content. The baseline commit records the audit's starting point. This avoids a self-referential generated commit hash; a release receipt must separately bind outputs to the final tested commit. No timestamps are generated.

## Explicit scope gaps

This is an evidence-indexing baseline, not a percentage of all FM3 features. Older Amp/Drive/Delay/Reverb scalar evidence and Rotary baseline points still require adapters. Zero indexed points means **not indexed**, not unmeasured or unsupported. The queue prioritizes reuse of existing evidence and automated tests before asking for new measurements. General routing, modifiers, controller assignments, CPU and audio need separate coverage models.

The existing private plugin and its published 0.3.2 package are unchanged. Registry files live outside the plugin package. A future release still requires exact-commit packaging, the offline suite, package self-check and fresh-chat launcher validation; hardware import/audio/CPU results must remain separate.
