#!/usr/bin/env node

import { performance } from 'node:perf_hooks';
import { connectSerial } from '@mcp-midi-control/core/midi/serialTransport.js';
import {
  buildStatusDump,
  describeMultipurposeResultCode,
  isMultipurposeResponse,
  isStatusDumpResponse,
  parseMultipurposeResponse,
  parseStatusDumpResponse,
} from 'fractal-midi/gen3/axe-fx-iii';
import { fractalChecksum } from 'fractal-midi/shared';

const MODEL = 0x11;
const BAUD_RATE = 115200;
const CAPTURE_MS = 3000;

if (process.argv.length !== 2) {
  throw new Error('This read-only helper accepts no command-line arguments.');
}

const hex = (bytes: readonly number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const statusRequest = buildStatusDump(MODEL);
const expectedRequest = 'F0 00 01 74 11 13 07 F7';

if (hex(statusRequest) !== expectedRequest) {
  throw new Error(
    `STATUS_DUMP wire invariant failed: got ${hex(statusRequest)}, expected ${expectedRequest}`,
  );
}

let detectedPath = '(discovery pending)';

const conn = connectSerial({
  explicitPath: process.env.MCP_FM3_SERIAL_PATH?.trim() || undefined,
  baudRate: BAUD_RATE,
  log: (line) => {
    const match = /^connected via serial (.+?) \(/.exec(line);
    if (match) detectedPath = match[1];
    console.log(`[transport] ${line}`);
  },
  notFoundLeadIn: 'FM3 serial port not found.',
  notFoundHints: [
    'Set MCP_FM3_SERIAL_PATH to the FM3 communications-port path if autodiscovery cannot identify it.',
  ],
});

let rxCount = 0;
let matchingStatusCount = 0;
let validStatusCount = 0;
let nackCount = 0;

const startedAt = performance.now();

const elapsed = (): string =>
  `+${(performance.now() - startedAt).toFixed(1)}ms`;

const unsubscribe = conn.onMessage((frame) => {
  rxCount += 1;

  console.log('');
  console.log(`[${elapsed()}] RX #${rxCount}`);
  console.log(`length: ${frame.length}`);
  console.log(`hex: ${hex(frame)}`);

  const matchingPrefix =
    frame[0] === 0xf0
    && frame[1] === 0x00
    && frame[2] === 0x01
    && frame[3] === 0x74
    && frame[4] === MODEL
    && frame[5] === 0x13;

  console.log(`matches F0 00 01 74 11 13 prefix: ${matchingPrefix}`);

  if (frame.length >= 2) {
    const receivedChecksum = frame[frame.length - 2];
    const calculatedChecksum = fractalChecksum(frame.slice(0, -2));

    console.log(
      `checksum: received 0x${receivedChecksum.toString(16).padStart(2, '0').toUpperCase()}, `
      + `calculated 0x${calculatedChecksum.toString(16).padStart(2, '0').toUpperCase()}, `
      + `match=${receivedChecksum === calculatedChecksum}`,
    );
  }

  if (isMultipurposeResponse(frame, MODEL, 0x13)) {
    nackCount += 1;

    try {
      const parsed = parseMultipurposeResponse(frame, MODEL);
      const meaning =
        describeMultipurposeResultCode(parsed.resultCode) ?? 'unknown result code';

      console.log(
        `classification: fn=0x13 multipurpose response; `
        + `resultCode=0x${parsed.resultCode.toString(16).padStart(2, '0').toUpperCase()} `
        + `(${meaning})`,
      );
    } catch (error) {
      console.log(
        `multipurpose parse ERROR: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (matchingPrefix) {
    matchingStatusCount += 1;

    const valid = isStatusDumpResponse(frame, MODEL);
    console.log(`isStatusDumpResponse: ${valid}`);

    if (valid) {
      try {
        const entries = parseStatusDumpResponse(frame, MODEL);
        validStatusCount += 1;
        console.log(`parseStatusDumpResponse: OK; entries=${entries.length}`);
        console.log(`entries: ${JSON.stringify(entries)}`);
      } catch (error) {
        console.log(
          `parseStatusDumpResponse: ERROR: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
});

console.log('FM3 read-only STATUS_DUMP diagnostic');
console.log(`serial path: ${detectedPath}; baud: ${BAUD_RATE}`);
console.log(`TX exactly once: ${hex(statusRequest)}`);
console.log(`capture window after TX: ${CAPTURE_MS}ms`);

conn.send(statusRequest);

await new Promise<void>((resolve) => setTimeout(resolve, CAPTURE_MS));

unsubscribe();
conn.close();

console.log('');
console.log('--- SUMMARY ---');
console.log(`RX frames total: ${rxCount}`);
console.log(`matching fn=0x13 prefix frames: ${matchingStatusCount}`);
console.log(`valid parsed STATUS_DUMP frames: ${validStatusCount}`);
console.log(`fn=0x13 multipurpose responses: ${nackCount}`);
console.log('No SET or other outbound operation was sent.');
