#!/usr/bin/env node
/**
 * Read-only diagnostic:
 *
 * 1) connectSerial -> one Cab bulk GET
 * 2) close wrapper connection
 * 3) raw serialport -> one STATUS_DUMP GET
 *
 * No SET operation exists in this helper.
 */

import { performance } from 'node:perf_hooks';
import { SerialPort } from 'serialport';
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
const CLOSE_SETTLE_MS = 500;
const STATUS_CAPTURE_MS = 10000;

if (process.argv.length !== 2) {
  throw new Error('This read-only helper accepts no command-line arguments.');
}

const hex = (bytes: readonly number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const bulkRequest = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);
const statusRequest = buildStatusDump(MODEL);

if (hex(bulkRequest) !== 'F0 00 01 74 11 1F 3E 00 35 F7') {
  throw new Error(`Cab bulk GET wire invariant failed: ${hex(bulkRequest)}`);
}

if (hex(statusRequest) !== 'F0 00 01 74 11 13 07 F7') {
  throw new Error(`STATUS_DUMP wire invariant failed: ${hex(statusRequest)}`);
}

const startedAt = performance.now();
const elapsed = (): string =>
  `+${(performance.now() - startedAt).toFixed(1)}ms`;

async function wrapperBulkGet(): Promise<string> {
  let detectedPath = '';
  let resolveConnected!: () => void;
  let connectedResolved = false;

  const connected = new Promise<void>((resolve) => {
    resolveConnected = resolve;
  });

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

      console.log(`[wrapper transport] ${line}`);
    },
    notFoundLeadIn: 'FM3 serial port not found.',
    notFoundHints: [
      'Set MCP_FM3_SERIAL_PATH if autodiscovery cannot identify it.',
    ],
  });

  const frames: number[][] = [];

  try {
    await connected;

    console.log(
      `[${elapsed()}] wrapper serial confirmed connected: ${detectedPath}`,
    );

    await new Promise<void>((resolve, reject) => {
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
            `[${elapsed()}] Cab bulk GET complete: ${bulk.values.length} values`,
          );

          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const unsubscribe = conn.onMessage((frame) => {
        console.log(`[${elapsed()}] wrapper RX length=${frame.length}`);

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

      timer = setTimeout(
        () =>
          finish(
            new Error(`Cab bulk GET timed out after ${BULK_TIMEOUT_MS}ms`),
          ),
        BULK_TIMEOUT_MS,
      );

      console.log(
        `[${elapsed()}] wrapper TX #1 Cab bulk GET: ${hex(bulkRequest)}`,
      );

      conn.send(bulkRequest);
    });

    return detectedPath;
  } finally {
    conn.close();
    console.log(`[${elapsed()}] wrapper serial close() called`);
  }
}

async function rawStatusDump(path: string): Promise<void> {
  await new Promise<void>((resolve) =>
    setTimeout(resolve, CLOSE_SETTLE_MS),
  );

  console.log(
    `[${elapsed()}] opening raw SerialPort on ${path}`,
  );

  const port = new SerialPort({
    path,
    baudRate: BAUD_RATE,
    autoOpen: false,
  });

  let rawChunkCount = 0;
  let framedCount = 0;
  let validStatusCount = 0;
  let sysex: number[] | undefined;

  const handleFrame = (frame: number[]): void => {
    framedCount += 1;

    console.log('');
    console.log(`[${elapsed()}] raw framed SysEx #${framedCount}`);
    console.log(`length: ${frame.length}`);
    console.log(`hex: ${hex(frame)}`);

    const matchingPrefix =
      frame[0] === 0xf0
      && frame[1] === 0x00
      && frame[2] === 0x01
      && frame[3] === 0x74
      && frame[4] === MODEL
      && frame[5] === 0x13;

    console.log(`matches STATUS_DUMP prefix: ${matchingPrefix}`);

    if (!matchingPrefix) return;

    const receivedChecksum = frame[frame.length - 2];
    const calculatedChecksum = fractalChecksum(frame.slice(0, -2));

    console.log(
      `checksum: received 0x${receivedChecksum
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}, calculated 0x${calculatedChecksum
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}, match=${receivedChecksum === calculatedChecksum}`,
    );

    const valid = isStatusDumpResponse(frame, MODEL);
    console.log(`isStatusDumpResponse: ${valid}`);

    if (valid) {
      const entries = parseStatusDumpResponse(frame, MODEL);
      validStatusCount += 1;
      console.log(`parseStatusDumpResponse: OK; entries=${entries.length}`);
      console.log(`entries: ${JSON.stringify(entries)}`);
    }
  };

  port.on('data', (chunk: Buffer) => {
    rawChunkCount += 1;
    const bytes = [...chunk];

    console.log('');
    console.log(
      `[${elapsed()}] raw RX chunk #${rawChunkCount} length=${bytes.length}`,
    );
    console.log(`raw hex: ${hex(bytes)}`);

    for (const byte of bytes) {
      if (byte === 0xf0) {
        sysex = [byte];
        continue;
      }

      if (sysex === undefined) continue;

      sysex.push(byte);

      if (byte === 0xf7) {
        const frame = sysex;
        sysex = undefined;
        handleFrame(frame);
      }
    }
  });

  port.on('error', (error) => {
    console.error(`[${elapsed()}] raw SerialPort ERROR: ${error.message}`);
  });

  port.on('close', () => {
    console.log(`[${elapsed()}] raw SerialPort close event`);
  });

  await new Promise<void>((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  console.log(`[${elapsed()}] raw SerialPort confirmed open`);

  const writeReturn = port.write(
    Buffer.from(statusRequest),
    (error) => {
      if (error) {
        console.error(
          `[${elapsed()}] raw write callback ERROR: ${error.message}`,
        );
      } else {
        console.log(`[${elapsed()}] raw write callback: OK`);
      }
    },
  );

  console.log(
    `[${elapsed()}] raw TX #2 STATUS_DUMP: ${hex(statusRequest)}`,
  );
  console.log(`[${elapsed()}] raw write() return value: ${writeReturn}`);

  await new Promise<void>((resolve, reject) => {
    port.drain((error) => {
      if (error) {
        reject(error);
        return;
      }

      console.log(`[${elapsed()}] raw drain callback: OK`);
      resolve();
    });
  });

  await new Promise<void>((resolve) =>
    setTimeout(resolve, STATUS_CAPTURE_MS),
  );

  console.log('');
  console.log('--- RAW STATUS SUMMARY ---');
  console.log(`raw RX chunks: ${rawChunkCount}`);
  console.log(`framed SysEx messages: ${framedCount}`);
  console.log(`valid parsed STATUS_DUMP frames: ${validStatusCount}`);

  await new Promise<void>((resolve) => {
    if (!port.isOpen) {
      resolve();
      return;
    }

    port.close(() => resolve());
  });
}

console.log('FM3 read-only BULK -> RAW SERIALPORT -> STATUS_DUMP diagnostic');

const path = await wrapperBulkGet();
await rawStatusDump(path);

console.log('');
console.log('Outbound operations: exactly one Cab bulk GET + exactly one STATUS_DUMP GET.');
console.log('No SET operation was sent.');
