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
  },
} as const;
