#!/usr/bin/env node
/**
 * Read-only FM3 diagnostic:
 *
 * parent process:
 *   1) one Cab bulk GET
 *   2) close serial connection
 *
 * fresh child process:
 *   3) run scripts/probe-fm3-status-dump.ts
 *
 * No SET operation exists here.
 */

import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { connectSerial } from '@mcp-midi-control/core/midi/serialTransport.js';
import {
  assembleGen3BlockBulkRead,
  buildBlockBulkReadPoll,
  describeMultipurposeResultCode,
  isGen3BroadcastFrame,
  isMultipurposeResponse,
  parseGen3StateBroadcastHead,
  parseMultipurposeResponse,
} from 'fractal-midi/gen3/axe-fx-iii';

const MODEL = 0x11;
const CAB_EFFECT_ID = 62;
const VALUE_COUNT = 424;
const BAUD_RATE = 115200;
const BULK_TIMEOUT_MS = 1500;

if (process.argv.length !== 2) {
  throw new Error('This read-only helper accepts no command-line arguments.');
}

const hex = (bytes: readonly number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const bulkRequest = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);

if (hex(bulkRequest) !== 'F0 00 01 74 11 1F 3E 00 35 F7') {
  throw new Error(`Cab bulk GET wire invariant failed: ${hex(bulkRequest)}`);
}

const startedAt = performance.now();

const elapsed = (): string =>
  `+${(performance.now() - startedAt).toFixed(1)}ms`;

async function parentBulkGet(): Promise<void> {
  let detectedPath = '(discovery pending)';
  let resolveConnected!: () => void;

  const connected = new Promise<void>((resolve) => {
    resolveConnected = resolve;
  });

  let connectedResolved = false;

  const conn = connectSerial({
    explicitPath: process.env.MCP_FM3_SERIAL_PATH?.trim() || undefined,
    baudRate: BAUD_RATE,
    log: (line) => {
      const match = /^connected via serial (.+?) \(/.exec(line);

      if (match) {
        detectedPath = match[1];

        if (!connectedResolved) {
          connectedResolved = true;
          resolveConnected();
        }
      }

      console.log(`[parent transport] ${line}`);
    },
    notFoundLeadIn: 'FM3 serial port not found.',
    notFoundHints: [
      'Set MCP_FM3_SERIAL_PATH to the FM3 communications-port path if autodiscovery cannot identify it.',
    ],
  });

  const frames: number[][] = [];

  try {
    await connected;

    console.log(`[${elapsed()}] parent serial confirmed connected: ${detectedPath}`);

    await new Promise<void>((resolve, reject) => {
      let settled = false;

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
            throw new Error(
              `bulk blockId ${bulk.blockId}, expected ${CAB_EFFECT_ID}`,
            );
          }

          if (
            bulk.itemCount !== VALUE_COUNT
            || bulk.values.length !== VALUE_COUNT
          ) {
            throw new Error(
              `bulk count mismatch: advertised=${bulk.itemCount}, decoded=${bulk.values.length}`,
            );
          }

          console.log(
            `[${elapsed()}] parent Cab bulk GET complete: ${bulk.values.length} values`,
          );

          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const unsubscribe = conn.onMessage((frame) => {
        console.log(`[${elapsed()}] parent bulk RX length=${frame.length}`);

        if (isMultipurposeResponse(frame, MODEL, 0x1f)) {
          const nack = parseMultipurposeResponse(frame, MODEL);
          const meaning =
            describeMultipurposeResultCode(nack.resultCode)
            ?? 'unknown result code';

          finish(
            new Error(
              `Cab bulk GET NACK 0x${nack.resultCode
                .toString(16)
                .padStart(2, '0')} (${meaning})`,
            ),
          );
          return;
        }

        if (isGen3BroadcastFrame(frame, 0x74, MODEL)) {
          try {
            if (
              parseGen3StateBroadcastHead(frame).blockId === CAB_EFFECT_ID
            ) {
              frames.push([...frame]);
            }
          } catch {}
        } else if (
          frames.length
          && isGen3BroadcastFrame(frame, 0x75, MODEL)
        ) {
          frames.push([...frame]);
        } else if (
          frames.length
          && isGen3BroadcastFrame(frame, 0x76, MODEL)
        ) {
          frames.push([...frame]);
          finish();
        }
      });

      const timer = setTimeout(
        () =>
          finish(
            new Error(
              `Cab bulk GET timed out after ${BULK_TIMEOUT_MS}ms`,
            ),
          ),
        BULK_TIMEOUT_MS,
      );

      console.log(
        `[${elapsed()}] parent TX #1 Cab bulk GET: ${hex(bulkRequest)}`,
      );

      conn.send(bulkRequest);
    });
  } finally {
    conn.close();
    console.log(`[${elapsed()}] parent serial connection closed`);
  }
}

console.log('FM3 read-only BULK -> FRESH CHILD PROCESS -> STATUS_DUMP diagnostic');

await parentBulkGet();

console.log('');
console.log(`[${elapsed()}] launching fresh child process for STATUS_DUMP`);

const child = spawnSync(
  'npx',
  ['tsx', 'scripts/probe-fm3-status-dump.ts'],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
);

if (child.error) {
  throw child.error;
}

if (child.signal) {
  throw new Error(`STATUS_DUMP child terminated by ${child.signal}`);
}

if (child.status !== 0) {
  throw new Error(`STATUS_DUMP child exited with code ${String(child.status)}`);
}

console.log('');
console.log(`[${elapsed()}] child STATUS_DUMP process exited successfully`);
console.log('Parent outbound operations: exactly one Cab bulk GET.');
console.log('Child outbound operations: exactly one STATUS_DUMP GET.');
console.log('No SET operation was sent.');
