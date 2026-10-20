# Pitch display codes: FM3 firmware 13.0

This development step adds three display mappings without a new device session.
The installed private plugin remains 0.3.3; this source is 0.3.4-dev.

| Parameter | Stored word / old numeric input | Display and new label input |
| --- | --- | --- |
| PITCH_NUMREPEATS (74) | 1–30 | 1–30 |
| PITCH_NUMREPEATS (74) | 31 | INFINITE |
| PITCH_CUSTOMSCALE1/2 (71/72) | 0–31 | SCALE 1–SCALE 32 |

Numbers preserve the 0.3.3 storage semantics. In particular numeric `31` still
selects global scale 32; `"SCALE 31"` selects stored index 30. `SCALE` is our
explicit input namespace; the firmware computes the displayed scale **number**.
The original 2892-entry dictionary is unchanged. The existing 27-field overlay
carries the three added display rules. Runtime output retains the raw word.

## Reproducible evidence

Source: [official FM3 13.0 firmware archive](https://www.fractalaudio.com/downloads/firmware-presets/fm3/13p0/fm3_dsp_rel_13p0.zip).
Archive SHA-256: `57411091d68e39928099c84dab47c7e032eaafa7d46d4567755e20c3c8b0325f`.
SYX SHA-256: `239fd73a2a39eb02789632b9f2dc47a88c174f5dd7fd8946b4ce60097a11ee8d`.
Unpacked boot stream SHA-256: `a12e2be85f0e7dbb29255e04d0ec86381d4a4ac6cd308d3c5650a187d6d905c3`.

`tools/fm3/pitch_display.py --firmware /path/fm3_dsp_rel_13p00.syx`
checks the pinned firmware, every SysEx XOR checksum, 14-bit word counts,
five-septet uint32 packing and all 6405 boot headers, then reproduces the receipt.
It neither executes firmware nor connects to a device. Full firmware and editor
binaries are not distributed in the repository. The small receipt contains the
necessary dispatch table, instruction excerpts and label with exact offsets.

The display-update routine's PID table has 114 entries, matching the established
FM3 Pitch domain (cache section 23 and native PITCH symbol bindings). Its indexed
dispatch at VISA address 0x819deb uses table 0x2e6bac (unpacked file 0x125828).
The critical branches are:

| PID | Target | Bounded operation |
| --- | --- | --- |
| 71 | 0x81a2c1 | Read R2 from object field 0x4e4; compute R2 + 1 for integer formatting |
| 72 | 0x81a2e1 | Same computation from object field 0x4e5 |
| 74 | 0x81a308 | Read field 0x4f7; compare against 30; delayed GT branch keeps INFINITE label; finite path formats the count |

The repeat branch loads the label at 0x2e6b98 (file 0x125814). FW13 cache bounds
the stored integer to 1–31, so the sole supported code greater than 30 is 31.
Cache fields 71/72 are 0–31. Their tail flags 17 and repeat flag 16 are retained
as raw metadata; **this change does not claim to decode those flags generally**.
The proof is a narrow static cross-check, not whole-firmware emulation or a new
hardware sweep. Negative tests alter the actual compare, add, branch, pointer,
label, table and dispatch-bound bytes and require rejection.

Instruction interpretation was checked against the primary
[SHARC+ Core Programming Reference](https://www.analog.com/media/en/dsp-documentation/processor-manuals/sc58x-2158x-prm.pdf),
including Type 7a compute, Type 8a delayed branch, Type 15 load and Type 17
immediate load. [selache](https://github.com/js216/selache/tree/2b26d3b75c53063575bc5c820fa0d38879335187)
provided an independent opcode cross-check. No upstream decoder implementation
is bundled. A separate exploratory digikit decoder was insufficiently complete
for these instructions and was not used as an evidence gate.

Earlier approaches: FM3-Edit 1.07.17 exposes the PID bindings but the examined
readout setter accepts an already formatted string. The Blocks Guide describes
infinite repeats and 32 global scales, without proving wire codes. Older Axe-Fx
catalogs suggested the same mapping but were not transferred as FM3 proof.

## Boundaries and next work

All 95 allowed display values are tested, including numeric-input compatibility,
invalid labels and byte-identical complete presets from labelled/numeric specs.
The standard offline suite still tests checksums, final-body readback, type and
dependency guards, output files and unchanged golden presets.

Global scale **contents** are outside a preset and remain unvalidated. The seven
dynamic NOTE2–NOTE8 fields remain blocked. No new hardware, load, sound, CPU,
MIDI SET or arbitrary firmware-formatting claims are made.

Next: trace the dynamic note handlers and global-scale read paths from this same
pinned firmware; implement only context-complete rules. If a device check remains
necessary, prefer one bounded read-only capture of existing state, with no manual
parameter sweep or return export. The published launcher stays pinned to 0.3.3
until a separate release candidate passes the commit-specific release/load gates.
