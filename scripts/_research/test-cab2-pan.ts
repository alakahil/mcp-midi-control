import { readFileSync, writeFileSync } from 'node:fs';

import {
  parsePresetDump,
  serializePresetDump,
} from '../../packages/fractal-gen3/dist/presetDump.js';

import {
  decodeRawPatch,
  reencodeRawPatch,
} from '../../packages/fractal-gen3/dist/presetHuffman.js';

import {
  decodeGen3Body,
  decodeGen3PresetDump,
  MODEL_FM3,
} from '../../packages/fractal-gen3/dist/presetBody.js';

import {
  reframeRawPatch,
} from '../../packages/fractal-gen3/dist/presetAuthor.js';

const INPUT =
  'samples/captured/Baaspreset.syx';

const OUTPUT =
  'samples/captured/TEST_Encoded_Cab2Pan50R.syx';

const TARGET_VALUE = 50;

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function cabPanToRaw(panPercent: number): number {
  return 32767 + Math.round((panPercent / 100) * 32767);
}

const source = new Uint8Array(readFileSync(INPUT));
const parsed = parsePresetDump(source);

if (parsed.modelId !== MODEL_FM3) {
  throw new Error(
    `Expected FM3 model 0x${MODEL_FM3.toString(16)}, got 0x${parsed.modelId.toString(16)}`
  );
}

const decodedRaw = decodeRawPatch(parsed.chunkPayloads);

if (!decodedRaw.crcValid) {
  throw new Error('Source preset CRC is invalid');
}

const decodedBody = decodeGen3Body(decodedRaw.body, parsed.modelId);

const cab = decodedBody.blocks?.find((b) => b.block === 'Cab');

if (!cab) {
  throw new Error('Cab block not found');
}

if (!cab.scene_channels || cab.scene_channels.length < 2) {
  throw new Error('Scene channel data not found');
}

// Scene 2 = array index 1
const scene2Channel = cab.scene_channels[1];
const channelIndex: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

const ch = channelIndex[scene2Channel];

if (ch === undefined) {
  throw new Error(`Unexpected Scene 2 Amp channel: ${scene2Channel}`);
}

const channelBase =
  cab.params_offset + ch * cab.cols * 2;

// FM3 Cab 1 Pan = +12 bytes from channel base
const panOffset = channelBase + 14;

const rawValue = cabPanToRaw(TARGET_VALUE);

const newBody = decodedRaw.body.slice();

writeU16LE(newBody, panOffset, rawValue);

const newRawPatch =
  reencodeRawPatch(decodedRaw.rawPatch, newBody);

const reframed =
  reframeRawPatch(parsed, newRawPatch);

const outputSyx =
  serializePresetDump(reframed);

writeFileSync(OUTPUT, outputSyx);

// Re-decode generated file as validation
const checkParsed = parsePresetDump(outputSyx);
const checkRaw = decodeRawPatch(checkParsed.chunkPayloads);

function readU16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

const oldRawPan = readU16LE(decodedRaw.body, panOffset);
const newRawPan = readU16LE(checkRaw.body, panOffset);

console.log('');
console.log('FM3 Cab 1 Pan write test');
console.log('-----------------------');
console.log(`Scene 2 Cab Channel: ${scene2Channel}`);
console.log(`Channel base: 0x${channelBase.toString(16)}`);
console.log(`Pan offset: 0x${panOffset.toString(16)}`);
console.log(`Old raw Pan: ${oldRawPan}`);
console.log(`Requested raw Pan: ${rawValue}`);
console.log(`Re-decoded raw Pan: ${newRawPan}`);
console.log(`Requested Pan: ${TARGET_VALUE}%`);
console.log(`CRC valid: ${checkRaw.crcValid}`);
console.log(`Output: ${OUTPUT}`);

if (!checkRaw.crcValid) {
  throw new Error('Generated preset CRC failed');
}

if (newRawPan !== rawValue) {
  throw new Error(
    `Cab 1 Pan verification failed: expected raw ${rawValue}, got ${newRawPan}`
  );
}

console.log('');
console.log('SUCCESS: generated preset re-decodes correctly.');