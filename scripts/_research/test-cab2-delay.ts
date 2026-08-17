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
  MODEL_FM3,
} from '../../packages/fractal-gen3/dist/presetBody.js';

import {
  reframeRawPatch,
} from '../../packages/fractal-gen3/dist/presetAuthor.js';

const INPUT = 'samples/captured/Baaspreset.syx';
const OUTPUT = 'samples/captured/TEST_Encoded_Cab2Delay0.250ms.syx';
const TARGET_VALUE = 0.25;

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function readU16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function cab2DelayToRaw(valueMs: number): number {
  return Math.round(valueMs * 65534);
}

const source = new Uint8Array(readFileSync(INPUT));
const parsed = parsePresetDump(source);

if (parsed.modelId !== MODEL_FM3) {
  throw new Error(`Expected FM3 model, got 0x${parsed.modelId.toString(16)}`);
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

const scene2Channel = cab.scene_channels?.[1];

const channelIndex: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

if (!scene2Channel || channelIndex[scene2Channel] === undefined) {
  throw new Error(`Unexpected Scene 2 Cab channel: ${scene2Channel}`);
}

const channelBase =
  cab.params_offset +
  channelIndex[scene2Channel] * cab.cols * 2;

const delayOffset = channelBase + 0x16;
const rawValue = cab2DelayToRaw(TARGET_VALUE);

const newBody = decodedRaw.body.slice();

writeU16LE(newBody, delayOffset, rawValue);

const newRawPatch =
  reencodeRawPatch(decodedRaw.rawPatch, newBody);

const reframed =
  reframeRawPatch(parsed, newRawPatch);

const outputSyx =
  serializePresetDump(reframed);

writeFileSync(OUTPUT, outputSyx);

const checkParsed = parsePresetDump(outputSyx);
const checkRaw = decodeRawPatch(checkParsed.chunkPayloads);

const oldRaw = readU16LE(decodedRaw.body, delayOffset);
const newRaw = readU16LE(checkRaw.body, delayOffset);

console.log('');
console.log('FM3 Cab 2 Delay write test');
console.log('--------------------------');
console.log(`Scene 2 Cab Channel: ${scene2Channel}`);
console.log(`Channel base: 0x${channelBase.toString(16)}`);
console.log(`Delay offset: 0x${delayOffset.toString(16)}`);
console.log(`Old raw Delay: ${oldRaw}`);
console.log(`Requested raw Delay: ${rawValue}`);
console.log(`Re-decoded raw Delay: ${newRaw}`);
console.log(`Requested Delay: ${TARGET_VALUE.toFixed(3)} ms`);
console.log(`Re-decoded Delay: ${(newRaw / 65534).toFixed(6)} ms`);
console.log(`CRC valid: ${checkRaw.crcValid}`);
console.log(`Output: ${OUTPUT}`);

if (!checkRaw.crcValid) {
  throw new Error('Generated preset CRC failed');
}

if (newRaw !== rawValue) {
  throw new Error(`Cab 2 Delay verification failed: expected ${rawValue}, got ${newRaw}`);
}

console.log('');
console.log('SUCCESS: generated preset re-decodes correctly.');
