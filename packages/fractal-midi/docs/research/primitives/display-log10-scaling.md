---
name: display-log10-scaling
class: coercion
status: matched
discovered:  (bright_cap mismatch root-cause)
verified_on:
  - axe-fx-ii-q8.02
  - fm3-fw13-hardware-preset-captures
firmware_sensitive: false
golden: scripts/verify-axe-fx-ii-calibration.ts (hardware-anchored log10 round-trips, e.g. compressor.ratio/attack/release)
relates_to: [display-q16-fixedpoint]
consumed_in:
  - fractal-midi/src/gen2/axe-fx-ii/params.ts (entries with `scaling: 'log10'`)
  - fractal-midi/src/gen3/fm3/params.ts (`CABINET_PROXFREQ`)
  - packages/fractal-gen3/src/presetBody.ts (FM3 Cab stored-body decode)
---

# Log10 scaling display ↔ wire coercion

A subset of Axe-Fx II parameters use log10 scaling between wire and
display values. Confirmed  after a `bright_cap = 4480`
wire value displayed as `220` (encode and decode formulas were
divergent before the fix).

## Formal definition

```
display = 10^(wireValue / kDecodeScale)
wireValue = round(log10(display) * kEncodeScale)
```

The exact constants (`kDecodeScale`, `kEncodeScale`) are per-parameter
metadata in `params.ts` entries marked `scaling: 'log10'`. For a bounded
display range `[min,max]`, the shared normalized form is equivalently
`display = min * (max/min)^(wire/65534)`.

## Where it's used

17 hand entries in `params.ts` gained `scaling: 'log10'` in 
cont 5b . Examples: amp.bright_cap, certain EQ frequencies,
delay times in the high range.

## Misapplication failure modes

- **DO NOT** apply globally: only parameters with `scaling: 'log10'`
  metadata use this. Other parameters use Q16
  ([[display-q16-fixedpoint]]) or direct mapping.
- **DO NOT** assume the same scale constant across parameters; each
  has its own kEncodeScale / kDecodeScale.

## Where it does not apply

This is a per-parameter coercion, not a global gen-3 rule. The second device
axis is FM3 fw 13 Cab Proximity Frequency: two complete hardware preset
captures decode to stored-body u16 LE values 45806 at 100 Hz and 50995 at
120 Hz, exactly matching `floor(log10(display/20) * 65534)` for the 20..200
Hz range. Parameters without `scaling: 'log10'` metadata use their own
registered coercion or direct mapping.

## Verification path

`scripts/verify-axe-fx-ii-calibration.ts` covers the log10 formula with
hardware-anchored round-trips (compressor.ratio / attack / release); the
17 registered `scaling: 'log10'` entries in `params.ts` are the consumed
surface.

## Refinement history

- The bright_cap mismatch (wire 4480 → displayed 220) surfaced; root
  cause: encode used linear formula, decode used log10.
- 17 hand entries gained `scaling: 'log10'` in the fix-up pass.
- An audit of 80 🔴 displayMin/Max mismatches is queued post-MVP
  (some may also need log10 scaling).
- 2026-08-16: promoted to `matched` with the FM3 fw 13 hardware-capture axis;
  registered Cab Proximity Frequency (paramId 41, stored-body index 35).
