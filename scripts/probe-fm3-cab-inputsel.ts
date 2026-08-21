#!/usr/bin/env node
/**
 * Read-only FM3 CAB Input Mode hardware validation.
 *
 * Outbound device operations: STATUS_DUMP GET and Cab bulk GET only.
 * No SET operation is permitted.
 */
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
import { FM3_PARAMS_BY_FAMILY, FM3_RANGES } from 'fractal-midi/gen3/fm3';
import { fractalChecksum } from 'fractal-midi/shared';

const MODEL = 0x11;
const CAB_EFFECT_ID = 62;
const CHANNEL = 1; // B
const STRIDE = 106;
const VALUE_COUNT = 424;
const INPUTSEL_PARAM_ID = 42;
const INPUTSEL_INDEX = CHANNEL * STRIDE + INPUTSEL_PARAM_ID;
const BAUD_RATE = 115200;
const TIMEOUT_MS = 1800;

if (process.argv.length !== 2) {
  throw new Error('This read-only helper accepts no command-line arguments.');
}

if (Number.parseInt(process.versions.node.split('.')[0] ?? '', 10) !== 24) {
  throw new Error(`Node 24.x required; current runtime is ${process.version}`);
}

const bulkRequest = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);
const statusRequest = buildStatusDump(MODEL);

const hex = (bytes: readonly number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const assertEqual = (actual: unknown, expected: unknown, label: string): void => {
  if (actual !== expected) throw new Error(`${label}: got ${String(actual)}, expected ${String(expected)}`);
};

assertEqual(hex(bulkRequest), 'F0 00 01 74 11 1F 3E 00 35 F7', 'bulk GET wire invariant');
assertEqual(hex(statusRequest), 'F0 00 01 74 11 13 07 F7', 'STATUS_DUMP GET wire invariant');

const inputSelParam = (FM3_PARAMS_BY_FAMILY.CABINET ?? []).find((p) => p.paramId === INPUTSEL_PARAM_ID);
assertEqual(inputSelParam?.name, 'CABINET_INPUTSEL', 'catalog param name');
assertEqual(inputSelParam?.unit, 'enum', 'catalog unit');
const inputSelRange = FM3_RANGES.CABINET[INPUTSEL_PARAM_ID];
assertEqual(inputSelRange?.kind, 'enum', 'range kind');
assertEqual(inputSelRange?.displayMin, 0, 'range displayMin');
assertEqual(inputSelRange?.displayMax, 3, 'range displayMax');
assertEqual(inputSelRange?.enumCount, 4, 'range enumCount');
assertEqual(INPUTSEL_INDEX, 148, 'channel-B Input Mode bulk index');

let detectedPath = '(discovery pending)';
const conn = connectSerial({
  explicitPath: process.env.MCP_FM3_SERIAL_PATH?.trim() || undefined,
  baudRate: BAUD_RATE,
  log: (line) => {
    const match = /^connected via serial (.+?) \(/.exec(line);
    if (match) detectedPath = match[1];
  },
  notFoundLeadIn: 'FM3 serial port not found.',
  notFoundHints: ['Set MCP_FM3_SERIAL_PATH if autodiscovery cannot identify the FM3.'],
});

async function statusGet(): Promise<ReturnType<typeof parseStatusDumpResponse>> {
  return new Promise((resolve, reject) => {
    const unsubscribe = conn.onMessage((frame) => {
      if (isMultipurposeResponse(frame, MODEL, 0x13)) {
        const nack = parseMultipurposeResponse(frame, MODEL);
        finish(new Error(`STATUS_DUMP NACK 0x${nack.resultCode.toString(16)}`));
      } else if (isStatusDumpResponse(frame, MODEL)) {
        if (frame[frame.length - 2] !== fractalChecksum(frame.slice(0, -2))) {
          finish(new Error('STATUS_DUMP checksum mismatch'));
          return;
        }
        try { finish(undefined, parseStatusDumpResponse(frame, MODEL)); }
        catch (e) { finish(e instanceof Error ? e : new Error(String(e))); }
      }
    });

    const timer = setTimeout(() => finish(new Error('STATUS_DUMP timeout')), TIMEOUT_MS);

    function finish(error?: Error, value?: ReturnType<typeof parseStatusDumpResponse>): void {
      clearTimeout(timer);
      unsubscribe();
      if (error) reject(error);
      else resolve(value!);
    }

    conn.send(statusRequest);
  });
}

async function bulkGet(): Promise<number[]> {
  const frames: number[][] = [];

  return new Promise((resolve, reject) => {
    const unsubscribe = conn.onMessage((frame) => {
      if (isMultipurposeResponse(frame, MODEL, 0x1f)) {
        const nack = parseMultipurposeResponse(frame, MODEL);
        const meaning = describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';
        finish(new Error(`bulk GET NACK 0x${nack.resultCode.toString(16)} (${meaning})`));
      } else if (isGen3BroadcastFrame(frame, 0x74, MODEL)) {
        try {
          if (parseGen3StateBroadcastHead(frame).blockId === CAB_EFFECT_ID) frames.push([...frame]);
        } catch {}
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x75, MODEL)) {
        frames.push([...frame]);
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x76, MODEL)) {
        frames.push([...frame]);
        finish();
      }
    });

    const timer = setTimeout(() => finish(new Error('Cab bulk GET timeout')), TIMEOUT_MS);

    function finish(error?: Error): void {
      clearTimeout(timer);
      unsubscribe();
      if (error) {
        reject(error);
        return;
      }
      try {
        const bulk = assembleGen3BlockBulkRead(frames, MODEL);
        assertEqual(bulk.blockId, CAB_EFFECT_ID, 'bulk blockId');
        assertEqual(bulk.itemCount, VALUE_COUNT, 'bulk item count');
        assertEqual(bulk.values.length, VALUE_COUNT, 'bulk value count');
        resolve([...bulk.values]);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }

    conn.send(bulkRequest);
  });
}

try {
  const status = await statusGet();
  const cab = status.find((entry) => entry.effectId === CAB_EFFECT_ID);

  if (!cab) throw new Error(`Cab effectId ${CAB_EFFECT_ID} absent from STATUS_DUMP`);
  assertEqual(cab.channel, CHANNEL, 'active Cab channel');

  const values = await bulkGet();
  const raw = values[INPUTSEL_INDEX];

  if (!Number.isInteger(raw) || raw < 0 || raw > 65534) {
    throw new Error(`channel-B CABINET_INPUTSEL raw out of range: ${String(raw)}`);
  }

  console.log(`PASS: ${detectedPath}`);
  console.log(`CABINET_INPUTSEL paramId=${INPUTSEL_PARAM_ID} channel=B index=${INPUTSEL_INDEX}`);
  console.log(`raw=${raw} values=${values.length}`);
} finally {
  conn.close();
}
