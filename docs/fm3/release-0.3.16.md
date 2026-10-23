# FM3 Sound Architect 2 0.3.16

This release adopts main through `9eb86880233fb1a45cc9510749d6bd9a18e2fcb6` (PRs #17, #19–#22). The published 0.3.15 engine was `15840e463b0d8f90ab3c46b8c0d4e6865b88a004`; the later main commits were not in that package.

## Adopted checks and evidence

The required suite grows from 53 to 59: five upstream tests (record scanning, inserted blocks, general grid, collector simulation, CPU), plus final four-file grid/instance validation. CI also replays the existing seven grid readbacks and 356-preset CPU sweep into the pinned 342-type table. These are existing hardware evidence, not new device tests. Native `fractal-midi` grid/CPU decoder fixes from PR #21 stay in the monorepo and its CI; the plugin packages its own offline engine.

## Review corrections

- Instance scenes and parameters now use each record's own offsets and the base family's model library. TXT labels requested Drive 2/Volume 2 controls by instance; modifier dependencies use the instance's effect ID while tempo policy remains family-based.
- Grid mode and Volume/Pan now work together through the public four-file generation/verification path. Verification rereads grid cells/masks, instance scenes, requested controls and CPU from final SYX, checking spec/report/TXT agreement. Seven tests alter CRC-valid SYX or reports/text and refresh artifact hashes; verification still rejects them. All unrequested body bytes remain unchanged in the control comparison.
- CPU component coverage is no prediction accuracy guarantee. Existing G06 is 44.3% estimated versus 41.5% measured. The meter's separately calibrated 0.5-point error is not the model's error. New coverage fields are explicit; legacy `exact` aliases are documented. Unknown components can be omitted, so estimates are not promised upper or lower bounds. CPU text is retained when global-scale observations rerender TXT.
- The grid collector stops after mismatched, absent or unstable readback or a failed user check. It records attempted send frames, readback and diagnostic even on failure, and refuses to resume a failed/different-pack session automatically. Ten offline simulator scenarios exercise normal/resume, mismatch/failure resume, absent/unstable replies, declined name, hash/storage-header rejection and bundled self-tests. No serial port or hardware is used by the suite.

## Release contract

Build from a clean exact commit only after all 59 required checks pass. Keep the same private plugin ID; record exact source commit, test summary, package/manifest hashes, four pre-merge CI runs, complete published file comparison and saved-launcher use in the restoration backup. The backup's later main commit is not the engine source commit.

No new REA/Ghidra or device analysis was required. Wah Min/Max remains bounded to FW13 Ext1→Wah1 Control: six measured values per field, 995 model-supported values, `fullRangeEncodingProven=false`; historical mouse points stay separate. Grid mask bit 4, new modifiers, unmeasured type-specific visibility, global settings, audio and STORE/reload are not newly proven by this release.
