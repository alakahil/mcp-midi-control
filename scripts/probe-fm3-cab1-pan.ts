#!/usr/bin/env node
/**
 * Controlled FM3 CAB 1 Pan hardware validation.
 *
 * Fixed outbound device operations only: Cab bulk GET, STATUS_DUMP preflight,
 * PAN1 SET to zero, Cab bulk GET, STATUS_DUMP restore preflight, PAN1 restore
 * SET, Cab bulk GET. No other write is permitted. The
 * SET targets the Cab block's currently active channel, which both SET
 * preflights must report as channel B.
 */
import { connectSerial } from '@mcp-midi-control/core/midi/serialTransport.js';
import {
  assembleGen3BlockBulkRead,
  buildStatusDump,
  buildBlockBulkReadPoll,
  buildSetParameterContinuous,
  describeMultipurposeResultCode,
  isGen3BroadcastFrame,
  isMultipurposeResponse,
  isSetGetParameterResponse,
  isStatusDumpResponse,
  parseGen3SetValueEcho,
  parseGen3StateBroadcastHead,
  parseMultipurposeResponse,
  parseStatusDumpResponse,
} from 'fractal-midi/gen3/axe-fx-iii';
import { FM3_PARAMS_BY_FAMILY } from 'fractal-midi/gen3/fm3';
import { fractalChecksum } from 'fractal-midi/shared';

const MODEL = 0x11;
const CAB_EFFECT_ID = 62;
const CHANNEL = 1; // B; the fn=0x01 SET addresses the block's active channel.
const STRIDE = 106;
const VALUE_COUNT = 424;
const PAN1_PARAM_ID = 12;
const PAN2_PARAM_ID = 13;
const PAN1_INDEX = CHANNEL * STRIDE + PAN1_PARAM_ID;
const PAN2_INDEX = CHANNEL * STRIDE + PAN2_PARAM_ID;
const BASELINE_RAW = 40959;
const TEMPORARY_RAW = 32767;
const BAUD_RATE = 115200;
const BULK_TIMEOUT_MS = 1500;
const ACK_TIMEOUT_MS = 1000;
const STATUS_TIMEOUT_MS = 1000;
const STATUS_RETRY_TIMEOUT_MS = 1800;
const STATUS_SETTLE_MS = 200;
const DISPLAY_TOLERANCE = 0.05;

if (process.argv.length !== 2) {
  throw new Error('This controlled helper accepts no command-line arguments.');
}

const bulkRequest = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);
const statusRequest = buildStatusDump(MODEL);
const temporarySet = buildSetParameterContinuous(
  CAB_EFFECT_ID,
  PAN1_PARAM_ID,
  TEMPORARY_RAW / 65534,
  MODEL,
);
const restoreSet = buildSetParameterContinuous(
  CAB_EFFECT_ID,
  PAN1_PARAM_ID,
  BASELINE_RAW / 65534,
  MODEL,
);

