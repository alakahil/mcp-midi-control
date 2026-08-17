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
  'samples/captured/TEST_Encoded_Cab2LevelMinus2.syx';

const TARGET_VALUE = -2;

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function cab1LevelToRaw(valueDb: number): number {
  return Math.floor(((valueDb + 40) / 40) * 65534);
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

// FM3 Cab Level = +44 bytes from channel base
const levelOffset = channelBase + 6;

const rawValue = cab1LevelToRaw(TARGET_VALUE);

const newBody = decodedRaw.body.slice();

writeU16LE(newBody, levelOffset, rawValue);
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

const oldRawLevel = readU16LE(decodedRaw.body, levelOffset);
const newRawLevel = readU16LE(checkRaw.body, levelOffset);

const decodeCab1Level = (raw: number) =>
  (raw / 65534) * 40 - 40;

console.log('');
console.log('FM3 Cab Level write test');
console.log('------------------------');
console.log(`Scene 2 Cab Channel: ${scene2Channel}`);
console.log(`Channel base: 0x${channelBase.toString(16)}`);
console.log(`Level offset: 0x${levelOffset.toString(16)}`);
console.log(`Old raw Level: ${oldRawLevel}`);
console.log(`Requested raw Level: ${rawValue}`);
console.log(`Re-decoded raw Level: ${newRawLevel}`);
console.log(`Old decoded Level: ${decodeCab1Level(oldRawLevel)}`);
console.log(`Requested Level: ${TARGET_VALUE.toFixed(2)}`);
console.log(`Re-decoded Level: ${decodeCab1Level(newRawLevel)}`);
console.log(`CRC valid: ${checkRaw.crcValid}`);
console.log(`Output: ${OUTPUT}`);

if (!checkRaw.crcValid) {
  throw new Error('Generated preset CRC failed');
}

if (newRawLevel !== rawValue) {
  throw new Error(
    `Cab Level verification failed: expected raw ${rawValue}, got ${newRawLevel}`
  );
}

console.log('');
console.log('SUCCESS: generated preset re-decodes correctly.');