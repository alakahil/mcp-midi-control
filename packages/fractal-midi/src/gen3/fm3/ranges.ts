/**
 * Hand-authored FM3 device-true display ranges.
 *
 * Add entries only when hardware-validated on FM3.
 */

export const FM3_RANGES = {
  CABINET: {
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
    // CABINET_DYNACAB_R2 - FM3 fw 13 hardware-validated, 2026-08-16.
    // Linear 0..100%: live SET/GET 50.0% -> raw 32767 (acked), then restored
    // to 70.0% -> raw 45874 (acked); full Cab bulk vector restored exactly.
    94: {
      kind: 'float',
      displayMin: 0,
      displayMax: 100,
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
