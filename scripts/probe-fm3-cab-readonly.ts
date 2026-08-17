#!/usr/bin/env node
/**
 * FM3 Cab channel-B read-only hardware helper.
 *
 * Safety boundary: the only outbound device command in this file is the
 * fixed fn=0x1f whole-block GET built by buildBlockBulkReadPoll(62, 0x11).
 * There is no CLI SysEx input and no SET/bypass/scene/preset/store operation.
 */
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
import { FM3_PARAMS_BY_FAMILY } from 'fractal-midi/gen3/fm3';

const MODEL = 0x11;
const CAB_EFFECT_ID = 62;
const BAUD_RATE = 115200;
const TIMEOUT_MS = 1500;
const EXPECTED_REQUEST = [0xf0, 0x00, 0x01, 0x74, 0x11, 0x1f, 0x3e, 0x00, 0x35, 0xf7];

const hex = (bytes: readonly number[]): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const request = buildBlockBulkReadPoll(CAB_EFFECT_ID, MODEL);
if (hex(request) !== hex(EXPECTED_REQUEST)) {
  throw new Error(`request invariant failed: got ${hex(request)}, expected ${hex(EXPECTED_REQUEST)}`);
}

let detectedPath = '(opening/discovery did not complete)';
const conn = connectSerial({
  explicitPath: process.env.MCP_FM3_SERIAL_PATH?.trim() || undefined,
  baudRate: BAUD_RATE,
  log: (line) => {
    const match = /^connected via serial (.+?) \(/.exec(line);
    if (match) detectedPath = match[1];
  },
  notFoundLeadIn: 'FM3 serial port not found.',
  notFoundHints: ['Set MCP_FM3_SERIAL_PATH to the FM3 communications-port path if autodiscovery cannot identify it.'],
});

const frames: number[][] = [];
let nack: ReturnType<typeof parseMultipurposeResponse> | undefined;
let endSeen = false;
let finish!: () => void;
const completed = new Promise<void>((resolve) => { finish = resolve; });

const unsubscribe = conn.onMessage((bytes) => {
  if (isGen3BroadcastFrame(bytes, 0x74, MODEL)) {
    try {
      if (parseGen3StateBroadcastHead(bytes).blockId === CAB_EFFECT_ID) frames.push([...bytes]);
    } catch {
      frames.push([...bytes]);
    }
  } else if (frames.length > 0 && isGen3BroadcastFrame(bytes, 0x75, MODEL)) {
    frames.push([...bytes]);
  } else if (frames.length > 0 && isGen3BroadcastFrame(bytes, 0x76, MODEL)) {
    frames.push([...bytes]);
    endSeen = true;
    finish();
  } else if (isMultipurposeResponse(bytes, MODEL, 0x1f)) {
    nack = parseMultipurposeResponse(bytes, MODEL);
    finish();
  }
});

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  finish();
}, TIMEOUT_MS);

