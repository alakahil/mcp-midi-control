# Point 4: offline lifecycle evidence, 0.3.21

This batch uses the existing 23 October REA export and new local static analysis.
It performs no new REA service invocation, firmware execution, device I/O,
import, SET, STORE, or audio measurement. The native binaries are inputs to
local verification; this repository publishes derived coordinates and hashes.

## What was resolved

| Question | Bounded native finding | Remaining boundary |
|---|---|---|
| Create dispatch | Editor internal operation 58; conditional ARM forwarder `0xc441bf38`; SHARC dispatch `0x829ca8` calls `0x814536` | Earlier ARM local handling can consume a request; this is not a public MIDI command recipe |
| Free-object search | `0x813d9f` examines 32 runtime objects in order; first cached Source at object + `0x200` equal to zero wins; no match returns null | Runtime cache is not a serialized-slot allocation permission or a hardware capacity guarantee |
| Identity | Runtime objects have 712-byte stride; raw parameter records have 50-byte stride and wire IDs start at 3 | Neither stride is the 96-byte serialized header-plus-parameters record |
| Creation | Set target effect (PID8), target PID (PID9), then apply 21 descriptor defaults through callback operation 9 | Defaults are physical callback inputs, not uint16 preset words; PID18/19 are outside this reset list |
| Removal | `0x8145d7` accepts IDs 3–34; sets Source (PID0) to zero, conditionally notifies the target, then clears target effect (PID8) | No whole-record memset; PID9 is not explicitly cleared; reallocation preservation is not fully proven |
| Editor coordination | Existing-ID Source NONE also queues operation59; new Source waits for the returned ID before sending its pending parameter request | Setting just Source NONE in a preset does not implement the editor's removal sequence |

Initialization order is `[0,1,2,3,4,5,6,13,14,7,15,10,12,11,16,17,20,21,22,23,24]`.
For example, the Min/Max descriptor inputs −100 and 20000 pass through the
target-dependent callback. Copying them as serialized integers would be wrong.
The new evidence does not transfer Wah's codec or measured points to Volume.

`modifier-lifecycle-checkpoints.json` pins 14 firmware/data spans, firmware and
loader SHA-256, editor SHA-256 and the previous REA receipt. The replay checks
selected instruction operands and those hashes, including two complete editor
function bodies. Register liveness, branches and call meaning also depend on
the explicitly stated manual data-flow review. This is not a complete CFG proof
or an emulator. The exploratory SHARC214xx model lacks some SHARC+ forms;
scaled modifications and subword accesses were checked with independent decoders
and the Analog Devices manual (LEFTZ/SV, p.29-5; Type19a, p.17-4–17-6).

Input sources:

- Fractal FW13: <https://www.fractalaudio.com/downloads/firmware-presets/fm3/13p0/fm3_dsp_rel_13p0.zip>
- Analog Devices PRM: <https://www.analog.com/media/en/dsp-documentation/processor-manuals/SC58x-2158x-prm.pdf>
- Exploratory language model: <https://github.com/roblg/ghidra-sharc/tree/f4ebdfa7865241249dc8c918291ee55ea4af5a13>
- Existing REA archive SHA-256 `872db78e6a487a97247e7acf9d94392696bd1099cbf481a8ed442507e1a41b7d`, summarized in `volume-pedal-rea-result.json`.

## Corpus and runtime audit

The packaged corpus has 795 file paths, 638 unique contents, 628 accepted modern
`0x0146` files and 10 unsupported older files. All 220 active modern records
are in slot0; no accepted file has two active records, an active secondary-only
record, or simultaneous Wah Control and Volume Gain bindings. These counts include
generated examples and aliases; they are not 638 independent device observations.
`volume-pedal-legacy.json` separately describes older formats, including a later
record targeting Volume Balance. That is not a FW13 Volume Gain donor.

The runtime audit retains its existing conservative rule: a nonzero primary OR
secondary source is active. New fields distinguish primary-only, secondary-only,
both, and neither; source-zero observations are not called free slots. External
controller references include record and primary/secondary role, while current
global mapping and value remain unknown. The TXT family count now comes from
the same 16-family policy as JSON. Existing exact-body writers remain bounded
to their individually proven first-record configurations.

## Reproduction

```bash
python3 tools/fm3/modifier_lifecycle_audit.py --firmware /ABS/fm3_dsp_rel_13p0.syx --editor /ABS/FM3-Edit-arm64
node tools/fm3/modifier-corpus-audit.mjs
python3 tools/fm3/point4-evidence.py
node plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/skills/instructions/scripts/test-modifier-audit.mjs
```

The corpus and packaged-summary freshness checks run in CI without native
binaries. They do not claim to rerun the separate firmware/editor replay.
The full runtime suite checks existing writer restrictions and final artifacts.

## Completion boundary

This closes the defined offline batch: native lifecycle localization, corpus
inventory, explicit runtime audit states, controller-reference tracing and a
point-4 evidence/gap table. It does not claim that every possible static research
avenue is exhausted. Further offline research could emulate all target callback
conversions and import/cache initialization, or inspect an existing global backup
if supplied. Those are unresolved evidence questions, not enabled capabilities.
The packaged [point-4 table](../../../plugins/fm3-sound-architect-2/skills/fm3-sound-architect-2/engine/docs/FM3_POINT4_OFFLINE.md)
is the current scope statement; the 0.3.20 slot-readiness receipt remains historical.