const hex = (bytes: readonly number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

function panDisplay(raw: number): string {
  return `${((raw / 65534) * 200 - 100).toFixed(1)}%`;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: got ${String(actual)}, expected ${String(expected)}`);
}

function assertPanDisplay(raw: number, expected: number, label: string): void {
  const display = panDisplay(raw);
  const match = /^([+-]?\d+(?:\.\d+)?)%$/.exec(display);
  const decoded = match ? Number(match[1]) : Number.NaN;
  if (!Number.isFinite(decoded) || Math.abs(decoded - expected) > DISPLAY_TOLERANCE) {
    throw new Error(`${label}: got ${display}, expected ${expected.toFixed(1)}%`);
  }
}

// Pin every outbound builder result to the intended operation before opening a port.
assertEqual(hex(bulkRequest), 'F0 00 01 74 11 1F 3E 00 35 F7', 'bulk GET wire invariant');
assertEqual(hex(statusRequest), 'F0 00 01 74 11 13 07 F7', 'STATUS_DUMP GET wire invariant');
assertEqual(
  hex(temporarySet),
  'F0 00 01 74 11 01 52 00 3E 00 0C 00 00 00 00 78 03 00 00 00 00 0E F7',
  'temporary SET wire invariant',
);
assertEqual(
  hex(restoreSet),
  'F0 00 01 74 11 01 52 00 3E 00 0C 00 40 00 00 79 03 00 00 00 00 4F F7',
  'restore SET wire invariant',
);
for (const [label, frame, raw] of [
  ['temporary', temporarySet, TEMPORARY_RAW],
  ['restore', restoreSet, BASELINE_RAW],
] as const) {
  const parsed = parseGen3SetValueEcho(frame);
  assertEqual(frame[4], MODEL, `${label} SET model`);
  assertEqual(parsed.effectId, CAB_EFFECT_ID, `${label} SET effectId`);
  assertEqual(parsed.paramId, PAN1_PARAM_ID, `${label} SET paramId`);
  assertEqual(Math.round(parsed.normalizedValue * 65534), raw, `${label} SET raw value`);
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
if (nodeMajor !== 24) {
  throw new Error(
    `This FM3 hardware validator must run under Node 24.x; current runtime is ${process.version}. ` +
    'Node 26.7.0 exhibited a confirmed macOS serialport read/reopen failure.'
  );
}

let detectedPath = '(discovery pending)';
const conn = connectSerial({
  explicitPath: process.env.MCP_FM3_SERIAL_PATH?.trim() || undefined,
  baudRate: BAUD_RATE,
  log: (line) => {
    const match = /^connected via serial (.+?) \(/.exec(line);
    if (match) detectedPath = match[1];
    console.log(line);
  },
  notFoundLeadIn: 'FM3 serial port not found.',
  notFoundHints: [
    'Set MCP_FM3_SERIAL_PATH to the FM3 communications-port path if autodiscovery cannot identify it.',
  ],
});

let interruptedSignal: 'SIGINT' | 'SIGTERM' | undefined;
let requestedExitCode: 130 | 143 | undefined;
let cancelPending: ((error: Error) => void) | undefined;
let temporarySetSent = false;
let restoreSetSent = false;
let restorationStarted = false;

function onSignal(signal: 'SIGINT' | 'SIGTERM'): void {
  if (interruptedSignal) return;
  interruptedSignal = signal;
  requestedExitCode = signal === 'SIGINT' ? 130 : 143;
  if (!temporarySetSent) {
    console.error(`${signal} received before the temporary SET; cancelling normally.`);
    cancelPending?.(new Error(`interrupted by ${signal}`));
  } else if (!restorationStarted) {
    console.error(`${signal} received after the temporary SET; proceeding to mandatory restoration.`);
    cancelPending?.(new Error(`interrupted by ${signal}`));
  } else {
    console.error(`${signal} received during restoration; restore waits will not be cancelled.`);
  }
}
// Keep persistent handlers installed so repeated signals cannot regain Node's
// default terminate behavior while a mandatory restore/final read is running.
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

async function bulkGet(label: string, mandatoryAfterSet = false): Promise<number[]> {
  if (interruptedSignal && !mandatoryAfterSet) throw new Error(`refusing ${label}: interrupted by ${interruptedSignal}`);
  const frames: number[][] = [];
  const values = await new Promise<number[]>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      cancelPending = undefined;
      if (error) reject(error);
      else {
        try {
          const bulk = assembleGen3BlockBulkRead(frames, MODEL);
          assertEqual(bulk.blockId, CAB_EFFECT_ID, `${label} blockId`);
          assertEqual(bulk.itemCount, VALUE_COUNT, `${label} advertised item count`);
          assertEqual(bulk.values.length, VALUE_COUNT, `${label} decoded value count`);
          resolve([...bulk.values]);
        } catch (decodeError) {
          reject(decodeError instanceof Error ? decodeError : new Error(String(decodeError)));
        }
      }
    };
    const unsubscribe = conn.onMessage((frame) => {
      if (isMultipurposeResponse(frame, MODEL, 0x1f)) {
        const nack = parseMultipurposeResponse(frame, MODEL);
        const meaning = describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';
        finish(new Error(`${label} NACK 0x${nack.resultCode.toString(16).padStart(2, '0')} (${meaning})`));
      } else if (isGen3BroadcastFrame(frame, 0x74, MODEL)) {
        try {
          if (parseGen3StateBroadcastHead(frame).blockId === CAB_EFFECT_ID) frames.push([...frame]);
        } catch { /* Ignore malformed or unrelated heads. */ }
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x75, MODEL)) {
        frames.push([...frame]);
      } else if (frames.length && isGen3BroadcastFrame(frame, 0x76, MODEL)) {
        frames.push([...frame]);
        finish();
      }
    });
    const timer = setTimeout(() => finish(new Error(`${label} timed out after ${BULK_TIMEOUT_MS}ms`)), BULK_TIMEOUT_MS);
    cancelPending = mandatoryAfterSet ? undefined : (error) => finish(error);
    conn.send(bulkRequest);
  });
  console.log(`${label} full vector (${values.length} values): ${JSON.stringify(values)}`);
  return values;
}

async function requireCabChannelB(label: string, mandatoryRestore = false): Promise<void> {
  if (interruptedSignal && !mandatoryRestore) {
    throw new Error(`refusing ${label}: interrupted by ${interruptedSignal}`);
  }
  await new Promise<void>((resolve) => setTimeout(resolve, STATUS_SETTLE_MS));

  let attempts = 0;
  const statusAttempt = async (timeoutMs: number): Promise<ReturnType<typeof parseStatusDumpResponse> | undefined> => {
    attempts += 1;
    return new Promise<ReturnType<typeof parseStatusDumpResponse> | undefined>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, entries?: ReturnType<typeof parseStatusDumpResponse>): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        cancelPending = undefined;
        if (error) reject(error); else resolve(entries);
      };
      const unsubscribe = conn.onMessage((response) => {
        if (isMultipurposeResponse(response, MODEL, 0x13)) {
          const nack = parseMultipurposeResponse(response, MODEL);
          const meaning = describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';
          finish(new Error(`${label} NACK 0x${nack.resultCode.toString(16).padStart(2, '0')} (${meaning})`));
        } else if (
          response[0] === 0xf0
          && response[1] === 0x00
          && response[2] === 0x01
          && response[3] === 0x74
          && response[4] === MODEL
          && response[5] === 0x13
        ) {
          if (!isStatusDumpResponse(response, MODEL)) {
            finish(new Error(`${label}: malformed matching STATUS_DUMP response`));
          } else if (response[response.length - 2] !== fractalChecksum(response.slice(0, -2))) {
            finish(new Error(`${label}: matching STATUS_DUMP response checksum mismatch`));
          } else {
            try { finish(undefined, parseStatusDumpResponse(response, MODEL)); }
            catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
          }
        }
      });
      const timer = setTimeout(() => finish(), timeoutMs);
      cancelPending = mandatoryRestore ? undefined : (error) => finish(error);
      conn.send(statusRequest);
    });
  };

  let entries = await statusAttempt(STATUS_TIMEOUT_MS);
  if (!entries) {
    await new Promise<void>((resolve) => setTimeout(resolve, STATUS_SETTLE_MS));
    if (interruptedSignal && !mandatoryRestore) {
      throw new Error(`refusing ${label} retry: interrupted by ${interruptedSignal}`);
    }
    entries = await statusAttempt(STATUS_RETRY_TIMEOUT_MS);
  }
  if (!entries) throw new Error(`${label} timed out after ${attempts} STATUS_DUMP attempts`);
  console.log(`${label}: STATUS_DUMP completed in ${attempts} attempt(s)`);
  const cab = entries.find((entry) => entry.effectId === CAB_EFFECT_ID);
  if (!cab) throw new Error(`${label}: Cab effectId ${CAB_EFFECT_ID} absent from STATUS_DUMP`);
  const channelName = 'ABCDEFGH'[cab.channel] ?? `index ${cab.channel}`;
  console.log(`${label}: detected active Cab channel ${channelName} (index ${cab.channel})`);
  if (cab.channel !== CHANNEL) {
    const prefix = mandatoryRestore ? 'CRITICAL RESTORE BLOCKED: ' : '';
    throw new Error(`${prefix}Cab active channel is ${channelName} (index ${cab.channel}), not B (index 1); no SET sent`);
  }
}

function isCompleteValidSetAck(response: readonly number[], outbound: readonly number[]): boolean {
  return response.length === 60
    && isSetGetParameterResponse(response, MODEL)
    && response[0] === 0xf0
    && response[response.length - 1] === 0xf7
    && response[response.length - 2] === fractalChecksum(response.slice(0, -2))
    && response[6] === outbound[6]
    && response[7] === outbound[7];
}

async function sendPan1Set(label: 'temporary SET' | 'restore SET', frame: number[], expectedRaw: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      cancelPending = undefined;
      if (error) reject(error); else resolve();
    };
    const unsubscribe = conn.onMessage((response) => {
      if (isMultipurposeResponse(response, MODEL, 0x01)) {
        const nack = parseMultipurposeResponse(response, MODEL);
        const meaning = describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';
        finish(new Error(`${label} NACK 0x${nack.resultCode.toString(16).padStart(2, '0')} (${meaning})`));
        return;
      }
      if (response.length === frame.length && response.every((byte, index) => byte === frame[index])) {
        finish(new Error(`${label} rejected exact looped-back outbound SET request`));
        return;
      }
      if (!isCompleteValidSetAck(response, frame)) return;
      try {
        const echo = parseGen3SetValueEcho(response);
        if (echo.effectId !== CAB_EFFECT_ID || echo.paramId !== PAN1_PARAM_ID) return;
        const echoedRaw = Math.round(echo.normalizedValue * 65534);
        if (echoedRaw !== expectedRaw) {
          finish(new Error(`${label} ACK value mismatch: echoed raw ${echoedRaw}, expected ${expectedRaw}`));
        } else {
          finish();
        }
      } catch { /* Ignore unrelated inbound frames. */ }
    });
    const timer = setTimeout(() => finish(new Error(`${label} ACK timeout after ${ACK_TIMEOUT_MS}ms`)), ACK_TIMEOUT_MS);
    cancelPending = restorationStarted ? undefined : (error) => finish(error);
    conn.send(frame);
  });
  console.log(`${label} ACK: CABINET_PAN1 paramId 12 raw ${expectedRaw} (${panDisplay(expectedRaw)})`);
}

const catalogById = new Map((FM3_PARAMS_BY_FAMILY.CABINET ?? []).map((param) => [param.paramId, param]));
function meaningOf(index: number, before: number, after: number): string {
  const channelIndex = Math.floor(index / STRIDE);
  const paramId = index % STRIDE;
  const param = catalogById.get(paramId);
  const name = param?.name ?? 'UNKNOWN_CAB_PARAM';
  const unit = param?.unit ?? 'unknown';
  const display = unit === 'bipolar_percent'
    ? `; display ${panDisplay(before)} -> ${panDisplay(after)}`
    : '';
  return `bulk index ${index}: channel ${'ABCD'[channelIndex] ?? channelIndex}, paramId ${paramId}, ${name} (${unit}), raw ${before} -> ${after}${display}`;
}

let failure: Error | undefined;
let baseline: number[] | undefined;
let temporary: number[] | undefined;
let final: number[] | undefined;

console.log('FM3 controlled CAB 1 Pan validation; prerequisite: Cab block active channel must be B.');
console.log(`serial path: ${detectedPath}; baud: ${BAUD_RATE}`);
try {
  baseline = await bulkGet('1. baseline Cab bulk GET');
  assertEqual(baseline[PAN1_INDEX], BASELINE_RAW, 'baseline channel-B PAN1 raw');
  assertPanDisplay(baseline[PAN1_INDEX], 25.0, 'baseline channel-B PAN1 display');
  console.log(`baseline PAN1 index ${PAN1_INDEX}: ${baseline[PAN1_INDEX]} / ${panDisplay(baseline[PAN1_INDEX])}`);
  console.log(`baseline PAN2 index ${PAN2_INDEX}: ${baseline[PAN2_INDEX]} / ${panDisplay(baseline[PAN2_INDEX])}`);

  await requireCabChannelB('2. temporary-SET active-channel preflight');
  if (interruptedSignal) throw new Error(`temporary SET cancelled by ${interruptedSignal}`);
  temporarySetSent = true; // Set before send: even a transport failure forces restore attempt.
  await sendPan1Set('temporary SET', temporarySet, TEMPORARY_RAW);

  temporary = await bulkGet('3. temporary-state Cab bulk GET');
  assertEqual(temporary[PAN1_INDEX], TEMPORARY_RAW, 'temporary channel-B PAN1 raw');
  assertPanDisplay(temporary[PAN1_INDEX], 0.0, 'temporary channel-B PAN1 display');
  assertEqual(temporary[PAN2_INDEX], baseline[PAN2_INDEX], 'temporary channel-B PAN2 unchanged');
  const changed = baseline.flatMap((value, index) => value === temporary![index] ? [] : [index]);
  console.log(`temporary-state full-vector diff (${changed.length} change(s)):`);
  for (const index of changed) console.log(`  ${meaningOf(index, baseline[index], temporary[index])}`);
  if (changed.length !== 1 || changed[0] !== PAN1_INDEX) {
    throw new Error(`unrelated bulk change(s): expected only index ${PAN1_INDEX}, got [${changed.join(', ')}]`);
  }
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
} finally {
  if (temporarySetSent && !restoreSetSent) {
    restorationStarted = true;
    try {
      await requireCabChannelB('4. restore active-channel preflight', true);
      restoreSetSent = true;
      await sendPan1Set('restore SET', restoreSet, BASELINE_RAW);
    } catch (restoreError) {
      const err = restoreError instanceof Error ? restoreError : new Error(String(restoreError));
      failure = new Error(`${failure ? `${failure.message}; ` : ''}RESTORE FAILED: ${err.message}`);
    }
  }
}

if (temporarySetSent) {
  try {
    final = await bulkGet('5. final Cab bulk GET', true);
    if (!baseline) throw new Error('final comparison unavailable because baseline was not captured');
    assertEqual(final[PAN1_INDEX], BASELINE_RAW, 'final channel-B PAN1 raw');
    assertPanDisplay(final[PAN1_INDEX], 25.0, 'final channel-B PAN1 display');
    assertEqual(final[PAN2_INDEX], baseline[PAN2_INDEX], 'final channel-B PAN2 unchanged');
    const finalChanged = baseline.flatMap((value, index) => value === final![index] ? [] : [index]);
    if (finalChanged.length) {
      for (const index of finalChanged) console.error(`  final mismatch: ${meaningOf(index, baseline[index], final[index])}`);
      throw new Error(`final vector differs from baseline at indices [${finalChanged.join(', ')}]`);
    }
    console.log('PASS: final 424-value vector is byte-for-byte/value-for-value identical to baseline.');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    failure = new Error(`${failure ? `${failure.message}; ` : ''}${err.message}`);
  }
}

process.removeListener('SIGINT', onSignal);
process.removeListener('SIGTERM', onSignal);
conn.close();

if (failure) {
  console.error(`VALIDATION FAILED: ${failure.message}`);
  process.exitCode = requestedExitCode ?? 1;
} else if (requestedExitCode) {
  process.exitCode = requestedExitCode;
}