try {
  // The sole outbound device call reachable from this helper.
  conn.send(request);
  await completed;
} catch (error) {
  console.error(`detected serial path: ${detectedPath}`);
  console.error(`transmitted request: ${hex(request)}`);
  console.error('response frame/value count: 0 frames / 0 values');
  console.error('Cab stride/column count: unavailable / unavailable');
  console.error('channel-B CABINET_PAN1 paramId 12: raw=unavailable display=unavailable');
  console.error('channel-B CABINET_PAN2 paramId 13: raw=unavailable display=unavailable');
  console.error(`timeout/NACK/truncation/protocol anomaly: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  unsubscribe();
  conn.close();
}

if (process.exitCode !== 1) {
  const heads = frames.filter((frame) => isGen3BroadcastFrame(frame, 0x74, MODEL)).length;
  const bodies = frames.filter((frame) => isGen3BroadcastFrame(frame, 0x75, MODEL)).length;
  const ends = frames.filter((frame) => isGen3BroadcastFrame(frame, 0x76, MODEL)).length;
  const anomalies: string[] = [];

  console.log(`detected serial path: ${detectedPath}`);
  console.log(`transmitted request: ${hex(request)}`);

  if (nack) {
    const label = describeMultipurposeResultCode(nack.resultCode) ?? 'unknown result code';
    anomalies.push(`NACK fn=0x${nack.echoedFn.toString(16).padStart(2, '0')} code=0x${nack.resultCode.toString(16).padStart(2, '0')} (${label})`);
    console.log(`response frame/value count: 1 frame / 0 values`);
    console.log('Cab stride/column count: unavailable / unavailable');
    console.log('channel-B CABINET_PAN1 paramId 12: raw=unavailable display=unavailable');
    console.log('channel-B CABINET_PAN2 paramId 13: raw=unavailable display=unavailable');
  } else if (frames.length === 0) {
    console.log(`response frame/value count: 0 frames / 0 values`);
    console.log('Cab stride/column count: unavailable / unavailable');
    console.log('channel-B CABINET_PAN1 paramId 12: raw=unavailable display=unavailable');
    console.log('channel-B CABINET_PAN2 paramId 13: raw=unavailable display=unavailable');
    anomalies.push(timedOut ? `timeout after ${TIMEOUT_MS}ms` : 'response ended without frames');
  } else {
    try {
      const bulk = assembleGen3BlockBulkRead(frames, MODEL);
      console.log(`response frame/value count: ${frames.length} frames / ${bulk.values.length} values`);

      const catalogMax = Math.max(...(FM3_PARAMS_BY_FAMILY.CABINET ?? [])
        .map((param) => param.paramId)
        .filter((paramId) => paramId < 0x3fff));
      let channels = 1;
      for (const candidate of [6, 4, 3, 2, 1]) {
        if (bulk.itemCount % candidate === 0 && bulk.itemCount / candidate >= catalogMax + 1) {
          channels = candidate;
          break;
        }
      }
      const stride = bulk.itemCount / channels;
      console.log(`Cab stride/column count: ${stride} / ${channels}`);

      const reportPan = (paramId: 12 | 13, name: string): void => {
        const raw = bulk.values[stride + paramId]; // channel B = index 1
        if (raw === undefined) {
          anomalies.push(`channel-B ${name} paramId ${paramId} is absent at bulk index ${stride + paramId}`);
          console.log(`channel-B ${name} paramId ${paramId}: raw=unavailable display=unavailable`);
          return;
        }
        const display = (raw / 65534) * 200 - 100;
        console.log(`channel-B ${name} paramId ${paramId}: raw=${raw} display=${display.toFixed(1)}%`);
      };
      reportPan(12, 'CABINET_PAN1');
      reportPan(13, 'CABINET_PAN2');

      if (bulk.blockId !== CAB_EFFECT_ID) anomalies.push(`head blockId ${bulk.blockId}, expected ${CAB_EFFECT_ID}`);
      if (bulk.values.length !== bulk.itemCount) anomalies.push(`truncation/count mismatch: head advertised ${bulk.itemCount}, decoded ${bulk.values.length}`);
      if (!endSeen || ends !== 1) anomalies.push(`terminator anomaly: ${ends} fn=0x76 frames`);
      if (heads !== 1) anomalies.push(`head anomaly: ${heads} fn=0x74 frames`);
      if (bodies === 0) anomalies.push('body anomaly: no fn=0x75 frames');
    } catch (error) {
      console.log(`response frame/value count: ${frames.length} frames / 0 decoded values`);
      console.log('Cab stride/column count: unavailable / unavailable');
      console.log('channel-B CABINET_PAN1 paramId 12: raw=unavailable display=unavailable');
      console.log('channel-B CABINET_PAN2 paramId 13: raw=unavailable display=unavailable');
      anomalies.push(`decode/protocol error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`timeout/NACK/truncation/protocol anomaly: ${anomalies.length ? anomalies.join('; ') : 'none'}`);
  if (anomalies.length) process.exitCode = 1;
}
