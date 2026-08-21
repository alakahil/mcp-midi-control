/**
 * Hand-authored FM3 device-true display ranges.
 *
 * Add entries only when hardware-validated on FM3.
 */

export const FM3_RANGES = {
  CABINET: {
    // CABINET_LEVEL1 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear -40..0 dB: live SET/GET 0 dB -> raw 65534 (acked), restored
    // -12 dB -> raw 45874 (acked); only bulk index 114 changed and the full
    // 424-value Cab vector restored exactly.
    8: {
      kind: 'float',
      displayMin: -40,
      displayMax: 0,
    },
    // CABINET_LEVEL2 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear -40..0 dB: live SET/GET 0 dB -> raw 65534 (acked), restored
    // -3 dB -> raw 60619 (acked); Cab 1 stayed -2 dB -> raw 62257 and the
    // full Cab bulk vector restored exactly.
    9: {
      kind: 'float',
      displayMin: -40,
      displayMax: 0,
    },
    // CABINET_DELAY1 - hardware-validated on FM3 fw 13, 2026-08-14.
    // 0.000 ms -> raw 0
    // 0.250 ms -> raw 16384
    // 0.500 ms -> raw 32767
    16: {
      kind: 'float',
      displayMin: 0,
      displayMax: 1,
    },
    // CABINET_DELAY2 - hardware-validated on FM3 fw 13, 2026-08-14.
    // 0.000 ms -> raw 0
    // 0.250 ms -> raw 16384
    // 0.500 ms -> raw 32767
    17: {
      kind: 'float',
      displayMin: 0,
      displayMax: 1,
    },
    // CABINET_PROXFREQ - hardware-validated on FM3 fw 13, 2026-08-16.
    // Stored-preset u16 register uses log10 scaling across 20..200 Hz:
    // 100 Hz -> raw 45806; 120 Hz -> raw 50995.
    41: {
      kind: 'float',
      displayMin: 20,
      displayMax: 200,
    },
    // CABINET_ROOMMIX - FM3 fw 13 hardware-validated, 2026-08-21.
    // Linear 0..100%: GET-only live diff 0% -> raw 0, 1% -> raw 655;
    // only active channel-B Cab bulk index 141 changed.
    35: {
      kind: 'float',
      displayMin: 0,
      displayMax: 100,
    },
    // CABINET_ROOMSIZE - FM3 fw 13 hardware-validated, 2026-08-21.
    // Log10 scaling across 3.00..30.00 m:
    // 3.00 m -> raw 0; 10.00 m -> raw 34266; 30.00 m -> raw 65534.
    36: {
      kind: 'float',
      displayMin: 3,
      displayMax: 30,
    },
    // CABINET_AIR - FM3 fw 13 hardware-validated, 2026-08-21.
    // Linear 0..100%: GET-only live diff 0.0% -> raw 0, 1.0% -> raw 655;
    // only active channel-B Cab bulk index 160 changed.
    54: {
      kind: 'float',
      displayMin: 0,
      displayMax: 100,
    },
    // CABINET_AIRFREQ - FM3 fw 13 hardware-validated, 2026-08-21.
    // 2000 Hz -> raw 0; 5000.1 -> 26079; 6000.1 -> 31268; 20000 -> 65534.
    // GET-only full-vector diffs changed only active channel-B bulk index 161.
    55: {
      kind: 'float',
      displayMin: 2000,
      displayMax: 20000,
    },
    // CABINET_DYNACAB_R1 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear 0..100%: live SET/GET 0% -> raw 0 (acked), restored 25% ->
    // raw 16384 (acked); only bulk index 199 changed and the vector restored.
    93: {
      kind: 'float',
      displayMin: 0,
      displayMax: 100,
    },
    // CABINET_DYNACAB_R2 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear 0..100%: live SET/GET 50.0% -> raw 32767 (acked), then restored
    // to 70.0% -> raw 45874 (acked); full Cab bulk vector restored exactly.
    94: {
      kind: 'float',
      displayMin: 0,
      displayMax: 100,
    },
    // CABINET_DYNACAB_Z1 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear 0..24 cm: live SET/GET 0 cm -> raw 0 (acked), restored 10 cm ->
    // raw 27306 (acked); Z2 stayed 3 cm and the full Cab bulk vector restored.
    97: {
      kind: 'float',
      displayMin: 0,
      displayMax: 24,
    },
    // CABINET_DYNACAB_Z2 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear 0..24 cm: preset 3.00 cm -> 8192; live GET 10.00 cm -> 27306;
    // live SET/GET 12.00 cm -> 32767 (acked), then restored to 10.00 cm.
    98: {
      kind: 'float',
      displayMin: 0,
      displayMax: 24,
    },
  },
} as const;
