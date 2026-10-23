# Wah Min/Max: bounded in-memory SYX candidate, 2026-10-22

Production remains **0.3.13**. This is research code outside the shipped plugin.
It creates synthetic buffers in memory and returns an audit, never a preset
buffer or importable SYX file. **No new device exports, imports or MIDI calls.**
The existing engine's measured-point lookups are unchanged.

## Result and input contract

**35/35 preset comparisons passed** on five pinned existing captures. Each
capture was tested with Min-only 2.50, Max-only 7.50, Max-only 5.00, combined
2.50/7.50, endpoints 0.00/10.00, 6.46/10.00, and 0.00/6.48 requests.
The complete decompressed body equals the original with only explicitly
requested uint16 words replaced. The target, all scene data, other modifier
words/records, blocks and system tail remain byte-identical.

The **proposed**, explicitly opted-in `exact-wah-cent-v1` policy accepts decimal
strings `0.00` through `10.00`, step `0.01`. It divides the exact rational by
10, chooses nearest-even float32 (independently checked against exact rational
neighbor distances), then requires agreement across all four modeled op82
arithmetic modes. It is **not** a recovered editor keyboard/drag rule and does
not infer a request from a historical displayed number.

| Explicit request | Normalized float32 bits | Candidate raw | Existing drag measurement with this display |
|---|---|---:|---:|
| Min `2.50` | `0x3e800000` | 16384 | 16375 |
| Max `7.50` | `0x3f400000` | 49151 | 49159 |
| Max `5.00` | `0x3f000000` | 32767 | 32784 |
| `6.47` | `0x3f25a1cb` | **rejected**: 42401 vs 42400 | not a new measurement |

All **1001** exact cent requests were tested: **1000 admitted**, only **6.47
rejected**. Rejection follows the arithmetic comparison, not a hard-coded
exception. Rejection also applies when 6.47 is the second field of a batch;
no partial change is returned. Adjacent requests 6.46 and 6.48 yield 42335 and
42466 respectively and were included in the SYX matrix. This covers a proposed
discrete input set, not every float32, every UI state or the continuous range.

An omitted field is retained as its existing raw word. For example, changing
only Min leaves a historical Max raw 49159 or 32784 intact. Explicitly asking
for exact Max `7.50` intentionally selects candidate 49151; it does not correct
or replace the historical evidence. Numeric JSON values, loosely formatted
strings, unknown policy/fields, raw overrides and alternate targets are rejected.

## Source and serialized-field scope

The only accepted sources are these complete SHA-256-pinned captures, checked
again for structural integrity and the target binding. Hashes are in the
[machine audit](modifier-minmax-syxdiff-audit.json) and source allowlist.

| Capture | Retained initial Min raw | Retained initial Max raw |
|---|---:|---:|
| `FM3_MOD_DAMPING_LINEAR_export.syx` | 0 | 65534 |
| `FM3_MOD_MIN_2p50_export.syx` | 16375 | 65534 |
| `FM3_MOD_BATCH_A_export.syx` | 16375 | 49159 |
| `FM3_MOD_BATCH_B_export.syx` | 16375 | 49159 |
| `FM3_MOD_MAX_5p00_export.syx` | 16375 | 32784 |

Target: record 0, External 1 (14) → Wah 1 (effect 94), Control (PID 5),
channel **ALL (0)**. MOD_MIN is record word/PID 1 at decompressed body offset
**1586**, MOD_MAX word/PID 2 at **1588**, both uint16 little-endian. These are
body coordinates, **not offsets in the compressed SYX file**. Coordinates are
cross-checked against record header 1538, 25 words, one record channel, reader
offset 1584, and the existing metadata-backed target audit. ALL does not imply
that every scene is enabled or audible; scene channel/bypass words are retained.

## Why raw SYX byte counts are not field-isolation evidence

Even reencoding **unchanged** decompressed contents with the existing codec
changes serialized bytes relative to the original native export:

| Capture suffix | Changed SYX bytes with no body edit |
|---|---:|
| DAMPING_LINEAR | 2442 |
| MIN_2p50 | 4619 |
| BATCH_A | 5076 |
| BATCH_B | 4856 |
| MAX_5p00 | 5035 |

All five compression controls decode to exactly the original body and pass
frame/CRC/footer checks. The 34 changed candidates differ at 4851–6196 serialized
bytes but only 1–4 decompressed bytes. The endpoint request on the original
0/65534 fixture is an exact no-op and preserves **all original SYX bytes**.
In particular 0x0000 → 0x4000 changes only the high byte, so two requested words
need not imply four changed bytes.

Every candidate is reparsed; all frame checksums, preset CRC and footer XOR
must pass. Dump headers remain identical. Raw header changes are allowed only
at CRC bytes 4–5 and compressed-length bytes 74–75; both raw paddings must be
zero. Full-body equality to an independently assembled expected body prevents
compensating or distant changes from hiding behind these checks. The input
buffer and on-disk capture hashes are verified unchanged.

## Checks and reproducibility

New tests: **6 Python + 8 Node = 14**. Reused numerical/mode tests:
**9 mode + 5 transport + 7 scheduler = 21**. Total **35 passing tests**,
separate from the **35 preset matrix cases**. The generated JSON audit replay
passes. This is targeted offline validation, not a new full CI run.

Adversarial cases cover wrong/unrecognized source, alternate source/target/
channel, implicit display coercion, ambiguous batched input, wrong Min raw,
every other word of the modifier, a different modifier record, distant body
bytes, preset rename, frame corruption and truncation. The CLI supports only
audit replay or writing its fixed JSON audit; a preset output argument fails.

```sh
python3 tools/fm3/test-modifier-minmax-plan.py
node --test tools/fm3/test-modifier-minmax-syxdiff.mjs
python3 tools/fm3/test-modifier-mode.py
python3 tools/fm3/test-modifier-transport.py
python3 tools/fm3/test-modifier-scheduler.py
node tools/fm3/modifier-minmax-syxdiff.mjs
# After reviewing changed evidence/code; writes JSON only:
node tools/fm3/modifier-minmax-syxdiff.mjs --write
```

Implementation: `tools/fm3/modifier_minmax_plan.py` and
`tools/fm3/modifier-minmax-syxdiff.mjs`. They reuse the earlier exact op82 model
and existing preset codec/auditor. The shipped plugin does not import them.

## Uncertainties and next step

`runtimeModeAtStoreProven=false`, `fullRangeEncodingProven=false`, and
`generatorWriteSupportAdded=false`. Agreement among four arithmetic models
does not prove complete live firmware state, device import, displayed value,
parameter interaction, DSP behavior, pedal operation, audio or CPU use.
The five sources are a provenance limit, not arbitrary-preset support.

This is new offline software work using previous static REA/Ghidra and firmware
results. **No new REA decompilation** was performed. The earlier successful Mac
REA run remains available evidence; it is not relabeled as a new run.

The bounded candidate is now prepared and reviewable. The next zero-export
step is to narrow the outstanding coreTask call/interrupt scopes listed in
[the scheduler result](modifier-scheduler-result.md), starting with explicit
MODE1 changes and reachable callees. Keep 6.47 blocked until that proof closes
or a controlled test establishes the exact float32 input and raw result.
A display-only drag to 6.47 would not settle it. No new physical export is
needed for the completed software comparison or proposed static next step.
