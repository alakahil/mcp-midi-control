#!/usr/bin/env node
/**
 * Read-only FM3 diagnostic:
 *   1) one Cab bulk GET
 *   2) 200 ms settle
 *   3) one STATUS_DUMP GET
 *
 * No SET operation exists in this helper.
 */

import { performance } from 'node:perf_hooks';
import { connectSerial } from '@mcp-midi-control/core/midi/serialTransport.js';
import {
  assembleGen3BlockBulkRead,
  buildBlockBulkReadPoll,
  buildStatusDump,
  describeMultipurposeResultCode,
  isGen3BroadcastFrame,
  isMultipurposeResponse,
  isStatusDumpResponse,
  parseGen3StateBroadcastHead,
  parseMultipurposeResponse,
  parseStatusDumpResponse,
} from 'fractal-midi/gen3/axe-fx-iii';
import { fractalChecksum } from 'fractal-midi/shared';

const MODEL = 0x11;
const CAB_EFFECT_ID = 62;
const VALUE_COUNT = 424;
const BAUD_RATE = 115200;
const BULK_TIMEOUT_MS = 1500;
const STATUS_SETTLE_MS = 5000;
const STATUS_CAPTURE_MS = 3000;

if (process.argv.length !== 2) {
  throw new Error('This read-only helper accepts no command-line arguments.');
}

const hex = (bytes: readonly number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const bulkRequest = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);
const statusRequest = buildStatusDump(MODEL);

if (hex(bulkRequest) !== 'F0 00 01 74 11 1F 3E 00 35 F7') {
  throw new Error(`Cab bulk GET wire invariant failed: ${hex(bulkRequest)}`);
}

if (hex(statusRequest) !== 'F0 00 01 74 11 13 07 F7') {
  throw new Error(`STATUS_DUMP wire invariant failed: ${hex(statusRequest)}`);
}

type Phase = 'startup' | 'bulk' | 'settle' | 'status';
let phase: Phase = 'startup';
let detectedPath = '(discovery pending)';
let rxCount = 0;
let statusPrefixCount = 0;
let validStatusCount = 0;
let statusNackCount = 0;

const startedAt = performance.now();

const elapsed = (): string =>
  `+${(performance.now() - startedAt).toFixed(1)}ms`;

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

const unsubscribeLog = conn.onMessage((frame) => {
  rxCount += 1;

  console.log('');
  console.log(`[${elapsed()}] RX #${rxCount} phase=${phase}`);
  console.log(`length: ${frame.length}`);
  console.log(`hex: ${hex(frame)}`);

  if (phase !== 'status') return;

  const matchingPrefix =
    frame[0] === 0xf0
    && frame[1] === 0x00
    && frame[2] === 0x01
    && frame[3] === 0x74
    && frame[4] === MODEL
    && frame[5] === 0x13;

  console.log(`matches F0 00 01 74 11 13 prefix: ${matchingPrefix}`);

  if (isMultipurposeResponse(frame, MODEL, 0x13)) {
    statusNackCount += 1;

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

  if (!matchingPrefix) return;

  statusPrefixCount += 1;

  if (frame.length >= 2) {
    const receivedChecksum = frame[frame.length - 2];
    const calculatedChecksum = fractalChecksum(frame.slice(0, -2));

    console.log(
      `checksum: received 0x${receivedChecksum.toString(16).padStart(2, '0').toUpperCase()}, `
      + `calculated 0x${calculatedChecksum.toString(16).padStart(2, '0').toUpperCase()}, `
      + `match=${receivedChecksum === calculatedChecksum}`,
    );
  }

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
});

async function oneCabBulkGet(): Promise<number[]> {
  const frames: number[][] = [];

  return new Promise<number[]>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();

      if (error) {
        reject(error);
        return;
      }

      try {
        const bulk = assembleGen3BlockBulkRead(frames, MODEL);

        if (bulk.blockId !== CAB_EFFECT_ID) {
          throw new Error(`bulk blockId ${bulk.blockId}, expected ${CAB_EFFECT_ID}`);
        }

        if (bulk.itemCount !== VALUE_COUNT || bulk.values.length !== VALUE_COUNT) {
          throw new Error(
            `bulk value count mismatch: advertised=${bulk.itemCount}, decoded=${bulk.values.length}`,
          );
        }

        resolve([...bulk.values]);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const unsubscribe = conn.onMessage((frame) => {
      if (isMultipurposeResponse(frame, MODEL, 0x1f)) {
        const nack = parseMultipurposeResponse(frame, MODEL);
        const meaning =
          describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';

        finish(
          new Error(
            `Cab bulk GET NACK 0x${nack.resultCode.toString(16).padStart(2, '0')} (${meaning})`,
          ),
        );
        return;
      }

      if (isGen3BroadcastFrame(frame, 0x74, MODEL)) {
        try {
          if (parseGen3StateBroadcastHead(frame).blockId === CAB_EFFECT_ID) {
            frames.push([...frame]);
          }
        } catch {
          // Logged by the diagnostic listener; ignore malformed/unrelated head here.
        }
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x75, MODEL)) {
        frames.push([...frame]);
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x76, MODEL)) {
        frames.push([...frame]);
        finish();
      }
    });

    timer = setTimeout(
      () => finish(new Error(`Cab bulk GET timed out after ${BULK_TIMEOUT_MS}ms`)),
      BULK_TIMEOUT_MS,
    );

    console.log(`[${elapsed()}] TX #1 Cab bulk GET: ${hex(bulkRequest)}`);
    conn.send(bulkRequest);
  });
}

console.log('FM3 read-only BULK -> STATUS_DUMP diagnostic');
console.log(`serial path: ${detectedPath}; baud: ${BAUD_RATE}`);

try {
  phase = 'bulk';
  const values = await oneCabBulkGet();

  console.log('');
  console.log(`[${elapsed()}] Cab bulk GET complete: ${values.length} values`);

  phase = 'settle';
  console.log(`[${elapsed()}] settle start: ${STATUS_SETTLE_MS}ms`);
  await new Promise<void>((resolve) => setTimeout(resolve, STATUS_SETTLE_MS));

  phase = 'status';
  console.log(`[${elapsed()}] TX #2 STATUS_DUMP: ${hex(statusRequest)}`);
  conn.send(statusRequest);

  await new Promise<void>((resolve) => setTimeout(resolve, STATUS_CAPTURE_MS));
} finally {
  unsubscribeLog();
  conn.close();
}

console.log('');
console.log('--- SUMMARY ---');
console.log(`RX frames total: ${rxCount}`);
console.log(`matching fn=0x13 prefix frames after bulk: ${statusPrefixCount}`);
console.log(`valid parsed STATUS_DUMP frames after bulk: ${validStatusCount}`);
console.log(`fn=0x13 multipurpose responses after bulk: ${statusNackCount}`);
console.log('Outbound operations: exactly one Cab bulk GET + exactly one STATUS_DUMP GET.');
console.log('No SET operation was sent.');
