# FM3 Sound Architect 2 0.3.18

The published 0.3.17 package predates 46 commits merged through main
`93811dc6c4b9579fdd1076910443aba99773ab84`. This release incorporates those
existing GitHub sources and evidence into the same private plugin.

- Scene MIDI authoring: PC/CC/NONE, 8 scenes × 8 commands, grid-only placement;
  PC program is the Value word. Actual MIDI OUT transmission remains unmeasured.
- Volume/Pan VOLUME and AUTO-SWELL authoring with final-type guards; Input
  Threshold −100 dB is the measured OFF endpoint.
- Seven generated presets: 16,756 stored values and grids read back; V04
  STORE/reload checked. This is not universal storage or audio validation.
- Device label sweep: 5,275 queried labels across 363 parameters and 32 families.
  Preserve the recorded trailing-space and Pitch enum-boundary caveats.
- Input/Volume front-panel scale checks, generated Auto-Swell readback, and
  captured P1/P0 pedal observation. Capabilities and generated Volume pedal TXT
  now report this evidence without claiming a hardware test of each new file.
- Fix the public four-file verifier, which still rejected valid AUTO-SWELL channels,
  and render the final type’s visible controls and measured evidence limits in TXT.
  Regression tests exercise mixed VOLUME/AUTO-SWELL through the public verifier.
- Grid bit-4 handling and the new offline collectors/tests from GitHub.

Historical receipts and raw measurements are preserved. The earlier Auto-Swell
Release reading remains recorded; later evidence supports a likely reading
error, not silent correction of the original observation. Full-range claims,
arbitrary modifier allocation, simultaneous Wah/Volume bindings and audio
confirmation remain outside scope.

Validation: required 61-check offline suite, repository evidence/receipt checks,
clean-commit deterministic build, full published file comparison, pinned launcher
update and an offline usage example. Actual host discovery in a new conversation
must be distinguished from package/runtime verification.
